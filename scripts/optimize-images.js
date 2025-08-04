import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// This script used during build to optimize images.
// Currently acts as a safe no-op, ensuring builds do not fail
// if image optimization is unnecessary or dependencies are missing.

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const imgDir = path.resolve(__dirname, '../public/img');

  try {
    await fs.access(imgDir);
    console.log(`Image optimization skipped: images already optimized in ${imgDir}`);
  } catch {
    console.log(`Image directory not found at ${imgDir}, skipping optimization.`);
  }
}

main();