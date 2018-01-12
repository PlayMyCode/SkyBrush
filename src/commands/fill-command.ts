
/*
 * This code uses a 'flood fill' like algorithm to fill the
 * pixels. However flood fill algorithms tend to search for an
 * exact colour, and then replace it.
 *
 * Due to the support of tolerance and alpha mixing, it is
 * possible for a replaced colour to still remain within the
 * target tolerance of coloures we are looking for. This would
 * result in the pixel being coloured 2 or more times.
 *
 * To prevent this, the algorithm must track what pixels it has
 * altered so far.
 */
export class FillCommand extends Command {
  constructor() {
    super({
      name: 'Fill',
      css : 'fill',
      caption: 'Fill Colour | shortcut: f',

      cursor: 'sb_cursor_fill',

      controls: [
          {
              name : 'Tolerance',
              field: 'tolerance',
              type : 'slider',
              css  : 'tolerance',

              value: 20,
              min: 1,
              max: 255,
          }
      ],
    })
  }

  onDown(
      canvas:HTMLCanvasElement,
      mouseX:number,
      mouseY:number,
  ):void {
    // Floor the location, and make it clear to the VM
    // that these values are integers (the |0 code).
    mouseX = mouseX|0
    mouseY = mouseY|0

    const ctx = canvas.getDirectContext()
    const tolerance = this.tolerance

    const alpha     = ctx.globalAlpha
    const invAlpha  = 1-alpha
    const destAlpha = (ctx.globalCompositeOperation === 'source-atop')

    const rgb = canvas.getRGB()
    const srcR = rgb[0]|0
    const srcG = rgb[1]|0
    const srcB = rgb[2]|0
    const srcRAlpha = srcR * alpha
    const srcGAlpha = srcG * alpha
    const srcBAlpha = srcB * alpha

    const w = canvas.width |0
    const h = canvas.height|0

    const clip   = canvas.getClip()
    const clipX  = ( clip === null ? 0 : clip.x          )|0
    const clipY  = ( clip === null ? 0 : clip.y          )|0
    const clipW  = ( clip === null ? w : clip.w          )|0
    const clipH  = ( clip === null ? h : clip.h          )|0
    const clipX2 = ( clip === null ? w : clip.x + clip.w )|0
    const clipY2 = ( clip === null ? h : clip.y + clip.h )|0

    // if the target is outside of the clip area, then quit!
    if ( mouseX < clipX || mouseY < clipY || mouseX >= clipX2 || mouseY >= clipY2 ) {
      return

    } else {
      // get the pixel data out
      const ctxData = ctx.getImageData( clipX, clipY, clipW, clipH )
      const data = ctxData.data

      /*
       * From here on, all x and y values should have
       * the clipX/Y removed from them.
       *
       * So they extend from 0 to clipW/H.
       */

      // Used for the update area at the end.
      // Default to where it was clicked to begin with.
      let minX = mouseX-clipX
      let maxX = mouseX-clipX
      let minY = mouseY-clipY
      let maxY = mouseY-clipY

      /**
       * The pixels we have seen so far, and it also
       * stores the next pixel to process.
       *
       * This is the 2D array of pixels flattened
       * into a flat 1D array.
       *
       * As 0 is a valid index, and the array fills
       * with 0's by default, we add 1 when storing
       * and remove 1 when retrieving.
       *
       * This means -1 is a pixel with no next address,
       * and 0 means 'go to the pixel at 0'.
       */
      const seenPixels = new Int32Array( clipW * clipH )

      const currentI = mouseY*clipW + mouseX
      let needleI = currentI

      const dataI = currentI * 4

      const startR = data[dataI  ]
      const startG = data[dataI+1]
      const startB = data[dataI+2]
      const startA = data[dataI+3]

      // leave early if there is nothing to fill
      if ( destAlpha && startA === 0 ) {
        return
      }

      // work out the tolerance ranges
      const minR = Math.max(   0, startR-tolerance )
      const minG = Math.max(   0, startG-tolerance )
      const minB = Math.max(   0, startB-tolerance )
      const minA = Math.max(   0, startA-tolerance )

      const maxR = Math.min( 255, startR+tolerance )
      const maxG = Math.min( 255, startG+tolerance )
      const maxB = Math.min( 255, startB+tolerance )
      const maxA = Math.min( 255, startA+tolerance )

      // fills pixels with the given colour if they are within tolerence
      do {
        const x = (currentI % clipW)|0
        const y = ((currentI-x) / clipW)|0

        if ( x < minX ) {
          minX = x
        } else if ( x > maxX ) {
          maxX = x
        }
        if ( y < minY ) {
          minY = y
        } else if ( y > maxY ) {
          maxY = y
        }

        const i = currentI * 4
        const r = data[i]
        const g = data[i+1]
        const b = data[i+2]
        let a = data[i+3]

        if (
            // ensure we can write there
            !(destAlpha && a === 0) &&

            // ensure it is within tolerance
            r >= minR && r <= maxR &&
            g >= minG && g <= maxG &&
            b >= minB && b <= maxB &&
            a >= minA && a <= maxA
        ) {
          // skip mixing if we'll just be overwriting it
          if ( alpha === 1 ) {
            data[i  ] = srcR
            data[i+1] = srcG
            data[i+2] = srcB

            if ( destAlpha === false ) {
              data[i+3] = 255
            }
          } else {
            const fullAlpha = ( a === 255 )
            a /= 255.0

            /*
             * see Wikipedia: http://en.wikipedia.org/wiki/Alpha_Blend#Alpha_blending
             *
             * outA = srcA + destA(1-srcA)
             * resultRGB = ( srcRGB*srcA + destRGB*destA*(1-srcA) ) / outA
             */
            const outA = alpha + a*invAlpha

            // skip altering alpha if 'destination alpha' is set
            // skip the alpha mixing if destination has full alpha
            if ( destAlpha === false && !fullAlpha ) {
              // formula: newAlpha = destA + srcA*(1-destA)
              data[i+3] = ( (outA * 255) + 0.5 ) | 0
            }

            data[i  ] = ((( srcRAlpha + r*a*invAlpha ) / outA ) + 0.5 ) | 0
            data[i+1] = ((( srcGAlpha + g*a*invAlpha ) / outA ) + 0.5 ) | 0
            data[i+2] = ((( srcBAlpha + b*a*invAlpha ) / outA ) + 0.5 ) | 0
          }

          needleI = store( needleI, x-1, y  , clipW, clipH, seenPixels )
          needleI = store( needleI, x+1, y  , clipW, clipH, seenPixels )
          needleI = store( needleI, x  , y-1, clipW, clipH, seenPixels )
          needleI = store( needleI, x  , y+1, clipW, clipH, seenPixels )
        }

        currentI = seenPixels[ currentI ] - 1
      } while ( currentI !== -1 && currentI !== needleI )

      const diffX = (maxX-minX) + 1
      const diffY = (maxY-minY) + 1

      ctx.putImageData( ctxData, clipX, clipY, minX, minY, diffX, diffY )
      this.setDrawArea( minX+clipX, minY+clipY, diffX, diffY )
    }
  }
}

/**
 * If the given x/y location is valid (0 or greater, < w/h),
 * and it hasn't already been used in 'done',
 * then it's added to the xs/ys arrays.
 *
 * @param fromI
 * @param toX
 * @param toY
 * @param clipW
 * @param clipH
 * @param seenPixels
 */
function store(
    fromI:number,
    toX:number,
    toY:number,
    clipW:number,
    clipH:number,
    seenPixels:number,
):number {
  if ( 0 <= toX && toX < clipW && 0 <= toY && toY < clipH ) {
    const toI = toY*clipW + toX

    if ( seenPixels[toI] === 0 ) {
      seenPixels[fromI] = toI + 1

      return toI
    }
  }

  return fromI
}

