
/**
 * An array used for fast hex value lookup.
 *
 * This is an array of every hex number from 0 to 255.
 *
 * @const
 * @type {Array.<string>}
 */
const INT_TO_HEX = [
    '00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '0a', '0b', '0c', '0d', '0e', '0f',
    '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '1a', '1b', '1c', '1d', '1e', '1f',
    '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '2a', '2b', '2c', '2d', '2e', '2f',
    '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '3a', '3b', '3c', '3d', '3e', '3f',
    '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '4a', '4b', '4c', '4d', '4e', '4f',
    '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '5a', '5b', '5c', '5d', '5e', '5f',
    '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '6a', '6b', '6c', '6d', '6e', '6f',
    '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '7a', '7b', '7c', '7d', '7e', '7f',
    '80', '81', '82', '83', '84', '85', '86', '87', '88', '89', '8a', '8b', '8c', '8d', '8e', '8f',
    '90', '91', '92', '93', '94', '95', '96', '97', '98', '99', '9a', '9b', '9c', '9d', '9e', '9f',
    'a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'aa', 'ab', 'ac', 'ad', 'ae', 'af',
    'b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'ba', 'bb', 'bc', 'bd', 'be', 'bf',
    'c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'ca', 'cb', 'cc', 'cd', 'ce', 'cf',
    'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'da', 'db', 'dc', 'dd', 'de', 'df',
    'e0', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9', 'ea', 'eb', 'ec', 'ed', 'ee', 'ef',
    'f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'fa', 'fb', 'fc', 'fd', 'fe', 'ff',
]

/**
 * Converts an RGB color to HSV, and returns the 'value' component.
 * The 'value' is in the range of 0.0 to 1.0.
 *
 * @param   {number} r       The red color value
 * @param   {number} g       The green color value
 * @param   {number} b       The blue color value
 * @return  {number} The value of the HSV value, between 0.0 and 1.0.
 */
export function rgbToHSVValue( r:number, g:number, b:number ):number {
  if ( r > g ) {
    if ( r > b ) {
      return r / 255

    } else if ( g > b ) {
      return g / 255

    } else {
      return b / 255

    }

  } else if ( g > b ) {
    return g / 255

  } else {
    return b / 255

  }
}

export function rgbToHSVSaturation( r:number, g:number, b:number ):number {
  if ( r === g && r === b ) {
    return 0

  } else {
    const v    =     Math.max( r, g, b )
    const diff = v - Math.min( r, g, b )

    return diff / v
  }
}

export function rgbToHSVHue( r:number, g:number, b:number ):number {
  if ( r === g && r === b ) {
    return 0

  } else {
    r /= 255
    g /= 255
    b /= 255

    const v    =     Math.max( r, g, b )
    const diff = v - Math.min( r, g, b )

    return (
        ( v === r ) ? ( (g - b) / diff + (g < b ? 6 : 0) ) :
        ( v === g ) ? ( (b - r) / diff + 2               ) :
                      ( (r - g) / diff + 4               )
    ) / 6
  }
}

/**
 * Converts an RGB color value to HSV. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and v in the set [0, 1].
 *
 * @param   {number} r       The red color value
 * @param   {number} g       The green color value
 * @param   {number} b       The blue color value
 * @return  {Array.<number>} The HSV representation
 */
export function rgbToHSV(
    r:number,
    g:number,
    b:number,
):[ number, number, number ] {
  // achromatic
  if ( r === g && r === b ) {
    return [ 0.0, 0.0, Math.max(r, g, b)/255.0 ]

  } else {
    r /= 255.0
    g /= 255.0
    b /= 255.0

    const v    =     Math.max( r, g, b )
    const diff = v - Math.min( r, g, b )

    return [
        // h, the hue
        (
            ( v === r ) ? ( (g - b) / diff + (g < b ? 6 : 0) ) :
            ( v === g ) ? ( (b - r) / diff + 2               ) :
                          ( (r - g) / diff + 4               )
        ) / 6,

        // s, the saturation
        diff / v,

        // v, the value
        v
    ]
  }
}

/**
 * Converts a given differences in x and y,
 * into an angle (i.e. Math.atan2( yDiff, xDiff ) ),
 * and then into a hue of the range: 0.0 to 1.0.
 *
 * @param yDiff:int
 * @param xDiff:int
 * @return:double The angle as a hue.
 */
export function atan2ToHue( yDiff:number, xDiff:number ):number {
  return ( Math.atan2( yDiff, xDiff ) + Math.PI ) / ( Math.PI*2 )
}

/**
 * @param   {number} h       The hue
 * @param   {number} s       The saturation
 * @param   {number} v       The value
 * @return  {number}         The red component, in the RGB colour model.
 */
export function hsvToR( h:number, s:number, v:number ):number {
  const iMod = (((h*6)|0) % 6)|0

  if ( iMod === 0 ) {
    return ((
        // v
        v
    )*255 + 0.5)|0

  } else if ( iMod === 1 ) {
    return ((
        // q
        v * (1 - (h*6-((h*6)|0)) * s)
    )*255 + 0.5)|0

  } else if ( iMod === 2 ) {
    return ((
        // p
        v*(1-s))
    *255 + 0.5)|0

  } else if ( iMod === 3 ) {
    return ((
        // p
        v*(1-s)
    )*255 + 0.5)|0

  } else if ( iMod === 4 ) {
    return ((
        // t
        (v * (1 - (1-(h*6-((h*6)|0))) * s))
    )*255 + 0.5)|0

  } else /* iMod === 5 */{
    return ((
        // v
        v
    )*255 + 0.5)|0

  }
}

export function hsvToB( h:number, s:number, v:number ):number {
  const iMod = (((h*6)|0) % 6)|0

  if ( iMod === 0 ) {
    return ((
        // p
        v*(1-s)
    )*255 + 0.5)|0

  } else if ( iMod === 1 ) {
    return ((
        // p
        v*(1-s)
    )*255 + 0.5)|0

  } else if ( iMod === 2 ) {
    return ((
        // t
        (v * (1 - (1-(h*6-((h*6)|0))) * s))
    )*255 + 0.5)|0

  } else if ( iMod === 3 ) {
    return ((
        // v
        v
    )*255 + 0.5)|0

  } else if ( iMod === 4 ) {
    return ((
        // v
        v
    )*255 + 0.5)|0

  } else /* iMod === 5 */{
    return ((
        // q
        v * (1 - (h*6-((h*6)|0)) * s)
    )*255 + 0.5)|0

  }
}

export function hsvToG( h:number, s:number, v:number ):number {
  const iMod = (((h*6)|0) % 6)|0

  if ( iMod === 0 ) {
    return ((
        // t
        (v * (1 - (1-(h*6-((h*6)|0))) * s))
    )*255 + 0.5)|0

  } else if ( iMod === 1 ) {
    return ((
        // v
        v
    )*255 + 0.5)|0

  } else if ( iMod === 2 ) {
    return ((
        // v
        v
    )*255 + 0.5)|0

  } else if ( iMod === 3 ) {
    return ((
        // q
        v * (1 - (h*6-((h*6)|0)) * s)
    )*255 + 0.5)|0

  } else if ( iMod === 4 ) {
    return ((
        // p
        v*(1-s)
    )*255 + 0.5)|0

  } else /* iMod === 5 */{
    return ((
        // p
        v*(1-s)
    )*255 + 0.5)|0

  }
}

/**
 * Converts an HSV color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes h, s, and v are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   {number} h       The hue
 * @param   {number} s       The saturation
 * @param   {number} v       The value
 * @return  {Array.<number>} The RGB representation
 */
export function hsvToRGB( h:number, s:number, v:number ):[ number, number, number ] {
  let r = 0
  let g = 0
  let b = 0

  const i = (h *  6)|0
  const f =  h *  6 - i
  const p =  v * (1 - s)
  const q =  v * (1 - f * s)
  const t =  v * (1 - (1 - f) * s)

  const iMod = i % 6

         if ( iMod === 0 ) { r = v, g = t, b = p
  } else if ( iMod === 1 ) { r = q, g = v, b = p
  } else if ( iMod === 2 ) { r = p, g = v, b = t
  } else if ( iMod === 3 ) { r = p, g = q, b = v
  } else if ( iMod === 4 ) { r = t, g = p, b = v
  } else   /* iMod === 5 */{ r = v, g = p, b = q
  }

  return [
      (r*255 + 0.5)|0,
      (g*255 + 0.5)|0,
      (b*255 + 0.5)|0,
  ]
}

/**
 * Converts given hsv value, into a hex colour.
 * It's the same as 'rgbToColor', only it takes
 * HSV values instead.
 *
 * Example result: #d9aa23
 *
 * @param r The hue.
 * @param s The saturation, 0.0 to 1.0.
 * @param v The value, 0.0 to 1.0.
 * @return {string} A CSS hex string for this color.
 */
export function hsvToColor( h:number, s:number, v:number ):string {
  // hsvToR/G/B returns an int, so no rounding is needed!
  const rHex = INT_TO_HEX[ hsvToR(h, s, v) ]
  const gHex = INT_TO_HEX[ hsvToG(h, s, v) ]
  const bHex = INT_TO_HEX[ hsvToB(h, s, v) ]

  return `#${rHex}${gHex}${bHex}`
}

/**
 * All components must be provided as values between 0 and 255.
 * Floating point values are allowed, but will be rounded to
 * the nearest whole number.
 *
 * Example result: #d9aa23
 *
 * @param r The red component.
 * @param g The green component.
 * @param b The blue component.
 * @return The given RGB values combined into a hex string.
 */
export function rgbToColor( r:number, g:number, b:number ):string {
  const rHex = INT_TO_HEX[ (r+0.5) | 0 ]
  const gHex = INT_TO_HEX[ (g+0.5) | 0 ]
  const bHex = INT_TO_HEX[ (b+0.5) | 0 ]

  return `#${rHex}${gHex}${bHex}`
}

