// Note: Must follow the jwt/auth middleware

var jwt = require('jsonwebtoken');
var url = require('url');
var querystring = require('querystring');

// Helper function to write out error
function sendError(res, status, error, message) {
  var err = {
    error: error,
    message: message
  };

  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(err));
};

// We have decoded and verified that we have a valid JWT
const auth = function (req, res, next) {
  // We don't have JWT, but we should
  if (!req.jwtDecoded) {
    sendError(res, 500, 'NoJWT', 'JWT was not decoded');
  } else {
    // Our JWT has an array of IG API access token this user is allowed to use
    var tokens = req.jwtDecoded['tokens'];

    var token;

    // Get the token they are trying to make a request with.
    if (req.method === 'GET' || req.method === 'DELETE') {
      var uri = url.parse(req.url);
      var queryObj = querystring.parse(uri.query);
      token = queryObj['access_token'];
    } else if (req.method === 'POST') {
      if (req.body) {
        token = req.body['access_token'];
      }
    }

    if (!token) {
      // An access token was not part of the request
      sendError(res, 401, 'NoAccessToken', 'No access token provided');
    } else if (!tokens) {
      // The user isn't allowed to use any access tokens.
      sendError(res, 401, 'NoJWTAccessTokens', 'No access token provided in the JWT');
    } else {
      // Is the given token in the list we're allowed to use?
      if (tokens.indexOf(token) >= 0) {
        // The user is allowed to make a proxied request with the access token
        // Proceed to the next part of the request.
        next();
      } else {
        // Not allowed to use this particular access token
        sendError(res, 403, 'AccessTokenNotPermitted', 'Access token provided is not permitted');
      }
    }
  }
};

module.exports = auth;
