
import { Command, CommandOptions } from './command'

/**
 * Creates a new Brush, with the name, css class and events given.
 * Some extras are added on top, which the standard Command does
 * not have, like brush size.
 *
 * @constructor
 * @private
 */
class Brush extends Command {

  /**
   * The size of this brush when drawn.
   */
  protected size = 0

  constructor(
      setup : CommandOptions,
  ) {
    const brushSizeControl = {
        name: 'Size',
        field: 'size',

        type: 'slider',
        css : 'size',

        cursor: true,

        min: 1,
        max: MAX_BRUSH_SIZE,
    }

    const controls = setup.controls
    if ( controls === undefined ) {
      controls = [ brushSizeControl ]
    } else {
      controls = setup.controls
      let addControl = true

      for ( let i = 0; i < controls.length; i++ ) {
        if ( controls[i].field === brushSizeControl.field ) {
          addControl = false
          break
        }
      }

      if ( addControl ) {
        controls.unshift( brushSizeControl )
      }
    }

    setup.controls = controls

    super( setup )

    this.size = 0
    this.setSize( DEFAULT_BRUSH_SIZE )
  }

  /**
   * Sets the size for this brush.
   * This is automtically limited to default min/max values.
   *
   * @param size The new size for this brush.
   */
  setSize( size:number ) {
    this.size = mathsUtils.limit( size, 1, MAX_BRUSH_SIZE )
  }

  /**
   * Increments the size by the amount given.
   *
   * @param inc The amount to increment the size.
   */
  incrementSize( inc:number ) {
    this.setSize( this.size + inc )
  }
}

