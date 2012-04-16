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

Embedding in Detail
-------------------

Download the code, and unpack it. Everything in the 'skybrush' folder is what you need. Place that in the root of your site.

On the page:

 - import 'skybrush.css' in the head, which is in the 'skybrush/css' folder.
 - create an empty 'div', which is then used by SkyBrush to put the painting application into.
 - load the SkyBrush JS files and jQuery; this can be at the start or end of your page
 - then grab the div; either using jQuery or by grabbing the element directly using the DOM API
 - create a new instance of SkyBrush, and pass the div in.

Embedding API
-------------

Some options are included to help make embedding a little easier, as a second parameter. All of the options include:

 * width - sets the starting width of the canvas, in pixels
 * height - sets the starting height of the canvas, in pixels

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

Change Image Location
-------------------------

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

API
---

You can interact with SkyBrush from JS. This is mostly for getting out the current image, setting an image, and creating a new canvas;
but a few other things can be done too. These all operate on the 'SkyBrush' instance that you create.

