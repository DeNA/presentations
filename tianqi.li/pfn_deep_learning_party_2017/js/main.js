/************************/
// Global variable
/************************/
var Viewport = function(metadata) {
	/***************************/
	// Common initialization
	/***************************/
	// Create dom element
	var container = document.createElement("div");

	// save meta data
	var threejs = metadata.threejs;
	container.threejs = threejs;

	// signals difinition
	var render = new signals.Signal();
	var windowResize = new signals.Signal();
	var nextAnimation = new signals.Signal();

	// clock
	var clock = new THREE.Clock();

	// videos
	var videos = new Array();
	
	// objects definition
	var objects = new Array();
	container.objects = objects;
	render.add(function(delta) {
		for(var i = 0; i < objects.length; i++) {
			if(objects[i].update) {
				objects[i].update(delta);
			}
		}		
	})

	// morphs definition
	var morphs = new Array();
	container.morphs = morphs;
	render.add(function(delta) {
		for(var i = 0; i < morphs.length; i++) {
			morphs[i].updateAnimation(delta);
		}
	})

	// depth objects
	var depthObjects = new Array();
	render.add(function() {
		for(var i = 0; i < depthObjects.length; i++) {
			depthObjects[i].object.renderDepth = depthObjects[i].position.distanceTo(camera.position);
		}
	});
	container.depthObjects = depthObjects;

	// tween animation
	render.add(function(delta) {
		TWEEN.update();
	});

	/**************************/
	// Parse threejs and init
	/**************************/
	// renderer
	var renderer = new THREE.WebGLRenderer({
		antialias: true,
		alpha: true
	});
	renderer.setClearColor(threejs.renderer.clearColor);
	container.renderer = renderer;
	container.appendChild(renderer.domElement);

	// scene
	var scene = new THREE.Scene();
	container.scene = scene;
	if(threejs.fog) {
		scene.fog = new THREE.Fog(threejs.fog.color, threejs.fog.near, threejs.fog.far);
	}

	// camera
	var camera = new THREE.PerspectiveCamera(
		80,
		window.innerWidth / window.innerHeight,
		threejs.camera.near,
		threejs.camera.far
	);
	camera.position = new THREE.Vector3(
		threejs.camera.position.x,
		threejs.camera.position.y,
		threejs.camera.position.z
	);
	camera.lookAt(new THREE.Vector3(
		threejs.camera.lookAt.x,
		threejs.camera.lookAt.y,
		threejs.camera.lookAt.z
	));
	windowResize.add(function() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
	});
	window.addEventListener("resize", function() {
		windowResize.dispatch();
	}, true);
	container.camera = camera;

	// controller
	var controls;
	switch(threejs.controls.type) {
		case "FirstPerson": {
			controls = new THREE.FirstPersonControls(camera);
			controls.movementSpeed = threejs.controls.movementSpeed;
			controls.lookSpeed = threejs.controls.lookSpeed;
			controls.lookVertical = threejs.controls.lookVertical;
			if(threejs.controls.lon) {
				controls.lon = threejs.controls.lon;
			}
			if(threejs.controls.lat) {
				controls.lat = threejs.controls.lat;
			}
//			objects.push(controls);
			break;
		}
	}
	container.controls = controls;

	// light
	for(var i = 0; i < threejs.lights.length; i++) {
		var light = threejs.lights[i];
		switch(light.type) {
			case "ambient": {
				var ambientLight = new THREE.AmbientLight(light.color);
				scene.add(ambientLight);
				break;
			}
			case "directional": {
				var directionalLight = new THREE.DirectionalLight(light.color);
				directionalLight.position = new THREE.Vector3(light.position.x, light.position.y, light.position.z);
				scene.add(directionalLight);
				break;
			}
			case "hemisphere": {
				// Hemisphere light
				hemiLight = new THREE.HemisphereLight(light.color, light.groundColor, light.strength);
				hemiLight.position.set(light.position.x, light.position.y, light.position.z);
				hemiLight.name = "HemisphereLight";
				scene.add(hemiLight);
				break;
			}
		}
	}

	/*********************************/
	// Leap motion rendering or normal rendering
	/*********************************/
	var glowScene = new THREE.Scene();
	var leapControl = new LeapControls();

	// glow camera
	var glowCamera = new THREE.PerspectiveCamera(
		80,
		window.innerWidth / window.innerHeight,
		threejs.leap.glowCamera.near,
		threejs.leap.glowCamera.far
	);
	glowCamera.position = new THREE.Vector3(
		threejs.leap.glowCamera.position.x,
		threejs.leap.glowCamera.position.y,
		threejs.leap.glowCamera.position.z + 20 
	);
	glowCamera.lookAt(new THREE.Vector3(
		threejs.leap.glowCamera.lookAt.x,
		threejs.leap.glowCamera.lookAt.y,
		threejs.leap.glowCamera.lookAt.z
	));

	// create arrows
	var arrows = leapControl.createArrows({
		imgUrl: "assets/textures/arrow.png",
		texWidth: 50,
		texHeight: 50,
		activeOpacity: 0.6,
		inactiveOpacity: 0.2,
		up: {
			emissive: new THREE.Color(0xffffff),
			position: new THREE.Vector3(0, 300, 0)
		},
		down: {
			emissive: new THREE.Color(0xffffff),
			position: new THREE.Vector3(0, 100, 0)
		},
		left: {
			emissive: new THREE.Color(0xffffff),
			position: new THREE.Vector3(-180, 200, 0)
		},
		right: {
			emissive: new THREE.Color(0xffffff),
			position: new THREE.Vector3(180, 200, 0)
		},
		front: {
			emissive: new THREE.Color(0xffffff),
			position: new THREE.Vector3(0, 220, 0)
		},
		back: {
			emissive: new THREE.Color(0xffffff),
			position: new THREE.Vector3(0, 170, 100)
		}
	});
	for(var i in arrows) {
		// disable all arrows by default
		arrows[i].visible = false;
		glowScene.add(arrows[i]);
	}

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

	///////////////////////////////////////////////////
	//                Custom code                    //
	///////////////////////////////////////////////////
	var glowSceneCenterPos = new THREE.Vector3(0, 200, -100);
	var glowWorld = new THREE.Mesh();
	glowWorld.update = function(delta) {
		//this.rotateY(delta/6);
	}
	objects.push(glowWorld);

	var glowSlope = new THREE.Mesh();
	glowSlope.position = glowSceneCenterPos;
	glowSlope.rotateX(Math.PI / 6);
	glowSlope.add(glowWorld);
	glowScene.add(glowSlope);


	// skydome
	var material = new THREE.MeshPhongMaterial({
		shininess: 10,
		side: THREE.DoubleSide,
		emissive: 0x444444,
		map: THREE.ImageUtils.loadTexture("assets/textures/starmap.jpg")
	});
	var sphere = new THREE.CubeGeometry(1900, 1500, 1900);
	var skydome = new THREE.Mesh(sphere, material);
	skydome.baseEmissive = skydome.material.emissive.clone();
	skydome.update = function(delta) {
		this.rotateY(delta/50);		
	}
	objects.push(skydome);
	glowWorld.add(skydome);
	skydome.weakenLight = function(speed) {
		var tween = new TWEEN.Tween(skydome.material.emissive)
		.to({r: 0.01, b: 0.01, g: 0.01}, speed)
		.start();
	}
	skydome.strengthenLight = function(speed) {
		var tween = new TWEEN.Tween(skydome.material.emissive)
		.to({r: skydome.baseEmissive.r, b: skydome.baseEmissive.b, g: skydome.baseEmissive.g}, speed)
		.start();
	}


	/**************************/
	// music definition
	/**************************/
	// fox opening music
	var foxMusic;

	/**************************/
	// panel definition
	/**************************/
	// title panel
  var titlePanel = generateGoldPanel(
    "assets/textures/pfn_title.png",
    520, 85,
    new THREE.Vector3(0, 250, -1000),
    objects, glowScene
  );

	// final panel
  var finalPanel = generateGoldPanel(
    "assets/textures/thankyou2.png",
    360, 80,
    new THREE.Vector3(0, 300, 0),
    objects, glowScene
  );

	// company panel
  var companyPanel = generatePanel(
    "assets/textures/company2.png",
    170, 45,
    new THREE.Vector3(-110, 120, 0),
    objects, glowScene
  );
	companyPanel.rotateAngle = Math.PI / 16;

	// name panel
  var namePanel = generatePanel(
    "assets/textures/signature.png",
    170, 28,
    new THREE.Vector3(110, 160, 0),
    objects, glowScene
  );
	namePanel.rotateAngle = -Math.PI / 16;

	// mail panel
  var emailPanel = generatePanel(
    "assets/textures/email.png",
    180, 28,
    new THREE.Vector3(110, 115, 0),
    objects, glowScene
  );
	emailPanel.rotateAngle = -Math.PI / 16;

	// intro panel
  var introPanel = generateTitlePanel(
    "assets/textures/self_introduction.png",
    180, 60,
    new THREE.Vector3(-90, 295, 0),
    objects, glowScene
  );

	// self introduction photo
	var panel = new Panel({
		width: 165,
		height: 180,
		src: "assets/textures/photo.png",
		depthTest: true,
		blending: THREE.NormalBlending,
		emissive: 0x777777,
		opacity: 1.0,
		maxOpacity: 1.0,
		minOpacity: 0.0,
		visible: false,
		state: PanelState.Closed,
		position: new THREE.Vector3(-100, 167, 0)
	});
	objects.push(panel);
	scene.add(panel);
	panel.scaleUp = generalScaleUp;
	panel.scaleDown = generalScaleDown;
	panel.moveTo = generalMoveTo;
	var photoPanel = panel;

  var intro1Panel = generateSubPanel(
    "assets/textures/intro_001.png",
    195, 32,
    new THREE.Vector3(110, 240, 0),
    objects, glowScene
  );
  var intro2Panel = generateSubPanel(
    "assets/textures/intro_002.png",
    195, 32,
    new THREE.Vector3(110, 195, 0),
    objects, glowScene
  );
  var intro3Panel = generateSubPanel(
    "assets/textures/intro_003.png",
    195, 32,
    new THREE.Vector3(110, 150, 0),
    objects, glowScene
  );
  var intro4Panel = generateSubPanel(
    "assets/textures/intro_004.png",
    195, 32,
    new THREE.Vector3(110, 105, 0),
    objects, glowScene
  );

	// st panel
  var comparedSimulatorPanel = null;
  var stPanel = generateTitlePanel(
    "assets/textures/st.png",
    190, 55,
    new THREE.Vector3(-90, 295, 0),
    objects, glowScene
  );
  var st1Panel = generateSubPanel(
    "assets/textures/st1.png",
    195, 32,
    new THREE.Vector3(110, 230, 0),
    objects, glowScene
  );
  var st2Panel = generateSubPanel(
    "assets/textures/js_webgl.png",
    195, 32,
    new THREE.Vector3(110, 180, 0),
    objects, glowScene
  );
  var st3Panel = generateSubPanel(
    "assets/textures/st3.png",
    195, 32,
    new THREE.Vector3(110, 130, 0),
    objects, glowScene
  );

	// DeNA company
  var deulPanel = null;
  var oseroniaPanel = null;
  var sentamaPanel = null;
  var baystarsPanel = null;
  var robonekoPanel = null;
  var hackdollPanel = null;
  var robonekoCopyrightPanel = generatePanel(
    "assets/textures/roboneko_copyright.png",
    190, 9,
    new THREE.Vector3(-100, 255, 0),
    objects, glowScene
  );
  robonekoCopyrightPanel.material.opacity = 0.0;
  robonekoCopyrightPanel.maxOpacity = 0.4;
  var companyIntroPanel = generateTitlePanel(
    "assets/textures/company_intro.png",
    210, 50,
    new THREE.Vector3(-90, 295, 0),
    objects, glowScene
  );
  var companyIntro1Panel = generateSubPanel(
    "assets/textures/company_intro01.png",
    195, 32,
    new THREE.Vector3(110, 240, 0),
    objects, glowScene
  );
  var companyIntro2Panel = generateSubPanel(
    "assets/textures/company_intro02.png",
    195, 32,
    new THREE.Vector3(110, 240, 0),
    objects, glowScene
  );
  var companyIntroEntamePanel = generateSubPanel(
    "assets/textures/entame.png",
    195, 32,
    new THREE.Vector3(110, 200, 0),
    objects, glowScene
  );
  var companyIntro3Panel = generateSubPanel(
    "assets/textures/company_intro03.png",
    195, 32,
    new THREE.Vector3(110, 160, 0),
    objects, glowScene
  );
  var companyIntro4Panel = generateSubPanel(
    "assets/textures/company_intro04.png",
    195, 32,
    new THREE.Vector3(110, 120, 0),
    objects, glowScene
  );
  var companyIntro5Panel = generateSubPanel(
    "assets/textures/company_intro05.png",
    195, 32,
    new THREE.Vector3(110, 80, 0),
    objects, glowScene
  );

  // dena × ai
  var denaAIPanel = generateTitlePanel(
    "assets/textures/dena_ai.png",
    210, 50,
    new THREE.Vector3(-90, 295, 0),
    objects, glowScene
  );
  var denaAISitePanel = generateSubPanel(
    "assets/textures/dena_ai_site.png",
    195, 32,
    new THREE.Vector3(110, 240, 0),
    objects, glowScene
  );
  var denaAIGamePanel = generateSubPanel(
    "assets/textures/dena_ai_game.png",
    195, 32,
    new THREE.Vector3(110, 200, 0),
    objects, glowScene
  );
  var denaAIGame1Panel = generateSubPanel(
    "assets/textures/dena_ai_game1.png",
    195, 32,
    new THREE.Vector3(110, 160, 0),
    objects, glowScene
  );
  var denaAIGame2Panel = generateSubPanel(
    "assets/textures/dena_ai_game5.png",
    195, 32,
    new THREE.Vector3(110, 120, 0),
    objects, glowScene
  );
  var denaAIGame3Panel = generateSubPanel(
    "assets/textures/dena_ai_game3.png",
    195, 32,
    new THREE.Vector3(110, 80, 0),
    objects, glowScene
  );
  var denaAIAutoPanel = generateSubPanel(
    "assets/textures/dena_ai_auto_new.png",
    195, 32,
    new THREE.Vector3(110, 200, 0),
    objects, glowScene
  );
  var denaAIAuto1Panel = generateSubPanel(
    "assets/textures/dena_ai_auto1.png",
    195, 32,
    new THREE.Vector3(110, 160, 0),
    objects, glowScene
  );
  var denaAIAuto2Panel = generateSubPanel(
    "assets/textures/dena_ai_auto2.png",
    195, 32,
    new THREE.Vector3(110, 120, 0),
    objects, glowScene
  );
  var denaAIShopPanel = generateSubPanel(
    "assets/textures/dena_ai_shop.png",
    195, 32,
    new THREE.Vector3(110, 200, 0),
    objects, glowScene
  );
  var denaAIShop1Panel = generateSubPanel(
    "assets/textures/dena_ai_shop2.png",
    195, 32,
    new THREE.Vector3(110, 160, 0),
    objects, glowScene
  );
  var denaAIShop2Panel = generateSubPanel(
    "assets/textures/dena_ai_shop3.png",
    195, 32,
    new THREE.Vector3(110, 120, 0),
    objects, glowScene
  );
  var denaAIShop3Panel = generateSubPanel(
    "assets/textures/dena_ai_shop4.png",
    195, 32,
    new THREE.Vector3(110, 80, 0),
    objects, glowScene
  );

  // smartshop
  var smartshopPanel = generateTitlePanel(
    "assets/textures/smartshop.png",
    260, 50,
    new THREE.Vector3(-70, 295, 0),
    objects, glowScene
  );
  var smartshop1Panel = generateSubPanel(
    "assets/textures/smartshop1.png",
    195, 32,
    new THREE.Vector3(110, 240, 0),
    objects, glowScene
  );
  var smartshop2Panel = generateSubPanel(
    "assets/textures/smartshop2.png",
    195, 32,
    new THREE.Vector3(110, 200, 0),
    objects, glowScene
  );
  var smartshop3Panel = generateSubPanel(
    "assets/textures/smartshop3.png",
    195, 32,
    new THREE.Vector3(110, 160, 0),
    objects, glowScene
  );
  var smartshop4Panel = generateSubPanel(
    "assets/textures/smartshop4.png",
    195, 32,
    new THREE.Vector3(110, 120, 0),
    objects, glowScene
  );
  var smartshop5Panel = generateSubPanel(
    "assets/textures/smartshop5.png",
    195, 32,
    new THREE.Vector3(110, 80, 0),
    objects, glowScene
  );

  // element
  var boundingboxPanel = null;
  var poseEstimationPanel = null;
  var reidPanel = null;
  var elementPanel = generateTitlePanel(
    "assets/textures/core.png",
    210, 50,
    new THREE.Vector3(-90, 295, 0),
    objects, glowScene
  );
  var trackPanel = generateTitlePanel(
    "assets/textures/tracking.png",
    210, 50,
    new THREE.Vector3(-90, 295, 0),
    objects, glowScene
  );
  var track1Panel = generateSubPanel(
    "assets/textures/track1.png",
    195, 32,
    new THREE.Vector3(110, 230, 0),
    objects, glowScene
  );
  var track2Panel = generateSubPanel(
    "assets/textures/track2.png",
    195, 32,
    new THREE.Vector3(110, 185, 0),
    objects, glowScene
  );
  var track3Panel = generateSubPanel(
    "assets/textures/track3.png",
    195, 32,
    new THREE.Vector3(110, 140, 0),
    objects, glowScene
  );
  var track4Panel = generateSubPanel(
    "assets/textures/track4.png",
    195, 32,
    new THREE.Vector3(110, 95, 0),
    objects, glowScene
  );
  var track5Panel = generateSubPanel(
    "assets/textures/element1.png",
    195, 32,
    new THREE.Vector3(110, 230, 0),
    objects, glowScene
  );
  var track6Panel = generateSubPanel(
    "assets/textures/element3.png",
    195, 32,
    new THREE.Vector3(110, 185, 0),
    objects, glowScene
  );

  // pose 
  var pafMoviePanel = null;
  var confidenceMapMoviePanel = null;
  var posePanel = generateTitlePanel(
    "assets/textures/pose.png",
    250, 50,
    new THREE.Vector3(-70, 295, 0),
    objects, glowScene
  );
  var pose0Panel = generateSubPanel(
    "assets/textures/pose1.png",
    195, 30,
    new THREE.Vector3(110, 240, 0),
    objects, glowScene
  );
  var pose1Panel = generateSubPanel(
    "assets/textures/pose_estimation1.png",
    195, 26,
    new THREE.Vector3(110, 200, 0),
    objects, glowScene
  );
  var pose01Panel = generateSubPanel(
    "assets/textures/pose2.png",
    195, 30,
    new THREE.Vector3(110, 230, 0),
    objects, glowScene
  );
  var pose02Panel = generateSubPanel(
    "assets/textures/pose03.png",
    195, 30,
    new THREE.Vector3(110, 185, 0),
    objects, glowScene
  );
  var pose03Panel = generateSubPanel(
    "assets/textures/pose04.png",
    195, 30,
    new THREE.Vector3(110, 140, 0),
    objects, glowScene
  );
  var pose11Panel = generateSubPanel(
    "assets/textures/pose11.png",
    195, 30,
    new THREE.Vector3(110, 230, 0),
    objects, glowScene
  );
  var pose12Panel = generateSubPanel(
    "assets/textures/pose12.png",
    195, 30,
    new THREE.Vector3(110, 185, 0),
    objects, glowScene
  );

  var poseCodePanel = generateSubPanel(
    "assets/textures/code.png",
    200, 100,
    new THREE.Vector3(0, 200, 90),
    objects, scene
  );
  poseCodePanel.material.emissive.set(0x666666);
	poseCodePanel.backwardTo = new THREE.Vector3(-110, 160, 0);
  poseCodePanel.material.opacity = 0.75;

  var pose13Panel = generateSubPanel(
    "assets/textures/pose13.png",
    195, 30,
    new THREE.Vector3(110, 140, 0),
    objects, glowScene
  );

  var poseModelPanel = generateSubPanel(
    "assets/textures/pose_model1.png",
    180, 90,
    new THREE.Vector3(0, 200, 90),
    objects, scene
  );
  poseModelPanel.material.emissive.set(0x666666);
	poseModelPanel.backwardTo = new THREE.Vector3(-110, 160, 0);
  poseModelPanel.material.opacity = 0.75;

  var pose21Panel = generateSubPanel(
    "assets/textures/pose21.png",
    195, 30,
    new THREE.Vector3(110, 240, 0),
    objects, glowScene
  );
  var pose22Panel = generateSubPanel(
    "assets/textures/pose_estimation2.png",
    195, 30,
    new THREE.Vector3(110, 200, 0),
    objects, glowScene
  );

  var poseThesisPanel = generateSubPanel(
    "assets/textures/thesis6.png",
    130, 170,
    new THREE.Vector3(0, 200, 90),
    objects, glowScene
  );
  poseThesisPanel.material.emissive.set(0x454545);
	poseThesisPanel.backwardTo = new THREE.Vector3(-110, 160, 0);
  poseThesisPanel.backwardPanel = generalBackward;
  poseThesisPanel.maxOpacity = 0.9;
  poseThesisPanel.opacity = 1.0;

  var pose23Panel = generateSubPanel(
    "assets/textures/pose3.png",
    195, 30,
    new THREE.Vector3(110, 160, 0),
    objects, glowScene
  );
  var pose24Panel = generateSubPanel(
    "assets/textures/pose4.png",
    195, 30,
    new THREE.Vector3(110, 120, 0),
    objects, glowScene
  );
  var pose25Panel = generateSubPanel(
    "assets/textures/pose_estimation3.png",
    195, 30,
    new THREE.Vector3(110, 80, 0),
    objects, glowScene
  );

  var pose31Panel = generateSubPanel(
    "assets/textures/pose31.png",
    195, 30,
    new THREE.Vector3(110, 230, 0),
    objects, glowScene
  );
  var gaussianPanel = generateSubPanel(
    "assets/textures/gaussian.png",
    180, 90,
    new THREE.Vector3(0, 200, 90),
    objects, scene
  );
  gaussianPanel.material.emissive.set(0xffffff);
	gaussianPanel.backwardTo = new THREE.Vector3(-110, 160, 0);
  gaussianPanel.material.opacity = 0.99;
  gaussianPanel.material.maxOpacity = 0.99;

  var pose32Panel = generateSubPanel(
    "assets/textures/pose32.png",
    195, 30,
    new THREE.Vector3(110, 185, 0),
    objects, glowScene
  );
  var pose33Panel = generateSubPanel(
    "assets/textures/pose33.png",
    195, 30,
    new THREE.Vector3(110, 140, 0),
    objects, glowScene
  );

  var pafsPanel = generateSubPanel(
    "assets/textures/pafs.png",
    220, 90,
    new THREE.Vector3(0, 200, 90),
    objects, scene
  );
  pafsPanel.material.emissive.set(0xffffff);
	pafsPanel.backwardTo = new THREE.Vector3(-110, 160, 0);
  pafsPanel.material.opacity = 0.99;
  pafsPanel.material.maxOpacity = 0.99;

  var pose34Panel = generateSubPanel(
    "assets/textures/pose34.png",
    195, 30,
    new THREE.Vector3(110, 95, 0),
    objects, glowScene
  );

  var greedyPanel = generateSubPanel(
    "assets/textures/greedy.png",
    110, 130,
    new THREE.Vector3(0, 200, 90),
    objects, scene
  );
  greedyPanel.material.emissive.set(0x777777);
	greedyPanel.backwardTo = new THREE.Vector3(-110, 160, 0);
  greedyPanel.material.opacity = 0.99;
  greedyPanel.material.maxOpacity = 0.99;


  // result
  var resultPanel = generateTitlePanel(
    "assets/textures/result.png",
    250, 50,
    new THREE.Vector3(-70, 295, 0),
    objects, glowScene
  );
  var result1Panel = generateSubPanel(
    "assets/textures/omake1.png",
    195, 30,
    new THREE.Vector3(110, 240, 0),
    objects, glowScene
  );
  var result2Panel = generateSubPanel(
    "assets/textures/omake2.png",
    230, 30,
    new THREE.Vector3(105, 195, 0),
    objects, glowScene
  );
  var result3Panel = generateSubPanel(
    "assets/textures/result1.png",
    195, 26,
    new THREE.Vector3(110, 150, 0),
    objects, glowScene
  );


	/************************************/
	// neural networks
	/************************************/
	var networkWorld = new THREE.Mesh();
	networkWorld.position.set(0, -50, -50);
	glowScene.add(networkWorld)

	// cube network
	var geometry = new THREE.CubeGeometry(480, 200, 200);
	var texture = THREE.ImageUtils.loadTexture("assets/textures/empty.png");
	texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
	var material = new THREE.MeshPhongMaterial({map: texture, transparent: true, opacity: 0.0, emissive: 0x333333, side: THREE.DoubleSide});
	var mesh = new THREE.Mesh(geometry, material);
	mesh.position.y = 190;
	mesh.visible = false;
	mesh.minOpacity = 0.0;
	mesh.maxOpacity = 0.9;
	mesh.fadeIn = minToMaxfadeIn;
	mesh.fadeOut = maxToMinfadeOut;
	networkWorld.add(mesh);
  mesh.rad = 0;
	mesh.update = function(delta) {
    this.rad += delta;
    this.rotation.x = Math.sin(this.rad) / 6;
		//this.rotation.x += delta;
	}
	objects.push(mesh);
	var networkBox = mesh;

	networkWorld.moveToLeft = function(speed) {
		var container = this;
		var tween = new TWEEN.Tween(container.position)
		.to({x: -240, y: -300, z: -550}, speed)
		.onComplete(function(e) {
			container.theta = 0;
			container.update = function(delta) {
				container.theta += delta;
				container.rotation.set(
					container.rotation.x,
					Math.PI / 12 * Math.sin(container.theta),
					container.rotation.z
				);
			}
			objects.push(container);
		})
		.start();

		var tween = new TWEEN.Tween(cnnPanel.position)
		.to({x: -100, y: cnnPanel.position.y + 30}, speed)
		.start();
	}

	networkWorld.moveToBack = function(speed) {
		var container = this;
		var tween = new TWEEN.Tween(container.position)
		.to({x: 0, y: -75, z: -93}, 600)
		.start().onComplete(function() {
			//console.log(container.position)
		});
	}


	networkWorld.fadeOutNetwork = function(speed) {
		networkBox.fadeOut();
		errorPanel.fadeOutPanel();
		neuronPanel.fadeOutPanel();
		forwardPanel.fadeOutPanel();
		renewPanel.fadeOutPanel();
		for(var i = 0; i < layers.length; i++) {
			var layer = layers[i];
			layer.fadeOutWithLines(speed);
		}
	}

	networkWorld.fadeOutWorld = function(speed) {
		var container = this;
		container.fadeOutNetwork(speed);
		catPanel.fadeOutAll(speed);
		cnnPanel.fadeOutPanel(speed);

		if(gridHelper.exist) {
			gridHelper.fadeOut(speed);
		}
	}
	networkWorld.fadeInWorld = function(speed) {
		var container = this;
		container.fadeInNetwork(speed);
		catPanel.fadeInAll(speed);
		cnnPanel.fadeInPanel(speed);

		if(gridHelper.exist) {
			gridHelper.fadeIn(speed);
		}
	}

	networkWorld.fadeInNetwork = function(speed) {
		networkBox.fadeIn();
		errorPanel.fadeInPanel();
		neuronPanel.fadeInPanel();
		forwardPanel.fadeInPanel();
		renewPanel.fadeInPanel();
		for(var i = 0; i < layers.length; i++) {
			var layer = layers[i];
			layer.fadeInWithLines(speed);
		}
	}



	// sprite
	var ballTexture = THREE.ImageUtils.loadTexture("assets/textures/ball.png");
	var ballMaterial = new THREE.SpriteMaterial({map: ballTexture, blending: THREE.AdditiveBlending, depthTest: false});

	// red sprite
	var redBallTexture = THREE.ImageUtils.loadTexture("assets/textures/redball.png");
	var redBallMaterial = new THREE.SpriteMaterial({map: redBallTexture, depthTest: false});

	// green sprite
	var greenBallTexture = THREE.ImageUtils.loadTexture("assets/textures/greenball2.png");
	var greenBallMaterial = new THREE.SpriteMaterial({map: greenBallTexture, depthTest: false});

	// line
	var geometry = new THREE.Geometry();
	geometry.vertices.push(new THREE.Vector3( 400, 120, -100)); 
	geometry.vertices.push(new THREE.Vector3( 0, 100, -100) ); 
	var line = new THREE.Line( geometry, new THREE.LineBasicMaterial( { color: 0x5599ff, linewidth: 2} ) );

	// l1
	var layers = [];
	var l1 = new THREE.Mesh();
	l1.position.set(-120, 100, 0);
	l1.interval = 60;
	l1.unitsNum = 4;
	l1.units = [];
	networkWorld.add(l1);
	layers.push(l1);
	l1.fadeOut = fadeOutPanel;

	// l2
	var l2 = new THREE.Mesh();
	l2.position.set(0, 120, 0);
	l2.interval = 70;
	l2.unitsNum = 3;
	l2.units = [];
	networkWorld.add(l2);
	layers.push(l2);

	// l3
	var l3 = new THREE.Mesh();
	l3.position.set(120, 150, 0);
	l3.interval = 80;
	l3.unitsNum = 2;
	l3.units = [];
	networkWorld.add(l3);	
	layers.push(l3);

	// add units to each layer
	for(var i = 0; i < layers.length; i++) {
		var layer = layers[i];
		for(var j = 0; j < layer.unitsNum; j++) {
			var unit = new THREE.Sprite(ballMaterial.clone());
			unit.scale.set(32, 32, 1.0);
			unit.theta = 0;
			unit.visible = false;
			unit.material.opacity = 0;
			unit.offset = (i+1)*Math.PI*2/layers.length;
			unit.update = function(delta) {
				this.theta += 3*delta;
				this.scale.set(Math.sin(this.offset+this.theta) * 4 + 32,Math.sin(this.theta-this.offset) * 4 + 32, 1)
			}
			objects.push(unit);
			unit.position.set(0, layer.interval * j, 0);
			layer.add(unit);
			layer.units.push(unit);

			unit.forwardLines = [];
			unit.backwardLines = [];

			// fadeout
			unit.fadeOut = function(speed) {
				var container = this;
				var tween = new TWEEN.Tween(container.material)
				.to({opacity: 0}, speed)
				.onComplete(function(e) {
					container.visible = false;
				})
				.start();
			}
			// fadeout with lines
			unit.fadeOutWithLines = function(speed) {
				var container = this;
				container.fadeOut(speed);
				for(var i = 0; i < container.backwardLines.length; i++) {
					container.backwardLines[i].fadeOut(speed);
				}				
			}
			// fadein
			unit.fadeIn = function(speed) {
				var container = this;
				container.visible = true;
				var tween = new TWEEN.Tween(container.material)
				.to({opacity: 1}, speed)
				.start();
			}
			// fadeint with lines
			unit.fadeInWithLines = function(speed) {
				var container = this;
				container.fadeIn(speed);
				for(var i = 0; i < container.backwardLines.length; i++) {
					container.backwardLines[i].fadeIn(speed);
				}				
			}
			// extend from previous layer
			unit.extendFromPrevLayer = function(speed) {
				var container = this;
				for(var i = 0; i < container.backwardLines.length; i++) {
					container.backwardLines[i].extend(speed);
				}
			}
			// forward from prev layer
			unit.forwardLoop = false;
			unit.forwardFromPrevLayer = function(speed) {
				var delay = 100;
				var container = this;

				var randomArray = [];
				for(var i = 0; i < container.backwardLines.length; i++) {
					randomArray.push(i);
				}
				shuffle(randomArray);

				for(var i = 0; i < randomArray.length; i++) {
					container.backwardLines[randomArray[i]].forward(speed, delay * i);
				}
				if(container.forwardLoop) {
					var tween = new TWEEN.Tween(container)
					.to({}, speed + delay * container.backwardLines.length)
					.onComplete(function() {
						container.forwardFromPrevLayer(speed);
					})
					.start();
				}
			}
			// backward from next layer
			unit.backwardLoop = false;
			unit.backwardFromNextLayer = function(speed) {
				var delay = 100;
				var container = this;

				var randomArray = [];
				for(var i = 0; i < container.forwardLines.length; i++) {
					randomArray.push(i);
				}
				shuffle(randomArray);

				for(var i = 0; i < randomArray.length; i++) {
					container.forwardLines[randomArray[i]].backward(speed, delay * i);
				}
				if(container.backwardLoop) {
					var tween = new TWEEN.Tween(container)
					.to({}, speed + delay * container.forwardLines.length)
					.onComplete(function() {
						container.backwardFromNextLayer(speed);
					})
					.start();
				}				
			}
		}

		// layer fadein
		layer.fadeIn = function(speed) {
			var container = this;
			for(var i = 0; i < container.unitsNum; i++) {
				container.units[i].fadeIn(speed);
			}
		}
		// layer fadein with lines
		layer.fadeInWithLines = function(speed) {
			var container = this;
			for(var i = 0; i < container.unitsNum; i++) {
				container.units[i].fadeInWithLines(speed);
			}
		}
		// layer fadeout
		layer.fadeOut = function(speed) {
			var container = this;
			for(var i = 0; i < container.unitsNum; i++) {
				container.units[i].fadeOut(speed);
			}
		}
		// layer fadeout with lines
		layer.fadeOutWithLines = function(speed) {
			var container = this;
			for(var i = 0; i < container.unitsNum; i++) {
				container.units[i].fadeOutWithLines(speed);
			}
		}
		// forward all from prev layer
		layer.forwardLoop = false;
		layer.forwardAllFromPrevLayer = function(speed) {
			var delay = speed;
			var container = this;

			var randomArray = [];
			for(var i = 0; i < container.units.length; i++) {
				randomArray.push(i);
			}
			shuffle(randomArray);

			for(var i = 0; i < randomArray.length; i++) {
				(function() {
					var unit = container.units[randomArray[i]];
					var tween = new TWEEN.Tween(container)
					.to({}, delay * i)
					.onComplete(function() {
						unit.forwardFromPrevLayer(speed);
					})
					.start();
				})();
			}

			if(container.forwardLoop) {
				var tween = new TWEEN.Tween(container)
				.to({}, delay * container.units.length + 100 * container.units.length)
				.onComplete(function() {
					container.forwardAllFromPrevLayer(speed);
				})
				.start();
			}
		}

		// backward all from next layer
		layer.backwardLoop = false;
		layer.backwardAllFromNextLayer = function(speed) {
			var delay = speed;
			var container = this;

			var randomArray = [];
			for(var i = 0; i < container.units.length; i++) {
				randomArray.push(i);
			}
			shuffle(randomArray);

			for(var i = 0; i < randomArray.length; i++) {
				(function() {
					var unit = container.units[randomArray[i]];
					var tween = new TWEEN.Tween(container)
					.to({}, delay * i)
					.onComplete(function() {
						unit.backwardFromNextLayer(speed);
					})
					.start();
				})();
			}
			if(container.backwardLoop) {
				var tween = new TWEEN.Tween(container)
				.to({}, delay * container.units.length + 100 * container.units.length)
				.onComplete(function() {
					container.backwardAllFromNextLayer(speed);
				})
				.start();
			}
		}
	}

	// add lines to each units
	for(var i = 0; i < layers.length-1; i++) {
		var layer = layers[i];
		for(var j = 0; j < layer.unitsNum; j++) {
			var nextLayer = layers[i+1];
			for(var k = 0; k < nextLayer.unitsNum; k++) {
				var from = new THREE.Vector3(layer.position.x, layer.position.y+layer.interval*j, 0);
				var to = new THREE.Vector3(nextLayer.position.x, nextLayer.position.y+nextLayer.interval*k, 0);
				var line = generateLine(from, to);

				layer.units[j].forwardLines.push(line);
				nextLayer.units[k].backwardLines.push(line);
				networkWorld.add(line);
			}
		}
	}

	// foward and backward animation
	networkWorld.loopAnimation = false;
	networkWorld.forwardAndBackward = function(speed) {
		var delay = 0;
		var container = networkWorld;

		// l2 backward
		l2.backwardAllFromNextLayer(speed);

		// l1 backward
		delay += speed * l2.units.length + 100 * (l2.units.length);
		var tween = new TWEEN.Tween(container)
		.to({}, delay)
		.onComplete(function() {
			l1.backwardAllFromNextLayer(speed);
		})
		.start();


		// l2 forward
		delay += speed * l1.units.length + 100 * (l1.units.length);
		var tween = new TWEEN.Tween(container)
		.to({}, delay)
		.onComplete(function() {
			l2.forwardAllFromPrevLayer(speed);
		})
		.start();


		// l3 forward
		delay += speed * l2.units.length + 100 * (l2.units.length);
		var tween = new TWEEN.Tween(container)
		.to({}, delay)
		.onComplete(function() {
			l3.forwardAllFromPrevLayer(speed);
		})
		.start();

		if(networkWorld.loopAnimation) {
			delay += speed * l3.units.length + 100 * (l3.units.length);
			var tween = new TWEEN.Tween(container)
			.to({}, delay)
			.onComplete(function() {
				container.forwardAndBackward(speed);
			})
			.start();
		}
	}

	// function to generate line
	function generateLine(from, to, lineWidth, matrixWorld) {
		var neuronScale = 12;
		var world = matrixWorld || networkWorld;
		var geometry = new THREE.Geometry();
		geometry.vertices.push(from); 
		geometry.vertices.push(to);
		var line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x000000, linewidth: lineWidth || 4}));
		line.defaultColor = new THREE.Color(0x5599ff);
		line.visible = false;

		// line thin
		line.thin = function(speed) {
			var container = this;
			var tween = new TWEEN.Tween(container.material)
			.to({linewidth: 2}, speed)
			.start();
		}

		// line forward
		line.forwardNeuron = new THREE.Sprite(redBallMaterial.clone());
		line.forwardNeuron.scale.set(neuronScale, neuronScale, 1.0);
		line.forwardNeuron.visible = false;
		world.add(line.forwardNeuron);
		line.forward = function(speed, delay) {
			var container = this;
			container.forwardNeuron.position.set(
				container.geometry.vertices[0].x,
				container.geometry.vertices[0].y,
				container.geometry.vertices[0].z
			);
			container.forwardNeuron.material.opacity = 1;
			container.forwardNeuron.visible = true;
			var tween = new TWEEN.Tween(container.forwardNeuron.position)
			.to({
				x: container.geometry.vertices[1].x,
				y: container.geometry.vertices[1].y,
				z: container.geometry.vertices[1].z
			}, speed)
			.onComplete(function(e) {
				container.forwardNeuron.visible = false;
			})
			.delay(delay || 100)
			.start();
		}

		// line backward
		line.backwardNeuron = new THREE.Sprite(greenBallMaterial.clone());
		line.backwardNeuron.scale.set(neuronScale, neuronScale, 1.0);
		line.backwardNeuron.visible = false;
		world.add(line.backwardNeuron);
		line.backward = function(speed, delay) {
			var container = this;
			container.backwardNeuron.position.set(
				container.geometry.vertices[1].x,
				container.geometry.vertices[1].y,
				container.geometry.vertices[1].z
			);
			container.backwardNeuron.material.opacity = 1;
			container.backwardNeuron.visible = true;
			var tween = new TWEEN.Tween(container.backwardNeuron.position)
			.to({
				x: container.geometry.vertices[0].x,
				y: container.geometry.vertices[0].y,
				z: container.geometry.vertices[0].z
			}, speed)
			.delay(delay || 100)
			.onComplete(function(e) {
				container.backwardNeuron.visible = false;
			})
			.start();
		}

		// extend to goal
		line.extend = function(speed) {
			var container = this;
			var goal = container.geometry.vertices[1].clone();
			container.geometry.vertices[1].set(
				container.geometry.vertices[0].x,
				container.geometry.vertices[0].y,
				container.geometry.vertices[0].z
			);
			container.geometry.verticesNeedUpdate = true;
			container.visible = true;
			var tween = new TWEEN.Tween(container.geometry.vertices[1])
			.to({x: goal.x, y: goal.y, z: goal.z}, speed)
			.onUpdate(function(e) {
				container.geometry.verticesNeedUpdate = true
			})
			.start();
		}

		// fadeout
		line.fadeOut = function(speed) {
			var container = this;
			var tween = new TWEEN.Tween(container.material.color)
			.to({r: 0, g: 0, b:0}, speed)
			.onComplete(function(e) {
				container.visible = false;
			})
			.start();

			// backward neuron
			var tween = new TWEEN.Tween(container.backwardNeuron.scale)
			.to({x: 0.001, y: 0.001}, speed)
			.start();

			// forward neuron
			var tween = new TWEEN.Tween(container.forwardNeuron.scale)
			.to({x: 0.001, y: 0.001}, speed)
			.start();
		}

		// fadein
		line.fadeIn = function(speed) {
			var container = this;
			container.visible = true;
			var tween = new TWEEN.Tween(container.material.color)
			.to({r: container.defaultColor.r, g: container.defaultColor.g, b: container.defaultColor.b}, speed)
			.start();

			// backward neuron
			var tween = new TWEEN.Tween(container.backwardNeuron.scale)
			.to({x: neuronScale, y: neuronScale}, speed)
			.start();

			// forward neuron
			var tween = new TWEEN.Tween(container.forwardNeuron.scale)
			.to({x: neuronScale, y: neuronScale}, speed)
			.start();
		}

		return line;
	}


	// grid helper
	var gridHelper = new THREE.GridHelper(100, 25, 25);
	gridHelper.material.color = new THREE.Color(0x77ff77);
	gridHelper.baseColor = new THREE.Color(0x77ff77);
	gridHelper.baseColor = gridHelper.material.color.clone();
	gridHelper.material.linewidth = 3;
	gridHelper.visible = false;
	gridHelper.exist = false;
	objects.push(gridHelper);
	networkWorld.add(gridHelper);

	gridHelper.rotateX(Math.PI/2);
	gridHelper.position = new THREE.Vector3(0, 370, 350);

	var geometry = new THREE.PlaneGeometry( 75, 75, 32 );
	var material = new THREE.MeshPhongMaterial( { side: THREE.DoubleSide, opacity: 0.1, emissive: 0x992200} );
	var planeWindow = new THREE.Mesh(geometry, material);
	planeWindow.position.set(-62.5, 0, -62.5);
	planeWindow.basePosition = planeWindow.position.clone();
	planeWindow.visible = false;
	planeWindow.interval = 0;
	planeWindow.exist = false;

	function updateWindow(delta) {
		var scope = this;
		scope.interval += delta*10;

		scope.position.x = scope.basePosition.x + parseInt(scope.interval) % 6 * 25;
		scope.position.z = scope.basePosition.z + parseInt(scope.interval % 36 / 6) * 25;
	}
	planeWindow.rotateX(-Math.PI / 2)
	gridHelper.add(planeWindow)

	gridHelper.fadeOut = function(speed) {
		speed = speed || 500;
		var scope = this;

		planeWindow.visible = false;
		var tween = new TWEEN.Tween(scope.material.color)
		.to({r: 0, g: 0, b: 0}, speed)
		.onComplete(function() {
			scope.visible = false;
		})
		.start();		
	}
	gridHelper.fadeIn = function(speed) {
		speed = speed || 500;
		var scope = this;

		scope.material.color.set(0x000000);
		scope.visible = true;
		var tween = new TWEEN.Tween(scope.material.color)
		.to({r: scope.baseColor.r, g: scope.baseColor.g, b: scope.baseColor.b}, speed)
		.onComplete(function() {
			if(planeWindow.exist) {
				planeWindow.visible = true;
			}
		})
		.start();		
	}

	// convlayer text
  var convlayerTextPanel = generateSubPanel(
    "assets/textures/convlayertext.png",
    150, 30,
    new THREE.Vector3(105, 310, 0),
    objects, glowScene
  );
  convlayerTextPanel.material.emissive.set(0x555555);
  convlayerTextPanel.material.opacity = 0.0;
  convlayerTextPanel.maxOpacity = 0.7;

	// convlayer
  var convlayerPanel = generateSubPanel(
    "assets/textures/convlayer.png",
    150, 30,
    new THREE.Vector3(-105, 310, 0),
    objects, glowScene
  );
  convlayerPanel.material.emissive.set(0x555555);
  convlayerPanel.material.opacity = 0.0;
  convlayerPanel.maxOpacity = 0.7;

  // cat panel
  var catPanel = generateSubPanel(
    "assets/textures/mycat.png",
    235, 220,
    new THREE.Vector3(0, 350, 300),
    objects, glowScene
  );
  catPanel.material.emissive.set(0x333333);
  catPanel.material.opacity = 0.0;
  catPanel.maxOpacity = 0.7;
	catPanel.move = function(speed) {
		var container = this;
		var tween = new TWEEN.Tween(container.position)
		.to({x: -440, y: 220, z: 0}, speed)
		.start();

		var tween = new TWEEN.Tween(container.rotation)
		.to({y: Math.PI / 2}, speed)
		.start();
	}
	catPanel.fromUnits = [];
	catPanel.toUnits = [];
	catPanel.lines = [];
	networkWorld.add(catPanel);
	catPanel.showFromUnits = function(speed) {
		var container = this;
		for(var i = 0; i < container.fromUnits.length; i++) {
			(function() {
				var unit = container.fromUnits[i];
				var delay = speed * i;
				var tween = new TWEEN.Tween(unit)
				.to({}, delay)
				.onComplete(function(e) {
					unit.material.opacity = 1.0;
					unit.visible = true;
				})
				.start();
			})();
		}
	}
	catPanel.extendLines = function(speed) {
		var container = this;
		for(var i = 0; i < container.lines.length; i++) {
			var line = container.lines[i];
			line.fadeIn(100);
			line.extend(speed);
		}
	}
	catPanel.showToUnits = function(speed) {
		var container = this;
		for(var i = 0; i < container.toUnits.length; i++) {
			var unit = container.toUnits[i];
			unit.fadeIn(speed);
		}
	}

	// forward all lines
	catPanel.loopAnimation = false;
	catPanel.forwardAll = function(speed) {
		var delay = 50;
		var container = this;

		var randomArray = [];
		for(var i = 0; i < container.lines.length; i++) {
			randomArray.push(i);
		}
		shuffle(randomArray);

		for(var i = 0; i < randomArray.length; i++) {
			(function() {
				var line = container.lines[randomArray[i]];
				var tween = new TWEEN.Tween(container)
				.to({}, delay * i)
				.onComplete(function() {
					line.forward(speed);
				})
				.start();
			})();
		}

		if(container.loopAnimation) {
			var tween = new TWEEN.Tween(container)
			.to({}, delay * container.lines.length + speed)
			.onComplete(function() {
				container.forwardAll(speed);
			})
			.start();
		}
	}

	catPanel.fadeInAll = function(speed) {
		var container = this;
		for(var i = 0; i < container.fromUnits.length; i++) {
			container.fromUnits[i].fadeIn(speed);
		}
		for(var i = 0; i < container.toUnits.length; i++) {
			container.toUnits[i].fadeIn(speed);
		}
		for(var i = 0; i < container.lines.length; i++) {
			container.lines[i].fadeIn(speed);
		}
	}
	catPanel.fadeOutAll = function(speed) {
		var container = this;
		for(var i = 0; i < container.fromUnits.length; i++) {
			container.fromUnits[i].fadeOut(speed);
		}
		for(var i = 0; i < container.toUnits.length; i++) {
			container.toUnits[i].fadeOut(speed);
		}
		for(var i = 0; i < container.lines.length; i++) {
			container.lines[i].fadeOut(speed);
		}
	}

	// units
	var deltaWidth = parseInt(catPanel.geometry.width * 0.8 / 3);
	var deltaHeight = parseInt(catPanel.geometry.height * 0.8 / 3);
	for(var i = 0; i < 4; i++) {
		for(var j = 0; j < 4; j++) {
			// unit
			var unit = new THREE.Sprite(ballMaterial.clone());
			unit.scale.set(22, 22, 1.0);
			unit.visible = false;
			unit.material.opacity = 0.6;
			unit.position.set(-deltaWidth*1.5 + j*deltaWidth, deltaHeight*1.5 - i*deltaHeight, 0);
			unit.minOpacity = 0;
			unit.maxOpacity = 0.6;
			unit.fadeIn = minToMaxfadeIn;
			unit.fadeOut = maxToMinfadeOut;

			catPanel.add(unit);
			catPanel.fromUnits.push(unit);

			// nextUnit
			var nextUnit = new THREE.Sprite(ballMaterial.clone());
			nextUnit.scale.set(22, 22, 1.0);
			nextUnit.visible = true;
			nextUnit.material.opacity = 0.0;
			nextUnit.visible = false;
			nextUnit.position.set(unit.position.x * 0.5, unit.position.y * 0.5 - 35, 200);
			nextUnit.minOpacity = 0;
			nextUnit.maxOpacity = 0.3;
			nextUnit.fadeIn = minToMaxfadeIn;
			nextUnit.fadeOut = maxToMinfadeOut;
			catPanel.add(nextUnit);
			catPanel.toUnits.push(nextUnit);

			// line
			var line = generateLine(unit.position, nextUnit.position, 2, catPanel);
			catPanel.add(line);
			catPanel.lines.push(line);
			//line.fadeIn(100);
		}
	}
	unit.forwardLines = [];

	// deep panel
  var deepPanel = generateTitlePanel(
    "assets/textures/deep.png",
    260, 60,
    new THREE.Vector3(-80, 295, 0),
    objects, glowScene
  );

  var deep1Panel = generateSubPanel(
    "assets/textures/sinaps3.png",
    175, 140,
    new THREE.Vector3(120, 130, 0),
    objects, glowScene
  );
  deep1Panel.material.emissive.set(0x668877);
	deep1Panel.show = generalScaleUp;
	deep1Panel.close = maxToMinfadeOut;
	deep1Panel.theta = 0;
	deep1Panel.update = function(delta) {
		this.theta += 3*delta;
		this.scale.set(1 + Math.sin(this.theta + Math.PI / 5 * 3) * 0.05, 1.05 + Math.sin(this.theta) * 0.05, 1)
	}
  deep1Panel.forwardTo = new THREE.Vector3(0, 200, 80);
	deep1Panel.backwardTo = new THREE.Vector3(120, 130, 0);
	deep1Panel.forwardPanel = generalForward;
	deep1Panel.backwardPanel = generalBackward;

  var deep2Panel = generateSubPanel(
    "assets/textures/deep2.png",
    175, 26,
    new THREE.Vector3(110, 245, 0),
    objects, glowScene
  );
  var deep3Panel = generateSubPanel(
    "assets/textures/deep3.png",
    175, 26,
    new THREE.Vector3(110, 245, 0),
    objects, glowScene
  );
  var deep4Panel = generateSubPanel(
    "assets/textures/deep4.png",
    175, 26,
    new THREE.Vector3(110, 245, 0),
    objects, glowScene
  );
  var deep6Panel = generateSubPanel(
    "assets/textures/deep6.png",
    175, 26,
    new THREE.Vector3(110, 245, 0),
    objects, glowScene
  );
  var deep7Panel = generateSubPanel(
    "assets/textures/deep7.png",
    175, 26,
    new THREE.Vector3(110, 215, 0),
    objects, glowScene
  );
  var convPanel = generateTitlePanel(
    "assets/textures/conv.png",
    260, 60,
    new THREE.Vector3(-80, 295, 0),
    objects, glowScene
  );
  var conv1Panel = generateSubPanel(
    "assets/textures/classification.png",
    180, 26,
    new THREE.Vector3(110, 235, 0),
    objects, glowScene
  );
  var conv2Panel = generateSubPanel(
    "assets/textures/extract_feature.png",
    175, 26,
    new THREE.Vector3(110, 235, 0),
    objects, glowScene
  );
  var cvbasePanel = generateSubPanel(
    "assets/textures/cvbase.png",
    175, 26,
    new THREE.Vector3(110, 235, 0),
    objects, glowScene
  );
  var neuronPanel = generateSubPanel(
    "assets/textures/neuron.png",
    155, 40,
    new THREE.Vector3(-210, 255, 0),
    objects, glowScene
  );
	networkWorld.add(neuronPanel);

  var dnnPanel = generateSubPanel(
    "assets/textures/dnn.png",
    600, 60,
    new THREE.Vector3(0, 365, 0),
    objects, glowScene
  );
	networkWorld.add(dnnPanel);

  var cnnPanel = generateSubPanel(
    "assets/textures/convolution.png",
    700, 58,
    new THREE.Vector3(30, 365, 0),
    objects, glowScene
  );
	networkWorld.add(cnnPanel);

  var forwardPanel = generateSubPanel(
    "assets/textures/forward.png",
    165, 60,
    new THREE.Vector3(-210, 145, 0),
    objects, glowScene
  );
  forwardPanel.material.opacity = 0.0;
  forwardPanel.maxOpacity = 0.8;
	forwardPanel.rotateAngle = 0;
	forwardPanel.cycle = 0;
	forwardPanel.update = shakePanel;
	networkWorld.add(forwardPanel);

  var errorPanel = generateSubPanel(
    "assets/textures/error.png",
    165, 42,
    new THREE.Vector3(200, 195, 0),
    objects, glowScene
  );
  errorPanel.maxOpacity = 0.8;
  errorPanel.material.opacity = 0.0;
	networkWorld.add(errorPanel);
	errorPanel.rotateAngle = 0;
	errorPanel.cycle = 0;
	errorPanel.update = shakePanel;

  var renewPanel = generateSubPanel(
    "assets/textures/renew.png",
    220, 25,
    new THREE.Vector3(160, 105, 0),
    objects, glowScene
  );
  renewPanel.maxOpacity = 0.8;
  renewPanel.material.opacity = 0.0;
	renewPanel.rotateAngle = 0;
	renewPanel.cycle = 0;
	renewPanel.update = shakePanel;
	networkWorld.add(renewPanel);

	// cat text
  var catTextPanel = generateSubPanel(
    "assets/textures/cattext.png",
    245, 92,
    new THREE.Vector3(470, 295, 0),
    objects, scene
  );
  catTextPanel.maxOpacity = 0.8;
  catTextPanel.material.opacity = 0.0;
  catTextPanel.material.emissive.set(0x222222);
	catTextPanel.rotateAngle = 0;
	catTextPanel.cycle = 0;
	catTextPanel.update = shakePanel;
	catTextPanel.changeColor = function(speed) {
		var container = this;
		var tween = new TWEEN.Tween(container.material.emissive)
		.to({r: 255/255, g: 102/255, b: 153/255}, speed) //0xff6699
		.start();
	}
	networkWorld.add(catTextPanel);

	// dog text
  var dogTextPanel = generateSubPanel(
    "assets/textures/dogtext.png",
    245, 100,
    new THREE.Vector3(470, 120, 0),
    objects, scene
  );
  dogTextPanel.maxOpacity = 0.8;
  dogTextPanel.material.opacity = 0.0;
  dogTextPanel.material.emissive.set(0x222222);
	dogTextPanel.rotateAngle = 0;
	dogTextPanel.cycle = 0;
	dogTextPanel.update = shakePanel;
	networkWorld.add(dogTextPanel);

  var detectionProcessPanel = null;
  var detectionTaskPanel = generateTitlePanel(
    "assets/textures/detection_task.png",
    260, 60,
    new THREE.Vector3(-80, 295, 0),
    objects, glowScene
  );
  var detectionTask1Panel = generateSubPanel(
    "assets/textures/detection_task1.png",
    175, 26,
    new THREE.Vector3(110, 235, 0),
    objects, glowScene
  );

	/***************************/
	// Animations definition
	/***************************/
	var animations = [
		// closeup title
		function() {
			animationState = AnimationState.Animating;
			var scope = titlePanel;		

			// title1
			titlePanel.position.set(0, 280, -2000);
			titlePanel.visible = true;
			titlePanel.cycle = 0;
			// closeup title
			var tween = new TWEEN.Tween(titlePanel.position)
			.to({x: 0, y: 280, z: -10}, 1000)
			.easing(TWEEN.Easing.Linear.None)
			.onComplete(function() {
				animationState = AnimationState.None;				
				
				titlePanel.update = function(delta) {
					this.cycle += delta;
					this.rotation.x = Math.sin(this.cycle)/13;
					this.rotation.y = Math.sin(this.cycle)/11;
				}
			})
			.start();


			// play fox music
			foxMusic = new AudioNode({
				src: "assets/musics/pixta.mp3",
				loop: "loop",
				preload: "auto",
				maxVolume: 0.5,
				minVolume: 0.2,
			});
			document.body.appendChild(foxMusic);
			foxMusic.currentTime = 0;
			foxMusic.play();
			var tween = new TWEEN.Tween(foxMusic)
			.to({volume: 0.3}, 500)
			.easing(TWEEN.Easing.Linear.None)
			.start().onComplete(function() {
			});

			// auto animation
			var tween = new TWEEN.Tween(this)
			.to({}, 1400)
			.easing(TWEEN.Easing.Linear.None)
			.start().onComplete(function() {
				nextAnimation.dispatch();
				var tween = new TWEEN.Tween(this)
				.to({}, 400)
				.easing(TWEEN.Easing.Linear.None)
				.start().onComplete(function() {
					nextAnimation.dispatch();
					animationState = AnimationState.None;

					var tween = new TWEEN.Tween(this)
					.to({}, 400)
					.easing(TWEEN.Easing.Linear.None)
					.start().onComplete(function() {
						nextAnimation.dispatch();
						animationState = AnimationState.None;
					});
					
				});
			});

		},
		// show team name
		function() {
			animationState = AnimationState.Animating;
			var scope = companyPanel;

			// open university plate
			var insertDistance = 500;
			scope.rotation.y = scope.rotateAngle;
			scope.position.x = scope.basePosition.x - insertDistance * Math.cos(scope.rotateAngle);
			scope.position.z = scope.basePosition.z + insertDistance * Math.sin(scope.rotateAngle);
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
				this.rotation.y = this.rotateAngle + Math.sin(this.cycle)/11;
			}			
		},
		// show partner name
		function() {
			animationState = AnimationState.Animating;
			var scope = namePanel;

			// open maplee plate
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
		},
		// show lee name
		function() {
			var scope = emailPanel;

			// open lee plate
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
		},
		function() {
			// stop music
			var tween = new TWEEN.Tween(foxMusic)
			.to({volume: 0.0}, 500)
			.easing(TWEEN.Easing.Linear.None)
			.start().onComplete(function() {
				foxMusic.pause();
			});

			// close panels
			emailPanel.update = null;
			titlePanel.update = null;
			companyPanel.update = null;

			var tween = new TWEEN.Tween(namePanel.position)
			.to({y: namePanel.position.y - 400}, 400)
			.easing(TWEEN.Easing.Cubic.In)
			.start().onComplete(function() {
				namePanel.visible = false;
			});

			var tween = new TWEEN.Tween(emailPanel.position)
			.to({y: emailPanel.position.y - 400}, 400)
			.easing(TWEEN.Easing.Cubic.In)
			.start().onComplete(function() {
				emailPanel.visible = false;
			});			
			var tween = new TWEEN.Tween(companyPanel.position)
			.to({y: companyPanel.position.y - 400}, 400)
			.easing(TWEEN.Easing.Cubic.In)
			.start().onComplete(function() {
				companyPanel.visible = false;
			});			
			var tween = new TWEEN.Tween(titlePanel.position)
			.to({y: titlePanel.position.y + 400}, 400)
			.easing(TWEEN.Easing.Cubic.In)
			.start().onComplete(function() {
				titlePanel.visible = false;
				animationState = AnimationState.None;
			});

		},
		// turn on self introduction
		function() {
			introPanel.openPanel();
			waitAnimation(100);
		},
		function() {
			photoPanel.scaleUp();
			waitAnimation(600);
		},
		function() {
			intro1Panel.show();
		},
		function() {
			intro2Panel.show();
		},
		function() {
			intro3Panel.show();
		},
		function() {
			intro4Panel.show();
		},
		function() {
			introPanel.closePanel();
      photoPanel.scaleDown();
			intro1Panel.close();
			intro2Panel.close();
			intro3Panel.close();
			intro4Panel.close();
			checkNextAnimation();
		},
		function() {
			stPanel.openPanel();
		},
		function() {
      st1Panel.show();
		},
		function() {
      st2Panel.show();
		},
		function() {
      st3Panel.show();
		},
    function() {
      comparedSimulatorPanel = generateVideo(
        "assets/videos/sensor_action.webm",
        370, 225,
        new THREE.Vector3(0, 200, 25),
        new THREE.Vector3(-100, 160, 0),
        objects, glowScene, camera
      );
			comparedSimulatorPanel.openPanel();
    },
		function() {
			skydome.weakenLight(300);			
			comparedSimulatorPanel.forwardPanel(0.0000001);
		},
		function() {
			skydome.strengthenLight(300);
			comparedSimulatorPanel.backwardPanel();
		},
		function() {
			stPanel.closePanel();
			st1Panel.close();
			st2Panel.close();
			st3Panel.close();
			comparedSimulatorPanel.closePanel(objects, glowScene);
		},

    // company intro
		function() {
			companyIntroPanel.openPanel();
		},
		function() {
      companyIntro1Panel.show();
		},
		function() {
      rotateSwitchPanel(companyIntro1Panel, companyIntro2Panel, 800);
      waitAnimation(500)
			var tween = new TWEEN.Tween(companyIntro2Panel)
			.to({}, 600)
			.onComplete(function(e) {
        nextAnimation.dispatch();
			})
      .start();
		},
    function() {
      deulPanel = generateVideo(
        "assets/videos/deul2.mp4",
        345, 210,
        new THREE.Vector3(0, 200, 25),
        new THREE.Vector3(-100, 208, 0),
        objects, glowScene, camera
      );
      deulPanel.update = function(delta) {
        this.material.emissive.r = 0.3;
        this.material.emissive.g = 0.3;
        this.material.emissive.b = 0.3;
        this.videoObj.update(camera);
      }
			deulPanel.openPanel();
			var tween = new TWEEN.Tween(deulPanel)
			.to({}, 700)
			.onComplete(function(e) {
        nextAnimation.dispatch();
			})
      .start();
    },
    function() {
      oseroniaPanel = generateVideo(
        "assets/videos/oseronia2.mp4",
        345, 210,
        new THREE.Vector3(0, 200, 25),
        new THREE.Vector3(-100, 95, 0),
        objects, glowScene, camera
      );
      oseroniaPanel.update = function(delta) {
        this.material.emissive.r = 0.26;
        this.material.emissive.g = 0.26;
        this.material.emissive.b = 0.26;
        this.videoObj.update(camera);
      }
			oseroniaPanel.openPanel();
			var tween = new TWEEN.Tween(oseroniaPanel)
			.to({}, 700)
			.onComplete(function(e) {
        nextAnimation.dispatch();
			})
      .start();
    },
    function() {
      sentamaPanel = generateVideo(
        "assets/videos/sentama2.mp4",
        345, 210,
        new THREE.Vector3(0, 200, 25),
        new THREE.Vector3(100, 95, 0),
        objects, glowScene, camera
      );
			sentamaPanel.openPanel();
    },
		function() {
			deulPanel.closePanel(objects, glowScene);
			oseroniaPanel.closePanel(objects, glowScene);
			sentamaPanel.closePanel(objects, glowScene);
      companyIntroEntamePanel.show();
			var tween = new TWEEN.Tween(oseroniaPanel)
			.to({}, 500)
			.onComplete(function(e) {
        nextAnimation.dispatch();
			})
      .start();
		},
    function() {
      hackerdollPanel = generateVideo(
        "assets/videos/hackerdoll.mp4",
        345, 210,
        new THREE.Vector3(0, 200, 25),
        new THREE.Vector3(-100, 208, 0),
        objects, glowScene, camera
      );
      hackerdollPanel.update = function(delta) {
        this.material.emissive.r = 0.2;
        this.material.emissive.g = 0.2;
        this.material.emissive.b = 0.2;
        this.videoObj.update(camera);
      }
			hackerdollPanel.openPanel();
    },
		function() {
      companyIntro3Panel.show();
		},
		function() {
      companyIntro4Panel.show();
			var tween = new TWEEN.Tween(oseroniaPanel)
			.to({}, 500)
			.onComplete(function(e) {
        nextAnimation.dispatch();
			})
      .start();
		},
    function() {
      baystarsPanel = generateVideo(
        "assets/videos/yokohama.mp4",
        340, 200,
        new THREE.Vector3(0, 200, 25),
        new THREE.Vector3(-100, 95, 0),
        objects, glowScene, camera
      );
      baystarsPanel.update = function(delta) {
        this.material.emissive.r = 0.25;
        this.material.emissive.g = 0.25;
        this.material.emissive.b = 0.25;
        this.videoObj.update(camera);
      }
			baystarsPanel.openPanel();
    },
		function() {
      companyIntro5Panel.show();
			hackerdollPanel.closePanel(objects, glowScene);
			var tween = new TWEEN.Tween(hackerdollPanel)
			.to({}, 500)
			.onComplete(function(e) {
        nextAnimation.dispatch();
			})
      .start();
		},
    function() {
      robonekoPanel = generateVideo(
        "assets/videos/roboneko.mp4",
        340, 200,
        new THREE.Vector3(0, 200, 25),
        new THREE.Vector3(-100, 200, 0),
        objects, glowScene, camera
      );
      robonekoPanel.update = function(delta) {
        this.material.emissive.r = 0.3;
        this.material.emissive.g = 0.3;
        this.material.emissive.b = 0.3;
        this.videoObj.update(camera);
      }
			robonekoPanel.openPanel();
      robonekoCopyrightPanel.fadeInPanel();
    },
		function() {
			robonekoPanel.closePanel(objects, glowScene);
			baystarsPanel.closePanel(objects, glowScene);
			companyIntroPanel.closePanel();
			companyIntroEntamePanel.close();
			companyIntro2Panel.close();
			companyIntro3Panel.close();
			companyIntro4Panel.close();
			companyIntro5Panel.close();
      robonekoCopyrightPanel.fadeOutPanel();
    },
		function() {
			denaAIPanel.openPanel();
		},
		function() {
			denaAISitePanel.show();
		},
		function() {
			denaAIGamePanel.show();
		},
    function() {
      oseroniaPanel = generateVideo(
        "assets/videos/oseronia2.mp4",
        380, 225,
        new THREE.Vector3(0, 200, 25),
        new THREE.Vector3(-100, 160, 0),
        objects, glowScene, camera
      );
      oseroniaPanel.update = function(delta) {
        this.material.emissive.r = 0.26;
        this.material.emissive.g = 0.26;
        this.material.emissive.b = 0.26;
        this.videoObj.update(camera);
      }
			oseroniaPanel.openPanel();
    },
		function() {
      oseroniaPanel.forwardPanel(0.0000001);
		},
		function() {
      oseroniaPanel.backwardPanel(0.0000001);
		},
		function() {
			denaAIGame1Panel.show();
		},
		function() {
			denaAIGame2Panel.show();
		},
		function() {
			denaAIGame3Panel.show();
		},
    function() {
      rotateSwitchPanel(denaAIGamePanel, denaAIAutoPanel, 800);
      oseroniaPanel.closePanel(objects, glowScene);
      denaAIGame1Panel.rotateClose(500);
      denaAIGame2Panel.rotateClose(500);
      denaAIGame3Panel.rotateClose(500);
    },
    function() {
      robonekoPanel = generateVideo(
        "assets/videos/roboneko.mp4",
        380, 225,
        new THREE.Vector3(0, 200, 25),
        new THREE.Vector3(-100, 160, 0),
        objects, glowScene, camera
      );
      robonekoPanel.update = function(delta) {
        this.material.emissive.r = 0.3;
        this.material.emissive.g = 0.3;
        this.material.emissive.b = 0.3;
        this.videoObj.update(camera);
      }
			robonekoPanel.openPanel();
      robonekoCopyrightPanel.position.y = 222;
      robonekoCopyrightPanel.fadeInPanel();
    },
		function() {
      robonekoPanel.forwardPanel(0.0000001);
		},
		function() {
      robonekoPanel.backwardPanel(0.0000001);
		},
		function() {
			denaAIAuto1Panel.show();
		},
		function() {
			denaAIAuto2Panel.show();
		},
    function() {
      rotateSwitchPanel(denaAIAutoPanel, denaAIShopPanel, 800);
      robonekoPanel.closePanel(objects, glowScene);
      denaAIAuto1Panel.rotateClose(500);
      denaAIAuto2Panel.rotateClose(500);
      robonekoCopyrightPanel.fadeOutPanel();
    },
    function() {
      sakuraCaffePanel = generateVideo(
        "assets/videos/cv_demo_short.mp4",
        380, 225,
        new THREE.Vector3(0, 200, 25),
        new THREE.Vector3(-100, 160, 0),
        objects, glowScene, camera
      );
      sakuraCaffePanel.update = function(delta) {
        this.material.emissive.r = 0.2;
        this.material.emissive.g = 0.2;
        this.material.emissive.b = 0.2;
        this.videoObj.update(camera);
      }
			sakuraCaffePanel.openPanel();
    },
		function() {
      sakuraCaffePanel.forwardPanel(0.01);
		},
		function() {
      sakuraCaffePanel.backwardPanel(0.5);
		},
		function() {
			denaAIShop1Panel.show();
		},
		function() {
			denaAIShop2Panel.show();
		},
		function() {
			denaAIShop3Panel.show();
		},
    function() {
      denaAIPanel.closePanel();
      denaAISitePanel.close();
      denaAIShopPanel.close();
      denaAIShop1Panel.close();
      denaAIShop2Panel.close();
      denaAIShop3Panel.close();
    },

    // smart shop project
		function() {
			smartshopPanel.openPanel();
		},
		function() {
      smartshop1Panel.show();
		},
		function() {
      smartshop2Panel.show();
		},
		function() {
      smartshop3Panel.show();
		},
		function() {
      smartshop4Panel.show();
		},
		function() {
      smartshop5Panel.show();
		},
		function() {
      sakuraCaffePanel.closePanel(objects, glowScene);
			smartshopPanel.closePanel();
			smartshop1Panel.close();
			smartshop2Panel.close();
			smartshop3Panel.close();
			smartshop4Panel.close();
			smartshop5Panel.close();
    },

    // element technology
		function() {
			elementPanel.openPanel();
		},
		function() {
			rotateSwitchPanel(elementPanel, trackPanel, 800);
      waitAnimation(800);
		},
		function() {
      track1Panel.show();
		},
		function() {
      track2Panel.show();
		},
    function() {
      boundingboxPanel = generateVideo(
        "assets/videos/boundingbox.mp4",
        270, 240,
        new THREE.Vector3(0, 200, 25),
        new THREE.Vector3(-100, 160, 0),
        objects, scene, camera
      );
      boundingboxPanel.update = function(delta) {
        this.material.emissive.r = 0.53;
        this.material.emissive.g = 0.53;
        this.material.emissive.b = 0.53;
        this.videoObj.update(camera);
      }
			boundingboxPanel.openPanel();
    },
		function() {
      skydome.weakenLight(300);
      boundingboxPanel.forwardPanel(0.01);
      trackPanel.turnOffLight();
      track1Panel.turnOffLight();
      track2Panel.turnOffLight();
		},
		function() {
      skydome.strengthenLight(300);
      trackPanel.turnOnLight();
      track1Panel.turnOnLight();
      track2Panel.turnOnLight();
      boundingboxPanel.backwardPanel(0.5);
		},
		function() {
      track3Panel.show();
		},
		function() {
      track4Panel.show();
		},
		function() {
      boundingboxPanel.closePanel(objects, scene);
		},
    function() {
			track2Panel.rotateClose(400);
			track3Panel.rotateClose(400);
			track4Panel.rotateClose(400);
      rotateSwitchPanel(track1Panel, track5Panel, 800);
      waitAnimation(800);
    },
    function() {
      poseEstimationPanel = generateVideo(
        "assets/videos/pose_video.mp4",
        360, 260,
        new THREE.Vector3(0, 200, 0),
        new THREE.Vector3(-90, 150, 0),
        objects, scene, camera
      );
      poseEstimationPanel.update = function(delta) {
        this.material.emissive.r = 0.53;
        this.material.emissive.g = 0.53;
        this.material.emissive.b = 0.53;
        this.videoObj.update(camera);
      }
			poseEstimationPanel.openPanel();
    },
		function() {
      poseEstimationPanel.forwardPanel(0.01);
      skydome.weakenLight(300);
      trackPanel.turnOffLight();
      track5Panel.turnOffLight();
		},
		function() {
      trackPanel.turnOnLight();
      track5Panel.turnOnLight();
      skydome.strengthenLight(300);
      poseEstimationPanel.backwardPanel(0.3);
		},
		function() {
      poseEstimationPanel.closePanel(objects, scene);
      track6Panel.show();
		},
    function() {
      reidPanel = generateVideo(
        "assets/videos/reid.mp4",
        220, 293,
        new THREE.Vector3(0, 200, 0),
        new THREE.Vector3(-90, 150, 0),
        objects, scene, camera
      );
      reidPanel.update = function(delta) {
        this.material.emissive.r = 0.53;
        this.material.emissive.g = 0.53;
        this.material.emissive.b = 0.53;
        this.videoObj.update(camera);
      }
			reidPanel.openPanel();
    },
		function() {
      reidPanel.forwardPanel(0.01);
      skydome.weakenLight(300);
      trackPanel.turnOffLight();
      track5Panel.turnOffLight();
      track6Panel.turnOffLight();
		},
		function() {
      trackPanel.turnOnLight();
      track5Panel.turnOnLight();
      track6Panel.turnOnLight();
      skydome.strengthenLight(300);
      reidPanel.backwardPanel(0.3);
		},
		function() {
			trackPanel.closePanel();
			track5Panel.close();
			track6Panel.close();
      reidPanel.closePanel(objects, scene);
    },

    // pose estimation
		function() {
			posePanel.openPanel();
		},
    function() {
			pose0Panel.show();
    },
    function() {
			pose1Panel.show();
    },
    function() {
      skydome.weakenLight(300);
			posePanel.turnOffLight();
			pose0Panel.turnOffLight();
			pose1Panel.turnOffLight();
			poseThesisPanel.scaleUp();
      waitAnimation(400);
    },
    function() {
      skydome.strengthenLight(300);
			posePanel.turnOnLight();
			pose0Panel.turnOnLight();
			pose1Panel.turnOnLight();
			poseThesisPanel.fadeOutPanel();
      waitAnimation(400);
    },
    function() {
			pose0Panel.rotateClose(400);
      rotateSwitchPanel(pose1Panel, pose01Panel, 800);
      waitAnimation(800);
    },
    function() {
			pose02Panel.show();
    },
    function() {
			pose03Panel.show();
    },
    function() {
      pose01Panel.close();
      pose02Panel.close();
      pose03Panel.close();
    },
    function() {
			pose11Panel.show();
    },
    function() {
			pose12Panel.show();
    },
    function() {
      skydome.weakenLight(300);
			poseCodePanel.scaleUp();
			posePanel.turnOffLight();
			pose11Panel.turnOffLight();
			pose12Panel.turnOffLight();
      waitAnimation(500);
    },
		function() {
      skydome.strengthenLight(300);
			poseCodePanel.fadeOutPanel();
			posePanel.turnOnLight();
			pose11Panel.turnOnLight();
			pose12Panel.turnOnLight();
      waitAnimation(500);
    },
    function() {
			pose13Panel.show();
    },
    function() {
			pose12Panel.rotateClose(400);
			pose13Panel.rotateClose(400);
      rotateSwitchPanel(pose11Panel, pose21Panel, 800);
      waitAnimation(800);
    },
    function() {
			pose22Panel.show();
    },

    function() {
      skydome.weakenLight(300);
			poseModelPanel.scaleUp();
			posePanel.turnOffLight();
			pose21Panel.turnOffLight();
			pose22Panel.turnOffLight();
      waitAnimation(500);
    },
		function() {
      skydome.strengthenLight(300);
			poseModelPanel.fadeOutPanel();
			posePanel.turnOnLight();
			pose21Panel.turnOnLight();
			pose22Panel.turnOnLight();
      waitAnimation(500);
    },
    function() {
			pose23Panel.show();
    },

		function() {
      confidenceMapMoviePanel = generateVideo(
        "assets/videos/confidence_map_movie.mp4",
        420, 400,
        new THREE.Vector3(0, 200, 0),
        new THREE.Vector3(0, 200, 50),
        objects, scene, camera
      );
      confidenceMapMoviePanel.update = function(delta) {
        this.material.emissive.r = 0.83;
        this.material.emissive.g = 0.83;
        this.material.emissive.b = 0.83;
        this.videoObj.update(camera);
      }
			confidenceMapMoviePanel.openPanel();
      skydome.weakenLight(300);
			posePanel.turnOffLight();
			pose21Panel.turnOffLight();
			pose22Panel.turnOffLight();
			pose23Panel.turnOffLight();
      waitAnimation(500);
    },
		function() {
      confidenceMapMoviePanel.closePanel(objects, scene);
      skydome.strengthenLight(300);
			posePanel.turnOnLight();
			pose21Panel.turnOnLight();
			pose22Panel.turnOnLight();
			pose23Panel.turnOnLight();
    },
    function() {
			pose24Panel.show();
    },
		function() {
      pafMoviePanel = generateVideo(
        "assets/videos/paf_movie.mp4",
        420, 400,
        new THREE.Vector3(0, 200, 0),
        new THREE.Vector3(0, 200, 50),
        objects, scene, camera
      );
      pafMoviePanel.update = function(delta) {
        this.material.emissive.r = 0.83;
        this.material.emissive.g = 0.83;
        this.material.emissive.b = 0.83;
        this.videoObj.update(camera);
      }
			pafMoviePanel.openPanel();
      skydome.weakenLight(300);
			posePanel.turnOffLight();
			pose21Panel.turnOffLight();
			pose22Panel.turnOffLight();
			pose23Panel.turnOffLight();
			pose24Panel.turnOffLight();
      waitAnimation(500);
    },
		function() {
      pafMoviePanel.closePanel(objects, scene);
      skydome.strengthenLight(300);
			posePanel.turnOnLight();
			pose21Panel.turnOnLight();
			pose22Panel.turnOnLight();
			pose23Panel.turnOnLight();
			pose24Panel.turnOnLight();
      waitAnimation(500);
    },
    function() {
			pose25Panel.show();
    },
    function() {
      skydome.weakenLight(300);
			poseModelPanel.scaleUp();
      poseModelPanel.material.opacity = 0.8;
			posePanel.turnOffLight();
			pose21Panel.turnOffLight();
			pose22Panel.turnOffLight();
			pose23Panel.turnOffLight();
			pose24Panel.turnOffLight();
			pose25Panel.turnOffLight();
      waitAnimation(500);
    },
		function() {
      skydome.strengthenLight(300);
			poseModelPanel.fadeOutPanel();
			posePanel.turnOnLight();
			pose21Panel.turnOnLight();
			pose22Panel.turnOnLight();
			pose23Panel.turnOnLight();
			pose24Panel.turnOnLight();
			pose25Panel.turnOnLight();
      waitAnimation(500);
    },
		function() {
			pose21Panel.close();
			pose22Panel.close();
			pose23Panel.close();
			pose24Panel.close();
			pose25Panel.close();
    },
    function() {
			pose31Panel.show();
    },
    function() {
			pose32Panel.show();
    },
    function() {
      skydome.weakenLight(300);
			gaussianPanel.scaleUp();
			posePanel.turnOffLight();
			pose31Panel.turnOffLight({r:0.001, g:0.001, b:0.001});
			pose32Panel.turnOffLight({r:0.001, g:0.001, b:0.001});
      waitAnimation(500);
    },
		function() {
      skydome.strengthenLight(300);
			gaussianPanel.fadeOutPanel();
			posePanel.turnOnLight();
			pose31Panel.turnOnLight();
			pose32Panel.turnOnLight();
      waitAnimation(500);
    },
    function() {
			pose33Panel.show();
    },
    function() {
      skydome.weakenLight(300);
			pafsPanel.scaleUp();
			posePanel.turnOffLight();
			pose31Panel.turnOffLight({r:0.001, g:0.001, b:0.001});
			pose32Panel.turnOffLight({r:0.001, g:0.001, b:0.001});
			pose33Panel.turnOffLight({r:0.001, g:0.001, b:0.001});
      waitAnimation(500);
    },
		function() {
      skydome.strengthenLight(300);
			pafsPanel.fadeOutPanel();
			posePanel.turnOnLight();
			pose31Panel.turnOnLight();
			pose32Panel.turnOnLight();
			pose33Panel.turnOnLight();
      waitAnimation(500);
    },
    function() {
			pose34Panel.show();
    },
    function() {
      skydome.weakenLight(300);
			greedyPanel.scaleUp();
			posePanel.turnOffLight();
			pose31Panel.turnOffLight({r:0.001, g:0.001, b:0.001});
			pose32Panel.turnOffLight({r:0.001, g:0.001, b:0.001});
			pose33Panel.turnOffLight({r:0.001, g:0.001, b:0.001});
			pose34Panel.turnOffLight({r:0.001, g:0.001, b:0.001});
      waitAnimation(500);
    },
		function() {
      skydome.strengthenLight(300);
			greedyPanel.fadeOutPanel();
			posePanel.turnOnLight();
			pose31Panel.turnOnLight();
			pose32Panel.turnOnLight();
			pose33Panel.turnOnLight();
			pose34Panel.turnOnLight();
      waitAnimation(500);
    },
		function() {
			posePanel.closePanel();
			pose31Panel.close();
			pose32Panel.close();
			pose33Panel.close();
			pose34Panel.close();
    },

		function() {
			resultPanel.openPanel();
		},
    function() {
      sakuraCaffePanel = generateVideo(
        "assets/videos/cv_demo_short.mp4",
        380, 225,
        new THREE.Vector3(0, 200, 25),
        new THREE.Vector3(-100, 160, 0),
        objects, glowScene, camera
      );
      sakuraCaffePanel.update = function(delta) {
        this.material.emissive.r = 0.2;
        this.material.emissive.g = 0.2;
        this.material.emissive.b = 0.2;
        this.videoObj.update(camera);
      }
			sakuraCaffePanel.openPanel();
    },
		function() {
      sakuraCaffePanel.forwardPanel(0.01);
		},
		function() {
      sakuraCaffePanel.backwardPanel(0.5);
		},
    function() {
			result1Panel.show();
    },
    function() {
			result2Panel.show();
    },
    function() {
			result3Panel.show();
    },
    function() {
      resultPanel.closePanel();
      result1Panel.close();
      result2Panel.close();
      result3Panel.close();
      waitAnimation(500);
    },
    function() {
      var tween = new TWEEN.Tween(sakuraCaffePanel.position)
      .to({x: 0, y: 160, z: 60}, 800)
      .easing(TWEEN.Easing.Linear.None)
      .start();
      waitAnimation(500);
    },
	];

	/***********************************/
	// last animation
	/***********************************/
	// final animation
	animations.push(function() {
		animationState = AnimationState.Animating;
		var scope = finalPanel;				
		scope.position.set(0, 280, -1000);
		fadePanel(finalPanel, finalPanel.maxOpacity, 100);
		scope.visible = true;
		scope.cycle = 0;
		scope.update = function(delta) {
			this.cycle += delta;
			this.rotation.x = Math.sin(this.cycle)/13;
			this.rotation.y = Math.sin(this.cycle)/11;
		}
		// closeup title
		var tween = new TWEEN.Tween(scope.position)
		.to({x: 0, y: 325, z: -30}, 600)
		.easing(TWEEN.Easing.Quadratic.InOut)
		.start().onComplete(function() {
			animationState = animationState.None;

			//comparedSimulatorPanel.openPanel();
			//comparedSimulatorPanel.position.set(125, 220, -35);

			//comparedRobotPanel.openPanel();
			//comparedRobotPanel.position.set(125, 95, -35);

		});
	});

	animations.push(function() {

	});

	animations.push(function() {
		fadePanel(finalPanel, 0, 300);
		comparedRobotPanel.closePanel();
		comparedSimulatorPanel.closePanel();
		animationFrameCount -= 1;
		waitAnimation(100);
		checkNextAnimation();
	})

	// check and run next animation
	nextAnimation.add(function() {
		// if no animation, then do next animation
		if(animationState == AnimationState.None) {
			animationState = AnimationState.Animating;
			animations[animationFrameCount]();
			animationFrameCount = animationFrameCount + 1;
			if(animationFrameCount >= animations.length) {
				animationFrameCount = 1;
				animationState = AnimationState.None;
			}
		}
	});


	window.addEventListener("mousedown", function(ev) {
		console.log(animationFrameCount);
		nextAnimation.dispatch();
	}, true);
	window.addEventListener("keypress", function(ev) {
		if(ev.keyCode == 98) { // b
			animationFrameCount = Math.max(animationFrameCount-2, 0);
			nextAnimation.dispatch();
		} else if(ev.keyCode >= 48 && ev.keyCode <= 57) {
			var number = ev.keyCode - 48;
			if(animationBreakPoints[number] != undefined) {
				jumpIndex = animationBreakPoints[number];
				jumpToTargetAnimation();
				console.log("jump target set to " + jumpIndex);
			}

		} else {
			nextAnimation.dispatch();
		}
		console.log(animationFrameCount);
	}, true);

	function jumpToTargetAnimation() {
		if(jumpIndex != null) {
			animationState = AnimationState.None;
			nextAnimation.dispatch();
			var tween = new TWEEN.Tween(jumpIndex)
			.to({}, 800)
			.onComplete(function() {
				jumpToTargetAnimation();
			})
			.start();
		}
	}

	/**************************/
	// Animating
	/**************************/
	// function to wait animation and turn animationState to None
	function waitAnimation(interval) {
		var tween = new TWEEN.Tween(this)
		.to({}, interval)
		.onComplete(function(e) {
			animationState = AnimationState.None;
		})
		.start();	
	}

	function animate() {
		requestAnimationFrame(animate);
		var delta = clock.getDelta();
		render.dispatch(delta);
	}
	animate();
	windowResize.dispatch();
	return container;
}

/***********************/
// Main routine
/***********************/
var viewport = null;
window.addEventListener("load", function() {
	var httpReq = new XMLHttpRequest();
	httpReq.open("GET", "metadata.json", true);
	httpReq.onload = function() {
		var metadata = JSON.parse(this.responseText);
		viewport = new Viewport(metadata);
		document.body.appendChild(viewport);
	}
	httpReq.send();
}, false);


/***********************/
// utility
/***********************/
// shuffle
function shuffle(array) {
  var random = array.map(Math.random);
  array.sort(function(a, b) {
    return random[a] - random[b];
  });
}
