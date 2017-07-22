
import {
  LEFT,
  GUI_CSS_PREFIX,
  GUI_CONTENT_WIDTH_WHEN_HIDDEN,
} from 'setup/constants'
import { Nullable } from 'util/function-interfaces'

/**
 * @constructor
 * @private
 *
 * @param name The name of this GUI, this appeares in the header.
 * @param klass The CSS class for the content in this GUI.
 */
export class GUI {
  protected readonly dom : HTMLElement

  private readonly content : HTMLElement

  private guiWidth          : number
  private isHeaderClickable : boolean
  private sibling           : Nullable<GUI>
  private amountTranslated  : number

  private painter : Nullable<SkyBrush>

  constructor( 
      name  : string,
      klass : string,
      clickableHeader : boolean,
  ) {
    // -- build the header
    const header  = document.createElement( 'div' );
    header.className = 'skybrush_gui_header';

    const headerContent = document.createElement( 'div' )
    headerContent.className = 'skybrush_gui_header_text'
    header.appendChild( headerContent )
    header.appendChild( document.createTextNode(name) )
    header.addEventListener( 'selectstart', returnFalse )

    header.addEventListener( 'mouseclick', ev => {
      if ( ev.which !== LEFT ) {
        return
      }

      ev.stopPropagation()
      ev.preventDefault()

      if ( clickableHeader !== false ) {
        this.toggleOpen()
      }
    })

    // -- build the content
    const content = document.createElement( 'div' )
    content.className = 'skybrush_gui_content'
    this.content = content
    this.content.appendChild( header )

    // -- build the dom
    this.dom = document.createElement( 'div' )
    this.dom.className = `skybrush_gui ${GUI_CSS_PREFIX}${klass}`

    // -- build the darken overlay for when the GUI is closed
    if ( clickableHeader ) {
      const darkenDom = document.createElement( 'div' )
      darkenDom.className = 'skybrush_gui_darken'

      darkenDom.addeventListner( 'mouseclick', ev => {
        if ( ev.which !== LEFT ) {
          return
        }

        this.open()
      })

      this.content.appendChild( darkenDom )

      this.isHeaderClickable = true
    }

    this.dom.appendChild( content )

    this.sibling           = null
    this.guiWidth          = -1
    this.amountTranslated  = 0
    this.isHeaderClickable = false

    // set later
    this.painter = null
  }

  setSiblingGUI( sibling ) {
    if ( this.sibling !== null ) {
      this.sibling.setSiblingGUI( sibling )
    } else {
      this.sibling = sibling
      this.dom.appendChild( sibling.dom )
    }
  }

  setPainter( painter:SkyBrush ):this {
    this.painter = painter

    return this
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
  append( content:HTMLElement ):this {
    const guiBlock = newDiv( 'skybrush_gui_content_block' )
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
    const guiBlock = newDiv( 'skybrush_gui_content_block' )
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
    if ( ! this.painter.isGUIsShown() ) {
      this.painter.showGUIPane()
    }

    if ( this.isHeaderClickable && this.sibling !== null && !this.isOpen() ) {
      this.dom.classList.remove( 'sb_hide' )
      this.sibling.dom.style.transform = 'translate( 0, 0 )'

      this.painter.subtractGUIPaneContentWidth( - this.amountTranslated )
      this.amountTranslated = 0
    }

    return this
  }

  close():this {
    const isClosable = (
        this.isHeaderClickable &&
        this.sibling && 
        this.isOpen()
    )

    if ( isClosable ) {
      if ( this.guiWidth === -1 ) {
        this.guiWidth = this.content.getBoundingClientRect().width
      }

      requestAnimationFrame(() => {
        const translateX = - (this.guiWidth - GUI_CONTENT_WIDTH_WHEN_HIDDEN)

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

