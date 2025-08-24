module.exports = (req, res) => {
  res.writeHead(302, {
    'Location': 'data:text/plain;base64,PGh0bWw+PHRpdGxlPkhlbGxvPC90aXRsZT48L2h0bWw+'
  });
  res.end();
};
