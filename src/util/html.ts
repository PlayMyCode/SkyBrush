
const HTML_TO_ELEMENT_DOM = document.createElement('div')

/**
 * @private
 * @return A HTML5 Canvas.
 */
export function newCanvas( width:number, height:number ) {
  const canvas = document.createElement('canvas')

  if ( width !== undefined && height !== undefined ) {
    canvas.width  = width
    canvas.height = height
  }
  canvas.ctx = canvas.getContext( '2d' )

  initializeCtx( canvas.ctx )
  canvas.ctx.save()

  return canvas
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

