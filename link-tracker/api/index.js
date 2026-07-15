const path = require('path');
const fs = require('fs');

module.exports = async (req, res) => {
  const publicDir = path.join(__dirname, '..', 'public');
  const requestedPath = req.query.path || 'index.html';
  
  // Security check
  if (requestedPath.includes('..') || requestedPath.includes('\\')) {
    return res.status(403).send('Invalid path');
  }

  const fullPath = path.join(publicDir, requestedPath);
  
  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    return res.status(404).send('File not found');
  }

  // Set content type based on file extension
  const ext = path.extname(requestedPath);
  const contentTypes = {
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.html': 'text/html',
    '.json': 'application/json'
  };
  
  const contentType = contentTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  
  res.sendFile(fullPath);
};
