/*********************************/
// class to generate a video texture
/*********************************/
var VideoTexture = function(sourceFile, onloadFunc) {
	if(!sourceFile) {
		return null;
	}

	var videoNode = document.createElement("video");
	videoNode.setAttribute("autoplay", "");
	videoNode.style.display = "none";

	var sourceNode = document.createElement("source");
	sourceNode.setAttribute("src", sourceFile);
	videoNode.appendChild(sourceNode);
	document.body.appendChild(videoNode);

	var canvas = document.createElement("canvas");
	canvas.width = 128;
	canvas.height = 128;

	var canvasContext = canvas.getContext("2d");
	canvasContext.fillStyle = "#000000";
	canvasContext.fillRect(0, 0, 128, 128);

	var texture = new THREE.Texture(canvas);
	texture.minFilter = THREE.LinearFilter;
	texture.magFilter = THREE.LinearFilter;

	texture.videoNode = videoNode;
	texture.sourceNode = sourceNode;
	texture.canvas = canvas;
	texture.canvasContext = canvasContext;
	texture.onLoad = onloadFunc;

	/////////////
	texture.useDistance = false;
	texture.camera = null;
	texture.position = null;
	texture.material = null;

	texture.playRadius = 0;
	texture.minVolRadius = 0;
	texture.maxVolRadius = 0;
	texture.startFadeIn = 0;
	texture.endFadeIn = 0;
	texture.startFadeOut = 0;
	texture.endFadeOut = 0;
	////////////

	// function to update video texture per frame
	texture.update = function(delta) {		
		// use distance
		if(texture.useDistance && texture.camera && texture.position) {
			var distance = texture.position.distanceTo(texture.camera.position);
			// play radius
			if(videoNode.paused && texture.playRadius > distance) {
				videoNode.play();
			} else if(texture.playRadius < distance) {
				videoNode.pause();
			}

			// volume radius
			if(texture.minVolRadius < distance) {
				videoNode.volume = 0;
			} else if(texture.maxVolRadius > distance) {
				videoNode.volume = 1;
			} else {
				videoNode.volume = 1 - ((distance - texture.maxVolRadius) / (texture.minVolRadius - texture.maxVolRadius));
			}

			// fade effect
			texture.material.transparent = true;
			if(texture.startFadeIn < distance) {
				texture.material.opacity = 0;
			} else if(texture.endFadeIn < distance) {
				texture.material.opacity = 1 - ((distance - texture.endFadeIn) / (texture.startFadeIn - texture.endFadeIn));
			} else if(texture.startFadeOut < distance) {
				texture.material.transparent = false;
				texture.material.opacity = 1;
			} else if(texture.endFadeOut < distance) {
				texture.material.opacity = (distance - texture.endFadeOut) / (texture.startFadeOut - texture.endFadeOut);
			} else {
				texture.material.opacity = 0;
			}
		}
		if(videoNode.readyState == videoNode.HAVE_ENOUGH_DATA) {
			canvasContext.drawImage(videoNode, 0, 0);
			texture.needsUpdate = true;
		}
	}

	// function to parse video texture
	texture.pause = function() {
		if(videoNode) {
			videoNode.pause();
		}
	}

	// function to restart video texture
	texture.play = function() {
		if(videoNode) {
			videoNode.play();
		}
	}

	// function to set volume
	texture.setVolume = function(volume) {
		if(videoNode) {	
			videoNode.volume = volume;
		}
	}

	// function to set video current time
	texture.setCurrentTime = function(currentTime) {
		if(videoNode) {
			videoNode.currentTime = currentTime;
		}
	}

	// function to remove video texture
	texture.remove = function() {
		if(document.body.removeChild(videoNode));
	}

	// onload
	videoNode.addEventListener("loadedmetadata", function() {
		var videoWidth = videoNode.videoWidth;
		var videoHeight = videoNode.videoHeight;
		canvas.width = videoWidth;
		canvas.height = videoHeight;
		canvasContext.fillRect(0, 0, videoWidth, videoHeight);
		if(texture.onLoad) {
			texture.onLoad();
		}
	});

	return texture;
}