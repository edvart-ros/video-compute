import * as BABYLON from '@babylonjs/core'
import { clampSampler } from './samplers'

export class SubtractShader{
    compute: BABYLON.ComputeShader;

    constructor(engine: BABYLON.Engine | BABYLON.WebGPUEngine, name:string){
        this.compute = new BABYLON.ComputeShader(name, engine,
            {computeSource: subtractSource},
            {
                bindingsMapping:
                {
                    "dest": { group: 0, binding: 0 },
                    "src1Sampler": { group: 0, binding: 1 },
                    "src1": { group: 0, binding: 2 },
                    "src2Sampler": { group: 0, binding: 3 },
                    "src2": { group: 0, binding: 4 },
                }
            }
        );
        this.compute.setTextureSampler("src1Sampler", clampSampler);
        this.compute.setTextureSampler("src2Sampler", clampSampler);
    }

    setTextures(src1: BABYLON.Texture, src2: BABYLON.Texture, dest: BABYLON.Texture){
        this.compute.setTexture("src1", src1, false);
        this.compute.setTexture("src2", src2, false);
        this.compute.setStorageTexture("dest", dest);
    }

    go(x: number, y:number, z:number){
        this.compute.dispatch(x, y, z);
    }
}

const subtractSource = /* wgsl */ `
    @group(0) @binding(0) var dest : texture_storage_2d<rgba8unorm,write>;
    @group(0) @binding(1) var src1Sampler : sampler;
    @group(0) @binding(2) var src1 : texture_2d<f32>;
    @group(0) @binding(3) var src2Sampler : sampler;
    @group(0) @binding(4) var src2 : texture_2d<f32>;
    
    @compute @workgroup_size(16, 16, 1)
    fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
        let res : vec2<f32> = vec2<f32>(textureDimensions(dest));
        let uv = (vec2<f32>(global_id.xy))/res;

        let sample1 = textureSampleLevel(src1, src1Sampler, uv, 0.0);
        let sample2 = textureSampleLevel(src2, src2Sampler, uv, 0.0);

        let result = abs(sample2-sample1);
        textureStore(dest, vec2<i32>(global_id.xy), result);
    }
`