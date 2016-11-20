
const div = document.createElement('div')

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
  const element = document.createElement( el )
  element.className = className
  return element
}

export function htmlToElement( html:string ):HTMLElement {
  div.innerHTML = html
  const el = div.firstChild
  div.innerHTML = ''

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

