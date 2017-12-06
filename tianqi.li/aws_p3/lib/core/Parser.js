var KEYMAP = {
	ANY_KEY: 1,
	ALL_EVENT: 10,	
	ENTER: 13,
	A: 65,
	B: 66,
	C: 67,
	D: 68,
	E: 69,
	F: 70,
	G: 71,
	H: 72,
	I: 73,
	J: 74,
	K: 75,
	L: 76,
	M: 77,
	N: 78,
	O: 79,
	P: 80,
	Q: 81,
	R: 82,
	S: 83,
	T: 84,
	U: 85,
	V: 86,
	W: 87,
	X: 88,
	Y: 89,
	Z: 90,
	KEY0: 48,
	KEY1: 49,
	KEY2: 50,
	KEY3: 51,
	KEY4: 52,
	KEY5: 53,
	KEY6: 54,
	KEY7: 55,
	KEY8: 56,
	KEY9: 57
};

var MOUSEMAP = {
	MOUSE_CONTROL: 2,
	TARGET_CLICK: 3,
	TARGET_HOVER: 4,
	TARGET_HOVER_OUT: 5
};

var TOUCHMAP = {
	USE_TOUCH: 9,
};

/******************************************/
// Class to parse original threejs metadata
/******************************************/
var Parser = function(threejs, builder) {
	// signals
	var render = new signals.Signal();
	var windowResize = new signals.Signal();
	var scope = this;
	this.render = render;
	this.windowResize = windowResize;

	// clock
	var clock = new THREE.Clock();
	this.clock = clock;

	// object needs to update
	var animatingObjects = new Array();	
	render.add(function(delta) {
		for(var i = 0; i < animatingObjects.length; i++) {
			if(animatingObjects[i].update) {
				animatingObjects[i].update(delta);
			}
		}		
	});
	this.animatingObjects = animatingObjects;

	// lights
	var meshLights = new THREE.Mesh();	
	this.meshLights = meshLights;

	// mesh objects
	var meshObjects = new THREE.Mesh();
	this.meshObjects = meshObjects;

	// index animations
	var indexAnimation = {
		useIndexAnimation: true,
		loopMode: true,
		animationData: new Array()		
	};
	this.indexAnimation = indexAnimation;	

	// helpers
	var helpers = new Array();
	this.helpers = helpers;

	// pickers
	var pickers = new Array();
	this.pickers = pickers;

	// morphs definition
	var morphs = new Array();
	render.add(function(delta) {
		for(var i = 0; i < morphs.length; i++) {
			morphs[i].updateAnimation(delta);
		}
	});
	this.morphs = morphs;

	// depth objects
	var depthObjects = new Array();
	render.add(function() {
		for(var i = 0; i < depthObjects.length; i++) {
			depthObjects[i].object.renderDepth = depthObjects[i].position.distanceTo(camera.position);
		}
	});
	this.depthObjects = depthObjects;

	// tween animation
	render.add(function(delta) {
		TWEEN.update();
	});

	// renderer
	var renderer = new THREE.WebGLRenderer({
		antialias: true,
		alpha: true
	});
	renderer.setClearColor(threejs.renderer.clearColor);
	this.renderer = renderer;

	// scene
	var scene = new THREE.Scene();
	if(threejs.fog) {
		scene.fog = new THREE.Fog(threejs.fog.color, threejs.fog.near, threejs.fog.far);
	}
	this.scene = scene;

	// camera
	var camera = new THREE.PerspectiveCamera(
		threejs.camera.fov,
		window.innerWidth / window.innerHeight,
		threejs.camera.near,
		threejs.camera.far
	);
	camera.position = new THREE.Vector3(
		threejs.camera.position.x,
		threejs.camera.position.y,
		threejs.camera.position.z
	);
	if(threejs.camera.lookAt) {
		camera.lookAt(new THREE.Vector3(
			threejs.camera.lookAt.x,
			threejs.camera.lookAt.y,
			threejs.camera.lookAt.z
		));
	} else if(threejs.camera.rotation) {
		camera.rotateX(threejs.camera.rotation.x);
		camera.rotateY(threejs.camera.rotation.y);
		camera.rotateZ(threejs.camera.rotation.z);
	}
	windowResize.add(function() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
	});
	window.addEventListener("resize", function() {
		windowResize.dispatch();
	}, true);
	this.camera = camera;

	// parse index animation
	if(threejs.indexAnimation) {
		this.indexAnimation.useIndexAnimation = threejs.indexAnimation.useIndexAnimation;
		this.indexAnimation.loopMode = threejs.indexAnimation.loopMode;
		for(var i = 0; i < threejs.indexAnimation.animationData.length; i++) {
			var animationParam = threejs.indexAnimation.animationData[i];
			this.indexAnimation.animationData.push({
				uuid: animationParam.uuid,
				animation: animationParam.animation,
				pattern: animationParam.pattern,
				trigger: {
					type: animationParam.trigger.type,
					constant: animationParam.trigger.constant,
					value: animationParam.trigger.value,
					target: animationParam.trigger.target
				}
			});
		}
	}
	function getObjectFromUUID(uuid) {
		if(uuid == "camera") {
			return scope.camera;
		}
		for(var i = 0; i < scope.meshObjects.children.length; i++) {
			if(scope.meshObjects.children[i].uuid == uuid) {
				return scope.meshObjects.children[i];
			}
		}
		for(var i = 0; i < scope.meshLights.children.length; i++) {
			if(scope.meshLights.children[i].uuid == uuid) {
				return scope.meshLights.children[i];
			}
		}
		return null;
	}
	this.getObjectFromUUID = getObjectFromUUID;

	function getObjectFromName(name) {
		if(name == scope.camera.name) {
			return scope.camera;
		}
		for(var i = 0; i < scope.meshObjects.children.length; i++) {
			if(scope.meshObjects.children[i].name == name) {
				return scope.meshObjects.children[i];
			}
		}
		for(var i = 0; i < scope.meshLights.children.length; i++) {
			if(scope.meshLights.children[i].name == name) {
				return scope.meshLights.children[i];
			}
		}
		return null;
	}
	this.getObjectFromName = getObjectFromName;

	function runIndexAnimation(index) {
		var animationParam = indexAnimation.animationData[index];
		if(animationParam) {
			var object = getObjectFromUUID(animationParam.uuid);
			try {
				eval("object.runAnimation = function() {" + animationParam.animation + "}");
				object.runAnimation();
			} catch(error) {
				console.log(error);
				console.log(error.stack);
			}
		}
	}
	this.runIndexAnimation = runIndexAnimation;

	function compareKeyCode(triggerKey, eventKey) {
		if(triggerKey == KEYMAP.ANY_KEY || triggerKey == KEYMAP.ALL_EVENT) {
			return true;
		} else if(triggerKey == eventKey) {
			return true;
		} else {
			return false;
		}
	}
	this.compareKeyCode = compareKeyCode;

	var animationIndex = 0;
	var shiftKey = false;
	window.addEventListener("keydown", function(ev) {
		if(ev.shiftKey) {
			shiftKey = true;
		} else {
			shiftKey = false;
		}
	}, false);
	window.addEventListener("keyup", function(ev) {
		if(ev.shiftKey) {
			shiftKey = true;
		} else {
			shiftKey = false;
		}
	}, false);
	function gotoNextAnimation(firstIndex, lastIndex, loopMode, currentIndex) {
		if(loopMode != "onetime" && shiftKey) { // reverse aniamtion
			currentIndex--;
			if(currentIndex < firstIndex) {
				switch(loopMode) {
					case "loop": {
						currentIndex = lastIndex;
						break;
					}
					case "normal": {
						currentIndex++;
						break;
					}
				}
			}
		} else {
			currentIndex++;
			if(currentIndex > lastIndex) {
				switch(loopMode) {
					case "loop": {
						currentIndex = firstIndex;
						break;
					}
					case "normal": {
						currentIndex--;
						break;
					}
					case "onetime": {
						break;
					}
				}
			}
		}
		setupIndexAnimation(firstIndex, lastIndex, loopMode, currentIndex);
	}
	function setupIndexAnimation(firstIndex, lastIndex, loopMode, currentIndex) {
		if(!currentIndex) {
			currentIndex = firstIndex;
		} else if(firstIndex < 0 || lastIndex >= indexAnimation.animationData.length 
			|| currentIndex < firstIndex || currentIndex > lastIndex) {
			return;
		}
		var animationParam = indexAnimation.animationData[currentIndex];
		if(!animationParam) {
			return;
		}
		function processKeyDown(ev) {
			if(compareKeyCode(animationParam.trigger.value, ev.keyCode)) {
				window.removeEventListener("keydown", processKeyDown, false);
				document.body.removeEventListener("touchstart", processTouch, false);
				window.removeEventListener("mousedown", processMousedown, false);
				window.removeEventListener("mousewheel", processMouseWheel, false);
				runIndexAnimation(currentIndex);
				gotoNextAnimation(firstIndex, lastIndex, loopMode, currentIndex);
			}
		}		
		function processMousedown(ev) {
			window.removeEventListener("keydown", processKeyDown, false);
			document.body.removeEventListener("touchstart", processTouch, false);
			window.removeEventListener("mousedown", processMousedown, false);
			window.removeEventListener("mousewheel", processMouseWheel, false);
			if(ev.button == 2) {
				if(!shiftKey) { // right click
					shiftKey = true;
					runIndexAnimation(currentIndex);
					gotoNextAnimation(firstIndex, lastIndex, loopMode, currentIndex);
					shiftKey = false;
				}
			} else if(ev.button == 0) {
					runIndexAnimation(currentIndex);
					gotoNextAnimation(firstIndex, lastIndex, loopMode, currentIndex); // left click
			}
		}
		function processMouseWheel(ev) {
			window.removeEventListener("keydown", processKeyDown, false);
			document.body.removeEventListener("touchstart", processTouch, false);
			window.removeEventListener("mousedown", processMousedown, false);
			window.removeEventListener("mousewheel", processMouseWheel, false);
			if(ev.wheelDelta < 0) {
				runIndexAnimation(currentIndex);
				gotoNextAnimation(firstIndex, lastIndex, loopMode, currentIndex);
			} else {
				if(!shiftKey) {
					shiftKey = true;
					runIndexAnimation(currentIndex);			
					gotoNextAnimation(firstIndex, lastIndex, loopMode, currentIndex);
					shiftKey = false;
				}						
			}
		}
		function processTouch(ev) {
			window.removeEventListener("keydown", processKeyDown, false);
			document.body.removeEventListener("touchstart", processTouch, false);
			window.removeEventListener("mousedown", processMousedown, false);
			window.removeEventListener("mousewheel", processMouseWheel, false);
			runIndexAnimation(currentIndex);
			gotoNextAnimation(firstIndex, lastIndex, loopMode, currentIndex);
		}
		function processTargetClick(ev) {
			var intersects = getIntersects(ev, meshObjects.children);
			if(intersects.length > 0) {
				var targetUUID = animationParam.trigger.target ? animationParam.trigger.target: animationParam.uuid;
				if(intersects[0].object == getObjectFromUUID(targetUUID)) {
					window.removeEventListener("click", processTargetClick, false);
					runIndexAnimation(currentIndex);			
					gotoNextAnimation(firstIndex, lastIndex, loopMode, currentIndex);
				}
			}
		}
		function processTargetHover(ev) {
			var intersects = getIntersects(ev, meshObjects.children);
			if(intersects.length > 0) {
				var targetUUID = animationParam.trigger.target ? animationParam.trigger.target: animationParam.uuid;
				if(intersects[0].object == getObjectFromUUID(targetUUID)) {
					window.removeEventListener("mousemove", processTargetHover, false);
					runIndexAnimation(currentIndex);
					gotoNextAnimation(firstIndex, lastIndex, loopMode, currentIndex);
				}
			}
		}
		function processTargetHoverOut(ev) {
			var intersects = getIntersects(ev, meshObjects.children);
			if(intersects.length > 0) {
				var targetUUID = animationParam.trigger.target ? animationParam.trigger.target: animationParam.uuid;
				if(intersects[0].object != getObjectFromUUID(targetUUID)) {
					window.removeEventListener("mousemove", processTargetHoverOut, false);
					runIndexAnimation(currentIndex);
					gotoNextAnimation(firstIndex, lastIndex, loopMode, currentIndex);
				}
			} else {
				window.removeEventListener("mousemove", processTargetHoverOut, false);
				runIndexAnimation(currentIndex);
				gotoNextAnimation(firstIndex, lastIndex, loopMode, currentIndex);
			}
		}
		var ray = new THREE.Raycaster();
		var projector = new THREE.Projector();
		function getIntersects(event, object) {
			var rect = viewport.getBoundingClientRect();
			var x = (event.clientX - rect.left) / rect.width;
			var y = (event.clientY - rect.top)  / rect.height;
			var vector = new THREE.Vector3(2*x-1, 1-2*y, 0.5);
			projector.unprojectVector(vector, camera);
			ray.set(camera.position, vector.sub(camera.position).normalize());
			if(object instanceof Array) {
				return ray.intersectObjects(object);
			}
			return ray.intersectObject(object);
		}

		// process timer event
		if(animationParam.trigger.type == "timer") {
			var tween = new TWEEN.Tween().to({}, parseFloat(animationParam.trigger.value)).start().onComplete(function() {
				runIndexAnimation(currentIndex);
				gotoNextAnimation(firstIndex, lastIndex, loopMode, currentIndex);
			});
		}
		// process all constant event 
		else if(animationParam.trigger.constant == "constant") {
			if(animationParam.trigger.type == "key" || animationParam.trigger.value == KEYMAP.ALL_EVENT) {
				window.addEventListener("keydown", function(ev) {
					if(compareKeyCode(animationParam.trigger.value, ev.keyCode)) {
						runIndexAnimation(currentIndex);
					}
				}, false);
				gotoNextAnimation(firstIndex, lastIndex, loopMode, currentIndex);
			} 
			if(animationParam.trigger.type == "mouse" || animationParam.trigger.value == KEYMAP.ALL_EVENT) {
				if(animationParam.trigger.value == MOUSEMAP.TARGET_CLICK) {
					window.addEventListener("click", function(ev) {
						var intersects = getIntersects(ev, meshObjects.children);
						if(intersects.length > 0) {
							var targetUUID = animationParam.trigger.target ? animationParam.trigger.target: animationParam.uuid;
							if(intersects[0].object == getObjectFromUUID(targetUUID)) {
								runIndexAnimation(currentIndex);			
							}				
						}
					}, false);
					gotoNextAnimation(firstIndex, lastIndex, loopMode, currentIndex);
				} else if(animationParam.trigger.value == MOUSEMAP.TARGET_HOVER) {
					window.addEventListener("mousemove", function(ev) {
						var intersects = getIntersects(ev, meshObjects.children);
						if(intersects.length > 0) {
							var targetUUID = animationParam.trigger.target ? animationParam.trigger.target: animationParam.uuid;
							if(intersects[0].object == getObjectFromUUID(targetUUID)) {
								runIndexAnimation(currentIndex);
							}						
						}
					}, false);
					gotoNextAnimation(firstIndex, lastIndex, loopMode, currentIndex);
				} else if(animationParam.trigger.value == MOUSEMAP.TARGET_HOVER_OUT) {
					window.addEventListener("mousemove", function(ev) {
						var intersects = getIntersects(ev, meshObjects.children);
						if(intersects.length > 0) {
							var targetUUID = animationParam.trigger.target ? animationParam.trigger.target: animationParam.uuid;
							if(intersects[0].object != getObjectFromUUID(targetUUID)) {
								runIndexAnimation(currentIndex);
							}
						} else {
							runIndexAnimation(currentIndex);
						}
					}, false);
					gotoNextAnimation(firstIndex, lastIndex, loopMode, currentIndex);
				} else {
					window.addEventListener("mousedown", function(ev) {
						runIndexAnimation(currentIndex);
					}, false);
					window.addEventListener("mousewheel", function(ev) {
						runIndexAnimation(currentIndex);
					}, false);
					gotoNextAnimation(firstIndex, lastIndex, loopMode, currentIndex);
				}
			} 
			if(animationParam.trigger.type == "touch" || animationParam.trigger.value == KEYMAP.ALL_EVENT) {
				document.body.addEventListener("touchstart", function(ev) {
					runIndexAnimation(firstIndex, lastIndex, loopMode, currentIndex);
				}, false);
				gotoNextAnimation(firstIndex, lastIndex, loopMode, currentIndex);				
			}
		}
		// process normal event
		else {
			// process key event
			if(animationParam.trigger.type == "key") {
				if(animationParam.trigger.value == KEYMAP.ALL_EVENT) {
					window.addEventListener("keydown", processKeyDown, false);
					window.addEventListener("mousewheel", processMouseWheel, false);
					window.addEventListener("mousedown", processMousedown, false);
					document.body.addEventListener("touchstart", processTouch, false);
				} else {			
					window.addEventListener("keydown", processKeyDown, false);
				}
			} 
			// process mouse event
			else if(animationParam.trigger.type == "mouse") {
				if(animationParam.trigger.value == MOUSEMAP.MOUSE_CONTROL) {
					window.addEventListener("mousewheel", processMouseWheel, false);
					window.addEventListener("mousedown", processMousedown, false);
				} else if(animationParam.trigger.value == MOUSEMAP.TARGET_CLICK) {
					window.addEventListener("click", processTargetClick, false);
				} else if(animationParam.trigger.value == MOUSEMAP.TARGET_HOVER) {
					window.addEventListener("mousemove", processTargetHover, false);
				} else if(animationParam.trigger.value == MOUSEMAP.TARGET_HOVER_OUT) {
					window.addEventListener("mousemove", processTargetHoverOut, false);					
				}
			}
			// process touch event
			else if(animationParam.trigger.type == "touch") {
				document.body.addEventListener("touchstart", processTouch, false);
			}
		}
	}
	this.setupIndexAnimation = setupIndexAnimation;

	if(!builder && indexAnimation.useIndexAnimation) {
		this.setupIndexAnimation(0, indexAnimation.animationData.length-1, indexAnimation.loopMode);
	}

	// controller
	var controls;
	if(!builder && threejs.controls) {
		controls = parseController(threejs.controls, camera, animatingObjects);
		this.controls = controls;
	}
	function parseController(controllerInfo, camera, animatingObjects) {
		var controls;
		switch(controllerInfo.type) {
			case "FirstPerson": {
				controls = new THREE.FirstPersonControls(camera);
				controls.type = controllerInfo.type;
				controls.movementSpeed = controllerInfo.movementSpeed;
				controls.lookSpeed = controllerInfo.lookSpeed;
				controls.lookVertical = controllerInfo.lookVertical;
				controls.autoForward = controllerInfo.autoForward;
				controls.activeLook = controllerInfo.activeLook;
				controls.freeze = controllerInfo.freeze;
				if(controllerInfo.lon) {
					controls.lon = controllerInfo.lon;
				}
				if(controllerInfo.lat) {
					controls.lat = controllerInfo.lat;
				}
				animatingObjects.push(controls);
				break;
			}
			case "Edit": {
				controls = new THREE.EditorControls(camera);
				controls.type = controllerInfo.type;
				controls.center.set(
					controllerInfo.center.x,
					controllerInfo.center.y,
					controllerInfo.center.z
				);
				break;
			}
		}
		return controls;
	}
	this.parseController = parseController;

	// lights
	for(var i = 0; i < threejs.lights.length; i++) {
		var light = threejs.lights[i];
		switch(light.type) {
			case "AmbientLight": {
				// Ambient light
				var ambientLight = Parser.parseObject(light, true);
				meshLights.add(ambientLight);
				break;
			}
			case "DirectionalLight": {
				// Directional light
				var directionalLight = Parser.parseObject(light, true);
				meshLights.add(directionalLight);

				// helper
				var directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 20);
				helpers.push(directionalLightHelper);

				// picker
				var picker = new THREE.Mesh(new THREE.SphereGeometry(20, 4, 2), new THREE.MeshBasicMaterial({color: 0xff0000}));
				picker.visible = false;
				picker.isPicker = true;
				pickers.push(picker);
				picker.target = directionalLight;
				directionalLight.add(picker);
				break;
			}
			case "HemisphereLight": {
				// Hemisphere light
				var hemisphereLight = Parser.parseObject(light, true);
				meshLights.add(hemisphereLight);

				// helper
				var hemisphereLightHelper = new THREE.HemisphereLightHelper(hemisphereLight, 10);
				helpers.push(hemisphereLightHelper);

				// picker
				var picker = new THREE.Mesh(new THREE.SphereGeometry(20, 4, 2), new THREE.MeshBasicMaterial({color: 0xff0000}));
				picker.visible = false;
				picker.isPicker = true;
				pickers.push(picker);
				picker.target = hemisphereLight;
				hemisphereLight.add(picker);
				break;
			}
			case "PointLight": {
				var pointLight = Parser.parseObject(light, true);
				meshLights.add(pointLight);

				// helper
				var pointLightHelper = new THREE.PointLightHelper(pointLight, 10);
				helpers.push(pointLightHelper);

				// picker
				var picker = new THREE.Mesh(new THREE.SphereGeometry(20, 4, 2), new THREE.MeshBasicMaterial({color: 0xff0000}));
				picker.visible = false;
				picker.isPicker = true;
				pickers.push(picker);
				picker.target = pointLight;
				pointLight.add(picker);
				break;
			}
			case "SpotLight": {
				var spotLight = Parser.parseObject(light, true);
				meshLights.add(spotLight);

				// helper
				var spotLightHelper = new THREE.SpotLightHelper(spotLight, 10);
				helpers.push(spotLightHelper);

				// picker
				var picker = new THREE.Mesh(new THREE.SphereGeometry(20, 4, 2), new THREE.MeshBasicMaterial({color: 0xff0000}));
				picker.visible = false;
				picker.isPicker = true;
				pickers.push(picker);
				picker.target = spotLight;
				spotLight.add(picker);
				break;
			}
		}
	}
	scene.add(meshLights);

	// objects
	for(var i = 0; i < threejs.objects.length; i++) {
		var object = threejs.objects[i];
		switch(object.type) {
			// all type of object
			default:
			case "Cube":
			case "Sphere": {
				var meshObject = Parser.parseObject(object, builder);
				if(meshObject) {
					meshObjects.add(meshObject);
					if(meshObject.update) {
						animatingObjects.push(meshObject);
					}
					if(meshObject.material && meshObject.material.update) {
						// set video position
						if(meshObject.material.map && meshObject.material.map.kind == "video") {
							meshObject.material.map.position = meshObject.position;
							meshObject.material.map.material = meshObject.material;
							meshObject.material.map.camera = builder? builder.camera: camera;
						}
						animatingObjects.push(meshObject.material);
					}
				}
				break;
			}
			case "model" : {
				switch(object.format) {
					// OBJMTL Loader
					case "objmtl" : {
						(function() {
							var loader = new THREE.OBJMTLLoader();
							var objectParam = object;
							loader.load(objectParam.objPath, objectParam.mtlPath, function(objmtl) {
								eval("var customOnload = " + objectParam.onload);
								customOnload(objmtl);

								objmtl.position = new THREE.Vector3(
									objectParam.position.x,
									objectParam.position.y,
									objectParam.position.z
								);
								objmtl.rotation = new THREE.Euler(
									objectParam.rotation.x, 
									objectParam.rotation.y, 
									objectParam.rotation.z
								);
								objmtl.scale = new THREE.Vector3(
									objectParam.scale.x,
									objectParam.scale.y, 
									objectParam.scale.z
								);
								scene.add(objmtl);
							});
						})();
						break;
					}
					case "morphjs": {
						(function() {
							var objectParam = object;
							var loader = new THREE.JSONLoader();
							loader.load(objectParam.path, function(geometry) {
								eval("var customOnload = " + objectParam.onload);
								customOnload(geometry);
								geometry.computeMorphNormals();								

								var material = new THREE.MeshPhongMaterial({
									color: objectParam.color,
									specular: objectParam.specular,
									shininess: objectParam.shininess,
									morphTargets: true,
									morphNormals: true,
									vertexColors: THREE.FaceColors,
									shading: THREE.SmoothShading
								});
								var meshAnim = new THREE.MorphAnimMesh(geometry, material);
								meshAnim.duration = objectParam.duration;
								meshAnim.scale.set(objectParam.scale.x, objectParam.scale.y, objectParam.scale.z);
								meshAnim.position.set(objectParam.position.x, objectParam.position.y, objectParam.position.z);
								scene.add(meshAnim);
								morphs.push(meshAnim);

								// update function called each frame
								if(objectParam.initUpdate) {
									eval("meshAnim.initUpdate = " + objectParam.initUpdate);
									meshAnim.initUpdate();
									animatingObjects.push(meshAnim);
								}
							});
						})();
						break;
					}					
				}
				break;
			}
		}
	}
	scene.add(meshObjects);

	// parse camera route
	if(!builder && threejs.cameraRoute) {
		var cameraRouteIntex = 0;
		function gotoNextRoute() {
			if(threejs.cameraRoute.routeStack.length <= cameraRouteIntex) {
				cameraRouteIntex = 0;
				if(!threejs.cameraRoute.loopRoute) {
					return;
				}
			}

			(function() {
				var nextRoute = threejs.cameraRoute.routeStack[cameraRouteIntex];
				if(!nextRoute) {
					return;
				}
				camera.rotation.set(
					recalcCurrentAngle(camera.rotation._x, nextRoute.rotation.x),
					recalcCurrentAngle(camera.rotation._y, nextRoute.rotation.y),
					recalcCurrentAngle(camera.rotation._z, nextRoute.rotation.z)
				);
				var prevRotation = camera.rotation.clone();
				var tween = new TWEEN.Tween(camera.position)
				.to({x: nextRoute.position.x, y: nextRoute.position.y, z: nextRoute.position.z}, threejs.cameraRoute.interval)
				.easing(TWEEN.Easing.Linear.None).start()
				.onComplete(function() {
					cameraRouteIntex++;
					gotoNextRoute();
				}).onUpdate(function(rate) {
					camera.rotation.set(
						prevRotation._x + (nextRoute.rotation.x-prevRotation._x)*rate,
						prevRotation._y + (nextRoute.rotation.y-prevRotation._y)*rate,
						prevRotation._z + (nextRoute.rotation.z-prevRotation._z)*rate
					);
				});
			})();
		}
		if(threejs.cameraRoute.startKey && threejs.cameraRoute.startKey != 0) {
			window.addEventListener("keydown", function(ev) { // start key
				if(ev.keyCode == threejs.cameraRoute.startKey) {
					gotoNextRoute();
				}
			}, false);
		} else if(threejs.cameraRoute.waitTime) {
			var tween = new TWEEN.Tween()
			.to({}, threejs.cameraRoute.waitTime)
			.easing(TWEEN.Easing.Linear.None).start()
			.onComplete(function() {
				gotoNextRoute();
			});
		}
	}

	// parse parent
	for(var i = 0; i < meshObjects.children.length; i++) {
		if(meshObjects.children[i].parentID) {
			switch(meshObjects.children[i].parentID) {
				case "scene": {
					if(builder) {
						meshObjects.children[i].parent = builder.scene;
					} else {
						meshObjects.children[i].parent = scene;						
					}
					break;
				}
				case "camera": {
					if(builder) {
						meshObjects.children[i].parent = builder.camera;
					} else {
						meshObjects.children[i].parent = camera;
					}
					break;
				}
				case "meshObjects": {
					meshObjects.children[i].parent = meshObjects;
					break;
				}
				case "meshLights": {
					meshObjects.children[i].parent = meshLights;
					break;
				}
				default: {
					meshObjects.children[i].parent = this.getObjectFromUUID(meshObjects.children[i].parentID);
					break;
				}
			}
			var alreadyContained = false;
			for(var j = 0; j < meshObjects.children[i].parent.children.length; j++) {
				if(meshObjects.children[i] == meshObjects.children[i].parent.children[j]) {
					alreadyContained = true;
					break;
				}
			}
			if(!alreadyContained) {
				meshObjects.children[i].parent.children.push(meshObjects.children[i]);
			}
		}
	}
	for(var i = 0; i < meshLights.children.length; i++) {
		if(meshLights.children[i].parentID) {
			switch(meshLights.children[i].parentID) {
				case "scene": {
					if(builder) {
						meshLights.children[i].parent = builder.scene;
					} else {
						meshLights.children[i].parent = scene;						
					}
					break;
				}
				case "camera": {
					if(builder) {
						meshLights.children[i].parent = builder.camera;
					} else {
						meshLights.children[i].parent = camera;
					}
					break;
				}
				case "meshObjects": {
					meshLights.children[i].parent = meshObjects;
					break;
				}
				case "meshLights": {
					meshLights.children[i].parent = meshLights;
					break;
				}
				default: {
					meshLights.children[i].parent = this.getObjectFromUUID(meshLights.children[i].parentID);
					break;
				}

			}
			var alreadyContained = false;
			for(var j = 0; j < meshLights.children[i].parent.children.length; j++) {
				if(meshLights.children[i] == meshLights.children[i].parent.children[j]) {
					alreadyContained = true;
					break;
				}
			}
			if(!alreadyContained) {
				meshLights.children[i].parent.children.push(meshLights.children[i]);
			}			
		}
	}

	// animate
	function animate() {
		requestAnimationFrame(animate);
		var delta = clock.getDelta();
		render.dispatch(delta);
	}
	this.animate = animate;

	/*********************************/
	// Leap motion rendering or normal rendering
	/*********************************/
	if(!builder && threejs.leap) {
		switch(threejs.leap.type) {
			case "FlyControl": {
				var glowScene = new THREE.Scene();
				this.glowScene = glowScene;

				var leapControl = new LeapControls();
				this.leapControl = leapControl;

				// glow camera
				var glowCamera = new THREE.PerspectiveCamera(
					threejs.leap.glowCamera.fov,
					window.innerWidth / window.innerHeight,
					threejs.leap.glowCamera.near,
					threejs.leap.glowCamera.far
				);
				glowCamera.position = new THREE.Vector3(
					threejs.leap.glowCamera.position.x,
					threejs.leap.glowCamera.position.y,
					threejs.leap.glowCamera.position.z
				);
				glowCamera.lookAt(new THREE.Vector3(
					threejs.leap.glowCamera.lookAt.x,
					threejs.leap.glowCamera.lookAt.y,
					threejs.leap.glowCamera.lookAt.z
				));
				this.glowCamera = glowCamera;

				// create arrows
				var arrows = leapControl.createArrows({
					imgUrl: threejs.leap.arrows.imgUrl,
					texWidth: threejs.leap.arrows.texWidth,
					texHeight: threejs.leap.arrows.texHeight,
					activeOpacity: threejs.leap.arrows.activeOpacity,
					inactiveOpacity: threejs.leap.arrows.inactiveOpacity,
					up: {
						emissive: new THREE.Color(threejs.leap.arrows.up.emissive),
						position: new THREE.Vector3(
							threejs.leap.arrows.up.position.x,
							threejs.leap.arrows.up.position.y,
							threejs.leap.arrows.up.position.z
						)
					},
					down: {
						emissive: new THREE.Color(threejs.leap.arrows.down.emissive),
						position: new THREE.Vector3(
							threejs.leap.arrows.down.position.x,
							threejs.leap.arrows.down.position.y,
							threejs.leap.arrows.down.position.z
						)
					},
					left: {
						emissive: new THREE.Color(threejs.leap.arrows.left.emissive),
						position: new THREE.Vector3(
							threejs.leap.arrows.left.position.x,
							threejs.leap.arrows.left.position.y,
							threejs.leap.arrows.left.position.z
						)
					},
					right: {
						emissive: new THREE.Color(threejs.leap.arrows.right.emissive),
						position: new THREE.Vector3(
							threejs.leap.arrows.right.position.x,
							threejs.leap.arrows.right.position.y,
							threejs.leap.arrows.right.position.z
						)
					},
					front: {
						emissive: new THREE.Color(threejs.leap.arrows.front.emissive),
						position: new THREE.Vector3(
							threejs.leap.arrows.front.position.x,
							threejs.leap.arrows.front.position.y,
							threejs.leap.arrows.front.position.z
						)
					},
					back: {
						emissive: new THREE.Color(threejs.leap.arrows.back.emissive),
						position: new THREE.Vector3(
							threejs.leap.arrows.back.position.x,
							threejs.leap.arrows.back.position.y,
							threejs.leap.arrows.back.position.z
						)
					}
				});
				for(var i in arrows) {
					// disable all arrows by default
					arrows[i].visible = false;
					glowScene.add(arrows[i]);
				}
				this.arrows = arrows;

				// left hand
				var leftHand = leapControl.createFullHand({
					handSize: threejs.leap.leftHand.handSize, moveSpeed: threejs.leap.leftHand.moveSpeed
				});
				glowScene.add(leftHand);
				this.leftHand = leftHand;

				// right hand
				var rightHand = leapControl.createFullHand({
					handSize: threejs.leap.rightHand.handSize, moveSpeed: threejs.leap.rightHand.moveSpeed
				});
				glowScene.add(rightHand);
				this.rightHand = rightHand;

				// hands object
				var hands = [leftHand, rightHand];
				Leap.loop({enableGestures: true}, function(frame) {
					var simpleFrame = leapControl.parseFrame(frame);
					leapControl.updateHandsInfo(simpleFrame, hands);
					leapControl.updateArrowInfo(simpleFrame, arrows, {
						centerPos: new THREE.Vector3(
							threejs.leap.arrows.centerPos.x,
							threejs.leap.arrows.centerPos.y,
							threejs.leap.arrows.centerPos.z
						),
						minInnerPos: new THREE.Vector3(
							threejs.leap.arrows.minInnerPos.x,
							threejs.leap.arrows.minInnerPos.y,
							threejs.leap.arrows.minInnerPos.z
						),
						maxInnerPos: new THREE.Vector3(
							threejs.leap.arrows.maxInnerPos.x,
							threejs.leap.arrows.maxInnerPos.y,
							threejs.leap.arrows.maxInnerPos.z
						)
					});
					leapControl.updateFirstPersonControls(simpleFrame, controls, {
						centerPos: new THREE.Vector3(
							threejs.leap.controls.centerPos.x,
							threejs.leap.controls.centerPos.y,
							threejs.leap.controls.centerPos.z
						),
						minInnerPos: new THREE.Vector3(
							threejs.leap.controls.minInnerPos.x,
							threejs.leap.controls.minInnerPos.y,
							threejs.leap.controls.minInnerPos.z
						),
						maxInnerPos: new THREE.Vector3(
							threejs.leap.controls.maxInnerPos.x,
							threejs.leap.controls.maxInnerPos.y,
							threejs.leap.controls.maxInnerPos.z
						),
						maxRange: new THREE.Vector3(
							threejs.leap.controls.maxRange.x,
							threejs.leap.controls.maxRange.y,
							threejs.leap.controls.maxRange.z
						)
					});
				});
				this.hands = hands;

				// wrap renderer
				leapControl.wrapRenderer(renderer, camera, glowCamera, scene, glowScene, 2280, 1482);

				// window resize
				windowResize.add(function() {
					glowCamera.aspect = window.innerWidth / window.innerHeight;
					glowCamera.updateProjectionMatrix();			
					renderer.setSize(window.innerWidth, window.innerHeight);
					leapControl.wrapRenderer(renderer, camera, glowCamera, scene, glowScene, window.innerWidth*2, window.innerHeight*2);
				});

				// renderer
				render.add(function(delta) {
					leapControl.render();
				});
				break;
			}
		}
	} else {
		render.add(function(delta) {
			renderer.render(scene, camera);
		});
	}

	return this;
}


// function to generate json param from ui param
Parser.generateParam = function(type) {
	var param = {};
	for(var key in UIParameters[type]) {
		if(UIParameters[type][key]["value"] !== undefined && UIParameters[type][key]["value"] !== null) {
			if(UIParameters[type][key]["rowType"] == "Material") {
				param[key] = Parser.generateMaterialParam(UIParameters[type][key]["value"]);
			} else if(key == "name") {
				originalName = Parser.generateOriginalName(UIParameters[type][key]["value"]);
				param[key] = originalName;
			} else if(typeof UIParameters[type][key]["value"] == "object") {
				param[key] = {};
				copyArray(UIParameters[type][key]["value"], param[key]);
			} else {
				param[key] = UIParameters[type][key]["value"];
			}
		}
	}
	return param;
}

// function to generate original name
Parser.generateOriginalName = function(name) {
	// not edit mode
	if(!builder) {
		return name;
	}

	for(var i = 0; i < builder.meshObjects.children.length; i++) {
		if(builder.meshObjects.children[i].name == name) {
			builder.nameSuffix += 1;
			return Parser.generateOriginalName(name + builder.nameSuffix);
		}
	}
	for(var i = 0; i < builder.meshLights.children.length; i++) {
		if(builder.meshLights.children[i].name == name) {
			builder.nameSuffix += 1;
			return Parser.generateOriginalName(name + builder.nameSuffix);
		}
	}

	return name;
}

// function to generate json param from material param
Parser.generateMaterialParam = function(materialParam) {
	var param = {};
	for(var key in materialParam) {
		if(materialParam[key]["value"] !== undefined && materialParam[key]["value"] !== null) {
			if(typeof materialParam[key]["value"] == "object") {
				param[key] = {};
				copyArray(materialParam[key]["value"], param[key]);
			} else {
				param[key] = materialParam[key]["value"];
			}
		}
	}
	return param;	
}

// function to convert object info to json param
Parser.convertObject = function(object) {
	var type = object.type;
	var param = {};

	for(var key in UIParameters[type]) {
		if(UIParameters[type][key]["value"] !== undefined) {
			var pointer = object;
			for(var i = 0; i < UIParameters[type][key].target.length; i++) {
				pointer = pointer[UIParameters[type][key].target[i]];
			}

			if(UIParameters[type][key]["rowType"] == "Material") {
				param[key] = Parser.convertMaterial(pointer);
			} else if(pointer instanceof THREE.Vector3) {
				param[key] = { x: pointer.x, y: pointer.y, z: pointer.z };
			} else if(pointer instanceof THREE.Euler) {
				param[key] = { x: pointer._x, y: pointer._y, z: pointer._z };
			} else if(pointer instanceof THREE.Color) {
				param[key] = pointer.getHex();
			} else if(typeof UIParameters[type][key]["value"] == "object") {
				param[key] = {};
				copyArray(pointer, param[key]);
			} else {
				param[key] = pointer;
			}
		}
	}
	return param;
}

// function to convert material info to json param
Parser.convertMaterial = function(material) {
	var type = material.type;
	var param = {};

	for(var key in MaterialParameters[type]) {
		if(MaterialParameters[type][key]["value"] !== undefined) {
			var pointer = material;
			for(var i = 0; i < MaterialParameters[type][key].target.length; i++) {
				pointer = pointer[MaterialParameters[type][key].target[i]];
			}
			if(pointer instanceof THREE.Texture) {
				if(pointer["kind"] == "image") {
					param[key] = {
						"kind": pointer.kind,
						"src": pointer.sourceFile.substring(pointer.sourceFile.indexOf("assets"))
					};				
				} else if(pointer["kind"] == "video") {
					param[key] = {
						"kind": pointer.kind,
						"src": pointer.videoNode.currentSrc.substring(pointer.videoNode.currentSrc.indexOf("assets")),
						"volume": pointer.videoNode.volume,
						"currentTime": pointer.videoNode.startTime,
						"useDistance": pointer.useDistance,
						"playRadius": pointer.playRadius,
						"minVolRadius": pointer.minVolRadius,
						"maxVolRadius": pointer.maxVolRadius,
						"startFadeIn": pointer.startFadeIn,
						"startFadeOut": pointer.startFadeOut,
						"endFadeIn": pointer.endFadeIn,
						"endFadeOut": pointer.endFadeOut
					};
				}
			} else if(pointer instanceof THREE.Vector3) {
				param[key] = { x: pointer.x, y: pointer.y, z: pointer.z };
			} else if(pointer instanceof THREE.Euler) {
				param[key] = { x: pointer._x, y: pointer._y, z: pointer._z };
			} else if(pointer instanceof THREE.Color) {
				param[key] = pointer.getHex();
			} else if(typeof MaterialParameters[type][key]["value"] == "object") {
				param[key] = {};
				copyArray(pointer, param[key]);
			} else {
				param[key] = pointer;
			}
		}
	}
	return param;
}

// function to generate object from param
Parser.parseObject = function(param, builder) {
	var object = null;

	switch(param.type) {
		// lights
		case "PointLight": {
			object = new THREE.PointLight(param.color, param.intensity, param.distance);
			object.type = param.type;
			object.name = param.name;
			object.uuid = param.uuid ? param.uuid: THREE.Math.generateUUID();
			object.position = new THREE.Vector3(param.position.x, param.position.y, param.position.z);
			object.scale = new THREE.Vector3(param.scale.x, param.scale.y, param.scale.z);
			object.rotation = new THREE.Euler(param.rotation.x, param.rotation.y, param.rotation.z);
			object.grabRadius = param.grabRadius;
			break;
		}
		case "HemisphereLight": {
			object = new THREE.HemisphereLight(param.skyColor, param.groundColor, param.intensity);
			object.type = param.type;
			object.name = param.name;
			object.uuid = param.uuid ? param.uuid: THREE.Math.generateUUID();
			object.position = new THREE.Vector3(param.position.x, param.position.y, param.position.z);
			object.scale = new THREE.Vector3(param.scale.x, param.scale.y, param.scale.z);
			object.rotation = new THREE.Euler(param.rotation.x, param.rotation.y, param.rotation.z);
			object.grabRadius = param.grabRadius;
			break;
		}
		case "DirectionalLight": {
			object = new THREE.DirectionalLight(param.color, param.intensity);
			object.type = param.type;
			object.name = param.name;
			object.uuid = param.uuid ? param.uuid: THREE.Math.generateUUID();
			object.position = new THREE.Vector3(param.position.x, param.position.y, param.position.z);
			object.scale = new THREE.Vector3(param.scale.x, param.scale.y, param.scale.z);
			object.rotation = new THREE.Euler(param.rotation.x, param.rotation.y, param.rotation.z);
			object.grabRadius = param.grabRadius;
			break;
		}
		case "SpotLight": {
			object = new THREE.SpotLight(param.color, param.intensity, param.distance, param.angle, param.exponent);
			object.type = param.type;
			object.name = param.name;
			object.uuid = param.uuid ? param.uuid: THREE.Math.generateUUID();
			object.position = new THREE.Vector3(param.position.x, param.position.y, param.position.z);
			object.scale = new THREE.Vector3(param.scale.x, param.scale.y, param.scale.z);
			object.rotation = new THREE.Euler(param.rotation.x, param.rotation.y, param.rotation.z);
			object.grabRadius = param.grabRadius;
			break;
		}
		case "AmbientLight": {
			object = new THREE.AmbientLight(param.color);
			object.type = param.type;
			object.name = param.name;
			object.uuid = param.uuid ? param.uuid: THREE.Math.generateUUID();
			object.position = new THREE.Vector3(param.position.x, param.position.y, param.position.z);
			object.scale = new THREE.Vector3(param.scale.x, param.scale.y, param.scale.z);
			object.rotation = new THREE.Euler(param.rotation.x, param.rotation.y, param.rotation.z);
			object.grabRadius = param.grabRadius;
			break;
		}

		// primitives
		case "Object3D": {
			object = new THREE.Object3D();
			object.type = param.type;
			object.name = param.name;
			object.uuid = param.uuid ? param.uuid: THREE.Math.generateUUID();
			object.position = new THREE.Vector3(param.position.x, param.position.y, param.position.z);
			object.scale = new THREE.Vector3(param.scale.x, param.scale.y, param.scale.z);
			object.rotation = new THREE.Euler(param.rotation.x, param.rotation.y, param.rotation.z);
			object.grabRadius = param.grabRadius;
			break;
		}
		case "Sphere": {
			var geometry = new THREE.SphereGeometry(
				param.radius, param.widthSegments, param.heightSegments,
				param.phiStart, param.phiLength, param.thetaStart, param.thetaLength
			);
			var material = Parser.parseMaterial(param.material, builder);

			object = new THREE.Mesh(geometry, material);
			object.type = param.type;
			object.name = param.name;
			object.uuid = param.uuid ? param.uuid: THREE.Math.generateUUID();
			object.position = new THREE.Vector3(param.position.x, param.position.y, param.position.z);
			object.scale = new THREE.Vector3(param.scale.x, param.scale.y, param.scale.z);
			object.rotation = new THREE.Euler(param.rotation.x, param.rotation.y, param.rotation.z);
			object.grabRadius = param.grabRadius;
			break;
		}
		case "Plane": {
			var geometry = new THREE.PlaneGeometry(
				param.width, param.height, param.widthSegments, param.heightSegments
			);
			var material = Parser.parseMaterial(param.material, builder);

			object = new THREE.Mesh(geometry, material);
			object.type = param.type;
			object.name = param.name;
			object.uuid = param.uuid ? param.uuid: THREE.Math.generateUUID();
			object.position = new THREE.Vector3(param.position.x, param.position.y, param.position.z);
			object.scale = new THREE.Vector3(param.scale.x, param.scale.y, param.scale.z);
			object.rotation = new THREE.Euler(param.rotation.x, param.rotation.y, param.rotation.z);
			object.grabRadius = param.grabRadius;
			break;
		}
		case "Circle": {
			var geometry = new THREE.CircleGeometry(
				param.radius, param.segments
			);
			var material = Parser.parseMaterial(param.material, builder);

			object = new THREE.Mesh(geometry, material);
			object.type = param.type;
			object.name = param.name;
			object.uuid = param.uuid ? param.uuid: THREE.Math.generateUUID();
			object.position = new THREE.Vector3(param.position.x, param.position.y, param.position.z);
			object.scale = new THREE.Vector3(param.scale.x, param.scale.y, param.scale.z);
			object.rotation = new THREE.Euler(param.rotation.x, param.rotation.y, param.rotation.z);
			object.grabRadius = param.grabRadius;
			break;
		}		
		case "Cube": {
			var geometry = new THREE.CubeGeometry(
				param.width, param.height, param.depth,
				param.widthSegments, param.heightSegments, param.depthSegments
			);
			var material = Parser.parseMaterial(param.material, builder);

			object = new THREE.Mesh(geometry, material);
			object.type = param.type;
			object.name = param.name;
			object.uuid = param.uuid ? param.uuid: THREE.Math.generateUUID();
			object.position = new THREE.Vector3(param.position.x, param.position.y, param.position.z);
			object.scale = new THREE.Vector3(param.scale.x, param.scale.y, param.scale.z);
			object.rotation = new THREE.Euler(param.rotation.x, param.rotation.y, param.rotation.z);
			object.grabRadius = param.grabRadius;
			break;
		}
		case "Cylinder": {
			var geometry = new THREE.CylinderGeometry(
				param.radiusTop, param.radiusBottom, param.height,
				param.radialSegments, param.heightSegments, param.openEnded
			);
			var material = Parser.parseMaterial(param.material, builder);

			object = new THREE.Mesh(geometry, material);
			object.type = param.type;
			object.name = param.name;
			object.uuid = param.uuid ? param.uuid: THREE.Math.generateUUID();
			object.position = new THREE.Vector3(param.position.x, param.position.y, param.position.z);
			object.scale = new THREE.Vector3(param.scale.x, param.scale.y, param.scale.z);
			object.rotation = new THREE.Euler(param.rotation.x, param.rotation.y, param.rotation.z);
			object.grabRadius = param.grabRadius;
			break;
		}	
		case "Icosahedron": {
			var geometry = new THREE.IcosahedronGeometry(
				param.radius, param.detail
			);
			var material = Parser.parseMaterial(param.material, builder);

			object = new THREE.Mesh(geometry, material);
			object.type = param.type;
			object.name = param.name;
			object.uuid = param.uuid ? param.uuid: THREE.Math.generateUUID();
			object.position = new THREE.Vector3(param.position.x, param.position.y, param.position.z);
			object.scale = new THREE.Vector3(param.scale.x, param.scale.y, param.scale.z);
			object.rotation = new THREE.Euler(param.rotation.x, param.rotation.y, param.rotation.z);
			object.grabRadius = param.grabRadius;
			break;
		}	
		case "Torus": {
			var geometry = new THREE.TorusGeometry(
				param.radius, param.tube, param.radialSegments, param.tubularSegments, param.arc
			);
			var material = Parser.parseMaterial(param.material, builder);

			object = new THREE.Mesh(geometry, material);
			object.type = param.type;
			object.name = param.name;
			object.uuid = param.uuid ? param.uuid: THREE.Math.generateUUID();
			object.position = new THREE.Vector3(param.position.x, param.position.y, param.position.z);
			object.scale = new THREE.Vector3(param.scale.x, param.scale.y, param.scale.z);
			object.rotation = new THREE.Euler(param.rotation.x, param.rotation.y, param.rotation.z);
			object.grabRadius = param.grabRadius;
			break;
		}	
		case "TorusKnot": {
			var geometry = new THREE.TorusKnotGeometry(
				param.radius, param.tube, param.radialSegments, param.tubularSegments,
				param.p, param.q, param.heightScale
			);
			var material = Parser.parseMaterial(param.material, builder);

			object = new THREE.Mesh(geometry, material);
			object.type = param.type;
			object.name = param.name;
			object.uuid = param.uuid ? param.uuid: THREE.Math.generateUUID();
			object.position = new THREE.Vector3(param.position.x, param.position.y, param.position.z);
			object.scale = new THREE.Vector3(param.scale.x, param.scale.y, param.scale.z);
			object.rotation = new THREE.Euler(param.rotation.x, param.rotation.y, param.rotation.z);
			object.grabRadius = param.grabRadius;
			break;
		}	
	}

	// init parentID
	if(param.parentID) {
		object.parentID = param.parentID;
	}

	// init animation
	try {
		if(param.animation) {
			object.animation = param.animation;
			eval("object.initAnimation = function() {" + object.animation + "}");
			object.initAnimation();
		}
	} catch(error) {
		alert(error);
	}
	return object;
}

// function to parser material
Parser.parseMaterial = function(materialParam, builder) {
	var material = null;

	switch(materialParam.type) {
		case "Phong": {
			var mapTexture = Parser.loadTexture(materialParam.map, builder);
			material = new THREE.MeshPhongMaterial({
				color: materialParam.color,
				ambient: materialParam.ambient,
				emissive: materialParam.emissive,
				specular: materialParam.specular,
				shininess: materialParam.shininess,
				metal: false,
				side: materialParam.side,
				wireframe: materialParam.wireframe,
				transparent: materialParam.transparent,
				opacity: materialParam.opacity,
				blending: materialParam.blending,
				map: mapTexture
			});
			if(mapTexture && mapTexture.kind == "video") {
				material.update = function(delta) {
					mapTexture.update(delta);
				}
			}

 			material.MaterialClass = materialParam.MaterialClass;
			material.type = materialParam.type;
			material.name = materialParam.name;
			break;
		}
		case "Basic": {
			var mapTexture = Parser.loadTexture(materialParam.map, builder);
			material = new THREE.MeshBasicMaterial({
				color: materialParam.color,
				side: materialParam.side,
				wireframe: materialParam.wireframe,
				transparent: materialParam.transparent,
				opacity: materialParam.opacity,
				blending: materialParam.blending,
				map: mapTexture
			});
			if(mapTexture && mapTexture.kind == "video") {
				material.update = function(delta) {
					mapTexture.update(delta);
				}
			}

			material.MaterialClass = materialParam.MaterialClass;
			material.type = materialParam.type;
			material.name = materialParam.name;
			break;
		}
	}
	return material;
}

// function to load texture
Parser.loadTexture = function(mapInfo, builder) {
	if(!mapInfo) {
		return null;
	}

	var texture = null;

	if(mapInfo.kind == "image") {
		if(mapInfo.src && mapInfo.src.length > 0) {
			if(builder) {
				texture = THREE.ImageUtils.loadTexture("../app/" + builder.projectName + "/" + mapInfo.src);
			} else {
				texture = THREE.ImageUtils.loadTexture(mapInfo.src);
			}
			texture.kind = "image";
		}
	} else if(mapInfo.kind == "video") {
		var defaultPlayRadius = 1000;
		var defaultMinVolRadius = 1000;
		var defaultMaxVolRadius = 300;
		var defaultStartFadeIn = 1100;
		var defaultEndFadeIn = 800;
		var defaultStartFadeOut = 400;
		var defaultEndFadeOut = 100;

		if(mapInfo.src && mapInfo.src.length > 0) {
			if(builder) {
				texture = new VideoTexture("../app/" + builder.projectName + "/" + mapInfo.src, function() {
					this.videoNode.startTime = mapInfo.currentTime != undefined ? mapInfo.currentTime: 0;
					this.videoNode.currentTime = this.videoNode.startTime;
					this.videoNode.volume = mapInfo.volume != undefined? mapInfo.volume: 1;

					this.useDistance = mapInfo.useDistance != undefined ? mapInfo.useDistance: false;
					this.playRadius = mapInfo.playRadius != undefined ? mapInfo.playRadius: defaultPlayRadius;
					this.minVolRadius = mapInfo.minVolRadius != undefined ? mapInfo.minVolRadius: defaultMinVolRadius;
					this.maxVolRadius = mapInfo.maxVolRadius != undefined ? mapInfo.maxVolRadius: defaultMaxVolRadius;
					this.startFadeIn = mapInfo.startFadeIn != undefined ? mapInfo.startFadeIn: defaultStartFadeIn;
					this.startFadeOut = mapInfo.startFadeOut != undefined ? mapInfo.startFadeOut: defaultStartFadeOut;
					this.endFadeIn = mapInfo.endFadeIn != undefined ? mapInfo.endFadeIn: defaultEndFadeIn;
					this.endFadeOut = mapInfo.endFadeOut != undefined ? mapInfo.endFadeOut: defaultEndFadeOut;
				});
			} else {
				texture = new VideoTexture(mapInfo.src, function() {
					this.videoNode.startTime = mapInfo.currentTime != undefined ? mapInfo.currentTime: 0;
					this.videoNode.currentTime = this.videoNode.startTime;
					this.videoNode.volume = mapInfo.volume != undefined ? mapInfo.volume: 1;				

					this.useDistance = mapInfo.useDistance != undefined ? mapInfo.useDistance: false;
					this.playRadius = mapInfo.playRadius != undefined ? mapInfo.playRadius: defaultPlayRadius;
					this.minVolRadius = mapInfo.minVolRadius != undefined ? mapInfo.minVolRadius: defaultMinVolRadius;
					this.maxVolRadius = mapInfo.maxVolRadius != undefined ? mapInfo.maxVolRadius: defaultMaxVolRadius;
					this.startFadeIn = mapInfo.startFadeIn != undefined ? mapInfo.startFadeIn: defaultStartFadeIn;
					this.startFadeOut = mapInfo.startFadeOut != undefined ? mapInfo.startFadeOut: defaultStartFadeOut;
					this.endFadeIn = mapInfo.endFadeIn != undefined ? mapInfo.endFadeIn: defaultEndFadeIn;
					this.endFadeOut = mapInfo.endFadeOut != undefined ? mapInfo.endFadeOut: defaultEndFadeOut;
				});
			}
			texture.kind = "video";
		}		
	}

	return texture;
}

// self encode
function myEncode(content) {
	return content.split("+").join("¥");
}

function myDecode(content) {
	return content.split("¥").join("+");
}

var getObjectFromUUID = function(uuid) {
	if(viewport.parser) {
		return viewport.parser.getObjectFromUUID(uuid);
	} else {
		return builder.getObjectFromUUID(uuid);
	}
}

var getObjectFromName = function(name) {
	if(viewport.parser) {
		return viewport.parser.getObjectFromName(name);
	} else {
		return builder.getObjectFromName(name);
	}
}
