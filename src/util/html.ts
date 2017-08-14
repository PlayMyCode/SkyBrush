
import * as inputUtils from 'util/input'
import * as mathsUtils from 'util/maths'
import { Consumer2 } from 'util/function-interfaces'
import { Location } from 'util/area'

const HTML_TO_ELEMENT_DOM = document.createElement('div')

export interface ScrollBarSize {
  right  : number
  bottom : number
}

let cachedScrollbarWidth = -1

export interface SliderOptions {
  min   : number
  max   : number
  step  : number
  value : number

  onChange : Consumer2<number, number>
}

/**
 * @return A new HTML5 Canvas.
 */
export function newCanvas(
    width  : number,
    height : number,
):HTMLCanvasElement {
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

/**
 * A very simple function. Makes a new div HTML element, sets the text
 * given inside of it, sets the class, and then returns the div.
 */
export function newTextDiv( className:string, textContent:string ) {
  const div = document.createElement( 'div' )

  div.textContent = textContent
  div.className = className

  return div
}

export function newNumericInput( isDecimal:boolean, className:string ) {
  const input = newInput( 'number', className )

  inputUtils.forceNumeric( input, isDecimal )

  return input
}

/**
 * A generic, reusable, horizontal slider.
 *
 * You can use the 'slide' method to attach functions to be called when this
 * slides.
 *
 * You can also add any classes to it.
 *
 * ASCII art impression of control:
 *
 *   -------[]---
 *
 * This will use the input 'range' type where available.
 *
 * @return A jQuery object (a div), which is pre-built and setup as a slider.
 */
/*
 * Ok, so how does this work? Either a HTML5 input range or a custom
 * slider gets generated.
 *
 * This then has an API directly pasted onto the object which is the
 * most *basic* API possible. Direct getters and setters, and visual
 * cues, that's it.
 *
 * They both have a more complex API built on top, which is the API
 * that does the 'slideUp', 'slideDown', setting and running of slide
 * events.
 *
 * The idea is to push the clever code up the stack, so it's shared,
 * and keep the lower code where it's different as basic as possible.
 */
export function newSlider( options:SliderOptions ) {
  const sliderBarInput = newInput( 'range', 'skybrush_slider_bar' )

  // default min/max/step values
  sliderBarInput.min   = options.min + ''
  sliderBarInput.max   = options.max + ''
  sliderBarInput.step  = options.step + ''
  sliderBarInput.value = options.value + ''

  /**
   * Allows adding slide events, run when this slides.
   */
  const onChange = options.onChange
  sliderBarInput.addEventListener( 'change', () => {
    const val = parseFloat( sliderBarInput.value )
    const min = parseFloat( sliderBarInput.min   )
    const max = parseFloat( sliderBarInput.max   )

    const p = mathsUtils.rangeToPercent( val, min, max )

    onChange( val, p )
  })

  return sliderBarInput
}

export function newInput( type:string, className:string ) {
  const input = document.createElement( 'input' )

  input.setAttribute( 'type', type )
  input.className = className

  return input
}

export function newButton(
    text    : string,
    klass   : string,
    onClick : () => void,
) {
  const dom = document.createElement( 'a' )
  dom.href = '#'

  dom.textContent = text
  dom.className   = klass

  dom.addEventListener( 'click', ev => {
    ev.stopPropagation()
    ev.preventDefault()

    onClick()
  })

  return dom
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

export function getOffset(
    dom : HTMLElement,
): Location {
  let offsetLeft = 0
  let offsetTop  = 0

  do {
    if ( ! isNaN(dom.offsetLeft) ) {
        offsetLeft += dom.offsetLeft
    }

    if ( ! isNaN(dom.offsetTop) ) {
        offsetTop += dom.offsetTop
    }
  } while( dom = dom.offsetParent as HTMLElement )

  return {
    left : offsetLeft,
    top  : offsetTop,
  }
}
