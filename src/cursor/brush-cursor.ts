
import { SkyBrush } from 'skybrush'
import { Command } from 'commands/command'
import { DirectCursor } from 'cursor/direct-cursor'
import * as htmlUtils from 'util/html'
import * as canvasUtils from 'util/canvas'
import { Nullable, Consumer3 } from 'util/function-interfaces'

/**
 * The functions used for rendering the custom cursors.
 * These are functions, in the form:
 *
 *      ( ctx:Canvas:2DContext, canvas:HTMLCanvasElement, size:number ) ->
 *
 * They can draw to the canvas, but shouldn't resize it. The size is
 * provided as advice, on how big they should render, and so may match the
 * actual size of the canvas.
 *
 * These functions should also set their own colours, and alpha
 * transparency, for when they draw.
 */
type RenderFunction =
  | Consumer3<CanvasRenderingContext2D, HTMLCanvasElement, number>

type RefreshState =
  | 'refresh'
  | 'no-refresh'

/**
 * The size of the crosshair brush.
 */
const CROSSHAIR_CURSOR_SIZE = 19

/**
 * A data url, of a crosshair, for use as a cursor.
 *
 * It's generated once, to avoid generating it multiple times, during
 * use.
 */
const CROSSHAIR_CURSOR_DATA_URL = (() => {
  const canvas = document.createElement( 'canvas' )
  canvas.width = canvas.height = CROSSHAIR_CURSOR_SIZE

  const ctx = canvas.getContext( '2d' ) as CanvasRenderingContext2D

  renderBrushCrosshair( ctx, canvas, CROSSHAIR_CURSOR_SIZE )

  return canvas.toDataURL()
})()

/**
 * The the total cursor size is below this,
 * then it's swapped out,
 * and a crosshair is used instead.
 *
 * @const
 * @type {number}
 */
const BRUSH_CURSOR_MINIMUM_SIZE = 5

/**
 * The number of pixels to add onto the brush canvas,
 * when it's being drawn.
 *
 * These are extra pixels around the edge, as a little padding.
 *
 * If the edge of the brush is too flat, because it's being cut off,
 * then just increase this value and it should get fixed.
 */
const BRUSH_CURSOR_PADDING = 2


/**
 * This differs from DirectCursor, in that this deals with the brush size,
 * zoom, and some decision making on how the brush should look.
 *
 * If 'isTouch' is set, then only 'showTouch' and 'hideTouch'
 * will actually allow this to be seen or not. The other 'show' and 'hide'
 * will still look like they work, and will as far as they can, except
 * nothing actually appeares.
 *
 * @param painter The SkyBrush instance.
 * @param viewport The view area this is a cursor for.
 * @param isTouch True if this is working with touch, false if not.
 */
export class BrushCursor {
  private readonly cursor : DirectCursor
  private readonly canvas : HTMLCanvasElement

  private readonly isTouch : boolean

  private isHidden       : boolean
  private isReallyHidden : boolean

  /**
   * The current zoom.
   */
  private zoom : number

  /**
   * The current size, regardless of zoom.
   */
  private size : number

  private shape : Nullable<RenderFunction>

  constructor(
      viewport : HTMLElement,
  ) {
    this.cursor = new DirectCursor( viewport )

    // Initializes to no size.
    this.isHidden       = false
    this.isReallyHidden = false

    this.size  = 1
    this.shape = null

    this.canvas = htmlUtils.newCanvas( 1, 1 )
  }

  setCrosshair():this {
    this.cursor.setCursorURL( CROSSHAIR_CURSOR_DATA_URL, CROSSHAIR_CURSOR_SIZE )
    this.shape = null

    return this
  }

  onMove( ev:MouseEvent ):this {
    this.cursor.update( ev )

    return this
  }

  showTouch():this {
    // don't show if hidden!
    if ( this.isTouch && ! this.isHidden ) {
      this.showInner()
    }

    return this
  }

  hideTouch():this {
    if ( this.isTouch ) {
      this.hideInner()
    }

    return this
  }

  show():this {
    this.isHidden = false

    if ( this.shape ) {
      this.renderShape( this.shape )
    }

    if ( ! this.isTouch ) {
      this.showInner()
    }

    return this
  }

  hide():this {
    this.isHidden = true

    if ( ! this.isTouch ) {
      this.hideInner()
    }

    return this
  }

  showInner():this {
    if ( this.isReallyHidden ) {
      this.isReallyHidden = false

      this.cursor.show()
    }

    return this
  }

  hideInner():this {
    if ( ! this.isReallyHidden ) {
      this.isReallyHidden = true
      this.cursor.hide()
    }

    return this
  }

  /**
   * Returns if the *fake* brush is shown.
   * This is regardless of if the brush cursor is rendered using the
   * background image, or as a native cursor.
   *
   * If the fake brush is shown, then a standard url, which is not calculated
   * by the brush cursor, will be in use. For example, the zoom cursor, or
   * the standard cursor icon.
   */
  isShown() {
    return ! this.isHidden
  }

  setCircle( size:number ) {
    return this.setShape( renderBrushCircle, size )
  }

  setSquare( size:number ) {
    return this.setShape( renderBrushSquare, size )
  }

  /**
   * Sets the shape, a second time.
   */
  setShape( render:RenderFunction, size:number ):this {
    if ( ! render ) {
      throw new Error( "undefined brush render given" )
    }

    this.shape = render
    this.size  = size

    this.renderShape( render )

    return this
  }

  /**
   * This is the brush size, at the current zoom level.
   *
   * So if the brush size is 10, and the zoom level is 3,
   * then this value will be 30 (10 * 3).
   */
  private getZoomSize() {
    const size = this.size
    const zoom = this.zoom

    return Math.max( (size*zoom) | 0, BRUSH_CURSOR_MINIMUM_SIZE )
  }

  renderShape( render:RenderFunction ):void {
    if ( render !== null ) {
      const zoomSize = this.getZoomSize()
      this.shape = render

      if ( ! this.isHidden ) {
        // draws a cross hair
        if ( zoomSize <= BRUSH_CURSOR_MINIMUM_SIZE ) {
          this.setCrosshair()

        } else {
          const canvas = this.canvas
          const ctx = canvas.getContext( '2d' ) as CanvasRenderingContext2D
          const canvasSize  = zoomSize + BRUSH_CURSOR_PADDING

          canvas.width = canvas.height = canvasSize

          ctx.beginPath()
          ctx.lineCap   = 'round'
          ctx.lineWidth = 1

          this.shape( ctx, canvas, zoomSize )

          const middle = canvas.width/2

          // draw a dot in the centre
          ctx.beginPath()

          ctx.strokeStyle = '#fff'
          ctx.globalAlpha = 0.9
          ctx.strokeRect( middle-0.75, middle-0.75, 1.5, 1.5 )

          ctx.strokeStyle = '#000'
          ctx.globalAlpha = 0.6
          ctx.strokeRect( middle-0.5 , middle-0.5 , 1  , 1   )

          this.cursor.setCursorURL( canvas.toDataURL(), canvas.width )
        }
      }
    }
  }

  /**
   * Sets the zoom.
   *
   * The refresh parameter is optional, and defaults to true. When false,
   * this will not do any kind of redrawing.
   *
   * That is useful, if you are planning to refresh yourself, after calling
   * this.
   *
   * @param zoom The new zoom value.
   * @param refresh Optional, true if this should refresh, false if not. Defaults to true.
   */
  setZoom( zoom:number, refresh:RefreshState ) {
    this.zoom = zoom

    if ( this.shape && refresh === 'refresh' ) {
      this.renderShape( this.shape )
    }

    return this
  }

  setCommandCursor( painter:SkyBrush, command:Command ) {
    const cursor = command.getCursor()

    if ( cursor === null ) {
      this.cursor.setBlankCursor()
    } else if ( typeof cursor === 'string' ) {
      this.cursor.setClass( cursor )
    } else {
      cursor.call( command, this, painter )
    }

    return this
  }

  setClass( klass:string ) {
    this.cursor.setClass( klass )
    this.shape = null

    return this
  }
}

function renderBrushCrosshair(
    ctx:CanvasRenderingContext2D,
    _canvas:HTMLCanvasElement,
    size:number,
):void {
  ctx.globalAlpha = 0.75

  ctx.strokeStyle = ctx.fillStyle = '#fff'
  ctx.translate( 0.2, 0.2 )
  canvasUtils.renderCrossHair( ctx, size )

  ctx.strokeStyle = ctx.fillStyle = '#000'
  ctx.translate( -0.4, -0.4 )
  canvasUtils.renderCrossHair( ctx, size )
}

function renderBrushSquare(
    ctx:CanvasRenderingContext2D,
    canvas:HTMLCanvasElement,
    size:number,
):void {
  const middle   = canvas.width/2
  const halfSize = size/2

  // an outer square
  ctx.strokeStyle = '#fff'
  ctx.globalAlpha = 0.9
  ctx.strokeRect(
      (middle-halfSize)+0.4,
      (middle-halfSize)+0.4,
      size-0.8,
      size-0.8,
  )

  // an outer square
  ctx.strokeStyle = '#000'
  ctx.globalAlpha = 1
  ctx.strokeRect(
      middle-halfSize,
      middle-halfSize,
      size,
      size,
  )
}

function renderBrushCircle(
    ctx:CanvasRenderingContext2D,
    canvas:HTMLCanvasElement,
    size:number,
):void {
  const middle = canvas.width/2
  const halfSize = size = 2

  // an inner circle
  ctx.strokeStyle = '#fff'
  ctx.globalAlpha = 0.9
  canvasUtils.circlePath( ctx,
      (middle-halfSize)+0.7,
      (middle-halfSize)+0.7,
      size-1.4,
      size-1.4
  )
  ctx.stroke()

  // an outer circle
  ctx.strokeStyle = '#000'
  ctx.globalAlpha = 1
  canvasUtils.circlePath( ctx,
      middle - halfSize,
      middle - halfSize,
      size,
      size
  )
  ctx.stroke()
}
