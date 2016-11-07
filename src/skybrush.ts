
import {
    htmlToElement
} from 'util/html'

/**
 * in pixels
 */
const DEFAULT_WIDTH  = 540

/**
 * in pixels
 */
const DEFAULT_HEIGHT = 460

/**
 * From 1/MAX_ZOOM to MAX_ZOOM
 */
const DEFAULT_ZOOM = 1

/**
 * Default cursor name.
 */
const DEFAULT_CURSOR = 'sb_cursor_default'

/**
 * The name of the command to select as default,
 * when the user first sees painter.
 */
const DEFAULT_COMMAND = 'webby'

export interface SkyBrushOptions {
  grab_ctrl_r    ? : boolean ;
  width          ? : number  ;
  height         ? : number  ;
  callback       ? : ( skyBrush:SkyBrush ) => void ;
}

interface DraggingEvents {
  onMove : null | ( ev:MouseEvent ) => void ;
  onEnd  : null | ( ev:MouseEvent ) => void ;
}

type AltShiftSkipState = 'none' | 'shift' | 'alt'

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
 *     const app = new SkyBrush( $('.skybrush') );
 *     app.newImage( 320, 240 );
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

  private dom           : HTMLElement
  private guiPane       : HTMLElement
  private guiDom        : HTMLElement
  private viewport      : HTMLElement

  private events        : EventHandler
  private canvas        : CanvasManager
  private infoBar       : InfoBar
  private brushCursor   : BrushCursor

  private guis          : GUI[] = []

  // this is to reduce the width of the content area in the GUI pane,
  // when those GUIs are collapsed.
  
  private guiPaneContentWidthSubtract = 0
  private infoBar       : InfoBar

  private command       : Command
  private commands      : Command[]
  private pickerCommand : Command|null


  
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
     onEnd : null
  }

  constructor(
      container:HTMLElement|string,
      options?:SkyBrushOptions 
  ) {
    if ( ! container ) {
      if ( arguments.length === 0 ) {
        throw new Error( 'no dom value provided' );
      } else {
        throw new Error( 'invalid dom value given' );
      }
    }

    if ( 
        ( (typeof container) == 'string' ) ||
        ( container instanceof String )
    ) {
      const foundContainer = document.querySelector( container ) as HTMLElement|null

      if ( foundContainer === null ) {
        throw new Error( 'HTML element not found: \'' + container + '\'' );
      }

      container = foundContainer
    } else {
      if ( ! container.jquery ) {
        container = $( container )
      }

      if ( container.size() === 0 ) {
        throw new Error( 'no dom object given for skybrush to wrap' );
      }
    }

    /*
     * Turn options into an empty object if not provided,
     * this makes the options checking much simpler.
     */
    if ( ! options ) {
      options = {}
    }

    container.innerHTML = ''
    container.classList.add( 'skybrush' )

    if ( $.browser.msie ) {
      container.classList.add( 'msie' );
    } else if ( $.browser.webkit ) {
      container.classList.add( 'webkit' );
    } else if ( $.browser.mozilla ) {
      container.classList.add( 'mozilla' );
    } else if ( $.browser.opera ) {
      container.classList.add( 'opera' );
    }

    if ( $.browser.iOS ) {
      container.classList.add( 'sb_ios' );
    }

    if ( DISABLE_CONTEXT_MENU ) {
      container.addEventListener( 'contextmenu', (ev) => {
        ev.preventDefault()
        
        return false
      })
    }

    // create the basic SkyBrush layout
    this.dom = htmlToElement(
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
    );

    container.append( this.dom )

    //
    // gui pane stuff
    //

    this.guiPane  = this.dom.querySelector( '.skybrush_gui_pane' )
    this.guiDom   = this.guiPane.querySelector( '.skybrush_gui_pane_content' )

    this.viewport = this.dom.querySelector( '.skybrush_viewport_content' ).
        dblclick((ev) => {
          ev.stopPropagation();
          ev.preventDefault();
        } ).
        on( 'DOMMouseScroll mousewheel wheel', (ev) => {
          if ( ev.shiftKey ) {
            ev.stopPropagation();
            ev.preventDefault();

            const scrollDir = ev.originalEvent.wheelDelta;

            if ( scrollDir < 0 ) {
              this.zoomOut();
            } else if ( scrollDir > 0 ) {
              this.zoomIn();
            }
          }
        });

    this.events = new events.Handler( this )
    this.canvas = new CanvasManager( this.viewport, this )

    // initialized laterz
    this.command = null

    const allCommands = newCommands()

    /*
     * Pull out the colour picker command,
     * as we treat is seperately.
     */
    let pickerCommand = null;
    for ( let i = 0; i < allCommands.length; i++ ) {
      const command = allCommands[i];

      if ( command.getName().toLowerCase() === 'picker' ) {
        allCommands.splice( i, 1 );
        pickerCommand = command;

        break;
      }
    }

    /**
     * An array of all commands objects used by SkyBrush.
     *
     * @const
     */
    this.commands = allCommands;
    this.pickerCommand = pickerCommand;

    const zoomLabel = dom.querySelector( '.skybrush_viewport_zoom' )

    initializeMainButtons( this, dom.querySelector('.skybrush_gui_pane'), pickerCommand )
    initializeColors( this )
    initializeCommands( this, allCommands, pickerCommand )
    initializeSettings( this )
    initializeShortcuts( this, (options.grab_ctrl_r === false) )

    this.infoBar = new InfoBar( dom );

    this.brushCursor = new BrushCursor( this.viewport, IS_TOUCH );

    this.onSetCommand( this.refreshCursor );

    // update the cursor on zoom
    this.onZoom( function(zoom) {
      this.brushCursor.setZoom( zoom )
      this.refreshCursor()

      zoom *= 100

      /*
       * check for a decimal place, and if it's there,
       * remove the excess decimal places.
       */
      if ( (zoom|0) !== zoom ) {
        zoom = zoom.toFixed(1)
      }

      zoomLabel.textContent = zoom + '%'
      zoomLabel.classList.add( 'sb_show' )
      setTimeout(() => {
        zoomLabel.classList.remove( 'sb_show' )
      }, 120 )
    } )

    /* ## GUI related events ## */

    /* Handle GUI dragging. */
    $(document).
        bind('vmousedown', (ev) => { return this.runMouseDown(ev); }).
        bind('vmousemove', (ev) => { return this.runMouseMove(ev); }).
        bind('vmouseup'  , (ev) => { return this.runMouseUp(ev)  ; });

    const startingWidth  = options.width  || DEFAULT_WIDTH
    const startingHeight = options.height || DEFAULT_HEIGHT

    const defaultCommand = this.getCommand( DEFAULT_COMMAND ) || this.commands[1]

    // Finally, set defaults
    this.setSize( startingWidth, startingHeight ).
        refreshGUIPaneContentArea().
        setZoom( DEFAULT_ZOOM, undefined, undefined, true ).
        setColor( DEFAULT_COLOR ).
        setAlpha( DEFAULT_ALPHA ).
        setCommand( defaultCommand )

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
        options.callback( this )
      })
    }
  }

  /**
   * Adds an event to the resize handling.
   */
  onResize( fun ) {
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
  onCtrl( key, fun ) {
    if ( !(fun instanceof Function) || (typeof fun !== 'function') ) {
      throw new Error("Function expected for 'onCtrl'")
    }

    const keyTest = newKeyEventTest( key )

    return this.onKeyInteraction( null, (ev) => {
      if ( (ev.ctrlKey || ev.metaKey) && keyTest(ev) ) {
        fun.call( this, ev )

        return false
      }
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
  setKeysEnabled( enabled:boolean ):SkyBrush {
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
   *     skybrush.onKey2( 'a', function(ev) { ... } )
   *
   * Where you just state the key to bind to, and pass in a
   * function to run when it is hit.
   *
   * @see onKey3
   * @return This SkyBrush instance (for method chaining).
   */
  onKey2(
      key:stirng,
      callback:( ev:KeyboarEvent ) => void 
  ):SkyBrush {
    onKey3( null, key, callback )
  }

  /**
   * Alternatively to onKey2:
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
  onKey3(
      event: null | 'keyup' | 'keydown'
      key:stirng,
      callback:( ev:KeyboarEvent ) => void 
  ):SkyBrush {
    const keyTest = newKeyEventTest( key )

    return this.onKeyInteraction( event, (ev) => {
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
   *      } );
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
      key:string,
      callback:( ev:KeyboardEvent ) => void
  ):SkyBrush {
    return this.
        onKey3( 'keydown', key, function(ev) {
          callback.call( this, true, ev );
        } ).
        onKey3( 'keyup', key, function(ev) {
          callback.call( this, false, ev );
        } );
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
  onKeyInteraction( 
      event: null | 'keydown' | 'keyup',
      fun:( ev:KeyboardEvent ) => void
  ) {
    if ( ! event ) {
      event = 'keydown';
    }

    $(document)[event]((ev) => {
      if (
          ! this.isBusy()                    &&
            this.keysEnabled                 &&
            this.dom.is( ':visible' )        &&
          ! $(ev.target).is( 'input' )       &&
            fun.call( this, ev ) === false
      ) {
        ev.preventDefault();
        ev.stopPropagation();

        return false;
      } else {
        return undefined;
      }
    } );

    return this;
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
  onDraw( fun ) {
    this.canvas.onEndDraw( fun )

    return this;
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
  runMouseMove( ev:MouseEvent ) {
    this.brushCursor.onMove( ev );

    return ! (
        this.processOnDraw( ev ) ||
        processDrag( this, this.dragging.onMove, ev )
    );
  }

  runMouseUp( ev:MouseEvent ) {
    if ( this.isDragging() ) {
      processDrag( this, this.dragging.onEnd, ev )

      this.dragging.onMove =
      this.dragging.onEnd  =
          null

      this.isDraggingFlag = false

      return false

    } else if ( this.isPainting ) {
      this.endDraw( ev )

      this.isPainting = false

      if ( IS_TOUCH ) {
        this.brushCursor.hideTouch()
      }

      return false
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
        ( IS_TOUCH || ev.which === LEFT ) &&
        ! $target.is('input, a, .sb_no_target') &&
        ! ev.isInScrollBar(this.viewport)
    ) {
      if ( this.isDragging() ) {
        processDrag( this, this.dragging.onStart, ev );
      // hide the GUI pane, if it's been quickly opened
      } else {
        if ( this.isGUIsOverlapping() ) {
          this.closeGUIPane();
        }

        this.isPainting = true;
        return this.runStartDraw( ev );
      }
    }
  }

  runStartDraw( ev:MouseEvent ) {
    ev.preventDefault()

    if ( IS_TOUCH ) {
      this.brushCursor.showTouch()
      this.brushCursor.onMove( ev )
    }

    this.viewport.focus()

    processCommand( this, 'onDown', ev )

    return false
  }

  processOnDraw( ev:MouseEvent ) {
    if ( this.isPainting ) {
      ev.preventDefault()

      processCommand( this, 'onMove', ev )

      return true
    }
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
  endDraw( ev ) {
    processCommand( this, 'onUp', ev )

    this.canvas.endDraw( this.command.popDrawArea() )

    this.events.run( 'onDraw' )

    return true;
  }

  startDrag( onMove, onEnd ) {
    if ( ! this.isPainting && !this.isDragging() ) {
      this.dragging.onMove  = onMove
      this.dragging.onEnd   = onEnd

      this.isDraggingFlag   = true

      return true;
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
   * @private
   * @param gui The GUI component to display.
   */
  addGUI( gui:GUI ):SkyBrush {
    const startI = 0
    const last:GUI|null = null

    // -- the first ever gui added to this
    if ( this.guis.length === 0 ) {
      startI = 1

      last = arguments[0]

      last.setPainter( this )
      this.guiDom.appendChild( last.dom )
      this.guis.push( last )

    // -- a gui was already added before this call
    } else {
      startI = 0

      last = this.guis[ this.guis.length - 1 ]
    }

    for ( let i = startI; i < arguments.length; i++ ) {
      const gui = arguments[i]

      gui.setPainter( this )
      last.setSiblingGUI( gui )

      this.guis.push( gui )
    }

    return this
  }

  /**
   * As code retrieving GUI's should never be after one
   * that does not exist, this will return null to force you
   * to get the right GUI.
   *
   * This is to avoid you accidentally working on an empty
   * jQuery object, and wondering why it's not working.
   *
   * @private
   * @return The GUI overlay with the name given, or null if not found.
   */
  getGUI( klass:string ):HTMLElement|null {
    return this.guiDom.querySelector( '.skybrush_gui.' + klass )
  }

  /**
   * Resizes the canvas inside of this SkyBrush object,
   * to the size stated.
   *
   * The existing content will be copied across.
   *
   * @param {number} width The new width.
   * @param {number} height The new height.
   * @param {boolean} clear Optional, pass in true to clear the canvas during the resize.
   */
  setSize( newWidth:number, newHeight:number, clear:boolean ) {
    this.canvas.setSize( newWidth, newHeight, clear );

    return this;
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
  resize( newWidth:number, newHeight:number ):SkyBrush {
    this.canvas.resize( newWidth, newHeight )

    return this
  }

  /**
   * @param {number} newWidth The new Width of the canvas.
   * @param {number} newHeight The new Height of the canvas.
   */
  scale( newWidth:number, newHeight:number, isSmooth:boolean ):SkyBrush {
    this.canvas.scale( newWidth, newHeight, isSmooth )

    return this
  }

  /**
   * This re-applies the current zoom level.
   *
   * It's used for times when the width/height, and other metrics
   * that might mess up the zoom, have been altered.
   *
   * It's the same as: this.setZoom( this.getZoom() );
   */
  updateZoom():SkyBrush {
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
   * @param The percentage, from 0.0 to 1.0, for this to be zoomed.
   * @param zoomX the location, in canvas pixels, of where to zoom. Optional, pass in undefined for no value.
   * @param zoomY the location, in canvas pixels, of where to zoom. Optional, pass in undefined for no value.
   */
  setZoomPercent( p:number, zoomX:number, zoomY:number ) {
    return this.setZoom( percentToZoom(p), zoomX, zoomY )
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
   * Finally the 'force' is because zoom will not fire if no
   * zoom change has occurred. For 99% of usage, this is ok,
   * but there is a 1% corner case where you might want to
   * use this.
   *
   * Namely when setting the default zoom, so all events get
   * fired on startup.
   *
   * x and y may also be 'true', which denotes that you wish
   * to zoom in relation to the center of the canvas.
   *
   * @param zoom The zoom factor.
   * @param x optional, the centre of the zoom in canvas pixels.
   * @param y optional, the centre of the zoom in canvas pixels.
   * @param force optional, true to force a zoom update (shouldn't ever need to do this).
   */
  setZoom( zoom, x, y, force ) {
    zoom = Math.limit( zoom, 1/MAX_ZOOM, MAX_ZOOM );

    if ( zoom > 1 ) {
      zoom = Math.round( zoom );
    }

    const oldZoom = this.getZoom();

    if ( zoom !== oldZoom || force ) {
      this.canvas.setZoom( zoom, x, y );
      this.events.run( 'onZoom', zoom, x, y );
    }

    return this;
  }

  /**
   * Zooms into the location given, or if not provided, the
   * centre of the viewport.
   *
   * @param {number} x The x co-ordinate to zoom into.
   * @param {number} y The y co-ordinate to zoom into.
   */
  zoomIn( x, y ) {
    const zoom = percentToZoom( this.getZoomPercent() + 1/MAX_ZOOM )

    return this.setZoom( zoom, x, y )
  }

  /**
   * Zooms out at the location given (location is optional).
   *
   * @param {number} x The x co-ordinate to zoom out of.
   * @param {number} y The y co-ordinate to zoom out of.
   */
  zoomOut( x, y ) {
    const zoom = percentToZoom( this.getZoomPercent() - 1/MAX_ZOOM )

    return this.setZoom( zoom, x, y )
  }

  /**
   * Event for when the 'shift' key is pressed, up or down.
   */
  onShift( fun ) {
    this.events.add( 'onShift', fun );

    return this;
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
  removeOnShift( fun ) {
    this.events.remove( 'onShift', fun );

    return this;
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
   *    skybrush.runOnShift( true ).runOnShift( true );
   *
   * ... shift events are called the first time, and ignored
   * on the second (as shift hasn't changed).
   *
   * Of course if you do:
   *
   *    skybrush.runOnShift( true ).runOnShift( false );
   *
   * ... then events are run twice.
   *
   * In practice state changes should only be made internally,
   * within SkyBrush.
   *
   * @param True if shift is now down, false if not, or skip this to run all events.
   * @return This SkyBrush instance.
   */
  runOnShift( shiftDown:booean ):SkyBrush {
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

  runOnAlt( altDown:booean ):SkyBrush {
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
  isShiftDown() {
    return this.isShiftDownFlag;
  }

  /**
   * Callbacks to be run when alt is pressed or released.
   */
  onAlt(callback) {
    this.events.add( 'onAlt', callback );

    return this;
  }

  /**
   * @return True if alt is current pressed, false if not.
   */
  isAltDown() {
    return this.isAltDownFlag;
  }

  /**
   * Add an event to be run when this zooms in.
   *
   * @param fun The event to run.
   */
  onZoom( fun ) {
    this.events.add( 'onZoom', fun );

    return this;
  }

  /**
   * @param alpha The alpha value used when drawing to the canvas.
   */
  setAlpha( alpha ) {
    alpha = Math.limit( alpha, 0, 1 );

    // account for the dead zone
    if ( alpha > 1-ALPHA_DEAD_ZONE ) {
      alpha = 1;
    }

    this.canvas.setAlpha( alpha );
    this.events.run( 'onsetalpha', this.canvas.getAlpha() );

    return this;
  }

  /**
   * Adds an event to be run when the alpha value is changed on SkyBrush.
   *
   * @param fun The function to call.
   */
  onSetAlpha( fun ) {
    this.events.add( 'onsetalpha', fun );
    return this;
  }

  /**
   * Adds a callback event which is run after the colour is set to SkyBrush.
   *
   * @param fun The function to call.
   */
  onSetColor( fun ) {
    this.events.add( 'onsetcolor', fun );
    return this;
  }

  getAlpha() {
    return this.canvas.getAlpha();
  }

  getColor() {
    return this.canvas.getColor();
  }

  /**
   * @param strColor The colour to use when drawing.
   */
  setColor( strColor ) {
    this.canvas.setColor( strColor );

    this.events.run( 'onsetcolor', strColor );

    return this;
  }

  onSetCommand( fun ) {
    this.events.add( 'onsetcommand', fun );

    return this;
  }

  switchCommand( name:string ) {
    name = name.toLowerCase();

    for ( let i = 0; i < this.commands.length; i++ ) {
      if ( this.commands[i].getName().toLowerCase() == name ) {
        return this.setCommand( this.commands[i] );
      }
    }

    return this;
  }

  /**
   * Note that events are only fired if the command given
   * is different to the current command.
   *
   * @param command The Command object to switch to.
   * @return this SkyBrush object.
   */
  setCommand( command ) {
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

      this.events.run( 'onsetcommand', command, lastCommand )
    }

    return this
  }

  /**
   * This works in two ways. Calling it with no name returns
   * the currently set command, i.e.
   *
   *    skybrush.getCommand();
   *
   * Alternatively you can pass in a name, and it will
   * return the stored command with that name, regardless of
   * if it's set or not.
   *
   *    skybrush.getCommand( 'pencil' );
   *
   * @param name Optional, finds the command listed in SkyBrush.
   * @return The currently set command, or null if you call it before any command is set.
   */
  getCommand( name:string ) {
    if ( name ) {
      name = name.toLowerCase()

      if ( this.pickerCommand.getName().toLowerCase() === name ) {
        return this.pickerCommand

      } else {
        for ( let i = 0; i < this.commands.length; i++ ) {
            const command = this.commands[i];

            if ( command.getName().toLowerCase() === name ) {
                return command;
            }
        }

        return null;
      }
    } else {
      return this.command;
    }
  }

  /**
   * The parameter given, is optional. If given, then the cursor is only
   * refreshed, if the currently set command, is the same as the one given.
   *
   * This is so you can just do ...
   *
   *    painter.refreshCommand( this );
   *
   * ... and not care if you are or aren't the current command.
   *
   * @param Only refresh, if this is the currently set command.
   */
  refreshCursor( command ) {
    /*
     * Incase this is called right at the beginning,
     * during the setup phase, before any commands have
     * been set.
     */
    if ( this.command && (arguments.length === 0 || this.command === command) ) {
      this.brushCursor.setCommandCursor( this, this.command );
    }
  }

  /**
   * @param ev The event to check.
   * @return True if the given event is located inside of the SkyBrush viewport, otherwise false.
   */
  isInView( ev ) {
    return ev.isWithin( this.viewport );
  }

  /**
   * @return A data url for the current contents in SkyBrush.
   */
  getImageData( type ) {
    return this.canvas.toDataURL( type );
  }

  /**
   * Note that due to restrictions in browsers,
   * the contents of the image will not appear straight away.
   * It will be available during a future JS event
   * (add an 'onload' event to the image to know when it's ready).
   *
   * @return A HTML Image holding the items drawn on the canvas.
   */
  getImage() {
    const img = new Image()

    img.width  = this.canvas.width
    img.height = this.canvas.height
    img.src    = this.getImageData()

    return img
  }

  /**
   * Sets an image, or canvas, as the contents of this SkyBrush.
   * The SkyBrush is   d to accomodate the image.
   *
   * AFAIK, there is only one way to get an image's _true_ width/height,
   * and that is through making a new one and setting it's src to that of the first.
   * I don't want to do that by default, due to the added cost,
   * but you can do that if you wish to.
   *
   * To give the user more options, you can pass in the width/height of the image.
   * This is used when SkyBrush makes it's own copy for editing.
   * Otherwise if those are undefined, it'll use the width/height of image.
   *
   * @param image The image to display on this canvas.
   * @param width (optional) the width of the image.
   * @param height (optional) the height of the image.
   */
  setImage( image, width, height ) {
    this.canvas.setImage( image, width, height );
    this.reset();
  }

  /**
   * Cleares SkyBrush, and sets it up ready for an entirely new image.
   * This will be reset in order to achieve this.
   *
   * The width and height are optional, if not provided then
   * the standard default width/height will be used.
   *
   * @param width  Optional, the width of the new image.
   * @param height Optional, the height of the new image.
   */
  newImage( width?:number, height:?number ) {
    if ( ! width ) {
      width = DEFAULT_WIDTH;
    }

    if ( ! height ) {
      height = DEFAULT_HEIGHT;
    }

    this.setSize( width, height, true ).
        reset();

    return this;
  }

  cut() {
    this.canvas.cut();
    return this;
  }

  copy() {
    this.canvas.copy();
    return this;
  }

  paste() {
    this.canvas.paste();
    this.switchCommand( 'move' );

    return this;
  }

  /* Undo / Redo functionality */

  hasUndo() {
    return this.canvas.hasUndo();
  }

  hasRedo() {
    return this.canvas.hasRedo();
  }

  onUndo( fun ) {
    this.events.add( 'onundo', fun );

    return this;
  }

  onRedo( fun ) {
    this.events.add( 'onredo', fun );

    return this;
  }

  /**
   * Runs the 'undo' command.
   *
   * @return This SkyBrush instance.
   */
  undo() {
    if ( this.canvas.undo() ) {
      this.events.run( 'onundo' );
    }

    return this;
  }

  /**
   * Runs the 'redo' command.
   *
   * @return This SkyBrush instance.
   */
  redo() {
    if ( this.canvas.redo() ) {
      this.events.run( 'onredo' );
    }

    return this;
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
  showGUIPane():SkyBrush {
    this.guiPane.classList.add( 'sb_open' )

    return this
  }

  /**
   * Sets the GUI pane to be open.
   *
   * @return This SkyBrush instance.
   */
  openGUIPane() {
    this.guiPane.classList.add( 'sb_open' );
    this.viewport.parentElement.classList.add( 'sb_open' );

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
  closeGUIPane() {
    this.guiPane.classList.remove( 'sb_open' )
    this.viewport.parentElement.classList.remove( 'sb_open' )

    this.canvas.lazyUpdateCanvasSize()

    return this
  }

  subtractGUIPaneContentWidth( w ) {
    this.guiPaneContentWidthSubtract -= w|0

    return this.refreshGUIPaneContentArea()
  }

  refreshGUIPaneContentArea() {
    // at the time of writing, the first child is expected to always be a .skybrush_gui
    const contentWidth = $( this.guiDom.firstChild ).width() - this.guiPaneContentWidthSubtract;

    if ( contentWidth < 0 ) {
      this.guiDom.style.width = '0';

    } else {
      this.guiDom.style.width = contentWidth + 'px';
      
    }

    return this
  }

  /**
   * @return True if the GUI section at the bottom is open, but not locked open.
   *       Otherwise false.
   */
  isGUIsOverlapping() {
    return this.guiPane.classList.contains( 'sb_open' ) &&
       ! this.viewport.parentElement.classList.contains( 'sb_open' )
  }

  /**
   * @return True if the GUI section at the bottom is open, and false if closed.
   */
  isGUIsShown() {
    return this.guiPane.classList.contains( 'sb_open' )
  }

  /**
   * Toggles the GUI pane at the bottom of the screen between being open and
   * closed.
   *
   * @return This SkyBrush instance.
   */
  toggleGUIPane() {
    if ( this.isGUIsShown() ) {
      this.closeGUIPane()

    } else {
      this.openGUIPane()

    }

    return this
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
  reset() {
    this.canvas.reset()
    this.setZoom( DEFAULT_ZOOM )

    return this
  }
}

