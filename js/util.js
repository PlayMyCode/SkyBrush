"use strict";

/**
 * @license
 * 
 * SkyBrush - skybrush.css

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
 * util.js
 * 
 * This is a bunch of jQuery, and non-jQuery, utility stuff. It was originally
 * built for Play My Code, but is also used in other projects, such as SkyBrush.
 * 
 * Ideally anything really SkyBrush specific should be pushed out into that,
 * but things like the scrollbar detection are kinda useful for other things too.
 * 
 * It also includes some shorthand, like 'leftdown' and 'leftup' as left-click
 * specific alternatives to 'mousedown' and 'mouseup'.
 * 
 * However this was also never meant to be a proper, mature library for building
 * JS apps; mostly a bit of hackery to do what's needed to be done.
 * 
 * This file contains:
 *  = extra functions
 *  = extra jQuery functions
 *  = adds missing JavaScript functions
 */
 
(function(window, document, $, jQuery, undefined){
    /**
     * usage: log('inside coolFunc',this,arguments);
     * paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
     */
    window.log = function() {
        log.history = log.history || [];   // store logs to an array for reference
        log.history.push(arguments);
        
        if (window.console) {
            window.console.log( Array.prototype.slice.call(arguments) );
        }
    };

    /**
     * Our PlayMyCode jQuery extras.
     * Utility functions we need, and things we have found online.
     */
    (function() {
        /**
         * Serializes this object, but into a JS object with values stored
         * in key-value mappings.
         */
        $.fn.serializeObject = function() {
            var o = {};
            var a = this.serializeArray();
            
            $.each(a, function() {
                if (o[this.name]) {
                    if (!o[this.name].push) {
                        o[this.name] = [o[this.name]];
                    }
                    o[this.name].push(this.value || '');
                } else {
                    o[this.name] = this.value || '';
                }
            });
            
            return o;
        };

        /**
         * Gathers all of the inputs from this element,
         * and returns them in an object mapping inputs name to the input object.
         * 
         * Usage:
         * 
         * var strUser = $(form).inputs().username.val();
         * 
         * ... or ...
         * 
         * var inputs = $(form).inputs();
         * var user = inputs.username.val();
         * var pass = inputs.password.val();
         */
        $.fn.inputs = function() {
            var values = {};
                
            this.find( ':input' ).each( function() {
                values[ this.name ] = $(this);
            } );
            
            return values;
        };
        
        var wrapButtonEvent = function( _this, fun, name, button ) {
            var wrapper = function(ev) {
                // if is a left click
                if ( ev.button === button ) {
                    return fun.call( this, ev );
                }
            };
            
            return ($(_this)[name])( wrapper );
        };
        
        /**
         * Forces only numeric input when the key is pressed.
         *
         * The parameter allows you to force if it allows,
         * or disallows, decimal values.
         *
         * @param allowDecimal True (the default) to allow decimals, or false to disallow.
         */
        $.fn.forceNumeric = function ( allowDecimal ) {
            if ( allowDecimal === undefined ) {
                allowDecimal = true;
            }

            return this.each(function () {
                $(this).keydown(function (e) {
                    var key = e.which || e.keyCode;

                    if (
                            e.altKey || e.ctrlKey || e.metaKey || (
                                    // numbers   
                                    key >= 48 && key <= 57 ||
                                    // Numeric keypad
                                    key >= 96 && key <= 105 ||
                                    // decimal point, period and minus, decimal point on keypad
                                    ((key == 190) && allowDecimal) || key == 188 || key == 109 || ((key == 110) && allowDecimal) ||
                                    // Backspace and Tab and Enter
                                    key == 8 || key == 9 || key == 13 ||
                                    // Home and End
                                    key == 35 || key == 36 ||
                                    // left and right arrows
                                    key == 37 || key == 39 ||
                                    // Del and Ins
                                    key == 46 || key == 45
                            )
                    ) {
                        return true;
                    }

                    return false;
                });
            });
        };

        /**
         * Helper for just attaching an event to the left click.
         * 
         * The function is run just like a normal mouse down,
         * the only difference being that it's left click only (and so ignores
         * right and middle clicks).
         * 
         * This is to avoid the constant button checking, you'd normally have to do.
         * 
         * Usage:
         *   $('<div>').leftdown( function(ev) {
         *      // do left down stuff here
         *   } );
         */
        $.fn.leftdown = function( fun ) {
            return wrapButtonEvent( this,
                    function(ev) {
                        if ( ! isInScrollBar(ev) ) {
                            return fun.call( this, ev );
                        }
                    },
                    'mousedown',
                    0
            );
        };
        $.fn.leftup = function( fun ) {
            return wrapButtonEvent( this, fun, 'mouseup', 0 );
        };
        
        $.fn.rightdown = function( fun ) {
            return wrapButtonEvent( this, fun, 'mousedown', 1 );
        };
        $.fn.rightup = function( fun ) {
            return wrapButtonEvent( this, fun, 'mousedown', 1 );
        };

        /**
         * An event that is run if 'leftdown' is used when the mouse is on top of a scroll bar.
         * This works for both horizontal and vertical scroll bars.
         * 
         * It only works on the left mouse button because scroll bars
         * can only be dragged using that.
         * 
         * @param fun The function to run.
         * @return this.
         */
        $.fn.scrolldown = function( fun ) {
            return scrollEvent( this, 'mousedown', fun );
        };
        
        /**
         * Run when the mouse is pressed up, on a scroll bar.
         * 
         * @param fun The function to run.
         * @return this.
         */
        $.fn.scrollup = function( fun ) {
            return scrollEvent( this, 'leftup', fun );
        };
        
        var isInScrollBar = function( ev ) {
            var $this = $(ev.target),
                pos = $this.offset(),
                x, y,
                w, h,
                scrollSize;
            
            if ( pos !== null ) {
                x = ev.pageX - pos.left;
                y = ev.pageY - pos.top ;
                
                w = $this.width();
                h = $this.height();
                
                scrollSize = $this.scrollBarSize();
            // pos will be null if run on something like 'document',
            // in which case we use the window
            } else {
                x = ev.pageX - $this.scrollLeft();
                y = ev.pageY - $this.scrollTop();
                
                var $window = $(window);
                
                w = $window.width();
                h = $window.height();
                
                scrollSize = $(document).scrollBarSize();
            }

            return ( scrollSize.right  > 0 && x >= w-scrollSize.right  ) ||
                   ( scrollSize.bottom > 0 && y >= h-scrollSize.bottom ) ;
        };
        
        /**
         * Helper function avoid code duplication with 'scrollup' and 'scrolldown'.
         */
        var scrollEvent = function( $this, action, fun ) {
            return $this[action]( function(ev) {
                if ( ev.button === 0 && isInScrollBar(ev) ) {
                    return fun.call( this, ev );
                }
            } );
        };
        
        /**
         * Returns an object containing the size of the right and bottom scroll bars.
         * They will be a number, rather then true or false, as no scroll bar is represented by 0, which equates to false.
         * 
         * The other reason is so you can simultanously use this for working out the size of the scroll bars in a component.
         * 
         * Usage:
         *   if ( $('.foo').scrollBarSize().right ) {
         *      // do something
         *   }
         *   if ( $('.foo').scrollBarSize().bottom ) {
         *      // do something
         *   }
         * 
         * @return An object with 'right' and 'bottom' properties, stating the width of those bars, or 0 if not present.
         */
        $.fn.scrollBarSize = function() {
            var _this = this.get(0),
                scrollSize = $.scrollBarWidth();
            
            if ( _this === document ) {
                var $window = $(window);
                return {
                        right  : ( this.height() > $window.height() ) ? scrollSize : 0,
                        bottom : ( this.width()  > $window.width()  ) ? scrollSize : 0
                };
            } else {
                // Scroll Height/Width includes differnt things in FF and other browsers
                if ( $.browser.mozilla ) {
                    return {
                            right  : ( _this.scrollHeight > this.outerHeight() ) ? scrollSize : 0,
                            bottom : ( _this.scrollWidth  > this.outerWidth()  ) ? scrollSize : 0
                    };
                } else {
                    return {
                            right  : ( _this.scrollHeight > this.innerHeight() ) ? scrollSize : 0,
                            bottom : ( _this.scrollWidth  > this.innerWidth()  ) ? scrollSize : 0
                    };
                }
            }
        };
        
        var _scrollbarWidth = 0;
        
        /**
         * @return The size of scroll bars in the current browser.
         */
        $.scrollBarWidth = function() {
            if ( _scrollbarWidth === 0 ) {
                if ( $.browser.msie ) {
                    var $textarea1 = $('<textarea cols="10" rows="2"></textarea>')
                                .css({ position: 'absolute', top: -1000, left: -1000 }).appendTo('body'),
                        $textarea2 = $('<textarea cols="10" rows="2" style="overflow: hidden;"></textarea>')
                                .css({ position: 'absolute', top: -1000, left: -1000 }).appendTo('body');
                    
                    _scrollbarWidth = $textarea1.width() - $textarea2.width();
                    $textarea1.add($textarea2).remove();
                } else {
                    var $div = $('<div />')
                            .css({ width: 100, height: 100, overflow: 'auto', position: 'absolute', top: -1000, left: -1000 })
                            .prependTo('body').append('<div />').find('div')
                            .css({ width: '100%', height: 200 });
                    
                    _scrollbarWidth = 100 - $div.width();
                    $div.parent().remove();
                }
            }
            
            return _scrollbarWidth;
        };
        
        $.fn.leftdrag = function( f ) {
            var isDragging = false;
            
            this.
                    leftdown( function(ev) {
                        isDragging = true;
                        return f.call( this, ev );
                    } ).
                    mousemove( function(ev) {
                        if ( isDragging ) {
                            return f.call( this, ev );
                        }
                    } ).
                    leftup( function(ev) {
                        if ( isDragging ) {
                            isDragging = false;
                            return f.call( this, ev );
                        }
                    } );
            
            $(document).leftup( function(ev) {
                if ( isDragging ) {
                    isDragging = false;
                }
            } );
            
            return this;
        };
        
        /**
         * If a parameter is given:
         *     Scrolls based on a percentage, from 0.0 to 1.0.
         * 
         * If no parameter:
         *     Returns the current scroll top as a percentage, a value from 0.0 to 1.0.
         */
        $.fn.scrollTopPercent = function( p ) {
            var diff = this.scrollTopAvailable();

            if ( p === undefined ) {
                return ( diff === 0 ) ? 0 : this.scrollTop() / diff;
            } else {
                return this.scrollTop( diff * p );
            }
        };
        
        /**
         * The number of pixels offscreen along the scroll bar,
         * outside of the view.
         * 
         * This is essentially the total scroll height - the visible height.
         * 
         * @return The number of pixels available offscreen.
         */
        $.fn.scrollTopAvailable = function() {
            return Math.max( this.get(0).scrollHeight - this.height(), 0 );
        }
        
        /**
         * The number of pixels offscreen along the scroll bar,
         * outside of the view.
         * 
         * This is essentially the total scroll width - the visible width.
         * 
         * @return The number of pixels available offscreen.
         */
        $.fn.scrollLeftAvailable = function() {
            return Math.max( this.get(0).scrollWidth - this.width(), 0 );
        }
        
        /**
         * Scrolls based on a percentage, from 0.0 to 1.0.
         */
        $.fn.scrollLeftPercent = function( p ) {
            var diff = this.scrollLeftAvailable();
            
            if ( p === undefined ) {
                return ( diff === 0 ) ? 0 : this.scrollLeft() / diff;
            } else {
                return this.scrollLeft( diff * p );
            }
        };
        
        /**
         * For the events given, this will append events that will stop propogation.
         * These have to be actual jQuery events, accessible through methods,
         * like 'click' or 'mousedown'.
         * 
         * Multiple parameters can be supplied as a part of the arguments.
         * 
         * Usgage:
         *     $('<a>').stopPropogation( 'click', 'mousedown' );
         * 
         * @return This jQuery object is returned.
         */
        $.fn.stopPropagation = function() {
            for ( var i = 0; i < arguments.length; i++ ) {
                // must use the event name as 'bind' seems to propogate anyway
                var event = arguments[i];
                this[ event ]( function(ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    return false;
                } );
            }
            
            return this;
        };

        /**
         * Allows you to setup this component to forward it's events on to
         * another item.
         *
         * To can be a selector, a jQuery object, or a DOM element.
         *
         * All of the events to pass on are listed after 'to'.
         *
         * Usage:
         *	foo.forwardEvents( $('.bar'), 'mousedown', 'click', 'mouseup' );
         *
         * @param to The element to forward events on to.
         * @return This jQuery object for chaining.
         */
        $.fn.forwardEvents = function( to ) {
            to = $(to);

            for ( var i = 1; i < arguments.length; i++ ) {
                this[ arguments[i] ]( function(ev) {
                    to.trigger( ev );
                } );
            }

            return this;
        };
        
        /**
         * The same as 'addClass', only this wraps it within a check
         * for the class first. This is because the standard jQuery
         * addClass will allow duplicate classes.
         *
         * @param klass The CSS class to append to this object.
         */
        $.fn.ensureClass = function( klass ) {
            if ( ! this.hasClass(klass) ) {
                this.addClass(klass);
            }

            return this;
        };

        /**
         * Special event for image load events
         * Needed because some browsers does not trigger the event on cached images.

         * MIT License
         * Paul Irish     | @paul_irish | www.paulirish.com
         * Andree Hansson | @peolanha   | www.andreehansson.se
         * 2010.
         *
         * Usage:
         * $(images).bind('load', function (e) {
         *   // Do stuff on load
         * });
         * 
         * Note that you can bind the 'error' event on data uri images, this will trigger when
         * data uri images isn't supported.
         * 
         * Tested in:
         * FF 3+
         * IE 6-8
         * Chromium 5-6
         * Opera 9-10
         */
        $.event.special.load = {
            add: function (hollaback) {
                if ( this.nodeType === 1 && this.tagName.toLowerCase() === 'img' && this.src !== '' ) {
                    // Image is already complete, fire the hollaback (fixes browser issues were cached
                    // images isn't triggering the load event)
                    if ( this.complete || this.readyState === 4 ) {
                        hollaback.handler.apply(this);
                    }

                    // Check if data URI images is supported, fire 'error' event if not
                    else if ( this.readyState === 'uninitialized' && this.src.indexOf('data:') === 0 ) {
                        $(this).trigger('error');
                    }
                    
                    else {
                        $(this).bind('load', hollaback.handler);
                    }
                }
            }
        };
        
        /**
         * Allows you to replace one image, with another.
         * It copies over attributes, and fades out the old image,
         * and fades in the new one.
         * 
         * Note that this does not copy events across.
         * 
         * usage:
         *     $('.avatar').replaceImageSrc( '/images/replacement.png' );
         */
        $.fn.replaceImageSrc = function( src, callback ) {
            this.animate({opacity: 0}, function() {
                var _this = $(this);
                var newThumb = new Image();
                
                newThumb.src = src;
                newThumb.onload = function() {
                    newThumb.onload = null;
                    
                    newThumb = $(newThumb);
                    newThumb.attr('id', _this.attr('id'));
                    newThumb.attr('class', _this.attr('class'));
                    
                    _this.replaceWith( newThumb );
                    newThumb.fadeIn(250);
                    
                    if ( callback ) {
                        callback.call( newThumb );
                    }
                };
            } );
        };
        
        /**
         * Adds form submission through the ajax iframe method to jQuery.
         */
        (function(){
            var stripOuterHTMLAroundJSON = function( str ) {
                var start = str.indexOf( '{' );
                var end   = str.lastIndexOf( '}' );
                
                if ( start > -1 && end > -1 ) {
                    // +1 because end is exclusive, not inclusive
                    return str.substring( start, end+1 );
                } else {
                    return str;
                }
            };
            
            var loaded = function( form, iFrame, id, onComplete ) {
                if ( form.attr('_aim_recursive_submit_check') ) {
                    form.removeAttr( '_aim_recursive_submit_check' );
                }
                
                var iFrameObj = iFrame.get(0);
                var d;
                if ( iFrameObj.contentDocument ) {
                    d = iFrameObj.contentDocument;
                } else if ( iFrameObj.contentWindow ) {
                    d = iFrameObj.contentWindow.document;
                } else {
                    d = window.frames[id].document;
                }

                if (
                        d.location.href != "about:blank" &&
                        typeof(onComplete) == 'function'
                ) {
                    onComplete( d.body.innerHTML );
                }
                
                // Remove the iFrame after use,
                // but can't remove straight away as it messes up (silly) Chrome.
                // Must also be at least 1 second away,
                // any less and Chrome will run it straight away).
                setTimeout( function() {
                    $(id).parent('div').remove();
                }, 1000 );
            };
            
            /**
             * This is the original AIM wrapper, with a few minor changes.
             * 
             *  AJAX IFRAME METHOD (AIM)
             *  http://www.webtoolkit.info/
             */
            var frame = function( form, onComplete, onError ) {
                var frameID = '_aim_iframe_' + ( new Date() ).getTime();
                var iFrame = $('<iframe>').
                        css({ display : 'none' }).
                        attr( 'src' , 'about:blank' ).
                        attr( 'name', frameID ).
                        attr( 'id'  , frameID ).
                        load( function() {
                            loaded( form, $(this), frameID, onComplete );
                        } );
                
                if ( onError ) {
                    iFrame.error( onError );
                }
                
                var div = $('<div>').append( iFrame );
                document.body.appendChild( div.get(0) );
                
                return frameID;
            };
            
            /**
             * Glue code wrapping AIM to our jQuery interface.
             */
            var sendForm = function( method, url, form, onComplete, onError, type ) {
                form = $(form);
                
                if ( form.attr('_aim_recursive_submit_check') ) {
                    return false;
                }
                
                var newOnComplete;
                if ( typeof(onComplete) == 'function' ) {
                    if ( type && type.toLowerCase() == 'json' ) {
                        newOnComplete = function( result ) {
                            var resultObj = $.parseJSON(
                                    stripOuterHTMLAroundJSON( result )
                            );
                            onComplete.call( form, resultObj );
                        }
                    } else {
                        newOnComplete = function( result ) {
                            onComplete.call( form, result );
                        }
                    }
                } else {
                    newOnComplete = onComplete;
                }
                
                var frameID = frame( form, newOnComplete, onError );
                form.
                        attr( '_aim_recursive_submit_check', true ).
                        attr( 'method', method  ).
                        attr( 'action', url     ).
                        attr( 'enctype', "multipart/form-data" ).
                        attr( 'target', frameID );
                
                form.submit();
                
                return true;
            };
            
            /* jQuery interface */
            $.getForm = function( url, form, onComplete, onError, type ) {
                return sendForm( 'get', url, form, onComplete, onError, type );
            };
            
            $.postForm = function( url, form, onComplete, onError, type ) {
                return sendForm( 'post', url, form, onComplete, onError, type );
            };
        })();
    })();

    /**
     * EventRunner timing utility function.
     * 
     * A common design pattern is to run a function repeatedly, using setTimeout,
     * but when you schedule a function to run, all previously waiting functions
     * should be cancelled.
     * 
     * Something like:
     * 
     * var k = null;
     * 
     * function runBar() {
     *     if ( k !== null ) {
     *      clearTimeout( k );
     *     }
     * 
     *     k = setTimeout( function() {
     *          k = null;
     *          doWork();
     *     );
     * }
     * 
     * The idea is that 'runBar' might be called repeatedly,
     * and each time it cancels any existing work,
     * and sets up a new batch of work to be run instead.
     * 
     * If there is no work to be cancelled, then the current work
     * is run anyway.
     * 
     * The EventRunner implements this design pattern.
     * 
     * Usage:
     *     var runner = new EventRunner( timeout );
     *     runner.run( function() {
     *          // do work
     *     } );
     * 
     * If 'run' is called before the previous 'run' was ever called,
     * then the previous 'run' is cancelled, and the new one replaces it.
     * 
     * To clarify, and to help be clear about what this does:
     * 'run' will cancel a timeout for a previously set function,
     * if you call 'run' before that timeout is fired.
     * This is the whole point of this EventRunner.
     * 
     * 'run' can also be cancelled using the 'clear' method,
     * and 'maybeRun' allows you to only set if there is not a function
     * waiting. 'isPending' also allows you to check if a function is set
     * for a timeout, or not.
     * 
     * The time to use for timeouts is set in the constructor.
     */
    window['EventRunner'] = (function() {
        /**
         * The timeout paramter is the amount of time the EventRunner should use
         * when it schedules a function to be called.
         * 
         * This is in milliseconds, and it defaults to 0 (run as soon as possible,
         * on the next JS cycle).
         * 
         * @constructor
         * @param timeout Optional, the length of time for functions to wait when passed into 'run'.
         */
        var EventRunner = function( timeout ) {
            this.timeout = ( timeout !== undefined ) ?
                    Math.max( timeout, 0 ) :
                    0 ;
            
            this.event = null;
        };
        
        /**
         * This can run in one of two ways.
         * 
         * If there is no parameter, then the current timeout is returned.
         * 
         *      var timeout = event.timeout();
         * 
         * If a newTimeout parameter is provided, then the current timeout
         * is replaced with it, and the old timeout is returned.
         * 
         *      // change the timeout
         *      event.timeout( newTimeout );
         *      
         *      // change the timeout, and store the old one
         *      var oldTimeout = event.timeout( newTimeout );
         * 
         * @param newTimeout Optional, a new timeout in milliseconds for functions to use when scheduled.
         * @return The current timeout, if no paramter, the old timeout, if a parameter is given.
         */
        EventRunner.prototype.timeout = function( newTimeout ) {
            if ( newTimeout !== undefined ) {
                var time = this.timeout
                this.timeout = Math.max( newTimeout, 0 );
                return time;
            } else {
                return this.timeout;
            }
        };

        /**
         * Cleares the current function waiting on a timeout.
         * 
         * If no function is waiting, then this silently does nothing.
         * 
         * True or false is returned to tell you if it did or did not
         * need to clear.
         * 
         * @return true if there was an event pending, false if not.
         */
        EventRunner.prototype.clear = function() {
            if ( this.isPending() ) {
                clearTimeout( this.event );
                this.event = null;
            }
            
            return this;
        };
        
        /**
         * States if the EventRunner currently has a function
         * waiting on a timeout, or not.
         * 
         * @return True if a function is waiting, false if not.
         */
        EventRunner.prototype.isPending = function() {
            return ( this.event !== null ) ;
        };
        
        /**
         * A helper function, that sets the function given,
         * on the runner given.
         * 
         * Note that this does no clearing, and no safety checks.
         * It's just a blob of code to be re-used by 'run' and 'maybeRun',
         * end of.
         * 
         * @private
         * @param runner The EventRunner to setup a timeout with.
         * @param f The function to setup in a timeout.
         * @return The given 'runner' object.
         */
        var setEvent = function( runner, f ) {
            runner.event = setTimeout(
                    function() {
                        runner.event = null;
                        f();
                    },
                    runner.timeout
            );
            
            return runner;
        };
        
        /**
         * 'run' sets up a timeout to run the given function in the future.
         * 
         * If a function is currently waiting on a timeout to be called,
         * then it will be cancelled before the given function is set to be run.
         * 
         * @param f The function to perform in the timeout.
         * @return This object, for method chaining.
         */
        EventRunner.prototype.run = function( f ) {
            return setEvent( this.clear(), f );
        };

        /**
         * maybeRun is the same as run,
         * except it will only run the given function,
         * if there is no function to run.
         * 
         * If there is a function already waiting to be run,
         * then nothing will happen.
         * 
         * Tbh this is mostly here for completeness,
         * only if you really don't want to cancel the old job.
         * 
         * @param f The function to perform in the timeout.
         * @return This object, for method chaining.
         */
        EventRunner.prototype.maybeRun = function( f ) {
            return ( !this.isPending() ) ?
                    setEvent( this, f ) :
                    this;
        };
        
        return EventRunner;
    })();

    /* ### Adding missing JS functions */

    /**
     * This ensures 'string.trim()' is always present,
     * by falling back onto the jQuery version.
     */
    if ( String.prototype.trim === undefined ) {
        String.prototype.trim = function() {
            return $.trim( this );
        }
    }
})(window, document, $, jQuery);
