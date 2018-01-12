
import { GeometryCommand } from 'command/geometry-command'

import * as canvasUtils from 'util/canvas'

export class LineCommand extends GeometryCommand {
  constructor() {
    super({
      name: 'Line',
      css : 'line',
      caption: 'Draw Line | shortcut: l, shift: toggles smooth',

      controls: [
        {
          name: 'Width',
          field:'size',
          type: 'slider',
          css:  'size',

          value: 1,
          min: 1,
          max: MAX_BRUSH_SIZE,
        },
        {
          name: 'Smooth',
          field: 'isAliased',
          type: 'checkbox',
          value: true,
        }
      ]
    })
  }

  onDown( canvas:CanvasManager, x:number, y:number ) {
    this.lastX1 = x,
    this.lastY1 = y,
    this.lastW  = 1,
    this.lastH  = 1
  },

  onDraw( ctx, x1, y1, x2, y2 ) {
    const size = this.size

    canvasUtils.clearCtx( ctx,
        this.lastX1, this.lastY1,
        this.lastW , this.lastH,
        size
    )

    this.lastX1 = x1
    this.lastY1 = y1
    this.lastW  = x2-x1
    this.lastH  = y2-y1

    if ( this.isAliased ) {
      ctx.beginPath()

      ctx.lineWidth = size
      ctx.moveTo( x1, y1 )
      ctx.lineTo( x2, y2 )
      ctx.closePath()

      ctx.stroke()
    // draw it by hand, pixel by pixel
    } else {
      drawPixelLine( ctx, x1, y1, x2, y2, size )
    }
  }

  onShift() {
    this.getControl( 'Smooth' ).click()
  }
})

