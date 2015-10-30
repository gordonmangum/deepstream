// If use ssl, will need to check that too
// TO-DO change this to a 301 redirect once totally sure
WebApp.connectHandlers.use(function(req, res, next) {
  if (req.method === 'GET' && req.headers.host.match(/^www/) !== null ) { // www redirect to bare domain
    res.writeHead(307, {Location: req.headers['x-forwarded-proto'] + '://' + req.headers.host.replace(/^www\./, '') + req.url});
    res.end();
  } else if (req.method === 'GET' && req.headers['x-forwarded-proto'].match(/^https/) !== null ) { // https redirect to http
    res.writeHead(307, {Location: 'http://' + req.headers.host + req.url});
    res.end();
  } else {
    next();
  }
});

if (_.contains([true, 'true'], process.env.ALLOW_BOTS)){
  robots.addLine('User-agent: *\nDisallow: /create/');
} else {
  robots.addLine('User-agent: *\nDisallow: /');
}

WebApp.connectHandlers.use(Meteor.npmRequire("prerender-node"));

