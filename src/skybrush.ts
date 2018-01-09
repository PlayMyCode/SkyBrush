
import * as constants from 'setup/constants'
import { CanvasManager } from 'main'
import { Command } from 'commands/command'
import { BrushCursor } from 'cursor/brush-cursor'
import { GUI } from 'html/gui'
import { InfoBar } from 'html/info-bar'
import { MinMaxArea, Point } from 'util/area'
import { Consumer, Consumer2, Consumer3, Nullable } from 'util/function-interfaces'
import { newCheckerboard } from 'html/checkerboard'
import * as events from 'util/events'
import * as htmlUtils from 'util/html'
import * as mathsUtils from 'util/maths'
import * as inputUtils from 'util/input'
import * as canvasUtils from 'util/canvas'
import * as colourUtils from 'util/colours'

export interface SkyBrushOptions {
  grab_ctrl_r ? : boolean
  width       ? : number
  height      ? : number
  callback    ? : Consumer<SkyBrush>
}

interface DraggingEvents {
  onMove : Nullable<Consumer<MouseEvent>>
  onEnd  : Nullable<Consumer<MouseEvent>>
}

type AltShiftSkipState =
  | 'none'
  | 'shift'
  | 'alt'

type ProcessDragEvent =
  ( ev:MouseEvent, left:number, top:number ) => void

type SkyBrushEvents =
  | 'resize'
  | 'onDraw'
  | 'onZoom'
  | 'onShift'
  | 'onAlt'
  | 'onSetAlpha'
  | 'onSetColour'
  | 'onSetCommand'
  | 'onUndo'
  | 'onRedo'

/**
 * The main entry point for creating a new SkyBrush
 * application. It works by taking a HTML DOM element, and
 * then filling this with all the bits used in SkyBrush.
 *
 * This includes the top bar, the viewport, the canvas,
 * the GUI tools, and so on.
 *
 * This SkyBrush object can then be used for interacting
 * with the SkyBrush application. For example setting an
 * image, creating a new blank image, or getting out what
 * has been painted so far.
 *
 * = DOM =
 *
 * When the app is created, SkyBrush will append all it's items
 * into the given stub. This means that SkyBrush will not replace
 * it, and will use this HTML element as the basis for SkyBrush.
 *
 * This DOM object should ideally be a div, and this is
 * presumed for any examples provided.
 *
 * The class 'skybrush' will also be added to the object,
 * if it does not have this class already.
 *
 * If no DOM is provided, then it will search for a HTML
 * element with the class 'skybrush', and attempt to use
 * this instead. If that fails, an error is thrown. : (
 *
 * = Options =
 *
 * This is an optional JSON-style object. Essentially
 * there are lots of optional parameters, and more might
 * be added in the future. So this is used to wrap all of
 * that up in one place.
 *
 * Options include:
 *
 *  grab_ctrl_r: pass in false to not grab ctrl+r
 *
 *  width:  The starting width of the canvas, if not provided,
 *          a default width is used.
 *  height: The starting height of the canvas in SkyBrush,
 *          and if not provided, an initial one is used.
 *
 *  callback: a function which is called in the future,
 *            after this is all setup.
 *
 * Note that for iamge and cursor loctaions, if a relative
 * location is provided, then it is relative to this file.
 *
 * = Example Usage =
 *
 * Crate a SkyBrush painting app, with a blank image 320x240.
 *
 *     <div class="skybrush"></div>
 *
 *     const skybrushDom = document.querySelector( '.skybrush' )
 *     const app = new SkyBrush( skybrushDom )
 *     app.newImage( 320, 240 )
 *
 *
 * @constructor
 * @public
 * @param dom The dom element to be converted into SkyBrush.
 * @param options Optional, extra parameters you can pass in to change stuff.
 */

/*
 * This is the core of SkyBrush, and what the outside world sees.
 *
 * It does lots of stuff.
 *
 * It's first task is to build the SkyBrush app, replacing the SkyBrush
 * stub that is given with it's own SkyBrush system.
 *
 * Next there is a GUI handling system, where it can hold the overlay
 * dialogs. This SkyBrush handles the dragging movement for the GUI's,
 * in order to ensure that dragging a GUI across the canvas does not
 * draw underneath.
 *
 * It also handles the drawing commands. This includes abstracting away
 * the zoom, and giving it the correct context to work out.
 *
 * The core of SkyBrush is a three part event loop: mousedown, mousemove and mouseup.
 * The mousedown (or anything called just before it) will dictate what that,
 * and the following two events, do when they are called.
 *
 * This includes handling dragging of the GUI's, painting to the canvas,
 * or even ignoring input.
 */
export class SkyBrush {
  private readonly dom             : HTMLElement
  private readonly guiPane         : HTMLElement
  private readonly guiDom          : HTMLElement
  private readonly viewport        : HTMLElement
  private readonly viewportContent : HTMLElement

  private readonly events          : events.Handler<this, SkyBrushEvents>
  private readonly canvas          : CanvasManager
  private readonly infoBar         : InfoBar
  private readonly brushCursor     : BrushCursor

  private readonly guis            : GUI[] = []

  // this is to reduce the width of the content area in the GUI pane,
  // when those GUIs are collapsed.

  private guiPaneContentWidthSubtract = 0

  private readonly commands      : Command[]
  private readonly pickerCommand : Command
  private command : Nullable<Command>



  //
  // Flags
  //

  private isDraggingFlag  : boolean = false
  private isPainting      : boolean = false

  // A flag for skipping either 'shift' or 'alt' events,
  // so only one of them is ever active at any time.
  //
  private shiftOrAltSkip  : AltShiftSkipState = 'none'
  private isShiftDownFlag : boolean = false
  private isAltDownFlag   : boolean = false
  private keysEnabled     : boolean = true

  private dragging:DraggingEvents = {
    onMove : null,
     onEnd : null,
  }

  constructor(
      container : HTMLElement,
      options   : SkyBrushOptions = {},
  ) {
    if ( ! container ) {
      if ( arguments.length === 0 ) {
        throw new Error( 'no dom value provided' )
      } else {
        throw new Error( 'invalid dom value given' )
      }
    }

    container.innerHTML = ''
    container.classList.add( 'skybrush' )

    if ( constants.IS_IOS ) {
      container.classList.add( 'sb_ios' )
    }

    container.addEventListener( 'contextmenu', ev => {
      ev.preventDefault()

      return false
    })

    // create the basic SkyBrush layout
    this.dom = htmlUtils.htmlToElement(
        '<div class="skybrush_container">' +
            '<div class="skybrush_wrap">' +
                '<div class="skybrush_viewport">' +
                    '<div class="skybrush_viewport_zoom"></div>' +
                    '<div class="skybrush_viewport_content"></div>' +
                '</div>' +
                '<div class="skybrush_gui_pane">' +
                    '<div class="skybrush_gui_pane_scroll">' +
                        '<div class="skybrush_gui_header_bar"></div>' +
                        '<div class="skybrush_gui_pane_content"></div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>'
    )

    container.appendChild( this.dom )

    // Make the dom focusable.
    this.dom.tabIndex = -1

    //
    // gui pane stuff
    //

    this.guiPane = this.dom.querySelector( '.skybrush_gui_pane' ) as HTMLElement
    this.guiDom  = this.guiPane.querySelector( '.skybrush_gui_pane_content' ) as HTMLElement

    this.viewport        = this.dom.querySelector( '.skybrush_viewport' ) as HTMLElement
    this.viewportContent = this.dom.querySelector( '.skybrush_viewport_content' ) as HTMLElement
    this.viewportContent.addEventListener( 'wheel', ev => {
      if ( ev.shiftKey ) {
        ev.stopPropagation()
        ev.preventDefault()

        const scrollDir = ev.wheelDelta

        if ( scrollDir < 0 ) {
          this.zoomOut()

        } else if ( scrollDir > 0 ) {
          this.zoomIn()

        }
      }
    })

    this.events = new events.Handler<this, SkyBrushEvents>( this )
    this.canvas = new CanvasManager( this.viewportContent, this )

    // initialized laterz
    this.command = null

    const allCommands = newCommands()

    /*
     * Pull out the colour picker command,
     * as we treat is seperately.
     */
    let pickerCommand = null
    for ( let i = 0; i < allCommands.length; i++ ) {
      const command = allCommands[i]

      if ( command.getName().toLowerCase() === 'picker' ) {
        allCommands.splice( i, 1 )
        pickerCommand = command

        break
      }
    }

    if ( pickerCommand === null ) {
      throw new Error( 'colour picker was not found' )
    }

    /**
     * An array of all commands objects used by SkyBrush.
     *
     * @const
     */
    this.commands      = allCommands
    this.pickerCommand = pickerCommand

    const zoomLabel = this.dom.querySelector( '.skybrush_viewport_zoom' ) as HTMLElement

    initializeMainButtons(
        this,
        this.dom.querySelector('.skybrush_gui_pane') as HTMLElement,
        pickerCommand,
    )
    initializeColours( this )
    initializeCommands( this, allCommands, pickerCommand )
    initializeSettings( this )
    initializeShortcuts(
        this,
        (options.grab_ctrl_r === false),
        pickerCommand,
    )

    this.infoBar = new InfoBar( this.dom )

    this.brushCursor = new BrushCursor( this.viewportContent, IS_TOUCH )

    this.onSetCommand( this.refreshCursor )

    // update the cursor on zoom
    this.onZoom( zoom => {
      this.brushCursor.setZoom( zoom, 'refresh' )
      this.refreshCursor()

      zoom *= 100

      /*
       * check for a decimal place, and if it's there,
       * remove the excess decimal places.
       */
      const zoomStr = (
          ( (zoom|0) !== zoom )
              ? zoom.toFixed(1)
              : `${zoom}`
      )

      zoomLabel.textContent = `${zoomStr}%`
      zoomLabel.classList.add( 'sb_show' )
      setTimeout(() => {
        zoomLabel.classList.remove( 'sb_show' )
      }, 120 )
    })

    /* ## GUI related events ## */

    /* Handle GUI dragging. */
    inputUtils.onDrag( document,
        ev => { return this.runMouseDown(ev) },
        ev => { return this.runMouseMove(ev) },
        ev => { return this.runMouseUp(ev)   },
    )

    const startingWidth  = options.width  || constants.DEFAULT_WIDTH
    const startingHeight = options.height || constants.DEFAULT_HEIGHT

    const defaultCommand = this.getCommand( constants.DEFAULT_COMMAND ) || this.commands[1]

    // Finally, set defaults
    this.resize( startingWidth, startingHeight )
        .refreshGUIPaneContentArea()
        .setZoom( constants.DEFAULT_ZOOM )
        .setColour( constants.DEFAULT_COLOUR )
        .setAlpha( constants.DEFAULT_ALPHA )
        .setCommand( defaultCommand )

    this.canvas.resetUndoRedo()

    /* Resize only seems to work on Window, not on the Viewport or SkyBrush */
    window.addEventListener( 'resize', () => {
      this.events.run( 'resize' )
    })

    // cancel alt/shift down when we alt-tab
    window.addEventListener( 'blur', () => {
      this.runOnShift( false )
      this.runOnAlt( false )
    })

    if ( options.callback ) {
      requestAnimationFrame(() => {
        if ( options.callback ) {
          options.callback( this )
        }
      })
    }
  }

  /**
   * Adds an event to the resize handling.
   */
  onResize( fun:() => void ) {
    this.events.add( 'resize', fun )
  }

  /**
   * Gives you a simple way to add ctrl/Mac-command bound key
   * shortcuts.
   *
   * Key describes the key being pressed (such as 'z' or 'r')
   * when a meta key is also pressed. If that happens, then
   * 'fun' will be run.
   */
  onCtrl( key:string|number, fun:() => void ) {
    if ( !(fun instanceof Function) || (typeof fun !== 'function') ) {
      throw new Error("Function expected for 'onCtrl'")
    }

    const keyTest = newKeyEventTest( key )

    return this.onKeyInteraction( 'keydown', ev => {
      if ( (ev.ctrlKey || ev.metaKey) && keyTest(ev) ) {
        fun.call( this, ev )

        return false
      }

      return undefined
    })
  }

  /**
   * Work modes include dragging GUI components and painting
   * to the canvas.
   *
   * @return True if this SkyBrush is in any work mode.
   */
  isBusy():boolean {
    return this.isDragging() || this.isPainting
  }

  /**
   * Sometimes it can be difficult getting SkyBrush to ignore key shortcuts,
   * when visually it's not visible.
   *
   * This allows you to just turn the shortcuts on/off, as you see fit.
   * When they are disabled, no events or setup is lost, it's simply that
   * the current events don't fire.
   *
   * By default, keys are enabled.
   *
   * @param enabled True to enable, false to disable.
   * @return This SkyBrush instance.
   */
  setKeysEnabled( enabled:boolean ):this {
    this.keysEnabled = enabled

    return this
  }

  /**
   * @return True if keys are enabled, false if not.
   */
  isKeysEnabled() {
    return this.keysEnabled
  }

  /**
   * Binds a key shortcut to be called.
   *
   * Can be called in one of two ways, first:
   *
   *     skybrush.onKey( 'a', function(ev) { ... } )
   *
   * Where you just state the key to bind to, and pass in a
   * function to run when it is hit.
   *
   * @return This SkyBrush instance (for method chaining).
   */
  onKey(
      key      : string|number,
      callback : Consumer<KeyboardEvent>,
  ):this {
    return this.onKey3( 'keydown', key, callback )
  }

  /**
   * Alternatively to onKey:
   *
   *     skybrush.onKey3( 'keydown', 'a', function(ev) { ... } )
   *
   * Where the first parameter is the name of the key event
   * to hang off, this should be 'keydown', 'keyup' or
   * 'keypressed'.
   *
   * The key given can be a character, such as 'x', 'a', and
   * so on, or a number (such as shift).
   *
   * This only fires if the ctrl or meta key is not pressed!
   * For attaching to those, use the 'onCtrl' method.
   */
  private onKey3(
      event: 'keydown' | 'keyup',
      key:string|number,
      callback:Consumer<KeyboardEvent>,
  ):this {
    const keyTest = newKeyEventTest( key )

    return this.onKeyInteraction( event, ev => {
      if ( !(ev.ctrlKey || ev.metaKey) && keyTest(ev) ) {
        callback.call( this, ev )

        return false
      } else {
        return undefined
      }
    })
  }

  /**
   * Same as 'onKey', on this binds to both key up and down.
   * When the key goes up, true is passed in as the first
   * parameter, and false when it goes down.
   *
   * This is for things like shift, or alt, so you can be
   * called when they go up or down.
   *
   * Usage:
   *
   *      skybrush.onKeyToggle( 'a', function(isADown, ev) {
   *          // code here
   *      })
   *
   * The above example will be called when 'a' is pressed
   * down, and then again when it is released.
   *
   * Key can be a character, such as 'a', or a number for
   * the key code.
   *
   * @param key The key to listen on.
   * @param callback A function to run when the key is down or up.
   * @return This SkyBrush instance.
   */
  onKeyToggle(
      key      : string|number,
      callback : Consumer2<boolean, KeyboardEvent>,
  ):this {
    return this
        .onKey3( 'keydown', key, ev => {
          callback( true, ev )
        })
        .onKey3( 'keyup', key, ev => {
          callback( false, ev )
        })
  }

  /**
   * This is the general purpose key shortcut binding method.
   * For most cases, you should use 'onKey' or 'onCtrl'.
   * This method exists for them; to avoid code repetition.
   *
   * You are given the event that occurres directly,
   * and so you can better decide how to handle it.
   *
   * The given event must return 'false' if it has found the
   * key it should be run on, in order to stop key event processing.
   *
   * @param event The type of key event, defaults to 'keydown' if null or undefined.
   * @param fun The callback to run on key input.
   * @return This SkyBrush instance (for method chaining).
   */
  private onKeyInteraction(
      event : 'keydown' | 'keyup',
      fun   : Consumer<KeyboardEvent>,
  ) {
    if ( ! event ) {
      event = 'keydown'
    }

    this.dom.addEventListener( event, ev => {
      if (
          ! this.isBusy()                             &&
            this.keysEnabled                          &&
          ! ( ev.target instanceof HTMLInputElement ) &&
            fun.call( this, ev ) === false
      ) {
        ev.preventDefault()
        ev.stopPropagation()
      }
    })

    return this
  }

  getInfoBar() {
    return this.infoBar
  }

  /**
   * Event for when *any* drawing operation has ended.
   * This includes pasting, clearing, etc.
   *
   * Pretty much every draw change will be sent to this,
   * including those which will go to 'onDraw'.
   */
  onDraw( fun:() => void ):this {
    this.canvas.onEndDraw( fun )

    return this
  }

  /* Event Handlers
   *
   * These are just thin wrappers that are hooked onto the relevant
   * DOM objects.
   *
   * They then pass the calls to all possible types of actions,
   * for that type of call.
   *
   * Those actions (i.e. dragging or drawing) are then responsible
   * for deciding if they should/shouldn't act.
   */

  /**
   * Movement for when the button is down.
   */
  /*
   * The || is because the process functions will return true if they are run.
   * This ensures if we get a true from one of them, it is then
   * not'd into a false, and so disables the mouse cursor change in Chrome.
   */
  runMouseMove( ev:MouseEvent ):boolean {
    this.brushCursor.onMove( ev )

    return ! (
        this.processOnDraw( ev ) ||
        this.processDrag( this.dragging.onMove, ev )
    )
  }

  runMouseUp( ev:MouseEvent ) {
    ev.preventDefault()

    if ( this.isDragging() ) {
      this.processDrag( this.dragging.onEnd, ev )

      this.dragging.onMove =
      this.dragging.onEnd  =
          null

      this.isDraggingFlag = false

    } else if ( this.isPainting ) {
      this.endDraw( ev )

      this.isPainting = false

      if ( constants.IS_TOUCH ) {
        this.brushCursor.hideTouch()
      }
    }
  }

  runMouseDown( ev:MouseEvent ) {
    const infoBar = this.infoBar

    if ( infoBar.isShown() ) {
      if ( infoBar.isTarget(ev.target) ) {
        return

      } else {
        infoBar.hide()
      }
    }

    const $target = $(ev.target)

    /*
     * If we are drawing from totally outside SkyBrush,
     * skip it.
     *
     * Also skip inputs, and the gui panes.
     *
     * This is so surrounding controls work ok.
     */
    if (
        $target.parents('.skybrush_viewport').size() > 0 &&
        ( constants.IS_TOUCH || ev.which === constants.LEFT ) &&
        ! $target.is('input, a, .sb_no_target') &&
        ! ev.isInScrollBar(this.viewportContent)
    ) {
      if ( this.isDragging() ) {
        this.processDrag( this.dragging.onStart, ev )

      // hide the GUI pane, if it's been quickly opened
      } else {
        if ( this.isGUIsOverlapping() ) {
          this.closeGUIPane()
        }

        this.isPainting = true
        return this.runStartDraw( ev )
      }
    }
  }

  runStartDraw( ev:MouseEvent ):false {
    ev.preventDefault()

    if ( constants.IS_TOUCH ) {
      this.brushCursor.showTouch()
      this.brushCursor.onMove( ev )
    }

    this.viewportContent.focus()

    this.processCommand( 'onDown', ev )

    return false
  }

  processOnDraw( ev:MouseEvent ):boolean {
    if ( this.isPainting ) {
      ev.preventDefault()

      this.processCommand( 'onMove', ev )

      return true
    }

    return false
  }

  /**
   * Called when this has finished drawing.
   * This starts the whole 'endDraw' process,
   * which can include update undo/redo stacks,
   * dealing with overlay's, updating the upscale,
   * and lots more stuff.
   *
   * All of that comes from this entry point,
   * but only if it's painting.
   *
   * @private
   * @param ev
   */
  endDraw( ev:MouseEvent ):void {
    this.processCommand( 'onUp', ev )

    this.canvas.endDraw( this.command.popDrawArea() )

    this.events.run( 'onDraw' )
  }

  startDrag(
      onMove : Consumer3<MouseEvent, number, number>,
      onEnd  : Consumer3<MouseEvent, number, number>,
  ):void {
    if ( ! this.isPainting && !this.isDragging() ) {
      this.dragging.onMove = onMove
      this.dragging.onEnd  = onEnd

      this.isDraggingFlag  = true
    }
  }

  /**
   * @private
   * @return True if this SkyBrush is currently dragging a GUI component, otherwise false.
   */
  isDragging():boolean {
    return this.isDraggingFlag
  }

  /**
   * Adds a new GUI component to float on top of this SkyBrush.
   *
   * The GUIs are built as a chain of GUIs, each attached to the next in turn.
   *
   * @param gui The GUI component to display.
   */
  addGUI( last:GUI, ... guis:GUI[] ):this {
    const isFirstGui = ( this.guis.length === 0 )

    if ( isFirstGui ) {
      this.guiDom.appendChild( last.getDom() )

    // -- a gui was already added before this call
    } else {
      const previousCallGui = this.guis[ this.guis.length - 1 ]
      previousCallGui.setSiblingGUI( last )

    }

    this.guis.push( last )

    guis.forEach( gui => {
      last.setSiblingGUI( gui )
      this.guis.push( gui )

      last = gui
    })

    return this
  }

  /**
   * Resizes the canvas inside of this SkyBrush object,
   * to the size stated.
   *
   * The existing content will be copied across.
   *
   * @param {number} width The new width.
   * @param {number} height The new height.
   */
  setSize( newWidth:number, newHeight:number ): this {
    this.canvas.setSize( newWidth, newHeight, true )

    return this
  }

  /**
   * This differs from setSize in that this performs a whole event,
   * as though the user has chosen to resize the canvas.
   *
   * For example this is recorded on teh undo stack.
   *
   * @param {number} width The new width.
   * @param {number} height The new height.
   */
  resize( newWidth:number, newHeight:number ):this {
    this.canvas.resize( newWidth, newHeight )

    return this
  }

  /**
   * @param {number} newWidth The new Width of the canvas.
   * @param {number} newHeight The new Height of the canvas.
   */
  scale( newWidth:number, newHeight:number, isSmooth:boolean ):this {
    this.canvas.scale( newWidth, newHeight, isSmooth )

    return this
  }

  /**
   * This re-applies the current zoom level.
   *
   * It's used for times when the width/height, and other metrics
   * that might mess up the zoom, have been altered.
   *
   * It's the same as: this.setZoom( this.getZoom() )
   */
  updateZoom():this {
    return this.setZoom( this.getZoom() )
  }

  /**
   * @return The current level of zoom.
   * @see setZoom
   */
  getZoom():number {
    return this.canvas.getZoom()
  }

  /**
   * @return The CanvasManager used inside this SkyBrush.
   */
  getCanvas():CanvasManager {
    return this.canvas
  }

  /**
   * Sets the zoom based on a percentage, this is a value from 0 to 1.
   *
   * Things like the actual min and actual max are abstracted away
   * with this method. 0.0 represents the minimum zoom (whatever that
   * value may be), whilst 1.0 is the maximum zoom.
   *
   * zoomX and zoomY may be 'true' to zoom into the center of the
   * canvas.
   *
   * @param zoom The percentage, from 0.0 to 1.0, for this to be zoomed.
   * @param zoomXY the location, in canvas pixels, of where to zoom. Optional, zooms into the centre if missing.
   */
  setZoomPercent( zoomPercent:number, zoomXY?:Point ) {
    return this.setZoom( percentToZoom(zoomPercent), zoomXY )
  }

  /**
   * @return {number} The current zoom level as a percent from 0.0 (min zoom) to 1.0 (max zoom).
   */
  getZoomPercent():number {
    return zoomToPercent( this.getZoom() )
  }

  /**
   * Sets the zoom level.
   *
   * This multiplies the width/height of the canvas by the amount given.
   *
   * The zoom value is a multiplyer to multiply against the
   * current size.
   *
   * For example if zoom is 1, then the width and height are
   * multiplied by 1, and this is the 100% zoom level (no
   * zoom).
   *
   * If you want to zoom in by a factor or 5, or 500% zoom,
   * then you pass in 5. Width and height are now 5 times
   * larger.
   *
   * If you want to zoom out to quarter the size, a zoom of
   * 25%, then you pass in 0.25. Width and height are now
   * a quarter of their normal size; they are multiplied by
   * 0.25.
   *
   * You could also think of that as zooming out by a factor
   * of 4, and so the zoom level is 1/4, which is 0.25.
   *
   * It is important that you understand that zooming in and
   * out work on different ranges.
   *  = Zooming  in by a factor of 4 is just '4'
   *  = Zooming out by a factor of 4 is 1/4.
   *
   * The zoom value is limited to be between 1/MAX_ZOOM and
   * MAX_ZOOM, whatever that might be.
   *
   * The x and y values are used for the location of the
   * centre of the zoom. This is so if a user click in the
   * top left corner, you pass in those co-ordinates, and
   * SkyBrush will zoom in/out in relation to area. i.e. zoom
   * in towards the top left corner.
   *
   * x and y are in 'canvas pixels'.
   *
   * @param zoom The zoom factor.
   * @param zoomXY The centre of the zoom in canvas pixels.
   */
  setZoom( zoom:number, zoomXY?:Point ): this {
    zoom = mathsUtils.limit( zoom, 1/constants.MAX_ZOOM, constants.MAX_ZOOM )

    if ( zoom > 1 ) {
      zoom = Math.round( zoom )
    }

    this.canvas.setZoom( zoom, zoomXY )
    this.events.run( 'onZoom', zoom, zoomXY )

    return this
  }

  /**
   * Zooms into the location given, or if not provided, the
   * centre of the viewport.
   *
   * @param zoomXY The center of where we are zooming into. Null to zoom into the centre.
   */
  zoomIn( zoomXY ?: Point ): this {
    const zoom = percentToZoom( this.getZoomPercent() + 1/constants.MAX_ZOOM )

    return this.setZoom( zoom, zoomXY )
  }

  /**
   * Zooms out at the location given (location is optional).
   *
   * @param zoomXY The centre of where we are zooming into, or null for centre of the viewport.
   */
  zoomOut( zoomXY ?: Point ) {
    const zoom = percentToZoom( this.getZoomPercent() - 1/constants.MAX_ZOOM )

    return this.setZoom( zoom, zoomXY )
  }

  /**
   * Event for when the 'shift' key is pressed, up or down.
   */
  onShift( fun:Consumer<boolean> ):this {
    this.events.add( 'onShift', fun )

    return this
  }

  /**
   * Removes the function given from being run when shift is
   * pressed up or down.
   *
   * The function is called in the context of SkyBrush,
   * and if shift is down or not is passed into the first
   * parameter.
   *
   * @param fun The event to run.
   */
  removeOnShift( fun:Consumer<boolean> ):this {
    this.events.remove( 'onShift', fun )

    return this
  }

  /**
   * Runs all event handlers and optionally alters the shift
   * flag.
   *
   * If true or false is passed, then the events are only run
   * if it's changed.
   *
   * So if you do:
   *
   *    skybrush.runOnShift( true ).runOnShift( true )
   *
   * ... shift events are called the first time, and ignored
   * on the second (as shift hasn't changed).
   *
   * Of course if you do:
   *
   *    skybrush.runOnShift( true ).runOnShift( false )
   *
   * ... then events are run twice.
   *
   * In practice state changes should only be made internally,
   * within SkyBrush.
   *
   * @param True if shift is now down, false if not, or skip this to run all events.
   * @return This SkyBrush instance.
   */
  runOnShift( shiftDown:boolean ):this {
    if ( this.shiftOrAltSkip === 'shift' ) {
      const shiftUp = ! shiftDown

      if ( shiftUp ) {
        this.shiftOrAltSkip = 'none'
      }

    // If Alt is also down then don't run shift.
    // Mark this as down to be skipped on raise.
    } else if ( this.isAltDownFlag ) {
      this.shiftOrAltSkip = 'shift'

    } else if ( shiftDown !== this.isShiftDownFlag ) {
      this.isShiftDownFlag = shiftDown
      this.events.run( 'onShift', shiftDown )

    }

    return this
  }

  runOnAlt( altDown:boolean ):this {
    if ( this.shiftOrAltSkip === 'alt' ) {
      const altUp = ! altDown

      if ( altUp ) {
        this.shiftOrAltSkip = 'none'
      }

    // If Shift is also down then don't run Alt.
    // Mark this as down to be skipped on raise.
    } else if ( this.isAltDownFlag ) {
      this.shiftOrAltSkip = 'alt'

    } else if ( altDown !== this.isAltDownFlag ) {
      this.isAltDownFlag = altDown
      this.events.run( 'onAlt', shiftDown )

    }

    return this
  }

  /**
   * @return True if shift is current pressed, false if not.
   */
  isShiftDown():boolean {
    return this.isShiftDownFlag
  }

  /**
   * Callbacks to be run when alt is pressed or released.
   */
  onAlt( onAlt:Consumer<boolean> ):this {
    this.events.add( 'onAlt', onAlt )

    return this
  }

  /**
   * @return True if alt is current pressed, false if not.
   */
  isAltDown():boolean {
    return this.isAltDownFlag
  }

  /**
   * Add an event to be run when this zooms in.
   *
   * @param fun The event to run.
   */
  onZoom( fun:Consumer<number> ): this {
    this.events.add( 'onZoom', fun )

    return this
  }

  /**
   * @param alpha The alpha value used when drawing to the canvas.
   */
  setAlpha( alpha:number ): this {
    alpha = mathsUtils.limit( alpha, 0, 1 )

    // account for the dead zone
    if ( alpha > 1-constants.ALPHA_DEAD_ZONE ) {
      alpha = 1
    }

    this.canvas.setAlpha( alpha )
    this.events.run( 'onSetAlpha', this.canvas.getAlpha() )

    return this
  }

  /**
   * Adds an event to be run when the alpha value is changed on SkyBrush.
   *
   * @param fun The function to call.
   */
  onSetAlpha( fun:Consumer<number> ): this {
    this.events.add( 'onSetAlpha', fun )

    return this
  }

  /**
   * Adds a callback event which is run after the colour is set to SkyBrush.
   *
   * @param fun The function to call.
   */
  onSetColour( fun:Consumer<string> ): this {
    this.events.add( 'onSetColour', fun )

    return this
  }

  getAlpha() {
    return this.canvas.getAlpha()
  }

  getColour() {
    return this.canvas.getColour()
  }

  /**
   * @param strColour The colour to use when drawing.
   */
  setColour( strColour:string ):this {
    this.canvas.setColour( strColour )

    this.events.run( 'onSetColour', strColour )

    return this
  }

  onSetCommand( fun:Consumer2<Command, Command> ):this {
    this.events.add( 'onSetCommand', fun )

    return this
  }

  switchCommand( name:string ):this {
    name = name.toLowerCase()

    for ( let i = 0; i < this.commands.length; i++ ) {
      if ( this.commands[i].getName().toLowerCase() === name ) {
        return this.setCommand( this.commands[i] )
      }
    }

    return this
  }

  /**
   * Note that events are only fired if the command given
   * is different to the current command.
   *
   * @param command The Command object to switch to.
   * @return this SkyBrush object.
   */
  setCommand( command:Command ):this {
    /*
     * If you click on the same command, multiple times,
     * then nothing happens.
     *
     * Update only happens when you change command.
     */
    if ( this.command != command ) {
      if ( this.command ) {
        this.command.onDetach( this )
      }

      const lastCommand = this.command
      this.command = command
      command.onAttach( this )

      this.events.run( 'onSetCommand', command, lastCommand )
    }

    return this
  }

  /**
   * This works in two ways. Calling it with no name returns
   * the currently set command, i.e.
   *
   *    skybrush.getCommand()
   *
   * Alternatively you can pass in a name, and it will
   * return the stored command with that name, regardless of
   * if it's set or not.
   *
   *    skybrush.getCommand( 'pencil' )
   *
   * @param name Finds the command listed in SkyBrush.
   * @return The currently set command, or null if you call it before any command is set.
   */
  getCommand( name:string ):Nullable<Command> {
    name = name.toLowerCase()

    if ( this.pickerCommand !== null && this.pickerCommand.getName().toLowerCase() === name ) {
      return this.pickerCommand
    }

    for ( let i = 0; i < this.commands.length; i++ ) {
      const command = this.commands[i]

      if ( command.getName().toLowerCase() === name ) {
        return command
      }
    }

    return null
  }

  getCurrentCommand():Nullable<Command> {
    return this.command
  }

  /**
   * This refreshes the current cursor, for the command currently set.
   *
   * Many commands may have different cursors for their different states,
   * and so call this to get a new cursor set after a change has been perforemd.
   */
  refreshCursor():this {
    if ( this.command ) {
      this.brushCursor.setCommandCursor( this, this.command )
    }

    return this
  }

  /**
   * @return A data url for the current contents in SkyBrush.
   */
  exportAsDataUrl( imageType:canvasUtils.ExportImageType = 'image/png' ):string {
    return this.canvas.toDataURL( imageType )
  }

  /**
   * Note that due to restrictions in browsers,
   * the contents of the image will not appear straight away.
   * It will be available during a future JS event
   * (add an 'onload' event to the image to know when it's ready).
   *
   * @return A promise for an Image holding the items drawn on the canvas.
   */
  exportAsImage():Promise<HTMLImageElement> {
    const img = new Image()

    img.width  = this.canvas.getWidth()
    img.height = this.canvas.getHeight()
    img.src    = this.exportAsDataUrl( 'image/png' )

    return new Promise(( resolve, reject ) => {
      img.onload = () => {
        resolve( img )
      }

      img.onerror = () => {
        reject()
      }
    })
  }

  /**
   * Sets an image as the contents of this SkyBrush.
   * The SkyBrush is resised to accomodate the image.
   *
   * @param image The image to display on this canvas.
   */
  setImage( image:HTMLImageElement ):this {
    this.canvas.setImage( image, image.naturalWidth, image.naturalHeight )

    return this
  }

  /**
   * Cleares the current image.
   */
  clear(): this {
    this.canvas.clear()
    this.reset()

    return this
  }

  cut(): this {
    this.canvas.cut()

    return this
  }

  copy(): this {
    this.canvas.copy()

    return this
  }

  paste(): this {
    this.canvas.paste()
    this.switchCommand( 'move' )

    return this
  }

  /* Undo / Redo functionality */

  hasUndo():boolean {
    return this.canvas.hasUndo()
  }

  hasRedo():boolean {
    return this.canvas.hasRedo()
  }

  onUndo( fun:() => void ):this {
    this.events.add( 'onUndo', fun )

    return this
  }

  onRedo( fun:() => void ):this {
    this.events.add( 'onRedo', fun )

    return this
  }

  /**
   * Runs the 'undo' command.
   *
   * @return This SkyBrush instance.
   */
  undo():this {
    if ( this.canvas.undo() ) {
      this.events.run( 'onUndo' )
    }

    return this
  }

  /**
   * Runs the 'redo' command.
   *
   * @return This SkyBrush instance.
   */
  redo():this {
    if ( this.canvas.redo() ) {
      this.events.run( 'onRedo' )
    }

    return this
  }

  /**
   * @return The width of the users drawing (their canvas), in pixels.
   */
  getWidth():number {
    return this.canvas.getWidth()
  }

  /**
   * @return The height of the users drawing (their canvas), in pixels.
   */
  getHeight():number {
    return this.canvas.getHeight()
  }

  /**
   * Shows the GUI pane, but does not lock it open. When the user clicks to
   * draw then it will auto-close.
   *
   * @return This SkyBrush instance.
   */
  showGUIPane():this {
    this.guiPane.classList.add( 'sb_open' )

    return this
  }

  /**
   * Sets the GUI pane to be open.
   *
   * @return This SkyBrush instance.
   */
  openGUIPane():this {
    this.guiPane.classList.add( 'sb_open' )
    this.viewport.classList.add( 'sb_open' )

    this.canvas.lazyUpdateCanvasSize()
    this.refreshGUIPaneContentArea()

    return this
  }

  /**
   * Closes the GUI pane which the user can open and close at the bottom of
   * the screen.
   *
   * @return This SkyBrush instance.
   */
  closeGUIPane():this {
    this.guiPane.classList.remove( 'sb_open' )
    this.viewport.classList.remove( 'sb_open' )

    this.canvas.lazyUpdateCanvasSize()

    return this
  }

  subtractGUIPaneContentWidth( w:number ):this {
    this.guiPaneContentWidthSubtract -= w|0

    return this.refreshGUIPaneContentArea()
  }

  refreshGUIPaneContentArea():this {
    // at the time of writing, the first child is expected to always be a .skybrush_gui
    const contentWidth = $( this.guiDom.firstChild ).width() - this.guiPaneContentWidthSubtract

    if ( contentWidth < 0 ) {
      this.guiDom.style.width = '0'

    } else {
      this.guiDom.style.width = contentWidth + 'px'

    }

    return this
  }

  /**
   * @return True if the GUI section at the bottom is open, but not locked open.
   *       Otherwise false.
   */
  isGUIsOverlapping():boolean {
    return this.guiPane.classList.contains( 'sb_open' ) &&
       ! this.viewport.classList.contains( 'sb_open' )
  }

  /**
   * @return True if the GUI section at the bottom is open, and false if closed.
   */
  isGUIsShown():boolean {
    return this.guiPane.classList.contains( 'sb_open' )
  }

  /**
   * Toggles the GUI pane at the bottom of the screen between being open and
   * closed.
   *
   * @return This SkyBrush instance.
   */
  toggleGUIPane():this {
    if ( this.isGUIsShown() ) {
      return this.closeGUIPane()
    }

    return this.openGUIPane()
  }

  /**
   * Entirely removes any setup this currently has.
   *
   * This should be used when setting entirely new
   * images to SkyBrush.
   *
   * Note that setups such as the current colour,
   * alpha, and command will not be altered.
   * Only internal data structures, such as undo/redo,
   * will be wiped.
   *
   * @return This SkyBrush object.
   */
  reset():this {
    this.canvas.reset()
    this.setZoom( constants.DEFAULT_ZOOM )

    return this
  }

  /*
   * SkyBrush helper functions.
   * They are essentially private methods.
   */
  private processDrag( fun:ProcessDragEvent, ev:MouseEvent ):boolean {
    if ( fun ) {
      const loc = this.canvas.translateLocation( ev )
      fun( ev, loc.left, loc.top )

      ev.preventDefault()

      return true
    }

    return false
  }

  private processCommand( name:string, ev:MouseEvent ):void {
    const fun = this.command[name]

    if ( fun !== undefined ) {
      const loc = this.canvas.translateLocation( ev )

      this.command[name]( this.canvas, loc.left, loc.top, this, ev )
    }
  }
}

/**
 * Given a value from 0.0 to 1.0,
 * this will return it converted to: 1/MAX_ZOOM to MAX_ZOOM
 *
 * @param p The value to convert.
 * @return The zoom for the value given.
 */
function percentToZoom( p:number ):number {
  p = mathsUtils.limit( p, 0, 1 )

  // convert p from: 0.0 to 1.0 => -1.0 to 1.0
  p = (p-0.5) * 2

  // When p is very very close to 1, it can actually increase the zoom in the opposite direction.
  // So the min/max creates a dead zone, and we add p on as a minor zoom.

  if ( p > 0 ) {
    return Math.max( constants.MAX_ZOOM*p, 1+p )

  } else if ( p < 0 ) {
    const newZoom = 1 / ( constants.MAX_ZOOM*(-p) )

    // remember p is negative here, so we are subtracting from 1
    return Math.min( newZoom, 1+p )
  }

  return 1
}

function zoomToPercent( zoom:number ) {
  zoom = mathsUtils.limit( zoom, 1/constants.MAX_ZOOM, constants.MAX_ZOOM )

  let slide = 0

  // converts from: [1/MAX_ZOOM to MAX_ZOOM] => [-1.0 to 1.0]
  if ( zoom > 1 ) {
    slide =       zoom / constants.MAX_ZOOM
  } else if ( zoom < 1 ) {
    slide = - (1/zoom) / constants.MAX_ZOOM
  } else {
    slide = 0.0
  }

  // convert from [-1.0 to 1.0] => [0.0 to 1.0]
  return slide/2 + 0.5
}

function newKeyEventTest( key:string|number ) {
  if ( typeof key === 'number' ) {
    return newKeyEventTestNumeric( key|0 )
  } else if ( typeof key === 'string' ) {
    return newKeyEventTestString( key )
  } else {
    throw new Error( `expected string or number for key ${key}` )
  }
}

function newKeyEventTestNumeric( key:number ) {
  return function( ev:KeyboardEvent ) {
    if ( ev.charCode !== 0 ) {
      return ev.charCode === key
    } else {
      return ev.keyCode  === key
    }
  }
}

function newKeyEventTestString( key:string ) {
  key = normalizeKey( key )

  return function( ev:KeyboardEvent ) {
    if ( ev['char'] ) {
      return ev['char'] === key
    } else if ( ev.key !== undefined ) {
      return normalizeKey( ev.key ) === key
    } else {
       return normalizeKey( String.fromCharCode(ev.keyCode) ) === key
    }
  }
}

function normalizeKey( key:string ):string {
  if ( key.length > 1 ) {
    key = key.toLowerCase()

    if ( key === 'del' ) {
      key = 'delete'

    } else if ( key === 'esc' ) {
      key = 'escape'

    }
  }

  return key
}

function initializeMainButtons(
    painter       : SkyBrush,
    wrap          : HTMLElement,
    pickerCommand : Command,
) {
  const undoButton = htmlUtils.newButton( 'Undo', 'skybrush_header_button sb_disabled', () => {
    if ( ! undoButton.classList.contains('sb_disabled') ) {
      painter.undo()
    }
  })

  const redoButton = htmlUtils.newButton( 'Redo', 'skybrush_header_button sb_disabled', () => {
    painter.getInfoBar().hide()

    if ( ! undoButton.classList.contains('sb_disabled') ) {
      painter.redo()
    }
  })

  undoButton.setAttribute( 'title', 'Undo | shortcut: ctrl+z' )
  redoButton.setAttribute( 'title', 'Redo | shortcut: ctrl+r or ctrl+y' )

  const updateUndoRedo = function() {
    if ( painter.hasUndo() ) {
      undoButton.classList.remove('sb_disabled')
    } else {
      undoButton.classList.add('sb_disabled')
    }

    if ( painter.hasRedo() ) {
      redoButton.classList.remove('sb_disabled')
    } else {
      redoButton.classList.add('sb_disabled')
    }
  }

  painter
      .onUndo( updateUndoRedo )
      .onRedo( updateUndoRedo )
      .onDraw( updateUndoRedo )


  /*
   * Open / Close toggle
   */

  const openToggle = htmlUtils.newAnchor( '' )
  openToggle.innerHTML = '<div class="skybrush_open_toggle_text">&#x1F845</div>'
  openToggle.className = 'skybrush_header_button skybrush_open_toggle'
  inputUtils.leftClick( openToggle, () => {
    painter.toggleGUIPane()
  })

  /*
   * Zoom In / Out
   */

  const zoomIn = htmlUtils.newButton( '+', 'sb_zoom_in skybrush_header_button', () => {
    painter.zoomIn()
  })

  const zoomOut = htmlUtils.newButton( '-', 'sb_zoom_out skybrush_header_button', () => {
    painter.zoomOut()
  })

   zoomIn.setAttribute( 'title', 'Zoom In | shortcut: ctrl+='  )
  zoomOut.setAttribute( 'title', 'Zoom Out | shortcut: ctrl+-' )

  /*
   * Copy + Paste
   */

  const copy = htmlUtils.newButton( 'Copy', 'skybrush_button sb_disabled sb_absolute', () => {
    painter.getInfoBar().hide()

    if ( ! cut.classList.contains('sb_disabled') ) {
      painter.copy()
    }
  })

  const cut = htmlUtils.newButton( 'Cut', 'skybrush_button sb_disabled sb_absolute', () => {
    painter.getInfoBar().hide()

    if ( ! cut.classList.contains('sb_disabled') ) {
      painter.cut()
    }
  })

  const paste = htmlUtils.newButton( 'Paste', 'skybrush_button sb_disabled sb_absolute', () => {
    painter.getInfoBar().hide()

    if ( ! cut.classList.contains('sb_disabled') ) {
      painter.paste()
    }
  })

   copy.setAttribute( 'title', 'Copy Selection | shortcut: ctrl+c'  )
    cut.setAttribute( 'title', 'Cut Selection | shortcut: ctrl+x'   )
  paste.setAttribute( 'title', 'Paste Selection | shortcut: ctrl+v' )

  painter
      .getCanvas()
      .onClip( clippingArea => {
        if ( clippingArea !== null ) {
          copy.classList.remove('sb_disabled')
           cut.classList.remove('sb_disabled')
        } else {
          copy.classList.add('sb_disabled')
           cut.classList.add('sb_disabled')
        }
      })
      .onCopy(() => {
        paste.classList.remove( 'sb_disabled' )
      })

  const copyButtons = document.createElement( 'div' )
  copyButtons.className = 'skybrush_main_buttons'
  copyButtons.appendChild(  copy )
  copyButtons.appendChild(   cut )
  copyButtons.appendChild( paste )

  /*
   * The current colour icon, and colour picker
   */

  const currentColourBack = document.createElement( 'div' )
  currentColourBack.className = 'skybrush_colour_picker_current_colour_back'

  const currentColourShow = document.createElement( 'div' )
  currentColourShow.className = 'skybrush_colour_picker_current_colour'

  painter.onSetColour( strCol => {
    currentColourShow.style.background = strCol
  })

  painter.onSetAlpha( alpha => {
    currentColourShow.style.opacity = `${alpha}`
  })

  // colour picker
  const pickerCommandBack = document.createElement( 'div' )
  pickerCommandBack.className = 'skybrush_command_back'

  const pickerButton = document.createElement( 'a' )
  pickerButton.title = pickerCommand.getCaption()
  pickerButton.addEventListener( 'click', (ev) => {
      painter.setCommand( pickerCommand )

      ev.preventDefault()
      ev.stopPropagation()
  })

  const picker = document.createElement('div')
  picker.className = 'skybrush_gui_command ' + pickerCommand.getCSS()
  picker.appendChild( pickerCommandBack )
  picker.appendChild( pickerButton )

  painter.onSetCommand( command => {
    if ( command === pickerCommand ) {
      picker.classList.add( 'sb_selected' )
    } else {
      picker.classList.remove( 'sb_selected' )
    }
  })

  // colour info wrap

  const colourInfo = document.createElement('div')
  colourInfo.className = 'skybrush_colour_info'

  colourInfo.appendChild( currentColourBack )
  colourInfo.appendChild( currentColourShow )
  colourInfo.appendChild( picker )

  /* finally, put it all togther */

  /*
   * This is a special gui, more special than the others,
   * so he gets put aside on his own, to watch over toggling the panel
   * open.
   */
  const gui = new GUI( painter, [ openToggle, zoomOut, zoomIn, undoButton, redoButton ], 'main', false )
      .appendDirect( copyButtons, colourInfo )

  wrap.appendChild( gui.dom )
}

/**
 * Sets up the 'Canvas' GUI pane,
 * which has options like resize, scale, grid,
 * clear, and crop.
 */
function initializeSettings( painter:SkyBrush ) {

  /*
   * Resize & Scale
   */

  const infoOption = function(
      name             : string,
      onSuccess        : Consumer2<number, number>,
      extraComponents ?: Consumer<HTMLFormElement>,
  ) {
    let isConstrained = false

    return htmlUtils.newButton( name, 'skybrush_button sb_absolute', () => {
      const width  = painter.getCanvas().getWidth()
      const height = painter.getCanvas().getHeight()

      const widthInput = htmlUtils.newNumericInput( false, 'sb_width' )
      widthInput.value = `${width}`
      widthInput.maxLength = 5

      const heightInput = htmlUtils.newNumericInput( false, 'sb_height' )
      heightInput.value = `${height}`
      heightInput.maxLength = 5

      const constrain = htmlUtils.newInput( 'checkbox', 'constrain' )
      constrain.checked = isConstrained

      /*
       * Update the width/height in the other
       * input, when the value changes in this one,
       * if we're using 'constrain proportions'.
       */
      widthInput.addEventListener( 'keydown', () => {
        /*
         * setTimeout is used because the input.val is
         * only updated after this has fully bubbled up.
         * So we run the code straight after.
         */
        if ( constrain.checked ) {
          requestAnimationFrame( () => {
            const w = parseInt(widthInput.value) | 0

            if ( ! isNaN(w) && w > 0 ) {
              heightInput.value = `${Math.round( height * (w/width) )}`
            }
          })
        }
      })

      heightInput.addEventListener( 'keydown', () => {
        if ( constrain.checked ) {
          requestAnimationFrame(() => {
            const h = parseInt(heightInput.value)|0

            if ( ! isNaN(h) && h > 0 ) {
              widthInput.value = `${Math.round( width * (h/height) )}`
            }
          })
        }
      })

      /*
       * Reset the width/height when the user
       * turns the constrain property on.
       */
      constrain.addEventListener( 'change', () => {
        isConstrained = constrain.checked

        if ( isConstrained ) {
          widthInput.value  = `${width}`
          heightInput.value = `${height}`
        }
      })

      const form = document.createElement( 'form' )
      form.setAttribute( 'action', '' )
      form.addEventListener( 'submit', (ev) => {
        ev.preventDefault()

        onSuccess(
            parseInt(widthInput.value)  | 0,
            parseInt(heightInput.value) | 0,
        )

        painter.getInfoBar().hide()
      }, false)

      const okButton = htmlUtils.newInput( 'submit', '' )
      okButton.setAttribute( 'value', 'ok' )
      okButton.addEventListener( 'mousedown', ev => {
        ev.stopPropagation()
      })
      okButton.addEventListener( 'click', ev => {
        ev.stopPropagation()
        form.submit()
      })

      form.appendChild( htmlUtils.newTextDiv( 'skybrush_info_label', 'Width:'    ) )
      form.appendChild( widthInput  )

      form.appendChild( htmlUtils.newTextDiv( 'skybrush_info_label', 'Height:'   ) )
      form.appendChild( heightInput )

      form.appendChild( htmlUtils.newTextDiv( 'skybrush_info_label', 'Relative:' ) )
      form.appendChild( constrain   )

      if ( extraComponents ) {
        extraComponents( form )
      }

      form.appendChild( okButton )

      painter
          .getInfoBar()
          .setContent( form )
          .show()
    })
  }

  const resize = infoOption( 'Canvas Size', ( w, h ) => {
    painter.resize( w, h )
  })

  let isSmooth = false
  const scale = infoOption( 'Image Size',
      ( w, h ) => {
        const smoothInput = scale.querySelector( 'input.smooth' ) as HTMLInputElement

        painter.scale( w, h, smoothInput.checked )
      },

      ( form ) => {
        const smooth = htmlUtils.newInput( 'checkbox', 'smooth' )

        if ( isSmooth ) {
          smooth.setAttribute( 'checked', 'checked' )
        }

        smooth.addEventListener( 'change', function() {
          isSmooth = smooth.checked
        })

        form.appendChild( htmlUtils.newTextDiv('skybrush_info_label', 'Smooth') )
        form.appendChild( smooth )
      }
  )

  const grid = htmlUtils.newButton( 'Grid', 'skybrush_button sb_absolute', () => {
    const grid = painter.getCanvas().getGrid()

    /*
     * grid width & height
     */

    const updateSize = () => {
      requestAnimationFrame(() => {
        const w = parseInt(wInput.value) | 0
        const h = parseInt(hInput.value) | 0

        grid.setSize( w, h )
      })
    }

    const wInput = htmlUtils.newNumericInput( false, '' )
    wInput.addEventListener( 'keypress', updateSize )
    wInput.addEventListener( 'click'   , updateSize )
    wInput.addEventListener( 'change'  , updateSize )

    const hInput = htmlUtils.newNumericInput( false, '' )
    wInput.addEventListener( 'keypress', updateSize )
    wInput.addEventListener( 'click'   , updateSize )
    wInput.addEventListener( 'change'  , updateSize )

    wInput.value = `${grid.getWidth()}`
    hInput.value = `${grid.getHeight()}`

    /*
     * grid offset x & y
     */

    const updateOffset = () => {
      requestAnimationFrame(() => {
        const oX = parseInt(offsetX.value) | 0
        const oY = parseInt(offsetY.value) | 0

        grid.setOffset( oX, oY )
      })
    }

    const offsetX = htmlUtils.newNumericInput( false, '' )
    offsetX.addEventListener( 'keypress', updateOffset )
    offsetX.addEventListener( 'click'   , updateOffset )
    offsetX.addEventListener( 'change'  , updateOffset )

    const offsetY = htmlUtils.newNumericInput( false, '' )
    offsetY.addEventListener( 'keypress', updateOffset )
    offsetY.addEventListener( 'click'   , updateOffset )
    offsetY.addEventListener( 'change'  , updateOffset )

    offsetX.value = `${grid.getOffsetX()}`
    offsetY.value = `${grid.getOffsetY()}`

    /*
     * the show checkbox
     */

    const show = htmlUtils.newInput( 'checkbox', '' )
    show.checked = grid.isShown()
    show.addEventListener( 'change', () => {
      if ( show.checked ) {
        grid.show()
      } else {
        grid.hide()
      }
    })

    /*
     * put it all together
     */

    painter
        .getInfoBar()
        .setContent(
            htmlUtils.newTextDiv( 'skybrush_info_label',  'Width:'    ),
            wInput,
            htmlUtils.newTextDiv( 'skybrush_info_label',  'Height:'   ),
            hInput,

            htmlUtils.newTextDiv( 'skybrush_info_label',  'X Offset:' ),
            offsetX,
            htmlUtils.newTextDiv( 'skybrush_info_label',  'Y Offset:' ),
            offsetY,

            htmlUtils.newTextDiv( 'skybrush_info_label',  'Show:'     ),
            show,
        )
        .show()
  })

  /* Clear Canvas */
  const crop = htmlUtils.newButton( 'Crop', 'skybrush_button sb_absolute', () => {
    painter.getInfoBar().hide()
    painter.getCanvas().crop()
  })
  crop.setAttribute( 'title', 'Crop Image, ctrl+e' )

  const clear = htmlUtils.newButton('Clear', 'skybrush_button sb_absolute', () => {
    painter.getInfoBar().hide()

    if ( clear.classList.contains('sb_disabled') ) {
      painter.getCanvas().clear()
    }
  })
  clear.setAttribute( 'title', 'Clear Image, delete' )

  const commonControls = document.createElement('div')
  commonControls.classList.add( 'skybrush_topbar_button_group' )
  commonControls.appendChild( resize )
  commonControls.appendChild( scale )
  commonControls.appendChild( grid )
  commonControls.appendChild( clear )
  commonControls.appendChild( crop )

  const gui = new GUI( painter, 'Canvas', 'canvas' )
      .appendDirect( resize, scale, grid, clear, crop )

  painter.addGUI( gui )
}

/**
 * Sets up the colour GUI in the SkyBrush.
 */
function initializeColours(
    painter : SkyBrush,
):void {

  /*
   * Colour Palette
   *
   * As a small optimization, this builds the palette out of HTML, and
   * then just turns it into a dom in one.
   *
   * There is also *one* click handler, to handle all of the colours.
   */

  let coloursHTML = ''
  for ( let i = 0; i < constants.DEFAULT_COLOURS.length; i++ ) {
    const col = constants.DEFAULT_COLOURS[i]

    coloursHTML +=
        `<a href="#"
          class="skybrush_colours_palette_colour ${ ! constants.IS_TOUCH ? 'sb_hover_border' : '' }"
          data-colour="${col}"
          style="background:${col}"
        >
          <div class="skybrush_colours_palette_colour_border"></div>
        </a>`
  }

  const coloursDom = document.createElement( 'div' )
  coloursDom.className = 'skybrush_colours_palette'
  coloursDom.innerHTML = coloursHTML

  let currentColour : Nullable<HTMLElement> = null
  inputUtils.leftClick( coloursDom, ev => {
    let target = ev.target as HTMLElement

    if ( target.classList.contains('skybrush_colours_palette_colour_border') ) {
      target = target.parentNode as HTMLElement
    }

    if ( target !== currentColour ) {
      if ( currentColour !== null ) {
        currentColour.classList.remove( 'sb_show' )
      }

      currentColour = target
      currentColour.classList.add( 'sb_show' )

      painter.setColour( currentColour.dataset.colour )
    }
  })

  /*
   * Colour Mixer
   *
   * This is added at the end so we don't have to hard code
   * the mixer width. Instead we just use whatever width the
   * Colours GUI is.
   */

  /* Render size is the size of the canvas to display the colour info.
   * Mixer size is the size used internally.
   *
   * Mixer is 1 pixel smaller because the overlay horizontal/vertical lines
   * are 1 pixel out at the far edge.
   * So this corrects that.
   */

  /**
   * Used for storing values across events.
   */
  let hue        = 0
  let saturation = 0
  let value      = 0

  const updateHue = ( newHue:number ) => {
    hue = newHue
    const strBackColour = colourUtils.hsvToColour( newHue, 1.0, 1.0 )

    // update the back of the mixer
    colourBack.style.borderTopColor  =
    colourBack.style.borderLeftColor =
        strBackColour

    /* Update the colour wheel */

    const angleDeg = Math.round( (hue*360) - 180 )
    const rotation = `rotate(${angleDeg}deg)`

    wheelLineDom.style.transform = rotation
  }

  const mixerSize = constants.COLOUR_MIXER_WIDTH

  const colourBack = document.createElement('div')
  colourBack.className = 'skybrush_colour_mixer_back'

  const mixerFront = htmlUtils.newCanvas( mixerSize, mixerSize )
  mixerFront.classList.add( 'skybrush_colour_mixer_colour_layer' )
  const ctx          = mixerFront.getContext( '2d' ) as CanvasRenderingContext2D
  const ctxImageData = ctx.getImageData( 0, 0, mixerSize, mixerSize )
  const ctxPixelData = ctxImageData.data

  // Needed for Dev versions of Chrome, or the canvas is blank when updated.
  // Also _must_ be after we get the image data out.
  // It's to get it to 'wake up' and 'work'.
  ctx.fillRect( 0, 0, 100, 100 )

  for ( let y = 0; y < mixerSize; y++ ) {
    const yP = 1 - y/mixerSize
    const mixerWidth = mixerSize-y

    for ( let x = 0; x < mixerWidth; x++ ) {
      const i  = (y*mixerSize + x) * 4
      const xP = 1 - x/mixerSize

      // Set RGB to the same col, so it's grey.
      ctxPixelData[i] =
      ctxPixelData[i + 1] =
      ctxPixelData[i + 2] =
          ( 255*yP*xP + 0.5 ) | 0

      // Set alpha.
      ctxPixelData[i + 3] =
          ( 255*xP + 0.5 ) | 0
    }
  }

  ctx.putImageData( ctxImageData, 0, 0 )

  /* The Colour Wheel */

  const colourWheelCanvas = htmlUtils.newCanvas( constants.COLOUR_WHEEL_WIDTH, constants.COLOUR_WHEEL_WIDTH )
  colourWheelCanvas.className = 'skybrush_colour_wheel_colour_wheel'
  const wheelCtx       = colourWheelCanvas.getContext( '2d' ) as CanvasRenderingContext2D
  const wheelImageData = wheelCtx.createImageData( constants.COLOUR_WHEEL_WIDTH, constants.COLOUR_WHEEL_WIDTH )
  const wheelPixelData = wheelImageData.data

  const wheelLineDom = document.createElement( 'div' )
  wheelLineDom.className = 'skybrush_colour_wheel_line_outer'
  wheelLineDom.innerHTML = '<div class="skybrush_colour_wheel_line"></div>'

  const colourWheelHalfWidth = ( constants.COLOUR_WHEEL_WIDTH/2 ) | 0
  let i = 0
  for ( let y = 0; y < constants.COLOUR_WHEEL_WIDTH; y++ ) {
    for ( let x = 0; x < constants.COLOUR_WHEEL_WIDTH; x++ ) {
      const paintHue = colourUtils.atan2ToHue( colourWheelHalfWidth - y, colourWheelHalfWidth - x )

      wheelPixelData[i  ] = colourUtils.hsvToR( paintHue, 1, 1 )
      wheelPixelData[i+1] = colourUtils.hsvToG( paintHue, 1, 1 )
      wheelPixelData[i+2] = colourUtils.hsvToB( paintHue, 1, 1 )
      wheelPixelData[i+3] = 255

      i += 4
    }
  }

  wheelCtx.putImageData( wheelImageData, 0, 0 )

  inputUtils.leftDrag( colourWheelCanvas, ev => {
    const pos   = inputUtils.getOffset( ev, colourWheelCanvas )
    const distX = constants.COLOUR_WHEEL_WIDTH/2 - pos.left
    const distY = constants.COLOUR_WHEEL_WIDTH/2 - pos.top
    const hypot = Math.sqrt( distX*distX + distY*distY )

    // change the hue
    if ( hypot <= constants.COLOUR_WHEEL_WIDTH/2 ) {
      hue = colourUtils.atan2ToHue( distY, distX )
      painter.setColour(
          colourUtils.hsvToColour(
              hue,
              saturation,
              value
          )
      )

      updateHue( hue )

      ev.preventDefault()

    /*
     * it's right on the edge of the colour mixer,
     * technically inside, but visually outside.
     *
     * So we send the event somewhere else.
     */
    } else {
      mixerFront.trigger( ev )
    }
  })

  wheelLineDom.forwardEvents( colourWheelCanvas, 'vmousemove', 'vmousedown' )

  /* Combine Colour Mixer */

  const colourWheelWrap = document.createElement( 'div' )
  colourWheelWrap.className = 'skybrush_colour_wheel_wrap'
  colourWheelWrap.appendChild( colourWheelCanvas )
  colourWheelWrap.appendChild( wheelLineDom      )

  const mixerHorizontal = $('<div>')
      .addClass( 'skybrush_mixer_horizontal_line' )
      .forwardEvents( mixerFront, 'vmousedown', 'vmousemove' )

  const mixerVertical = $('<div>')
      .addClass( 'skybrush_mixer_vertical_line' )
      .forwardEvents( mixerFront, 'vmousedown', 'vmousemove' )

  const mixer = document.createElement( 'div' )
  mixer.className = 'skybrush_colour_mixer'
  mixer.appendChild( colourBack               )
  mixer.appendChild( mixerFront               )
  mixer.appendChild( mixerHorizontal.get(0)   )
  mixer.appendChild( mixerVertical.get(0)     )
  mixer.appendChild( colourWheelWrap          )

  inputUtils.leftDrag( mixerFront, ev => {
    const pos = inputUtils.getOffset( ev, mixerFront )

    const x = Math.max( pos.left, 0 )
    const y = Math.max( pos.top , 0 )

    if (
        x < mixerSize-y &&
        y < mixerSize-x
    ) {
      value = 1 - ( y / mixerSize )
      saturation = x / ( mixerSize - (1-value)*mixerSize )

      painter.setColour( colourUtils.hsvToColour(hue, saturation, value) )
    }

    ev.preventDefault()
  })

  /* Current Colour Info */

  /* Create the RGB lebel/inputs in the form. */
  const newColourInput = function(
      name       : string,
      css        : string,
      isDecimal  : boolean,
      max        : number,
      inputEvent : () => void,
  ):HTMLElement {
    const label = document.createElement('div')
    label.className = 'skybrush_rgb_label'
    label.innerHTML = name

    const input = htmlUtils.newNumericInput( isDecimal, 'skybrush_rgb_input ' + css )
    input.maxLength = 3
    input.min  = `0`
    input.max  = `${max}`
    input.step = ( isDecimal ? `0.01` : `1` )

    input.addEventListener( 'change', inputEvent )
    input.addEventListener( 'keypress', () => {
      requestAnimationFrame(() => {
        inputEvent()
      })
    })

    input.addEventListener( 'blur', () => {
      input.value = `${htmlUtils.getInputValue( input, max )}`

      inputEvent()
    })

    // todo, this should not exist. The label should be the wrap, not the div.
    const inputWrap = document.createElement( 'div' )
    inputWrap.className = 'skybrush_rgb_wrap'
    inputWrap.appendChild( label )
    inputWrap.appendChild( input )

    return inputWrap
  }

  /**
   * Grabs the RGB values in the form,
   * and sets them as the current colour in the SkyBrush.
   *
   * This is used for when the RGB values have been altered,
   * and they need to sync those values to the SkyBrush.
   */
  const syncRGBFormToCurrentColour = () => {
    const r = htmlUtils.getInputValue( rInput, 255 )
    const g = htmlUtils.getInputValue( gInput, 255 )
    const b = htmlUtils.getInputValue( bInput, 255 )

    const newColour = colourUtils.rgbToColour( r, g, b )
    painter.setColour( newColour )
  }

  const rWrap = newColourInput( 'r', 'skybrush_rgb_r', false, 255, syncRGBFormToCurrentColour, )
  const gWrap = newColourInput( 'g', 'skybrush_rgb_g', false, 255, syncRGBFormToCurrentColour, )
  const bWrap = newColourInput( 'b', 'skybrush_rgb_b', false, 255, syncRGBFormToCurrentColour, )

  const rInput = rWrap.lastElementChild as HTMLInputElement
  const gInput = gWrap.lastElementChild as HTMLInputElement
  const bInput = bWrap.lastElementChild as HTMLInputElement

  const aWrap  = newColourInput( 'a', 'rgb_a', true, 1.0, () => {
    const val = htmlUtils.getInputValue( aWrap.lastElementChild as HTMLInputElement, 1.0 )

    painter.setAlpha( val )
  })

  const aInput = aWrap.lastElementChild as HTMLInputElement

  const rgbForm = document.createElement( 'div' )
  rgbForm.className = 'skybrush_rgb_form'
  rgbForm.appendChild( rWrap )
  rgbForm.appendChild( gWrap )
  rgbForm.appendChild( bWrap )
  rgbForm.appendChild( aWrap )

  /*
   * HSV Form
   */

  const syncHSVFormToCurrentColour = () => {
    // convert to 0.0 to 1.0 values
    const h = htmlUtils.getInputValue( hInput, 360 ) / 360.0
    const s = htmlUtils.getInputValue( sInput, 100 ) / 100.0
    const v = htmlUtils.getInputValue( vInput, 100 ) / 100.0
    const hsvColour = colourUtils.hsvToColour( h, s, v )

    painter.setColour( hsvColour )
  }

  const hWrap = newColourInput( 'h', 'skybrush_rgb_h', false, 360, syncHSVFormToCurrentColour, )
  const sWrap = newColourInput( 's', 'skybrush_rgb_s', false, 100, syncHSVFormToCurrentColour, )
  const vWrap = newColourInput( 'v', 'skybrush_rgb_v', false, 100, syncHSVFormToCurrentColour, )

  const hInput = hWrap.lastElementChild as HTMLInputElement
  const sInput = sWrap.lastElementChild as HTMLInputElement
  const vInput = vWrap.lastElementChild as HTMLInputElement

  const hsvForm = document.createElement( 'div' )
  hsvForm.className = 'skybrush_hsv_form'
  hsvForm.appendChild( hWrap )
  hsvForm.appendChild( sWrap )
  hsvForm.appendChild( vWrap )



  /* Alpha Handling */
  const alphaBarLine = document.createElement( 'div' )
  alphaBarLine.className = 'skybrush_colour_alpha_line'

  const alphaGradient = document.createElement( 'div' )
  alphaBarLine.className = 'skybrush_colour_alpha_gradient'

  const alphaBar = document.createElement( 'div' )
  alphaBar.className = 'skybrush_colour_alpha_bar'
  alphaBar.appendChild( alphaGradient )
  alphaBar.appendChild( alphaBarLine  )
  alphaBar.addEventListener( 'click', ev => {
    ev.stopPropagation()
    ev.preventDefault()
  })

  const alphaWrap = document.createElement('div')
  alphaWrap.className = 'skybrush_colour_alpha_wrap'
  alphaWrap.appendChild( alphaBar )



  /* Put the GUI together */

  const currentColourPicker = document.createElement('div')
  currentColourPicker.className = 'skybrush_colour_picker'
  currentColourPicker.appendChild( hsvForm )
  currentColourPicker.appendChild( rgbForm )
  currentColourPicker.appendChild( alphaWrap )

  const paintModeLabel = document.createElement('div')
  paintModeLabel.className = 'skybrush_command_control_label'
  paintModeLabel.innerHTML = 'Paint Mode'

  const paintModeButton = document.createElement( 'input' )
  paintModeButton.className = 'skybrush_input_button'
  paintModeButton.type = 'button'
  paintModeButton.value = 'Normal'
  paintModeButton.addEventListener( 'change', () => {
    const mode = paintModeButton.value
    const c = painter.getCanvas()

    if ( mode === 'Normal' ) {
      paintModeButton.value = 'Mask'
      c.useDestinationAlpha()
    } else {
      paintModeButton.value = 'Normal'
      c.useBlendAlpha()
    }
  })

  const destinationAlpha = document.createElement('div')
  destinationAlpha.className = 'skybrush_destination_alpha'
  destinationAlpha.appendChild( paintModeLabel )
  destinationAlpha.appendChild( paintModeButton )

  const colourGUI = new GUI( painter, 'Palette', 'colours' )
      .appendTogether( currentColourPicker, destinationAlpha )
      .append( mixer )

  const swatchesGUI = new GUI( painter, 'Swatches', 'swatches' )
      .append( coloursDom )

  painter.addGUI( colourGUI, swatchesGUI )

  /* Now generate the alpha gradient, now the canvas has reflowed */

  const alphaCanvas = newCheckerboard(
      alphaGradient.clientWidth,
      alphaGradient.clientHeight,
      true,
  )

  inputUtils.leftDrag( alphaBar, ev => {
    const pos = htmlUtils.getOffset( alphaCanvas )
    const h   = alphaCanvas.clientHeight

    const y = mathsUtils.limit( ev.pageY - pos.top, 0, h )
    painter.setAlpha( y / h )

    ev.preventDefault()
  })

  ///
  /// We force a reflow first above.
  /// Then we build the alpha canvas using the size from the reflow.
  /// Now we put the alpha canvas in to replace the reflowed space.
  ///
  /// Todo, this is kinda silly. Just build it and put it in.
  ///
  alphaBar.replaceChild( alphaCanvas, alphaGradient )

  /*
   * Update Callbacks for Colour and Alpha
   */

  painter.onSetColour( strColour => {
    // update the shown colour
    alphaBar.style.background = strColour

    // convert #ff9933 colour into r, g, b values
    const hexStr = strColour.substring( 1, 7 )
    const rgb    = parseInt( hexStr, 16 )

    const r = (rgb >> 16) & 0xff
    const g = (rgb >>  8) & 0xff
    const b =  rgb & 0xff

    const hasRGBFocus =
        ( document.activeElement === rInput ) ||
        ( document.activeElement === gInput ) ||
        ( document.activeElement === bInput )

    const hasHSVFocus =
        ( document.activeElement === hInput ) ||
        ( document.activeElement === sInput ) ||
        ( document.activeElement === vInput )

    if ( ! hasRGBFocus ) {
      // and set the values
      rInput.value = `${r}`
      gInput.value = `${g}`
      bInput.value = `${b}`
    }

    /* Update the Colour Mixer */

    // convert colour to full hue
    const newHue = colourUtils.rgbToHSVHue( r, g, b )

    // cache these for laterz
    saturation = colourUtils.rgbToHSVSaturation( r, g, b )
    value = colourUtils.rgbToHSVValue( r, g, b )

    if ( ! hasHSVFocus ) {
      sInput.value = `${Math.round( saturation * 100 )}`
      vInput.value = `${Math.round( value * 100      )}`
    }

    /* Update X/Y location of the overlay bars */
    const xVal = saturation  // saturation
    const yVal = (1 - value) // value

    const colXWidth  = mixerSize - yVal*mixerSize
    const colYHeight = mixerSize

    const colX = xVal * colXWidth
    const colY = yVal * colYHeight

    mixerVertical
        .translate( colX, 0 )
        .height(
            mathsUtils.limit(
                (mixerSize - colX) + constants.COLOUR_MIXER_MIN_WIDTH,
                constants.COLOUR_MIXER_MIN_WIDTH,
                constants.COLOUR_MIXER_WIDTH
            )
        )

    mixerHorizontal
        .translate( 0, colY )
        .width(
            mathsUtils.limit(
                (mixerSize - colY) + constants.COLOUR_MIXER_MIN_WIDTH,
                constants.COLOUR_MIXER_MIN_WIDTH,
                constants.COLOUR_MIXER_WIDTH
            )
        )

    /* Update Hue
     *
     * Skip hue update for greys (when saturation == 0), as it's always red.
     */

    if ( saturation > 0 || hue === undefined ) {
      updateHue( newHue )

      if ( ! hasHSVFocus ) {
        hInput.value = `${Math.round( newHue * 360 )}`
      }
    }
  })

  painter.onSetAlpha( alpha => {
    const y = Math.floor( alpha*alphaBar.clientHeight )
    alphaBarLine.style.transform = `translateY( ${y}px )`

    // if it does not have focus
    if ( aInput !== document.activeElement ) {
      // concat alpha down to just two decimal places
      aInput.value = alpha.toFixed(2)
    }
  })
}

/**
 * Creates and sets up the Commands GUI.
 *
 * @param painter The SkyBrush application.
 */
function initializeCommands(
    painter       : SkyBrush,
    commandsList  : Command[],
    pickerCommand : Command,
):void {
  const commands = document.createElement( 'div' )
  commands.className = 'skybrush_commands_pane'

  const controlsWrap = document.createElement('div')
  controlsWrap.className = 'skybrush_command_controls'

  for ( let i = 0; i < commandsList.length; i++ ) {
    const c = commandsList[i]

    const command = document.createElement( 'div' )
    command.className = `skybrush_gui_command ${c.getCSS()}`
    command.__command = c

    const commandBack = document.createElement( 'div' )
    commandBack.className = 'skybrush_command_back'
    command.appendChild( commandBack )

    const commandButton = document.createElement('a')
    commandButton.href = '#'
    commandButton.title = c.getCaption()

    $( commandButton ).vclick( ev => {
      ev.preventDefault()
      ev.stopPropagation()

      painter.setCommand( c )
    })

    command.appendChild( commandButton )
    commands.appendChild( command )

    controlsWrap.appendChild( c.createControlsDom(painter) )
  }

  controlsWrap.appendChild( pickerCommand.createControlsDom(painter) )

  const commandsGUI = new GUI( painter, 'Tools', 'commands' )
      .append( commands )

  const commandControlsGUI = new GUI( painter, 'Tool Settings', 'command_settings' )
      .append( controlsWrap )

  painter.addGUI( commandsGUI, commandControlsGUI )

  // hook up the selection changes directly into the SkyBrush it's self
  painter.onSetCommand(( command, lastCommand ) => {
    const commandDoms = commands.getElementsByClassName( 'skybrush_gui_command' )
    for ( let i = 0; i < commandDoms.length; i++ ) {
      const commandDom = commandDoms[i]

      if ( commandDom.__command === command ) {
        commandDom.classList.add( 'sb_selected' )
      } else if ( commandDom.classList.contains('sb_selected') ) {
        commandDom.classList.remove( 'sb_selected' )
      }
    }

    let controls : Nullable<HTMLElement> = null
    if ( lastCommand !== null ) {
      controls = lastCommand.getControlsDom()

      if ( controls !== null ) {
        controls.classList.remove('sb_show')
      }
    }

    controls = command.getControlsDom()
    if ( controls !== null ) {
      controls.classList.add('sb_show')
    }
  })
}

/*
 * Sets up some common shortcuts,
 * not that not all are set here, such as undo/redo.
 */
function initializeShortcuts(
    painter       : SkyBrush,
    dontGrabCtrlR : boolean,
    pickerCommand : Command,
):void {
  painter.onCtrl( 187, () => {
    painter.zoomIn()
  })

  painter.onCtrl( 189, () => {
    painter.zoomOut()
  })

  // key code constants
  const ALT    = 18
  const SHIFT  = 16
  const DELETE = 46

  painter
      /* alternate commands - Shift key */
      .onKeyToggle( SHIFT, isShiftDown => {
        painter.runOnShift( isShiftDown )
      })

      /* alternate commands - Alt key */
      .onKeyToggle( ALT, isAltDown => {
        painter.runOnAlt( isAltDown )
      })

  /* Redo - ctrl + r and ctrl + y */
  if ( ! dontGrabCtrlR ) {
    painter.onCtrl( 'r', () => {
      painter.redo()
    })
  }

  painter
      .onCtrl( 'y', () => {
        painter.redo()
      })

      /* Undo - ctrl + z */
      .onCtrl( 'z', () => {
        painter.undo()
      })

      /* Crop - ctrl+e */
      .onCtrl( 'e', () => {
        painter.getCanvas().crop()
      })

      /* Clear - delete key */
      .onKey( DELETE, () => {
        painter.getCanvas().clear()
      })

      /* Copy */
      .onCtrl( 'c', () => {
        painter.copy()
      })

      /* Cut */
      .onCtrl( 'x', () => {
        painter.cut()
      })

      /* Paste */
      .onCtrl( 'v', () => {
        painter.paste()
      })

      /* Select All */
      .onCtrl( 'a', () => {
        painter
            .getCanvas()
            .getMarquee()
            .startHighlight()
            .select( 0, 0, painter.getWidth(), painter.getHeight() )
            .stopHighlight()
      })

  /* Command Key Bindings */

  const bindCommand = function( key:string, commandName:string ) {
    const command = painter.getCommand( commandName )

    return painter.onKey( key, () => {
      if ( ! command ) {
        return
      }

      painter.setCommand( command )
    })
  }

  bindCommand( 'p', 'pencil' )
  bindCommand( 'b', 'brush'  )
  bindCommand( 'w', 'webby'  )
  bindCommand( 'e', 'eraser' )

  bindCommand( 'r', 'rectangle' )
  bindCommand( 'c', 'circle' )
  bindCommand( 'l', 'line'   )

  bindCommand( 'f', 'fill'   )

  bindCommand( 'z', 'zoom'   )
  bindCommand( 's', 'select' )
  bindCommand( 'm', 'move'   )

  bindCommand( 'k', 'picker' )

  /* On Alt behaviour - switch to colour picker */
  let pickerSwitchCommand:Nullable<Command> = null

  painter.onAlt( isAlt => {
    if ( isAlt ) {
      if ( pickerSwitchCommand !== pickerCommand ) {
        pickerSwitchCommand = painter.getCurrentCommand()
        painter.setCommand( pickerCommand )
      }
    } else {
      if ( pickerSwitchCommand !== null ) {
        // they might have switched whilst alt is still down
        if ( painter.getCurrentCommand() === pickerCommand ) {
          painter.setCommand( pickerSwitchCommand )
        }

        pickerSwitchCommand = null
      }
    }
  })
}

function newCommands():Command[] {
  const pencilCommand = new PixelBrush({
      name: 'Pencil',
      css : 'pencil',
      caption: 'Pencil | shortcut: p, shift: switches to eraser',

      onDraw: ( canvas, x, y, size ) => {
        x = x|0
        y = y|0

        canvas.getDirectContext().fillRect( x, y, size, size )
      },

      cursor: cursors.SQUARE_CURSOR,

      onShift: switchToEraser,
  })

  /*
   * The state of the brush is kept in the canvas.
   * You see it will clear the path you have made
   * when you call 'beginPath'.
   *
   * So we call it once, when the mouse goes down,
   * and then just add points when it gets moved.
   * As a result the context stores all our points
   * for us.
   *
   * We just keep adding points, clear and stroke
   * on each move. At the end we call 'beginPath'
   * to clear it, but in practice any other brush
   * will call this anyway before they use the
   * context.
   */
  const standardBrushCommand = new Brush({
      name: 'Brush',
      css : 'brush',
      caption: 'Paint Brush | shortcut: b, shift: switches to eraser',

      cursor: cursors.CIRCLE_CURSOR,

      onDown: function( canvas, x, y ) {
        this.x =
            this.lastX =
            this.minX =
            this.maxX = x

        this.y =
            this.lastY =
            this.minY =
            this.maxY = y

        const ctx = canvas.getContext() as CanvasRenderingContext2D
        ctx.lineWidth = this.size
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()

        /*
         * This is to trick it into starting a line,
         * when the mouse goes down.
         */
        ctx.moveTo( x-0.1, y-0.1 )
        ctx.lineTo( x, y )
        this.updateLine( canvas, x, y )

        canvas.hideOverlay()
        canvas.redrawUpscale( this.lastX, this.lastY, x-this.lastX, y-this.lastY, true, this.size*2 )
      },

      onMove: function( canvas, x, y ) {
        this.updateLine( canvas, x, y )

        canvas.hideOverlay()
        canvas.redrawUpscale( this.lastX, this.lastY, x-this.lastX, y-this.lastY, true, this.size*2 )
      },

      onUp: function( canvas, x, y ) {
        this.updateLine( canvas, x, y )

        // end the current path
        canvas.getContext().beginPath()

        this.setDrawArea(
            this.minX,
            this.minY,
            this.maxX-this.minX,
            this.maxY-this.minY,
            this.size,
        )
      },

      onShift: switchToEraser,
  })

  standardBrushCommand.updateLine = function( canvas, x, y ) {
    const lastX = this.lastX = this.x
    const lastY = this.lastY = this.y

    this.x = x
    this.y = y

    this.minX = Math.min( this.minX, x )
    this.maxX = Math.max( this.maxX, x )
    this.minY = Math.min( this.minY, y )
    this.maxY = Math.max( this.maxY, y )

    const ctx = canvas.getContext() as CanvasRenderingContext2D
    canvasUtils.clearCtx(
        ctx,
        this.minX,
        this.minY,
        this.maxX - this.minX,
        this.maxY - this.minY,
        this.size
    )
    ctx.lineTo( x, y )
    ctx.stroke()
  }

  return [
      pickerCommand,
      pencilCommand,
      standardBrushCommand,

      (function() {
        /*
         * The webby/shading brush, used for shading areas.
         *
         * It stores and builds a list of pixels over the course of drawing,
         * and iterates over this, to work out new areas to draw upon.
         */
        const b = new Brush({
            name: 'Webby',
            css : 'web',
            caption: 'Web Brush | shortcut: w, shift: switches to eraser',

            cursor: cursors.CIRCLE_CURSOR,

            controls: [
                {
                    name : 'Size',
                    field: 'size',
                    value: 2,

                    type: 'slider',

                    cursor: true,

                    min: 1,
                    max: MAX_BRUSH_SIZE/10,
                },
                {
                    name : 'Dist',
                    field: 'dist',
                    value: 60,

                    type: 'slider',

                    min: 10,
                    max: 200,
                },
                {
                    name : 'Fuzzy',
                    field: 'fuzzy',
                    value: 1,

                    type: 'slider',

                    min: 1,
                    max: 25,
                },
                {
                    name: 'continuous',
                    field: 'isContinous',
                    value: true,
                    type: 'checkbox',
                }
            ],

            onDown: function( canvas, x, y ) {
              this.x =
                  this.lastX =
                  this.minX =
                  this.maxX = x

              this.y =
                  this.lastY =
                  this.minY =
                  this.maxY = y

              this.updateArea = {
                  minX: 1,
                  minY: 1,
                  maxX: 0,
                  maxY: 0,
              }

              const ctx = canvas.getContext()
              ctx.lineWidth = this.size
              ctx.lineCap   = 'round'
              ctx.lineJoin  = 'round'
              ctx.beginPath()

              /*
               * This is to trick it into starting a line,
               * when the mouse goes down.
               */
              this.xs = [ x-0.1 ]
              this.ys = [ y-0.1 ]

              this.updateLine( canvas, x, y, this.updateArea )

              canvas.hideOverlay()

              if ( this.updateArea.minX < this.updateArea.maxX ) {
                canvas.redrawUpscale(
                    this.updateArea.minX,
                    this.updateArea.minY,
                    this.updateArea.maxX-this.updateArea.minX,
                    this.updateArea.maxY-this.updateArea.minY,
                    true,
                    this.size*2
                )
              }
            },
            onMove: function( canvas, x, y ) {
              this.updateLine( canvas, x, y, this.updateArea )

              canvas.hideOverlay()

              if ( this.updateArea.minX < this.updateArea.maxX ) {
                canvas.redrawUpscale(
                    this.updateArea.minX,
                    this.updateArea.minY,
                    this.updateArea.maxX-this.updateArea.minX,
                    this.updateArea.maxY-this.updateArea.minY,
                    true,
                    this.size*2
                )
              }
            },

            onUp: function( canvas, x, y ) {
              this.updateLine( canvas, x, y, this.updateArea )

              // end the current path
              canvas.getContext().beginPath()

              this.setDrawArea(
                  this.minX,
                  this.minY,
                  this.maxX-this.minX,
                  this.maxY-this.minY,
                  this.size,
              )
            },

            onShift: switchToEraser
        })

        b.updateLine = function(
            canvas:HTMLCanvasElement,
            x:number,
            y:number,
            updateArea:MinMaxArea,
        ) {
          const lastX = this.lastX = this.x
          const lastY = this.lastY = this.y

          this.x = x
          this.y = y

          this.minX = Math.min( this.minX, x )
          this.maxX = Math.max( this.maxX, x )
          this.minY = Math.min( this.minY, y )
          this.maxY = Math.max( this.maxY, y )

          this.xs.push( x )
          this.ys.push( y )

          const xs = this.xs
          const ys = this.ys

          const ctx = canvas.getContext()

          const alpha = ctx.globalAlpha

          /**
           * Set these to invalid values, where min is greater
           * than max.
           *
           * min should be greater than the maximum possible value,
           * and max should be smaller than the smallest possible value.
           *
           * I don't go to extremes, like Integer MAX_NUMBER,
           * because that is a 64-bit value. Keeping it to within 31-bits,
           * hits a chrome optimization.
           */
          let minX = canvas.width+1
          let maxX = -1

          let minY = canvas.height+1
          let maxY = -1

          const minDist = (
              ( this.dist > this.size )
                  ? this.dist * this.dist
                  : this.size * this.size
          )

          if ( this.isContinous ) {
            ctx.beginPath()
            ctx.moveTo(this.lastX, this.lastY)
            ctx.lineTo(x, y)
            ctx.stroke()

            minX = Math.min( minX,
                Math.min( this.lastX, x )
            )
            minY = Math.min( minY,
                Math.min( this.lastY, y )
            )
            maxX = Math.max( maxX,
                Math.max( this.lastX, x )
            )
            maxY = Math.max( maxY,
                Math.max( this.lastY, y )
            )
          }

          const length = this.xs.length
          const maxSkip = this.fuzzy
          const skip = maxSkip

          for (let i = 0; i < length; i++) {
            const xi = xs[i]
            const yi = ys[i]

            const xDist = xi - x
            const yDist = yi - y
            const hypot = xDist * xDist + yDist * yDist

            if ( hypot < minDist ) {
              if ( --skip === 0 ) {
                skip = maxSkip

                ctx.globalAlpha = alpha * ((1 - (hypot / minDist)) * 0.1)
                ctx.beginPath()
                ctx.moveTo(x, y)
                ctx.lineTo(xi, yi)
                ctx.stroke()

                if ( x < xi ) {
                  if ( x < minX ) {
                    minX = x
                  }
                  if ( xi > maxX ) {
                    maxX = xi
                  }
                } else {
                  if ( xi < minX ) {
                    minX = xi
                  }
                  if ( x > maxX ) {
                    maxX = x
                  }
                }

                if ( y < yi ) {
                  if ( y < minY ) {
                    minY = y
                  }
                  if ( yi > maxY ) {
                    maxY = yi
                  }
                } else {
                  if ( yi < minY ) {
                    minY = yi
                  }
                  if ( y > maxY ) {
                    maxY = y
                  }
                }
              }
            }
          }

          updateArea.minX = minX
          updateArea.minY = minY
          updateArea.maxX = maxX
          updateArea.maxY = maxY

          ctx.globalAlpha = alpha
        }

        return b
      })(),

      eraser,

      /* Geometry Commands */
      new ShapeGeometry( {
          name: 'Rectangle',
          css : 'rectangle',
          caption: 'Draw Rectangle | shortcut: r, shift: toggles outline',

          onDraw: function( ctx, x1, y1, x2, y2 ) {
            const w = x2-x1
            const h = y2-y1

            if ( this.isOutline ) {
              ctx.lineWidth = this.size
              ctx.strokeRect( x1, y1, w, h )
            } else {
              ctx.fillRect( x1, y1, w, h )
            }
          },

          onShift: function() {
            this.getControl( 'Mode' ).click()
          }
      }),

      new ShapeGeometry( {
          name: 'Circle',
          css : 'circle',
          caption: 'Draw Circle | shortcut: c, shift: toggles outline',

          onDraw: function( ctx, x1, y1, x2, y2 ) {
            canvasUtils.circlePath( ctx, x1, y1, x2-x1, y2-y1 )

            if ( this.isOutline ) {
              ctx.lineWidth = this.size
              ctx.stroke()
            } else {
              ctx.fill()
            }
          },

          onShift: function() {
            this.getControl( 'Mode' ).click()
          }
      } ),
      new Geometry( {
          name: 'Line',
          css : 'line',
          caption: 'Draw Line | shortcut: l, shift: toggles smooth',

          onDown: function( canvas, x, y ) {
            this.lastX1 = x,
            this.lastY1 = y,
            this.lastW  = 1,
            this.lastH  = 1
          },

          onDraw: function( ctx, x1, y1, x2, y2 ) {
            const size = this.size

            canvasUtils.clearCtx( ctx,
                this.lastX1, this.lastY1,
                this.lastW , this.lastH,
                size
            )

            this.lastX1 = x1
            this.lastY1 = y1
            this.lastW  = x2-x1
            this.lastH  = y2-y1

            if ( this.isAliased ) {
              ctx.beginPath()

              ctx.lineWidth = size
              ctx.moveTo( x1, y1 )
              ctx.lineTo( x2, y2 )
              ctx.closePath()

              ctx.stroke()
            // draw it by hand, pixel by pixel
            } else {
              drawPixelLine( ctx, x1, y1, x2, y2, size )
            }
          },

          onShift: function() {
            this.getControl( 'Smooth' ).click()
          },

          controls: [
            {
              name: 'Width',
              field:'size',
              type: 'slider',
              css:  'size',

              value: 1,
              min: 1,
              max: MAX_BRUSH_SIZE,
            },
            {
              name: 'Smooth',
              field: 'isAliased',
              type: 'checkbox',
              value: true,
            }
          ]
      } ),

      /*
       * This code uses a 'flood fill' like algorithm to fill the
       * pixels. However flood fill algorithms tend to search for an
       * exact colour, and then replace it.
       *
       * Due to the support of tolerance and alpha mixing, it is
       * possible for a replaced colour to still remain within the
       * target tolerance of coloures we are looking for. This would
       * result in the pixel being coloured 2 or more times.
       *
       * To prevent this, the algorithm must track what pixels it has
       * altered so far.
       */
      new Command({
          name: 'Fill',
          css : 'fill',
          caption: 'Fill Colour | shortcut: f',

          onDown: (function() {
            /**
             * If the given x/y location is valid (0 or greater, < w/h),
             * and it hasn't already been used in 'done',
             * then it's added to the xs/ys arrays.
             *
             * @param fromI
             * @param toX
             * @param toY
             * @param clipW
             * @param clipH
             * @param seenPixels
             */
            const store = function(
                fromI:number,
                toX:number,
                toY:number,
                clipW:number,
                clipH:number,
                seenPixels:number,
            ):number {
              if ( 0 <= toX && toX < clipW && 0 <= toY && toY < clipH ) {
                const toI = toY*clipW + toX

                if ( seenPixels[toI] === 0 ) {
                  seenPixels[fromI] = toI + 1

                  return toI
                }
              }

              return fromI
            }

            return function(
                canvas:HTMLCanvasElement,
                mouseX:number,
                mouseY:number,
            ):void {
              // Floor the location, and make it clear to the VM
              // that these values are integers (the |0 code).
              mouseX = mouseX|0
              mouseY = mouseY|0

              const ctx = canvas.getDirectContext()
              const tolerance = this.tolerance

              const alpha     = ctx.globalAlpha
              const invAlpha  = 1-alpha
              const destAlpha = (ctx.globalCompositeOperation === 'source-atop')

              const rgb = canvas.getRGB()
              const srcR = rgb[0]|0
              const srcG = rgb[1]|0
              const srcB = rgb[2]|0
              const srcRAlpha = srcR * alpha
              const srcGAlpha = srcG * alpha
              const srcBAlpha = srcB * alpha

              const w = canvas.width |0
              const h = canvas.height|0

              const clip   = canvas.getClip()
              const clipX  = ( clip === null ? 0 : clip.x          )|0
              const clipY  = ( clip === null ? 0 : clip.y          )|0
              const clipW  = ( clip === null ? w : clip.w          )|0
              const clipH  = ( clip === null ? h : clip.h          )|0
              const clipX2 = ( clip === null ? w : clip.x + clip.w )|0
              const clipY2 = ( clip === null ? h : clip.y + clip.h )|0

              // if the target is outside of the clip area, then quit!
              if ( mouseX < clipX || mouseY < clipY || mouseX >= clipX2 || mouseY >= clipY2 ) {
                return

              } else {
                // get the pixel data out
                const ctxData = ctx.getImageData( clipX, clipY, clipW, clipH )
                const data = ctxData.data

                /*
                 * From here on, all x and y values should have
                 * the clipX/Y removed from them.
                 *
                 * So they extend from 0 to clipW/H.
                 */

                // Used for the update area at the end.
                // Default to where it was clicked to begin with.
                let minX = mouseX-clipX
                let maxX = mouseX-clipX
                let minY = mouseY-clipY
                let maxY = mouseY-clipY

                /**
                 * The pixels we have seen so far, and it also
                 * stores the next pixel to process.
                 *
                 * This is the 2D array of pixels flattened
                 * into a flat 1D array.
                 *
                 * As 0 is a valid index, and the array fills
                 * with 0's by default, we add 1 when storing
                 * and remove 1 when retrieving.
                 *
                 * This means -1 is a pixel with no next address,
                 * and 0 means 'go to the pixel at 0'.
                 */
                const seenPixels = new Int32Array( clipW * clipH )

                const currentI = mouseY*clipW + mouseX
                let needleI = currentI

                const dataI = currentI * 4

                const startR = data[dataI  ]
                const startG = data[dataI+1]
                const startB = data[dataI+2]
                const startA = data[dataI+3]

                // leave early if there is nothing to fill
                if ( destAlpha && startA === 0 ) {
                  return
                }

                // work out the tolerance ranges
                const minR = Math.max(   0, startR-tolerance )
                const minG = Math.max(   0, startG-tolerance )
                const minB = Math.max(   0, startB-tolerance )
                const minA = Math.max(   0, startA-tolerance )

                const maxR = Math.min( 255, startR+tolerance )
                const maxG = Math.min( 255, startG+tolerance )
                const maxB = Math.min( 255, startB+tolerance )
                const maxA = Math.min( 255, startA+tolerance )

                // fills pixels with the given colour if they are within tolerence
                do {
                  const x = (currentI % clipW)|0
                  const y = ((currentI-x) / clipW)|0

                  if ( x < minX ) {
                    minX = x
                  } else if ( x > maxX ) {
                    maxX = x
                  }
                  if ( y < minY ) {
                    minY = y
                  } else if ( y > maxY ) {
                    maxY = y
                  }

                  const i = currentI * 4
                  const r = data[i]
                  const g = data[i+1]
                  const b = data[i+2]
                  let a = data[i+3]

                  if (
                      // ensure we can write there
                      !(destAlpha && a === 0) &&

                      // ensure it is within tolerance
                      r >= minR && r <= maxR &&
                      g >= minG && g <= maxG &&
                      b >= minB && b <= maxB &&
                      a >= minA && a <= maxA
                  ) {
                    // skip mixing if we'll just be overwriting it
                    if ( alpha === 1 ) {
                      data[i  ] = srcR
                      data[i+1] = srcG
                      data[i+2] = srcB

                      if ( destAlpha === false ) {
                        data[i+3] = 255
                      }
                    } else {
                      const fullAlpha = ( a === 255 )
                      a /= 255.0

                      /*
                       * see Wikipedia: http://en.wikipedia.org/wiki/Alpha_Blend#Alpha_blending
                       *
                       * outA = srcA + destA(1-srcA)
                       * resultRGB = ( srcRGB*srcA + destRGB*destA*(1-srcA) ) / outA
                       */
                      const outA = alpha + a*invAlpha

                      // skip altering alpha if 'destination alpha' is set
                      // skip the alpha mixing if destination has full alpha
                      if ( destAlpha === false && !fullAlpha ) {
                        // formula: newAlpha = destA + srcA*(1-destA)
                        data[i+3] = ( (outA * 255) + 0.5 ) | 0
                      }

                      data[i  ] = ((( srcRAlpha + r*a*invAlpha ) / outA ) + 0.5 ) | 0
                      data[i+1] = ((( srcGAlpha + g*a*invAlpha ) / outA ) + 0.5 ) | 0
                      data[i+2] = ((( srcBAlpha + b*a*invAlpha ) / outA ) + 0.5 ) | 0
                    }

                    needleI = store( needleI, x-1, y  , clipW, clipH, seenPixels )
                    needleI = store( needleI, x+1, y  , clipW, clipH, seenPixels )
                    needleI = store( needleI, x  , y-1, clipW, clipH, seenPixels )
                    needleI = store( needleI, x  , y+1, clipW, clipH, seenPixels )
                  }

                  currentI = seenPixels[ currentI ] - 1
                } while ( currentI !== -1 && currentI !== needleI )

                const diffX = (maxX-minX) + 1
                const diffY = (maxY-minY) + 1

                ctx.putImageData( ctxData, clipX, clipY, minX, minY, diffX, diffY )
                this.setDrawArea( minX+clipX, minY+clipY, diffX, diffY )
              }
            }
          })(),

          cursor: 'sb_cursor_fill',

          controls: [
              {
                  name : 'Tolerance',
                  field: 'tolerance',
                  type : 'slider',
                  css  : 'tolerance',

                  value: 20,
                  min: 1,
                  max: 255,
              }
          ]
      } ),

      /* Utility Commands */
      new Command( {
          name: 'Zoom',
          css : 'zoom',
          caption: 'Zoom | shortcut: z, shift: opposite zoom',

          onShift: ( isShiftDown, painter ) => {
            this.getControl( 'Zoom' ).click()
          },

          onDown: ( canvas, x, y, painter, ev ) => {
            x = mathsUtils.limit( x, 0, painter.getWidth()  )
            y = mathsUtils.limit( y, 0, painter.getHeight() )

            if ( this.zoomOut ) {
              painter.zoomOut({ x: x, y: y })
            } else {
              painter.zoomIn({ x: x, y: y })
            }
          },

          controls : [{
            name: 'Zoom',
            css : 'zoom_cmd',

            field: 'zoomOut',
            type : 'toggle',

            name_options: [ 'In', 'Out' ],

            cursor: true,
          }],

          cursor: function( cursor, painter ) {
            const zoom = painter.getZoom()

            if (
                (  this.zoomOut && zoom === (1/constants.MAX_ZOOM) ) ||
                ( !this.zoomOut && zoom === constants.MAX_ZOOM )
            ) {
              cursor.setClass( 'sb_cursor_zoom_blank' )
            } else if ( this.zoomOut ) {
              cursor.setClass( 'sb_cursor_zoom_out' )
            } else {
              cursor.setClass( 'sb_cursor_zoom_in' )
            }
          }
      }),

      new Command({
          name: 'Select',
          css : 'select',
          caption: 'Selection Tool | shortcut: s',
          cursor: 'sb_cursor_select',

          onAttach: function( painter ) {
            painter.getCanvas().getMarquee().showHandles()
          },
          onDetach: function( painter ) {
            painter.getCanvas().getMarquee().hideHandles()
          },

          onDown: function( canvas, x, y, painter, ev ) {
            canvas.getMarquee()
                .startHighlight()

            this.startX = x
            this.startY = y
          },
          onMove: function(canvas, x, y) {
            canvas.getMarquee()
                .select( this.startX, this.startY, x, y )
          },
          onUp: function( canvas, x, y ) {
            canvas.getMarquee()
                .select( this.startX, this.startY, x, y )
                .stopHighlight()
          }
      } ),

      /*
       * The 'Move' command is for moving paste items around.
       *
       * This is tricky to get right, because certain behaviours all need to be supported.
       *  = If the button is clicked, with no movement, and there is a copy selection, it should be pasted.
       *  = If the button is clicked, with no movement, and no copy selection, nothing should happen.
       *  = If down and moved, and there is a copy selection, it should be moved but not pasted.
       *  = If down and moved, and there is no copy selection, it should cut and move the whole canvas.
       */
      new Command({
          name: 'Move',
          css : 'move',
          caption: 'Move Tool | shortcut: m',

          cursor: 'sb_cursor_cursor',

          onDown: function( canvas, x, y, painter, ev ) {
            this.startX = x
            this.startY = y

            /*
             * Used to track if it was dragged or clicked on the spot.
             */
            this.wasMovement = false
          },

          onMove: function( canvas, x, y ) {
            if ( ! canvas.isPasting() ) {
              canvas.cut().paste()
            }

            canvas.movePaste( x-this.startX, y-this.startY, false )

            this.wasMovement = true
          },

          onUp: function( canvas, x, y ) {
            if ( canvas.isPasting() ) {
              if ( this.wasMovement ) {
                canvas.movePaste( x-this.startX, y-this.startY, true )
              } else {
                canvas.drawAndEndPaste()
              }
            }
          }
      })
  ]
}
