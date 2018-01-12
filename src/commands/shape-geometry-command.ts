
import GeometryCommand from './geometry-command'

export class ShapeGeometry extends Geometry {
  constructor( setup ) {
    let controls = setup.controls
    if ( ! controls ) {
      controls = []
    } else if ( controls && ! ( controls instanceof Array ) ) {
      controls = [ controls ]
    }

    setup.controls = controls.concat([
        {
            name: 'Mode',
            css: 'outline_cmd',
            field: 'isOutline',
            type: 'toggle',
            css_options: [ 'filled', 'outline' ],
            name_options: [ 'Filled', 'Outline' ],
        },
        {
            name: 'Outline',
            css: 'outline_size_cmd',
            field: 'size',
            type: 'slider',

            value: 1,
            min: 1,
            max: MAX_BRUSH_SIZE,
        },
        {
            name: 'Proportion',
            css: 'proportion_size_cmd',
            field: 'isProportional',
            type: 'checkbox',
        },
        {
            name: 'Center',
            css: 'centre_size_cmd',
            field: 'isCentred',
            type: 'checkbox',
        },
    ])

    // wrap in our own function
    const drawGeom = setup.onDraw
    setup.onDraw = function( ctx, x1, y1, x2, y2, lastX, lastY ) {
      const size = this.size
      const isOutline = this.isOutline

      x1 = this.round( x1, isOutline, size )
      y1 = this.round( y1, isOutline, size )
      x2 = this.round( x2, isOutline, size )
      y2 = this.round( y2, isOutline, size )

      let w = x2 - x1
      let h = y2 - y1

      if ( this.isProportional ) {
        const wAbs = Math.abs(w)
        const hAbs = Math.abs(h)

        if ( wAbs > hAbs ) {
          if ( h < 0 ) {
            h = - wAbs
          } else {
            h =   wAbs
          }
        } else {
          if ( w < 0 ) {
            w = - hAbs
          } else {
            w =   hAbs
          }
        }
      }

      if ( this.isCentred ) {
        x1 -= w
        y1 -= h
        w += w
        h += h
      }

      if ( this.isProportional || this.isCentred ) {
        this.setDrawArea( x1, y1, w, h, size )
      }

      canvasUtils.clearCtx( ctx,
          this.lastX1,
          this.lastY1,
          this.lastW,
          this.lastH,
          this.size
      )

      this.lastX1 = x1
      this.lastY1 = y1
      this.lastW  = w
      this.lastH  = h

      drawGeom.call( this, ctx, x1, y1, x1+w, y1+h )
    }

    setup.onDown = function(canvas, x, y) {
      this.lastX1 = x
      this.lastY1 = y
      this.lastW  = 1
      this.lastH  = 1
    }

    super( setup )
  }
}

