
import { initialiseCtx } from 'util/canvas'

const HTML_TO_ELEMENT_DOM = document.createElement('div')

export type CanvasCtx = {
  dom : HTMLCanvasElement
  ctx : CanvasRenderingContext2D
}

/**
 * @private
 * @return A HTML5 Canvas.
 */
export function newCanvas():HTMLCanvasElement ;
export function newCanvas( width : number, height : number ):HTMLCanvasElement ;
export function newCanvas( width ?: number, height ?: number ):HTMLCanvasElement {
  const canvas = document.createElement('canvas')

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

