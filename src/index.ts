import "./config";
import { fileURLToPath } from 'url';
import path from 'path';
import ffmpeg from "fluent-ffmpeg";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  ffmpeg()
    .input(path.join(__dirname, "../assets/video/test.mp4"))
    .videoFilter([
      {
        filter: "crop",
        options: {
          w: "in_h*9/16",
          h: "in_h",
          x: "(in_w-ow)/2",
          y: 0,
        },
      },
    ])
    .output("../assets/video/test.mp4")
    .run();
} catch (e) {
  console.log('error here:', e);
}
