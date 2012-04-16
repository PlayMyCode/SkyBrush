SkyBrush
========

An embeddable, HTML5 Canvas powered, based art painting application!

It allows you to have a canvas, which can be moved around and zoomed, floating dialog boxes on top of the canvas, various brushes you can use for painting, colour picker, and more!

This uses and requires jQuery. As of writing, the latest version is bundled with it.

Features
--------
 * easy embeddable painting application
 * Cross browser; supports IE 9+, Firefox, Chrome, Safari and Opera
 * single interface for setting/getting/manipulating content
 * no cruft! It's just an art package, you can add your own stuff around it.

Try the demo!
-------------

A live demo is online [here](http://www.studiofortress.com/skybrush).

It is also used for painting and editing images on the [Play My Code](http://www.playmycode.com) IDE, which you can try [here](http://www.playmycode.com/build/try-play-my-code).

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
	    <script src="./skybrush/js/util.js"></script>
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

### About Ctrl+R

Ctrl+R is grabbed as this is often used for redo in painting apps, but this disabled the ctrl+r used by the browser for refreshing the page. Gravving it also avoids the user reaching for it instinctively, and then having that "oh $*%&!" moment when the browser refreshes, and they lose their image.

You can prevent this behaviour using the 'grab_ctrl_r' option:

### Change Image Location

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

An undo step is recorded.

### .getWidth()

Returns the width of the canvas in pixesl.

```js
	width = skybrush.getWidth()
```

### .getHeight()

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
