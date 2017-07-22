
/**
 * Takes the percentage value (a number in the range [0.0, 1.0]),
 * a min, and a max, and outputs it's equivalent in the min/max
 * given.
 *
 * @param p The percent value to convert.
 * @param min The minimum value allowed.
 * @param max The maximum value allowed.
 * @return The percent converted to a value from min to max.
 */
export function percentToRange( p:number, min:number, max:number ) {
  return ( max - min )*p + min
}

/**
 * You give it a value, and this returns a 'percent',
 * which is a number from 0.0 to 1.0.
 *
 * It works out this percent through the value, min
 * and max values given.
 *
 * @param n The value to convert to a percent.
 * @param min The minimum value in the range.
 * @param max The minimum value in the range.
 * @return The percent result.
 */
export function rangeToPercent( n:number, min:number, max:number ) {
  return ( n - min ) / ( max - min )
}

export function limit(
    n : number,
    min : number,
    max : number,
): number {
  if ( n < min ) {
    return min
  }

  if ( n > max ) {
    return max
  }
  
  return n
}
