
var express = require('express');
var app = express();

const HNS = require('./hotness.js');
var hns = new HNS();

const hotctrl = require('./HotnessController.js');
const StatusCtrl = require('./statusController.js');
var statusCtrl = new StatusCtrl(hns);
const ChatroomsCtrl = require('./chatroomsController.js');
var chatroomsCtrl = new ChatroomsCtrl();
const ApiCtrl = require('./apiController.js');
var apiCtrl = new ApiCtrl(hns);

app.set('view engine', 'pug')


// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

app.use((req, res, next) => {
  // the /hnq/ route is where the feedreaders end up
  // that route only produces XML
  // it doesn't need context
  if (req.originalUrl.indexOf('/hnq/') === -1) {
    res.locals.title = 'SE HNQ Feeds for Chat';
    res.locals.paypalbusinesscode = process.env.PAYPAL_BUSINESSCODE;
    res.locals.summary = statusCtrl.getStatusSummary();
  }
  next()
})

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', function(request, response) {
  response.render('index');
});


app.get('/hnq/:site', function(request, response) {
  // console.log('site %s, host %s, ourl: %s, us %s, ip: %s', request.params.site,request.hostname , request.originalUrl, request.headers['user-agent'], request.headers['x-forwarded-for']) ;
  //console.log('headers', request.headers);
  response.type('xml');
  var ctrl = new hotctrl(hns);
  ctrl.getData(request.params.site, request.hostname , request.originalUrl, request.headers['user-agent'], request.query).then((feed) => {
    // console.log('feed', feed.feeds.length);
    response.render('rss', feed);
  });
});


app.get('/query/:site', function(request, response) {
  console.log('/query/site', request.params.site, request.query , request.originalUrl);
  response.render('empty');
});


app.get('/chatrooms', function(request, response) {
  var status = chatroomsCtrl.getChatrooms().then((data)=> {
    response.render('chatrooms', data);
  } ).catch((err)=> {
    console.error(err);
  });
  
});

app.get('/status', function(request, response) {
  var status = statusCtrl.getStatus().then((data)=> {
    response.render('status', data);
  } ).catch((err)=> {
    console.error(err);
  });
});

app.get('/api/charts', function(request, response) {
  apiCtrl.getChartData().then((data)=> {
    response.json(data);
  } ).catch((err)=> {
    console.error(err);
    response.json({error:'something went wrong'})
  });
});

app.get('/feeds', function(request, response) {
  response.render('feeds');
});

app.get('/chart', function(request, response) {
  response.render('chart');
});

app.get('/about', function(request, response) {
  response.render('about');
});

app.get('/error', function(request, response) {
  response.render('error');
});

app.get('/favicon.ico', function(request, response) {
  var ico = '';
  response.write(ico);
});


// listen for requests :)
var listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});

