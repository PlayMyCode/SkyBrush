
import * as constants from 'setup/constants'
import { MinMaxArea, SizeArea, Position } from 'util/area'
import { Nullable, Consumer, Consumer2, Consumer3 } from 'util/function-interfaces'
import * as canvasUtils from 'util/canvas'
import * as htmlUtils from 'util/html'
import * as colourUtils from 'util/colours'
import * as mathsUtils from 'util/maths'
import * as events from 'util/events'
import * as skybrush from 'skybrush'

export * from 'skybrush'

/**
 * @license
 *
 * SkyBrush - skybrush
 *
 * Copyright (c) 2012 Joseph Lenton
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of the <organization> nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * SkyBrush
 *
 * An embeddable, HTML5 Canvas powered, based art painting
 * application!
 *
 * It allows you to have a canvas, which can be moved around
 * and zoomed, floating dialog boxes on top of the canvas,
 * various brushes you can use for painting, colour picker,
 * and more!
 *
 * = Features =
 *  - easy embeddable painting application
 *  - Cross browser; supports IE 9+, Firefox, Chrome, Safari and Opera
 *  - single interface for setting/getting/manipulating content
 *  - no cruft! It's just an art package, you can add your own stuff around it.
 *
 * = Controls =
 *
 * These commands switch to a tool (a Command):
 *
 *  p - pencil
 *  b - brush
 *  w - webby/shading brush
 *  e - eraser
 *  r - rectangle
 *  c - circle
 *  l - line
 *  s - select
 *  m - move
 *  f - fill
 *  z - zoom
 *  k - colour picker
 *
 * These commands do stuff:
 *
 *  shift+mousewheel - zooms in and out
 *
 *  delete - clears selection (or everything if no selection)
 *  ctrl+z - undo
 *  ctrl+r, ctrl+y - redo
 *
 *  ctrl+x - cut selection
 *  ctrl+c - copy selection
 *  ctrl+v - paste
 *  ctrl+e - crop
 *  ctrl+a - select all
 *
 * @dependencies jQuery
 * @author Joseph Lenton
 *
 * @param window The browser Window.
 * @param document The document HTML Dom document.
 */

/*
 * Read this first section up till 'Canvas Pixels'. The rest
 * you can skip, but come back to if you see those terms else
 * where in the code.
 *
 * SkyBrush is built as an event based system. The idea is that
 * you should just send changes to SkyBrush, who in turn
 * propogates them to the other components.
 *
 * To update, you listen on those events, and wait to be called.
 *
 * This means in practice that events might update twice, or
 * be asked to perform updates which are not needed. This is a
 * small price to pay for making the code _much_ simpler.
 *
 * The alternative would be for every component to need to
 * know about every other component, which would not be
 * pleasent to code against!
 *
 * = 'Canvas Pixels' =
 *
 * There are two co-ordinate systems in SkyBrush. These
 * are:
 *
 *  - canvas pixels - This means it is based on the original
 *    canvas size. So if the canvas is 100 by 100, and it's
 *    zoomed in at 300%, then the canvas is 300 by 300.
 *
 *    However canvas pixels is still a value from 0 to 100,
 *    because it ignores zoom!
 *
 *  - mouse location - the mouse in relation to the canvas.
 *    This does not ignore zoom, and so the canvas would be
 *    located from 0 to 300.
 *
 * Locations can be given outside of those ranges, it is
 * simply ignored, or some other special logic is done.
 *
 * The point is to remember that we have a canvas which
 * internally has no zoom applied to it, but externally it
 * does.
 */

/**
 * The functions used for rendering the custom cursors.
 * These are functions, in the form:
 *
 *      ( ctx:Canvas:2DContext, canvas:HTMLCanvasElement, size:number ) ->
 *
 * They can draw to the canvas, but shouldn't resize it. The size is
 * provided as advice, on how big they should render, and so may match the
 * actual size of the canvas.
 *
 * These functions should also set their own colours, and alpha
 * transparency, for when they draw.
 */
type RenderFunction =
  Consumer3<CanvasRenderingContext2D, HTMLCanvasElement, number>

const BRUSH_RENDER_FUNCTIONS = {
  CROSSHAIR: (() => {
    const renderCrossHair = function( ctx:CanvasRenderingContext2D, size:number ) {
      const halfSize = size / 2

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

    return ( ctx:CanvasRenderingContext2D, _canvas:HTMLCanvasElement, size:number ) => {
      ctx.globalAlpha = 0.75

      ctx.strokeStyle = ctx.fillStyle = '#fff'
      ctx.translate( 0.2, 0.2 )
      renderCrossHair( ctx, size )

      ctx.strokeStyle = ctx.fillStyle = '#000'
      ctx.translate( -0.4, -0.4 )
      renderCrossHair( ctx, size )
    }
  })(),

  SQUARE: ( ctx:CanvasRenderingContext2D, canvas:HTMLCanvasElement, size:number ) => {
    const middle   = canvas.width/2
    const halfSize = size/2

    // an outer square
    ctx.strokeStyle = '#fff'
    ctx.globalAlpha = 0.9
    ctx.strokeRect(
        (middle-halfSize)+0.4,
        (middle-halfSize)+0.4,
        size-0.8,
        size-0.8
    )

    // an outer square
    ctx.strokeStyle = '#000'
    ctx.globalAlpha = 1
    ctx.strokeRect(
        middle-halfSize,
        middle-halfSize,
        size,
        size
    )
  },

  CIRCLE: ( ctx:CanvasRenderingContext2D, canvas:HTMLCanvasElement, size:number ) => {
    const middle = canvas.width/2
    const halfSize = size = 2

    // an inner circle
    ctx.strokeStyle = '#fff'
    ctx.globalAlpha = 0.9
    circlePath( ctx,
        (middle-halfSize)+0.7,
        (middle-halfSize)+0.7,
        size-1.4,
        size-1.4
    )
    ctx.stroke()

    // an outer circle
    ctx.strokeStyle = '#000'
    ctx.globalAlpha = 1
    circlePath( ctx,
        middle - halfSize,
        middle - halfSize,
        size,
        size
    )
    ctx.stroke()
  },
}

/**
 * @const
 */
const DEFAULT_GRID_WIDTH  = 5 // pixels
const DEFAULT_GRID_HEIGHT = 5 // pixels

const MAX_NATIVE_CURSOR_SIZE = 128

/**
 * Warning, this should always be greater than the time it takes to
 * open or close the GUI pane, due to a bug in Chrome.
 */
const CANVAS_LAZY_REFLOW_DELAY = 180

/**
 * @const
 * @type {string}
 */
const NO_CURSOR_CSS = 'sb_cursor_none'

/**
 * The size of the crosshair brush.
 */
const CROSSHAIR_CURSOR_SIZE = 19

/**
 * A data url, of a crosshair, for use as a cursor.
 *
 * It's generated once, to avoid generating it multiple times, during
 * use.
 */
const CROSSHAIR_CURSOR_DATA_URL = (() => {
  const canvas = document.createElement( 'canvas' )
  canvas.width = canvas.height = CROSSHAIR_CURSOR_SIZE

  const ctx = canvas.getContext( '2d' ) as CanvasRenderingContext2D

  ctx.beginPath()
  ctx.lineCap   = 'round'
  ctx.lineWidth = 1

  BRUSH_RENDER_FUNCTIONS.CROSSHAIR( ctx, canvas, CROSSHAIR_CURSOR_SIZE )

  return canvas.toDataURL()
})()

/**
 * The the total cursor size is below this,
 * then it's swapped out,
 * and a crosshair is used instead.
 *
 * @const
 * @type {number}
 */
const BRUSH_CURSOR_MINIMUM_SIZE = 5

/**
 * The number of pixels to add onto the brush canvas,
 * when it's being drawn.
 *
 * These are extra pixels around the edge, as a little padding.
 *
 * If the edge of the brush is too flat, because it's being cut off,
 * then just increase this value and it should get fixed.
 */
const BRUSH_CURSOR_PADDING = 2

/**
 * The default size for brushes.
 *
 * @const
 * @type {number}
 */
const DEFAULT_BRUSH_SIZE = 2

/**
 * The prefix added to command css classes.
 *
 * So 'picker' becomes 'sb_command_picker' if
 * the prefix is 'sb_command_'.
 *
 * @const
 * @type {string}
 */
const COMMAND_CSS_PREFIX = 'sb_command_'

/**
 * @const
 * @type {string}
 */
const CONTROL_CSS_PREFIX = 'sb_control_'

/**
 * Minimum width of a horizontal/vertical line on the colour
 * pixker.
 *
 * @const
 * @type {number}
 */
const COLOUR_MIXER_MIN_WIDTH = 3

/**
 * The width, in pixels, of the colour mixer.
 *
 * This should match the CSS.
 *
 * @const
 * @type {number}
 */
const COLOUR_MIXER_WIDTH = 140

/**
 * The width of the colour wheel,
 * must match the CSS.
 *
 * @const
 * @type {number}
 */
const COLOUR_WHEEL_WIDTH = 77

const UPSCALE_BACK_OFFSET_MOD = 16

/**
 * @const
 * @type {string}
 */
const CONTROL_ID_CSS_PREFIX = '__skybrush_control_css_id_'

/**
 * When scrolling, the canvas will wait this amount of time
 * before it tries to display the upscale.
 *
 * This is to allow people to continously scroll without it
 * freezing up on them.
 *
 * @const
 * @type {number}
 */
const UPSCALE_SCROLL_DELAY = 350

/**
 *
 * @const
 * @type {number}
 */
const UPSCALE_DIVIDE_AREA = 400

/**
 * The speed of the animation when updating the canvas size/position
 *
 * @const
 * @type {number}
 */
const CANVAS_UPDATE_SPEED = 200

/**
 * The number of canvas' to store internally in the undo stack
 * this equates to how many times you can click back 'undo'.
 *
 * @const
 * @type {number}
 */
const UNDO_STACK_SIZE = 40

/**
 * The maximum zoom level.
 *
 * min zoom is: 1 / MAX_ZOOM
 *
 * @const
 * @type {number}
 */
const MAX_ZOOM = 16

/**
 * The maximum brush size allowed.
 *
 * @const
 * @type {number}
 */
const MAX_BRUSH_SIZE = 50

/*
 * WARNING! All colours _MUST_ be 6 values hex values!
 */

const NUM_COLORS_IN_PALETTE_COLUMN = 5

/**
 * The colours present in the colour palette.
 *
 * Add/remove from this list to have different colours.
 *
 * @const
 * @type {Array.<string>}
 */
const DEFAULT_COLORS = (function() {
  /*
   * Colors are laid out in groups, we then re-arrange so they are
   * laid out in columns instead, and can be 'just dumped', into the
   * DOM.
   */
  const colors = [
      // for colours see: http://en.wikipedia.org/wiki/Web_colors

      /* Greys */
      '#ffffff',
      '#c3c1c1',
      '#8b8a8a',
      '#474747',
      '#000000',

      /*colours*/
      '#ffcdcc',
      '#ff8d8a',
      '#ff0600',
      '#990400',
      '#630200',

      '#FFE7CD',
      '#FFC78A',
      '#FF8601',
      '#995001',
      '#633400',

      '#FFFDCC',
      '#FFFA8A',
      '#FFF500',
      '#999301',
      '#635E00',

      '#CDF5D0',
      '#8DE992',
      '#06D211',
      '#037E0A',
      '#045207',

      '#D4F0FE',
      '#9DDEFE',
      '#28B5FD',
      '#1A6D99',
      '#104662',

      '#CCCEFF',
      '#8A90FF',
      '#000CFF',
      '#010799',
      '#000563',

      '#FFCCED',
      '#FF8AD8',
      '#FF00A8',
      '#980065',
      '#630041',
  ]

  const cols = new Array()
  for ( let i = 0; i < NUM_COLORS_IN_PALETTE_COLUMN; i++ ) {
    for ( let j = i; j < colors.length; j += NUM_COLORS_IN_PALETTE_COLUMN ) {
      cols.push( colors[j] )
    }
  }

  return cols
})()

/**
 * Algorithm for copying data from src to the destination
 * canvas, using a nearest neighbour algorithm.
 *
 * For scaling, this does not use the width and height!
 * It uses the 'pixelWidth' and 'pixelHeight' values. Why?
 * It is so you can  upscale a dirty region on the
 * destination.
 *
 * The size of a pixel from src is always 1. So if you are
 * scaling to twice the size, then pixel width and height
 * should be 2. If it's 3 and a half times, then they
 * should be 3.5.
 *
 * If your scaling down, then it's a value less then 1.
 * i.e. it's 0.5 for half the size, and 0.25 for a quarter.
 *
 * Pixel width and height are seperate so you can scale
 * in the x and y directions by different scales.
 *
 * Optimizations include:
 *  = using UInt8ClampedArray where available
 *  = look aheads when drawing, to draw a strip rather
 *    then indevidual rectangles.
 *  = iterating across the src as a flat array, rather
 *    then working out 2d indexes.
 *  = caching colour and alpha changes
 *  = multiple code paths, for eliminating un-needed work.
 *  = fast positive round bitshifting
 *  = lots of manual changes, like inlining assignments (yes it's faster)
 *
 * Note that the src is canvas image data, the value
 * returned from calling 'ctx.getImageData'. This is to
 * allow both dest and src to be the same, by getting out
 * the data, resizing it, and then passing src in as dest.
 *
 * The overlay is the same, but it is also optional. Just
 * leave it out if you don't need it.
 *
 * forceSrcAlpha is a flag to only use the alpha component
 * from the src data, when mixing with the overlay.
 *
 * If it's true, then the overlay will only show up where
 * the src has an alpha value which is greater then 1.
 * This transparent areas stay transparent.
 *
 * Even then, if the overlay has full alpha, and src has
 * 0.5 alpha, then the destination is drawn with 0.5 alpha.
 *
 * Due to floating point rounding errors, this only works
 * on scaling images with sizes less then 1 million pixels
 * wide.
 *
 * @const
 *
 * @param dest HTML5 Canvas to use for drawing the scaling to.
 * @param startX Where to start drawing to on the destination.
 * @param startY Y start location for drawing on the destination.
 * @param destW Size of drawing area on destination.
 * @param destH Size of drawing area on destination.
 *
 * @param pixelWidth The width of a pixel on destination.
 * @param pixelHeight The height of a pixel on the destination.
 *
 * @param sData The source pixel data.
 * @param x The x co-ordinate of where you are reading from on src and overlay.
 * @param y The y co-ordinate of where we are copying from on src and overlay.
 * @param w The width of both src and overlay pixel data.
 * @param h The height of both the src and overlay pixel data.
 * @param oData Optional, overlay canvas pixels to copy from when blending.
 *
 * @param forceSrcAlpha Optional, when true, overlay is written using the alpha component on src.
 */
/*
 * Note that this is built with up scaling in mind, where
 * destination is larger then the src. Down scaling works
 * fine, but it's optimized for up scaling.
 */
function copyNearestNeighbour(
    dest:HTMLCanvasElement,

    startX:number, startY:number,
    destW:number, destH:number,

    pixelWidth:number, pixelHeight:number,

    srcImage:ImageData, _x:number, _y:number, _w:number, _h:number,
    overlayImage:ImageData|null,

    forceSrcAlpha:boolean,
) {
  const includeOverlay = !! overlayImage

  const dCtx = dest.getContext('2d') as CanvasRenderingContext2D

  const sData = new Int32Array( srcImage.data.buffer )
  const oData = ( overlayImage
      ? new Int32Array( overlayImage.data.buffer )
      : null
  )

  let endX = startX + destW
  let endY = startY + destH

  /*
   * Takes off a little from the end, if pixelWidth/Height
   * is not a whole number. This is to account for
   * floating point number rounding errors.
   */
  if ( pixelWidth % 1 !== 0 ) {
    endX -= 0.000001
  }

  if ( pixelHeight % 1 !== 0 ) {
    endY -= 0.000001
  }

  dCtx.clearRect( startX, startY, (destW|0), (destH|0) )

  dCtx.fillStyle = '#000'
  dCtx.globalAlpha = 1

  /*
   * This optimization is about avoiding calls to update
   * fillStyle and globalAlpha.
   *
   * This saves about 10% to 20%
   */
  let lastColor = 0
  let lastAlpha = 255

  // location of the pixel in both canvas and overlay
  let i = 0
  let drawY = startY

  while ( drawY < endY ) {
    const nextY = drawY + pixelHeight
    const drawYI = ((0.5 + drawY) | 0)
    const diffY = ((0.5 + nextY) | 0) - drawYI

    let drawX = startX

    while ( drawX < endX ) {
      let nextX = drawX + pixelWidth
      const cRGB = sData[i]
      const oRGB = ( oData !== null ? oData[i] : 0 )
      const ca = (cRGB >> 24) & 0xFF
      const oa = (oRGB >> 24) & 0xFF

      /*
        * Skip Transparency When:
        *  = canvas and overlay are empty
        *  = using destination alpha and canvas is empty
        */
      if ( ! (
          ca === 0 && ( oa === 0 || forceSrcAlpha )
      ) ) {
        const nowDrawX = ((0.5 + drawX) | 0)
        let r = 0
        let g = 0
        let b = 0

        // overlay is blank
        if ( oa === 0 ) {
          r =  cRGB        & 0xFF
          g = (cRGB >> 8 ) & 0xFF
          b = (cRGB >> 16) & 0xFF

          if ( ca !== lastAlpha ) {
            dCtx.globalAlpha = ( lastAlpha = ca ) / 255.0
          }
        // full overlay alpha
        } else if ( oa === 255 && forceSrcAlpha === false ) {
          r =  oRGB        & 0xFF
          g = (oRGB >>  8) & 0xFF
          b = (oRGB >> 16) & 0xFF

          if ( lastAlpha !== 255 ) {
            dCtx.globalAlpha = 1
            lastAlpha = 255
          }
        // canvas is blank
        } else if ( ca === 0 ) {
          // nothing will be drawn using forceSrcAlpha, so just move on
          r =  oRGB        & 0xFF
          g = (oRGB >>  8) & 0xFF
          b = (oRGB >> 16) & 0xFF

          if ( oa !== lastAlpha ) {
            dCtx.globalAlpha = (lastAlpha = oa) / 255.0
          }
        // mix canvas and overlay
        } else if ( forceSrcAlpha ) {
          /*
            * If we have full overlay alpha,
            * then no mixing is needed,
            * as the overlay will 100% win anyway.
            */
          if ( oa === 255 ) {
            r =  oRGB        & 0xFF
            g = (oRGB >>  8) & 0xFF
            b = (oRGB >> 16) & 0xFF
          } else {
            const oaPercent = ( oa / 255.0 )
            const iOa = 1 - oaPercent

            r = ( cRGB        & 0xFF)*iOa + ( oRGB        & 0xFF)*oaPercent
            g = ((cRGB >>  8) & 0xFF)*iOa + ((oRGB >>  8) & 0xFF)*oaPercent
            b = ((cRGB >> 16) & 0xFF)*iOa + ((oRGB >> 16) & 0xFF)*oaPercent

            // fast, positive only, rounding
            r = (r+0.5) | 0
            g = (g+0.5) | 0
            b = (b+0.5) | 0
          }

          if ( ca !== lastAlpha ) {
            dCtx.globalAlpha = (lastAlpha = ca) / 255.0
          }
        } else {
          r =  cRGB        & 0xFF
          g = (cRGB >>  8) & 0xFF
          b = (cRGB >> 16) & 0xFF

          if ( ca !== lastAlpha ) {
            dCtx.globalAlpha = (lastAlpha = ca) / 255.0
          }

          const nextColor = (r << 16) | (g << 8) | b
          if ( nextColor !== lastColor ) {
            dCtx.fillStyle = colourUtils.rgbToColor( r, g, b )
            lastColor = nextColor
          }

          dCtx.fillRect(
              nowDrawX,
              drawYI,
              ((0.5 + nextX) | 0) - nowDrawX,
              diffY
          )

          // draw Overlay on top
          r =  oRGB        & 0xFF
          g = (oRGB >>  8) & 0xFF
          b = (oRGB >> 16) & 0xFF

          if ( oa !== lastAlpha ) {
            dCtx.globalAlpha = ( lastAlpha = oa ) / 255.0
          }
        }

        /*
          * next color _must_ be hand mixed,
          * because we cannot use cRGB or oRGB.
          *
          * The reason why is because we would have to mix
          * them, to account for the various ways that the
          * above rendering could be done.
          *
          * So either way, we have mixing : ( .
          */
        const nextColor = (r << 16) | (g << 8) | b
        if ( nextColor !== lastColor ) {
          dCtx.fillStyle = colourUtils.rgbToColor( r, g, b )
          lastColor = nextColor
        }

        if ( ! includeOverlay ) {
          /*
            * This funky-for-loop crawls forward,
            * along the x axis of the pixels,
            * if the next pixel is the same.
            *
            * This allows us to draw a strip,
            * rather then a single pixel,
            * which is significantly faster!
            */
          for (
            ;
            (nextX < endX) && (sData[i+1] === cRGB);
              nextX += pixelWidth, i++
          ) { }

          dCtx.fillRect(
              nowDrawX,
              drawYI,
              ((0.5 + nextX) | 0) - nowDrawX,
              diffY
          )
        } else {
          dCtx.fillRect(
              nowDrawX,
              drawYI,
              ((0.5 + nextX) | 0) - nowDrawX,
              diffY
          )
        }
      }

      i++
      drawX = nextX
    }

    drawY = nextY
  }
}

export interface SliderOptions {
  min   : number 
  max   : number 
  step  : number 
  value : number 

  onChange : Consumer2<number, number>
}

/**
 * A generic, reusable, horizontal slider.
 *
 * You can use the 'slide' method to attach functions to be called when this
 * slides.
 *
 * You can also add any classes to it.
 *
 * ASCII art impression of control:
 *
 *   -------[]---
 *
 * This will use the input 'range' type where available.
 *
 * @return A jQuery object (a div), which is pre-built and setup as a slider.
 */
/*
 * Ok, so how does this work? Either a HTML5 input range or a custom
 * slider gets generated.
 *
 * This then has an API directly pasted onto the object which is the
 * most *basic* API possible. Direct getters and setters, and visual
 * cues, that's it.
 *
 * They both have a more complex API built on top, which is the API
 * that does the 'slideUp', 'slideDown', setting and running of slide
 * events.
 *
 * The idea is to push the clever code up the stack, so it's shared,
 * and keep the lower code where it's different as basic as possible.
 */
export function newSlider( options:SliderOptions ) {
  const sliderBarInput = newInput( 'range', 'skybrush_slider_bar' )

  // default min/max/step values
  sliderBarInput.min   = options.min + ''
  sliderBarInput.max   = options.max + ''
  sliderBarInput.step  = options.step + ''
  sliderBarInput.value = options.value + ''

  /**
   * Allows adding slide events, run when this slides.
   */
  const onChange = options.onChange
  sliderBarInput.addEventListener( 'change', () => {
    const val = parseFloat( sliderBarInput.value )
    const min = parseFloat( sliderBarInput.min   )
    const max = parseFloat( sliderBarInput.max   )

    const p = mathsUtils.rangeToPercent( val, min, max )

    onChange( val, p )
  })

  return sliderBarInput
}

export function newGridLine( direction:GridDirection, x:number, y:number ) {
  const gridLine = htmlUtils.newDiv( `skybrush_grid_line is-${direction}` )
  gridLine.style.transform = `translate( ${x}px, ${y}px )`

  return gridLine
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

/**
 * The UndoStack manages the undo/redo functionality in SkyBrush.
 *
 * It does this through a series of stacks,
 * which it switches between.
 *
 * Once this goes beyond the alotted size, then old undo's will
 * no longer be stored, and will fall out of memory. Although there
 * if always a base undo canvas, which has everything up to that
 * point stored on it.
 *
 * @constructor
 * @private
 *
 * @param size The number of undo's allowed.
 */
export class UndoStack {
  private index     : number
  private undoIndex : number
  private maxRedo   : number

  /// 
  /// The maximum number of canvases we will ever hold.
  /// 
  private readonly maxSize : number

  /// 
  /// Where we are holding our redo/undo canvases.
  /// 
  private readonly canvases : HTMLCanvasElement[]

  constructor( size:number, firstCanvas:HTMLCanvasElement ) {
    // the +1 is for the checks later
    this.maxSize   = size + 1
    this.index     = 0
    this.undoIndex = 0
    this.maxRedo   = 0

    this.reset( firstCanvas )
  }

  reset( firstCanvas:HTMLCanvasElement ):this {
    this.index     = 0
    this.undoIndex = 0
    this.maxRedo   = 0

    const first = htmlUtils.newCanvas( firstCanvas.width, firstCanvas.height )
    const ctx   = first.getContext( '2d' ) as CanvasRenderingContext2D

    ctx.drawImage( firstCanvas, 0, 0 )

    this.canvases.length = 0
    this.canvases.push( first )

    return this
  }

  /**
   * @param canvas The current canvas.
   * @return canvas The canvas to use for the future.
   */
  add( canvas:HTMLCanvasElement ):this {
    const undoCanvas = this.grabUndoCanvas( canvas.width, canvas.height )
    const ctx        = undoCanvas.getContext( '2d' ) as CanvasRenderingContext2D

    ctx.drawImage( canvas, 0, 0 )
    this.canvases[ this.undoIndex ] = undoCanvas

    return this
  }

  /**
   * This will give you a new canvas you can use for the undo stack.
   * This might be an old canvas being recycled.
   * It might be a totally new canvas.
   */
  private grabUndoCanvas( width:number, height:number ):HTMLCanvasElement {
    // We've hit the max size of the undo stack.
    // So we must shift an old canvas out and return it.
    if ( this.undoIndex === this.maxSize ) {
      const undoCanvas = this.canvases.shift()

      if ( ! undoCanvas ) {
        return htmlUtils.newCanvas( width, height )
      }

      undoCanvas.width  = width
      undoCanvas.height = height

      return undoCanvas
    }

    this.undoIndex++
    this.maxRedo = this.undoIndex

    // Write over the top of an old 'redo' canvas
    if ( this.undoIndex < this.canvases.length ) {
      const undoCanvas = this.canvases[ this.undoIndex ]
      undoCanvas.width  = width
      undoCanvas.height = height

      return undoCanvas
    }

    // No undo canvases to reuse.
    // So lets return a new one.
    return htmlUtils.newCanvas( width, height )
  }

  /**
   * Invalidates all possible redo actions.
   *
   * What does this mean in practice? Well if you have drawn something,
   * then used undo, the first item is now stored as a 'future' item.
   * This is something that will be restored when the 'redo'.
   *
   * But if you draw something else, without redo'ing, then that redo
   * should no longer be available. Call this method to say "all of
   * the redo's you have available, invalidate them".
   *
   * In practice, this is done internally for you, when you add items.
   */
  clearRedo():this {
    for ( let i = this.undoIndex; i < this.canvases.length; i++ ) {
      this.canvases.pop()
    }

    return this
  }

  /**
   * @return True if calling 'undo' will undo the current canvas.
   */
  hasUndo():boolean {
    return this.undoIndex > 0
  }

  /**
   * @return True if there is history to redo.
   */
  hasRedo():boolean {
    return this.undoIndex < this.maxRedo
  }

  /**
   * This does nothing if there is nothing to undo.
   */
  undo():Nullable<HTMLCanvasElement> {
    if ( this.hasUndo() ) {
      this.undoIndex--

      const canvas = this.canvases[ this.undoIndex ]

      return canvas
    }

    return null
  }

  /**
   * This does nothing if there is nothing to redo.
   */
  redo():Nullable<HTMLCanvasElement> {
    if ( this.hasRedo() ) {
      this.undoIndex++

      return this.canvases[ this.undoIndex ]
    }

    return null
  }
}

export type GridDirection =
  | 'horizontal'
  | 'vertical'

/**
 * The GridManager wraps up all of the grid handling for the canvas.
 * It's very closely tied to the CanvasManger,
 * and exists pretty much solely to make the code a little more
 * modular.
 *
 * @constructor
 */
export class GridManager {
  private readonly dom : HTMLElement 

  private offsetX : number 
  private offsetY : number 

  /// 
  /// The width of each grid section. So it could be 5, or 10.
  /// In pixels.
  /// 
  private gridW : number 
  
  /// 
  /// The height of each grid section. So it could be 5, or 10.
  /// In pixels.
  /// 
  private gridH : number 

  private zoom : number 

  /**
   * This updates in a lazy way.
   *
   * The isDirty flag is denoted to state that the dom does need to update when
   * it is shown.
   */
  private isDirty : boolean 

  constructor ( viewport:HTMLElement ) {
    const dom = document.createElement( 'div' )
    dom.className = 'skybrush_grid'

    this.dom = dom
    viewport.appendChild( dom )

    this.offsetX = 0
    this.offsetY = 0
    this.gridW  = DEFAULT_GRID_WIDTH
    this.gridH = DEFAULT_GRID_HEIGHT

    this.zoom = 1
    this.isDirty = true
  }

  /**
   * Sets the size of the grid squares, in pixels.
   */
  setSize( w:number, h:number ):this {
    w = Math.max( w|0, 0 )
    h = Math.max( h|0, 0 )

    if ( w !== this.gridW || h !== this.gridH ) {
      this.gridW = w
      this.gridH = h

      this.update()
    }

    return this
  }

  getWidth() {
    return this.gridW
  }

  getHeight() {
    return this.gridH
  }

  getOffsetX() {
    return this.offsetX
  }

  getOffsetY() {
    return this.offsetY
  }

  /**
   * Allows you to offset the location of the grid,
   * from the top left corner,
   * by the amounts given.
   */
  setOffset( x:number, y:number ):this {
    if ( isNaN(x) ) {
      x = 0
    } else {
      x = x|0
    }

    if ( isNaN(y) ) {
      y = 0
    } else {
      y = y|0
    }

    if ( x < 0 ) {
      x = - ( x % this.gridW )
      x = this.gridW - x
    }

    if ( y < 0 ) {
      y = - ( y % this.gridH )
      y = this.gridH - y
    }

    const update = ( this.offsetX !== x || this.offsetY !== y )
    if ( update ) {
      this.offsetX = x
      this.offsetY = y

      this.update()
    }

    return this
  }

  isShown() {
    return this.dom.classList.contains( 'sb_show' )
  }

  show():this {
    if ( this.isDirty ) {
      this.populateWithGridLines()
      this.isDirty = false
    }

    this.dom.classList.add( 'sb_show' )

    return this
  }

  hide():this {
    this.dom.classList.remove( 'sb_show' )

    return this
  }

  /**
   * Moves this grid to the area stated,
   * and re-organizes the grid to look how it's shown.
   *
   * The CanvasManager does work to located the upscale
   * canvas to fill the proper canvas. To avoid duplicating
   * this code, this method is provided to allow the canvas
   * to just pass the results on to this grid.
   */
  updateViewport(
      canvasX:number,
      canvasY:number,
      width:number,
      height:number,
      zoom:number,
  ):this {
    this.zoom = zoom

    this.dom.style.width  = (width+1 ) + 'px'
    this.dom.style.height = (height+1) + 'px'
    this.dom.style.transform = `translate( ${canvasX}px, ${canvasY}px )`

    this.update()

    return this
  }

  /**
   * Updates the layout of the grid.
   *
   * This should be called right after any properties have
   * been altered, but is only used internally.
   *
   * Calls such as 'setSize' and 'setOffset' already call
   * this automatically.
   */
  private update() {
    if ( this.isShown() ) {
      this.populateWithGridLines()
      this.isDirty = false
    } else {
      this.isDirty = true
    }
  }

  /**
   * This builds the grid lines and places then inside this DOM.
   *
   * This is bit the of code that actually really will put down grid lines.
   */
  private populateWithGridLines():void {
    populateWithGridLines(
        this.dom,
        this.offsetX,
        this.offsetY,
        this.gridW,
        this.gridH,
        this.zoom,
    )
  }
}

/**
 * This builds the grid lines and places then inside this DOM.
 *
 * This is bit the of code that actually really will put down grid lines.
 */
function populateWithGridLines(
    dom : HTMLElement,
    offsetX : number,
    offsetY : number,
    gridW : number,
    gridH : number,
    zoom : number,
):void {
  const domW = dom.offsetWidth
  const domH = dom.offsetHeight

  const xInc = Math.max( zoom * gridW, 1 )
  const yInc = Math.max( zoom * gridH, 1 )

  const startX = ( offsetX % gridW ) * zoom
  const startY = ( offsetY % gridH ) * zoom

  dom.innerHTML = ''
  for ( let x = startX; x <= domW; x += xInc ) {
    dom.appendChild( newGridLine('vertical', x, 0) )
  }

  for ( let y = startY; y <= domH; y += yInc ) {
    dom.appendChild( newGridLine('horizontal', 0, y) )
  }
}

/**
 * Originally the marquee selector and the grid and things like that were
 * all implemented as totally seperate components. However over time, they
 * ended up with a lot of similar code.
 *
 * So this was created as an object they can use to help contain that common
 * code.
 */
export class ViewOverlay {
  private readonly dom : HTMLElement

  private x : number
  private y : number
  private w : number
  private h : number

  private zoom : number

  private canvasX : number
  private canvasY : number

  private lastLeft : number
  private lastTop  : number

  private lastHeight : number
  private lastWidth  : number

  constructor( viewport:HTMLElement, className:string ) {
    this.dom = htmlUtils.newDiv( className )

    viewport.appendChild( this.dom )

    this.x = 0
    this.y = 0
    this.w = 0
    this.h = 0

    this.zoom = 1

    this.canvasX = 0
    this.canvasY = 0

    this.lastLeft = 0
    this.lastTop  = 0

    // set to invalid values so the first time a width/height is set,
    // it'll be guaranteed to go through
    this.lastHeight = -1
    this.lastWidth  = -1
  }

  addClass( klass:string ):this {
    this.dom.classList.add( klass )

    return this
  }

  hasClass( klass:string ):boolean {
    return this.dom.classList.contains( klass )
  }

  removeClass( klass:string ):this {
    this.dom.classList.remove( klass )

    return this
  }

  append( child:HTMLElement ):this {
    this.dom.appendChild( child )

    return this
  }

  /**
   * Takes canvas pixels, and resizes to DOM pixels.
   */
  setCanvasSize( x:number, y:number, w:number, h:number ):this {
    const zoom = this.zoom

    const left = (this.canvasX + x*zoom + 0.5)|0
    const top  = (this.canvasY + y*zoom + 0.5)|0

      /* -2 is to accommodate the 2-pixel border width in the CSS */
    const width = Math.max( 0, ((w*zoom)|0)-2 )
    const height= Math.max( 0, ((h*zoom)|0)-2 )

    /*
     * Only update teh changes we have to.
     */
    if ( left !== this.lastLeft || top !== this.lastTop ) {
      this.lastLeft = left
      this.lastTop  = top

      this.dom.style.transform = `translate( ${left}px, ${top}px )`
    }

    if ( width !== this.lastWidth ) {
      this.lastWidth = width
      this.dom.style.width = `${width}px`
    }
    if ( height !== this.lastHeight ) {
      this.lastHeight = height
      this.dom.style.height = `${height}px`
    }

    return this
  }

  /**
   * Tells this about any view changes in the SkyBrush viewport.
   */
  updateViewport( canvasX:number, canvasY:number, _width:number, _height:number, zoom:number ):this {
    this.zoom    = zoom
    this.canvasX = canvasX
    this.canvasY = canvasY

    return this
  }
}

/**
 * This handles the clipping/select region on the Canvas.
 *
 * @constructor
 * @private
 */
export class Marquee {
  private readonly viewOverlay : ViewOverlay
  private readonly canvas      : CanvasManager

  private readonly topLeftHandle     : HTMLElement 
  private readonly bottomRightHandle : HTMLElement 

  /// 
  /// Where the marquee is positioned on the screen.
  /// 
  private readonly position : SizeArea

  private isShowingHandles : boolean

  constructor(
      canvas:CanvasManager,
      viewport:HTMLElement,
      painter:skybrush.SkyBrush,
  ) {
    this.canvas = canvas

    const topLeft         = document.createElement( 'div' )
    topLeft.className     = 'skybrush_marquee_handle sb_top_left sb_no_target'

    const bottomRight     = document.createElement( 'div' )
    bottomRight.className = 'skybrush_marquee_handle sb_bottom_right sb_no_target'

    this.topLeftHandle     = topLeft
    this.bottomRightHandle = bottomRight

    this.viewOverlay = new ViewOverlay( viewport, 'skybrush_marquee' ).
        append( topLeft ).
        append( bottomRight )

    this.position = { x: 0, y: 0, w: 0, h: 0 }

    this.isShowingHandles = false

    topLeft.addEventListener( 'mousedown', ev => {
      if ( ev.which !== constants.LEFT ) {
        return
      }

      ev.preventDefault()

      this.startHighlight( false )

      painter.startDrag(
          ( ev, x, y ) => {
            this.updateTopLeft( ev, x, y )
          },

          ( ev, x, y ) => {
            this.updateTopLeft( ev, x, y )
            this.stopHighlight()
          },
      )
    })

    bottomRight.addEventListener( 'mousedown', ev => {
      if ( ev.which !== constants.LEFT ) {
        return
      }

      ev.preventDefault()

      this.startHighlight( false )

      painter.startDrag(
          ( ev, x, y ) => {
            this.updateWidthHeight( ev, x, y )
          },

          ( ev, x, y ) => {
            this.updateWidthHeight( ev, x, y )
            this.stopHighlight()
          },
      )
    })
  }

  private updateTopLeft( _ev:MouseEvent, x:number, y:number ) {
    const endX = this.position.x + this.position.w
    const endY = this.position.y + this.position.h

    if ( x > endX ) {
      x = endX
    }

    if ( y > endY ) {
      y = endY
    }

    const w = endX - x
    const h = endY - y

    this.selectArea( x, y, w, h )
  }

  private updateWidthHeight( _ev:MouseEvent, x:number, y:number ) {
    const newW = Math.max( 0, x - this.position.x )
    const newH = Math.max( 0, y - this.position.y )

    this.selectArea(
        this.position.x,
        this.position.y,
        newW,
        newH
    )
  }

  updateViewport( canvasX:number, canvasY:number, width:number, height:number, zoom:number ):this {
    this.viewOverlay.updateViewport( canvasX, canvasY, width, height, zoom )
    this.update()

    return this
  }

  setCanvasSize( x:number, y:number, w:number, h:number ):this {
    this.viewOverlay.setCanvasSize( x, y, w, h )

    return this
  }

  /**
   * Begins displaying the resize handles.
   */
  showHandles():this {
    this.topLeftHandle.classList.add( 'sb_show' )
    this.bottomRightHandle.classList.add( 'sb_show' )

    return this
  }

  /**
   * Hides the resize handles.
   */
  hideHandles():this {
    this.topLeftHandle.classList.remove( 'sb_show' )
    this.bottomRightHandle.classList.remove( 'sb_show' )

    return this
  }

  /**
   * Puts this into highlighting mode.
   *
   * This is a visual change, to give the user a visual
   * indication that the marquee is currently being altered.
   *
   * @param clear True to clear this when it highlights, false to not. Defaults to true.
   */
  startHighlight( clear:boolean = true ):this {
    this.viewOverlay.addClass( 'sb_highlight' )

    if ( clear ) {
      this.clear()
    } else {
      this.viewOverlay.removeClass( 'sb_reposition' )
    }

    return this
  }

  /**
   * Ends highlighting mode,
   * so the visual highlighting that this marquee
   * shows will now end.
   */
  stopHighlight():this {
    const x = this.position.x
    const y = this.position.y
    const w = this.position.w
    const h = this.position.h

    this.viewOverlay.removeClass( 'sb_highlight' )

    if (
        x < 0 ||
        y < 0 ||
        w+x > this.canvas.getWidth()  ||
        h+y > this.canvas.getHeight()
    ) {
      const x2 = Math.max( x, 0 )
      const y2 = Math.max( y, 0 )

      const w2 = Math.min( w+x, this.canvas.getWidth()  ) - x2
      const h2 = Math.min( h+y, this.canvas.getHeight() ) - y2

      this.selectArea( x2, y2, w2, h2 )
    }

    if ( this.hasClipArea() ) {
      this.canvas.setClip( this.position.x, this.position.y, this.position.w, this.position.h )
    } else {
      this.viewOverlay.removeClass('sb_show')
    }

    return this
  }

  hasClipArea():boolean {
    return ! (
        this.position.w <= 0 ||
        this.position.h <= 0 ||
        this.position.x+this.position.w < 0 ||
        this.position.y+this.position.h < 0 ||
        this.position.x >= this.canvas.getWidth() ||
        this.position.y >= this.canvas.getHeight()
    )
  }

  /**
   * Selections the region given.
   *
   * If the region is outside of the canvas then it is counted
   * as a non-selection.
   */
  select( x:number, y:number, x2:number, y2:number ):this {
    return this.selectArea(
        Math.min( x, x2 ),
        Math.min( y, y2 ),

        Math.abs( x2-x ),
        Math.abs( y2-y )
    )
  }

  xy( x:number, y:number ):this {
    return this.selectArea( x, y, this.position.w, this.position.h )
  }

  selectArea( x:number, y:number, w:number, h:number ):this {
    // floor all locations
    this.position.x = x|0
    this.position.y = y|0
    this.position.w = w|0
    this.position.h = h|0

    return this.update()
  }

  /**
   * Cleares the current selection on the Marquee.
   *
   * This is the same as selection a 0x0 region.
   */
  clear():this {
    if ( this.viewOverlay.hasClass('sb_show') ) {
      this.select( 0, 0, 0, 0 )
      this.canvas.removeClip()
      this.viewOverlay.removeClass( 'sb_reposition' )

      return this.update()
    }

    return this
  }

  hasNoSelection():boolean {
    return ( this.position.w === 0 ) && ( this.position.h === 0 )
  }

  /**
   * Returns an object showing the current selection, in canvas pixels,
   * or null if there is no selection.
   *
   * @return null if there is no selection, or an object describing it.
   */
  getPosition():Nullable<SizeArea> {
    const hasSelection = this.viewOverlay.hasClass( 'sb_show' )

    return hasSelection ?
        this.position :
        null 
  }

  /**
   * Cases this to hide/show it's self,
   * based on the current selection,
   * and if it is shown it will resize accordingly.
   */
  update():this {
    if ( this.viewOverlay.hasClass('sb_highlight' ) ) {
      this.viewOverlay.addClass('sb_show')

      if ( this.hasClipArea() ) {
        this.viewOverlay.removeClass('sb_outside')
      } else {
        this.viewOverlay.addClass('sb_outside')
      }

      if ( this.hasNoSelection() ) {
        this.viewOverlay.addClass('sb_temporary_hide')
      } else {
        this.viewOverlay.removeClass('sb_temporary_hide')
      }
    } else if ( this.hasClipArea() ) {
      this.viewOverlay.
          removeClass('sb_outside').
          addClass('sb_reposition')
    } else {
      this.viewOverlay.
          removeClass('sb_outside').
          removeClass('sb_reposition').
          removeClass('sb_show')
    }

    //
    // Always update the dom location,
    // because it might be fading out when
    // this is called.
    //
    if ( this.hasClipArea() || this.viewOverlay.hasClass('sb_highlight') ) {
      this.setCanvasSize(
          this.position.x,
          this.position.y,
          this.position.w,
          this.position.h
      )
    }

    return this
  }
}

/**
 * The copy manager is simply some logic bound together
 * for pushing out the copy code from the CanvasManager.
 *
 * By this point in the project the CanvasManager is getting
 * really fat, so anything I can do to help keep it lean
 * helps!
 *
 * You can set and get copies to and from this CopyManager.
 * When you get a copy from it, make sure you _don't_ draw
 * on to it, because it's meant to be immutable.
 *
 * You'll mess up the copy system if you draw on to it!
 *
 * @private
 * @constructor
 */
export class CopyManager {
  private readonly viewOverlay : ViewOverlay

  private copy : Nullable<HTMLCanvasElement>

  private copyX : number
  private copyY : number

  /*
   * When these two are not undefined,
   * then we no longer in 'paste' mode.
   */
  private pasteX : number
  private pasteY : number

  private isPastingFlag : boolean

  constructor( viewport:HTMLElement ) {
    this.viewOverlay = new ViewOverlay( viewport, 'skybrush_copy' )

    this.copy = null

    this.copyX = 0
    this.copyY = 0

    /*
     * When these two are not undefined,
     * then we no longer in 'paste' mode.
     */
    this.pasteX = 0
    this.pasteY = 0
    this.isPastingFlag = false
  }

  updateViewport( canvasX:number, canvasY:number, width:number, height:number, zoom:number ):this {
    this.viewOverlay.updateViewport( canvasX, canvasY, width, height, zoom )
    this.update()

    return this
  }

  setCanvasSize( x:number, y:number, w:number, h:number ):this {
    this.viewOverlay.setCanvasSize( x, y, w, h )

    return this
  }

  update():this {
    if ( this.isPasting() && this.copy !== null ) {
      this.setCanvasSize(
          this.pasteX    , this.pasteY     ,
          this.copy.width, this.copy.height,
      )
    }

    return this
  }

  draw( dest:HTMLCanvasElement ):this {
    if ( this.copy !== null ) {
      const ctx = dest.getContext( '2d' ) as CanvasRenderingContext2D
      ctx.drawImage( this.copy, this.pasteX, this.pasteY )
    }

    return this
  }

  isPasting():boolean {
    return this.isPastingFlag
  }

  startPaste( dest:HTMLCanvasElement ):this {
    if ( this.copy !== null ) {
      this.pasteX = this.pasteY = 0
      this.isPastingFlag = true
      this.viewOverlay.addClass( 'sb_show' )

      return this.movePaste( dest, this.copyX, this.copyY, true )
    }

    return this
  }

  movePaste( dest:HTMLCanvasElement, x:number, y:number, finalize:boolean ):this {
    if ( this.isPasting() && this.copy !== null ) {
      x = (this.pasteX + (x || 0)) | 0
      y = (this.pasteY + (y || 0)) | 0

      const ctx = dest.getContext( '2d' ) as CanvasRenderingContext2D
      ctx.clearRect( 0, 0, dest.width, dest.height )
      ctx.drawImage( this.copy, x, y )
      this.setCanvasSize( x, y, this.copy.width, this.copy.height )

      if ( finalize ) {
        this.pasteX = x
        this.pasteY = y
      }
    }

    return this
  }

  setCopy( canvas:HTMLCanvasElement, x:number, y:number, w:number, h:number ):this {
    w = Math.min( w, canvas.width  )
    h = Math.min( h, canvas.height )

    // todo, remove this.
    // It exists so that when SkyBrush starts there is nothing to paste.
    // That's what the null version is.
    // Better to move that to a boolean or something and then have this as not null.
    if ( this.copy === null ) {
      this.copy = htmlUtils.newCanvas( w, h )
    } else {
      this.copy.width  = w
      this.copy.height = h
    }

    const ctx = this.copy.getContext( '2d' ) as CanvasRenderingContext2D
    ctx.drawImage( canvas, -x, -y )

    this.copyX = x
    this.copyY = y

    return this
  }

  overlapsPaste( area:SizeArea ):boolean {
    if ( this.isPasting() && this.copy !== null ) {
      const x = this.pasteX
      const y = this.pasteY
      const w = this.copy.width
      const h = this.copy.height

      const isOutsideArea = (
          x > area.x+area.w ||
          y > area.y+area.h ||
          x+w < area.x ||
          y+h < area.y
      )

      return ! isOutsideArea
    }

    return false
  }

  /**
   * Cleares this from being in pasting mode.
   */
  endPaste():this {
    this.isPastingFlag = false
    this.viewOverlay.removeClass( 'sb_show' )

    return this
  }
}

/**
 * This is a fat prototype that manages the whole canvas stack.
 *
 * It's built to try to hide a lot of the magic it does underneath,
 * such as the hidden overlay, and the undo stack.
 *
 * It is also built to help simplify the core SkyBrush prototype,
 * by pushing a lot of it's code out into this. That way SkyBrush
 * can concentrate more on high-level application management.
 *
 * @constructor
 * @private
 */
/*
 * Originally this was all in SkyBrush, but was moved out to break up
 * the stack.
 *
 * Silently this will have commands draw to an overlay,
 * which is located on top. This allows commands to redraw mid way,
 * such as when you are drawing a piece of geometry, so they can be
 * partially drawn. The state of the overlay when the mouse goes up
 * is what is drawn.
 *
 * It also handles zoom, and the current colour, with ways to hook into
 * when these are changed. This includes automatically making the canvas
 * bigger/smaller as needed.
 *
 * It also manages the UndoStack it holds, allowing it to chose
 * when to push canvas' down on to. The undo functionality it's self
 * if found in the UndoStack prototype.
 *
 * Finally it also does some extra middle management, such as ensuring
 * the properties set to the context is consistent. For example,
 * ensuring the current canvas 2D context is using the current colour.
 */
export class CanvasManager {
  private readonly viewport : HTMLElement
  private readonly canvas   : HTMLCanvasElement
  private readonly overlay  : HTMLCanvasElement
  private readonly upscale  : HTMLCanvasElement

  private readonly undos   : UndoStack
  private readonly grid    : GridManager
  private readonly marquee : Marquee
  private readonly copyObj : CopyManager

  private readonly events : events.Handler

  private readonly showUpscaleEvent : events.Runner
  private readonly upscaleWorkers : number[]

  private clipping : Nullable<SizeArea>

  private isUpscaleShown : boolean

  /**
   * For lazy calls to updateCanvasSize, this will skip multiple calls in
   * a row that occur, if updateCanvasSize has not yet been called.
   *
   * Essentially if you call lazyUpdateCanvasSize 3 times in a row, it'll
   * only run the once due to this flag.
   */
  private isAwaitingUpdate : number

  private width  : number
  private height : number
  private zoom   : number

  constructor( viewport:HTMLElement, painter:skybrush.SkyBrush ) {

    /*
     * Canvas HTML Elements
     *
     * Create and add, the actual bits that make up the canvas.
     * The canvas it's self, the overlay, and the upscale.
     */

    const canvas  = htmlUtils.newCanvas()
    const overlay = htmlUtils.newCanvas()
    const upscale = htmlUtils.newCanvas()

    canvas.classList.add(  'skybrush_canvas_draw'    )
    overlay.classList.add( 'skybrush_canvas_overlay' )
    upscale.classList.add( 'skybrush_canvas_upscale' )

    viewport.innerHTML = ''
    viewport.appendChild( canvas  )
    viewport.appendChild( overlay )
    viewport.appendChild( upscale )

    this.viewport = viewport

    this.canvas   = canvas
    this.overlay  = overlay
    this.upscale  = upscale

    this.events = new events.Handler( this )
    this.showUpscaleEvent = new events.Runner( UPSCALE_SCROLL_DELAY )
    this.clipping = null

    this.isUpscaleShown = false

    this.isAwaitingUpdate = 0

    this.width  = this.canvas.width,
    this.height = this.canvas.height,
    this.zoom   = 1 

    this.undos = new UndoStack( UNDO_STACK_SIZE, this.canvas )
    this.upscaleWorkers = []

    /* Must be added at the end! */
    viewport.addEventListener( 'scroll', () => {
      this.refreshUpscale()
    })

    /*
     * Ensure the canvas is always centred,
     * including when the window size has changed.
     */
    painter.onResize(() => {
      this.lazyUpdateCanvasSize()
    })

    this.grid    = new GridManager( viewport )
    this.marquee = new Marquee( this, viewport, painter )
    this.copyObj = new CopyManager( viewport )

    painter.onSetCommand( command => {
      if ( command.name.toLowerCase() !== 'move' ) {
        this.drawAndEndPaste()
      }
    })

    painter.onSetAlpha(() => {
      if ( this.copyObj.isPasting() ) {
        this.copyObj.movePaste( this.overlay, 0, 0, false )
      }
    })
  }

  /**
   * @return The current contents of the canvas as an image url.
   */
  toDataURL( imageType:string = 'image/png' ) {
    return this.canvas.toDataURL( imageType )
  }

  /**
   * @return The marquee manager.
   */
  getMarquee() {
    return this.marquee
  }

  /**
   * @return The GridManager used on this canvas.
   */
  getGrid() {
    return this.grid
  }

  hideOverlay() {
    this.overlay.style.display = 'none'
  }

  /**
   * Takes an event, and works out where it's clicking in relation
   * to the canvas. The result is then returned as a JS object,
   * with 'left' and 'top' referring to the locations.
   *
   * @param ev A mouse event to translate.
   * @return An object containing 'left' and 'top', referring to where the mouse event occurred.
   */
  translateLocation( ev:Event ):Position {
    const pos  = ev.offset( this.canvas )
    const zoom = this.zoom

    pos.left /= zoom
    pos.top  /= zoom

    return pos
  }

  /**
   * @return The offset of the underlying canvas object.
   */
  offset() {
    return this.canvas.offset()
  }

  onEndDraw( fun:() => void ):void {
    this.events.add( 'onDraw', fun )
  }

  /**
   * Called when drawing to the overlay has ended,
   * so this canvas knows that the drawing command is over.
   *
   * This allows this to update it's undo stack,
   * and perform other post-draw tasks.
   */
  endDraw( updateArea?:SizeArea ) {
    let refresh = false

    let ux = 0
    let uy = 0
    let uw = 0
    let uh = 0

    if ( updateArea ) {
      refresh = true
      ux = updateArea.x
      uy = updateArea.y
      uw = updateArea.w
      uh = updateArea.h

      // 
      // If we are updating outside the canvas,
      // then leave early.
      //
      if (
          ux+uw < 0 || uy+uh < 0 ||
          ux > this.width || uy > this.height
      ) {
        return
      }

      //
      // No point refreshing outside of the clipping area,
      // or if drawing too place outside the clipping area.
      //
      // So we quit early if either has happened.
      //
      // If drawing has taken place in the clipping,
      // then we also work out the smallest update area.
      //
      const clip = this.clipping
      if ( clip !== null ) {
        if (
            ux > clip.x + clip.w ||
            uy > clip.y + clip.h ||
            ux+uw < clip.x ||
            uy+uh < clip.y
        ) {
          return
        }

        ux = Math.max( ux, clip.x )
        uy = Math.max( uy, clip.y )
        uw = Math.min( uw, clip.w )
        uh = Math.min( uh, clip.h )
      }
    }

    this.drawSafeAlpha(() => {
      this.canvas.ctx.drawImage( this.overlay, 0, 0 )
    })

    this.overlay.ctx.clearRect( 0, 0, this.overlay.width, this.overlay.height )

    if ( refresh ) {
      this.redrawUpscale( ux, uy, uw, uh, false, 0 )
    }

    // reshow the overlay, in case a command hid it
    this.$overlay.show()

    this.undos.add( this.canvas )

    // finally, run the events!
    this.events.run( 'onDraw' )
  }

  getWidth() {
    return this.width
  }

  getHeight() {
    return this.height
  }

  /**
   * @return The Zoom value.
   */
  getZoom() {
    return this.zoom
  }

  /**
   * Changes the zoom to match.
   */
  setZoom( zoom:number, x:number, y:number ):this {
    this.zoom = zoom
    this.updateCanvasSize( x, y )

    return this
  }

  /**
   * This is a lazy version of 'updateCanvasSize'. This will not be called
   * straight away, but instead delayed and called in the future.
   *
   * Not that multiple calls performed in a row will be ignored, if it didn't
   * actually run yet. It will only call once for each time it is called
   * multiple times.
   */
  private lazyUpdateCanvasSize():void {
    if ( this.isAwaitingUpdate ) {
      clearTimeout( this.isAwaitingUpdate )
    }

    this.isAwaitingUpdate = setTimeout(() => {
      this.isAwaitingUpdate = 0

      this.updateCanvasSize()
    }, CANVAS_LAZY_REFLOW_DELAY )
  }

  /**
   * Resizes and moves around the canvas, overlay, viewport, and the upscale.
   * It essentially resets the layout, based on the current size and zoom settings.
   *
   * The idea is that you can alter the setup, and then just call this to
   * refresh the layout, so your changes get implemented.
   *
   * This strategy is used because the layout is based on both size and zoom
   * these two properties are connected here.
   *
   * The zoomX/zoomY should be in the range of the actual drawing canvas.
   * The idea is that they are the location where someone has clicked,
   * using a command, which has all it's locations normalized.
   *
   * To use zoomX and zoomY, _both_ must be provided. If you don't want
   * a zoomY, then just pass in 0 for it.
   *
   * @param zoomX Optional, an x location to zoom in/out of.
   * @param zoomY Optional, a y location to zoom in/out of.
   */
  private updateCanvasSize( zoomX?:number, zoomY?:number ):void {
    const zoom     = this.zoom,
    const canvas   = this.canvas
    const overlay  = this.overlay
    const viewport = this.viewport
    const upscale  = this.upscale

    const newWidth   = Math.round( this.width  * zoom )
    const newHeight  = Math.round( this.height * zoom )

    const canvasParent = canvas.parentElement()

    const moveX = (canvasParent.width()  - newWidth )/2
    const moveY = (canvasParent.height() - newHeight)/2

    const canvasX = ( moveX >= 0 ?  moveX : 0 )
    const canvasY = ( moveY >= 0 ?  moveY : 0 )

    const left = (canvasX+0.5)|0
    const top  = (canvasY+0.5)|0

    /* Work out, and animate, the scroll change */

    const hasScrollLeft = viewport.scrollLeftAvailable()
    const hasScrollTop  = viewport.scrollTopAvailable()

    let zoomOffsetX = 0
    let zoomOffsetY = 0

    if (
        zoomX !== undefined &&
        hasScrollLeft
    ) {

      /*
       * A value from 0.0 to 1.0, representing the zoom location.
       * 
       * Zoom based on a canvas pixel location,
       * or just use the center of the canvas.
       * 
       * With the *2 -1, we then convert from: [0.0, 1.0] to [-1.0, 1.0]
       */
      const zoomXP = ( zoomX / this.width )*2 - 1
      zoomXP = zoomXP*2 - 1

      /*
       * Divide newWidth by half, so that when it's multiplied against zoomXP,
       * we are in the range of: [-newWidth/2, newWidth/2].
       *
       * This way it'll scroll left when zoomXP is negative, and right
       * when it's positive.
       *
       * newWidth is divided again, making it newWidth/4, as the scrolling is
       * too extreme.
       */
      zoomOffsetX = ( newWidth / 4 ) * zoomXP
    }

    // and now for the zoom Y
    if (
        zoomY !== undefined &&
        hasScrollTop
    ) {
      const zoomYP = ( zoomY / this.height )*2 - 1

      zoomOffsetY = (newHeight/4) * zoomYP
    }

    // If no scroll bar right now, try to scroll to the middle (doesn't matter if it fails).
    const scrollTopP  = ( hasScrollTop  === 0 ) ? 0.5 : viewport.scrollTopPercent()
    const scrollLeftP = ( hasScrollLeft === 0 ) ? 0.5 : viewport.scrollLeftPercent()

    const heightChange = newHeight / $canvas.height()
    const widthChange  = newHeight / $canvas.height()

    const scrollTop  = scrollTopP  * (newHeight - viewport.height()) + zoomOffsetY
    const scrollLeft = scrollLeftP * (newWidth  - viewport.width() ) + zoomOffsetX

    /*
     * Now apply the changes.
     *
     * We do it here, so it doesn't affect the calculations above.
     */

    canvas.style.width  = `${newWidth}px`
    canvas.style.height = `${newHeight}px`
    canvas.style.transform = `translate( ${left}px, ${top}px )`

    overlay.style.width  = `${newWidth}px`
    overlay.style.height = `${newHeight}px`
    overlay.style.transform = `translate( ${left}px, ${top}px )`

    this.refreshUpscale()

    viewport.clearQueue().animate(
        {
            scrollTop  : scrollTop,
            scrollLeft : scrollLeft,
        },
        CANVAS_UPDATE_SPEED
    )

    const viewWidth  = Math.min( newWidth , viewport.width()  )
    const viewHeight = Math.min( newHeight, viewport.height() )
    this.grid.updateViewport( canvasX, canvasY, newWidth, newHeight, zoom )
    this.marquee.updateViewport( canvasX, canvasY, newWidth, newHeight, zoom )
    this.copyObj.updateViewport( canvasX, canvasY, newWidth, newHeight, zoom )

    if ( this.isAwaitingUpdate ) {
      clearTimeout( this.isAwaitingUpdate )

      this.isAwaitingUpdate = 0
    }
  }

  /**
   * Cleares all of the future upscale refresh jobs to perform.
   */
  private clearUpscaleWorkers():void {
    while ( this.upscaleWorkers.length > 0 ) {
      cancelAnimationFrame( this.upscaleWorkers.pop() )
    }
  }

  /**
   * Adds redrawUpscale jobs to be performed in the future.
   */
  private futureRedrawUpscale( x:number, y:number, w:number, h:number, includeOverlay:boolean ):void {
    const workerID = requestAnimationFrame(() => {
      this.redrawUpscale( x, y, w, h, includeOverlay, 0 )
    })

    this.upscaleWorkers.push( workerID )
  }

  /**
   * Hides the upscale, and then redisplays it in the future.
   *
   * The idea is pretty simple, redrawing the upscale takes a
   * lot of time. So if we are zooming or scrolling, you don't
   * want to do this constantly. This aims to solve that problem
   * by updating in the future, once the scrolling has stopped.
   *
   * Repeat calls will cause previous ones to be cancelled.
   */
  /* This uses 'setTimeout' as scrolling/zooming wouldn't be fully finished
   * when it gets called. This allows us to have a delay for full reflow.
   *
   * It also allows us to cancel the action, if it's already running.
   * For example so people can scroll continously, without having to
   * have it re-upscale constantly as they do this.
   *
   * Another example is that when you zoom in, it'll also scroll, to
   * position the upscale canvas. One of these will automatically be
   * cancelled since this will get called twice.
   */
  private refreshUpscale():void {
    /*
     * Hide the current upscale.
     */
    if ( this.isUpscaleShown ) {
      this.upscale.style.display = 'none'
      this.clearUpscaleWorkers()

      this.isUpscaleShown = false
    }

    /*
     * The algorithm is to just match the viewarea,
     * or the canvas, which ever is smaller.
     */
    this.showUpscaleEvent.run(() => {
      this.isUpscaleShown = true

      const zoom = this.zoom

      const viewport = this.viewport
      const canvas   = this.canvas
      const upscale  = this.upscale

      upscale.classList.remove( 'sb_offscreenX' )
      upscale.classList.remove( 'sb_offscreenY' )

      /*
       * First the size.
       */

      // show the upscale when using positive zoom
      const scrollSize = viewport.scrollBarSize()

      const viewWidth    = viewport.width()   - scrollSize.right
      const viewHeight   = viewport.height() - scrollSize.bottom
      const canvasWidth  = $canvas.width()
      const canvasHeight = $canvas.height()

      const upWidth = (
          ( canvasWidth < viewWidth )
              ? canvasWidth
              : viewWidth
      )

      const upHeight = (
          ( canvasHeight < viewHeight )
              ? canvasHeight
              : viewHeight
      )

      upscale.width  = upWidth
      upscale.height = upHeight

      /*
       * Now the position.
       */

      let top = 0
      let left = 0

      const scrollTop  = viewport.scrollTop()
      const scrollLeft = viewport.scrollLeft()

      const canvasPos = $canvas.translate()
      if ( canvasWidth < viewWidth ) {
        left = canvasPos.x
      } else {
        left = scrollLeft
        upscale.classList.add( 'sb_offscreenX' )
      }

      if ( canvasHeight < viewHeight ) {
        top = canvasPos.y
      } else {
        top = scrollTop
        upscale.classList.add( 'sb_offscreenY' )
      }

      // Fade in the upscale change.
      // The double opacity setting is needed to trigger the CSS animation.
      const positionX = (- ( scrollLeft % UPSCALE_BACK_OFFSET_MOD ))
      const positionY = (- ( scrollTop  % UPSCALE_BACK_OFFSET_MOD ))
      const translateX = (left+0.5)|0
      const translateY = (top+0.5)|0

      upscale.style.display = 'block'
      upscale.style.opacity = '0'
      upscale.style.backgroundPosition = `${positionX}px ${positionY}px`
      upscale.style.transform = `translate( ${translateX}px, ${translateY} )`

      requestAnimationFrame(() => {
        // upscale _after_ making it visible
        this.redrawUpscale()

        upscale.style.opacity = '1'
      })
    })
  }

  isPasting():boolean {
    return this.copyObj.isPasting()
  }

  isInPaste( x:number, y:number ):boolean {
    return this.copyObj.overlapsPaste({
        x: x|0,
        y: y|0,
        w: 1,
        h: 1,
    })
  }

  movePaste( x:number, y:number, finalize:boolean ):this {
    if ( this.copyObj.isPasting() ) {
      this.copyObj.movePaste( this.overlay, x, y, finalize )
    }

    return this
  }

  /**
   * If SkyBrush is currently pasting ...
   *  - draw the pasting content to the canvas
   *  - clear the pasting overlay (the bit that shows where it will be pasted)
   */
  drawAndEndPaste() {
    if ( this.copyObj.isPasting() ) {
      const clip = this.getFullClip()

      if ( this.copyObj.overlapsPaste(clip) ) {
        this.drawSafe(() => {
          this.copyObj.draw( this.canvas )
          this.overlay.ctx.clearRect( 0, 0, this.width, this.height )
          this.endDraw( clip )
        })
      }

      this.endPaste()
    }

    return this
  }

  paste() {
    this.drawAndEndPaste()
    this.copyObj.startPaste( this.overlay )
    this.events.run( 'onPaste' )

    return this
  }

  /**
   * If SkyBrush is currently pasting ...
   *  - clears the pasting overlay bit
   *
   * Note this *doesn't* draw the paste to the screen; it just ends the
   * pasting mode.
   */
  endPaste():this {
    if ( this.copyObj.isPasting() ) {
      this.overlay.ctx.clearRect( 0, 0, this.width, this.height )
      this.copyObj.endPaste()
    }

    return this
  }

  onPaste( fun:() => void ):this {
    this.events.add( 'onPaste', fun )

    return this
  }

  cut():this {
    const clip = this.getFullClip()

    this.copyObj.setCopy( this.canvas, clip.x, clip.y, clip.w, clip.h )
    this.drawSafe(() => {
      this.canvas.ctx.clearRect( clip.x, clip.y, clip.w, clip.h )
    })
    this.endDraw( clip )

    this.events.run( 'onCopy' )
    this.marquee.clear()

    return this
  }

  copy():this {
    const clip = this.getFullClip()

    this.copyObj.setCopy( this.canvas, clip.x, clip.y, clip.w, clip.h )
    this.events.run( 'onCopy' )
    this.marquee.clear()

    return this
  }

  onCopy( fun ):this {
    this.events.add( 'onCopy', fun )

    return this
  }

  removeClip():this {
    const ctx     = this.canvas.ctx
    const overCtx = this.overlay.ctx

    if ( this.clipping !== null ) {
      const ctxSetup = canvasUtils.backupCtx( ctx )
      ctx.restore()
      canvasUtils.restoreCtx( ctx, ctxSetup )

      ctxSetup = canvasUtils.backupCtx( overCtx )
      overCtx.restore()
      canvasUtils.restoreCtx( overCtx, ctxSetup )

      this.clipping = null
    }

    this.events.run( 'onClip', null )

    return this
  }

  onClip( f ):this {
    this.events.add( 'onClip', f )

    return this
  }

  getClip():Nullable<SizeArea> {
    return this.clipping
  }

  getFullClip():SizeArea {
    if ( this.clipping ) {
      return this.clipping

    } else {
      return {
          x: 0,
          y: 0,
          w: this.width,
          h: this.height,
      }
    }
  }

  setClip( x:number, y:number, w:number, h:number ):this {
    const cCtx = this.canvas.ctx
    const oCtx = this.overlay.ctx

    this.removeClip()

    this.clipping = {
        x: x,
        y: y,
        w: w,
        h: h,
    }

    cCtx.save()
    cCtx.beginPath()
    cCtx.rect( x, y, w, h )
    cCtx.clip()

    oCtx.save()
    oCtx.beginPath()
    oCtx.rect( x, y, w, h )
    oCtx.clip()

    this.events.run( 'onClip', this.clipping )

    return this
  }

  /**
   * Redraws the contents of the upscaled canvas.
   *
   * Usagae:
   *     // redraw all of the viewport
   *     canvasManager.redrawUpscale()
   *
   *     // redraws a dirty rectangle, the area specified, in teh upscale
   *     canvasManager.redrawUpscale( x, y, w, h )
   *
   * Note: the location is the area on the target drawing canvas,
   * where items are drawn to. Not the area on the upscale canvas.
   *
   * @param x
   * @param y
   * @param w
   * @param h
   * @param includeOverlay True if we include the overlay in the refresh, and false if not.
   * @param buffer extra pixels to add on to the x, y, w and h.
   */
  redrawUpscale(
      x:number,
      y:number,
      w:number,
      h:number,
      includeOverlay:boolean,
      buffer:number,
  ):boolean {
    if ( Math.abs(w) < 1 ) {
      if ( w < 1 ) {
        w = w
      } else {
        w = -1
      }
    }

    if ( Math.abs(h) < 1 ) {
      if ( h < 1 ) {
        h = 1
      } else {
        h = -1
      }
    }

    /*
     * This is to allow easier usage.
     * So you can update in the negative direction.
     */
    if ( w < 0 ) {
      w = -w
      x -= w
    }

    if ( h < 0 ) {
      h = -h
      y -= h
    }

    x -= buffer
    y -= buffer
    h += buffer*2
    w += buffer*2

    /*
     * After handling the buffer, and other possible values,
     * if the width/height are empty, then quit early.
     */
    if ( w === 0 || h === 0 ) {
      return false
    }

    const canvas   = this.canvas
    const upscale  = this.upscale
    const upscale  = this.upscale
    const viewport = this.viewport

    const zoom = this.zoom

    // 1) handle the no-args version (update whole screen)
    if ( x === undefined ) {
      /*
       * The maths for this bit proved to be really difficult to work out.
       * It would be out by just a couple of sub-pixels (no idea why).
       *
       * So we just fake a draw event (drawing to top left corner),
       * and it's drawing to the whole canvas (full with/height).
       */
      const pos = this.viewport.offset()
      const fakeEv = $.Event( 'mousemove', {
          pageX : pos.left,
          pageY : pos.top,
      })

      const location = this.translateLocation( fakeEv )

      x = location.left
      y = location.top
      w = this.width
      h = this.height
    }

    // take off 1 to account for the canvas border
    const scrollTop  = this.viewport.scrollTop()
    const scrollLeft = this.viewport.scrollLeft()

    // 2) work out how much of the drawing canvas is actually visible
    x = Math.max( x,
        scrollLeft / zoom
    )
    y = Math.max( y,
        scrollTop / zoom
    )
    w = Math.min( w,
        Math.min(canvas.width , this.viewport.width()/zoom )
    )
    h = Math.min( h,
        Math.min(canvas.height, this.viewport.height()/zoom )
    )

    /* Check for updating outside of the canvas,
     * and if so, we leave early (no refresh needed).
     */
    if ( x+w < 0 || y+h < 0 || x > this.canvas.width || y > this.canvas.height ) {
      return false
    }

    /* Need to be rounded for the canvas data we access later. */
    x = Math.round(x)
    y = Math.round(y)

    w = Math.round(w)
    h = Math.round(h)

    /*
     * Widen the draw area by a pixel to encompas the outer edge,
     * this is to prevent slight 1px gaps along the edges of the upscale canvas.
     */

    if ( x > 0 ) {
      x--
    }

    if ( y > 0 ) {
      y--
    }

    const wDiff = Math.min( 1, canvas.width  - w )
    const hDiff = Math.min( 1, canvas.height - h )

    w += wDiff
    h += hDiff

    // 3) work out the same locations, on the upscale canvas
    const ux = x*zoom - scrollLeft
    const uy = y*zoom - scrollTop
    const uw = w*zoom
    const uh = h*zoom

    // clear our refresh area
    const ctx = canvas.ctx
    const destAlpha = ( ctx.globalCompositeOperation === 'source-atop' )
    const uCtx = upscale.ctx

    /*
     * This can go one of three ways:
     *  = draw using downscaling (zoom is 100%, or lower)
     *  = draw cheap (using canvas scaling) and sub-divide work
     *  = manually upscale pixels
     */

    const divideWork = (w*h) > ((UPSCALE_DIVIDE_AREA+6)*(UPSCALE_DIVIDE_AREA+6))

    if ( divideWork || zoom <= 1 ) {
      const xDiff = Math.max( 0, (x+w) - canvas.width  )
      const yDiff = Math.max( 0, (y+h) - canvas.height )

      const ux2 = Math.round(ux)
      const uy2 = Math.round(uy)
      const uw2 = Math.round(uw - xDiff*zoom)
      const uh2 = Math.round(uh - yDiff*zoom)

      // if we clip the edge,
      // then clamp the max width/height onto the edges
      // (otherwise Chrome crashes)
      if ( x+w > canvas.width ) {
        w -= (x+w) - canvas.width
        uw2 = upscale.width - ux2
      }
      if ( y+h > canvas.height ) {
        h -= (y+h) - canvas.height
        uh2 = upscale.height - uy2
      }

      /*
       * Note that the zoom _must_ be first,
       * so it takes precendence over dividing work
       * (as it's much cheaper).
       */
      /*
       * If zoom is at 1, then there is no change in scaing.
       * So we just draw normally, and quit.
       */
      if ( zoom <= 1 ) {
        uCtx.clearRect( ux2, uy2, uw2, uh2 )

        uCtx.globalAlpha = 1.0
        uCtx.drawImage( canvas, x, y, w, h, ux2, uy2, uw2, uh2 )

        if ( includeOverlay ) {
          if ( destAlpha ) {
            uCtx.globalCompositeOperation = 'source-atop'
          }

          uCtx.drawImage( this.overlay, x, y, w, h, ux2, uy2, uw2, uh2 )

          if ( destAlpha ) {
            uCtx.globalCompositeOperation = 'source-over'
          }
        }

      /*
       * Sub divide up work if we'll be doing loads of it.
       * Instead the work is done over multiple calls.
       */
      } else if ( divideWork ) {
        // cheap draw, so we don't get huge empty areas
        uCtx.drawImage( canvas, x, y, w, h, ux2, uy2, uw2, uh2 )

        for ( let i = x; i < (w+x); i += UPSCALE_DIVIDE_AREA ) {
          for ( let j = y; j < (h+y); j += UPSCALE_DIVIDE_AREA ) {
            const updateW = Math.min( (w+x)-i, UPSCALE_DIVIDE_AREA )
            const updateH = Math.min( (h+y)-j, UPSCALE_DIVIDE_AREA )

            this.futureRedrawUpscale( i, j, updateW, updateH, includeOverlay )
          }
        }
      }
    } else {
      // 5) draw!
      copyNearestNeighbour(
          upscale,                        // dest
          ux, uy, uw, uh,                 // dest x, y, w, h
          zoom, zoom,                     // dest pixel size

          ctx.getImageData(x, y, w, h),   // src
          x, y, w, h,                     // src  x, y, w, h
          includeOverlay ? this.overlay.ctx.getImageData( x, y, w, h ) : null,

          ( ctx.globalCompositeOperation === 'source-atop' ) // bitmask pixels
      )
    }

    return true
  }

  resize( newWidth:number, newHeight:number ):void {
    if ( this.setSize( newWidth, newHeight ) ) {
      this.endDraw()
    }
  }

  scale( newWidth:number, newHeight:number, isSmooth:boolean ):void {
    if ( newWidth !== this.width || newHeight !== this.height ) {
      this.drawAndEndPaste()

      // use existing smoothing
      if ( isSmooth ) {
        const temp = htmlUtils.newCanvas( newWidth, newHeight )

        temp.ctx.drawImage(
            this.canvas,
            0, 0, this.width, this.height,
            0, 0,   newWidth,   newHeight,
        )

        this.setSize( newWidth, newHeight, true )
        this.drawSafe(() => {
          this.canvas.ctx.drawImage( temp, 0, 0 )
        })
      // use nearest neighbour
      } else {
        const oldW = this.width
        const oldH = this.height
        const srcData = this.canvas.ctx.getImageData( 0, 0, oldW, oldH )

        this.setSize( newWidth, newHeight, true )

        this.drawSafe(() => {
          copyNearestNeighbour(
              this.canvas,
              0, 0, newWidth, newHeight,

              // pixel size
              newWidth / oldW, newHeight / oldH,

              srcData,
              0, 0, oldW, oldH,

              null,
              false
          )
        })
      }

      this.endDraw()
    }
  }

  resetCompositeOpration():canvasUtils.GlobalCompositeOperation  {
    const compOp = this.canvas.ctx.globalCompositeOperation as canvasUtils.GlobalCompositeOperation
    this.canvas.ctx.globalCompositeOperation = 'source-over'

    return compOp
  }

  resetAlpha():number {
    const alpha = this.canvas.ctx.globalAlpha
    this.canvas.ctx.globalAlpha = 1.0

    return alpha
  }

  /**
   * @private
   *
   * @param newWidth
   * @param newHeight
   */
  private setSize( newWidth:number, newHeight:number, clear:boolean ) {
    const newC = htmlUtils.newCanvas()
    const canvas = this.canvas
    const oldCtx = this.overlay.ctx 

    if ( newWidth !== this.width || newHeight !== this.height ) {
      this.drawAndEndPaste()

      // create a new canvas, of the required size, and with our content
      newC.width  = newWidth
      newC.height = newHeight
      newC.setAttribute( 'class', canvas.getAttribute('class') )

      const ctxSetup = canvasUtils.backupCtx( this.canvas.ctx )
      const overlayCtxSetup = canvasUtils.backupCtx( oldCtx )

      // replace the current canvas
      if ( ! clear ) {
        newC.ctx.drawImage( this.canvas, 0, 0 )
      }
      this.$canvas.replaceWith( newC )

      this.canvas = newC
      this.$canvas = $(newC)
      this.width  = newWidth
      this.height = newHeight

      // update the overlay
      this.overlay.width  = newWidth,
      this.overlay.height = newHeight

      canvasUtils.restoreCtx( this.canvas.ctx  , ctxSetup        )
      canvasUtils.restoreCtx( this.overlay.ctx , overlayCtxSetup )

      // re-center
      this.updateCanvasSize()

      return true
    }

    return false
  }

  /**
   * This should be used when you want to interact with the graphics it's
   * self, such as erase, or if you want to read them.
   *
   * If you just want to draw on top (pencil, brush, drawing a square/circle),
   * then use 'getContext' instead as this will silently overlay it.
   *
   * @return The underlying 2D context, where the actual graphics are stored.
   */
  getDirectContext() {
    return this.canvas.ctx
  }

  /**
   * When used during drawing, this will allow you to draw on top of the
   * canvas. The effect is overlayed, until 'endDraw' is called.
   *
   * By overlaying it allows you to clear and redraw during the draw process
   * (useful for drawing lines, squares, circles and other shapes).
   *
   * @return The 2D context used for drawing.
   */
  getContext() {
    return this.overlay.ctx
  }

  /**
   * Picks a colour at the given location, and returns it.
   * Null is returned if picking from outside of the canvas.
   *
   * @return An array containing the RGBA value of the pixel selected, or null for outside of canvas.
   */
  colourPick( x:number, y:number ) {
    if ( x >= 0 && x < this.width && y >= 0 && y < this.height ) {
      return this.canvas.ctx.getImageData( x, y, 1, 1 ).data
    } else {
      return null
    }
  }

  getColor() {
    return this.canvas.ctx.strokeStyle
  }

  getRGB() {
    const color = this.getColor()

    const red   = color.substr( 1, 2 )
    const green = color.substr( 3, 2 )
    const blue  = color.substr( 5, 2 )

    return [
        parseInt( red  , 16 ),
        parseInt( green, 16 ),
        parseInt( blue , 16 ),
    ]
  }

  /**
   * @param strColor The color to set to this canvas.
   */
  setColor( strColor:string ) {
    this.canvas.ctx.strokeStyle =
    this.canvas.ctx.fillStyle =
    this.overlay.ctx.strokeStyle =
    this.overlay.ctx.fillStyle =
        strColor
  }

  useBlendAlpha():this {
    this.canvas.ctx.globalCompositeOperation = 'source-over'

    return this
  }

    /**
     * True to use the destination alpha when drawing,
     * false to not.
     */
  useDestinationAlpha():this {
    this.canvas.ctx.globalCompositeOperation = 'source-atop'

    return this
  }

  /**
   * @param alpha The alpha value to use when drawing.
   */
  setAlpha( alpha:number ) {
    this.canvas.ctx.globalAlpha =
    this.overlay.ctx.globalAlpha =
        alpha
  }

  getAlpha() {
    return this.canvas.ctx.globalAlpha
  }

  /**
   *
   */
  setImage( image:HTMLImageElement, width:number, height:number ):this {
    /*
     * If width or height are 0, undefined or null,
     * then image.width and image.height are used.
     * Otherwise width and height are used.
     */
    const w = (  width | 0 ) || image.naturalWidth
    const h = ( height | 0 ) || image.naturalHeight

    this.setSize( w, h, true )
    this.drawSafe(() => {
      this.canvas.ctx.drawImage( image, 0, 0, w, h )
    })

    return this
  }

  resetUndoRedo():this {
    this.undos.reset( this.canvas )

    return this
  }

  reset() {
    this.resetUndoRedo().
        endPaste().
        marquee.clear()

    this.grid.hide()
  }

  /**
   * Helper method for the combined undo/redo action.
   *
   * Pass in 'redo' to perform a redo, and 'undo' to perform
   * an undo.
   *
   * In practice, you don't use this, instead you use the 'redo'
   * and 'undo' methods on the CanvasManager.
   *
   * @param name The name of the action to perform, 'undo' or 'redo'.
   * @return True if the action is performed, otherwise false.
   */
  private undoRedo( name:'undo'|'redo' ) {
    const canvas = (
        name === 'undo'
            ? this.undos.undo()
            : this.undos.redo()
    )

    if ( canvas !== null ) {
      this.drawSafe(() => {
        if (
            canvas.width  !== this.canvas.width ||
            canvas.height !== this.canvas.height
        ) {
          this.setSize( canvas.width, canvas.height, true )
          this.canvas.ctx.drawImage( canvas, 0, 0 )
          // refresh upscale happens automatically, in the future, by setSize
        } else {
          this.canvas.ctx.clearRect( 0, 0, this.canvas.width, this.canvas.height )
          this.canvas.ctx.drawImage( canvas, 0, 0 )
          this.redrawUpscale()
        }
      })

      return true
    }

    return false
  }

  /**
   * An alternative to 'drawSafe' which only nullifies the alpha component.
   * For example how the alpha is mixed is left un-altered.
   *
   * @param f The function to perform.
   */
  drawSafeAlpha( f:() => void ):this {
    const alpha = this.resetAlpha()
    f()
    this.canvas.ctx.globalAlpha = alpha

    return this
  }

  /**
   * 'drawSafe' undoes lots of the options and then runs the function given.
   * For example alpha is set to 1, and the default globalCompositeOperation
   * is used.
   *
   * This is useful to allow you to perform operations without having to
   * care about those settings, such as drawing/clearing the canvas.
   *
   * @param f The function to perform whilst the canvas values have been reset.
   */
  drawSafe( f:() => void ):this {
    const alpha  = this.resetAlpha()
    const compOp = this.resetCompositeOpration()
    const fillStyle   = this.canvas.ctx.fillStyle
    const strokeStyle = this.canvas.ctx.strokeStyle

    const clip = this.getClip()
    if ( clip ) {
      this.removeClip()
    }

    f()

    if ( clip ) {
      this.setClip( clip.x, clip.y, clip.w, clip.h )
    }

    this.canvas.ctx.globalAlpha = alpha
    this.canvas.ctx.globalCompositeOperation = compOp
    this.canvas.ctx.fillStyle   = fillStyle
    this.canvas.ctx.strokeStyle = strokeStyle

    return this
  }

  /**
   * @return True if this can undo, and false if there is nothing to undo.
   */
  hasUndo() {
    return this.undos.hasUndo() || this.copyObj.isPasting()
  }

  /**
   * @return true if this has redo options to perform.
   */
  hasRedo() {
    return this.undos.hasRedo()
  }

  /**
   * If this canvas is not empty, then this will attempt to crop it.
   * Cropping is only performed if there is available space to do so.
   *
   * It also disables a number of items, such as the current paste
   * and marquee selection, for usability.
   */
  crop():this {
    this.drawAndEndPaste()

    // check for a marquee selection
    // and otherwise use the visible area
    const selection = this.marquee.getPosition()
    if ( selection === null ) {
      selection = this.getDrawnArea()
    } else {
      // remove the marquee, since it is selecting everything
      this.marquee.clear()
    }

    if ( selection !== null ) {
      const x  = selection.x
      const y  = selection.y
      const w2 = selection.w
      const h2 = selection.h

      const temp = htmlUtils.newCanvas( w2, h2 )
      temp.ctx.drawImage( this.canvas, -x, -y )

      this.setSize( w2, h2, true )

      this.drawSafe(() => {
        this.canvas.ctx.drawImage( temp, 0, 0 )
      })

      this.endDraw()
    }

    return this
  }

  /**
   * Returns an object describing the area on the canvas,
   * which has been drawn to.
   *
   * If there has been no drawing, then null is returned.
   */
  getDrawnArea():Nullable<SizeArea> {
    const w = this.width
    const h = this.height

    const data = this.canvas.ctx.getImageData( 0, 0, w, h ).data

    let minX = 0
    let minY = 0
    let maxX = w
    let maxY = h

    // search for minX, minY, maxX, maxY, working inwards on all sides
    // search for minY
    let i = 0
    for ( let y = 0; y < h; y++ ) {
      let hasAlpha = false

      for ( let x = 0; x < w; x++ ) {
        if ( data[i+3] > 0 ) {
          hasAlpha = true
          break
        }

        i += 4
      }

      if ( hasAlpha ) {
        break
      }

      minY = y+1
    }

    // search for maxY
    i = 0
    for ( let y = h-1; y >= 0; y-- ) {
      let hasAlpha = false

      for ( let x = 0; x < w; x++ ) {
        if ( data[i+3] > 0 ) {
          hasAlpha = true
          break
        }

        i += 4
      }

      if ( y <= minY ) {
        return null
      }

      if ( hasAlpha ) {
        break
      }
      
      maxY = y
    }

    // search for minX
    i = 0
    for ( let x = 0; x < w; x++ ) {
      const hasAlpha = false

      for ( let y = 0; y < h; y++ ) {
        if ( data[i+3] > 0 ) {
          hasAlpha = true
          break
        }

        i += 4
      }

      if ( hasAlpha ) {
        break
      }
      
      minX = x+1
    }

    // search for maxX
    i = 0
    for ( let x = w-1; x >= 0; x-- ) {
      let hasAlpha = false

      for ( let y = 0; y < h; y++ ) {
        if ( data[i+3] > 0 ) {
          hasAlpha = true
          break
        }

        i += 4
      }

      if ( x <= minX ) {
        return null
      }

      if ( hasAlpha ) {
        break
      }
      
      maxX = x
    }

    // Don't crop if the image is empty!

    // if we can crop, we do:
    if ( minX > 0 || minY > 0 || maxX < w || maxY < h ) {
      return {
          x: minX,
          y: minY,
          w: maxX-minX,
          h: maxY-minY,
      }
    }

    return null
  }

  clearAll() {
    this.drawSafe(() => {
      this.canvas.ctx.clearRect( 0, 0, this.canvas.width, this.canvas.height )
    })
  }

  /**
   * Cleares this canvas of all content,
   * and adds the current content to the undo stack.
   */
  clear() {
    const w = this.width
    const h = this.height

    this.drawAndEndPaste()

    this.canvas.ctx.clearRect( 0, 0, w, h )

    // push current context to the undo/redo
    // and update the whole screen
    this.endDraw({
      x : 0,
      y : 0,
      w : w,
      h : h,
    })
  }

  /**
   * @return True if an undo was performed, otherwise false.
   */
  redo():boolean {
    return this.undoRedo( 'redo' )
  }

  /**
   * @return True if an undo was performed, otherwise false.
   */
  undo():boolean {
    if ( this.copyObj.isPasting() ) {
      this.endPaste()

      return true
    } else {
      return this.undoRedo( 'undo' )
    }
  }
}

/**
 * Used for turning a control name into a CSS class, for
 * id purposes.
 *
 * Essentially it's so if I have a control called 'zoom'
 * then this is turned into a CSS class, and attached to
 * the control. This is for internal use, and shouldn't
 * clash with anything else.
 *
 * This class can then be used again later, for finding
 * the control.
 *
 * @const
 * @nosideeffects
 * @param name The name to translate
 * @return The CSS identifier for the given name.
 */
function controlNameToCSSID( name:string ) {
  return CONTROL_ID_CSS_PREFIX + name.toLowerCase()
}

/**
 * Creates a new DOM element, for the control given,
 * all hooked up.
 *
 * Control info should provide:
 *  = name - the name of this control
 *  = type - checkbox, toggle, slider or another supported type.
 *  = field - the field that is updated by this control in the command.
 *
 * Extra properties include:
 *  = css - a CSS class added to the final control.
 *  = value - The default value to set for the field, and it's control.
 *
 * Extra properties are also required on a type by type basis.
 *
 * @param command The Command that the control info will place their info into.
 * @param control The control to create a DOM control for, this is the setup info.
 * @return The HTML control once built.
 */
function newCommandControl(
    command,
    control,
    painter,
) {
  const name     = control.name
  const type     = control.type.toLowerCase()
  const css      = control.css
  const callback = control.callback
  const field    = control.field
  const isCursor = control.cursor || false

  if ( name === undefined ) {
    throw new Error( "Control is missing 'name' field" )
  } else if ( type === undefined ) {
    throw new Error( "Control is missing 'type' field" )
  } else if ( field === undefined ) {
    throw new Error( "Control is missing 'field' field" )
  }

  const defaultField = (
      control.hasOwnProperty( 'value' )
          ? control.value
          : command[ field ]
  )

  const cDom = document.createElement( 'div' )
  cDom.className =
      'skybrush_control '         +
      CONTROL_CSS_PREFIX + type   +
      ((css !== undefined) ?
          ' sb_' + css :
          '' ) 

  const label = document.createElement('div')
  label.className = 'skybrush_command_control_label'
  label.innerHTML = name
  cDom.appendChild( label )

  const cssID = controlNameToCSSID( name )

  /*
   * Create the Dom Element based on it's type.
   * All supported types are listed here.
   */
  if ( type === 'checkbox' ) {
    if ( defaultField === undefined ) {
      defaultField = false
    }

    const checkbox = newInput( 'checkbox', cssID )
    checkbox.addEventListener( 'change', () => {
      const isChecked = checkbox.checked

      command[ field ] = isChecked
      if ( callback ) {
        callback.call( command, isChecked, painter )
      }

      if ( isCursor ) {
        painter.refreshCursor( command )
      }
    })

    if ( command[field] ) {
      checkbox.setAttribute( 'checked', 'checked' )
    }

    cDom.appendChild( checkbox )
  } else if ( type === 'toggle' ) {
    const cssStates = control.css_options
    const names = control.name_options

    const numOptions =
        ( cssStates ? cssStates.length :
        ( names     ? names.length     :
                0 ) )

    let option = -1

    const toggle = document.createElement( 'input' )
    toggle.type = 'button'
    toggle.classList.add( 'skybrush_input_button' )
    toggle.classList.add( cssID )

    const switchOption = function() {
      if ( cssStates && cssStates[option] ) {
        toggle.classList.remove( cssStates[option] )
      }

      option = (option+1) % numOptions
      if ( names ) {
        toggle.val( names[option] )
      }
      if ( cssStates && cssStates[option] ) {
        toggle.classList.add( cssStates[option] )
      }
    }

    switchOption()

    toggle.addEventListener( 'click', function(ev) {
        ev.stopPropagation()
        ev.preventDefault()
        switchOption()

        command[ field ] = option
        if ( callback ) {
          callback.call( command, option, painter )
        }

        if ( isCursor ) {
          painter.refreshCursor( command )
        }
    } )

    cDom.appendChild( toggle.get(0) )
  } else if ( type === 'slider' ) {
    const min  = control.min
    const max  = control.max
    const step = control.step || 1

    if ( defaultField === undefined ) {
      defaultField = Math.max( 1, min )
    }

    const handleInputChange = function( ev:KeyboardEvent ) {
      // key up, and key down
      if ( ev.keyCode === 38 ) {
        const val = parseFloat( this.value )

        if ( val < max ) {
          this.value = '' + Math.min( max, val + step )
        }

      } else if ( ev.keyCode === 40 ) {
        const val = parseFloat( this.value )

        if ( val > min ) {
          this.value = '' + Math.max( min, val - step )
        }
      }

      requestAnimationFrame(() => {
        const n = this.value

        if ( n && n >= 1 ) {
          n = Math.round( n )
          slider.value = n

          command[ field ] = n

          if ( callback ) {
            callback.call( command, n, painter )
          }

          if ( isCursor ) {
            painter.refreshCursor( command )
          }
        }
      })
    }

    const val = newNumericInput( false, 'skybrush_input' )
    val.setAttribute( 'step', step )
    val.setAttribute( 'min', min )
    val.setAttribute( 'max', max )
    val.addEventListener( 'keydown', handleInputChange )
    val.addEventListener( 'change',  handleInputChange )
    // initialize
    val.value = defaultField

    const slider = newSlider({
        step  : step,
        min   : min,
        max   : max,
        value : defaultField,

        onChange : ( n, p ) => {
          command[ field ] = n
          val.val( n )

          if ( callback ) {
            callback.call( command, n, painter )
          }

          if ( isCursor ) {
            painter.refreshCursor( command )
          }
        }
    })
    slider.classList.add( cssID )

    cDom.appendChild( slider )
    cDom.appendChild( val    )

  } else {
    throw new Error( "Unknown control setup given" )

  }

  command[ field ] = defaultField

  return cDom
}

/**
 * Commands are setup through a JSON object.
 *
 * This is used so other functions can change those
 * properties on the fly, and require new items.
 *
 * The other advantage is that it allows many to be
 * optional.
 *
 * Before they were all passed in for each constructor,
 * but given that many are optional, this list was
 * becomming unmanageable.
 *
 * Basic properties include:
 *  = name
 *  = css
 *  = cursor
 *  = caption - the tooltip caption to be used
 *
 * All events are called in the context of this command.
 *
 * Drawing Events:
 *  = onDown - called when mouse goes down,
 *  = onMove - then this is called as it's moved,
 *  = onUp - finally this is called when it goes up.
 *
 *  = onDownOnMove - event used for both onDown and onMove
 *  = onMoveOnUp - event used for both onMove and onUp
 *
 * Some sub-versions of Command add their own 'onDraw'
 * event. This is a general purpose draw event used for
 * onDown, onMove and onUp; but is normally wrapped in
 * custom logic.
 *
 * However the Command prototype ignores onDraw.
 *
 * Other Events:
 *  = onAttach - called when the Command is set.
 *  = onDetach - called when the Command is unset.
 *
 *  = onShift - called when the shift button is pressed
 *    down or up. The state and SkyBrush are passed in,
 *    in that order.
 *
 *    This is also called when the command is attached to
 *    SkyBrush, but only if the shift is down. This is so
 *    if you update the controls it'll be setup correctly
 *    on attach, and undone on detach.
 *
 *    But to clarify, if shift is not pressed, this will
 *    never be called.
 *
 * Special logic is also added to ensure onAttach and
 * onDetach cannot be called recursively, as sometimes
 * this can happen.
 *
 * @constructor
 * @private
 *
 * @param setup The information needed for this command.
 * @param controlsSetup An array listing all of the commands for this control.
 */
export class Command {
  constructor( setup ) {
    this.name    = setup.name    || '' 
    this.caption = setup.caption || '' 
    this.cursor  = setup.cursor  || null
    this.css     = setup.css ?
        COMMAND_CSS_PREFIX + setup.css :
        ''                             

    this.drawArea = null

    this.dom = null
    this.domInitialized = false
    this.controlsSetup = setup.controls

    if ( setup.onDown ) {
      this.onDown = setup.onDown
    }

    if ( setup.onDownOnMove ) {
      this.onDown =
      this.onMove =
           setup.onDownOnMove
    }

    if ( setup.onMoveOnUp ) {
      this.onUp   =
      this.onMove =
          setup.onMoveOnUp
    }

    if ( setup.onMove ) {
      this.onMove = setup.onMove
    }

    if ( setup.onUp ) {
      this.onUp = setup.onUp
    }

    this.whenAttached = setup.onAttach || null
    this.whenDetached = setup.onDetach || null

    const onShift = setup.onShift
    if ( onShift ) {
      const thisCommand = this

      this.shiftDown = function( isShiftDown ) {
        // This should use both 'self' and 'this' here, it is not
        // a bug.
        onShift.call( thisCommand, isShiftDown, this )
      }
    } else {
      this.shiftDown = null
    }

    this.isInAttach = false
    this.isInDetach = false
  }

  getCSS() {
    return this.css
  }

  /**
   * Called when a Command object is set as the current
   * command.
   *
   * @param painter The parent SkyBrush instance this is being attached to.
   */
  onAttach( painter ) {
    if ( ! this.isInAttach ) {
      this.isInAttach = true

      if ( this.whenAttached ) {
        this.whenAttached.call( this, painter )
      }

      if ( this.shiftDown ) {
        painter.onShift( this.shiftDown )

        // call if shift is down,
        // so control is properly setup
        if ( painter.isShiftDown() ) {
          this.shiftDown.call( painter, true )
        }
      }

      this.isInAttach = false
    }
  }

  /**
   * For when a Command object is detached from SkyBrush,
   * and it is no longer set as the current command.
   *
   * @param painter The parent SkyBrush instance this is being detached from.
   */
  onDetach( painter ) {
    if ( ! this.isInDetach ) {
      this.isInDetach = true

      if ( this.shiftDown ) {
        painter.removeOnShift( this.shiftDown )

        /*
         * If changing whilst shift is down,
         * we call as though it was lifte,
         * so it's like it was released.
         */
        if ( painter.isShiftDown() ) {
          this.shiftDown.call( painter, false )
        }
      }

      if ( this.whenDetached ) {
        this.whenDetached.call( this, painter )
      }

      this.isInDetach = false
    }
  }

  getCursor() {
    return this.cursor
  }

  getCaption() {
    return this.caption
  }

  getName() {
    return this.name
  }

  /**
   * Finds the control stated, based on it's 'name'.
   *
   * If the control is not found, then an empty jQuery
   * object will be returned.
   *
   * @param A jQuery object for the control.
   */
  getControl( name:string ):HTMLElement {
    return this.getControlsDom().getElementsByClassName( controlNameToCSSID(name) )[0]
  }

  /**
   * This returns null if there are no controls
   * for this command.
   *
   * @return The HTML dom with all the control structures for this command.
   */
  createControlsDom( painter:skybrush.SkyBrush ):HTMLElement {
    /*
     * Controls dom is loaded in a lazy way so painter
     * starts up a tad faster,
     */
    if ( ! this.domInitialized ) {
      this.domInitialized = true

      const dom = document.createElement( 'div' )
      dom.className = 'skybrush_command_controls_inner' 

      const controlsSetup = this.controlsSetup
      if ( ! controlsSetup ) {
        dom.innerHTML = '<div class="skybrush_command_no_controls">no settings</div>'
      } else if ( controlsSetup instanceof Array ) {
        for ( let i = 0; i < controlsSetup.length; i++ ) {
          dom.appendChild(
              newCommandControl( this, controlsSetup[i], painter )
          )
        }
      } else {
        dom.appendChild(
            newCommandControl( this, controlsSetup, painter )
        )
      }

      this.dom = dom
    }

    return this.dom
  }

  /**
   * Returns the dom containing all of the command options
   * for this Command, or null if there is no dom.
   *
   * There would be no dom if there are no options.
   */
  getControlsDom() {
    return this.dom
  }

  popDrawArea() {
    const t = this.drawArea
    this.drawArea = null

    return t
  }

  addDrawArea( x, y, w, h, buffer ) {
    const da = this.drawArea

    if ( da !== null ) {
      buffer = buffer || 1

      if ( h === undefined ) {
        x -= w/2,
        y -= w/2
        h = w
      }

      if ( w < 0 ) {
        x -= w
        w = -w
      }

      if ( h < 0 ) {
        y -= h
        h = -h
      }

      da.x    = Math.min( da.x   , x - buffer )
      da.y    = Math.min( da.y   , y - buffer )
      da.endX = Math.max( da.endX, x+w+buffer )
      da.endY = Math.max( da.endY, y+h+buffer )
    } else {
      this.setDrawArea( x, y, w, h, buffer )
    }

    return this
  }

  /**
   * This can be used in a single args version, to allow passing
   * the Draw Area object from one command to another.
   *
   * Usage:
   *      brush.setDrawArea( otherBrush.popDrawArea() )
   *
   * You can also use it in a multi-args version to setup a drawing/refresh area.
   *
   * @param x
   * @param y
   * @param w or size, w when h is provided and size when it's omitted.
   * @param h Optional,
   * @param buffer Optional, a buffer around the area to be updated. This must be at least 1.
   */
  setDrawArea( x, y, w, h, buffer ):this {
    // If used in single args version,
    // this allows setting 'null' as the draw area (no draw)
    if ( y === undefined && x !== undefined ) {
      this.drawArea = x
    } else {
      buffer = buffer || 1

      if ( h === undefined ) {
        x -= w,
        y -= w
        h  = w
      }

      if ( w < 0 ) {
        w  = -w
        x -=  w
      }

      if ( h < 0 ) {
        h  = -h
        y -=  h
      }

      this.drawArea = {
          x: x-buffer,
          y: y-buffer,
          endX: x+w+buffer,
          endY: y+h+buffer,
      }
    }

    return this
  }
}

/**
 * The standard minimum and maximum brush sizes,
 * and a way to limit them.
 */
const BRUSH_SIZE = {
  min: 1,
  max: MAX_BRUSH_SIZE,

  limit: function( size ) {
    return Math.limit( size, this.min, this.max )
  }
}

/**
 * Creates a new Brush, with the name, css class and events given.
 * Some extras are added on top, which the standard Command does
 * not have, like brush size.
 *
 * @constructor
 * @private
 */
class Brush extends Command {
  constructor( setup ) {
    const brushSizeControl = {
        name: 'Size',
        field: 'size',

        type: 'slider',
        css : 'size',

        cursor: true,

        min: 1,
        max: MAX_BRUSH_SIZE,
    }

    const controls = setup.controls
    if ( controls === undefined ) {
      controls = [ brushSizeControl ]
    } else {
      controls = setup.controls
      let addControl = true

      for ( let i = 0; i < controls.length; i++ ) {
        if ( controls[i].field === brushSizeControl.field ) {
          addControl = false
          break
        }
      }

      if ( addControl ) {
        controls.unshift( brushSizeControl )
      }
    }

    setup.controls = controls

    super( setup )

    this.size = 0
    this.setSize( DEFAULT_BRUSH_SIZE )
  }

  /**
   * Sets the size for this brush.
   * This is automtically limited to default min/max values.
   *
   * @param size The new size for this brush.
   */
  setSize( size:number ) {
    this.size = BRUSH_SIZE.limit( size )
  }

  /**
   * Increments the size by the amount given.
   *
   * @param inc The amount to increment the size.
   */
  incrementSize( inc:number ) {
    this.setSize( this.size + inc )
  }
}

class Geometry extends Command {

  /**
   * Commands for drawing geometry.
   *
   * For the setup, it adds the properties:
   *
   *  = onDraw - called for drawing geometry
   *  = onDown - already exists, but is wrapped in it's own onDown
   *
   * @constructor
   * @private
   *
   * @param setup The controls information for this command.
   */
  constructor( setup ) {
    this.startX = 0
    this.startY = 0

    this.isFilled = true
    this.size = 1

    this.isAliased = false

    this.drawGeom = setup.onDraw

    const oldOnDown = setup.onDown
    setup.onDown = function( canvas, x, y ) {
      if ( ! this.isAliased ) {
        x |= 0
        y |= 0
      }

      this.startX = x,
      this.startY = y
      this.lastX = x
      this.lastY = y

      canvas.getContext().lineJoin = 'miter'

      if ( oldOnDown ) {
        oldOnDown.call( this, canvas, x, y )
      }
    }
    setup.onMove = function( canvas, x, y ) {
      if ( ! this.isAliased ) {
        x |= 0
        y |= 0
      }

      this.drawGeom( canvas.getContext(), this.startX, this.startY, x, y, this.lastX, this.lastY )

      this.lastX = x
      this.lastY = y
    }
    setup.onUp = function( canvas, x, y ) {
      if ( ! this.isAliased ) {
        x |= 0
        y |= 0
      }

      this.setDrawArea( this.startX, this.startY, x-this.startX, y-this.startY, this.size )

      this.drawGeom( canvas.getContext(), this.startX, this.startY, x, y, this.lastX, this.lastY )

      this.lastX = x
      this.lastY = y
    }

    setup.cursor = constants.DEFAULT_CURSOR

    super( setup )
  }

  round( n:number, isOutline:boolean, size:number ) {
    if ( (!isOutline) || size % 2 === 0 ) {
      return n | 0
    } else {
      return (n | 0) + 0.5
    }
  }

  toggleAliased() {
    this.isAliased = ! this.isAliased
  }

  toggleFilled() {
    this.isFilled = ! this.isFilled
  }
}

class ShapeGeometry extends Geometry {
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

/* Helper Drawing Function */

function renderLine(
    fun    : Consumer4<HTMLCanvasElement, number, number, number>,
    canvas : HTMLCanvasElement,
    x1:number, y1:number,
    x2:number, y2:number,
    size:number,
) {
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
    fun( canvas, (x+0.5)|0, (y+0.5)|0, size )

    x += xInc
    y += yInc
  }
}

function drawPixelLine( ctx:CanvasRenderingContext2D, x0:number, y0:number, x1:number, y1:number, size:number ) {
  x0 = Math.round( x0 )
  x1 = Math.round( x1 )
  y0 = Math.round( y0 )
  y1 = Math.round( y1 )

  const sizeI = Math.round( size )
  const sizeI2 = (sizeI/2) | 0

  const yDiff = y1 - y0
  const xDiff = x1 - x0

  const aXDiff = Math.abs( xDiff )
  const aYDiff = Math.abs( yDiff )

  if ( aXDiff < aYDiff ) {
    if ( aXDiff < 1.5 ) {
      ctx.fillRect( x0-sizeI2, y0, sizeI, y1-y0 )
    }
  } else if ( aYDiff < 1.5 ) {
    ctx.fillRect( x0, y0-sizeI2, x1-x0, sizeI )
  }

  /*
   * When this is true, we draw across the screen
   * in horizontal rectangles.
   *
   * When this is false, we draw down the screen,
   * with vertical rectangles.
   */
  const moveHorizontal = ( aXDiff > aYDiff )
  if ( moveHorizontal ) {
    y0 -= sizeI2
    y1 -= sizeI2
  } else {
    x0 -= sizeI2
    x1 -= sizeI2
  }

  const inc = Math.min( aXDiff, aYDiff )
  const xInc = xDiff / inc
  const yInc = yDiff / inc

  let yStart = y0
  let yEnd   = y1
  let xStart = x0
  let xEnd   = x1

  if ( moveHorizontal ) {
    if ( yStart > yEnd ) {
      let t = yStart
      yStart = yEnd
      yEnd = t

      t = xStart
      xStart = xEnd
      xEnd = t

      xInc = -xInc
    }
  } else {
    if ( xStart > xEnd ) {
      let t = xStart
      xStart = xEnd
      xEnd = t

      t = yStart
      yStart = yEnd
      yEnd = t

      yInc = -yInc
    }
  }

  for ( let i = 0; i < sizeI; i++ ) {
    if ( moveHorizontal ) {
      const x = xStart

      for ( let y = yStart; y < yEnd; y++ ) {
        const drawX = x|0
        const drawY = y|0
        const xWidth = ((x + xInc)|0) - drawX 

        ctx.fillRect( drawX, drawY, xWidth, 1 )

        x += xInc
      }

      yStart++
      yEnd++
    } else {
      const y = yStart

      for ( let x = xStart; x < xEnd; x++ ) {
        const drawX = x|0
        const drawY = y|0
        const yWidth = ((y + yInc)|0) - drawY 

        ctx.fillRect( drawX, drawY, 1, yWidth )

        y += yInc
      }

      xStart++
      xEnd++
    }
  }

  return

  // swap values so we iterate less
  // this code was never finished
  // that's why the maths is clearly odd
  const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0)
  if ( steep ) {
    let t = x0
    x0 = y0
    y0 = t

    t = x1
    x1 = y1
    y1 = t
  }
  if ( x0 > x1 ) {
    let t = x0
    x0 = x1
    x1 = t

    t = y0
    y0 = y1
    y1 = t
  }
  if ( y0 > y1 ) {
    let t = y0
    y0 = y1
    y1 = t

    t = y0
    y0 = y1
    y1 = t
  }

  const deltaX = x1 - x0
  const deltaY = Math.abs( y1 - y0 )

  const yStep = (
      ( y0 < y1 )
          ?  1
          : -1
  )

  // Now DRAW!
  const sizeI = Math.round( size )
  const error = deltaX / 2
  const y     = y0 - Math.round( size / 2 )

  let c = 0
  for ( let y = y0; y < y1; y++ ) {
    c++
    if ( steep ) {
      ctx.fillRect( y, x, sizeI, 1 )
    } else {
      ctx.fillRect( x, y, 1, sizeI )
    }

    error = error - deltaY
    if ( error < 0 ) {
      y = y + yStep
      error = error + deltaX
    }
  }
}

/**
 * A bespoke brush, specifically for pixelated drawing.
 */
class PixelBrush extends Brush {
  constructor( setup ) {
    const brushCmd = setup.onDraw
    this.pencilCommand = function( canvas:HTMLCanvasElement, x:number, y:number, size:number ) {
      brushCmd( canvas, x, y, size )
    }

    setup.onDown = function( canvas:HTMLCanvasElement, x:number, y:number ) {
      this.lastX = x
      this.lastY = y
      this.skipFirst = true

      const size = Math.round( this.size )

      x -= (size/2) | 0
      y -= (size/2) | 0

      this.pencilCommand( canvas, x, y, size )
      canvas.redrawUpscale( x|0, y|0, 0, 0, undefined, size )

      this.addDrawArea( x|0, y|0, size )
    }

    setup.onMoveOnUp = function( canvas:HTMLCanvasElement, x:number, y:number ) {
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

      renderLine( this.pencilCommand, canvas, x, y, this.lastX, this.lastY, size)

      canvas.redrawUpscale( x|0, y|0, diffX, diffY, undefined, size )
      this.addDrawArea( x|0, y|0, diffX, diffY, size )

      this.lastX = x
      this.lastY = y
    }

    super( setup )
  }
}

const pickerCommand = new Command({
    name  : 'Picker',
    css   : 'picker',

    caption: 'Colour Picker | shortcut: k or hold Alt',
    cursor: 'sb_cursor_picker',

    onDownOnMove : function( canvas, x, y, painter ) {
      const rgb = canvas.colourPick( x, y )

      if ( rgb !== null ) {
        painter.setColor( colourUtils.rgbToColor(rgb[0], rgb[1], rgb[2]) )
        painter.setAlpha( rgb[3] / 255.0 )
      }
    }
})

// When we switch to the Eraser we have to store the previous command.
// This is the code that stores that previous command.
let eraserSwitch :Nullable<Command> = null
const switchToEraser = function( shiftDown, painter ) {
  if ( shiftDown ) {
    eraserSwitch = this
    painter.setCommand( eraser )
  }
}

/* Eraser
 *
 * Works by having two built internally:
 * = hard eraser, works on a pixel level
 * = soft eraser, has faded edges
 *
 * The complete eraser houses both, and switches between them.
 */
const eraser =
    (function() {
      const hardErase = new PixelBrush({
          name: 'Eraser',
          css : 'eraser',

          onDraw: function( canvas, x, y, size ) {
            const ctx = canvas.getDirectContext()
            const gc = ctx.globalCompositeOperation

            ctx.globalCompositeOperation = 'destination-out'
            canvas.getDirectContext().fillRect( x | 0, y | 0, size, size )
            ctx.globalCompositeOperation = gc
          }
      })

      const softErase = new Brush( {
          name: 'Soft Eraser',
          css : 'soft_eraser',

          onDown: function( canvas:HTMLCanvasElement, x:number, y:number ) {
            this.lastX = x
            this.lastY = y
          },

          onMoveOnUp: function( canvas:HTMLCanvasElement, x:number, y:number ) {
            const diffX = this.lastX - x
            const diffY = this.lastY - y

            this.drawLine( canvas.getDirectContext(), x, y )
            canvas.redrawUpscale( this.lastX, this.lastY, diffX, diffY, undefined, this.size*2 )

            this.addDrawArea( this.lastX, this.lastY, diffY, diffY, this.size*2 )
          }
      } )
      softErase.drawLine = function( ctx:CanvasRenderingContext2D, x:number, y:number ) {
        const compOp = ctx.globalCompositeOperation

        ctx.globalCompositeOperation = 'destination-out'
        ctx.lineJoin = 'round'

        ctx.lineWidth = this.size

        ctx.beginPath()
        ctx.moveTo( this.lastX, this.lastY )
        ctx.lineTo( x, y )
        ctx.closePath()

        ctx.stroke()

        ctx.globalCompositeOperation = compOp

        this.lastX = x
        this.lastY = y
      }

      const eraser = new Command( {
          name: 'Eraser',
          css : 'eraser',
          caption: 'Eraser | shortcut: e',

          onDown: function( canvas, x, y ) {
            const brush = this.isAliased   ? this.soft : this.hard 

            brush.size = this.size
            brush.onDown( canvas, x, y )
            this.brush = brush
          },

          onMove: function( canvas, x, y ) {
            this.brush.onMove( canvas, x, y )
          },

          onUp: function( canvas, x, y ) {
            this.brush.onUp( canvas, x, y )
            this.setDrawArea( this.brush.popDrawArea() )
          },

          cursor: function( cursor, painter ) {
            if ( this.isChecked ) {
              cursor.setCircle( this.size )
            } else {
              cursor.setSquare( this.size )
            }
          },

          controls: [
            {
              name: 'Size',
              field:'size',
              type: 'slider',

              cursor: true,

              value: 1,
              min: 1,
              max: 50,
            },
            {
              name: 'Smooth',
              field:'isAliased',
              type: 'checkbox',

              cursor: true,

              value: false,
            }
          ],

          /*
           * Logic for handling switching to the eraser
           * using shift, and then switching back.
           */

          // shift back to the last control,
          // if we shifted to the eraser
          onShift: function( shiftDown, painter ) {
            if ( eraserSwitch && ! shiftDown ) {
              painter.setCommand( eraserSwitch )
              eraserSwitch = null
            }
          }
      } )
      eraser.soft = softErase
      eraser.hard = hardErase

      return eraser
    })()

function newCommand() {
  return [
      pickerCommand,

      new PixelBrush({
          name: 'Pencil',
          css : 'pencil',
          caption: 'Pencil | shortcut: p, shift: switches to eraser',

          onDraw: function( canvas, x, y, size ) {
            x = x|0
            y = y|0

            canvas.getDirectContext().fillRect( x, y, size, size )
          },

          cursor: function( cursor, painter ) {
            cursor.setSquare( this.size )
          },

          onShift: switchToEraser,
      }),
      (function() {
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
        const b = new Brush({
            name: 'Brush',
            css : 'brush',
            caption: 'Paint Brush | shortcut: b, shift: switches to eraser',

            cursor: function( cursor, painter ) {
              cursor.setCircle( this.size )
            },

            onDown: function( canvas, x, y ) {
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
            },
            onMove: function( canvas, x, y ) {
              this.updateLine( canvas, x, y )

              canvas.hideOverlay()
              canvas.redrawUpscale( this.lastX, this.lastY, x-this.lastX, y-this.lastY, true, this.size*2 )
            },
            onUp: function( canvas, x, y ) {
              this.updateLine( canvas, x, y )

              // end the current path
              canvas.getContext().beginPath()

              this.setDrawArea(
                  this.minX, this.minY,
                  this.maxX-this.minX, this.maxY-this.minY,
                  this.size,
              )
            },

            onShift: switchToEraser,
        })

        b.updateLine = function( canvas, x, y ) {
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

        return b
      })(),

      (function() {
        /*
         * The webby/shading brush, used for shading areas.
         *
         * It stores and builds a list of pixels over the course of drawing,
         * and iterates over this, to work out new areas to draw upon.
         */
        const b = new Brush( {
            name: 'Webby',
            css : 'web',
            caption: 'Web Brush | shortcut: w, shift: switches to eraser',

            cursor: function(cursor, painter) {
              cursor.setCircle( this.size )
            },

            controls: [
                {
                    name : 'Size',
                    field: 'size',
                    value: 2,

                    type: 'slider',

                    cursor: true,

                    min: 1,
                    max: MAX_BRUSH_SIZE/10,
                },
                {
                    name : 'Dist',
                    field: 'dist',
                    value: 60,

                    type: 'slider',

                    min: 10,
                    max: 200,
                },
                {
                    name : 'Fuzzy',
                    field: 'fuzzy',
                    value: 1,

                    type: 'slider',

                    min: 1,
                    max: 25,
                },
                {
                    name: 'continuous',
                    field: 'isContinous',
                    value: true,
                    type: 'checkbox',
                }
            ],

            onDown: function( canvas, x, y ) {
              this.x =
                  this.lastX =
                  this.minX =
                  this.maxX = x

              this.y =
                  this.lastY =
                  this.minY =
                  this.maxY = y

              this.updateArea = {
                  minX: 1,
                  minY: 1,
                  maxX: 0,
                  maxY: 0,
              }

              const ctx = canvas.getContext()
              ctx.lineWidth = this.size
              ctx.lineCap   = 'round'
              ctx.lineJoin  = 'round'
              ctx.beginPath()

              /*
               * This is to trick it into starting a line,
               * when the mouse goes down.
               */
              this.xs = [ x-0.1 ]
              this.ys = [ y-0.1 ]

              this.updateLine( canvas, x, y, this.updateArea )

              canvas.hideOverlay()

              if ( this.updateArea.minX < this.updateArea.maxX ) {
                canvas.redrawUpscale(
                    this.updateArea.minX,
                    this.updateArea.minY,
                    this.updateArea.maxX-this.updateArea.minX,
                    this.updateArea.maxY-this.updateArea.minY,
                    true,
                    this.size*2
                )
              }
            },
            onMove: function( canvas, x, y ) {
              this.updateLine( canvas, x, y, this.updateArea )

              canvas.hideOverlay()

              if ( this.updateArea.minX < this.updateArea.maxX ) {
                canvas.redrawUpscale(
                    this.updateArea.minX,
                    this.updateArea.minY,
                    this.updateArea.maxX-this.updateArea.minX,
                    this.updateArea.maxY-this.updateArea.minY,
                    true,
                    this.size*2
                )
              }
            },

            onUp: function( canvas, x, y ) {
              this.updateLine( canvas, x, y, this.updateArea )

              // end the current path
              canvas.getContext().beginPath()

              this.setDrawArea(
                  this.minX, this.minY,
                  this.maxX-this.minX, this.maxY-this.minY,
                  this.size
              )
            },

            onShift: switchToEraser
        })

        b.updateLine = function(
            canvas:HTMLCanvasElement,
            x:number,
            y:number,
            updateArea:MinMaxArea,
        ) {
          const lastX = this.lastX = this.x
          const lastY = this.lastY = this.y

          this.x = x
          this.y = y

          this.minX = Math.min( this.minX, x )
          this.maxX = Math.max( this.maxX, x )
          this.minY = Math.min( this.minY, y )
          this.maxY = Math.max( this.maxY, y )

          this.xs.push( x )
          this.ys.push( y )

          const xs = this.xs
          const ys = this.ys

          const ctx = canvas.getContext()

          const alpha = ctx.globalAlpha

          /**
           * Set these to invalid values, where min is greater
           * than max.
           *
           * min should be greater than the maximum possible value,
           * and max should be smaller than the smallest possible value.
           *
           * I don't go to extremes, like Integer MAX_NUMBER,
           * because that is a 64-bit value. Keeping it to within 31-bits,
           * hits a chrome optimization.
           */
          let minX = canvas.width+1
          let maxX = -1

          let minY = canvas.height+1
          let maxY = -1

          const minDist = (
              ( this.dist > this.size )
                  ? this.dist * this.dist
                  : this.size * this.size
          )

          if ( this.isContinous ) {
            ctx.beginPath()
            ctx.moveTo(this.lastX, this.lastY)
            ctx.lineTo(x, y)
            ctx.stroke()

            minX = Math.min( minX,
                Math.min( this.lastX, x )
            )
            minY = Math.min( minY,
                Math.min( this.lastY, y )
            )
            maxX = Math.max( maxX,
                Math.max( this.lastX, x )
            )
            maxY = Math.max( maxY,
                Math.max( this.lastY, y )
            )
          }

          const length = this.xs.length
          const maxSkip = this.fuzzy
          const skip = maxSkip

          for (let i = 0; i < length; i++) {
            const xi = xs[i]
            const yi = ys[i]

            const xDist = xi - x
            const yDist = yi - y
            const hypot = xDist * xDist + yDist * yDist

            if ( hypot < minDist ) {
              if ( --skip === 0 ) {
                skip = maxSkip

                ctx.globalAlpha = alpha * ((1 - (hypot / minDist)) * 0.1)
                ctx.beginPath()
                ctx.moveTo(x, y)
                ctx.lineTo(xi, yi)
                ctx.stroke()

                if ( x < xi ) {
                  if ( x < minX ) {
                    minX = x
                  }
                  if ( xi > maxX ) {
                    maxX = xi
                  }
                } else {
                  if ( xi < minX ) {
                    minX = xi
                  }
                  if ( x > maxX ) {
                    maxX = x
                  }
                }

                if ( y < yi ) {
                  if ( y < minY ) {
                    minY = y
                  }
                  if ( yi > maxY ) {
                    maxY = yi
                  }
                } else {
                  if ( yi < minY ) {
                    minY = yi
                  }
                  if ( y > maxY ) {
                    maxY = y
                  }
                }
              }
            }
          }

          updateArea.minX = minX
          updateArea.minY = minY
          updateArea.maxX = maxX
          updateArea.maxY = maxY

          ctx.globalAlpha = alpha
        }

        return b
      })(),

      eraser,

      /* Geometry Commands */
      new ShapeGeometry( {
          name: 'Rectangle',
          css : 'rectangle',
          caption: 'Draw Rectangle | shortcut: r, shift: toggles outline',

          onDraw: function( ctx, x1, y1, x2, y2 ) {
            const w = x2-x1
            const h = y2-y1

            if ( this.isOutline ) {
              ctx.lineWidth = this.size
              ctx.strokeRect( x1, y1, w, h )
            } else {
              ctx.fillRect( x1, y1, w, h )
            }
          },

          onShift: function() {
            this.getControl( 'Mode' ).click()
          }
      }),

      new ShapeGeometry( {
          name: 'Circle',
          css : 'circle',
          caption: 'Draw Circle | shortcut: c, shift: toggles outline',

          onDraw: function( ctx, x1, y1, x2, y2 ) {
            circlePath( ctx, x1, y1, x2-x1, y2-y1 )

            if ( this.isOutline ) {
              ctx.lineWidth = this.size
              ctx.stroke()
            } else {
              ctx.fill()
            }
          },

          onShift: function() {
            this.getControl( 'Mode' ).click()
          }
      } ),
      new Geometry( {
          name: 'Line',
          css : 'line',
          caption: 'Draw Line | shortcut: l, shift: toggles smooth',

          onDown: function( canvas, x, y ) {
            this.lastX1 = x,
            this.lastY1 = y,
            this.lastW  = 1,
            this.lastH  = 1
          },

          onDraw: function( ctx, x1, y1, x2, y2 ) {
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
          },

          onShift: function() {
            this.getControl( 'Smooth' ).click()
          },

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
      } ),

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
      new Command({
          name: 'Fill',
          css : 'fill',
          caption: 'Fill Colour | shortcut: f',

          onDown: (function() {
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
            const store = function( fromI, toX, toY, clipW, clipH, seenPixels ):number {
              if ( 0 <= toX && toX < clipW && 0 <= toY && toY < clipH ) {
                const toI = toY*clipW + toX

                if ( seenPixels[toI] === 0 ) {
                  seenPixels[fromI] = toI + 1

                  return toI
                }
              }

              return fromI
            }

            return function( canvas:HTMLCanvasElement, mouseX:number, mouseY:number ) {
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

                // used for the update area at the end,
                // default to where it was clicked to begin with
                const minX = mouseX-clipX
                const maxX = mouseX-clipX
                const minY = mouseY-clipY
                const maxY = mouseY-clipY

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
          })(),

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
          ]
      } ),

      /* Utility Commands */
      new Command( {
          name: 'Zoom',
          css : 'zoom',
          caption: 'Zoom | shortcut: z, shift: opposite zoom',

          onShift: function( isShiftDown, painter ) {
            this.getControl( 'Zoom' ).click()
          },

          onDown: function( canvas, x, y, painter, ev ) {
            if ( painter.isInView(ev) ) {
              if ( this.zoomOut ) {
                painter.zoomOut( x, y )
              } else {
                painter.zoomIn( x, y )
              }
            }
          },

          controls : [{
            name: 'Zoom',
            css : 'zoom_cmd',

            field: 'zoomOut',
            type : 'toggle',

            name_options: [ 'In', 'Out' ],

            cursor: true,
          }],

          cursor: function( cursor, painter ) {
            const zoom = painter.getZoom()

            if (
                (  this.zoomOut && zoom === (1/MAX_ZOOM) ) ||
                ( !this.zoomOut && zoom === MAX_ZOOM )
            ) {
              cursor.setClass( 'sb_cursor_zoom_blank' )
            } else if ( this.zoomOut ) {
              cursor.setClass( 'sb_cursor_zoom_out' )
            } else {
              cursor.setClass( 'sb_cursor_zoom_in' )
            }
          }
      }),

      new Command({
          name: 'Select',
          css : 'select',
          caption: 'Selection Tool | shortcut: s',
          cursor: 'sb_cursor_select',

          onAttach: function( painter ) {
            painter.getCanvas().getMarquee().showHandles()
          },
          onDetach: function( painter ) {
            painter.getCanvas().getMarquee().hideHandles()
          },

          onDown: function( canvas, x, y, painter, ev ) {
            canvas.getMarquee().
                startHighlight()

            this.startX = x
            this.startY = y
          },
          onMove: function(canvas, x, y) {
            canvas.getMarquee().
                select( this.startX, this.startY, x, y )
          },
          onUp: function( canvas, x, y ) {
            canvas.getMarquee().
                select( this.startX, this.startY, x, y ).
                stopHighlight()
          }
      } ),

      /*
       * The 'Move' command is for moving paste items around.
       *
       * This is tricky to get right, because certain behaviours all need to be supported.
       *  = If the button is clicked, with no movement, and there is a copy selection, it should be pasted.
       *  = If the button is clicked, with no movement, and no copy selection, nothing should happen.
       *  = If down and moved, and there is a copy selection, it should be moved but not pasted.
       *  = If down and moved, and there is no copy selection, it should cut and move the whole canvas.
       */
      new Command( {
          name: 'Move',
          css : 'move',
          caption: 'Move Tool | shortcut: m',

          cursor: 'sb_cursor_cursor',

          onDown: function( canvas, x, y, painter, ev ) {
            this.startX = x
            this.startY = y

            /*
             * Used to track if it was dragged or clicked on the spot.
             */
            this.wasMovement = false
          },

          onMove: function( canvas, x, y ) {
            if ( ! canvas.isPasting() ) {
              canvas.cut().paste()
            }

            canvas.movePaste( x-this.startX, y-this.startY, false )

            this.wasMovement = true
          },

          onUp: function( canvas, x, y ) {
            if ( canvas.isPasting() ) {
              if ( this.wasMovement ) {
                canvas.movePaste( x-this.startX, y-this.startY, true )
              } else {
                canvas.drawAndEndPaste()
              }
            }
          }
      })
  ]
}

function useNativeCursor( size:number ):boolean {
  return ( size < MAX_NATIVE_CURSOR_SIZE )
}

/**
 * Handles setting the cursor directly, with little management.
 *
 * The point is that this deals with creating and setting a cursor in
 * different ways, without caring about why, or what it is for.
 *
 * i.e. this deals with data urls and CSS classes, whilst BrushCursor deals
 * with crosshairs, squares and circles.
 *
 * The real point of this is to bind all of the setting by url, setting by
 * class, and hiding the cursor, into one place, to simplify the
 * BrushCursor.
 */
export class DirectCursor {
  constructor( viewport:HTMLElement ) {
    const dom = document.createElement( 'div' )
    dom.className = 'skybrush_brush'

    viewport.append( dom )

    this.dom            = dom

    this.viewport       = viewport
    this.cursorDataURL  = null
    this.cursorClass    = null

    this.inScrollbar    = false
    this.isHidden       = false

    // sensible defaults, so they are never 'undefined'
    this.lastX          = 0
    this.lastY          = 0

    this.lastLeft       = 0
    this.lastTop        = 0

    this.fakeShown      = false

    /**
     * This is the size of the fake cursor.
     *
     * @type {number}
     */
    this.displaySize = 0

    this.cssSetup = {
        height: -1,
        width : -1,
        'background-position': '',
    }

    // ensure it's all setup right!
    this.setClass( constants.DEFAULT_CURSOR )
  }

  /**
   * Cleares the items set on the cursor, so it's back to it's default state.
   */
  clearCursor() {
    this.clearCursorInner()

    this.dom.className = 'skybrush_brush'

    this.fakeShown = false
    this.cursorDataURL = null
    this.cursorClass = null

    return this
  }

  clearCursorInner() {
    if ( this.cursorDataURL !== null ) {
      this.dom.className = 'skybrush_brush'
      this.viewport.css( 'cursor', '' )
    }

    this.viewport.classList.remove( NO_CURSOR_CSS )

    if ( this.cursorClass !== null ) {
      if ( this.cursorClass !== NO_CURSOR_CSS ) {
        this.viewport.classList.remove( this.cursorClass )
      }
    }

    return this
  }

  /**
   * Sets the cursor to display the data url given. Only the url needs to be
   * given, i.e.
   *
   *  cursor.setCursorURL( '/cursors/crosshair.cur', size )
   *
   * This can also take a data url, but it only works if the browser actually
   * supports them.
   *
   * @param The data URI for the cursor.
   * @param size, the size of the cursor when displayed.
   */
  setCursorURL( url:string, size:number ):this {
    url = this.calculateUrl( url, size )

    if ( ! this.inScrollbar ) {
      this.setCursorURLInner( url, size )
    }

    this.cursorClass = null
    this.cursorDataURL = url
    this.displaySize = size
    this.fakeShown = ! useNativeCursor( size )

    return this
  }

  setCursorURLInner( url:string, size:number ):void {
    this.clearCursorInner()

    if ( useNativeCursor(size) ) {
      if ( ! this.isHidden ) {
        this.viewport.css( 'cursor', url )
      }
    } else {
      this.viewport.classList.add( NO_CURSOR_CSS )
      this.dom.style.backgroundImage = url

      if ( ! this.isHidden ) {
        this.dom.className = 'skybrush_brush sb_show'
      }
    }
  }

  /**
   * @return True if the fake cursor, is currently visible, and false if not.
   */
  isFakeShown():boolean {
    return this.fakeShown
  }

  calculateUrl( url:string, size:number ):string {
    if ( useNativeCursor(size) ) {
      /*
       * The location is off by one,
       * when applied as a cursor url.
       *
       * So I subtract 1, to correct.
       */
      const loc = size/2 - 1

      return `url(${url}) ${loc} ${loc}, auto`
    } else {
      return `url(${url}`
    }
  }

  /**
   * Adds the CSS class to the viewport, that the cursor is within.
   */
  setClass( klass:string ):this {
    if ( ! this.inScrollbar ) {
      this.clearCursor()

      if ( ! this.isHidden ) {
        this.viewport.classList.add( klass )
      }
    }

    this.cursorClass   = klass
    this.cursorDataURL = null
    this.fakeShown     = false

    return this
  }

  /**
   * Sets the cursor to a blank one.
   */
  setBlankCursor():this {
    this.setClass( NO_CURSOR_CSS )

    return this
  }

  /**
   * Call this, when the cursor has entered a Scrollbar.
   *
   * Don't worry about what it does, just do it.
   */
  enterScrollbar():this {
    if ( ! this.inScrollbar ) {
      this.clearCursorInner()
      this.inScrollbar = true
    }

    return this
  }

  /**
   * Call this, when the cursor has left a Scrollbar.
   *
   * Don't worry about what it does, just do it.
   */
  leaveScrollbar():this {
    if ( this.inScrollbar ) {
      this.inScrollbar = false

      if ( this.cursorClass ) {
        this.setClass( this.cursorClass )
      } else if ( this.cursorDataURL ) {
        this.setCursorURLInner( this.cursorDataURL, this.displaySize )
      }
    }

    return this
  }

  update( ev:MouseEvent ):this {
    this.updateMove( ev.pageX, ev.pageY )
    this.updateScrollbarCursor( ev )

    return this
  }

  /**
   * In Chrome (and other browsers?) the cursor also applies to the scrollbar.
   * So when we move over the scroll bar, we turn off the custom cursor,
   * and set it to the standard one.
   *
   * It then gets turned back, if we have moved out, and have an old
   * cursor to set.
   *
   * @param ev The event for the mouse movement.
   * @return true if we are overlapping the scrollbar, false if not.
   */
  updateScrollbarCursor( ev:MouseEvent ):this {
    const x = ev.pageX
    const y = ev.pageY
    const scrollBars = this.viewport.scrollBarSize()

    // work out if we are on top of a scroll bar
    if ( scrollBars.bottom > 0 || scrollBars.right > 0 ) {
      const pos = this.viewport.offset()

      if (
          scrollBars.right > 0 &&
          pos.left + (this.viewport.width() - scrollBars.right) < ev.pageX
      ) {
        this.enterScrollbar()
      } else if (
          scrollBars.bottom > 0 &&
          pos.top  + (this.viewport.height() - scrollBars.bottom) < ev.pageY
      ) {
        this.enterScrollbar()
      } else {
        this.leaveScrollbar()
      }
    } else {
      this.leaveScrollbar()
    }

    return this
  }

  /**
   * pageX and pageY are optional. If omitted, this will
   * presume it is at the same location as the last time
   * this was called.
   */
  updateMove( pageX:number, pageY:number ):this {
    if ( this.isFakeShown() ) {
      const viewport = this.viewport

      if ( pageX === undefined || pageY === undefined ) {
        pageX = this.lastX
        pageY = this.lastY
      }

      const displaySize  = this.displaySize
      const displaySize2 = displaySize/2
      const pos          = viewport.offset()
      const scrollBars   = viewport.scrollBarSize()

      const scrollX = viewport.scrollLeft()
      const scrollY = viewport.scrollTop()
      const viewportHeight = viewport.height() - scrollBars.bottom
      const viewportWidth  = viewport.width()  - scrollBars.right

        /*
         * If the cursor is near the top or bottom edge,
         * then the cursor is obscured using 'background-position'.
         *
         * When this is true, it'll do it on the bottom,
         * and when false, it does this for the top edge.
         *
         * hideFromRight does the same, but on the x axis.
         */
      const hideFromBottom = false
      const hideFromRight  = false

      /*
       * We have the location, in the middle, of the cursor on the screen.
       * This is the 'fixed' position, where no scrolling taken into account.
       *
       * We then convert this into the top/left position,
       * and then add on the scrolling.
       */

      const middleX = (pageX - pos.left)
      const middleY = (pageY - pos.top )

      let left   = 0
      let top    = 0
      let width  = 0
      let height = 0

      /*
       * Now translate from middle to top/left, for:
       *  - if over the top edge
       *  - if over the bottom edge
       *  - if between those edges
       */

      if ( middleY-displaySize2 < 0 ) {
        top    = 0
        height = displaySize + (middleY-displaySize2)
      } else if ( middleY+displaySize2 > viewportHeight ) {
        top    = middleY-displaySize2
        height = viewportHeight - (middleY-displaySize2)

        hideFromBottom = true
      } else {
        top    = middleY - (displaySize2-1)
        height = displaySize
      }

      if ( middleX-displaySize2 < 0 ) {
        left  = 0
        width = displaySize + (middleX-displaySize2)
      } else if ( middleX+displaySize2 > viewportWidth ) {
        left  = middleX-displaySize2
        width = viewportWidth - (middleX-displaySize2)

        hideFromRight = true
      } else {
        left  = middleX - (displaySize2-1)
        width = displaySize
      }

      top  += scrollY
      left += scrollX

      if ( left !== this.lastLeft || top !== this.lastTop ) {
        this.lastLeft = left
        this.lastTop  = top

        this.dom.style.transform = `translate( ${left}px, ${top}px )`

        this.lastX = pageX
        this.lastY = pageY
      }

      /*
       * Now alter the width/height,
       * and the background position.
       */

      width  = Math.max( width , 0 )
      height = Math.max( height, 0 )

      const cssSetup = this.cssSetup
      if (
          height !== cssSetup.height ||
          width  !== cssSetup.width
      ) {
        const positionY = ! hideFromBottom ?
              -(displaySize-height) + 'px' :
               0
        const positionX = ! hideFromRight ?
              -(displaySize-width ) + 'px' :
               0

        const newBackPosition = positionX + ' ' + positionY
        if ( newBackPosition !== cssSetup['background-position'] ) {
          cssSetup['background-position'] = newBackPosition
          this.dom.style.backgroundPosition = newBackPosition
        }

        if ( width !== cssSetup.width ) {
          cssSetup.width = width
          this.dom.style.width = width + 'px'
        }

        if ( height !== cssSetup.height ) {
          cssSetup.height = height
          this.dom.height = height + 'px'
        }
      }
    }

    return this
  }

  /**
   * Hides this cursor so that it is no longer shown, at all. This
   * includes both the real cursor, and the fake cursor built using an
   * HTML element.
   */
  hide():this {
    if ( ! this.isHidden ) {
      this.isHidden = true

      if ( this.cursorClass !== null ) {
        this.viewport.classList.remove( this.cursorClass )
      } else if ( this.cursorDataURL ) {
        this.viewport.css( 'cursor', '' )
      }

      this.viewport.classList.add( NO_CURSOR_CSS )
      this.dom.className = 'skybrush_brush'
    }

    return this
  }

  /**
   * If the cursor is hidden, then it will now be shown. Otherwise this
   * will do nothing.
   */
  show():this {
    if ( this.isHidden ) {
      this.isHidden = false

      if ( this.cursorClass ) {
        this.setClass( this.cursorClass )
      } else if ( this.cursorDataURL ) {
        this.setCursorURLInner( this.cursorDataURL, this.displaySize )
      }
    }

    return this
  }
}

/**
 * This differs from DirectCursor, in that this deals with the brush size,
 * zoom, and some decision making on how the brush should look.
 *
 * If 'isTouch' is set, then only 'showTouch' and 'hideTouch'
 * will actually allow this to be seen or not. The other 'show' and 'hide'
 * will still look like they work, and will as far as they can, except
 * nothing actually appeares.
 *
 * @param painter The SkyBrush instance.
 * @param viewport The view area this is a cursor for.
 * @param isTouch True if this is working with touch, false if not.
 */
export class BrushCursor {
  private readonly cursor   : DirectCursor 
  private readonly viewport : HTMLElement  
  private readonly canvas   : HTMLCanvasElement 

  private readonly isTouch : boolean 

  private isHidden  : boolean 
  private isReallyHidden : boolean 

  private zoomSize  : number 
  private size      : number 

  private shape : Nullable<RenderFunction>

  constructor( viewport:HTMLElement, isTouch:boolean ) {
    this.cursor   = new DirectCursor( viewport )
    this.viewport = viewport

    /**
     * This is the brush size, at the current zoom level.
     *
     * So if the brush size is 10, and the zoom level is 3,
     * then this value will be 30 (10 * 3).
     *
     * @type {number}
     */
    this.zoomSize = 1

    // initializes to no size
    this.isHidden = false
    this.isReallyHidden = false
    this.isTouch = isTouch

    this.size  = 1
    this.shape = null

    this.canvas = htmlUtils.newCanvas( 1, 1 )
    this.cursorReplace = new events.Runner( 0 )

    if ( isTouch ) {
      this.hideTouch()
    }
  }

  setCrosshair():this {
    this.cursor.setCursorURL( CROSSHAIR_CURSOR_DATA_URL, CROSSHAIR_CURSOR_SIZE )
    this.shape = null

    return this
  }

  onMove( ev:MouseEvent ):this {
    this.cursor.update( ev )

    return this
  }

  showTouch():this {
    // don't show if hidden!
    if ( this.isTouch && ! this.isHidden ) {
      this.showInner()
    }

    return this
  }

  hideTouch():this {
    if ( this.isTouch ) {
      this.hideInner()
    }

    return this
  }

  show():this {
    this.isHidden = false

    this.renderShape( this.render, this.zoomSize )

    if ( ! this.isTouch ) {
      this.showInner()
    }

    return this
  }

  hide():this {
    this.isHidden = true

    if ( ! this.isTouch ) {
      this.hideInner()
    }

    return this
  }

  showInner():this {
    if ( this.isReallyHidden ) {
      this.isReallyHidden = false

      this.cursor.show()
    }

    return this
  }

  hideInner():this {
    if ( ! this.isReallyHidden ) {
      this.isReallyHidden = true
      this.cursor.hide()
    }

    return this
  }

  /**
   * Returns if the *fake* brush is shown.
   * This is regardless of if the brush cursor is rendered using the
   * background image, or as a native cursor.
   *
   * If the fake brush is shown, then a standard url, which is not calculated
   * by the brush cursor, will be in use. For example, the zoom cursor, or
   * the standard cursor icon.
   */
  isShown() {
    return ! this.isHidden 
  }

  setCircle( size:number ) {
    return this.setShape( BRUSH_RENDER_FUNCTIONS.CIRCLE, size )
  }

  setSquare( size:number ) {
    return this.setShape( BRUSH_RENDER_FUNCTIONS.SQUARE, size )
  }

  /**
   * Sets the shape, a second time.
   */
  setShape( render:RenderFunction, size:number ):this {
    if ( ! render ) {
      throw new Error( "undefined brush render given" )
    }

    this.shape = render
    this.size  = size
    const zoom = this.zoom

    const newSize = Math.max( (size*zoom) | 0, 1 )
    if ( newSize <= BRUSH_CURSOR_MINIMUM_SIZE ) {
      newSize = BRUSH_CURSOR_MINIMUM_SIZE
    }

    this.renderShape( render, newSize )

    return this
  }

  renderShape( render:RenderFunction, newSize:number ):void {
    if ( render !== null ) {
      this.zoomSize = newSize
      this.shape = render

      if ( ! this.isHidden ) {
        // draws a cross hair
        if ( newSize <= BRUSH_CURSOR_MINIMUM_SIZE ) {
          this.setCrosshair()
        } else {
          const canvas = this.canvas
          const ctx = canvas.getContext( '2d' )
          const canvasSize  = newSize + BRUSH_CURSOR_PADDING

          canvas.width = canvas.height = canvasSize

          ctx.beginPath()
          ctx.lineCap   = 'round'
          ctx.lineWidth = 1

          this.shape( ctx, canvas, newSize )

          const middle = canvas.width/2

          // draw a dot in the centre
          ctx.beginPath()

          ctx.strokeStyle = '#fff'
          ctx.globalAlpha = 0.9
          ctx.strokeRect( middle-0.75, middle-0.75, 1.5, 1.5 )

          ctx.strokeStyle = '#000'
          ctx.globalAlpha = 0.6
          ctx.strokeRect( middle-0.5 , middle-0.5 , 1  , 1   )

          this.cursor.setCursorURL( canvas.toDataURL(), canvas.width )
        }
      }
    }
  }

  /**
   * Sets the zoom.
   *
   * The refresh parameter is optional, and defaults to true. When false,
   * this will not do any kind of redrawing.
   *
   * That is useful, if you are planning to refresh yourself, after calling
   * this.
   *
   * @param zoom The new zoom value.
   * @param refresh Optional, true if this should refresh, false if not. Defaults to true.
   */
  setZoom( zoom:number, refresh:boolean ) {
    this.zoom = zoom

    if ( this.shape && refresh !== false ) {
      this.setShape( this.shape, this.size )
    }

    return this
  }

  setCommandCursor( painter, command ) {
    const cursor = command.getCursor()

    if ( ! cursor ) {
      this.cursor.setBlankCursor()
    } else if ( typeof cursor === 'string' ) {
      this.cursor.setClass( cursor )
    } else {
      cursor.call( command, this, painter )
    }

    return this
  }

  setClass( klass:string ) {
    this.cursor.setClass( klass )
    this.shape = null

    return this
  }
}

function normalizeKey( key:string ):string {
  if ( key.length > 1 ) {
    key = key.toLowerCase()

    if ( key === 'del' ) {
      key = 'delete'
    } else if ( key === 'esc' ) {
      key = 'escape'
    }
  }

  return key
}

const newKeyEventTest = (function() {
  const newKeyEventTestNumeric = function( key ) {
    return function(ev) {
      if ( ev.charCode !== 0 ) {
        return ev.charCode === key
      } else {
        return ev.keyCode  === key
      }
    }
  }

  const newKeyEventTestString = function( key ) {
    key = normalizeKey( key )

    return function(ev) {
      if ( ev['char'] ) {
        return ev['char'] === key
      } else if ( ev.key !== undefined ) {
        return normalizeKey( ev.key ) === key
      } else {
         return normalizeKey( String.fromCharCode(ev.keyCode) ) === key
      }
    }
  }

  return function( key ) {
    if ( typeof key === 'number' ) {
      return newKeyEventTestNumeric( key|0 )
    } else if ( typeof key === 'string' ) {
      return newKeyEventTestString( key )
    } else {
      throw new Exception( "expected string or number for key" + key )
    }
  }
})()

/*
 * Private functions used by the SkyBrush.
 */

const NOT_ALPHA_NUMERIC_LOWER = /[^a-z0-9_]+/g

/**
 * A very simple function. Makes a new div HTML element, sets the text
 * given inside of it, sets the class, and then returns the div.
 */
function newTextDiv( className:string, textContent:string ) {
  const div = document.createElement( 'div' )

  div.textContent = textContent
  div.className = className

  return div
}

function newNumericInput( isDecimal:boolean, className:string ) {
  const input = newInput( 'number', className )

  forceNumeric( input, isDecimal )

  return input
}

function newInput( type:string, className:string ) {
  const input = document.createElement( 'input' )

  input.setAttribute( 'type', type )
  input.className = className

  return input
}

function newButton() {
  const dom = document.createElement( 'a' )
  dom.href = '#'

  const text  = ''
  const klass = ''

  const expectText = true

  for ( let i = 0; i < arguments.length; i++ ) {
    const arg = arguments[i]

    if ( typeof arg === 'function' ) {
      $(dom).vclick( arg )

    } else if ( expectText ) {
      dom.innerHTML = text = arg
      expectText = false

    } else {
      klass += ` ${arg}`

    }
  }

  if ( text !== '' ) {
    let left  = 0
    let right = text.length

    for ( ; left < right; left++ ) {
      const c = text.charCodeAt( left )

      if (
           c === 95 ||
          (c >= 65 && c <=  90) ||
          (c >= 97 && c <= 122) ||
          (c >= 48 && c <=  57)
      ) {
        break
      }
    }

    while ( right --> left ) {
      const c = text.charCodeAt( right )

      if (
           c === 95 ||
          (c >= 65 && c <=  90) ||
          (c >= 97 && c <= 122) ||
          (c >= 48 && c <=  57)
      ) {
        break
      }
    }

    if ( (right-left) > 0 ) {
      klass += ' sb_' + text.
          substring( left, right+1 ).
          toLowerCase().
          replace( NOT_ALPHA_NUMERIC_LOWER, '_' )
    }
  }

  dom.className = klass

  $(dom).killEvent( 'click', 'leftdown' )

  return dom
}

function initializeMainButtons( painter, wrap, pickerCommand ) {
  const undoButton = newButton( 'Undo', 'skybrush_header_button', 'sb_disabled', function() {
    if ( ! this.classList.contains('sb_disabled') ) {
      painter.undo()
    }
  })

  const redoButton = newButton( 'Redo', 'skybrush_header_button', 'sb_disabled', function() {
    painter.getInfoBar().hide()

    if ( ! this.classList.contains('sb_disabled') ) {
      painter.redo()
    }
  })

  undoButton.attr( 'title', 'Undo | shortcut: ctrl+z' )
  redoButton.attr( 'title', 'Redo | shortcut: ctrl+r or ctrl+y' )

  const updateUndoRedo = function() {
    if ( painter.hasUndo() ) {
      undoButton.classList.remove('sb_disabled')
    } else {
      undoButton.classList.add('sb_disabled')
    }

    if ( painter.hasRedo() ) {
      redoButton.classList.remove('sb_disabled')
    } else {
      redoButton.classList.add('sb_disabled')
    }
  }

  painter
      .onUndo( updateUndoRedo )
      .onRedo( updateUndoRedo )
      .onDraw( updateUndoRedo )


  /*
   * Open / Close toggle
   */

  const openToggle = htmlUtils.newAnchor()
  openToggle.innerHTML = '<div class="skybrush_open_toggle_text">&#x1F845</div>'
  openToggle.className = 'skybrush_header_button skybrush_open_toggle'
  openToggle.addEventListener( 'click', ev => {
    if ( ev.which !== constants.LEFT ) {
      return
    }

    ev.preventDefault()
    ev.stopPropagation()

    painter.toggleGUIPane()
  })

  /*
   * Zoom In / Out
   */

  const zoomIn = newButton( '+', 'sb_zoom_in', 'skybrush_header_button', () => {
    painter.zoomIn()
  })

  const zoomOut = newButton( '-', 'sb_zoom_out', 'skybrush_header_button', () => {
    painter.zoomOut()
  })

   zoomIn.attr( 'title', 'Zoom In | shortcut: ctrl+='  )
  zoomOut.attr( 'title', 'Zoom Out | shortcut: ctrl+-' )

  /*
   * Copy + Paste
   */

  const copy = newButton( 'Copy', 'skybrush_button', 'sb_disabled', 'sb_absolute', () => {
    painter.getInfoBar().hide()

    if ( ! this.classList.contains('sb_disabled') ) {
      painter.copy()
    }
  })

  const cut = newButton( 'Cut', 'skybrush_button', 'sb_disabled', 'sb_absolute', () => {
    painter.getInfoBar().hide()

    if ( ! this.classList.contains('sb_disabled') ) {
      painter.cut()
    }
  })

  const paste = newButton( 'Paste', 'skybrush_button', 'sb_disabled', 'sb_absolute', () => {
    painter.getInfoBar().hide()

    if ( ! this.classList.contains('sb_disabled') ) {
      painter.paste()
    }
  })

   copy.attr( 'title', 'Copy Selection | shortcut: ctrl+c'  )
    cut.attr( 'title', 'Cut Selection | shortcut: ctrl+x'   )
  paste.attr( 'title', 'Paste Selection | shortcut: ctrl+v' )

  painter
      .getCanvas()
      .onClip( clippingArea => {
        if ( clippingArea !== null ) {
          copy.classList.remove('sb_disabled')
           cut.classList.remove('sb_disabled')
        } else {
          copy.classList.add('sb_disabled')
           cut.classList.add('sb_disabled')
        }
      })
      .onCopy(() => {
        paste.classList.remove( 'sb_disabled' )
      })

  const copyButtons = document.createElement( 'div' )
  copyButtons.className = 'skybrush_main_buttons'
  copyButtons.appendChild(  copy )
  copyButtons.appendChild(   cut )
  copyButtons.appendChild( paste )

  /*
   * The current colour icon, and colour picker
   */

  const currentColorBack = document.createElement( 'div' )
  currentColorBack.className = 'skybrush_color_picker_current_color_back'

  const currentColorShow = document.createElement( 'div' )
  currentColorShow.className = 'skybrush_color_picker_current_color'

  painter.onSetColor( strCol => {
    currentColorShow.style.background = strCol
  })

  painter.onSetAlpha( alpha => {
    currentColorShow.style.opacity = alpha
  })

  // colour picker
  const pickerCommandBack = document.createElement( 'div' )
  pickerCommandBack.className = 'skybrush_command_back'

  const pickerButton = document.createElement( 'a' )
  pickerButton.title = pickerCommand.getCaption()
  pickerButton.addEventListener( 'click', (ev) => {
      painter.setCommand( pickerCommand )

      ev.preventDefault()
      ev.stopPropagation()
  })

  const picker = document.createElement('div')
  picker.className = 'skybrush_gui_command ' + pickerCommand.getCSS()
  picker.appendChild( pickerCommandBack )
  picker.appendChild( pickerButton )
  picker.__command = pickerCommand

  painter.onSetCommand( command => {
    if ( command === picker.__command ) {
      picker.classList.add( 'sb_selected' )
    } else {
      picker.classList.remove( 'sb_selected' )
    }
  })

  // colour info wrap

  const colourInfo = document.createElement('div')
  colourInfo.className = 'skybrush_colour_info'

  colourInfo.appendChild( currentColorBack )
  colourInfo.appendChild( currentColorShow )
  colourInfo.appendChild( picker )

  /* finally, put it all togther */

  /*
   * This is a special gui, more special than the others,
   * so he gets put aside on his own, to watch over toggling the panel
   * open.
   */
  const gui = new GUI([ openToggle, zoomOut, zoomIn, undoButton, redoButton ], 'main', false ).
      setPainter( painter ).
      appendDirect( copyButtons, colourInfo )

  wrap.append( gui.dom )
}

/**
 * Sets up the 'Canvas' GUI pane,
 * which has options like resize, scale, grid,
 * clear, and crop.
 */
function initializeSettings( painter ) {

  /*
   * Resize & Scale
   */

  const infoOption = function(
      name,
      onSuccess,
      extraComponents,
  ) {
    let isConstrained = false

    return newButton( name, 'skybrush_button', 'sb_absolute', function() {
      const width  = painter.getCanvas().getWidth()
      const height = painter.getCanvas().getHeight()

      const widthInput  = newNumericInput( false, 'sb_width' )
      widthInput.value = width
      widthInput.setAttribute( 'maxlength', 5 )

      const heightInput = newNumericInput( false, 'sb_height' )
      heightInput.value = height
      heightInput.setAttribute( 'maxlength', 5 )

      const constrain = newInput( 'checkbox', 'constrain' )
      constrain.checked = isConstrained

      /*
       * Update the width/height in the other
       * input, when the value changes in this one,
       * if we're using 'constrain proportions'.
       */
      widthInput.addEventListener( 'keydown', () => {
        /*
         * setTimeout is used because the input.val is
         * only updated after this has fully bubbled up.
         * So we run the code straight after.
         */
        if ( constrain.checked ) {
          requestAnimationFrame( () => {
            const w = widthInput.value | 0

            if ( ! isNaN(w) && w > 0 ) {
              heightInput.value = Math.round( height * (w/width) )
            }
          })
        }
      })

      heightInput.addEventListener( 'keydown', () => {
        if ( constrain.checked ) {
          requestAnimationFrame(() => {
            const h = heightInput.value|0

            if ( ! isNaN(h) && h > 0 ) {
              widthInput.value = Math.round( width * (h/height) )
            }
          })
        }
      })

      /*
       * Reset the width/height when the user
       * turns the constrain property on.
       */
      constrain.addEventListener( 'change', () => {
        isConstrained = constrain.checked

        if ( isConstrained ) {
          widthInput.value  = width
          heightInput.value = height
        }
      })

      const form = document.createElement( 'form' )
      form.setAttribute( 'action', '' )
      form.addEventListener( 'submit', (ev) => {
        ev.preventDefault()

        const content = painter.getInfoBar().getContent()

        onSuccess.call(
            this,
            widthInput.value  |0,
            heightInput.value |0
        )

        painter.getInfoBar().hide()
      }, false)

      const okButton = newInput( 'submit', '' )
      okButton.setAttribute( 'value', 'ok' )
      okButton.addEventListener( 'mousedown', (ev) => {
        ev.stopPropagation()
      })
      okButton.addEventListener( 'click', (ev) => {
        ev.stopPropagation()
        form.submit()
      })

      form.appendChild( newTextDiv( 'skybrush_info_label', 'Width:'    ) )
      form.appendChild( widthInput  )

      form.appendChild( newTextDiv( 'skybrush_info_label', 'Height:'   ) )
      form.appendChild( heightInput )

      form.appendChild( newTextDiv( 'skybrush_info_label', 'Relative:' ) )
      form.appendChild( constrain   )

      if ( extraComponents ) {
        extraComponents( form )
      }

      form.appendChild( okButton )

      painter.
          getInfoBar().
          setContent( form ).
          show()
    })
  }

  const resize = infoOption( 'Canvas Size',
      ( w, h ) => {
        painter.resize( w, h )
      }
  )

  let isSmooth = false
  const scale = infoOption( 'Image Size',
      ( w, h ) => {
        painter.scale( w, h, scale.querySelector('input.smooth').checked )
      },

      ( form ) => {
        const smooth = newInput( 'checkbox', 'smooth' )
        if ( isSmooth ) {
          smooth.setAttribute( 'checked', 'checked' )
        }

        smooth.addEventListener( 'change', function() {
          isSmooth = smooth.checked
        })

        form.appendChild( newTextDiv('skybrush_info_label', 'Smooth') )
        form.appendChild( smooth )
      }
  )

  const grid = newButton( 'Grid', 'skybrush_button', 'sb_absolute', (ev) => {
    const grid = painter.getCanvas().getGrid()

    /*
     * grid width & height
     */

    const wInput = newNumericInput( false, '' )
    wInput.addEventListener( 'keypress', updateSize )
    wInput.addEventListener( 'click'   , updateSize )
    wInput.addEventListener( 'change'  , updateSize )

    const hInput = newNumericInput( false, '' )
    wInput.addEventListener( 'keypress', updateSize )
    wInput.addEventListener( 'click'   , updateSize )
    wInput.addEventListener( 'change'  , updateSize )

    wInput.value = grid.getWidth()
    hInput.value = grid.getHeight()

    const updateSize = function() {
      requestAnimationFrame(() => {
        const w = wInput.value | 0
        const h = hInput.value | 0

        grid.setSize( w, h )
      })
    }

    /*
     * grid offset x & y
     */

    const offsetX = newNumericInput( false, '' )
    offsetX.addEventListener( 'keypress', updateOffset )
    offsetX.addEventListener( 'click'   , updateOffset )
    offsetX.addEventListener( 'change'  , updateOffset )

    const offsetY = newNumericInput( false, '' )
    offsetY.addEventListener( 'keypress', updateOffset )
    offsetY.addEventListener( 'click'   , updateOffset )
    offsetY.addEventListener( 'change'  , updateOffset )

    offsetX.value = grid.getOffsetX()
    offsetY.value = grid.getOffsetY()

    const updateOffset = function() {
      requestAnimationFrame(() => {
        const oX = offsetX.value | 0
        const oY = offsetY.value | 0

        grid.setOffset( oX, oY )
      })
    }

    /*
     * the show checkbox
     */

    const show = newInput( 'checkbox', '' )
    show.checked = grid.isShown()
    show.addEventListener( 'change', () => {
      if ( show.checked ) {
        grid.show()
      } else {
        grid.hide()
      }
    })

    /*
     * put it all together
     */

    painter.getInfoBar().setContent(
        newTextDiv( 'skybrush_info_label',  'Width:'    ),
        wInput,
        newTextDiv( 'skybrush_info_label',  'Height:'   ),
        hInput,

        newTextDiv( 'skybrush_info_label',  'X Offset:' ),
        offsetX,
        newTextDiv( 'skybrush_info_label',  'Y Offset:' ),
        offsetY,

        newTextDiv( 'skybrush_info_label',  'Show:'     ),
        show
    ).show()
  })

  /* Clear Canvas */
  const crop = newButton( 'Crop', 'skybrush_button', 'sb_absolute', () => {
    painter.getInfoBar().hide()
    painter.getCanvas().crop()
  })
  crop.attr( 'title', 'Crop Image, ctrl+e' )

  const clear = newButton('Clear', 'skybrush_button', 'sb_absolute', () => {
    painter.getInfoBar().hide()

    if ( clear.classList.contains('sb_disabled') ) {
      painter.getCanvas().clear()
    }
  })
  clear.attr( 'title', 'Clear Image, delete' )

  const commonControls = document.createElement('div')
  commonControls.classList.add( 'skybrush_topbar_button_group' )
  commonControls.appendChild( resize )
  commonControls.appendChild( scale )
  commonControls.appendChild( grid )
  commonControls.appendChild( clear )
  commonControls.appendChild( crop )

  const gui = new GUI( 'Canvas', 'canvas' ).
      appendDirect( resize, scale, grid, clear, crop )

  painter.addGUI( gui )
}


/**
 * Sets up the colour GUI in the SkyBrush.
 */
function initializeColors( painter, pickerCommand ) {

  /*
   * Colour Palette
   *
   * As a small optimization, this builds the palette out of HTML, and
   * then just turns it into a dom in one.
   *
   * There is also *one* click handler, to handle all of the colours.
   */

  let colorsHTML = ''
  for ( let i = 0; i < DEFAULT_COLORS.length; i++ ) {
    const col = DEFAULT_COLORS[i]

    colorsHTML +=
        `<a href="#"
          class="skybrush_colors_palette_color ${ ! constants.IS_TOUCH ? 'sb_hover_border' : '' }"
          data-color="${col}"
          style="background:${col}"
        >
          <div class="skybrush_colors_palette_color_border"></div>
        </a>`
  }

  const colorsDom = document.createElement( 'div' )
  colorsDom.className = 'skybrush_colors_palette'
  colorsDom.innerHTML = colorsHTML

  let currentColor : Nullable<HTMLElement> = null
  const colors = $( colorsDom ).
      killEvent( 'click', 'mousedown' ).
      leftclick(() => {
        return function( ev:MouseEvent ) {
          const target = ev.target

          if ( target.classList.contains('skybrush_colors_palette_color_border') ) {
            target = target.parentNode
          }

          if ( target !== currentColor ) {
            if ( currentColor !== null ) {
              currentColor.classList.remove( 'sb_show' )
            }

            currentColor = target
            currentColor.classList.add( 'sb_show' )

            painter.setColor( currentColor.dataset.color )
          }
        }
      })

  /*
   * Colour Mixer
   *
   * This is added at the end so we don't have to hard code
   * the mixer width. Instead we just use whatever width the
   * Colours GUI is.
   */

  /* Render size is the size of the canvas to display the colour info.
   * Mixer size is the size used internally.
   *
   * Mixer is 1 pixel smaller because the overlay horizontal/vertical lines
   * are 1 pixel out at the far edge.
   * So this corrects that.
   */

  /**
   * Used for storing values across events.
   */
  let hue        = 0
  let saturation = 0
  let value      = 0

  const updateHue = ( newHue:number ) => {
    hue = newHue
    const strBackColor = colourUtils.hsvToColor( newHue, 1.0, 1.0 )

    // update the back of the mixer
    colourBack.style.borderTopColor  =
    colourBack.style.borderLeftColor =
        strBackColor

    /* Update the colour wheel */

    const angleDeg = Math.round( (hue*360) - 180 )
    const rotation = `rotate(${angleDeg}deg)`

    wheelLineDom.style.transform = rotation
  }

  const mixerSize = COLOUR_MIXER_WIDTH

  const colourBack = document.createElement('div')
  colourBack.className = 'skybrush_color_mixer_back'

  const mixerFront = htmlUtils.newCanvas( mixerSize, mixerSize )
  mixerFront.classList.add( 'skybrush_color_mixer_color_layer' )
  const ctx     = mixerFront.ctx
  const ctxData = ctx.getImageData( 0, 0, mixerSize, mixerSize )
  const data    = ctxData.data

  // Needed for Dev versions of Chrome, or the canvas is blank when updated.
  // Also _must_ be after we get the image data out.
  // It's to get it to 'wake up' and 'work'.
  ctx.fillRect( 0, 0, 100, 100 )

  for ( let y = 0; y < mixerSize; y++ ) {
    const yP = 1 - y/mixerSize
    const mixerWidth = mixerSize-y

    for ( let x = 0; x < mixerWidth; x++ ) {
      const i  = (y*mixerSize + x) * 4
      const xP = 1 - x/mixerSize

      // set RGB to the same col, so it's grey
      data[i] = data[i + 1] = data[i + 2] =
          ( 255*yP*xP + 0.5 ) | 0

      // set alpha
      data[i + 3] = ( 255*xP + 0.5 ) | 0
    }
  }

  ctx.putImageData( ctxData, 0, 0 )

  /* The Colour Wheel */

  const colourWheelCanvas = htmlUtils.newCanvas( COLOUR_WHEEL_WIDTH, COLOUR_WHEEL_WIDTH )
  colourWheelCanvas.className = 'skybrush_color_wheel_colour_wheel'
  const wheelCtx = colourWheelCanvas.ctx
  const wheelData = wheelCtx.createImageData( COLOUR_WHEEL_WIDTH, COLOUR_WHEEL_WIDTH )

  const wheelLineDom = document.createElement( 'div' )
  wheelLineDom.className = 'skybrush_color_wheel_line_outer'
  wheelLineDom.innerHTML = '<div class="skybrush_color_wheel_line"></div>'

  const wheelLine = $( wheelLineDom )
  data = wheelData.data

  const colourWheelHalfWidth = ( COLOUR_WHEEL_WIDTH/2 ) | 0
  let i = 0
  for ( let y = 0; y < COLOUR_WHEEL_WIDTH; y++ ) {
    for ( let x = 0; x < COLOUR_WHEEL_WIDTH; x++ ) {
      const paintHue = colourUtils.atan2ToHue( colourWheelHalfWidth - y, colourWheelHalfWidth - x )

      data[i  ] = colourUtils.hsvToR( paintHue, 1, 1 )
      data[i+1] = colourUtils.hsvToG( paintHue, 1, 1 )
      data[i+2] = colourUtils.hsvToB( paintHue, 1, 1 )
      data[i+3] = 255

      i += 4
    }
  }

  wheelCtx.putImageData( wheelData, 0, 0 )

  const colourWheel = $( colourWheelCanvas )
      .killEvent( 'click' )
      .leftdrag( ev => {
          const pos   = ev.offset( colourWheel )
          const distX = COLOUR_WHEEL_WIDTH/2 - pos.left
          const distY = COLOUR_WHEEL_WIDTH/2 - pos.top
          const hypot = Math.sqrt( distX*distX + distY*distY )

          // change the hue
          if ( hypot <= COLOUR_WHEEL_WIDTH/2 ) {
            hue = colourUtils.atan2ToHue( distY, distX )
            painter.setColor(
                colourUtils.hsvToColor(
                    hue,
                    saturation,
                    value
                )
            )

            updateHue( hue )

            ev.preventDefault()

          /*
           * it's right on the edge of the colour mixer,
           * technically inside, but visually outside.
           *
           * So we send the event somewhere else.
           */
          } else {
            mixerFront.trigger( ev )
          }
      })

  wheelLine.forwardEvents( colourWheel, 'vmousemove', 'vmousedown' )

  /* Combine Colour Mixer */

  const colourWheelWrap = document.createElement( 'div' )
  colourWheelWrap.className = 'skybrush_color_wheel_wrap'
  colourWheelWrap.appendChild( colourWheelCanvas )
  colourWheelWrap.appendChild( wheelLineDom      )

  const mixerHorizontal = $('<div>')
      .addClass( 'skybrush_mixer_horizontal_line' )
      .forwardEvents( mixerFront, 'vmousedown', 'vmousemove' )

  const mixerVertical = $('<div>')
      .addClass( 'skybrush_mixer_vertical_line' )
      .forwardEvents( mixerFront, 'vmousedown', 'vmousemove' )

  const mixer = document.createElement( 'div' )
  mixer.className = 'skybrush_color_mixer'
  mixer.appendChild( colourBack               )
  mixer.appendChild( mixerFront               )
  mixer.appendChild( mixerHorizontal.get(0)   )
  mixer.appendChild( mixerVertical.get(0)     )
  mixer.appendChild( colourWheelWrap          )

  mixerFront.leftdrag( ev => {
    const pos = ev.offset( mixerFront )

    const x = Math.max( pos.left, 0 )
    const y = Math.max( pos.top , 0 )

    if (
        x < mixerSize-y &&
        y < mixerSize-x
    ) {
      value = 1 - ( y / mixerSize )
      saturation = x / ( mixerSize - (1-value)*mixerSize )

      painter.setColor( colourUtils.hsvToColor(hue, saturation, value) )
    }

    ev.preventDefault()
  })

  /* Current Colour Info */

  const getVal = function( input, max ) {
    const num = parseInt( input.value )

    if ( isNaN(num) ) {
      return 0
    }

    return Math.limit( num, 0, max )
  }

  const syncAlpha = function() {
    const val = getVal( this, 1.0 )

    painter.setAlpha( val )
  }

  /* Create the RGB lebel/inputs in the form. */
  const newColourInput = function(
      name       : string,
      css        : string,
      inputEvent : Consumer<InputEvent>,
      isDecimal  : boolean,
      max        : number,
  ):HTMLInputElement {
    const label = document.createElement('div')
    label.className = 'skybrush_rgb_label'
    label.innerHTML = name

    const input = newNumericInput( isDecimal, 'skybrush_rgb_input ' + css )
    input.maxLength = 3
    input.min       = 0
    input.max       = max
    input.step      = ( isDecimal ? 0.01 : 1 )

    input.addEventListener( 'change', inputEvent )
    input.addEventListener( 'keypress', function( ev:KeyboardEvent ) {
      requestAnimationFrame(() => {
        inputEvent.call( input, ev )
      })
    })
    input.addEventListener( 'blur', function( ev ) {
      input.value = getVal( input, max )
      inputEvent.call( input, ev )
    })

    const inputWrap = document.createElement( 'div' )
    inputWrap.className = 'skybrush_rgb_wrap'
    inputWrap.appendChild( label )
    inputWrap.appendChild( input )

    inputWrap.__input = input

    return inputWrap
  }

  /**
   * Grabs the RGB values in the form,
   * and sets them as the current colour in the SkyBrush.
   *
   * This is used for when the RGB values have been altered,
   * and they need to sync those values to the SkyBrush.
   */
  const syncRGBFormToCurrentColor = function() {
    const r = getVal( rInput, 255 )
    const g = getVal( gInput, 255 )
    const b = getVal( bInput, 255 )

    const newColor = colourUtils.rgbToColor( r, g, b )
    painter.setColor( newColor )
  }

  const rWrap = newColourInput( 'r', 'skybrush_rgb_r', syncRGBFormToCurrentColor, false, 255 )
  const gWrap = newColourInput( 'g', 'skybrush_rgb_g', syncRGBFormToCurrentColor, false, 255 )
  const bWrap = newColourInput( 'b', 'skybrush_rgb_b', syncRGBFormToCurrentColor, false, 255 )

  const rInput = rWrap.__input
  const gInput = gWrap.__input
  const bInput = bWrap.__input

  const aWrap  = newColourInput( 'a', 'rgb_a', syncAlpha, true, 1.0 )
  const aInput = aWrap.__input

  const rgbForm = document.createElement( 'div' )
  rgbForm.className = 'skybrush_rgb_form'
  rgbForm.appendChild( rWrap )
  rgbForm.appendChild( gWrap )
  rgbForm.appendChild( bWrap )
  rgbForm.appendChild( aWrap )

  /*
   * HSV Form
   */

  const syncHSVFormToCurrentColor = function() {
    // convert to 0.0 to 1.0 values
    const h = getVal( hInput, 360 ) / 360.0
    const s = getVal( sInput, 100 ) / 100.0
    const v = getVal( vInput, 100 ) / 100.0

    painter.setColor(
        colourUtils.hsvToColor( h, s, v )
    )
  }

  const hWrap = newColourInput( 'h', 'skybrush_rgb_h', syncHSVFormToCurrentColor, false, 360 )
  const sWrap = newColourInput( 's', 'skybrush_rgb_s', syncHSVFormToCurrentColor, false, 100 )
  const vWrap = newColourInput( 'v', 'skybrush_rgb_v', syncHSVFormToCurrentColor, false, 100 )

  const hInput = hWrap.__input
  const sInput = sWrap.__input
  const vInput = vWrap.__input

  const hsvForm = document.createElement( 'div' )
  hsvForm.className = 'skybrush_hsv_form'
  hsvForm.appendChild( hWrap )
  hsvForm.appendChild( sWrap )
  hsvForm.appendChild( vWrap )



  /* Alpha Handling */
  const alphaBarLine = document.createElement( 'div' )
  alphaBarLine.className = 'skybrush_color_alpha_line'

  const alphaGradient = document.createElement( 'div' )
  alphaBarLine.className = 'skybrush_color_alpha_gradient'

  const alphaBar = document.createElement( 'div' )
  alphaBar.className = 'skybrush_color_alpha_bar'
  alphaBar.appendChild( alphaGradient )
  alphaBar.appendChild( alphaBarLine  )
  alphaBar.addEventListener( 'click', ev => {
    ev.stopPropagation()
    ev.preventDefault()
  })

  const alphaWrap = document.createElement('div')
  alphaWrap.className = 'skybrush_color_alpha_wrap'
  alphaWrap.appendChild( alphaBar )

  /* Put the GUI together */

  const currentColor = document.createElement('div')
  currentColor.className = 'skybrush_color_picker'
  currentColor.appendChild( hsvForm )
  currentColor.appendChild( rgbForm )
  currentColor.appendChild( alphaWrap )

  const paintModeLabel = document.createElement('div')
  paintModeLabel.className = 'skybrush_command_control_label'
  paintModeLabel.innerHTML = 'Paint Mode'

  const paintModeButton = document.createElement( 'input' )
  paintModeButton.className = 'skybrush_input_button'
  paintModeButton.type = 'button'
  paintModeButton.value = 'Normal'
  paintModeButton.addEventListener( 'change', () => {
    const mode = this.value
    const c = painter.getCanvas()

    if ( mode === 'Normal' ) {
      mode = 'Mask'
      c.useDestinationAlpha()
    } else {
      mode = 'Normal'
      c.useBlendAlpha()
    }
  })

  const destinationAlpha = document.createElement('div')
  destinationAlpha.className = 'skybrush_destination_alpha'
  destinationAlpha.appendChild( paintModeLabel )
  destinationAlpha.appendChild( paintModeButton )

  const colorGUI = new GUI( 'Palette', 'colors' ).
      appendTogether( currentColor, destinationAlpha ).
      append( mixer )

  const swatchesGUI = new GUI( 'Swatches', 'swatches' ).
      append( colors )

  painter.addGUI( colorGUI, swatchesGUI )

  /* Now generate the alpha gradient, now the canvas has reflowed */

  const alphaCanvas = newCheckerboard(
      alphaGradient.width(),
      alphaGradient.height(),
      true
  )

  const updateAlphaFun = function(ev) {
    const pos = $(alphaCanvas).offset()
    const h   = $(alphaCanvas).height()

    const y = Math.limit( ev.pageY - pos.top, 0, h )
    painter.setAlpha( y / h )

    ev.preventDefault()
  }

  $( alphaCanvas ).leftdrag( updateAlphaFun )
  $( alphaBar    ).leftdrag( updateAlphaFun )

  alphaGradient.replaceWith( alphaCanvas )

  /*
   * Update Callbacks for Colour and Alpha
   */

  painter.onSetColor( strColor => {
    // update the shown colour
    alphaBar.style.background = strColor

    // convert #ff9933 colour into r, g, b values
    const hexStr = strColor.substring( 1, 7 )
    const rgb    = parseInt( hexStr, 16 )

    const r = (rgb >> 16) & 0xff
    const g = (rgb >>  8) & 0xff
    const b =  rgb & 0xff

    const hasRGBFocus =
        ( document.activeElement === rInput ) ||
        ( document.activeElement === gInput ) ||
        ( document.activeElement === bInput )

    const hasHSVFocus =
        ( document.activeElement === hInput ) ||
        ( document.activeElement === sInput ) ||
        ( document.activeElement === vInput )

    if ( ! hasRGBFocus ) {
      // and set the values
      rInput.value = r
      gInput.value = g
      bInput.value = b
    }

    /* Update the Colour Mixer */

    // convert colour to full hue
    const newHue = colourUtils.rgbToHSVHue( r, g, b )

    // cache these for laterz
    saturation = colourUtils.rgbToHSVSaturation( r, g, b )
    value = colourUtils.rgbToHSVValue( r, g, b )

    if ( ! hasHSVFocus ) {
      sInput.value = Math.round( saturation * 100 )
      vInput.value = Math.round( value * 100      )
    }

    /* Update X/Y location of the overlay bars */
    const xVal = saturation  // saturation
    const yVal = (1 - value) // value

    const colXWidth  = mixerSize - yVal*mixerSize
    const colYHeight = mixerSize

    const colX = xVal * colXWidth
    const colY = yVal * colYHeight

    mixerVertical.
        translate( colX, 0 ).
        height(
            Math.limit(
                (mixerSize - colX) + COLOUR_MIXER_MIN_WIDTH,
                COLOUR_MIXER_MIN_WIDTH,
                COLOUR_MIXER_WIDTH
            )
        )

    mixerHorizontal.
        translate( 0, colY ).
        width(
            Math.limit(
                (mixerSize - colY) + COLOUR_MIXER_MIN_WIDTH,
                COLOUR_MIXER_MIN_WIDTH,
                COLOUR_MIXER_WIDTH
            )
        )

    /* Update Hue
     *
     * Skip hue update for greys (when saturation == 0), as it's always red.
     */

    if ( saturation > 0 || hue === undefined ) {
      updateHue( newHue )

      if ( ! hasHSVFocus ) {
        hInput.value = Math.round( newHue * 360 )
      }
    }
  })

  painter.onSetAlpha(( alpha ) => {
    const y = Math.floor( alpha*alphaBar.clientHeight )
    alphaBarLine.translate( 0, y )

    // if it does not have focus
    if ( aInput !== document.activeElement ) {
      // concat alpha down to just two decimal places
      aInput.value = alpha.toFixed(2)
    }
  })
}

/**
 * Creates and sets up the Commands GUI.
 *
 * @param painter The SkyBrush application.
 */
function initializeCommands( painter, commandsList, picker ) {
  const commands = document.createElement( 'div' )
  commands.className = 'skybrush_commands_pane'

  const controlsWrap = document.createElement('div')
  controlsWrap.className = 'skybrush_command_controls'

  for ( let i = 0; i < commandsList.length; i++ ) {
    const c = commandsList[i]

    const command = document.createElement( 'div' )
    command.className = 'skybrush_gui_command ' + c.css
    command.__command = c

    const commandBack = document.createElement( 'div' )
    commandBack.className = 'skybrush_command_back'
    command.appendChild( commandBack )

    const commandButton = document.createElement('a')
    commandButton.href = '#'
    commandButton.title = c.getCaption()

    $( commandButton ).vclick((ev) => {
      ev.preventDefault()
      ev.stopPropagation()

      painter.setCommand( this.parentNode.__command )
    })

    command.appendChild( commandButton )
    commands.appendChild( command )

    controlsWrap.appendChild( c.createControlsDom(painter) )
  }

  controlsWrap.appendChild( picker.createControlsDom(painter) )

  const commandsGUI = new GUI( 'Tools', 'commands' )
      .append( commands )

  const commandControlsGUI = new GUI( 'Tool Settings', 'command_settings' )
      .append( controlsWrap )

  painter.addGUI( commandsGUI, commandControlsGUI )

  // hook up the selection changes directly into the SkyBrush it's self
  painter.onSetCommand(( command, lastCommand ) => {
    const commandDoms = commands.getElementsByClassName( 'skybrush_gui_command' )
    for ( let i = 0; i < commandDoms.length; i++ ) {
      const commandDom = commandDoms[i]

      if ( commandDom.__command === command ) {
        commandDom.classList.add( 'sb_selected' )
      } else if ( commandDom.classList.contains('sb_selected') ) {
        commandDom.classList.remove( 'sb_selected' )
      }
    }

    let controls
    if ( lastCommand !== null ) {
      controls = lastCommand.getControlsDom()

      if ( controls !== null ) {
        controls.classList.remove('sb_show')
      }
    }

    controls = command.getControlsDom()
    if ( controls !== null ) {
      controls.classList.add('sb_show')
    }
  })
}

/*
 * Sets up some common shortcuts,
 * not that not all are set here, such as undo/redo.
 */
function initializeShortcuts(
    painter:skybrush.SkyBrush,
    dontGrabCtrlR:boolean,
):void {
  const domObj = painter.dom

  painter.onCtrl( 187, () => {
    painter.zoomIn()
  })
  painter.onCtrl( 189, () => {
    painter.zoomOut()
  })

  // make the dom focusable
  domObj.setAttribute( 'tabindex', 0 )

  // key code constants
  const ALT    = 18
  const SHIFT  = 16
  const DELETE = 46

  painter.
      /* alternate commands - Shift key */
      onKeyToggle( SHIFT, isShiftDown => {
        painter.runOnShift( isShiftDown )
      }).

      /* alternate commands - Alt key */
      onKeyToggle( ALT, isAltDown => {
        painter.runOnAlt( isAltDown )
      })

  /* Redo - ctrl + r and ctrl + y */
  if ( ! dontGrabCtrlR ) {
    painter.onCtrl( 'r', () => {
      painter.redo()
    })
  }

  painter.
      onCtrl( 'y', () => {
        painter.redo()
      }).

      /* Undo - ctrl + z */
      onCtrl( 'z', () => {
        painter.undo()
      }).

      /* Crop - ctrl+e */
      onCtrl( 'e', () => {
        painter.getCanvas().crop()
      }).

      /* Clear - delete key */
      onKey( DELETE, () => {
        painter.getCanvas().clear()
      }).

      /* Copy */
      onCtrl( 'c', () => {
        painter.copy()
      }).

      /* Cut */
      onCtrl( 'x', () => {
        painter.cut()
      }).

      /* Paste */
      onCtrl( 'v', () => {
        painter.paste()
      }).

      /* Select All */
      onCtrl( 'a', () => {
        painter.getCanvas().getMarquee().
            startHighlight().
            select( 0, 0, painter.getWidth(), painter.getHeight() ).
            stopHighlight()
      } )

  /* Command Key Bindings */

  const bindCommand = function( key:string, commandName:string ) {
    const command = painter.getCommand( commandName )

    return painter.onKey( key, () => {
      painter.setCommand( command )
    })
  }

  bindCommand( 'p', 'pencil' )
  bindCommand( 'b', 'brush'  )
  bindCommand( 'w', 'webby'  )
  bindCommand( 'e', 'eraser' )

  bindCommand( 'r', 'rectangle' )
  bindCommand( 'c', 'circle' )
  bindCommand( 'l', 'line'   )

  bindCommand( 'f', 'fill'   )

  bindCommand( 'z', 'zoom'   )
  bindCommand( 's', 'select' )
  bindCommand( 'm', 'move'   )

  bindCommand( 'k', 'picker' )

  /* On Alt behaviour - switch to colour picker */
  const pickerSwitchCommand:Command|null = null
  painter.onAlt( isAlt => {
    if ( isAlt ) {
      if ( pickerSwitchCommand !== painter.pickerCommand ) {
        pickerSwitchCommand = painter.getCurrentCommand()
        painter.setCommand( painter.pickerCommand )
      }
    } else {
      if ( pickerSwitchCommand !== null ) {
        // they might have switched whilst alt is still down
        if ( painter.command === painter.pickerCommand ) {
          painter.setCommand( pickerSwitchCommand )
        }

        pickerSwitchCommand = null
      }
    }
  })
}

