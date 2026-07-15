const path = require('path');
const fs = require('fs');

module.exports = async (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).send('File path required');
  }

  // Security check - prevent directory traversal
  if (filePath.includes('..') || filePath.includes('\\')) {
    return res.status(403).send('Invalid path');
  }

  // Determine the base directory based on the path
  let baseDir;
  if (filePath.startsWith('ip-tracker/')) {
    baseDir = path.resolve(__dirname, '..', '..');
  } else {
    baseDir = path.resolve(__dirname, '..');
  }

  const fullPath = path.join(baseDir, filePath);
  
  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    return res.status(404).send('File not found');
  }

  // Set content type based on file extension
  const ext = path.extname(filePath);
  const contentTypes = {
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.html': 'text/html',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };
  
  const contentType = contentTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  
  // Send file
  res.sendFile(fullPath);
};
