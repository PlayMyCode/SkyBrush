
export interface CtxBackupProperties {
  fillStyle                : FillStyle
  strokeStyle              : StrokeStyle
  lineCap                  : LineCap
  lineJoin                 : LineJoin
  lineWidth                : number
  globalAlpha              : number
  globalCompositeOperation : GlobalCompositeOperation 
}

export type FillStyle =
  | string
  | CanvasGradient
  | CanvasPattern

export type StrokeStyle =
  | string
  | CanvasGradient
  | CanvasPattern

export type LineCap =
  | 'butt'
  | 'round'
  | 'square'

export type LineJoin =
  | 'round'
  | 'bevel'
  | 'miter'

export type GlobalCompositeOperation =
  | 'source-over'
  | 'source-in'
  | 'source-out'
  | 'source-atop'
  | 'destination-over'
  | 'destination-in'
  | 'destination-out'
  | 'destination-atop'
  | 'lighter'
  | 'copy'
  | 'xor'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity'

export function newCtx(
    canvas : HTMLCanvasElement,
):CanvasRenderingContext2D {
  const ctx = canvas.getContext( '2d' )

  initialiseCtx( ctx )
  ctx.save()

  return ctx
}

export function backupCtx(
    ctx : CanvasRenderingContext2D,
):CtxBackupProperties {
  return {
    fillStyle                : ctx.fillStyle,
    strokeStyle              : ctx.strokeStyle,
    lineCap                  : ctx.lineCap,
    lineJoin                 : ctx.lineJoin,
    lineWidth                : ctx.lineWidth,
    globalAlpha              : ctx.globalAlpha,
    globalCompositeOperation : ctx.globalCompositeOperation,
  }
}

export function restoreCtx(
    ctx  : CanvasRenderingContext2D,
    info : CtxBackupProperties,
):void {
  ctx.fillStyle                = info.fillStyle
  ctx.strokeStyle              = info.strokeStyle
  ctx.lineCap                  = info.lineCap
  ctx.lineJoin                 = info.lineJoin
  ctx.lineWidth                = info.lineWidth
  ctx.globalAlpha              = info.globalAlpha
  ctx.globalCompositeOperation = info.globalCompositeOperation
}

/**
 * Set up sensible defaults for 2D canvas contexts.
 *
 * These aren't defaults for Painter,
 * but are to normalise cross-browser defaults,
 * as some browsers (*cough* Chrome) sometimes have buggy defaults.
 *
 * @private
 * @param ctx
 */
export function initialiseCtx(
    ctx : CanvasRenderingContext2D,
) {
  ctx.fillStyle   = 'white'
  ctx.strokeStyle = 'white'
  ctx.globalAlpha = 1
  ctx.lineWidth   = 1
  ctx.lineCap     = 'round'
  ctx.lineJoin    = 'round'
}

/**
 * Cleares the overlay on top of the painting canvas.
 */
export function clearCtx(
    ctx:CanvasRenderingContext2D,
    x:number,
    y:number,
    w:number,
    h:number,
    buffer:number,
):void {
  if ( w < 0 ) {
    w  = -w
    x -=  w
  }

  if ( h < 0 ) {
    h  = -h
    y -=  h
  }

  // increase the clear area by 1, by default
  // this is to account for any anti-aliasing
  x--
  y--

  w += 2
  h += 2

  x -= buffer
  y -= buffer
  w += buffer*2
  h += buffer*2

  x = Math.max( x, 0 )
  y = Math.max( y, 0 )
  w = Math.min( w, ctx.canvas.width  )
  h = Math.min( h, ctx.canvas.height )

  ctx.clearRect( x, y, w, h )
}

