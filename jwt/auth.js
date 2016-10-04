var config = require('../config')();
var jwt = require('jsonwebtoken');
var url = require('url');
var querystring = require('querystring');

function jwtToken(req) {
  var token;

  // Pull the JWT from the Authorization header
  var authHeader = req.headers['authorization'];

  if (authHeader) {
    // Strip the Bearer string from the beginning
    token = authHeader.replace('Bearer ', '');
  } else if (req.method === 'GET' || req.method === 'DELETE') {
    // Look for it as a query param (jwt)
    var uri = url.parse(req.url);
    var queryObj = querystring.parse(uri.query);
    token = queryObj['jwt'];
  } else if (req.body) {
    // Look for it as part of the body
    token = req.body['jwt'];
  }

  return token;
};

const authMiddleware = function(jwtKey) {
  return function (req, res, next) {
    var token = jwtToken(req);

    if (!token) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'NoJWT',
        message: 'No JWT. Send as a Bearer token via the Authorization header or a "jwt" query param.'
      }));

      return;
    }

    // The params we are going to use to verify the JWT
    // More info: https://github.com/auth0/node-jsonwebtoken
    var verifyParams = {
      clockTolerance: 15
    };

    var decoded = {};

    // Attempt to decode the JWT
    try {
      // Set the decoded JSON to a property on the req for use later
      req.jwtDecoded = jwt.verify(token, jwtKey, verifyParams);
      // Move along to the next part of the request
      next();
    } catch(err) {
      // An error was thrown
      var status;
      var error = {
        error: err.name,
        message: err.message
      };

      // Handle the errors associated with a bad JWT
      switch(err.name) {
        case 'TokenExpiredError':
          status = 401;
          break;
        case 'NotBeforeError':
          status = 401;
          break;
        case 'JsonWebTokenError':
          status = 401;
          break;
        default:
          status = 401;
      }

      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(error));
    }
  };
};

module.exports = authMiddleware;
