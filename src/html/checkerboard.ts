
import * as htmlUtils from 'util/html'

/**
 * Creates a new canvas, and returns it,
 * but after being painted with a checkerboard.
 *
 * The third argument states if it should
 * gradient the alpha across it, from left to right.
 */
export function newCheckerboard( w:number, h:number, gradientAlpha:boolean ) {
  const canvas  = htmlUtils.newCanvas( w, h )
  const ctx     = canvas.getContext( '2d' )

  if ( ctx === null ) {
    return canvas
  }

  const ctxData = ctx.createImageData( w, h )
  const data    = ctxData.data

  for ( let y = 0; y < h; y++ ) {
    for ( let x = 0; x < w; x++ ) {
      const i = (y*w + x) * 4
      const a = ( (1 - y/h)*255 + 0.5 ) | 0

      // generate a Photoshop-like checker board
      data[i] = data[i+1] = data[i+2] =
          ( (((y/8) | 0) % 2) === (((x/8) | 0) % 2) ) ?
              254 :
              203

      data[i+3] = gradientAlpha ?
          a :
          1.0
    }
  }

  ctx.putImageData( ctxData, 0, 0 )

  return canvas
}
