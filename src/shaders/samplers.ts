import * as BABYLON from '@babylonjs/core'

export const clampSampler = new BABYLON.TextureSampler().setParameters(
    BABYLON.Texture.CLAMP_ADDRESSMODE,
    BABYLON.Texture.CLAMP_ADDRESSMODE,
    BABYLON.Texture.CLAMP_ADDRESSMODE,
    BABYLON.Texture.NEAREST_SAMPLINGMODE,
);