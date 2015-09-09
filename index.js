// Very Simple HTTP server.
// It doesn't keep anything persistent, everything goes the way of the dodo
// when the server is shut down. Tough luck.

function Logger(name, initialValue) {
  var _enabled = initialValue;

  function log() {
    if (_enabled) {
      var args = Array.prototype.slice.call(arguments);
      args.unshift(name + ":");
      console.log.apply(console, args);
    }
  }

  return {
    log: log,
    set enabled(debugValue) {
      _enabled = debugValue;
    },
    get enabled() {
      return _enabled;
    }
  };
}

// serverPaths is an object that will have as primary key the HTTP method.
// Each of the serverPaths[method] in turn will hold an object whose key is a
// string (regexp) of a path and whose value is a function that should be
// invoked whenever the method and path matches
function PathMatcher(serverPaths) {
  'use strict';
  var logger = new Logger(false);

  var _paths = {};
  for (var method in serverPaths) {
    _paths[method] = [];
    for (var _path in serverPaths[method]) {
      var pathRE = new RegExp(_path);
      _paths[method].push({
        pathRE: pathRE,
        processor: serverPaths[method][_path]
      });
    }
  }

  function getProcessor(method, pathname) {
    var methodPaths = _paths[method] || _paths['DEFAULT'];
    var found = false;
    // Array.find is not in node....
    for(var i = 0, l = methodPaths.length; !found && i < l; i++) {
      found = methodPaths[i].pathRE.test(pathname) && methodPaths[i].processor;
    }
    return found || _paths['DEFAULT'][0].processor;
  }

  return {
    getProcessor: getProcessor,
    logger: logger
  };

}

// Do I want to export this? Don't think so, not at the moment anyway
//module.exports.PathMatcher = PathMatcher;


function SimpleHTTPServer(serverPort, serverConfig) {
  'use strict';

  var matcher = new PathMatcher(serverConfig);
  var logger = new Logger("SimpleHTTPServer:SimpleHttpServer", false);

  var http = require('http');
  var urlParser = require('url');
  var httpServer = null;

  function processRequest(aReq, aRes) {
    var method = aReq.method;
    var parsedURL = urlParser.parse(aReq.url);

    logger.log("Got a %s request!", method);
    logger.log("Headers: %s", JSON.stringify(aReq.headers));
    logger.log("Req: %s, %s", parsedURL.pathname, aReq.url);
    var processor = matcher.getProcessor(method, parsedURL.pathname);

    processor && processor(aReq, aRes, parsedURL);

  }

  function start() {
    logger.log("Creating server at port %d", serverPort);
    httpServer = http.createServer(processRequest);
    httpServer.listen(serverPort);
  }

  return {
    start: start,
    logger: logger
  };

};


// Config so far is just where / is mapped for static content
function CommonMethods() {

  var logger = new Logger("SimpleHTTPServer:CommonMethods", false);

  var mime = require('mime-types');

  var DEFAULT_TYPE = 'text/html';
  function getMimeType(aFile) {
    return mime.lookup(aFile) || DEFAULT_TYPE;
  }

  // TO-DO: This should be configurable...
  var VALID_HEADERS = [
      'content-security-policy',
      'content-security-policy-report-only'
  ];

  function addHeaders(aRes, additionalHeaders) {
    if (typeof additionalHeaders === 'string') {
      additionalHeaders = [additionalHeaders];
    }
    additionalHeaders.forEach(function(additionalHeader) {
      var separator = additionalHeader.indexOf(':');
      var header = additionalHeader.slice(0, separator);
      var value = additionalHeader.slice(separator + 1);
      if (VALID_HEADERS.indexOf(header.toLowerCase()) != -1) {
        aRes.setHeader(header, value);
      }
    });
  }

  function goAway(aRetCode, aReq, aRes, aParsedURL) {
    logger.log("goAway: " + aParsedURL.pathname);
    returnData(aRes, aRetCode || 404, "", "text/html");
  }

  function returnData(aRes, aStatusCode, aResult, aContentType) {
    aRes.statusCode = aStatusCode;
    aRes.setHeader("Content-Length", aResult.length);
    aRes.setHeader("Content-Type", aContentType);
    aRes.end(aResult);
  }

  var fs = require('fs');
  var Promise = require('promise');
  var qs = require('querystring');
  var readFile = Promise.denodeify(fs.readFile);


  // Serves a static content that was requested on a GET petition
  // Aditionally, adds as headers whatever is requested on the query string
  // (?add_header=header1:value&add_header=header2:value2 and so on)
  // If you're going to use this, please remember to bind aConfig!
  // So far so well, aConfig must be an object with STATIC_PREFIX defined
  // TO-DO. This sucks.
  function serveStaticContent(aConfig, aReq, aRes, aParsedURL) {
    function getRealFilePath() {
      var realFile = aConfig.STATIC_PREFIX + aParsedURL.pathname;
      return realFile;
    }

    var realFile = getRealFilePath();
    addHeaders(aRes, qs.parse(aParsedURL.query).add_header || []);

    // TO-DO (or not): add caching?
    readFile(realFile).then(function(filecontent) {
      logger.log("Read file: " + realFile);
      returnData(aRes, 200, filecontent, getMimeType(aParsedURL.pathname));
    }).catch(function(error) {
      logger.log("Error reading file: " + realFile + ". ERR: " +
            JSON.stringify(error));
      goAway(404, aReq, aRes, aParsedURL);
    });
  }

  function allowCORS(aReq, aRes) {
    // Always allow CORS!!! Who needs security & privacy anyway? :P
    if (aReq.headers.origin) {
      aRes.setHeader("Access-Control-Allow-Origin","*");
    }

    // Lets be VERY promiscuous... just don't do that on any serious server
    aRes.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    aRes.setHeader("Access-Control-Allow-Origin", "*");

    // If the request has Access-Control-Request-Headers headers, we should
    // answer with an Access-Control-Allow-Headers...
    var rh = aReq.headers["access-control-request-headers"];
    if (rh) { // We don't really care much about this...
      aRes.setHeader("Access-Control-Allow-Headers", rh);
    }
  }

  return {
    serveStaticContent: serveStaticContent,
    goAway: goAway,
    returnData: returnData,
    allowCORS: allowCORS,
    logger: logger
  };
}


module.exports.SimpleHTTPServer = SimpleHTTPServer;
module.exports.CommonMethods = CommonMethods();
module.exports.HTTPLogger = Logger;
