
export interface CtxBackupProperties {
  fillStyle                : string
  strokeStyle              : string
  lineCap                  : LineCap
  lineJoin                 : LineJoin
  lineWidth                : number
  globalAlpha              : number
  globalCompositeOperation : GlobalCompositeOperation 
}

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

