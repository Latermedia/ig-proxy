var express = require('express');
var instagramProxy = require('./proxies/instagram');
var config = require('./config')();

var app = express();

app.get('/', function (req, res) {
	console.log(config);
  res.send('This is my basic Instagram API Proxy!!!');
});

app.use(instagramProxy);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  res.status(404);
  // default to plain-text. send()
  res.type('txt').send('Not found');
});

app.listen(2000, function () {
  console.log('Basic Instagram API Proxy listening on port 3000!');
});
