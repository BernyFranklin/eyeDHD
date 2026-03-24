Here’s a simple way to pipe raw frames from headless‑gl/Three.js into **ffmpeg**. The idea is:

1. Render each frame.
2. `readPixels` into a buffer (RGBA).
3. Write that buffer to ffmpeg’s **stdin** as raw video.
4. ffmpeg encodes to MP4 (or any codec you want).

```/dev/null/headless-three-ffmpeg.mjs#L1-164
import { spawn } from "child_process";
import gl from "gl";
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  BoxGeometry,
  MeshNormalMaterial,
  Mesh
} from "three";

const width = 640;
const height = 360;
const fps = 30;
const totalFrames = 120;

const context = gl(width, height, { preserveDrawingBuffer: true });

const canvas = {
  width,
  height,
  style: {},
  addEventListener() {},
  removeEventListener() {}
};

const scene = new Scene();
const camera = new PerspectiveCamera(60, width / height, 0.1, 100);
camera.position.z = 2;

const geometry = new BoxGeometry(1, 1, 1);
const material = new MeshNormalMaterial();
const cube = new Mesh(geometry, material);
scene.add(cube);

const renderer = new WebGLRenderer({
  context,
  canvas,
  antialias: true
});
renderer.setSize(width, height, false);

// Spawn ffmpeg and pipe raw frames
const ffmpeg = spawn("ffmpeg", [
  "-y",
  "-f", "rawvideo",
  "-pix_fmt", "rgba",
  "-s", `${width}x${height}`,
  "-r", `${fps}`,
  "-i", "pipe:0",
  "-vf", "vflip",
  "-c:v", "libx264",
  "-pix_fmt", "yuv420p",
  "output.mp4"
], { stdio: ["pipe", "inherit", "inherit"] });

for (let frame = 0; frame < totalFrames; frame += 1) {
  const t = frame / totalFrames;
  cube.rotation.x = t * Math.PI * 2;
  cube.rotation.y = t * Math.PI * 2;

  renderer.render(scene, camera);

  const buffer = Buffer.alloc(width * height * 4);
  context.readPixels(
    0,
    0,
    width,
    height,
    context.RGBA,
    context.UNSIGNED_BYTE,
    buffer
  );

  ffmpeg.stdin.write(buffer);
}

ffmpeg.stdin.end();

ffmpeg.on("close", (code) => {
  renderer.dispose();
  context.getExtension("STACKGL_destroy_context")?.destroy();
  console.log(`ffmpeg exited with code ${code}`);
});
```

### Key points
- `-f rawvideo -pix_fmt rgba -s WxH -r FPS -i pipe:0` tells ffmpeg to read raw RGBA frames from stdin.
- `-vf vflip` flips vertically because WebGL’s origin is bottom‑left.
- `-c:v libx264 -pix_fmt yuv420p` makes a widely compatible MP4.

If you want a different output (e.g. WebM or ProRes), tell me the format and I’ll adjust the ffmpeg args.

