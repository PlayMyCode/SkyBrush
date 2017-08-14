
/**
 * If we are touch, or not.
 */
export const IS_TOUCH = !! (window as any).Touch

/**
 * Are we on iOS?
 */
export const IS_IOS = (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    ! window['MSStream']
)

/**
 * Starting alpha value.
 */
export const DEFAULT_ALPHA = 1

/**
 * Starting colour when SkyBrush starts.
 */
export const DEFAULT_COLOUR = '#104662' // dark cyan-blue

/**
 * Default cursor name.
 */
export const DEFAULT_CURSOR = 'sb_cursor_default'

/**
 * in pixels
 */
export const DEFAULT_WIDTH  = 540

/**
 * in pixels
 */
export const DEFAULT_HEIGHT = 460

/**
 * From 1/MAX_ZOOM to MAX_ZOOM
 */
export const DEFAULT_ZOOM = 1

/**
 * The name of the command to select as default,
 * when the user first sees painter.
 */
export const DEFAULT_COMMAND = 'webby'

/**
 * If the alpha is set to a value just below 1,
 * which is within this dead zone, then it's blended up to 1.
 *
 * This is to make it easier to select an alpha of 1.
 */
export const ALPHA_DEAD_ZONE = 0.03

/**
 *
 */
export const GUI_CSS_PREFIX = 'sb_gui_'

/**
 * When a GUI component in the bar is hidden, and it becomes thinner
 * and greyed out, this is the width is will minimize to.
 */
export const GUI_CONTENT_WIDTH_WHEN_HIDDEN = 40

/**
 * The prefix added to command css classes.
 *
 * So 'picker' becomes 'sb_command_picker' if
 * the prefix is 'sb_command_'.
 */
export const COMMAND_CSS_PREFIX = 'sb_command_'

/**
 *
 */
export const CONTROL_CSS_PREFIX = 'sb_control_'

/**
 * The maximum zoom level.
 *
 * min zoom is: 1 / MAX_ZOOM
 *
 * @const
 * @type {number}
 */
export const MAX_ZOOM = 16

/**
 * Minimum width of a horizontal/vertical line on the colour
 * pixker.
 *
 * @const
 * @type {number}
 */
export const COLOUR_MIXER_MIN_WIDTH = 3

/**
 * The width, in pixels, of the colour mixer.
 *
 * This should match the CSS.
 *
 * @const
 * @type {number}
 */
export const COLOUR_MIXER_WIDTH = 140

/**
 * The width of the colour wheel,
 * must match the CSS.
 *
 * @const
 * @type {number}
 */
export const COLOUR_WHEEL_WIDTH = 77

/**
 * @const
 * @type {string}
 */
export const CONTROL_ID_CSS_PREFIX = '__skybrush_control_css_id_'

/*
 * WARNING! All colours _MUST_ be 6 values hex values!
 */

export const NUM_COLORS_IN_PALETTE_COLUMN = 5

/**
 * The colours present in the colour palette.
 *
 * Add/remove from this list to have different colours.
 *
 * @const
 * @type {Array.<string>}
 */
export const DEFAULT_COLOURS = (() => {
  /*
   * todo, the rearranging into columns should be done in the GUI.
   * Not here.
   *
   * Colors are laid out in groups, we then re-arrange so they are
   * laid out in columns instead, and can be 'just dumped', into the
   * DOM.
   */
  const colors = [
      // for colours see: http://en.wikipedia.org/wiki/Web_colors

      /* Greys */
      '#ffffff',
      '#c3c1c1',
      '#8b8a8a',
      '#474747',
      '#000000',

      /*colours*/
      '#ffcdcc',
      '#ff8d8a',
      '#ff0600',
      '#990400',
      '#630200',

      '#FFE7CD',
      '#FFC78A',
      '#FF8601',
      '#995001',
      '#633400',

      '#FFFDCC',
      '#FFFA8A',
      '#FFF500',
      '#999301',
      '#635E00',

      '#CDF5D0',
      '#8DE992',
      '#06D211',
      '#037E0A',
      '#045207',

      '#D4F0FE',
      '#9DDEFE',
      '#28B5FD',
      '#1A6D99',
      '#104662',

      '#CCCEFF',
      '#8A90FF',
      '#000CFF',
      '#010799',
      '#000563',

      '#FFCCED',
      '#FF8AD8',
      '#FF00A8',
      '#980065',
      '#630041',
  ]

  const cols = new Array()
  for ( let i = 0; i < NUM_COLORS_IN_PALETTE_COLUMN; i++ ) {
    for ( let j = i; j < colors.length; j += NUM_COLORS_IN_PALETTE_COLUMN ) {
      cols.push( colors[j] )
    }
  }

  return cols
})()
