/**
  * Define an object to hold all our images for the game so images are only ever create once. This type of object is known as a singleton
*/

var imageRepository = new function() {
  // Define imgages
  this.background = new Image();
  this.spaceship = new Image();
  this.bullet = new Image();
  // Ensure all images have loaded before starting the game
  var numImages = 3;
  var numLoaded = 0;
  function imageLoaded() {
    numLoaded++;
    if (numLoaded === numImages) {
      window.init();
    }
  }
  this.background.onload = function() {
    imageLoaded();
  }
  this.spaceship.onload = function() {
    imageLoaded();
  }
  this.bullet.onload = function() {
    imageLoaded();
  }
  // Set images src
  this.background.src = "imgs/bg.png";
  this.spaceship.src = 'imgs/ship.png';
  this.bullet.src = "imgs/bullet.png";
}

/**
  Creates the Drawable object which will be the base class for all drawable objects in the game. Sets up default variables that all child objects will inherit, as well as the default functions.
*/

function Drawable() {
  this.init = function(x, y, width, height) {
    // Default variables
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  this.speed = 0;
  this.cavasWidth = 0;
  this.canvasHeight = 0;

  // Define abstract function to be implemented in child objects
  this.draw = function() {
  };
}

/**
  Creates the background object which will become a child of the Drawable object. The background is drawn on the "background" canvas and creates the illusion of moving by panning the image
*/

function Background() {
  this.speed = 1; // Redefine speed of the background for panning
  //Implement abstract function
  this.draw = function() {
    // Pan background
    this.y += this.speed;
    this.context.drawImage(imageRepository.background, this.x, this.y);
    //Draw another image at the top edge of the first image
    this.context.drawImage(imageRepository.background, this.x, this.y - this.canvasHeight);

    //If the image scrolled off the screen, reset
    if (this.y >= this.canvasHeight)
      this.y = 0;
  };
}

// Set Background to inherit properties from Drawable
Background.prototype = new Drawable();

/**
Creates the Game object which will hold all the objects and data for the game.
*/

function Game() {
  /* Gets canvas information and context and sets up all game objects. Returns true if the canvas is supported and false if it is not. This is to stop the animation script from constantly running on older browsers that do not support the canvas.
  */
  this.init = function() {
    //Get the canvas element
    this.bgCanvas = document.getElementById('background');
    this.shipCanvas = document.getElementById('ship');
    this.mainCanvas = document.getElementById('main');
    //Test to see if canvas is supported. Only need to check one canvas
    if (this.bgCanvas.getContext) {
      this.bgContext = this.bgCanvas.getContext('2d');
      this.shipContext = this.shipCanvas.getContext('2d');
      this.mainContext = this.mainCanvas.getContext('2d');
      //Initialize objects to contain their context and canvas information
      Background.prototype.context = this.bgContext;
      Background.prototype.convasWidth = this.bgCanvas.width;
      Background.prototype.canvasHeight = this.bgCanvas.height;
      Ship.prototype.context = this.shipContext;
      Ship.prototype.canvasWidth = this.shipCanvas.width;
      Ship.prototype.canvasHeight = this.shipCanvas.height;
      Bullet.prototype.context = this.mainContext;
      Bullet.prototype.canvasWidth = this.mainCanvas.width;
      Bullet.prototype.canvasHeight = this.mainCanvas.height;
      //Initialize the background object
      this.background = new Background();
      this.background.init(0,0); // Set draw point to 0,0
      //Initialize the ship object
      this.ship = new Ship();
      // Set the ship to start near the bottom middle of the canvas
      var shipStartX = this.shipCanvas.width/2 - imageRepository.spaceship.width;
      var shipStartY = this.shipCanvas.height/4*3 + imageRepository.spaceship.height*2;
      this.ship.init(shipStartX, shipStartY, imageRepository.spaceship.width, imageRepository.spaceship.height);
      return true;
    } else {
      return false;
    }
  };

  //Start the animation loop
  this.start = function() {
    this.ship.draw();
    animate();
  };
}

  /*
  The animation loop. Calls the requestAnimateionFrame shim to optimize the game loop and draws all game objects. This function must be a global function and cannot be within an object.
  */
  function animate() {
    requestAnimFrame( animate );
    game.background.draw();
    game.ship.move();
    game.ship.bulletPool.animate();
  }

  /*
  requestAnim shim layer by Paul Irish. Finds the first API that woks to optimize the animation loop, otherwise defaults to setTimeout()
  */
  window.requestAnimFrame = (function() {
    return window.requestAnimationFrame   ||
        window.webkitRequestAnimationFrame||
        window.mozRequestAnimationFrame   ||
        window.oRequestAnimationFrame     ||
        window.msRequestAnimationFrame    ||
        function(/* function */ callback, /* DOMElement */ element) {
          window.setTimeout(callback, 1000 / 60);
        };
})();

/*
Initialize the Game and starts it.
*/
var game = new Game();

function init() {
  if(game.init())
    game.start();
}

/*
Custom Pool Object. Holds bullet objexts to be managed to prevent garbage collection.
*/

function Pool(maxSize) {
  var size = maxSize; // Max bullets allowed in the pool
  var pool = [];
  /*
  Populates the pool array with Bullet objects
  */
  this.init = function() {
    for (var i=0; i < size; i++) {
      // Initialize the bullet object
      var bullet = new Bullet();
      bullet.init(0,0,imageRepository.bullet.width, imageRepository.bullet.height);
      pool[i] = bullet;
    }
  };

  // Grabs the last item in the list and initializes it and pushes it to the front of the array.
  this.get = function(x, y, speed) {
    if (!pool[size - 1].alive) {
      pool[size - 1].spawn(x, y, speed);
      pool.unshift(pool.pop());
    }
  };

  this.getTwo = function(x1, y1, speed1, x2, y2, speed2) {
    if(!pool[size - 1].alive && !pool[size - 2].alive) {
      this.get(x1, y1, speed1);
      this.get(x2, y2, speed2);
    }
  };

  /*
  Draws any in use Bullets. If a bullet goes off the screen,
  clears it and pushes it to the front of the array.
  */
  this.animate = function() {
    for (var i=0; i< size; i++) {
      // Only draw until we find a bullet that is not alive
      if (pool[i].alive) {
        if (pool[i].draw()) {
          pool[i].clear();
          pool.push((pool.splice(i,1))[0]);
        }
      }
      else
       break;
    }
  };
}

/*
Creates the Bullet object which the ship fires. The bullets are drawn on the "main" canvas.
*/

function Bullet() {
  this.alive = false; // Is true if the bullet is currently in use

  /* Sets the bullet values */
  this.spawn = function(x, y, speed) {
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.alive = true;
  };

  /* Uses a "dirty rectangle" to erase the bullet and moves it.
    Returns true if the bullet moved off the screen, indicating that
    the bullet is read to be cleard by the pool, otherise draws the bullet.
   */
   this.draw = function() {
    this.context.clearRect(this.x, this.y, this.width, this.height);
    this.y -= this.speed;
    if (this.y <= 0 - this.height) {
      return true;
    }
    else {
      this.context.drawImage(imageRepository.bullet, this.x, this.y);
    }
  };

  //Resets the bullet values
  this.clear = function() {
    this.x = 0;
    this.y = 0;
    this.speed = 0;
    this.alive = false;
  };
}
Bullet.prototype = new Drawable();


function Ship() {
  this.speed = 3;
  this.bulletPool = new Pool(30);
  this.bulletPool.init();
  var fireRate = 15;
  var counter = 0;
  this.draw = function() {
    this.context.drawImage(imageRepository.spaceship, this.x, this.y);
  };
  this.move = function() {
    counter++;
    //Determine if the action is move action
    if (KEY_STATUS.left || KEY_STATUS.right || KEY_STATUS.down || KEY_STATUS.up) {
      // The ship moved, so erase it's current image so it can
      // be redrawn in it's new location
      this.context.clearRect(this.x, this.y, this.width, this.height);
      //Update x and y according to the direction to move and
      // redraw the ship. Change the else if's to if statements
      // to have diagonal movement.
      if (KEY_STATUS.left) {
        this.x -= this.speed
        if (this.x <= 0) // Keep player within the screen
          this.x = 0;
      } else if (KEY_STATUS.right) {
        this.x += this.speed
        if (this.x >= this.canvasWidth - this.width)
          this.x = this.canvasWidth - this.width;
      } else if (KEY_STATUS.up) {
        this.y -= this.speed
        if (this.y <= this.canvasHeight/4*3)
          this.y = this.canvasHeight/4*3;
      } else if (KEY_STATUS.down) {
        this.y += this.speed
        if (this.y >= this.canvasHeight - this.height)
          this.y = this.canvasHeight - this.height;
      }
      // Finish by redrawing the ship
      this.draw();
    }
    if (KEY_STATUS.space && counter >= fireRate) {
      this.fire();
      counter = 0;
    }
  };

  // Fires two bullets
  this.fire = function() {
    this.bulletPool.getTwo(this.x+6, this.y, 3, this.x+33, this.y, 3);
  };
}
Ship.prototype = new Drawable();


// The keycodes that will be mapped when a user presses a button.
// Original code by Doug McInnes

KEY_CODES = {
  32: 'space',
  37: 'left',
  38: 'up',
  39: 'right',
  40: 'down',
}

// Creates the arra to hold the KEY_CODES and sets all their values
// to false. Checking true/false is the quickest way to check status
// of a key press and which ones was pressed when determining
// when to move and which direction.
KEY_STATUS = {};
for (code in KEY_CODES) {
  KEY_STATUS[ KEY_CODES[code]] = false;
}
/*
Sets up the document to listen to onkeydown events (fired when any key on the keyboard is
pressed down). When a key is pressed, it sets the appropriate direction to true to let us know which key it was.
*/

document.onkeydown = function(e) {
  // Firefox and opera use charCode instead of keycode to return which key was pressed
  var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
  if (KEY_CODES[keyCode]) {
    e.preventDefault();
    KEY_STATUS [KEY_CODES[keyCode]] = true;
  }
}

/*
Sets up the document to listen to ownkeyup events (fired when
any key on the keyboard is released). When a key is released, it sets the appropriate direction to false to let us know which key it was.
*/
document.onkeyup = function(e) {
  var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
  if (KEY_CODES[keyCode]) {
    e.preventDefault();
    KEY_STATUS[KEY_CODES [keyCode]] = false;
  }
}