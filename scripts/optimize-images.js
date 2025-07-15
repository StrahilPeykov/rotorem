// scripts/optimize-images.js
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

const IMAGE_DIR = './public/img';

// 1️⃣  Accept WebP originals too
const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp'];

const OUTPUT_QUALITY = {
  webp: 85,
  avif: 75,
  jpeg: 90
};

async function ensureDir(dir) { /* unchanged */ }

// 🔑 helper: don’t create a second .webp if the source is already WebP
function shouldGenerateWebP(ext) {
  return ext !== '.webp';
}

async function optimizeImage(inputPath, outputDir) {
  const ext = path.extname(inputPath).toLowerCase();
  const fileName = path.basename(inputPath, ext);
  const webpPath = path.join(outputDir, `${fileName}.webp`);
  const avifPath = path.join(outputDir, `${fileName}.avif`);

  const image = sharp(inputPath);
  const metadata = await image.metadata();
  console.log(`Processing: ${inputPath} (${metadata.width}×${metadata.height})`);

  /* --- output variants --- */
  // WebP variant (skip if already a .webp original)
  if (shouldGenerateWebP(ext)) {
    await image.clone()
      .webp({ quality: OUTPUT_QUALITY.webp, effort: 6, smartSubsample: true })
      .toFile(webpPath);
  }

  // AVIF variant (always worth having)
  await image.clone()
    .avif({ quality: OUTPUT_QUALITY.avif, effort: 9 })
    .toFile(avifPath);

  /* --- re‑encode / compress the source itself --- */
  if (ext === '.jpg' || ext === '.jpeg') {
    await image.clone()
      .jpeg({ quality: OUTPUT_QUALITY.jpeg, progressive: true, mozjpeg: true })
      .toFile(inputPath);
  } else if (ext === '.png') {
    await image.clone()
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(inputPath);
  } else if (ext === '.webp') {
    // losslessly strip metadata + allow quality tweak
    await image.clone()
      .webp({ quality: OUTPUT_QUALITY.webp, effort: 6, smartSubsample: true })
      .toFile(inputPath);
  }

  /* --- size report (handle the 'no‑extra‑webp' case) --- */
  const originalSize = (await fs.stat(inputPath)).size;
  const webpSize   = shouldGenerateWebP(ext) ? (await fs.stat(webpPath)).size : originalSize;
  const avifSize   = (await fs.stat(avifPath)).size;

  console.log(`  Original: ${(originalSize/1024).toFixed(1)} KB`);
  if (shouldGenerateWebP(ext)) {
    console.log(`  WebP:     ${(webpSize/1024).toFixed(1)} KB (${((webpSize/originalSize)*100).toFixed(1)} %)`);
  } else {
    console.log(`  WebP (re‑encoded in‑place) → ${(webpSize/1024).toFixed(1)} KB`);
  }
  console.log(`  AVIF:     ${(avifSize/1024).toFixed(1)} KB (${((avifSize/originalSize)*100).toFixed(1)} %)`);

  return { original: originalSize, webp: webpSize, avif: avifSize };
}

async function optimizeImages() { /* unchanged */ }

/* 2️⃣  If your hero banner is already WebP, look for that */
async function createResponsiveImages() {
  const heroPath = path.join(IMAGE_DIR, 'hero.webp');   // ← change extension
  const sizes = [
    { width: 640,  suffix: '-mobile'  },
    { width: 768,  suffix: '-tablet'  },
    { width: 1024, suffix: '-desktop' },
    { width: 1920, suffix: '-xl'      }
  ];

  try {
    await fs.access(heroPath);
    console.log('🎯 Creating responsive versions of hero image…');

    for (const { width, suffix } of sizes) {
      const outputPath = path.join(IMAGE_DIR, `hero${suffix}.webp`);
      await sharp(heroPath)
        .resize(width, null, { withoutEnlargement: true, fit: 'cover' })
        .webp({ quality: OUTPUT_QUALITY.webp, effort: 6 })
        .toFile(outputPath);
      console.log(`  Created: hero${suffix}.webp (${width}px wide)`);
    }
  } catch {
    console.log('ℹ️  Hero image not found, skipping responsive versions');
  }
}

async function main() {
  await optimizeImages();
  await createResponsiveImages();
  console.log('\n🚀 Image optimization completed successfully!');
}
main().catch(console.error);
