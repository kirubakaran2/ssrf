module.exports = (req, res) => {
  res.writeHead(302, {
    'Location': 'data:text/plain;base64,PGh0bWw+PHRpdGxlPkhlbGxvPC90aXRsZT48L2h0bWw+'
  });
  res.end();
};const requestLogs = [];

/**
 * Handles incoming requests and performs a redirect or displays logs.
 * @param {object} req The HTTP request object.
 * @param {object} res The HTTP response object.
 */
module.exports = (req, res) => {
  // Log the request URL and a timestamp
  requestLogs.push({
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method
  });

  // Check if the request is for the logging endpoint
  if (req.url === '/log') {
    // Set the response headers for a JSON response
    res.writeHead(200, {
      'Content-Type': 'application/json'
    });
    // Send the JSON representation of the logs
    res.end(JSON.stringify(requestLogs, null, 2));
  } else {
    // If it's any other URL, perform the redirect for the CTF
    res.writeHead(302, {
      'Location': 'data:text/plain;base64,PGh0bWw+PHRpdGxlPkhlbGxvPC90aXRsZT48L2h0bWw+'
    });
    res.end();
  }
};
