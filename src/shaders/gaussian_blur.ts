import * as BABYLON from '@babylonjs/core'
import { clampSampler } from './samplers';

export class GaussianBlur{
    computeX: BABYLON.ComputeShader;
    computeY: BABYLON.ComputeShader;
    paramsBufferX: BABYLON.UniformBuffer;
    _kSize: number;
    _sigma: number;
    a: number;
    public set kSize(theKSize: number){
        this._kSize = Math.floor(theKSize);
        this.setParameters(undefined, this._kSize)
    }

    public get kSize(){
        return this._kSize;
    }

    public set sigma(theSigma: number){
        this._sigma = theSigma;
        this.setParameters(this._sigma);
    }

    public get sigma(){
        return this._sigma;
    }
    
    constructor(engine: BABYLON.WebGPUEngine | BABYLON.Engine, name:string){
        this.a = 0;
        this._kSize = 12;
        this._sigma = 0.8;

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
                    "src": { group: 0, binding: 2 },
                    "params": { group: 0, binding: 3 }
                }
            }
        );
        this.computeX.setTextureSampler("srcSampler", clampSampler);
        this.computeY.setTextureSampler("srcSampler", clampSampler);

        this.paramsBufferX = new BABYLON.UniformBuffer(engine);
        this.paramsBufferX.addUniform("sigma", 1)
        this.paramsBufferX.addUniform("kSize", 1)
        this.paramsBufferX.updateInt("kSize", 24);
        this.paramsBufferX.updateFloat("sigma", 20.0);
        this.paramsBufferX.update();

        this.computeX.setUniformBuffer("params", this.paramsBufferX);
        this.computeY.setUniformBuffer("params", this.paramsBufferX);
    }

    setTextures(tex: BABYLON.Texture, tmp: BABYLON.Texture, dest: BABYLON.Texture){
        this.computeX.setTexture("src", tex);
        this.computeX.setStorageTexture("dest", tmp);
        this.computeY.setTexture("src", tmp);
        this.computeY.setStorageTexture("dest", dest);
    }

    setParameters(sigma?: number, kernelSize?: number){
        if (sigma) this.paramsBufferX.updateFloat("sigma", sigma);
        if (kernelSize) this.paramsBufferX.updateInt("kSize", kernelSize);
        this.paramsBufferX.update();
        console.log("updated blur params");
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
            let sampleCoord = vec2<i32>(global_id.xy) + vec2<i32>(0, offset);
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
