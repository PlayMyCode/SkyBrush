
/**
 * Converts an RGB color to HSV, and returns the 'value' component.
 * The 'value' is in the range of 0.0 to 1.0.
 *
 * @param   {number} r       The red color value
 * @param   {number} g       The green color value
 * @param   {number} b       The blue color value
 * @return  {number} The value of the HSV value, between 0.0 and 1.0.
 */
export function rgbToHSVValue(r, g, b) {
  if ( r > g ) {
    if ( r > b ) {
      return r / 255;
    } else if ( g > b ) {
      return g / 255;
    } else {
      return b / 255;
    }
  } else if ( g > b ) {
    return g / 255;
  } else {
    return b / 255;
  }
}

export function rgbToHSVSaturation(r, g, b) {
  if ( r === g && r === b ) {
    return 0 ;

  } else {
    var v    =     Math.max( r, g, b );
    var diff = v - Math.min( r, g, b );

    return diff / v ;
  }
}

export function rgbToHSVHue(r, g, b) {
  if ( r === g && r === b ) {
    return 0;

  } else {
    r = r / 255,
    g = g / 255,
    b = b / 255;

    var v    =     Math.max( r, g, b );
    var diff = v - Math.min( r, g, b );

    return (
        ( v === r ) ? ( (g - b) / diff + (g < b ? 6 : 0) ) :
        ( v === g ) ? ( (b - r) / diff + 2               ) :
                ( (r - g) / diff + 4               )
    ) / 6 ;
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
export function rgbToHSV(r, g, b) {
  // achromatic
  if ( r === g && r === b ) {
    return [ 0.0, 0.0, Math.max(r, g, b)/255.0 ] ;

  } else {
    r = r / 255.0,
    g = g / 255.0,
    b = b / 255.0;

    var v    =     Math.max( r, g, b );
    var diff = v - Math.min( r, g, b );

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
    ];
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
export function atan2ToHue( yDiff, xDiff ) {
  return ( Math.atan2( yDiff, xDiff ) + Math.PI ) / ( Math.PI*2 );
}

/**
 * @param   {number} h       The hue
 * @param   {number} s       The saturation
 * @param   {number} v       The value
 * @return  {number}         The red component, in the RGB colour model.
 */
export function hsvToR(h, s, v){
  var iMod = (((h*6)|0) % 6)|0;

  if ( iMod === 0 ) {
    return ((
        // v
        v
    )*255 + 0.5)|0;
  } else if ( iMod === 1 ) {
    return ((
        // q
        v * (1 - (h*6-((h*6)|0)) * s)
    )*255 + 0.5)|0;
  } else if ( iMod === 2 ) {
    return ((
        // p
        v*(1-s))
    *255 + 0.5)|0;
  } else if ( iMod === 3 ) {
    return ((
        // p
        v*(1-s)
    )*255 + 0.5)|0;
  } else if ( iMod === 4 ) {
    return ((
        // t
        (v * (1 - (1-(h*6-((h*6)|0))) * s))
    )*255 + 0.5)|0;
  } else /* iMod === 5 */{
    return ((
        // v
        v
    )*255 + 0.5)|0;
  }
}

export function hsvToB(h, s, v){
  var iMod = (((h*6)|0) % 6)|0;

  if ( iMod === 0 ) {
    return ((
        // p
        v*(1-s)
    )*255 + 0.5)|0;
  } else if ( iMod === 1 ) {
    return ((
        // p
        v*(1-s)
    )*255 + 0.5)|0;
  } else if ( iMod === 2 ) {
    return ((
        // t
        (v * (1 - (1-(h*6-((h*6)|0))) * s))
    )*255 + 0.5)|0;
  } else if ( iMod === 3 ) {
    return ((
        // v
        v
    )*255 + 0.5)|0;
  } else if ( iMod === 4 ) {
    return ((
        // v
        v
    )*255 + 0.5)|0;
  } else /* iMod === 5 */{
    return ((
        // q
        v * (1 - (h*6-((h*6)|0)) * s)
    )*255 + 0.5)|0;
  }
}

export function hsvToG(h, s, v){
  var iMod = (((h*6)|0) % 6)|0;

  if ( iMod === 0 ) {
    return ((
        // t
        (v * (1 - (1-(h*6-((h*6)|0))) * s))
    )*255 + 0.5)|0;
  } else if ( iMod === 1 ) {
    return ((
        // v
        v
    )*255 + 0.5)|0;
  } else if ( iMod === 2 ) {
    return ((
        // v
        v
    )*255 + 0.5)|0;
  } else if ( iMod === 3 ) {
    return ((
        // q
        v * (1 - (h*6-((h*6)|0)) * s)
    )*255 + 0.5)|0;
  } else if ( iMod === 4 ) {
    return ((
        // p
        v*(1-s)
    )*255 + 0.5)|0;
  } else /* iMod === 5 */{
    return ((
        // p
        v*(1-s)
    )*255 + 0.5)|0;
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
export function hsvToRGB(h, s, v){
  var r, g, b;

  var i = (h *  6)|0;
  var f =  h *  6 - i;
  var p =  v * (1 - s);
  var q =  v * (1 - f * s);
  var t =  v * (1 - (1 - f) * s);

  var iMod = i % 6;

       if ( iMod === 0 ) { r = v, g = t, b = p;
  } else if ( iMod === 1 ) { r = q, g = v, b = p;
  } else if ( iMod === 2 ) { r = p, g = v, b = t;
  } else if ( iMod === 3 ) { r = p, g = q, b = v;
  } else if ( iMod === 4 ) { r = t, g = p, b = v;
  } else   /* iMod === 5 */{ r = v, g = p, b = q;
  }

  return [
      (r*255 + 0.5)|0,
      (g*255 + 0.5)|0,
      (b*255 + 0.5)|0
  ];
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
export function hsvToColor( h:number, s:number, v:number ) {
  // hsvToR/G/B returns an int, so no rounding is needed!
  return '#' +
      INT_TO_HEX[ hsvToR(h, s, v) ] +
      INT_TO_HEX[ hsvToG(h, s, v) ] +
      INT_TO_HEX[ hsvToB(h, s, v) ] ;
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
export function rgbToColor( r, g, b ) {
  return '#' +
      INT_TO_HEX[ (r+0.5) | 0 ] +
      INT_TO_HEX[ (g+0.5) | 0 ] +
      INT_TO_HEX[ (b+0.5) | 0 ] ;
};

