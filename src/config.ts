import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
// @ts-ignore-next-line
import { path as ffprobePath } from "@ffprobe-installer/ffprobe";
import ffmpeg from "fluent-ffmpeg";
// set paths
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);
console.log("🛠 config loaded");
