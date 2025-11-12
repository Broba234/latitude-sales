# Image Optimization Guide

## Problem
The website images are extremely large, causing slow loading times:
- `armedangels.jpeg`: 7.7MB
- `yerse.jpeg`: 6.7MB
- `indicold.jpeg`: 6.1MB
- `yaya.jpeg`: 5.3MB
- `minus.jpeg`: 4.3MB
- `whitestuff.jpeg`: 1.2MB
- `hero2.png`: 1.1MB

**Total: ~27MB of images!** This is way too large for web use.

## Recommended Image Sizes

### Brand Images
- **Width**: 800-1200px (max)
- **Format**: JPEG (quality 80-85)
- **Target size**: < 200KB per image
- **Aspect ratio**: 2:3 (portrait)

### Hero Image
- **Width**: 1920px (max, for full-width backgrounds)
- **Format**: JPEG (quality 85) or WebP
- **Target size**: < 500KB
- **Aspect ratio**: 16:9 or as needed

## Optimization Methods

### Method 1: Using the Node.js Script (Recommended)

1. Install sharp:
   ```bash
   npm install sharp
   ```

2. Run the optimization script:
   ```bash
   node optimize-images.js
   ```

3. Review the optimized images (saved with `_optimized` suffix)

4. Replace originals if satisfied:
   ```bash
   cd public/images
   # Review optimized images first, then:
   for f in *_optimized.jpg; do
     mv "$f" "${f/_optimized/}"
   done
   ```

### Method 2: Using Online Tools

1. **Squoosh.app** (Recommended)
   - Visit https://squoosh.app/
   - Upload each image
   - Use MozJPEG quality 80-85
   - Resize to recommended dimensions
   - Download optimized version

2. **TinyPNG / TinyJPG**
   - Visit https://tinypng.com/
   - Upload images (supports PNG and JPEG)
   - Download optimized versions

### Method 3: Using ImageMagick

```bash
# Install ImageMagick (if not installed)
# macOS: brew install imagemagick
# Ubuntu: sudo apt-get install imagemagick

# Optimize brand images
cd public/images
for img in *.jpeg *.jpg; do
  convert "$img" -quality 85 -resize 1200x -strip "${img%.*}_optimized.jpg"
done

# Optimize hero image
convert hero2.png -quality 85 -resize 1920x -strip hero2_optimized.jpg
```

### Method 4: Using Sharp (Manual)

```javascript
const sharp = require('sharp');

// Optimize a single image
sharp('input.jpg')
  .resize(1200, null, { withoutEnlargement: true, fit: 'inside' })
  .jpeg({ quality: 85, progressive: true, mozjpeg: true })
  .toFile('output.jpg');
```

## Best Practices

1. **Use JPEG for photos** - Better compression than PNG
2. **Use WebP when possible** - Modern format with better compression (with fallback)
3. **Resize images** - Don't serve images larger than display size
4. **Strip metadata** - Remove EXIF data to reduce file size
5. **Use progressive JPEG** - Better perceived performance
6. **Lazy load** - Images below the fold should use `loading="lazy"`
7. **Set dimensions** - Prevent layout shift with width/height attributes

## Current Optimizations Applied

The following optimizations have been applied to the codebase:

1. ✅ **Lazy loading** - Brand images use `loading="lazy"`
2. ✅ **Async decoding** - Images use `decoding="async"`
3. ✅ **Dimensions set** - Images have width/height to prevent layout shift
4. ✅ **Caching headers** - Images cached for 1 year
5. ✅ **Compression** - Server uses gzip compression
6. ✅ **Error handling** - Fallback images for broken images

## Next Steps

1. **Optimize all images** using one of the methods above
2. **Test the website** to ensure images load correctly
3. **Monitor performance** using browser DevTools
4. **Consider WebP format** for even better compression (with JPEG fallback)
5. **Use responsive images** with `srcset` for different screen sizes

## Expected Results

After optimization, you should see:
- **90%+ reduction** in image file sizes
- **Faster page load times** (2-5 seconds faster)
- **Better user experience** on mobile devices
- **Reduced bandwidth costs**

## Monitoring

Use these tools to monitor performance:
- Chrome DevTools Network tab
- Lighthouse (built into Chrome DevTools)
- PageSpeed Insights: https://pagespeed.web.dev/
- WebPageTest: https://www.webpagetest.org/


