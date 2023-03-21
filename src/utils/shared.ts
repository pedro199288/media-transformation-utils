import fs from "fs";
import path from "path";

/**
 * Get all paths for files in a folder
 * @param folderPath Path to folder
 */
export function getPathsForFolderFiles(folderPath: string) {
  // get all files in folder
  const fPath = fs.realpathSync(folderPath);
  // get paths for all files in folder
  const files = fs.readdirSync(fPath);
  // get paths for all files in folder
  const paths = files.map((file) => {
    return path.join(fPath, file);
  });
  return paths;
}
