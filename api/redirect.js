export default function handler(req, res) {
  const requestDetails = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: req.query
  };

  console.log('Request received:', JSON.stringify(requestDetails, null, 2));

  if (req.url.includes('/log')) {
    // Log endpoint to capture data from SSRF
    console.log('SSRF Data received:', req.query);
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      status: "Data logged successfully",
      received: req.query
    });
  } else {
    // Redirect to data URI (for other requests)
    res.setHeader('Location', 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0icmVkIi8+PHRleHQgeD0iNTAiIHk9IjUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSI+U1NSRjwvdGV4dD48L3N2Zz4=');
    res.status(302).end();
  }
}
