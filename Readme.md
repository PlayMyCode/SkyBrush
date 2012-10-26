SkyBrush
========

An embeddable, HTML5 Canvas powered, based art painting application!

It allows you to have a canvas, which can be moved around and zoomed, floating dialog boxes on top of the canvas, various brushes you can use for painting, colour picker, and more!

This uses and requires jQuery. As of writing, the latest version is bundled with it.

Features
--------
 * Works on iPad!
 * easy embeddable painting application
 * cross browser; supports IE 9+, Firefox, Chrome, Safari and Opera
 * in-built common key bindings
 * simple interface for setting/getting/manipulating content
 * all the basics; brush, pencil, zoom, shapes, colour picker, mixer, copy+paste, alpha blending modes, overlay grid, resizing/scaling, selections and more
 * no cruft! Built to work well on it's own, or with hooks tied in, so you can easily add your own stuff around it.

Try it out!
-------------

 * A live demo is online [here](http://www.studiofortress.com/skybrush).
 * it is used for editing images on [Play My Code](http://www.playmycode.com), which you can [try here](http://www.playmycode.com/build/try-play-my-code).
 * it's on the [Mozilla Developer Network](https://developer.mozilla.org/en-US/demos/detail/skybrush) (remember to like it!)
 * and it's also a [Chrome Experiment](http://www.chromeexperiments.com/detail/skybrush/)

### Are you using SkyBrush?

If you are, tell us, and we'll be happy to add you to the list!

Key Bindings
------------

### Standard

Action     | Windows            | Mac OS
---------- | ------------------ | ------------------------
Undo       | ctrl + z           | command + z
Redo       | ctrl + r, ctrl + y | command + r, command + y
Copy       | ctrl + c           | command + c
Cut        | ctrl + x           | command + x
Paste      | ctrl + v           | command + v
Select All | ctrl + a           | command + a
Crop       | ctrl + e           | command + e
Delete     | delete             | delete

### Switch to Tool

Tool                | Windows  | Mac OS
------------------- | -------- | --------
Pencil              | p        | p
Brush               | b        | b
Eraser              | e        | e
Rectangle           | r        | f
Circle              | c        | c
Line                | l        | l
Fill                | f        | f
Zoom                | z        | z
                    |
Selection           | s        | s
Move Tool           | m        | m
                    |
Color Picker        | k        | k
Color Picker Toggle | hold alt | hold alt

### Tool Specific Hold Shift Options

If you hold shift with these options, Windows or Mac OS, the following behaviours occur whilst shift is held.

With Tool | Action
--------- | -------------------------------------
Pencil    | Switches to the eraser
Brush     | Switches to the eraser
Rectangle | Toggles between outline and filled
Circle    | Toggles between outline and filled
Line      | Toggles between smooth and non-smooth
          |
Zoom      | Zooms in the opposite direction

Embedding
---------

This is the bare minimum to embed SkyBrush:

```html
	<!DOCTYPE html>
	<html>
		<head>
	    	<link rel="stylesheet" href="./skybrush/css/skybrush.css" />
	    </head>
	    <body>
	    	<div class="skybrush"></div>
	    </body>

	    <script src="./skybrush/js/jquery-1.7.2.min.js"></script>
	    <script src="./skybrush/js/jquery.more.js"></script>
	    <script src="./skybrush/js/skybrush.js"></script>

	    <script>
	        var dom = $( '.skybrush' );
	        var skybrush = new SkyBrush( dom );
	    </script>
	</html>
```

### Embedding Instructions

Download the code, and unpack it. Everything in the 'skybrush' folder is what you need. Place that in the root of your site.

On the page:

 - import 'skybrush.css' in the head, which is in the 'skybrush/css' folder.
 - create an empty 'div', which is then used by SkyBrush to put the painting application into.
 - load the SkyBrush JS files and jQuery; this can be at the start or end of your page
 - then grab the div; either using jQuery or by grabbing the element directly using the DOM API
 - create a new instance of SkyBrush, and pass the div in.

Embedding API
-------------

When you create a SkyBrush art package, you set it up in HTML, by creating a new JS object you can interact with. You can do this by using the SkyBrush constructor.

### new SkyBrush( dom )

This creates a new SkyBrush instance, and sets up the art package using the div given. That div is as the basis of where to put the SkyBrush HTML it adds.

Dom can be:
 * A HTML element
 * A jQuery object
 * A string describing a CSS selector, such as ".skybrush"

For example:

```html
	<div id="skybrush"></div>

	<script>
		// using a dom element
		var div = document.getElementById( 'skybrush' );
		var skybrush = new SkyBrush( div );
	</script>
```

```html
	<div class="skybrush"></div>

	<script>
		// using a jQuery object
		var skybrush = new SkyBrush( $('.skybrush') );
	</script>
```

```html
	<div class="skybrush"></div>

	<script>
		// using a CSS selector
		var skybrush = new SkyBrush( '.skybrush' );
	</script>
```

### new SkyBrush( dom, options )

Some options are included to help make embedding a little easier, as a second parameter. A JS object is expected, with the properties set as the options. All of the options include:

 * width - sets the starting width of the canvas, in pixels
 * height - sets the starting height of the canvas, in pixels

 * grab_ctrl_r - pass in false, and SkyBrush will stay away from the 'ctrl+r' key binding.

 * image_location - This is so you can move images to a different folder, in respect to the rest of the files. See the section on 'Change Image Location' below.
 * callback - this function is run when SkyBrush has finished setting up

For example:

```js
	var dom = $( '.skybrush' );

	var options = {
			width:  640,
			height: 480,

			callback: function() {
				// skybrush is now setup \o/
			}
		}
	};

    var skybrush = new SkyBrush( dom, options );
```

#### About Ctrl+R

Ctrl+R is grabbed as this is often used for redo in painting apps, but this disabled the ctrl+r used by the browser for refreshing the page. Gravving it also avoids the user reaching for it instinctively, and then having that "oh $*%&!" moment when the browser refreshes, and they lose their image.

You can prevent this behaviour using the 'grab_ctrl_r' option:

```js
	var dom = $( '.skybrush' );

    var skybrush = new SkyBrush( dom, {
    		grab_ctrl_r: false
	} );
```

#### Change Image Location

If your images are not showing up, you probably need to read this! Otherwise skip it.

Images are located relative to the CSS file. At the time of writing, this is './../images'.
If you want to put the css and images in totally different places, you can do this by
passing in the 'image_location' option when setting up SkyBrush.

```js
	var dom = $( '.skybrush' );

    var skybrush = new SkyBrush( dom, {
    		image_location: '/images'
	} );
```

SkyBrush will then update the CSS rules on the fly to use the new location.

API Image Setting / Getting
---------------------------

You can interact with SkyBrush from JS. This is mostly for getting out the current image, setting an image, and creating a new canvas;
but a few other things can be done too. These all operate on the 'SkyBrush' instance that you create.

Some of these will record an 'undo step'. That is the ability for the user to click 'undo' and undo it, in the GUI, using the 'undo' button.
The methods will state if they do or don't record an undo step, or if they clear the current steps.

### .newImage( width, height )

Cleares the canvas, resizes it the size given, cleares the undo steps, and cleares the zoom level to 100%. It essentially gets SkyBrush back into it's starting state.

```js
	skybrush.newImage( 800, 600 );
```

Width and height are optional, and default to 640x480 pixels.

```js
	skybrush.newImage();
```

### .reset( )

Resets, but doesn't clear, SkyBrush. So the undo steps and the zoom are reset, but the contents of the canvas is not altered.

```js
	skybrush.reset();
```

### .setImage( image )

Given a HTML Image object, this will set it as the current image

Note that this is done directly, and no undo step is recorded.

### .setImage( image, width, height )

Sets the given image, and scales the canvas to the width and height given.

```js
	// sets the image at double it's size
	skybrush.setImage( image, image.width*2, image.height*2 );
```

### .getImage( )

Returns a HTML Image object for what is currently drawn in SkyBrush.

```js
	var image = skybrush.getImage()
```

### .getImageData( type )

Returns the current image as a data url. This is useful if you want to POST the data to somewhere online.

```js
	var imageData = skybrush.getImageData()
```

If no type is provided, then this defualts to the 'image/png' mime type. Otherwise you can provide a mime type, such as image/jpeg, but the browser needs to support converting to this.

API Extras
----------

### .resize( width, height )

Resizes the canvas, it's drawing area, but the graphics are not scaled. Anything outside the drawing area is lost.

```js
	skybrush.resize(320, 240);
```

An undo step is recorded.

### .scale( width, height, isSmooth )

Scales the content in the canvas to the new size given, resizing what is currently drawn.

```js
	skybrush.scale( 400, 600 )
```

'isSmooth' is optional, and defaults to true. When false, this will use a nearest neighbour algorithm when scaling.

```js
	// scale, and use nearest neighbour
	skybrush.scale( 300, 300, false )
```

An undo step is recorded.

### .getWidth( )

Returns the width of the canvas in pixesl.

```js
	width = skybrush.getWidth()
```

### .getHeight( )

Returns the height of the canvas in pixesl.

```js
	height = skybrush.getHeight()
```

### .undo( )

Undoes the last action. If there isn't one to be undone, then this silently does nothing.

```js
	skybrush.undo();
```

### .redo( )

Redoes the next redo action, if there is one. If there isn't one, then this silently does nothing.

```js
	skybrush.redo();
```

API Events
----------

These methods take a function, which is run when that action is carried out.
They are mainly offered so you can tell when the user has interacted, such as drawn something,
and so can maintain your own site's state accordingly.

### .onDraw( callback )

This is called whenever the user draws anything, with any tool. It's called at the end of the drawing, when it has finished.

It also includes any other actions that alter content, such as scaling, resizing, or pasting content.

```js
	// example tracking if the image is saved or not
	var isSaved = true;

	skybrush.onDraw( function() {
		isSaved = false;
	});
```

### .onUndo( callback )

The callback is called when contend is undone. This includes going back an undo step, or clearing content which hasn't been pasted yet. This could happen by either the user, or by calling the 'undo' method.

```js
	skybrush.onUndo( function() {
		// code here
	});
```

Note that this only fires if an undo is actually performed. If undo is called, but there is no undo to perform, then the callback is not called.

### .onRedo( callback )

The callback is called when contend is redone, either by the user clicking 'redo', or by calling the 'redo' method directly.

```js
	skybrush.onRedo( function() {
		// code here
	});
```

Note that this only fires if a redo is actually performed. If redo is called, but there is no redo to perform, then the callback is not called.

### .onSetAlpha( callback )

Called when the alpha value is set, in the colour mixer. I don't know why you'd want to listen to this, but if you do, you can.

```js
	skybrush.onSetAlpha( function(alpha) {
		// code here
	});
```

The 'alpha' value is a value from 0.0 to 1.0. 0.0 is fully transparent, whilst 1.0 is fully opaque.

### .onSetColor( callback )

Called when a new colour is set. The new colour is passed into the callback.

```js
	skybrush.onSetColor( function(colour) {
		// new colour here
	});
```

The colour provided is a hex string representing the colour, such as '#ff0000' for red, or '#999999' for grey.

### .onZoom( callback )

Called when the zoom level is changed. This is the new zoom level, and the centre of the zoom in pixels.

```js
	skybrush.onZoom( function(zoom, x, y) {

	});
```

The zoom value is a multiplyer; you can imagine multiplying it against 100%. For example if the zoom is set to 100%, then 1.0 is passed in, and at double zoom, 2.0 is passed in.

At half zoom, 0.5 is passed in, whilst at 25% zoom, 0.25 is passed in.

### .onCtrl( key, callback )

Called when a 'ctrl+key' is pressed.
Key is expected to be a string, describing the key, such as 'z' for 'ctrl+z' or 's' for 'ctrl+s'.

The function is given an Event object, representing the current 'keydown' action.
This for the event that matches 'ctrl+key'.

```js
    /**
     * A save handler.
     */
    skybrush.onCtrl( 's', function(ev) {
        // save here
    } )

    /**
     * Bind 'ctrl+u' as an alternative for undo.
     */
    skybrush.onCtrl( 'u', function(ev) {
        skybrush.undo();
    } )
```

### .onShift( callback )

Called when SkyBrush sees and runs a shift event.

```js
	skybrush.onShift( function(isShiftDown) {
		if ( isShiftDown ) {
			// do something
		} else {
			// do something else
		}
	});
```

Note that SkyBrush might ignore shift events if they happen at an inconvenient time, or if an up event has been generated without a down event. Use DOM events if you want to track all possible shift events.

### .onAlt( callback )

Called when SkyBrush sees and runs an alt key event. This is when the key is pressend down or released.

```js
	skybrush.onAlt( function(isAltDown) {
		if ( isAltDown ) {
			// do something
		} else {
			// do something else
		}
	});
```

Note that SkyBrush might ignore alt key events if they happen at an inconvenient time, or if an up event has been generated without a down event. Use DOM events if you want to track all possible alt events.
