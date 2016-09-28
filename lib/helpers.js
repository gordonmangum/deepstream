nextCreationStepAfter = function(currentStep){
  var currentIndex =_.indexOf(CREATION_STEPS, currentStep);
  if (currentIndex == -1){
    throw new Meteor.Error(currentStep + 'is not a valid step in CREATION_STEPS');
  }
  return CREATION_STEPS[currentIndex + 1];
};

creationStepBefore = function(currentStep){
  var currentIndex = _.indexOf(CREATION_STEPS, currentStep);
  if (currentIndex == -1){
    throw new Meteor.Error(currentStep + 'is not a valid step in CREATION_STEPS');
  } else if (currentIndex === 0) {
    throw new Meteor.Error(currentStep + 'has no prior steps in in CREATION_STEPS');
  }
  return CREATION_STEPS[currentIndex - 1];
};


buildRegExp = function(searchText) {
  // this is a dumb implementation
  var parts = searchText.trim().split(/[ \-\:]+/);
  return new RegExp("(" + parts.join('|') + ")", "ig");
};


idFromPathSegment = function(pathSegment) { // everything after last dash
  return pathSegment.substring(pathSegment.lastIndexOf('-') + 1);
};

generateStreamPathSegment = function(shortId, title){
  return _s.slugify(title ? title.toLowerCase() : 'deep-stream') + '-' + shortId;
};

newTypeSpecificContextBlock = function (doc) {
  switch (doc.type) {
    case 'stream':
      return new Stream(doc);
    case 'video':
      return new VideoBlock(doc);
    case 'text':
      return new TextBlock(doc);
    case 'poll':
      return new PollBlock(doc);
    case 'map':
      return new MapBlock(doc);
    case 'image':
      return new ImageBlock(doc);
    case 'audio':
      return new AudioBlock(doc);
    case 'twitter':
      return new TwitterBlock(doc);
    case 'link':
      return new LinkBlock(doc);
    case 'news':
      return new NewsBlock(doc);
    default:
      return new ContextBlock(doc);
  }
};

// only the curator may update the stream
updateDeepstream = function(selector, modifier, options) {
  if (_.isEmpty(modifier)){
    return
  }
  modifier.$set = _.extend(modifier.$set || {}, {savedAt: new Date});
  selector.curatorIds = this.userId; // this.userId must be the user (use via .call or .apply)

  return Deepstreams.update(selector, modifier, _.defaults({}, options, {removeEmptyStrings: false}));
};

updateContextBlock = function(selector, modifier, options) {
  if (_.isEmpty(modifier)){
    return
  }
  modifier.$set = _.extend(modifier.$set || {}, {savedAt: new Date});

  return ContextBlocks.update(selector, modifier, _.defaults({}, options, {removeEmptyStrings: false}));
};

updateSuggestedContextBlock = function(selector, modifier, options) {
  if (_.isEmpty(modifier)){
    return
  }
  modifier.$set = _.extend(modifier.$set || {}, {savedAt: new Date});

  return SuggestedContextBlocks.update(selector, modifier, _.defaults({}, options, {removeEmptyStrings: false}));
};

addContextToStream =  function (streamShortId, contextBlock) {
  check(streamShortId, String);
  check(contextBlock, Object);
  check(this.userId, String);

  var deepstream = Deepstreams.findOne({shortId: streamShortId}, {fields: {'creationStep': 1, 'curatorIds': 1}});
  var user = Meteor.users.findOne({_id: this.userId}, {fields: {'username': 1}});

  if(!_.contains(deepstream.curatorIds, this.userId)){
    throw new Meteor.Error('User not authorized to add context to this stream');
  }

  var pushObject, pushSelectorString;
  pushSelectorString = 'contextBlocks';
  pushObject = {};
  var now = new Date;
  var contextBlockToInsert = _.extend({}, _.omit(contextBlock, '_id'), {
    streamShortId: streamShortId,
    authorId: this.userId,
    suggestedAt: now,
    suggestedBy: this.userId,
    suggestedByUsername: user.username,
    suggestionStatus: 'approved',
    moderatedAt: now,
    moderatedBy: this.userId,
    moderatedByUsername: user.username,
    addedAt: now,
    savedAt: now
  });

  var contextId = ContextBlocks.insert(contextBlockToInsert);

  pushObject[pushSelectorString] = _.extend(_.pick(contextBlockToInsert, ['type', 'source', 'addedAt']), {_id: contextId, rank: 0});

  var modifierObject = {
    '$addToSet': pushObject
  };


  modifierObject['$set'] = {};

  // advance creation if at this creation step
  if (deepstream.creationStep === 'add_cards') {
    _.extend(modifierObject['$set'], {
      creationStep: nextCreationStepAfter('add_cards')
    });
  }

  if (!contextId) {
    throw new Meteor.Error('Context block not inserted')
  }

  var numUpdated = updateDeepstream.call(this, {shortId: streamShortId}, modifierObject);

  if (!numUpdated) {
    throw new Meteor.Error('Stream not updated')
  }


  if (Meteor.isClient) {
    Session.set("previousMediaDataType", Session.get('mediaDataType'));
    Session.set("mediaDataType", null); // leave search mode
    var typeSpecificContextBlock = newTypeSpecificContextBlock(contextBlock);
    if (typeSpecificContextBlock.soloModeLocation === 'sidebar') {
      setCurrentContext(typeSpecificContextBlock); // if single context is in sidebar, show that instead of default list mode
    }
  }

  return contextBlock._id;
};

unpublishDeepstream = function (shortId){
  check(shortId, String);
  return updateDeepstream.call(this, {shortId: shortId}, {
    $set: {
      onAir: false,
      lastOnAirAt: new Date,
      onAirSince: null
    }
  })
};


updateDeepstreamStatuses = function (options) {

  // TO-DO performance. restrict to published?

  options = options || {};
  selector = options.selector || {};

  var dsLive = 0;
  var dsDead = 0;
  // director mode with some streams live may or may not be live
  Deepstreams.find(_.extend({}, selector, {'streams.live': true, directorMode: true}), {fields: {'streams.live': 1, 'streams._id': 1, activeStreamId: 1}} ).forEach(function(deepstream){
    var live = deepstream.activeStream().live;

    Deepstreams.update({_id: deepstream._id}, {$set: {live: live}});

    if (live) {
      dsLive +=1;
    } else {
      dsDead +=1;
    }
  });

  // regular with some streams live are live
  dsLive += Deepstreams.update(_.extend({}, selector, {'streams.live': true, 'directorMode': false}), {$set: {live: true}}, {multi: true});

  // all streams dead are dead
  dsDead += Deepstreams.update(_.extend(selector, {'streams': {$not: {$elemMatch: {live: true}}}}), {$set: {live: false}}, {multi: true});

  if(options.logging){
    console.log(dsLive + ' deepstreams are live');
    console.log(dsDead + ' deepstreams are dead');
  }
};
