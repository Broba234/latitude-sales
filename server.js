// Minimal static server to serve the site and /admin page
// Usage: node server.js

const http = require('http');
const path = require('path');
const fs = require('fs');

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

function serveFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  // Route "/" -> index.html, "/admin" -> admin.html
  if (url.pathname === '/') {
    return serveFile(path.join(publicDir, 'index.html'), res);
  }
  if (url.pathname === '/admin') {
    return serveFile(path.join(publicDir, 'admin.html'), res);
  }
  // Favicon fallback: serve custom SVG for /favicon.ico
  if (url.pathname === '/favicon.ico') {
    return serveFile(path.join(publicDir, 'latitude sales favicon.svg'), res);
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
    serveFile(filePath, res);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Latitude Sales site running at http://localhost:${PORT}`);
});
