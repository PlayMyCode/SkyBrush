
const div = document.createElement('div')

export function htmlToElement( html:string ):HTMLElement {
  div.innerHTML = html
  const el = div.firstChild
  div.innerHTML = ''

  return el
}

