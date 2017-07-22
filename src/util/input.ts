
export function forceNumeric(
    input : HTMLInputElement,
    allowDecimal : boolean,
) {
  input.addEventListener( 'keydown', ev => {
    const key = e.which || e.keyCode

    if (
        e.altKey || e.ctrlKey || e.metaKey || (
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

