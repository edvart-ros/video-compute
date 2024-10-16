import * as BABYLON from '@babylonjs/core'
import { clampSampler } from './samplers';

export class SobelShader{
    compute: BABYLON.ComputeShader;

    constructor(engine: BABYLON.WebGPUEngine | BABYLON.Engine, name:string){
        this.compute = new BABYLON.ComputeShader(name, engine,
            { computeSource: sobelShaderSource },
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

export const sobelShaderSource = /* wgsl */ `
    @group(0) @binding(0) var dest : texture_storage_2d<rgba8unorm,write>;
    @group(0) @binding(1) var srcSampler : sampler;
    @group(0) @binding(2) var src : texture_2d<f32>;

    @compute @workgroup_size(16, 16, 1)
    fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
        let res : vec2<u32> = textureDimensions(dest);
        let fres : vec2<f32> = vec2<f32>(res);
        let uv = (vec2<f32>(global_id.xy))/fres;

        let pix          : vec4<f32> = textureSampleLevel(src, srcSampler, (vec2<f32>(global_id.xy))/fres, 0.0);
        let pixUp        : vec4<f32> = textureSampleLevel(src, srcSampler, (vec2<f32>(global_id.xy) + vec2<f32>( 0.0, -1.0))/fres, 0.0);
        let pixUpLeft    : vec4<f32> = textureSampleLevel(src, srcSampler, (vec2<f32>(global_id.xy) + vec2<f32>(-1.0, -1.0))/fres, 0.0);
        let pixUpRight   : vec4<f32> = textureSampleLevel(src, srcSampler, (vec2<f32>(global_id.xy) + vec2<f32>( 1.0, -1.0))/fres, 0.0);
        let pixLeft      : vec4<f32> = textureSampleLevel(src, srcSampler, (vec2<f32>(global_id.xy) + vec2<f32>(-1.0,  0.0))/fres, 0.0);
        let pixRight     : vec4<f32> = textureSampleLevel(src, srcSampler, (vec2<f32>(global_id.xy) + vec2<f32>( 1.0,  0.0))/fres, 0.0);
        let pixDown      : vec4<f32> = textureSampleLevel(src, srcSampler, (vec2<f32>(global_id.xy) + vec2<f32>( 0.0,  1.0))/fres, 0.0);
        let pixDownLeft  : vec4<f32> = textureSampleLevel(src, srcSampler, (vec2<f32>(global_id.xy) + vec2<f32>(-1.0,  1.0))/fres, 0.0);
        let pixDownRight : vec4<f32> = textureSampleLevel(src, srcSampler, (vec2<f32>(global_id.xy) + vec2<f32>( 1.0,  1.0))/fres, 0.0);
        
        let gradX = ((pixUpLeft - pixUpRight) + 2.0*(pixLeft - pixRight) + (pixDownLeft - pixDownRight))/4.0;
        let gradY = (pixUpLeft - pixDownLeft) + 2.0*(pixUp - pixDown) + (pixUpRight - pixDownRight)/4.0;
        let grad = sqrt(gradX*gradX+gradY*gradY)/sqrt(2.0);

        let gradIntensity = length(grad);
        let color = pix;
        let white = vec4<f32>(1.0, 1.0, 1.0, 1.0);
        let black = vec4<f32>(0.0, 0.0, 0.0, 1.0);
        if (gradIntensity) > 0.2 {
            textureStore(dest, vec2<i32>(global_id.xy), white);
        } else {
            textureStore(dest, vec2<i32>(global_id.xy), black);
        }

    }
`;