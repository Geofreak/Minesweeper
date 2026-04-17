const http = require('http');
const fs   = require('fs');
const path = require('path');

// Render.com setzt PORT als Umgebungsvariable – lokal fällt es auf 3000 zurück
const PORT = process.env.PORT || 3000;

// Gewinnnachricht – nur serverseitig gespeichert, nie im Client-Code sichtbar
const WIN_MESSAGE = "🎉 Glückwunsch! Du hast das Minenfeld gemeistert! Alle Minen wurden erfolgreich markiert.";

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
};

// Wurzelverzeichnis = Ordner, in dem server.js liegt
// Das stellt sicher, dass Render.com und lokale Umgebung gleich funktionieren
const ROOT = __dirname;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // ----------------------------------------------------------------
  // API-Endpunkt: Gewinnnachricht
  // ----------------------------------------------------------------
  if (req.method === 'GET' && req.url === '/api/win-message') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: WIN_MESSAGE }));
    return;
  }

  // ----------------------------------------------------------------
  // Statische Dateien ausliefern
  // ----------------------------------------------------------------

  // URL-Parameter und Fragments entfernen, dann dekodieren
  let urlPath = req.url.split('?')[0].split('#')[0];
  try { urlPath = decodeURIComponent(urlPath); } catch (e) { /* ungültige Kodierung ignorieren */ }

  // Root-Anfrage → index.html
  if (urlPath === '/') urlPath = '/index.html';

  // Sicherheitscheck: Path-Traversal verhindern
  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found: ' + urlPath);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Minesweeper-Server läuft auf http://localhost:${PORT}`);
});
