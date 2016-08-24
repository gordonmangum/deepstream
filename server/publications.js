Deepstreams._ensureIndex({
  shortId: 1
}, {
  unique: 1
});

Deepstreams._ensureIndex({
  onAir: 1,
  live: 1
});

ContextBlocks._ensureIndex({
  streamShortId: 1
});

ContextBlocks._ensureIndex({
  deleted: 1
});

SuggestedContextBlocks._ensureIndex({
  streamShortId: 1
});

SuggestedContextBlocks._ensureIndex({
  suggestionStatus: 1
});


Meteor.users._ensureIndex({
  username: 1
});

var deepstreamFields = {
  'deleted': 0,
  //'streams.fullDetails': 0,
  'streams.reference.description': 0,
  'streams.authorId': 0,
  'streams.searchQuery': 0,
  'analytics.shares': 0,
  'analytics.views.byConnection': 0,
  'analytics.views.byIP': 0,
  'analytics.views.byId': 0,
  'curatorSignupCodes': 0
};

var contextFields = {
  'fullDetails': 0,
  'authorId': 0,
  'savedAt': 0,
  'addedAt': 0,
  'searchQuery': 0
};

Meteor.publish("deepstreamsMostRecent", function() {
  this.unblock();
  return Deepstreams.find({
    onAir: true
  }, {
    sort: { createdAt: -1 },
    fields: deepstreamFields,
    limit: 8
  });
});

Meteor.publish("deepstreamsEditorsPick", function() {
  this.unblock();
  return Deepstreams.find({
    onAir: true,
    editorsPick: true
  }, {
    sort: { editorsPickAt: -1 },
    fields: deepstreamFields,
    limit: 8
  });
});


Meteor.publish('deepstreamsForAdmin', function( search, published ) {
  this.unblock();
  check(search, Match.OneOf( String, null, undefined ));
  let query      = {onAir: false},
      projection = { 
                     limit: 10, 
                     sort: { createdAt: -1 },
                     fields: deepstreamFields,
                   };
  if (search) {
    let regex = new RegExp( search, 'i' );
    query = {
      $or: [
        { title: regex },
        { description: regex },
        { curatorName: regex },
        { streamPathSegment: regex },
        { curatorUsername: regex }
      ]
    };
    projection.limit = 100;
  }
  if(published){
    query.onAir = true;
  } else {
    query.onAir = false;
  }
  return Deepstreams.find( query, projection );
});

Meteor.publish("bestStreams", function() {
  this.unblock();
  return Streams.find({ oneIfCurrent: 1 }, {
    sort: {
      currentViewers: -1
    },
    limit: 20
  });
});
Meteor.publish("mostRecentStreams", function() {
  this.unblock();
  return Streams.find({ oneIfCurrent: 1 }, {
    sort: {
      creationDate: -1
    },
    limit: 20
  });
});


Meteor.publish("singleDeepstreamOnAir", function(userPathSegment, shortId) {
  this.unblock();
  check(shortId, String);
    return Deepstreams.find({userPathSegment: userPathSegment, shortId: shortId, onAir: true},{
      fields: deepstreamFields
    });  
});

Meteor.publish("singleDeepstream", function(userPathSegment, shortId) {
  this.unblock();
  check(shortId, String);
  if (this.userId) {
    return Deepstreams.find({userPathSegment: userPathSegment, shortId: shortId, $or: [{curatorIds: this.userId}, {onAir: true}]},{
      fields: deepstreamFields
    });
  } else {
    return Deepstreams.find({userPathSegment: userPathSegment, shortId: shortId, onAir: true},{
      fields: deepstreamFields
    });
  }
});

Meteor.publish("deepstreamContext", function(streamShortId) {
  this.unblock();
  check(streamShortId, String);
  return ContextBlocks.find({streamShortId: streamShortId, deleted: {$ne: true}},{
    fields: contextFields
  });
});

Meteor.publish("deepstreamSuggestedContext", function(streamShortId) {
  this.unblock();
  check(streamShortId, String);
  return SuggestedContextBlocks.find({streamShortId: streamShortId, suggestionStatus: 'pending'},{
    fields: contextFields
  });
});

Meteor.publish("deepstreamPreviewContext", function(streamShortId) {
  this.unblock();
  check(streamShortId, String);
  return ContextBlocks.find({streamShortId: streamShortId, deleted: {$ne: true}, type: {$in: HOMEPAGE_PREVIEW_CONTEXT_TYPES}},{
    fields: contextFields
  });
});

Meteor.publish("myDeepstreams", function() {
  this.unblock();
  return Deepstreams.find({curatorIds: this.userId, deleted: {$ne: true}}, {
    fields: deepstreamFields, sort: {createdAt :-1}
  });
});

Meteor.publish("minimalUsersPub", function(userIds) {
  this.unblock();
  if (!userIds || !userIds.length || userIds.length > 1000) {
    return this.ready();
  }
  return Meteor.users.find({_id: {
    $in: userIds
  }}, {
    fields: {
      "profile.name": 1,
      "username": 1
    }
  });
});

Meteor.publish("userData", function () {
  this.unblock();
  if (this.userId) {
    return Meteor.users.find({_id: this.userId},
      {fields: {
        'accessPriority': 1,
        "services.twitter.id": 1,
        "keenScopedKey": 1,
        "keenProjectId": 1,
        "admin": 1,
        "profile": 1
      }});
  } else {
    this.ready();
  }
});

Meteor.publish('usersForAdmin', function( search ) {
  check(search, Match.OneOf( String, null, undefined ));
  let query      = {},
      projection = { 
                     limit: 100, 
                     sort: { createdAt: -1 },
                     fields: {
                       'profile': 1,
                       'username': 1,
                       'createdAt': 1,
                       'services.twitter.id' : 1,
                       'emails.address' : 1
                     },
                   };
  if (search) {
    let regex = new RegExp( search, 'i' );
    query = {
      $or: [
        { "profile.name": regex },
        { emails: { $elemMatch: {address: regex}}},
        { username: regex },
        { "twitter.screename": regex }
      ]
    };
    projection.limit = 100;
  }
  return Meteor.users.find( query, projection );
});


// this publishes info on server facts (used on /stats page)
Facts.setUserIdFilter(function (userId) {
  var user = Meteor.users.findOne(userId);
  return user && user.admin;
});
