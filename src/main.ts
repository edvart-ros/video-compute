import * as BABYLON from '@babylonjs/core'
import { GetTextureArrayFromVideo } from './lib';
import { TileShader } from './shaders/tile';
import { createScene, createScreenQuad } from './scene_setup';
import { GaussianBlur as GaussianBlurShader } from './shaders/gaussian_blur';
import { DisplayImageShader as CopyShader } from './shaders/display_image';
import { SobelShader } from './shaders/sobel';
import { ClearShader } from './shaders/clear';
import { SubtractShader } from './shaders/subtract';
import dat from 'dat.gui';

function updateQuadSize() {
  const aspectRatio = screenWidth / screenHeight;
  const height = 2 * Math.tan(camera.fov / 2);
  const width = height * aspectRatio;
  screenQuad.scaling.x = width;
  screenQuad.scaling.y = height;
};

function cleanUpResources() {
  for (var frameTex of videoTextures) frameTex.dispose();
  for (var tex of textures) tex.dispose();
  e.dispose();
}

const canvas = document.getElementById("renderCanvas");
const e = new BABYLON.WebGPUEngine(canvas as HTMLCanvasElement);
await e.initAsync();
let screenWidth = e.getRenderWidth();
let screenHeight = e.getRenderHeight();
window.addEventListener('beforeunload', cleanUpResources);

const { scene, camera } = createScene(e, canvas as HTMLCanvasElement);
const { screenQuad, screenMat } = createScreenQuad(camera, scene)
const videoTextures = await GetTextureArrayFromVideo("asd.mp4", e);

let screenTex = BABYLON.RawTexture.CreateRGBAStorageTexture(null, screenWidth, screenHeight, e);
let tmpTex1 = BABYLON.RawTexture.CreateRGBAStorageTexture(null, screenWidth, screenHeight, e);
let tmpTex2 = BABYLON.RawTexture.CreateRGBAStorageTexture(null, screenWidth, screenHeight, e);
let tmpTex3 = BABYLON.RawTexture.CreateRGBAStorageTexture(null, screenWidth, screenHeight, e);
let tmpTex4 = BABYLON.RawTexture.CreateRGBAStorageTexture(null, screenWidth, screenHeight, e);
let tmpTex5 = BABYLON.RawTexture.CreateRGBAStorageTexture(null, screenWidth, screenHeight, e);
let textures = [screenTex, tmpTex1, tmpTex2, tmpTex3, tmpTex4];

// shader graph
const textureWorkgroupSize = 16;
let workgroupsX = Math.ceil(screenWidth / textureWorkgroupSize);
let workgroupsY = Math.ceil(screenHeight / textureWorkgroupSize);

const clear = new ClearShader(e, "clear");
const copy = new CopyShader(e, "displayImage");
const gaussianBlur = new GaussianBlurShader(e, "gaussianBlur");
const sobel = new SobelShader(e, "sobelShader");
const subtract = new SubtractShader(e, "subtractShader");
const tile = new TileShader(e, "tileShader");

clear.setTexture(screenTex);
copy.setTextures(videoTextures[0], tmpTex1);
gaussianBlur.setTextures(tmpTex1, tmpTex2, tmpTex3);
sobel.setTextures(tmpTex1, tmpTex4);
subtract.setTextures(tmpTex1, tmpTex4, tmpTex5);
tile.setTileTextures(tmpTex1, tmpTex3, tmpTex4, tmpTex5);
tile.setDestTexture(screenTex);
screenMat.emissiveTexture = screenTex;


// GUI
var gui = new dat.GUI();
const blurFolder = gui.addFolder('Blur');
blurFolder.add(gaussianBlur, 'sigma', 0.001, 5.0);
blurFolder.add(gaussianBlur, 'kSize', 1, 64);


let i = 0;
e.runRenderLoop(function () {
  updateQuadSize();

  copy.setTextures(videoTextures[i]);
  clear.go(workgroupsX, workgroupsY, 1);
  copy.go(workgroupsX, workgroupsY, 1);
  sobel.go(workgroupsX, workgroupsY, 1);
  gaussianBlur.go(workgroupsX, workgroupsY, 1);
  subtract.go(workgroupsX, workgroupsY, 1);
  tile.go(workgroupsX, workgroupsY, 1);
  scene.render();
  i = (i + 1) % videoTextures.length;
});

