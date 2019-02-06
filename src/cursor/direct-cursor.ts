
import * as constants from 'setup/constants'
import * as htmlUtils from 'util/html'
import { Nullable } from 'util/function-interfaces'

const MAX_NATIVE_CURSOR_SIZE = 128

/**
 * @const
 * @type {string}
 */
const NO_CURSOR_CSS = 'sb_cursor_none'

/**
 * Handles setting the cursor directly, with little management.
 *
 * The point is that this deals with creating and setting a cursor in
 * different ways, without caring about why, or what it is for.
 *
 * i.e. this deals with data urls and CSS classes, whilst BrushCursor deals
 * with crosshairs, squares and circles.
 *
 * The real point of this is to bind all of the setting by url, setting by
 * class, and hiding the cursor, into one place, to simplify the
 * BrushCursor.
 */
export class DirectCursor {
  private readonly dom : HTMLElement
  private readonly viewport : HTMLElement

  private fakeShown : boolean
  private inScrollbar : boolean
  private isHidden : boolean

  private lastX : number
  private lastY : number

  private lastTop  : number
  private lastLeft : number

  private displaySize : number

  private cursorDataURL : Nullable<string>
  private cursorClass : Nullable<string>

  constructor(
      viewport:HTMLElement,
  ) {
    const dom = document.createElement( 'div' )
    dom.className = 'skybrush_brush'

    viewport.appendChild( dom )

    this.dom            = dom

    this.viewport       = viewport
    this.cursorDataURL  = null
    this.cursorClass    = null

    this.inScrollbar    = false
    this.isHidden       = false

    // Sensible defaults, so they are never 'undefined'.
    this.lastX          = 0
    this.lastY          = 0

    this.lastLeft       = 0
    this.lastTop        = 0

    this.fakeShown      = false

    /**
     * This is the size of the fake cursor.
     *
     * @type {number}
     */
    this.displaySize = 0

    this.cssSetup = {
      height: -1,
      width : -1,
      'background-position': '',
    }

    // ensure it's all setup right!
    this.setClass( constants.DEFAULT_CURSOR )
  }

  /**
   * Cleares the items set on the cursor, so it's back to it's default state.
   */
  clearCursor() {
    this.clearCursorInner()

    this.dom.className = 'skybrush_brush'

    this.fakeShown     = false
    this.cursorDataURL = null
    this.cursorClass   = null

    return this
  }

  clearCursorInner() {
    if ( this.cursorDataURL !== null ) {
      this.dom.className = 'skybrush_brush'
      this.viewport.style.cursor = ''
    }

    this.viewport.classList.remove( NO_CURSOR_CSS )

    if ( this.cursorClass !== null ) {
      if ( this.cursorClass !== NO_CURSOR_CSS ) {
        this.viewport.classList.remove( this.cursorClass )
      }
    }

    return this
  }

  /**
   * Sets the cursor to display the data url given. Only the url needs to be
   * given, i.e.
   *
   *  cursor.setCursorURL( '/cursors/crosshair.cur', size )
   *
   * This can also take a data url, but it only works if the browser actually
   * supports them.
   *
   * @param The data URI for the cursor.
   * @param size, the size of the cursor when displayed.
   */
  setCursorURL(
      url  : string,
      size : number,
  ):this {
    url = this.calculateUrl( url, size )

    if ( ! this.inScrollbar ) {
      this.setCursorURLInner( url, size )
    }

    this.cursorClass = null
    this.cursorDataURL = url
    this.displaySize = size
    this.fakeShown = ! useNativeCursor( size )

    return this
  }

  setCursorURLInner(
      url  : string,
      size : number,
  ):void {
    this.clearCursorInner()

    if ( useNativeCursor(size) ) {
      if ( ! this.isHidden ) {
        this.viewport.style.cursor = url
      }
    } else {
      this.viewport.classList.add( NO_CURSOR_CSS )
      this.dom.style.backgroundImage = url

      if ( ! this.isHidden ) {
        this.dom.className = 'skybrush_brush sb_show'
      }
    }
  }

  /**
   * @return True if the fake cursor, is currently visible, and false if not.
   */
  isFakeShown():boolean {
    return this.fakeShown
  }

  calculateUrl( url:string, size:number ):string {
    if ( useNativeCursor(size) ) {
      /*
       * The location is off by one,
       * when applied as a cursor url.
       *
       * So I subtract 1, to correct.
       */
      const loc = size/2 - 1

      return `url(${url}) ${loc} ${loc}, auto`
    } else {
      return `url(${url}`
    }
  }

  /**
   * Adds the CSS class to the viewport, that the cursor is within.
   */
  setClass( klass:string ):this {
    if ( ! this.inScrollbar ) {
      this.clearCursor()

      if ( ! this.isHidden ) {
        this.viewport.classList.add( klass )
      }
    }

    this.cursorClass   = klass
    this.cursorDataURL = null
    this.fakeShown     = false

    return this
  }

  /**
   * Sets the cursor to a blank one.
   */
  setBlankCursor():this {
    this.setClass( NO_CURSOR_CSS )

    return this
  }

  /**
   * Call this, when the cursor has entered a Scrollbar.
   *
   * Don't worry about what it does, just do it.
   */
  enterScrollbar():this {
    if ( ! this.inScrollbar ) {
      this.clearCursorInner()
      this.inScrollbar = true
    }

    return this
  }

  /**
   * Call this, when the cursor has left a Scrollbar.
   *
   * Don't worry about what it does, just do it.
   */
  leaveScrollbar():this {
    if ( this.inScrollbar ) {
      this.inScrollbar = false

      if ( this.cursorClass ) {
        this.setClass( this.cursorClass )
      } else if ( this.cursorDataURL ) {
        this.setCursorURLInner( this.cursorDataURL, this.displaySize )
      }
    }

    return this
  }

  update( ev:MouseEvent ):this {
    this.updateMove( ev.pageX, ev.pageY )
    this.updateScrollbarCursor( ev )

    return this
  }

  /**
   * In Chrome (and other browsers?) the cursor also applies to the scrollbar.
   * So when we move over the scroll bar, we turn off the custom cursor,
   * and set it to the standard one.
   *
   * It then gets turned back, if we have moved out, and have an old
   * cursor to set.
   *
   * @param ev The event for the mouse movement.
   * @return true if we are overlapping the scrollbar, false if not.
   */
  updateScrollbarCursor( ev:MouseEvent ):this {
    const x = ev.pageX
    const y = ev.pageY
    const scrollBars = htmlUtils.scrollBarSize( this.viewport )

    // work out if we are on top of a scroll bar
    if ( scrollBars.bottom > 0 || scrollBars.right > 0 ) {
      const pos = this.viewport.offset()

      if (
          scrollBars.right > 0 &&
          pos.left + (this.viewport.width() - scrollBars.right) < ev.pageX
      ) {
        this.enterScrollbar()
      } else if (
          scrollBars.bottom > 0 &&
          pos.top  + (this.viewport.height() - scrollBars.bottom) < ev.pageY
      ) {
        this.enterScrollbar()
      } else {
        this.leaveScrollbar()
      }
    } else {
      this.leaveScrollbar()
    }

    return this
  }

  /**
   * pageX and pageY are optional. If omitted, this will
   * presume it is at the same location as the last time
   * this was called.
   */
  updateMove( pageX:number, pageY:number ):this {
    if ( this.isFakeShown() ) {
      const viewport = this.viewport

      if ( pageX === undefined || pageY === undefined ) {
        pageX = this.lastX
        pageY = this.lastY
      }

      const displaySize  = this.displaySize
      const displaySize2 = displaySize/2
      const pos          = viewport.offset()
      const scrollBars   = htmlUtils.scrollBarSize( this.viewport )

      const scrollX = viewport.scrollLeft()
      const scrollY = viewport.scrollTop()

      const viewportHeight = viewport.height() - scrollBars.bottom
      const viewportWidth  = viewport.width()  - scrollBars.right

        /*
         * If the cursor is near the top or bottom edge,
         * then the cursor is obscured using 'background-position'.
         *
         * When this is true, it'll do it on the bottom,
         * and when false, it does this for the top edge.
         *
         * hideFromRight does the same, but on the x axis.
         */
      let hideFromBottom = false
      let hideFromRight  = false

      /*
       * We have the location, in the middle, of the cursor on the screen.
       * This is the 'fixed' position, where no scrolling taken into account.
       *
       * We then convert this into the top/left position,
       * and then add on the scrolling.
       */

      const middleX = (pageX - pos.left)
      const middleY = (pageY - pos.top )

      let left   = 0
      let top    = 0
      let width  = 0
      let height = 0

      /*
       * Now translate from middle to top/left, for:
       *  - if over the top edge
       *  - if over the bottom edge
       *  - if between those edges
       */

      if ( middleY-displaySize2 < 0 ) {
        top    = 0
        height = displaySize + (middleY-displaySize2)
      } else if ( middleY+displaySize2 > viewportHeight ) {
        top    = middleY-displaySize2
        height = viewportHeight - (middleY-displaySize2)

        hideFromBottom = true
      } else {
        top    = middleY - (displaySize2-1)
        height = displaySize
      }

      if ( middleX-displaySize2 < 0 ) {
        left  = 0
        width = displaySize + (middleX-displaySize2)
      } else if ( middleX+displaySize2 > viewportWidth ) {
        left  = middleX-displaySize2
        width = viewportWidth - (middleX-displaySize2)

        hideFromRight = true
      } else {
        left  = middleX - (displaySize2-1)
        width = displaySize
      }

      top  += scrollY
      left += scrollX

      if ( left !== this.lastLeft || top !== this.lastTop ) {
        this.lastLeft = left
        this.lastTop  = top

        this.dom.style.transform = `translate( ${left}px, ${top}px )`

        this.lastX = pageX
        this.lastY = pageY
      }

      /*
       * Now alter the width/height,
       * and the background position.
       */

      width  = Math.max( width , 0 )
      height = Math.max( height, 0 )

      const cssSetup = this.cssSetup
      if (
          height !== cssSetup.height ||
          width  !== cssSetup.width
      ) {
        const positionY = (
            ! hideFromBottom
                ? `${-(displaySize-height)}px`
                : 0
        )

        const positionX = (
            ! hideFromRight
                ? `${-(displaySize-width)}px`
                : 0
        )

        const newBackPosition = `${positionX} ${positionY}`
        if ( newBackPosition !== cssSetup['background-position'] ) {
          cssSetup['background-position'] = newBackPosition
          this.dom.style.backgroundPosition = newBackPosition
        }

        if ( width !== cssSetup.width ) {
          cssSetup.width = width
          this.dom.style.width = `${width}px`
        }

        if ( height !== cssSetup.height ) {
          cssSetup.height = height
          this.dom.style.height = `${height}px`
        }
      }
    }

    return this
  }

  /**
   * Hides this cursor so that it is no longer shown, at all. This
   * includes both the real cursor, and the fake cursor built using an
   * HTML element.
   */
  hide():this {
    if ( ! this.isHidden ) {
      this.isHidden = true

      if ( this.cursorClass !== null ) {
        this.viewport.classList.remove( this.cursorClass )
      } else if ( this.cursorDataURL ) {
        this.viewport.style.cursor = ''
      }

      this.viewport.classList.add( NO_CURSOR_CSS )
      this.dom.className = 'skybrush_brush'
    }

    return this
  }

  /**
   * If the cursor is hidden, then it will now be shown. Otherwise this
   * will do nothing.
   */
  show():this {
    if ( this.isHidden ) {
      this.isHidden = false

      if ( this.cursorClass ) {
        this.setClass( this.cursorClass )
      } else if ( this.cursorDataURL ) {
        this.setCursorURLInner( this.cursorDataURL, this.displaySize )
      }
    }

    return this
  }
}

function useNativeCursor( size:number ):boolean {
  return ( size < MAX_NATIVE_CURSOR_SIZE )
}
