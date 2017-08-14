
import { Consumer } from 'util/function-interfaces'
import { Location } from 'util/area'
import * as htmlUtils from 'util/html'

/**
 * Mouse constants, so the code is more readable.
 */
export const LEFT   = 1
export const RIGHT  = 2
export const MIDDLE = 3

export interface InputEventNode {
  addEventListener( ev: MouseEventName, c: Consumer<MouseEvent> ): void
  addEventListener( ev: TouchEventName, c: Consumer<TouchEvent> ): void
}

export type DragEvent =
  | MouseEvent
  | Touch

type MouseEventName =
  | 'click'
  | 'mousedown'
  | 'mouseup'

type TouchEventName =
  | 'touchdown'
  | 'touchmove'
  | 'touchup'

type MouseButton =
  | 1 // LEFT
  | 2 // RIGHT
  | 3 // MIDDLE

export function leftClick(
    dom     : InputEventNode,
    onClick : Consumer<MouseEvent>,
): void {
  onMouseEvent( dom, 'click', LEFT, onClick )
}

export function leftUp(
    dom  : Node,
    onUp : Consumer<MouseEvent> ): void {
  onMouseEvent( dom, 'mouseup', LEFT, onUp )
}

export function leftDown(
    dom    : Node,
    onDown : Consumer<MouseEvent>,
): void {
  onMouseEvent( dom, 'mousedown', LEFT, onDown )
}

export function leftDrag(
    dom    : InputEventNode,
    onDrag : Consumer<MouseEvent>,
): void {
  throw new Error( 'todo, build this' )
}

export function onDrag(
    dom : InputEventNode,
    onDown : Consumer<DragEvent>,
    onMove : Consumer<DragEvent>,
    onUp   : Consumer<DragEvent>,
): void {
  throw new Error( 'todo, build this' )
}

function onMouseEvent(
    dom         : InputEventNode,
    eventName   : MouseEventName,
    whichButton : MouseButton,
    f : Consumer<MouseEvent>,
) {
  dom.addEventListener( eventName, ( ev : MouseEvent ) => {
    if ( ev.which !== whichButton ) {
      return
    }

    ev.preventDefault()

    f( ev )
  })
}

export function forceNumeric(
    input : HTMLInputElement,
    allowDecimal : boolean,
) {
  input.addEventListener( 'keydown', ev => {
    const key = ev.which || ev.keyCode

    if (
        ev.altKey || ev.ctrlKey || ev.metaKey || (
            // numbers
            key >= 48 && key <= 57 ||
            // Numeric keypad
            key >= 96 && key <= 105 ||
            // decimal point, period and minus, decimal point on keypad
            ((key === 190) && allowDecimal) || key === 188 || key === 109 || ((key === 110) && allowDecimal) ||
            // Backspace and Tab and Enter
            key === 8 || key === 9 || key === 13 ||
            // Home and End
            key === 35 || key === 36 ||
            // left and right arrows
            key === 37 || key === 39 ||
            // Del and Ins
            key === 46 || key === 45
        )
    ) {
      return true
    }

    ev.preventDefault()
    return false
  })
}

export function getOffset(
    ev  : DragEvent,
    dom : HTMLElement,
): Location {
  const offset = htmlUtils.getOffset( dom )

  return {
    left : ev.pageX - offset.left,
    top  : ev.pageY - offset.top,
  }
}
