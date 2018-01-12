
import { BrushCommand } from './brush-command'

/**
 * A bespoke brush, specifically for pixelated drawing.
 */
abstract class PixelBrushCommand extends BrushCommand {
  private skipFirst = false

  constructor( setup ) {
    super( setup )
  }

  /**
   * This renders one frame of this pixel brush.
   */
  abstract onRender( canvas:CanvasManager, x:number, y:number );

  onDown( canvas:CanvasManager, x:number, y:number ) {
    this.lastX = x
    this.lastY = y
    this.skipFirst = true

    const size = Math.round( this.size )

    x -= (size/2) | 0
    y -= (size/2) | 0

    this.onRender( canvas, x, y, size )
    canvas.redrawUpscale( x|0, y|0, 0, 0, false, size )
    this.addDrawAreaAroundPoint( x, y, size )
  }

  onMove( canvas:CanvasManager, x:number, y:number ) {
    this.onMoveOnUp( canvas, x, y )
  }

  OnUp( canvas:CanvasManager, x:number, y:number ) {
    this.onMoveOnUp( canvas, x, y )
  }

  onMoveOnUp( canvas:CanvasManager, x:number, y:number ) {
    const size  = this.size
    const diffX = this.lastX - x
    const diffY = this.lastY - y

    if ( this.skipFirst && (Math.abs(diffX) >= 1 || Math.abs(diffY) >= 1) ) {
      this.skipFirst = false

      if ( diffX >= 1 ) {
        diffX--
        this.lastX--
      } else if ( diffX <= -1 ) {
        diffX++
        this.lastX++
      }

      if ( diffY >= 1 ) {
        diffY--
        this.lastY--
      } else if ( diffY <= -1 ) {
        diffY++
        this.lastY++
      }
    }

    const hasMovedAtLeastOnePixel = ( Math.abs(diffX) < 0.5 && Math.abs(diffY) < 0.5 )
    if ( ! hasMoveDAtLeastOnePixel ) {
      return
    }

    this.renderLine( canvas, x, y, this.lastX, this.lastY )
    canvas.redrawUpscale( x|0, y|0, diffX, diffY, false, size )
    this.addDrawArea( x|0, y|0, diffX, diffY, size )

    this.lastX = x
    this.lastY = y
  }

  private renderLine(
      canvas:CanvasManager,
      x1:number, y1:number,
      x2:number, y2:number,
  ) {
    const size = this.size

    x1 = Math.round( x1 - size / 2 )
    y1 = Math.round( y1 - size / 2 )
    x2 = Math.round( x2 - size / 2 )
    y2 = Math.round( y2 - size / 2 )

    const xDiff = x2 - x1
    const yDiff = y2 - y1

    const inc = Math.max(
        Math.abs( xDiff ),
        Math.abs( yDiff ),
    ) / size

    const xInc = ( xDiff / inc ) / size
    const yInc = ( yDiff / inc ) / size
    let x = x1
    let y = y1

    for ( let i = 0; i < inc; i++ ) {
      this.onRender( canvas, (x+0.5)|0, (y+0.5)|0, size )

      x += xInc
      y += yInc
    }
  }
}

