
var express = require('express');
var app = express();

const HNS = require('./hotness.js');
var hns = new HNS();

const hotctrl = require('./controllers/HotnessController.js');
const Migrationctrl = require('./migrationScraper.js');
const migrationCtrl = new Migrationctrl();
const StatusCtrl = require('./controllers/statusController.js');
var statusCtrl = new StatusCtrl(hns);
const ChatroomsCtrl = require('./controllers/chatroomsController.js');
var chatroomsCtrl = new ChatroomsCtrl();
const ApiCtrl = require('./controllers/apiController.js');
var apiCtrl = new ApiCtrl(hns);

// const testapiSvc = require('./services/se-api.js');

const MigrartionsCtrl = require('./controllers/migrationsController.js');

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

app.use(express.urlencoded({
  extended: true
}))

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', function(request, response) {
  response.render('index');
});


app.get('/migrations/feeds/:site', function(request, response) {
  response.type('xml');
  //var ctrl = migrationCtrl.getViewModel(request.hostname , request.originalUrl, request.params.site).then((feed)=>{
   //      response.render('rss-migrated', feed);
  //  });
  // console.log(request.params.site);
  MigrartionsCtrl.getMigrations(request.params.site).then( (feed) => {
    response.render('rss-migrated', feed);
  }
  );
});

const diffMS = 10 * 60 * 1000;
app.post('/migrations/feeds/:site', function(request, response) {
  console.log('guard ', request.body);
  if (request.body && request.body.guard) {
    
    var guard = parseInt(request.body.guard);
    if (guard && Math.abs(guard - Date.now()) < diffMS) {
      console.log('diff ', guard , Math.abs(guard - Date.now()))
      response.redirect('/migrations/feeds/'+ request.params.site);
    } else {
      response.redirect('/migrations');  
    }
  } else {
    response.redirect('/migrations');
  }
});

app.get('/migrations/posts', function(request, response) {
  
  //var ctrl = migrationCtrl.getViewModel(request.hostname , request.originalUrl, request.params.site).then((feed)=>{
   //      response.render('rss-migrated', feed);
  //  });
  console.log(request.params);
  MigrartionsCtrl.getMigrationPosts(request.query.page, request.query.pagesize).then( (posts) => {
    var page = parseInt(request.query.page||1);
    response.render('migrationPosts', {
      posts:posts, 
      next: page + 1 ,
      prev: page > 1 ? page - 1 : 1 
    });
  }
  );
});

app.get('/migrations/status', function(request, response) {
  MigrartionsCtrl.getMigrationStatus().then((data)=> {
       //console.log(sites);
      response.render('migrationStatus', {sites:data.sites, quota:data.quota} );  
  });
  
});


app.get('/migrations', function(request, response) {
  MigrartionsCtrl.getAllSites().then((sites)=> {
      response.render('migrations', {sites:sites} );  
  });
  
});


app.get('/hnq/:site', function(request, response) {
  //console.log('site %s, host %s, ourl: %s, us %s, ip: %s', request.params.site,request.hostname , request.originalUrl, request.headers['user-agent'], request.headers['x-forwarded-for']) ;
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

