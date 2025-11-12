#!/usr/bin/env node
/**
 * Image Optimization Script
 * 
 * This script optimizes images in the public/images directory.
 * It reduces file sizes while maintaining visual quality.
 * 
 * Requirements:
 * - Node.js with sharp installed: npm install sharp
 * 
 * Usage:
 *   node optimize-images.js
 */

const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, 'public', 'images');
const maxWidth = 1200; // Maximum width for brand images
const maxHeroWidth = 1920; // Maximum width for hero images
const quality = 85; // JPEG quality (0-100)

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('Error: sharp is not installed.');
  console.error('Please install it with: npm install sharp');
  console.error('');
  console.error('Alternatively, you can use online tools or imagemagick:');
  console.error('  - Online: https://squoosh.app/');
  console.error('  - ImageMagick: convert input.jpg -quality 85 -resize 1200x output.jpg');
  process.exit(1);
}

async function optimizeImage(inputPath, outputPath, options = {}) {
  const { maxWidth: width, quality: q } = options;
  
  try {
    const stats = await fs.promises.stat(inputPath);
    const originalSize = stats.size;
    
    await sharp(inputPath)
      .resize(width, null, {
        withoutEnlargement: true,
        fit: 'inside',
      })
      .jpeg({
        quality: q,
        progressive: true,
        mozjpeg: true,
      })
      .toFile(outputPath);
    
    const newStats = await fs.promises.stat(outputPath);
    const newSize = newStats.size;
    const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);
    
    console.log(`✓ ${path.basename(inputPath)}: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(newSize / 1024 / 1024).toFixed(2)}MB (${savings}% smaller)`);
    
    return { originalSize, newSize, savings };
  } catch (error) {
    console.error(`✗ Error optimizing ${inputPath}:`, error.message);
    return null;
  }
}

async function optimizeImages() {
  console.log('Starting image optimization...\n');
  
  if (!fs.existsSync(imagesDir)) {
    console.error(`Error: Images directory not found: ${imagesDir}`);
    process.exit(1);
  }
  
  const files = await fs.promises.readdir(imagesDir);
  const imageFiles = files.filter(f => 
    /\.(jpg|jpeg|png)$/i.test(f) && !f.includes('_optimized')
  );
  
  if (imageFiles.length === 0) {
    console.log('No images found to optimize.');
    return;
  }
  
  // Create backup directory
  const backupDir = path.join(imagesDir, 'backup');
  if (!fs.existsSync(backupDir)) {
    await fs.promises.mkdir(backupDir, { recursive: true });
  }
  
  let totalOriginalSize = 0;
  let totalNewSize = 0;
  
  for (const file of imageFiles) {
    const inputPath = path.join(imagesDir, file);
    const backupPath = path.join(backupDir, file);
    const outputPath = path.join(imagesDir, file.replace(/\.(jpg|jpeg|png)$/i, '_optimized.jpg'));
    
    // Backup original
    await fs.promises.copyFile(inputPath, backupPath);
    
    // Determine if it's a hero image
    const isHero = file.toLowerCase().includes('hero');
    const maxW = isHero ? maxHeroWidth : maxWidth;
    
    // Optimize
    const result = await optimizeImage(inputPath, outputPath, {
      maxWidth: maxW,
      quality: quality,
    });
    
    if (result) {
      totalOriginalSize += result.originalSize;
      totalNewSize += result.newSize;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`Total: ${(totalOriginalSize / 1024 / 1024).toFixed(2)}MB → ${(totalNewSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Savings: ${((totalOriginalSize - totalNewSize) / totalOriginalSize * 100).toFixed(1)}%`);
  console.log('='.repeat(50));
  console.log('\n✓ Optimization complete!');
  console.log(`  - Original images backed up to: ${backupDir}`);
  console.log(`  - Optimized images saved with _optimized suffix`);
  console.log('\nNext steps:');
  console.log('  1. Review the optimized images');
  console.log('  2. If satisfied, replace originals with optimized versions');
  console.log('  3. Update brands.json to use optimized images if needed');
  console.log('  4. Test the website to ensure images load correctly');
}

// Run optimization
optimizeImages().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});


