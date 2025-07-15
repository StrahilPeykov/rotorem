import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

const IMAGE_DIR = './public/img';
const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png'];
const OUTPUT_QUALITY = {
  webp: 85,
  avif: 75,
  jpeg: 90
};

async function ensureDir(dir) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function optimizeImage(inputPath, outputDir) {
  const fileName = path.basename(inputPath, path.extname(inputPath));
  const webpPath = path.join(outputDir, `${fileName}.webp`);
  const avifPath = path.join(outputDir, `${fileName}.avif`);
  
  try {
    // Read original image info
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    console.log(`Processing: ${inputPath} (${metadata.width}x${metadata.height})`);
    
    // Generate WebP version
    await image
      .clone()
      .webp({ 
        quality: OUTPUT_QUALITY.webp,
        effort: 6,
        smartSubsample: true
      })
      .toFile(webpPath);
    
    // Generate AVIF version for modern browsers
    await image
      .clone()
      .avif({ 
        quality: OUTPUT_QUALITY.avif,
        effort: 9
      })
      .toFile(avifPath);
    
    // Optimize original if it's JPEG/PNG
    const ext = path.extname(inputPath).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') {
      await image
        .clone()
        .jpeg({ 
          quality: OUTPUT_QUALITY.jpeg,
          progressive: true,
          mozjpeg: true
        })
        .toFile(inputPath);
    } else if (ext === '.png') {
      await image
        .clone()
        .png({ 
          compressionLevel: 9,
          adaptiveFiltering: true
        })
        .toFile(inputPath);
    }
    
    // Get file sizes for comparison
    const originalSize = (await fs.stat(inputPath)).size;
    const webpSize = (await fs.stat(webpPath)).size;
    const avifSize = (await fs.stat(avifPath)).size;
    
    console.log(`  Original: ${(originalSize / 1024).toFixed(1)}KB`);
    console.log(`  WebP: ${(webpSize / 1024).toFixed(1)}KB (${((webpSize / originalSize) * 100).toFixed(1)}%)`);
    console.log(`  AVIF: ${(avifSize / 1024).toFixed(1)}KB (${((avifSize / originalSize) * 100).toFixed(1)}%)`);
    
    return {
      original: originalSize,
      webp: webpSize,
      avif: avifSize
    };
    
  } catch (error) {
    console.error(`Error processing ${inputPath}:`, error.message);
    return null;
  }
}

async function optimizeImages() {
  console.log('🖼️  Starting image optimization...\n');
  
  try {
    await ensureDir(IMAGE_DIR);
    
    const files = await fs.readdir(IMAGE_DIR, { recursive: true });
    const imageFiles = files.filter(file => 
      SUPPORTED_FORMATS.includes(path.extname(file).toLowerCase())
    );
    
    if (imageFiles.length === 0) {
      console.log('No images found to optimize.');
      return;
    }
    
    let totalOriginal = 0;
    let totalWebP = 0;
    let totalAVIF = 0;
    let processedCount = 0;
    
    for (const file of imageFiles) {
      const fullPath = path.join(IMAGE_DIR, file);
      const outputDir = path.dirname(fullPath);
      
      const result = await optimizeImage(fullPath, outputDir);
      if (result) {
        totalOriginal += result.original;
        totalWebP += result.webp;
        totalAVIF += result.avif;
        processedCount++;
      }
      
      console.log(''); // Empty line for readability
    }
    
    if (processedCount > 0) {
      console.log(`\n✅ Optimization complete!`);
      console.log(`📊 Summary:`);
      console.log(`   Images processed: ${processedCount}`);
      console.log(`   Total original size: ${(totalOriginal / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Total WebP size: ${(totalWebP / 1024 / 1024).toFixed(2)}MB (${((totalWebP / totalOriginal) * 100).toFixed(1)}% of original)`);
      console.log(`   Total AVIF size: ${(totalAVIF / 1024 / 1024).toFixed(2)}MB (${((totalAVIF / totalOriginal) * 100).toFixed(1)}% of original)`);
      console.log(`   Space saved with WebP: ${((totalOriginal - totalWebP) / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Space saved with AVIF: ${((totalOriginal - totalAVIF) / 1024 / 1024).toFixed(2)}MB`);
    }
    
  } catch (error) {
    console.error('❌ Error during image optimization:', error.message);
    process.exit(1);
  }
}

// Special handling for hero image - create multiple sizes for responsive loading
async function createResponsiveImages() {
  const heroPath = path.join(IMAGE_DIR, 'hero.jpg');
  const sizes = [
    { width: 640, suffix: '-mobile' },
    { width: 768, suffix: '-tablet' },
    { width: 1024, suffix: '-desktop' },
    { width: 1920, suffix: '-xl' }
  ];
  
  try {
    await fs.access(heroPath);
    
    console.log('🎯 Creating responsive versions of hero image...');
    
    for (const size of sizes) {
      const outputPath = path.join(IMAGE_DIR, `hero${size.suffix}.webp`);
      
      await sharp(heroPath)
        .resize(size.width, null, { 
          withoutEnlargement: true,
          fit: 'cover'
        })
        .webp({ quality: 85, effort: 6 })
        .toFile(outputPath);
        
      console.log(`  Created: hero${size.suffix}.webp (${size.width}px wide)`);
    }
    
  } catch (error) {
    console.log('ℹ️  Hero image not found, skipping responsive versions');
  }
}

// Run optimization
async function main() {
  await optimizeImages();
  await createResponsiveImages();
  console.log('\n🚀 Image optimization completed successfully!');
}

main().catch(console.error);