# simpleHTTPServer
Very simple HTTP Server configuration for node. And I mean the very simple part.

## Usage:

Just add something like
```
    "simpleHttpServer": "git://github.com/AntonioMA/simpleHTTPServer",

```
to your package.json devDependencies section to import it, and

```
npm install
```

as usual to install. Then to use:

``` javascript
var httpServer = require('SimpleHTTPServer');
var SimpleHTTPServer = httpServer.SimpleHTTPServer;
var CommonMethods = httpServer.CommonMethods;

const SERVER_PATHS = {
  'GET': {
    '^/about(.html)?(/.*)?$': aboutFunction,
    '^/some/path(/.*)?$': serveSomePath,
    '.*': CommonMethods.serveStaticContent.
      bind(undefined, {STATIC_PREFIX: './static'})
  },
  'POST': {
    '^/users$': doUserPost,
    '.*': CommonMethods.goAway.bind(undefined, 403)
  },
  'OPTIONS': {
    '.*': doOptions
  },
  'DEFAULT': {
    '.*': CommonMethods.goAway.bind(undefined, 404)
  }
}

var server = new SimpleHTTPServer(8080, SERVER_PATHS);
server.start();

```

The signature of the methods that are called for each path is:

method(aReq, aRes, aParsedURL) where aReq is the request, aRes the response object and aParsedURL is the parsed URL.

