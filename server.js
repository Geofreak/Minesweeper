const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// Gewinnnachricht – nur serverseitig gespeichert
const WIN_MESSAGE = "🎉 Glückwunsch! Du hast das Minenfeld gemeistert! Alle Minen wurden erfolgreich markiert.";

const MIME_TYPES = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
};

const server = http.createServer((req, res) => {
  // CORS-Header für lokale Entwicklung
  res.setHeader('Access-Control-Allow-Origin', '*');

  // API-Endpunkt: Gewinnnachricht
  if (req.method === 'GET' && req.url === '/api/win-message') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: WIN_MESSAGE }));
    return;
  }

  // Statische Dateien ausliefern
  let filePath = '.' + req.url;
  if (filePath === './') filePath = './index.html';

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Minesweeper-Server läuft auf http://localhost:${PORT}`);
});
