
/**
 *
 * @const
 * @type {string}
 */
GUI_CSS_PREFIX = 'sb_gui_',

/**
 * When a GUI component in the bar is hidden, and it becomes thinner
 * and greyed out, this is the width is will minimize to.
 *
 * @const
 * @type {string}
 */
GUI_CONTENT_WIDTH_WHEN_HIDDEN = 40,

/**
 * @constructor
 * @private
 *
 * @param name The name of this GUI, this appeares in the header.
 * @param klass The CSS class for the content in this GUI.
 */
export class GUI {
  private guiWidth:number         = 0
  private isHeaderClickable       = true
  private sibling:GUI             = null
  private amountTranslated:number = 0

  constructor( 
      name:string,
      klass:string,
      clickableHeader:boolean 
  ) {
    // -- build the header
    const header  = document.createElement( 'div' );
    header.className = 'skybrush_gui_header';

    const headerContent = document.createElement( 'div' )
    headerContent.className = 'skybrush_gui_header_text'
    header.appendChild( headerContent )
    header.appendChild( document.createTextNode(name) )
    header.addEventListener( 'selectstart', returnFalse )

    const $header = $(header)
    $header.leftclick((ev) => {
      ev.stopPropagation()
      ev.preventDefault()

      if ( clickableHeader !== false ) {
        this.toggleOpen()
      }
    });

    // -- build the content
    const content = document.createElement( 'div' );
    content.className = 'skybrush_gui_content';
    this.content = content;
    this.content.appendChild( header );

    // -- build the dom
    this.dom = document.createElement( 'div' );
    this.dom.className = 'skybrush_gui ' + GUI_CSS_PREFIX + klass ;

    // -- build the darken overlay for when the GUI is closed
    if ( clickableHeader ) {
      const darkenDom = document.createElement( 'div' );
      darkenDom.className = 'skybrush_gui_darken';

      $( darkenDom ).leftclick((ev) => {
        this.open();
      });

      this.content.appendChild( darkenDom );

      this.isHeaderClickable = true
    }

    this.dom.appendChild( content );
    this.$dom = $( this.dom );

    this.amountTranslated = 0;

    // set later
    this.painter = null;
  }

  setSiblingGUI( sibling ) {
    if ( this.sibling !== null ) {
      this.sibling.setSiblingGUI( sibling );
    } else {
      this.sibling = sibling;
      this.dom.appendChild( sibling.dom );
    }
  }

  setPainter( painter ):GUI {
    this.painter = painter;

    return this;
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
  append( content:HTMLElement ):GUI {
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
  appendTogether():GUI {
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
  appendDirect():GUI {
    for ( let i = 0; i < arguments.length; i++ ) {
      this.content.appendChild( arguments[i] )
    }

    return this
  }

  open():GUI {
    if ( ! this.painter.isGUIsShown() ) {
      this.painter.showGUIPane()
    }

    if ( this.isHeaderClickable && this.sibling !== null && !this.isOpen() ) {
      this.dom.classList.remove( 'sb_hide' )
      this.sibling.$dom.translate( 0, 0 )

      this.painter.subtractGUIPaneContentWidth( - this.amountTranslated )
      this.amountTranslated = 0
    }

    return this;
  }

  close():GUI {
    const isClosable = (
        this.isHeaderClickable &&
        this.sibling && 
        this.isOpen()
    )

    if ( isClosable ) {
      if ( this.guiWidth === '' ) {
        this.guiWidth = this.content.getBoundingClientRect().width
      }

      requestAnimationFrame(() => {
        const translateX = - (this.guiWidth - GUI_CONTENT_WIDTH_WHEN_HIDDEN);

        this.amountTranslated = translateX;
        this.sibling.$dom.translate( translateX, 0 );
        this.dom.classList.add( 'sb_hide' );

        this.painter.subtractGUIPaneContentWidth( translateX );
      })
    }

    return this;
  }

  isOpen():boolean {
    return this.dom.classList.contains( 'sb_hide' )
  }

  toggleOpen():GUI {
    if ( this.painter.isGUIsShown() ) {
      if ( this.isOpen() ) {
        this.close();
      } else {
        this.open();
      }
    } else {
      this.painter.showGUIPane();
      this.open();
    }

    return this;
  }
}

