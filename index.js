// Very Simple HTTP server.
// It doesn't keep anything persistent, everything goes the way of the dodo
// when the server is shut down. Tough luck.


// serverPaths is an object that will have as primary key the HTTP method.
// Each of the serverPaths[method] in turn will hold an object whose key is a
// string (regexp) of a path and whose value is a function that should be
// invoked whenever the method and path matches
function PathMatcher(serverPaths) {
  'use strict';

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
    getProcessor: getProcessor
  };

}

// Do I want to export this? Don't think so, not at the moment anyway
//module.exports.PathMatcher = PathMatcher;


function SimpleHTTPServer(serverPort, serverConfig) {
  'use strict';

  function debug() {
    console.log.apply(console,arguments);
  }

  var matcher = new PathMatcher(serverConfig);

  var http = require('http');
  var urlParser = require('url');
  var httpServer = null;

  function processRequest(aReq, aRes) {
    var method = aReq.method;
    var parsedURL = urlParser.parse(aReq.url);

    debug("Got a %s request!", method);
    debug("Headers: %s", JSON.stringify(aReq.headers));
    debug("Req: %s, %s", parsedURL.pathname, aReq.url);
    var processor = matcher.getProcessor(method, parsedURL.pathname);

    processor && processor(aReq, aRes, parsedURL);

  }

  function start() {
    debug("Creating server at port %d", serverPort);
    httpServer = http.createServer(processRequest);
    httpServer.listen(serverPort);
  }

  return {
    start: start
  };

};


module.exports.SimpleHTTPServer = SimpleHTTPServer;
