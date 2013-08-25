"use strict";

/**
 * @license
 * 
 * SkyBrush - skybrush.css
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
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
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
 * @param nil A shorthand name for null, MUST PASS IN NULL!
 * @param undefined, NEVER PASS IN A VALUE FOR THIS PARAMETER!
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
(function(window, document, nil, undefined) {
    /**
     * We create this, to reference jQuery later.
     */
    var $;

    /*
     * Default Values for SkyBrush.
     * This is for the initial setup.
     */
    var initializeJQuery = (function() {
        var isInitialized = false;

        return function() {
            if ( ! isInitialized ) {
                isInitialized = true;

                if ( ! $ ) {
                    $ = window['jquery'] || window['$'];

                    // ensure we give preference to 'jquery' over the dollar, incase it was replaced.
                    if ( ! $ ) {
                        throw Error("jQuery is required, and it cannot be found!");
                    }
                }

                USE_NATIVE_CURSOR = ! ( $.browser.msie || $.browser.opera );
                TOUCH_PIXEL_CONTENT = ( $.browser.mozilla && parseInt($.browser.version) < 23);
                MAX_NATIVE_CURSOR_SIZE = USE_NATIVE_CURSOR ?
                        128 :
                          0 ;
            }
        }
    })();

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
    var BRUSH_RENDER_FUNCTIONS = {
        CROSSHAIR: (function() {
            var renderCrossHair = function(ctx, canvas, size) {
                // top middle line
                ctx.moveTo( size/2, 0 );
                ctx.lineTo( size/2, size/2-2 );

                // bottom middle line
                ctx.moveTo( size/2, size/2+2 );
                ctx.lineTo( size/2, size );

                // left line
                ctx.moveTo( 0, size/2 );
                ctx.lineTo( size/2-2, size/2 );

                // right line
                ctx.moveTo( size    , size/2 );
                ctx.lineTo( size/2+2, size/2 );

                ctx.stroke();

                // a dot in the centre
                ctx.fillRect( size/2-0.5, size/2-0.5, 1, 1 );
            };

            return function(ctx, canvas, size) {
                ctx.globalAlpha = 0.75;

                ctx.strokeStyle = ctx.fillStyle = '#fff';
                ctx.translate( 0.2, 0.2 );
                renderCrossHair( ctx, canvas, size );

                ctx.strokeStyle = ctx.fillStyle = '#000';
                ctx.translate( -0.4, -0.4 );
                renderCrossHair( ctx, canvas, size );
            };
        })(),

        SQUARE: function(ctx, canvas, size) {
            var middle = canvas.width/2,
                size2  = size/2;

            // an outer square
            ctx.strokeStyle = '#fff';
            ctx.globalAlpha = 0.9;
            ctx.strokeRect(
                    (middle-size2)+0.4,
                    (middle-size2)+0.4,
                    size-0.8,
                    size-0.8
            );

            // an outer square
            ctx.strokeStyle = '#000';
            ctx.globalAlpha = 1;
            ctx.strokeRect(
                    middle-size2,
                    middle-size2,
                    size,
                    size
            );
        },

        CIRCLE: function(ctx, canvas, size) {
            var middle = canvas.width/2,
                size2  = size/2;

            // an inner circle
            ctx.strokeStyle = '#fff';
            ctx.globalAlpha = 0.9;
            circlePath( ctx,
                    (middle-size2)+0.7,
                    (middle-size2)+0.7,
                    size-1.4,
                    size-1.4
            );
            ctx.stroke();
            
            // an outer circle
            ctx.strokeStyle = '#000';
            ctx.globalAlpha = 1;
            circlePath( ctx,
                    middle - size2,
                    middle - size2,
                    size,
                    size
            );
            ctx.stroke();
        }
    }

    /**
     * @const
     */
    var DEFAULT_WIDTH  = 540, // pixels
        DEFAULT_HEIGHT = 460, // pixels
        DEFAULT_ZOOM   =   1, // from 1/MAX_ZOOM to MAX_ZOOM

        DEFAULT_GRID_WIDTH  = 5, // pixels
        DEFAULT_GRID_HEIGHT = 5, // pixels

        /*
         * These are for decided if a native cursor should be used, or not. At
         * the time of writing, this is banned on Opera and IE.
         *
         * Although IE does not support cursor data uri's, it is the least
         * laggy when using background-image.
         *
         * @see initializeJQuery 
         */
        USE_NATIVE_CURSOR = false,
        MAX_NATIVE_CURSOR_SIZE = 0,

        /**
         * When true, pixel content will be touched, in order to avoid issues
         * with the canvas failing to be updated when drawn to.
         *
         * This fixes an old FireFox bug, when drawing to non-visible canvases,
         * where the content failed to be drawn in time.
         *
         * By default, this is false.
         */
        TOUCH_PIXEL_CONTENT = false,

        /**
         * @const
         * @type {string}
         */
        DEFAULT_CURSOR = 'sb_cursor_default',

        /**
         * @const
         * @type {string}
         */
        NO_CURSOR_CSS = 'sb_cursor_none',

        /**
         * The size of the crosshair brush.
         */
        CROSSHAIR_CURSOR_SIZE = 19,

        /**
         * A data url, of a crosshair, for use as a cursor.
         *
         * It's generated once, to avoid generating it multiple times, during
         * use.
         */
        CROSSHAIR_CURSOR_DATA_URL = (function() {
            var canvas = document.createElement( 'canvas' );
            canvas.width = canvas.height = CROSSHAIR_CURSOR_SIZE;

            var ctx = canvas.getContext( '2d' );

            ctx.beginPath();
            ctx.lineCap   = 'round';
            ctx.lineWidth = 1;

            BRUSH_RENDER_FUNCTIONS.CROSSHAIR( ctx, canvas, CROSSHAIR_CURSOR_SIZE );

            return canvas.toDataURL();
        })(),

        /**
         * The the total cursor size is below this,
         * then it's swapped out,
         * and a crosshair is used instead.
         *
         * @constant
         * @type {number}
         */
        BRUSH_CURSOR_MINIMUM_SIZE = 5,

        /**
         * The number of pixels to add onto the brush canvas,
         * when it's being drawn.
         *
         * These are extra pixels around the edge, as a little padding.
         *
         * If the edge of the brush is too flat, because it's being cut off,
         * then just increase this value and it should get fixed.
         */
        BRUSH_CURSOR_PADDING = 2,

        /**
         * If we are touch, or not.
         *
         * @const
         * @type {boolean}
         */
        IS_TOUCH = !! window.Touch,

        /**
         * The name of the command to select as default,
         * when the user first sees painter.
         * 
         * @const
         * @type {string}
         */
        DEFAULT_COMMAND = 'webby',

        /**
         * The default size for brushes.
         * 
         * @const
         * @type {number}
         */
        DEFAULT_BRUSH_SIZE = 2,

        /**
         * The prefix added to command css classes.
         * 
         * So 'picker' becomes 'sb_command_picker' if
         * the prefix is 'sb_command_'.
         * 
         * @const
         * @type {string}
         */
        COMMAND_CSS_PREFIX = 'sb_command_',

        /**
         * @const
         * @type {string}
         */
        CONTROL_CSS_PREFIX = 'sb_control_',

        /**
         * 
         * @const
         * @type {string}
         */
        GUI_CSS_PREFIX = 'sb_gui_',

        /**
         * Attempts to disable the right click context menu,
         * when this is true. Otherwise it is allowed.
         *
         * @const
         * @type {number}
         */
        DISABLE_CONTEXT_MENU = false,

        /**
         * Minimum width of a horizontal/vertical line on the colour
         * pixker.
         *
         * @const
         * @type {number}
         */
        COLOUR_MIXER_MIN_WIDTH = 3,

        /**
         * The width, in pixels, of the colour mixer.
         *
         * This should match the CSS.
         *
         * @const
         * @type {number}
         */
        COLOUR_MIXER_WIDTH = 140,

        /**
         * The width of the colour wheel,
         * must match the CSS.
         *
         * @const
         * @type {number}
         */
        COLOUR_WHEEL_WIDTH = 77,

        UPSCALE_BACK_OFFSET_MOD = 16,

        /**
         * @const
         * @type {string}
         */
        CONTROL_ID_CSS_PREFIX = '__skybrush_control_css_id_',

        /**
         * Starting X location of the GUI dialogues.
         *
         * @const
         * @type {number}
         */
        GUI_DEFAULT_X = 24,

        /**
         * Startying y location.
         *
         * @const
         * @type {number}
         */
        GUI_DEFAULT_Y = 70,
        
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
        UPSCALE_SCROLL_DELAY = 350,

        /**
         *
         * @const
         * @type {number}
         */
        UPSCALE_DIVIDE_AREA = 400,

        /**
         * How long it takes to fade the GUI overlays in and out,
         * when shown and hidden.
         *
         * @const
         * @type {number}
         */
        HIDE_GUI_TIME = 300,

        /**
         * When you click on a slider, it moves the slider to
         * the nearest whole increment in that direction.
         *
         * This states how many increments there are across a
         * sliding bar, in order to work out all these increments.
         *
         * @const
         */
        NUM_SLIDE_INCREMENTS = 16,

        /**
         * A value from 0.0 to 1.0.
         *
         * When you slide the slider up or down, using 'slideUp' or 'slideDown',
         * a distance is calculated between the last position, and the next one.
         * This is normalized to be a distance of 1.0.
         *
         * The distance of the slider mark, on the slider bar, is then worked
         * out from the next position, again normalized to this 0.0 to 1.0 range.
         * For example if the slider mark is half way, then the distance of 0.5.
         * If it is 3/4 away from the next mark, then the distance is 0.75.
         *
         * If the distance is less then the SLIDER_ERROR, then the mark will jump
         * over the next mark on the slider, and so skip it.
         *
         * @const
         * @type {number}
         */
        SLIDER_ERROR = 0.33,

        /**
         * This is the power to take alpha values to, in order to convert them to
         * the same value as 'opacity'.
         *
         * Opacity is blended differently (higher alpha) then values drawn to the screen.
         *
         * @const
         * @type {number}
         */
        ALPHA_TO_OPACITY_POWER = 1.09,

        /**
         * If the alpha is set to a value just below 1,
         * which is within this dead zone, then it's blended up to 1.
         *
         * This is to make it easier to select an alpha of 1.
         *
         * @const
         * @type {number}
         */
        ALPHA_DEAD_ZONE = 0.03,

        /**
         * The speed of the animation when updating the canvas size/position
         *
         * @const
         * @type {number}
         */
        CANVAS_UPDATE_SPEED = 200,

        /**
         * The number of canvas' to store internally in the undo stack
         * this equates to how many times you can click back 'undo'.
         *
         * @const
         * @type {number}
         */
        UNDO_STACK_SIZE = 40,

        /**
         * Starting alpha value.
         *
         * @const
         * @type {number}
         */
        DEFAULT_ALPHA = 1,

        /**
         * The maximum zoom level.
         *
         * min zoom is: 1 / MAX_ZOOM
         *
         * @const
         * @type {number}
         */
        MAX_ZOOM = 16,

        /**
         * The maximum brush size allowed.
         *
         * @const
         * @type {number}
         */
        MAX_BRUSH_SIZE = 50,

        /**
         * In some places, we need a function that just returns false.
         * In those occasions, this can be used.
         */
        RETURN_FALSE = function() { return false },

        /*
         * WARNING! All colours _MUST_ be 6 values hex values!
         */

        /**
         * The default colour to set as the current colour,
         * when Painter starts.
         */
        DEFAULT_COLOR = '#104662', // black

        NUM_COLORS_IN_PALETTE_COLUMN = 5,

        /**
         * The colours present in the colour palette.
         *
         * Add/remove from this list to have different colours.
         *
         * @const
         * @type {Array.<string>}
         */
        DEFAULT_COLORS = (function() {
            /*
             * Colors are laid out in groups, we then re-arrange so they are
             * laid out in columns instead, and can be 'just dumped', into the
             * DOM.
             */
            var colors = [
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
                    '#630041'
            ];

            var cols = new Array();
            for ( var i = 0; i < NUM_COLORS_IN_PALETTE_COLUMN; i++ ) {
                for ( var j = i; j < colors.length; j += NUM_COLORS_IN_PALETTE_COLUMN ) {
                    cols.push( colors[j] );
                }
            }

            return cols;
        })();

    /**
     * Mouse constants, so the code is more readable.
     *
     * @constant
     * @private
     * @type {number}
     */
    var LEFT   = 1,
        RIGHT  = 2,
        MIDDLE = 3 ;

    /**
     * An array used for fast hex value lookup.
     *
     * @type {Array.<string>}
     */
    var INT_TO_HEX = [];
    for ( var i = 0; i <= 255; i++ ) {
        var hex = i.toString(16);

        // writes out a two letter hex value
        INT_TO_HEX.push( (i < 16) ? ('0' + hex) : hex )
    }

    /**
     * Creates a new JQuery wrapped Anchor, and returns it,
     * but with lots of defaults set.
     *
     * These include '#' for the href, and to prevent the default action
     * of following the link.
     *
     * You can also pass in more CSS classes after the 'text' parameter.
     *
     * @param text The text to appear on this anchor.
     * @return A jQuery wrapped anchor tag.
     */
    var $a = function( text ) {
        var klass = '';

        for ( var i = 1; i < arguments.length; i++ ) {
            klass += ' ' + arguments[i];
        }

        var anchor = document.createElement( 'a' );
        anchor.setAttribute( 'href', '#' );
        anchor.className = klass;

        if ( text ) {
            anchor.innerHTML = text;
        }

        return $(anchor);
    };

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
    var $slider = function() {
        var sliderBar;

        if ( $.support.input.range ) {
            sliderBar = $('<input>').
                    addClass( 'skybrush_slider_bar' ).
                    attr( 'type', 'range' ).

                    // default min/max/step values
                    attr( 'min', 0 ).
                    attr( 'max', 1 ).
                    attr( 'step', 1/NUM_SLIDE_INCREMENTS ).
                    change( function() {
                        sliderBar.runOnSlide();
                    });

            sliderBar.getStep = function() {
                return Number( this.attr('step') );
            };
            sliderBar.setStep = function( step ) {
                this.attr('step', step );
            };

            sliderBar.getMin = function() {
                return Number( this.attr('min') );
            };
            sliderBar.getMax = function() {
                return Number( this.attr('max') );
            };
            sliderBar.setMin = function( min ) {
                this.attr( 'min', min );
            };
            sliderBar.setMax = function( max ) {
                this.attr( 'max', max );
            };

            sliderBar.isFake = function() {
                return false;
            };

            sliderBar.getVal = function() {
                return Number( this.val() );
            };
        } else {
            var slider = $a('', 'skybrush_slider_bar_slider').
                    killEvent( 'click', 'leftdown' ).
                    leftdown( function(ev) {
                        var $this = $(this);

                        $this.data('is_sliding', true);
                    } );

            slider.data( 'is_sliding', false );

            // stop sliding
            $(document).leftup( function(ev) {
                slider.data( 'is_sliding', false );
            } );

            /**
             * A helper sliding function.
             *
             * It handles the maths, and the movement, of sliding the slider up
             * or down $this, it's sliding bar.
             *
             * Things have to be passed in as it's a tad low level,
             * and designed to avoid some repetition when used (like finding the slider).
             */
            var slideTo = function( $this, slider, slideUp) {
                var sliderX = slider.position().left,
                    w = $this.width();
                var slideInc = w / NUM_SLIDE_INCREMENTS;
                var nowX = sliderX % slideInc;
                var onTheStep = nowX == 0;

                // work out the distance from the next mark, in the positive diretion (slide up)
                var normalizedDist = nowX / slideInc;

                var newX = sliderX - nowX;

                if ( slideUp ) {
                    newX += slideInc;

                    if ( !onTheStep ) {
                        // skip the next mark, if we are really close to it
                        if ( (1-normalizedDist) < SLIDER_ERROR ) {
                            newX += slideInc;
                        }
                    }
                // slide down + skip next down mark
                } else if ( onTheStep || normalizedDist < SLIDER_ERROR ) {
                    newX -= slideInc;
                }

                newX = Math.limit( newX, 0, w );
                var p = newX / w;
                
                sliderBar.percent( newX / w );
                sliderBar.runOnSlide();
            };

            sliderBar = $a('', 'skybrush_slider_bar', 'sb_fake').
                    killEvent( 'click', 'leftdown' ).
                                append( $('<div>').addClass('skybrush_slider_bar_inner') ).
                    append( slider ).

                    // zoom in/out when you click on the slider bar
                    click( function(ev) {
                        var $this = $(this);
                        var slider = $this.children('.skybrush_slider_bar_slider');

                        if ( ! slider.data('is_sliding') ) {
                            var mx = ev.pageX - $this.offset().left;
                            var sliderX = slider.position().left;
                            slideTo( $this, slider, (mx > sliderX) );
                        }
                    } ).

                    /*
                     * Browsers that support touch,
                     * also support proper sliders.
                     *
                     * So this should never be hit by a touch browser
                     * (hopefully).
                     */
                    mousemove( function(ev) {
                        var $this = $(this);
                        var slider = $this.children('.skybrush_slider_bar_slider');

                        if ( slider.data('is_sliding') ) {
                            var thisWidth = $this.width();
                            
                            var x = Math.limit(
                                    ev.offset($this).left,
                                    0,
                                    thisWidth
                            );

                            sliderBar.percent( x / thisWidth );
                            sliderBar.runOnSlide();
                        }
                    } );

            sliderBar.setPercent = function( p ) {
                p = Math.limit( p, 0.0, 1.0 );
                this.percentVal = p;

                var x = this.width() * p ;
                this.
                        children('.skybrush_slider_bar_slider').
                        translate( x, 0 );

                return this;
            };

            sliderBar.setPercentVal = function( val ) {
                val = Math.round( val-this.minVal, this.increment );

                return this.setPercent(
                        rangeToPercent(
                                val,
                                this.minVal,
                                this.maxVal
                        )
                );
            };

            sliderBar.percent = function( p ) {
                if ( arguments.length === 0 ) {
                    return this.percentVal;
                } else {
                    sliderBar.setPercentVal(
                          percentToRange( p, sliderBar.getMin(), sliderBar.getMax() )
                    );
                }
            };

            sliderBar.percentVal = 0;

            /* The common interface */

            sliderBar.getVal = function() {
                return percentToRange( this.percentVal, this.minVal, this.maxVal );
            };

            sliderBar.val = function( val ) {
                if ( arguments.length === 0 ) {
                    return percentToRange( this.percentVal, this.minVal, this.maxVal );
                } else {
                    return this.setPercentVal( val );
                }
            };

            sliderBar.getStep = function() {
                return this.increment;
            };
            sliderBar.setStep = function( step ) {
                this.increment = step;
            };

            sliderBar.getMin = function() {
                return this.minVal;
            };
            sliderBar.getMax = function() {
                return this.maxVal;
            };
            sliderBar.setMin = function( min ) {
                this.minVal = min;
            };
            sliderBar.setMax = function( max ) {
                this.maxVal = max;
            };

            sliderBar.isFake = function() {
                return true;
            };
        }

        /*
         * The common sliding code.
         * 
         * This code is built on top of both the HTML5 and
         * my own sliders.
         */

        sliderBar.limit = function( min, max ) {
            this.setMin( min );
            this.setMax( max );

            return this;
        };

        sliderBar.min = function( min ) {
            if ( arguments.length === 0 ) {
                return this.getMin();
            } else {
                this.setMin( min );
                return this;
            }
        };

        sliderBar.max = function( max ) {
            if ( arguments.length === 0 ) {
                return this.getMax();
            } else {
                this.setMax( max );
                return this;
            }
        };

        sliderBar.step = function( step ) {
            if ( arguments.length === 0 ) {
                return this.getStep();
            } else {
                this.setStep( step );
                return this;
            }
        };

        /**
         * Allows adding slide events, run when this slides.
         */
        sliderBar.slide = function(f) {
            return this.bind( 'on_slide', f );
        };
        
        sliderBar.setSlide = function(p) {
            return this.val(
                    percentToRange(
                            Math.limit( p, 0.0, 1.0 ),
                            this.getMin(),
                            this.getMax()
                    )
            );
        };

        sliderBar.runOnSlide = function() {
            var val = this.getVal(),
                min = this.getMin(),
                max = this.getMax();

            var p = rangeToPercent( val, min, max );

            this.trigger( 'on_slide', [val, p] );
        };

        sliderBar.slideUp = function() {
            this.val( this.getVal() + this.getStep() );
            this.runOnSlide();
        };

        sliderBar.slideDown = function() {
            this.val( this.getVal() - this.getStep() );
            this.runOnSlide();
        };

        sliderBar.limit( 0, 1 ).step( NUM_SLIDE_INCREMENTS );

        return sliderBar;
    };

    /**
     * Takes the percentage value (a number in the range [0.0, 1.0]),
     * a min, and a max, and outputs it's equivalent in the min/max
     * given.
     *
     * @param p The percent value to convert.
     * @param min The minimum value allowed.
     * @param max The maximum value allowed.
     * @return The percent converted to a value from min to max.
     */
    var percentToRange = function( p, min, max ) {
        return (max-min)*p + min;
    };

    /**
     * You give it a value, and this returns a 'percent',
     * which is a number from 0.0 to 1.0.
     * 
     * It works out this percent through the value, min
     * and max values given.
     * 
     * @param n The value to convert to a percent.
     * @param min The minimum value in the range.
     * @param max The minimum value in the range.
     * @return The percent result.
     */
    var rangeToPercent = function( n, min, max ) {
        return (n-min) / (max-min);
    };

    /**
     * Converts an RGB color value to HSV. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
     * Assumes r, g, and b are contained in the set [0, 255] and
     * returns h, s, and v in the set [0, 1].
     *
     * @param   {number} r       The red color value
     * @param   {number} g       The green color value
     * @param   {number} b       The blue color value
     * @return  {Array.<number>} The HSV representation
     */
    var rgbToHSV = function(r, g, b){
        r = r/255,
        g = g/255,
        b = b/255;

        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, v = max;

        var d = max - min;
        s = max == 0 ? 0 : d / max;

        if(max == min){
            h = 0; // achromatic
        }else{
            switch(max){
                case r:h = (g - b) / d + (g < b ? 6 : 0);break;
                case g:h = (b - r) / d + 2;break;
                case b:h = (r - g) / d + 4;break;
            }
            h /= 6;
        }

        return [h, s, v];
    }

    /**
     * Converts an HSV color value to RGB. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
     * Assumes h, s, and v are contained in the set [0, 1] and
     * returns r, g, and b in the set [0, 255].
     *
     * @param   {number} h       The hue
     * @param   {number} s       The saturation
     * @param   {number} v       The value
     * @return  {Array.<number>} The RGB representation
     */
    function hsvToRGB(h, s, v){
        var r, g, b;

        var i = (h *  6)|0;
        var f =  h *  6 - i;
        var p =  v * (1 - s);
        var q =  v * (1 - f * s);
        var t =  v * (1 - (1 - f) * s);

        var iMod = i % 6;

               if ( iMod === 0 ) { r = v, g = t, b = p;
        } else if ( iMod === 1 ) { r = q, g = v, b = p;
        } else if ( iMod === 2 ) { r = p, g = v, b = t;
        } else if ( iMod === 3 ) { r = p, g = q, b = v;
        } else if ( iMod === 4 ) { r = t, g = p, b = v;
        } else   /* iMod === 5 */{ r = v, g = p, b = q;
        }

        return [
                (r*255 + 0.5)|0,
                (g*255 + 0.5)|0,
                (b*255 + 0.5)|0
        ];
    }

    function hsvToB(h, s, v){
        var iMod = ((h*6)|0) % 6;

        if ( iMod === 0 ) {
            return ((
                    // p
                    v*(1-s)
            )*255 + 0.5)|0;
        } else if ( iMod === 1 ) {
            return ((
                    // p
                    v*(1-s)
            )*255 + 0.5)|0;
        } else if ( iMod === 2 ) {
            return ((
                    // t
                    (v * (1 - (1-(h*6-((h*6)|0))) * s))
            )*255 + 0.5)|0;
        } else if ( iMod === 3 ) {
            return ((
                    // v
                    v
            )*255 + 0.5)|0;
        } else if ( iMod === 4 ) {
            return ((
                    // v
                    v
            )*255 + 0.5)|0;
        } else /* iMod === 5 */{
            return ((
                    // q
                    v * (1 - (h*6-((h*6)|0)) * s)
            )*255 + 0.5)|0;
        }
    }

    function hsvToG(h, s, v){
        var iMod = ((h*6)|0) % 6;

        if ( iMod === 0 ) {
            return ((
                    // t
                    (v * (1 - (1-(h*6-((h*6)|0))) * s))
            )*255 + 0.5)|0;
        } else if ( iMod === 1 ) {
            return ((
                    // v
                    v
            )*255 + 0.5)|0;
        } else if ( iMod === 2 ) {
            return ((
                    // v
                    v
            )*255 + 0.5)|0;
        } else if ( iMod === 3 ) {
            return ((
                    // q
                    v * (1 - (h*6-((h*6)|0)) * s)
            )*255 + 0.5)|0;
        } else if ( iMod === 4 ) {
            return ((
                    // p
                    v*(1-s)
            )*255 + 0.5)|0;
        } else /* iMod === 5 */{
            return ((
                    // p
                    v*(1-s)
            )*255 + 0.5)|0;
        }
    }

    /**
     * @param   {number} h       The hue
     * @param   {number} s       The saturation
     * @param   {number} v       The value
     * @return  {number}         The red component, in the RGB colour model.
     */
    function hsvToR(h, s, v){
        var iMod = ((h*6)|0) % 6;

        if ( iMod === 0 ) {
            return ((
                    // v
                    v
            )*255 + 0.5)|0;
        } else if ( iMod === 1 ) {
            return ((
                    // q
                    v * (1 - (h*6-((h*6)|0)) * s)
            )*255 + 0.5)|0;
        } else if ( iMod === 2 ) {
            return ((
                    // p
                    v*(1-s))
            *255 + 0.5)|0;
        } else if ( iMod === 3 ) {
            return ((
                    // p
                    v*(1-s)
            )*255 + 0.5)|0;
        } else if ( iMod === 4 ) {
            return ((
                    // t
                    (v * (1 - (1-(h*6-((h*6)|0))) * s))
            )*255 + 0.5)|0;
        } else /* iMod === 5 */{
            return ((
                    // v
                    v
            )*255 + 0.5)|0;
        }
    }

    /**
     * Converts given hsv value, into a hex colour.
     * It's the same as 'rgbToColor', only it takes
     * HSV values instead.
     *
     * Example result: #d9aa23
     *
     * @param r The hue.
     * @param s The saturation, 0.0 to 1.0.
     * @param v The value, 0.0 to 1.0.
     * @return {string} A CSS hex string for this color.
     */
    var hsvToColor = function( h, s, v ) {
        // hsvToR/G/B returns an int, so no rounding is needed!
        return '#' +
                INT_TO_HEX[ hsvToR(h, s, v) ] +
                INT_TO_HEX[ hsvToG(h, s, v) ] +
                INT_TO_HEX[ hsvToB(h, s, v) ] ;
    }

    /**
     * All components must be provided as values between 0 and 255.
     * Floating point values are allowed, but will be rounded to
     * the nearest whole number.
     *
     * Example result: #d9aa23
     * 
     * @param r The red component.
     * @param g The green component.
     * @param b The blue component.
     * @return The given RGB values combined into a hex string.
     */
    var rgbToColor = function( r, g, b ) {
        return '#' +
                INT_TO_HEX[ (r+0.5) | 0 ] +
                INT_TO_HEX[ (g+0.5) | 0 ] +
                INT_TO_HEX[ (b+0.5) | 0 ] ;
    };

    /**
     * Set up sensible defaults for 2D canvas contexts.
     *
     * These aren't defaults for Painter,
     * but are to normalize cross-browser defaults,
     * as some browsers (*cough* Chrome) sometimes have buggy defaults.
     *
     * @private
     * @param ctx
     */
    var initializeCtx = function( ctx ) {
        ctx.fillStyle   = 'white';
        ctx.strokeStyle = 'white';
        ctx.globalAlpha = 1;
        ctx.lineWidth   = 1;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
    };

    /**
     * Cleares the overlay on top of the painting canvas.
     */
    var clearCtx = function(ctx, x, y, w, h, buffer) {
        if ( x === undefined ) {
            x = 0;
            y = 0;
            w = ctx.canvas.width;
            h = ctx.canvas.height;
        } else {
            if ( w < 0 ) {
                w  = -w;
                x -=  w;
            }

            if ( h < 0 ) {
                h  = -h;
                y -=  h;
            }

            // increase the clear area by 1, by default
            // this is to account for any anti-aliasing
            x--;
            y--;

            w += 2;
            h += 2;

            if ( buffer !== undefined ) {
                x -= buffer;
                y -= buffer;
                w += buffer*2;
                h += buffer*2;
            }

            x = Math.max( x, 0 );
            y = Math.max( y, 0 );
            w = Math.min( w, ctx.canvas.width  );
            h = Math.min( h, ctx.canvas.height );
        }

        ctx.clearRect( x, y, w, h );
    };

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
            dest, startX, startY, destW, destH,
            pixelWidth, pixelHeight,

            sData, x, y, w, h,
            oData,

            forceSrcAlpha
    ) {
        var forceSrcAlpha = !! forceSrcAlpha,
            includeOverlay = !! oData,

            dCtx = dest.getContext('2d'),

            sData = sData.data,
            oData = oData ? oData.data :
                    nil ;

        var endX = startX + destW,
            endY = startY + destH;

        /*
         * Takes off a little from the end, if pixelWidth/Height
         * is not a whole number. This is to account for
         * floating point number rounding errors.
         */
        if ( pixelWidth % 1 !== 0 ) {
            endX -= 0.000001;
        }
        if ( pixelHeight % 1 !== 0 ) {
            endY -= 0.000001;
        }

        dCtx.clearRect( startX, startY, (destW|0), (destH|0) );

        /*
         * This optimization is about avoiding calls to update
         * fillStyle and globalAlpha.
         *
         * This saves about 10% to 20%
         */
        var lastColor = 0,
            lastAlpha = 255;
        dCtx.fillStyle = '#000';
        dCtx.globalAlpha = 1;

        // location of the pixel in both canvas and overlay
        var i = 0,
            drawY = startY;

        /*
         * '.buffer == undefined' check needed for Chrome,
         * as 18 has Uint8ClampedArray included, but not used.
         */
        if ( window.Uint8ClampedArray !== undefined && sData.buffer !== undefined ) {
            sData = new Int32Array( sData.buffer );
            if ( oData !== nil ) {
                oData = new Int32Array( oData.buffer );
            }

            while ( drawY < endY ) {
                var nextY = drawY + pixelHeight,
                    drawYI = ((0.5 + drawY) | 0);
                var diffY = ((0.5 + nextY) | 0) - drawYI,
                    drawX = startX;

                while ( drawX < endX ) {
                    var nextX = drawX + pixelWidth;
                    var cRGB = sData[i],
                        oRGB,
                        ca = (cRGB >> 24) & 0xFF,
                        oa;

                    if ( includeOverlay ) {
                        oRGB = oData[i];
                        oa = (oRGB >> 24) & 0xFF;
                    } else {
                        oa = 0;
                    }

                    /*
                     * Skip Transparency When:
                     *  = canvas and overlay are empty
                     *  = using destination alpha and canvas is empty
                     */
                    if ( ! (
                            ca === 0 && ( oa === 0 || forceSrcAlpha )
                    ) ) {
                        var nowDrawX = ((0.5 + drawX) | 0),
                            r, g, b;

                        // overlay is blank
                        if ( oa === 0 ) {
                            r =  cRGB        & 0xFF;
                            g = (cRGB >> 8 ) & 0xFF;
                            b = (cRGB >> 16) & 0xFF;

                            if ( ca !== lastAlpha ) {
                                dCtx.globalAlpha = (lastAlpha = ca) / 255.0;
                            }
                        // full overlay alpha
                        } else if ( oa === 255 && forceSrcAlpha === false ) {
                            r =  oRGB        & 0xFF;
                            g = (oRGB >>  8) & 0xFF;
                            b = (oRGB >> 16) & 0xFF;

                            if ( lastAlpha !== 255 ) {
                                dCtx.globalAlpha = 1;
                                lastAlpha = 255;
                            }
                        // canvas is blank
                        } else if ( ca === 0 ) {
                            // nothing will be drawn using forceSrcAlpha, so just move on
                            r =  oRGB        & 0xFF;
                            g = (oRGB >>  8) & 0xFF;
                            b = (oRGB >> 16) & 0xFF;

                            if ( oa !== lastAlpha ) {
                                dCtx.globalAlpha = (lastAlpha = oa) / 255.0;
                            }
                        // mix canvas and overlay
                        } else if ( forceSrcAlpha ) {
                            /*
                             * If we have full overlay alpha,
                             * then no mixing is needed,
                             * as the overlay will 100% win anyway.
                             */
                            if ( oa === 255 ) {
                                r =  oRGB        & 0xFF;
                                g = (oRGB >>  8) & 0xFF;
                                b = (oRGB >> 16) & 0xFF;
                            } else {
                                oa /= 255.0;
                                var iOa = 1 - oa;

                                r = ( cRGB        & 0xFF)*iOa + ( oRGB        & 0xFF)*oa;
                                g = ((cRGB >>  8) & 0xFF)*iOa + ((oRGB >>  8) & 0xFF)*oa;
                                b = ((cRGB >> 16) & 0xFF)*iOa + ((oRGB >> 16) & 0xFF)*oa;

                                // fast, positive only, rounding
                                r = (r+0.5) | 0;
                                g = (g+0.5) | 0;
                                b = (b+0.5) | 0;
                            }

                            if ( ca !== lastAlpha ) {
                                dCtx.globalAlpha = (lastAlpha = ca) / 255.0;
                            }
                        } else {
                            r =  cRGB        & 0xFF;
                            g = (cRGB >>  8) & 0xFF;
                            b = (cRGB >> 16) & 0xFF;

                            if ( ca !== lastAlpha ) {
                                dCtx.globalAlpha = (lastAlpha = ca) / 255.0;
                            }

                            var nextColor = (r << 16) | (g << 8) | b ;
                            if ( nextColor !== lastColor ) {
                                dCtx.fillStyle = '#' + INT_TO_HEX[r] + INT_TO_HEX[g] + INT_TO_HEX[b] ;
                                lastColor = nextColor;
                            }

                            dCtx.fillRect(
                                    nowDrawX,
                                    drawYI,
                                    ((0.5 + nextX) | 0) - nowDrawX,
                                    diffY
                            );

                            // draw Overlay on top
                            r =  oRGB        & 0xFF;
                            g = (oRGB >>  8) & 0xFF;
                            b = (oRGB >> 16) & 0xFF;

                            if ( oa !== lastAlpha ) {
                                dCtx.globalAlpha = (lastAlpha = oa) / 255.0;
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
                        var nextColor = (r << 16) | (g << 8) | b ;
                        if ( nextColor !== lastColor ) {
                            dCtx.fillStyle = '#' + INT_TO_HEX[r] + INT_TO_HEX[g] + INT_TO_HEX[b] ;
                            lastColor = nextColor;
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
                            );
                        } else {
                            dCtx.fillRect(
                                    nowDrawX,
                                    drawYI,
                                    ((0.5 + nextX) | 0) - nowDrawX,
                                    diffY
                            );
                        }
                    }

                    i++;
                    drawX = nextX;
                }

                drawY = nextY;
            }
        } else {
            while ( drawY < endY ) {
                var nextY = drawY + pixelHeight,
                    drawYI = ((0.5 + drawY) | 0);
                var diffY = ((0.5 + nextY) | 0) - drawYI,
                    drawX = startX;

                while ( drawX < endX ) {
                    var nextX = drawX + pixelWidth;

                    // location of the pixel in both canvas and overlay
                    var ca = sData[ i + 3 ],
                        oa = includeOverlay ?
                                oData[ i + 3 ] :
                                0 ;

                    /*
                     * Skip Transparency When:
                     *  = canvas and overlay are empty
                     *  = using destination alpha and canvas is empty
                     */
                    if ( ! (
                            ca === 0 && ( oa === 0 || forceSrcAlpha )
                    ) ) {
                        var nowDrawX = ( drawX+0.5 ) | 0;
                        var cRed   = sData[i  ],
                            cGreen = sData[i+1],
                            cBlue  = sData[i+2];

                        var r, g, b;

                        // overlay is blank
                        if ( oa === 0 ) {
                            r = cRed;
                            g = cGreen;
                            b = cBlue;

                            if ( ca !== lastAlpha ) {
                                dCtx.globalAlpha = (lastAlpha = ca) / 255.0;
                            }
                        // full overlay alpha
                        } else if ( oa === 255 && forceSrcAlpha === false ) {
                            r = oData[ i   ];
                            g = oData[ i+1 ];
                            b = oData[ i+2 ];

                            if ( lastAlpha !== 255 ) {
                                dCtx.globalAlpha = 1;
                                lastAlpha = 255;
                            }
                        // canvas is blank
                        } else if ( ca === 0 ) {
                            // nothing will be drawn using forceSrcAlpha, so just move on
                            r = oData[ i   ];
                            g = oData[ i+1 ];
                            b = oData[ i+2 ];

                            if ( oa !== lastAlpha ) {
                                dCtx.globalAlpha = (lastAlpha = oa) / 255.0;
                            }
                        // mix canvas and overlay
                        } else if ( forceSrcAlpha ) {
                            /*
                             * If we have full overlay alpha,
                             * then no mixing is needed,
                             * as the overlay will 100% win anyway.
                             */
                            if ( oa === 255 ) {
                                r = oData[ i   ];
                                g = oData[ i+1 ];
                                b = oData[ i+2 ];
                            } else {
                                oa /= 255.0;
                                var iOa = 1 - oa;

                                r =   cRed*iOa + oData[ i   ]*oa;
                                g = cGreen*iOa + oData[ i+1 ]*oa;
                                b =  cBlue*iOa + oData[ i+2 ]*oa;

                                // fast, positive only, rounding
                                r = (r+0.5) | 0;
                                g = (g+0.5) | 0;
                                b = (b+0.5) | 0;
                            }

                            if ( ca !== lastAlpha ) {
                                dCtx.globalAlpha = (lastAlpha = ca) / 255.0;
                            }
                        } else {
                            r = cRed;
                            g = cGreen;
                            b = cBlue;

                            if ( ca !== lastAlpha ) {
                                dCtx.globalAlpha = (lastAlpha = ca) / 255.0;
                            }

                            var nextColor = (r << 16) | (g << 8) | b ;
                            if ( nextColor !== lastColor ) {
                                dCtx.fillStyle = '#' + INT_TO_HEX[r] + INT_TO_HEX[g] + INT_TO_HEX[b] ;
                                lastColor = nextColor;
                            }
                            dCtx.fillRect(
                                    nowDrawX,
                                    drawYI,
                                    ((0.5 + nextX) | 0) - nowDrawX,
                                    diffY
                            );

                            // draw Overlay on top
                            r = oData[ i   ];
                            g = oData[ i+1 ];
                            b = oData[ i+2 ];

                            if ( oa !== lastAlpha ) {
                                dCtx.globalAlpha = (lastAlpha = oa) / 255.0;
                            }
                        }

                        var nextColor = (r << 16) | (g << 8) | b ;
                        if ( nextColor !== lastColor ) {
                            dCtx.fillStyle = '#' + INT_TO_HEX[r] + INT_TO_HEX[g] + INT_TO_HEX[b] ;
                            lastColor = nextColor;
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
                                (nextX < endX) && (
                                        sData[i+4] === cRed   &&
                                        sData[i+5] === cGreen &&
                                        sData[i+6] === cBlue  &&
                                        sData[i+7] === ca
                                );
                                 nextX += pixelWidth, i += 4
                            ) { }

                            dCtx.fillRect(
                                    nowDrawX,
                                    drawYI,
                                    ((0.5 + nextX) | 0) - nowDrawX,
                                    diffY
                            );
                        } else {
                            dCtx.fillRect(
                                    nowDrawX,
                                    drawYI,
                                    ((0.5 + nextX) | 0) - nowDrawX,
                                    diffY
                            );
                        }
                    }

                    i += 4;
                    drawX = nextX;
                }

                drawY = nextY;
            }
        }
    };

    var newGUIBlock = function() {
        var div = document.createElement('div');
        div.className = 'skybrush_gui_content_block';

        for ( var i = 0; i < arguments.length; i++ ) {
            var dom = arguments[i];

            if ( dom.jquery ) {
                div.appendChild( dom.get(0) );
            } else {
                div.appendChild( dom );
            }
        }
        
        return div;
    }


    /**
     * @constructor
     * @private
     *
     * @param name The name of this GUI, this appeares in the header.
     * @param klass The CSS class for the content in this GUI.
     */
    var GUI = function( name, klass, clickableHeader ) {
        var self = this;

        self.dom = $('<div>').
                addClass( 'skybrush_gui' ).
                addClass( GUI_CSS_PREFIX + klass );
                
        var header  = $('<div>').addClass('skybrush_gui_header'),
            content = $('<div>').addClass('skybrush_gui_content');

        header.leftclick( function(ev) {
            ev.stopPropagation();
            ev.preventDefault();

            if ( clickableHeader !== false ) {
                self.toggleOpen();
            }
        } );

        if ( clickableHeader !== false ) {
            var darkenContent = $('<div>').addClass('skybrush_gui_darken');

            darkenContent.leftclick( function(ev) {
                if ( ! self.isOpen() ) {
                    self.open();
                }
            });

            this.dom.append( darkenContent );
        }

        self.header = header;
        self.isDragged = false;

        self.dragOffsetX = 0;
        self.dragOffsetY = 0;

        var headerContent = $( '<div class="skybrush_gui_header_text"></div>' );
        headerContent.html( name );

        header.append( headerContent );

        if ( $.browser.msie ) {
            header.bind( 'selectstart', function() { return false; } );
        }

        this.dom.append( header, content );
        this.content = content;

        // set later
        this.parent = nil;
    };

    GUI.prototype.setParent = function( parent ) {
        this.parent = parent;

        return this;
    };

    /**
     * Adds an element to the GUI.
     */
    GUI.prototype.append = function() {
        for ( var i = 0; i < arguments.length; i++ ) {
            this.content.append( newGUIBlock(arguments[i]) );
        }

        return this;
    };

    /**
     * Adds a new item to the content inside this dialog GUI.
     *
     * @param dom The jQuery object to add to this GUI.
     * @return This GUI.
     */
    GUI.prototype.addContent = function() {
        for ( var i = 0; i < arguments.length; i++ ) {
            this.dom.children('.skybrush_gui_content').append( arguments[i] );
        }

        return this;
    };

    GUI.prototype.open = function() {
        if ( ! this.parent.isGUIsShown() ) {
            this.parent.showGUIPane();
        }

        this.dom.removeClass( 'sb_hide' );
        
        return this;
    };

    GUI.prototype.close = function() {
        this.dom.ensureClass( 'sb_hide' );

        return this;
    };

    GUI.prototype.isOpen = function() {
        return ! this.dom.hasClass( 'sb_hide' );
    };

    GUI.prototype.toggleOpen = function() {
        if ( this.parent.isGUIsShown() ) {
            this.dom.toggleClass( 'sb_hide' );
        } else {
            this.parent.showGUIPane();
            this.dom.removeClass( 'sb_hide' );
        }

        return this;
    };

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
    var UndoStack = function( size, firstCanvas ) {
        // the +1 is for the checks later
        this.size = size+1;

        this.reset( firstCanvas );
    };

    UndoStack.prototype.reset = function( firstCanvas ) {
        this.index = 0;
        this.undoIndex = 0;
        this.maxRedo = 0;

        var first = newCanvas( firstCanvas.width, firstCanvas.height );
        first.ctx.drawImage( firstCanvas, 0, 0 );

        // flush drawing changes if browser is badly written
        if ( TOUCH_PIXEL_CONTENT ) {
            first.ctx.getImageData( 0, 0, 1, 1 );
        }

        this.canvases = [ first ];
    };

    /**
     * @param canvas The current canvas.
     * @param drawInfo Information on what was just drawn.
     * @return canvas The canvas to use for the future.
     */
    UndoStack.prototype.add = function( canvas, drawInfo ) {
        var undoCanvas = nil;

        // ensure we have space
        if ( this.undoIndex === this.size ) {
            undoCanvas = this.canvases.shift();
            undoCanvas.width  = canvas.width ;
            undoCanvas.height = canvas.height;
        } else {
            this.undoIndex++;
            this.maxRedo = this.undoIndex;

            // write over the top of an old 'redo' canvas
            if ( this.undoIndex < this.canvases.length ) {
                undoCanvas = this.canvases[ this.undoIndex ];
                undoCanvas.width  = canvas.width ;
                undoCanvas.height = canvas.height;
            } else {
                undoCanvas = newCanvas( canvas.width, canvas.height );
            }
        }

        undoCanvas.getContext('2d').drawImage( canvas, 0, 0 );

        // In Firefox we touch the canvas pixel data directly to force it to draw.
        // If we don't, then the items are drawn later on to a future canvas.
        // Seems like a Firefox bug.
        if ( TOUCH_PIXEL_CONTENT ) {
            var data = undoCanvas.ctx.getImageData( 0, 0, 1, 1 ).data;
        }

        this.canvases[ this.undoIndex ] = undoCanvas;
    };

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
    UndoStack.prototype.clearRedo = function() {
        for ( var i = this.undoIndex; i < this.canvases.length; i++ ) {
            this.canvases.pop();
        }
    };

    /**
     * @return True if calling 'undo' will undo the current canvas.
     */
    UndoStack.prototype.hasUndo = function() {
        return this.undoIndex > 0;
    };

    /**
     * @return True if there is history to redo.
     */
    UndoStack.prototype.hasRedo = function() {
        return this.undoIndex < this.maxRedo;
    };

    /**
     * This does nothing if there is nothing to undo.
     */
    UndoStack.prototype.undo = function() {
        if ( this.hasUndo() ) {
            this.undoIndex--;

            var canvas = this.canvases[ this.undoIndex ];

            return canvas;
        } else {
            return nil;
        }
    };

    /**
     * This does nothing if there is nothing to redo.
     */
    UndoStack.prototype.redo = function() {
        if ( this.hasRedo() ) {
            this.undoIndex++;
            return this.canvases[ this.undoIndex ];
        } else {
            return nil;
        }
    };

    /**
     * @private
     * @return A HTML5 Canvas.
     */
    var newCanvas = function( width, height ) {
        var canvas = document.createElement('canvas');

        if ( width !== undefined && height !== undefined ) {
            canvas.width = width;
            canvas.height = height;
        }
        canvas.ctx = canvas.getContext( '2d' );

        initializeCtx( canvas.ctx );
        canvas.ctx.save();

        return canvas;
    };

    /**
     * Sets up a circle path on the context given.
     *
     * This is everthing involved with drawing a circle
     * _but_ the actual stroke/fill.
     */
    var circlePath = function( ctx, x, y, w, h ) {
        var kappa = .5522848;
        var ox = (w / 2) * kappa,   // control point offset horizontal
            oy = (h / 2) * kappa,   // control point offset vertical
            xe = x + w,             // x-end
            ye = y + h,             // y-end
            xm = x + w / 2,         // x-middle
            ym = y + h / 2;         // y-middle

        ctx.beginPath();
        ctx.moveTo(x, ym);
        ctx.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
        ctx.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
        ctx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
        ctx.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
        ctx.closePath();
    };

    /**
     * Creates a new canvas, and returns it,
     * but after being painted with a checkerboard.
     *
     * The third argument states if it should
     * gradient the alpha across it, from left to right.
     */
    var newCheckerboard = function( w, h, gradientAlpha ) {
        var canvas = newCanvas( w, h );
        var ctx = canvas.ctx;
        var ctxData = ctx.getImageData( 0, 0, w, h );
        var data = ctxData.data;

        for ( var y = 0; y < h; y++ ) {
            for ( var x = 0; x < w; x++ ) {
                var i = (y*w + x) * 4,
                a = ( (1 - y/h)*255 + 0.5 ) | 0;

                // generate a Photoshop-like checker board
                data[i] = data[i+1] = data[i+2] =
                        ( (((y/8) | 0) % 2) === (((x/8) | 0) % 2) ) ?
                                254 :
                                203 ;

                data[i+3] = gradientAlpha ?
                        a :
                        1.0 ;
            }
        }

        ctx.putImageData( ctxData, 0, 0 );

        return canvas;
    }

    /**
     * The GridManager wraps up all of the grid handling for the canvas.
     * It's very closely tied to the CanvasManger,
     * and exists pretty much solely to make the code a little more
     * modular.
     *
     * @constructor
     * @private
     */
    var GridManager = function( parent ) {
        var dom = $('<div>').addClass( 'skybrush_grid' );
        this.dom = dom;
        parent.append( dom );

        this.offsetX = 0;
        this.offsetY = 0;
        this.width  = DEFAULT_GRID_WIDTH;
        this.height = DEFAULT_GRID_HEIGHT;

        this.zoom = 1;
        this.isDirty = true;
    };

    /**
     * Moves this grid to the area stated,
     * and re-organizes the grid to look how it's shown.
     *
     * The CanvasManager does work to located the upscale
     * canvas to fill the proper canvas. To avoid duplicating
     * this code, this method is provided to allow the canvas
     * to just pass the results on to this grid.
     */
    GridManager.prototype.updateViewport = function( canvasX, canvasY, width, height, zoom ) {
        var self = this;

        self.zoom = zoom;
        self.dom.
                width( width+1 ).
                height( height+1 ).
                translate( canvasX, canvasY );

        self.update( width+1, height+1 );
    };

    /**
     * Updates the layout of the grid.
     *
     * This should be called right after any properties have
     * been altered, but is only used internally.
     *
     * Calls such as 'setSize' and 'setOffset' already call
     * this automatically.
     */
    GridManager.prototype.update = function( w, h ) {
        this.dom.empty();

        if ( this.isShown() ) {
            this.forceUpdate( w, h );
        } else {
            this.isDirty = true;
        }
    };

    /**
     * Forces an update.
     *
     * This differs from the standard update, because this guarantees
     * that an update is performed, whilst the standard update might
     * skip it, for performance reasons.
     */
    GridManager.prototype.forceUpdate = function( w, h ) {
        var zoom = this.zoom,
             dom = this.dom;

        if ( w === undefined ) {
            w = dom.width();
        }
        if ( h === undefined ) {
            h = dom.height();
        }

        var xInc = Math.max( zoom * this.width , 1 ),
            yInc = Math.max( zoom * this.height, 1 );

        var startX = ( this.offsetX % this.width  ) * zoom,
            startY = ( this.offsetY % this.height ) * zoom;

        for ( var x = startX; x <= w; x += xInc ) {
            dom.append(
                    $('<div>').
                            addClass('skybrush_grid_line').
                            addClass('skybrush_grid_line_vertical').
                            translate( x, 0 ).
                            height( h )
            );
        }
        for ( var y = startY; y <= h; y += yInc ) {
            dom.append(
                    $('<div>').
                            addClass('skybrush_grid_line').
                            addClass('skybrush_grid_line_horizontal').
                            translate( 0, y ).
                            width( w )
            );
        }

        this.isDirty = false;
    };


    /**
     * Sets the size of the grid squares, in pixels.
     */
    GridManager.prototype.setSize = function( w, h ) {
        w = Math.max( w|0, 0 );
        h = Math.max( h|0, 0 );

        if ( w !== this.width || h !== this.height ) {
            this.width  = w;
            this.height = h;

            this.update();
        }
    };

    GridManager.prototype.getWidth = function() {
        return this.width;
    };

    GridManager.prototype.getHeight = function() {
        return this.height;
    };

    GridManager.prototype.getOffsetX = function() {
        return this.offsetX;
    };

    GridManager.prototype.getOffsetY = function() {
        return this.offsetY;
    };

    /**
     * Allows you to offset the location of the grid,
     * from the top left corner,
     * by the amounts given.
     */
    GridManager.prototype.setOffset = function( x, y ) {
        if ( isNaN(x) ) {
            x = 0;
        } else {
            x = x|0;
        }

        if ( isNaN(y) ) {
            y = 0;
        } else {
            y = y|0;
        }

        if ( x < 0 ) {
            x = - ( x%this.width );
            x = this.width-x;
        }
        if ( y < 0 ) {
            y = - ( y%this.height );
            y = this.height-y;
        }

        var update = ( this.offsetX !== x || this.offsetY !== y );

        if ( update ) {
            this.offsetX = x,
            this.offsetY = y;

            this.update();
        }

        return this;
    };

    GridManager.prototype.isShown = function() {
        return this.dom.hasClass( 'sb_show' );
    };

    GridManager.prototype.show = function() {
        if ( this.isDirty ) {
            this.forceUpdate();
        }

        this.dom.ensureClass('sb_show');

        return this;
    };

    GridManager.prototype.hide = function() {
        this.dom.removeClass( 'sb_show' );

        return this;
    };

    /**
     * A generic resizable components,
     * for the copy+paste and marquee overlays.
     */
    var ViewOverlay = function( viewport, css ) {
        if ( viewport && css ) {
            var self = this,
                dom;

            self.dom = dom = $('<div>').addClass( css );
            viewport.append( dom );

            self.x = 0;
            self.y = 0;
            self.w = 0;
            self.h = 0;
            self.zoom = 1;

            self.canvasX = 0;
            self.canvasY = 0;

            self.lastLeft = 0;
            self.lastTop  = 0;
        }
    };

    ViewOverlay.prototype.update = function() {
        // do nothing
        return this;
    };

    /**
     * Takes canvas pixels, and resizes to DOM pixels.
     */
    ViewOverlay.prototype.setCanvasSize = function( x, y, w, h ) {
        var zoom = this.zoom;

        var left = (this.canvasX + x*zoom + 0.5)|0,
            top  = (this.canvasY + y*zoom + 0.5)|0,
            /* -2 is to accommodate the 2-pixel border width in the CSS */
            width = Math.max( 0, ((w*zoom)|0)-2 ),
            height= Math.max( 0, ((h*zoom)|0)-2 );

        /*
         * Only update teh changes we have to.
         */
        if ( left !== this.lastLeft || top !== this.lastTop ) {
            this.lastLeft = left;
            this.lastTop  = top;

            this.dom.translate( left, top );
        }

        if ( width !== this.lastWidth ) {
            this.lastWidth = width;
            this.dom.width( width );
        }
        if ( height !== this.lastHeight ) {
            this.lastHeight = height;
            this.dom.height( height );
        }
    };

    /**
     * Tells this about any view changes in the SkyBrush viewport.
     */
    ViewOverlay.prototype.updateViewport = function( canvasX, canvasY, width, height, zoom ) {
        this.zoom = zoom;
        this.canvasX = canvasX,
        this.canvasY = canvasY;

        return this.update();
    };

    /**
     * This handles the clipping/select region on the Canvas.
     *
     * @constructor
     * @private
     */
    var Marquee = function( canvas, viewport, painter ) {
        this.canvas = canvas;

        ViewOverlay.call( this, viewport, 'skybrush_marquee' );

        var topLeft     = $('<div>').addClass('skybrush_marquee_handle sb_top_left sb_no_target'),
            bottomRight = $('<div>').addClass('skybrush_marquee_handle sb_bottom_right sb_no_target');

        this.handles = topLeft.add( bottomRight );

        this.dom.append( topLeft, bottomRight );

        this.isShowingHandles = false;

        var self = this;

        var updateTopLeft = function(ev, x, y) {
            var endX = self.x + self.w,
                endY = self.y + self.h;

            if ( x > endX ) {
                x = endX;
            }

            if ( y > endY ) {
                y = endY;
            }

            var w = (self.x + self.w) - x,
                h = (self.y + self.h) - y;

            self.selectArea( x, y, w, h );
        };

        topLeft.leftdown( function(ev) {
            ev.preventDefault();

            var x = self.x,
                y = self.h;

            self.startHighlight( false );

            painter.startDrag(
                    updateTopLeft,

                    function(ev, x, y) {
                        updateTopLeft(ev, x, y);
                        self.stopHighlight();
                    }
            );
        } );

        var updateWidthHeight = function(ev, x, y) {
            var newW = Math.max( 0, x - self.x ),
                newH = Math.max( 0, y - self.y );

            self.selectArea(
                    self.x, self.y,
                    newW, newH
            );
        };

        bottomRight.leftdown( function(ev) {
            ev.preventDefault();

            var width  = self.w,
                height = self.h;

            self.startHighlight( false );

            painter.startDrag(
                    updateWidthHeight,

                    function(ev, x, y) {
                        updateWidthHeight(ev, x, y)
                        self.stopHighlight();
                    }
            );
        } );
    };

    Marquee.prototype = new ViewOverlay();

    /**
     * Begins displaying the resize handles.
     */
    Marquee.prototype.showHandles = function() {
        this.handles.addClass( 'sb_show' );

        return this;
    }

    /**
     * Hides the resize handles.
     */
    Marquee.prototype.hideHandles = function() {
        this.handles.removeClass( 'sb_show' );

        return this;
    }

    /**
     * Puts this into highlighting mode.
     *
     * This is a visual change, to give the user a visual
     * indication that the marquee is currently being altered.
     *
     * @param clear True to clear this when it highlights, false to not. Defaults to true.
     */
    Marquee.prototype.startHighlight = function( clear ) {
        this.dom.ensureClass( 'sb_highlight' );

        if ( clear === undefined || clear ) {
            this.clear();
        } else {
            this.dom.removeClass( 'sb_reposition' );
        }

        return this;
    };

    /**
     * Ends highlighting mode,
     * so the visual highlighting that this marquee
     * shows will now end.
     */
    Marquee.prototype.stopHighlight = function() {
        var self = this;

        var x = self.x,
            y = self.y,
            w = self.w,
            h = self.h;

        self.dom.removeClass( 'sb_highlight' );

        if (
                x < 0 ||
                y < 0 ||
                w+x > self.canvas.width  ||
                h+y > self.canvas.height
        ) {
            var x2 = Math.max( x, 0 ),
                y2 = Math.max( y, 0 );
            var w2 = Math.min( w+x, self.canvas.width  ) - x2,
                h2 = Math.min( h+y, self.canvas.height ) - y2;

            self.selectArea( x2, y2, w2, h2 );
        }

        if ( self.hasClipArea() ) {
            self.canvas.setClip( self.x, self.y, self.w, self.h );
        } else {
            self.dom.removeClass('sb_show');
        }

        return self;
    };

    Marquee.prototype.hasClipArea = function() {
        var self = this;

        return ! (
                self.w <= 0 ||
                self.h <= 0 ||
                self.x+self.w < 0 ||
                self.y+self.h < 0 ||
                self.x >= self.canvas.getWidth() ||
                self.y >= self.canvas.getHeight()
        );
    };

    /**
     * Selections the region given.
     *
     * If the region is outside of the canvas then it is counted
     * as a non-selection.
     */
    Marquee.prototype.select = function( x, y, x2, y2 ) {
        return this.selectArea(
                Math.min( x, x2 ),
                Math.min( y, y2 ),

                Math.abs( x2-x ),
                Math.abs( y2-y )
        );
    };

    Marquee.prototype.xy = function( x, y ) {
        return this.selectArea( x, y, this.w, this.h );
    };

    Marquee.prototype.selectArea = function( x, y, w, h ) {
        var self = this;

        // floor all locations
        self.x = x|0,
        self.y = y|0,
        self.w = w|0,
        self.h = h|0;

        return self.update();
    };

    /**
     * Cleares the current selection on the Marquee.
     *
     * This is the same as selection a 0x0 region.
     */
    Marquee.prototype.clear = function() {
        var self = this;

        if ( self.dom.hasClass('sb_show') ) {
            self.select( 0, 0, 0, 0 );
            self.canvas.removeClip();
            self.dom.removeClass( 'sb_reposition' );

            return self.update();
        }

        return this;
    };

    Marquee.prototype.hasNoSelection = function() {
        return ( this.w === 0 ) && ( this.h === 0 ) ;
    }

    /**
     * Returns an object showing the current selection,
     * in canvas pixels, or null if there is no selection.
     *
     * @return null if there is no selection, or an object describing it.
     */
    Marquee.prototype.getSelection = function() {
        var self = this;

        if ( self.dom.hasClass('sb_show') ) {
            return {
                    x: self.x,
                    y: self.y,
                    w: self.w,
                    h: self.h
            };
        } else {
            return nil;
        }
    };

    /**
     * Cases this to hide/show it's self,
     * based on the current selection,
     * and if it is shown it will resize accordingly.
     */
    Marquee.prototype.update = function() {
        var self = this;

        var x = self.x,
            y = self.y,
            w = self.w,
            h = self.h,
            canvas = self.canvas,
            dom    = self.dom;

        if ( dom.hasClass('sb_highlight' ) ) {
            dom.ensureClass('sb_show');

            if ( self.hasClipArea() ) {
                dom.removeClass('sb_outside');
            } else {
                dom.ensureClass('sb_outside');
            }

            if ( self.hasNoSelection() ) {
                dom.ensureClass('sb_temporary_hide');
            } else {
                dom.removeClass('sb_temporary_hide');
            }
        } else if ( self.hasClipArea() ) {
            dom.removeClass('sb_outside');
            dom.ensureClass('sb_reposition');
        } else {
            dom.removeClass('sb_outside');
            dom.removeClass('sb_reposition');
            dom.removeClass('sb_show');
        }

        /*
        * Always update the dom location,
        * because it might be fading out when
        * this is called.
        */
        if ( self.hasClipArea() || dom.hasClass('sb_highlight') ) {
            self.setCanvasSize( x, y, w, h );
        }

        return self;
    };

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
    var CopyManager = function( viewport ) {
        ViewOverlay.call( this, viewport, 'skybrush_copy' );

        this.copy = nil;

        this.copyX = 0;
        this.copyY = 0;

        /*
        * When these two are not undefined,
        * then we no longer in 'paste' mode.
        */
        this.pasteX = undefined;
        this.pasteY = undefined;
    };
    CopyManager.prototype = new ViewOverlay();

    CopyManager.prototype.update = function() {
        if ( this.hasPaste() ) {
            this.setCanvasSize(
                    this.pasteX, this.pasteY,
                    this.copy.width, this.copy.height
            );
        }
    };

    CopyManager.prototype.draw = function( dest ) {
        dest.ctx.drawImage( this.copy, this.pasteX, this.pasteY );
        return this;
    };

    CopyManager.prototype.hasPaste = function() {
        return this.pasteX !== undefined && this.pasteY !== undefined;
    };

    CopyManager.prototype.pasteCopy = function( dest ) {
        this.pasteX = this.pasteY = 0;
        this.dom.ensureClass( 'sb_show' );

        return this.movePaste( dest, this.copyX, this.copyY, true );
    };

    CopyManager.prototype.movePaste = function( dest, x, y, finalize ) {
        x = (this.pasteX + (x || 0)) | 0,
        y = (this.pasteY + (y || 0)) | 0;

        dest.ctx.clearRect( 0, 0, dest.width, dest.height );
        dest.ctx.drawImage( this.copy, x, y );
        this.setCanvasSize( x, y, this.copy.width, this.copy.height );

        if ( finalize ) {
            this.pasteX = x;
            this.pasteY = y;
        }

        return this;
    };

    CopyManager.prototype.setCopy = function( canvas, x, y, w, h ) {
        if ( x === undefined ) {
            x = 0,
            y = 0,
            w = canvas.width,
            h = canvas.height;
        } else {
            w = Math.min( w, canvas.width  ),
            h = Math.min( h, canvas.height );
        }

        if ( this.copy == nil ) {
            this.copy = newCanvas( w, h );
        } else {
            this.copy.width  = w,
            this.copy.height = h;
        }

        this.copy.ctx.drawImage( canvas, -x, -y );
        this.copyX = x,
        this.copyY = y;

        return this;
    };

    CopyManager.prototype.hasCopy = function() {
        return this.copy !== nil;
    };

    CopyManager.prototype.getCopy = function() {
        return this.copy;
    };

    CopyManager.prototype.overlapsPaste = function( area ) {
        if ( this.hasPaste() ) {
            var x = this.pasteX,
                y = this.pasteY,
                w = this.copy.width,
                h = this.copy.height;

            return ! (
                    x > area.x+area.w ||
                    y > area.y+area.h ||
                    x+w < area.x ||
                    y+h < area.y
            );
        }

        return false;
    };

    /**
     * Cleares this from being in pasting mode.
     */
    CopyManager.prototype.clearPaste = function() {
        this.dom.removeClass( 'sb_show' );
        this.pasteX = this.pasteY = undefined;

        return this;
    };

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
    var CanvasManager = function( viewport, painter ) {
        var _this = this;

        /*
         * Canvas HTML Elements
         *
         * Create and add, the actual bits that make up the canvas.
         * The canvas it's self, the overlay, and the upscale.
         */

        var canvas  = newCanvas(),
            overlay = newCanvas(),
            upscale = newCanvas();

        var $canvas  = $(canvas ).addClass( 'skybrush_canvas_draw'    ),
            $overlay = $(overlay).addClass( 'skybrush_canvas_overlay' ),
            $upscale = $(upscale).addClass( 'skybrush_canvas_upscale' );

        viewport.empty().append( $canvas, $overlay, $upscale );

        _this.viewport = viewport;

        _this.$canvas  = $canvas;
        _this.$overlay = $overlay;
        _this.$upscale = $upscale;

        _this.canvas   = canvas;
        _this.overlay  = overlay;
        _this.upscale  = upscale;

        _this.events = new events.Handler( _this );
        _this.showUpscaleEvent = new events.Runner( UPSCALE_SCROLL_DELAY );
        _this.clipping = nil;

        _this.isUpscaleShown = false;

        /*
         * Events
         *
         * For when animation has ended,
         * and disable selections for IE.
         */
        if ( $.browser.msie ) {
            viewport.bind( 'selectstart', function() { return false; } );
             $canvas.bind( 'selectstart', function() { return false; } );
            $overlay.bind( 'selectstart', function() { return false; } );
        }

        _this.lazyUpscaleTimeout = nil;

        _this.width  = _this.canvas.width,
        _this.height = _this.canvas.height,
        _this.zoom   = 1 ;

        _this.undos = new UndoStack( UNDO_STACK_SIZE, _this.canvas );
        _this.upscaleWorkers = [];
        _this.upscaleWorkersLength = 0;

        /* Must be added at the end! */
        viewport.
                scroll( function() {
                    _this.refreshUpscale();
                });

        /* Prevent Scrolling if we're scrolling using the viewport. */
        var scrollTop = nil;
        $(window).scroll( function(ev) {
            if ( scrollTop !== nil) {
                $(window).scrollTop( scrollTop );
                scrollTop = nil;
            }
        } );
        viewport.scroll( function(ev) {
            scrollTop = $(window).scrollTop();
        } );

        /*
         * Ensure the canvas is always centred,
         * including when the window size has changed.
         */
        painter.onResize( function() {
            setTimeout( function() {
                _this.updateCanvasSize();
            }, 0 );
        } );

        _this.grid    = new GridManager( viewport );
        _this.marquee = new Marquee( _this, viewport, painter );
        _this.copyObj = new CopyManager( viewport );

        painter.onSetCommand( function( command ) {
            if ( command.name.toLowerCase() !== 'move' ) {
                _this.endPaste();
            }
        } );
        painter.onSetAlpha( function( alpha ) {
            if ( _this.copyObj.hasPaste() ) {
                _this.copyObj.movePaste( _this.overlay, 0, 0 );
            }
        } );
    };

    /**
     * @return The current contents of the canvas as an image url.
     */
    CanvasManager.prototype.toDataURL = function( type ) {
        if ( ! type ) {
            type = "image/png";
        }

        return this.canvas.toDataURL( type );
    };

    /**
     * @return The marquee manager.
     */
    CanvasManager.prototype.getMarquee = function() {
        return this.marquee;
    };

    /**
     * @return The GridManager used on this canvas.
     */
    CanvasManager.prototype.getGrid = function() {
        return this.grid;
    };

    CanvasManager.prototype.hideOverlay = function() {
        this.$overlay.hide();
    };

    /**
     * Takes an event, and works out where it's clicking in relation
     * to the canvas. The result is then returned as a JS object,
     * with 'left' and 'top' referring to the locations.
     *
     * @param ev A mouse event to translate.
     * @return An object containing 'left' and 'top', referring to where the mouse event occurred.
     */
    CanvasManager.prototype.translateLocation = function(ev) {
        var pos  = ev.offset( this.$canvas ),
            zoom = this.zoom ;

        pos.left /= zoom;
        pos.top  /= zoom;

        return pos;
    };

    /**
     * @return The offset of the underlying canvas object.
     */
    CanvasManager.prototype.offset = function() {
        return this.$canvas.offset();
    };

    CanvasManager.prototype.onEndDraw = function( fun ) {
        this.events.add( 'onDraw', fun );
    };

    /**
     * Called when drawing to the overlay has ended,
     * so this canvas knows that the drawing command is over.
     *
     * This allows this to update it's undo stack,
     * and perform other post-draw tasks.
     */
    CanvasManager.prototype.endDraw = function( updateArea ) {
        if ( updateArea ) {
            var _this = this,
                refresh = false,
                ux, uy, uw, uh;

            if ( updateArea !== true ) {
                ux = updateArea.x,
                uy = updateArea.y;

                /*
                 * Supports using both 'w' and 'h' in the update area,
                 * or 'endX' and 'endY'.
                 */
                if ( updateArea.w !== undefined ) {
                    uw = updateArea.w;
                } else {
                    uw = updateArea.endX - updateArea.x;
                }
                if ( updateArea.h !== undefined ) {
                    uh = updateArea.h;
                } else {
                    uh = updateArea.endY - updateArea.y;
                }

                // if we are updating outside the canvas, leave early
                if (
                        ux+uw < 0 || uy+uh < 0 ||
                        ux > _this.width || uy > _this.height
                ) {
                    return false;
                } else {
                    /*
                    * No point refreshing outside of the clipping area,
                    * or if drawing too place outside the clipping area.
                    *
                    * So we quit early if either has happened.
                    *
                    * If drawing has taken place in the clipping,
                    * then we also work out the smallest update area.
                    */
                    var clip = _this.clipping;
                    if ( clip !== nil ) {
                        if (
                                ux > clip.x + clip.w ||
                                uy > clip.y + clip.h ||
                                ux+uw < clip.x ||
                                uy+uh < clip.y
                        ) {
                            return false;
                        } else {
                            ux = Math.max( ux, clip.x );
                            uy = Math.max( uy, clip.y );
                            uw = Math.min( uw, clip.w );
                            uh = Math.min( uh, clip.h );
                        }
                    }

                    refresh = true;
                }
            }

            _this.drawSafeAlpha( function() {
                    _this.canvas.ctx.drawImage( _this.overlay, 0, 0 );
            } );

            _this.overlay.ctx.clearRect( 0, 0, _this.overlay.width, _this.overlay.height );

            if ( refresh ) {
                _this.redrawUpscale( ux, uy, uw, uh );
            }

            // reshow the overlay, in case a command hid it
            _this.$overlay.show();

            _this.undos.add( _this.canvas );

            // finally, run the events!
            _this.events.run( 'onDraw' );
        }
    };

    CanvasManager.prototype.getWidth = function() {
        return this.width;
    };

    CanvasManager.prototype.getHeight = function() {
        return this.height;
    };

    /**
     * @return The Zoom value.
     */
    CanvasManager.prototype.getZoom = function() {
        return this.zoom;
    };

    /**
     * Changes the zoom to match.
     */
    CanvasManager.prototype.setZoom = function( zoom, x, y ) {
        this.zoom = zoom;

        this.updateCanvasSize( x, y );
    };

    /**
     * Resizes and moves around the canvas, overlay, viewport, and the upscale.
     * It essentially resets the layout, based on the current size and zoom settings.
     *
     * The idea is that you can alter the setup, and then just call this to
     * refresh the layout, so your changes get implemented.
     *
     * This strategy is used because the layout is based on both size and zoom;
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
    CanvasManager.prototype.updateCanvasSize = function( zoomX, zoomY ) {
        var zoom     = this.zoom,
            $canvas  = this.$canvas,
            $overlay = this.$overlay,
            viewport = this.viewport,
            upscale  = this.upscale;

        var newWidth   = Math.round( this.width  * zoom ),
            newHeight  = Math.round( this.height * zoom );

        var parent = $canvas.parent();

        var moveX = (parent.width()  - newWidth )/2,
            moveY = (parent.height() - newHeight)/2;

        var canvasX = ( moveX >= 0 ?  moveX : 0 ),
            canvasY = ( moveY >= 0 ?  moveY : 0 );

        var left = (canvasX+0.5)|0,
            top  = (canvasY+0.5)|0;

        /* Work out, and animate, the scroll change */

        var hasScrollLeft = viewport.scrollLeftAvailable(),
            hasScrollTop  = viewport.scrollTopAvailable();

        var zoomOffsetX = 0,
            zoomOffsetY = 0;

        if (
                zoomX !== undefined &&
                zoomX !== false &&
                hasScrollLeft
        ) {
            /*
             * A value from 0.0 to 1.0, representing the zoom location.
             */
            var zoomXP;

            /*
             * zoom based on a canvas pixel location,
             * or just use the center of the canvas.
             */
            var zoomXP = ( zoomX !== true ) ?
                    zoomX / this.width :
                    0.5 ;

            // and then convert from: [0.0, 1.0] to [-1.0, 1.0]
            zoomXP = zoomXP*2 - 1;

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
            zoomOffsetX = (newWidth/4) * zoomXP;
        }

        // and now for the zoom Y
        if (
                zoomY !== undefined &&
                zoomY !== false &&
                hasScrollTop
        ) {
            var zoomYP = ( zoomY !== true ) ?
                    zoomY / this.height :
                    0.5 ;

            zoomYP = zoomYP*2 - 1;

            zoomOffsetY = (newHeight/4) * zoomYP;
        }

        // If no scroll bar right now, try to scroll to the middle (doesn't matter if it fails).
        var scrollTopP  = ( hasScrollTop  === 0 ) ? 0.5 : viewport.scrollTopPercent(),
            scrollLeftP = ( hasScrollLeft === 0 ) ? 0.5 : viewport.scrollLeftPercent();

        var heightChange = newHeight / $canvas.height(),
            widthChange  = newHeight / $canvas.height();

        var scrollTop  = scrollTopP  * (newHeight - viewport.height()) + zoomOffsetY,
            scrollLeft = scrollLeftP * (newWidth  - viewport.width() ) + zoomOffsetX;

        /*
         * Now apply the changes.
         *
         * We do it here, so it doesn't affect the calculations above.
         */

        $canvas.
                width( newWidth ).
                height( newHeight ).
                translate( left, top );
        $overlay.
                width( newWidth ).
                height( newHeight ).
                translate( left, top );

        this.refreshUpscale();

        viewport.clearQueue().animate(
                {
                        scrollTop  : scrollTop,
                        scrollLeft : scrollLeft
                },
                CANVAS_UPDATE_SPEED
        );

        var viewWidth  = Math.min( newWidth , viewport.width()  ),
            viewHeight = Math.min( newHeight, viewport.height() );
        this.grid.   updateViewport( canvasX, canvasY, newWidth, newHeight, zoom );
        this.marquee.updateViewport( canvasX, canvasY, newWidth, newHeight, zoom );
        this.copyObj.updateViewport( canvasX, canvasY, newWidth, newHeight, zoom );
    };

    /**
     * Hides the upscale, and stops any events planning to show it.
     */
    CanvasManager.prototype.hideUpscale = function() {
    };

    /**
     * Cleares all of the future upscale refresh jobs to perform.
     */
    CanvasManager.prototype.clearUpscaleWorkers = function() {
        for ( var i = 0; i < this.upscaleWorkersLength; i++ ) {
            clearTimeout( this.upscaleWorkers[i] );
            this.upscaleWorkers[i] = nil;
        }

        this.upscaleWorkersLength = 0;
    };

    /**
     * Adds redrawUpscale jobs to be performed in the future.
     */
    CanvasManager.prototype.futureRedrawUpscale = function( x, y, w, h, includeOverlay ) {
        var _this = this;
        _this.upscaleWorkers[ _this.upscaleWorkersLength++ ] =
                setTimeout( function() {
                    _this.redrawUpscale( x, y, w, h, includeOverlay );
                }, 10 );
    };

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
    CanvasManager.prototype.refreshUpscale = function() {
        var self = this;

        /*
         * Hide the current upscale.
         */
        if ( this.isUpscaleShown ) {
            this.$upscale.hide();
            this.clearUpscaleWorkers();

            this.isUpscaleShown = false;
        }

        /*
         * The algorithm is to just match the viewarea,
         * or the canvas, which ever is smaller.
         */
        self.showUpscaleEvent.run( function() {
            self.isUpscaleShown = true;

            var zoom = self.zoom;

            var viewport = self.viewport,
                $canvas  = self.$canvas,
                upscale  = self.upscale,
                $upscale = self.$upscale;

            $upscale.removeClass( 'sb_offscreenX' );
            $upscale.removeClass( 'sb_offscreenY' );

            /*
             * First the size.
             */

            // show the upscale when using positive zoom
            var scrollSize = viewport.scrollBarSize();

            var viewWidth    = viewport.width()   - scrollSize.right,
                viewHeight   = viewport.height() - scrollSize.bottom;
            var canvasWidth  = $canvas.width(),
                canvasHeight = $canvas.height();

            var upWidth;
            if ( canvasWidth < viewWidth ) {
                upWidth = canvasWidth;
            } else {
                upWidth = viewWidth;
            }

            var upHeight;
            if ( canvasHeight < viewHeight ) {
                upHeight = canvasHeight;
            } else {
                upHeight = viewHeight;
            }

            upscale.width  = upWidth;
            upscale.height = upHeight;

            /*
             * Now the position.
             */

            var top,
                left;

            var scrollTop  = viewport.scrollTop(),
                scrollLeft = viewport.scrollLeft();

            var canvasPos = $canvas.translate();
            if ( canvasWidth < viewWidth ) {
                left = canvasPos.x;
            } else {
                left = scrollLeft;
                $upscale.addClass( 'sb_offscreenX' );
            }

            if ( canvasHeight < viewHeight ) {
                top = canvasPos.y;
            } else {
                top = scrollTop;
                $upscale.addClass( 'sb_offscreenY' );
            }

            // Fade in the upscale change.
            // The double opacity setting is needed to trigger the CSS animation.
            var position =
                    (- ( scrollLeft % UPSCALE_BACK_OFFSET_MOD )) + 'px ' +
                    (- ( scrollTop  % UPSCALE_BACK_OFFSET_MOD )) + 'px' ;

            $upscale.
                    show().
                    css({
                            opacity: 0,
                            'background-position': position
                    }).
                    translate(
                            (left+0.5)|0,
                            (top+0.5)|0
                    );

            setTimeout( function() {
                // upscale _after_ making it visible
                self.redrawUpscale();

                $upscale.css('opacity', 1);
            }, 0 );
        } );
    };

    CanvasManager.prototype.isPasting = function() {
        return this.copyObj.hasPaste();
    };

    CanvasManager.prototype.isInPaste = function( x, y ) {
        return this.copyObj.overlapsPaste({
                x: x|0,
                y: y|0,
                w: 1,
                h: 1
        });
    };

    CanvasManager.prototype.movePaste = function( x, y, finalize ) {
        if ( this.copyObj.hasPaste() ) {
            this.copyObj.movePaste( this.overlay, x, y, finalize );
        }

        return this;
    };

    /**
     * Ends pasting mode.
     */
    CanvasManager.prototype.endPaste = function() {
        if ( this.copyObj.hasPaste() ) {
            var clip = this.getFullClip();

            if ( this.copyObj.overlapsPaste(clip) ) {
                this.drawSafe( function() {
                    this.copyObj.draw( this.canvas );
                    this.overlay.ctx.clearRect( 0, 0, this.width, this.height );
                    this.endDraw( clip );
                } );
            }

            this.clearPaste();
        }

        return this;
    };

    CanvasManager.prototype.paste = function() {
        this.endPaste();
        this.copyObj.pasteCopy( this.overlay );
        this.events.run( 'onPaste' );

        return this;
    };

    CanvasManager.prototype.clearPaste = function() {
        if ( this.copyObj.hasPaste() ) {
            this.overlay.ctx.clearRect( 0, 0, this.width, this.height );
            this.copyObj.clearPaste();
        }

        return this;
    };

    CanvasManager.prototype.onPaste = function( fun ) {
        this.events.add( 'onPaste', fun );

        return this;
    };

    CanvasManager.prototype.cut = function() {
        var clip = this.getFullClip();
        this.copyObj.setCopy( this.canvas, clip.x, clip.y, clip.w, clip.h );
        this.drawSafe( function() {
                this.canvas.ctx.clearRect( clip.x, clip.y, clip.w, clip.h );
        } );
        this.endDraw( clip );

        this.events.run( 'onCopy' );
        this.marquee.clear();

        return this;
    };

    CanvasManager.prototype.copy = function() {
        var clip = this.getFullClip();

        this.copyObj.setCopy( this.canvas, clip.x, clip.y, clip.w, clip.h );
        this.events.run( 'onCopy' );
        this.marquee.clear();

        return this;
    };

    CanvasManager.prototype.onCopy = function( fun ) {
        this.events.add( 'onCopy', fun );
        return this;
    };

    CanvasManager.prototype.removeClip = function() {
        var _this = this,
            ctx = _this.canvas.ctx,
            overCtx = _this.overlay.ctx;

        if ( _this.clipping !== nil ) {
            var ctxSetup = backupCtx( ctx );
            ctx.restore();
            restoreCtx( ctx, ctxSetup );

            ctxSetup = backupCtx( overCtx );
            overCtx.restore();
            restoreCtx( overCtx, ctxSetup );

            _this.clipping = nil;
        }

        _this.events.run( 'onClip', _this.clipping );

        return _this;
    };

    CanvasManager.prototype.onClip = function( f ) {
        this.events.add( 'onClip', f );
        return this;
    };

    CanvasManager.prototype.getClip = function() {
        return this.clipping;
    };

    CanvasManager.prototype.getFullClip = function() {
        if ( this.clipping ) {
            return this.clipping;
        } else {
            return {
                    x: 0,
                    y: 0,
                    w: this.width,
                    h: this.height
            };
        }
    };

    CanvasManager.prototype.setClip = function(x, y, w, h) {
        var _this = this;
        var cCtx = _this.canvas.ctx,
            oCtx = _this.overlay.ctx;

        this.removeClip();

        _this.clipping = {
                x: x,
                y: y,
                w: w,
                h: h
        };

        cCtx.save();
        cCtx.beginPath();
        cCtx.rect( x, y, w, h );
        cCtx.clip();

        oCtx.save();
        oCtx.beginPath();
        oCtx.rect( x, y, w, h );
        oCtx.clip();

        _this.events.run( 'onClip', _this.clipping );

        return _this;
    };

    /**
     * Redraws the contents of the upscaled canvas.
     *
     * Usagae:
     *     // redraw all of the viewport
     *     canvasManager.redrawUpscale();
     *
     *     // redraws a dirty rectangle, the area specified, in teh upscale
     *     canvasManager.redrawUpscale( x, y, w, h );
     *
     * Note: the location is the area on the target drawing canvas,
     * where items are drawn to. Not the area on the upscale canvas.
     *
     * @param x
     * @param y
     * @param w
     * @param h
     * @param Optional, extra pixels to add on to the x, y, w and h.
     */
    CanvasManager.prototype.redrawUpscale = function( x, y, w, h, includeOverlay, buffer ) {
        if ( Math.abs(w) < 1 ) {
            if ( w < 1 ) {
                w = w;
            } else {
                w = -1;
            }
        }

        if ( Math.abs(h) < 1 ) {
            if ( h < 1 ) {
                h = 1;
            } else {
                h = -1;
            }
        }

        /*
         * This is to allow easier usage.
         * So you can update in the negative direction.
         */
        if ( w < 0 ) {
            w = -w;
            x -= w;
        }

        if ( h < 0 ) {
            h = -h;
            y -= h;
        }

        if ( buffer !== undefined ) {
            x -= buffer;
            y -= buffer;
            h += buffer*2;
            w += buffer*2;
        }

        /*
         * After handling the buffer, and other possible values,
         * if the width/height are empty, then quit early.
         */
        if ( w === 0 || h === 0 ) {
            return false;
        }

        var $canvas  = this.$canvas,
            canvas   = this.canvas,
            $upscale = this.$upscale,
            upscale  = this.upscale,
            viewport = this.viewport;

        var zoom = this.zoom;

        // 1) handle the no-args version (update whole screen)
        if ( x === undefined ) {
            /*
             * The maths for this bit proved to be really difficult to work out.
             * It would be out by just a couple of sub-pixels (no idea why).
             *
             * So we just fake a draw event (drawing to top left corner),
             * and it's drawing to the whole canvas (full with/height).
             */
            var pos = this.viewport.offset();
            var fakeEv = $.Event( 'mousemove', {
                    pageX : pos.left,
                    pageY : pos.top
            });

            var location = this.translateLocation( fakeEv );

            x = location.left;
            y = location.top;
            w = this.width;
            h = this.height;
        }

        // take off 1 to account for the canvas border
        var scrollTop  = this.viewport.scrollTop(),
            scrollLeft = this.viewport.scrollLeft();

        // 2) work out how much of the drawing canvas is actually visible
        x = Math.max( x,
                scrollLeft / zoom
        );
        y = Math.max( y,
                scrollTop / zoom
        );
        w = Math.min( w,
                Math.min(canvas.width , this.viewport.width()/zoom )
        );
        h = Math.min( h,
                Math.min(canvas.height, this.viewport.height()/zoom )
        );

        /* Check for updating outside of the canvas,
         * and if so, we leave early (no refresh needed).
         */
        if ( x+w < 0 || y+h < 0 || x > this.canvas.width || y > this.canvas.height ) {
            return false;
        }

        /* Need to be rounded for the canvas data we access later. */
        x = Math.round(x);
        y = Math.round(y);

        w = Math.round(w);
        h = Math.round(h);

        /*
         * Widen the draw area by a pixel to encompas the outer edge,
         * this is to prevent slight 1px gaps along the edges of the upscale canvas.
         */

        if ( x > 0 ) {
            x--;
        }

        if ( y > 0 ) {
            y--;
        }

        var wDiff = Math.min( 1, canvas.width  - w ),
            hDiff = Math.min( 1, canvas.height - h );

        w += wDiff;
        h += hDiff;

        // 3) work out the same locations, on the upscale canvas
        var ux, uy, uw, uh ;

        ux = x*zoom - scrollLeft;
        uy = y*zoom - scrollTop;
        uw = w*zoom;
        uh = h*zoom;

        // clear our refresh area
        var ctx = canvas.ctx,
            destAlpha = ( ctx.globalCompositeOperation == 'source-atop' ),
            uCtx = upscale.ctx;

        /*
         * This can go one of three ways:
         *  = draw using downscaling (zoom is 100%, or lower)
         *  = draw cheap (using canvas scaling) and sub-divide work
         *  = manually upscale pixels
         */

        var divideWork = (w*h) > ((UPSCALE_DIVIDE_AREA+6)*(UPSCALE_DIVIDE_AREA+6));

        if ( divideWork || zoom <= 1 ) {
            var xDiff = Math.max( 0, (x+w) - canvas.width  ),
                yDiff = Math.max( 0, (y+h) - canvas.height );

            var ux2 = Math.round(ux),
                uy2 = Math.round(uy),
                uw2 = Math.round(uw - xDiff*zoom),
                uh2 = Math.round(uh - yDiff*zoom);

            // if we clip the edge,
            // then clamp the max width/height onto the edges
            // (otherwise Chrome crashes)
            if ( x+w > canvas.width ) {
                w -= (x+w) - canvas.width;
                uw2 = upscale.width - ux2;
            }
            if ( y+h > canvas.height ) {
                h -= (y+h) - canvas.height;
                uh2 = upscale.height - uy2;
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
                uCtx.clearRect( ux2, uy2, uw2, uh2 );

                uCtx.globalAlpha = 1.0;
                uCtx.drawImage( canvas, x, y, w, h, ux2, uy2, uw2, uh2 );

                if ( includeOverlay ) {
                    if ( destAlpha ) {
                        uCtx.globalCompositeOperation = 'source-atop';
                    }

                    uCtx.drawImage( this.overlay, x, y, w, h, ux2, uy2, uw2, uh2 );

                    if ( destAlpha ) {
                        uCtx.globalCompositeOperation = 'source-over';
                    }
                }

            /*
             * Sub divide up work if we'll be doing loads of it.
             * Instead the work is done over multiple calls.
             */
            } else if ( divideWork ) {
                // cheap draw, so we don't get huge empty areas
                uCtx.drawImage( canvas, x, y, w, h, ux2, uy2, uw2, uh2 );

                for ( var i = x; i < (w+x); i += UPSCALE_DIVIDE_AREA ) {
                    for ( var j = y; j < (h+y); j += UPSCALE_DIVIDE_AREA ) {
                        var updateW = Math.min( (w+x)-i, UPSCALE_DIVIDE_AREA ),
                            updateH = Math.min( (h+y)-j, UPSCALE_DIVIDE_AREA );

                        this.futureRedrawUpscale( i, j, updateW, updateH, includeOverlay );
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
                    includeOverlay ? this.overlay.ctx.getImageData( x, y, w, h ) : nil,

                    ( ctx.globalCompositeOperation == 'source-atop' ) // bitmask pixels
            );
        }

        return true;
    };

    CanvasManager.prototype.resize = function( newWidth, newHeight ) {
        if ( this.setSize( newWidth, newHeight ) ) {
            this.endDraw( true );
        }
    };

    CanvasManager.prototype.scale = function( newWidth, newHeight, isSmooth ) {
        var _this = this;

        if ( newWidth != _this.width || newHeight != _this.height ) {
            _this.endPaste();

            // use existing smoothing
            if ( isSmooth ) {
                var temp = newCanvas( newWidth, newHeight );

                temp.ctx.drawImage(
                        _this.canvas,
                        0, 0, _this.width, _this.height,
                        0, 0, newWidth, newHeight
                );

                _this.setSize( newWidth, newHeight, true );
                _this.drawSafe( function() {
                    _this.canvas.ctx.drawImage( temp, 0, 0 );
                } );
            // use nearest neighbour
            } else {
                var oldW = _this.width,
                    oldH = _this.height;
                var srcData = _this.canvas.ctx.getImageData( 0, 0, oldW, oldH );

                _this.setSize( newWidth, newHeight, true );

                _this.drawSafe( function() {
                    copyNearestNeighbour(
                            _this.canvas,
                            0, 0, newWidth, newHeight,

                            // pixel size
                            newWidth / oldW, newHeight / oldH,

                            srcData,
                            0, 0, oldW, oldH
                    );
                } );
            }

            _this.endDraw( true );
        }
    };

    CanvasManager.prototype.resetCompositeOpration = function() {
        var compOp = this.canvas.ctx.globalCompositeOperation;
        this.canvas.ctx.globalCompositeOperation = 'source-over';

        return compOp;
    };

    CanvasManager.prototype.resetAlpha = function() {
        var alpha = this.canvas.ctx.globalAlpha;
        this.canvas.ctx.globalAlpha = 1.0;

        return alpha;
    };

    /**
     * @private
     *
     * @param newWidth
     * @param newHeight
     */
    CanvasManager.prototype.setSize = function( newWidth, newHeight, clear ) {
        var newC = newCanvas(),
            _this = this,
            canvas = _this.canvas,
            oldCtx = _this.overlay.ctx ;

        if ( newWidth != _this.width || newHeight != _this.height ) {
            _this.endPaste();

            // create a new canvas, of the required size, and with our content
            newC.width  = newWidth;
            newC.height = newHeight;
            newC.setAttribute( 'class', canvas.getAttribute('class') );

            var ctxSetup = backupCtx( _this.canvas.ctx );
            var overlayCtxSetup = backupCtx( oldCtx );

            // replace the current canvas
            if ( ! clear ) {
                newC.ctx.drawImage( _this.canvas, 0, 0 );
            }
            _this.$canvas.replaceWith( newC );

            _this.canvas = newC;
            _this.$canvas = $(newC);
            _this.width  = newWidth;
            _this.height = newHeight;

            // update the overlay
            _this.overlay.width  = newWidth,
            _this.overlay.height = newHeight;

            restoreCtx( _this.canvas.ctx  , ctxSetup        );
            restoreCtx( _this.overlay.ctx , overlayCtxSetup );

            // re-center
            _this.updateCanvasSize();

            return true;
        } else {
            return false;
        }
    };

    /**
     * This should be used when you want to interact with the graphics it's
     * self, such as erase, or if you want to read them.
     *
     * If you just want to draw on top (pencil, brush, drawing a square/circle),
     * then use 'getContext' instead as this will silently overlay it.
     *
     * @return The underlying 2D context, where the actual graphics are stored.
     */
    CanvasManager.prototype.getDirectContext = function() {
        return this.canvas.ctx;
    };

    /**
     * When used during drawing, this will allow you to draw on top of the
     * canvas. The effect is overlayed, until 'endDraw' is called.
     *
     * By overlaying it allows you to clear and redraw during the draw process
     * (useful for drawing lines, squares, circles and other shapes).
     *
     * @return The 2D context used for drawing.
     */
    CanvasManager.prototype.getContext = function() {
        return this.overlay.ctx;
    };

    /**
     * Picks a colour at the given location, and returns it.
     * Null is returned if picking from outside of the canvas.
     *
     * @return An array containing the RGBA value of the pixel selected, or null for outside of canvas.
     */
    CanvasManager.prototype.colourPick = function(x, y) {
        if ( x >= 0 && x < this.width && y >= 0 && y < this.height ) {
            return this.canvas.ctx.getImageData( x, y, 1, 1 ).data;
        } else {
            return nil;
        }
    };

    CanvasManager.prototype.getColor = function() {
        return this.canvas.ctx.strokeStyle;
    };

    CanvasManager.prototype.getRGB = function() {
        var color = this.getColor();

        var red   = color.substr( 1, 2 ),
            green = color.substr( 3, 2 ),
            blue  = color.substr( 5, 2 );

        return [
                parseInt( red  , 16 ),
                parseInt( green, 16 ),
                parseInt( blue , 16 )
        ];
    };

    /**
     * @param strColor The color to set to this canvas.
     */
    CanvasManager.prototype.setColor = function( strColor ) {
        this.canvas.ctx.strokeStyle =
        this.canvas.ctx.fillStyle =
        this.overlay.ctx.strokeStyle =
        this.overlay.ctx.fillStyle =
                strColor;
    };

    CanvasManager.prototype.useBlendAlpha = function() {
        this.canvas.ctx.globalCompositeOperation = 'source-over' ;

        return this;
    };

        /**
         * True to use the destination alpha when drawing,
         * false to not.
         */
    CanvasManager.prototype.useDestinationAlpha = function() {
        this.canvas.ctx.globalCompositeOperation = 'source-atop' ;

        return this;
    };

    /**
     * @param alpha The alpha value to use when drawing.
     */
    CanvasManager.prototype.setAlpha = function( alpha ) {
        this.canvas.ctx.globalAlpha =
        this.overlay.ctx.globalAlpha =
                alpha;
    };

    CanvasManager.prototype.getAlpha = function() {
        return this.canvas.ctx.globalAlpha;
    };

    /**
     *
     */
    CanvasManager.prototype.setImage = function( image, width, height ) {
        /*
         * If width or height are 0, undefined or nil,
         * then image.width and image.height are used.
         * Otherwise width and height are used.
         */
        var w = (  width >> 0 ) || image.width,
            h = ( height >> 0 ) || image.height ;

        this.setSize( w, h, true );
        this.drawSafe( function() {
            this.canvas.ctx.drawImage( image, 0, 0, w, h );
        } );

        return this;
    };

    CanvasManager.prototype.resetUndoRedo = function() {
        this.undos.reset( this.canvas );

        return this;
    };

    CanvasManager.prototype.reset = function() {
        this.resetUndoRedo().
                clearPaste().
                marquee.clear();

        this.grid.hide();
    };

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
    CanvasManager.prototype.undoRedo = function( name ) {
        var canvas = this.undos[name]();

        if ( canvas !== nil ) {
            this.drawSafe( function() {
                if (
                        canvas.width  != this.canvas.width ||
                        canvas.height != this.canvas.height
                ) {
                    this.setSize( canvas.width, canvas.height, true );
                    this.canvas.ctx.drawImage( canvas, 0, 0 );
                    // refresh upscale happens automatically, in the future, by setSize
                } else {
                    this.canvas.ctx.clearRect( 0, 0, this.canvas.width, this.canvas.height );
                    this.canvas.ctx.drawImage( canvas, 0, 0 );
                    this.redrawUpscale();
                }
            } );

            return true;
        } else {
            return false;
        }
    };

    /**
     * An alternative to 'drawSafe' which only nullifies the alpha component.
     * For example how the alpha is mixed is left un-altered.
     *
     * @param f The function to perform.
     */
    CanvasManager.prototype.drawSafeAlpha = function( f ) {
        var alpha = this.resetAlpha();
        f.call( this );
        this.canvas.ctx.globalAlpha = alpha;

        return this;
    };

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
    CanvasManager.prototype.drawSafe = function( f ) {
        var alpha  = this.resetAlpha(),
            compOp = this.resetCompositeOpration(),
            fillStyle   = this.canvas.ctx.fillStyle,
            strokeStyle = this.canvas.ctx.strokeStyle;

        var clip = this.getClip();
        if ( clip ) {
            this.removeClip();
        }
        f.call( this );
        if ( clip ) {
            this.setClip( clip.x, clip.y, clip.w, clip.h );
        }

        this.canvas.ctx.globalAlpha = alpha;
        this.canvas.ctx.globalCompositeOperation = compOp;
        this.canvas.ctx.fillStyle   = fillStyle;
        this.canvas.ctx.strokeStyle = strokeStyle;

        return this;
    };

    /**
     * @return True if this can undo, and false if there is nothing to undo.
     */
    CanvasManager.prototype.hasUndo = function() {
        return this.undos.hasUndo() || this.copyObj.hasPaste();
    };

    /**
     * @return true if this has redo options to perform.
     */
    CanvasManager.prototype.hasRedo = function() {
        return this.undos.hasRedo();
    };

    /**
     * If this canvas is not empty, then this will attempt to crop it.
     * Cropping is only performed if there is available space to do so.
     *
     * It also disables a number of items, such as the current paste
     * and marquee selection, for usability.
     */
    CanvasManager.prototype.crop = function() {
        var self = this;

        self.endPaste();

        // check for a marquee selection
        // and otherwise use the visible area
        var selection = self.marquee.getSelection();
        if ( selection === nil ) {
            selection = self.getDrawnArea();
        } else {
            // remove the marquee, since it is selecting everything
            self.marquee.clear();
        }

        if ( selection !== nil ) {
            var x = selection.x,
                y = selection.y,
                w2 = selection.w,
                h2 = selection.h ;

            var temp = newCanvas( w2, h2 );
            temp.ctx.drawImage( self.canvas, -x, -y );

            self.setSize( w2, h2, true );

            self.drawSafe( function() {
                    self.canvas.ctx.drawImage( temp, 0, 0 );
            } );

            self.endDraw( true );
        }

        return self;
    };

    /**
     * Returns an object describing the area on the canvas,
     * which has been drawn to.
     *
     * If there has been no drawing, then null is returned.
     */
    CanvasManager.prototype.getDrawnArea = function() {
        var w = this.width,
            h = this.height;

        var data = this.canvas.ctx.getImageData( 0, 0, w, h ).data;

        var minX = 0,
            minY = 0,
            maxX = w,
            maxY = h;

        // search for minX, minY, maxX, maxY, working inwards on all sides
        // search for minY
        for ( var y = 0; y < h; y++ ) {
            var hasAlpha = false;

            for ( var x = 0; x < w; x++ ) {
                var i = (y*w + x) * 4;

                if ( data[i+3] > 0 ) {
                    hasAlpha = true;
                    break;
                }
            }

            if ( hasAlpha ) {
                break;
            } else {
                minY = y+1;
            }
        }

        // search for maxY
        for ( var y = h-1; y >= 0; y-- ) {
            var hasAlpha = false;

            for ( var x = 0; x < w; x++ ) {
                var i = (y*w + x) * 4;

                if ( data[i+3] > 0 ) {
                    hasAlpha = true;
                    break;
                }
            }

            if ( y <= minY ) {
                return nil;
            } else if ( hasAlpha ) {
                break;
            } else {
                maxY = y;
            }
        }

        // search for minX
        for ( var x = 0; x < w; x++ ) {
            var hasAlpha = false;

            for ( var y = 0; y < h; y++ ) {
                var i = (y*w + x) * 4;

                if ( data[i+3] > 0 ) {
                    hasAlpha = true;
                    break;
                }
            }

            if ( hasAlpha ) {
                break;
            } else {
                minX = x+1;
            }
        }

        // search for maxX
        for ( var x = w-1; x >= 0; x-- ) {
            var hasAlpha = false;

            for ( var y = 0; y < h; y++ ) {
                var i = (y*w + x) * 4;

                if ( data[i+3] > 0 ) {
                    hasAlpha = true;
                    break;
                }
            }

            if ( x <= minX ) {
                return nil;
            } else if ( hasAlpha ) {
                break;
            } else {
                maxX = x;
            }
        }

        // Don't crop if the image is empty!

        // if we can crop, we do:
        if ( minX > 0 || minY > 0 || maxX < w || maxY < h ) {
            return {
                    x: minX,
                    y: minY,
                    w: maxX-minX,
                    h: maxY-minY
            };
        } else {
            return nil;
        }
    };

    CanvasManager.prototype.clearAll = function() {
        this.drawSafe( function() {
            clearCtx( this.canvas.ctx );
        } );
    };

        /**
         * Cleares this canvas of all content,
         * and adds the current content to the undo stack.
         */
    CanvasManager.prototype.clear = function() {
        var self = this,
            w = self.width,
            h = self.height;

        self.endPaste();

        self.canvas.ctx.clearRect( 0, 0, w, h );

        // push current context to the undo/redo
        // and update the whole screen
        self.endDraw({
                   x: 0,
                   y: 0,
                endX: w,
                endY: h
        });
    };

    /**
     * @return True if an undo was performed, otherwise false.
     */
    CanvasManager.prototype.redo = function() {
        return this.undoRedo( 'redo' );
    }

    /**
     * @return True if an undo was performed, otherwise false.
     */
    CanvasManager.prototype.undo = function() {
        if ( this.copyObj.hasPaste() ) {
            this.clearPaste();

            return true;
        } else {
            return this.undoRedo( 'undo' );
        }
    };

    /**
     * The Info Bar is a scroll down bar for extra settings.
     * Like resize.
     *
     * @private
     * @param viewport The SkyBrush viewport it is being attached to.
     */
    var InfoBar = function( viewport ) {
        var self = this;

        self.confirm = nil;

        self.content = $('<div>').
                addClass('skybrush_info_content');

        /* Finally, put it all together */
        var wrap = $('<div>').
                addClass( 'skybrush_info_bar_wrap' ).
                append( self.content );

        self.dom = $('<div>').
                addClass('skybrush_info_bar').
                append( wrap );

        viewport.append( self.dom );
    };

    InfoBar.prototype.show = function( button ) {
        if ( ! this.isShown() ) {
            this.dom.addClass( 'sb_show' );
            this.highlightFirstInput();
        }
    };

    InfoBar.prototype.isShown = function() {
        return this.dom.hasClass( 'sb_show' );
    };

    InfoBar.prototype.isTarget = function(target) {
        return this.isShown() && (
                target === this.dom.get(0) ||
                $(target).parents().is(this.dom)
        );
    };

    InfoBar.prototype.hide = function() {
        if ( this.isShown() ) {
            this.dom.removeClass( 'sb_show' );
        }
    };

    InfoBar.prototype.highlightFirstInput = function() {
        /*
         * Grabs the first textual input box, and gives it focus.
         *
         * Changing the value is to undo any highlighting,
         * selection of all of the text,
         * which some browsers may do.
         */
        this.content.
                find( 'input[type="text"], input[type="number"]' ).
                first().
                focus().
                each( function() {
                    var $this = $( this );
                    $this.val( $this.val() );
                } );
    };

    InfoBar.prototype.setContent = function() {
        this.content.empty();
        this.confirm = nil;

        for ( var i = 0; i < arguments.length; i++ ) {
            this.content.append( arguments[i] );
        }

        this.highlightFirstInput();

        return this;
    };

    InfoBar.prototype.getContent = function() {
        return this.content;
    };

    /**
     * Creates and then returns all commands used by SkyBrush.
     * This is created on the fly, so it can be run after
     * SkyBrush has been successfully loaded, and setup.
     *
     * That way the commands can use jQuery in their setup
     * code.
     *
     * @const
     * @param painter The SkyBrush instance these commands are being created for.
     * @param cursorRoot The root location of where cursor images are held.
     * @return An array of all Command objects in use for this SkyBrush app.
     */
    var newCommands = function() {
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
        var controlNameToCSSID = function( name ) {
            return CONTROL_ID_CSS_PREFIX + name.toLowerCase();
        };

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
        var newCommandControl = function( command, control, painter ) {
            var name = control.name,
                type = control.type.toLowerCase(),
                 css = control.css,
            callback = control.callback,
               field = control.field,
            isCursor = control.cursor || false;

            if ( name === undefined ) {
                throw new Error( "Control is missing 'name' field" );
            } else if ( type === undefined ) {
                throw new Error( "Control is missing 'type' field" );
            } else if ( field === undefined ) {
                throw new Error( "Control is missing 'field' field" );
            }

            var defaultField;
            if ( control.hasOwnProperty('value') ) {
                defaultField = control.value;
            } else {
                defaultField = command[ field ];
            }

            var cDom = document.createElement( 'div' );
            cDom.className = 
                    'skybrush_control '         +
                    CONTROL_CSS_PREFIX + type   +
                    ( (css !== undefined) ? 
                            ' sb_' + css :
                            '' ) ;

            var label = document.createElement('div');
            label.className = 'skybrush_command_control_label';
            label.innerHTML = name;
            cDom.appendChild( label );

            var cssID = controlNameToCSSID( name );

            /*
             * Create the Dom Element based on it's type.
             * All supported types are listed here.
             */
            if ( type == 'checkbox' ) {
                if ( defaultField === undefined ) {
                    defaultField = false;
                }

                var checkbox = $('<input>').
                        attr( 'type', 'checkbox' ).
                        addClass( cssID ).
                        change( function() {
                            var isChecked = $(this).is(':checked')

                            command[ field ] = isChecked;
                            if ( callback ) {
                                callback.call( command, isChecked, painter );
                            }

                            if ( isCursor ) {
                                painter.refreshCursor( command );
                            }
                        } );

                if ( command[field] ) {
                    checkbox.attr( 'checked', 'checked' );
                }

                cDom.appendChild( checkbox.get(0) );
            } else if ( type == 'toggle' ) {
                var cssStates = control.css_options,
                        names = control.name_options;

                var numOptions =
                        ( cssStates ? cssStates.length :
                        ( names     ? names.length     :
                                      0 ) );

                var option = -1;
                var toggle = $('<input>').
                        addClass( 'skybrush_input_button' ).
                        addClass( cssID ).
                        attr( 'type', 'button' );
                var switchOption = function() {
                    if ( cssStates && cssStates[option] ) {
                        toggle.removeClass( cssStates[option] );
                    }

                    option = (option+1) % numOptions;
                    if ( names ) {
                        toggle.val( names[option] );
                    }
                    if ( cssStates && cssStates[option] ) {
                        toggle.addClass( cssStates[option] );
                    }
                };

                switchOption();

                toggle.click( function(ev) {
                        ev.stopPropagation();
                        ev.preventDefault();
                        switchOption();

                        command[ field ] = option;
                        if ( callback ) {
                            callback.call( command, option, painter );
                        }

                        if ( isCursor ) {
                            painter.refreshCursor( command );
                        }
                } );

                cDom.appendChild( toggle.get(0) );
            } else if ( type === 'slider' ) {
                var min  = control.min,
                    max  = control.max,
                    step = control.step || 1;

                if ( defaultField === undefined ) {
                    defaultField = Math.max( 1, min );
                }

                var val = $('<input>').
                        addClass( 'skybrush_input' ).
                        attr( 'type', 'number' ).
                        attr( 'step', step ).
                        attr( 'min', min ).
                        attr( 'max', max ).
                        forceNumeric( false ).
                        keydown( function() {
                            var $this = $(this);

                            setTimeout( function() {
                                var n = $this.val();

                                if ( n && n >= 1 ) {
                                    n = Math.round( n );
                                    slider.setSlide( n / max );

                                    command[ field ] = n;

                                    if ( callback ) {
                                        callback.call( command, n, painter );
                                    }

                                    if ( isCursor ) {
                                        painter.refreshCursor( command );
                                    }
                                }
                            }, 0 );
                        } );

                var slider = $slider().
                        addClass( cssID ).
                        limit( min, max ).
                        step( step ).
                        slide( function(ev, n, p) {
                            command[ field ] = n;
                            val.val( n );

                            if ( callback ) {
                                callback.call( command, n, painter );
                            }

                            if ( isCursor ) {
                                painter.refreshCursor( command );
                            }
                        } );

                // initialize
                val.val( defaultField );

                cDom.appendChild( slider.get(0) );
                cDom.appendChild(    val.get(0) );

                // Slider must be updated in the future,
                // after the reflow.
                setTimeout( function() {
                    slider.setSlide( defaultField / max );
                }, 0 );
            } else {
                throw new Error( "Unknown control setup given" );
            }

            command[ field ] = defaultField;

            return cDom;
        };

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
        var Command = function( setup ) {
            this.name    = setup.name    || '' ;
            this.caption = setup.caption || '' ;
            this.cursor  = setup.cursor  || nil;
            this.css     = setup.css ?
                    COMMAND_CSS_PREFIX + setup.css :
                    ''                             ;

            this.drawArea = nil;

            this.dom = nil;
            this.domInitialized = false;
            this.controlsSetup = setup.controls;

            if ( setup.onDown ) {
                this.onDown = setup.onDown;
            }

            if ( setup.onDownOnMove ) {
                this.onDown =
                this.onMove =
                       setup.onDownOnMove;
            }

            if ( setup.onMoveOnUp ) {
                this.onUp   =
                this.onMove =
                        setup.onMoveOnUp;
            }

            if ( setup.onMove ) {
                this.onMove = setup.onMove;
            }

            if ( setup.onUp ) {
                this.onUp = setup.onUp;
            }

            this.whenAttached = setup.onAttach || nil;
            this.whenDetached = setup.onDetach || nil;

            var onShift = setup.onShift;
            if ( onShift ) {
                var self = this;

                self.shiftDown = function( isShiftDown ) {
                    onShift.call( self, isShiftDown, this );
                };
            } else {
                this.shiftDown = nil;
            }

            this.isInAttach = false;
            this.isInDetach = false;
        };

        Command.prototype.getCSS = function() {
            return this.css;
        };

        /**
         * Called when a Command object is set as the current
         * command.
         *
         * @param painter The parent SkyBrush instance this is being attached to.
         */
        Command.prototype.onAttach = function( painter ) {
            if ( ! this.isInAttach ) {
                this.isInAttach = true;

                if ( this.whenAttached ) {
                    this.whenAttached.call( this, painter );
                }

                if ( this.shiftDown ) {
                    painter.onShift( this.shiftDown );

                    // call if shift is down,
                    // so control is properly setup
                    if ( painter.isShiftDown() ) {
                        this.shiftDown.call( painter, true );
                    }
                }

                this.isInAttach = false;
            }
        };

        /**
         * For when a Command object is detached from SkyBrush,
         * and it is no longer set as the current command.
         *
         * @param painter The parent SkyBrush instance this is being detached from.
         */
        Command.prototype.onDetach = function( painter ) {
            if ( ! this.isInDetach ) {
                this.isInDetach = true;

                if ( this.shiftDown ) {
                    painter.removeOnShift( this.shiftDown );

                    /*
                     * If changing whilst shift is down,
                     * we call as though it was lifte,
                     * so it's like it was released.
                     */
                    if ( painter.isShiftDown() ) {
                        this.shiftDown.call( painter, false );
                    }
                }

                if ( this.whenDetached ) {
                    this.whenDetached.call( this, painter );
                }

                this.isInDetach = false;
            }
        };

        Command.prototype.getCursor = function() {
            return this.cursor;
        };

        Command.prototype.getCaption = function() {
            return this.caption;
        };

        Command.prototype.getName = function() {
            return this.name;
        };

        /**
         * Finds the control stated, based on it's 'name'.
         *
         * If the control is not found, then an empty jQuery
         * object will be returned.
         *
         * @param A jQuery object for the control.
         */
        Command.prototype.getControl = function( name ) {
            return this.getControlsDom().getElementsByClassName( controlNameToCSSID(name) )[0];
        };

        /**
         * This returns null if there are no controls
         * for this command.
         *
         * @return The HTML dom with all the control structures for this command.
         */
        Command.prototype.createControlsDom = function( painter ) {
            /*
             * Controls dom is loaded in a lazy way so painter
             * starts up a tad faster,
             */
            if ( ! this.domInitialized ) {
                this.domInitialized = true;

                var dom = document.createElement( 'div' );
                dom.className = 'skybrush_command_controls_inner' ;

                var controlsSetup = this.controlsSetup;
                if ( ! controlsSetup ) {
                    dom.innerHTML = '<div class="skybrush_command_no_controls">no settings</div>';
                } else if ( controlsSetup instanceof Array ) {
                    for ( var i = 0; i < controlsSetup.length; i++ ) {
                        dom.appendChild(
                                newCommandControl( this, controlsSetup[i], painter )
                        );
                    }
                } else {
                    dom.appendChild(
                            newCommandControl( this, controlsSetup, painter )
                    );
                }

                this.dom = dom;
            }

            return this.dom;
        };

        /**
         * Returns the dom containing all of the command options
         * for this Command, or null if there is no dom.
         *
         * There would be no dom if there are no options.
         */
        Command.prototype.getControlsDom = function() {
            return this.dom;
        };

        Command.prototype.popDrawArea = function() {
            var t = this.drawArea;
            this.drawArea = nil;

            return t;
        };

        Command.prototype.addDrawArea = function( x, y, w, h, buffer ) {
            var da = this.drawArea;

            if ( da !== nil ) {
                buffer = buffer || 1;

                if ( h === undefined ) {
                    x -= w/2,
                    y -= w/2;
                    h = w;
                }

                if ( w < 0 ) {
                    x -= w;
                    w = -w;
                }

                if ( h < 0 ) {
                    y -= h;
                    h = -h;
                }

                da.x    = Math.min( da.x   , x - buffer );
                da.y    = Math.min( da.y   , y - buffer );
                da.endX = Math.max( da.endX, x+w+buffer );
                da.endY = Math.max( da.endY, y+h+buffer );
            } else {
                this.setDrawArea( x, y, w, h, buffer );
            }

            return this;
        };

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
        Command.prototype.setDrawArea = function( x, y, w, h, buffer ) {
            // If used in single args version,
            // this allows setting 'null' as the draw area (no draw)
            if ( y === undefined && x !== undefined ) {
                this.drawArea = x;
            } else {
                buffer = buffer || 1;

                if ( h === undefined ) {
                    x -= w,
                    y -= w;
                    h  = w;
                }

                if ( w < 0 ) {
                    w  = -w;
                    x -=  w;
                }

                if ( h < 0 ) {
                    h  = -h;
                    y -=  h;
                }

                this.drawArea = {
                        x: x-buffer,
                        y: y-buffer,
                        endX: x+w+buffer,
                        endY: y+h+buffer
                }
            }

            return this;
        };

        /**
         * The standard minimum and maximum brush sizes,
         * and a way to limit them.
         */
        var BRUSH_SIZE = {
            min: 1,
            max: MAX_BRUSH_SIZE,

            limit: function( size ) {
                return Math.limit( size, this.min, this.max );
            }
        };

        /**
         * Creates a new Brush, with the name, css class and events given.
         * Some extras are added on top, which the standard Command does
         * not have, like brush size.
         *
         * @constructor
         * @private
         */
        var Brush = function( setup ) {
            var brushSizeControl = {
                    name: 'Size',
                    field: 'size',

                    type: 'slider',
                    css : 'size',

                    cursor: true,

                    min: 1,
                    max: MAX_BRUSH_SIZE
            };

            var controls = setup.controls;
            if ( controls === undefined ) {
                controls = [ brushSizeControl ];
            } else {
                controls = setup.controls;
                var addControl = true;

                for ( var i = 0; i < controls.length; i++ ) {
                    if ( controls[i].field === brushSizeControl.field ) {
                        addControl = false;
                        break;
                    }
                }

                if ( addControl ) {
                    controls.unshift( brushSizeControl );
                }
            }

            setup.controls = controls;

            Command.call( this, setup );

            this.size = 0;
            this.setSize( DEFAULT_BRUSH_SIZE );
        };

        Brush.prototype = new Command( '', '', {} );

        /**
         * Sets the size for this brush.
         * This is automtically limited to default min/max values.
         *
         * @param size The new size for this brush.
         */
        Brush.prototype.setSize = function(size) {
            this.size = BRUSH_SIZE.limit( size );
        };

        /**
         * Increments the size by the amount given.
         *
         * @param inc The amount to increment the size.
         */
        Brush.prototype.incrementSize = function( inc ) {
            this.setSize( this.size + inc );
        };

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
        var Geometry = function( setup ) {
            this.startX = 0;
            this.startY = 0;

            this.isFilled = true;
            this.size = 1;

            this.isAliased = false;

            this.drawGeom = setup.onDraw;

            var oldOnDown = setup.onDown;
            setup.onDown = function( canvas, x, y ) {
                if ( ! this.isAliased ) {
                    x |= 0;
                    y |= 0;
                }

                this.startX = x,
                this.startY = y;
                this.lastX = x;
                this.lastY = y;

                canvas.getContext().lineJoin = 'miter';

                if ( oldOnDown ) {
                    oldOnDown.call( this, canvas, x, y );
                }
            };
            setup.onMove = function( canvas, x, y ) {
                if ( ! this.isAliased ) {
                    x |= 0;
                    y |= 0;
                }

                this.drawGeom( canvas.getContext(), this.startX, this.startY, x, y, this.lastX, this.lastY );

                this.lastX = x;
                this.lastY = y;
            };
            setup.onUp = function( canvas, x, y ) {
                if ( ! this.isAliased ) {
                    x |= 0;
                    y |= 0;
                }

                this.setDrawArea( this.startX, this.startY, x-this.startX, y-this.startY, this.size );

                this.drawGeom( canvas.getContext(), this.startX, this.startY, x, y, this.lastX, this.lastY );

                this.lastX = x;
                this.lastY = y;
            };

            setup.cursor = DEFAULT_CURSOR;

            Command.call( this, setup );
        };

        Geometry.prototype = new Command( '', '', {} );

        Geometry.prototype.round = function( n, isOutline, size ) {
            if ( (!isOutline) || size % 2 == 0 ) {
                return n | 0;
            } else {
                return (n | 0) + 0.5;
            }
        };

        Geometry.prototype.toggleAliased = function() {
            this.isAliased = ! this.isAliased ;
        };

        Geometry.prototype.toggleFilled = function() {
            this.isFilled = ! this.isFilled ;
        };

        var ShapeGeometry = function( setup ) {
            var controls = setup.controls;
            if ( ! controls ) {
                controls = [];
            } else if ( controls && ! ( controls instanceof Array ) ) {
                controls = [ controls ];
            }

            setup.controls = controls.concat([
                    {
                            name: 'Mode',
                            css: 'outline_cmd',
                            field: 'isOutline',
                            type: 'toggle',
                            css_options: [ 'filled', 'outline' ],
                            name_options: [ 'Filled', 'Outline' ]
                    },
                    {
                            name: 'Outline',
                            css: 'outline_size_cmd',
                            field: 'size',
                            type: 'slider',

                            value: 1,
                            min: 1,
                            max: MAX_BRUSH_SIZE
                    },
                    {
                            name: 'Proportion',
                            css: 'proportion_size_cmd',
                            field: 'isProportional',
                            type: 'checkbox'
                    },
                    {
                            name: 'Center',
                            css: 'centre_size_cmd',
                            field: 'isCentred',
                            type: 'checkbox'
                    }
            ]);

            // wrap in our own function
            var drawGeom = setup.onDraw;
            setup.onDraw = function( ctx, x1, y1, x2, y2, lastX, lastY ) {
                var size = this.size,
                    isOutline = this.isOutline;

                x1 = this.round( x1, isOutline, size );
                y1 = this.round( y1, isOutline, size );
                x2 = this.round( x2, isOutline, size );
                y2 = this.round( y2, isOutline, size );

                var w = x2 - x1,
                    h = y2 - y1;

                if ( this.isProportional ) {
                    var wAbs = Math.abs(w),
                        hAbs = Math.abs(h);

                    if ( wAbs > hAbs ) {
                        if ( h < 0 ) {
                            h = - wAbs;
                        } else {
                            h =   wAbs;
                        }
                    } else {
                        if ( w < 0 ) {
                            w = - hAbs;
                        } else {
                            w =   hAbs;
                        }
                    }
                }

                if ( this.isCentred ) {
                    x1 -= w;
                    y1 -= h;
                    w += w;
                    h += h;
                }

                if ( this.isProportional || this.isCentred ) {
                    this.setDrawArea( x1, y1, w, h, size );
                }

                clearCtx( ctx,
                        this.lastX1,
                        this.lastY1,
                        this.lastW,
                        this.lastH,
                        this.size
                );

                this.lastX1 = x1,
                this.lastY1 = y1,
                this.lastW  = w,
                this.lastH  = h;

                drawGeom.call( this, ctx, x1, y1, x1+w, y1+h );
            };

            setup.onDown = function(canvas, x, y) {
                this.lastX1 = x,
                this.lastY1 = y,
                this.lastW  = 1,
                this.lastH  = 1;
            };

            Geometry.call( this, setup );
        };

        ShapeGeometry.prototype = new Geometry( '', '', function() {}, undefined );

        /* Helper Drawing Function */

        var renderLine = function( fun, canvas, x1, y1, x2, y2, size ) {
            x1 = Math.round(x1 - size/2);
            y1 = Math.round(y1 - size/2);
            x2 = Math.round(x2 - size/2);
            y2 = Math.round(y2 - size/2);

            var xDiff = x2 - x1,
                yDiff = y2 - y1 ;

            var inc = Math.max(
                    Math.abs( xDiff ),
                    Math.abs( yDiff )
            ) / size;

            var xInc = ( xDiff / inc ) / size,
                yInc = ( yDiff / inc ) / size,
                x = x1,
                y = y1 ;

            for ( var i = 0; i < inc; i++ ) {
                fun( canvas, (x+0.5)|0, (y+0.5)|0, size );

                x += xInc,
                y += yInc;
            }
        };

        var drawPixelLine = function( ctx, x0, y0, x1, y1, size ) {
            x0 = Math.round( x0 );
            x1 = Math.round( x1 );
            y0 = Math.round( y0 );
            y1 = Math.round( y1 );

            var sizeI = Math.round( size );
            var sizeI2 = (sizeI/2) | 0;

            var yDiff = y1 - y0,
                xDiff = x1 - x0;

            var aXDiff = Math.abs( xDiff ),
                aYDiff = Math.abs( yDiff );

            if ( aXDiff < aYDiff ) {
                if ( aXDiff < 1.5 ) {
                    ctx.fillRect( x0-sizeI2, y0, sizeI, y1-y0 );
                }
            } else if ( aYDiff < 1.5 ) {
                ctx.fillRect( x0, y0-sizeI2, x1-x0, sizeI );
            }

            /*
             * When this is true, we draw across the screen
             * in horizontal rectangles.
             *
             * When this is false, we draw down the screen,
             * with vertical rectangles.
             */
            var moveHorizontal = aXDiff > aYDiff;
            if ( moveHorizontal ) {
                y0 -= sizeI2;
                y1 -= sizeI2;
            } else {
                x0 -= sizeI2;
                x1 -= sizeI2;
            }

            var inc = Math.min( aXDiff, aYDiff );
            var xInc = xDiff / inc,
                yInc = yDiff / inc;

            var x = x0;

            var yStart = y0,
                yEnd = y1,
                xStart = x0,
                xEnd = x1;

            if ( moveHorizontal ) {
                if ( yStart > yEnd ) {
                    var t = 0;

                    t = yStart;
                    yStart = yEnd;
                    yEnd = t;

                    t = xStart;
                    xStart = xEnd;
                    xEnd = t;

                    xInc = -xInc;
                }
            } else {
                if ( xStart > xEnd ) {
                    var t = 0;

                    t = xStart;
                    xStart = xEnd;
                    xEnd = t;

                    t = yStart;
                    yStart = yEnd;
                    yEnd = t;

                    yInc = -yInc;
                }
            }

            for ( var i = 0; i < sizeI; i++ ) {
                if ( moveHorizontal ) {
                    var x = xStart;

                    for ( var y = yStart; y < yEnd; y++ ) {
                        var drawX = x|0;
                        var drawY = y|0;
                        var xWidth = ((x + xInc)|0) - drawX ;

                        ctx.fillRect( drawX, drawY, xWidth, 1 );

                        x += xInc;
                    }

                    yStart++;
                    yEnd++;
                } else {
                    var y = yStart;

                    for ( var x = xStart; x < xEnd; x++ ) {
                        var drawX = x|0;
                        var drawY = y|0;
                        var yWidth = ((y + yInc)|0) - drawY ;

                        ctx.fillRect( drawX, drawY, 1, yWidth );

                        y += yInc;
                    }

                    xStart++;
                    xEnd++;
                }
            }

            return;

            // swap values so we iterate less
            var steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
            if ( steep ) {
                var t;

                t = x0;
                x0 = y0;
                y0 = t;

                t = x1;
                x1 = y1;
                y1 = t;
            }
            if ( x0 > x1 ) {
                var t;

                t = x0;
                x0 = x1;
                x1 = t;

                t = y0;
                y0 = y1;
                y1 = t;
            }
            if ( y0 > y1 ) {
                var t;

                t = y0;
                y0 = y1;
                y1 = t;

                t = y0;
                y0 = y1;
                y1 = t;
            }

            var deltax = x1 - x0,
                deltay = Math.abs(y1 - y0);

            var ystep;
            if ( y0 < y1 ) {
                ystep = 1;
            } else {
                ystep = -1;
            }

            // Now DRAW!
            var sizeI = Math.round( size );
            var error = deltax / 2;
            var y = y0 - Math.round(size/2);

            var c = 0;
            for ( var y = y0; y < y1; y++ ) {
                c++;
                if ( steep ) {
                    ctx.fillRect(y, x, sizeI, 1);
                } else {
                    ctx.fillRect(x, y, 1, sizeI);
                }

                error = error - deltay
                if ( error < 0 ) {
                    y = y + ystep
                    error = error + deltax
                }
            }
        };

        /**
         * A bespoke brush, specifically for pixelated drawing.
         *
         * @constructor
         * @private
         */
        var PixelBrush = function( setup ) {
            var self = this;

            self.brushCmd = setup.onDraw;
            self.pencilCommand = function( canvas, x, y, size ) {
                self.brushCmd( canvas, x, y, size );
            };

            setup.onDown = function( canvas, x, y ) {
                this.lastX = x;
                this.lastY = y;
                this.skipFirst = true;

                var size = Math.round( this.size );

                x -= (size/2) | 0;
                y -= (size/2) | 0;

                this.pencilCommand( canvas, x, y, size );
                canvas.redrawUpscale( x|0, y|0, 0, 0, undefined, size );

                this.addDrawArea( x|0, y|0, size );
            };
            setup.onMoveOnUp = function( canvas, x, y ) {
                var size = this.size,
                    diffX = this.lastX - x,
                    diffY = this.lastY - y;

                if ( this.skipFirst && (Math.abs(diffX) >= 1 || Math.abs(diffY) >= 1) ) {
                    this.skipFirst = false;

                    if ( diffX >= 1 ) {
                        diffX--;
                        this.lastX--;
                    } else if ( diffX <= -1 ) {
                        diffX++;
                        this.lastX++;
                    }

                    if ( diffY >= 1 ) {
                        diffY--;
                        this.lastY--;
                    } else if ( diffY <= -1 ) {
                        diffY++;
                        this.lastY++;
                    }
                }

                if ( Math.abs(diffX) < 0.5 && Math.abs(diffY) < 0.5 ) {
                    return;
                }

                renderLine( this.pencilCommand, canvas, x, y, this.lastX, this.lastY, size);

                canvas.redrawUpscale( x|0, y|0, diffX, diffY, undefined, size );
                this.addDrawArea( x|0, y|0, diffX, diffY, size );

                this.lastX = x;
                this.lastY = y;
            };

            Brush.call( this, setup  );
        };
        PixelBrush.prototype = new Brush( '', '', {} );

        var pickerCommand = new Command({
                name  : 'Picker',
                css   : 'picker',

                caption: 'Colour Picker | shortcut: k or hold Alt',
                cursor: 'sb_cursor_picker',

                onDownOnMove : function( canvas, x, y, painter ) {
                    var rgb = canvas.colourPick( x, y );

                    if ( rgb !== nil ) {
                        painter.setColor( rgbToColor(rgb[0], rgb[1], rgb[2]) );
                        painter.setAlpha( rgb[3] / 255.0 );
                    }
                }
        });

        var eraserSwitch   = nil,
            switchToEraser = function( shiftDown, painter ) {
                if ( shiftDown ) {
                    eraserSwitch = this;
                    painter.setCommand( eraser );
                }
            };

        /* Eraser
         *
         * Works by having two built internally:
         * = hard eraser, works on a pixel level
         * = soft eraser, has faded edges
         *
         * The complete eraser houses both, and switches between them.
         */
        var eraser =
                (function() {
                    var hardErase = new PixelBrush( {
                            name: 'Eraser',
                            css : 'eraser',

                            onDraw: function( canvas, x, y, size ) {
                                var ctx = canvas.getDirectContext(),
                                    gc = ctx.globalCompositeOperation;

                                ctx.globalCompositeOperation = 'destination-out';
                                canvas.getDirectContext().fillRect( x | 0, y | 0, size, size );
                                ctx.globalCompositeOperation = gc;
                            }
                    });

                    var softErase = new Brush( {
                            name: 'Soft Eraser',
                            css : 'soft_eraser',

                            onDown: function( canvas, x, y ) {
                                this.lastX = x;
                                this.lastY = y;
                            },
                            onMoveOnUp: function( canvas, x, y ) {
                                var diffX = this.lastX - x,
                                    diffY = this.lastY - y;

                                this.drawLine( canvas.getDirectContext(), x, y );
                                canvas.redrawUpscale( this.lastX, this.lastY, diffX, diffY, undefined, this.size*2 );

                                this.addDrawArea( this.lastX, this.lastY, diffY, diffY, this.size*2 );
                            }
                    } );
                    softErase.drawLine = function( ctx, x, y ) {
                        var compOp = ctx.globalCompositeOperation;

                        ctx.globalCompositeOperation = 'destination-out';
                        ctx.lineJoin = 'round';

                        ctx.lineWidth = this.size;

                        ctx.beginPath();
                        ctx.moveTo( this.lastX, this.lastY );
                        ctx.lineTo( x, y );
                        ctx.closePath();

                        ctx.stroke();

                        ctx.globalCompositeOperation = compOp;

                        this.lastX = x;
                        this.lastY = y;
                    };

                    var eraser = new Command( {
                            name: 'Eraser',
                            css : 'eraser',
                            caption: 'Eraser | shortcut: e',

                            onDown: function( canvas, x, y ) {
                                var brush = this.isAliased   ? this.soft : this.hard ;

                                brush.size = this.size;
                                brush.onDown( canvas, x, y );
                                this.brush = brush;
                            },
                            onMove: function( canvas, x, y ) {
                                this.brush.onMove( canvas, x, y );
                            },
                            onUp: function( canvas, x, y ) {
                                this.brush.onUp( canvas, x, y );
                                this.setDrawArea( this.brush.popDrawArea() );
                            },

                            cursor: function( cursor, painter ) {
                                if ( this.isChecked ) {
                                    cursor.setCircle( this.size );
                                } else {
                                    cursor.setSquare( this.size );
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
                                    max: 50
                                },
                                {
                                    name: 'Smooth',
                                    field:'isAliased',
                                    type: 'checkbox',

                                    cursor: true,

                                    value: false
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
                                    painter.setCommand( eraserSwitch );
                                    eraserSwitch = nil;
                                }
                            }
                    } );
                    eraser.soft = softErase;
                    eraser.hard = hardErase;

                    return eraser;
                })();

        return [
                pickerCommand,

                new PixelBrush({
                        name: 'Pencil',
                        css : 'pencil',
                        caption: 'Pencil | shortcut: p, shift: switches to eraser',

                        onDraw: function( canvas, x, y, size ) {
                            x = x|0;
                            y = y|0;

                            canvas.getDirectContext().fillRect( x, y, size, size );
                        },

                        cursor: function( cursor, painter ) {
                            cursor.setSquare( this.size );
                        },

                        onShift: switchToEraser
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
                    var b = new Brush( {
                            name: 'Brush',
                            css : 'brush',
                            caption: 'Paint Brush | shortcut: b, shift: switches to eraser',

                            cursor: function( cursor, painter ) {
                                cursor.setCircle( this.size );
                            },

                            onDown: function( canvas, x, y ) {
                                this.x =
                                        this.lastX =
                                        this.minX =
                                        this.maxX = x;

                                this.y =
                                        this.lastY =
                                        this.minY =
                                        this.maxY = y;

                                var ctx = canvas.getContext();
                                ctx.lineWidth = this.size;
                                ctx.lineCap = 'round';
                                ctx.lineJoin = 'round';
                                ctx.beginPath();

                                /*
                                 * This is to trick it into starting a line,
                                 * when the mouse goes down.
                                 */
                                ctx.moveTo( x-0.1, y-0.1 );
                                ctx.lineTo( x, y );
                                this.updateLine( canvas, x, y );

                                canvas.hideOverlay();
                                canvas.redrawUpscale( this.lastX, this.lastY, x-this.lastX, y-this.lastY, true, this.size*2 );
                            },
                            onMove: function( canvas, x, y ) {
                                this.updateLine( canvas, x, y );

                                canvas.hideOverlay();
                                canvas.redrawUpscale( this.lastX, this.lastY, x-this.lastX, y-this.lastY, true, this.size*2 );
                            },
                            onUp: function( canvas, x, y ) {
                                this.updateLine( canvas, x, y );

                                // end the current path
                                canvas.getContext().beginPath();

                                this.setDrawArea(
                                        this.minX, this.minY,
                                        this.maxX-this.minX, this.maxY-this.minY,
                                        this.size
                                );
                            },

                            onShift: switchToEraser
                    } );

                    b.updateLine = function( canvas, x, y ) {
                        var lastX = this.lastX = this.x;
                        var lastY = this.lastY = this.y;
                        this.x = x;
                        this.y = y;

                        this.minX = Math.min( this.minX, x );
                        this.maxX = Math.max( this.maxX, x );
                        this.minY = Math.min( this.minY, y );
                        this.maxY = Math.max( this.maxY, y );

                        var ctx = canvas.getContext();
                        clearCtx(
                                ctx,
                                this.minX,
                                this.minY,
                                this.maxX - this.minX,
                                this.maxY - this.minY,
                                this.size
                        );
                        ctx.lineTo( x, y );
                        ctx.stroke();
                    };

                    return b;
                })(),

                (function() {
                    /*
                     * The webby/shading brush, used for shading areas.
                     *
                     * It stores and builds a list of pixels over the course of drawing,
                     * and iterates over this, to work out new areas to draw upon.
                     */
                    var b = new Brush( {
                            name: 'Webby',
                            css : 'web',
                            caption: 'Web Brush | shortcut: w, shift: switches to eraser',

                            cursor: function(cursor, painter) {
                                cursor.setCircle( this.size );
                            },

                            controls: [
                                    {
                                            name : 'Size',
                                            field: 'size',
                                            value: 2,

                                            type: 'slider',

                                            cursor: true,

                                            min: 1,
                                            max: MAX_BRUSH_SIZE/10
                                    },
                                    {
                                            name : 'Dist',
                                            field: 'dist',
                                            value: 60,

                                            type: 'slider',

                                            min: 10,
                                            max: 200
                                    },
                                    {
                                            name : 'Fuzzy',
                                            field: 'fuzzy',
                                            value: 1,

                                            type: 'slider',

                                            min: 1,
                                            max: 25
                                    },
                                    {
                                            name: 'continuous',
                                            field: 'isContinous',
                                            value: true,
                                            type: 'checkbox'
                                    }
                            ],

                            onDown: function( canvas, x, y ) {
                                this.x =
                                        this.lastX =
                                        this.minX =
                                        this.maxX = x;

                                this.y =
                                        this.lastY =
                                        this.minY =
                                        this.maxY = y;

                                this.updateArea = {
                                        minX: 1,
                                        minY: 1,
                                        maxX: 0,
                                        maxY: 0
                                };

                                var ctx = canvas.getContext();
                                ctx.lineWidth = this.size;
                                ctx.lineCap   = 'round';
                                ctx.lineJoin  = 'round';
                                ctx.beginPath();

                                /*
                                 * This is to trick it into starting a line,
                                 * when the mouse goes down.
                                 */
                                this.xs = [ x-0.1 ];
                                this.ys = [ y-0.1 ];

                                this.updateLine( canvas, x, y, this.updateArea );

                                canvas.hideOverlay();

                                if ( this.updateArea.minX < this.updateArea.maxX ) {
                                    canvas.redrawUpscale(
                                            this.updateArea.minX,
                                            this.updateArea.minY,
                                            this.updateArea.maxX-this.updateArea.minX,
                                            this.updateArea.maxY-this.updateArea.minY,
                                            true,
                                            this.size*2
                                    );
                                }
                            },
                            onMove: function( canvas, x, y ) {
                                this.updateLine( canvas, x, y, this.updateArea );

                                canvas.hideOverlay();

                                if ( this.updateArea.minX < this.updateArea.maxX ) {
                                    canvas.redrawUpscale(
                                            this.updateArea.minX,
                                            this.updateArea.minY,
                                            this.updateArea.maxX-this.updateArea.minX,
                                            this.updateArea.maxY-this.updateArea.minY,
                                            true,
                                            this.size*2
                                    );
                                }
                            },
                            onUp: function( canvas, x, y ) {
                                this.updateLine( canvas, x, y, this.updateArea );

                                // end the current path
                                canvas.getContext().beginPath();

                                this.setDrawArea(
                                        this.minX, this.minY,
                                        this.maxX-this.minX, this.maxY-this.minY,
                                        this.size
                                );
                            },

                            onShift: switchToEraser
                    } );

                    b.updateLine = function( canvas, x, y, updateArea ) {
                        var lastX = this.lastX = this.x;
                        var lastY = this.lastY = this.y;

                        this.x = x;
                        this.y = y;

                        this.minX = Math.min( this.minX, x );
                        this.maxX = Math.max( this.maxX, x );
                        this.minY = Math.min( this.minY, y );
                        this.maxY = Math.max( this.maxY, y );

                        this.xs.push( x );
                        this.ys.push( y );

                        var xs = this.xs,
                            ys = this.ys;

                        var ctx = canvas.getContext();

                        var alpha = ctx.globalAlpha;

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
                        var minX = canvas.width+1,
                            maxX = -1;

                        var minY = canvas.height+1,
                            maxY = -1;

                        var minDist;
                        if ( this.dist > this.size ) {
                            minDist = this.dist * this.dist;
                        } else {
                            minDist = this.size * this.size;
                        }

                        if ( this.isContinous ) {
                            ctx.beginPath();
                            ctx.moveTo(this.lastX, this.lastY);
                            ctx.lineTo(x, y);
                            ctx.stroke()

                            minX = Math.min( minX,
                                    Math.min( this.lastX, x )
                            );
                            minY = Math.min( minY,
                                    Math.min( this.lastY, y )
                            );
                            maxX = Math.max( maxX,
                                    Math.max( this.lastX, x )
                            );
                            maxY = Math.max( maxY,
                                    Math.max( this.lastY, y )
                            );
                        }

                        var length = this.xs.length;
                        var maxSkip = this.fuzzy;
                        var skip = maxSkip;
                        for (var i = 0; i < length; i++) {
                            var xi = xs[i],
                                yi = ys[i];
                                
                            var xDist = xi - x;
                            var yDist = yi - y;
                            var hypot = xDist * xDist + yDist * yDist;

                            if ( hypot < minDist ) {
                                if ( --skip === 0 ) {
                                    skip = maxSkip;

                                    ctx.globalAlpha = alpha * ((1 - (hypot / minDist)) * 0.1);
                                    ctx.beginPath();
                                    ctx.moveTo(x, y);
                                    ctx.lineTo(xi, yi);
                                    ctx.stroke()

                                    if ( x < xi ) {
                                        if ( x < minX ) {
                                            minX = x;
                                        }
                                        if ( xi > maxX ) {
                                            maxX = xi;
                                        }
                                    } else {
                                        if ( xi < minX ) {
                                            minX = xi;
                                        }
                                        if ( x > maxX ) {
                                            maxX = x;
                                        }
                                    }

                                    if ( y < yi ) {
                                        if ( y < minY ) {
                                            minY = y;
                                        }
                                        if ( yi > maxY ) {
                                            maxY = yi;
                                        }
                                    } else {
                                        if ( yi < minY ) {
                                            minY = yi;
                                        }
                                        if ( y > maxY ) {
                                            maxY = y;
                                        }
                                    }
                                }
                            }
                        }

                        updateArea.minX = minX;
                        updateArea.minY = minY;
                        updateArea.maxX = maxX;
                        updateArea.maxY = maxY;

                        ctx.globalAlpha = alpha;
                    };

                    return b;
                })(),

                eraser,

                /* Geometry Commands */
                new ShapeGeometry( {
                        name: 'Rectangle',
                        css : 'rectangle',
                        caption: 'Draw Rectangle | shortcut: r, shift: toggles outline',

                        onDraw: function( ctx, x1, y1, x2, y2 ) {
                            var w = x2-x1,
                                h = y2-y1;

                            if ( this.isOutline ) {
                                ctx.lineWidth = this.size;
                                ctx.strokeRect( x1, y1, w, h );
                            } else {
                                ctx.fillRect( x1, y1, w, h );
                            }
                        },

                        onShift: function() {
                            this.getControl( 'Mode' ).click();
                        }
                } ),
                new ShapeGeometry( {
                        name: 'Circle',
                        css : 'circle',
                        caption: 'Draw Circle | shortcut: c, shift: toggles outline',

                        onDraw: function( ctx, x1, y1, x2, y2 ) {
                            circlePath( ctx, x1, y1, x2-x1, y2-y1 );

                            if ( this.isOutline ) {
                                ctx.lineWidth = this.size;
                                ctx.stroke();
                            } else {
                                ctx.fill();
                            }
                        },

                        onShift: function() {
                            this.getControl( 'Mode' ).click();
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
                            this.lastH  = 1;
                        },
                        onDraw: function( ctx, x1, y1, x2, y2 ) {
                            var size = this.size;

                            clearCtx( ctx,
                                    this.lastX1, this.lastY1,
                                    this.lastW , this.lastH,
                                    size
                            );

                            this.lastX1 = x1,
                            this.lastY1 = y1,
                            this.lastW  = x2-x1,
                            this.lastH  = y2-y1;

                            if ( this.isAliased ) {
                                ctx.beginPath();

                                ctx.lineWidth = size;
                                ctx.moveTo( x1, y1 );
                                ctx.lineTo( x2, y2 );
                                ctx.closePath();

                                ctx.stroke();
                            // draw it by hand, pixel by pixel
                            } else {
                                drawPixelLine( ctx, x1, y1, x2, y2, size );
                            }
                        },

                        onShift: function() {
                            this.getControl( 'Smooth' ).click();
                        },

                        controls: [
                            {
                                name: 'Width',
                                field:'size',
                                type: 'slider',
                                css:  'size',

                                value: 1,
                                min: 1,
                                max: MAX_BRUSH_SIZE
                            },
                            {
                                name: 'Smooth',
                                field: 'isAliased',
                                type: 'checkbox',
                                value: true
                            }
                        ]
                } ),
                new Command( {
                        name: 'Fill',
                        css : 'fill',
                        caption: 'Fill Colour | shortcut: f',

                        onDown: function( canvas, x, y ) {
                            var ctx = canvas.getDirectContext(),
                                tolerance = this.tolerance;

                            var alpha = ctx.globalAlpha,
                                destAlpha = (ctx.globalCompositeOperation == 'source-atop');
                            var invAlpha = 1-alpha;
                            var rgb = canvas.getRGB();
                            var srcR = rgb[0],
                                srcG = rgb[1],
                                srcB = rgb[2];
                            var srcRAlpha = srcR*alpha,
                                srcGAlpha = srcG*alpha,
                                srcBAlpha = srcB*alpha;

                            // floor the location
                            x |= 0;
                            y |= 0;
                            var w = canvas.width,
                                h = canvas.height;

                            var clip = canvas.getClip();
                            var clipX = ( clip === nil ) ? 0 : clip.x,
                                clipY = ( clip === nil ) ? 0 : clip.y,
                                clipW = ( clip === nil ) ? w : clip.w,
                                clipH = ( clip === nil ) ? h : clip.h,
                                clipX2 = ( clip === nil ) ? w : clip.x + clip.w,
                                clipY2 = ( clip === nil ) ? h : clip.y + clip.h ;

                            if ( x < clipX || y < clipY || x >= clipX2 || y >= clipY2 ) {
                                return;
                            } else {
                                // used for the update area at the end,
                                // default to where it was clicked to begin with
                                var minX = x,
                                    maxX = x,
                                    minY = y,
                                    maxY = y;

                                // get the pixel data out
                                var ctxData = ctx.getImageData( clipX, clipY, clipW, clipH );
                                var data = ctxData.data;

                                /**
                                 * If the given x/y location is valid (0 or greater, < w/h),
                                 * and it hasn't already been used in 'done',
                                 * then it's added to the xs/ys arrays.
                                 *
                                 * @param x
                                 * @param y
                                 * @param w
                                 * @param h
                                 * @param xs
                                 * @param ys
                                 * @param done
                                 */
                                var store = function( x, y, clipX, clipY, clipX2, clipY2, xs, ys, done ) {
                                    if ( x >= clipX && y >= clipY && x < clipX2 && y < clipY2 ) {
                                        var row = done[x];

                                        if ( row === undefined || row[y] !== true ) {
                                            xs.push(x);
                                            ys.push(y);

                                            if ( row === undefined ) {
                                                row = [];
                                                done[x] = row;
                                            }

                                            row[y] = true;
                                        }
                                    }
                                };

                                /* Management variables, for maintaining what is, and isn't, drawn. */
                                var xs = [],
                                    ys = [];
                                var done = [];
                                store( x, y, clipX, clipY, clipX2, clipY2, xs, ys, done );

                                var dataI = ((x-clipX) + (y-clipY)*clipW)*4;

                                var startR = data[dataI],
                                    startG = data[dataI+1],
                                    startB = data[dataI+2],
                                    startA = data[dataI+3];

                                // leave early if there is nothing to fill
                                if ( destAlpha && startA === 0 ) {
                                    return;
                                }

                                // work out the tolerance ranges
                                var minR = Math.max(   0, startR-tolerance ),
                                    minG = Math.max(   0, startG-tolerance ),
                                    minB = Math.max(   0, startB-tolerance ),
                                    minA = Math.max(   0, startA-tolerance ),

                                    maxR = Math.min( 255, startR+tolerance ),
                                    maxG = Math.min( 255, startG+tolerance ),
                                    maxB = Math.min( 255, startB+tolerance ),
                                    maxA = Math.min( 255, startA+tolerance );

                                // fills pixels with the given colour if they are within tolerence
                                while ( xs.length > 0 ) {
                                    var nextX = xs.shift(),
                                        nextY = ys.shift();

                                    if ( nextX < minX ) {
                                        minX = nextX;
                                    } else if ( nextX > maxX ) {
                                        maxX = nextX;
                                    }
                                    if ( nextY < minY ) {
                                        minY = nextY;
                                    } else if ( nextY > maxY ) {
                                        maxY = nextY;
                                    }

                                    var i = ((nextX-clipX) + (nextY-clipY)*clipW) * 4;
                                    var r = data[i],
                                        g = data[i+1],
                                        b = data[i+2],
                                        a = data[i+3];

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
                                            data[i  ] = srcR,
                                            data[i+1] = srcG,
                                            data[i+2] = srcB;

                                            if ( destAlpha === false ) {
                                                data[i+3] = 255;
                                            }
                                        } else {
                                            var fullAlpha = ( a === 255 );
                                            a /= 255.0;

                                            /*
                                             * @see Wikipedia: http://en.wikipedia.org/wiki/Alpha_Blend#Alpha_blending
                                             *
                                             * outA = srcA + destA(1-srcA)
                                             * resultRGB = ( srcRGB*srcA + destRGB*destA*(1-srcA) ) / outA
                                             */
                                            var outA = alpha + a*invAlpha;

                                            // skip altering alpha if 'destination alpha' is set
                                            // skip the alpha mixing if destination has full alpha
                                            if ( destAlpha === false && !fullAlpha ) {
                                                // formula: newAlpha = destA + srcA*(1-destA)
                                                data[i+3] = ( (outA * 255) + 0.5 ) | 0;
                                            }

                                            data[i  ] = ((( srcRAlpha + r*a*invAlpha ) / outA ) + 0.5 ) | 0,
                                            data[i+1] = ((( srcGAlpha + g*a*invAlpha ) / outA ) + 0.5 ) | 0,
                                            data[i+2] = ((( srcBAlpha + b*a*invAlpha ) / outA ) + 0.5 ) | 0;
                                        }

                                        store( nextX-1, nextY  , clipX, clipY, clipX2, clipY2, xs, ys, done );
                                        store( nextX+1, nextY  , clipX, clipY, clipX2, clipY2, xs, ys, done );
                                        store( nextX  , nextY-1, clipX, clipY, clipX2, clipY2, xs, ys, done );
                                        store( nextX  , nextY+1, clipX, clipY, clipX2, clipY2, xs, ys, done );
                                    }
                                }

                                var diffX = (maxX-minX) + 1,
                                    diffY = (maxY-minY) + 1;

                                ctx.putImageData( ctxData, clipX, clipY, minX-clipX, minY-clipY, diffX, diffY );
                                this.setDrawArea( minX, minY, diffX, diffY );
                            }
                        },

                        cursor: 'sb_cursor_fill',

                        controls: [
                                {
                                        name : 'Tolerance',
                                        field: 'tolerance',
                                        type : 'slider',
                                        css  : 'tolerance',

                                        value: 20,
                                        min: 1,
                                        max: 255
                                }
                        ]
                } ),

                /* Utility Commands */
                new Command( {
                        name: 'Zoom',
                        css : 'zoom',
                        caption: 'Zoom | shortcut: z, shift: opposite zoom',

                        onShift: function( isShiftDown, painter ) {
                            this.getControl( 'Zoom' ).click();
                        },

                        onDown: function( canvas, x, y, painter, ev ) {
                            if ( painter.isInView(ev) ) {
                                if ( this.zoomOut ) {
                                    painter.zoomOut( x, y );
                                } else {
                                    painter.zoomIn( x, y );
                                }
                            }
                        },

                        controls : [{
                            name: 'Zoom',
                            css : 'zoom_cmd',

                            field: 'zoomOut',
                            type : 'toggle',

                            name_options: [ 'In', 'Out' ],

                            cursor: true
                        }],

                        cursor: function( cursor, painter ) {
                            var zoom = painter.getZoom();

                            if (
                                    (  this.zoomOut && zoom == (1/MAX_ZOOM) ) ||
                                    ( !this.zoomOut && zoom == MAX_ZOOM )
                            ) {
                                cursor.setClass( 'sb_cursor_zoom_blank' );
                            } else if ( this.zoomOut ) {
                                cursor.setClass( 'sb_cursor_zoom_out' );
                            } else {
                                cursor.setClass( 'sb_cursor_zoom_in' );
                            }
                        }
                }),
                new Command( {
                        name: 'Select',
                        css : 'select',
                        caption: 'Selection Tool | shortcut: s',
                        cursor: 'sb_cursor_select',

                        onAttach: function( painter ) {
                            painter.getCanvas().getMarquee().showHandles();
                        },
                        onDetach: function( painter ) {
                            painter.getCanvas().getMarquee().hideHandles();
                        },

                        onDown: function( canvas, x, y, painter, ev ) {
                            canvas.getMarquee().
                                    startHighlight();

                            this.startX = x;
                            this.startY = y;
                        },
                        onMove: function(canvas, x, y) {
                            canvas.getMarquee().
                                    select( this.startX, this.startY, x, y );
                        },
                        onUp: function( canvas, x, y ) {
                            canvas.getMarquee().
                                    select( this.startX, this.startY, x, y ).
                                    stopHighlight();
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
                            this.startX = x;
                            this.startY = y;

                            /*
                             * Used to track if it was dragged or clicked on the spot.
                             */
                            this.wasMovement = false;
                        },
                        onMove: function( canvas, x, y ) {
                            if ( ! canvas.isPasting() ) {
                                canvas.cut().paste();
                            }

                            canvas.movePaste( x-this.startX, y-this.startY, false );

                            this.wasMovement = true;
                        },
                        onUp: function( canvas, x, y ) {
                            if ( canvas.isPasting() ) {
                                if ( this.wasMovement ) {
                                    canvas.movePaste( x-this.startX, y-this.startY, true );
                                } else {
                                    canvas.endPaste();
                                }
                            }
                        }
                } )
        ];
    };

    /**
     * @const
     * @nosideeffects
     * @private
     */
    var ensureEndingSlash = function( url ) {
        // ensure the cursor folder ends with a slash /
        if ( url.length > 0 && url.charAt(url.length-1) != '/' ) {
            return url + '/';
        } else {
            return url;
        }
    };

    /**
     * Translates the image location from the one given,
     * to an explicit url, relative to this request.
     */
    var translateImageLocation = function( imageLocation ) {
        imageLocation = ensureEndingSlash( imageLocation );

        var imageLocationCheck = imageLocation.toLowerCase();

        /*
         * If the location is not explicit, make it explicit!
         * This is so setting it in the stylesheet and directly on the dom is the same.
         * 
         * It is relative to this page.
         */
        if ( ! (
                imageLocationCheck.indexOf(0) === '/' ||
                imageLocationCheck.indexOf('http:') === 0  ||
                imageLocationCheck.indexOf('https:') === 0 ||
                imageLocationCheck.indexOf('file:') === 0
        ) ) {
            var windowLocation = window.location.href;

            var lastSlash = windowLocation.lastIndexOf('/');
            imageLocation = windowLocation.substring(0, lastSlash+1) + imageLocation;
        }

        return imageLocation;
    };

    /**
     * @const
     * @nosideeffects
     * 
     * @param rule The rule to test.
     * @return True if the rule is one that should be translated, and otherwise false.
     */
    var isUrlRule = function(rule) {
        return  rule &&
                rule != 'none' &&
                rule.indexOf('url(' ) !== -1 &&
                rule.indexOf('data:') === -1 ;
    };

    /**
     * Updates the stylesheets to use the location given.
     * 
     * This allows the style sheets to have dynamic image locations,
     * which are then altered using JS.
     */
    var relocateStylesheetImages = function( imageLocation ) {
        var imageUrl = 'url(' + imageLocation,
            cursorUrl = imageUrl + 'cursors/',
            sheets = document.styleSheets;

        var probablySucceeded = false;

        for (var k in sheets) {
            var sheet = sheets[k];

            if ( sheet.href && sheet.href.indexOf('skybrush.css') !== -1 ) {
                var rules = sheet.rules || sheet.cssRules;

                for(var r in rules) {
                    var rule = rules[r],
                        selectorText = rule.selectorText;

                    if ( selectorText !== undefined && (selectorText.indexOf('skybrush_') !== -1 || selectorText.indexOf('sb_') !== -1) ) {
                        var style = rule.style;

                        if ( style ) {
                            var background = style.backgroundImage,
                                cursor = style.cursor;

                            // has a background url, and it's not a data: image
                            if ( isUrlRule(background) ) {
                                /*
                                 * Firefox adds double quotes around the url, so we get rid of them.
                                 * We also remove everything from 'url(' up till the last slash.
                                 */
                                var newBackground = background.replace(/"/g, '').replace(/\burl\((.*\/)?/, imageUrl);
                                style.backgroundImage = newBackground;
                                probablySucceeded = true;
                            }

                            /*
                             * Opera only pick up on two classes (why???),
                             * but it's cursor support is so borked already,
                             * I just don't care.
                             */
                            if ( isUrlRule(cursor) ) {
                                var newCursor = cursor.replace(/"/g, '').replace(/\burl\((.*\/)?/, cursorUrl);
                                style.cursor = newCursor;
                                probablySucceeded = true;
                            }
                        }
                    }
                }
            }
        }

        return probablySucceeded;
    };

    /**
     * Sets up an event to relocate images as needed.
     */
    var relocateImagesLater = function( imageLocation, domObj ) {
        var imageUrl = 'url(' + imageLocation;

        domObj.addEventListener( 'DOMNodeInserted', function(ev) {
            // select this + all children
            var obj = $(ev.target);
            obj = obj.find('*').add(obj);
            
            obj.each(function() {
                if ( this.skybrush_background_done === undefined ) {
                    this.skybrush_background_done = true;

                    var style = this.style;

                    if ( !style || !style.backgroundImage ) {
                        try {
                            style = window.getComputedStyle( this );
                        } catch ( err ) {
                            return;
                        }
                    }

                    if ( style ) {
                        var background = style.backgroundImage;

                        if ( isUrlRule(background) ) {
                            this.style.backgroundImage = background.replace(/"/g, '').replace(/\burl\((.*\/)?/, imageUrl);
                        }
                    }
                }
            })
        }, false );
    }

    var useNativeCursor = function( size ) {
        return ( USE_NATIVE_CURSOR && size < MAX_NATIVE_CURSOR_SIZE );
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
    var DirectCursor = function( viewport ) {
        var self = this;

        self.viewport = viewport;

        self.cursorDataURL = nil;
        self.cursorClass = nil;

        self.inScrollbar = false;

        self.dom = $('<div class="skybrush_brush"></div>');
        viewport.append( self.dom );

        // sensible defaults, so they are never 'undefined'
        self.lastX = 0;
        self.lastY = 0;

        self.lastLeft = 0;
        self.lastTop  = 0;

        self.fakeShown = false;

        self.cssSetup = {
                height: -1,
                width : -1,
                'background-position': ''
        };

        /**
         * This is the size of the fake cursor.
         *
         * @type {number}
         */
        self.displaySize = 0;

        // ensure it's all setup right!
        self.setClass( DEFAULT_CURSOR );
    }

    /**
     * Cleares the items set on the cursor, so it's back to it's default state.
     */
    DirectCursor.prototype.clearCursor = function() {
        this.clearCursorInner();

        this.dom.hide();

        this.fakeShown = false;
        this.cursorDataURL = nil;
        this.cursorClass = nil;

        return this;
    }

    DirectCursor.prototype.clearCursorInner = function() {
        if ( this.cursorDataURL !== nil ) {
            this.dom.hide();
            this.viewport.css( 'cursor', '' );
        }

        this.viewport.removeClass( NO_CURSOR_CSS );

        if ( this.cursorClass !== nil ) {
            if ( this.cursorClass !== NO_CURSOR_CSS ) {
                this.viewport.removeClass( this.cursorClass );
            }
        }

        return this;
    }

    /**
     * Sets the cursor to display the data url given. Only the url needs to be
     * given, i.e.
     *
     *  cursor.setCursorURL( '/cursors/crosshair.cur', size );
     *
     * This can also take a data url, but it only works if the browser actually
     * supports them.
     *
     * @param The data URI for the cursor.
     * @param size, the size of the cursor when displayed.
     */
    DirectCursor.prototype.setCursorURL = function( url, size ) {
        url = this.calculateUrl( url, size );

        if ( ! this.inScrollbar ) {
            this.setCursorURLInner( url, size );
        }

        this.cursorClass = nil;
        this.cursorDataURL = url;
        this.displaySize = size;
        this.fakeShown = ! useNativeCursor( size );

        return this;
    }

    DirectCursor.prototype.setCursorURLInner = function( url, size ) {
        this.clearCursorInner();

        if ( useNativeCursor(size) ) {
            this.viewport.css( 'cursor', url );
        } else {
            this.viewport.addClass( NO_CURSOR_CSS );
            this.dom.show();
            this.dom.css( 'background-image', url );
        }
    }

    /**
     * @return True if the fake cursor, is currently visible, and false if not.
     */
    DirectCursor.prototype.isFakeShown = function() {
        return this.fakeShown;
    }

    DirectCursor.prototype.calculateUrl = function( url, size ) {
        if ( useNativeCursor(size) ) {
            /*
             * The location is off by one,
             * when applied as a cursor url.
             *
             * So I subtract 1, to correct.
             */
            var loc = size/2 - 1;

            return 'url(' + url + ') ' + loc + ' ' + loc + ', auto' ;
        } else {
            return 'url(' + url + ')' ;
        }
    }

    /**
     * Adds the CSS class to the viewport, that the cursor is within.
     */
    DirectCursor.prototype.setClass = function( klass ) {
        // ie cannot handle our cursors, so hide them
        if ( $.browser.msie ) {
            klass = DEFAULT_CURSOR;
        }

        if ( ! this.inScrollbar ) {
            this.clearCursor();
            this.viewport.addClass( klass );
        }

        this.cursorClass = klass;
        this.cursorDataURL = nil;
        this.fakeShown = false;
            
        return this;
    };

    /**
     * Sets the cursor to a blank one.
     */
    DirectCursor.prototype.setBlankCursor = function() {
        this.setClass( NO_CURSOR_CSS );

        return this;
    };

    /**
     * Call this, when the cursor has entered a Scrollbar.
     *
     * Don't worry about what it does, just do it.
     */
    DirectCursor.prototype.enterScrollbar = function() {
        if ( ! this.inScrollbar ) {
            this.clearCursorInner();
            this.inScrollbar = true;
        }

        return this;
    };

    /**
     * Call this, when the cursor has left a Scrollbar.
     *
     * Don't worry about what it does, just do it.
     */
    DirectCursor.prototype.leaveScrollbar = function() {
        if ( this.inScrollbar ) {
            this.inScrollbar = false;

            if ( this.cursorClass ) {
                this.setClass( this.cursorClass );
            } else if ( this.cursorDataURL ) {
                this.setCursorURLInner( this.cursorDataURL, this.displaySize );
            }
        }

        return this;
    };

    DirectCursor.prototype.update = function( ev ) {
        this.updateMove( ev.pageX, ev.pageY );
        this.updateScrollbarCursor( ev );

        return this;
    };

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
    DirectCursor.prototype.updateScrollbarCursor = function( ev ) {
        var x = ev.pageX,
            y = ev.pageY,
            scrollBars = this.viewport.scrollBarSize();

        // work out if we are on top of a scroll bar
        if ( scrollBars.bottom > 0 || scrollBars.right > 0 ) {
            var pos = this.viewport.offset();

            if (
                    scrollBars.right > 0 &&
                    pos.left   + (this.viewport.width() - scrollBars.right) < ev.pageX
            ) {
                this.enterScrollbar();
            } else if (
                    scrollBars.bottom > 0 &&
                    pos.top   + (this.viewport.height() - scrollBars.bottom) < ev.pageY
            ) {
                this.enterScrollbar();
            } else {
                this.leaveScrollbar();
            }
        } else {
            this.leaveScrollbar();
        }

        return this;
    };

    /**
     * pageX and pageY are optional. If omitted, this will
     * presume it is at the same location as the last time
     * this was called.
     */
    DirectCursor.prototype.updateMove = function(pageX, pageY) {
        var _this = this;

        if ( _this.isFakeShown() ) {
            if ( pageX === undefined || pageY === undefined ) {
                pageX = _this.lastX;
                pageY = _this.lastY;
            }

            var displaySize  = _this.displaySize,
                displaySize2 = displaySize/2,
                pos          = _this.viewport.offset(),
                scrollBars   = _this.viewport.scrollBarSize();

            var scrollX = _this.viewport.scrollLeft(),
                scrollY = _this.viewport.scrollTop(),
                viewportHeight = _this.viewport.height() - scrollBars.bottom,
                viewportWidth  = _this.viewport.width()  - scrollBars.right;

                /*
                 * If the cursor is near the top or bottom edge,
                 * then the cursor is obscured using 'background-position'.
                 *
                 * When this is true, it'll do it on the bottom,
                 * and when false, it does this for the top edge.
                 *
                 * hideFromRight does the same, but on the x axis.
                 */
            var hideFromBottom = false,
                hideFromRight  = false;

            /*
             * We have the location, in the middle, of the cursor on the screen.
             * This is the 'fixed' position, where no scrolling taken into account.
             *
             * We then convert this into the top/left position,
             * and then add on the scrolling.
             */

            var middleX = (pageX - pos.left),
                middleY = (pageY - pos.top );

            var left,
                top,
                width,
                height;

            /*
             * Now translate from middle to top/left, for:
             *  - if over the top edge
             *  - if over the bottom edge
             *  - if between those edges
             */

            if ( middleY-displaySize2 < 0 ) {
                top    = 0;
                height = displaySize + (middleY-displaySize2);
            } else if ( middleY+displaySize2 > viewportHeight ) {
                top = middleY-displaySize2;
                height = viewportHeight - (middleY-displaySize2);

                hideFromBottom = true;
            } else {
                top    = middleY - (displaySize2-1);
                height = displaySize;
            }

            if ( middleX-displaySize2 < 0 ) {
                left  = 0;
                width = displaySize + (middleX-displaySize2);
            } else if ( middleX+displaySize2 > viewportWidth ) {
                left  = middleX-displaySize2;
                width = viewportWidth - (middleX-displaySize2);

                hideFromRight = true;
            } else {
                left  = middleX - (displaySize2-1);
                width = displaySize;
            }

            top  += scrollY;
            left += scrollX;

            if ( left !== this.lastLeft || top !== this.lastTop ) {
                _this.lastLeft = left;
                _this.lastTop  = top;

                _this.dom.translate( left, top );

                _this.lastX = pageX;
                _this.lastY = pageY;
            }

            /*
             * Now alter the width/height,
             * and the background position.
             */

            width  = Math.max( width , 0 );
            height = Math.max( height, 0 );

            var cssSetup = this.cssSetup;
            if (
                    height !== cssSetup.height ||
                    width  !== cssSetup.width
            ) {
                var positionY = ! hideFromBottom ?
                            -(displaySize-height) + 'px' :
                             0 ;
                var positionX = ! hideFromRight ?
                            -(displaySize-width ) + 'px' :
                             0 ;

                var newBackPosition = positionX + ' ' + positionY;
                if ( newBackPosition !== cssSetup['background-position'] ) {
                    cssSetup['background-position'] = newBackPosition;
                    _this.dom.css( 'background-position', newBackPosition );
                }

                if ( width !== cssSetup.width ) {
                    cssSetup.width = width;
                    _this.dom.width( width );
                }

                if ( height !== cssSetup.height ) {
                    cssSetup.height = height;
                    _this.dom.height( height );
                }
            }
        }

        return _this;
    };


    /**
     * This differs from DirectCursor, in that this deals with the brush size,
     * zoom, and some decision making on how the brush should look.
     *
     * If 'isTouch' is set, then only 'showTouch' and 'hideTouch'
     * will actually allow this to be seen or not.
     *
     * The other 'show' and 'hide' will still look like they work,
     * and will as far as they can, except nothing actually appeares.
     *
     * The 'cursorTranslator' is used for translating cursor locations.
     * That is so the CSS can move to a different location,
     * but still work.
     *
     * @param viewport The view area this is a cursor for.
     * @param isTouch True if this is working with touch, false if not.
     * @param cursorTranslator Null for no translator, otherwise provide one.
     */
    var BrushCursor = function( painter, viewport, isTouch, translator ) {
        var self = this;

        self.cursor = new DirectCursor( viewport );
        self.painter = painter;

        self.cursorTranslator = translator || nil;

        self.viewport = viewport;

        /**
         * This is the brush size, at the current zoom level.
         *
         * So if the brush size is 10, and the zoom level is 3,
         * then this value will be 30 (10 * 3).
         *
         * @type {number}
         */
        self.zoomSize = 1;

        // initializes to no size
        self.isHidden = false;
        self.isReallyHidden = false;
        self.isTouch = isTouch;

        self.size = 1;

        self.shape = undefined;

        self.canvas = newCanvas( 1, 1 );
        self.cursorReplace = new events.Runner();

        if ( isTouch ) {
            self.hideTouch();
        }
    };

    BrushCursor.prototype.setCrosshair = function() {
        this.cursor.setCursorURL( CROSSHAIR_CURSOR_DATA_URL, CROSSHAIR_CURSOR_SIZE );
        this.shape = nil;

        return this;
    };

    BrushCursor.prototype.onMove = function(ev) {
        this.cursor.update( ev );

        return this;
    };

    BrushCursor.prototype.showTouch = function() {
        // don't show if hidden!
        if ( this.isTouch && !this.isHidden ) {
            this.showInner(); 
        }

        return this;
    };
    BrushCursor.prototype.hideTouch = function() {
        if ( this.isTouch ) {
            this.hideInner();
        }

        return this;
    };
    BrushCursor.prototype.show = function() {
        this.isHidden = false;

        if ( ! this.isTouch ) {
            this.showInner();
        }

        return this;
    };
    BrushCursor.prototype.hide = function() {
        this.isHidden = true;

        if ( ! this.isTouch ) {
            this.hideInner();
        }

        return this;
    };

    BrushCursor.prototype.showInner = function() {
        if ( this.isReallyHidden ) {
            this.isReallyHidden = false;

            this.dom.show();
            this.renderShape( this.render, this.zoomSize );
        }

        return this;
    };

    BrushCursor.prototype.hideInner = function() {
        if ( ! this.isReallyHidden ) {
            this.isReallyHidden = true;
            this.dom.hide();
        }

        return this;
    };

    /**
     * Returns if the *fake* brush is shown.
     * This is regardless of if the brush cursor is rendered using the
     * background image, or as a native cursor.
     *
     * If the fake brush is shown, then a standard url, which is not calculated
     * by the brush cursor, will be in use. For example, the zoom cursor, or
     * the standard cursor icon.
     */
    BrushCursor.prototype.isShown = function() {
        return ! this.isHidden ;
    };

    BrushCursor.prototype.setCircle = function( size ) {
        return this.setShape( BRUSH_RENDER_FUNCTIONS.CIRCLE, size );
    }

    BrushCursor.prototype.setSquare = function( size ) {
        return this.setShape( BRUSH_RENDER_FUNCTIONS.SQUARE, size );
    };

    /**
     * Sets the shape, a second time.
     */
    BrushCursor.prototype.setShape = function( render, size ) {
        if ( ! render ) {
            throw new Error( "undefined brush render given" );
        }

        this.shape = render;
        this.size = size;

        var zoom = this.zoom;

        var newSize = Math.max( (size*zoom) | 0, 1 );
        if ( newSize <= BRUSH_CURSOR_MINIMUM_SIZE ) {
            newSize = BRUSH_CURSOR_MINIMUM_SIZE;
        }

        this.renderShape( render, newSize );

        return this;
    };

    BrushCursor.prototype.renderShape = function( render, newSize ) {
        if ( render !== nil ) {
            this.zoomSize = newSize;
            this.shape = render;

            if ( ! this.isHidden ) {
                var self = this;

                // draws a cross hair
                if ( newSize <= BRUSH_CURSOR_MINIMUM_SIZE ) {
                    self.setCrosshair();
                } else {
                    var canvas = self.canvas,
                        ctx = canvas.getContext( '2d' ),
                        canvasSize  = newSize + BRUSH_CURSOR_PADDING;

                    canvas.width = canvas.height = canvasSize;

                    ctx.beginPath();
                    ctx.lineCap   = 'round';
                    ctx.lineWidth = 1;

                    this.shape( ctx, canvas, newSize );

                    var middle = canvas.width/2;

                    // draw a dot in the centre
                    ctx.beginPath();

                    ctx.strokeStyle = '#fff';
                    ctx.globalAlpha = 0.9;
                    ctx.strokeRect( middle-0.75, middle-0.75, 1.5, 1.5 );

                    ctx.strokeStyle = '#000';
                    ctx.globalAlpha = 0.6;
                    ctx.strokeRect( middle-0.5 , middle-0.5 , 1  , 1   );

                    self.cursor.setCursorURL( canvas.toDataURL(), canvas.width );
                }
            }
        }
    };

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
    BrushCursor.prototype.setZoom = function( zoom, refresh ) {
        this.zoom = zoom;

        if ( this.shape && refresh !== false ) {
            this.setShape( this.shape, this.size );
        }

        return this;
    };

    BrushCursor.prototype.setCommandCursor = function( painter, command ) {
        var cursor = command.getCursor();

        if ( ! cursor ) {
            this.cursor.setBlankCursor();
        } else if ( typeof cursor === 'string' ) {
            this.cursor.setClass( cursor );
        } else {
            cursor.call( command, this, painter );
        }

        return this;
    }

    BrushCursor.prototype.setClass = function( klass ) {
        this.cursor.setClass( klass );
        this.shape = nil;

        return this;
    }

    /**
     * Handles translating the cursor urls to a new location.
     *
     * Note that this is not always in use, and so is optional.
     */
    var CursorLocationChanger = function( imageLocation ) {
        var stylesheet = document.createElement('style');
        document.getElementsByTagName('head')[0].appendChild( stylesheet );

        /*
         * Safari needs something, anything, appended to the style sheet for it to append.
         * IE however doesn't like this.
         * 
         * FF and Chrome are too busy conoodling to care,
         * whilst Opera is sulking on it's own in the corner as usual.
         */
        if ( ! $.browser.msie ) {
            stylesheet.appendChild( document.createTextNode('') );
        }

        this.stylesheet = document.styleSheets[ document.styleSheets.length-1 ];
        this.seenClasses = {};
        this.cursorUrl = 'url(' + imageLocation + 'cursors/';
    };

    CursorLocationChanger.prototype.getStylesheet = function() {
        return this.stylesheet;
    };

    CursorLocationChanger.prototype.relocateCursor = function( klass ) {
        if ( this.seenClasses[ klass ] === undefined ) {
            this.seenClasses[klass] = true;

            var testDiv = $('<div>').
                    addClass( klass ).
                    css('display', 'none');

            // cursor is only applied when the div is appended
            $('body').append( testDiv );
            var cursor = testDiv.css( 'cursor' );
            testDiv.remove();

            if ( isUrlRule(cursor) ) {
                this.getStylesheet().insertRule( this.generateCursorRule(klass, cursor), 0 );            
            }
        }
    };

    CursorLocationChanger.prototype.generateCursorRule = function( klass, cursor ) {
        var newCursor = cursor.
                replace( /"/g, '' ).
                replace( /\burl\((.*\/)?/, this.cursorUrl );

        return '.' + klass + '{ cursor: ' + newCursor + ' !important; }';
    };

    /*
     * SkyBrush helper functions.
     * They are essentially private methods.
     */

    var processDrag = function( self, fun, ev ) {
        if ( fun ) {
            var loc = self.canvas.translateLocation( ev );
            fun( ev, loc.left, loc.top );

            ev.preventDefault();

            return true;
        } else {
            return false;
        }
    }

    var processCommand = function( self, name, ev ) {
        var fun = self.command[name];

        if ( fun !== undefined ) {
            var loc = self.canvas.translateLocation( ev );

            self.command[name]( self.canvas, loc.left, loc.top, self, ev );
        }
    };

    /**
     * The main entry point for creating a new SkyBrush
     * application. It works by taking a HTML DOM element, and
     * then filling this with all the bits used in SkyBrush.
     * 
     * This includes the top bar, the viewport, the canvas,
     * the GUI tools, and so on.
     * 
     * This SkyBrush object can then be used for interacting
     * with the SkyBrush application. For example setting an
     * image, creating a new blank image, or getting out what
     * has been painted so far.
     * 
     * = DOM =
     * 
     * When the app is created, SkyBrush will append all it's items
     * into the given stub. This means that SkyBrush will not replace
     * it, and will use this HTML element as the basis for SkyBrush.
     * 
     * This DOM object should ideally be a div, and this is
     * presumed for any examples provided.
     * 
     * The class 'skybrush' will also be added to the object,
     * if it does not have this class already.
     * 
     * If no DOM is provided, then it will search for a HTML
     * element with the class 'skybrush', and attempt to use
     * this instead. If that fails, an error is thrown. : (
     * 
     * = Options =
     * 
     * This is an optional JSON-style object. Essentially
     * there are lots of optional parameters, and more might
     * be added in the future. So this is used to wrap all of
     * that up in one place.
     * 
     * Options include:
     * 
     *  image_location: the url for where the images are found.
     *  grab_ctrl_r: pass in false to not grab ctrl+r
     *  
     *  width:  The starting width of the canvas, if not provided,
     *          a default width is used.
     *  height: The starting height of the canvas in SkyBrush,
     *          and if not provided, an initial one is used.
     *  
     *  callback: a function which is called in the future,
     *            after this is all setup.
     * 
     * Note that for iamge and cursor loctaions, if a relative
     * location is provided, then it is relative to this file.
     * 
     * = Example Usage =
     * 
     * Crate a SkyBrush painting app, with a blank image 320x240.
     * 
     *     <div class="skybrush"></div>
     * 
     *     var app = new SkyBrush( $('.skybrush') );
     *     app.newImage( 320, 240 );
     * 
     * Create SkyBrush, but images and cursors are located at
     * a different location to the skybrush folder.
     * 
     *     <div class="skybrush"></div>
     * 
     *     var app = new SkyBrush( $('.skybrush'), {
     *             image_location : '/images/skybrush'
     *     } );
     *     app.newImage( 320, 240 );
     * 
     * @constructor
         * @public
     * @param dom The dom element to be converted into SkyBrush.
     * @param options Optional, extra parameters you can pass in to change stuff.
     */
    /*
     * This is the core of SkyBrush, and what the outside world sees.
     *
     * It does lots of stuff.
     *
     * It's first task is to build the SkyBrush app, replacing the SkyBrush
     * stub that is given with it's own SkyBrush system.
     *
     * Next there is a GUI handling system, where it can hold the overlay
     * dialogs. This SkyBrush handles the dragging movement for the GUI's,
     * in order to ensure that dragging a GUI across the canvas does not
     * draw underneath.
     *
     * It also handles the drawing commands. This includes abstracting away
     * the zoom, and giving it the correct context to work out.
     *
     * The core of SkyBrush is a three part event loop: mousedown, mousemove and mouseup.
     * The mousedown (or anything called just before it) will dictate what that,
     * and the following two events, do when they are called.
     *
     * This includes handling dragging of the GUI's, painting to the canvas,
     * or even ignoring input.
     */
    var SkyBrush = function( container, options ) {
        initializeJQuery();

        if ( ! container ) {
            if ( arguments.length === 0 ) {
                throw new Error( 'no dom value provided' );
            } else {
                throw new Error( 'invalid dom value given' );
            }
        }
        if ( (container instanceof String) || (typeof container) == 'string' ) {
            var containerObj = $( container );

            if ( containerObj.size() === 0 ) {
                throw new Error( 'HTML element not found: \'' + container + '\'' );
            } else {
                container = containerObj;
            }
        } else {
            if ( ! container.jquery ) {
                container = $( container );
            }
            
            if ( container.size() === 0 ) {
                throw new Error( 'no dom object given for skybrush to wrap' );
            }
        }

        /*
         * Turn options into an empty object if not provided,
         * this makes the options checking much simpler.
         */
        if ( ! options ) {
            options = {};
        }

        container.empty();
        container.ensureClass( 'skybrush' );

        if ( $.browser.msie ) {
            container.addClass( 'msie' );
        } else if ( $.browser.webkit ) {
            container.addClass( 'webkit' );
        } else if ( $.browser.mozilla ) {
            container.addClass( 'mozilla' );
        } else if ( $.browser.opera ) {
            container.addClass( 'opera' );
        }

        if ( $.browser.iOS ) {
            container.ensureClass( 'sb_ios' );
        }

        if ( DISABLE_CONTEXT_MENU ) {
            container.bind( 'contextmenu', function(ev) {
                return false;
            } );
        }

        // create the basic SkyBrush layout
        var dom = $(
                '<div class="skybrush_container">' +
                    '<div class="skybrush_wrap">' +
                        '<div class="skybrush_viewport">' +
                            '<div class="skybrush_viewport_zoom"></div>' +
                            '<div class="skybrush_viewport_content"></div>' +
                        '</div>' +
                        '<div class="skybrush_gui_pane">' +
                            '<div class="skybrush_gui_pane_scroll">' +
                                '<div class="skybrush_gui_pane_content">' +
                                    '<div class="skybrush_gui_header_bar"></div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>'
        );

        container.append( dom );

        var $canvas = dom.find('canvas.skybrush_canvas_draw'),
            _this = this,
            canvas, ctx;

        _this.dom = dom;
        _this.guiPane  = _this.dom.find( '.skybrush_gui_pane' );
        _this.guiDom   = _this.guiPane.find( '.skybrush_gui_pane_content' );
        _this.viewport = _this.dom.find( '.skybrush_viewport_content' ).
                dblclick( function(ev) {
                    ev.stopPropagation();
                    ev.preventDefault();
                } ).
                on( 'DOMMouseScroll mousewheel wheel', function(ev) {
                    if ( ev.shiftKey ) {
                        var scrollDir = ev.originalEvent.wheelDelta;

                        if ( scrollDir < 0 ) {
                            _this.zoomOut();
                        } else if ( scrollDir > 0 ) {
                            _this.zoomIn();
                        }

                        ev.stopPropagation();
                        ev.preventDefault();
                    }
                } );

        _this.events = new events.Handler( _this );
        _this.canvas = new CanvasManager( _this.viewport, _this );

        _this.keysEnabled = true;

        // initialized laterz
        _this.command = nil;

        _this.isDraggingFlag = false;
        _this.dragging = {
                onMove: undefined,
                onEnd: undefined
        };

        // state flags
        _this.isPainting  = false;

        // A flag for skipping either 'shift' or 'alt' events,
        // so only one of them is ever active at any time.
        _this.shiftOrAltSkip = nil;
        _this.isShiftDownFlag = false;
        _this.isAltDownFlag = false;

        var allCommands = newCommands();

        /*
         * Pull out the colour picker command,
         * as we treat is seperately.
         */
        var pickerCommand = nil;
        for ( var i = 0; i < allCommands.length; i++ ) {
            var command = allCommands[i];

            if ( command.getName().toLowerCase() === 'picker' ) {
                allCommands.splice( i, 1 );
                pickerCommand = command;

                break;
            }
        }

        /**
         * An array of all commands objects used by SkyBrush.
         *
         * @const
         */
        _this.commands = allCommands;
        _this.pickerCommand = pickerCommand;

        var zoomLabel = dom.find( '.skybrush_viewport_zoom' );

        initializeMainButtons( _this, dom.find('.skybrush_gui_pane'), pickerCommand );
        initializeColors( _this );
        initializeCommands( _this, allCommands, pickerCommand );
        initializeSettings( _this );
        initializeShortcuts( _this, (options.grab_ctrl_r === false) );

        _this.infoBar = new InfoBar( dom );

        var cursorTranslator = nil;
        /*
         * Deal with the image translation options.
         * 
         * This involves trying to do it in one, right now,
         * and otherwise having it setup to do it over time.
         */
        if ( options.image_location ) {
            var imageLocation = translateImageLocation( options.image_location );

            /*
             * Try to relocate image/cursor rules in teh stylesheets, and if that fails,
             * do it manually as needed.
             */
            var success = relocateStylesheetImages( imageLocation );
            if ( ! success ) {
                relocateImagesLater( imageLocation, dom.get(0) );
                cursorTranslator = new CursorLocationChanger( imageLocation );
            }
        }

        _this.brushCursor = new BrushCursor( _this, _this.viewport, IS_TOUCH, cursorTranslator );

        _this.onSetCommand( function() {
            this.refreshCursor();
        });

        // update the cursor on zoom
        _this.onZoom( function(zoom) {
            this.brushCursor.setZoom( zoom );
            this.refreshCursor();

            zoom *= 100;

            /*
             * check for a decimal place, and if it's there,
             * remove the excess decimal places.
             */
            if ( (zoom|0) !== zoom ) {
                zoom = zoom.toFixed(1);
            }

            zoomLabel.text( zoom + '%' );
            zoomLabel.ensureClass('sb_show');
            setTimeout( function() {
                zoomLabel.removeClass( 'sb_show' );
            }, 120 );
        } );

        /* ## GUI related events ## */

        /* Handle GUI dragging. */
        $(document).
                bind('vmousedown', function(ev) { return _this.runMouseDown(ev); }).
                bind('vmousemove', function(ev) { return _this.runMouseMove(ev); }).
                bind('vmouseup'  , function(ev) { return _this.runMouseUp(ev)  ; });

        var startingWidth  = options.width  || DEFAULT_WIDTH,
            startingHeight = options.height || DEFAULT_HEIGHT;

        var defaultCommand = _this.getCommand( DEFAULT_COMMAND ) || _this.commands[1] ;

        // Finally, set defaults
        _this.setSize( startingWidth, startingHeight ).
                setZoom( DEFAULT_ZOOM, undefined, undefined, true ).
                setColor( DEFAULT_COLOR ).
                setAlpha( DEFAULT_ALPHA ).
                setCommand( defaultCommand );

        _this.canvas.resetUndoRedo();

        /* Resize only seems to work on Window, not on the Viewport or SkyBrush */
        $(window).resize( function() {
            _this.events.run( 'resize' );
        } );

        // cancel alt/shift down when we alt-tab
        $(window).blur( function() {
            _this.runOnShift( false );
            _this.runOnAlt( false );
        })

        if ( options.callback ) {
            setTimeout( function() {
                options.callback( _this );
            }, 0 );
        }
    };

    /**
     * Adds an event to the resize handling.
     */
    SkyBrush.prototype.onResize = function( fun ) {
        this.events.add( 'resize', fun );
    };

    /**
     * Gives you a simple way to add ctrl/Mac-command bound key
     * shortcuts.
     *
     * Key describes the key being pressed (such as 'z' or 'r')
     * when a meta key is also pressed. If that happens, then
     * 'fun' will be run.
     */
    SkyBrush.prototype.onCtrl = function( key, fun ) {
        var _this = this;

        if ( !(fun instanceof Function) || (typeof fun !== 'function') ) {
            throw new Error("Function expected for 'onCtrl'");
        }

        if ( typeof key === 'string' ) {
            key = key.toLowerCase();
        }

        return _this.onKeyInteraction( nil, function(ev) {
            if (
                    ( ev.ctrlKey || ev.metaKey ) && (
                            (typeof key === 'number' && key === ev.keyCode) ||
                            (typeof key === 'string' && key === String.fromCharCode(ev.keyCode).toLowerCase())
                    )
            ) {
                fun.call( _this, ev );

                return false;
            }
        } );
    };

    /**
     * Work modes include dragging GUI components and painting
     * to the canvas.
     *
     * @return True if this SkyBrush is in any work mode.
     */
    SkyBrush.prototype.isBusy = function() {
        return this.isDragging() || this.isPainting;
    };

    /**
     * Sometimes it can be difficult getting SkyBrush to ignore key shortcuts,
     * when visually it's not visible.
     *
     * This allows you to just turn the shortcuts on/off, as you see fit.
     * When they are disabled, no events or setup is lost, it's simply that
     * the current events don't fire.
     *
     * By default, keys are enabled.
     *
     * @param enabled True to enable, false to disable.
     * @return This SkyBrush instance.
     */
    SkyBrush.prototype.setKeysEnabled = function(enabled) {
        this.keysEnabled = enabled;

        return this;
    };

    /**
     * @return True if keys are enabled, false if not.
     */
    SkyBrush.prototype.isKeysEnabled = function() {
        return this.keysEnabled;
    };

    /**
     * Binds a key shortcut to be called.
     *
     * Can be called in one of two ways, first:
     *
     *     skybrush.onKey( 'a', function(ev) { ... } )
     *
     * Where you just state the key to bind to, and pass in a
     * function to run when it is hit.
     *
     * Alternatively:
     *
     *     skybrush.onKey( 'keydown', 'a', function(ev) { ... } )
     *
     * Where the first parameter is the name of the key event
     * to hang off, this should be 'keydown', 'keyup' or
     * 'keypressed'.
     *
     * The key given can be a character, such as 'x', 'a', and
     * so on, or a number (such as shift).
     *
     * This only fires if the ctrl or meta key is not pressed!
     * For attaching to those, use the 'onCtrl' method.
     *
     * @return This SkyBrush instance (for method chaining).
     */
    SkyBrush.prototype.onKey = function( a, b, c ) {
        var event, key, callback;

        // work out hte parameters
        if ( c !== undefined ) {
            event = a;
            key = b;
            callback = c;
        } else {
            event = nil;
            key = a;
            callback = b;
        }

        if ( typeof key === 'string' || key instanceof String ) {
            key = key.toLowerCase();
        }

        var _this = this,
            callbackWrap = function(ev) {
                var evKey = ( typeof key === 'number' ) ?
                        ev.keyCode :
                        String.fromCharCode(ev.keyCode).toLowerCase();

                if ( !(ev.ctrlKey || ev.metaKey) && evKey == key ) {
                    callback.call( _this, ev );

                    return false;
                } else {
                    return undefined;
                }
            };

        return this.onKeyInteraction( event, callbackWrap );
    };

    /**
     * Same as 'onKey', on this binds to both key up and down.
     * When the key goes up, true is passed in as the first
     * parameter, and false when it goes down.
     *
     * This is for things like shift, or alt, so you can be
     * called when they go up or down.
     *
     * Usage:
     *
     *      skybrush.onKeyToggle( 'a', function(isADown, ev) {
     *          // code here
     *      } );
     *
     * The above example will be called when 'a' is pressed
     * down, and then again when it is released.
     *
     * Key can be a character, such as 'a', or a number for
     * the key code.
     *
     * @param key The key to listen on.
     * @param callback A function to run when the key is down or up.
     * @return This SkyBrush instance.
     */
    SkyBrush.prototype.onKeyToggle = function( key, callback ) {
        return this.
                onKey( 'keydown', key, function(ev) {
                    callback.call( this, true, ev );
                } ).
                onKey( 'keyup', key, function(ev) {
                    callback.call( this, false, ev );
                } );
    };

    /**
     * This is the general purpose key shortcut binding method.
     * For most cases, you should use 'onKey' or 'onCtrl'.
     * This method exists for them; to avoid code repetition.
     *
     * You are given the event that occurres directly,
     * and so you can better decide how to handle it.
     *
     * The given event must return 'false' if it has found the
     * key it should be run on, in order to stop key event processing.
     *
     * @param event The type of key event, defaults to 'keydown' if null or undefined.
     * @param fun The callback to run on key input.
     * @return This SkyBrush instance (for method chaining).
     */
    SkyBrush.prototype.onKeyInteraction = function( event, fun ) {
        if ( ! event ) {
            event = 'keydown';
        }

        var _this = this;

        $(document)[event]( function(ev) {
            if (
                    ! _this.isBusy()                    &&
                      _this.keysEnabled                 &&
                      _this.dom.is( ':visible' )        &&
                    ! $(ev.target).is( 'input' )        &&
                      fun.call(_this, ev) === false
            ) {
                ev.preventDefault();
                ev.stopPropagation();

                return false;
            } else {
                return undefined;
            }
        } );

        return _this;
    };

    SkyBrush.prototype.getInfoBar = function() {
        return this.infoBar;
    };

    /*
     * Private functions used by the SkyBrush.
     */

    var NOT_ALPHA_NUMERIC_LOWER = /[^a-z0-9_]+/g;

    var newButton = function() {
        var dom = document.createElement( 'a' );
        dom.setAttribute( 'href', '#' );
        var $dom = $(dom);

        var text  = '',
            klass = '';

        var expectText = true;

        var i = 0;
        for ( i = 0; i < arguments.length; i++ ) {
            var arg = arguments[i];

            if ( typeof arg === 'function' ) {
                $dom.vclick( arg );
            } else if ( expectText ) {
                dom.innerHTML = text = arg;
                expectText = false;
            } else {
                klass += ' ' + arg;
            }
        }

        if ( text !== '' ) {
            var left  = 0,
                right = text.length;

            for ( ; left < right; left++ ) {
                var c = text.charCodeAt( left );

                if (
                         c === 95 ||
                        (c >= 65 && c <=  90) ||
                        (c >= 97 && c <= 122) ||
                        (c >= 48 && c <=  57)
                ) {
                    break;
                }
            }
            
            while ( right --> left ) {
                var c = text.charCodeAt( right );

                if (
                         c === 95 ||
                        (c >= 65 && c <=  90) ||
                        (c >= 97 && c <= 122) ||
                        (c >= 48 && c <=  57)
                ) {
                    break;
                }
            }

            if ( (right-left) > 0 ) {
                klass += ' sb_' + text.
                        substring( left, right+1 ).
                        toLowerCase().
                        replace( NOT_ALPHA_NUMERIC_LOWER, '_' );
            }
        }

        dom.className = klass;

        return $dom.killEvent( 'click', 'leftdown' );
    }

    var initializeMainButtons = function( painter, wrap, pickerCommand ) {
        var undoButton = newButton('Undo', 'skybrush_header_button', 'sb_disabled',
                function() {
                    if ( ! $(this).hasClass('sb_disabled') ) {
                        painter.undo();
                    }
                }
            ),
            redoButton = newButton('Redo', 'skybrush_header_button', 'sb_disabled',
                function() {
                    painter.getInfoBar().hide();

                    if ( ! $(this).hasClass('sb_disabled') ) {
                        painter.redo();
                    }
                }
            );

        undoButton.attr( 'title', 'Undo | shortcut: ctrl+z' );
        redoButton.attr( 'title', 'Redo | shortcut: ctrl+r or ctrl+y' );

        var updateUndoRedo = function() {
            if ( painter.hasUndo() ) {
                undoButton.removeClass('sb_disabled');
            } else {
                undoButton.ensureClass('sb_disabled');
            }

            if ( painter.hasRedo() ) {
                redoButton.removeClass('sb_disabled');
            } else {
                redoButton.ensureClass('sb_disabled');
            }
        };

        painter.
                onUndo( updateUndoRedo ).
                onRedo( updateUndoRedo ).
                onDraw( updateUndoRedo );


        /*
         * Open / Close toggle
         */

        var openToggle = $a(
                        '<div class="skybrush_open_toggle_text">^^</div>',
                        'skybrush_header_button',
                        'skybrush_open_toggle'
                ).
                leftclick( function(ev) {
                    ev.preventDefault();
                    ev.stopPropagation();

                    painter.toggleGUIPane();
                });

        /*
         * Zoom In / Out
         */

        var zoomIn = newButton('+', 'sb_zoom_in', 'skybrush_header_button',
                function() {
                    painter.zoomIn();
                }
            ),
            zoomOut = newButton('-', 'sb_zoom_out', 'skybrush_header_button',
                function() {
                    painter.zoomOut();
                }
            );

         zoomIn.attr( 'title', 'Zoom In | shortcut: ctrl+='  );
        zoomOut.attr( 'title', 'Zoom Out | shortcut: ctrl+-' );

        /*
         * Copy + Paste
         */

        var copy = newButton('Copy', 'skybrush_button', 'sb_disabled', 'sb_absolute',
                    function() {
                        painter.getInfoBar().hide();

                        if ( ! $(this).hasClass('sb_disabled') ) {
                            painter.copy();
                        }
                    } ),
            cut = newButton( 'Cut', 'skybrush_button', 'sb_disabled', 'sb_absolute',
                    function() {
                        painter.getInfoBar().hide();

                        if ( ! $(this).hasClass('sb_disabled') ) {
                            painter.cut();
                        }
                    } ),
            paste = newButton('Paste', 'skybrush_button', 'sb_disabled', 'sb_absolute',
                    function() {
                        painter.getInfoBar().hide();

                        if ( ! $(this).hasClass('sb_disabled') ) {
                            painter.paste();
                        }
                    } );

         copy.attr( 'title', 'Copy Selection | shortcut: ctrl+c' );
          cut.attr( 'title', 'Cut Selection | shortcut: ctrl+x' );
        paste.attr( 'title', 'Paste Selection | shortcut: ctrl+v' );

        painter.getCanvas().
                onClip( function(clippingArea) {
                    if ( clippingArea !== nil ) {
                        copy.removeClass('sb_disabled');
                         cut.removeClass('sb_disabled');
                    } else {
                        copy.ensureClass('sb_disabled');
                         cut.ensureClass('sb_disabled');
                    }
                } ).
                onCopy( function() {
                    paste.removeClass( 'sb_disabled' );
                } );

        var copyButtons = $('<div>').addClass('skybrush_topbar_button_group').
                 append( copy ).
                 append( cut ).
                 append( paste );

        /*
         * The current colour icon, and colour picker 
         */

        var currentColorBack = document.createElement('div');
        currentColorBack.className = 'skybrush_color_picker_current_color_back';

        var currentColorShow = document.createElement('div');
        currentColorShow.className = 'skybrush_color_picker_current_color';

        painter.onSetColor( function(strCol) {
            currentColorShow.style.background = strCol;
        } );

        painter.onSetAlpha( function(alpha) {
            currentColorShow.style.opacity = alpha;
        } );

        // colour picker
        var pickerCommandBack = document.createElement( 'div' );
        pickerCommandBack.className = 'skybrush_command_back';

        var picker = document.createElement('div');
        picker.className = 'skybrush_gui_command ' + pickerCommand.getCSS();
        picker.appendChild( pickerCommandBack );
        picker.appendChild(
                $a( '' ).
                        attr( 'title', pickerCommand.getCaption() ).
                        click( function(ev) {
                                painter.setCommand( pickerCommand );

                                ev.preventDefault();
                                ev.stopPropagation();
                        }).
                        get(0)
        );
        picker.__command = pickerCommand;

        painter.onSetCommand( function( command ) {
            if ( command === picker.__command ) {
                picker.classList.add( 'sb_selected' );
            } else {
                picker.classList.remove( 'sb_selected' );
            }
        } );

        // colour info wrap
        
        var colourInfo = document.createElement('div');
        colourInfo.className = 'skybrush_colour_info';

        colourInfo.appendChild( currentColorBack );
        colourInfo.appendChild( currentColorShow );
        colourInfo.appendChild( picker );

        /* finally, put it all togther */

        /*
         * This is a special gui, more special than the others,
         * so he gets put aside on his own, to watch over toggling the panel
         * open.
         */
        var gui = new GUI([ openToggle, zoomOut, zoomIn, undoButton, redoButton ], 'main', false ).
                setParent( painter ).
                addContent( copyButtons, colourInfo );

        wrap.append( gui.dom );
    }

    /**
     * Sets up the 'Canvas' GUI pane,
     * which has options like resize, scale, grid,
     * clear, and crop.
     */
    var initializeSettings = function( painter ) {

        /*
         * Resize & Scale 
         */

        var infoOption = function( name, onSuccess, extraComponents ) {
            var isConstrained = false;

            return newButton(name, 'skybrush_button',  'sb_absolute',
                    function() {
                        var width  = painter.getCanvas().getWidth(),
                            height = painter.getCanvas().getHeight();

                        var widthInput  = $('<input type="number" value="' + width  + '">').
                                    addClass( 'sb_width' ),
                            heightInput = $('<input type="number" value="' + height + '">').
                                    addClass( 'sb_height' ),
                            constrain = $('<input type="checkbox">').
                                    addClass( 'constrain' );

                        constrain.prop( 'checked', isConstrained );

                        /* Update the width/height in the other
                         *  input, when the value changes in this one,
                         *  if we're using 'constrain proportions'.
                         */
                        widthInput.keydown( function() {
                            var $this = $(this);

                            /* setTimeout is used because the input.val is
                             * only updated after this has fully bubbled up.
                             * So we run the code straight after.
                             */
                            if ( constrain.is(':checked') ) {
                                setTimeout( function() {
                                    var w = $this.val();

                                    if ( ! isNaN(w) && w > 0 ) {
                                        heightInput.val(
                                                Math.round(height * (w/width))
                                        );
                                    }
                                }, 1 );
                            }
                        } );
                        heightInput.keydown( function() {
                            var $this = $(this);

                            if ( constrain.is(':checked') ) {
                                setTimeout( function() {
                                    var h = $this.val();

                                    if ( ! isNaN(h) && h > 0 ) {
                                        widthInput.val(
                                                Math.round(width * (h/height))
                                        );
                                    }
                                }, 1 );
                            }
                        } );

                        /*
                         * Reset the width/height when the user
                         * turns the constrain property on.
                         */
                        constrain.change( function() {
                            isConstrained = $(this).is(':checked');

                            if ( isConstrained ) {
                                widthInput.val( width );
                                heightInput.val( height );
                            }
                        } );

                        /*
                         * This funky bit of syntax first creates an empty
                         * jQuery collection (the $()), and then adds to
                         * DOM elements to it.
                         *
                         * This allows us to operate on both width and height.
                         * Just imagine it being like: [ widthInput, heightInput ].
                         */
                        $().add( widthInput ).add( heightInput ).
                                attr( 'maxlength', 5 ).
                                forceNumeric( false );

                        var form = $('<form>');
                        form.submit( function(ev) {
                            ev.preventDefault();

                            var $content = painter.getInfoBar().getContent();

                            onSuccess.call(
                                    this,
                                    $content.find( '.sb_width'  ).val(),
                                    $content.find( '.sb_height' ).val()
                            );

                            painter.getInfoBar().hide();
                        } );

                        var okButton = $('<input>').
                                attr( 'type', 'submit' ).
                                killEvent( 'click', 'mousedown' ).
                                val( 'ok' ).
                                click( function() {
                                    form.submit();
                                } );

                        form.
                                append( $('<div>Width:</div>').addClass( 'skybrush_info_label' ) ).
                                append( widthInput ).
                                append( $('<div>Height:</div>').addClass( 'skybrush_info_label' ) ).
                                append( heightInput ).
                                append( $('<div>Relative</div>').addClass( 'skybrush_info_label' ) ).
                                append( constrain );

                        if ( extraComponents ) {
                            extraComponents(form);
                        }

                        form.append( okButton );

                        painter.getInfoBar().
                                setContent( form ).
                                show( $(this) );
                    });
        };

        var resize = infoOption(
                'Canvas Size',
                function( w, h ) {
                    painter.resize( w, h );
                }
        );

        var isSmooth = false;
        var scale = infoOption(
                'Image Size',
                function( w, h ) {
                    painter.scale( w, h, $(this).find('input.smooth').is(':checked') );
                },
                function( form ) {
                    var smooth = $('<input type="checkbox">').addClass('smooth');

                    smooth.prop( 'checked', isSmooth );
                    smooth.change( function() {
                        isSmooth = $(this).is(':checked');
                    } );

                    form.
                            append( $('<div>Smooth</div>').addClass('skybrush_info_label') ).
                            append( smooth );
                }
        );

        var grid = newButton( 'Grid', 'skybrush_button', 'sb_absolute',
                function(ev) {
                    var grid = painter.getCanvas().getGrid(),
                        width = $('<input>'),
                            height = $('<input>');

                    width.val( grid.getWidth() );
                    height.val( grid.getHeight() );

                    var updateSize = function() {
                        setTimeout( function() {
                            grid.setSize(
                                    width.val(),
                                    height.val()
                            );
                        }, 1 );
                    };

                    $().add( width ).add( height ).
                            forceNumeric( false ).
                            attr( 'type', 'number' ).
                            keypress( updateSize ).
                            click( updateSize ).
                            change( updateSize );

                    var offsetX = $('<input>'),
                        offsetY = $('<input>');

                    offsetX.val( grid.getOffsetX() );
                    offsetY.val( grid.getOffsetY() );

                    var updateOffset = function() {
                        setTimeout( function() {
                                grid.setOffset(
                                        offsetX.val(),
                                        offsetY.val()
                                );
                        }, 1 );
                    };

                    $().add( offsetX ).add( offsetY ).
                            forceNumeric( false ).
                            attr( 'type', 'number' ).

                    keypress( updateOffset ).
                    click( updateOffset ).
                    change( updateOffset );

                    var show = $('<input>').
                            attr( 'type', 'checkbox' ).
                            change( function() {
                                if ( $(this).is(':checked') ) {
                                    grid.show();
                                } else {
                                    grid.hide();
                                }
                            } );
                    if ( grid.isShown() ) {
                        show.attr('checked', 'checked');
                    }

                    painter.getInfoBar().setContent(
                            $('<div>Width:</div>').addClass( 'skybrush_info_label' ),
                            width,
                            $('<div>Height:</div>').addClass( 'skybrush_info_label' ),
                            height,

                            $('<div>X Offset:</div>').addClass( 'skybrush_info_label' ),
                            offsetX,
                            $('<div>Y Offset:</div>').addClass( 'skybrush_info_label' ),
                            offsetY,

                            $('<div>Show</div>').addClass( 'skybrush_info_label' ),
                            show
                    ).show( $(this) );
                }
        );

        /* Clear Canvas */
        var crop = newButton('Crop', 'skybrush_button', 'sb_absolute',
                function() {
                    painter.getInfoBar().hide();

                    painter.getCanvas().crop();
                }
        );
        crop.attr( 'title', 'Crop Image, ctrl+e' );

        var clear = newButton('Clear', 'skybrush_button', 'sb_absolute',
                function() {
                    painter.getInfoBar().hide();

                    if ( ! $(this).hasClass('sb_disabled') ) {
                        painter.getCanvas().clear();
                    }
                }
        );
        clear.attr( 'title', 'Clear Image, delete' );

        var commonControls = $('<div>').
                addClass( 'skybrush_topbar_button_group' ).
                append( resize ).
                append( scale ).
                append( grid ).
                append( clear ).
                append( crop );

        var gui = new GUI( 'Canvas', 'canvas' ).
                addContent( resize, scale, grid, clear, crop );

        painter.addGUI( gui );
    };


    /**
     * Sets up the colour GUI in the SkyBrush.
     */
    var initializeColors = function( painter, pickerCommand ) {

        /*
         * Colour Palette
         *
         * As a small optimization, this builds the palette out of HTML, and
         * then just turns it into a dom in one.
         *
         * There is also *one* click handler, to handle all of the colours.
         */

        var colorsHTML = '';
        for ( var i = 0; i < DEFAULT_COLORS.length; i++ ) {
            var col = DEFAULT_COLORS[i];

            colorsHTML +=
                    '<a href="#" ' +
                        'class="skybrush_colors_palette_color' + ( ! $.support.touch ? ' sb_hover_border' : '' ) + '" ' +
                        'data-color="' + col + '" ' +
                        'style="background:' + col + '"' +
                    '>' +
                        '<div class="skybrush_colors_palette_color_border"></div>' +
                    '</a>';
        }

        var colorsDom = document.createElement( 'div' );
        colorsDom.className = 'skybrush_colors_palette';
        colorsDom.innerHTML = colorsHTML;

        var colors = $( colorsDom ).
                killEvent( 'click', 'mousedown' ).
                leftclick( (function() {
                    var currentColorBorder = nil;

                    return function(ev) {
                        var target = ev.target;
                        if ( target.className === 'skybrush_colors_palette_color_border' ) {
                            target = target.parentNode;
                        }

                        var $this = $(target);

                        if ( $this.hasClass('skybrush_colors_palette_color') ) {
                            painter.setColor( $this.data('color') );

                            if ( currentColorBorder !== nil ) {
                                currentColorBorder.removeClass( 'sb_show' );
                            }

                            currentColorBorder = $this.children('.skybrush_colors_palette_color_border');
                            currentColorBorder.addClass('sb_show');
                        }
                    }
                })() );

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
        var hue, saturation, value ;

        var updateHue = function( newHue ) {
            hue = newHue;
            var strBackColor = hsvToColor( newHue, 1.0, 1.0 );

            // update the back of the mixer
            colourBack.style.borderTopColor  = 
            colourBack.style.borderLeftColor =
                    strBackColor;

            /* Update the colour wheel */

            var angleDeg = Math.round( (hue*360) - 180 );
            var rotation = 'rotate(' + angleDeg + 'deg)';

            wheelLine.css({
                    '-webkit-transform': rotation,
                     '-khtml-transform': rotation,
                       '-moz-transform': rotation,
                        '-ms-transform': rotation,
                         '-o-transform': rotation,
                            'transform': rotation
            });
        };

        var mixerSize = COLOUR_MIXER_WIDTH;

        var colourBack = document.createElement('div');
        colourBack.className = 'skybrush_color_mixer_back';

        var canvas = newCanvas( mixerSize, mixerSize ),
            ctx = canvas.ctx,
            ctxData = ctx.getImageData( 0, 0, mixerSize, mixerSize ),
            data = ctxData.data;

        // Needed for Dev versions of Chrome, or the canvas is blank when updated.
        // Also _must_ be after we get the image data out.
        // It's to get it to 'wake up' and 'work'.
        ctx.fillRect( 0, 0, 100, 100 );

        for ( var y = 0; y < mixerSize; y++ ) {
            var yP = 1 - y/mixerSize,
                mixerWidth = mixerSize-y;

            for ( var x = 0; x < mixerWidth; x++ ) {
                var i = (y*mixerSize + x) * 4,
                    xP = 1 - x/mixerSize;

                // set RGB to the same col
                data[i] = data[i + 1] = data[i + 2] =
                        ( 255*yP*xP + 0.5 ) | 0;
                data[i + 3] = ( 255*xP + 0.5 ) | 0;
            }
        }

        ctx.putImageData( ctxData, 0, 0 );

        var mixerFront = $(canvas);

        /* The Colour Wheel */

        /**
         * Converts a given differences in x and y,
         * into an angle (i.e. Math.atan2( yDiff, xDiff ) ),
         * and then into a hue of the range: 0.0 to 1.0.
         *
         * @param yDiff
         * @param xDiff
         * @return The angle as a hue.
         */
        var atan2ToHue = function( yDiff, xDiff ) {
            return (
                    Math.atan2( yDiff, xDiff ) + Math.PI
            ) / ( Math.PI*2 );
        };

        var colourWheelCanvas = newCanvas( COLOUR_WHEEL_WIDTH, COLOUR_WHEEL_WIDTH );
        var wheelCtx = colourWheelCanvas.ctx;
        var wheelData = wheelCtx.getImageData( 0, 0, COLOUR_WHEEL_WIDTH, COLOUR_WHEEL_WIDTH );

        var wheelLineDom = document.createElement('div');
        wheelLineDom.className = 'skybrush_color_wheel_line_outer';
        wheelLineDom.innerHTML = '<div class="skybrush_color_wheel_line"></div>';

        var wheelLine = $( wheelLineDom );
        data = wheelData.data;

        for ( var y = 0; y < COLOUR_WHEEL_WIDTH; y++ ) {
            for ( var x = 0; x < COLOUR_WHEEL_WIDTH; x++ ) {
                var i = (y*COLOUR_WHEEL_WIDTH + x) * 4;

                var paintHue = atan2ToHue( COLOUR_WHEEL_WIDTH/2 - y, COLOUR_WHEEL_WIDTH/2 - x );

                data[i  ] = hsvToR( paintHue, 1, 1 );
                data[i+1] = hsvToG( paintHue, 1, 1 );
                data[i+2] = hsvToB( paintHue, 1, 1 );
                data[i+3] = 255;
            }
        }

        wheelCtx.putImageData( wheelData, 0, 0 );

        var colourWheel = $( colourWheelCanvas ).
                addClass( 'skybrush_color_wheel_colour_wheel' ).
                killEvent( 'click' ).
                leftdrag( function(ev) {
                        var pos = ev.offset( colourWheel );

                        var distX = COLOUR_WHEEL_WIDTH/2 - pos.left,
                            distY = COLOUR_WHEEL_WIDTH/2 - pos.top;
                        var hypot = Math.sqrt( distX*distX + distY*distY );

                        // change the hue
                        if ( hypot <= COLOUR_WHEEL_WIDTH/2 ) {
                            hue = atan2ToHue( distY, distX );
                            painter.setColor(
                                    hsvToColor(
                                            hue,
                                            saturation,
                                            value
                                    )
                            );

                            updateHue( hue );

                            ev.preventDefault();

                        /*
                         * it's right on the edge of the colour mixer,
                         * technically inside, but visually outside.
                         * 
                         * So we send the event somewhere else.
                         */
                        } else {
                            mixerFront.trigger( ev );
                        }
                });

        wheelLine.forwardEvents( colourWheel, 'vmousemove', 'vmousedown' );

        /* Combine Colour Mixer */

        var colourWheelWrap = document.createElement('div');
        colourWheelWrap.className = 'skybrush_color_wheel_wrap';
        colourWheelWrap.appendChild( colourWheel.get(0) );
        colourWheelWrap.appendChild( wheelLine.get(0)   );

        var mixerHorizontal = $('<div>').
                    addClass( 'skybrush_mixer_horizontal_line' ).
                    forwardEvents( mixerFront, 'vmousedown', 'vmousemove' );

        var mixerVertical = $('<div>').
                    addClass( 'skybrush_mixer_vertical_line' ).
                    forwardEvents( mixerFront, 'vmousedown', 'vmousemove' );

        var mixer = document.createElement('div');
        mixer.className = 'skybrush_color_mixer';
        mixer.appendChild( colourBack               );
        mixer.appendChild( mixerFront.addClass( 'skybrush_color_mixer_color_layer' ).get(0) );
        mixer.appendChild( mixerHorizontal.get(0)   );
        mixer.appendChild( mixerVertical.get(0)     );
        mixer.appendChild( colourWheelWrap          );

        mixerFront.leftdrag(
                function(ev) {
                    var pos = ev.offset( this );

                    var x = Math.max( pos.left, 0 ),
                        y = Math.max( pos.top , 0 );

                    if (
                            x < mixerSize-y &&
                            y < mixerSize-x
                    ) {
                        value = 1 - ( y / mixerSize );
                        saturation = x / ( mixerSize - (1-value)*mixerSize );

                        painter.setColor( hsvToColor(hue, saturation, value) );
                    }

                    ev.preventDefault();
                }
        );

        /* Current Colour Info */
        
        var getVal = function( input, max ) {
            var num = input.val();

            if ( ! isNaN(num) ) {
                return Math.limit( num, 0, max );
            } else {
                return 0;
            }
        };

        var syncAlpha = function() {
            var val = getVal( $(this), 1.0 );
            painter.setAlpha( val );
        };

        /* Create the RGB lebel/inputs in the form. */
        var newInput = function( name, css, event, isDecimal, max ) {
            var label = document.createElement('div');
            label.className = 'skybrush_rgb_label';
            label.innerHTML = name;

            var input = $('<input>').
                    addClass( css ).
                    addClass('skybrush_rgb_input').
                    attr( 'type', 'number' ).
                    attr( 'maxLength', 3 ).
                    attr( 'min', 0 ).
                    attr( 'max', max ).
                    attr( 'step', isDecimal ? 0.01 : 1 ).
                    forceNumeric( isDecimal ).
                    keyup( event ).
                    blur( function(ev) {
                        $(this).val( getVal( $(this), max ) );

                        event.call( this, ev );
                    }).
                    get(0);

            var inputWrap = document.createElement( 'div' );
            inputWrap.className = 'skybrush_rgb_wrap';
            inputWrap.appendChild( label );
            inputWrap.appendChild( input );

            inputWrap.__input = input;

            return inputWrap;
        };

        var rInput,
            gInput,
            bInput;

        /**
         * Grabs the RGB values in the form,
         * and sets them as the current colour in the SkyBrush.
         *
         * This is used for when the RGB values have been altered,
         * and they need to sync those values to the SkyBrush.
         */
        var syncRGBFormToCurrentColor = function() {
            var r = getVal( rInput, 255 ),
                g = getVal( gInput, 255 ),
                b = getVal( bInput, 255 );

            painter.setColor(
                    rgbToColor( r, g, b )
            );
        };

        var rWrap = newInput( 'r', 'skybrush_rgb_r', syncRGBFormToCurrentColor, false, 255 ),
            gWrap = newInput( 'g', 'skybrush_rgb_g', syncRGBFormToCurrentColor, false, 255 ),
            bWrap = newInput( 'b', 'skybrush_rgb_b', syncRGBFormToCurrentColor, false, 255 );

        rInput = $( rWrap.__input );
        gInput = $( gWrap.__input );
        bInput = $( bWrap.__input );

        var aWrap = newInput('a', 'rgb_a', syncAlpha, true, 1.0 );
        var aInput = $( aWrap.__input );

        var rgbForm = document.createElement( 'div' );
        rgbForm.className = 'skybrush_rgb_form' ;
        rgbForm.appendChild( rWrap );
        rgbForm.appendChild( gWrap );
        rgbForm.appendChild( bWrap );
        rgbForm.appendChild( aWrap );

        /*
         * HSV Form 
         */

        var hInput,
            sInput,
            vInput;

        var syncHSVFormToCurrentColor = function() {
            // convert to 0.0 to 1.0 values
            var h = getVal( hInput, 360 ) / 360.0,
                s = getVal( sInput, 100 ) / 100.0,
                v = getVal( vInput, 100 ) / 100.0;

            painter.setColor(
                    hsvToColor( h, s, v )
            );
        };

        var hWrap = newInput( 'h', 'skybrush_rgb_h', syncHSVFormToCurrentColor, false, 360 ),
            sWrap = newInput( 's', 'skybrush_rgb_s', syncHSVFormToCurrentColor, false, 100 ),
            vWrap = newInput( 'v', 'skybrush_rgb_v', syncHSVFormToCurrentColor, false, 100 );

        hInput = $( hWrap.__input );
        sInput = $( sWrap.__input );
        vInput = $( vWrap.__input );

        var hsvForm = document.createElement( 'div' );
        hsvForm.className = 'skybrush_hsv_form' ;
        hsvForm.appendChild( hWrap );
        hsvForm.appendChild( sWrap );
        hsvForm.appendChild( vWrap );

        /* Alpha Handling */

        var alphaBarLine = $('<div>').
                addClass('skybrush_color_alpha_line');

        var alphaGradient = $('<div>').
                addClass('skybrush_color_alpha_gradient');

        var alphaBar = document.createElement('div');
        alphaBar.className = 'skybrush_color_alpha_bar';
        alphaBar.appendChild( alphaGradient.get(0) );
        alphaBar.appendChild( alphaBarLine.get(0)  );
        alphaBar.addEventListener( 'click', function(ev) {
            ev.stopPropagation();
            ev.preventDefault();

            return false;
        } );

        var alphaWrap = document.createElement('div');
        alphaWrap.className = 'skybrush_color_alpha_wrap' ;
        alphaWrap.appendChild( alphaBar );

        /* Put the GUI together */

        var currentColor = document.createElement('div');
        currentColor.className = 'skybrush_color_picker';
        currentColor.appendChild( hsvForm );
        currentColor.appendChild( rgbForm );
        currentColor.appendChild( alphaWrap );

        var paintModeLabel = document.createElement('div');
        paintModeLabel.className = 'skybrush_command_control_label';
        paintModeLabel.innerHTML = 'Paint Mode';

        var destinationAlpha = document.createElement('div');
        destinationAlpha.className = 'skybrush_destination_alpha';
        destinationAlpha.appendChild( paintModeLabel );
        destinationAlpha.appendChild(
                $('<input>').
                        attr( 'type', 'button' ).
                        addClass( 'skybrush_input_button' ).
                        val( 'Normal' ).
                        click( function(ev) {
                            var $this = $(this);
                            var mode = $this.val(),
                                c = painter.getCanvas();

                            if ( mode == 'Normal' ) {
                                mode = 'Mask';
                                c.useDestinationAlpha();
                            } else {
                                mode = 'Normal';
                                c.useBlendAlpha();
                            }

                            $this.val( mode );
                        } ).
                        get(0)
        );

        var colorGUI = new GUI( 'Palette', 'colors' ).
                addContent( newGUIBlock(currentColor, destinationAlpha) ).
                append( mixer );
        
        var swatchesGUI = new GUI( 'Swatches', 'swatches' ).
                append( colors );

        painter.addGUI( colorGUI, swatchesGUI );

        /* Now generate the alpha gradient, now the canvas has reflowed */

        var $alphaCanvas = $(newCheckerboard(
                alphaGradient.width(), 
                alphaGradient.height(),
                true
        ));

        $().add( $alphaCanvas ).add( alphaBar ).
                leftdrag( function(ev) {
                    var pos = $alphaCanvas.offset(),
                          h = $alphaCanvas.height();

                    var y = Math.limit( ev.pageY - pos.top, 0, h );
                    painter.setAlpha( y / h );

                    ev.preventDefault();
                } );
        alphaGradient.replaceWith( $alphaCanvas );

        /* Disable Selections on some components in IE */

        if ( $.browser.msie ) {
            colourWheel.bind( 'selectstart', RETURN_FALSE );
             mixerFront.bind( 'selectstart', RETURN_FALSE );

            alphaBar.addEventListener( 'selectstart', RETURN_FALSE );
        }

        /*
         * Update Callbacks for Colour and Alpha
         */

        painter.onSetColor( function(strColor) {
            // update the shown colour
            alphaBar.style.background = strColor;

            // convert #ff9933 colour into r, g, b values
            var hexStr = strColor.substring(1,7);
            var rgb = parseInt( hexStr, 16 );

            var r = (rgb >> 16) & 0xff,
                g = (rgb >>  8) & 0xff,
                b =  rgb & 0xff ;

            var hasRGBFocus =
                    rInput.is(':focus') ||
                    gInput.is(':focus') ||
                    bInput.is(':focus') ;
            var hasHSVFocus =
                    hInput.is(':focus') ||
                    sInput.is(':focus') ||
                    vInput.is(':focus') ;

            if ( ! hasRGBFocus ) {
                // and set the values
                rInput.val( r ),
                gInput.val( g ),
                bInput.val( b );
            }

            /* Update the Colour Mixer */

            // convert colour to full hue
            var hsv = rgbToHSV( r, g, b );

            // cache these for laterz
            saturation = hsv[1];
            value = hsv[2];

            if ( ! hasHSVFocus ) {
                sInput.val( Math.round(saturation * 100) );
                vInput.val( Math.round(value * 100) );
            }

            /* Update X/Y location of the overlay bars */
            var xVal = saturation, // saturation
                yVal = (1 - value); // value

            var colXWidth  = mixerSize - yVal*mixerSize,
                colYHeight = mixerSize;

            var colX = xVal * colXWidth,
                colY = yVal * colYHeight ;

            mixerVertical.
                    translate( colX, 0 ).
                    height(
                            Math.limit(
                                    (mixerSize - colX) + COLOUR_MIXER_MIN_WIDTH,
                                    COLOUR_MIXER_MIN_WIDTH,
                                    COLOUR_MIXER_WIDTH
                            )
                    );

            mixerHorizontal.
                    translate( 0, colY ).
                    width(
                            Math.limit(
                                    (mixerSize - colY) + COLOUR_MIXER_MIN_WIDTH,
                                    COLOUR_MIXER_MIN_WIDTH,
                                    COLOUR_MIXER_WIDTH
                            )
                    );

            /* Update Hue
             *
             * Skip hue update for greys (when saturation == 0), as it's always red.
             */

            if ( saturation > 0 || hue === undefined ) {
                updateHue( hsv[0] );

                if ( ! hasHSVFocus ) {
                    hInput.val( Math.round(hsv[0] * 360) );
                }
            }
        } );

        painter.onSetAlpha( function( alpha ) {
            var y = Math.floor( alpha*alphaBar.clientHeight );
            alphaBarLine.translate( 0, y );
 
            if ( ! aInput.is(':focus') ) {
                // concat alpha down to just two decimal places
                aInput.val( alpha.toFixed(2) );
            }
        } );
    };

    /**
     * Creates and sets up the Commands GUI.
     *
     * @param painter The SkyBrush application.
     */
    var initializeCommands = function( painter, commandsList, picker ) {
        var commands = document.createElement( 'div' );
        commands.className = 'skybrush_commands_pane';

        var controlsWrap = document.createElement('div');
        controlsWrap.className = 'skybrush_command_controls';

        for ( var i = 0; i < commandsList.length; i++ ) {
            var c = commandsList[i];

            var command = document.createElement( 'div' );
            command.className = 'skybrush_gui_command ' + c.css;
            command.__command = c;

            var commandBack = document.createElement( 'div' );
            commandBack.className = 'skybrush_command_back';
            command.appendChild( commandBack );

            command.appendChild( 
                    $a( '' ).
                            vclick( function(ev) {
                                ev.preventDefault();
                                ev.stopPropagation();

                                painter.setCommand( this.parentNode.__command );
                            } ).
                            attr( 'title', c.getCaption() ).
                            get( 0 )
            );

            commands.appendChild( command );

            controlsWrap.appendChild( c.createControlsDom(painter) );
        }

        controlsWrap.appendChild( picker.createControlsDom(painter) );

        var commandsGUI = new GUI( 'Tools', 'commands' ).
                append( commands );

        var commandControlsGUI = new GUI( 'Tool Settings', 'command_settings' ).
                append( controlsWrap );

        painter.addGUI( commandsGUI, commandControlsGUI );

        // hook up the selection changes directly into the SkyBrush it's self
        painter.onSetCommand( function(command, lastCommand) {
            var commandDoms = commands.getElementsByClassName( 'skybrush_gui_command' );
            for ( var i = 0; i < commandDoms.length; i++ ) {
                var commandDom = commandDoms[i];

                if ( commandDom.__command === command ) {
                    commandDom.classList.add( 'sb_selected' );
                } else if ( commandDom.classList.contains('sb_selected') ) {
                    commandDom.classList.remove( 'sb_selected' );
                }
            }

            var controls;
            if ( lastCommand !== nil ) {
                controls = lastCommand.getControlsDom();

                if ( controls !== nil ) {
                    controls.classList.remove('sb_show')
                }
            }

            controls = command.getControlsDom();
            if ( controls !== nil ) {
                controls.classList.add('sb_show')
            }
        } );
    };

    /*
     * Sets up some common shortcuts,
     * not that not all are set here, such as undo/redo.
     */
    var initializeShortcuts = function( painter, dontGrabCtrlR ) {
        var domObj = painter.dom.get(0);

        painter.onCtrl( 187, function() {
            painter.zoomIn();
        });
        painter.onCtrl( 189, function() {
            painter.zoomOut();
        });

        // make the dom focusable
        domObj.setAttribute('tabindex', 0);

        var redoFun = function() {
            painter.redo();
        };

        // key code constants
        var ALT = 18,
            SHIFT = 16,
            DELETE = 46;

        painter.
                /* alternate commands - Shift key */
                onKeyToggle( SHIFT, function(isShiftDown) {
                    painter.runOnShift( isShiftDown );
                } ).

                /* alternate commands - Alt key */
                onKeyToggle( ALT, function(isAltDown) {
                    painter.runOnAlt( isAltDown );
                } );

        /* Redo - ctrl + r and ctrl + y */
        if ( ! dontGrabCtrlR ) {
            painter.onCtrl( 'r', redoFun );
        }
        painter.
                onCtrl( 'y', redoFun ).

                /* Undo - ctrl + z */
                onCtrl( 'z', function() {
                        painter.undo();
                } ).

                /* Crop - ctrl+e */
                onCtrl( 'e', function() {
                        painter.getCanvas().crop();
                } ).

                /* Clear - delete key */
                onKey( DELETE, function(ev) {
                    painter.getCanvas().clear();
                } ).

                /* Copy */
                onCtrl( 'c', function() {
                        painter.copy();
                } ).

                /* Cut */
                onCtrl( 'x', function() {
                        painter.cut();
                } ).

                /* Paste */
                onCtrl( 'v', function() {
                        painter.paste();
                } ).

                /* Select All */
                onCtrl( 'a', function() {
                    painter.getCanvas().getMarquee().
                            startHighlight().
                            select( 0, 0, painter.getWidth(), painter.getHeight() ).
                            stopHighlight();
                } );

        /* Command Key Bindings */

        var bindCommand = function( key, commandName ) {
            var command = painter.getCommand( commandName );

            return painter.onKey( key, function() {
                painter.setCommand( command );
            } );
        };

        bindCommand( 'p', 'pencil' );
        bindCommand( 'b', 'brush'  );
        bindCommand( 'w', 'webby'  );
        bindCommand( 'e', 'eraser' );

        bindCommand( 'r', 'rectangle' );
        bindCommand( 'c', 'circle' );
        bindCommand( 'l', 'line'   );

        bindCommand( 'f', 'fill'   );

        bindCommand( 'z', 'zoom'   );
        bindCommand( 's', 'select' );
        bindCommand( 'm', 'move'   );

        bindCommand( 'k', 'picker' );

        /* On Alt behaviour - switch to colour picker */
        var pickerSwitchCommand = nil;
        painter.onAlt( function(isAlt) {
            if ( isAlt ) {
                if ( pickerSwitchCommand !== painter.pickerCommand ) {
                    pickerSwitchCommand = painter.getCommand();
                    painter.setCommand( painter.pickerCommand );
                }
            } else {
                if ( pickerSwitchCommand !== nil ) {
                    // they might have switched whilst alt is still down
                    if ( painter.command === painter.pickerCommand ) {
                        painter.setCommand( pickerSwitchCommand );
                    }

                    pickerSwitchCommand = nil;
                }
            }
        } );
    };

    /**
     * Given a value from 0.0 to 1.0,
     * this will return it converted to: 1/MAX_ZOOM to MAX_ZOOM
     *
     * @param p The value to convert.
     * @return The zoom for the value given.
     */
    var percentToZoom = function( p ) {
        p = Math.limit( p, 0, 1 );

        // convert p from: 0.0 to 1.0 => -1.0 to 1.0;
        p = (p-0.5) * 2;

        // When p is very very close to 1, it can actually increase the zoom in the opposite direction.
        // So the min/max creates a dead zone, and we add p on as a minor zoom.

        if ( p > 0 ) {
            return Math.max( MAX_ZOOM*p, 1+p );
        } else if ( p < 0 ) {
            p = -p;
            var newZoom = 1 / ( MAX_ZOOM*p );
            return Math.min( newZoom, 1-p );
        } else {
            return 1;
        }
    }

    var zoomToPercent = function( zoom ) {
        zoom = Math.limit( zoom, 1/MAX_ZOOM, MAX_ZOOM );

        var slide;

        // converts from: [1/MAX_ZOOM to MAX_ZOOM] => [-1.0 to 1.0]
        if ( zoom > 1 ) {
            slide =       zoom / MAX_ZOOM;
        } else if ( zoom < 1 ) {
            slide = - (1/zoom) / MAX_ZOOM;
        } else {
            slide = 0.0;
        }

        // convert from [-1.0 to 1.0] => [0.0 to 1.0]
        return slide/2 + 0.5;
    };

    /**
     * Event for when *any* drawing operation has ended.
     * This includes pasting, clearing, etc.
     *
     * Pretty much every draw change will be sent to this,
     * including those which will go to 'onDraw'.
     */
    SkyBrush.prototype.onDraw = function( fun ) {
        this.canvas.onEndDraw( fun );
        return this;
    };

    /* Event Handlers
     *
     * These are just thin wrappers that are hooked onto the relevant
     * DOM objects.
     *
     * They then pass the calls to all possible types of actions,
     * for that type of call.
     *
     * Those actions (i.e. dragging or drawing) are then responsible
     * for deciding if they should/shouldn't act.
     */

    /**
     * Movement for when the button is down.
     */
    /*
     * The || is because the process functions will return true if they are run.
     * This ensures if we get a true from one of them, it is then
     * not'd into a false, and so disables the mouse cursor change in Chrome.
     */
    SkyBrush.prototype.runMouseMove = function( ev ) {
        this.brushCursor.onMove( ev );

        return ! (
                this.processOnDraw( ev ) ||
                processDrag( this, this.dragging.onMove, ev )
        );
    };

    SkyBrush.prototype.runMouseUp = function( ev ) {
        if ( this.isDragging() ) {
            processDrag( this, this.dragging.onEnd, ev );

            this.dragging.onMove =
            this.dragging.onEnd  =
                    undefined;

            this.isDraggingFlag = false;

            return false;
        } else if ( this.isPainting ) {
            this.endDraw( ev );

            this.isPainting = false;

            if ( IS_TOUCH ) {
                this.brushCursor.hideTouch();
            }

            return false;
        }
    };

    SkyBrush.prototype.runMouseDown = function( ev ) {
        var infoBar = this.infoBar;

        if ( infoBar.isShown() ) {
            if ( infoBar.isTarget(ev.target) ) {
                return;
            } else {
                infoBar.hide();
            }
        }

        var $target = $(ev.target);
        
        /*
         * If we are drawing from totally outside SkyBrush,
         * skip it.
         *
         * Also skip inputs, and the gui panes.
         *
         * This is so surrounding controls work ok.
         */
        if (
                $target.parents('.skybrush_viewport').size() > 0 &&
                ( IS_TOUCH || ev.which === LEFT ) &&
                ! $target.is('input, a, .sb_no_target') &&
                ! ev.isInScrollBar(this.viewport)
        ) {
            if ( this.isDragging() ) {
                processDrag( this, this.dragging.onStart, ev );
            // hide the GUI pane, if it's been quickly opened
            } else {
                if ( this.isGUIsOverlapping() ) {
                    this.closeGUIPane();
                }

                this.isPainting = true;
                return this.runStartDraw( ev );
            }
        }
    };

    SkyBrush.prototype.runStartDraw = function( ev ) {
        if ( IS_TOUCH ) {
            this.brushCursor.showTouch();
            this.brushCursor.onMove( ev );
        }

        this.viewport.focus();

        processCommand( this, 'onDown', ev );

        ev.preventDefault();

        return false;
    };

    SkyBrush.prototype.processOnDraw = function( ev ) {
        if ( this.isPainting ) {
            processCommand( this, 'onMove', ev );
            ev.preventDefault();

            return true;
        }
    };

    /**
     * Called when this has finished drawing.
     * This starts the whole 'endDraw' process,
     * which can include update undo/redo stacks,
     * dealing with overlay's, updating the upscale,
     * and lots more stuff.
     *
     * All of that comes from this entry point,
     * but only if it's painting.
     *
     * @private
     * @param ev
     */
    SkyBrush.prototype.endDraw = function( ev ) {
        processCommand( this, 'onUp', ev );

        this.canvas.endDraw( this.command.popDrawArea() );

        this.events.run( 'onDraw' );

        return true;
    };

    SkyBrush.prototype.startDrag = function( onMove, onEnd ) {
        if ( ! this.isPainting && !this.isDragging() ) {
            this.dragging.onMove  = onMove;
            this.dragging.onEnd   = onEnd ;

            this.isDraggingFlag   = true;

            return true;
        }
    };

    /**
     * @private
     * @return True if this SkyBrush is currently dragging a GUI component, otherwise false.
     */
    SkyBrush.prototype.isDragging = function() {
        return this.isDraggingFlag;
    };

    /**
     * Adds a new GUI component to float on top of this SkyBrush.
     *
     * @private
     * @param gui The GUI component to display.
     */
    SkyBrush.prototype.addGUI = function( gui ) {
        for ( var i = 0; i < arguments.length; i++ ) {
            var gui = arguments[i];
            gui.setParent( this );

            this.guiDom.append( gui.dom );
        }

        return this;
    };

    /**
     * As code retrieving GUI's should never be after one
     * that does not exist, this will return null to force you
     * to get the right GUI.
     *
     * This is to avoid you accidentally working on an empty
     * jQuery object, and wondering why it's not working.
     *
     * @private
     * @return The GUI overlay with the name given, as a jQuery object, or null if not found.
     */
    SkyBrush.prototype.getGUI = function( klass ) {
        var gui = this.guiDom.children( '.skybrush_gui.' + klass );

        return gui.size() > 0 ? gui : nil ;
    };

    // Canvas 2D Context properties we are interested in storing/restoring
    var CTX_BACKUP_PROPERTIES = [
            'fillStyle',
            'strokeStyle',
            'lineCap',
            'lineJoin',
            'lineWidth',
            'globalAlpha',
            'globalCompositeOperation'
    ];

    /**
     * @private
     */
    var backupCtx = function( ctx ) {
        var info = { };

        for ( var i = 0; i < CTX_BACKUP_PROPERTIES.length; i++ ) {
            var prop = CTX_BACKUP_PROPERTIES[i];
            info[prop] = ctx[prop];
        }

        return info;
    };

    /**
     * @private
     */
    var restoreCtx = function( ctx, info ) {
        for ( var i = 0; i < CTX_BACKUP_PROPERTIES.length; i++ ) {
            var prop = CTX_BACKUP_PROPERTIES[i];
            ctx[prop] = info[prop];
        }
    };

    /**
     * Copies the setup from the old canvas 2d context to
     * the new canvas 2d context.
     *
     * @private
     * @param oldCtx The context to copy attributes form.
     * @param newCtx The context to copy attributes to.
     */
    var copyCtxSetup = function( oldCtx, newCtx ) {
        for ( var i = 0; i < CTX_BACKUP_PROPERTIES.length; i++ ) {
            var prop = CTX_BACKUP_PROPERTIES[i];
            newCtx[prop] = oldCtx[prop];
        }
    };

    /**
     * Resizes the canvas inside of this SkyBrush object,
     * to the size stated.
     *
     * The existing content will be copied across.
     *
     * @param {number} width The new width.
     * @param {number} height The new height.
     * @param {boolean} clear Optional, pass in true to clear the canvas during the resize.
     */
    SkyBrush.prototype.setSize = function( newWidth, newHeight, clear ) {
        this.canvas.setSize( newWidth, newHeight, clear );

        return this;
    };

    /**
     * This differs from setSize in that this performs a whole event,
     * as though the user has chosen to resize the canvas.
     *
     * For example this is recorded on teh undo stack.
     *
     * @param {number} width The new width.
     * @param {number} height The new height.
     */
    SkyBrush.prototype.resize = function( newWidth, newHeight ) {
        this.canvas.resize( newWidth, newHeight );

        return this;
    };

    /**
     * @param {number} newWidth The new Width of the canvas.
     * @param {number} newHeight The new Height of the canvas.
     */
    SkyBrush.prototype.scale = function( newWidth, newHeight, isSmooth ) {
        this.canvas.scale( newWidth, newHeight, isSmooth );

        return this;
    };

    /**
     * This re-applies the current zoom level.
     *
     * It's used for times when the width/height, and other metrics
     * that might mess up the zoom, have been altered.
     *
     * It's the same as: this.setZoom( this.getZoom() );
     */
    SkyBrush.prototype.updateZoom = function() {
        return this.setZoom( this.getZoom() );
    };

    /**
     * @return The current level of zoom.
     * @see setZoom
     */
    SkyBrush.prototype.getZoom = function() {
        return this.canvas.getZoom();
    };

    /**
     * @return The CanvasManager used inside this SkyBrush.
     */
    SkyBrush.prototype.getCanvas = function() {
        return this.canvas;
    };

    /**
     * Sets the zoom based on a percentage, this is a value from 0 to 1.
     *
     * Things like the actual min and actual max are abstracted away
     * with this method. 0.0 represents the minimum zoom (whatever that
     * value may be), whilst 1.0 is the maximum zoom.
     *
     * zoomX and zoomY may be 'true' to zoom into the center of the
     * canvas.
     *
     * @param The percentage, from 0.0 to 1.0, for this to be zoomed.
     * @param zoomX the location, in canvas pixels, of where to zoom. Optional, pass in undefined for no value.
     * @param zoomY the location, in canvas pixels, of where to zoom. Optional, pass in undefined for no value.
     */
    SkyBrush.prototype.setZoomPercent = function(p, zoomX, zoomY) {
        this.setZoom( percentToZoom(p), zoomX, zoomY );
        return this;
    };

    /**
     * @return {number} The current zoom level as a percent from 0.0 (min zoom) to 1.0 (max zoom).
     */
    SkyBrush.prototype.getZoomPercent = function() {
        return zoomToPercent( this.getZoom() );
    };

    /**
     * Sets the zoom level.
     *
     * This multiplies the width/height of the canvas by the amount given.
     *
     * The zoom value is a multiplyer to multiply against the
     * current size.
     *
     * For example if zoom is 1, then the width and height are
     * multiplied by 1, and this is the 100% zoom level (no
     * zoom).
     *
     * If you want to zoom in by a factor or 5, or 500% zoom,
     * then you pass in 5. Width and height are now 5 times
     * larger.
     *
     * If you want to zoom out to quarter the size, a zoom of
     * 25%, then you pass in 0.25. Width and height are now
     * a quarter of their normal size; they are multiplied by
     * 0.25.
     *
     * You could also think of that as zooming out by a factor
     * of 4, and so the zoom level is 1/4, which is 0.25.
     *
     * It is important that you understand that zooming in and
     * out work on different ranges.
     *  = Zooming  in by a factor of 4 is just '4'
     *  = Zooming out by a factor of 4 is 1/4.
     *
     * The zoom value is limited to be between 1/MAX_ZOOM and
     * MAX_ZOOM, whatever that might be.
     *
     * The x and y values are used for the location of the
     * centre of the zoom. This is so if a user click in the
     * top left corner, you pass in those co-ordinates, and
     * SkyBrush will zoom in/out in relation to area. i.e. zoom
     * in towards the top left corner.
     *
     * x and y are in 'canvas pixels'.
     *
     * Finally the 'force' is because zoom will not fire if no
     * zoom change has occurred. For 99% of usage, this is ok,
     * but there is a 1% corner case where you might want to
     * use this.
     *
     * Namely when setting the default zoom, so all events get
     * fired on startup.
     *
     * x and y may also be 'true', which denotes that you wish
     * to zoom in relation to the center of the canvas.
     *
     * @param zoom The zoom factor.
     * @param x optional, the centre of the zoom in canvas pixels.
     * @param y optional, the centre of the zoom in canvas pixels.
     * @param force optional, true to force a zoom update (shouldn't ever need to do this).
     */
    SkyBrush.prototype.setZoom = function( zoom, x, y, force ) {
        zoom = Math.limit( zoom, 1/MAX_ZOOM, MAX_ZOOM );
        if ( zoom > 1 ) {
            zoom = Math.round( zoom );
        }

        var oldZoom = this.getZoom();

        if ( zoom !== oldZoom || force ) {
            this.canvas.setZoom( zoom, x, y );
            this.events.run( 'onZoom', zoom, x, y );
        }

        return this;
    };

    /**
     * Zooms into the location given, or if not provided, the
     * centre of the viewport.
     *
     * @param {number} x The x co-ordinate to zoom into.
     * @param {number} y The y co-ordinate to zoom into.
     */
    SkyBrush.prototype.zoomIn = function( x, y ) {
        var zoom = percentToZoom( this.getZoomPercent() + 1/MAX_ZOOM );
        this.setZoom( zoom, x, y );

        return this;
    };

    /**
     * Zooms out at the location given (location is optional).
     *
     * @param {number} x The x co-ordinate to zoom out of.
     * @param {number} y The y co-ordinate to zoom out of.
     */
    SkyBrush.prototype.zoomOut = function( x, y ) {
        var zoom = percentToZoom( this.getZoomPercent() - 1/MAX_ZOOM );
        this.setZoom( zoom, x, y );

        return this;
    };

    /**
     * Event for when the 'shift' key is pressed, up or down.
     */
    SkyBrush.prototype.onShift = function( fun ) {
        this.events.add( 'onShift', fun );

        return this;
    };

    /**
     * Removes the function given from being run when shift is
     * pressed up or down.
     *
     * The function is called in the context of SkyBrush,
     * and if shift is down or not is passed into the first
     * parameter.
     *
     * @param fun The event to run.
     */
    SkyBrush.prototype.removeOnShift = function( fun ) {
        this.events.remove( 'onShift', fun );

        return this;
    };

    /**
     * Runs all event handlers and optionally alters the shift
     * flag.
     *
     * If you want to just run the shift events, then just call:
     *
     *      skybrush.runOnShift();
     *
     * They will be run.
     *
     * Otherwise if true or false is passed, then the events
     * are only run if it's changed. So if you do:
     *
     *      skybrush.runOnShift( true ).runOnShift( true );
     *
     * ... shift events are called the first time, and ignored
     * on the second (as shift hasn't changed).
     *
     * Of course if you do:
     *
     *      skybrush.runOnShift( true ).runOnShift( false );
     *
     * ... then events are run twice.
     *
     * In practice state changes should only be made internally,
     * within SkyBrush.
     *
     * @param True if shift is now down, false if not, or skip this to run all events.
     * @return This SkyBrush instance.
     */
    SkyBrush.prototype.runOnShift = function( shiftDown ) {
        return this.runShiftOrAlt( 'onShift', 'isShiftDownFlag', 'isAltDownFlag', shiftDown );
    };

    SkyBrush.prototype.runOnAlt = function( altDown ) {
        return this.runShiftOrAlt( 'onAlt', 'isAltDownFlag', 'isShiftDownFlag', altDown );
    };

    SkyBrush.prototype.runShiftOrAlt = function(
            eventsName, flagName, otherFlagName,
            change
    ) {
        // if the other flag is current running,
        // just ignore this one.
        // i.e. you can't press shift and alt at the same time
        if ( ! this[otherFlagName] ) {
            /*
             * Lets say we press shift down, then alt down.
             *
             * The alt down is skipped, because shift is
             * already down.
             *
             * So now we release shift, it's event gets fired.
             * Then we release alt.
             *
             * The alt up event needs to be skipped, because
             * it's down event was never fired.
             *
             * That's what this if does, it skips the up event
             * for that particular corner case.
             */
            if ( this.shiftOrAltSkip === flagName ) {
                this.shiftOrAltSkip = nil;

                /*
                 * In theory, we should just return, with no
                 * if. But what if my logic is wrong?
                 *
                 * That is why we have the if, so we _only_
                 * skip the up (which is when change is false).
                 *
                 * In theory, will should always be false.
                 */
                if ( ! change ) {
                    return;
                }
            }

            var changeBool = !! change;

            /*
             * Run if:
             *  = no parameter provided, i.e. skybrush.runOnShift()
             *  = if parameter given, and shift has changed
             */
            if (
                    change === undefined ||
                    this[flagName] !== changeBool
            ) {
                if ( change !== undefined ) {
                    this[flagName] = changeBool;
                }

                this.events.run( eventsName, this[flagName] );
            }
        } else {
            this.shiftOrAltSkip = flagName;
        }

        return this;
    };

    /**
     * @return True if shift is current pressed, false if not.
     */
    SkyBrush.prototype.isShiftDown = function() {
        return this.isShiftDownFlag;
    };

    /**
     * Callbacks to be run when alt is pressed or released.
     */
    SkyBrush.prototype.onAlt = function(callback) {
        this.events.add( 'onAlt', callback );

        return this;
    };

    /**
     * @return True if alt is current pressed, false if not.
     */
    SkyBrush.prototype.isAltDown = function() {
        return this.isAltDownFlag;
    };

    /**
     * Add an event to be run when this zooms in.
     *
     * @param fun The event to run.
     */
    SkyBrush.prototype.onZoom = function( fun ) {
        this.events.add( 'onZoom', fun );

        return this;
    };

    /**
     * @param alpha The alpha value used when drawing to the canvas.
     */
    SkyBrush.prototype.setAlpha = function( alpha ) {
        alpha = Math.limit( alpha, 0, 1 );

        // account for the dead zone
        if ( alpha > 1-ALPHA_DEAD_ZONE ) {
            alpha = 1;
        }

        this.canvas.setAlpha( alpha );
        this.events.run( 'onsetalpha', this.canvas.getAlpha() );

        return this;
    };

    /**
     * Adds an event to be run when the alpha value is changed on SkyBrush.
     *
     * @param fun The function to call.
     */
    SkyBrush.prototype.onSetAlpha = function( fun ) {
        this.events.add( 'onsetalpha', fun );
        return this;
    };

    /**
     * Adds a callback event which is run after the colour is set to SkyBrush.
     *
     * @param fun The function to call.
     */
    SkyBrush.prototype.onSetColor = function( fun ) {
        this.events.add( 'onsetcolor', fun );
        return this;
    };

    SkyBrush.prototype.getAlpha = function() {
        return this.canvas.getAlpha();
    };

    SkyBrush.prototype.getColor = function() {
        return this.canvas.getColor();
    };

    /**
     * @param strColor The colour to use when drawing.
     */
    SkyBrush.prototype.setColor = function( strColor ) {
        this.canvas.setColor( strColor );

        this.events.run( 'onsetcolor', strColor );

        return this;
    };

    SkyBrush.prototype.onSetCommand = function( fun ) {
        this.events.add( 'onsetcommand', fun );

        return this;
    };

    SkyBrush.prototype.switchCommand = function( name ) {
        name = name.toLowerCase();

        for ( var i = 0; i < this.commands.length; i++ ) {
            if ( this.commands[i].getName().toLowerCase() == name ) {
                return this.setCommand( this.commands[i] );
            }
        }

        return this;
    };

    /**
     * Note that events are only fired if the command given
     * is different to the current command.
     *
     * @param command The Command object to switch to.
     * @return this SkyBrush object.
     */
    SkyBrush.prototype.setCommand = function( command ) {
        /*
         * If you click on the same command, multiple times,
         * then nothing happens.
         *
         * Update only happens when you change command.
         */
        if ( this.command != command ) {
            if ( this.command ) {
                this.command.onDetach( this );
            }

            var lastCommand = this.command;
            this.command = command;
            command.onAttach( this );

            this.events.run( 'onsetcommand', command, lastCommand );
        }

        return this;
    };

    /**
     * This works in two ways. Calling it with no name returns
     * the currently set command, i.e.
     *
     *      skybrush.getCommand();
     *
     * Alternatively you can pass in a name, and it will
     * return the stored command with that name, regardless of
     * if it's set or not.
     *
     *      skybrush.getCommand( 'pencil' );
     *
     * @param name Optional, finds the command listed in SkyBrush.
     * @return The currently set command, or nil if you call it before any command is set.
     */
    SkyBrush.prototype.getCommand = function( name ) {
        if ( name ) {
            name = name.toLowerCase();

            if ( this.pickerCommand.getName().toLowerCase() === name ) {
                return this.pickerCommand;
            } else {
                for ( var i = 0; i < this.commands.length; i++ ) {
                    var command = this.commands[i];

                    if ( command.getName().toLowerCase() === name ) {
                        return command;
                    }
                }

                return nil;
            }
        } else {
            return this.command;
        }
    };

    /**
     * The parameter given, is optional. If given, then the cursor is only
     * refreshed, if the currently set command, is the same as the one given.
     *
     * This is so you can just do ...
     *
     *      painter.refreshCommand( this );
     *
     * ... and not care if you are or aren't the current command.
     *
     * @param Only refresh, if this is the currently set command.
     */
    SkyBrush.prototype.refreshCursor = function( command ) {
        /*
         * Incase this is called right at the beginning,
         * during the setup phase, before any commands have
         * been set.
         */
        if ( this.command && (arguments.length === 0 || this.command === command) ) {
            this.brushCursor.setCommandCursor( this, this.command );
        }
    };

    /**
     * @param ev The event to check.
     * @return True if the given event is located inside of the SkyBrush viewport, otherwise false.
     */
    SkyBrush.prototype.isInView = function( ev ) {
        return ev.isWithin( this.viewport );
    };

    /**
     * @return A data url for the current contents in SkyBrush.
     */
    SkyBrush.prototype.getImageData = function( type ) {
        return this.canvas.toDataURL( type );
    };

    /**
     * Note that due to restrictions in browsers,
     * the contents of the image will not appear straight away.
     * It will be available during a future JS event
     * (add an 'onload' event to the image to know when it's ready).
     *
     * @return A HTML Image holding the items drawn on the canvas.
     */
    SkyBrush.prototype.getImage = function() {
        var img = new Image();

        img.width = this.canvas.width;
        img.height = this.canvas.height;
        img.src = this.getImageData();

        return img;
    };

    /**
     * Sets an image, or canvas, as the contents of this SkyBrush.
     * The SkyBrush is   d to accomodate the image.
     *
     * AFAIK, there is only one way to get an image's _true_ width/height,
     * and that is through making a new one and setting it's src to that of the first.
     * I don't want to do that by default, due to the added cost,
     * but you can do that if you wish to.
     *
     * To give the user more options, you can pass in the width/height of the image.
     * This is used when SkyBrush makes it's own copy for editing.
     * Otherwise if those are undefined, it'll use the width/height of image.
     *
     * @param image The image to display on this canvas.
     * @param width (optional) the width of the image.
     * @param height (optional) the height of the image.
     */
    SkyBrush.prototype.setImage = function( image, width, height ) {
        this.canvas.setImage( image, width, height );
        this.reset();
    };

    /**
     * Cleares SkyBrush, and sets it up ready for an entirely new image.
     * This will be reset in order to achieve this.
     *
     * The width and height are optional, if not provided then
     * the standard default width/height will be used.
     *
     * @param width  Optional, the width of the new image.
     * @param height Optional, the height of the new image.
     */
    SkyBrush.prototype.newImage = function( width, height ) {
        if ( ! width ) {
            width = DEFAULT_WIDTH;
        }
        if ( ! height ) {
            height = DEFAULT_HEIGHT;
        }

        this.setSize( width, height, true ).
                reset();

        return this;
    };

    SkyBrush.prototype.cut = function() {
        this.canvas.cut();
        return this;
    };

    SkyBrush.prototype.copy = function() {
        this.canvas.copy();
        return this;
    };

    SkyBrush.prototype.paste = function() {
        this.canvas.paste();
        this.switchCommand( 'move' );

        return this;
    };

    /* Undo / Redo functionality */

    SkyBrush.prototype.hasUndo = function() {
        return this.canvas.hasUndo();
    };

    SkyBrush.prototype.hasRedo = function() {
        return this.canvas.hasRedo();
    };

    SkyBrush.prototype.onUndo = function( fun ) {
        this.events.add( 'onundo', fun );

        return this;
    };

    SkyBrush.prototype.onRedo = function( fun ) {
        this.events.add( 'onredo', fun );

        return this;
    };

    SkyBrush.prototype.undo = function() {
        if ( this.canvas.undo() ) {
            this.events.run( 'onundo' );
        }

        return this;
    };

    SkyBrush.prototype.redo = function() {
        if ( this.canvas.redo() ) {
            this.events.run( 'onredo' );
        }

        return this;
    };

    SkyBrush.prototype.getWidth = function() {
        return this.canvas.getWidth();
    };

    SkyBrush.prototype.getHeight = function() {
        return this.canvas.getHeight();
    };

    /**
     * Shows the GUI pane, but does not show it forever.
     */
    SkyBrush.prototype.showGUIPane = function() {
        this.guiPane.ensureClass( 'sb_open' );

        return this;
    }

    SkyBrush.prototype.openGUIPane = function() {
        this.guiPane.ensureClass( 'sb_open' );
        this.viewport.parent().ensureClass( 'sb_open' );

        this.canvas.updateCanvasSize();

        return this;
    }

    SkyBrush.prototype.closeGUIPane = function() {
        this.guiPane.removeClass( 'sb_open' );
        this.viewport.parent().removeClass( 'sb_open' );

        this.canvas.updateCanvasSize();

        return this;
    }

    SkyBrush.prototype.isGUIsOverlapping = function() {
        return this.guiPane.hasClass('sb_open') && 
             ! this.viewport.parent().hasClass('sb_open');
    }

    SkyBrush.prototype.isGUIsShown = function() {
        return this.guiPane.hasClass('sb_open');
    }

    SkyBrush.prototype.toggleGUIPane = function() {
        if ( this.isGUIsShown() ) {
            this.closeGUIPane();
        } else {
            this.openGUIPane();
        }

        return this;
    }

    /**
     * Entirely removes any setup this currently has.
     *
     * This should be used when setting entirely new
     * images to SkyBrush.
     * 
     * Note that setups such as the current colour,
     * alpha, and command will not be altered.
     * Only internal data structures, such as undo/redo,
     * will be wiped.
     * 
     * @return This SkyBrush object.
     */
    SkyBrush.prototype.reset = function() {
        this.canvas.reset();
        this.setZoom( DEFAULT_ZOOM );

        return this;
    };

    window['SkyBrush'] = SkyBrush;
})( window, document, null );
