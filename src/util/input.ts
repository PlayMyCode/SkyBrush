
import { Consumer } from 'util/function-interfaces'

/**
 * Mouse constants, so the code is more readable.
 */
export const LEFT   = 1
export const RIGHT  = 2
export const MIDDLE = 3

type MouseEventName =
  | 'click'
  | 'mousedown'
  | 'mouseup'

type MouseButton =
  | 1 // LEFT
  | 2 // RIGHT
  | 3 // MIDDLE

export function leftClick( dom: Node, f: Consumer<MouseEvent> ): void {
  onMouseEvent( dom, 'click', LEFT, f )
}

export function leftUp( dom: Node, f: Consumer<MouseEvent> ): void {
  onMouseEvent( dom, 'mouseup', LEFT, f )
}

export function leftDown( dom: Node, f: Consumer<MouseEvent> ): void {
  onMouseEvent( dom, 'mousedown', LEFT, f )
}

function onMouseEvent(
    dom         : Node,
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

