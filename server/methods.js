var countStat = function(shortId, stat, details) {

  var connectionId = this.connection.id;
  var clientIP = this.connection.httpHeaders['x-forwarded-for'] || this.connection.clientAddress;

  var stream = Deepstreams.findOne({shortId: shortId, onAir: true});

  if (!stream){
    throw new Meteor.error('Deepstream not found for count ' + stat + ': ' + shortId); // this mostly confirms the stream has been published
  }

  var stats = DeepstreamStats.findOne({streamShortId: shortId}, {fields: {all: 0}});

  if(!stats){
    stats = {};
  }

  if (!stats.deepAnalytics){
    stats.deepAnalytics= {};
  }

  if (!stats.deepAnalytics[stat]){
    stats.deepAnalytics[stat] = {};
  }

  var addToSet = {};
  var inc = {};
  inc['analytics.' + stat + '.total'] = 1;

  if(!_.contains(stats.deepAnalytics[stat].uniqueViewersByConnection, connectionId)){
    addToSet['deepAnalytics.' + stat + '.uniqueViewersByConnection'] = connectionId ;
    inc['analytics.' + stat + '.byConnection'] = 1;
  }

  if(!_.contains(stats.deepAnalytics[stat].uniqueViewersByIP, clientIP)){
    addToSet['deepAnalytics.' + stat + '.uniqueViewersByIP'] = clientIP ;
    inc['analytics.' + stat + '.byIP'] = 1;
  }

  if (this.userId && !_.contains(stats.deepAnalytics[stat].uniqueViewersByUserId, this.userId)){
    addToSet['deepAnalytics.' + stat + '.uniqueViewersByUserId'] = this.userId ;
    inc['analytics.' + stat + '.byId'] = 1;
  }

  var push = {};

  var fullData =  _.extend({}, _.omit(this.connection, ['close', 'onClose']), {date: new Date});

  if (this.userId){
    _.extend(fullData, {
      userId: this.userId,
      username: Meteor.user().username
    });
  };
  if (details){
    _.extend(fullData, details);
  };

  push['deepAnalytics.' + stat + '.all'] = fullData;

  Deepstreams.update( {shortId: shortId}, {$inc: inc });
  DeepstreamStats.upsert( {streamShortId: shortId, streamId: stream._id}, {$inc: inc, $addToSet: addToSet, $push: push} );
};

Meteor.methods({
  countDeepstreamView (streamShortId) {
    this.unblock();
    check(streamShortId, String);
    countStat.call(this, streamShortId, 'views');
  },
  countDeepstreamShare (streamShortId, service) {
    this.unblock();
    check(streamShortId, String);
    countStat.call(this, streamShortId, 'shares', {service: service});
  }
});
