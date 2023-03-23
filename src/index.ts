import { convertVideoAsset, convertVideoAssets } from "utils/ffmpeg.js";
import "./config";
import { config } from "./config.js";

try {
  // convertVideoAsset(config.basePaths.assets + "video/test.mp4");
  convertVideoAssets(config.basePaths.assets + "video");
} catch (e) {
  console.log("error here:", e);
}
