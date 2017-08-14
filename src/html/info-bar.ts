
import { isParentChild } from 'util/html'
import { Nullable } from 'util/function-interfaces'

/**
 * The Info Bar is a scroll down bar for extra settings.
 * Like resize.
 *
 * @private
 * @param viewport The SkyBrush viewport it is being attached to.
 */
export class InfoBar {
  private readonly dom     : HTMLElement
  private readonly content : HTMLElement

  constructor( viewport:HTMLElement ) {
    this.content = document.createElement( 'div' )
    this.content.classList.add('skybrush_info_content')

    /* Finally, put it all together */
    const wrap = document.createElement( 'div' )
    wrap.classList.add( 'skybrush_info_bar_wrap' )
    wrap.appendChild( this.content )

    this.dom = document.createElement( 'div' )
    this.dom.classList.add('skybrush_info_bar')
    this.dom.appendChild( wrap )

    viewport.appendChild( this.dom )
  }

  show() {
    if ( ! this.isShown() ) {
      this.dom.classList.add( 'sb_show' )
      this.highlightFirstInput()
    }
  }

  isShown() {
    return this.dom.classList.contains( 'sb_show' )
  }

  isTarget( target:HTMLElement ) {
    return this.isShown() && (
        target === this.dom ||
        isParentChild( this.dom, target )
    )
  }

  hide() {
    if ( this.isShown() ) {
      this.dom.classList.remove( 'sb_show' )
    }
  }

  /*
   * Grabs the first textual input box, and gives it focus.
   *
   * Changing the value is to undo any highlighting,
   * selection of all of the text,
   * which some browsers may do.
   */
  highlightFirstInput() {
    const input = this.content.querySelector( 'input[type="text"], input[type="number"]' ) as Nullable<HTMLInputElement>

    if ( input ) {
      input.focus()
      input.value = input.value
    }
  }

  setContent(
      ... doms : HTMLElement[],
  ) {
    this.content.innerHTML = ''

    doms.forEach( dom => {
      this.content.appendChild( dom )
    })

    this.highlightFirstInput()

    return this
  }

  getContent():HTMLElement {
    return this.content
  }
}

