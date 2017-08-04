
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
  const ctx = canvas.getContext( '2d' ) as CanvasRenderingContext2D

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
    lineCap                  : ctx.lineCap as LineCap,
    lineJoin                 : ctx.lineJoin as LineJoin,
    lineWidth                : ctx.lineWidth,
    globalAlpha              : ctx.globalAlpha,
    globalCompositeOperation : ctx.globalCompositeOperation as GlobalCompositeOperation,
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

/**
 * Sets up a circle path on the context given.
 *
 * This is everthing involved with drawing a circle
 * _but_ the actual stroke/fill.
 */
export function circlePath(
    ctx:CanvasRenderingContext2D,
    x:number, y:number,
    w:number, h:number,
) {
  const kappa = 0.5522848
  const ox = (w / 2) * kappa   // control point offset horizontal
  const oy = (h / 2) * kappa   // control point offset vertical
  const xe = x + w             // x-end
  const ye = y + h             // y-end
  const xm = x + w / 2         // x-middle
  const ym = y + h / 2         // y-middle

  ctx.beginPath()
  ctx.moveTo( x, ym )
  ctx.bezierCurveTo( x      , ym - oy, xm - ox, y      , xm, y  )
  ctx.bezierCurveTo( xm + ox, y      , xe     , ym - oy, xe, ym )
  ctx.bezierCurveTo( xe     , ym + oy, xm + ox, ye     , xm, ye )
  ctx.bezierCurveTo( xm - ox, ye     , x      , ym + oy, x , ym )
  ctx.closePath()
}

export function renderCrossHair( ctx:CanvasRenderingContext2D, size:number ):void {
  ctx.lineCap   = 'round'
  ctx.lineWidth = 1

  const halfSize = size / 2

  ctx.beginPath()

  // top middle line
  ctx.moveTo( halfSize, 0          )
  ctx.lineTo( halfSize, halfSize-2 )

  // bottom middle line
  ctx.moveTo( halfSize, halfSize+2 )
  ctx.lineTo( halfSize, size       )

  // left line
  ctx.moveTo( 0         , halfSize )
  ctx.lineTo( halfSize-2, halfSize )

  // right line
  ctx.moveTo( size      , halfSize )
  ctx.lineTo( halfSize+2, halfSize )

  ctx.stroke()

  // a dot in the centre
  ctx.fillRect( halfSize-0.5, halfSize-0.5, 1, 1 )
}
