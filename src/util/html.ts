
import * as mathsUtils from 'util/maths'

const HTML_TO_ELEMENT_DOM = document.createElement('div')

export interface ScrollBarSize {
  right  : number
  bottom : number
}

let cachedScrollbarWidth = -1

/**
 * @return A new HTML5 Canvas.
 */
export function newCanvas( width : number, height : number ):HTMLCanvasElement {
  const canvas = document.createElement( 'canvas' )

  canvas.width  = width
  canvas.height = height

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
export function scrollBarSize( dom:Element ):ScrollBarSize {
  const scrollSize = scrollBarWidth()
  const style      = getComputedStyle( dom )

  const overflowX  = ( style.overflowX === 'scroll' )
  const overflowY  = ( style.overflowY === 'scroll' )

  return {
    right  : ( overflowX ? scrollSize : 0 ),
    bottom : ( overflowY ? scrollSize : 0 ),
  }
}

/**
 * @return The size of scroll bars in the current browser.
 */
function scrollBarWidth() {
  if ( cachedScrollbarWidth === -1 ) {
    const div = document.createElement( 'div' )
    div.style.width    = '100px'
    div.style.height   = '100px'
    div.style.overflow = 'auto'
    div.style.position = 'absolute'
    div.style.top      = '-1000px'
    div.style.left     = '-1000px'
    div.style.padding  = '0 !important'
    div.style.border   = 'none !important'

    const divInner = document.createElement( 'div' )
    divInner.style.width    = '100%'
    divInner.style.height   = '200px'
    divInner.style.padding  = '0 !important'
    divInner.style.border   = '0 !important'

    div.appendChild( divInner )

    document.body.appendChild( div )

    cachedScrollbarWidth = ( 100 - div.clientWidth )

    document.body.removeChild( div )
  }

  return cachedScrollbarWidth
}
