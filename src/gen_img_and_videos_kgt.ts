import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);

// Main execution
const originalsDir = path.join(__dirname, "originals");

// Queue implementation
class Queue {
  private concurrency: number;
  private running: number;
  private queue: Array<{
    fn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
  }>;

  constructor(concurrency: number = 2) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  enqueue(fn: () => Promise<any>): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.dequeue();
    });
  }

  private dequeue(): void {
    if (this.running >= this.concurrency) {
      return;
    }

    const item = this.queue.shift();
    if (!item) {
      return;
    }

    this.running++;
    item
      .fn()
      .then(item.resolve)
      .catch(item.reject)
      .finally(() => {
        this.running--;
        this.dequeue();
      });
  }
}

const queue = new Queue(2); // Adjust concurrency as needed

processDirectory(originalsDir)
  .then(() => console.log("All videos processed"))
  .catch((err) => console.error("Error processing videos:", err));

function resizeVideo(
  inputPath: string,
  outputPath: string,
  width: number,
  height: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        `-vf scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
      ])
      .output(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(err))
      .run();
  });
}

function generateThumbnail(
  inputPath: string,
  outputPath: string,
  width: number,
  height: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        return reject(err);
      }

      const duration = metadata.format.duration;
      const timestamp = duration ? duration / 2 : 0;

      ffmpeg(inputPath)
        .screenshots({
          timestamps: [timestamp],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: `${width}x${height}`, // Width and height specified
        })
        .on("end", () => resolve(outputPath))
        .on("error", (err) => reject(err));
    });
  });
}

async function processVideo(
  inputPath: string,
  baseDir: string,
  exerciseCategory: string
): Promise<void> {
  const baseName = path.basename(inputPath, path.extname(inputPath));

  const videoDir = path.join(baseDir, "videos");
  const thumbnailDir = path.join(baseDir, "thumbnails");

  const sizes = ["large", "medium", "small"] as const;
  const dimensions: Record<
    (typeof sizes)[number],
    { width: number; height: number }
  > = {
    large: { width: 960, height: 540 },
    medium: { width: 392, height: 220 },
    small: { width: 178, height: 100 },
  };

  try {
    // Create necessary directories
    for (const size of sizes) {
      await mkdir(path.join(videoDir, size, exerciseCategory), {
        recursive: true,
      });
      await mkdir(path.join(thumbnailDir, size, exerciseCategory), {
        recursive: true,
      });
    }

    // Resize video to different dimensions
    for (const size of sizes) {
      const { width, height } = dimensions[size];
      await queue.enqueue(() =>
        resizeVideo(
          inputPath,
          path.join(videoDir, size, exerciseCategory, `${baseName}.mp4`),
          width,
          height
        )
      );
    }

    // Generate thumbnail
    for (const size of sizes) {
      const { width, height } = dimensions[size];
      await queue.enqueue(() =>
        generateThumbnail(
          inputPath,
          path.join(thumbnailDir, size, exerciseCategory, `${baseName}.jpg`),
          width,
          height
        )
      );
    }

    console.log(`Processing completed for ${baseName}`);
  } catch (error) {
    console.error(`Error processing ${baseName}:`, error);
  }
}

async function processDirectory(dir: string): Promise<void> {
  const entries = await readdir(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stats = await stat(fullPath);
    if (stats.isDirectory()) {
      await processDirectory(fullPath);
    } else if (stats.isFile()) {
      const category = path.basename(path.dirname(fullPath));
      await processVideo(fullPath, __dirname, category);
    }
  }
}
