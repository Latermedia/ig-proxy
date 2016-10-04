var proxy = require('http-proxy-middleware');
var crypto = require('crypto');
var url = require('url');
var querystring = require('querystring');

// We need to enusre that the keys are sorted correctly.
// Javascript preservse the insertion order of dictionaries.
function sort_object(object) {
  if (!object) {
    return new Object;
  }

  var keys = Object.keys(object),
    i, len = keys.length;

  keys.sort();
  var newobj = new Object;
  for (i = 0; i < len; i++) {
    k = keys[i];
    newobj[k] = object[keys[i]];
  }
  return newobj;
};


// Get the request signature
// https://www.instagram.com/developer/secure-api-requests/
function requestSignature(endpoint, params, clientSecret) {
  if (typeof clientSecret !== 'string') {
    throw new Error('Wrong param "clientSecret"');
  } else if (!clientSecret) {
    throw new Error('Must defined "clientSecret"');
  }

  if (endpoint.indexOf("/v1") == 0) {
    endpoint = endpoint.substring(3);
  }

  var str = endpoint;

  var sortedParams = sort_object(params);
  for (var key in sortedParams) {
    if (sortedParams.hasOwnProperty(key)) {
      str += "|" + key + "=" + sortedParams[key];
    }
  }

  var hmac = crypto.createHmac('sha256', clientSecret);
  hmac.update(str);
  var sig = hmac.digest('hex');
  return sig;
};

// TODO:
// replace IG api links with proxy links

// This is the path prefix we'll be listening on:
//
// $HOST/<proxyPath>/users/self?access_token=<...>
//   is mapped to
// https://api.instagram.com/v1/users/self?access_token=<...>
//
// igSecret is your Instagram API Client secret

const igProxy = function(proxyPath, igSecret) {
  var pathRewriteStr = '^' + proxyPath;
  var pathRewriteOptions = {};
  pathRewriteOptions[pathRewriteStr] = '';

  return proxy(proxyPath, {
    target: 'https://api.instagram.com/v1',
    changeOrigin: true,
    logLevel: 'warn',
    pathRewrite: pathRewriteOptions,

    onProxyReq: function(proxyReq, req, res) {
      if (proxyReq.method === 'GET' || proxyReq.method === 'DELETE') {
        // Add the sig param to the query parameters for GET and DELETE
        var uri = url.parse(proxyReq.path);
        var pathname = uri.pathname;
        var queryObj = querystring.parse(uri.query);

        // Add sig param
        queryObj['sig'] = requestSignature(pathname, queryObj, igSecret);

        // Generate new path that now includes the request signature
        var newPath = pathname + '?' + querystring.stringify(queryObj);

        proxyReq.path = newPath;
      } else if (proxyReq.method === 'POST') {
        var body = req.body;

        // Remove current body
        if (req.body) delete req.body;

        var uri = url.parse(proxyReq.path);
        var pathname = uri.pathname;

        // Get request signature
        var sig = requestSignature(pathname, body, igSecret);

        // Add request signature to the body
        body['sig'] = sig;

        // Reencode the body
        var newBody = Object.keys(body).map(function(key) {
            return encodeURIComponent(key) + '=' + encodeURIComponent(body[key]);
        }).join('&');

        // Update the content-length header
        proxyReq.setHeader('content-type', 'application/x-www-form-urlencoded');
        proxyReq.setHeader('content-length', newBody.length);

        // Add new body to the request
        proxyReq.write(newBody);
        proxyReq.end();
      }
    },

    onError: function(err, req, res) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Something went wrong.');
    },
  });
};

module.exports = igProxy;
