import * as BABYLON from '@babylonjs/core'

export async function GetTextureArrayFromVideo(path: string, e: BABYLON.Engine|BABYLON.WebGPUEngine): Promise<BABYLON.Texture[]>{
    const videoPath = path; 
    console.log("Loading video")
    const frames = await getVideoFrames(videoPath, 24)
    console.log(`Got ${frames.length} frames`)
    const textureArray: BABYLON.RawTexture[] = [];
    
    for (const frame of frames){
      const frameCanvas = frame;
      const ctx = frameCanvas.getContext("2d");
      if (ctx){
        const imageData = ctx.getImageData(0, 0, frameCanvas.width, frameCanvas.height).data;
        const frameTexture = BABYLON.RawTexture.CreateRGBATexture(imageData, frameCanvas.width, frameCanvas.height, e, false, true);
        textureArray.push(frameTexture);
      }
    }
    return textureArray;  

}

export async function getVideoFrames(videoPath: string, fps: number) {
    return new Promise<HTMLCanvasElement[]>((resolve, reject) => {
      const video = document.createElement("video");
      video.src = videoPath;
      video.crossOrigin = "anonymous";
      const frames: HTMLCanvasElement[] = [];
      video.addEventListener("loadedmetadata", async () => {
        const width = video.videoWidth;
        const height = video.videoHeight;
        const frameDuration = 1 / fps;
        const totalFrames = Math.floor(video.duration * fps);
        for (let i = 0; i < totalFrames; i++) {
          video.currentTime = i * frameDuration;
          await new Promise<void>((resolveFrame) => {
            video.addEventListener("seeked", () => {
              const canvas = document.createElement("canvas");
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d")!;
              ctx.drawImage(video, 0, 0, width, height);
              frames.push(canvas);
              resolveFrame();
            }, { once: true });
          });
        }
  
        resolve(frames);
      });
  
      video.addEventListener("error", (e) => {
        reject(`Error loading video: ${e}`);
      });
    });
  }
  