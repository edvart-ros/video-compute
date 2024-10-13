import * as BABYLON from '@babylonjs/core'
import { GetTextureArrayFromVideo } from './lib';
import { Shaders } from './shaders';

const canvas = document.getElementById("renderCanvas");
const e = new BABYLON.WebGPUEngine(canvas as HTMLCanvasElement);
await e.initAsync();

const createScene = function () {
  const scene = new BABYLON.Scene(e);
  const camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 0, -10), scene);
  camera.minZ = 0.8;
  camera.attachControl(canvas, true);
  return { scene: scene, camera: camera };
};

const updateQuadSize = () => {
  const aspectRatio = screenWidth / screenHeight;
  const height = 2 * Math.tan(camera.fov / 2);
  const width = height * aspectRatio;
  screenQuad.scaling.x = width;
  screenQuad.scaling.y = height;
};

const onScreenResize = () => {
  screenWidth = e.getRenderWidth();
  screenHeight = e.getRenderHeight();
  screenTex = BABYLON.RawTexture.CreateRGBAStorageTexture(null, screenWidth, screenHeight, e, false);
  screenMat.emissiveTexture = screenTex;
  updateQuadSize();
}

function cleanUpResources() {
  screenTex.dispose();
  tmpTex1.dispose();
  for (var texture of videoTextures) texture.dispose();
  console.log("disposing");
  e.dispose();
}

window.addEventListener('beforeunload', cleanUpResources);


const { scene, camera } = createScene();

const screenQuad = BABYLON.MeshBuilder.CreatePlane("screenQuad", { size: 1 }, scene);
const screenMat = new BABYLON.StandardMaterial("screenMat", scene);
let screenWidth = e.getRenderWidth();
let screenHeight = e.getRenderHeight();
let screenTex = BABYLON.RawTexture.CreateRGBAStorageTexture(null, screenWidth, screenHeight, e);
let tmpTex1 = BABYLON.RawTexture.CreateRGBAStorageTexture(null, screenWidth, screenHeight, e);
let tmpTex2 = BABYLON.RawTexture.CreateRGBAStorageTexture(null, screenWidth, screenHeight, e);

screenMat.emissiveTexture = screenTex;
screenMat.alpha = 1.0;
screenQuad.material = screenMat;
screenQuad.position = new BABYLON.Vector3(0, 0, 1);
screenQuad.parent = camera;

const shaders = new Shaders(e);

const textureWorkgroupSize = 16;
let workgroupsX = Math.ceil(screenWidth / textureWorkgroupSize);
let workgroupsY = Math.ceil(screenHeight / textureWorkgroupSize);

const videoTextures = await GetTextureArrayFromVideo("asd.mp4", e);

// shader graph
shaders.clearCompShader.setStorageTexture("texture", screenTex);
shaders.displayImageShader.setTexture("src", videoTextures[0], false);
shaders.displayImageShader.setStorageTexture("dest", tmpTex1);
shaders.gaussianBlurXShader.setTexture("src", tmpTex1, false);
shaders.gaussianBlurXShader.setStorageTexture("dest", tmpTex2);
shaders.gaussianBlurYShader.setTexture("src", tmpTex2, false);
shaders.gaussianBlurYShader.setStorageTexture("dest", screenTex);

let i = 0;
e.runRenderLoop(function () {
  if (screenWidth !== e.getRenderWidth() || screenHeight !== e.getRenderHeight()) {
    onScreenResize();
  }
  updateQuadSize();

  shaders.clearCompShader.dispatchWhenReady(workgroupsX, workgroupsY, 1);

  shaders.displayImageShader.setTexture("src", videoTextures[i], false);
  shaders.displayImageShader.dispatchWhenReady(workgroupsX, workgroupsY, 1);
  i = (i + 1) % videoTextures.length;
  
  //shaders.sobelShader.dispatchWhenReady(workgroupsX, workgroupsY, 1);
  shaders.gaussianBlurXShader.dispatchWhenReady(workgroupsX, workgroupsY, 1);
  shaders.gaussianBlurYShader.dispatchWhenReady(workgroupsX, workgroupsY, 1);
  scene.render();
});

