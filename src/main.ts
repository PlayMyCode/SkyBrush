
import * as constants from 'setup/constants'
import { SizeArea, Location, Point } from 'util/area'
import { Nullable, Consumer } from 'util/function-interfaces'
import * as cursors from 'commands/cursors'
import * as canvasUtils from 'util/canvas'
import * as htmlUtils from 'util/html'
import * as colourUtils from 'util/colours'
import * as mathsUtils from 'util/maths'
import * as inputUtils from 'util/input'
import * as events from 'util/events'
import * as skybrush from 'skybrush'
export * from 'skybrush'

/**
 * @license
 *
 * SkyBrush - skybrush
 *
 * Copyright (c) 2012 Joseph Lenton
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of the <organization> nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * SkyBrush
 *
 * An embeddable, HTML5 Canvas powered, based art painting
 * application!
 *
 * It allows you to have a canvas, which can be moved around
 * and zoomed, floating dialog boxes on top of the canvas,
 * various brushes you can use for painting, colour picker,
 * and more!
 *
 * = Features =
 *  - easy embeddable painting application
 *  - Cross browser; supports IE 9+, Firefox, Chrome, Safari and Opera
 *  - single interface for setting/getting/manipulating content
 *  - no cruft! It's just an art package, you can add your own stuff around it.
 *
 * = Controls =
 *
 * These commands switch to a tool (a Command):
 *
 *  p - pencil
 *  b - brush
 *  w - webby/shading brush
 *  e - eraser
 *  r - rectangle
 *  c - circle
 *  l - line
 *  s - select
 *  m - move
 *  f - fill
 *  z - zoom
 *  k - colour picker
 *
 * These commands do stuff:
 *
 *  shift+mousewheel - zooms in and out
 *
 *  delete - clears selection (or everything if no selection)
 *  ctrl+z - undo
 *  ctrl+r, ctrl+y - redo
 *
 *  ctrl+x - cut selection
 *  ctrl+c - copy selection
 *  ctrl+v - paste
 *  ctrl+e - crop
 *  ctrl+a - select all
 *
 * @dependencies jQuery
 * @author Joseph Lenton
 *
 * @param window The browser Window.
 * @param document The document HTML Dom document.
 */

/*
 * Read this first section up till 'Canvas Pixels'. The rest
 * you can skip, but come back to if you see those terms else
 * where in the code.
 *
 * SkyBrush is built as an event based system. The idea is that
 * you should just send changes to SkyBrush, who in turn
 * propogates them to the other components.
 *
 * To update, you listen on those events, and wait to be called.
 *
 * This means in practice that events might update twice, or
 * be asked to perform updates which are not needed. This is a
 * small price to pay for making the code _much_ simpler.
 *
 * The alternative would be for every component to need to
 * know about every other component, which would not be
 * pleasent to code against!
 *
 * = 'Canvas Pixels' =
 *
 * There are two co-ordinate systems in SkyBrush. These
 * are:
 *
 *  - canvas pixels - This means it is based on the original
 *    canvas size. So if the canvas is 100 by 100, and it's
 *    zoomed in at 300%, then the canvas is 300 by 300.
 *
 *    However canvas pixels is still a value from 0 to 100,
 *    because it ignores zoom!
 *
 *  - mouse location - the mouse in relation to the canvas.
 *    This does not ignore zoom, and so the canvas would be
 *    located from 0 to 300.
 *
 * Locations can be given outside of those ranges, it is
 * simply ignored, or some other special logic is done.
 *
 * The point is to remember that we have a canvas which
 * internally has no zoom applied to it, but externally it
 * does.
 */

/**
 * @const
 */
const DEFAULT_GRID_WIDTH  = 5 // pixels
const DEFAULT_GRID_HEIGHT = 5 // pixels

/**
 * Warning, this should always be greater than the time it takes to
 * open or close the GUI pane, due to a bug in Chrome.
 */
const CANVAS_LAZY_REFLOW_DELAY = 180

/**
 * The default size for brushes.
 *
 * @const
 * @type {number}
 */
const DEFAULT_BRUSH_SIZE = 2

const UPSCALE_BACK_OFFSET_MOD = 16

/**
 * When scrolling, the canvas will wait this amount of time
 * before it tries to display the upscale.
 *
 * This is to allow people to continously scroll without it
 * freezing up on them.
 *
 * @const
 * @type {number}
 */
const UPSCALE_SCROLL_DELAY = 350

/**
 *
 * @const
 * @type {number}
 */
const UPSCALE_DIVIDE_AREA = 400

/**
 * The speed of the animation when updating the canvas size/position
 *
 * @const
 * @type {number}
 */
const CANVAS_UPDATE_SPEED = 200

/**
 * The number of canvas' to store internally in the undo stack
 * this equates to how many times you can click back 'undo'.
 *
 * @const
 * @type {number}
 */
const UNDO_STACK_SIZE = 40

/**
 * The maximum brush size allowed.
 *
 * @const
 * @type {number}
 */
const MAX_BRUSH_SIZE = 50

/**
 * Algorithm for copying data from src to the destination
 * canvas, using a nearest neighbour algorithm.
 *
 * For scaling, this does not use the width and height!
 * It uses the 'pixelWidth' and 'pixelHeight' values. Why?
 * It is so you can  upscale a dirty region on the
 * destination.
 *
 * The size of a pixel from src is always 1. So if you are
 * scaling to twice the size, then pixel width and height
 * should be 2. If it's 3 and a half times, then they
 * should be 3.5.
 *
 * If your scaling down, then it's a value less then 1.
 * i.e. it's 0.5 for half the size, and 0.25 for a quarter.
 *
 * Pixel width and height are seperate so you can scale
 * in the x and y directions by different scales.
 *
 * Optimizations include:
 *  = using UInt8ClampedArray where available
 *  = look aheads when drawing, to draw a strip rather
 *    then indevidual rectangles.
 *  = iterating across the src as a flat array, rather
 *    then working out 2d indexes.
 *  = caching colour and alpha changes
 *  = multiple code paths, for eliminating un-needed work.
 *  = fast positive round bitshifting
 *  = lots of manual changes, like inlining assignments (yes it's faster)
 *
 * Note that the src is canvas image data, the value
 * returned from calling 'ctx.getImageData'. This is to
 * allow both dest and src to be the same, by getting out
 * the data, resizing it, and then passing src in as dest.
 *
 * The overlay is the same, but it is also optional. Just
 * leave it out if you don't need it.
 *
 * forceSrcAlpha is a flag to only use the alpha component
 * from the src data, when mixing with the overlay.
 *
 * If it's true, then the overlay will only show up where
 * the src has an alpha value which is greater then 1.
 * This transparent areas stay transparent.
 *
 * Even then, if the overlay has full alpha, and src has
 * 0.5 alpha, then the destination is drawn with 0.5 alpha.
 *
 * Due to floating point rounding errors, this only works
 * on scaling images with sizes less then 1 million pixels
 * wide.
 *
 * @const
 *
 * @param dest HTML5 Canvas to use for drawing the scaling to.
 * @param startX Where to start drawing to on the destination.
 * @param startY Y start location for drawing on the destination.
 * @param destW Size of drawing area on destination.
 * @param destH Size of drawing area on destination.
 *
 * @param pixelWidth The width of a pixel on destination.
 * @param pixelHeight The height of a pixel on the destination.
 *
 * @param sData The source pixel data.
 * @param x The x co-ordinate of where you are reading from on src and overlay.
 * @param y The y co-ordinate of where we are copying from on src and overlay.
 * @param w The width of both src and overlay pixel data.
 * @param h The height of both the src and overlay pixel data.
 * @param oData Optional, overlay canvas pixels to copy from when blending.
 *
 * @param forceSrcAlpha Optional, when true, overlay is written using the alpha component on src.
 */
/*
 * Note that this is built with up scaling in mind, where
 * destination is larger then the src. Down scaling works
 * fine, but it's optimized for up scaling.
 */
function copyNearestNeighbour(
    dest:HTMLCanvasElement,

    startX:number, startY:number,
    destW:number, destH:number,

    pixelWidth:number, pixelHeight:number,

    srcImage:ImageData, _x:number, _y:number, _w:number, _h:number,
    overlayImage:ImageData|null,

    forceSrcAlpha:boolean,
) {
  const includeOverlay = !! overlayImage

  const dCtx = dest.getContext('2d') as CanvasRenderingContext2D

  const sData = new Int32Array( srcImage.data.buffer )
  const oData = ( overlayImage
      ? new Int32Array( overlayImage.data.buffer )
      : null
  )

  let endX = startX + destW
  let endY = startY + destH

  /*
   * Takes off a little from the end, if pixelWidth/Height
   * is not a whole number. This is to account for
   * floating point number rounding errors.
   */
  if ( pixelWidth % 1 !== 0 ) {
    endX -= 0.000001
  }

  if ( pixelHeight % 1 !== 0 ) {
    endY -= 0.000001
  }

  dCtx.clearRect( startX, startY, (destW|0), (destH|0) )

  dCtx.fillStyle = '#000'
  dCtx.globalAlpha = 1

  /*
   * This optimization is about avoiding calls to update
   * fillStyle and globalAlpha.
   *
   * This saves about 10% to 20%
   */
  let lastColour = 0
  let lastAlpha = 255

  // location of the pixel in both canvas and overlay
  let i = 0
  let drawY = startY

  while ( drawY < endY ) {
    const nextY = drawY + pixelHeight
    const drawYI = ((0.5 + drawY) | 0)
    const diffY = ((0.5 + nextY) | 0) - drawYI

    let drawX = startX

    while ( drawX < endX ) {
      let nextX = drawX + pixelWidth
      const cRGB = sData[i]
      const oRGB = ( oData !== null ? oData[i] : 0 )
      const ca = (cRGB >> 24) & 0xFF
      const oa = (oRGB >> 24) & 0xFF

      /*
        * Skip Transparency When:
        *  = canvas and overlay are empty
        *  = using destination alpha and canvas is empty
        */
      if ( ! (
          ca === 0 && ( oa === 0 || forceSrcAlpha )
      ) ) {
        const nowDrawX = ((0.5 + drawX) | 0)
        let r = 0
        let g = 0
        let b = 0

        // overlay is blank
        if ( oa === 0 ) {
          r =  cRGB        & 0xFF
          g = (cRGB >> 8 ) & 0xFF
          b = (cRGB >> 16) & 0xFF

          if ( ca !== lastAlpha ) {
            dCtx.globalAlpha = ( lastAlpha = ca ) / 255.0
          }
        // full overlay alpha
        } else if ( oa === 255 && forceSrcAlpha === false ) {
          r =  oRGB        & 0xFF
          g = (oRGB >>  8) & 0xFF
          b = (oRGB >> 16) & 0xFF

          if ( lastAlpha !== 255 ) {
            dCtx.globalAlpha = 1
            lastAlpha = 255
          }
        // canvas is blank
        } else if ( ca === 0 ) {
          // nothing will be drawn using forceSrcAlpha, so just move on
          r =  oRGB        & 0xFF
          g = (oRGB >>  8) & 0xFF
          b = (oRGB >> 16) & 0xFF

          if ( oa !== lastAlpha ) {
            dCtx.globalAlpha = (lastAlpha = oa) / 255.0
          }
        // mix canvas and overlay
        } else if ( forceSrcAlpha ) {
          /*
            * If we have full overlay alpha,
            * then no mixing is needed,
            * as the overlay will 100% win anyway.
            */
          if ( oa === 255 ) {
            r =  oRGB        & 0xFF
            g = (oRGB >>  8) & 0xFF
            b = (oRGB >> 16) & 0xFF
          } else {
            const oaPercent = ( oa / 255.0 )
            const iOa = 1 - oaPercent

            r = ( cRGB        & 0xFF)*iOa + ( oRGB        & 0xFF)*oaPercent
            g = ((cRGB >>  8) & 0xFF)*iOa + ((oRGB >>  8) & 0xFF)*oaPercent
            b = ((cRGB >> 16) & 0xFF)*iOa + ((oRGB >> 16) & 0xFF)*oaPercent

            // fast, positive only, rounding
            r = (r+0.5) | 0
            g = (g+0.5) | 0
            b = (b+0.5) | 0
          }

          if ( ca !== lastAlpha ) {
            dCtx.globalAlpha = (lastAlpha = ca) / 255.0
          }
        } else {
          r =  cRGB        & 0xFF
          g = (cRGB >>  8) & 0xFF
          b = (cRGB >> 16) & 0xFF

          if ( ca !== lastAlpha ) {
            dCtx.globalAlpha = (lastAlpha = ca) / 255.0
          }

          const nextColour = (r << 16) | (g << 8) | b
          if ( nextColour !== lastColour ) {
            dCtx.fillStyle = colourUtils.rgbToColour( r, g, b )
            lastColour = nextColour
          }

          dCtx.fillRect(
              nowDrawX,
              drawYI,
              ((0.5 + nextX) | 0) - nowDrawX,
              diffY
          )

          // draw Overlay on top
          r =  oRGB        & 0xFF
          g = (oRGB >>  8) & 0xFF
          b = (oRGB >> 16) & 0xFF

          if ( oa !== lastAlpha ) {
            dCtx.globalAlpha = ( lastAlpha = oa ) / 255.0
          }
        }

        /*
          * next colour _must_ be hand mixed,
          * because we cannot use cRGB or oRGB.
          *
          * The reason why is because we would have to mix
          * them, to account for the various ways that the
          * above rendering could be done.
          *
          * So either way, we have mixing : ( .
          */
        const nextColour = (r << 16) | (g << 8) | b
        if ( nextColour !== lastColour ) {
          dCtx.fillStyle = colourUtils.rgbToColour( r, g, b )
          lastColour = nextColour
        }

        if ( ! includeOverlay ) {
          /*
            * This funky-for-loop crawls forward,
            * along the x axis of the pixels,
            * if the next pixel is the same.
            *
            * This allows us to draw a strip,
            * rather then a single pixel,
            * which is significantly faster!
            */
          for (
            ;
            (nextX < endX) && (sData[i+1] === cRGB);
              nextX += pixelWidth, i++
          ) { }

          dCtx.fillRect(
              nowDrawX,
              drawYI,
              ((0.5 + nextX) | 0) - nowDrawX,
              diffY
          )
        } else {
          dCtx.fillRect(
              nowDrawX,
              drawYI,
              ((0.5 + nextX) | 0) - nowDrawX,
              diffY
          )
        }
      }

      i++
      drawX = nextX
    }

    drawY = nextY
  }
}

export function newGridLine( direction:GridDirection, x:number, y:number ) {
  const gridLine = htmlUtils.newDiv( `skybrush_grid_line is-${direction}` )
  gridLine.style.transform = `translate( ${x}px, ${y}px )`

  return gridLine
}

/**
 * The UndoStack manages the undo/redo functionality in SkyBrush.
 *
 * It does this through a series of stacks,
 * which it switches between.
 *
 * Once this goes beyond the alotted size, then old undo's will
 * no longer be stored, and will fall out of memory. Although there
 * if always a base undo canvas, which has everything up to that
 * point stored on it.
 *
 * @constructor
 * @private
 *
 * @param size The number of undo's allowed.
 */
export class UndoStack {
  private index     : number
  private undoIndex : number
  private maxRedo   : number

  ///
  /// The maximum number of canvases we will ever hold.
  ///
  private readonly maxSize : number

  ///
  /// Where we are holding our redo/undo canvases.
  ///
  private readonly canvases : HTMLCanvasElement[]

  constructor( size:number, firstCanvas:HTMLCanvasElement ) {
    // the +1 is for the checks later
    this.maxSize   = size + 1
    this.index     = 0
    this.undoIndex = 0
    this.maxRedo   = 0

    this.reset( firstCanvas )
  }

  reset( firstCanvas:HTMLCanvasElement ):this {
    this.index     = 0
    this.undoIndex = 0
    this.maxRedo   = 0

    const first = htmlUtils.newCanvas( firstCanvas.width, firstCanvas.height )
    const ctx   = first.getContext( '2d' ) as CanvasRenderingContext2D

    ctx.drawImage( firstCanvas, 0, 0 )

    this.canvases.length = 0
    this.canvases.push( first )

    return this
  }

  /**
   * @param canvas The current canvas.
   * @return canvas The canvas to use for the future.
   */
  add( canvas:HTMLCanvasElement ):this {
    const undoCanvas = this.grabUndoCanvas( canvas.width, canvas.height )
    const ctx        = undoCanvas.getContext( '2d' ) as CanvasRenderingContext2D

    ctx.drawImage( canvas, 0, 0 )
    this.canvases[ this.undoIndex ] = undoCanvas

    return this
  }

  /**
   * This will give you a new canvas you can use for the undo stack.
   * This might be an old canvas being recycled.
   * It might be a totally new canvas.
   */
  private grabUndoCanvas( width:number, height:number ):HTMLCanvasElement {
    // We've hit the max size of the undo stack.
    // So we must shift an old canvas out and return it.
    if ( this.undoIndex === this.maxSize ) {
      const undoCanvas = this.canvases.shift()

      if ( ! undoCanvas ) {
        return htmlUtils.newCanvas( width, height )
      }

      undoCanvas.width  = width
      undoCanvas.height = height

      return undoCanvas
    }

    this.undoIndex++
    this.maxRedo = this.undoIndex

    // Write over the top of an old 'redo' canvas
    if ( this.undoIndex < this.canvases.length ) {
      const undoCanvas = this.canvases[ this.undoIndex ]
      undoCanvas.width  = width
      undoCanvas.height = height

      return undoCanvas
    }

    // No undo canvases to reuse.
    // So lets return a new one.
    return htmlUtils.newCanvas( width, height )
  }

  /**
   * Invalidates all possible redo actions.
   *
   * What does this mean in practice? Well if you have drawn something,
   * then used undo, the first item is now stored as a 'future' item.
   * This is something that will be restored when the 'redo'.
   *
   * But if you draw something else, without redo'ing, then that redo
   * should no longer be available. Call this method to say "all of
   * the redo's you have available, invalidate them".
   *
   * In practice, this is done internally for you, when you add items.
   */
  clearRedo():this {
    for ( let i = this.undoIndex; i < this.canvases.length; i++ ) {
      this.canvases.pop()
    }

    return this
  }

  /**
   * @return True if calling 'undo' will undo the current canvas.
   */
  hasUndo():boolean {
    return this.undoIndex > 0
  }

  /**
   * @return True if there is history to redo.
   */
  hasRedo():boolean {
    return this.undoIndex < this.maxRedo
  }

  /**
   * This does nothing if there is nothing to undo.
   */
  undo():Nullable<HTMLCanvasElement> {
    if ( this.hasUndo() ) {
      this.undoIndex--

      const canvas = this.canvases[ this.undoIndex ]

      return canvas
    }

    return null
  }

  /**
   * This does nothing if there is nothing to redo.
   */
  redo():Nullable<HTMLCanvasElement> {
    if ( this.hasRedo() ) {
      this.undoIndex++

      return this.canvases[ this.undoIndex ]
    }

    return null
  }
}

export type GridDirection =
  | 'horizontal'
  | 'vertical'

/**
 * The GridManager wraps up all of the grid handling for the canvas.
 * It's very closely tied to the CanvasManger,
 * and exists pretty much solely to make the code a little more
 * modular.
 *
 * @constructor
 */
export class GridManager {
  private readonly dom : HTMLElement

  private offsetX : number
  private offsetY : number

  ///
  /// The width of each grid section. So it could be 5, or 10.
  /// In pixels.
  ///
  private gridW : number

  ///
  /// The height of each grid section. So it could be 5, or 10.
  /// In pixels.
  ///
  private gridH : number

  private zoom : number

  /**
   * This updates in a lazy way.
   *
   * The isDirty flag is denoted to state that the dom does need to update when
   * it is shown.
   */
  private isDirty : boolean

  constructor ( viewport:HTMLElement ) {
    const dom = document.createElement( 'div' )
    dom.className = 'skybrush_grid'

    this.dom = dom
    viewport.appendChild( dom )

    this.offsetX = 0
    this.offsetY = 0
    this.gridW  = DEFAULT_GRID_WIDTH
    this.gridH = DEFAULT_GRID_HEIGHT

    this.zoom = 1
    this.isDirty = true
  }

  /**
   * Sets the size of the grid squares, in pixels.
   */
  setSize( w:number, h:number ):this {
    w = Math.max( w|0, 0 )
    h = Math.max( h|0, 0 )

    if ( w !== this.gridW || h !== this.gridH ) {
      this.gridW = w
      this.gridH = h

      this.update()
    }

    return this
  }

  getWidth() {
    return this.gridW
  }

  getHeight() {
    return this.gridH
  }

  getOffsetX() {
    return this.offsetX
  }

  getOffsetY() {
    return this.offsetY
  }

  /**
   * Allows you to offset the location of the grid,
   * from the top left corner,
   * by the amounts given.
   */
  setOffset( x:number, y:number ):this {
    if ( isNaN(x) ) {
      x = 0
    } else {
      x = x|0
    }

    if ( isNaN(y) ) {
      y = 0
    } else {
      y = y|0
    }

    if ( x < 0 ) {
      x = - ( x % this.gridW )
      x = this.gridW - x
    }

    if ( y < 0 ) {
      y = - ( y % this.gridH )
      y = this.gridH - y
    }

    const update = ( this.offsetX !== x || this.offsetY !== y )
    if ( update ) {
      this.offsetX = x
      this.offsetY = y

      this.update()
    }

    return this
  }

  isShown() {
    return this.dom.classList.contains( 'sb_show' )
  }

  show():this {
    if ( this.isDirty ) {
      this.populateWithGridLines()
      this.isDirty = false
    }

    this.dom.classList.add( 'sb_show' )

    return this
  }

  hide():this {
    this.dom.classList.remove( 'sb_show' )

    return this
  }

  /**
   * Moves this grid to the area stated,
   * and re-organizes the grid to look how it's shown.
   *
   * The CanvasManager does work to located the upscale
   * canvas to fill the proper canvas. To avoid duplicating
   * this code, this method is provided to allow the canvas
   * to just pass the results on to this grid.
   */
  updateViewport(
      canvasX:number,
      canvasY:number,
      width:number,
      height:number,
      zoom:number,
  ):this {
    this.zoom = zoom

    this.dom.style.width  = (width+1 ) + 'px'
    this.dom.style.height = (height+1) + 'px'
    this.dom.style.transform = `translate( ${canvasX}px, ${canvasY}px )`

    this.update()

    return this
  }

  /**
   * Updates the layout of the grid.
   *
   * This should be called right after any properties have
   * been altered, but is only used internally.
   *
   * Calls such as 'setSize' and 'setOffset' already call
   * this automatically.
   */
  private update() {
    if ( this.isShown() ) {
      this.populateWithGridLines()
      this.isDirty = false
    } else {
      this.isDirty = true
    }
  }

  /**
   * This builds the grid lines and places then inside this DOM.
   *
   * This is bit the of code that actually really will put down grid lines.
   */
  private populateWithGridLines():void {
    populateWithGridLines(
        this.dom,
        this.offsetX,
        this.offsetY,
        this.gridW,
        this.gridH,
        this.zoom,
    )
  }
}

/**
 * This builds the grid lines and places then inside this DOM.
 *
 * This is bit the of code that actually really will put down grid lines.
 */
function populateWithGridLines(
    dom : HTMLElement,
    offsetX : number,
    offsetY : number,
    gridW : number,
    gridH : number,
    zoom : number,
):void {
  const domW = dom.offsetWidth
  const domH = dom.offsetHeight

  const xInc = Math.max( zoom * gridW, 1 )
  const yInc = Math.max( zoom * gridH, 1 )

  const startX = ( offsetX % gridW ) * zoom
  const startY = ( offsetY % gridH ) * zoom

  dom.innerHTML = ''
  for ( let x = startX; x <= domW; x += xInc ) {
    dom.appendChild( newGridLine('vertical', x, 0) )
  }

  for ( let y = startY; y <= domH; y += yInc ) {
    dom.appendChild( newGridLine('horizontal', 0, y) )
  }
}

/**
 * Originally the marquee selector and the grid and things like that were
 * all implemented as totally seperate components. However over time, they
 * ended up with a lot of similar code.
 *
 * So this was created as an object they can use to help contain that common
 * code.
 */
export class ViewOverlay {
  private readonly dom : HTMLElement

  private x : number
  private y : number
  private w : number
  private h : number

  private zoom : number

  private canvasX : number
  private canvasY : number

  private lastLeft : number
  private lastTop  : number

  private lastHeight : number
  private lastWidth  : number

  constructor( viewport:HTMLElement, className:string ) {
    this.dom = htmlUtils.newDiv( className )

    viewport.appendChild( this.dom )

    this.x = 0
    this.y = 0
    this.w = 0
    this.h = 0

    this.zoom = 1

    this.canvasX = 0
    this.canvasY = 0

    this.lastLeft = 0
    this.lastTop  = 0

    // set to invalid values so the first time a width/height is set,
    // it'll be guaranteed to go through
    this.lastHeight = -1
    this.lastWidth  = -1
  }

  addClass( klass:string ):this {
    this.dom.classList.add( klass )

    return this
  }

  hasClass( klass:string ):boolean {
    return this.dom.classList.contains( klass )
  }

  removeClass( klass:string ):this {
    this.dom.classList.remove( klass )

    return this
  }

  append( child:HTMLElement ):this {
    this.dom.appendChild( child )

    return this
  }

  /**
   * Takes canvas pixels, and resizes to DOM pixels.
   */
  setCanvasSize( x:number, y:number, w:number, h:number ):this {
    const zoom = this.zoom

    const left = (this.canvasX + x*zoom + 0.5)|0
    const top  = (this.canvasY + y*zoom + 0.5)|0

      /* -2 is to accommodate the 2-pixel border width in the CSS */
    const width = Math.max( 0, ((w*zoom)|0)-2 )
    const height= Math.max( 0, ((h*zoom)|0)-2 )

    /*
     * Only update teh changes we have to.
     */
    if ( left !== this.lastLeft || top !== this.lastTop ) {
      this.lastLeft = left
      this.lastTop  = top

      this.dom.style.transform = `translate( ${left}px, ${top}px )`
    }

    if ( width !== this.lastWidth ) {
      this.lastWidth = width
      this.dom.style.width = `${width}px`
    }
    if ( height !== this.lastHeight ) {
      this.lastHeight = height
      this.dom.style.height = `${height}px`
    }

    return this
  }

  /**
   * Tells this about any view changes in the SkyBrush viewport.
   */
  updateViewport( canvasX:number, canvasY:number, _width:number, _height:number, zoom:number ):this {
    this.zoom    = zoom
    this.canvasX = canvasX
    this.canvasY = canvasY

    return this
  }
}

/**
 * This handles the clipping/select region on the Canvas.
 *
 * @constructor
 * @private
 */
export class Marquee {
  private readonly viewOverlay : ViewOverlay
  private readonly canvas      : CanvasManager

  private readonly topLeftHandle     : HTMLElement
  private readonly bottomRightHandle : HTMLElement

  ///
  /// Where the marquee is positioned on the screen.
  ///
  private readonly position : SizeArea

  private isShowingHandles : boolean

  constructor(
      canvas:CanvasManager,
      viewport:HTMLElement,
      painter:skybrush.SkyBrush,
  ) {
    this.canvas = canvas

    const topLeft         = document.createElement( 'div' )
    topLeft.className     = 'skybrush_marquee_handle sb_top_left sb_no_target'

    const bottomRight     = document.createElement( 'div' )
    bottomRight.className = 'skybrush_marquee_handle sb_bottom_right sb_no_target'

    this.topLeftHandle     = topLeft
    this.bottomRightHandle = bottomRight

    this.viewOverlay = new ViewOverlay( viewport, 'skybrush_marquee' )
        .append( topLeft )
        .append( bottomRight )

    this.position = { x: 0, y: 0, w: 0, h: 0 }

    this.isShowingHandles = false

    inputUtils.leftDown( topLeft, () => {
      this.startHighlight( false )

      painter.startDrag(
          ( ev, x, y ) => {
            this.updateTopLeft( ev, x, y )
          },

          ( ev, x, y ) => {
            this.updateTopLeft( ev, x, y )
            this.stopHighlight()
          },
      )
    })

    inputUtils.leftDown( bottomRight, () => {
      this.startHighlight( false )

      painter.startDrag(
          ( ev, x, y ) => {
            this.updateWidthHeight( ev, x, y )
          },

          ( ev, x, y ) => {
            this.updateWidthHeight( ev, x, y )
            this.stopHighlight()
          },
      )
    })
  }

  private updateTopLeft( _ev:MouseEvent, x:number, y:number ) {
    const endX = this.position.x + this.position.w
    const endY = this.position.y + this.position.h

    if ( x > endX ) {
      x = endX
    }

    if ( y > endY ) {
      y = endY
    }

    const w = endX - x
    const h = endY - y

    this.selectArea( x, y, w, h )
  }

  private updateWidthHeight( _ev:MouseEvent, x:number, y:number ) {
    const newW = Math.max( 0, x - this.position.x )
    const newH = Math.max( 0, y - this.position.y )

    this.selectArea(
        this.position.x,
        this.position.y,
        newW,
        newH
    )
  }

  updateViewport( canvasX:number, canvasY:number, width:number, height:number, zoom:number ):this {
    this.viewOverlay.updateViewport( canvasX, canvasY, width, height, zoom )
    this.update()

    return this
  }

  setCanvasSize( x:number, y:number, w:number, h:number ):this {
    this.viewOverlay.setCanvasSize( x, y, w, h )

    return this
  }

  /**
   * Begins displaying the resize handles.
   */
  showHandles():this {
    this.topLeftHandle.classList.add( 'sb_show' )
    this.bottomRightHandle.classList.add( 'sb_show' )

    return this
  }

  /**
   * Hides the resize handles.
   */
  hideHandles():this {
    this.topLeftHandle.classList.remove( 'sb_show' )
    this.bottomRightHandle.classList.remove( 'sb_show' )

    return this
  }

  /**
   * Puts this into highlighting mode.
   *
   * This is a visual change, to give the user a visual
   * indication that the marquee is currently being altered.
   *
   * @param clear True to clear this when it highlights, false to not. Defaults to true.
   */
  startHighlight( clear:boolean = true ):this {
    this.viewOverlay.addClass( 'sb_highlight' )

    if ( clear ) {
      this.clear()
    } else {
      this.viewOverlay.removeClass( 'sb_reposition' )
    }

    return this
  }

  /**
   * Ends highlighting mode,
   * so the visual highlighting that this marquee
   * shows will now end.
   */
  stopHighlight():this {
    const x = this.position.x
    const y = this.position.y
    const w = this.position.w
    const h = this.position.h

    this.viewOverlay.removeClass( 'sb_highlight' )

    if (
        x < 0 ||
        y < 0 ||
        w+x > this.canvas.getWidth()  ||
        h+y > this.canvas.getHeight()
    ) {
      const x2 = Math.max( x, 0 )
      const y2 = Math.max( y, 0 )

      const w2 = Math.min( w+x, this.canvas.getWidth()  ) - x2
      const h2 = Math.min( h+y, this.canvas.getHeight() ) - y2

      this.selectArea( x2, y2, w2, h2 )
    }

    if ( this.hasClipArea() ) {
      this.canvas.setClip( this.position.x, this.position.y, this.position.w, this.position.h )
    } else {
      this.viewOverlay.removeClass('sb_show')
    }

    return this
  }

  hasClipArea():boolean {
    return ! (
        this.position.w <= 0 ||
        this.position.h <= 0 ||
        this.position.x+this.position.w < 0 ||
        this.position.y+this.position.h < 0 ||
        this.position.x >= this.canvas.getWidth() ||
        this.position.y >= this.canvas.getHeight()
    )
  }

  /**
   * Selections the region given.
   *
   * If the region is outside of the canvas then it is counted
   * as a non-selection.
   */
  select( x:number, y:number, x2:number, y2:number ):this {
    return this.selectArea(
        Math.min( x, x2 ),
        Math.min( y, y2 ),

        Math.abs( x2-x ),
        Math.abs( y2-y )
    )
  }

  xy( x:number, y:number ):this {
    return this.selectArea( x, y, this.position.w, this.position.h )
  }

  selectArea( x:number, y:number, w:number, h:number ):this {
    // floor all locations
    this.position.x = x|0
    this.position.y = y|0
    this.position.w = w|0
    this.position.h = h|0

    return this.update()
  }

  /**
   * Cleares the current selection on the Marquee.
   *
   * This is the same as selection a 0x0 region.
   */
  clear():this {
    if ( this.viewOverlay.hasClass('sb_show') ) {
      this.select( 0, 0, 0, 0 )
      this.canvas.removeClip()
      this.viewOverlay.removeClass( 'sb_reposition' )

      return this.update()
    }

    return this
  }

  hasNoSelection():boolean {
    return ( this.position.w === 0 ) && ( this.position.h === 0 )
  }

  /**
   * Returns an object showing the current selection, in canvas pixels,
   * or null if there is no selection.
   *
   * @return null if there is no selection, or an object describing it.
   */
  getPosition():Nullable<SizeArea> {
    const hasSelection = this.viewOverlay.hasClass( 'sb_show' )

    return hasSelection ?
        this.position :
        null
  }

  /**
   * Cases this to hide/show it's self,
   * based on the current selection,
   * and if it is shown it will resize accordingly.
   */
  update():this {
    if ( this.viewOverlay.hasClass('sb_highlight' ) ) {
      this.viewOverlay.addClass('sb_show')

      if ( this.hasClipArea() ) {
        this.viewOverlay.removeClass('sb_outside')
      } else {
        this.viewOverlay.addClass('sb_outside')
      }

      if ( this.hasNoSelection() ) {
        this.viewOverlay.addClass('sb_temporary_hide')
      } else {
        this.viewOverlay.removeClass('sb_temporary_hide')
      }
    } else if ( this.hasClipArea() ) {
      this.viewOverlay
          .removeClass('sb_outside')
          .addClass('sb_reposition')
    } else {
      this.viewOverlay
          .removeClass('sb_outside')
          .removeClass('sb_reposition')
          .removeClass('sb_show')
    }

    //
    // Always update the dom location,
    // because it might be fading out when
    // this is called.
    //
    if ( this.hasClipArea() || this.viewOverlay.hasClass('sb_highlight') ) {
      this.setCanvasSize(
          this.position.x,
          this.position.y,
          this.position.w,
          this.position.h
      )
    }

    return this
  }
}

/**
 * The copy manager is simply some logic bound together
 * for pushing out the copy code from the CanvasManager.
 *
 * By this point in the project the CanvasManager is getting
 * really fat, so anything I can do to help keep it lean
 * helps!
 *
 * You can set and get copies to and from this CopyManager.
 * When you get a copy from it, make sure you _don't_ draw
 * on to it, because it's meant to be immutable.
 *
 * You'll mess up the copy system if you draw on to it!
 *
 * @private
 * @constructor
 */
export class CopyManager {
  private readonly viewOverlay : ViewOverlay

  private copy : Nullable<HTMLCanvasElement>

  private copyX : number
  private copyY : number

  /*
   * When these two are not undefined,
   * then we no longer in 'paste' mode.
   */
  private pasteX : number
  private pasteY : number

  private isPastingFlag : boolean

  constructor( viewport:HTMLElement ) {
    this.viewOverlay = new ViewOverlay( viewport, 'skybrush_copy' )

    this.copy = null

    this.copyX = 0
    this.copyY = 0

    /*
     * When these two are not undefined,
     * then we no longer in 'paste' mode.
     */
    this.pasteX = 0
    this.pasteY = 0
    this.isPastingFlag = false
  }

  updateViewport( canvasX:number, canvasY:number, width:number, height:number, zoom:number ):this {
    this.viewOverlay.updateViewport( canvasX, canvasY, width, height, zoom )
    this.update()

    return this
  }

  setCanvasSize( x:number, y:number, w:number, h:number ):this {
    this.viewOverlay.setCanvasSize( x, y, w, h )

    return this
  }

  update():this {
    if ( this.isPasting() && this.copy !== null ) {
      this.setCanvasSize(
          this.pasteX    , this.pasteY     ,
          this.copy.width, this.copy.height,
      )
    }

    return this
  }

  draw( dest:HTMLCanvasElement ):this {
    if ( this.copy !== null ) {
      const ctx = dest.getContext( '2d' ) as CanvasRenderingContext2D
      ctx.drawImage( this.copy, this.pasteX, this.pasteY )
    }

    return this
  }

  isPasting():boolean {
    return this.isPastingFlag
  }

  startPaste( dest:HTMLCanvasElement ):this {
    if ( this.copy !== null ) {
      this.pasteX = this.pasteY = 0
      this.isPastingFlag = true
      this.viewOverlay.addClass( 'sb_show' )

      return this.movePaste( dest, this.copyX, this.copyY, true )
    }

    return this
  }

  movePaste( dest:HTMLCanvasElement, x:number, y:number, finalize:boolean ):this {
    if ( this.isPasting() && this.copy !== null ) {
      x = (this.pasteX + (x || 0)) | 0
      y = (this.pasteY + (y || 0)) | 0

      const ctx = dest.getContext( '2d' ) as CanvasRenderingContext2D
      ctx.clearRect( 0, 0, dest.width, dest.height )
      ctx.drawImage( this.copy, x, y )
      this.setCanvasSize( x, y, this.copy.width, this.copy.height )

      if ( finalize ) {
        this.pasteX = x
        this.pasteY = y
      }
    }

    return this
  }

  setCopy( canvas:HTMLCanvasElement, x:number, y:number, w:number, h:number ):this {
    w = Math.min( w, canvas.width  )
    h = Math.min( h, canvas.height )

    // todo, remove this.
    // It exists so that when SkyBrush starts there is nothing to paste.
    // That's what the null version is.
    // Better to move that to a boolean or something and then have this as not null.
    if ( this.copy === null ) {
      this.copy = htmlUtils.newCanvas( w, h )
    } else {
      this.copy.width  = w
      this.copy.height = h
    }

    const ctx = this.copy.getContext( '2d' ) as CanvasRenderingContext2D
    ctx.drawImage( canvas, -x, -y )

    this.copyX = x
    this.copyY = y

    return this
  }

  overlapsPaste( area:SizeArea ):boolean {
    if ( this.isPasting() && this.copy !== null ) {
      const x = this.pasteX
      const y = this.pasteY
      const w = this.copy.width
      const h = this.copy.height

      const isOutsideArea = (
          x > area.x+area.w ||
          y > area.y+area.h ||
          x+w < area.x ||
          y+h < area.y
      )

      return ! isOutsideArea
    }

    return false
  }

  /**
   * Cleares this from being in pasting mode.
   */
  endPaste():this {
    this.isPastingFlag = false
    this.viewOverlay.removeClass( 'sb_show' )

    return this
  }
}

export type CanvasEvent =
  | 'onDraw'
  | 'onPaste'
  | 'onCopy'
  | 'onClip'

/**
 * This is a fat prototype that manages the whole canvas stack.
 *
 * It's built to try to hide a lot of the magic it does underneath,
 * such as the hidden overlay, and the undo stack.
 *
 * It is also built to help simplify the core SkyBrush prototype,
 * by pushing a lot of it's code out into this. That way SkyBrush
 * can concentrate more on high-level application management.
 *
 * @constructor
 * @private
 */
/*
 * Originally this was all in SkyBrush, but was moved out to break up
 * the stack.
 *
 * Silently this will have commands draw to an overlay,
 * which is located on top. This allows commands to redraw mid way,
 * such as when you are drawing a piece of geometry, so they can be
 * partially drawn. The state of the overlay when the mouse goes up
 * is what is drawn.
 *
 * It also handles zoom, and the current colour, with ways to hook into
 * when these are changed. This includes automatically making the canvas
 * bigger/smaller as needed.
 *
 * It also manages the UndoStack it holds, allowing it to chose
 * when to push canvas' down on to. The undo functionality it's self
 * if found in the UndoStack prototype.
 *
 * Finally it also does some extra middle management, such as ensuring
 * the properties set to the context is consistent. For example,
 * ensuring the current canvas 2D context is using the current colour.
 */
export class CanvasManager {
  private readonly viewport : HTMLElement
  private          canvas   : HTMLCanvasElement
  private readonly overlay  : HTMLCanvasElement
  private readonly upscale  : HTMLCanvasElement

  private          canvasCtx  : CanvasRenderingContext2D
  private          overlayCtx : CanvasRenderingContext2D
  private readonly upscaleCtx : CanvasRenderingContext2D

  private readonly undos   : UndoStack
  private readonly grid    : GridManager
  private readonly marquee : Marquee
  private readonly copyObj : CopyManager

  private readonly events : events.Handler<this, CanvasEvent>

  private readonly showUpscaleEvent : events.Runner
  private readonly upscaleWorkers : number[]

  private clipping : Nullable<SizeArea>

  private isUpscaleShown : boolean

  /**
   * For lazy calls to updateCanvasSize, this will skip multiple calls in
   * a row that occur, if updateCanvasSize has not yet been called.
   *
   * Essentially if you call lazyUpdateCanvasSize 3 times in a row, it'll
   * only run the once due to this flag.
   */
  private isAwaitingUpdate : number

  private width  : number
  private height : number
  private zoom   : number

  constructor(
      viewport : HTMLElement,
      painter  : skybrush.SkyBrush,
  ) {

    /*
     * Canvas HTML Elements
     *
     * Create and add, the actual bits that make up the canvas.
     * The canvas it's self, the overlay, and the upscale.
     */

    // Size will be set later.
    // So for now we'll just make it very small.
    const canvas  = htmlUtils.newCanvas( 1, 1 )
    const overlay = htmlUtils.newCanvas( 1, 1 )
    const upscale = htmlUtils.newCanvas( 1, 1 )

    canvas.classList.add(  'skybrush_canvas_draw'    )
    overlay.classList.add( 'skybrush_canvas_overlay' )
    upscale.classList.add( 'skybrush_canvas_upscale' )

    viewport.innerHTML = ''
    viewport.appendChild( canvas  )
    viewport.appendChild( overlay )
    viewport.appendChild( upscale )

    this.viewport = viewport

    this.canvas   = canvas
    this.overlay  = overlay
    this.upscale  = upscale

    this.canvasCtx  = canvasUtils.newCtx( canvas )
    this.overlayCtx = canvasUtils.newCtx( canvas )
    this.upscaleCtx = canvasUtils.newCtx( canvas )

    this.events           = new events.Handler<this, CanvasEvent>( this )
    this.showUpscaleEvent = new events.Runner( UPSCALE_SCROLL_DELAY )

    this.clipping = null

    this.isUpscaleShown = false

    this.isAwaitingUpdate = 0

    this.width  = this.canvas.width,
    this.height = this.canvas.height,
    this.zoom   = 1

    this.undos = new UndoStack( UNDO_STACK_SIZE, this.canvas )
    this.upscaleWorkers = []

    /* Must be added at the end! */
    viewport.addEventListener( 'scroll', () => {
      this.refreshUpscale()
    })

    /*
     * Ensure the canvas is always centred,
     * including when the window size has changed.
     */
    painter.onResize(() => {
      this.lazyUpdateCanvasSize()
    })

    this.grid    = new GridManager( viewport )
    this.marquee = new Marquee( this, viewport, painter )
    this.copyObj = new CopyManager( viewport )

    painter.onSetCommand( command => {
      if ( command.getName().toLowerCase() !== 'move' ) {
        this.drawAndEndPaste()
      }
    })

    painter.onSetAlpha(() => {
      if ( this.copyObj.isPasting() ) {
        this.copyObj.movePaste( this.overlay, 0, 0, false )
      }
    })
  }

  /**
   * @return The current contents of the canvas as an image url.
   */
  toDataURL( imageType:canvasUtils.ExportImageType ) {
    if ( typeof imageType === 'string' ) {
      return this.canvas.toDataURL( imageType )
    }

    return this.canvas.toDataURL( imageType.type, imageType.encoderOptions )
  }

  /**
   * @return The marquee manager.
   */
  getMarquee() {
    return this.marquee
  }

  /**
   * @return The GridManager used on this canvas.
   */
  getGrid() {
    return this.grid
  }

  hideOverlay() {
    this.overlay.style.display = 'none'
  }

  showOverlay() {
    this.overlay.style.display = ''
  }

  /**
   * Takes an event, and works out where it's clicking in relation
   * to the canvas. The result is then returned as a JS object,
   * with 'left' and 'top' referring to the locations.
   *
   * @param ev A mouse event to translate.
   * @return An object containing 'left' and 'top', referring to where the mouse event occurred.
   */
  translateLocation( ev:MouseEvent|Touch ):Location {
    const pos  = inputUtils.getOffset( ev, this.canvas )
    const zoom = this.zoom

    pos.left /= zoom
    pos.top  /= zoom

    return pos
  }

  /**
   * @return The offset of the underlying canvas object.
   */
  offset() {
    return htmlUtils.getOffset( this.canvas )
  }

  onEndDraw( fun:() => void ):void {
    this.events.add( 'onDraw', fun )
  }

  /**
   * Called when drawing to the overlay has ended,
   * so this canvas knows that the drawing command is over.
   *
   * This allows this to update it's undo stack,
   * and perform other post-draw tasks.
   */
  endDraw( updateArea?:SizeArea ) {
    let refresh = false

    let ux = 0
    let uy = 0
    let uw = 0
    let uh = 0

    if ( updateArea ) {
      refresh = true
      ux = updateArea.x
      uy = updateArea.y
      uw = updateArea.w
      uh = updateArea.h

      //
      // If we are updating outside the canvas,
      // then leave early.
      //
      if (
          ux+uw < 0 || uy+uh < 0 ||
          ux > this.width || uy > this.height
      ) {
        return
      }

      //
      // No point refreshing outside of the clipping area,
      // or if drawing too place outside the clipping area.
      //
      // So we quit early if either has happened.
      //
      // If drawing has taken place in the clipping,
      // then we also work out the smallest update area.
      //
      const clip = this.clipping
      if ( clip !== null ) {
        if (
            ux > clip.x + clip.w ||
            uy > clip.y + clip.h ||
            ux+uw < clip.x ||
            uy+uh < clip.y
        ) {
          return
        }

        ux = Math.max( ux, clip.x )
        uy = Math.max( uy, clip.y )
        uw = Math.min( uw, clip.w )
        uh = Math.min( uh, clip.h )
      }
    }

    this.drawSafeAlpha(() => {
      this.canvasCtx.drawImage( this.overlay, 0, 0 )
    })

    this.overlayCtx.clearRect( 0, 0, this.overlay.width, this.overlay.height )

    if ( refresh ) {
      this.redrawUpscale( ux, uy, uw, uh, false, 0 )
    }

    // A command could have hidden the overlay.
    // That's why we call to reshow it.
    this.showOverlay()

    this.undos.add( this.canvas )

    // finally, run the events!
    this.events.run( 'onDraw' )
  }

  getWidth() {
    return this.width
  }

  getHeight() {
    return this.height
  }

  /**
   * @return The Zoom value.
   */
  getZoom() {
    return this.zoom
  }

  /**
   * Changes the zoom to match.
   */
  setZoom( zoom:number, zoomXY ?: Point ):this {
    this.zoom = zoom
    this.updateCanvasSize( zoomXY )

    return this
  }

  /**
   * This is a lazy version of 'updateCanvasSize'. This will not be called
   * straight away, but instead delayed and called in the future.
   *
   * Not that multiple calls performed in a row will be ignored, if it didn't
   * actually run yet. It will only call once for each time it is called
   * multiple times.
   */
  private lazyUpdateCanvasSize():void {
    if ( this.isAwaitingUpdate ) {
      clearTimeout( this.isAwaitingUpdate )
    }

    this.isAwaitingUpdate = setTimeout(() => {
      this.isAwaitingUpdate = 0

      this.updateCanvasSize()
    }, CANVAS_LAZY_REFLOW_DELAY )
  }

  /**
   * Resizes and moves around the canvas, overlay, viewport, and the upscale.
   * It essentially resets the layout, based on the current size and zoom settings.
   *
   * The idea is that you can alter the setup, and then just call this to
   * refresh the layout, so your changes get implemented.
   *
   * This strategy is used because the layout is based on both size and zoom
   * these two properties are connected here.
   *
   * The zoomX/zoomY should be in the range of the actual drawing canvas.
   * The idea is that they are the location where someone has clicked,
   * using a command, which has all it's locations normalized.
   *
   * @param zoom A location to zoom in/out of. Provide null for no zoom.
   */
  private updateCanvasSize( zoomXY ?: Point ):void {
    const zoom     = this.zoom
    const canvas   = this.canvas
    const overlay  = this.overlay
    const viewport = this.viewport

    const canvasParent = canvas.parentElement
    if ( canvasParent === null ) {
      return
    }

    const newWidth   = Math.round( this.width  * zoom )
    const newHeight  = Math.round( this.height * zoom )

    const moveX = (canvasParent.clientWidth  - newWidth )/2
    const moveY = (canvasParent.clientHeight - newHeight)/2

    const canvasX = ( moveX >= 0 ?  moveX : 0 )
    const canvasY = ( moveY >= 0 ?  moveY : 0 )

    const left = (canvasX+0.5)|0
    const top  = (canvasY+0.5)|0

    /* Work out, and animate, the scroll change */


    const scrollTopAvailable  = Math.max( viewport.scrollHeight - viewport.clientHeight, 0 )
    const scrollLeftAvailable = Math.max( viewport.scrollWidth  - viewport.clientWidth , 0 )

    let zoomOffsetX = 0
    let zoomOffsetY = 0

    if ( zoomXY ) {
      if ( scrollLeftAvailable > 0 ) {
        /*
         * A value from 0.0 to 1.0, representing the zoom location.
         *
         * Zoom based on a canvas pixel location,
         * or just use the center of the canvas.
         *
         * With the *2 -1, we then convert from: [0.0, 1.0] to [-1.0, 1.0]
         */
        const zoomXP = ( zoomXY.x / this.width )*2 - 1

        /*
         * Divide newWidth by half, so that when it's multiplied against zoomXP,
         * we are in the range of: [-newWidth/2, newWidth/2].
         *
         * This way it'll scroll left when zoomXP is negative, and right
         * when it's positive.
         *
         * newWidth is divided again, making it newWidth/4, as the scrolling is
         * too extreme.
         */
        zoomOffsetX = ( newWidth / 4 ) * zoomXP
      }

      // and now for the zoom Y
      if ( scrollTopAvailable > 0 ) {
        const zoomYP = ( zoomXY.y / this.height )*2 - 1

        zoomOffsetY = (newHeight/4) * zoomYP
      }
    }

    // If no scroll bar right now, try to scroll to the middle (doesn't matter if it fails).
    const scrollTopP  = ( scrollTopAvailable  === 0 ) ? 0.5 : ( viewport.scrollTop  / scrollTopAvailable  )
    const scrollLeftP = ( scrollLeftAvailable === 0 ) ? 0.5 : ( viewport.scrollLeft / scrollLeftAvailable )

    const scrollTop  = scrollTopP  * (newHeight - viewport.offsetHeight) + zoomOffsetY
    const scrollLeft = scrollLeftP * (newWidth  - viewport.offsetWidth ) + zoomOffsetX

    /*
     * Now apply the changes.
     *
     * We do it here, so it doesn't affect the calculations above.
     */

    canvas.style.width  = `${newWidth}px`
    canvas.style.height = `${newHeight}px`
    canvas.style.transform = `translate( ${left}px, ${top}px )`

    overlay.style.width  = `${newWidth}px`
    overlay.style.height = `${newHeight}px`
    overlay.style.transform = `translate( ${left}px, ${top}px )`

    this.refreshUpscale()

    viewport.clearQueue().animate(
        {
            scrollTop  : scrollTop,
            scrollLeft : scrollLeft,
        },
        CANVAS_UPDATE_SPEED
    )

    this.grid.updateViewport( canvasX, canvasY, newWidth, newHeight, zoom )
    this.marquee.updateViewport( canvasX, canvasY, newWidth, newHeight, zoom )
    this.copyObj.updateViewport( canvasX, canvasY, newWidth, newHeight, zoom )

    if ( this.isAwaitingUpdate ) {
      clearTimeout( this.isAwaitingUpdate )

      this.isAwaitingUpdate = 0
    }
  }

  /**
   * Cleares all of the future upscale refresh jobs to perform.
   */
  private clearUpscaleWorkers():void {
    for ( let i = 0; i < this.upscaleWorkers.length; i++ ) {
      cancelAnimationFrame( this.upscaleWorkers[i] )
    }

    this.upscaleWorkers.length = 0
  }

  /**
   * Adds redrawUpscale jobs to be performed in the future.
   */
  private futureRedrawUpscale( x:number, y:number, w:number, h:number, includeOverlay:boolean ):void {
    const workerID = requestAnimationFrame(() => {
      this.redrawUpscale( x, y, w, h, includeOverlay, 0 )
    })

    this.upscaleWorkers.push( workerID )
  }

  /**
   * Hides the upscale, and then redisplays it in the future.
   *
   * The idea is pretty simple, redrawing the upscale takes a
   * lot of time. So if we are zooming or scrolling, you don't
   * want to do this constantly. This aims to solve that problem
   * by updating in the future, once the scrolling has stopped.
   *
   * Repeat calls will cause previous ones to be cancelled.
   */
  /* This uses 'setTimeout' as scrolling/zooming wouldn't be fully finished
   * when it gets called. This allows us to have a delay for full reflow.
   *
   * It also allows us to cancel the action, if it's already running.
   * For example so people can scroll continously, without having to
   * have it re-upscale constantly as they do this.
   *
   * Another example is that when you zoom in, it'll also scroll, to
   * position the upscale canvas. One of these will automatically be
   * cancelled since this will get called twice.
   */
  private refreshUpscale():void {

    /*
     * Hide the current upscale.
     */
    if ( this.isUpscaleShown ) {
      this.upscale.style.display = 'none'
      this.clearUpscaleWorkers()

      this.isUpscaleShown = false
    }

    /*
     * The algorithm is to just match the viewarea,
     * or the canvas, which ever is smaller.
     */
    this.showUpscaleEvent.run(() => {
      this.isUpscaleShown = true

      const viewport = this.viewport
      const canvas   = this.canvas
      const upscale  = this.upscale

      upscale.classList.remove( 'sb_offscreenX' )
      upscale.classList.remove( 'sb_offscreenY' )

      /*
       * First the size.
       */

      // Show the upscale when using positive zoom.
      const scrollSize   = htmlUtils.scrollBarSize( viewport )
      const viewWidth    = viewport.offsetWidth  - scrollSize.right
      const viewHeight   = viewport.offsetHeight - scrollSize.bottom
      const canvasWidth  = canvas.offsetWidth
      const canvasHeight = canvas.offsetHeight

      const upWidth = (
          ( canvasWidth < viewWidth )
              ? canvasWidth
              : viewWidth
      )

      const upHeight = (
          ( canvasHeight < viewHeight )
              ? canvasHeight
              : viewHeight
      )

      upscale.width  = upWidth
      upscale.height = upHeight

      /*
       * Now the position.
       */

      let top = 0
      let left = 0

      const scrollTop  = viewport.scrollTop
      const scrollLeft = viewport.scrollLeft

      const canvasPos = canvasManagersGetTranslate_hack( canvas )
      if ( canvasWidth < viewWidth ) {
        left = canvasPos.x
      } else {
        left = scrollLeft
        upscale.classList.add( 'sb_offscreenX' )
      }

      if ( canvasHeight < viewHeight ) {
        top = canvasPos.y
      } else {
        top = scrollTop
        upscale.classList.add( 'sb_offscreenY' )
      }

      // Fade in the upscale change.
      // The double opacity setting is needed to trigger the CSS animation.
      const positionX = (- ( scrollLeft % UPSCALE_BACK_OFFSET_MOD ))
      const positionY = (- ( scrollTop  % UPSCALE_BACK_OFFSET_MOD ))
      const translateX = (left+0.5)|0
      const translateY = (top+0.5)|0

      upscale.style.display = '' // Set display back to it's initial value.
      upscale.style.opacity = '0'
      upscale.style.backgroundPosition = `${positionX}px ${positionY}px`
      upscale.style.transform = `translate( ${translateX}px, ${translateY} )`

      requestAnimationFrame(() => {
        // upscale _after_ making it visible
        this.redrawUpscaleFullScreen()

        upscale.style.opacity = '1'
      })
    })
  }

  isPasting():boolean {
    return this.copyObj.isPasting()
  }

  isInPaste( x:number, y:number ):boolean {
    return this.copyObj.overlapsPaste({
        x: x|0,
        y: y|0,
        w: 1,
        h: 1,
    })
  }

  movePaste( x:number, y:number, finalize:boolean ):this {
    if ( this.copyObj.isPasting() ) {
      this.copyObj.movePaste( this.overlay, x, y, finalize )
    }

    return this
  }

  /**
   * If SkyBrush is currently pasting ...
   *  - draw the pasting content to the canvas
   *  - clear the pasting overlay (the bit that shows where it will be pasted)
   */
  drawAndEndPaste() {
    if ( this.copyObj.isPasting() ) {
      const clip = this.getFullClip()

      if ( this.copyObj.overlapsPaste(clip) ) {
        this.drawSafe(() => {
          this.copyObj.draw( this.canvas )
          this.overlayCtx.clearRect( 0, 0, this.width, this.height )
          this.endDraw( clip )
        })
      }

      this.endPaste()
    }

    return this
  }

  paste() {
    this.drawAndEndPaste()
    this.copyObj.startPaste( this.overlay )
    this.events.run( 'onPaste' )

    return this
  }

  /**
   * If SkyBrush is currently pasting ...
   *  - clears the pasting overlay bit
   *
   * Note this *doesn't* draw the paste to the screen; it just ends the
   * pasting mode.
   */
  endPaste():this {
    if ( this.copyObj.isPasting() ) {
      this.overlayCtx.clearRect( 0, 0, this.width, this.height )
      this.copyObj.endPaste()
    }

    return this
  }

  onPaste( fun:() => void ):this {
    this.events.add( 'onPaste', fun )

    return this
  }

  cut():this {
    const clip = this.getFullClip()

    this.copyObj.setCopy( this.canvas, clip.x, clip.y, clip.w, clip.h )
    this.drawSafe(() => {
      this.canvasCtx.clearRect( clip.x, clip.y, clip.w, clip.h )
    })
    this.endDraw( clip )

    this.events.run( 'onCopy' )
    this.marquee.clear()

    return this
  }

  copy():this {
    const clip = this.getFullClip()

    this.copyObj.setCopy( this.canvas, clip.x, clip.y, clip.w, clip.h )
    this.events.run( 'onCopy' )
    this.marquee.clear()

    return this
  }

  onCopy( fun:() => void ):this {
    this.events.add( 'onCopy', fun )

    return this
  }

  removeClip():this {
    const cCtx = this.canvasCtx
    const oCtx = this.overlayCtx

    if ( this.clipping !== null ) {
      const cCtxSetup = canvasUtils.backupCtx( cCtx )
      cCtx.restore()
      canvasUtils.restoreCtx( cCtx, cCtxSetup )

      const oCtxSetup = canvasUtils.backupCtx( oCtx )
      oCtx.restore()
      canvasUtils.restoreCtx( oCtx, oCtxSetup )

      this.clipping = null
    }

    this.events.run( 'onClip', null )

    return this
  }

  onClip( f:Consumer<Nullable<SizeArea>> ):this {
    this.events.add( 'onClip', f )

    return this
  }

  getClip():Nullable<SizeArea> {
    return this.clipping
  }

  getFullClip():SizeArea {
    if ( this.clipping ) {
      return this.clipping

    } else {
      return {
          x: 0,
          y: 0,
          w: this.width,
          h: this.height,
      }
    }
  }

  setClip( x:number, y:number, w:number, h:number ):this {
    const cCtx = this.canvasCtx
    const oCtx = this.overlayCtx

    this.removeClip()

    this.clipping = {
        x: x,
        y: y,
        w: w,
        h: h,
    }

    cCtx.save()
    cCtx.beginPath()
    cCtx.rect( x, y, w, h )
    cCtx.clip()

    oCtx.save()
    oCtx.beginPath()
    oCtx.rect( x, y, w, h )
    oCtx.clip()

    this.events.run( 'onClip', this.clipping )

    return this
  }

  redrawUpscaleFullScreen() {
    /*
     * The maths for this bit proved to be really difficult to work out.
     * It would be out by just a couple of sub-pixels (no idea why).
     *
     * So we just fake a draw event (drawing to top left corner),
     * and it's drawing to the whole canvas (full with/height).
     */
    const pos = htmlUtils.getOffset( this.viewport )
    const fakeEv = $.Event( 'mousemove', {
        pageX : pos.left,
        pageY : pos.top,
    })

    // todo, this is used to get the layout of the canvas. Skip the event stuff and instead just get the location directly.
    const location = this.translateLocation( fakeEv )

    const x = location.left
    const y = location.top
    const w = this.width
    const h = this.height

    return this.redrawUpscale( x, y, w, h, false, 0 )
  }

  /**
   * Redraws the contents of the upscaled canvas.
   *
   * Usagae:
   *     // redraw all of the viewport
   *     canvasManager.redrawUpscale()
   *
   *     // redraws a dirty rectangle, the area specified, in teh upscale
   *     canvasManager.redrawUpscale( x, y, w, h )
   *
   * Note: the location is the area on the target drawing canvas,
   * where items are drawn to. Not the area on the upscale canvas.
   *
   * @param x
   * @param y
   * @param w
   * @param h
   * @param includeOverlay True if we include the overlay in the refresh, and false if not.
   * @param buffer extra pixels to add on to the x, y, w and h.
   */
  redrawUpscale(
      x:number,
      y:number,
      w:number,
      h:number,
      includeOverlay:boolean,
      buffer:number,
  ):boolean {
    if ( Math.abs(w) < 1 ) {
      if ( w < 1 ) {
        w = w
      } else {
        w = -1
      }
    }

    if ( Math.abs(h) < 1 ) {
      if ( h < 1 ) {
        h = 1
      } else {
        h = -1
      }
    }

    /*
     * This is to allow easier usage.
     * So you can update in the negative direction.
     */
    if ( w < 0 ) {
      w = -w
      x -= w
    }

    if ( h < 0 ) {
      h = -h
      y -= h
    }

    x -= buffer
    y -= buffer
    h += buffer*2
    w += buffer*2

    /*
     * After handling the buffer, and other possible values,
     * if the width/height are empty, then quit early.
     */
    if ( w === 0 || h === 0 ) {
      return false
    }

    const canvas   = this.canvas
    const upscale  = this.upscale
    const viewport = this.viewport

    const cCtx = this.canvasCtx
    const oCtx = this.overlayCtx
    const uCtx = this.upscaleCtx

    const zoom = this.zoom

    const scrollTop  = viewport.scrollTop
    const scrollLeft = viewport.scrollLeft

    // 2) work out how much of the drawing canvas is actually visible
    x = Math.max( x,
        scrollLeft / zoom
    )
    y = Math.max( y,
        scrollTop / zoom
    )
    w = Math.min( w,
        Math.min(canvas.width , viewport.clientWidth/zoom )
    )
    h = Math.min( h,
        Math.min(canvas.height, viewport.clientHeight/zoom )
    )

    /* Check for updating outside of the canvas,
     * and if so, we leave early (no refresh needed).
     */
    if ( x+w < 0 || y+h < 0 || x > this.canvas.width || y > this.canvas.height ) {
      return false
    }

    /* Need to be rounded for the canvas data we access later. */
    x = Math.round(x)
    y = Math.round(y)

    w = Math.round(w)
    h = Math.round(h)

    /*
     * Widen the draw area by a pixel to encompas the outer edge,
     * this is to prevent slight 1px gaps along the edges of the upscale canvas.
     */

    if ( x > 0 ) {
      x--
    }

    if ( y > 0 ) {
      y--
    }

    const wDiff = Math.min( 1, canvas.width  - w )
    const hDiff = Math.min( 1, canvas.height - h )

    w += wDiff
    h += hDiff

    // 3) work out the same locations, on the upscale canvas
    const ux = x*zoom - scrollLeft
    const uy = y*zoom - scrollTop
    const uw = w*zoom
    const uh = h*zoom

    const destAlpha = ( cCtx.globalCompositeOperation === 'source-atop' )

    /*
     * This can go one of three ways:
     *  = draw using downscaling (zoom is 100%, or lower)
     *  = draw cheap (using canvas scaling) and sub-divide work
     *  = manually upscale pixels
     */

    const divideWork = (w*h) > ((UPSCALE_DIVIDE_AREA+6)*(UPSCALE_DIVIDE_AREA+6))

    if ( divideWork || zoom <= 1 ) {
      const xDiff = Math.max( 0, (x+w) - canvas.width  )
      const yDiff = Math.max( 0, (y+h) - canvas.height )

      const ux2 = Math.round(ux)
      const uy2 = Math.round(uy)

      let uw2 = Math.round(uw - xDiff*zoom)
      let uh2 = Math.round(uh - yDiff*zoom)

      // if we clip the edge,
      // then clamp the max width/height onto the edges
      // (otherwise Chrome crashes)
      if ( x+w > canvas.width ) {
        w -= (x+w) - canvas.width
        uw2 = upscale.width - ux2
      }
      if ( y+h > canvas.height ) {
        h -= (y+h) - canvas.height
        uh2 = upscale.height - uy2
      }

      /*
       * Note that the zoom _must_ be first,
       * so it takes precendence over dividing work
       * (as it's much cheaper).
       */
      /*
       * If zoom is at 1, then there is no change in scaing.
       * So we just draw normally, and quit.
       */
      if ( zoom <= 1 ) {
        uCtx.clearRect( ux2, uy2, uw2, uh2 )

        uCtx.globalAlpha = 1.0
        uCtx.drawImage( canvas, x, y, w, h, ux2, uy2, uw2, uh2 )

        if ( includeOverlay ) {
          if ( destAlpha ) {
            uCtx.globalCompositeOperation = 'source-atop'
          }

          uCtx.drawImage( this.overlay, x, y, w, h, ux2, uy2, uw2, uh2 )

          if ( destAlpha ) {
            uCtx.globalCompositeOperation = 'source-over'
          }
        }

      /*
       * Sub divide up work if we'll be doing loads of it.
       * Instead the work is done over multiple calls.
       */
      } else if ( divideWork ) {
        // cheap draw, so we don't get huge empty areas
        uCtx.drawImage( canvas, x, y, w, h, ux2, uy2, uw2, uh2 )

        for ( let i = x; i < (w+x); i += UPSCALE_DIVIDE_AREA ) {
          for ( let j = y; j < (h+y); j += UPSCALE_DIVIDE_AREA ) {
            const updateW = Math.min( (w+x)-i, UPSCALE_DIVIDE_AREA )
            const updateH = Math.min( (h+y)-j, UPSCALE_DIVIDE_AREA )

            this.futureRedrawUpscale( i, j, updateW, updateH, includeOverlay )
          }
        }
      }
    } else {
      // 5) draw!
      copyNearestNeighbour(
          upscale,                        // dest
          ux, uy, uw, uh,                 // dest x, y, w, h
          zoom, zoom,                     // dest pixel size

          cCtx.getImageData(x, y, w, h),   // src
          x, y, w, h,                     // src  x, y, w, h
          includeOverlay ? oCtx.getImageData( x, y, w, h ) : null,

          ( cCtx.globalCompositeOperation === 'source-atop' ) // bitmask pixels
      )
    }

    return true
  }

  resize( newWidth:number, newHeight:number ):void {
    if ( this.setSize(newWidth, newHeight, false) ) {
      this.endDraw()
    }
  }

  /// @todo, the nearest neighbour can now be replaced with imageSmoothingEnabled https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled
  scale( newWidth:number, newHeight:number, isSmooth:boolean ):void {
    if ( newWidth !== this.width || newHeight !== this.height ) {
      this.drawAndEndPaste()

      // use existing smoothing
      if ( isSmooth ) {
        const temp = htmlUtils.newCanvas( newWidth, newHeight )
        const tCtx = temp.getContext( '2d' ) as CanvasRenderingContext2D

        tCtx.drawImage(
            this.canvas,
            0, 0, this.width, this.height,
            0, 0,   newWidth,   newHeight,
        )

        this.setSize( newWidth, newHeight, true )
        this.drawSafe(() => {
          this.canvasCtx.drawImage( temp, 0, 0 )
        })

      // use nearest neighbour
      } else {
        const oldW = this.width
        const oldH = this.height
        const srcData = this.canvasCtx.getImageData( 0, 0, oldW, oldH )

        this.setSize( newWidth, newHeight, true )

        this.drawSafe(() => {
          copyNearestNeighbour(
              this.canvas,
              0, 0, newWidth, newHeight,

              // pixel size
              newWidth / oldW, newHeight / oldH,

              srcData,
              0, 0, oldW, oldH,

              null,
              false
          )
        })
      }

      this.endDraw()
    }
  }

  resetCompositeOpration():canvasUtils.GlobalCompositeOperation  {
    const compOp = this.canvasCtx.globalCompositeOperation as canvasUtils.GlobalCompositeOperation
    this.canvasCtx.globalCompositeOperation = 'source-over'

    return compOp
  }

  resetAlpha():number {
    const alpha = this.canvasCtx.globalAlpha
    this.canvasCtx.globalAlpha = 1.0

    return alpha
  }

  /**
   * @private
   *
   * @param newWidth
   * @param newHeight
   * @param isCleared True if there is both a resize and a clear. False if not.
   * @return True if the resize happened. False if it were skipped.
   */
  setSize( newWidth:number, newHeight:number, isCleared:boolean ):boolean {
    if ( newWidth !== this.width || newHeight !== this.height ) {
      this.drawAndEndPaste()

      // Create a new canvas, of the required size, and with our content.
      const newCanvas = htmlUtils.newCanvas( newWidth, newHeight )
      const newCtx = canvasUtils.newCtx( newCanvas )
      const canvas = this.canvas

      newCanvas.className = canvas.className

      const ctxSetup        = canvasUtils.backupCtx( this.canvasCtx  )
      const overlayCtxSetup = canvasUtils.backupCtx( this.overlayCtx )

      // Replace the current canvas.
      if ( ! isCleared ) {
        newCtx.drawImage( this.canvas, 0, 0 )
      }

      const parentElement = this.canvas.parentElement
      if ( parentElement === null ) {
        return false
      }
      parentElement.replaceChild( this.canvas, newCanvas )

      this.width     = newWidth
      this.height    = newHeight
      this.canvas    = newCanvas
      this.canvasCtx = newCtx

      // Update the overlay too.
      this.overlay.width  = newWidth,
      this.overlay.height = newHeight
      this.overlayCtx     = canvasUtils.newCtx( this.overlay )

      canvasUtils.restoreCtx( this.canvasCtx , ctxSetup        )
      canvasUtils.restoreCtx( this.overlayCtx, overlayCtxSetup )

      // Re-centre.
      this.updateCanvasSize()

      return true
    }

    return false
  }

  /**
   * This should be used when you want to interact with the graphics it's
   * self, such as erase, or if you want to read them.
   *
   * If you just want to draw on top (pencil, brush, drawing a square/circle),
   * then use 'getContext' instead as this will silently overlay it.
   *
   * @return The underlying 2D context, where the actual graphics are stored.
   */
  getDirectContext() {
    return this.canvasCtx
  }

  /**
   * When used during drawing, this will allow you to draw on top of the
   * canvas. The effect is overlayed, until 'endDraw' is called.
   *
   * By overlaying it allows you to clear and redraw during the draw process
   * (useful for drawing lines, squares, circles and other shapes).
   *
   * @return The 2D context used for drawing.
   */
  getContext() {
    return this.overlayCtx
  }

  /**
   * Picks a colour at the given location, and returns it.
   * Null is returned if picking from outside of the canvas.
   *
   * @return An array containing the RGBA value of the pixel selected, or null for outside of canvas.
   */
  colourPick( x:number, y:number ) {
    if ( x >= 0 && x < this.width && y >= 0 && y < this.height ) {
      return this.canvasCtx.getImageData( x, y, 1, 1 ).data
    } else {
      return null
    }
  }

  getColour():string {
    // We are never setting this to a gradient stroke.
    // So it's ok to force it to be a string, which is an #ffaabb style hex value.
    return this.canvasCtx.strokeStyle as string
  }

  getRGB() {
    const colour = this.getColour()

    const red   = colour.substr( 1, 2 )
    const green = colour.substr( 3, 2 )
    const blue  = colour.substr( 5, 2 )

    return [
        parseInt( red  , 16 ),
        parseInt( green, 16 ),
        parseInt( blue , 16 ),
    ]
  }

  /**
   * @param strColour The colour to set to this canvas.
   */
  setColour( strColour:string ) {
    this.canvasCtx.strokeStyle =
    this.canvasCtx.fillStyle =
    this.overlayCtx.strokeStyle =
    this.overlayCtx.fillStyle =
        strColour
  }

  useBlendAlpha():this {
    this.canvasCtx.globalCompositeOperation = 'source-over'

    return this
  }

    /**
     * True to use the destination alpha when drawing,
     * false to not.
     */
  useDestinationAlpha():this {
    this.canvasCtx.globalCompositeOperation = 'source-atop'

    return this
  }

  /**
   * @param alpha The alpha value to use when drawing.
   */
  setAlpha( alpha:number ) {
    this.canvasCtx.globalAlpha =
    this.overlayCtx.globalAlpha =
        alpha
  }

  getAlpha() {
    return this.canvasCtx.globalAlpha
  }

  /**
   *
   */
  setImage(
      image  : HTMLImageElement,
      width  : number,
      height : number,
  ):this {
    this.setSize( width, height, true )
    this.drawSafe(() => {
      this.canvasCtx.drawImage( image, 0, 0, width, height )
    })

    return this
  }

  resetUndoRedo():this {
    this.undos.reset( this.canvas )

    return this
  }

  reset() {
    this.resetUndoRedo()
        .endPaste()
        .marquee.clear()

    this.grid.hide()
  }

  /**
   * Helper method for the combined undo/redo action.
   *
   * Pass in 'redo' to perform a redo, and 'undo' to perform
   * an undo.
   *
   * In practice, you don't use this, instead you use the 'redo'
   * and 'undo' methods on the CanvasManager.
   *
   * @param name The name of the action to perform, 'undo' or 'redo'.
   * @return True if the action is performed, otherwise false.
   */
  private undoRedo( name:'undo'|'redo' ) {
    const canvas = (
        name === 'undo'
            ? this.undos.undo()
            : this.undos.redo()
    )

    if ( canvas !== null ) {
      this.drawSafe(() => {
        if (
            canvas.width  !== this.canvas.width ||
            canvas.height !== this.canvas.height
        ) {
          this.setSize( canvas.width, canvas.height, true )
          this.canvasCtx.drawImage( canvas, 0, 0 )
          // refresh upscale happens automatically, in the future, by setSize
        } else {
          this.canvasCtx.clearRect( 0, 0, this.canvas.width, this.canvas.height )
          this.canvasCtx.drawImage( canvas, 0, 0 )
          this.redrawUpscaleFullScreen()
        }
      })

      return true
    }

    return false
  }

  /**
   * An alternative to 'drawSafe' which only nullifies the alpha component.
   * For example how the alpha is mixed is left un-altered.
   *
   * @param f The function to perform.
   */
  drawSafeAlpha( f:() => void ):this {
    const alpha = this.resetAlpha()
    f()
    this.canvasCtx.globalAlpha = alpha

    return this
  }

  /**
   * 'drawSafe' undoes lots of the options and then runs the function given.
   * For example alpha is set to 1, and the default globalCompositeOperation
   * is used.
   *
   * This is useful to allow you to perform operations without having to
   * care about those settings, such as drawing/clearing the canvas.
   *
   * @param f The function to perform whilst the canvas values have been reset.
   */
  drawSafe( f:() => void ):this {
    const alpha  = this.resetAlpha()
    const compOp = this.resetCompositeOpration()
    const fillStyle   = this.canvasCtx.fillStyle
    const strokeStyle = this.canvasCtx.strokeStyle

    const clip = this.getClip()
    if ( clip ) {
      this.removeClip()
    }

    f()

    if ( clip ) {
      this.setClip( clip.x, clip.y, clip.w, clip.h )
    }

    this.canvasCtx.globalAlpha = alpha
    this.canvasCtx.globalCompositeOperation = compOp
    this.canvasCtx.fillStyle   = fillStyle
    this.canvasCtx.strokeStyle = strokeStyle

    return this
  }

  /**
   * @return True if this can undo, and false if there is nothing to undo.
   */
  hasUndo() {
    return this.undos.hasUndo() || this.copyObj.isPasting()
  }

  /**
   * @return true if this has redo options to perform.
   */
  hasRedo() {
    return this.undos.hasRedo()
  }

  /**
   * If this canvas is not empty, then this will attempt to crop it.
   * Cropping is only performed if there is available space to do so.
   *
   * It also disables a number of items, such as the current paste
   * and marquee selection, for usability.
   */
  crop():this {
    this.drawAndEndPaste()

    // Check for a marquee selection
    // and otherwise use the visible area.
    let selection = this.marquee.getPosition()
    if ( selection === null ) {
      selection = this.getDrawnArea()
    } else {
      // remove the marquee, since it is selecting everything
      this.marquee.clear()
    }

    if ( selection !== null ) {
      const x  = selection.x
      const y  = selection.y
      const w2 = selection.w
      const h2 = selection.h

      const temp = htmlUtils.newCanvas( w2, h2 )
      const tCtx = temp.getContext( '2d' ) as CanvasRenderingContext2D
      tCtx.drawImage( this.canvas, -x, -y )

      this.setSize( w2, h2, true )

      this.drawSafe(() => {
        this.canvasCtx.drawImage( temp, 0, 0 )
      })

      this.endDraw()
    }

    return this
  }

  /**
   * Returns an object describing the area on the canvas,
   * which has been drawn to.
   *
   * If there has been no drawing, then null is returned.
   */
  getDrawnArea():Nullable<SizeArea> {
    const w = this.width
    const h = this.height

    const data = this.canvasCtx.getImageData( 0, 0, w, h ).data

    let minX = 0
    let minY = 0
    let maxX = w
    let maxY = h

    // search for minX, minY, maxX, maxY, working inwards on all sides
    // search for minY
    let i = 0
    for ( let y = 0; y < h; y++ ) {
      let hasAlpha = false

      for ( let x = 0; x < w; x++ ) {
        if ( data[i+3] > 0 ) {
          hasAlpha = true
          break
        }

        i += 4
      }

      if ( hasAlpha ) {
        break
      }

      minY = y+1
    }

    // search for maxY
    i = 0
    for ( let y = h-1; y >= 0; y-- ) {
      let hasAlpha = false

      for ( let x = 0; x < w; x++ ) {
        if ( data[i+3] > 0 ) {
          hasAlpha = true
          break
        }

        i += 4
      }

      if ( y <= minY ) {
        return null
      }

      if ( hasAlpha ) {
        break
      }

      maxY = y
    }

    // search for minX
    i = 0
    for ( let x = 0; x < w; x++ ) {
      let hasAlpha = false

      for ( let y = 0; y < h; y++ ) {
        if ( data[i+3] > 0 ) {
          hasAlpha = true
          break
        }

        i += 4
      }

      if ( hasAlpha ) {
        break
      }

      minX = x+1
    }

    // search for maxX
    i = 0
    for ( let x = w-1; x >= 0; x-- ) {
      let hasAlpha = false

      for ( let y = 0; y < h; y++ ) {
        if ( data[i+3] > 0 ) {
          hasAlpha = true
          break
        }

        i += 4
      }

      if ( x <= minX ) {
        return null
      }

      if ( hasAlpha ) {
        break
      }

      maxX = x
    }

    // Don't crop if the image is empty!

    // if we can crop, we do:
    if ( minX > 0 || minY > 0 || maxX < w || maxY < h ) {
      return {
          x: minX,
          y: minY,
          w: maxX-minX,
          h: maxY-minY,
      }
    }

    return null
  }

  clearAll() {
    this.drawSafe(() => {
      this.canvasCtx.clearRect( 0, 0, this.canvas.width, this.canvas.height )
    })
  }

  /**
   * Cleares this canvas of all content,
   * and adds the current content to the undo stack.
   */
  clear() {
    const w = this.width
    const h = this.height

    this.drawAndEndPaste()

    this.canvasCtx.clearRect( 0, 0, w, h )

    // push current context to the undo/redo
    // and update the whole screen
    this.endDraw({
      x : 0,
      y : 0,
      w : w,
      h : h,
    })
  }

  /**
   * @return True if an undo was performed, otherwise false.
   */
  redo():boolean {
    return this.undoRedo( 'redo' )
  }

  /**
   * @return True if an undo was performed, otherwise false.
   */
  undo():boolean {
    if ( this.copyObj.isPasting() ) {
      this.endPaste()

      return true
    } else {
      return this.undoRedo( 'undo' )
    }
  }
}

/**
 * Why is it a hack?
 *
 * Because it makes a lot of presumptions about how the transform is laid out.
 * It only works for the one specific case where it's used.
 */
export function canvasManagersGetTranslate_hack( dom: HTMLElement ):Point {
  let x = 0
  let y = 0

  const translateCSS = getComputedStyle( dom ).transform || ''
  if ( translateCSS ) {
    const parts     = translateCSS.split( ',' )
    const firstHalf = parts[0]
    const strX      = firstHalf.substring( firstHalf.indexOf('(')+1 )

    x = parseInt( strX )
    y = parts.length > 1 ? parseInt(parts[1]) : x
  }

  return {
    x : x,
    y : y,
  }
}

/**
 * Commands are setup through a JSON object.
 *
 * This is used so other functions can change those
 * properties on the fly, and require new items.
 *
 * The other advantage is that it allows many to be
 * optional.
 *
 * Before they were all passed in for each constructor,
 * but given that many are optional, this list was
 * becomming unmanageable.
 *
 * Basic properties include:
 *  = name
 *  = css
 *  = cursor
 *  = caption - the tooltip caption to be used
 *
 * All events are called in the context of this command.
 *
 * Drawing Events:
 *  = onDown - called when mouse goes down,
 *  = onMove - then this is called as it's moved,
 *  = onUp - finally this is called when it goes up.
 *
 *  = onDownOnMove - event used for both onDown and onMove
 *  = onMoveOnUp - event used for both onMove and onUp
 *
 * Some sub-versions of Command add their own 'onDraw'
 * event. This is a general purpose draw event used for
 * onDown, onMove and onUp; but is normally wrapped in
 * custom logic.
 *
 * However the Command prototype ignores onDraw.
 *
 * Other Events:
 *  = onAttach - called when the Command is set.
 *  = onDetach - called when the Command is unset.
 *
 *  = onShift - called when the shift button is pressed
 *    down or up. The state and SkyBrush are passed in,
 *    in that order.
 *
 *    This is also called when the command is attached to
 *    SkyBrush, but only if the shift is down. This is so
 *    if you update the controls it'll be setup correctly
 *    on attach, and undone on detach.
 *
 *    But to clarify, if shift is not pressed, this will
 *    never be called.
 *
 * Special logic is also added to ensure onAttach and
 * onDetach cannot be called recursively, as sometimes
 * this can happen.
 *
 * @constructor
 * @private
 *
 * @param setup The information needed for this command.
 * @param controlsSetup An array listing all of the commands for this control.
 */

/**
 * Creates a new Brush, with the name, css class and events given.
 * Some extras are added on top, which the standard Command does
 * not have, like brush size.
 *
 * @constructor
 * @private
 */
class Brush extends Command {
  private size : number

  constructor( setup ) {
    const brushSizeControl = {
        name: 'Size',
        field: 'size',

        type: 'slider',
        css : 'size',

        cursor: true,

        min: 1,
        max: MAX_BRUSH_SIZE,
    }

    const controls = setup.controls
    if ( controls === undefined ) {
      controls = [ brushSizeControl ]
    } else {
      controls = setup.controls
      let addControl = true

      for ( let i = 0; i < controls.length; i++ ) {
        if ( controls[i].field === brushSizeControl.field ) {
          addControl = false
          break
        }
      }

      if ( addControl ) {
        controls.unshift( brushSizeControl )
      }
    }

    setup.controls = controls

    super( setup )

    this.size = 0
    this.setSize( DEFAULT_BRUSH_SIZE )
  }

  /**
   * Sets the size for this brush.
   * This is automtically limited to default min/max values.
   *
   * @param size The new size for this brush.
   */
  setSize( size:number ) {
    this.size = mathsUtils.limit( size, 1, MAX_BRUSH_SIZE )
  }

  /**
   * Increments the size by the amount given.
   *
   * @param inc The amount to increment the size.
   */
  incrementSize( inc:number ) {
    this.setSize( this.size + inc )
  }
}

class Geometry extends Command {

  /**
   * Commands for drawing geometry.
   *
   * For the setup, it adds the properties:
   *
   *  = onDraw - called for drawing geometry
   *  = onDown - already exists, but is wrapped in it's own onDown
   *
   * @constructor
   * @private
   *
   * @param setup The controls information for this command.
   */
  constructor( setup ) {
    this.startX = 0
    this.startY = 0

    this.isFilled = true
    this.size = 1

    this.isAliased = false

    this.drawGeom = setup.onDraw

    const oldOnDown = setup.onDown
    setup.onDown = function( canvas, x, y ) {
      if ( ! this.isAliased ) {
        x |= 0
        y |= 0
      }

      this.startX = x,
      this.startY = y
      this.lastX = x
      this.lastY = y

      canvas.getContext().lineJoin = 'miter'

      if ( oldOnDown ) {
        oldOnDown.call( this, canvas, x, y )
      }
    }
    setup.onMove = function( canvas, x, y ) {
      if ( ! this.isAliased ) {
        x |= 0
        y |= 0
      }

      this.drawGeom( canvas.getContext(), this.startX, this.startY, x, y, this.lastX, this.lastY )

      this.lastX = x
      this.lastY = y
    }
    setup.onUp = function( canvas, x, y ) {
      if ( ! this.isAliased ) {
        x |= 0
        y |= 0
      }

      this.setDrawArea( this.startX, this.startY, x-this.startX, y-this.startY, this.size )

      this.drawGeom( canvas.getContext(), this.startX, this.startY, x, y, this.lastX, this.lastY )

      this.lastX = x
      this.lastY = y
    }

    setup.cursor = constants.DEFAULT_CURSOR

    super( setup )
  }

  round( n:number, isOutline:boolean, size:number ) {
    if ( (!isOutline) || size % 2 === 0 ) {
      return n | 0
    } else {
      return (n | 0) + 0.5
    }
  }

  toggleAliased() {
    this.isAliased = ! this.isAliased
  }

  toggleFilled() {
    this.isFilled = ! this.isFilled
  }
}

class ShapeGeometry extends Geometry {
  constructor( setup ) {
    let controls = setup.controls
    if ( ! controls ) {
      controls = []
    } else if ( controls && ! ( controls instanceof Array ) ) {
      controls = [ controls ]
    }

    setup.controls = controls.concat([
        {
            name: 'Mode',
            css: 'outline_cmd',
            field: 'isOutline',
            type: 'toggle',
            css_options: [ 'filled', 'outline' ],
            name_options: [ 'Filled', 'Outline' ],
        },
        {
            name: 'Outline',
            css: 'outline_size_cmd',
            field: 'size',
            type: 'slider',

            value: 1,
            min: 1,
            max: MAX_BRUSH_SIZE,
        },
        {
            name: 'Proportion',
            css: 'proportion_size_cmd',
            field: 'isProportional',
            type: 'checkbox',
        },
        {
            name: 'Center',
            css: 'centre_size_cmd',
            field: 'isCentred',
            type: 'checkbox',
        },
    ])

    // wrap in our own function
    const drawGeom = setup.onDraw
    setup.onDraw = function( ctx, x1, y1, x2, y2, lastX, lastY ) {
      const size = this.size
      const isOutline = this.isOutline

      x1 = this.round( x1, isOutline, size )
      y1 = this.round( y1, isOutline, size )
      x2 = this.round( x2, isOutline, size )
      y2 = this.round( y2, isOutline, size )

      let w = x2 - x1
      let h = y2 - y1

      if ( this.isProportional ) {
        const wAbs = Math.abs(w)
        const hAbs = Math.abs(h)

        if ( wAbs > hAbs ) {
          if ( h < 0 ) {
            h = - wAbs
          } else {
            h =   wAbs
          }
        } else {
          if ( w < 0 ) {
            w = - hAbs
          } else {
            w =   hAbs
          }
        }
      }

      if ( this.isCentred ) {
        x1 -= w
        y1 -= h
        w += w
        h += h
      }

      if ( this.isProportional || this.isCentred ) {
        this.setDrawArea( x1, y1, w, h, size )
      }

      canvasUtils.clearCtx( ctx,
          this.lastX1,
          this.lastY1,
          this.lastW,
          this.lastH,
          this.size
      )

      this.lastX1 = x1
      this.lastY1 = y1
      this.lastW  = w
      this.lastH  = h

      drawGeom.call( this, ctx, x1, y1, x1+w, y1+h )
    }

    setup.onDown = function(canvas, x, y) {
      this.lastX1 = x
      this.lastY1 = y
      this.lastW  = 1
      this.lastH  = 1
    }

    super( setup )
  }
}

/* Helper Drawing Function */

function renderLine(
    fun    : Consumer4<HTMLCanvasElement, number, number, number>,
    canvas : HTMLCanvasElement,
    x1:number, y1:number,
    x2:number, y2:number,
    size:number,
) {
  x1 = Math.round( x1 - size / 2 )
  y1 = Math.round( y1 - size / 2 )
  x2 = Math.round( x2 - size / 2 )
  y2 = Math.round( y2 - size / 2 )

  const xDiff = x2 - x1
  const yDiff = y2 - y1

  const inc = Math.max(
      Math.abs( xDiff ),
      Math.abs( yDiff ),
  ) / size

  const xInc = ( xDiff / inc ) / size
  const yInc = ( yDiff / inc ) / size
  let x = x1
  let y = y1

  for ( let i = 0; i < inc; i++ ) {
    fun( canvas, (x+0.5)|0, (y+0.5)|0, size )

    x += xInc
    y += yInc
  }
}

function drawPixelLine( ctx:CanvasRenderingContext2D, x0:number, y0:number, x1:number, y1:number, size:number ) {
  x0 = Math.round( x0 )
  x1 = Math.round( x1 )
  y0 = Math.round( y0 )
  y1 = Math.round( y1 )

  const sizeI = Math.round( size )
  const sizeI2 = (sizeI/2) | 0

  const yDiff = y1 - y0
  const xDiff = x1 - x0

  const aXDiff = Math.abs( xDiff )
  const aYDiff = Math.abs( yDiff )

  if ( aXDiff < aYDiff ) {
    if ( aXDiff < 1.5 ) {
      ctx.fillRect( x0-sizeI2, y0, sizeI, y1-y0 )
    }
  } else if ( aYDiff < 1.5 ) {
    ctx.fillRect( x0, y0-sizeI2, x1-x0, sizeI )
  }

  /*
   * When this is true, we draw across the screen
   * in horizontal rectangles.
   *
   * When this is false, we draw down the screen,
   * with vertical rectangles.
   */
  const moveHorizontal = ( aXDiff > aYDiff )
  if ( moveHorizontal ) {
    y0 -= sizeI2
    y1 -= sizeI2
  } else {
    x0 -= sizeI2
    x1 -= sizeI2
  }

  const inc = Math.min( aXDiff, aYDiff )
  let xInc = xDiff / inc
  let yInc = yDiff / inc

  let yStart = y0
  let yEnd   = y1
  let xStart = x0
  let xEnd   = x1

  if ( moveHorizontal ) {
    if ( yStart > yEnd ) {
      let t = yStart
      yStart = yEnd
      yEnd = t

      t = xStart
      xStart = xEnd
      xEnd = t

      xInc = -xInc
    }
  } else {
    if ( xStart > xEnd ) {
      let t = xStart
      xStart = xEnd
      xEnd = t

      t = yStart
      yStart = yEnd
      yEnd = t

      yInc = -yInc
    }
  }

  for ( let i = 0; i < sizeI; i++ ) {
    if ( moveHorizontal ) {
      const x = xStart

      for ( let y = yStart; y < yEnd; y++ ) {
        const drawX = x|0
        const drawY = y|0
        const xWidth = ((x + xInc)|0) - drawX

        ctx.fillRect( drawX, drawY, xWidth, 1 )

        x += xInc
      }

      yStart++
      yEnd++
    } else {
      const y = yStart

      for ( let x = xStart; x < xEnd; x++ ) {
        const drawX = x|0
        const drawY = y|0
        const yWidth = ((y + yInc)|0) - drawY

        ctx.fillRect( drawX, drawY, 1, yWidth )

        y += yInc
      }

      xStart++
      xEnd++
    }
  }

  return

  // swap values so we iterate less
  // this code was never finished
  // that's why the maths is clearly odd
  const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0)
  if ( steep ) {
    let t = x0
    x0 = y0
    y0 = t

    t = x1
    x1 = y1
    y1 = t
  }
  if ( x0 > x1 ) {
    let t = x0
    x0 = x1
    x1 = t

    t = y0
    y0 = y1
    y1 = t
  }
  if ( y0 > y1 ) {
    let t = y0
    y0 = y1
    y1 = t

    t = y0
    y0 = y1
    y1 = t
  }

  const deltaX = x1 - x0
  const deltaY = Math.abs( y1 - y0 )

  const yStep = (
      ( y0 < y1 )
          ?  1
          : -1
  )

  // Now DRAW!
  const sizeI = Math.round( size )
  const error = deltaX / 2
  const y     = y0 - Math.round( size / 2 )

  let c = 0
  for ( let y = y0; y < y1; y++ ) {
    c++
    if ( steep ) {
      ctx.fillRect( y, x, sizeI, 1 )
    } else {
      ctx.fillRect( x, y, 1, sizeI )
    }

    error = error - deltaY
    if ( error < 0 ) {
      y = y + yStep
      error = error + deltaX
    }
  }
}

/**
 * A bespoke brush, specifically for pixelated drawing.
 */
class PixelBrush extends Brush {
  constructor( setup ) {
    const brushCmd = setup.onDraw
    this.pencilCommand = function( canvas:HTMLCanvasElement, x:number, y:number, size:number ) {
      brushCmd( canvas, x, y, size )
    }

    setup.onDown = function( canvas:HTMLCanvasElement, x:number, y:number ) {
      this.lastX = x
      this.lastY = y
      this.skipFirst = true

      const size = Math.round( this.size )

      x -= (size/2) | 0
      y -= (size/2) | 0

      this.pencilCommand( canvas, x, y, size )
      canvas.redrawUpscale( x|0, y|0, 0, 0, false, size )
      this.addDrawAreaAroundPoint( x, y, size )
    }

    setup.onMoveOnUp = function( canvas:HTMLCanvasElement, x:number, y:number ) {
      const size  = this.size
      const diffX = this.lastX - x
      const diffY = this.lastY - y

      if ( this.skipFirst && (Math.abs(diffX) >= 1 || Math.abs(diffY) >= 1) ) {
        this.skipFirst = false

        if ( diffX >= 1 ) {
          diffX--
          this.lastX--
        } else if ( diffX <= -1 ) {
          diffX++
          this.lastX++
        }

        if ( diffY >= 1 ) {
          diffY--
          this.lastY--
        } else if ( diffY <= -1 ) {
          diffY++
          this.lastY++
        }
      }

      const hasMovedAtLeastOnePixel = ( Math.abs(diffX) < 0.5 && Math.abs(diffY) < 0.5 )
      if ( ! hasMoveDAtLeastOnePixel ) {
        return
      }

      renderLine( this.pencilCommand, canvas, x, y, this.lastX, this.lastY, size)

      canvas.redrawUpscale( x|0, y|0, diffX, diffY, false, size )
      this.addDrawArea( x|0, y|0, diffX, diffY, size )

      this.lastX = x
      this.lastY = y
    }

    super( setup )
  }
}

const pickerCommand = new Command({
    name  : 'Picker',
    css   : 'picker',

    caption: 'Colour Picker | shortcut: k or hold Alt',
    cursor: 'sb_cursor_picker',

    onDownOnMove : function( canvas, x, y, painter ) {
      const rgb = canvas.colourPick( x, y )

      if ( rgb !== null ) {
        painter.setColour( colourUtils.rgbToColour(rgb[0], rgb[1], rgb[2]) )
        painter.setAlpha( rgb[3] / 255.0 )
      }
    }
})

// When we switch to the Eraser we have to store the previous command.
// This is the code that stores that previous command.
let eraserSwitch :Nullable<Command> = null
const switchToEraser = function( shiftDown, painter ) {
  if ( shiftDown ) {
    eraserSwitch = this
    painter.setCommand( eraser )
  }
}

/* Eraser
 *
 * Works by having two built internally:
 * = hard eraser, works on a pixel level
 * = soft eraser, has faded edges
 *
 * The complete eraser houses both, and switches between them.
 */
const eraser =
    (function() {
      const hardErase = new PixelBrush({
          name: 'Eraser',
          css : 'eraser',

          onDraw: function( canvas, x, y, size ) {
            const ctx = canvas.getDirectContext()
            const gc = ctx.globalCompositeOperation

            ctx.globalCompositeOperation = 'destination-out'
            canvas.getDirectContext().fillRect( x | 0, y | 0, size, size )
            ctx.globalCompositeOperation = gc
          }
      })

      const softErase = new Brush({
          name: 'Soft Eraser',
          css : 'soft_eraser',

          onDown: function( canvas:HTMLCanvasElement, x:number, y:number ) {
            this.lastX = x
            this.lastY = y
          },

          onMoveOnUp: function( canvas:HTMLCanvasElement, x:number, y:number ) {
            const diffX = this.lastX - x
            const diffY = this.lastY - y

            this.drawLine( canvas.getDirectContext(), x, y )
            canvas.redrawUpscale( this.lastX, this.lastY, diffX, diffY, false, this.size*2 )

            this.addDrawArea( this.lastX, this.lastY, diffY, diffY, this.size*2 )
          }
      })

      softErase.drawLine = function( ctx:CanvasRenderingContext2D, x:number, y:number ) {
        const compOp = ctx.globalCompositeOperation

        ctx.globalCompositeOperation = 'destination-out'
        ctx.lineJoin = 'round'

        ctx.lineWidth = this.size

        ctx.beginPath()
        ctx.moveTo( this.lastX, this.lastY )
        ctx.lineTo( x, y )
        ctx.closePath()

        ctx.stroke()

        ctx.globalCompositeOperation = compOp

        this.lastX = x
        this.lastY = y
      }

      const eraser = new Command({
          name: 'Eraser',
          css : 'eraser',
          caption: 'Eraser | shortcut: e',

          onDown: ( canvas, x:number, y:number, ) => {
            const brush = this.isAliased ? softErase : hardErase

            brush.size = this.size
            brush.onDown( canvas, x, y )
            this.brush = brush
          },

          onMove: function( canvas, x:number, y:number, ) {
            this.brush.onMove( canvas, x, y )
          },

          onUp: function( canvas, x:number, y:number, ) {
            this.brush.onUp( canvas, x, y )
            this.setDrawAreaObj( this.brush.popDrawArea() )
          },

          cursor: () => {
            if ( eraser.isAliased ) {
              cursors.CIRCLE_CURSOR( eraser )
            } else {
              cursors.SQUARE_CURSOR( eraser )
            }
          },

          controls: [
            {
              name: 'Size',
              field:'size',
              type: 'slider',

              cursor: true,

              value: 1,
              min: 1,
              max: 50,
            },
            {
              name: 'Smooth',
              field:'isAliased',
              type: 'checkbox',

              cursor: true,

              value: false,
            }
          ],

          /*
           * Logic for handling switching to the eraser
           * using shift, and then switching back.
           */

          // shift back to the last control,
          // if we shifted to the eraser
          onShift: function( shiftDown, painter ) {
            if ( eraserSwitch && ! shiftDown ) {
              painter.setCommand( eraserSwitch )
              eraserSwitch = null
            }
          }
      })

      return eraser
    })()
