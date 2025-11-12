// Minimal static server to serve the site and /admin page
// Usage: node server.js

const http = require('http');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

const publicDir = path.join(__dirname, 'public');

const mimeTypes = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

// Cache headers for different file types
function getCacheHeaders(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  // Images and fonts: long cache (1 year) with immutable
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.woff', '.woff2'].includes(ext)) {
    return {
      'Cache-Control': 'public, max-age=31536000, immutable',
    };
  }
  
  // CSS and JS: medium cache (1 week) with revalidation
  if (['.css', '.js'].includes(ext)) {
    return {
      'Cache-Control': 'public, max-age=604800, must-revalidate',
    };
  }
  
  // JSON: short cache (1 hour)
  if (ext === '.json') {
    return {
      'Cache-Control': 'public, max-age=3600, must-revalidate',
    };
  }
  
  // HTML: no cache (always fresh)
  if (ext === '.html') {
    return {
      'Cache-Control': 'no-cache, must-revalidate',
    };
  }
  
  return {
    'Cache-Control': 'public, max-age=3600',
  };
}

// Check if client accepts gzip
function acceptsGzip(headers) {
  const acceptEncoding = headers['accept-encoding'] || '';
  return acceptEncoding.includes('gzip');
}

// Compressible content types
function isCompressible(ext) {
  return ['.html', '.css', '.js', '.json', '.svg'].includes(ext);
}

function serveFile(filePath, req, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end('Not found');
      return;
    }
    
    const ext = path.extname(filePath).toLowerCase();
    const type = mimeTypes[ext] || 'application/octet-stream';
    const cacheHeaders = getCacheHeaders(filePath);
    const headers = {
      'Content-Type': type,
      ...cacheHeaders,
    };
    
    // Add compression for text-based files
    if (acceptsGzip(req.headers) && isCompressible(ext)) {
      zlib.gzip(data, (err, compressed) => {
        if (err) {
          // Fallback to uncompressed if compression fails
          headers['Content-Length'] = data.length;
          // Don't set Content-Encoding if compression failed
          res.writeHead(200, headers);
          res.end(data);
        } else {
          headers['Content-Encoding'] = 'gzip';
          headers['Content-Length'] = compressed.length;
          res.writeHead(200, headers);
          res.end(compressed);
        }
      });
    } else {
      headers['Content-Length'] = data.length;
      res.writeHead(200, headers);
      res.end(data);
    }
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  // Route "/" -> index.html, "/admin" -> admin.html
  if (url.pathname === '/') {
    return serveFile(path.join(publicDir, 'index.html'), req, res);
  }
  if (url.pathname === '/admin') {
    return serveFile(path.join(publicDir, 'admin.html'), req, res);
  }
  // Favicon fallback: serve custom SVG for /favicon.ico
  if (url.pathname === '/favicon.ico') {
    return serveFile(path.join(publicDir, 'latitude sales favicon.svg'), req, res);
  }
  // Static files under /public
  const safePath = path.normalize(url.pathname).replace(/^\/+/, '');
  const filePath = path.join(publicDir, safePath);
  // Prevent path traversal outside publicDir
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=UTF-8' });
    return res.end('Bad request');
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      return res.end('Not found');
    }
    serveFile(filePath, req, res);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Latitude Sales site running at http://localhost:${PORT}`);
});
