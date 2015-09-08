var refreshUStreamDB = function(){
  Streams.remove({});

  var allUStreamsLoaded = false;

  var page = 1;

  var maxUStreamPages = parseInt(process.env.MAX_USTREAM_PAGES) || parseInt(Meteor.settings.MAX_USTREAM_PAGES) || 999999999999;

  var ustreamInsertCallback = function(error, result){
    if(error){
      allUStreamsLoaded = true;
      throw error
    }

    if(!result.items || !result.items.length){
      allUStreamsLoaded = true;
      console.log((page - 1) + ' ustream pages loaded');
      return
    }

    console.log('ustreams loaded')
    _.each(result.items, function(doc) {

      _.extend(doc, {
        _source: 'ustream',
        username: doc.user.userName,
        currentViewers: parseInt(doc.viewersNow),
        totalViews: parseInt(doc.totalViews)
      });
      Streams.insert(doc);
    })

  }


  while(!allUStreamsLoaded && page <= maxUStreamPages){
    Meteor.call('ustreamVideoSearchList', undefined, undefined, page, ustreamInsertCallback);
    page += 1;
  };
};

var runJobs = function(){
  refreshUStreamDB();
};

var jobIntervalInSeconds = parseInt(process.env.JOB_INTERVAL) || 10 * 60; // default is every 10 minutes

if (process.env.PROCESS_TYPE === 'worker'){ // if a worker process
  Meteor.startup(function() {
    Meteor.setTimeout(runJobs, 0); // run jobs immediately
    Meteor.setInterval(runJobs, jobIntervalInSeconds * 1000); // then run them at interval
  });
} else if (process.env.NODE_ENV === 'development'){ // however, in developement, run jobs on startup
  Meteor.startup(function(){
    Meteor.setTimeout(runJobs)
  });
}