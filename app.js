var express = require('express');
var bodyParser = require('body-parser');

var instagramProxy = require('./proxies/instagram');
var jwtAuth = require('./jwt/auth');
var jwtIgAuth = require('./jwt/igAuth');
var config = require('./config')();

var app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', function (req, res) {
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
// curl -X POST -d 'access_token=<ACCESS TOKEN>' http://<HOST>/proxy/instagram/media/<MEDIA ID>/likes
// curl -X POST -H 'Content-Type: application/json' -d '{ "access_token" : "<ACCESS_TOKEN>" }' http://<HOST>/proxy/instagram/media/<MEDIA ID>/likes
// curl -X DELETE http://<HOST>/proxy/instagram/media/<MEDIA ID>/likes?access_token=<ACCESS TOKEN>
//
// curl -X POST --header 'X-Authorization: Bearer <JWT>' -d 'access_token=<ACCESS TOKEN>' http://<HOST>/secure-proxy/instagram/media/<MEDIA ID>/likes
// curl -X POST -d 'access_token=<ACCESS TOKEN>' -d 'jwt=<JWT>' http://<HOST>/secure-proxy/instagram/media/<MEDIA ID>/likes
// curl -X DELETE --header 'X-Authorization: Bearer <JWT>' http://<HOST>/secure-proxy/instagram/media/<MEDIA ID>/likes?access_token=<ACCESS TOKEN>
// curl -X DELETE http://<HOST>/secure-proxy/instagram/media/<MEDIA ID>/likes?access_token=<ACCESS TOKEN>&jwt=<JWT>
// curl -X DELETE http://<HOST>/secure-proxy/instagram/media/<MEDIA ID>/likes?jwt=<JWT>&access_token=<ACCESS TOKEN>
