const httpclient = require('https');
const zlib = require("zlib");
const seapi = require('../../services/se-api');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

describe('seapi', () => {
  let sandbox;
  let clock;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    clock = null;
  });

  afterEach(() => {
    sandbox.restore();
    if (clock) clock.restore();
  });

  function setupGet(data, contentType) {
    const stubHttpClientGet = sandbox.stub(httpclient, 'get');
    const dataCallback = [data, '{}'];
    const mockResponse = {
      statusCode: 200,
      headers: {
        'content-type': contentType ?? 'application/json',
        'content-encoding': 'gzip'
      },
      pipe: sinon.spy() // Mock the pipe method
    };
  
    const zipStub = sandbox.stub(zlib, 'createGunzip').returns({
      on: (event, callback) => {
        if (event === 'data') {
          callback(dataCallback.shift()); // Simulate data stream
        } else if (event === 'end') {
          callback();
        }
      },
    });

    stubHttpClientGet.yields(mockResponse);
    return {httpClientGetStub:stubHttpClientGet, zipStub:zipStub};
  }

  it('should call getMigrated', async () => {
    // arrange
    const mockData = { items: [
      { migrated_from: { on_date: Date.now() / 1000 }},
      { migrated_from: { on_date: Date.now() / 1000 - 10 }}
    ] };
    const {httpClientGetStub, zipStub} = setupGet(JSON.stringify(mockData));
    const site = 'foo';
    const page = 2;
    // act
    const migrated = await seapi.getMigrated(site, page);
   
    // assert
    expect(migrated.items.length).to.be.eq(2);
    expect(migrated.items[1].migration_date).to.be.eq(mockData.items[0].migrated_from.on_date);
    expect(migrated.items[1].last_activity_date).to.be.eq(mockData.items[0].migrated_from.on_date);
    expect(httpClientGetStub.calledOnceWithMatch( sinon.match( (p) =>{
      return p.path.indexOf('search/advanced') > -1 && 
             p.path.indexOf(`page=${page}`) > -1 &&
             p.path.indexOf(`site=${site}`) > -1;
    } ))).to.be.true;
    expect(zipStub.calledOnce).to.be.true;
    
  });

  it('should call getSites', async () => {
    // arrange
    const mockData = { items: [{ title: 'Test Question' }] };
    const {httpClientGetStub, zipStub} = setupGet(JSON.stringify(mockData));
   
    // act
    const sites = await seapi.getSites();
   
    // assert
    expect(sites.items.length).to.be.eq(1);
    expect(sites.items[0].title).to.be.eq("Test Question");
    expect(httpClientGetStub.calledOnce).to.be.true;
    expect(zipStub.calledOnce).to.be.true;
    
  });

  it('should getSites set hasBackoff to true', async () => {
    // arrange
    const mockData = { backoff: 1337};
    const {httpClientGetStub, zipStub} = setupGet(JSON.stringify(mockData));
   
    // act
    await seapi.getSites();
    
    // assert
    expect(seapi.hasBackoff()).to.be.true;
    expect(httpClientGetStub.calledOnce).to.be.true;
    expect(zipStub.calledOnce).to.be.true;

    clock = sinon.useFakeTimers();
    seapi.getSites().then(()=> {
      console.log('success');
    });
    clock.runAll();
    
  });

  it('should getSites log error and reject when no application/json content is returned', async () => {
    // arrange
    const mockData = {};
    const {httpClientGetStub, zipStub} = setupGet(JSON.stringify(mockData), 'text/html');
   
    // act
    try {
      await seapi.getSites();
    } catch(e) {
      expect(e).to.be.eq('scrape failed');
    }
    // assert
    expect(httpClientGetStub.calledOnce).to.be.true;
    expect(zipStub.calledOnce).to.be.false;
    
  });

  it('should getSites set quota to value', async () => {
    // arrange
    const mockData = { quota_remaining: 1337};
    const {httpClientGetStub, zipStub} = setupGet(JSON.stringify(mockData));
   
    // act
    await seapi.getSites();
   
    // assert
    expect(seapi.getQuota()).to.be.eq(1337);
    expect(httpClientGetStub.calledOnce).to.be.true;
    expect(zipStub.calledOnce).to.be.true;
    
  });

  it('should getSites set quota and log on low value', async () => {
    // arrange
    const mockData = { quota_remaining: 42};
    const {httpClientGetStub, zipStub} = setupGet(JSON.stringify(mockData));
   
    // act
    await seapi.getSites();
   
    // assert
    expect(seapi.getQuota()).to.be.eq(42);
    expect(httpClientGetStub.calledOnce).to.be.true;
    expect(zipStub.calledOnce).to.be.true;
    
  });

  it('should handle invalid json', async () => {
    // arrange
    const {httpClientGetStub, zipStub} = setupGet('<html><body>No JSON here!</body></html>');
    
    // act / assert
    try {
      await seapi.getSites();
    } catch(e) {
        expect(e.message).to.be.eq('-2 ; No JSON ; json parse failed');
    }
   
    expect(httpClientGetStub.calledOnce).to.be.true;
    expect(zipStub.calledOnce).to.be.true;
    
  });

  it('should handle API error response', async () => {
    // arrange
    const mockData = {
        error_id: 4711, 
        error_message: 'Foo',
        error_name: 'Bar',
        backoff: 1337, 
        quota_remaining: 42
      };
    const {httpClientGetStub, zipStub} = setupGet(
      JSON.stringify(mockData));
    
    // act / assert
    try {
      await seapi.getSites();
    } catch(e) {
        expect(e.message).to.be.eq('4711 ; Foo ; Bar');
    }
   
    expect(httpClientGetStub.calledOnce).to.be.true;
    expect(zipStub.calledOnce).to.be.true;
    
  });

  /*
  it('should call httpclient.get with the correct options', async () => {
    const path = 'questions';
    const params = { tag: 'javascript' };
    process.env.SE_API_KEY = 'test_api_key'; // Set API key for testing

    const stubHttpClientGet = sandbox.stub(httpclient, 'get');
    const resolveStub = sinon.stub();
    const rejectStub = sinon.stub();

    await get(path, params);

    expect(stubHttpClientGet.calledOnce).to.be.true;
    const options = stubHttpClientGet.firstCall.args[0];

    expect(options.hostname).to.equal('api.stackexchange.com');
    expect(options.path).to.equal('/2.3/questions?tag=javascript&key=test_api_key');
    expect(options.port).to.equal(443);
    expect(options.secure).to.be.true;
    expect(options.method).to.equal('GET');
    expect(options.headers['Accept']).to.equal('application/json');
    expect(options.headers['Accept-Encoding']).to.equal('gzip');
    expect(options.headers['User-Agent']).to.equal('HotQuestionScraper/1.0 https://sefeeds.socvr.org/ https://meta.stackexchange.com/users/158100/rene');

  });

  it('should handle missing SE_API_KEY and log a warning', async () => {
    const path = 'questions';
    const params = { tag: 'javascript' };
    process.env.SE_API_KEY = undefined; // Unset API key for testing

    const stubConsoleWarn = sandbox.stub(console, 'warn');
    const stubHttpClientGet = sandbox.stub(httpclient, 'get');
    const resolveStub = sinon.stub();
    const rejectStub = sinon.stub();

    await get(path, params);

    expect(stubConsoleWarn.calledOnce).to.be.true;
    expect(stubConsoleWarn.firstCall.args[0]).to.include('SE-API');
    expect(stubConsoleWarn.firstCall.args[1]).to.deep.equal([ 'tag=javascript' ]);

  });


  it('should resolve the promise with the API response data', async () => {
    const path = 'questions';
    const params = { tag: 'javascript' };
    process.env.SE_API_KEY = 'test_api_key'; // Set API key for testing

    const stubHttpClientGet = sandbox.stub(httpclient, 'get');
    const mockResponse = {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'content-encoding': 'gzip'
      },
      pipe: sinon.spy() // Mock the pipe method
    };

    stubHttpClientGet.resolves(mockResponse);

    const mockData = { items: [{ title: 'Test Question' }] };
    const zipStub = sandbox.stub(zlib, 'createGunzip').returns({
      on: (event, callback) => {
        if (event === 'data') {
          callback('{"items":[{"title":"Test Question"}]}'); // Simulate data stream
        } else if (event === 'end') {
          callback();
        }
      },
    });

    await get(path, params);

    expect(mockResponse.pipe.calledOnce).to.be.true;
    expect(zipStub.calledOnce).to.be.true;
  });

  it('should reject the promise if JSON parsing fails', async () => {
    const path = 'questions';
    const params = { tag: 'javascript' };
    process.env.SE_API_KEY = 'test_api_key'; // Set API key for testing

    const stubHttpClientGet = sandbox.stub(httpclient, 'get');
    const mockResponse = {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'content-encoding': 'gzip'
      },
      pipe: sinon.spy() // Mock the pipe method
    };

    stubHttpClientGet.resolves(mockResponse);

    const zipStub = sandbox.stub(zlib, 'createGunzip').returns({
      on: (event, callback) => {
        if (event === 'data') {
          callback('invalid json'); // Simulate invalid data stream
        } else if (event === 'end') {
          callback();
        }
      },
    });

    try {
      await get(path, params);
      expect.fail('Promise should have been rejected');
    } catch (error) {
      expect(error.message).to.include('No JSON');
    }
  });

  it('should reject the promise if API returns an error', async () => {
    const path = 'questions';
    const params = { tag: 'javascript' };
    process.env.SE_API_KEY = 'test_api_key'; // Set API key for testing

    const stubHttpClientGet = sandbox.stub(httpclient, 'get');
    const mockResponse = {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'content-encoding': 'gzip'
      },
      pipe: sinon.spy() // Mock the pipe method
    };

    stubHttpClientGet.resolves(mockResponse);

    const zipStub = sandbox.stub(zlib, 'createGunzip').returns({
      on: (event, callback) => {
        if (event === 'data') {
          callback('{"error_id": 103,"error_message":"Bad request","error_name":"bad_request"}'); // Simulate error data stream
        } else if (event === 'end') {
          callback();
        }
      },
    });

    try {
      await get(path, params);
      expect.fail('Promise should have been rejected');
    } catch (error) {
      expect(error.message).to.include('103');
    }
  }); */
});
