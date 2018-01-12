
import { BrushCommand } from './brush-command'

/*
 * The state of the brush is kept in the canvas.
 * You see it will clear the path you have made
 * when you call 'beginPath'.
 *
 * So we call it once, when the mouse goes down,
 * and then just add points when it gets moved.
 * As a result the context stores all our points
 * for us.
 *
 * We just keep adding points, clear and stroke
 * on each move. At the end we call 'beginPath'
 * to clear it, but in practice any other brush
 * will call this anyway before they use the
 * context.
 */
class PaintBrush extends BrushCommand {
  constructor() {
    super({
      name: 'Brush',
      css : 'brush',
      caption: 'Paint Brush | shortcut: b, shift: switches to eraser',

      cursor: cursors.CIRCLE_CURSOR,
    })
  }

  onDown( canvas:CanvasManager, x:number, y:number ) {
    this.x =
        this.lastX =
        this.minX =
        this.maxX = x

    this.y =
        this.lastY =
        this.minY =
        this.maxY = y

    const ctx = canvas.getContext() as CanvasRenderingContext2D
    ctx.lineWidth = this.size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()

    /*
     * This is to trick it into starting a line,
     * when the mouse goes down.
     */
    ctx.moveTo( x-0.1, y-0.1 )
    ctx.lineTo( x, y )
    this.updateLine( canvas, x, y )

    canvas.hideOverlay()
    canvas.redrawUpscale( this.lastX, this.lastY, x-this.lastX, y-this.lastY, true, this.size*2 )
  }

  onMove( canvas:CanvasManager, x:number, y:number ) {
    this.updateLine( canvas, x, y )

    canvas.hideOverlay()
    canvas.redrawUpscale( this.lastX, this.lastY, x-this.lastX, y-this.lastY, true, this.size*2 )
  }

  onUp( canvas:CanvasManager, x:number, y:number ) {
    this.updateLine( canvas, x, y )

    // end the current path
    canvas.getContext().beginPath()

    this.setDrawArea(
        this.minX,
        this.minY,
        this.maxX-this.minX,
        this.maxY-this.minY,
        this.size,
    )
  }

  onShift( canvas:CanvasManager, x:number, y:number ) {
    switchToEraser( canvas, x, y )
  }

  updateLine( canvas:CanvasManager, x:number, y:number ) {
    const lastX = this.lastX = this.x
    const lastY = this.lastY = this.y

    this.x = x
    this.y = y

    this.minX = Math.min( this.minX, x )
    this.maxX = Math.max( this.maxX, x )
    this.minY = Math.min( this.minY, y )
    this.maxY = Math.max( this.maxY, y )

    const ctx = canvas.getContext() as CanvasRenderingContext2D
    canvasUtils.clearCtx(
        ctx,
        this.minX,
        this.minY,
        this.maxX - this.minX,
        this.maxY - this.minY,
        this.size
    )
    ctx.lineTo( x, y )
    ctx.stroke()
  }
}

