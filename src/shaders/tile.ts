import * as BABYLON from '@babylonjs/core'
import { clampSampler } from './samplers';

export class TileShader {
    compute: BABYLON.ComputeShader;
    constructor(engine: BABYLON.WebGPUEngine | BABYLON.Engine, name: string) {
        this.compute = new BABYLON.ComputeShader(name, engine,
            { computeSource: tileImagesSource },
            {
                bindingsMapping:
                {
                    "dest": { group: 0, binding: 0 },
                    "src1Sampler": { group: 0, binding: 1 },
                    "src1": { group: 0, binding: 2 },
                    "src2Sampler": { group: 0, binding: 3 },
                    "src2": { group: 0, binding: 4 },
                    "src3Sampler": { group: 0, binding: 5 },
                    "src3": { group: 0, binding: 6 },
                    "src4Sampler": { group: 0, binding: 7 },
                    "src4": { group: 0, binding: 8 },
                }
            }
        );
        this.compute.setTextureSampler("src1Sampler", clampSampler);
        this.compute.setTextureSampler("src2Sampler", clampSampler);
        this.compute.setTextureSampler("src3Sampler", clampSampler);
        this.compute.setTextureSampler("src4Sampler", clampSampler);
        
    }
    setTileTextures(src1: BABYLON.Texture, src2: BABYLON.Texture, src3: BABYLON.Texture, src4: BABYLON.Texture ){
        this.compute.setTexture("src1", src1, false);
        this.compute.setTexture("src2", src2, false);
        this.compute.setTexture("src3", src3, false);
        this.compute.setTexture("src4", src4, false);
    }
    setDestTexture(dest: BABYLON.Texture){
        this.compute.setStorageTexture("dest", dest);
    }

    go(x: number, y: number, z: number){
        this.compute.dispatch(x, y, z);
    }
}

export const tileImagesSource = /* wgsl */ `
    @group(0) @binding(0) var dest : texture_storage_2d<rgba8unorm,write>;
    @group(0) @binding(1) var src1Sampler : sampler;
    @group(0) @binding(2) var src1 : texture_2d<f32>;
    @group(0) @binding(3) var src2Sampler : sampler;
    @group(0) @binding(4) var src2 : texture_2d<f32>;
    @group(0) @binding(5) var src3Sampler : sampler;
    @group(0) @binding(6) var src3 : texture_2d<f32>;
    @group(0) @binding(7) var src4Sampler : sampler;
    @group(0) @binding(8) var src4 : texture_2d<f32>;

    @compute @workgroup_size(16, 16, 1)
    fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
        let res : vec2<f32> = vec2<f32>(textureDimensions(dest));
        let uv = (vec2<f32>(global_id.xy))/res;

        var sample : vec4<f32>;
        if (uv.y >= 0.5){
            if uv.x < 0.5 {
                sample = textureSampleLevel(src1, src1Sampler, uv, 0.0);
            } else {
                sample = textureSampleLevel(src2, src2Sampler, uv, 0.0);
            }
        } else {
            if uv.x < 0.5 {
                sample = textureSampleLevel(src3, src3Sampler, uv, 0.0);
            } else {
                sample = textureSampleLevel(src4, src4Sampler, uv, 0.0);
            }
        }
        textureStore(dest, global_id.xy, sample);
    }
`;