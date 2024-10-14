import * as BABYLON from '@babylonjs/core'
import { clampSampler } from './samplers';

export class GaussianBlur{
    computeX: BABYLON.ComputeShader;
    computeY: BABYLON.ComputeShader;
    constructor(engine: BABYLON.WebGPUEngine | BABYLON.Engine, name:string){
        this.computeX = new BABYLON.ComputeShader(name, engine,
            { computeSource: gaussianBlurXSource },
            {
                bindingsMapping:
                {
                    "dest": { group: 0, binding: 0 },
                    "srcSampler": { group: 0, binding: 1 },
                    "src": { group: 0, binding: 2 },
                    "params": { group: 0, binding: 3 }
                }
            }
        );

        this.computeY = new BABYLON.ComputeShader("gaussianBlurShader", engine,
            { computeSource: gaussianBlurYSource },
            {
                bindingsMapping:
                {
                    "dest": { group: 0, binding: 0 },
                    "srcSampler": { group: 0, binding: 1 },
                    "src": { group: 0, binding: 2 }
                }
            }
        );
        this.computeX.setTextureSampler("srcSampler", clampSampler);
        this.computeY.setTextureSampler("srcSampler", clampSampler);

        let blurParamsBuffer = new BABYLON.UniformBuffer(engine);
        blurParamsBuffer.addUniform("sigma", 1)
        blurParamsBuffer.addUniform("kSize", 1)
        blurParamsBuffer.updateInt("kSize", 24);
        blurParamsBuffer.updateFloat("sigma", 20.0);
        blurParamsBuffer.update();
        this.computeX.setUniformBuffer("params", blurParamsBuffer);

    }

    setTextures(tex: BABYLON.Texture, tmp: BABYLON.Texture, dest: BABYLON.Texture){
        this.computeX.setTexture("src", tex);
        this.computeX.setStorageTexture("dest", tmp);
        this.computeY.setTexture("src", tmp);
        this.computeY.setStorageTexture("dest", dest);
    }

    go(x: number, y:number, z:number){
        this.computeX.dispatch(x, y, z);
        this.computeY.dispatch(x, y, z);
    }
}




const gaussianBlurXSource = /* wgsl */ `
    struct Parameters {
        sigma: f32,
        kSize: i32,
    }

    @group(0) @binding(0) var dest : texture_storage_2d<rgba8unorm,write>;
    @group(0) @binding(1) var srcSampler : sampler;
    @group(0) @binding(2) var src : texture_2d<f32>;
    @group(0) @binding(3) var<uniform> params : Parameters;

    fn gaussian(rSquared: f32, sigma:f32) -> f32 {
        return (1.0/(2.0*3.14*sigma*sigma))*exp(-rSquared/(2*sigma*sigma));
    }    
    
    @compute @workgroup_size(16, 16, 1)
    fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
        let res : vec2<f32> = vec2<f32>(textureDimensions(dest));
        let uv = (vec2<f32>(global_id.xy))/res;

        let baseOffset = -params.kSize/2;
        var resultPix = vec4<f32>(0.0, 0.0, 0.0, 1.0);
        var sumWeights = 0.0;
        for (var i = 0; i < params.kSize; i++){
            let offset = baseOffset + i;
            let sampleCoord = vec2<i32>(global_id.xy) + vec2<i32>(offset, 0);
            let sampleUv = (vec2<f32>(sampleCoord))/res;
            let samplePix = textureSampleLevel(src, srcSampler, sampleUv, 0.0);
            let weight = gaussian(abs(f32(offset)), params.sigma);
            sumWeights = sumWeights + weight;
            resultPix = resultPix + weight*samplePix;
        }
        resultPix = resultPix / sumWeights;
        textureStore(dest, vec2<i32>(global_id.xy), resultPix);
    }
`;

const gaussianBlurYSource = /* wgsl */ `
    @group(0) @binding(0) var dest : texture_storage_2d<rgba8unorm,write>;
    @group(0) @binding(1) var srcSampler : sampler;
    @group(0) @binding(2) var src : texture_2d<f32>;

    fn gaussian(rSquared: f32, sigma:f32) -> f32 {
        return (1.0/(2.0*3.14*sigma*sigma))*exp(-rSquared/(2*sigma*sigma));
    }    
    
    @compute @workgroup_size(16, 16, 1)
    fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
        let res : vec2<f32> = vec2<f32>(textureDimensions(dest));
        let uv = (vec2<f32>(global_id.xy))/res;

        let kSize = 13;
        let baseOffset = -kSize/2;
        let sigma = 1.0;
        var resultPix = vec4<f32>(0.0, 0.0, 0.0, 1.0);
        var sumWeights = 0.0;
        for (var i = 0; i < kSize; i++){
            let offset = baseOffset + i;
            let sampleCoord = vec2<i32>(global_id.xy) + vec2<i32>(0, offset);
            let sampleUv = (vec2<f32>(sampleCoord))/res;
            let samplePix = textureSampleLevel(src, srcSampler, sampleUv, 0.0);
            let weight = gaussian(abs(f32(offset)), sigma);
            sumWeights = sumWeights + weight;
            resultPix = resultPix + weight*samplePix;
        }
        resultPix = resultPix / sumWeights;
        textureStore(dest, vec2<i32>(global_id.xy), resultPix);
    }
`;

