"use strict";

/**
 * @license
 * 
 * jQuery.more.js

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
 *
 *
 * From jquery.mobile
 *
 * Copyright (c) 2011-12 John Resig, http://jquery.com/

    Permission is hereby granted, free of charge, to any person obtaining
    a copy of this software and associated documentation files (the
    "Software"), to deal in the Software without restriction, including
    without limitation the rights to use, copy, modify, merge, publish,
    distribute, sublicense, and/or sell copies of the Software, and to
    permit persons to whom the Software is furnished to do so, subject to
    the following conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
    LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
    OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
    WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * jQuery.more.js
 * 
 * This is a bunch of basic stuff, some jQuery extensions, some non-jQuery, for
 * building GUI apps in JS. It is not a UI manager, but instead is there to help
 * you build custom UIs. Especially custom UIs which require very custom items,
 * like a painting application.
 * 
 * It started life being built for Play My Code, then had some stuff added via
 * SkyBrush, and now is more general purpose.
 * 
 * It also includes some shorthand, like 'leftdown' and 'leftup' as left-click
 * specific alternatives to 'mousedown' and 'mouseup'. Methods involving
 * scrollbars, browser feature sniffing, working with forms (like AJAXy POST),
 * and more.
 * 
 * It also includes some generic classes which aim to fit into specific design
 * patterns. For example having lots of events hanging off a event handler, you
 * can achieve that using the EventHandler constructor.
 */
(function(window, document, $, jQuery, undefined){
    /*
     * Extra functions.
     * 
     * These are generic functions, used here, but also
     * available for outside use.
     */

    /**
     * Given a condition, if the condition is false,
     * an error is raised. The error contains the message given.
     * 
     * msg can also be a function, which is run when condition
     * is false, and it's returned value is thrown.
     * 
     * Extra arguments can also be passed in, which will be
     * outputted onto the console before the error is thrown.
     * This allows you to do something like:
     * 
     *     assert( x !== undefined && y !== undefined, "invalid x or y", x, y );
     * 
     * If x or y is undefined in the example, they are each
     * outputted to the console. and then the error is thrown.
     */
    var assert = window['assert'] = function( condition, msg ) {
        if ( ! condition ) {
            if ( isFunction(msg) ) {
                msg = msg();
            }

            // output any console items
            for ( var i = 2; i < arguments.length; i++ ) {
                console.log( arguments[i] );
            }

            throw new Error( "assertion error, " + msg );
        }
    };
 
    /**
     * Given an Arguments object, this will copy the elements
     * into an array, and return that array.
     * 
     * The startIndex is optional, and is there to state where
     * to copying. If start is outside of the arguments array,
     * then an empty array is returned.
     * 
     * 'num' is optional, and states how many to copy from
     * startIndex, until the end. If there are not enough
     * elements to copy, then the extra values are skipped.
     * The returned array will not be padded with undefined
     * or null, or anything like that.
     * 
     * This can also be used on arrays.
     * 
     * @param args The Arguments object to copy.
     * @param startIndex Optional, the index to start copying from.
     * @param num Optional, the number of elements to copy.
     * @return A new Array, containing the elements copied from 'args'.
     */
    function argumentsToArray( args, startIndex, num ) {
        if ( startIndex === undefined ) {
            startIndex = 0;
        }

        if ( num === undefined ) {
            num = args.length;
        } else {
            num = Math.min( args.length, startIndex+num );
        }

        var returnArgs = [];
        for ( var i = startIndex; i < num; i++ ) {
            returnArgs.push( args[i] );
        }

        return returnArgs;
    }

    /**
     * @param obj The object to check.
     * @return True if the given object is a function, false if not.
     */
    var isFunction = window['isFunction'] = function(obj) {
        return (obj instanceof Function) || ((typeof obj) == 'function') ;
    }

    /*
     * jQuery Additions.
     */

    /**
     * 
     */
    var toCssPx = function( n ) {
        if ( n === NaN ) {
            throw new Error("NaN given as CSS value");
        } else if ( n === 0 ) {
            return n;
        } else if ( typeof n === 'number' || n instanceof Number ) {
            return n + 'px';
        } else {
            return n;
        }
    };

    // catch all document.write() calls
    (function(document){
        var write = document.write;
        
        document.write = function(q) {
            log('document.write(): ',arguments); 
        
            if (/docwriteregexwhitelist/.test(q)) {
                write.apply(document,arguments);
            }
        };
    })(document);

    /**
     * Feature sniffing for various browsers.
     *
     * 
     * If you set an input type to 'date', and it's supported,
     * then it sticks. If it is not supported, it goes back to
     * the default, 'text'.
     * 
     * This just goes through all the types we want to test,
     * and uses that trick to test for support.
     */
    (function() {
        var supportedInputs = {};
        var types = [
                'date',
                'color',
                'range',
                'search',
                'number',
                'tel',
                'url',
                'email',
                'month',
                'week',
                'time',
                'datetime',
                'datetime-local'
        ];

        var input = document.createElement('input');
        for ( var i = 0; i < types.length; i++ ) {
            var type = types[i];

            input.setAttribute('type', type);
            supportedInputs[type] = ( input.type !== 'text' );
            input.setAttribute('type', 'text');
        }

        $.support.input = supportedInputs;
        $.support.touch = ( !! window.Touch );

        var ua = window['navigator']['userAgent'];
        var isIPhone = ua.indexOf( 'iPhone' ) > -1,
            isIPod  = ua.indexOf( 'iPod' ) > -1,
            isIPad  = ua.indexOf( 'iPad' ) > -1;

        var isIOS = isIPhone || isIPad || isIPod ;

        $.browser.iOS = isIPhone || isIPad || isIPod ;
        $.browser.iPhone = isIPhone;
        $.browser.iPad = isIPad;
        $.browser.iPod = isIPod;

        /*
         * Apply a translate3d, and then test if it's still present.
         */

        var transformTest = 'translate3d( 0, 0, 0 )';

        input.style.WebkitTransform = transformTest;
        input.style.   MozTransform = transformTest;
        input.style.    msTransform = transformTest;
        input.style.     OTransform = transformTest;
        input.style.      transform = transformTest;

        /*
         * Test the common browsers in order, with a specific test for each.
         * For example opera requires the transform sticking,
         * whilst IE requires being version 10 or above.
         *
         * If we hit an unknown browser, we just test if the transform is present.
         */
        $.support.transform3d = !! (
                $.browser.opera  ?   input.style.transform                                   :
                $.browser.moz    ? ( input.style.transform || input.style.MozTransform    )  :
                $.browser.webkit ? ( input.style.transform || input.style.WebkitTransform )  :
                $.browser.iOS    ? ( input.style.transform || input.style.WebkitTransform )  :
                $.browser.msie   ?   $.browser.version >= 10                                 :
                                     input.style.transform
        )
    })();

    /**
     * CSS extensions for browser transformations.
     */
    (function() {
        /**
         * Translates the object using webkit translate3d.
         */
        $.fn.translate = function( x, y, z ) {
            if ( arguments.length === 0 ) {
                var x = 0,
                    y = 0,
                    z = 0;
  
                var dom = this.get(0);
                if ( dom ) {
                    var style = dom.style;

                    var transform = style['transform'] ||
                            style['WebkitTransform'] ||
                            style['MozTransform'] ||
                            style['msTransform'] ||
                            style['OTransform'] ;

                    if ( transform ) {
                        var parts = transform.split( ',' );
                        var strX = parts[0];
                        strX = strX.substring( strX.indexOf('(')+1 );

                        x = parseInt( strX );
                        y = parts.length > 1 ? parseInt(parts[1]) : x;
                        z = parts.length > 2 ? parseInt(parts[2]) : 0;
                    }
                }

                return {
                        x: x,
                        y: y,
                        z: z
                };
            } else {
                if ( z === undefined ) {
                    z = 0;
                } else { 
                    z = toCssPx( z );
                }

                if ( y === undefined ) {
                    y = 0;
                } else {
                    y = toCssPx( y );
                }

                if ( x === undefined ) {
                    return;
                } else {
                    x = toCssPx( x );
                }

                var val = ( $.support.transform3d ) ?
                        'translate3d(' + x + ', ' + y + ', ' + z + ')' :
                        'translate(' + x + ', ' + y + ')' ;

                for ( var i = this.length-1; i >= 0; i-- ) {
                    var style = this[i].style;

                    if ( style !== undefined ) {
                        style.WebkitTransform = val;
                        style.MozTransform = val;
                        style.msTransform = val;
                        style.OTransform = val;
                        style.transform = val;
                    }
                }
            }

            return this;
        };
    })();

    /**
     * Event Additions.
     * 
     * Extra methods for the event, such as for location translation.
     */
    (function() {
        /**
         * This will 'offset' the location of the event
         * by the dom's location in the document.
         * 
         * The result is then returned.
         * 
         * Essentially it turns the 'pageX' and 'pageY'
         * co-ordinates into local ones within the dom.
         */
        $.Event.prototype.offset = function( dom ) {
            if ( dom.jquery === undefined ) {
                dom = $(dom);
            }

            var offset = dom.offset();

            return {
                    left: this.pageX - offset.left,
                    top : this.pageY - offset.top
            };
        };

        /**
         * Returns true if the dom is located within this event,
         * otherwise false.
         */
        $.Event.prototype.isWithin = function( dom ) {
            if ( dom.jquery === undefined ) {
                dom = $(dom);
            }

            var pos = this.offset( dom );

            var x = pos.left,
                y = pos.top ;

            return x >= 0 && y >= 0 && x < dom.width() && y < dom.height() ;
        };

        /**
         * @param A DOM element to check within. If not provided, it will use the event target.
         * @return True if this is within the scrollbar of the dom item given.
         */
        $.Event.prototype.isInScrollBar = function() {
            var $dom = arguments.length > 0 ?
                    $(arguments[0]) :
                    $(this.target) ;

            var pos = $dom.offset(),
                x, y,
                w, h,
                scrollSize;
            
            if ( pos !== null ) {
                x = this.pageX - pos.left;
                y = this.pageY - pos.top ;
                
                w = $dom.width();
                h = $dom.height();
                
                scrollSize = $dom.scrollBarSize();
            // pos will be null if run on something like 'document',
            // in which case we use the window
            } else {
                x = this.pageX - $dom.scrollLeft();
                y = this.pageY - $dom.scrollTop();
                
                var $window = $(window);
                
                w = $window.width();
                h = $window.height();
                
                scrollSize = $(document).scrollBarSize();
            }

            return ( scrollSize.right  > 0 && x >= w-scrollSize.right  ) ||
                   ( scrollSize.bottom > 0 && y >= h-scrollSize.bottom ) ;
        };
    })();

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
                if ( 
                        (ev.button === undefined && button === 0) ||
                         ev.button === button
                ) {
                    return fun.call( this, ev );
                }
            };
            
            return $(_this).bind( name, wrapper );
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
        
        $.fn.vclick = function( fun ) {
            if ( $.browser.iOS ) {
                return this.bind( 'vclick', fun );
            } else {
                return this.click( fun );
            }
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
                        if ( ! ev.isInScrollBar(this) ) {
                            return fun.call( this, ev );
                        }
                    },
                    'vmousedown',
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
        
        /**
         * Helper function avoid code duplication with 'scrollup' and 'scrolldown'.
         */
        var scrollEvent = function( $this, action, fun ) {
            return $this[action]( function(ev) {
                if ( ev.button === 0 && ev.isInScrollBar() ) {
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
                    bind( 'vmousemove', function(ev) {
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
        
        var onEventsFun = function( callback ) {
            return function() {
                for ( var i = 0; i < arguments.length; i++ ) {
                    // must use the event name as 'bind' seems to propogate anyway
                    var event = arguments[i];

                    if ( this[event] ) {
                        this[ event ]( callback );
                    } else {
                        this.bind( event, callback );
                    }
                }
                
                return this;
            };
        };

        /**
         * Stops events from propagating, but does not prevent default
         * behaviour, on the events given.
         */
        $.fn.stopPropagation = onEventsFun( function(ev) {
            ev.stopPropagation();
        } );

        /**
         * Prevents the default behaviour on the events given.
         */
        $.fn.preventDefault = onEventsFun( function(ev) {
            ev.preventDefault();
        } );

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
        $.fn.killEvent = onEventsFun( function(ev) {
            ev.preventDefault();
            ev.stopPropagation();

            return false;
        } );

        /**
         * Allows you to setup this component to forward it's events on to
         * another item.
         *
         * To can be a selector, a jQuery object, or a DOM element.
         *
         * All of the events to pass on are listed after 'to'.
         *
         * Usage:
         *  foo.forwardEvents( $('.bar'), 'mousedown', 'click', 'mouseup' );
         *
         * @param to The element to forward events on to.
         * @return This jQuery object for chaining.
         */
        $.fn.forwardEvents = function( to ) {
            to = $(to);

            for ( var i = 1; i < arguments.length; i++ ) {
                this.bind( arguments[i], function(ev) {
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
         * @param callback An option callback to be called, if the class was not present.
         */
        $.fn.ensureClass = function( klass, callback ) {
            if ( ! this.hasClass(klass) ) {
                this.addClass(klass);

                if ( callback !== undefined ) {
                    callback.call( this );
                }
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
                            try {
                                var resultObj = $.parseJSON(
                                        stripOuterHTMLAroundJSON( result )
                                );

                                onComplete.call( form, resultObj );
                            } catch ( err ) {
                                onError.call( form, err );
                            }
                        }
                    } else {
                        newOnComplete = function( result ) {
                            onComplete.call( form, result );
                        }
                    }
                } else {
                    newOnComplete = onComplete;
                }

                if ( url.indexOf('?') === -1 ) {
                    url += '?php_error_is_ajax=true';
                } else {
                    url += '&php_error_is_ajax=true';
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

    window['anim'] = (function() {
        /**
         * A hint to use the MozBeforePaint event,
         * as it can be slightly faster than passing in
         * a function each time.
         * 
         * From FF 5 onwards, this gives a massive speed down.
         */
        var USE_MOZ_BEFORE_PAINT = ( $.browser.mozilla && $.browser.version < 5 );

        /**
         * Used only by setTimeout and setInterval.
         * 
         * When they are used, their id value is set here.
         */
        var NO_ID = 0;

        /**
         * A common interface for timeouts and intervals.
         * This will attempt to use the 'requestAnimationFrame' where available.
         * 
         * If it is not available, then it will use set timeout or set interval.
         */
        var anim = {
                /**
                 * Returns the 'requestAnimationFrame' function for this
                 * browser, by normalizing the various types based on
                 * vendor prefix.
                 * 
                 * @nosideeffects
                 * @return {?function(...*)}
                 */
                getAnimFrame: function() {
                    return  window.requestAnimationFrame       ||
                            window.webkitRequestAnimationFrame ||
                            window.mozRequestAnimationFrame    ||
                            window.oRequestAnimationFrame      ||
                            window.msRequestAnimationFrame     ||
                            null ;
                },
        
                /**
                 * @param callback A callback function to perform on each frame.
                 * @param interval optional, and is how long the 'setInterval' version should take between frames.
                 * @param canvas optional, the HTMLElement which is being redrawn (used as a hint by some browsers).
                 */
                interval: function( callback, interval, canvas ) {
                    /**
                     * Default to (approximate) 60fps.
                     */
                    if ( interval === undefined ) {
                        interval = 16;
                    }

                    var callObj = {
                            id          : NO_ID,
                            callback    : null,
                            isInterval  : true,
                            isRunning   : true
                    };

                    var animFrame = anim.getAnimFrame();

                    if ( animFrame ) {
                        var recursiveCallback;

                        if ( USE_MOZ_BEFORE_PAINT ) {
                            recursiveCallback = function() {
                                callback();
                                animFrame();
                            };

                            window.addEventListener("MozBeforePaint", recursiveCallback, false);
                            animFrame();
                        } else {
                            recursiveCallback = function() {
                                if ( callObj.isRunning ) {
                                    callback();
                                    animFrame( recursiveCallback, canvas );
                                }
                            };

                            setTimeout( recursiveCallback, interval );
                        }

                        callObj.callback = recursiveCallback;
                    // everything else ...
                    } else {
                        callObj.id = setInterval( callback, interval );
                    }

                    return callObj;
                },

                /**
                 * If you want a repeating animation frame,
                 * use 'anim.interval'.
                 * It aims to be the best solution.
                 * 
                 * If you disagree, use a bespoke solution.
                 * 
                 * Do not use this for set interval, as it's
                 * just not designed with it in mind.
                 * 
                 * @param callback The callback function to call on each frame.
                 * @param canvas optional, a HTMLElement used for requestAnimationFrame, as a hint of where to redraw (used by some browsers).
                 */
                timeout: function( callback, canvas ) {
                    var callObj = {
                            id          : NO_ID,
                            callback    : null,
                            isInterval  : false,
                            isRunning   : true
                    };

                    var animFrame = anim.getAnimFrame();

                    if ( animFrame ) {
                        animFrame(
                                function() {
                                    if ( callObj.isRunning === true ) {
                                        callback();
                                    }
                                },
                                canvas
                        )
                    // everything else ...
                    } else {
                        callObj.id = setTimeout( callback, 0 );
                    }

                    return callObj;
                },

                /**
                 * @param The interval, or timeout, callback to clear.
                 * @return True if the callback was cleared, false if not.
                 */
                clear: function( callback ) {
                    if ( callback.isRunning ) {
                        callback.isRunning = false;

                        if ( callback.isInterval ) {
                            if ( callback.id !== NO_ID ) {
                                clearInterval( callback.id );
                            } else if ( USE_MOZ_BEFORE_PAINT ) {
                                window.removeEventListener( "MozBeforePaint", callback.callback );
                            }
                        } else if ( callback.id !== NO_ID ) {
                            clearTimeout( callback.id );
                        }

                        return true;
                    } else {
                        return false;
                    }
                }
        }

        return anim;
    })();

    window['events'] = {
        /**
         * A simple, generic event handler.
         *
         * It's pretty common in UI's that you have a central object
         * that manages the app. This makes the wiring simpler.
         *
         * When something happens in the app, it tells the central
         * object that it's happening. The central object then tells
         * the application components to all update.
         *
         * This is a class for helping to build that model. You can
         * add callbacks to this event handler, and then tell it to
         * run all those callbacks on demand. That way the updates
         * can be easily added, and run, as needed.
         * 
         * You can attach functions, using 'add', and then run them later,
         * using 'context'.
         * 
         * @constructor
         * @private
         */
        Handler: (function() {
            var EventHandler = function( context ) {
                this.events = {};
                this.context = context;
            };

            var runEvents = function( handler, type, context, args, startArgsI ) {
                var es = handler.events[type];

                if ( es !== undefined ) {
                    var esArgs = argumentsToArray( args, startArgsI );

                    for ( var i = 0; i < es.length; i++ ) {
                        es[i].apply( context, esArgs );
                    }
                }

                return handler;
            }

            /**
             * Adds a new event to store under the 'type'.
             *
             * @param type The type of event being stored.
             * @param event The event to store.
             * @return this EventHandler object.
             */
            EventHandler.prototype = {
                add: function( type, event ) {
                    var es = this.events[ type ];

                    if ( es === undefined ) {
                        this.events[ type ] = [ event ];
                    } else {
                        es.push( event );
                    }

                    return this;
                },

                /**
                 * Finds the event given for that type, and if found, it
                 * is removed from the event handler.
                 *
                 * If the event is not found, then this does nothing.
                 *
                 * @param type The name of the event.
                 * @param event The callback to remove from being called.
                 * @return This EventHandler object.
                 */
                remove: function( type, event ) {
                    var es = this.events[ type ];

                    if ( es !== undefined ) {
                        for ( var i = 0; i < es.length; i++ ) {
                            if ( es[i] === event ) {
                                es.splice( i, 1 );

                                break;
                            }
                        }
                    }

                    return this;
                },

                /**
                 * @return The context used when calling callbacks.
                 */
                getContext: function() {
                    return this.context;
                },

                /**
                 * 
                 */
                setContext: function( context ) {
                    this.context = context;
                },

                /**
                 * Runs all of the events stored under the type given.
                 * Each event is called as if it were run on the 'context' object.
                 * 
                 * @param type The type of events to run.
                 * @return this EventHandler object.
                 */
                run: function( type ) {
                    return runEvents( this, type, this.context, arguments, 1 );
                },

                /**
                 * Same as run, only this allows you to also state the context too.
                 */
                runContext: function( type, context ) {
                    return runEvents( this, type, context, arguments, 2 );
                }
            };

            return EventHandler;
        })(),

        /**
         * EventRunner timing utility function.
         * 
         * A common design pattern is to run a function repeatedly, using setTimeout,
         * but when you schedule a function to run, all previously waiting functions
         * should be cancelled.
         * 
         * Something like:
         * 
         * var currentWork = null;
         * 
         * function run( callback ) {
         *     if ( currentWork !== null ) {
         *      clearTimeout( currentWork );
         *     }
         * 
         *     currentWork = setTimeout( function() {
         *          currentWork = null;
         *          callback();
         *     } );
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
        Runner: (function() {
            /**
             * The timeout paramter is the amount of time the EventRunner should use
             * when it schedules a function to be called.
             * 
             * This is in milliseconds, and it defaults to 0 (run as soon as possible,
             * on the next JS cycle).
             * 
             * @constructor
             * @param timeout Optional, the length of time for functions to wait when passed into 'run'. Defaults to 0.
             * @param context Optional, the context which is used when calling the event. 'null' is used by default.
             */
            var EventRunner = function( timeout, context ) {
                this.event = null;
                this.contextObj = null;
                this.timeoutVal = 0;
                
                if ( arguments.length > 0 ) {
                    this.timeout( timeout );
                }

                if ( arguments.length > 1 ) {
                    this.context( context );
                }
            };
            
            EventRunner.prototype = {
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
                 * @return The current timeout, if no paramter, the old timeout. If a value is provided, then this object is returned.
                 */
                timeout: function( newTimeout ) {
                    if ( arguments.length > 0 ) {
                        assert(
                                typeof newTimeout === 'number' || newTimeout instanceof Number,
                                "non number given as timeout"
                        );
                        assert( isFinite( newTimeout ), "illegal number given (NaN or infinity)" )
                        assert( newTimeout >= 0, "negative timeout given" );

                        var time = this.timeoutVal;

                        this.timeoutVal = Math.max( newTimeout, 0 );

                        return this;
                    } else {
                        return this.timeoutVal;
                    }
                },

                context: function( newContext ) {
                    if ( arguments.length > 0 ) {
                        assert( newContext !== undefined, "undefined context given" );

                        this.contextObj = newContext || null;

                        return this;
                    } else {
                        return this.contextObj;
                    }
                },

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
                clear: function() {
                    if ( this.isPending() ) {
                        clearTimeout( this.event );
                        this.event = null;
                    }
                    
                    return this;
                },
                
                /**
                 * States if the EventRunner currently has a function
                 * waiting on a timeout, or not.
                 * 
                 * @return True if a function is waiting, false if not.
                 */
                isPending: function() {
                    return ( this.event !== null ) ;
                },
                
                /**
                 * 'run' sets up a timeout to run the given function in the future.
                 * 
                 * If a function is currently waiting on a timeout to be called,
                 * then it will be cancelled before the given function is set to be run.
                 * 
                 * @param f The function to perform in the timeout.
                 * @return This object, for method chaining.
                 */
                run: function( f ) {
                    var self = this;

                    if ( self.event !== null ) {
                        clearTimeout( self.event );
                    }

                    self.event = setTimeout( function() {
                        self.event = null;

                        if ( self.contextObj !== null ) {
                            f.call( self.contextObj );
                        } else {
                            f();
                        }
                    }, self.timeoutVal );

                    return self;
                },

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
                maybeRun: function( f ) {
                    if ( ! this.isPending() ) {
                        return this.run( f );
                    } else {
                        return this;
                    }
                }
            };
            
            return EventRunner;
        })()
    };
    
    /* ### Adding extra global JS functions */

    /**
     * This ensures 'string.trim()' is always present,
     * by falling back onto the jQuery version.
     */
    if ( String.prototype.trim === undefined ) {
        String.prototype.trim = function() {
            return $.trim( this );
        }
    }

    if ( Math.limit === undefined ) {
        /**
         * Applies both a min and max to n, against the values given.
         * n is then returned, limited to the range from min to max.
         *
         * @param {number} n The value to limit.
         * @param {number} min The minimum value n can be.
         * @param {number} max The maximum value n can be.
         * @return {number} n limited to between min and max.
         */
        Math.limit = function( n, min, max ) {
            return Math.max(
                    min,
                    Math.min(
                            max,
                            n
                    )
            );
        };
    };

    var oldRound = Math.round;

    /**
     * This new and improved version of round allows you to add
     * the nearest value.
     * 
     * For example, the normal Math.round rounds to the nearest
     * whole number; it rounds to the nearest '1'. This allows
     * you to specify a different value to round to, such as '2',
     * the nearest '16', or the nearest '0.9382'.
     * 
     *  var val = Math.round( 1.3984532, 0.28349 );
     * 
     * The second value is optional, and default to 1.
     * 
     * @param n The value to round.
     * @param step Optional, the nearest value to round to.
     */
    Math.round = function( n, step ) {
        step = step|0;
        if ( step === 0 ) {
            step = 1;
        }

        return oldRound( n/step )*step;
    };

    /**
     * Virtual Mouse taken from jQuery.mobile
     */
    (function( $, window, document, undefined ) {
        var dataPropertyName = "virtualMouseBindings",
            touchTargetPropertyName = "virtualTouchID",
            virtualEventNames = "vmouseover vmousedown vmousemove vmouseup vclick vmouseout vmousecancel".split( " " ),
            touchEventProps = "clientX clientY pageX pageY screenX screenY".split( " " ),
            mouseHookProps = $.event.mouseHooks ? $.event.mouseHooks.props : [],
            mouseEventProps = $.event.props.concat( mouseHookProps ),
            activeDocHandlers = {},
            resetTimerID = 0,
            startX = 0,
            startY = 0,
            didScroll = false,
            clickBlockList = [],
            blockMouseTriggers = false,
            blockTouchTriggers = false,
            eventCaptureSupported = "addEventListener" in document,
            $document = $( document ),
            nextTouchID = 1,
            lastTouchID = 0, threshold;

        $.vmouse = {
            moveDistanceThreshold: 10,
            clickDistanceThreshold: 10,
            resetTimerDuration: 1500
        };

        function getNativeEvent( event ) {

            while ( event && typeof event.originalEvent !== "undefined" ) {
                event = event.originalEvent;
            }
            return event;
        }

        function createVirtualEvent( event, eventType ) {

            var t = event.type,
                oe, props, ne, prop, ct, touch, i, j, len;

            event = $.Event(event);
            event.type = eventType;

            oe = event.originalEvent;
            props = $.event.props;

            // addresses separation of $.event.props in to $.event.mouseHook.props and Issue 3280
            // https://github.com/jquery/jquery-mobile/issues/3280
            if ( t.search( /^(mouse|click)/ ) > -1 ) {
                props = mouseEventProps;
            }

            // copy original event properties over to the new event
            // this would happen if we could call $.event.fix instead of $.Event
            // but we don't have a way to force an event to be fixed multiple times
            if ( oe ) {
                for ( i = props.length, prop; i; ) {
                    prop = props[ --i ];
                    event[ prop ] = oe[ prop ];
                }
            }

            // make sure that if the mouse and click virtual events are generated
            // without a .which one is defined
            if ( t.search(/mouse(down|up)|click/) > -1 && !event.which ){
                event.which = 1;
            }

            if ( t.search(/^touch/) !== -1 ) {
                ne = getNativeEvent( oe );
                t = ne.touches;
                ct = ne.changedTouches;
                touch = ( t && t.length ) ? t[0] : ( (ct && ct.length) ? ct[ 0 ] : undefined );

                if ( touch ) {
                    for ( j = 0, len = touchEventProps.length; j < len; j++){
                        prop = touchEventProps[ j ];
                        event[ prop ] = touch[ prop ];
                    }
                }
            }

            return event;
        }

        function getVirtualBindingFlags( element ) {

            var flags = {},
                b, k;

            while ( element ) {

                b = $.data( element, dataPropertyName );

                for (  k in b ) {
                    if ( b[ k ] ) {
                        flags[ k ] = flags.hasVirtualBinding = true;
                    }
                }
                element = element.parentNode;
            }
            return flags;
        }

        function getClosestElementWithVirtualBinding( element, eventType ) {
            var b;
            while ( element ) {

                b = $.data( element, dataPropertyName );

                if ( b && ( !eventType || b[ eventType ] ) ) {
                    return element;
                }
                element = element.parentNode;
            }
            return null;
        }

        function enableTouchBindings() {
            blockTouchTriggers = false;
        }

        function disableTouchBindings() {
            blockTouchTriggers = true;
        }

        function enableMouseBindings() {
            lastTouchID = 0;
            clickBlockList.length = 0;
            blockMouseTriggers = false;

            // When mouse bindings are enabled, our
            // touch bindings are disabled.
            disableTouchBindings();
        }

        function disableMouseBindings() {
            // When mouse bindings are disabled, our
            // touch bindings are enabled.
            enableTouchBindings();
        }

        function startResetTimer() {
            clearResetTimer();
            resetTimerID = setTimeout(function(){
                resetTimerID = 0;
                enableMouseBindings();
            }, $.vmouse.resetTimerDuration );
        }

        function clearResetTimer() {
            if ( resetTimerID ){
                clearTimeout( resetTimerID );
                resetTimerID = 0;
            }
        }

        function triggerVirtualEvent( eventType, event, flags ) {
            var ve;

            if ( ( flags && flags[ eventType ] ) ||
                        ( !flags && getClosestElementWithVirtualBinding( event.target, eventType ) ) ) {

                ve = createVirtualEvent( event, eventType );

                $( event.target).trigger( ve );
            }

            return ve;
        }

        function mouseEventCallback( event ) {
            var touchID = $.data(event.target, touchTargetPropertyName);

            if ( !blockMouseTriggers && ( !lastTouchID || lastTouchID !== touchID ) ){
                var ve = triggerVirtualEvent( "v" + event.type, event );
                if ( ve ) {
                    if ( ve.isDefaultPrevented() ) {
                        event.preventDefault();
                    }
                    if ( ve.isPropagationStopped() ) {
                        event.stopPropagation();
                    }
                    if ( ve.isImmediatePropagationStopped() ) {
                        event.stopImmediatePropagation();
                    }
                }
            }
        }

        function handleTouchStart( event ) {

            var touches = getNativeEvent( event ).touches,
                target, flags;

            if ( touches && touches.length === 1 ) {

                target = event.target;
                flags = getVirtualBindingFlags( target );

                if ( flags.hasVirtualBinding ) {

                    lastTouchID = nextTouchID++;
                    $.data( target, touchTargetPropertyName, lastTouchID );

                    clearResetTimer();

                    disableMouseBindings();
                    didScroll = false;

                    var t = getNativeEvent( event ).touches[ 0 ];
                    startX = t.pageX;
                    startY = t.pageY;

                    triggerVirtualEvent( "vmouseover", event, flags );
                    triggerVirtualEvent( "vmousedown", event, flags );
                }
            }
        }

        function handleScroll( event ) {
            if ( blockTouchTriggers ) {
                return;
            }

            if ( !didScroll ) {
                triggerVirtualEvent( "vmousecancel", event, getVirtualBindingFlags( event.target ) );
            }

            didScroll = true;
            startResetTimer();
        }

        function handleTouchMove( event ) {
            if ( blockTouchTriggers ) {
                return;
            }

            var t = getNativeEvent( event ).touches[ 0 ],
                didCancel = didScroll,
                moveThreshold = $.vmouse.moveDistanceThreshold,
                flags = getVirtualBindingFlags( event.target );

                didScroll = didScroll ||
                    ( Math.abs(t.pageX - startX) > moveThreshold ||
                        Math.abs(t.pageY - startY) > moveThreshold );


            if ( didScroll && !didCancel ) {
                triggerVirtualEvent( "vmousecancel", event, flags );
            }

            triggerVirtualEvent( "vmousemove", event, flags );
            startResetTimer();
        }

        function handleTouchEnd( event ) {
            if ( blockTouchTriggers ) {
                return;
            }

            disableTouchBindings();

            var flags = getVirtualBindingFlags( event.target ),
                t;
            triggerVirtualEvent( "vmouseup", event, flags );

            if ( !didScroll ) {
                var ve = triggerVirtualEvent( "vclick", event, flags );
                if ( ve && ve.isDefaultPrevented() ) {
                    // The target of the mouse events that follow the touchend
                    // event don't necessarily match the target used during the
                    // touch. This means we need to rely on coordinates for blocking
                    // any click that is generated.
                    t = getNativeEvent( event ).changedTouches[ 0 ];
                    clickBlockList.push({
                        touchID: lastTouchID,
                        x: t.clientX,
                        y: t.clientY
                    });

                    // Prevent any mouse events that follow from triggering
                    // virtual event notifications.
                    blockMouseTriggers = true;
                }
            }
            triggerVirtualEvent( "vmouseout", event, flags);
            didScroll = false;

            startResetTimer();
        }

        function hasVirtualBindings( ele ) {
            var bindings = $.data( ele, dataPropertyName ),
                k;

            if ( bindings ) {
                for ( k in bindings ) {
                    if ( bindings[ k ] ) {
                        return true;
                    }
                }
            }
            return false;
        }

        function dummyMouseHandler(){}

        function getSpecialEventObject( eventType ) {
            var realType = eventType.substr( 1 );

            return {
                setup: function( data, namespace ) {
                    // If this is the first virtual mouse binding for this element,
                    // add a bindings object to its data.

                    if ( !hasVirtualBindings( this ) ) {
                        $.data( this, dataPropertyName, {});
                    }

                    // If setup is called, we know it is the first binding for this
                    // eventType, so initialize the count for the eventType to zero.
                    var bindings = $.data( this, dataPropertyName );
                    bindings[ eventType ] = true;

                    // If this is the first virtual mouse event for this type,
                    // register a global handler on the document.

                    activeDocHandlers[ eventType ] = ( activeDocHandlers[ eventType ] || 0 ) + 1;

                    if ( activeDocHandlers[ eventType ] === 1 ) {
                        $document.bind( realType, mouseEventCallback );
                    }

                    // Some browsers, like Opera Mini, won't dispatch mouse/click events
                    // for elements unless they actually have handlers registered on them.
                    // To get around this, we register dummy handlers on the elements.

                    $( this ).bind( realType, dummyMouseHandler );

                    // For now, if event capture is not supported, we rely on mouse handlers.
                    if ( eventCaptureSupported ) {
                        // If this is the first virtual mouse binding for the document,
                        // register our touchstart handler on the document.

                        activeDocHandlers[ "touchstart" ] = ( activeDocHandlers[ "touchstart" ] || 0) + 1;

                        if (activeDocHandlers[ "touchstart" ] === 1) {
                            $document.bind( "touchstart", handleTouchStart )
                                .bind( "touchend", handleTouchEnd )

                                // On touch platforms, touching the screen and then dragging your finger
                                // causes the window content to scroll after some distance threshold is
                                // exceeded. On these platforms, a scroll prevents a click event from being
                                // dispatched, and on some platforms, even the touchend is suppressed. To
                                // mimic the suppression of the click event, we need to watch for a scroll
                                // event. Unfortunately, some platforms like iOS don't dispatch scroll
                                // events until *AFTER* the user lifts their finger (touchend). This means
                                // we need to watch both scroll and touchmove events to figure out whether
                                // or not a scroll happenens before the touchend event is fired.

                                .bind( "touchmove", handleTouchMove )
                                .bind( "scroll", handleScroll );
                        }
                    }
                },

                teardown: function( data, namespace ) {
                    // If this is the last virtual binding for this eventType,
                    // remove its global handler from the document.

                    --activeDocHandlers[ eventType ];

                    if ( !activeDocHandlers[ eventType ] ) {
                        $document.unbind( realType, mouseEventCallback );
                    }

                    if ( eventCaptureSupported ) {
                        // If this is the last virtual mouse binding in existence,
                        // remove our document touchstart listener.

                        --activeDocHandlers[ "touchstart" ];

                        if ( !activeDocHandlers[ "touchstart" ] ) {
                            $document.unbind( "touchstart", handleTouchStart )
                                .unbind( "touchmove", handleTouchMove )
                                .unbind( "touchend", handleTouchEnd )
                                .unbind( "scroll", handleScroll );
                        }
                    }

                    var $this = $( this ),
                        bindings = $.data( this, dataPropertyName );

                    // teardown may be called when an element was
                    // removed from the DOM. If this is the case,
                    // jQuery core may have already stripped the element
                    // of any data bindings so we need to check it before
                    // using it.
                    if ( bindings ) {
                        bindings[ eventType ] = false;
                    }

                    // Unregister the dummy event handler.

                    $this.unbind( realType, dummyMouseHandler );

                    // If this is the last virtual mouse binding on the
                    // element, remove the binding data from the element.

                    if ( !hasVirtualBindings( this ) ) {
                        $this.removeData( dataPropertyName );
                    }
                }
            };
        }

        // Expose our custom events to the jQuery bind/unbind mechanism.

        for ( var i = 0; i < virtualEventNames.length; i++ ){
            $.event.special[ virtualEventNames[ i ] ] = getSpecialEventObject( virtualEventNames[ i ] );
        }

        // Add a capture click handler to block clicks.
        // Note that we require event capture support for this so if the device
        // doesn't support it, we punt for now and rely solely on mouse events.
        if ( eventCaptureSupported ) {
            document.addEventListener( "click", function( e ){
                var cnt = clickBlockList.length,
                    target = e.target,
                    x, y, ele, i, o, touchID;

                if ( cnt ) {
                    x = e.clientX;
                    y = e.clientY;
                    threshold = $.vmouse.clickDistanceThreshold;

                    // The idea here is to run through the clickBlockList to see if
                    // the current click event is in the proximity of one of our
                    // vclick events that had preventDefault() called on it. If we find
                    // one, then we block the click.
                    //
                    // Why do we have to rely on proximity?
                    //
                    // Because the target of the touch event that triggered the vclick
                    // can be different from the target of the click event synthesized
                    // by the browser. The target of a mouse/click event that is syntehsized
                    // from a touch event seems to be implementation specific. For example,
                    // some browsers will fire mouse/click events for a link that is near
                    // a touch event, even though the target of the touchstart/touchend event
                    // says the user touched outside the link. Also, it seems that with most
                    // browsers, the target of the mouse/click event is not calculated until the
                    // time it is dispatched, so if you replace an element that you touched
                    // with another element, the target of the mouse/click will be the new
                    // element underneath that point.
                    //
                    // Aside from proximity, we also check to see if the target and any
                    // of its ancestors were the ones that blocked a click. This is necessary
                    // because of the strange mouse/click target calculation done in the
                    // Android 2.1 browser, where if you click on an element, and there is a
                    // mouse/click handler on one of its ancestors, the target will be the
                    // innermost child of the touched element, even if that child is no where
                    // near the point of touch.

                    ele = target;

                    while ( ele ) {
                        for ( i = 0; i < cnt; i++ ) {
                            o = clickBlockList[ i ];
                            touchID = 0;

                            if ( ( ele === target && Math.abs( o.x - x ) < threshold && Math.abs( o.y - y ) < threshold ) ||
                                        $.data( ele, touchTargetPropertyName ) === o.touchID ) {
                                // XXX: We may want to consider removing matches from the block list
                                //      instead of waiting for the reset timer to fire.
                                e.preventDefault();
                                e.stopPropagation();
                                return;
                            }
                        }
                        ele = ele.parentNode;
                    }
                }
            }, true);
        }
    })( jQuery, window, document );
})(window, document, $, jQuery);
