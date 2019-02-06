
import { ShapeGeometryCommand } from './shape-geometry-command'
import * as canvasUtils from 'util/canvas'

export class CircleCommand extends ShapeGeometryCommand {
  private isOutline = false
  
  constructor() {
    super({
      name: 'Circle',
      css : 'circle',
      caption: 'Draw Circle | shortcut: c, shift: toggles outline',
    })
  }

  onDraw( ctx, x1, y1, x2, y2 ) {
    canvasUtils.circlePath( ctx, x1, y1, x2-x1, y2-y1 )

    if ( this.isOutline ) {
      ctx.lineWidth = this.size
      ctx.stroke()
    } else {
      ctx.fill()
    }
  }

  onShift() {
    this.getControl( 'Mode' ).click()
  }
}
