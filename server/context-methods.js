var BAMBUSER_API_KEY = Meteor.settings.BAMBUSER_API_KEY;
var USTREAM_DATA_API_KEY = Meteor.settings.USTREAM_DATA_API_KEY;
var GOOGLE_API_SERVER_KEY = Meteor.settings.GOOGLE_API_SERVER_KEY;
var SOUNDCLOUD_CLIENT_ID = Meteor.settings.SOUNDCLOUD_CLIENT_ID;
var IMGUR_CLIENT_ID = Meteor.settings.IMGUR_CLIENT_ID;
var FLICKR_API_KEY = Meteor.settings.FLICKR_API_KEY;
var GIPHY_API_KEY = Meteor.settings.GIPHY_API_KEY;
var TWITTER_API_KEY = process.env.TWITTER_API_KEY || Meteor.settings.TWITTER_API_KEY;
var TWITTER_API_SECRET = process.env.TWITTER_API_SECRET || Meteor.settings.TWITTER_API_SECRET;
var EMBEDLY_KEY = Meteor.settings.EMBEDLY_KEY;
var VIMEO_API_KEY = Meteor.settings.VIMEO_API_KEY;
var VIMEO_API_SECRET = Meteor.settings.VIMEO_API_SECRET;
var VIMEO_ACCESS_TOKEN = Meteor.settings.VIMEO_ACCESS_TOKEN;


var Twit = Meteor.npmRequire('twit');
var Url = Meteor.npmRequire('url');
var Vimeo = Meteor.npmRequire('vimeo-api').Vimeo;

if (!GOOGLE_API_SERVER_KEY) {
  console.error('Settings must be loaded for apis to work');
  throw new Meteor.Error('Settings must be loaded for apis to work');
}


var decrementByOne = function(bigInt) {
  var intArr = bigInt.split("");
  if (intArr.length === 1) {
    return (intArr[0] -1).toString()
  }

  var result = [],
      borrow = 0;
  for (var i=intArr.length ; i--;) {
    var temp = intArr[i] - borrow - (i === intArr.length -1 ? 1 :0) ;
    borrow = temp < 0 ? 1 : 0;
    result.unshift(((borrow * 10) + temp).toString());
  }
  return result.join("")
};

var makeTwitterCall = function(apiCall, params) {
  var res;
  var user = Meteor.user();
  var client = new Twit({
    consumer_key: TWITTER_API_KEY,
    consumer_secret: TWITTER_API_SECRET,
    access_token: user.services.twitter.accessToken,
    access_token_secret: user.services.twitter.accessTokenSecret
  });

  var twitterResultsSync = Meteor.wrapAsync(client.get, client);
  try {
    res = twitterResultsSync(apiCall, params);
  }
  catch (err) {
    if (err.statusCode !== 404) {
      throw err;
    }
    res = {};
  }
  return res;
};

var searchES = Meteor.wrapAsync(
    esClient.search
, esClient);

var suggestES = Meteor.wrapAsync(esClient.suggest, esClient);

var searchYouTube = function (query, option, page) {
  var res;
  var nextPageToken;
  check(query, String);
  this.unblock();
  requestParams = {
    part: 'snippet',
    q: query,
    type: 'video',
    videoEmbeddable: 'true',
    maxResults: 50,
    key: GOOGLE_API_SERVER_KEY
  };

  if (option === 'live'){
    requestParams['eventType'] = 'live';
    requestParams['safeSearch'] = 'none';
  }

  if (page) {
    requestParams['pageToken'] = page;
  }
  res = HTTP.get('https://www.googleapis.com/youtube/v3/search', {
    params: requestParams
  });

  items = _.chain(res.data.items)
      .filter(function (element) {
        return element.id.videoId;
      })
      .map(function (element) {
        element.snippet.videoId = element.id.videoId;
        return element.snippet;
      })
      .value();

  if (items.length) {
    nextPageToken = res.data.nextPageToken || 'end';
  } else {
    nextPageToken = 'end';
  }

  return {
    'nextPage': nextPageToken,
    'items': items
  }
};

var searchTwitch = function (query, option, page) {
  var res;
  var nextPageToken;
  check(query, Match.Optional(String));
  this.unblock();
  var limit = 100;
  requestParams = {
    limit: limit,
    q: query
  };

  page = page || 0;

  requestParams['offset'] = page;

  res = HTTP.get('https://api.twitch.tv/kraken/search/streams', {
    params: requestParams,
    headers: {
      Accept: "application/vnd.twitchtv.3+json"
    }
  });

  items = res.data.streams;

  if (items && items.length === limit) {
    nextPageToken = page + 1;
  } else {
    nextPageToken = 'end';
  }

  return {
    'nextPage': nextPageToken,
    'items': items
  }
};

Meteor.methods({

  ///////////////////////////////////
  /////// SEARCH API METHODS ///////
  //////////////////////////////////
  /*

   input: (query, option, page (optional))
   output: {items: [..], nextPage: any constant value})

   */
  flickrImageSearchList (query, option, page) {
    var items, nextPage, linkSearch, path, requestParams;
    check(query, String);

    if ((query.indexOf('flickr.com') !== -1) && (query.indexOf('/photos/') !== -1)) {
      //search photo: flickr.com/photos/{user-id}/{photo-id}/in/photolist-{search-info}
      //individual photo:  flickr.com/photos/{user-id}/{photo-id}
      var split = _.compact(query.split('/'));
      var offset = split.indexOf('photos');
      if (split[offset + 2]) {
        var photo_id = (split[offset + 2]).match(/[\d]*/)[0];
        linkSearch = true;
      } else {
        linkSearch = false;
      }
    } else if ((query.indexOf('flic.kr') !== -1) && (query.indexOf('/p/') !== -1)) {
      //short url: https://flic.kr/p/{base58-photo-id}
      var photo_id = _.chain(query.split('/')).compact().last().value().match(/[\d\w]*/)[0];
      linkSearch = true;
    } else {
      linkSearch = false;
    }

    page = page || 1;  // flickr starts from 1
    this.unblock();

    if (linkSearch) {
      path = 'flickr.photos.getInfo';
      requestParams = {
        photo_id: photo_id,
        api_key: FLICKR_API_KEY,
        format: 'json',
        nojsoncallback: 1
      };
    } else {
      path = 'flickr.photos.search';
      requestParams = {
        tags: query.replace(' ', ','),
        text: query,
        api_key: FLICKR_API_KEY,
        format: 'json',
        privacy_filter: 1,
        media: 'photos',
        nojsoncallback: 1,
        sort: 'relevance',
        license: '1,2,3,4,5,6,7,8',
        per_page: 200,
        extras: ['owner_name', 'date_upload', 'url_z', 'url_c', 'url_l', 'url_h', 'url_k', 'url_o'],
        page: page
      };
    }

    var url = "https://api.flickr.com/services/rest/?&method=" + path;

    var res = HTTP.get(url, {
      params: requestParams
    });

    if (res.data) {
      var results = res.data;
    }

    if (results && (results.photos)) {
      
      items = results.photos.photo;
    } else if (results && results.photo) {
      items = [results.photo];
    } else {
      items = []
    }

    if (items.length) {
      nextPage = page + 1;
    } else {
      nextPage = 'end';
    }

    return {
      'items': items,
      'nextPage': nextPage
    };
  },
  imgurImageSearchList (query, option, page) {
    var res;
    var fullSearchItems;
    check(query, String);
    this.unblock();
    var nextPage;
    page = page || 0;

    var authorizationStr = "Client-ID " + IMGUR_CLIENT_ID;

    var urlItems = [];

    if (query.indexOf('imgur.com') !== -1) { // if paste in an image link, just grab it
      var id = _.chain(query.split('/')).compact().last().value().split('.')[0]; // if it's a url just send the final path segment without any extension;
      try {
        res = HTTP.get("https://api.imgur.com/3/image/" + id, {
          headers: {"Content-Type": "text", "Authorization": authorizationStr}
        });
      } catch (err) {
        if (!err.response || err.response.statusCode !== 404) { // swallow 404's, rethrow others
          throw err;
        }
      }
      if (res.data && res.data.data) {
        urlItems[0] = res.data.data;
      }
    }

    requestParams = {
      q: query
    };

    var url = 'https://api.imgur.com/3/gallery/search/top/' + page;
    // https://api.imgur.com/endpoints/gallery
    var res = HTTP.get(url, {
      params: requestParams,
      headers: {"Content-Type": "text", "Authorization": authorizationStr}
    });

    if (res.data && res.data.data) {
      fullSearchItems = _.filter(res.data.data, function (e) {
        return (e.type && e.type.indexOf('image') === 0)
      });
      if (fullSearchItems.length) {
        nextPage = page + 1;
      } else {
        nextPage = 'end'
      }
    } else {
      fullSearchItems = []
    }

    if (!fullSearchItems.length) {
      nextPage = 'end'
    }

    return {
      nextPage: nextPage,
      items: urlItems.concat(fullSearchItems)
    }
  },
  giphyGifSearchList (query, option, page) {
    var res;
    var items;
    var nextPage;
    check(query, String);
    this.unblock();
    page = page || 0;
    requestParams = {
      q: query,
      api_key: GIPHY_API_KEY,
      offset: page,
      limit: 50
    };

    var res = HTTP.get('http://api.giphy.com/v1/gifs/search', {
      params: requestParams
    });

    var data = res.data;

    if (data.data) {
      items = data.data;
    } else {
      items = [];
    }

    if (items.length && data.pagination) {
      var totalCount = data.pagination.total_count;
      nextPage = data.pagination.count + data.pagination.offset;

      if (nextPage >= totalCount) {
        nextPage = 'end';
      }
    } else {
      nextPage = 'end';
    }

    return {
      nextPage: nextPage,
      items: items
    }
  },
  soundcloudAudioSearchList (query, option, page) {
    var res;
    var items, nextPage, linkSearch, path, requestParams;
    check(query, String);

    if (query.indexOf('soundcloud.com') !== -1) {
      linkSearch = true;
    } else {
      linkSearch = false;
    }

    var offset = page || 0;
    var limit = 50;
    if (linkSearch) {
      path = 'resolve';
      requestParams = {
        url: query,
        client_id: SOUNDCLOUD_CLIENT_ID
      };
    } else {
      path = 'tracks';
      requestParams = {
        q: query,
        limit: limit,
        offset: offset,
        client_id: SOUNDCLOUD_CLIENT_ID
      };

    }

    this.unblock();

    var res = HTTP.get('http://api.soundcloud.com/' + path + '.json', {
      params: requestParams
    });

    var results;
    if (res && res.data) {
      results = res.data.length ? res.data : [res.data];
      if (results && (results[0].kind === 'track')) {
        items = results;
      } else {
        items = [];
      }
    } else {
      items = [];
    }

    if (items.length) {
      nextPage = offset + limit;
    } else {
      nextPage = 'end';
    }

    return {
      'nextPage': nextPage,
      'items': items
    }
  },
  twitterSearchList (query, option, page) {
    var res;
    var items = [];
    var isId = false;

    check(query, String);
    if (query.indexOf('twitter.com') !== -1) {
      var newQuery = _.chain(query.split('/')).compact().last().value().match(/[\d\w_]*/)[0];
      query = newQuery || query;
      isId = (/^\d+$/).test(query);
    }
    this.unblock();
    count = 30;
    var api = {
      'all': 'search/tweets',
      'all_url': 'statuses/show',
      'user': 'statuses/user_timeline',
      'favorites': 'favorites/list'
    };

    params = {count: count};
    if (page) {
      params['max_id'] = page;
    }
    if (option === 'all' && isId) {
      option = 'all_url';
      params['id'] = query;
    } else if (option === 'all') {
      params['q'] = query;
    } else {
      params['screen_name'] = query;
    }

    res = makeTwitterCall(api[option], params);

    if (option === 'all_url') {
      items[0] = res;
      page = "end";
    } else if (option === 'all') {
      items = res.statuses;
      page = res.search_metadata.next_results ? res.search_metadata.next_results.match(/\d+/)[0] : "end";
    } else if (res.length) {
      items = res;
      page = decrementByOne(items[items.length - 1].id_str);
    }

    searchResults = {
      nextPage: page,
      items: items
    };

    return searchResults;
  },
  embedlyEmbedResult (url) {
    var res, requestParams;
    check(url, String);
    this.unblock();

    requestParams = {
      url: url.trim(),
      key: EMBEDLY_KEY,
      maxheight: 300,
      maxwidth: CONTEXT_WIDTH
    };

    res = HTTP.get('http://api.embed.ly/1/oembed', {
      params: requestParams
    });
    return res.data;
  },
  embedlyExtractResult (url) {
    var res, requestParams;
    check(url, String);
    this.unblock();

    requestParams = {
      url: url.trim(),
      key: EMBEDLY_KEY,
      maxheight: 300,
      maxwidth: CONTEXT_WIDTH
    };

    res = HTTP.get('http://api.embed.ly/1/extract', {
      params: requestParams
    });
    return res.data;
  },
  vimeoVideoSearchList (query, option, page) {
    var items;
    var nextPage;
    var path = '/videos';
    check(query, String);
    if (query.indexOf('vimeo.com') !== -1) {
      var newQuery = _.chain(query.split('/')).compact().last().value().match(/[\d]*/)[0];
      path = path + '/' + newQuery;
    }

    this.unblock();
    page = page || 1;

    var client = new Vimeo(
        VIMEO_API_KEY,
        VIMEO_API_SECRET,
        VIMEO_ACCESS_TOKEN
    );

    var vimeoResultsSync = Meteor.wrapAsync(client.request, client);
    var params = {
      path: path,
      query: {
        query: query,
        sort: 'relevant',
        page: page,
        per_page: 40
      }
    };

    try {
      res = vimeoResultsSync(params);
      items = res.data || [res];
    }
    catch (err) {
      if (err.statusCode !== 404) {
        throw err;
      }
      items = [];
    }

    if (items.length) {
      nextPage = page + 1;
    } else {
      nextPage = 'end';
    }

    return {
      'items': items,
      'nextPage': nextPage
    };
  },
  streamSearchList (query, option, page){
    if (!page) {
      page = {};
    }
    page.es = page.es || 0;

    var searchResults = Meteor.wrapAsync(function(callback){
      async.parallel({
        youtubeResults: (cb) => {
          Meteor.setTimeout(() => {
            var now = Date.now();
            var youtubeResults = { // default
              items: [],
              nextPage: 'end'
            };
            try{
              if (page.youtube !== 'end'){
                youtubeResults = searchYouTube.call(this, query, 'live', page.youtube || null);

                _.each(youtubeResults.items, function(item){
                  _.extend(item, { _streamSource: 'youtube'})
                });
              }
              console.log('YouTube time: ' + (Date.now() - now))
              cb(null, youtubeResults);
            } catch (err){
              console.error('Error in streamSearchList: YouTube');
              console.error(err);
              cb(null, youtubeResults); // swallow error and get other results
            }
          });
        },
        twitchResults: (cb) => {
          Meteor.setTimeout(() => {
            var now = Date.now();
            var twitchResults = { // default
              items: [],
              nextPage: 'end'
            };
            try{
              if (page.twitch !== 'end'){
                twitchResults = searchTwitch.call(this, query, page.twitch || null);
                _.each(twitchResults.items, function(item){
                  _.extend(item, { _streamSource: 'twitch'})
                });
              }
              console.log('Twitch time: ' + (Date.now() - now))
              cb(null, twitchResults)
            } catch (err) {
              console.error('Error in streamSearchList: Twitch');
              console.error(err);
              cb(null, twitchResults); // swallow error and get other results
            }
          })
        },
        esResults: (cb) => {
          Meteor.setTimeout(() => {
            var now = Date.now();
            var esResults = { // default
              items: [],
              nextPage: 'end'
            };
            try {
              var esQuery = {
                index: ES_CONSTANTS.index,
                type: "stream",
                size: ES_CONSTANTS.pageSize * (parseInt(process.env.ELASTICSEARCH_PAGESIZE_MULTIPLIER) || parseInt(Meteor.settings.ELASTICSEARCH_PAGESIZE_MULTIPLIER) || 2), // get twice as many as needed in case of duplicates
                body: {
                  "min_score": 0.1,
                  query: {
                    multi_match: {
                      query: query,
                      fields: ["title", "broadcaster", "tags", "description"],
                    }
                  }
                }
              };

              if (page.es !== 'end') {
                esQuery.from = ES_CONSTANTS.pageSize * page.es;
                var results = searchES(esQuery);
                var idsInResults = [];

                esItemIds = _.chain(results.hits.hits) // get ids from elasticsearch
                  .pluck("_source")
                  .reject(function (item) {
                    var id = item.id;
                    if (_.contains(idsInResults, id)){
                      return true
                    } else {
                      idsInResults.push(id);
                    }
                  })
                  .first(ES_CONSTANTS.pageSize)
                  .pluck('id')
                  .value();

                console.log('Elasticsearch time: ' + (Date.now() - now))

                var mongoResults = Streams.find({id: {$in: esItemIds}}).fetch(); // get full documents from mongo

                console.log('Elasticsearch plus Mongo time: ' + (Date.now() - now))

                esResults.items = _.chain(esItemIds) // sort results by elasticsearch order
                  .map(function(id){
                    return _.findWhere(mongoResults, {id: id})
                  })
                  .compact()
                  .value();


                if (esResults.items.length === ES_CONSTANTS.pageSize)
                  esResults.nextPage = page.es + 1;
                else
                  esResults.nextPage = 'end';
              }
              cb(null, esResults);
            } catch (err) {
              console.error('Error in streamSearchList: ElasticSearch');
              console.error(err);
              cb(null, esResults);
            }
          });

        }
      }, function(error, results){
        if(error){
          console.error(error);
          callback(error, results)
        } else {
          callback(null, results)
        }
      });
    }, this)();

    esResults = searchResults.esResults;
    twitchResults = searchResults.twitchResults;
    youtubeResults = searchResults.youtubeResults;

    var nextPage = {
      es: esResults.nextPage,
      twitch: twitchResults.nextPage,
      youtube: youtubeResults.nextPage
    };

    var allSourcesExhausted = _.chain(nextPage)
      .values()
      .uniq()
      .every(function(v){
        return v === 'end'
      })
      .value();

    if(allSourcesExhausted){
      nextPage = 'end';
    }

    var items = _.chain(youtubeResults.items)
      .zip(esResults.items)
      .zip(twitchResults.items)
      .flatten()
      .compact()
      .value();

    return {
      items: items,
      nextPage: nextPage
    }
  },
  youtubeVideoSearchList: searchYouTube,
  bambuserVideoSearchList (query, option, page) {
    var res;
    var nextPageToken;
    check(query, Match.Optional(String));
    this.unblock();
    requestParams = {
      type: 'live', // or archived. default is both
      limit: 50,
      api_key: BAMBUSER_API_KEY
      // username,
      // max_age,
      // geo_distace/lat/lon
    };

    if (query){
      requestParams.tag = query.replace(' ', ',');
    }


    page = page || 0;

    if (page) {
      requestParams['page'] = page;
    }

    res = HTTP.get('http://api.bambuser.com/broadcast.json', {
      params: requestParams,
      timeout: 20000
    });

    items = res.data.result;

    if (items && items.length) {
      nextPageToken = page + 1;
    } else {
      nextPageToken = 'end';
    }


    return {
      'nextPage': nextPageToken,
      'items': items
    }
  },
  ustreamVideoSearchList (query, option, page) {
    var res;
    var nextPageToken;
    check(query, Match.Optional(String));
    this.unblock();
    requestParams = {
      limit: 100,
      key: USTREAM_DATA_API_KEY
    };

    var kindOfThingToSearch = 'channel'; // channel, user
    var sortBy = 'popular'; // live, recent
    var searchString = 'all'; //'title:like:' + query; // targetProperty:comparison:targetValue or all

    page = page || 1;

    requestParams['page'] = page;
    
    res = HTTP.get('http://api.ustream.tv/json/' + kindOfThingToSearch + '/' + sortBy + '/search/' + searchString, {
      params: requestParams,
      timeout: 20000
    });
    
    items = res.data.results;

    if (items && items.length) {
      nextPageToken = page + 1;
    } else {
      nextPageToken = 'end';
    }
    
    return {
      'nextPage': nextPageToken,
      'items': items
    }
  },
  embedToStreamMagic (query){
    check(query, Match.Optional(String));
    var nextPageToken = 'end';
    var items = [];
    var notice = null;
    var whitelist = ["ustream.tv", "www.ustream.tv", "periscope.tv", "www.periscope.tv", "w.soundcloud.com","www.soundcloud.com", "soundcloud.com", "player.vimeo.com", "vimeo.com", "www.vimeo.com", "www.facebook.com", "facebook.com", "tunein.com", "www.tunein.com", "livestream.com", "vine.co", "www.vine.co", "www.livestream.com"];
    var urlOnlyList = ["periscope.tv", "www.periscope.tv"];
    var embedOnlyList =  _.reject(whitelist, function(url){ return _.contains(urlOnlyList, url); });
    
    var re = /src="([^"']+)|src='([^"']+)/; 
    var str = query;
    var m;
    if ((m = re.exec(str)) !== null) {
      if (m.index === re.lastIndex) {
          re.lastIndex++;
      }
    }
    if(m && m[0]){
      m = _.filter(m, function(str){ if(typeof str === 'string') { return str.substring(0, 4) === "http" || str.substring(0, 2) === "//"; } else { return false}});
      if(m[0]){
        var url = m[0];
        var host;
        //find & remove protocol (http, ftp, etc.) and get domain
        if (url.indexOf("//") > -1) {
            host = url.split('/')[2];
        }
        else {
            host = url.split('/')[0];
        }
        //find & remove port number
        host = host.split(':')[0];
        if(_.contains(whitelist, host)){ // CHECK IF DOMAIN IN WHITELIST
          if(_.contains(embedOnlyList, host)){
            var title = host + ' embed';
            items[0] = {
              kind: 'embed#video',
              url: url,
              host: host,
              title: title
            }
            if(host === 'player.vimeo.com' || host === 'vimeo.com'){
              items[0].url += '?';
            }
          } else {
            // not an embed code embed need a link - send a warning.
            notice = 'For ' + host + ' you will need to use a url rather than an embed code';
          }
        } else {
          // return empty -- not in whitelist
          notice = 'Unfortunately ' + host + ' is not currently supported.';
        }
      } else {
        // return empty
        notice = 'Unfortunately there seems to be an issue with your url / embed code';
      }
    } else if (str.substring(0, 4) === "http"){ //its just a url
      var url = str;
      var host;
      //find & remove protocol (http, ftp, etc.) and get domain
      if (url.indexOf("://") > -1) {
        host = url.split('/')[2];
      }
      else {
        host = url.split('/')[0];
      }
      //find & remove port number
      host = host.split(':')[0];
      if(_.contains(whitelist, host)){ // CHECK IF DOMAIN IN WHITELIST
        if(_.contains(urlOnlyList, host)){ 
          var title = host + ' embed';
          //use cloudinary default thumbnail
          items[0] = {
            kind: 'embed#video',
            url: url,
            host: host,
            title: title
          };
        } else {
          // not a link embed - send a warning.
          notice = 'For ' + host + ' you will need to use an embed code rather than a url';
        }
      } else {
        // return empty -- not in whitelist (window.notify doesnt work here)
        notice = 'Unfortunately ' + host + ' is not currently supported.';
      }
    } else {
      //return empty results (window.notify doesnt work here)
      notice = 'Unfortunately there seems to be an issue with your url / embed code';
    }
    return {
      'nextPage': nextPageToken,
      'items': items,
      'notice': notice
    }
  },
  meerkatUsernameToStream (username){ //username a.k.a. query
    check(username, Match.Optional(String));
    console.log(username + 'is the meerkat username');
    var nextPageToken = 'end';
    var items = [];
    var url = 'http://meerkatapp.co/social/player/embed/' + username + '?version=1&username=' + username + '&type=bigsquare&social=true&cover=DEFAULT&userid=&source=http%3A%2F%2Fdeepstream.tv';
    items[0] = {
      kind: 'meerkat#video',
      url: url,
      host: 'meerkat.co',
      title: username + ' on Meerkat'
    };
    return {
      'nextPage': nextPageToken,
      'items': items
    }
  },
  twitcastUsernameToStream (username){ //username a.k.a. query
    check(username, Match.Optional(String));
    console.log(username + 'is the twitcast username');
    var nextPageToken = 'end';
    var items = [];
    var embed = '<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" codebase="http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=10,0,0,0" width="640" height="480" id="livestreamer" align="middle"><param name="allowScriptAccess" value="always" /><param name="allowFullScreen" value="true" /><param name="flashVars" value="user=julianabrown_&lang=en&myself=&seed=&pass=&mute=2" /><param name="movie" value="http://twitcasting.tv/swf/livestreamer2sp.swf" /><param name="quality" value="high" /><param name="bgcolor" value="#ffffff" /><embed src="http://twitcasting.tv/swf/livestreamer2sp.swf" quality="high" bgcolor="#ffffff" width="640" height="480" name="livestreamer" id="livestreamderembed" align="middle" allowScriptAccess="always" allowFullScreen="true" type="application/x-shockwave-flash" pluginspage="http://www.adobe.com/go/getflashplayer" flashVars="user=' + username + '&lang=en&myself=&seed=&pass=&mute=2" ></object>';
    items[0] = {
      kind: 'twitcast#video',
      url: embed,
      username: username,
      host: 'twitcasting.tv',
      title: username + ' on Twitcasting'
    };
    return {
      'nextPage': nextPageToken,
      'items': items
    }
  },
  twitchVideoSearchList: searchTwitch,
  youtubeVideoInfo (ids, page) {
    var res;
    var nextPageToken;

    check(ids, Match.OneOf(String, [String]));
    var idsString = _.flatten([ids]).join(',');
    this.unblock();
    requestParams = {
      part: 'snippet,liveStreamingDetails,statistics', //fileDetails might have recording location
      id: idsString,
      maxResults: 50,
      key: GOOGLE_API_SERVER_KEY
    };

    if (page) {
      requestParams['pageToken'] = page;
    }
    res = HTTP.get('https://www.googleapis.com/youtube/v3/videos', {
      params: requestParams
    });

    items = res.data.items;


    if (items.length) {
      nextPageToken = res.data.nextPageToken || 'end';
    } else {
      nextPageToken = 'end';
    }
    return {
      'nextPage': nextPageToken,
      'items': items
    }
  },
  twitchChannelInfo (channelName) {
      var res;

      check(channelName, String);
      this.unblock();


      res = HTTP.get('https://api.twitch.tv/kraken/streams/' + channelName, {
        headers: {
          Accept: "application/vnd.twitchtv.3+json"
        }
      });

      return {
        'nextPage': 'end',
        'items': [res.data.stream]
      }
  }
});
