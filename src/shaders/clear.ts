import * as BABYLON from '@babylonjs/core'

const clearCompSource = /* wgsl */`
    @group(0) @binding(0) var texture: texture_storage_2d<rgba8unorm, write>;

    @compute @workgroup_size(16, 16, 1)
    fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
        let res: vec2<u32> = textureDimensions(texture);
        if (global_id.x >= res.x || global_id.y >= res.y) {
            return;
        }
        textureStore(texture, vec2<i32>(global_id.xy), vec4<f32>(0.0, 0.0, 0.0, 1.0));
    }
`;

export class ClearShader {
    compute: BABYLON.ComputeShader;
    constructor(engine: BABYLON.WebGPUEngine | BABYLON.Engine, name:string){
        this.compute = new BABYLON.ComputeShader(name, engine,
            { computeSource: clearCompSource },
            {
                bindingsMapping: {
                    "texture": { group: 0, binding: 0 },
                }
            }
        );
    }
    setTexture(tex: BABYLON.Texture){
        this.compute.setStorageTexture("texture", tex);
    }
    go(x: number, y:number, z:number){
        this.compute.dispatch(x, y, z);
    }
}
