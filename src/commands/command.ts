
import * as constants from 'setup/constants'
import * as skybrush from 'skybrush'
import { MinMaxArea } from 'util/area'
import { Nullable, Consumer2 } from 'util/function-interfaces'

export interface CommandOptions {
  readonly name    ?: string
  readonly caption ?: string
  readonly cursor  ?: Nullable<string>
  readonly css     ?: string
}

export class Command {

  /**
   * The name for this Command. Used to identify it.
   */
  private readonly name : string

  /**
   * A description for this Command.
   */
  private readonly caption : string

  private readonly cursor : Nullable<string|Consumer2<this, skybrush.SkyBrush>>

  private readonly dom : Nullable<HTMLElement>

  private drawArea : Nullable<MinMaxArea>

  private isInAttach : boolean
  private isInDetach : boolean

  constructor( setup:CommandOptions ) {
    this.name    = setup.name    || ''
    this.caption = setup.caption || ''
    this.cursor  = setup.cursor  || null
    this.css     = setup.css ?
        constants.COMMAND_CSS_PREFIX + setup.css :
        ''

    this.drawArea = null

    this.dom = null
    this.controlsSetup = setup.controls

    if ( setup.onDown ) {
      this.onDown = setup.onDown
    }

    if ( setup.onDownOnMove ) {
      this.onDown =
      this.onMove =
           setup.onDownOnMove
    }

    if ( setup.onMoveOnUp ) {
      this.onUp   =
      this.onMove =
          setup.onMoveOnUp
    }

    if ( setup.onMove ) {
      this.onMove = setup.onMove
    }

    if ( setup.onUp ) {
      this.onUp = setup.onUp
    }

    this.whenAttached = setup.onAttach || null
    this.whenDetached = setup.onDetach || null

    const onShift = setup.onShift
    if ( onShift ) {
      const thisCommand = this

      this.shiftDown = function( isShiftDown ) {
        // This should use both 'self' and 'this' here, it is not
        // a bug.
        onShift.call( thisCommand, isShiftDown, this )
      }
    } else {
      this.shiftDown = null
    }

    this.isInAttach = false
    this.isInDetach = false
  }

  getCSS() {
    return this.css
  }

  /**
   * Called when a Command object is set as the current
   * command.
   *
   * @param painter The parent SkyBrush instance this is being attached to.
   */
  onAttach( painter:skybrush.SkyBrush ) {
    if ( ! this.isInAttach ) {
      this.isInAttach = true

      if ( this.whenAttached ) {
        this.whenAttached.call( this, painter )
      }

      if ( this.shiftDown ) {
        painter.onShift( this.shiftDown )

        // call if shift is down,
        // so control is properly setup
        if ( painter.isShiftDown() ) {
          this.shiftDown.call( painter, true )
        }
      }

      this.isInAttach = false
    }
  }

  /**
   * For when a Command object is detached from SkyBrush,
   * and it is no longer set as the current command.
   *
   * @param painter The parent SkyBrush instance this is being detached from.
   */
  onDetach( painter:skybrush.SkyBrush ) {
    if ( ! this.isInDetach ) {
      this.isInDetach = true

      if ( this.shiftDown ) {
        painter.removeOnShift( this.shiftDown )

        /*
         * If changing whilst shift is down,
         * we call as though it was lifte,
         * so it's like it was released.
         */
        if ( painter.isShiftDown() ) {
          this.shiftDown.call( painter, false )
        }
      }

      if ( this.whenDetached ) {
        this.whenDetached.call( this, painter )
      }

      this.isInDetach = false
    }
  }

  getCursor() {
    return this.cursor
  }

  getCaption() {
    return this.caption
  }

  getName() {
    return this.name
  }

  /**
   * Finds the control stated, based on it's 'name'.
   *
   * If the control is not found, then an empty jQuery
   * object will be returned.
   *
   * @param A jQuery object for the control.
   */
  getControl( name:string ):Nullable<HTMLElement> {
    const dom = this.getControlsDom()

    if ( dom ) {
      return dom.getElementsByClassName( controlNameToCSSID(name) )[0] as HTMLElement
    }

    return null
  }

  /**
   * This returns null if there are no controls
   * for this command.
   *
   * @return The HTML dom with all the control structures for this command.
   */
  createControlsDom(
      painter:skybrush.SkyBrush,
  ):HTMLElement {
    /*
     * Controls dom is loaded in a lazy way so painter
     * starts up a tad faster,
     */
    if ( this.dom === null ) {
      const dom = document.createElement( 'div' )
      dom.className = 'skybrush_command_controls_inner'

      const controlsSetup = this.controlsSetup
      if ( ! controlsSetup ) {
        dom.innerHTML = '<div class="skybrush_command_no_controls">no settings</div>'

      } else if ( controlsSetup instanceof Array ) {
        for ( let i = 0; i < controlsSetup.length; i++ ) {
          dom.appendChild( newCommandControl(
              this,
              controlsSetup[i],
              painter,
          ))
        }

      } else {
        dom.appendChild( newCommandControl(
            this,
            controlsSetup,
            painter,
        ))
      }

      this.dom = dom
    }

    return this.dom
  }

  /**
   * Returns the dom containing all of the command options
   * for this Command, or null if there is no dom.
   *
   * There would be no dom if there are no options.
   */
  getControlsDom():Nullable<HTMLElement> {
    return this.dom
  }

  popDrawArea():Nullable<MinMaxArea> {
    const t = this.drawArea
    this.drawArea = null

    return t
  }


  addDrawAreaAroundPoint(
      x : number,
      y : number,
      size : number,
  ): this {
    return this.addDrawArea(
        (x - size/2)|0,
        (y - size/2)|0,
        size,
        size,
        1,
    )
  }

  addDrawArea(
      x:number,
      y:number,
      w:number,
      h:number,
      buffer:number = 1,
  ):this {
    const da = this.drawArea

    if ( da === null ) {
      return this.setDrawArea( x, y, w, h, buffer )
    }

    buffer = buffer || 1

    if ( w < 0 ) {
      x -= w
      w = -w
    }

    if ( h < 0 ) {
      y -= h
      h = -h
    }

    da.minX = Math.min( da.minX, x - buffer )
    da.minY = Math.min( da.minY, y - buffer )
    da.maxX = Math.max( da.maxX, x+w+buffer )
    da.maxY = Math.max( da.maxY, y+h+buffer )

    return this
  }

  setDrawAreaObj(
      drawArea : Nullable<MinMaxArea>,
  ):this {
    this.drawArea = drawArea

    return this
  }

  /**
   * This can be used in a single args version, to allow passing
   * the Draw Area object from one command to another.
   *
   * Usage:
   *      brush.setDrawArea( otherBrush.popDrawArea() )
   *
   * You can also use it in a multi-args version to setup a drawing/refresh area.
   *
   * @param x
   * @param y
   * @param w is the width.
   * @param h is the height.
   * @param buffer A buffer around the area to be updated. This must be at least 1.
   */
  setDrawArea(
      x:number,
      y:number,
      w:number,
      h:number,
      buffer:number = 1,
  ):this {
    buffer = buffer || 1

    if ( w < 0 ) {
      w  = -w
      x -=  w
    }

    if ( h < 0 ) {
      h  = -h
      y -=  h
    }

    this.drawArea = {
        minX : x-buffer,
        minY : y-buffer,
        maxX : x+w+buffer,
        maxY : y+h+buffer,
    }

    return this
  }
}
