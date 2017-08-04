
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
