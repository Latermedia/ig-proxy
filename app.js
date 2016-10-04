var express = require('express');
var basicInstagramProxy = require('./proxies/self-contained-instagram');
var instagramProxy = require('./proxies/instagram');
var jwtAuth = require('./jwt/auth');
var jwtIgAuth = require('./jwt/igAuth');
var config = require('./config')();

var app = express();

app.get('/', function (req, res) {
	console.log(config);
  res.send('This is my basic Instagram API Proxy!!!');
});

// basic signed Instagram API request
app.use(instagramProxy('/proxy/instagram', config['INSTAGRAM_CLIENT_SECRET']));

// authenticate proxy request using a JWT
app.use(jwtAuth(config['JWT_KEY']), jwtIgAuth, instagramProxy('/secure-proxy/instagram', config['INSTAGRAM_CLIENT_SECRET']));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  res.status(404);
  // default to plain-text. send()
  res.type('txt').send('Not found');
});

var port = 2000;
app.listen(port, function () {
  console.log('Basic Instagram API Proxy listening on port ' + port + '!');
});

// curl test examples
//
// curl -F 'access_token=<ACCESS TOKEN>' https://$HOST/proxy/instagram/media/<MEDIA ID>/likes
// curl -X DELETE https://$HOST/proxy/instagram/media/<MEDIA ID>/likes?access_token=<ACCESS TOKEN>
//
// curl --header "X-Authorization: Bearer <JWT>" -F 'access_token=<ACCESS TOKEN>' https://$HOST/secure-proxy/instagram/media/<MEDIA ID>/likes
// curl -F 'access_token=<ACCESS TOKEN>' -F 'jwt=<JWT>' https://$HOST/secure-proxy/instagram/media/<MEDIA ID>/likes
// curl --header "X-Authorization: Bearer <JWT>" -X DELETE https://$HOST/secure-proxy/instagram/media/<MEDIA ID>/likes?access_token=<ACCESS TOKEN>
// curl -X DELETE https://$HOST/secure-proxy/instagram/media/<MEDIA ID>/likes?access_token=<ACCESS TOKEN>&jwt=<JWT>
