import * as BABYLON from '@babylonjs/core'

export function createScreenQuad(camera: BABYLON.Camera, scene: BABYLON.Scene): { screenQuad: BABYLON.Mesh, screenMat: BABYLON.StandardMaterial } {
    const screenQuad = BABYLON.MeshBuilder.CreatePlane("screenQuad", { size: 1 }, scene);
    const screenMat = new BABYLON.StandardMaterial("screenMat", scene);
    screenMat.alpha = 1.0;
    screenQuad.material = screenMat;
    screenQuad.position = new BABYLON.Vector3(0, 0, 1);
    screenQuad.parent = camera;
    return { screenQuad, screenMat }
}

export function createScene(engine: BABYLON.WebGPUEngine | BABYLON.Engine, canvas: HTMLCanvasElement) {
    const scene = new BABYLON.Scene(engine);
    const camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 0, -10), scene);
    camera.minZ = 0.8;
    camera.attachControl(canvas, true);
    return { scene: scene, camera: camera };
};