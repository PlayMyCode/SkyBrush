
import * as mathsUtils from 'util/maths'

const HTML_TO_ELEMENT_DOM = document.createElement('div')

/**
 * @private
 * @return A HTML5 Canvas.
 */
export function newCanvas():HTMLCanvasElement ;
export function newCanvas( width : number, height : number ):HTMLCanvasElement ;
export function newCanvas( width ?: number, height ?: number ):HTMLCanvasElement {
  const canvas = document.createElement( 'canvas' )

  if ( arguments.length === 2 ) {
    canvas.width  = width  as number
    canvas.height = height as number
  }

  return canvas
}

/**
 * Creates a HTMLAnchorElement and returns it.
 *
 * These include '#' for the href, and to prevent the default action
 * of following the link.
 *
 * You can also pass in more CSS classes after the 'text' parameter.
 *
 * @param text The text to appear on this anchor.
 * @return A HTMLAnchorElement.
 */
export function newAnchor( text:string ):HTMLAnchorElement {
  const anchor = document.createElement( 'a' )
  anchor.setAttribute( 'href', '#' )

  for ( let i = 1; i < arguments.length; i++ ) {
    anchor.classList.add( arguments[i] )
  }

  if ( text ) {
    anchor.innerHTML = text
  }

  return anchor
}

export function newDiv( className:string ):HTMLElement {
  return newEl( 'div', className )
}

export function newEl( name:string, className:string ):HTMLElement {
  const dom = document.createElement( name )
  dom.className = className
  return dom
}

export function htmlToElement( html:string ):HTMLElement {
  HTML_TO_ELEMENT_DOM.innerHTML = html
  const el = HTML_TO_ELEMENT_DOM.firstChild as HTMLElement
  HTML_TO_ELEMENT_DOM.innerHTML = ''

  return el
}

export function isParentChild( parent:HTMLElement, child:HTMLElement ):boolean {
  for ( let p = child.parentElement; p !== null; p = p.parentElement ) {
    if ( p === parent ) {
      return true
    }
  }

  return false
}

export function getInputValue(
    input : HTMLInputElement,
    max   : number,
):number {
  const num = parseInt( input.value )

  if ( isNaN(num) ) {
    return 0
  }

  return mathsUtils.limit( num, 0, max )
}

/**
 * Returns an object containing the size of the right and bottom scroll bars.
 * They will be a number, rather then true or false, as no scroll bar is represented by 0, which equates to false.
 *
 * The other reason is so you can simultanously use this for working out the size of the scroll bars in a component.
 *
 * @return An object with 'right' and 'bottom' properties, stating the width of those bars, or 0 if not present.
 */
export function scrollBarSize( dom:Element ) {
  const scrollSize = scrollBarWidth()

  if ( dom === document ) {
    return {
      right  : ( this.height() > window.height() ) ? scrollSize : 0,
      bottom : ( this.width()  > window.width()  ) ? scrollSize : 0,
    }
  } else {
    const overflowRight  = this.css('overflowX') === 'scroll'
    const overflowBottom = this.css('overflowY') === 'scroll'

    // don't check overflowScroll, as it can still be invalid
    if ( overflowRight && overflowBottom ) {
      return {
        right  : scrollSize,
        bottom : scrollSize
      }

    // Scroll Height/Width includes differnt things in FF and other browsers
    } else if ( $.browser.mozilla ) {
      return {
        right  : ( overflowRight  || dom.scrollHeight > dom.outerHeight() ) ? scrollSize : 0,
        bottom : ( overflowBottom || dom.scrollWidth  > dom.outerWidth()  ) ? scrollSize : 0,
      }

    } else {
      return {
        right  : ( overflowRight  || dom.scrollHeight > dom.innerHeight() ) ? scrollSize : 0,
        bottom : ( overflowBottom || dom.scrollWidth  > dom.innerWidth()  ) ? scrollSize : 0,
      }
    }
  }
}

let cachedScrollbarWidth = 0

/**
 * @return The size of scroll bars in the current browser.
 */
function scrollBarWidth() {
  if ( cachedScrollbarWidth === 0 ) {
    if ( $.browser.msie ) {
      const textarea1 = document.createElement( 'textarea' )
      textarea1.setAttribute( 'cols', '10' )
      textarea1.setAttribute( 'rows',  '2' )

      textarea1.style.position = 'absolute'
      textarea1.style.top      = '-1000px'
      textarea1.style.left     = '-1000px'

      const textarea2 = document.createElement( 'textarea' )
      textarea1.setAttribute( 'cols', '10' )
      textarea1.setAttribute( 'rows',  '2' )

      textarea1.style.position = 'absolute'
      textarea1.style.top      = '-1000px'
      textarea1.style.left     = '-1000px'
      textarea1.style.overflow = 'hidden'

      document.body.appendChild( textarea1 )
      document.body.appendChild( textarea2 )

      cachedScrollbarWidth = ( textarea1.width() - textarea2.width() )

      document.body.removeChild( textarea1 )
      document.body.removeChild( textarea2 )
    } else {
      const div = document.createElement( 'div' )
      div.style.width    = '100px'
      div.style.height   = '100px'
      div.style.overflow = 'auto'
      div.style.position = 'absolute'
      div.style.top      = '-1000px'
      div.style.left     = '-1000px'

      const divInner = document.createElement( 'div' )
      divInner.style.width  = '100%'
      divInner.style.height = '200px'

      div.appendChild( divInner )

      document.body.appendChild( div )

      cachedScrollbarWidth = ( 100 - div.width() )

      document.body.removeChild( div )
    }
  }

  return cachedScrollbarWidth
}
