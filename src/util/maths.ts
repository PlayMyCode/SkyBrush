
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
