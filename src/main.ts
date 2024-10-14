import * as BABYLON from '@babylonjs/core'
import { GetTextureArrayFromVideo } from './lib';
import { Shaders } from './shaders';
import { TileShader } from './shaders/Tile';
import { createScene, createScreenQuad } from './scene_setup';
import { GaussianBlur as GaussianBlurShader } from './shaders/gaussian_blur';
import { DisplayImageShader as CopyShader } from './shaders/display_image';
import { SobelShader } from './shaders/sobel';

function updateQuadSize() {
  const aspectRatio = screenWidth / screenHeight;
  const height = 2 * Math.tan(camera.fov / 2);
  const width = height * aspectRatio;
  screenQuad.scaling.x = width;
  screenQuad.scaling.y = height;
};

const onScreenResize = () => {
  screenWidth = e.getRenderWidth();
  screenHeight = e.getRenderHeight();
  updateQuadSize();
}

function cleanUpResources() {
  screenTex.dispose();
  tmpTex1.dispose();
  tmpTex2.dispose();
  for (var texture of videoTextures) texture.dispose();
  console.log("disposing");
  e.dispose();
}

const canvas = document.getElementById("renderCanvas");
const e = new BABYLON.WebGPUEngine(canvas as HTMLCanvasElement);
await e.initAsync();
let screenWidth = e.getRenderWidth();
let screenHeight = e.getRenderHeight();


window.addEventListener('beforeunload', cleanUpResources);

const { scene, camera } = createScene(e, canvas as HTMLCanvasElement);
const {screenQuad, screenMat} = createScreenQuad(camera, scene)
const videoTextures = await GetTextureArrayFromVideo("asd.mp4", e);

let screenTex = BABYLON.RawTexture.CreateRGBAStorageTexture(null, screenWidth, screenHeight, e);
let tmpTex1 = BABYLON.RawTexture.CreateRGBAStorageTexture(null, screenWidth, screenHeight, e);
let tmpTex2 = BABYLON.RawTexture.CreateRGBAStorageTexture(null, screenWidth, screenHeight, e);
let tmpTex3 = BABYLON.RawTexture.CreateRGBAStorageTexture(null, screenWidth, screenHeight, e);
let tmpTex4 = BABYLON.RawTexture.CreateRGBAStorageTexture(null, screenWidth, screenHeight, e);


// shader graph
const shaders = new Shaders(e);
const textureWorkgroupSize = 16;
let workgroupsX = Math.ceil(screenWidth / textureWorkgroupSize);
let workgroupsY = Math.ceil(screenHeight / textureWorkgroupSize);

shaders.clearCompShader.setStorageTexture("texture", screenTex);

const copy = new CopyShader(e, "displayImage");
const gaussianBlur = new GaussianBlurShader(e, "gaussianBlur");
const sobel = new SobelShader(e, "sobelShader");
const tile = new TileShader(e, "tileShader");

copy.setTextures(videoTextures[0], tmpTex1);
gaussianBlur.setTextures(tmpTex1, tmpTex2, tmpTex3);
sobel.setTextures(tmpTex3, tmpTex4);
tile.setTileTextures(tmpTex1, tmpTex2, tmpTex3, tmpTex4);
tile.setDestTexture(screenTex);
screenMat.emissiveTexture = screenTex;


let i = 0;
e.runRenderLoop(function () {
  if (screenWidth !== e.getRenderWidth() || screenHeight !== e.getRenderHeight()) {
    onScreenResize();
  }
  updateQuadSize();

  shaders.clearCompShader.dispatchWhenReady(workgroupsX, workgroupsY, 1);

  
  copy.setTextures(videoTextures[i]);
  copy.go(workgroupsX, workgroupsY, 1);
  gaussianBlur.go(workgroupsX, workgroupsY, 1);
  tile.go(workgroupsX, workgroupsY, 1);
  sobel.go(workgroupsX, workgroupsY, 1);
  scene.render();
  i = (i + 1) % videoTextures.length;
});

