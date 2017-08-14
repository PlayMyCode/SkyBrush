
import { SkyBrush } from 'skybrush'
import * as constants from 'setup/constants'
import * as html from 'util/html'
import { LEFT } from 'util/input'
import { Nullable } from 'util/function-interfaces'

/**
 * @constructor
 * @private
 *
 * @param name The name of this GUI, this appeares in the header.
 * @param klass The CSS class for the content in this GUI.
 */
export class GUI {
  private readonly dom : HTMLElement

  private readonly painter : SkyBrush
  private readonly content : HTMLElement

  private guiWidth          : number
  private sibling           : Nullable<GUI>
  private amountTranslated  : number

  constructor(
      painter : SkyBrush,

      name  : string,
      klass : string,
  ) {
    this.painter = painter

    // -- build the header
    const header  = document.createElement( 'div' );
    header.className = 'skybrush_gui_header';

    const headerContent = document.createElement( 'div' )
    headerContent.className = 'skybrush_gui_header_text'
    header.appendChild( headerContent )
    header.appendChild( document.createTextNode(name) )
    header.addEventListener( 'selectstart', () => false )

    header.addEventListener( 'mouseclick', ev => {
      if ( ev.which !== LEFT ) {
        return
      }

      ev.stopPropagation()
      ev.preventDefault()

      this.toggleOpen()
    })

    // -- build the content
    const content = document.createElement( 'div' )
    content.className = 'skybrush_gui_content'
    this.content = content
    this.content.appendChild( header )

    // -- build the dom
    this.dom = document.createElement( 'div' )
    this.dom.className = `skybrush_gui ${constants.GUI_CSS_PREFIX}${klass}`

    // -- build the darken overlay for when the GUI is closed
    const darkenDom = document.createElement( 'div' )
    darkenDom.className = 'skybrush_gui_darken'

    darkenDom.addEventListener( 'mouseclick', ev => {
      if ( ev.which !== LEFT ) {
        return
      }

      this.open()
    })

    this.content.appendChild( darkenDom )

    this.dom.appendChild( content )

    this.sibling           = null
    this.guiWidth          = -1
    this.amountTranslated  = 0
  }

  getDom() {
    return this.dom
  }

  setSiblingGUI(
      sibling:GUI,
  ) {
    if ( this.sibling !== null ) {
      this.sibling.setSiblingGUI( sibling )
    } else {
      this.sibling = sibling
      this.dom.appendChild( sibling.dom )
    }
  }

  /**
   * Adds all of the elements given to the GUI, they are *each* placed
   * into their own GUI block wrapper.
   *
   * This differs to 'appendDirect' because the elements given will each be
   * wrapped within it's own gui block, within the contents of this gui.
   *
   * @return This GUI object.
   */
  append(
      content:HTMLElement,
  ):this {
    const guiBlock = html.newDiv( 'skybrush_gui_content_block' )
    guiBlock.appendChild( content )

    this.content.appendChild( guiBlock )

    return this
  }

  /**
   * Adds all of the elements given to the GUI, they are *all* placed
   * into a single GUI block wrapper when added.
   *
   * @return This GUI object.
   */
  appendTogether():this {
    const guiBlock = html.newDiv( 'skybrush_gui_content_block' )
    for ( let i = 0; i < arguments.length; i++ ) {
      guiBlock.appendChild( arguments[i] )
    }

    this.content.appendChild( guiBlock )

    return this
  }

  /**
   * This will add the elements given straight into the content, with no
   * intermediate wrapping of any kind.
   *
   * @param dom HTMLElements to append to this GUI container.
   * @return This GUI.
   */
  appendDirect():this {
    for ( let i = 0; i < arguments.length; i++ ) {
      this.content.appendChild( arguments[i] )
    }

    return this
  }

  open():this {
    if ( this.painter === null ) {
      return this
    }

    if ( ! this.painter.isGUIsShown() ) {
      this.painter.showGUIPane()
    }

    if ( this.sibling !== null && !this.isOpen() ) {
      this.dom.classList.remove( 'sb_hide' )
      this.sibling.dom.style.transform = 'translate( 0, 0 )'

      this.painter.subtractGUIPaneContentWidth( - this.amountTranslated )
      this.amountTranslated = 0
    }

    return this
  }

  close():this {
    // Check if it is closable.
    if (
        this.sibling !== null &&
        this.isOpen()
    ) {
      if ( this.guiWidth === -1 ) {
        this.guiWidth = this.content.getBoundingClientRect().width
      }

      requestAnimationFrame(() => {
        if ( this.sibling === null ) {
          return
        }

        const translateX = - (this.guiWidth - constants.GUI_CONTENT_WIDTH_WHEN_HIDDEN)

        this.amountTranslated = translateX
        this.sibling.dom.style.transform = `translateX( ${translateX}px )`
        this.dom.classList.add( 'sb_hide' )

        this.painter.subtractGUIPaneContentWidth( translateX )
      })
    }

    return this
  }

  isOpen():boolean {
    return this.dom.classList.contains( 'sb_hide' )
  }

  toggleOpen():this {
    if ( this.painter.isGUIsShown() ) {
      if ( this.isOpen() ) {
        this.close()
      } else {
        this.open()
      }
    } else {
      this.painter.showGUIPane()
      this.open()
    }

    return this
  }
}

