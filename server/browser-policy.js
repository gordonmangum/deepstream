BrowserPolicy.framing.allowAll(); // temporarily allow all sites to embed Deepstream
//BrowserPolicy.framing.restrictToOrigin(origin) // could be used to restrict embedding to specific providers
//BrowserPolicy.content.disallowInlineScripts(); // this would provide a backstop against XSS

BrowserPolicy.content.allowInlineScripts(); // TODO this seemed needed to get various jsapi's working (Twitter?), but is really not the best. Should be reconfirmed that this is necessary.
BrowserPolicy.content.allowEval(); // need to allow eval for YouTube iFrame API // TODO this might not be needed anymore https://code.google.com/p/gdata-issues/issues/detail?id=6566
BrowserPolicy.content.allowInlineStyles(); // we use inline styles a fair bit
BrowserPolicy.content.allowImageOrigin('*'); // allowing all images is easiest and seems safe

// allow videos from specific sources only
BrowserPolicy.content.allowMediaOrigin('res.cloudinary.com');
BrowserPolicy.content.allowMediaOrigin('*.imgur.com');
BrowserPolicy.content.allowMediaOrigin('*.giphy.com');
BrowserPolicy.content.allowMediaOrigin('flash.media.mit.edu');

// allow iframes from everywhere (needed for various browser bookmarklets)
BrowserPolicy.content.allowFrameOrigin('*');

// allow iframes from specific sources only (why not)
BrowserPolicy.content.allowFontOrigin('*.gstatic.com');
BrowserPolicy.content.allowFontOrigin('*.bootstrapcdn.com');
BrowserPolicy.content.allowFontOrigin('*.googleapis.com');
BrowserPolicy.content.allowFontOrigin('*.bambuser.com');
BrowserPolicy.content.allowStyleOrigin('*');

// allow scripts from everywhere
BrowserPolicy.content.allowScriptOrigin('*');

// allow styles from specific sources only
BrowserPolicy.content.allowStyleOrigin('*.bootstrapcdn.com');
BrowserPolicy.content.allowStyleOrigin('*.googleapis.com');

// allow objects from specific sources only
BrowserPolicy.content.allowObjectOrigin('*.bambuser.com');
BrowserPolicy.content.allowObjectOrigin('www-cdn.jtvnw.net');

// allow connect everywhere
BrowserPolicy.content.allowConnectOrigin('*');

// allow lots of twitter
BrowserPolicy.content.allowOriginForAll("http://platform.twitter.com");
BrowserPolicy.content.allowOriginForAll("https://platform.twitter.com");
BrowserPolicy.content.allowOriginForAll("https://*.twimg.com");
BrowserPolicy.content.allowOriginForAll("https://twitter.com");
BrowserPolicy.content.allowOriginForAll("https://*.twitter.com");
