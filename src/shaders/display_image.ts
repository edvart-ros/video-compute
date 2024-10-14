import * as BABYLON from '@babylonjs/core'
import { clampSampler } from './samplers';

export class DisplayImageShader{
    compute: BABYLON.ComputeShader;

    constructor(engine: BABYLON.WebGPUEngine | BABYLON.Engine, name:string){
        this.compute = new BABYLON.ComputeShader(name, engine,
            { computeSource: displayImageSource },
            {
                bindingsMapping:
                {
                    "dest": { group: 0, binding: 0 },
                    "srcSampler": { group: 0, binding: 1 },
                    "src": { group: 0, binding: 2 }
                }
            }
        );
        this.compute.setTextureSampler("srcSampler", clampSampler)
    }

    setTextures(src?: BABYLON.Texture, dest?: BABYLON.Texture){
        if (src) this.compute.setTexture("src", src, false);
        if (dest) this.compute.setStorageTexture("dest", dest);
    }

    go(x: number, y:number, z:number){
        this.compute.dispatch(x, y, z);
    }
}

export const displayImageSource = /* wgsl */ `
    @group(0) @binding(0) var dest : texture_storage_2d<rgba8unorm,write>;
    @group(0) @binding(1) var srcSampler : sampler;
    @group(0) @binding(2) var src : texture_2d<f32>;

    @compute @workgroup_size(16, 16, 1)

    fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
        let resDest : vec2<f32> = vec2<f32>(textureDimensions(dest));
        let resSrc : vec2<f32> = vec2<f32>(textureDimensions(src));
        let uv = (vec2<f32>(global_id.xy))/resDest;
        let pix : vec4<f32> = textureSampleLevel(src, srcSampler, uv, 0.0);
        textureStore(dest, vec2<i32>(global_id.xy), pix);
    }
`;