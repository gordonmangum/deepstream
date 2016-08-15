var ustreamConnection = DDP.connect('http://104.131.189.181');
var cheerio = Meteor.npmRequire('cheerio');


// ustream apparently uses timestamps that match whatever time it happened to be in SF, but contain no timezone or dst info

var dstObject = {
  2003: ['April 6', 'October 26'],
  2004: ['April 4', 'October 31'],
  2005: ['April 3', 'October 30'],
  2006: ['April 2', 'October 29'],
  2007: ['March 11', 'November 4'],
  2008: ['March 9', 'November 2'],
  2009: ['March 8', 'November 1'],
  2010: ['March 14', 'November 7'],
  2011: ['March 13', 'November 6'],
  2012: ['March 11', 'November 4'],
  2013: ['March 10', 'November 3'],
  2014: ['March 9', 'November 2'],
  2015: ['March 8', 'November 1'],
  2016: ['March 13', 'November 6'],
  2017: ['March 12', 'November 5'],
  2018: ['March 11', 'November 4'],
  2019: ['March 10', 'November 3']
};

var defaultYear = 2018;

var insertES = Meteor.wrapAsync(esClient.create, esClient);
var bulkES = Meteor.wrapAsync(esClient.bulk, esClient);

var convertUStreamDateToUTC = function(ustreamDateString){
  var proposedDate = new Date(ustreamDateString + ' PDT'); // assume PDT to start
  var year = proposedDate.getFullYear();

  var dstDates = dstObject[year];
  if(!dstDates){
    dstDates = dstObject[defaultYear];
    console.error('NO DST information available for year ' + year + '. Please add this year to the codebase. Defaulting to ' + defaultYear);
  }

  var dst = proposedDate > new Date(dstDates[0] + ' ' + year + ' 03:00:00 PDT') && proposedDate < new Date(dstDates[1] + ' ' + year + ' 02:00:00 PDT');

  return new Date(ustreamDateString + " " + (dst ? 'PDT' : 'PST'))
};


var servicesToFetch = [
  {
    serviceName: 'ustream',
    methodName: 'ustreamVideoSearchList',
    startingPage: 1,
    initialPagesGuess: 60,
    guessBias: 1,
    maxPages: parseInt(process.env.MAX_USTREAM_PAGES) || parseInt(Meteor.settings.MAX_USTREAM_PAGES) || 1000,
    asyncWaitTime: 20,
    mapFn (doc) {
      var username = doc.user.userName;
      _.extend(doc, {
        _streamSource: 'ustream',
        username: username,
        creationDate: convertUStreamDateToUTC(doc.createdAt),
        lastStreamedAt: convertUStreamDateToUTC(doc.lastStreamedAt),
        currentViewers: parseInt(doc.viewersNow),
        totalViews: parseInt(doc.totalViews),
        createdAtInUStreamTime: doc.createdAt, // save this in case we need it later
        live: true,
        _es: {
          title: doc.title,
          description: cheerio.load('<body>' + doc.description + '</body>')('body').text(), // parse html and grab text
          broadcaster: username,
          tags: []
        }
      });
      delete doc.createdAt; // this is an awful thing with no timezone info, we renamed it to make that clear
      return doc
    }
  },
  {
    serviceName: 'bambuser',
    methodName: 'bambuserVideoSearchList',
    startingPage: 0,
    initialPagesGuess: 3,
    guessBias: 0,
    maxPages: parseInt(process.env.MAX_BAMBUSER_PAGES) || parseInt(Meteor.settings.MAX_BAMBUSER_PAGES) || 1000,
    asyncWaitTime: 100,
    mapFn (doc) {

      _.extend(doc, {
        _streamSource: 'bambuser',
        id: doc.vid,
        creationDate: new Date(parseInt(doc.created) * 1000),
        //currentViewers: parseInt(doc.views), // no current viewers metric for bambuser
        totalViews: parseInt(doc.views_total),
        lengthSecs: doc.length,
        live: true,
        _es: {
          title: doc.title,
          description: null,
          broadcaster: doc.username,
          tags: _.pluck(doc.tags || [], 'tag')
        }
      });
      delete doc.length; // this only causes problems
      return doc;
    }
  },
  //{
  //  serviceName: 'youtube',
  //  methodName: 'youtubeVideoSearchList',
  //  //startingPage: 0, /// WILL NEED TO GO PAGE BY PAGE for YOUTUBE, and probably do it on a separate worker
  //  maxPages: parseInt(process.env.MAX_YOUTUBE_PAGES) || parseInt(Meteor.settings.MAX_YOUTUBE_PAGES) || 1000,
  //  //asyncWaitTime: 50,
  //  mapFn (doc) {
  //    _.extend(doc, {
  //      _streamSource: 'youtube',
  //      id: doc.videoId,
  //      creationDate: new Date(doc.publishedAt),
  //      live: true,
  //      _es: {
  //        title: doc.title,
  //        description: doc.description,
  //        broadcaster: doc.channelTitle,
  //        tags: []
  //      }
  //    });
  //    return doc;
  //  }
  //}
];


var generateFetchFunction = function(serviceInfo){

  var serviceName = serviceInfo.serviceName;
  var numPagesGuess = serviceInfo.initialPagesGuess;
  var guessBias = serviceInfo.guessBias;
  var waitBetweenAsyncCalls = serviceInfo.asyncWaitTime; // ms
  var maxPages = serviceInfo.maxPages;
  var startingPage = serviceInfo.startingPage;



  return Meteor.wrapAsync(function (finalCallback) {
    var numPagesGuesses = [];

    var allStreamsLoaded = false;
    var numAsyncPages = Math.min(numPagesGuess, maxPages);

    var currentPage;

    var resultsForES = [];

    var streamInsertCallback = function (error, result, page, cb) {
      //console.log('Received ' + serviceName + ' response for page: ' + page);

      if (error) {
        allStreamsLoaded = true;
        console.log('Error returned from ' + serviceName + ' on page: ' + page);
        console.error(error);
        return cb();
      }

      if (!result.items || !result.items.length) {
        allStreamsLoaded = true;
        numPagesGuesses.push(page - 1 + guessBias);
        return cb();
      }
      var mapResults = _.map(result.items, serviceInfo.mapFn);
      Streams.batchInsert(mapResults); // TODO remove the es field first to prevent duplicates

      //elasticsearch
      
      var esInput = _.chain(mapResults)
        .map(function(result){
          return [
            {
              create: {
                _index: ES_CONSTANTS.index,
                _type: "stream",
                _ttl: process.env.ELASTICSEARCH_TTL || Meteor.settings.ELASTICSEARCH_TTL || '3m'
              }
            },
            {
              //doc: result,
              source: result._streamSource,
              id: result.id,
              broadcaster: result._es.broadcaster,
              description: result._es.description,
              tags: result._es.tags,
              title: result._es.title,
            }
            ]
          })
        .flatten(true)
        .value();

      resultsForES.push(esInput);

      //console.log('Added ' + serviceName + ' streams to database for page: ' + page);
      return cb();
    };

    console.log('Current guess for number of ' + serviceName + ' pages: ' + numPagesGuess);
    console.log('Begin async ' + serviceName + ' calls')
    async.each(_.range(numAsyncPages), function (i, cb) {
        Meteor.setTimeout(function () {
          currentPage = i + startingPage;
          //console.log('Async ' + serviceName + ' call for page: ' + currentPage);
          var localCurrentPage = currentPage;
          if(serviceInfo.serviceName === 'ustream'){
            ustreamConnection.call(serviceInfo.methodName, undefined, undefined, currentPage, function (err, result) {
              try {
                streamInsertCallback(err, result, localCurrentPage, cb);
              } catch (err) {
                console.log('Error in async ' + serviceName + ' callback page: ' + localCurrentPage)
                console.error(err)
                return cb();
              }
            });
          } else {
            Meteor.call(serviceInfo.methodName, undefined, undefined, currentPage, function (err, result) {
            try {
              streamInsertCallback(err, result, localCurrentPage, cb);
            } catch (err) {
              console.log('Error in async ' + serviceName + ' callback page: ' + localCurrentPage)
              console.error(err)
              return cb();
            }
          });
          }
        }, waitBetweenAsyncCalls * i)
      }, function (err) {

        var addESResults = function(){

          try {
            ping({
            // ping usually has a 3000ms timeout
            requestTimeout: 30000,
            timeout: 30000,

            // undocumented params are appended to the query string
            hello: "elasticsearch!"
            });
            console.log('ELASTIC: All is well');
          } catch (error) {
            console.trace('ELASTIC: elasticsearch cluster is down!');
            console.error(error);
            return
          }

          resultsForES = _.flatten(resultsForES, true);

          console.log('Adding ' + resultsForES.length / 2 + ' streams to ES for ' + serviceName);

          if(resultsForES.length){

            try {
              bulkES({
                body: resultsForES,
                timeout: 90000,
                requestTimeout: 90000
              });

              console.log('ES streams added for ' + serviceName);

            } catch (e) {
              console.error('Failed to add streams to ES for ' + serviceName);
              console.error(e);
            }
          }

        };

        console.log('Finish async ' + serviceName + ' calls');
        if (err) {
          try{
            addESResults();
          } catch (e){
            return finalCallback(e)
          }

          return finalCallback(err);
        } else {
          console.log('Begin sync ' + serviceName + ' calls');
          currentPage += 1;

          while (!allStreamsLoaded && currentPage < maxPages + startingPage) {
            //console.log('Sync ' + serviceName + ' call for page: ' + currentPage);
            if(serviceInfo.serviceName === 'ustream'){
              ustreamConnection.call(serviceInfo.methodName, undefined, undefined, currentPage, function (err, result) {
                streamInsertCallback(err, result, currentPage, function (err) {
                  if (err) {
                    return finalCallback(err);
                  }
                })
              });
            } else {
              Meteor.call(serviceInfo.methodName, undefined, undefined, currentPage, function (err, result) {
              streamInsertCallback(err, result, currentPage, function (err) {
                if (err) {
                  return finalCallback(err);
                }
              })
            });
            }
            currentPage += 1;
          }

          if (allStreamsLoaded) {
            numPagesGuess = _.min(numPagesGuesses)
          } else {
            numPagesGuess = currentPage - 1;
          }
          console.log('Finish sync ' + serviceName + ' calls');
          console.log(serviceName + ' API calls complete!');
          console.log((currentPage - 1) + ' ' + serviceName + ' pages loaded');
          console.log(serviceName + ' results loaded into Mongo');

          try{
            addESResults();
          } catch (e){
            return finalCallback(e)
          }

          return finalCallback();
        }
      }
    );
  })
};

var updateStreamStatus = function (deepstream) {
  var ustream;
  _.each(deepstream.streams, function (stream) {
    var streamSourceId = stream.reference.id;
    var streamSourceUsername = stream.reference.username;
    var streamSourceChannelName = stream.reference.channelName;
    switch (stream.source) {
      case 'ustream':
        //console.log('check ustream');
        if (stream = Streams.findOne({'id': streamSourceId})) {
          // TODO update views and such
          Deepstreams.update({
            _id: deepstream._id,
            'streams.reference.id': streamSourceId
          }, {$set: {'streams.$.live': true}});
        } else {
          // TODO update views and such
          Deepstreams.update({
            _id: deepstream._id,
            'streams.reference.id': streamSourceId
          }, {$set: {'streams.$.live': false}});
        }
        break;
      case 'bambuser':
        //console.log('check bambuser');
        if (stream = Streams.findOne({'username': streamSourceUsername})) {
          // TODO update title and views and such. These might actually change...
          Deepstreams.update({
            _id: deepstream._id,
            'streams.reference.id': streamSourceId
          }, {$set: {'streams.$.live': true}});
        } else {
          // TODO update title and views and such
          Deepstreams.update({
            _id: deepstream._id,
            'streams.reference.id': streamSourceId
          }, {$set: {'streams.$.live': false}});
        }
        break;
      case 'youtube':
        //console.log('check youtube');

        // TODO maybe only if we think youtube video is live
        Meteor.call('youtubeVideoInfo', streamSourceId, function (err, data) { // TODO this request can be done in a batch for all youtube videos we have...
          if (err) {
            throw(err);
          }
          var videos = data.items;
          var video = videos[0];
          if (video) {
            if (video.snippet.liveBroadcastContent === 'live') {
              // TODO update views and such (statistis.viewCount)
              // and current viewers liveStreamingDetails.concurrentViewers
              // TO-DO, this line below shouldn't be necessary since youtube doesn't go live again after it's dead, we think...
              Deepstreams.update({
                _id: deepstream._id,
                'streams.reference.id': streamSourceId
              }, {$set: {'streams.$.live': true}});

            } else {
              // TODO update views and such
              Deepstreams.update({
                _id: deepstream._id,
                'streams.reference.id': streamSourceId
              }, {$set: {'streams.$.live': false}});
            } // video isn't live
          } else { // video not found, so not live
            console.log('NOT FOUUUUUND')
            Deepstreams.update({
              _id: deepstream._id,
              'streams.reference.id': streamSourceId
            }, {$set: {'streams.$.live': false}});
          }
        });
        break;
      case 'twitch':
        //console.log('check twitch');

        Meteor.call('twitchChannelInfo', streamSourceChannelName, function (err, data) {
          if (err) {
            throw(err);
          }
          var stream = data.items[0];
          if (stream) {
            Deepstreams.update({
              _id: deepstream._id,
              'streams.reference.id': streamSourceId
            }, {$set: {'streams.$.live': true}});
          } else { // no stream found, so not live
            Deepstreams.update({
              _id: deepstream._id,
              'streams.reference.id': streamSourceId
            }, {$set: {'streams.$.live': false}});
          }
        });
        break;

    }
  });
};

var cycleStreamsCollection = function () {
  Streams.update({}, {$inc: {oneIfCurrent: 1}}, {multi: true}); // recent batch is now loaded
  Streams.remove({oneIfCurrent: {$gt: 1}}); // remove previous batch
  //esClient.indices.flush({index: Meteor.settings.ELASTICSEARCH_INDEX});
};

var updateStreamStatuses = function () {
  Deepstreams.find({}, {fields: {streams: 1}}).forEach(updateStreamStatus); // TO-DO perf. Only get necessary fields for live checking
};


var runJobs = function () {
  console.log('Running jobs...');
  var startTime = Date.now();
  var previousTimepoint = Date.now();

  var timeLogs = [];

  _.each(servicesToFetch, function(serviceInfo){
    generateFetchFunction(serviceInfo)();
    timeLogs.push(serviceInfo.serviceName + ' fetch time: ' + ((Date.now() - previousTimepoint)/1000) + ' seconds');
    previousTimepoint = Date.now();
  });

  cycleStreamsCollection();
  timeLogs.push('stream db cycle time: ' + ((Date.now() - previousTimepoint) / 1000) + ' seconds');
  previousTimepoint = Date.now();

  updateStreamStatuses();
  timeLogs.push('stream update time: ' + ((Date.now() - previousTimepoint) / 1000) + ' seconds');
  previousTimepoint = Date.now();

  updateDeepstreamStatuses({logging: true});
  timeLogs.push('deepstream update time: ' + ((Date.now() - previousTimepoint) / 1000) + ' seconds');
  previousTimepoint = Date.now();

  _.each(timeLogs, function(str){
    console.log(str);
  });

  console.log('Total time to run jobs: ' + ((Date.now() - startTime) / 1000) + ' seconds');

};

var jobWaitInSeconds = parseInt(process.env.JOB_WAIT) || 5 * 60; // default is every 5 minutes


if (process.env.PROCESS_TYPE === 'stream_worker') { // if a worker process
  Meteor.startup(function () {
    while (true) {
      runJobs();
      Meteor._sleepForMs(jobWaitInSeconds * 1000);
    }
  });
} else if (process.env.PROCESS_TYPE === 'reset_es_worker') { // special worker that resets ES
  Meteor.startup(function () {
    resetES();
    process.exit();
  });
} else if (process.env.NODE_ENV === 'development') { // however, in developement, run jobs on startup
  Meteor.startup(function () {
    Meteor.setTimeout(function(){
      resetES();
      runJobs();
    });
  });
}
