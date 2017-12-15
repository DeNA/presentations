var debug;

/************************/
// Key map
/************************/
var KEYMAP = {
	R: 82,
	S: 83,
	T: 84,
	P: 112,
	V: 118
};

var AnimationState = {
  None: 0,
  Animating: 1
}

var animationState = AnimationState.None;
var animationBreakPoints = [9, 22, 27, 76, 87, 126, 138, 152, 157, 173];
var jumpIndex = null;
var animationFrameCount = 0;
function checkNextAnimation() {
  if(jumpIndex != null) {
    console.log("jump to animation " + jumpIndex);

    // networkWorld adjust
    if(jumpIndex < 32) {
      networkWorld.fadeOutWorld(100);
      arrowController.position.set(490, 220, 0);
      gridHelper.position.set(0, 370, 350);
      gridHelper.material.linewidth = 2;
      gridHelper.scale.set(1, 1, 1);
      gridHelper.rotation.z = 0;
      var tween = new TWEEN.Tween(networkWorld)
      .to({}, 500)
      .onComplete(function() {
        networkWorld.position.set(0, -50, -50);
      })
      .start();
    } else {
      networkWorld.position.set(-240, -300, -550);
      arrowController.position.set(60, 570, 0);
      catPanel.position.set(-440, 220, 0);
      catPanel.rotation.y = (Math.PI / 2);
      gridHelper.position.set(-190, 200, 15)
      gridHelper.material.linewidth = 1;
      gridHelper.scale.set(0.6, 0.6, 0.6);
      gridHelper.rotation.z = -Math.PI / 2;
      dnnPanel.visible = false;
    }

    animationFrameCount = jumpIndex-1;			
    jumpIndex = null;
  }
}

function pushBreakPoint() {
  if(!animationBreakPoints.includes(animationFrameCount)) {
    animationBreakPoints.push(animationFrameCount);
  }
}
