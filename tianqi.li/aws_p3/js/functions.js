// funciton to open panel
function generalPanelShow() {
  var scope = this;

  // open plate
  var insertDistance = 500;
  scope.rotation.y = scope.rotateAngle;
  scope.position.x = scope.basePosition.x + insertDistance * Math.cos(scope.rotateAngle);
  scope.position.z = scope.basePosition.z - insertDistance * Math.sin(scope.rotateAngle);
  scope.visible = true;

  var tween = new TWEEN.Tween(scope.position)
  .to({x: scope.basePosition.x, y: scope.basePosition.y, z: scope.basePosition.z}, 250)
  .easing(TWEEN.Easing.Quadratic.InOut)
  .start().onComplete(function() {
    animationState = AnimationState.None;
  });

  scope.cycle = 0;
  scope.update = function(delta) {
    this.cycle += delta;
    this.rotation.y = this.rotateAngle + Math.sin(this.cycle)/9;
  }
}	

// function to close panel
function generalPanelClose() {
  var scope = this;

  // close plate
  var coseDistance = 500;

  var tween = new TWEEN.Tween(scope.position)
  .to({y: -500}, 500)
  .easing(TWEEN.Easing.Quadratic.In)
  .start().onComplete(function() {
    scope.visible = false;
    animationState = AnimationState.None;
    scope.update = false;
  })
}	

// function to generally turn off panel's light
function generalTurnOffLight() {
  var tween = new TWEEN.Tween(this.material.emissive)
  .to({r:0.03, g:0.03, b:0.03}, 500)
  .easing(TWEEN.Easing.Linear.None)
  .start().onComplete(function() {
  });			
}

// function to generally turn on panel's light
function generalTurnOnLight() {
  var tween = new TWEEN.Tween(this.material.emissive)
  .to({r:0.4, g:0.4, b:0.4}, 500)
  .easing(TWEEN.Easing.Linear.None)
  .start().onComplete(function() {
  });			
}

// function to generally open title
function generalOpenTitle(speed) {
  speed = speed || 500;
  var scope = this;

  scope.position = this.basePosition.clone();
  scope.rotation.y = Math.PI/5 * 3;
  scope.visible = true;
  scope.cycle = 0;
  var tween = new TWEEN.Tween(scope.rotation)
  .to({y: 0}, speed)
  .easing(TWEEN.Easing.Linear.None)
  .start().onComplete(function() {
    scope.update = function(delta) {
      this.cycle += delta;
      this.rotation.x = Math.sin(this.cycle)/13;
      this.rotation.y = Math.sin(this.cycle)/11;
    }
    animationState = AnimationState.None;
  });			
}

// function to generally rotate and open panel
function generalRotateOpenPanel(speed) {
  speed = speed || 500;
  var scope = this;

  scope.position = this.basePosition.clone();
  scope.rotation.y = Math.PI/ 2;
  scope.material.opacity = 0.0;
  scope.visible = true;
  var tween = new TWEEN.Tween(scope.rotation)
  .to({y: 0}, speed)
  .start();		

  var tween = new TWEEN.Tween(scope.material)
  .to({opacity: scope.maxOpacity || 1.0}, speed)
  .start();		
}

// function to generally rotate close title
function generalRotateClosePanel(speed) {
  speed = speed || 500;
  var scope = this;

  var tween = new TWEEN.Tween(scope.rotation)
  .to({y: - Math.PI / 2}, speed)
  .start().onComplete(function() {
    scope.visible = false;
  });

  var tween = new TWEEN.Tween(scope.material)
  .to({opacity: 0.0}, speed)
  .start();
}

function generalMoveTo(position, speed) {
  speed = speed || 300;
  position = position || new THREE.Vector3(0, 200, 300);

  var scope = this;
  var tween = new TWEEN.Tween(scope.position)
  .to({x: position.x, y: position.y, z: position.z}, speed)
  .start();		
}

function rotateOpenPanel(panel, speed) {
  panel.generalRotateOpenPanel = generalRotateOpenPanel;
  panel.generalRotateOpenPanel(speed);
}
function rotateClosePanel(panel, speed) {
  panel.generalRotateClosePanel = generalRotateClosePanel;
  panel.generalRotateClosePanel(speed);
}

function rotateSwitchPanel(panel1, panel2, speed) {
  speed /= 2;

  rotateClosePanel(panel1, speed);

  var tween = new TWEEN.Tween(panel2)
  .to({}, speed)
  .onComplete(function(e) {				
    rotateOpenPanel(panel2, speed);
    var tween = new TWEEN.Tween(panel2)
    .to({}, speed)
    .onComplete(function(e) {
      var tween = new TWEEN.Tween(panel2.rotation)
      .to({y : panel2.rotateAngle}, 2000)
      .onComplete(function(e) {
        panel2.cycle = 0;
        panel2.update = function(delta) {
          this.cycle += delta;
          this.rotation.y = this.rotateAngle + Math.sin(this.cycle)/9;
        }						
      })
      .start();
    })
    .start();
  })
  .start();
}

// function to generally close title
function generalCloseTitle() {
  var scope = this;
  this.position = this.basePosition.clone();
  var tween = new TWEEN.Tween(this.position)
  .to({y: this.position.y+300}, 500)
  .easing(TWEEN.Easing.Linear.None)
  .start().onComplete(function() {
    scope.visible = false;
    scope.update = null;
    animationState = AnimationState.None;
  });
}

// function to scaleup panel
function generalScaleUp(scale, speed) {
  var maxScale = scale || new THREE.Vector3(1, 1, 1);
  speed = speed || 500;

  var scope = this;
  scope.scale.set(0.01, 0.01, 0.01);
  scope.visible = true;

  var tween = new TWEEN.Tween(scope.scale)
  .to({y: maxScale.y, x: maxScale.x, z: maxScale.z}, speed)
  .easing(TWEEN.Easing.Linear.None)
  .start();
}

// function to scaledown panel
function generalScaleDown(scale, speed) {
  scale = scale || new THREE.Vector3(0.01, 0.01, 0.01);
  speed = speed || 500;

  var scope = this;
  var tween = new TWEEN.Tween(scope.scale)
  .to({y: scale.x, x: scale.y, z: scale.z}, speed)
  .easing(TWEEN.Easing.Linear.None)
  .onComplete(function(e) {
    scope.visible = false;
  })
  .start();
}

// general forward
function generalForward(speed) {
  var container = this;
  var tween = new TWEEN.Tween(container.position)
  .to({x: container.forwardTo.x, y: container.forwardTo.y, z: container.forwardTo.z}, speed)
  .start();
}

// general backward
function generalBackward(speed) {
  var container = this;
  var tween = new TWEEN.Tween(container.position)
  .to({x: container.backwardTo.x, y: container.backwardTo.y, z: container.backwardTo.z}, speed)
  .start();
}

// function to fade panel
function fadePanel(panel, opacity, speed) {
  var tween = new TWEEN.Tween(panel.material)
  .to({opacity: opacity}, speed)
  .start();
}

// function to shake panel
function shakePanel(delta) {
  this.cycle += delta;
  this.rotation.y = this.rotateAngle + Math.sin(this.cycle)/9;
  this.rotation.x = this.rotateAngle + Math.sin(this.cycle)/11;
}	


// function to open panel
function forwardVideoPanel(vol) {
  var oepnTime = 400;
  var maxVolume = vol? vol: 1;

  var tween = new TWEEN.Tween(this.scale)
  .to({x: 1, y: 1, z: 1}, oepnTime)
  .easing(TWEEN.Easing.Linear.None)
  .start().onComplete(function() {
  });

  var tween = new TWEEN.Tween(this.videoObj.videoNode)
  .to({volume: maxVolume}, oepnTime)
  .easing(TWEEN.Easing.Linear.None)
  .start().onComplete(function() {
  });

  var tween = new TWEEN.Tween(this.position)
  .to({x: this.centerPosition.x, y: this.centerPosition.y, z: this.centerPosition.z}, oepnTime)
  .easing(TWEEN.Easing.Linear.None)
  .start().onComplete(function() {
    animationState = AnimationState.None;			
  });
}

// function to backward panel
function backwardVideoPanel(minVolume) {
  var tweenTime = 400;

  var tween = new TWEEN.Tween(this.scale)
  .to({x: 0.5, y: 0.5, z: 0.5}, tweenTime)
  .easing(TWEEN.Easing.Linear.None)
  .start().onComplete(function() {
  });

  var tween = new TWEEN.Tween(this.videoObj.videoNode)
  .to({volume: minVolume? minVolume: 0}, tweenTime)
  .easing(TWEEN.Easing.Linear.None)
  .start().onComplete(function() {
  });

  var tween = new TWEEN.Tween(this.position)
  .to({x: this.basePosition.x, y: this.basePosition.y, z: this.basePosition.z}, tweenTime)
  .easing(TWEEN.Easing.Linear.None)
  .start().onComplete(function() {
    animationState = AnimationState.None;			
  });
}

// function to open video panel
function openVideoPanel(scale) {
  var targetScale = scale || new THREE.Vector3(0.5, 0.5, 0.5);
  var tweenTime = 400;
  this.visible = true;
  this.videoObj.play();
  this.scale.set(0.01, 0.01, 0.01);

  var scope = this;
  if(scope.keepInMemory) { // do animation immediately
    var tween = new TWEEN.Tween(scope.scale)
    .to({x: targetScale.x, y: targetScale.y, z: targetScale.z}, tweenTime)
    .easing(TWEEN.Easing.Linear.None)
    .start().onComplete(function() {
      animationState = AnimationState.None;			
    });
  } else { // animation after loaded
    this.videoObj.videoNode.addEventListener('loadedmetadata', function() {
      var tween = new TWEEN.Tween(scope.scale)
      .to({x: targetScale.x, y: targetScale.y, z: targetScale.z}, tweenTime)
      .easing(TWEEN.Easing.Linear.None)
      .start().onComplete(function() {
        animationState = AnimationState.None;			
      });
    }, false);
  }
}

// function to fadeout mesh
function fadeOutPanel() {
  var tween = new TWEEN.Tween(this.material)
  .to({opacity: 0}, 500)
  .easing(TWEEN.Easing.Linear.None)
  .start();
}

// function to fadein mesh
function fadeInPanel(maxOpacity) {
  maxOpacity = maxOpacity || 1;
  var tween = new TWEEN.Tween(this.material)
  .to({opacity: maxOpacity}, 500)
  .easing(TWEEN.Easing.Linear.None)
  .start();
}

// function to fadein from min to max
function minToMaxfadeIn() {
  this.visible = true;
  var tween = new TWEEN.Tween(this.material)
  .to({opacity: this.maxOpacity}, 500)
  .easing(TWEEN.Easing.Linear.None)
  .start();
}

// function to fadeout from max to min
function maxToMinfadeOut() {
  var container = this;
  var tween = new TWEEN.Tween(this.material)
  .to({opacity: this.minOpacity}, 500)
  .easing(TWEEN.Easing.Linear.None)
  .onComplete(function(e) {
    container.visible = false;
  })
  .start();
}

// function to close video panel
function closeVideoPanel(objects, scene) {
  var scope = this;
  var tweenTime = 400;
  var tween = new TWEEN.Tween(this.scale)
  .to({x: 0.01, y: 0.01, z: 0.01}, tweenTime)
  .easing(TWEEN.Easing.Linear.None)
  .start().onComplete(function() {
    scope.visible = false;
    scope.videoObj.pause();
    animationState = AnimationState.None;

    if(!scope.keepInMemory) {
      console.log("deleted video " + scope.videoObj.videoNode.src);
      scope.videoObj.update = function() {};
      scope.update = function() {};
      objects.splice(objects.indexOf(scope), 1);
      scene.remove(scope)
      scope.videoObj.videoNode.remove();
      scope.videoObj.videoNode.src = "";
      delete scope.videoObj.videoNode;
      delete scope.videoObj;
    }
  });
}



// generate title panel
function generateGoldPanel(src, width, height, position, objects, scene) {
	var goldPanel = new Panel({
		width: width,
		height: height,
		src: src,
		depthTest: false,
		blending: THREE.AdditiveBlending,
		emissive: 0x666666,
		opacity: 0.6,
		maxOpacity: 0.6,
		minOpacity: 0.0,
		visible: false,
		state: PanelState.Closed,
		position: position
	});
	objects.push(goldPanel);
	scene.add(goldPanel);

  return goldPanel;
}

// generate panel
function generatePanel(src, width, height, position, objects, scene) {
	var panel = new Panel({
		width: width,
		height: height,
		src: src,
		depthTest: false,
		blending: THREE.AdditiveBlending,
		emissive: 0x666666,
		opacity: 0.6,
		maxOpacity: 0.6,
		minOpacity: 0.0,
		visible: false,
		state: PanelState.Closed,
		position: position
	});
	panel.basePosition = panel.position.clone();
  panel.rotateShow = generalRotateOpenPanel;
  panel.rotateClose = generalRotateClosePanel
  panel.turnOffLight = generalTurnOffLight
	panel.turnOnLight = generalTurnOnLight;	
  panel.fadeInPanel = minToMaxfadeIn;
	panel.fadeOutPanel = maxToMinfadeOut;	
  panel.scaleUp = generalScaleUp;
  panel.scaleDown = generalScaleDown;
	objects.push(panel);
	scene.add(panel);

  return panel;
}

function generateTitlePanel(src, width, height, position, objects, scene) {
  panel = generatePanel(src, width, height, position, objects, scene);

	panel.rotateAngle = Math.PI / 16;
	panel.openPanel = generalOpenTitle;
	panel.closePanel = generalCloseTitle;
  return panel;
}

function generateSubPanel(src, width, height, position, objects, scene) {
  panel = generatePanel(src, width, height, position, objects, scene);

	panel.rotateAngle = -Math.PI / 16;
  panel.material.emissive.set(0x777777);
	panel.show = generalPanelShow;
	panel.close = generalPanelClose;
  return panel;
}

function generateVideo(src, width, height, centerPosition, basePosition, objects, scene, camera) {
  var videoObj = new Video({
    videoUrl: src,
    width: width, 
    height: height,
    radius: 1000,
    innerRadius: 1,
    outerRadius: 100,
    startTime: 0,
    position: basePosition,
    loop: true, 
    autoPlay: true, 
    transparent: true,
    customUpdate: true
  });

  _VIDEO_LOCK = false;
  var plane = new THREE.PlaneGeometry(width, height, 1, 1);     
  var mesh = new THREE.Mesh(plane, videoObj.material);
	mesh.videoObj = videoObj;
  mesh.cycle = Math.random() * Math.PI * 2;
  mesh.centerPosition = centerPosition,
  mesh.update = function(delta) {
    this.material.emissive.r = 0.2;
    this.material.emissive.g = 0.2;
    this.material.emissive.b = 0.2;
    this.videoObj.update(camera);
  }

  mesh.videoObj.videoNode.volume = 0;
  mesh.visible = false;
  mesh.videoObj.pause();
  mesh.scale.x = mesh.scale.y = mesh.scale.z = 0.01;
  mesh.forwardPanel = forwardVideoPanel;
  mesh.backwardPanel = backwardVideoPanel;
  mesh.openPanel = openVideoPanel;
  mesh.closePanel = closeVideoPanel;
  mesh.basePosition =  basePosition;
  mesh.position.set(basePosition.x, basePosition.y, basePosition.z)

	objects.push(mesh);
	scene.add(mesh);

  return mesh
}
