import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Main execution
const originDir = path.join(__dirname, "originals");

// Add this near the top of the file, after other constants
const outputDir = path.join(__dirname, "output");

// watermark image
const watermarkImagePath = path.join(__dirname, "kaizengains-watermark.png");

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

processDirectory(originDir)
  .then(() => console.log("All videos processed"))
  .catch((err) => console.error("Error processing videos:", err));

function resizeVideo(
  inputPath: string,
  outputPath: string,
  width: number,
  height: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create a sanitized temporary filename
    const tempPath = path.join(
      path.dirname(outputPath), 
      `temp_${Date.now()}_${path.basename(outputPath).replace(/\s+/g, '_')}`
    );

    ffmpeg()
      .input(inputPath)
      .input(watermarkImagePath)
      .complexFilter([
        `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2[scaled]`,
        `[1:v]scale=${width}:${height}[watermark]`,
        '[scaled][watermark]overlay=0:0'
      ])
      .output(tempPath)
      .on('end', () => {
        // Rename temp file to final output with original name
        fs.rename(tempPath, outputPath, (err) => {
          if (err) reject(err);
          else resolve(outputPath);
        });
      })
      .on('error', (err) => reject(err))
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
      if (err) return reject(err);

      const duration = metadata.format.duration;
      const timestamp = duration ? duration / 2 : 0;

      ffmpeg(inputPath)
        .screenshots({
          timestamps: [timestamp],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: `${width}x${height}`
        })
        .on('end', () => resolve(outputPath))
        .on('error', (err) => reject(err));
    });
  });
}

async function processVideo(
  inputPath: string,
  baseDir: string,
  exerciseCategory: string
): Promise<void> {
  let baseName = path.basename(inputPath, path.extname(inputPath));
  baseName = baseName.replace(/_1$/, "");

  const videoDir = path.join(outputDir, "videos");
  const imageDir = path.join(outputDir, "images");

  const sizes = ["large", "medium", "small"] as const;
  const dimensions: Record<(typeof sizes)[number], { width: number; height: number }> = {
    large: { width: 960, height: 540 },
    medium: { width: 392, height: 220 },
    small: { width: 178, height: 100 },
  };

  try {
    await mkdir(outputDir, { recursive: true });
    
    // Create necessary directories, skip if category is "originals"
    for (const size of sizes) {
      if (exerciseCategory === "originals") {
        continue;
      }
      await mkdir(path.join(videoDir, size, exerciseCategory), { recursive: true });
      await mkdir(path.join(imageDir, size, exerciseCategory), { recursive: true });
    }

    // Process videos first and then generate thumbnails from the processed videos
    for (const size of sizes) {
      if (exerciseCategory === "originals") {
        continue;
      }
      const { width, height } = dimensions[size];
      const processedVideoPath = path.join(videoDir, size, exerciseCategory, `${baseName}.mp4`);
      
      // First process the video
      await queue.enqueue(() => 
        resizeVideo(inputPath, processedVideoPath, width, height).then(() => {
          // Then generate thumbnail from the processed video
          generateThumbnail(processedVideoPath, path.join(imageDir, size, exerciseCategory, `${baseName}.jpg`), width, height);
        })
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
