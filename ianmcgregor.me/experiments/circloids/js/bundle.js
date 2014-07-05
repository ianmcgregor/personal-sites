require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var Boid = require('./utils/boid.js'),
    Graphics = require('./utils/graphics.js'),
    randomColor = require('randomColor'),
    FPS = require('FPS'),
    Keyboard = require('Keyboard');

(function() {

    var boids = [],
        colors = randomColor({ count: 50, format: 'rgb' }),
        options = [
            { size: 400, decrement: 1 },
            { size: 800, decrement: 20 },
            { size: 800, decrement: 4 },
            { size: 100, decrement: 0.1 },
            { size: 8, decrement: 0.01 }
        ],
        size = 0,
        decrement = 0,
        fps = new FPS();

    Graphics.init();

    for (var i = 0; i < colors.length; i++) {
        var color = colors[i];
        var boid = new Boid();
        boid.setBounds(Graphics.width, Graphics.height);
        boid.position.x = Graphics.width * Math.random();
        boid.position.y = Graphics.height * Math.random();
        boid._maxSpeed = 5;
        boid.color = color;
        boids.push(boid);
    }

    function start() {
        Graphics.clear();
        var opt = options[Math.floor(options.length * Math.random())];
        size = opt.size;
        decrement = opt.decrement;
        loop();
    }

    function update() {
        for (i = 0; i < boids.length; i++) {
            var boid = boids[i];
            boid.wander();
            boid.update();
        }
        fps.update();
    }

    function render() {
        //Graphics.clear();
        for (i = 0; i < boids.length; i++) {
            var boid = boids[i];
            Graphics.fill(boid.color);
            Graphics.circle(boid.position.x, boid.position.y, size);

        }
        size-=decrement;
    }

    function loop() {
        if(size > 0) {
            window.requestAnimationFrame(loop);
            update();
            render();
        }
    }
    start();

    window.addEventListener('resize', function() {
        Graphics.size();
    });

    function refresh() {
        if(size > 0) { return; }
        start();
    }

    document.addEventListener('keyup', function(event) {
        switch(event.keyCode) {
            case Keyboard.SPACEBAR:
                refresh();
                break;
            case Keyboard.I:
                Graphics.openImage();
                break;
            default:
            break;
        }
    });

    document.body.addEventListener('click', refresh);
}());
},{"./utils/boid.js":2,"./utils/graphics.js":3,"FPS":"8Cn9B8","Keyboard":"GAPNAH","randomColor":"kOrPUe"}],2:[function(require,module,exports){
'use strict';

var Vec2 = require('./vec2.js');

function Boid()
{
    this._position = Vec2.get();
    this._velocity = Vec2.get();    
    this._steeringForce = Vec2.get();
    this._bounds = {x:0, y:0, width:640, height:480};
    this._edgeBehavior = Boid.EDGE_BOUNCE;
    this._mass = 1.0;
    this._maxSpeed = 10;
    this._maxForce = 1;
    // arrive
    this._arrivalThreshold = 50;
    // wander
    this._wanderDistance = 10;
    this._wanderRadius = 5;
    this._wanderAngle = 0;
    this._wanderRange = 1;
    // avoid
    this._avoidDistance = 300;
    this._avoidBuffer = 20;
    // follow path
    this._pathIndex = 0;
    this._pathThreshold = 20;
    // flock
    this._inSightDistance = 300;
    this._tooCloseDistance = 60;
}

// edge behaviors

Boid.EDGE_WRAP = 'wrap';
Boid.EDGE_BOUNCE = 'bounce';

Boid.prototype.setBounds = function(width, height, x, y) {
    this._bounds.width = width;
    this._bounds.height = height;
    this._bounds.x = x || 0;
    this._bounds.y = y || 0;
};

Boid.prototype.update = function() {
    // steer
    this._steeringForce.truncate(this._maxForce);
    //this._steeringForce = this._steeringForce.divide(this._mass, true);
    this._steeringForce.divideBy(this._mass);
    this._velocity = this._velocity.add(this._steeringForce, true);
    this._steeringForce.reset();
    // make sure velocity stays within max speed.
    this._velocity.truncate(this._maxSpeed);
    // add velocity to position
    this._position = this._position.add(this._velocity, true);
    // handle any edge behavior
    if(this._edgeBehavior === Boid.EDGE_WRAP) {
        this.wrap();
    }
    else if(this._edgeBehavior === Boid.EDGE_BOUNCE) {
        this.bounce();
    }
};

// Causes boid to bounce off edge if edge is hit
Boid.prototype.bounce = function() {
    if(this._position.x > this._bounds.width) {
        this._position.x = this._bounds.width;
        this._velocity.x *= -1;
    }
    else if(this._position.x < this._bounds.x) {
        this._position.x = this._bounds.x;
        this._velocity.x *= -1;
    }
    if(this._position.y > this._bounds.height) {
        this._position.y = this._bounds.height;
        this._velocity.y *= -1;
    }
    else if(this._position.y < this._bounds.y) {
        this._position.y = this._bounds.y;
        this._velocity.y *= -1;
    }
};

// Causes boid to wrap around to opposite edge if edge is hit
Boid.prototype.wrap = function() {
    if(this._position.x > this._bounds.width) {
        this._position.x = this._bounds.x;
    }
    else if(this._position.x < this._bounds.x) {
        this._position.x = this._bounds.width;
    }
    if(this._position.y > this._bounds.height) {
        this._position.y = this._bounds.y;
    }
    else if(this._position.y < this._bounds.y) {
        this._position.y = this._bounds.height;
    }
};

Boid.prototype.seek = function(targetVec) {
    var desiredVelocity = targetVec.subtract(this._position);
    desiredVelocity.normalize();
    desiredVelocity.scaleBy(this._maxSpeed);
    //desiredVelocity = desiredVelocity.multiply(this._maxSpeed, true);
    var force = desiredVelocity.subtract(this._velocity, true);
    this._steeringForce = this._steeringForce.add(force, true);

    force.dispose();
};

Boid.prototype.flee = function(targetVec) {
    var desiredVelocity = targetVec.subtract(this._position);
    desiredVelocity.normalize();
    desiredVelocity.scaleBy(this._maxSpeed);
    //desiredVelocity = desiredVelocity.multiply(this._maxSpeed, true);
    var force = desiredVelocity.subtract(this._velocity, true);
    // only this line different from seek:
    this._steeringForce = this._steeringForce.subtract(force, true);

    force.dispose();
};

// seek until withing arrivalThreshold
Boid.prototype.arrive = function(targetVec) {
    var desiredVelocity = targetVec.subtract(this._position);
    desiredVelocity.normalize();

    var distance = this._position.distance(targetVec);
    if(distance > this._arrivalThreshold) {
        desiredVelocity.scaleBy(this._maxSpeed);
        //desiredVelocity = desiredVelocity.multiply(this._maxSpeed, true);
    }
    else {
        var mul = this._maxSpeed * distance / this._arrivalThreshold;
        desiredVelocity.scaleBy(mul);
        //desiredVelocity = desiredVelocity.multiply(mul, true);
    }
    var force = desiredVelocity.subtract(this._velocity, true);
    this._steeringForce = this._steeringForce.add(force, true);

    force.dispose();
};

// look at velocity of boid and try to predict where it's going
Boid.prototype.pursue = function(targetBoid) {
    var lookAheadTime = this._position.distance(targetBoid._position) / this._maxSpeed;
    // e.g. of where new vec should be returned:
    var scaledVelocity = targetBoid._velocity.clone().scaleBy(lookAheadTime);
    var predictedTarget = targetBoid._position.add(scaledVelocity);
    //var predictedTarget = targetBoid._position.add(targetBoid._velocity.multiply(lookAheadTime));
    this.seek(predictedTarget);

    scaledVelocity.dispose();
    predictedTarget.dispose();
};

// look at velocity of boid and try to predict where it's going
Boid.prototype.evade = function(targetBoid) {
    var lookAheadTime = this._position.distance(targetBoid._position) / this._maxSpeed;
    // e.g. of where new vec should be returned:
    var scaledVelocity = targetBoid._velocity.clone().scaleBy(lookAheadTime);
    var predictedTarget = targetBoid._position.add(scaledVelocity);
    //var predictedTarget = targetBoid._position.add(targetBoid._velocity.multiply(lookAheadTime));
    // only this line diff from pursue:
    this.flee(predictedTarget);

    predictedTarget.dispose();
};

// wander around, changing angle by a limited amount each tick
Boid.prototype.wander = function() {
    var center = this._velocity.clone().normalize().scaleBy(this._wanderDistance);
    //var center = this._velocity.clone().normalize().multiply(this._wanderDistance, true);
    var offset = Vec2.get();
    offset.length = this._wanderRadius;
    offset.angle = this._wanderAngle;
    this._wanderAngle += Math.random() * this._wanderRange - this._wanderRange * 0.5;
    var force = center.add(offset, true);
    this._steeringForce = this._steeringForce.add(force, true);

    offset.dispose();
    force.dispose();
};

// gets a bit rough used in combination with seeking as the vehicle attempts 
// to seek straight through an object while simultaneously trying to avoid it
Boid.prototype.avoid = function(circles) {
    var l = circles.length;
    for (var i = 0; i < l; i++) {
        var circle = circles[i];
        var heading = this._velocity.clone().normalize();

        // vec between circle and boid
        var difference = circle.position.subtract(this._position);
        var dotProd = difference.dotProduct(heading);

        // if circle in front of boid
        if(dotProd > 0) {
            // vec to represent 'feeler' arm
            //var feeler = heading.multiply(this._avoidDistance);
            var feeler = heading.clone().scaleBy(this._avoidDistance);
            // project differebce onto feeler
            //var projection = heading.multiply(dotProd);
            var projection = heading.clone().scaleBy(dotProd);
            // distance from circle to feeler
            var vecDistance = projection.subtract(difference);
            var distance = vecDistance.length;
            // if feeler intersects circle (plus buffer), and projection
            // less than feeler length, will collide
            if(distance < circle.radius + this._avoidBuffer && projection.length < feeler.length) {
                // calc a force +/- 90 deg from vec to circ
                //var force = heading.multiply(this._maxSpeed);
                var force = heading.clone().scaleBy(this._maxSpeed);
                force.angle += difference.sign(this._velocity) * Math.PI / 2;
                // scale force by distance (further = smaller force)
                //force = force.multiply(1 - projection.length / feeler.length, true);
                force.scaleBy(1 - projection.length / feeler.length);
                // add to steering force
                this._steeringForce = this._steeringForce.add(force, true);
                // braking force - slows boid down so it has time to turn (closer = harder)
                //this._velocity = this._velocity.multiply(projection.length / feeler.length, true);
                this._velocity.scaleBy(projection.length / feeler.length);

                force.dispose();
            }
            feeler.dispose();
            projection.dispose();
            vecDistance.dispose();
        }
        heading.dispose();
        difference.dispose();
    }
};

// for defining obstacles or areas to avoid
Boid.Circle = function(radius, x, y) {
    console.log(radius, x, y);
    this.radius = radius;
    this.position = Vec2.get(x, y);
};

// follow a path made up of an array or vectors
Boid.prototype.followPath = function(path, loop) {
    loop = loop === undefined ? false : loop;
    var wayPoint = path[this._pathIndex];
    //console.log(wayPoint);
    if(!wayPoint) { return; }
    if(this._position.distance(wayPoint) < this._pathThreshold) {
        if(this._pathIndex >= path.length-1) {
            if(loop) { this._pathIndex = 0; }   
        }
        else {
            this._pathIndex++;
        }
    }
    if(this._pathIndex >= path.length-1 && !loop) {
        this.arrive(wayPoint);
    }
    else {
        this.seek(wayPoint);
    }
};

// flock - group of boids loosely move together
Boid.prototype.flock = function(boids) {
    var averageVelocity = this._velocity.clone();
    var averagePosition = Vec2.get();
    var inSightCount = 0;
    var l = boids.length;
    for (var i = 0; i < l; i++) {
        var boid = boids[i];
        if(boid !== this && this._inSight(boid)) {
            averageVelocity = averageVelocity.add(boid._velocity, true);
            averagePosition = averagePosition.add(boid._position, true);
            if(this._tooClose(boid)) {
                this.flee(boid._position);
            }
            inSightCount++;
        }
    }
    if(inSightCount > 0) {
        //averageVelocity = averageVelocity.divide(inSightCount, true);
        //averagePosition = averagePosition.divide(inSightCount, true);
        averageVelocity.divideBy(inSightCount);
        averagePosition.divideBy(inSightCount);
        this.seek(averagePosition);
        this._steeringForce.add(averageVelocity.subtract(this._velocity, true), true);
    }
    averageVelocity.dispose();
    averagePosition.dispose();
};

// is boid close enough to be in sight? for use with flock
Boid.prototype._inSight = function(boid) {
    if(this._position.distance(boid._position) > this._inSightDistance) {
        return false;
    }
    var heading = this._velocity.clone().normalize();
    var difference = boid._position.subtract(this._position);
    var dotProd = difference.dotProduct(heading);

    heading.dispose();
    difference.dispose();

    if(dotProd < 0) {
        return false;
    }
    return true;
};

// is boid too close? for use with flock
Boid.prototype._tooClose = function(boid) {
    return this._position.distance(boid._position) < this._tooCloseDistance;
};

// getters / setters
Object.defineProperty(Boid.prototype, 'position', {
    get: function() {
        return this._position;
    }
});

Object.defineProperty(Boid.prototype, 'velocity', {
    get: function() {
        return this._velocity;
    }
});

Object.defineProperty(Boid.prototype, 'edgeBehavior', {
    get: function() {
        return this.__edgeBehavior;
    },
    set: function(value) {
        this._edgeBehavior = value;
    }
});

if (typeof module === 'object' && module.exports) {
    module.exports = Boid;
}

},{"./vec2.js":4}],3:[function(require,module,exports){
'use strict';

var Graphics = {
  init: function() {
    if(document.getElementsByTagName('canvas').length > 0) {
      this.canvas = document.getElementsByTagName('canvas')[0];
    }
    else {
      this.canvas = document.createElement('canvas');
      document.body.appendChild(this.canvas);
    }
    this.context = this.canvas.getContext('2d');
    this.size();

    this._textFont = 'Times';
    this._textSize = 12;
    this.context.font = this._textSize + 'px ' + this._textFont;
  },
  size: function(width, height) {
    this.width = this.canvas.width = width || window.innerWidth;
    this.height = this.canvas.height = height || window.innerHeight;
  },
  clear: function(color) {
    if(color) {
      this.context.fillStyle = color;
      this.context.fillRect(0, 0, this.width, this.height);
    }
    else {
      this.context.clearRect(0, 0, this.width, this.height);
    }
  },
  background: function(r, g, b) {
    this.clear('rgb('+r+', '+b+', '+g+')');
  },
  fill: function(r, g, b, a) {
    if(typeof r === 'string') {
      this.context.fillStyle = r;
      return;  
    }
    a = a === undefined ? 1 : a;
    this.context.fillStyle = 'rgba('+r+', '+b+', '+g+', '+a+')';
  },
  stroke: function(r, g, b, a) {
    a = a === undefined ? 1 : a;
    this.context.strokeStyle = 'rgba('+r+', '+b+', '+g+', '+a+')';
  },
  strokeWeight: function(w) {
    this.context.lineWidth = w;
  },
  move: function(x, y) {
    this.context.moveTo(x, y);
  },
  line: function(x1, y1, x2, y2) {
    this.context.beginPath();
    this.context.moveTo(x1, y1);
    this.context.lineTo(x2, y2);
    this.context.stroke();
  },
  rect: function(x, y, width, height, angle) {
    if(angle !== undefined && angle !== 0) {
      this.context.save();
      this.context.translate(x + width/2, y + height/2);
      this.context.rotate(angle);
      this.context.rect(-width/2, -height/2, width, height);
      this.context.fill();
      this.context.stroke();
      this.context.restore();
    }
    else {
      this.context.rect(x, y, width, height);
      this.context.fill();
      this.context.stroke();
    }
  },
  circle: function(x, y, radius) {
    this.context.beginPath();
    this.context.arc(x, y, radius, 0, Math.PI * 2, false);
    this.context.fill();
    this.context.stroke();
  },
  triangle: function(x, y, width, height, angle) {
    if(angle !== undefined && angle !== 0) {
      this.context.save();
      this.context.translate(x, y);
      this.context.rotate(angle);
      this.context.beginPath();
      this.context.moveTo(0 - width/2, 0 + height/2);
      this.context.lineTo(0, 0 - height/2);
      this.context.lineTo(0 + width/2, 0 + height/2);
      this.context.closePath();
      this.context.stroke();
      this.context.fill();
      this.context.restore();
    }
    else {
      this.context.beginPath();
      this.context.moveTo(x - width/2, y + height/2);
      this.context.lineTo(x, y - height/2);
      this.context.lineTo(x + width/2, y + height/2);
      this.context.closePath();
      this.context.stroke();
      this.context.fill();
    }
  },
  triangleABC: function(x1, y1, x2, y2, x3, y3) {
    this.context.beginPath();
    this.context.moveTo(x1, y1);
    this.context.lineTo(x2, y2);
    this.context.lineTo(x3, y3);
    this.context.closePath();
    this.context.stroke();
    this.context.fill();
  },
  image: function(img, x, y, angle) {
    if(angle !== undefined && angle !== 0) {
      var offsetX = img.width/2,
          offsetY = img.height/2;
      this.context.save();
      this.context.translate(x + offsetX, y + offsetY);
      this.context.rotate(angle);
      this.context.drawImage(img, -offsetX, -offsetY);
      this.context.restore();
    }
    else {
      this.context.drawImage(img, x, y);
    }
  },
  cross: function(radius) {
    this.context.beginPath();
    this.context.moveTo(-radius, -radius);
    this.context.lineTo(radius, radius);
    this.context.moveTo(-radius, radius);
    this.context.lineTo(radius, -radius);
    this.context.stroke();
  },
  text: function(str, x, y) {
    this.context.fillText(str, x, y);
  },
  textFont: function(font) {
    this._textFont = font;
    this.context.font = this._textSize + 'px ' + font;
  },
  textSize: function(size) {
    this._textSize = size;
    this.context.font = size + 'px ' + this._textFont;
  },
  openImage: function() {
    var win = window.open('', 'Canvas Image'),
        src = this.canvas.toDataURL('image/png');
    win.document.write('<img src="' + src +
                      '" width="' + this.width +
                      '" height="' + this.height + '" />');
  },
  downloadImage: function() {
    var src = this.canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
    window.location.href = src;
  }
};

if (typeof module === 'object' && module.exports) {
    module.exports = Graphics;
}

},{}],4:[function(require,module,exports){
'use strict';

function Vec2(x, y) {
    this.x = x || 0;
    this.y = y || 0;
}

Vec2.prototype = {
    add: function(vec, overwrite) {
        if(overwrite) {
            this.x = this.x + vec.x;
            this.y = this.y + vec.y;
            return this;
        }
        return Vec2.get(this.x + vec.x, this.y + vec.y);
    },
    subtract: function(vec, overwrite) {
        if(overwrite) {
            this.x = this.x - vec.x;
            this.y = this.y - vec.y;
            return this;
        }
        return Vec2.get(this.x - vec.x, this.y - vec.y);
    },
    multiply: function(vec, overwrite) {
        if(overwrite) {
            this.x = this.x * vec.x;
            this.y = this.y * vec.y;
            return this;
        }
        return Vec2.get(this.x * vec.x, this.y * vec.y);
    },
    divide: function(vec, overwrite) {
        if(overwrite) {
            this.x = this.x / vec.x;
            this.y = this.y / vec.y;
            return this;
        }
        return Vec2.get(this.x / vec.x, this.y / vec.y);
    },
    normalize: function() {
        var l = this.length;
        if(l === 0) {
            this.x = 1;
            return this;
        }
        this.x /= l;
        this.y /= l;
        return this;
    },
    isNormalized: function() {
        return this.length === 1;
    },
    truncate:  function(max) {
        if(this.length > max) {
            this.length = max;
        }
        return this;
    },
    scaleBy: function(mul) {
        this.x *= mul;
        this.y *= mul;
        return this;
    },
    divideBy: function(div) {
        this.x /= div;
        this.y /= div;
        return this;
    },
    equals: function(vec) {
        return this.x === vec.x &&
            this.y === vec.y;
    },
    negate: function() {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    },
    reverse: function() {
        this.negate();
        return this;
    },
    dotProduct: function(vec) {
        /*
        If A and B are perpendicular (at 90 degrees to each other), the result of the dot product will be zero, because cos(Θ) will be zero.
        If the angle between A and B are less than 90 degrees, the dot product will be positive (greater than zero), as cos(Θ) will be positive, and the vector lengths are always positive values.
        If the angle between A and B are greater than 90 degrees, the dot product will be negative (less than zero), as cos(Θ) will be negative, and the vector lengths are always positive values
        */
        return this.x * vec.x + this.y * vec.y;
    },
    crossProduct: function(vec) {
        /*
        The sign tells us if vec to the left (-) or the right (+) of this vec
        */
        return this.x * vec.y - this.y * vec.x;
    },
    distanceSquared: function(vec) {
        var dx = vec.x - this.x;
        var dy = vec.y - this.y;
        return dx * dx + dy * dy;
    },
    distance: function(vec) {
        return Math.sqrt(this.distanceSquared(vec));
    },
    clone: function() {
        return Vec2.get(this.x, this.y);
    },
    zero: function() {
        this.x = 0;
        this.y = 0;
        return this;
    },
    isZero: function() {
        return this.x === 0 && this.y === 0;
    },
    reset: function() {
        return this.zero();
    },
    perpendicular: function() {
        return Vec2.get(-this.y, this.x);
    },
    sign: function(vec) {
        // Determines if a given vector is to the right or left of this vector.
        // If to the left, returns -1. If to the right, +1.
        var p = this.perpendicular();
        var s = p.dotProduct(vec) < 0 ? -1 : 1;
        p.dispose();
        return s;
    },
    set: function(x, y) {
        this.x = x || 0;
        this.y = y || 0;
        return this;
    },
    dispose: function() {
        Vec2.pool.push(this.zero());
    }
};

// static
Vec2.pool = [];
Vec2.get = function(x, y) {
    var v = Vec2.pool.length > 0 ? Vec2.pool.pop() : new Vec2();
    v.set(x, y);
    return v;
};

Vec2.angleBetween = function(a, b) {
    if(!a.isNormalized()) { a = a.clone().normalize(); }
    if(!b.isNormalized()) { b = b.clone().normalize(); }
    return Math.acos(a.dotProduct(b));
};

// getters / setters
Object.defineProperty(Vec2.prototype, 'lengthSquared', {
    get: function() {
        return this.x * this.x + this.y * this.y;
    }
});

Object.defineProperty(Vec2.prototype, 'length', {
    get: function() {
        return Math.sqrt(this.lengthSquared);
    },
    set: function(value) {
        var a = this.angle;
        this.x = Math.cos(a) * value;
        this.y = Math.sin(a) * value;
    }
});

Object.defineProperty(Vec2.prototype, 'angle', {
    get: function() {
        return Math.atan2(this.y, this.x);
    },
    set: function(value) {
        var l = this.length;
        this.x = Math.cos(value) * l;
        this.y = Math.sin(value) * l;
    }
});

if (typeof module === 'object' && module.exports) {
    module.exports = Vec2;
}

},{}],"FPS":[function(require,module,exports){
module.exports=require('8Cn9B8');
},{}],"8Cn9B8":[function(require,module,exports){
'use strict';

function FPS() {

    var el = document.getElementById('fps'),
        ms = 0,
        fps = 0,
        currentFps = 0,
        averageFps = 0,
        ticks = 0,
        totalFps = 0;

    if(!el) {
        el = document.createElement('div');
        el.setAttribute('id', 'fps');
        el.style.position = 'absolute';
        el.style.top = '0px';
        el.style.right = '0px';
        el.style.padding = '2px 6px';
        el.style.zIndex = '9999';
        el.style.background = '#000';
        el.style.color = '#fff';
        document.body.appendChild(el);
    }

    function report() {
        el.innerHTML = 'FPS: ' + currentFps + '<br />AVE: ' + averageFps;
    }

    function update(time) {
        if(time === undefined) {
            time = Date.now();
        }
        if(ms === 0) {
            ms = time;
        }
        if (time - 1000 > ms) {
            ms = time;
            currentFps = fps;
            fps = 0;

            if (currentFps > 1) {
                ticks ++;
                totalFps += currentFps;
                averageFps = Math.floor(totalFps / ticks);
            }
            report();
        }
        fps++;
    }

    return {
        'update': update
    };
}

if(typeof module === 'object' && module.exports) {
    module.exports = FPS;
}

},{}],"GAPNAH":[function(require,module,exports){
var Keyboard = {
	A: 'A'.charCodeAt(0),
	B: 'B'.charCodeAt(0),
	C: 'C'.charCodeAt(0),
	D: 'D'.charCodeAt(0),
	E: 'E'.charCodeAt(0),
	F: 'F'.charCodeAt(0),
	G: 'G'.charCodeAt(0),
	H: 'H'.charCodeAt(0),
	I: 'I'.charCodeAt(0),
	J: 'J'.charCodeAt(0),
	K: 'K'.charCodeAt(0),
	L: 'L'.charCodeAt(0),
	M: 'M'.charCodeAt(0),
	N: 'N'.charCodeAt(0),
	O: 'O'.charCodeAt(0),
	P: 'P'.charCodeAt(0),
	Q: 'Q'.charCodeAt(0),
	R: 'R'.charCodeAt(0),
	S: 'S'.charCodeAt(0),
	T: 'T'.charCodeAt(0),
	U: 'U'.charCodeAt(0),
	V: 'V'.charCodeAt(0),
	W: 'W'.charCodeAt(0),
	X: 'X'.charCodeAt(0),
	Y: 'Y'.charCodeAt(0),
	Z: 'Z'.charCodeAt(0),
	ZERO: '0'.charCodeAt(0),
	ONE: '1'.charCodeAt(0),
	TWO: '2'.charCodeAt(0),
	THREE: '3'.charCodeAt(0),
	FOUR: '4'.charCodeAt(0),
	FIVE: '5'.charCodeAt(0),
	SIX: '6'.charCodeAt(0),
	SEVEN: '7'.charCodeAt(0),
	EIGHT: '8'.charCodeAt(0),
	NINE: '9'.charCodeAt(0),
	NUMPAD_0: 96,
	NUMPAD_1: 97,
	NUMPAD_2: 98,
	NUMPAD_3: 99,
	NUMPAD_4: 100,
	NUMPAD_5: 101,
	NUMPAD_6: 102,
	NUMPAD_7: 103,
	NUMPAD_8: 104,
	NUMPAD_9: 105,
	NUMPAD_MULTIPLY: 106,
	NUMPAD_ADD: 107,
	NUMPAD_ENTER: 108,
	NUMPAD_SUBTRACT: 109,
	NUMPAD_DECIMAL: 110,
	NUMPAD_DIVIDE: 111,
	F1: 112,
	F2: 113,
	F3: 114,
	F4: 115,
	F5: 116,
	F6: 117,
	F7: 118,
	F8: 119,
	F9: 120,
	F10: 121,
	F11: 122,
	F12: 123,
	F13: 124,
	F14: 125,
	F15: 126,
	COLON: 186,
	EQUALS: 187,
	UNDERSCORE: 189,
	QUESTION_MARK: 191,
	TILDE: 192,
	OPEN_BRACKET: 219,
	BACKWARD_SLASH: 220,
	CLOSED_BRACKET: 221,
	QUOTES: 222,
	BACKSPACE: 8,
	TAB: 9,
	CLEAR: 12,
	ENTER: 13,
	SHIFT: 16,
	CONTROL: 17,
	ALT: 18,
	CAPS_LOCK: 20,
	ESC: 27,
	SPACEBAR: 32,
	PAGE_UP: 33,
	PAGE_DOWN: 34,
	END: 35,
	HOME: 36,
	LEFT: 37,
	UP: 38,
	RIGHT: 39,
	DOWN: 40,
	INSERT: 45,
	DELETE: 46,
	HELP: 47,
	NUM_LOCK: 144
};

if (typeof module === 'object' && module.exports) {
    module.exports = Keyboard;
}

},{}],"Keyboard":[function(require,module,exports){
module.exports=require('GAPNAH');
},{}],"kOrPUe":[function(require,module,exports){
;(function(root, factory) {

  // Support AMD
  if (typeof define === 'function' && define.amd) {
    define([], factory);

  // Support CommonJS
  } else if (typeof exports === 'object') {
    var randomColor = factory();
    
    // Support NodeJS & Component, which allow module.exports to be a function
    if (typeof module === 'object' && module && module.exports) {
      exports = module.exports = randomColor;
    }
    
    // Support CommonJS 1.1.1 spec
    exports.randomColor = randomColor;
  
  // Support vanilla script loading
  } else {
    root.randomColor = factory();
  };

}(this, function() {

  // Shared color dictionary
  var colorDictionary = {};

  // Populate the color dictionary
  loadColorBounds();

  var randomColor = function(options) {
    options = options || {};

    var H,S,B;

    // Check if we need to generate multiple colors
    if (options.count) {

      var totalColors = options.count,
          colors = [];

      options.count = false;

      while (totalColors > colors.length) {
        colors.push(randomColor(options));
      }

      return colors;
    }

    // First we pick a hue (H)
    H = pickHue(options);

    // Then use H to determine saturation (S)
    S = pickSaturation(H, options);

    // Then use S and H to determine brightness (B).
    B = pickBrightness(H, S, options);

    // Then we return the HSB color in the desired format
    return setFormat([H,S,B], options);
  };

  function pickHue (options) {

    var hueRange = getHueRange(options.hue),
        hue = randomWithin(hueRange);

    // Instead of storing red as two seperate ranges,
    // we group them, using negative numbers
    if (hue < 0) {hue = 360 + hue}

    return hue;

  }

  function pickSaturation (hue, options) {

    if (options.luminosity === 'random') {
      return randomWithin([0,100]);
    }

    if (options.hue === 'monochrome') {
      return 0;
    }

    var saturationRange = getSaturationRange(hue);

    var sMin = saturationRange[0],
        sMax = saturationRange[1];

    switch (options.luminosity) {

      case 'bright':
        sMin = 55;
        break;

      case 'dark':
        sMin = sMax - 10;
        break;

      case 'light':
        sMax = 55;
        break;
   }

    return randomWithin([sMin, sMax]);

  }

  function pickBrightness (H, S, options) {

    var brightness,
        bMin = getMinimumBrightness(H, S),
        bMax = 100;

    switch (options.luminosity) {

      case 'dark':
        bMax = bMin + 20;
        break;

      case 'light':
        bMin = (bMax + bMin)/2;
        break;

      case 'random':
        bMin = 0;
        bMax = 100;
        break;
    }

    return randomWithin([bMin, bMax]);

  }

  function setFormat (hsv, options) {

    switch (options.format) {

      case 'hsvArray':
        return hsv;

      case 'hsv':
        return colorString('hsv', hsv);

      case 'rgbArray':
        return HSVtoRGB(hsv);

      case 'rgb':
        return colorString('rgb', HSVtoRGB(hsv));

      default:
        return HSVtoHex(hsv);
    }

  }

  function getMinimumBrightness(H, S) {

    var lowerBounds = getColorInfo(H).lowerBounds;

    for (var i = 0; i < lowerBounds.length - 1; i++) {

      var s1 = lowerBounds[i][0],
          v1 = lowerBounds[i][1];

      var s2 = lowerBounds[i+1][0],
          v2 = lowerBounds[i+1][1];

      if (S >= s1 && S <= s2) {

         var m = (v2 - v1)/(s2 - s1),
             b = v1 - m*s1;

         return m*S + b;
      }

    }

    return 0;
  }

  function getHueRange (colorInput) {

    if (typeof parseInt(colorInput) === 'number') {

      var number = parseInt(colorInput);

      if (number < 360 && number > 0) {
        return [number, number];
      }

    }

    if (typeof colorInput === 'string') {

      if (colorDictionary[colorInput]) {
        var color = colorDictionary[colorInput];
        if (color.hueRange) {return color.hueRange}
      }
    }

    return [0,360];

  }

  function getSaturationRange (hue) {
    return getColorInfo(hue).saturationRange;
  }

  function getColorInfo (hue) {

    // Maps red colors to make picking hue easier
    if (hue >= 334 && hue <= 360) {
      hue-= 360;
    }

    for (var colorName in colorDictionary) {
       var color = colorDictionary[colorName];
       if (color.hueRange &&
           hue >= color.hueRange[0] &&
           hue <= color.hueRange[1]) {
          return colorDictionary[colorName];
       }
    } return 'Color not found';
  }

  function randomWithin (range) {
    return Math.floor(range[0] + Math.random()*(range[1] + 1 - range[0]));
  }

  function shiftHue (h, degrees) {
    return (h + degrees)%360;
  }

  function HSVtoHex (hsv){

    var rgb = HSVtoRGB(hsv);

    function componentToHex(c) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }

    var hex = "#" + componentToHex(rgb[0]) + componentToHex(rgb[1]) + componentToHex(rgb[2]);

    return hex;

  }

  function defineColor (name, hueRange, lowerBounds) {

    var sMin = lowerBounds[0][0],
        sMax = lowerBounds[lowerBounds.length - 1][0],

        bMin = lowerBounds[lowerBounds.length - 1][1],
        bMax = lowerBounds[0][1];

    colorDictionary[name] = {
      hueRange: hueRange,
      lowerBounds: lowerBounds,
      saturationRange: [sMin, sMax],
      brightnessRange: [bMin, bMax]
    };

  }

  function loadColorBounds () {

    defineColor(
      'monochrome',
      null,
      [[0,0],[100,0]]
    );

    defineColor(
      'red',
      [-26,18],
      [[20,100],[30,92],[40,89],[50,85],[60,78],[70,70],[80,60],[90,55],[100,50]]
    );

    defineColor(
      'orange',
      [19,46],
      [[20,100],[30,93],[40,88],[50,86],[60,85],[70,70],[100,70]]
    );

    defineColor(
      'yellow',
      [47,62],
      [[25,100],[40,94],[50,89],[60,86],[70,84],[80,82],[90,80],[100,75]]
    );

    defineColor(
      'green',
      [63,158],
      [[30,100],[40,90],[50,85],[60,81],[70,74],[80,64],[90,50],[100,40]]
    );

    defineColor(
      'blue',
      [159, 257],
      [[20,100],[30,86],[40,80],[50,74],[60,60],[70,52],[80,44],[90,39],[100,35]]
    );

    defineColor(
      'purple',
      [258, 282],
      [[20,100],[30,87],[40,79],[50,70],[60,65],[70,59],[80,52],[90,45],[100,42]]
    );

    defineColor(
      'pink',
      [283, 334],
      [[20,100],[30,90],[40,86],[60,84],[80,80],[90,75],[100,73]]
    );

  }

  function HSVtoRGB (hsv) {

    // this doesn't work for the values of 0 and 360
    // here's the hacky fix
    var h = hsv[0];
    if (h === 0) {h = 1}
    if (h === 360) {h = 359}

    // Rebase the h,s,v values
    h = h/360;
    var s = hsv[1]/100,
        v = hsv[2]/100;

    var h_i = Math.floor(h*6),
      f = h * 6 - h_i,
      p = v * (1 - s),
      q = v * (1 - f*s),
      t = v * (1 - (1 - f)*s),
      r = 256,
      g = 256,
      b = 256;

    switch(h_i) {
      case 0: r = v, g = t, b = p;  break;
      case 1: r = q, g = v, b = p;  break;
      case 2: r = p, g = v, b = t;  break;
      case 3: r = p, g = q, b = v;  break;
      case 4: r = t, g = p, b = v;  break;
      case 5: r = v, g = p, b = q;  break;
    }
    var result = [Math.floor(r*255), Math.floor(g*255), Math.floor(b*255)];
    return result;
  }

  function colorString (prefix, values) {
    return prefix + '(' + values.join(', ') + ')';
  }

  return randomColor;
}));
},{}],"randomColor":[function(require,module,exports){
module.exports=require('kOrPUe');
},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS9tYy9Ecm9wYm94L3dvcmtzcGFjZS9jaXJjbG9pZHMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9ob21lL21jL0Ryb3Bib3gvd29ya3NwYWNlL2NpcmNsb2lkcy9zcmMvanMvbWFpbi5qcyIsIi9ob21lL21jL0Ryb3Bib3gvd29ya3NwYWNlL2NpcmNsb2lkcy9zcmMvanMvdXRpbHMvYm9pZC5qcyIsIi9ob21lL21jL0Ryb3Bib3gvd29ya3NwYWNlL2NpcmNsb2lkcy9zcmMvanMvdXRpbHMvZ3JhcGhpY3MuanMiLCIvaG9tZS9tYy9Ecm9wYm94L3dvcmtzcGFjZS9jaXJjbG9pZHMvc3JjL2pzL3V0aWxzL3ZlYzIuanMiLCIvaG9tZS9tYy9Ecm9wYm94L3dvcmtzcGFjZS9jaXJjbG9pZHMvc3JjL3ZlbmRvci9qcy1saWIvc3JjL2xpYi9mcHMuanMiLCIvaG9tZS9tYy9Ecm9wYm94L3dvcmtzcGFjZS9jaXJjbG9pZHMvc3JjL3ZlbmRvci9qcy1saWIvc3JjL2xpYi9rZXlib2FyZC5qcyIsIi9ob21lL21jL0Ryb3Bib3gvd29ya3NwYWNlL2NpcmNsb2lkcy9zcmMvdmVuZG9yL3JhbmRvbUNvbG9yL3JhbmRvbUNvbG9yLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQm9pZCA9IHJlcXVpcmUoJy4vdXRpbHMvYm9pZC5qcycpLFxuICAgIEdyYXBoaWNzID0gcmVxdWlyZSgnLi91dGlscy9ncmFwaGljcy5qcycpLFxuICAgIHJhbmRvbUNvbG9yID0gcmVxdWlyZSgncmFuZG9tQ29sb3InKSxcbiAgICBGUFMgPSByZXF1aXJlKCdGUFMnKSxcbiAgICBLZXlib2FyZCA9IHJlcXVpcmUoJ0tleWJvYXJkJyk7XG5cbihmdW5jdGlvbigpIHtcblxuICAgIHZhciBib2lkcyA9IFtdLFxuICAgICAgICBjb2xvcnMgPSByYW5kb21Db2xvcih7IGNvdW50OiA1MCwgZm9ybWF0OiAncmdiJyB9KSxcbiAgICAgICAgb3B0aW9ucyA9IFtcbiAgICAgICAgICAgIHsgc2l6ZTogNDAwLCBkZWNyZW1lbnQ6IDEgfSxcbiAgICAgICAgICAgIHsgc2l6ZTogODAwLCBkZWNyZW1lbnQ6IDIwIH0sXG4gICAgICAgICAgICB7IHNpemU6IDgwMCwgZGVjcmVtZW50OiA0IH0sXG4gICAgICAgICAgICB7IHNpemU6IDEwMCwgZGVjcmVtZW50OiAwLjEgfSxcbiAgICAgICAgICAgIHsgc2l6ZTogOCwgZGVjcmVtZW50OiAwLjAxIH1cbiAgICAgICAgXSxcbiAgICAgICAgc2l6ZSA9IDAsXG4gICAgICAgIGRlY3JlbWVudCA9IDAsXG4gICAgICAgIGZwcyA9IG5ldyBGUFMoKTtcblxuICAgIEdyYXBoaWNzLmluaXQoKTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29sb3JzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjb2xvciA9IGNvbG9yc1tpXTtcbiAgICAgICAgdmFyIGJvaWQgPSBuZXcgQm9pZCgpO1xuICAgICAgICBib2lkLnNldEJvdW5kcyhHcmFwaGljcy53aWR0aCwgR3JhcGhpY3MuaGVpZ2h0KTtcbiAgICAgICAgYm9pZC5wb3NpdGlvbi54ID0gR3JhcGhpY3Mud2lkdGggKiBNYXRoLnJhbmRvbSgpO1xuICAgICAgICBib2lkLnBvc2l0aW9uLnkgPSBHcmFwaGljcy5oZWlnaHQgKiBNYXRoLnJhbmRvbSgpO1xuICAgICAgICBib2lkLl9tYXhTcGVlZCA9IDU7XG4gICAgICAgIGJvaWQuY29sb3IgPSBjb2xvcjtcbiAgICAgICAgYm9pZHMucHVzaChib2lkKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzdGFydCgpIHtcbiAgICAgICAgR3JhcGhpY3MuY2xlYXIoKTtcbiAgICAgICAgdmFyIG9wdCA9IG9wdGlvbnNbTWF0aC5mbG9vcihvcHRpb25zLmxlbmd0aCAqIE1hdGgucmFuZG9tKCkpXTtcbiAgICAgICAgc2l6ZSA9IG9wdC5zaXplO1xuICAgICAgICBkZWNyZW1lbnQgPSBvcHQuZGVjcmVtZW50O1xuICAgICAgICBsb29wKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYm9pZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBib2lkID0gYm9pZHNbaV07XG4gICAgICAgICAgICBib2lkLndhbmRlcigpO1xuICAgICAgICAgICAgYm9pZC51cGRhdGUoKTtcbiAgICAgICAgfVxuICAgICAgICBmcHMudXBkYXRlKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVuZGVyKCkge1xuICAgICAgICAvL0dyYXBoaWNzLmNsZWFyKCk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBib2lkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGJvaWQgPSBib2lkc1tpXTtcbiAgICAgICAgICAgIEdyYXBoaWNzLmZpbGwoYm9pZC5jb2xvcik7XG4gICAgICAgICAgICBHcmFwaGljcy5jaXJjbGUoYm9pZC5wb3NpdGlvbi54LCBib2lkLnBvc2l0aW9uLnksIHNpemUpO1xuXG4gICAgICAgIH1cbiAgICAgICAgc2l6ZS09ZGVjcmVtZW50O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxvb3AoKSB7XG4gICAgICAgIGlmKHNpemUgPiAwKSB7XG4gICAgICAgICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGxvb3ApO1xuICAgICAgICAgICAgdXBkYXRlKCk7XG4gICAgICAgICAgICByZW5kZXIoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBzdGFydCgpO1xuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBHcmFwaGljcy5zaXplKCk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiByZWZyZXNoKCkge1xuICAgICAgICBpZihzaXplID4gMCkgeyByZXR1cm47IH1cbiAgICAgICAgc3RhcnQoKTtcbiAgICB9XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIHN3aXRjaChldmVudC5rZXlDb2RlKSB7XG4gICAgICAgICAgICBjYXNlIEtleWJvYXJkLlNQQUNFQkFSOlxuICAgICAgICAgICAgICAgIHJlZnJlc2goKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgS2V5Ym9hcmQuSTpcbiAgICAgICAgICAgICAgICBHcmFwaGljcy5vcGVuSW1hZ2UoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHJlZnJlc2gpO1xufSgpKTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBWZWMyID0gcmVxdWlyZSgnLi92ZWMyLmpzJyk7XG5cbmZ1bmN0aW9uIEJvaWQoKVxue1xuICAgIHRoaXMuX3Bvc2l0aW9uID0gVmVjMi5nZXQoKTtcbiAgICB0aGlzLl92ZWxvY2l0eSA9IFZlYzIuZ2V0KCk7ICAgIFxuICAgIHRoaXMuX3N0ZWVyaW5nRm9yY2UgPSBWZWMyLmdldCgpO1xuICAgIHRoaXMuX2JvdW5kcyA9IHt4OjAsIHk6MCwgd2lkdGg6NjQwLCBoZWlnaHQ6NDgwfTtcbiAgICB0aGlzLl9lZGdlQmVoYXZpb3IgPSBCb2lkLkVER0VfQk9VTkNFO1xuICAgIHRoaXMuX21hc3MgPSAxLjA7XG4gICAgdGhpcy5fbWF4U3BlZWQgPSAxMDtcbiAgICB0aGlzLl9tYXhGb3JjZSA9IDE7XG4gICAgLy8gYXJyaXZlXG4gICAgdGhpcy5fYXJyaXZhbFRocmVzaG9sZCA9IDUwO1xuICAgIC8vIHdhbmRlclxuICAgIHRoaXMuX3dhbmRlckRpc3RhbmNlID0gMTA7XG4gICAgdGhpcy5fd2FuZGVyUmFkaXVzID0gNTtcbiAgICB0aGlzLl93YW5kZXJBbmdsZSA9IDA7XG4gICAgdGhpcy5fd2FuZGVyUmFuZ2UgPSAxO1xuICAgIC8vIGF2b2lkXG4gICAgdGhpcy5fYXZvaWREaXN0YW5jZSA9IDMwMDtcbiAgICB0aGlzLl9hdm9pZEJ1ZmZlciA9IDIwO1xuICAgIC8vIGZvbGxvdyBwYXRoXG4gICAgdGhpcy5fcGF0aEluZGV4ID0gMDtcbiAgICB0aGlzLl9wYXRoVGhyZXNob2xkID0gMjA7XG4gICAgLy8gZmxvY2tcbiAgICB0aGlzLl9pblNpZ2h0RGlzdGFuY2UgPSAzMDA7XG4gICAgdGhpcy5fdG9vQ2xvc2VEaXN0YW5jZSA9IDYwO1xufVxuXG4vLyBlZGdlIGJlaGF2aW9yc1xuXG5Cb2lkLkVER0VfV1JBUCA9ICd3cmFwJztcbkJvaWQuRURHRV9CT1VOQ0UgPSAnYm91bmNlJztcblxuQm9pZC5wcm90b3R5cGUuc2V0Qm91bmRzID0gZnVuY3Rpb24od2lkdGgsIGhlaWdodCwgeCwgeSkge1xuICAgIHRoaXMuX2JvdW5kcy53aWR0aCA9IHdpZHRoO1xuICAgIHRoaXMuX2JvdW5kcy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgdGhpcy5fYm91bmRzLnggPSB4IHx8IDA7XG4gICAgdGhpcy5fYm91bmRzLnkgPSB5IHx8IDA7XG59O1xuXG5Cb2lkLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBzdGVlclxuICAgIHRoaXMuX3N0ZWVyaW5nRm9yY2UudHJ1bmNhdGUodGhpcy5fbWF4Rm9yY2UpO1xuICAgIC8vdGhpcy5fc3RlZXJpbmdGb3JjZSA9IHRoaXMuX3N0ZWVyaW5nRm9yY2UuZGl2aWRlKHRoaXMuX21hc3MsIHRydWUpO1xuICAgIHRoaXMuX3N0ZWVyaW5nRm9yY2UuZGl2aWRlQnkodGhpcy5fbWFzcyk7XG4gICAgdGhpcy5fdmVsb2NpdHkgPSB0aGlzLl92ZWxvY2l0eS5hZGQodGhpcy5fc3RlZXJpbmdGb3JjZSwgdHJ1ZSk7XG4gICAgdGhpcy5fc3RlZXJpbmdGb3JjZS5yZXNldCgpO1xuICAgIC8vIG1ha2Ugc3VyZSB2ZWxvY2l0eSBzdGF5cyB3aXRoaW4gbWF4IHNwZWVkLlxuICAgIHRoaXMuX3ZlbG9jaXR5LnRydW5jYXRlKHRoaXMuX21heFNwZWVkKTtcbiAgICAvLyBhZGQgdmVsb2NpdHkgdG8gcG9zaXRpb25cbiAgICB0aGlzLl9wb3NpdGlvbiA9IHRoaXMuX3Bvc2l0aW9uLmFkZCh0aGlzLl92ZWxvY2l0eSwgdHJ1ZSk7XG4gICAgLy8gaGFuZGxlIGFueSBlZGdlIGJlaGF2aW9yXG4gICAgaWYodGhpcy5fZWRnZUJlaGF2aW9yID09PSBCb2lkLkVER0VfV1JBUCkge1xuICAgICAgICB0aGlzLndyYXAoKTtcbiAgICB9XG4gICAgZWxzZSBpZih0aGlzLl9lZGdlQmVoYXZpb3IgPT09IEJvaWQuRURHRV9CT1VOQ0UpIHtcbiAgICAgICAgdGhpcy5ib3VuY2UoKTtcbiAgICB9XG59O1xuXG4vLyBDYXVzZXMgYm9pZCB0byBib3VuY2Ugb2ZmIGVkZ2UgaWYgZWRnZSBpcyBoaXRcbkJvaWQucHJvdG90eXBlLmJvdW5jZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKHRoaXMuX3Bvc2l0aW9uLnggPiB0aGlzLl9ib3VuZHMud2lkdGgpIHtcbiAgICAgICAgdGhpcy5fcG9zaXRpb24ueCA9IHRoaXMuX2JvdW5kcy53aWR0aDtcbiAgICAgICAgdGhpcy5fdmVsb2NpdHkueCAqPSAtMTtcbiAgICB9XG4gICAgZWxzZSBpZih0aGlzLl9wb3NpdGlvbi54IDwgdGhpcy5fYm91bmRzLngpIHtcbiAgICAgICAgdGhpcy5fcG9zaXRpb24ueCA9IHRoaXMuX2JvdW5kcy54O1xuICAgICAgICB0aGlzLl92ZWxvY2l0eS54ICo9IC0xO1xuICAgIH1cbiAgICBpZih0aGlzLl9wb3NpdGlvbi55ID4gdGhpcy5fYm91bmRzLmhlaWdodCkge1xuICAgICAgICB0aGlzLl9wb3NpdGlvbi55ID0gdGhpcy5fYm91bmRzLmhlaWdodDtcbiAgICAgICAgdGhpcy5fdmVsb2NpdHkueSAqPSAtMTtcbiAgICB9XG4gICAgZWxzZSBpZih0aGlzLl9wb3NpdGlvbi55IDwgdGhpcy5fYm91bmRzLnkpIHtcbiAgICAgICAgdGhpcy5fcG9zaXRpb24ueSA9IHRoaXMuX2JvdW5kcy55O1xuICAgICAgICB0aGlzLl92ZWxvY2l0eS55ICo9IC0xO1xuICAgIH1cbn07XG5cbi8vIENhdXNlcyBib2lkIHRvIHdyYXAgYXJvdW5kIHRvIG9wcG9zaXRlIGVkZ2UgaWYgZWRnZSBpcyBoaXRcbkJvaWQucHJvdG90eXBlLndyYXAgPSBmdW5jdGlvbigpIHtcbiAgICBpZih0aGlzLl9wb3NpdGlvbi54ID4gdGhpcy5fYm91bmRzLndpZHRoKSB7XG4gICAgICAgIHRoaXMuX3Bvc2l0aW9uLnggPSB0aGlzLl9ib3VuZHMueDtcbiAgICB9XG4gICAgZWxzZSBpZih0aGlzLl9wb3NpdGlvbi54IDwgdGhpcy5fYm91bmRzLngpIHtcbiAgICAgICAgdGhpcy5fcG9zaXRpb24ueCA9IHRoaXMuX2JvdW5kcy53aWR0aDtcbiAgICB9XG4gICAgaWYodGhpcy5fcG9zaXRpb24ueSA+IHRoaXMuX2JvdW5kcy5oZWlnaHQpIHtcbiAgICAgICAgdGhpcy5fcG9zaXRpb24ueSA9IHRoaXMuX2JvdW5kcy55O1xuICAgIH1cbiAgICBlbHNlIGlmKHRoaXMuX3Bvc2l0aW9uLnkgPCB0aGlzLl9ib3VuZHMueSkge1xuICAgICAgICB0aGlzLl9wb3NpdGlvbi55ID0gdGhpcy5fYm91bmRzLmhlaWdodDtcbiAgICB9XG59O1xuXG5Cb2lkLnByb3RvdHlwZS5zZWVrID0gZnVuY3Rpb24odGFyZ2V0VmVjKSB7XG4gICAgdmFyIGRlc2lyZWRWZWxvY2l0eSA9IHRhcmdldFZlYy5zdWJ0cmFjdCh0aGlzLl9wb3NpdGlvbik7XG4gICAgZGVzaXJlZFZlbG9jaXR5Lm5vcm1hbGl6ZSgpO1xuICAgIGRlc2lyZWRWZWxvY2l0eS5zY2FsZUJ5KHRoaXMuX21heFNwZWVkKTtcbiAgICAvL2Rlc2lyZWRWZWxvY2l0eSA9IGRlc2lyZWRWZWxvY2l0eS5tdWx0aXBseSh0aGlzLl9tYXhTcGVlZCwgdHJ1ZSk7XG4gICAgdmFyIGZvcmNlID0gZGVzaXJlZFZlbG9jaXR5LnN1YnRyYWN0KHRoaXMuX3ZlbG9jaXR5LCB0cnVlKTtcbiAgICB0aGlzLl9zdGVlcmluZ0ZvcmNlID0gdGhpcy5fc3RlZXJpbmdGb3JjZS5hZGQoZm9yY2UsIHRydWUpO1xuXG4gICAgZm9yY2UuZGlzcG9zZSgpO1xufTtcblxuQm9pZC5wcm90b3R5cGUuZmxlZSA9IGZ1bmN0aW9uKHRhcmdldFZlYykge1xuICAgIHZhciBkZXNpcmVkVmVsb2NpdHkgPSB0YXJnZXRWZWMuc3VidHJhY3QodGhpcy5fcG9zaXRpb24pO1xuICAgIGRlc2lyZWRWZWxvY2l0eS5ub3JtYWxpemUoKTtcbiAgICBkZXNpcmVkVmVsb2NpdHkuc2NhbGVCeSh0aGlzLl9tYXhTcGVlZCk7XG4gICAgLy9kZXNpcmVkVmVsb2NpdHkgPSBkZXNpcmVkVmVsb2NpdHkubXVsdGlwbHkodGhpcy5fbWF4U3BlZWQsIHRydWUpO1xuICAgIHZhciBmb3JjZSA9IGRlc2lyZWRWZWxvY2l0eS5zdWJ0cmFjdCh0aGlzLl92ZWxvY2l0eSwgdHJ1ZSk7XG4gICAgLy8gb25seSB0aGlzIGxpbmUgZGlmZmVyZW50IGZyb20gc2VlazpcbiAgICB0aGlzLl9zdGVlcmluZ0ZvcmNlID0gdGhpcy5fc3RlZXJpbmdGb3JjZS5zdWJ0cmFjdChmb3JjZSwgdHJ1ZSk7XG5cbiAgICBmb3JjZS5kaXNwb3NlKCk7XG59O1xuXG4vLyBzZWVrIHVudGlsIHdpdGhpbmcgYXJyaXZhbFRocmVzaG9sZFxuQm9pZC5wcm90b3R5cGUuYXJyaXZlID0gZnVuY3Rpb24odGFyZ2V0VmVjKSB7XG4gICAgdmFyIGRlc2lyZWRWZWxvY2l0eSA9IHRhcmdldFZlYy5zdWJ0cmFjdCh0aGlzLl9wb3NpdGlvbik7XG4gICAgZGVzaXJlZFZlbG9jaXR5Lm5vcm1hbGl6ZSgpO1xuXG4gICAgdmFyIGRpc3RhbmNlID0gdGhpcy5fcG9zaXRpb24uZGlzdGFuY2UodGFyZ2V0VmVjKTtcbiAgICBpZihkaXN0YW5jZSA+IHRoaXMuX2Fycml2YWxUaHJlc2hvbGQpIHtcbiAgICAgICAgZGVzaXJlZFZlbG9jaXR5LnNjYWxlQnkodGhpcy5fbWF4U3BlZWQpO1xuICAgICAgICAvL2Rlc2lyZWRWZWxvY2l0eSA9IGRlc2lyZWRWZWxvY2l0eS5tdWx0aXBseSh0aGlzLl9tYXhTcGVlZCwgdHJ1ZSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB2YXIgbXVsID0gdGhpcy5fbWF4U3BlZWQgKiBkaXN0YW5jZSAvIHRoaXMuX2Fycml2YWxUaHJlc2hvbGQ7XG4gICAgICAgIGRlc2lyZWRWZWxvY2l0eS5zY2FsZUJ5KG11bCk7XG4gICAgICAgIC8vZGVzaXJlZFZlbG9jaXR5ID0gZGVzaXJlZFZlbG9jaXR5Lm11bHRpcGx5KG11bCwgdHJ1ZSk7XG4gICAgfVxuICAgIHZhciBmb3JjZSA9IGRlc2lyZWRWZWxvY2l0eS5zdWJ0cmFjdCh0aGlzLl92ZWxvY2l0eSwgdHJ1ZSk7XG4gICAgdGhpcy5fc3RlZXJpbmdGb3JjZSA9IHRoaXMuX3N0ZWVyaW5nRm9yY2UuYWRkKGZvcmNlLCB0cnVlKTtcblxuICAgIGZvcmNlLmRpc3Bvc2UoKTtcbn07XG5cbi8vIGxvb2sgYXQgdmVsb2NpdHkgb2YgYm9pZCBhbmQgdHJ5IHRvIHByZWRpY3Qgd2hlcmUgaXQncyBnb2luZ1xuQm9pZC5wcm90b3R5cGUucHVyc3VlID0gZnVuY3Rpb24odGFyZ2V0Qm9pZCkge1xuICAgIHZhciBsb29rQWhlYWRUaW1lID0gdGhpcy5fcG9zaXRpb24uZGlzdGFuY2UodGFyZ2V0Qm9pZC5fcG9zaXRpb24pIC8gdGhpcy5fbWF4U3BlZWQ7XG4gICAgLy8gZS5nLiBvZiB3aGVyZSBuZXcgdmVjIHNob3VsZCBiZSByZXR1cm5lZDpcbiAgICB2YXIgc2NhbGVkVmVsb2NpdHkgPSB0YXJnZXRCb2lkLl92ZWxvY2l0eS5jbG9uZSgpLnNjYWxlQnkobG9va0FoZWFkVGltZSk7XG4gICAgdmFyIHByZWRpY3RlZFRhcmdldCA9IHRhcmdldEJvaWQuX3Bvc2l0aW9uLmFkZChzY2FsZWRWZWxvY2l0eSk7XG4gICAgLy92YXIgcHJlZGljdGVkVGFyZ2V0ID0gdGFyZ2V0Qm9pZC5fcG9zaXRpb24uYWRkKHRhcmdldEJvaWQuX3ZlbG9jaXR5Lm11bHRpcGx5KGxvb2tBaGVhZFRpbWUpKTtcbiAgICB0aGlzLnNlZWsocHJlZGljdGVkVGFyZ2V0KTtcblxuICAgIHNjYWxlZFZlbG9jaXR5LmRpc3Bvc2UoKTtcbiAgICBwcmVkaWN0ZWRUYXJnZXQuZGlzcG9zZSgpO1xufTtcblxuLy8gbG9vayBhdCB2ZWxvY2l0eSBvZiBib2lkIGFuZCB0cnkgdG8gcHJlZGljdCB3aGVyZSBpdCdzIGdvaW5nXG5Cb2lkLnByb3RvdHlwZS5ldmFkZSA9IGZ1bmN0aW9uKHRhcmdldEJvaWQpIHtcbiAgICB2YXIgbG9va0FoZWFkVGltZSA9IHRoaXMuX3Bvc2l0aW9uLmRpc3RhbmNlKHRhcmdldEJvaWQuX3Bvc2l0aW9uKSAvIHRoaXMuX21heFNwZWVkO1xuICAgIC8vIGUuZy4gb2Ygd2hlcmUgbmV3IHZlYyBzaG91bGQgYmUgcmV0dXJuZWQ6XG4gICAgdmFyIHNjYWxlZFZlbG9jaXR5ID0gdGFyZ2V0Qm9pZC5fdmVsb2NpdHkuY2xvbmUoKS5zY2FsZUJ5KGxvb2tBaGVhZFRpbWUpO1xuICAgIHZhciBwcmVkaWN0ZWRUYXJnZXQgPSB0YXJnZXRCb2lkLl9wb3NpdGlvbi5hZGQoc2NhbGVkVmVsb2NpdHkpO1xuICAgIC8vdmFyIHByZWRpY3RlZFRhcmdldCA9IHRhcmdldEJvaWQuX3Bvc2l0aW9uLmFkZCh0YXJnZXRCb2lkLl92ZWxvY2l0eS5tdWx0aXBseShsb29rQWhlYWRUaW1lKSk7XG4gICAgLy8gb25seSB0aGlzIGxpbmUgZGlmZiBmcm9tIHB1cnN1ZTpcbiAgICB0aGlzLmZsZWUocHJlZGljdGVkVGFyZ2V0KTtcblxuICAgIHByZWRpY3RlZFRhcmdldC5kaXNwb3NlKCk7XG59O1xuXG4vLyB3YW5kZXIgYXJvdW5kLCBjaGFuZ2luZyBhbmdsZSBieSBhIGxpbWl0ZWQgYW1vdW50IGVhY2ggdGlja1xuQm9pZC5wcm90b3R5cGUud2FuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGNlbnRlciA9IHRoaXMuX3ZlbG9jaXR5LmNsb25lKCkubm9ybWFsaXplKCkuc2NhbGVCeSh0aGlzLl93YW5kZXJEaXN0YW5jZSk7XG4gICAgLy92YXIgY2VudGVyID0gdGhpcy5fdmVsb2NpdHkuY2xvbmUoKS5ub3JtYWxpemUoKS5tdWx0aXBseSh0aGlzLl93YW5kZXJEaXN0YW5jZSwgdHJ1ZSk7XG4gICAgdmFyIG9mZnNldCA9IFZlYzIuZ2V0KCk7XG4gICAgb2Zmc2V0Lmxlbmd0aCA9IHRoaXMuX3dhbmRlclJhZGl1cztcbiAgICBvZmZzZXQuYW5nbGUgPSB0aGlzLl93YW5kZXJBbmdsZTtcbiAgICB0aGlzLl93YW5kZXJBbmdsZSArPSBNYXRoLnJhbmRvbSgpICogdGhpcy5fd2FuZGVyUmFuZ2UgLSB0aGlzLl93YW5kZXJSYW5nZSAqIDAuNTtcbiAgICB2YXIgZm9yY2UgPSBjZW50ZXIuYWRkKG9mZnNldCwgdHJ1ZSk7XG4gICAgdGhpcy5fc3RlZXJpbmdGb3JjZSA9IHRoaXMuX3N0ZWVyaW5nRm9yY2UuYWRkKGZvcmNlLCB0cnVlKTtcblxuICAgIG9mZnNldC5kaXNwb3NlKCk7XG4gICAgZm9yY2UuZGlzcG9zZSgpO1xufTtcblxuLy8gZ2V0cyBhIGJpdCByb3VnaCB1c2VkIGluIGNvbWJpbmF0aW9uIHdpdGggc2Vla2luZyBhcyB0aGUgdmVoaWNsZSBhdHRlbXB0cyBcbi8vIHRvIHNlZWsgc3RyYWlnaHQgdGhyb3VnaCBhbiBvYmplY3Qgd2hpbGUgc2ltdWx0YW5lb3VzbHkgdHJ5aW5nIHRvIGF2b2lkIGl0XG5Cb2lkLnByb3RvdHlwZS5hdm9pZCA9IGZ1bmN0aW9uKGNpcmNsZXMpIHtcbiAgICB2YXIgbCA9IGNpcmNsZXMubGVuZ3RoO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHZhciBjaXJjbGUgPSBjaXJjbGVzW2ldO1xuICAgICAgICB2YXIgaGVhZGluZyA9IHRoaXMuX3ZlbG9jaXR5LmNsb25lKCkubm9ybWFsaXplKCk7XG5cbiAgICAgICAgLy8gdmVjIGJldHdlZW4gY2lyY2xlIGFuZCBib2lkXG4gICAgICAgIHZhciBkaWZmZXJlbmNlID0gY2lyY2xlLnBvc2l0aW9uLnN1YnRyYWN0KHRoaXMuX3Bvc2l0aW9uKTtcbiAgICAgICAgdmFyIGRvdFByb2QgPSBkaWZmZXJlbmNlLmRvdFByb2R1Y3QoaGVhZGluZyk7XG5cbiAgICAgICAgLy8gaWYgY2lyY2xlIGluIGZyb250IG9mIGJvaWRcbiAgICAgICAgaWYoZG90UHJvZCA+IDApIHtcbiAgICAgICAgICAgIC8vIHZlYyB0byByZXByZXNlbnQgJ2ZlZWxlcicgYXJtXG4gICAgICAgICAgICAvL3ZhciBmZWVsZXIgPSBoZWFkaW5nLm11bHRpcGx5KHRoaXMuX2F2b2lkRGlzdGFuY2UpO1xuICAgICAgICAgICAgdmFyIGZlZWxlciA9IGhlYWRpbmcuY2xvbmUoKS5zY2FsZUJ5KHRoaXMuX2F2b2lkRGlzdGFuY2UpO1xuICAgICAgICAgICAgLy8gcHJvamVjdCBkaWZmZXJlYmNlIG9udG8gZmVlbGVyXG4gICAgICAgICAgICAvL3ZhciBwcm9qZWN0aW9uID0gaGVhZGluZy5tdWx0aXBseShkb3RQcm9kKTtcbiAgICAgICAgICAgIHZhciBwcm9qZWN0aW9uID0gaGVhZGluZy5jbG9uZSgpLnNjYWxlQnkoZG90UHJvZCk7XG4gICAgICAgICAgICAvLyBkaXN0YW5jZSBmcm9tIGNpcmNsZSB0byBmZWVsZXJcbiAgICAgICAgICAgIHZhciB2ZWNEaXN0YW5jZSA9IHByb2plY3Rpb24uc3VidHJhY3QoZGlmZmVyZW5jZSk7XG4gICAgICAgICAgICB2YXIgZGlzdGFuY2UgPSB2ZWNEaXN0YW5jZS5sZW5ndGg7XG4gICAgICAgICAgICAvLyBpZiBmZWVsZXIgaW50ZXJzZWN0cyBjaXJjbGUgKHBsdXMgYnVmZmVyKSwgYW5kIHByb2plY3Rpb25cbiAgICAgICAgICAgIC8vIGxlc3MgdGhhbiBmZWVsZXIgbGVuZ3RoLCB3aWxsIGNvbGxpZGVcbiAgICAgICAgICAgIGlmKGRpc3RhbmNlIDwgY2lyY2xlLnJhZGl1cyArIHRoaXMuX2F2b2lkQnVmZmVyICYmIHByb2plY3Rpb24ubGVuZ3RoIDwgZmVlbGVyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIC8vIGNhbGMgYSBmb3JjZSArLy0gOTAgZGVnIGZyb20gdmVjIHRvIGNpcmNcbiAgICAgICAgICAgICAgICAvL3ZhciBmb3JjZSA9IGhlYWRpbmcubXVsdGlwbHkodGhpcy5fbWF4U3BlZWQpO1xuICAgICAgICAgICAgICAgIHZhciBmb3JjZSA9IGhlYWRpbmcuY2xvbmUoKS5zY2FsZUJ5KHRoaXMuX21heFNwZWVkKTtcbiAgICAgICAgICAgICAgICBmb3JjZS5hbmdsZSArPSBkaWZmZXJlbmNlLnNpZ24odGhpcy5fdmVsb2NpdHkpICogTWF0aC5QSSAvIDI7XG4gICAgICAgICAgICAgICAgLy8gc2NhbGUgZm9yY2UgYnkgZGlzdGFuY2UgKGZ1cnRoZXIgPSBzbWFsbGVyIGZvcmNlKVxuICAgICAgICAgICAgICAgIC8vZm9yY2UgPSBmb3JjZS5tdWx0aXBseSgxIC0gcHJvamVjdGlvbi5sZW5ndGggLyBmZWVsZXIubGVuZ3RoLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBmb3JjZS5zY2FsZUJ5KDEgLSBwcm9qZWN0aW9uLmxlbmd0aCAvIGZlZWxlci5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIC8vIGFkZCB0byBzdGVlcmluZyBmb3JjZVxuICAgICAgICAgICAgICAgIHRoaXMuX3N0ZWVyaW5nRm9yY2UgPSB0aGlzLl9zdGVlcmluZ0ZvcmNlLmFkZChmb3JjZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgLy8gYnJha2luZyBmb3JjZSAtIHNsb3dzIGJvaWQgZG93biBzbyBpdCBoYXMgdGltZSB0byB0dXJuIChjbG9zZXIgPSBoYXJkZXIpXG4gICAgICAgICAgICAgICAgLy90aGlzLl92ZWxvY2l0eSA9IHRoaXMuX3ZlbG9jaXR5Lm11bHRpcGx5KHByb2plY3Rpb24ubGVuZ3RoIC8gZmVlbGVyLmxlbmd0aCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5fdmVsb2NpdHkuc2NhbGVCeShwcm9qZWN0aW9uLmxlbmd0aCAvIGZlZWxlci5sZW5ndGgpO1xuXG4gICAgICAgICAgICAgICAgZm9yY2UuZGlzcG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZmVlbGVyLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgIHByb2plY3Rpb24uZGlzcG9zZSgpO1xuICAgICAgICAgICAgdmVjRGlzdGFuY2UuZGlzcG9zZSgpO1xuICAgICAgICB9XG4gICAgICAgIGhlYWRpbmcuZGlzcG9zZSgpO1xuICAgICAgICBkaWZmZXJlbmNlLmRpc3Bvc2UoKTtcbiAgICB9XG59O1xuXG4vLyBmb3IgZGVmaW5pbmcgb2JzdGFjbGVzIG9yIGFyZWFzIHRvIGF2b2lkXG5Cb2lkLkNpcmNsZSA9IGZ1bmN0aW9uKHJhZGl1cywgeCwgeSkge1xuICAgIGNvbnNvbGUubG9nKHJhZGl1cywgeCwgeSk7XG4gICAgdGhpcy5yYWRpdXMgPSByYWRpdXM7XG4gICAgdGhpcy5wb3NpdGlvbiA9IFZlYzIuZ2V0KHgsIHkpO1xufTtcblxuLy8gZm9sbG93IGEgcGF0aCBtYWRlIHVwIG9mIGFuIGFycmF5IG9yIHZlY3RvcnNcbkJvaWQucHJvdG90eXBlLmZvbGxvd1BhdGggPSBmdW5jdGlvbihwYXRoLCBsb29wKSB7XG4gICAgbG9vcCA9IGxvb3AgPT09IHVuZGVmaW5lZCA/IGZhbHNlIDogbG9vcDtcbiAgICB2YXIgd2F5UG9pbnQgPSBwYXRoW3RoaXMuX3BhdGhJbmRleF07XG4gICAgLy9jb25zb2xlLmxvZyh3YXlQb2ludCk7XG4gICAgaWYoIXdheVBvaW50KSB7IHJldHVybjsgfVxuICAgIGlmKHRoaXMuX3Bvc2l0aW9uLmRpc3RhbmNlKHdheVBvaW50KSA8IHRoaXMuX3BhdGhUaHJlc2hvbGQpIHtcbiAgICAgICAgaWYodGhpcy5fcGF0aEluZGV4ID49IHBhdGgubGVuZ3RoLTEpIHtcbiAgICAgICAgICAgIGlmKGxvb3ApIHsgdGhpcy5fcGF0aEluZGV4ID0gMDsgfSAgIFxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fcGF0aEluZGV4Kys7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYodGhpcy5fcGF0aEluZGV4ID49IHBhdGgubGVuZ3RoLTEgJiYgIWxvb3ApIHtcbiAgICAgICAgdGhpcy5hcnJpdmUod2F5UG9pbnQpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5zZWVrKHdheVBvaW50KTtcbiAgICB9XG59O1xuXG4vLyBmbG9jayAtIGdyb3VwIG9mIGJvaWRzIGxvb3NlbHkgbW92ZSB0b2dldGhlclxuQm9pZC5wcm90b3R5cGUuZmxvY2sgPSBmdW5jdGlvbihib2lkcykge1xuICAgIHZhciBhdmVyYWdlVmVsb2NpdHkgPSB0aGlzLl92ZWxvY2l0eS5jbG9uZSgpO1xuICAgIHZhciBhdmVyYWdlUG9zaXRpb24gPSBWZWMyLmdldCgpO1xuICAgIHZhciBpblNpZ2h0Q291bnQgPSAwO1xuICAgIHZhciBsID0gYm9pZHMubGVuZ3RoO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHZhciBib2lkID0gYm9pZHNbaV07XG4gICAgICAgIGlmKGJvaWQgIT09IHRoaXMgJiYgdGhpcy5faW5TaWdodChib2lkKSkge1xuICAgICAgICAgICAgYXZlcmFnZVZlbG9jaXR5ID0gYXZlcmFnZVZlbG9jaXR5LmFkZChib2lkLl92ZWxvY2l0eSwgdHJ1ZSk7XG4gICAgICAgICAgICBhdmVyYWdlUG9zaXRpb24gPSBhdmVyYWdlUG9zaXRpb24uYWRkKGJvaWQuX3Bvc2l0aW9uLCB0cnVlKTtcbiAgICAgICAgICAgIGlmKHRoaXMuX3Rvb0Nsb3NlKGJvaWQpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5mbGVlKGJvaWQuX3Bvc2l0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGluU2lnaHRDb3VudCsrO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmKGluU2lnaHRDb3VudCA+IDApIHtcbiAgICAgICAgLy9hdmVyYWdlVmVsb2NpdHkgPSBhdmVyYWdlVmVsb2NpdHkuZGl2aWRlKGluU2lnaHRDb3VudCwgdHJ1ZSk7XG4gICAgICAgIC8vYXZlcmFnZVBvc2l0aW9uID0gYXZlcmFnZVBvc2l0aW9uLmRpdmlkZShpblNpZ2h0Q291bnQsIHRydWUpO1xuICAgICAgICBhdmVyYWdlVmVsb2NpdHkuZGl2aWRlQnkoaW5TaWdodENvdW50KTtcbiAgICAgICAgYXZlcmFnZVBvc2l0aW9uLmRpdmlkZUJ5KGluU2lnaHRDb3VudCk7XG4gICAgICAgIHRoaXMuc2VlayhhdmVyYWdlUG9zaXRpb24pO1xuICAgICAgICB0aGlzLl9zdGVlcmluZ0ZvcmNlLmFkZChhdmVyYWdlVmVsb2NpdHkuc3VidHJhY3QodGhpcy5fdmVsb2NpdHksIHRydWUpLCB0cnVlKTtcbiAgICB9XG4gICAgYXZlcmFnZVZlbG9jaXR5LmRpc3Bvc2UoKTtcbiAgICBhdmVyYWdlUG9zaXRpb24uZGlzcG9zZSgpO1xufTtcblxuLy8gaXMgYm9pZCBjbG9zZSBlbm91Z2ggdG8gYmUgaW4gc2lnaHQ/IGZvciB1c2Ugd2l0aCBmbG9ja1xuQm9pZC5wcm90b3R5cGUuX2luU2lnaHQgPSBmdW5jdGlvbihib2lkKSB7XG4gICAgaWYodGhpcy5fcG9zaXRpb24uZGlzdGFuY2UoYm9pZC5fcG9zaXRpb24pID4gdGhpcy5faW5TaWdodERpc3RhbmNlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdmFyIGhlYWRpbmcgPSB0aGlzLl92ZWxvY2l0eS5jbG9uZSgpLm5vcm1hbGl6ZSgpO1xuICAgIHZhciBkaWZmZXJlbmNlID0gYm9pZC5fcG9zaXRpb24uc3VidHJhY3QodGhpcy5fcG9zaXRpb24pO1xuICAgIHZhciBkb3RQcm9kID0gZGlmZmVyZW5jZS5kb3RQcm9kdWN0KGhlYWRpbmcpO1xuXG4gICAgaGVhZGluZy5kaXNwb3NlKCk7XG4gICAgZGlmZmVyZW5jZS5kaXNwb3NlKCk7XG5cbiAgICBpZihkb3RQcm9kIDwgMCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLy8gaXMgYm9pZCB0b28gY2xvc2U/IGZvciB1c2Ugd2l0aCBmbG9ja1xuQm9pZC5wcm90b3R5cGUuX3Rvb0Nsb3NlID0gZnVuY3Rpb24oYm9pZCkge1xuICAgIHJldHVybiB0aGlzLl9wb3NpdGlvbi5kaXN0YW5jZShib2lkLl9wb3NpdGlvbikgPCB0aGlzLl90b29DbG9zZURpc3RhbmNlO1xufTtcblxuLy8gZ2V0dGVycyAvIHNldHRlcnNcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCb2lkLnByb3RvdHlwZSwgJ3Bvc2l0aW9uJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wb3NpdGlvbjtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJvaWQucHJvdG90eXBlLCAndmVsb2NpdHknLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZlbG9jaXR5O1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQm9pZC5wcm90b3R5cGUsICdlZGdlQmVoYXZpb3InLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX19lZGdlQmVoYXZpb3I7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2VkZ2VCZWhhdmlvciA9IHZhbHVlO1xuICAgIH1cbn0pO1xuXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEJvaWQ7XG59XG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgR3JhcGhpY3MgPSB7XHJcbiAgaW5pdDogZnVuY3Rpb24oKSB7XHJcbiAgICBpZihkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnY2FudmFzJykubGVuZ3RoID4gMCkge1xyXG4gICAgICB0aGlzLmNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdjYW52YXMnKVswXTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICB0aGlzLmNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xyXG4gICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMuY2FudmFzKTtcclxuICAgIH1cclxuICAgIHRoaXMuY29udGV4dCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJyk7XHJcbiAgICB0aGlzLnNpemUoKTtcclxuXHJcbiAgICB0aGlzLl90ZXh0Rm9udCA9ICdUaW1lcyc7XHJcbiAgICB0aGlzLl90ZXh0U2l6ZSA9IDEyO1xyXG4gICAgdGhpcy5jb250ZXh0LmZvbnQgPSB0aGlzLl90ZXh0U2l6ZSArICdweCAnICsgdGhpcy5fdGV4dEZvbnQ7XHJcbiAgfSxcclxuICBzaXplOiBmdW5jdGlvbih3aWR0aCwgaGVpZ2h0KSB7XHJcbiAgICB0aGlzLndpZHRoID0gdGhpcy5jYW52YXMud2lkdGggPSB3aWR0aCB8fCB3aW5kb3cuaW5uZXJXaWR0aDtcclxuICAgIHRoaXMuaGVpZ2h0ID0gdGhpcy5jYW52YXMuaGVpZ2h0ID0gaGVpZ2h0IHx8IHdpbmRvdy5pbm5lckhlaWdodDtcclxuICB9LFxyXG4gIGNsZWFyOiBmdW5jdGlvbihjb2xvcikge1xyXG4gICAgaWYoY29sb3IpIHtcclxuICAgICAgdGhpcy5jb250ZXh0LmZpbGxTdHlsZSA9IGNvbG9yO1xyXG4gICAgICB0aGlzLmNvbnRleHQuZmlsbFJlY3QoMCwgMCwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHRoaXMuY29udGV4dC5jbGVhclJlY3QoMCwgMCwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgYmFja2dyb3VuZDogZnVuY3Rpb24ociwgZywgYikge1xyXG4gICAgdGhpcy5jbGVhcigncmdiKCcrcisnLCAnK2IrJywgJytnKycpJyk7XHJcbiAgfSxcclxuICBmaWxsOiBmdW5jdGlvbihyLCBnLCBiLCBhKSB7XHJcbiAgICBpZih0eXBlb2YgciA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgdGhpcy5jb250ZXh0LmZpbGxTdHlsZSA9IHI7XHJcbiAgICAgIHJldHVybjsgIFxyXG4gICAgfVxyXG4gICAgYSA9IGEgPT09IHVuZGVmaW5lZCA/IDEgOiBhO1xyXG4gICAgdGhpcy5jb250ZXh0LmZpbGxTdHlsZSA9ICdyZ2JhKCcrcisnLCAnK2IrJywgJytnKycsICcrYSsnKSc7XHJcbiAgfSxcclxuICBzdHJva2U6IGZ1bmN0aW9uKHIsIGcsIGIsIGEpIHtcclxuICAgIGEgPSBhID09PSB1bmRlZmluZWQgPyAxIDogYTtcclxuICAgIHRoaXMuY29udGV4dC5zdHJva2VTdHlsZSA9ICdyZ2JhKCcrcisnLCAnK2IrJywgJytnKycsICcrYSsnKSc7XHJcbiAgfSxcclxuICBzdHJva2VXZWlnaHQ6IGZ1bmN0aW9uKHcpIHtcclxuICAgIHRoaXMuY29udGV4dC5saW5lV2lkdGggPSB3O1xyXG4gIH0sXHJcbiAgbW92ZTogZnVuY3Rpb24oeCwgeSkge1xyXG4gICAgdGhpcy5jb250ZXh0Lm1vdmVUbyh4LCB5KTtcclxuICB9LFxyXG4gIGxpbmU6IGZ1bmN0aW9uKHgxLCB5MSwgeDIsIHkyKSB7XHJcbiAgICB0aGlzLmNvbnRleHQuYmVnaW5QYXRoKCk7XHJcbiAgICB0aGlzLmNvbnRleHQubW92ZVRvKHgxLCB5MSk7XHJcbiAgICB0aGlzLmNvbnRleHQubGluZVRvKHgyLCB5Mik7XHJcbiAgICB0aGlzLmNvbnRleHQuc3Ryb2tlKCk7XHJcbiAgfSxcclxuICByZWN0OiBmdW5jdGlvbih4LCB5LCB3aWR0aCwgaGVpZ2h0LCBhbmdsZSkge1xyXG4gICAgaWYoYW5nbGUgIT09IHVuZGVmaW5lZCAmJiBhbmdsZSAhPT0gMCkge1xyXG4gICAgICB0aGlzLmNvbnRleHQuc2F2ZSgpO1xyXG4gICAgICB0aGlzLmNvbnRleHQudHJhbnNsYXRlKHggKyB3aWR0aC8yLCB5ICsgaGVpZ2h0LzIpO1xyXG4gICAgICB0aGlzLmNvbnRleHQucm90YXRlKGFuZ2xlKTtcclxuICAgICAgdGhpcy5jb250ZXh0LnJlY3QoLXdpZHRoLzIsIC1oZWlnaHQvMiwgd2lkdGgsIGhlaWdodCk7XHJcbiAgICAgIHRoaXMuY29udGV4dC5maWxsKCk7XHJcbiAgICAgIHRoaXMuY29udGV4dC5zdHJva2UoKTtcclxuICAgICAgdGhpcy5jb250ZXh0LnJlc3RvcmUoKTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICB0aGlzLmNvbnRleHQucmVjdCh4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcclxuICAgICAgdGhpcy5jb250ZXh0LmZpbGwoKTtcclxuICAgICAgdGhpcy5jb250ZXh0LnN0cm9rZSgpO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgY2lyY2xlOiBmdW5jdGlvbih4LCB5LCByYWRpdXMpIHtcclxuICAgIHRoaXMuY29udGV4dC5iZWdpblBhdGgoKTtcclxuICAgIHRoaXMuY29udGV4dC5hcmMoeCwgeSwgcmFkaXVzLCAwLCBNYXRoLlBJICogMiwgZmFsc2UpO1xyXG4gICAgdGhpcy5jb250ZXh0LmZpbGwoKTtcclxuICAgIHRoaXMuY29udGV4dC5zdHJva2UoKTtcclxuICB9LFxyXG4gIHRyaWFuZ2xlOiBmdW5jdGlvbih4LCB5LCB3aWR0aCwgaGVpZ2h0LCBhbmdsZSkge1xyXG4gICAgaWYoYW5nbGUgIT09IHVuZGVmaW5lZCAmJiBhbmdsZSAhPT0gMCkge1xyXG4gICAgICB0aGlzLmNvbnRleHQuc2F2ZSgpO1xyXG4gICAgICB0aGlzLmNvbnRleHQudHJhbnNsYXRlKHgsIHkpO1xyXG4gICAgICB0aGlzLmNvbnRleHQucm90YXRlKGFuZ2xlKTtcclxuICAgICAgdGhpcy5jb250ZXh0LmJlZ2luUGF0aCgpO1xyXG4gICAgICB0aGlzLmNvbnRleHQubW92ZVRvKDAgLSB3aWR0aC8yLCAwICsgaGVpZ2h0LzIpO1xyXG4gICAgICB0aGlzLmNvbnRleHQubGluZVRvKDAsIDAgLSBoZWlnaHQvMik7XHJcbiAgICAgIHRoaXMuY29udGV4dC5saW5lVG8oMCArIHdpZHRoLzIsIDAgKyBoZWlnaHQvMik7XHJcbiAgICAgIHRoaXMuY29udGV4dC5jbG9zZVBhdGgoKTtcclxuICAgICAgdGhpcy5jb250ZXh0LnN0cm9rZSgpO1xyXG4gICAgICB0aGlzLmNvbnRleHQuZmlsbCgpO1xyXG4gICAgICB0aGlzLmNvbnRleHQucmVzdG9yZSgpO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHRoaXMuY29udGV4dC5iZWdpblBhdGgoKTtcclxuICAgICAgdGhpcy5jb250ZXh0Lm1vdmVUbyh4IC0gd2lkdGgvMiwgeSArIGhlaWdodC8yKTtcclxuICAgICAgdGhpcy5jb250ZXh0LmxpbmVUbyh4LCB5IC0gaGVpZ2h0LzIpO1xyXG4gICAgICB0aGlzLmNvbnRleHQubGluZVRvKHggKyB3aWR0aC8yLCB5ICsgaGVpZ2h0LzIpO1xyXG4gICAgICB0aGlzLmNvbnRleHQuY2xvc2VQYXRoKCk7XHJcbiAgICAgIHRoaXMuY29udGV4dC5zdHJva2UoKTtcclxuICAgICAgdGhpcy5jb250ZXh0LmZpbGwoKTtcclxuICAgIH1cclxuICB9LFxyXG4gIHRyaWFuZ2xlQUJDOiBmdW5jdGlvbih4MSwgeTEsIHgyLCB5MiwgeDMsIHkzKSB7XHJcbiAgICB0aGlzLmNvbnRleHQuYmVnaW5QYXRoKCk7XHJcbiAgICB0aGlzLmNvbnRleHQubW92ZVRvKHgxLCB5MSk7XHJcbiAgICB0aGlzLmNvbnRleHQubGluZVRvKHgyLCB5Mik7XHJcbiAgICB0aGlzLmNvbnRleHQubGluZVRvKHgzLCB5Myk7XHJcbiAgICB0aGlzLmNvbnRleHQuY2xvc2VQYXRoKCk7XHJcbiAgICB0aGlzLmNvbnRleHQuc3Ryb2tlKCk7XHJcbiAgICB0aGlzLmNvbnRleHQuZmlsbCgpO1xyXG4gIH0sXHJcbiAgaW1hZ2U6IGZ1bmN0aW9uKGltZywgeCwgeSwgYW5nbGUpIHtcclxuICAgIGlmKGFuZ2xlICE9PSB1bmRlZmluZWQgJiYgYW5nbGUgIT09IDApIHtcclxuICAgICAgdmFyIG9mZnNldFggPSBpbWcud2lkdGgvMixcclxuICAgICAgICAgIG9mZnNldFkgPSBpbWcuaGVpZ2h0LzI7XHJcbiAgICAgIHRoaXMuY29udGV4dC5zYXZlKCk7XHJcbiAgICAgIHRoaXMuY29udGV4dC50cmFuc2xhdGUoeCArIG9mZnNldFgsIHkgKyBvZmZzZXRZKTtcclxuICAgICAgdGhpcy5jb250ZXh0LnJvdGF0ZShhbmdsZSk7XHJcbiAgICAgIHRoaXMuY29udGV4dC5kcmF3SW1hZ2UoaW1nLCAtb2Zmc2V0WCwgLW9mZnNldFkpO1xyXG4gICAgICB0aGlzLmNvbnRleHQucmVzdG9yZSgpO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHRoaXMuY29udGV4dC5kcmF3SW1hZ2UoaW1nLCB4LCB5KTtcclxuICAgIH1cclxuICB9LFxyXG4gIGNyb3NzOiBmdW5jdGlvbihyYWRpdXMpIHtcclxuICAgIHRoaXMuY29udGV4dC5iZWdpblBhdGgoKTtcclxuICAgIHRoaXMuY29udGV4dC5tb3ZlVG8oLXJhZGl1cywgLXJhZGl1cyk7XHJcbiAgICB0aGlzLmNvbnRleHQubGluZVRvKHJhZGl1cywgcmFkaXVzKTtcclxuICAgIHRoaXMuY29udGV4dC5tb3ZlVG8oLXJhZGl1cywgcmFkaXVzKTtcclxuICAgIHRoaXMuY29udGV4dC5saW5lVG8ocmFkaXVzLCAtcmFkaXVzKTtcclxuICAgIHRoaXMuY29udGV4dC5zdHJva2UoKTtcclxuICB9LFxyXG4gIHRleHQ6IGZ1bmN0aW9uKHN0ciwgeCwgeSkge1xyXG4gICAgdGhpcy5jb250ZXh0LmZpbGxUZXh0KHN0ciwgeCwgeSk7XHJcbiAgfSxcclxuICB0ZXh0Rm9udDogZnVuY3Rpb24oZm9udCkge1xyXG4gICAgdGhpcy5fdGV4dEZvbnQgPSBmb250O1xyXG4gICAgdGhpcy5jb250ZXh0LmZvbnQgPSB0aGlzLl90ZXh0U2l6ZSArICdweCAnICsgZm9udDtcclxuICB9LFxyXG4gIHRleHRTaXplOiBmdW5jdGlvbihzaXplKSB7XHJcbiAgICB0aGlzLl90ZXh0U2l6ZSA9IHNpemU7XHJcbiAgICB0aGlzLmNvbnRleHQuZm9udCA9IHNpemUgKyAncHggJyArIHRoaXMuX3RleHRGb250O1xyXG4gIH0sXHJcbiAgb3BlbkltYWdlOiBmdW5jdGlvbigpIHtcclxuICAgIHZhciB3aW4gPSB3aW5kb3cub3BlbignJywgJ0NhbnZhcyBJbWFnZScpLFxyXG4gICAgICAgIHNyYyA9IHRoaXMuY2FudmFzLnRvRGF0YVVSTCgnaW1hZ2UvcG5nJyk7XHJcbiAgICB3aW4uZG9jdW1lbnQud3JpdGUoJzxpbWcgc3JjPVwiJyArIHNyYyArXHJcbiAgICAgICAgICAgICAgICAgICAgICAnXCIgd2lkdGg9XCInICsgdGhpcy53aWR0aCArXHJcbiAgICAgICAgICAgICAgICAgICAgICAnXCIgaGVpZ2h0PVwiJyArIHRoaXMuaGVpZ2h0ICsgJ1wiIC8+Jyk7XHJcbiAgfSxcclxuICBkb3dubG9hZEltYWdlOiBmdW5jdGlvbigpIHtcclxuICAgIHZhciBzcmMgPSB0aGlzLmNhbnZhcy50b0RhdGFVUkwoJ2ltYWdlL3BuZycpLnJlcGxhY2UoJ2ltYWdlL3BuZycsICdpbWFnZS9vY3RldC1zdHJlYW0nKTtcclxuICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gc3JjO1xyXG4gIH1cclxufTtcclxuXHJcbmlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBHcmFwaGljcztcclxufVxyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5mdW5jdGlvbiBWZWMyKHgsIHkpIHtcclxuICAgIHRoaXMueCA9IHggfHwgMDtcclxuICAgIHRoaXMueSA9IHkgfHwgMDtcclxufVxyXG5cclxuVmVjMi5wcm90b3R5cGUgPSB7XHJcbiAgICBhZGQ6IGZ1bmN0aW9uKHZlYywgb3ZlcndyaXRlKSB7XHJcbiAgICAgICAgaWYob3ZlcndyaXRlKSB7XHJcbiAgICAgICAgICAgIHRoaXMueCA9IHRoaXMueCArIHZlYy54O1xyXG4gICAgICAgICAgICB0aGlzLnkgPSB0aGlzLnkgKyB2ZWMueTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBWZWMyLmdldCh0aGlzLnggKyB2ZWMueCwgdGhpcy55ICsgdmVjLnkpO1xyXG4gICAgfSxcclxuICAgIHN1YnRyYWN0OiBmdW5jdGlvbih2ZWMsIG92ZXJ3cml0ZSkge1xyXG4gICAgICAgIGlmKG92ZXJ3cml0ZSkge1xyXG4gICAgICAgICAgICB0aGlzLnggPSB0aGlzLnggLSB2ZWMueDtcclxuICAgICAgICAgICAgdGhpcy55ID0gdGhpcy55IC0gdmVjLnk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gVmVjMi5nZXQodGhpcy54IC0gdmVjLngsIHRoaXMueSAtIHZlYy55KTtcclxuICAgIH0sXHJcbiAgICBtdWx0aXBseTogZnVuY3Rpb24odmVjLCBvdmVyd3JpdGUpIHtcclxuICAgICAgICBpZihvdmVyd3JpdGUpIHtcclxuICAgICAgICAgICAgdGhpcy54ID0gdGhpcy54ICogdmVjLng7XHJcbiAgICAgICAgICAgIHRoaXMueSA9IHRoaXMueSAqIHZlYy55O1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFZlYzIuZ2V0KHRoaXMueCAqIHZlYy54LCB0aGlzLnkgKiB2ZWMueSk7XHJcbiAgICB9LFxyXG4gICAgZGl2aWRlOiBmdW5jdGlvbih2ZWMsIG92ZXJ3cml0ZSkge1xyXG4gICAgICAgIGlmKG92ZXJ3cml0ZSkge1xyXG4gICAgICAgICAgICB0aGlzLnggPSB0aGlzLnggLyB2ZWMueDtcclxuICAgICAgICAgICAgdGhpcy55ID0gdGhpcy55IC8gdmVjLnk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gVmVjMi5nZXQodGhpcy54IC8gdmVjLngsIHRoaXMueSAvIHZlYy55KTtcclxuICAgIH0sXHJcbiAgICBub3JtYWxpemU6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBsID0gdGhpcy5sZW5ndGg7XHJcbiAgICAgICAgaWYobCA9PT0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLnggPSAxO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy54IC89IGw7XHJcbiAgICAgICAgdGhpcy55IC89IGw7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgaXNOb3JtYWxpemVkOiBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5sZW5ndGggPT09IDE7XHJcbiAgICB9LFxyXG4gICAgdHJ1bmNhdGU6ICBmdW5jdGlvbihtYXgpIHtcclxuICAgICAgICBpZih0aGlzLmxlbmd0aCA+IG1heCkge1xyXG4gICAgICAgICAgICB0aGlzLmxlbmd0aCA9IG1heDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgc2NhbGVCeTogZnVuY3Rpb24obXVsKSB7XHJcbiAgICAgICAgdGhpcy54ICo9IG11bDtcclxuICAgICAgICB0aGlzLnkgKj0gbXVsO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGRpdmlkZUJ5OiBmdW5jdGlvbihkaXYpIHtcclxuICAgICAgICB0aGlzLnggLz0gZGl2O1xyXG4gICAgICAgIHRoaXMueSAvPSBkaXY7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgZXF1YWxzOiBmdW5jdGlvbih2ZWMpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy54ID09PSB2ZWMueCAmJlxyXG4gICAgICAgICAgICB0aGlzLnkgPT09IHZlYy55O1xyXG4gICAgfSxcclxuICAgIG5lZ2F0ZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy54ID0gLXRoaXMueDtcclxuICAgICAgICB0aGlzLnkgPSAtdGhpcy55O1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIHJldmVyc2U6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMubmVnYXRlKCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgZG90UHJvZHVjdDogZnVuY3Rpb24odmVjKSB7XHJcbiAgICAgICAgLypcclxuICAgICAgICBJZiBBIGFuZCBCIGFyZSBwZXJwZW5kaWN1bGFyIChhdCA5MCBkZWdyZWVzIHRvIGVhY2ggb3RoZXIpLCB0aGUgcmVzdWx0IG9mIHRoZSBkb3QgcHJvZHVjdCB3aWxsIGJlIHplcm8sIGJlY2F1c2UgY29zKM6YKSB3aWxsIGJlIHplcm8uXHJcbiAgICAgICAgSWYgdGhlIGFuZ2xlIGJldHdlZW4gQSBhbmQgQiBhcmUgbGVzcyB0aGFuIDkwIGRlZ3JlZXMsIHRoZSBkb3QgcHJvZHVjdCB3aWxsIGJlIHBvc2l0aXZlIChncmVhdGVyIHRoYW4gemVybyksIGFzIGNvcyjOmCkgd2lsbCBiZSBwb3NpdGl2ZSwgYW5kIHRoZSB2ZWN0b3IgbGVuZ3RocyBhcmUgYWx3YXlzIHBvc2l0aXZlIHZhbHVlcy5cclxuICAgICAgICBJZiB0aGUgYW5nbGUgYmV0d2VlbiBBIGFuZCBCIGFyZSBncmVhdGVyIHRoYW4gOTAgZGVncmVlcywgdGhlIGRvdCBwcm9kdWN0IHdpbGwgYmUgbmVnYXRpdmUgKGxlc3MgdGhhbiB6ZXJvKSwgYXMgY29zKM6YKSB3aWxsIGJlIG5lZ2F0aXZlLCBhbmQgdGhlIHZlY3RvciBsZW5ndGhzIGFyZSBhbHdheXMgcG9zaXRpdmUgdmFsdWVzXHJcbiAgICAgICAgKi9cclxuICAgICAgICByZXR1cm4gdGhpcy54ICogdmVjLnggKyB0aGlzLnkgKiB2ZWMueTtcclxuICAgIH0sXHJcbiAgICBjcm9zc1Byb2R1Y3Q6IGZ1bmN0aW9uKHZlYykge1xyXG4gICAgICAgIC8qXHJcbiAgICAgICAgVGhlIHNpZ24gdGVsbHMgdXMgaWYgdmVjIHRvIHRoZSBsZWZ0ICgtKSBvciB0aGUgcmlnaHQgKCspIG9mIHRoaXMgdmVjXHJcbiAgICAgICAgKi9cclxuICAgICAgICByZXR1cm4gdGhpcy54ICogdmVjLnkgLSB0aGlzLnkgKiB2ZWMueDtcclxuICAgIH0sXHJcbiAgICBkaXN0YW5jZVNxdWFyZWQ6IGZ1bmN0aW9uKHZlYykge1xyXG4gICAgICAgIHZhciBkeCA9IHZlYy54IC0gdGhpcy54O1xyXG4gICAgICAgIHZhciBkeSA9IHZlYy55IC0gdGhpcy55O1xyXG4gICAgICAgIHJldHVybiBkeCAqIGR4ICsgZHkgKiBkeTtcclxuICAgIH0sXHJcbiAgICBkaXN0YW5jZTogZnVuY3Rpb24odmVjKSB7XHJcbiAgICAgICAgcmV0dXJuIE1hdGguc3FydCh0aGlzLmRpc3RhbmNlU3F1YXJlZCh2ZWMpKTtcclxuICAgIH0sXHJcbiAgICBjbG9uZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIFZlYzIuZ2V0KHRoaXMueCwgdGhpcy55KTtcclxuICAgIH0sXHJcbiAgICB6ZXJvOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLnggPSAwO1xyXG4gICAgICAgIHRoaXMueSA9IDA7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgaXNaZXJvOiBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy54ID09PSAwICYmIHRoaXMueSA9PT0gMDtcclxuICAgIH0sXHJcbiAgICByZXNldDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuemVybygpO1xyXG4gICAgfSxcclxuICAgIHBlcnBlbmRpY3VsYXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiBWZWMyLmdldCgtdGhpcy55LCB0aGlzLngpO1xyXG4gICAgfSxcclxuICAgIHNpZ246IGZ1bmN0aW9uKHZlYykge1xyXG4gICAgICAgIC8vIERldGVybWluZXMgaWYgYSBnaXZlbiB2ZWN0b3IgaXMgdG8gdGhlIHJpZ2h0IG9yIGxlZnQgb2YgdGhpcyB2ZWN0b3IuXHJcbiAgICAgICAgLy8gSWYgdG8gdGhlIGxlZnQsIHJldHVybnMgLTEuIElmIHRvIHRoZSByaWdodCwgKzEuXHJcbiAgICAgICAgdmFyIHAgPSB0aGlzLnBlcnBlbmRpY3VsYXIoKTtcclxuICAgICAgICB2YXIgcyA9IHAuZG90UHJvZHVjdCh2ZWMpIDwgMCA/IC0xIDogMTtcclxuICAgICAgICBwLmRpc3Bvc2UoKTtcclxuICAgICAgICByZXR1cm4gcztcclxuICAgIH0sXHJcbiAgICBzZXQ6IGZ1bmN0aW9uKHgsIHkpIHtcclxuICAgICAgICB0aGlzLnggPSB4IHx8IDA7XHJcbiAgICAgICAgdGhpcy55ID0geSB8fCAwO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGRpc3Bvc2U6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIFZlYzIucG9vbC5wdXNoKHRoaXMuemVybygpKTtcclxuICAgIH1cclxufTtcclxuXHJcbi8vIHN0YXRpY1xyXG5WZWMyLnBvb2wgPSBbXTtcclxuVmVjMi5nZXQgPSBmdW5jdGlvbih4LCB5KSB7XHJcbiAgICB2YXIgdiA9IFZlYzIucG9vbC5sZW5ndGggPiAwID8gVmVjMi5wb29sLnBvcCgpIDogbmV3IFZlYzIoKTtcclxuICAgIHYuc2V0KHgsIHkpO1xyXG4gICAgcmV0dXJuIHY7XHJcbn07XHJcblxyXG5WZWMyLmFuZ2xlQmV0d2VlbiA9IGZ1bmN0aW9uKGEsIGIpIHtcclxuICAgIGlmKCFhLmlzTm9ybWFsaXplZCgpKSB7IGEgPSBhLmNsb25lKCkubm9ybWFsaXplKCk7IH1cclxuICAgIGlmKCFiLmlzTm9ybWFsaXplZCgpKSB7IGIgPSBiLmNsb25lKCkubm9ybWFsaXplKCk7IH1cclxuICAgIHJldHVybiBNYXRoLmFjb3MoYS5kb3RQcm9kdWN0KGIpKTtcclxufTtcclxuXHJcbi8vIGdldHRlcnMgLyBzZXR0ZXJzXHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShWZWMyLnByb3RvdHlwZSwgJ2xlbmd0aFNxdWFyZWQnLCB7XHJcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnggKiB0aGlzLnggKyB0aGlzLnkgKiB0aGlzLnk7XHJcbiAgICB9XHJcbn0pO1xyXG5cclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFZlYzIucHJvdG90eXBlLCAnbGVuZ3RoJywge1xyXG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMubGVuZ3RoU3F1YXJlZCk7XHJcbiAgICB9LFxyXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xyXG4gICAgICAgIHZhciBhID0gdGhpcy5hbmdsZTtcclxuICAgICAgICB0aGlzLnggPSBNYXRoLmNvcyhhKSAqIHZhbHVlO1xyXG4gICAgICAgIHRoaXMueSA9IE1hdGguc2luKGEpICogdmFsdWU7XHJcbiAgICB9XHJcbn0pO1xyXG5cclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFZlYzIucHJvdG90eXBlLCAnYW5nbGUnLCB7XHJcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiBNYXRoLmF0YW4yKHRoaXMueSwgdGhpcy54KTtcclxuICAgIH0sXHJcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XHJcbiAgICAgICAgdmFyIGwgPSB0aGlzLmxlbmd0aDtcclxuICAgICAgICB0aGlzLnggPSBNYXRoLmNvcyh2YWx1ZSkgKiBsO1xyXG4gICAgICAgIHRoaXMueSA9IE1hdGguc2luKHZhbHVlKSAqIGw7XHJcbiAgICB9XHJcbn0pO1xyXG5cclxuaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFZlYzI7XHJcbn1cclxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBGUFMoKSB7XG5cbiAgICB2YXIgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZnBzJyksXG4gICAgICAgIG1zID0gMCxcbiAgICAgICAgZnBzID0gMCxcbiAgICAgICAgY3VycmVudEZwcyA9IDAsXG4gICAgICAgIGF2ZXJhZ2VGcHMgPSAwLFxuICAgICAgICB0aWNrcyA9IDAsXG4gICAgICAgIHRvdGFsRnBzID0gMDtcblxuICAgIGlmKCFlbCkge1xuICAgICAgICBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICBlbC5zZXRBdHRyaWJ1dGUoJ2lkJywgJ2ZwcycpO1xuICAgICAgICBlbC5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG4gICAgICAgIGVsLnN0eWxlLnRvcCA9ICcwcHgnO1xuICAgICAgICBlbC5zdHlsZS5yaWdodCA9ICcwcHgnO1xuICAgICAgICBlbC5zdHlsZS5wYWRkaW5nID0gJzJweCA2cHgnO1xuICAgICAgICBlbC5zdHlsZS56SW5kZXggPSAnOTk5OSc7XG4gICAgICAgIGVsLnN0eWxlLmJhY2tncm91bmQgPSAnIzAwMCc7XG4gICAgICAgIGVsLnN0eWxlLmNvbG9yID0gJyNmZmYnO1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGVsKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXBvcnQoKSB7XG4gICAgICAgIGVsLmlubmVySFRNTCA9ICdGUFM6ICcgKyBjdXJyZW50RnBzICsgJzxiciAvPkFWRTogJyArIGF2ZXJhZ2VGcHM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlKHRpbWUpIHtcbiAgICAgICAgaWYodGltZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aW1lID0gRGF0ZS5ub3coKTtcbiAgICAgICAgfVxuICAgICAgICBpZihtcyA9PT0gMCkge1xuICAgICAgICAgICAgbXMgPSB0aW1lO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aW1lIC0gMTAwMCA+IG1zKSB7XG4gICAgICAgICAgICBtcyA9IHRpbWU7XG4gICAgICAgICAgICBjdXJyZW50RnBzID0gZnBzO1xuICAgICAgICAgICAgZnBzID0gMDtcblxuICAgICAgICAgICAgaWYgKGN1cnJlbnRGcHMgPiAxKSB7XG4gICAgICAgICAgICAgICAgdGlja3MgKys7XG4gICAgICAgICAgICAgICAgdG90YWxGcHMgKz0gY3VycmVudEZwcztcbiAgICAgICAgICAgICAgICBhdmVyYWdlRnBzID0gTWF0aC5mbG9vcih0b3RhbEZwcyAvIHRpY2tzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlcG9ydCgpO1xuICAgICAgICB9XG4gICAgICAgIGZwcysrO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgICd1cGRhdGUnOiB1cGRhdGVcbiAgICB9O1xufVxuXG5pZih0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gRlBTO1xufVxuIiwidmFyIEtleWJvYXJkID0ge1xuXHRBOiAnQScuY2hhckNvZGVBdCgwKSxcblx0QjogJ0InLmNoYXJDb2RlQXQoMCksXG5cdEM6ICdDJy5jaGFyQ29kZUF0KDApLFxuXHREOiAnRCcuY2hhckNvZGVBdCgwKSxcblx0RTogJ0UnLmNoYXJDb2RlQXQoMCksXG5cdEY6ICdGJy5jaGFyQ29kZUF0KDApLFxuXHRHOiAnRycuY2hhckNvZGVBdCgwKSxcblx0SDogJ0gnLmNoYXJDb2RlQXQoMCksXG5cdEk6ICdJJy5jaGFyQ29kZUF0KDApLFxuXHRKOiAnSicuY2hhckNvZGVBdCgwKSxcblx0SzogJ0snLmNoYXJDb2RlQXQoMCksXG5cdEw6ICdMJy5jaGFyQ29kZUF0KDApLFxuXHRNOiAnTScuY2hhckNvZGVBdCgwKSxcblx0TjogJ04nLmNoYXJDb2RlQXQoMCksXG5cdE86ICdPJy5jaGFyQ29kZUF0KDApLFxuXHRQOiAnUCcuY2hhckNvZGVBdCgwKSxcblx0UTogJ1EnLmNoYXJDb2RlQXQoMCksXG5cdFI6ICdSJy5jaGFyQ29kZUF0KDApLFxuXHRTOiAnUycuY2hhckNvZGVBdCgwKSxcblx0VDogJ1QnLmNoYXJDb2RlQXQoMCksXG5cdFU6ICdVJy5jaGFyQ29kZUF0KDApLFxuXHRWOiAnVicuY2hhckNvZGVBdCgwKSxcblx0VzogJ1cnLmNoYXJDb2RlQXQoMCksXG5cdFg6ICdYJy5jaGFyQ29kZUF0KDApLFxuXHRZOiAnWScuY2hhckNvZGVBdCgwKSxcblx0WjogJ1onLmNoYXJDb2RlQXQoMCksXG5cdFpFUk86ICcwJy5jaGFyQ29kZUF0KDApLFxuXHRPTkU6ICcxJy5jaGFyQ29kZUF0KDApLFxuXHRUV086ICcyJy5jaGFyQ29kZUF0KDApLFxuXHRUSFJFRTogJzMnLmNoYXJDb2RlQXQoMCksXG5cdEZPVVI6ICc0Jy5jaGFyQ29kZUF0KDApLFxuXHRGSVZFOiAnNScuY2hhckNvZGVBdCgwKSxcblx0U0lYOiAnNicuY2hhckNvZGVBdCgwKSxcblx0U0VWRU46ICc3Jy5jaGFyQ29kZUF0KDApLFxuXHRFSUdIVDogJzgnLmNoYXJDb2RlQXQoMCksXG5cdE5JTkU6ICc5Jy5jaGFyQ29kZUF0KDApLFxuXHROVU1QQURfMDogOTYsXG5cdE5VTVBBRF8xOiA5Nyxcblx0TlVNUEFEXzI6IDk4LFxuXHROVU1QQURfMzogOTksXG5cdE5VTVBBRF80OiAxMDAsXG5cdE5VTVBBRF81OiAxMDEsXG5cdE5VTVBBRF82OiAxMDIsXG5cdE5VTVBBRF83OiAxMDMsXG5cdE5VTVBBRF84OiAxMDQsXG5cdE5VTVBBRF85OiAxMDUsXG5cdE5VTVBBRF9NVUxUSVBMWTogMTA2LFxuXHROVU1QQURfQUREOiAxMDcsXG5cdE5VTVBBRF9FTlRFUjogMTA4LFxuXHROVU1QQURfU1VCVFJBQ1Q6IDEwOSxcblx0TlVNUEFEX0RFQ0lNQUw6IDExMCxcblx0TlVNUEFEX0RJVklERTogMTExLFxuXHRGMTogMTEyLFxuXHRGMjogMTEzLFxuXHRGMzogMTE0LFxuXHRGNDogMTE1LFxuXHRGNTogMTE2LFxuXHRGNjogMTE3LFxuXHRGNzogMTE4LFxuXHRGODogMTE5LFxuXHRGOTogMTIwLFxuXHRGMTA6IDEyMSxcblx0RjExOiAxMjIsXG5cdEYxMjogMTIzLFxuXHRGMTM6IDEyNCxcblx0RjE0OiAxMjUsXG5cdEYxNTogMTI2LFxuXHRDT0xPTjogMTg2LFxuXHRFUVVBTFM6IDE4Nyxcblx0VU5ERVJTQ09SRTogMTg5LFxuXHRRVUVTVElPTl9NQVJLOiAxOTEsXG5cdFRJTERFOiAxOTIsXG5cdE9QRU5fQlJBQ0tFVDogMjE5LFxuXHRCQUNLV0FSRF9TTEFTSDogMjIwLFxuXHRDTE9TRURfQlJBQ0tFVDogMjIxLFxuXHRRVU9URVM6IDIyMixcblx0QkFDS1NQQUNFOiA4LFxuXHRUQUI6IDksXG5cdENMRUFSOiAxMixcblx0RU5URVI6IDEzLFxuXHRTSElGVDogMTYsXG5cdENPTlRST0w6IDE3LFxuXHRBTFQ6IDE4LFxuXHRDQVBTX0xPQ0s6IDIwLFxuXHRFU0M6IDI3LFxuXHRTUEFDRUJBUjogMzIsXG5cdFBBR0VfVVA6IDMzLFxuXHRQQUdFX0RPV046IDM0LFxuXHRFTkQ6IDM1LFxuXHRIT01FOiAzNixcblx0TEVGVDogMzcsXG5cdFVQOiAzOCxcblx0UklHSFQ6IDM5LFxuXHRET1dOOiA0MCxcblx0SU5TRVJUOiA0NSxcblx0REVMRVRFOiA0Nixcblx0SEVMUDogNDcsXG5cdE5VTV9MT0NLOiAxNDRcbn07XG5cbmlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gS2V5Ym9hcmQ7XG59XG4iLCI7KGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcblxuICAvLyBTdXBwb3J0IEFNRFxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgZGVmaW5lKFtdLCBmYWN0b3J5KTtcblxuICAvLyBTdXBwb3J0IENvbW1vbkpTXG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgdmFyIHJhbmRvbUNvbG9yID0gZmFjdG9yeSgpO1xuICAgIFxuICAgIC8vIFN1cHBvcnQgTm9kZUpTICYgQ29tcG9uZW50LCB3aGljaCBhbGxvdyBtb2R1bGUuZXhwb3J0cyB0byBiZSBhIGZ1bmN0aW9uXG4gICAgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZSAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gcmFuZG9tQ29sb3I7XG4gICAgfVxuICAgIFxuICAgIC8vIFN1cHBvcnQgQ29tbW9uSlMgMS4xLjEgc3BlY1xuICAgIGV4cG9ydHMucmFuZG9tQ29sb3IgPSByYW5kb21Db2xvcjtcbiAgXG4gIC8vIFN1cHBvcnQgdmFuaWxsYSBzY3JpcHQgbG9hZGluZ1xuICB9IGVsc2Uge1xuICAgIHJvb3QucmFuZG9tQ29sb3IgPSBmYWN0b3J5KCk7XG4gIH07XG5cbn0odGhpcywgZnVuY3Rpb24oKSB7XG5cbiAgLy8gU2hhcmVkIGNvbG9yIGRpY3Rpb25hcnlcbiAgdmFyIGNvbG9yRGljdGlvbmFyeSA9IHt9O1xuXG4gIC8vIFBvcHVsYXRlIHRoZSBjb2xvciBkaWN0aW9uYXJ5XG4gIGxvYWRDb2xvckJvdW5kcygpO1xuXG4gIHZhciByYW5kb21Db2xvciA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIHZhciBILFMsQjtcblxuICAgIC8vIENoZWNrIGlmIHdlIG5lZWQgdG8gZ2VuZXJhdGUgbXVsdGlwbGUgY29sb3JzXG4gICAgaWYgKG9wdGlvbnMuY291bnQpIHtcblxuICAgICAgdmFyIHRvdGFsQ29sb3JzID0gb3B0aW9ucy5jb3VudCxcbiAgICAgICAgICBjb2xvcnMgPSBbXTtcblxuICAgICAgb3B0aW9ucy5jb3VudCA9IGZhbHNlO1xuXG4gICAgICB3aGlsZSAodG90YWxDb2xvcnMgPiBjb2xvcnMubGVuZ3RoKSB7XG4gICAgICAgIGNvbG9ycy5wdXNoKHJhbmRvbUNvbG9yKG9wdGlvbnMpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGNvbG9ycztcbiAgICB9XG5cbiAgICAvLyBGaXJzdCB3ZSBwaWNrIGEgaHVlIChIKVxuICAgIEggPSBwaWNrSHVlKG9wdGlvbnMpO1xuXG4gICAgLy8gVGhlbiB1c2UgSCB0byBkZXRlcm1pbmUgc2F0dXJhdGlvbiAoUylcbiAgICBTID0gcGlja1NhdHVyYXRpb24oSCwgb3B0aW9ucyk7XG5cbiAgICAvLyBUaGVuIHVzZSBTIGFuZCBIIHRvIGRldGVybWluZSBicmlnaHRuZXNzIChCKS5cbiAgICBCID0gcGlja0JyaWdodG5lc3MoSCwgUywgb3B0aW9ucyk7XG5cbiAgICAvLyBUaGVuIHdlIHJldHVybiB0aGUgSFNCIGNvbG9yIGluIHRoZSBkZXNpcmVkIGZvcm1hdFxuICAgIHJldHVybiBzZXRGb3JtYXQoW0gsUyxCXSwgb3B0aW9ucyk7XG4gIH07XG5cbiAgZnVuY3Rpb24gcGlja0h1ZSAob3B0aW9ucykge1xuXG4gICAgdmFyIGh1ZVJhbmdlID0gZ2V0SHVlUmFuZ2Uob3B0aW9ucy5odWUpLFxuICAgICAgICBodWUgPSByYW5kb21XaXRoaW4oaHVlUmFuZ2UpO1xuXG4gICAgLy8gSW5zdGVhZCBvZiBzdG9yaW5nIHJlZCBhcyB0d28gc2VwZXJhdGUgcmFuZ2VzLFxuICAgIC8vIHdlIGdyb3VwIHRoZW0sIHVzaW5nIG5lZ2F0aXZlIG51bWJlcnNcbiAgICBpZiAoaHVlIDwgMCkge2h1ZSA9IDM2MCArIGh1ZX1cblxuICAgIHJldHVybiBodWU7XG5cbiAgfVxuXG4gIGZ1bmN0aW9uIHBpY2tTYXR1cmF0aW9uIChodWUsIG9wdGlvbnMpIHtcblxuICAgIGlmIChvcHRpb25zLmx1bWlub3NpdHkgPT09ICdyYW5kb20nKSB7XG4gICAgICByZXR1cm4gcmFuZG9tV2l0aGluKFswLDEwMF0pO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmh1ZSA9PT0gJ21vbm9jaHJvbWUnKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICB2YXIgc2F0dXJhdGlvblJhbmdlID0gZ2V0U2F0dXJhdGlvblJhbmdlKGh1ZSk7XG5cbiAgICB2YXIgc01pbiA9IHNhdHVyYXRpb25SYW5nZVswXSxcbiAgICAgICAgc01heCA9IHNhdHVyYXRpb25SYW5nZVsxXTtcblxuICAgIHN3aXRjaCAob3B0aW9ucy5sdW1pbm9zaXR5KSB7XG5cbiAgICAgIGNhc2UgJ2JyaWdodCc6XG4gICAgICAgIHNNaW4gPSA1NTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ2RhcmsnOlxuICAgICAgICBzTWluID0gc01heCAtIDEwO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnbGlnaHQnOlxuICAgICAgICBzTWF4ID0gNTU7XG4gICAgICAgIGJyZWFrO1xuICAgfVxuXG4gICAgcmV0dXJuIHJhbmRvbVdpdGhpbihbc01pbiwgc01heF0pO1xuXG4gIH1cblxuICBmdW5jdGlvbiBwaWNrQnJpZ2h0bmVzcyAoSCwgUywgb3B0aW9ucykge1xuXG4gICAgdmFyIGJyaWdodG5lc3MsXG4gICAgICAgIGJNaW4gPSBnZXRNaW5pbXVtQnJpZ2h0bmVzcyhILCBTKSxcbiAgICAgICAgYk1heCA9IDEwMDtcblxuICAgIHN3aXRjaCAob3B0aW9ucy5sdW1pbm9zaXR5KSB7XG5cbiAgICAgIGNhc2UgJ2RhcmsnOlxuICAgICAgICBiTWF4ID0gYk1pbiArIDIwO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnbGlnaHQnOlxuICAgICAgICBiTWluID0gKGJNYXggKyBiTWluKS8yO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAncmFuZG9tJzpcbiAgICAgICAgYk1pbiA9IDA7XG4gICAgICAgIGJNYXggPSAxMDA7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHJldHVybiByYW5kb21XaXRoaW4oW2JNaW4sIGJNYXhdKTtcblxuICB9XG5cbiAgZnVuY3Rpb24gc2V0Rm9ybWF0IChoc3YsIG9wdGlvbnMpIHtcblxuICAgIHN3aXRjaCAob3B0aW9ucy5mb3JtYXQpIHtcblxuICAgICAgY2FzZSAnaHN2QXJyYXknOlxuICAgICAgICByZXR1cm4gaHN2O1xuXG4gICAgICBjYXNlICdoc3YnOlxuICAgICAgICByZXR1cm4gY29sb3JTdHJpbmcoJ2hzdicsIGhzdik7XG5cbiAgICAgIGNhc2UgJ3JnYkFycmF5JzpcbiAgICAgICAgcmV0dXJuIEhTVnRvUkdCKGhzdik7XG5cbiAgICAgIGNhc2UgJ3JnYic6XG4gICAgICAgIHJldHVybiBjb2xvclN0cmluZygncmdiJywgSFNWdG9SR0IoaHN2KSk7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBIU1Z0b0hleChoc3YpO1xuICAgIH1cblxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0TWluaW11bUJyaWdodG5lc3MoSCwgUykge1xuXG4gICAgdmFyIGxvd2VyQm91bmRzID0gZ2V0Q29sb3JJbmZvKEgpLmxvd2VyQm91bmRzO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsb3dlckJvdW5kcy5sZW5ndGggLSAxOyBpKyspIHtcblxuICAgICAgdmFyIHMxID0gbG93ZXJCb3VuZHNbaV1bMF0sXG4gICAgICAgICAgdjEgPSBsb3dlckJvdW5kc1tpXVsxXTtcblxuICAgICAgdmFyIHMyID0gbG93ZXJCb3VuZHNbaSsxXVswXSxcbiAgICAgICAgICB2MiA9IGxvd2VyQm91bmRzW2krMV1bMV07XG5cbiAgICAgIGlmIChTID49IHMxICYmIFMgPD0gczIpIHtcblxuICAgICAgICAgdmFyIG0gPSAodjIgLSB2MSkvKHMyIC0gczEpLFxuICAgICAgICAgICAgIGIgPSB2MSAtIG0qczE7XG5cbiAgICAgICAgIHJldHVybiBtKlMgKyBiO1xuICAgICAgfVxuXG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRIdWVSYW5nZSAoY29sb3JJbnB1dCkge1xuXG4gICAgaWYgKHR5cGVvZiBwYXJzZUludChjb2xvcklucHV0KSA9PT0gJ251bWJlcicpIHtcblxuICAgICAgdmFyIG51bWJlciA9IHBhcnNlSW50KGNvbG9ySW5wdXQpO1xuXG4gICAgICBpZiAobnVtYmVyIDwgMzYwICYmIG51bWJlciA+IDApIHtcbiAgICAgICAgcmV0dXJuIFtudW1iZXIsIG51bWJlcl07XG4gICAgICB9XG5cbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGNvbG9ySW5wdXQgPT09ICdzdHJpbmcnKSB7XG5cbiAgICAgIGlmIChjb2xvckRpY3Rpb25hcnlbY29sb3JJbnB1dF0pIHtcbiAgICAgICAgdmFyIGNvbG9yID0gY29sb3JEaWN0aW9uYXJ5W2NvbG9ySW5wdXRdO1xuICAgICAgICBpZiAoY29sb3IuaHVlUmFuZ2UpIHtyZXR1cm4gY29sb3IuaHVlUmFuZ2V9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIFswLDM2MF07XG5cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFNhdHVyYXRpb25SYW5nZSAoaHVlKSB7XG4gICAgcmV0dXJuIGdldENvbG9ySW5mbyhodWUpLnNhdHVyYXRpb25SYW5nZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldENvbG9ySW5mbyAoaHVlKSB7XG5cbiAgICAvLyBNYXBzIHJlZCBjb2xvcnMgdG8gbWFrZSBwaWNraW5nIGh1ZSBlYXNpZXJcbiAgICBpZiAoaHVlID49IDMzNCAmJiBodWUgPD0gMzYwKSB7XG4gICAgICBodWUtPSAzNjA7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgY29sb3JOYW1lIGluIGNvbG9yRGljdGlvbmFyeSkge1xuICAgICAgIHZhciBjb2xvciA9IGNvbG9yRGljdGlvbmFyeVtjb2xvck5hbWVdO1xuICAgICAgIGlmIChjb2xvci5odWVSYW5nZSAmJlxuICAgICAgICAgICBodWUgPj0gY29sb3IuaHVlUmFuZ2VbMF0gJiZcbiAgICAgICAgICAgaHVlIDw9IGNvbG9yLmh1ZVJhbmdlWzFdKSB7XG4gICAgICAgICAgcmV0dXJuIGNvbG9yRGljdGlvbmFyeVtjb2xvck5hbWVdO1xuICAgICAgIH1cbiAgICB9IHJldHVybiAnQ29sb3Igbm90IGZvdW5kJztcbiAgfVxuXG4gIGZ1bmN0aW9uIHJhbmRvbVdpdGhpbiAocmFuZ2UpIHtcbiAgICByZXR1cm4gTWF0aC5mbG9vcihyYW5nZVswXSArIE1hdGgucmFuZG9tKCkqKHJhbmdlWzFdICsgMSAtIHJhbmdlWzBdKSk7XG4gIH1cblxuICBmdW5jdGlvbiBzaGlmdEh1ZSAoaCwgZGVncmVlcykge1xuICAgIHJldHVybiAoaCArIGRlZ3JlZXMpJTM2MDtcbiAgfVxuXG4gIGZ1bmN0aW9uIEhTVnRvSGV4IChoc3Ype1xuXG4gICAgdmFyIHJnYiA9IEhTVnRvUkdCKGhzdik7XG5cbiAgICBmdW5jdGlvbiBjb21wb25lbnRUb0hleChjKSB7XG4gICAgICAgIHZhciBoZXggPSBjLnRvU3RyaW5nKDE2KTtcbiAgICAgICAgcmV0dXJuIGhleC5sZW5ndGggPT0gMSA/IFwiMFwiICsgaGV4IDogaGV4O1xuICAgIH1cblxuICAgIHZhciBoZXggPSBcIiNcIiArIGNvbXBvbmVudFRvSGV4KHJnYlswXSkgKyBjb21wb25lbnRUb0hleChyZ2JbMV0pICsgY29tcG9uZW50VG9IZXgocmdiWzJdKTtcblxuICAgIHJldHVybiBoZXg7XG5cbiAgfVxuXG4gIGZ1bmN0aW9uIGRlZmluZUNvbG9yIChuYW1lLCBodWVSYW5nZSwgbG93ZXJCb3VuZHMpIHtcblxuICAgIHZhciBzTWluID0gbG93ZXJCb3VuZHNbMF1bMF0sXG4gICAgICAgIHNNYXggPSBsb3dlckJvdW5kc1tsb3dlckJvdW5kcy5sZW5ndGggLSAxXVswXSxcblxuICAgICAgICBiTWluID0gbG93ZXJCb3VuZHNbbG93ZXJCb3VuZHMubGVuZ3RoIC0gMV1bMV0sXG4gICAgICAgIGJNYXggPSBsb3dlckJvdW5kc1swXVsxXTtcblxuICAgIGNvbG9yRGljdGlvbmFyeVtuYW1lXSA9IHtcbiAgICAgIGh1ZVJhbmdlOiBodWVSYW5nZSxcbiAgICAgIGxvd2VyQm91bmRzOiBsb3dlckJvdW5kcyxcbiAgICAgIHNhdHVyYXRpb25SYW5nZTogW3NNaW4sIHNNYXhdLFxuICAgICAgYnJpZ2h0bmVzc1JhbmdlOiBbYk1pbiwgYk1heF1cbiAgICB9O1xuXG4gIH1cblxuICBmdW5jdGlvbiBsb2FkQ29sb3JCb3VuZHMgKCkge1xuXG4gICAgZGVmaW5lQ29sb3IoXG4gICAgICAnbW9ub2Nocm9tZScsXG4gICAgICBudWxsLFxuICAgICAgW1swLDBdLFsxMDAsMF1dXG4gICAgKTtcblxuICAgIGRlZmluZUNvbG9yKFxuICAgICAgJ3JlZCcsXG4gICAgICBbLTI2LDE4XSxcbiAgICAgIFtbMjAsMTAwXSxbMzAsOTJdLFs0MCw4OV0sWzUwLDg1XSxbNjAsNzhdLFs3MCw3MF0sWzgwLDYwXSxbOTAsNTVdLFsxMDAsNTBdXVxuICAgICk7XG5cbiAgICBkZWZpbmVDb2xvcihcbiAgICAgICdvcmFuZ2UnLFxuICAgICAgWzE5LDQ2XSxcbiAgICAgIFtbMjAsMTAwXSxbMzAsOTNdLFs0MCw4OF0sWzUwLDg2XSxbNjAsODVdLFs3MCw3MF0sWzEwMCw3MF1dXG4gICAgKTtcblxuICAgIGRlZmluZUNvbG9yKFxuICAgICAgJ3llbGxvdycsXG4gICAgICBbNDcsNjJdLFxuICAgICAgW1syNSwxMDBdLFs0MCw5NF0sWzUwLDg5XSxbNjAsODZdLFs3MCw4NF0sWzgwLDgyXSxbOTAsODBdLFsxMDAsNzVdXVxuICAgICk7XG5cbiAgICBkZWZpbmVDb2xvcihcbiAgICAgICdncmVlbicsXG4gICAgICBbNjMsMTU4XSxcbiAgICAgIFtbMzAsMTAwXSxbNDAsOTBdLFs1MCw4NV0sWzYwLDgxXSxbNzAsNzRdLFs4MCw2NF0sWzkwLDUwXSxbMTAwLDQwXV1cbiAgICApO1xuXG4gICAgZGVmaW5lQ29sb3IoXG4gICAgICAnYmx1ZScsXG4gICAgICBbMTU5LCAyNTddLFxuICAgICAgW1syMCwxMDBdLFszMCw4Nl0sWzQwLDgwXSxbNTAsNzRdLFs2MCw2MF0sWzcwLDUyXSxbODAsNDRdLFs5MCwzOV0sWzEwMCwzNV1dXG4gICAgKTtcblxuICAgIGRlZmluZUNvbG9yKFxuICAgICAgJ3B1cnBsZScsXG4gICAgICBbMjU4LCAyODJdLFxuICAgICAgW1syMCwxMDBdLFszMCw4N10sWzQwLDc5XSxbNTAsNzBdLFs2MCw2NV0sWzcwLDU5XSxbODAsNTJdLFs5MCw0NV0sWzEwMCw0Ml1dXG4gICAgKTtcblxuICAgIGRlZmluZUNvbG9yKFxuICAgICAgJ3BpbmsnLFxuICAgICAgWzI4MywgMzM0XSxcbiAgICAgIFtbMjAsMTAwXSxbMzAsOTBdLFs0MCw4Nl0sWzYwLDg0XSxbODAsODBdLFs5MCw3NV0sWzEwMCw3M11dXG4gICAgKTtcblxuICB9XG5cbiAgZnVuY3Rpb24gSFNWdG9SR0IgKGhzdikge1xuXG4gICAgLy8gdGhpcyBkb2Vzbid0IHdvcmsgZm9yIHRoZSB2YWx1ZXMgb2YgMCBhbmQgMzYwXG4gICAgLy8gaGVyZSdzIHRoZSBoYWNreSBmaXhcbiAgICB2YXIgaCA9IGhzdlswXTtcbiAgICBpZiAoaCA9PT0gMCkge2ggPSAxfVxuICAgIGlmIChoID09PSAzNjApIHtoID0gMzU5fVxuXG4gICAgLy8gUmViYXNlIHRoZSBoLHMsdiB2YWx1ZXNcbiAgICBoID0gaC8zNjA7XG4gICAgdmFyIHMgPSBoc3ZbMV0vMTAwLFxuICAgICAgICB2ID0gaHN2WzJdLzEwMDtcblxuICAgIHZhciBoX2kgPSBNYXRoLmZsb29yKGgqNiksXG4gICAgICBmID0gaCAqIDYgLSBoX2ksXG4gICAgICBwID0gdiAqICgxIC0gcyksXG4gICAgICBxID0gdiAqICgxIC0gZipzKSxcbiAgICAgIHQgPSB2ICogKDEgLSAoMSAtIGYpKnMpLFxuICAgICAgciA9IDI1NixcbiAgICAgIGcgPSAyNTYsXG4gICAgICBiID0gMjU2O1xuXG4gICAgc3dpdGNoKGhfaSkge1xuICAgICAgY2FzZSAwOiByID0gdiwgZyA9IHQsIGIgPSBwOyAgYnJlYWs7XG4gICAgICBjYXNlIDE6IHIgPSBxLCBnID0gdiwgYiA9IHA7ICBicmVhaztcbiAgICAgIGNhc2UgMjogciA9IHAsIGcgPSB2LCBiID0gdDsgIGJyZWFrO1xuICAgICAgY2FzZSAzOiByID0gcCwgZyA9IHEsIGIgPSB2OyAgYnJlYWs7XG4gICAgICBjYXNlIDQ6IHIgPSB0LCBnID0gcCwgYiA9IHY7ICBicmVhaztcbiAgICAgIGNhc2UgNTogciA9IHYsIGcgPSBwLCBiID0gcTsgIGJyZWFrO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gW01hdGguZmxvb3IocioyNTUpLCBNYXRoLmZsb29yKGcqMjU1KSwgTWF0aC5mbG9vcihiKjI1NSldO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBmdW5jdGlvbiBjb2xvclN0cmluZyAocHJlZml4LCB2YWx1ZXMpIHtcbiAgICByZXR1cm4gcHJlZml4ICsgJygnICsgdmFsdWVzLmpvaW4oJywgJykgKyAnKSc7XG4gIH1cblxuICByZXR1cm4gcmFuZG9tQ29sb3I7XG59KSk7Il19
