// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();

app.set('view engine', 'pug')

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', function(request, response) {
  response.render('index', { title: 'SE HNQ Feeds for Chat', message: 'Hello there!', paylpalbusinesscode: process.env.PAYPAL_BUSINESSCODE });
});


const HNS = require('./hotness.js');
var hns = new HNS();

const hotctrl = require('./HotnessController.js');

app.get('/hnq/:site', function(request, response) {
  console.log('site %s, host %s, ourl: %s, us %s, ip: %s', request.params.site,request.hostname , request.originalUrl, request.headers['user-agent'], request.headers['x-forwarded-for']) ;
  //console.log('headers', request.headers);
  response.type('xml');
  var ctrl = new hotctrl(hns);
  ctrl.getData(request.params.site, request.hostname , request.originalUrl, request.headers['user-agent']).then((feed) => {
    console.log('feed', feed.feeds.length);
    response.render('rss', feed);
  });
});

app.get('/hnq/:room/:site', function(request, response) {
  console.log('site', request.params.site);
  console.log('room', request.params.room);
  response.type('xml');
  var ctrl = new hotctrl(hns);
  ctrl.getData(request.params.site, request.hostname , request.originalUrl).then((feed) => {
  response.render('rss', feed);
  });
});

app.get('/status', function(request, response) {
  console.log('/status');
  var status = hns.getStatus();
  response.render('status', status);
});

app.get('/about', function(request, response) {
  response.render('about', {title:'SE HNQ Feeds for Chat'});
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});

