
import * as constants from 'setup/constants'
import { CanvasManager } from 'main'
import { SkyBrush } from 'skybrush'
import * as htmlUtils from 'util/html'
import { MinMaxArea } from 'util/area'
import { Nullable, Consumer2 } from 'util/function-interfaces'

export interface CommandOptions {
  readonly name    ?: string
  readonly caption ?: string
  readonly cursor  ?: Nullable<string>
  readonly css     ?: string
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
export class Command {

  /**
   * The name for this Command. Used to identify it.
   */
  private readonly name : string

  /**
   * A description for this Command.
   */
  private readonly caption : string

  private readonly cursor : Nullable<string|Consumer2<this, SkyBrush>>

  private readonly css : string

  private dom : Nullable<HTMLElement>

  private drawArea : Nullable<MinMaxArea>

  private isInAttach : boolean
  private isInDetach : boolean

  constructor(
      setup:CommandOptions,
  ) {
    this.name    = setup.name    || ''
    this.caption = setup.caption || ''
    this.cursor  = setup.cursor  || null
    this.css     = setup.css ?
        constants.COMMAND_CSS_PREFIX + setup.css :
        ''

    this.drawArea = null

    this.dom = null

    this.isInAttach = false
    this.isInDetach = false
  }

  onDown( _canvas:CanvasManager, _x:number, _y:number ) {
    // Do nothing.
  }

  onMove( _canvas:CanvasManager, x:number, _y:number ) {
    // Do nothing.
  }

  onUp( _canvas:CanvasManager, x:number, _y:number ) {
    // Do nothing.
  }

  onShift( _isShiftDown:boolean, _skybrush:SkyBrush ) {
    // Do nothing.
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
  onAttach( painter:SkyBrush ) {
    if ( ! this.isInAttach ) {
      this.isInAttach = true

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
  onDetach( painter:SkyBrush ) {
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
      painter:SkyBrush,
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

/**
 * Creates a new DOM element, for the control given,
 * all hooked up.
 *
 * Control info should provide:
 *  = name - the name of this control
 *  = type - checkbox, toggle, slider or another supported type.
 *  = field - the field that is updated by this control in the command.
 *
 * Extra properties include:
 *  = css - a CSS class added to the final control.
 *  = value - The default value to set for the field, and it's control.
 *
 * Extra properties are also required on a type by type basis.
 *
 * @param command The Command that the control info will place their info into.
 * @param control The control to create a DOM control for, this is the setup info.
 * @return The HTML control once built.
 */
function newCommandControl(
    command,
    control,
    painter:SkyBrush,
) {
  const name     = control.name
  const type     = control.type.toLowerCase()
  const css      = control.css
  const callback = control.callback
  const field    = control.field
  const isCursor = control.cursor || false

  if ( name === undefined ) {
    throw new Error( "Control is missing 'name' field" )
  } else if ( type === undefined ) {
    throw new Error( "Control is missing 'type' field" )
  } else if ( field === undefined ) {
    throw new Error( "Control is missing 'field' field" )
  }

  const cDom = document.createElement( 'div' )
  cDom.className =
      'skybrush_control '         +
      constants.CONTROL_CSS_PREFIX + type   +
      ((css !== undefined) ?
          ' sb_' + css :
          '' )

  const label = document.createElement('div')
  label.className = 'skybrush_command_control_label'
  label.innerHTML = name
  cDom.appendChild( label )

  const cssID = controlNameToCSSID( name )

  let defaultField = (
      control.hasOwnProperty( 'value' )
          ? control.value
          : command[ field ]
  )

  /*
   * Create the Dom Element based on it's type.
   * All supported types are listed here.
   */
  if ( type === 'checkbox' ) {
    if ( defaultField === undefined ) {
      defaultField = false
    }

    const checkbox = htmlUtils.newInput( 'checkbox', cssID )
    checkbox.addEventListener( 'change', () => {
      const isChecked = checkbox.checked

      command[ field ] = isChecked
      if ( callback ) {
        callback.call( command, isChecked, painter )
      }

      if ( isCursor ) {
        painter.refreshCursor()
      }
    })

    if ( command[field] ) {
      checkbox.setAttribute( 'checked', 'checked' )
    }

    cDom.appendChild( checkbox )
  } else if ( type === 'toggle' ) {
    const cssStates = control.css_options
    const names = control.name_options

    const numOptions =
        ( cssStates ? cssStates.length :
        ( names     ? names.length     :
                0 ) )

    let option = -1

    const toggle = document.createElement( 'input' )
    toggle.type = 'button'
    toggle.classList.add( 'skybrush_input_button' )
    toggle.classList.add( cssID )

    const switchOption = function() {
      if ( cssStates && cssStates[option] ) {
        toggle.classList.remove( cssStates[option] )
      }

      option = (option+1) % numOptions
      if ( names ) {
        toggle.value = `${names[option]}`
      }

      if ( cssStates && cssStates[option] ) {
        toggle.classList.add( cssStates[option] )
      }
    }

    switchOption()

    toggle.addEventListener( 'click', ev => {
        ev.stopPropagation()
        ev.preventDefault()
        switchOption()

        command[ field ] = option
        if ( callback ) {
          callback.call( command, option, painter )
        }

        if ( isCursor ) {
          painter.refreshCursor()
        }
    } )

    cDom.appendChild( toggle.get(0) )
  } else if ( type === 'slider' ) {
    const input = htmlUtils.newNumericInput( false, 'skybrush_input' )
    const min   = control.min
    const max   = control.max
    const step  = control.step || 1

    if ( defaultField === undefined ) {
      defaultField = Math.max( 1, min )
    }

    const handleInputChange = ( ev:KeyboardEvent ) => {
      // key up, and key down
      if ( ev.keyCode === 38 ) {
        const val = parseFloat( input.value )

        if ( val < max ) {
          input.value = `${Math.min( max, val + step )}`
        }

      } else if ( ev.keyCode === 40 ) {
        const val = parseFloat( input.value )

        if ( val > min ) {
          input.value = `${Math.max( min, val - step )}`
        }
      }

      requestAnimationFrame(() => {
        let n = parseInt( input.value )

        if ( isNaN(n) ) {
          return
        }

        if ( n >= 1 ) {
          n = Math.round( n )
          input.value = `${n}`

          command[ field ] = n

          if ( callback ) {
            callback.call( command, n, painter )
          }

          if ( isCursor ) {
            painter.refreshCursor()
          }
        }
      })
    }

    input.setAttribute( 'step', step )
    input.setAttribute( 'min', min )
    input.setAttribute( 'max', max )
    input.addEventListener( 'keydown', handleInputChange )
    input.addEventListener( 'change',  handleInputChange )
    // initialize
    input.value = defaultField

    const slider = htmlUtils.newSlider({
        step  : step,
        min   : min,
        max   : max,
        value : defaultField,

        onChange : n => {
          command[ field ] = n
          input.value = `${n}`

          if ( callback ) {
            callback.call( command, n, painter )
          }

          if ( isCursor ) {
            painter.refreshCursor()
          }
        }
    })
    slider.classList.add( cssID )

    cDom.appendChild( slider )
    cDom.appendChild( input  )

  } else {
    throw new Error( `Unknown control setup given` )

  }

  command[ field ] = defaultField

  return cDom
}

/**
 * Used for turning a control name into a CSS class, for
 * id purposes.
 *
 * Essentially it's so if I have a control called 'zoom'
 * then this is turned into a CSS class, and attached to
 * the control. This is for internal use, and shouldn't
 * clash with anything else.
 *
 * This class can then be used again later, for finding
 * the control.
 *
 * @const
 * @nosideeffects
 * @param name The name to translate
 * @return The CSS identifier for the given name.
 */
function controlNameToCSSID( name:string ) {
  return `${constants.CONTROL_ID_CSS_PREFIX}${name.toLowerCase()}`
}

