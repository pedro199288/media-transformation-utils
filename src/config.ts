import dotenv from "dotenv";
dotenv.config();
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🛠  config loaded");

export const config = {
  basePaths: {
    assets: path.join(__dirname, "../assets/"),
    conversions: path.join(__dirname, "../conversions/"),
  },
};
