import { config } from "config.js";
import ffmpeg from "fluent-ffmpeg";
import { getPathsForFolderFiles } from "./shared.js";

type constructorObject = {
  assetPath: string;
};

function appFfmpeg({ assetPath }: constructorObject): ffmpeg.FfmpegCommand {
  const fileName = assetPath.split("/").pop();

  return (
    ffmpeg(assetPath)
      .on("start", (commandLine) => {
        console.log(`🚀 Processing filename ${fileName ?? ""} ...`);
        console.log(`Spawned command: ${commandLine}`);
      })
      .on("end", () => {
        console.log("✅ Finished processing");
      })
      // .on("progress", (...progress) => {
      //   console.log("⏳ progress:", progress);
      // })
      .on("error", (err) => {
        console.log("❌ Error:", err);
      })
  );
}

/**
 * converts a video asset to smaller versions and gets a screenshot of the first frame
 * @param assetPath Path to video asset to convert
 */
export function convertVideoAsset(assetPath: string) {
  const fileName = assetPath.split("/").pop();
  const fileNameWithoutExtension = fileName?.split(".").shift();

  appFfmpeg({ assetPath })
    // output for screenshot of first frame
    .output(
      `${config.basePaths.conversions}img/${fileNameWithoutExtension}.png`
    )
    .videoFilter([
      {
        filter: "crop",
        options: {
          w: "in_h*4/3",
          h: "in_h",
          x: "(in_w-ow)/2",
          y: 0,
        },
      },
    ])
    .seekInput(0)
    .frames(1)
    .size("?x240")

    // output for smaller videos
    .output(
      `${config.basePaths.conversions}video/${fileNameWithoutExtension}-320x240.mp4`
    )
    .size("320x240")
    .output(
      `${config.basePaths.conversions}video/${fileNameWithoutExtension}-640x480.mp4`
    )
    .size("640x480")

    // execute
    .run();

  // conversion to webp
  ffmpeg()
    .input(`${config.basePaths.conversions}img/${fileNameWithoutExtension}.png`)
    .saveToFile(
      `${config.basePaths.conversions}img/${fileNameWithoutExtension}.webp`
    );
}

/**
 * Convert video assets from a folder to smaller versions and gets a screenshot of the first frame
 * @param folder Path to folder with video assets to convert
 */
export function convertVideoAssets(folderPath: string) {
  getPathsForFolderFiles(folderPath).forEach((assetPath) => {
    if (["mp4", "webm", "ogg"].includes(assetPath.split(".").pop() ?? "")) {
      convertVideoAsset(assetPath);
    }
  });
}
