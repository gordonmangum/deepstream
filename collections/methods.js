var publishAccessLevel = parseInt(Meteor.settings['public'].PUBLISH_ACCESS_LEVEL || 0);
var createAccessLevel = parseInt(Meteor.settings['public'].CREATE_ACCESS_LEVEL || 0);

if (Meteor.isClient) {
  window.publishAccessLevel = publishAccessLevel;
  window.createAccessLevel = createAccessLevel;
}

var changeFavorite;

changeFavorite = function(shortId, toFavorite) {
  var operator, deepstreamOperation, userOperation;

  this.unblock();
  if (!this.userId) {
    throw new Meteor.Error('not-logged-in', 'Sorry, you must be logged in to favorite a DeepStream');
  }

  var deepstream = Deepstreams.findOne({
    shortId: shortId
  }, {
    fields: {
      favorited: 1
    }
  });

  if(!deepstream){
    throw new Error('Deepstream not found');
  }

  operator = toFavorite ? '$addToSet' : '$pull';
  deepstreamOperation = {};
  deepstreamOperation[operator] = {
    favorited: this.userId
  };

  var currentlyFavorited = (_.contains(deepstream.favorited, this.userId));

  if (toFavorite && !currentlyFavorited){
    deepstreamOperation['$inc'] = { favoritedTotal : 1 };
  } else if (!toFavorite && currentlyFavorited){
    deepstreamOperation['$inc'] = { favoritedTotal : -1 };
  }

  userOperation = {};
  userOperation[operator] = {
    'profile.favorites': shortId
  };

  Deepstreams.update({
    shortId: shortId
  }, deepstreamOperation);

  return Meteor.users.update({
    _id: this.userId
  }, userOperation);
};

var changeEditorsPick = function(shortId, isPick) {

  this.unblock();
  if (!Meteor.user().admin) {
    throw new Meteor.Error('not-admin-in', 'Sorry, you must be an admin to designate an editors pick');
  }

  Deepstreams.update({
    shortId: shortId
  }, {
    $set: {
      editorsPick: isPick,
      editorsPickAt: new Date
    }
  });
};


var checkOwner = function(userId, doc) {
  return userId && userId === doc.authorId;
};

var assertOwner = function(userId, doc) {
  if(!checkOwner(userId, doc)){
    throw new Meteor.Error('Only the author may edit in this way')
  }
};




Meteor.methods({
  addContextToStream: addContextToStream,
  setActiveStream (shortId, streamId){
    check(shortId, String);
    check(streamId, String);
    var updated = updateDeepstream.call(this,{shortId: shortId}, {$set: {activeStreamId: streamId}});
    if(updated){
      updateDeepstreamStatuses({selector: {shortId: shortId}});
    }
    return updated
  },
  addStreamToStream (shortId, stream){
    check(shortId, String);
    if (Meteor.isServer){
      check(stream, Object);
    } else {
      check(stream, Match.Any); // this should be Object or Stream but that doesn't seem to work out clientside...
    }


    var pushObject, pushSelectorString, success;
    pushSelectorString = 'streams';
    pushObject = {};
    pushObject[pushSelectorString] = _.extend({}, stream, {
      authorId: Meteor.user()._id,
      addedAt: new Date
    });

    var modifierObject = {
      '$addToSet' : pushObject
    };

    deepstream = Deepstreams.findOne({shortId: shortId}, {fields:{'activeStreamId' : 1, 'creationStep': 1, 'streams': 1}});

    var numberOfStreamsBeforeAdd = deepstream.streams.length;

    modifierObject['$set'] = {};

    // make stream active if none is active
    if (!deepstream.activeStreamId){
      _.extend(modifierObject['$set'], {
        activeStreamId : stream._id
      });
    }

    // advance creation if at this creation step
    if (deepstream.creationStep === 'find_stream'){
      _.extend(modifierObject['$set'], {
        creationStep : nextCreationStepAfter('find_stream')
      });
    }

    var duplicateStream = _.any(deepstream.streams, function(existingStream) {
      return stream.reference.id === existingStream.reference.id;
    });

    if(duplicateStream){
      success = true; // it's already done!
    } else {
      success = updateDeepstream.call(this, { shortId: shortId }, modifierObject);
    }

    if (success) {

      if (Meteor.isClient){
        if(numberOfStreamsBeforeAdd === 1 && !duplicateStream) { // this is the second stream to be added
          window.notifySuccess("You just added a second stream. Now your viewers can switch between streams, or use Director Mode to only show the one you want!");
        }

        if (duplicateStream){
          window.notifyInfo("This stream has already been added.")
        }

        // briefly add the justAdded class so that user knows it was added to the bottom
        setTimeout(function(){ // wait till in DOM. TO-DO this is kinda hacky
          $('.stream[data-stream-reference-id="' + stream.reference.id + '"]').addClass('justAdded');
          setTimeout(function(){
            $('.stream[data-stream-reference-id="' + stream.reference.id + '"]').removeClass('justAdded');
          }, 1300);
        }, 0);
      }

      updateDeepstreamStatuses({selector: {shortId: shortId}});

    } else {
      throw new Meteor.Error('Stream not updated');
    }
    return stream._id;
  },
  removeStreamFromStream (shortId, streamId) {
    check(shortId, String);
    check(streamId, String);

    var deepstream = Deepstreams.findOne({shortId: shortId}, {fields: { 'streams':1, activeStreamId: 1 }, transform: null});

    if (!deepstream){
      throw new Meteor.Error('Deepstream not found')
    }

    var streamToDelete = _.extend(_.findWhere(deepstream.streams, {_id: streamId}), {deletedAt: new Date});


    var modifier = {
      $pull: {
        streams: {
          _id: streamId
        }
      }, $push: {
        'deletedContent.streams': streamToDelete
      }
    };

    if (streamId === deepstream.activeStreamId){ // if removing active stream
      var newActiveStream = _.chain(deepstream.streams)
        .reject(function(stream){
          return stream._id === streamId;
        })
        .sortBy('addedAt')
        .sortBy('live')
        .last()
        .value();
      modifier['$set'] = {
        activeStreamId: newActiveStream ? newActiveStream._id : null // set to another recent stream, preferably live
      }
    }

    var numUpdated = updateDeepstream.call(this, {
      shortId: shortId
    }, modifier);

    if (numUpdated){
      updateDeepstreamStatuses({selector: {shortId: shortId}});
    } else {
      throw new Meteor.Error('Stream not updated')
    }

    return numUpdated;
  },
  removeContextFromStream (shortId, contextId) {
    check(shortId, String);
    check(contextId, String);

    var deepstream = Deepstreams.findOne({shortId: shortId}, {fields: { 'contextBlocks':1, 'curatorIds': 1 }, transform: null});

    var deletedAt = new Date;

    if (!deepstream){
      throw new Meteor.Error('Deepstream not found')
    }

    if(!_.contains(deepstream.curatorIds, this.userId)){
      throw new Meteor.Error('User not authorized to remove context from this stream');
    }


    var contextBlockUpdated = updateContextBlock.call(this, {
      streamShortId: shortId,
      _id: contextId
    }, {
      $set: {
        deleted: true,
        deletedAt: deletedAt
      }
    });

    if (!contextBlockUpdated ){
      throw new Meteor.Error('ContextBlock not updated')
    }

    var internalContextToDelete = _.extend(_.findWhere(deepstream.contextBlocks, {_id: contextId}), {deletedAt: deletedAt});

    var deepstreamUpdated = updateDeepstream.call(this, {
      shortId: shortId
    }, {
      $pull: {
        contextBlocks: {
          _id: contextId
        }
      }, $push: {
        'deletedContent.contextBlocks': internalContextToDelete
      }
    });

    if (!deepstreamUpdated){
      throw new Meteor.Error('Deepstream not updated')
    }

    return true;
  },
  goToFindStreamStep (shortId){
    return updateDeepstream.call(this, { shortId: shortId}, {$set: { creationStep: 'find_stream'}});
  },
  goToAddCardsStep (shortId){
    return updateDeepstream.call(this, { shortId: shortId}, {$set: { creationStep: 'add_cards'}});
  },
  goToPublishStreamStep (shortId){
    return updateDeepstream.call(this, { shortId: shortId}, {$set: { creationStep: 'go_on_air'}});
  },
  skipFindStreamStep (shortId){
    check(shortId, String);
    return updateDeepstream.call(this, {shortId: shortId}, {$set: {creationStep: nextCreationStepAfter('find_stream') }});
  },
  skipAddCardsStep (shortId){
    check(shortId, String);
    return updateDeepstream.call(this, {shortId: shortId}, {$set: {creationStep: nextCreationStepAfter('add_cards') }});
  },
  goBackFromTitleDescriptionStep (shortId){
    check(shortId, String);
    return updateDeepstream.call(this, {shortId: shortId}, {$set: {creationStep: creationStepBefore('title_description') }});
  },
  proceedFromGoOnAirStep (shortId){
    check(shortId, String);
    return updateDeepstream.call(this, {shortId: shortId}, {$set: {creationStep: nextCreationStepAfter('go_on_air') }});
  },
  publishStream (shortId, title, description){
    check(shortId, String);

    var deepstream = Deepstreams.findOne({shortId: shortId}, {fields:{"streams.length": 1, firstOnAirAt: 1}});

    if(!deepstream.streams.length){
      throw new Meteor.Error('Deepstreams must contain at least one stream before publishing')
    }

    var setObject = {creationStep: null, onAir: true, onAirSince: new Date };

    if(!deepstream.firstOnAirAt){
      setObject.firstOnAirAt = new Date;
      if(Meteor.isServer){
        var sendEmail = process.env.SEND_PUBLISH_NOTICE_TO || Meteor.settings.SEND_PUBLISH_NOTICE_TO;
        if (sendEmail){
          var currentUser = Meteor.user();
          Email.send({
            to: sendEmail,
            from: 'noreply@example.com',
            subject: 'New DeepStream Published: ' + title,
            text: '"' + title + '"' + ' published at ' + new Date + ' by user ' + currentUser.username + ' (' + currentUser.profile.name + ')'
          })
        }
      }

    }

    if(title){ // if title, description included
      check(title, String);
      check(description, String);
      var streamPathSegment = generateStreamPathSegment(shortId, title);
      setObject.title = title;
      setObject.description = description;
      setObject.streamPathSegment = streamPathSegment;
    }

    return updateDeepstream.call(this, {shortId: shortId}, {$set: setObject});
  },
  unpublishStream : unpublishDeepstream,
  updateStreamTitle (shortId, title){
    check(shortId, String);
    check(title, String);
    var streamPathSegment = generateStreamPathSegment(shortId, title);
    return updateDeepstream.call(this, {shortId: shortId}, {$set: {'title' : title, 'streamPathSegment' : streamPathSegment }});
  },
  updateStreamDescription (shortId, description){
    check(shortId, String);
    check(description, String);
    return updateDeepstream.call(this, {shortId: shortId}, {$set: {'description' : description }});
  },
  editContextBlockAnnotation (streamShortId, contextId, annotation) {
    check(streamShortId, String);
    check(contextId, String);
    check(annotation, String);
    var deepstream = Deepstreams.findOne({shortId: streamShortId}, {fields: {'curatorIds': 1}});

    if(!_.contains(deepstream.curatorIds, this.userId)){
      throw new Meteor.Error('User not authorized to edit context in this deepstream');
    }
    
    return updateContextBlock.call(this, {"streamShortId": streamShortId, "_id": contextId }, {"$set": {"annotation": annotation}});
  },
  editContextBlockVideoMarker (streamShortId, contextId, videoMarker) {
    check(streamShortId, String);
    check(contextId, String);
    check(videoMarker, String);
    var deepstream = Deepstreams.findOne({shortId: streamShortId}, {fields: {'curatorIds': 1}});
    if(!_.contains(deepstream.curatorIds, this.userId)){
      throw new Meteor.Error('User not authorized to edit context in this deepstream');
    }
    
    var videoMarkerArray = videoMarker.split(':').reverse();
    videoMarker = moment.duration({hours: videoMarkerArray[2], minutes: videoMarkerArray[1], seconds: videoMarkerArray[0]}).asSeconds().toString();
    
    return updateContextBlock.call(this, {"streamShortId": streamShortId, "_id": contextId }, {"$set": {"videoMarker": videoMarker}});
  },
  editTextSection (streamShortId, contextId, content) {
    check(streamShortId, String);
    check(contextId, String);
    check(content, String);
    var deepstream = Deepstreams.findOne({shortId: streamShortId}, {fields: {'curatorIds': 1}});

    if(!_.contains(deepstream.curatorIds, this.userId)){
      throw new Meteor.Error('User not authorized to edit context in this deepstream');
    }

    return updateContextBlock.call(this, {"streamShortId": streamShortId, "_id": contextId }, {"$set": {"content": content}});
  },
  editPollSection (streamShortId, contextId, content) {
    check(streamShortId, String);
    check(contextId, String);
    check(content, String);
    var deepstream = Deepstreams.findOne({shortId: streamShortId}, {fields: {'curatorIds': 1}});

    if(!_.contains(deepstream.curatorIds, this.userId)){
      throw new Meteor.Error('User not authorized to edit context in this deepstream');
    }

    return updateContextBlock.call(this, {"streamShortId": streamShortId, "_id": contextId }, {"$set": {"content": content}});
  },
  reorderContext (shortId, ordering){
    check(shortId, String);
    check(ordering, [String]);

    // can't use Mongo position operator because also searching curatorIds array in query
    deepstream = Deepstreams.findOne({shortId: shortId}, {fields:{'contextBlocks._id' : 1}});

    var setObject = _.chain(deepstream.contextBlocks)
      .map((cBlock, i) => {
        return ['contextBlocks.' + i + '.rank', _.indexOf(ordering, cBlock._id) + 1];
      })
      .object()
      .value();

    return updateDeepstream.call(this, {"shortId": shortId}, {"$set": setObject});
  },
  directorModeOff (shortId){
    check(shortId, String);
    this.unblock();
    var updated = updateDeepstream.call(this, {
      shortId: shortId
    }, {
      $set: {
        directorMode: false
      }
    });
    if(updated){
      updateDeepstreamStatuses({selector: {shortId: shortId}});
    }
    return updated
  },
  directorModeOn (shortId){
    check(shortId, String);
    this.unblock();
    var updated = updateDeepstream.call(this, {
      shortId: shortId
    }, {
      $set: {
        directorMode: true
      }
    });
    if(updated){
      updateDeepstreamStatuses({selector: {shortId: shortId}});
    }
    return updated
  },
  replayEnabledOff (shortId){
    check(shortId, String);
    this.unblock();
    var updated = updateDeepstream.call(this, {
      shortId: shortId
    }, {
      $set: {
        replayEnabled: false
      }
    });
    if(updated){
      updateDeepstreamStatuses({selector: {shortId: shortId}});
    }
    return updated
  },
  replayEnabledOn (shortId){
    check(shortId, String);
    this.unblock();
    var updated = updateDeepstream.call(this, {
      shortId: shortId
    }, {
      $set: {
        replayEnabled: true
      }
    });
    if(updated){
      updateDeepstreamStatuses({selector: {shortId: shortId}});
    }
    return updated
  },
  startCuratorWebcam (shortId, stream){
    check(shortId, String);
    check(stream, Object);

    _.extend(stream, {type: 'stream'});

    if(Meteor.isClient){
      Session.set('mediaDataType', null);
    }

    // TODO save info on the user as a default

    return updateDeepstream.call(this, {
      shortId: shortId
    }, {
      $set: {
        curatorWebcamStream: stream,
        curatorWebcamActive: true
      }
    });
  },
  addTimelineWidget (shortId, timelineWidgetCode){
    check(shortId, String);
    check(timelineWidgetCode, String);

    // match embed code or url from edit widget url

    var embedCodeMatch = timelineWidgetCode.match(/data\-widget\-id\=\"(\d*?)\"/m);
    var urlMatch = timelineWidgetCode.match(/\/settings\/widgets\/(.\d*)/);
    var simpleNumberMatch = timelineWidgetCode.match(/^(.\d+)$/);

    var twitterTimelineId;

    if (embedCodeMatch && embedCodeMatch[1]){
      twitterTimelineId = embedCodeMatch[1]
    } else if (urlMatch && urlMatch[1]){
      twitterTimelineId = urlMatch[1]
    } else if (simpleNumberMatch && simpleNumberMatch[1]){
      twitterTimelineId = simpleNumberMatch[1]
    }

    if (!twitterTimelineId){
      throw new Meteor.Error('Invalid widget code or url');
    }

    return updateDeepstream.call(this, {
      shortId: shortId
    }, {
      $set: {
        twitterTimelineId: twitterTimelineId
      }
    });
  },
  stopCuratorWebcam (shortId){
    check(shortId, String);

    return updateDeepstream.call(this, {
      shortId: shortId
    }, {
      $set: {
        curatorWebcamActive: false
      }
    });
  },
  suggestContext (streamShortId, contextBlock){
    check(streamShortId, String);
    check(contextBlock, Object);

    var deepstream = Deepstreams.findOne({shortId: streamShortId}, {fields: {'onAir': 1, curatorIds: 1, title:1, userPathSegment: 1, streamPathSegment: 1}});

    if(!deepstream || !deepstream.onAir){
      throw new Meteor.Error('Deepstream not on air');
    }

    var user = Meteor.user();

    if(!user){
      throw new Meteor.Error('Must be logged in to suggest content');
    }

    var contextBlockToInsert = _.extend({}, _.omit(contextBlock, '_id'), {
      streamShortId: streamShortId,
      authorId: this.userId,
      addedAt: new Date,
      savedAt: new Date,
      suggestedAt: new Date,
      suggestedBy: this.userId,
      suggestedByUsername: user.username,
      suggestionStatus: 'pending'
    });



    var success = SuggestedContextBlocks.insert(contextBlockToInsert);

    if(success){
      if (Meteor.isClient) {
        Session.set("previousMediaDataType", Session.get('mediaDataType'));
        Session.set("mediaDataType", null); // leave search mode
        notifySuccess("Thanks for suggesting some great content! We'll let you know when it gets approved!");
      }

      if (Meteor.isServer) {
        var curatorIds = deepstream.curatorIds;
        var emailType = 'suggested_content_received'
        Meteor.users.find({_id: {$in: curatorIds}}, {fields:{'emails.address':1, 'unsubscribes': 1}}).forEach(function(curator){
          if(curator.unsubscribes && _.contains(curator.unsubscribes, emailType)){
            return
          }
          var email = curator.emails[0].address;
          if (email){
            Email.send({
              to: email,
              from: 'noreply@example.com',
              subject: 'New content suggested for your DeepStream: ' + deepstream.title,
              html: user.username + ' just suggested some new content for ' + deepstream.title +
                '. You can check it out and decide whether or not to include it at: ' + Meteor.absoluteUrl('curate/' + deepstream.userPathSegment + '/' + deepstream.streamPathSegment) + '<br><br><br><br>' +
              'To unsubscribe from this type of email, <a href=' + Meteor.absoluteUrl('unsubscribe?email_type=' + emailType) + '>click here</a>'
            })
          }
        })
      }
    }

    return success
  },
  approveContext (contextBlockId){
    check(contextBlockId, String);

    var user = Meteor.user();

    if(!user){
      throw new Meteor.Error('Must be logged in to approve content');
    }

    var contextBlock = SuggestedContextBlocks.findOne(contextBlockId, {transform: null});

    if(!contextBlock){
      throw new Meteor.Error('Context block not found');
    }

    var contextBlockAddendum = {
      suggestionStatus: 'approved',
      moderatedAt: new Date,
      moderatedBy: this.userId,
      moderatedByUsername: user.username
    };

    var contextBlockAddedId = addContextToStream.call(this, contextBlock.streamShortId, _.extend({}, contextBlock, contextBlockAddendum));

    if(!contextBlockAddedId){
      throw new Meteor.Error('Failed to add context');
    }

    var success = SuggestedContextBlocks.update(contextBlockId, {$set: _.extend({}, contextBlockAddendum, {
      idInDeepstream: contextBlockAddedId
    })});

    if(success){
      if (Meteor.isServer) {
        var emailType = 'suggested_content_approved';

        var suggester = Meteor.users.findOne(contextBlock.suggestedBy, {fields:{'emails.address':1, 'unsubscribes': 1}});
        if(suggester.unsubscribes && _.contains(suggester.unsubscribes, emailType)){
          return
        }
        var email = suggester.emails[0].address;
        if (email){
          var deepstream = Deepstreams.findOne({shortId: contextBlock.streamShortId}, {fields: {title:1, userPathSegment: 1, streamPathSegment: 1}});
          Email.send({
            to: email,
            from: 'noreply@example.com',
            subject: 'Your suggested content has been approved!',
            html: user.username + ' just approved the content you suggested for ' + deepstream.title +
            '! You can check it out at: ' + Meteor.absoluteUrl('watch/' + deepstream.userPathSegment + '/' + deepstream.streamPathSegment) + '<br><br><br><br>' +
            'To unsubscribe from this type of email, <a href=' + Meteor.absoluteUrl('unsubscribe?email_type=' + emailType) + '>click here</a>'
          })
        }
      }
    }

    return success;
  },
  rejectContext (contextBlockId){
    check(contextBlockId, String);

    var user = Meteor.user();

    if(!user){
      throw new Meteor.Error('Must be logged in to reject content');
    }

    var contextBlock = SuggestedContextBlocks.findOne(contextBlockId);

    if(!contextBlock){
      throw new Meteor.Error('Context block not found');
    }

    var deepstream = Deepstreams.findOne({shortId: contextBlock.streamShortId}, {fields: {'curatorIds': 1}});

    if(!_.contains(deepstream.curatorIds, this.userId)){
      throw new Meteor.Error('Only curators can moderate suggestions');
    }

    var contextBlockAddendum = {
      suggestionStatus: 'rejected',
      moderatedAt: new Date,
      moderatedBy: this.userId,
      moderatedByUsername: user.username
    };

    return SuggestedContextBlocks.update(contextBlockId, {$set: contextBlockAddendum});
  },
  inviteCurator (shortId, email) {
    check(shortId, String);
    check(email, String);
    if(!SimpleSchema.RegEx.Email.test(email)) {
      throw new Meteor.Error('Please enter a valid email to invite a curator');
    }

    var deepstream = Deepstreams.findOne({shortId: shortId}, {fields: {'mainCuratorId': 1, title: 1, streamPathSegment:1, userPathSegment: 1}});
    if(this.userId !== deepstream.mainCuratorId){
      throw new Meteor.Error('Only the primary curator may invite another curator');
    }

    var inviteCode = Random.id(16); // this could be Random.secret, but it's not clear that is actually more secure and this is more readable in the url

    var success = updateDeepstream.call(this, {shortId: shortId}, {$addToSet: { curatorInviteCodes: inviteCode }});


    if (Meteor.isServer){
      var currentUser = Meteor.user();
      var internalEmail = process.env.SEND_PUBLISH_NOTICE_TO || Meteor.settings.SEND_PUBLISH_NOTICE_TO;
      if (internalEmail){
        Email.send({
          to: internalEmail,
          from: 'noreply@example.com',
          subject: 'New Curator Invite Sent for Deepstream: ' + deepstream.title,
          text: 'In DeepStream "' + deepstream.title + '"' + ' at ' + new Date + ', user ' + currentUser.username + ' (' + currentUser.profile.name + ') invited ' + email + ' to be a curator'
        })
      }

      Email.send({
        to: email,
        from: 'noreply@example.com',
        subject: "You've been invited to help curate " + deepstream.title,
        html: currentUser.profile.name + ' (' + currentUser.username  + ') just invited you to help curate their DeepStream "' + deepstream.title +
        '". To join in, click: ' + Meteor.absoluteUrl('watch/' + deepstream.userPathSegment + '/' + deepstream.streamPathSegment + '?curator_invite_code=' + inviteCode) + '<br><br><a href=' + Meteor.absoluteUrl('about') + '>What is DeepStream?</a>'
      })
    }

    return success
  },
  becomeCurator (shortId, code) {
    check(shortId, String);
    check(code, String);

    var deepstream = Deepstreams.findOne({shortId: shortId}, {fields: {'curatorInviteCodes': 1}});
    if(!deepstream.curatorInviteCodes || !_.contains(deepstream.curatorInviteCodes, code)){
      throw new Meteor.Error('This code is invalid or has already been used');
    }

    return Deepstreams.update({shortId: shortId}, {$addToSet: { curatorIds: this.userId }, $pull: { curatorInviteCodes: code }});
  },
  removeCurator (shortId, curatorId) {
    check(shortId, String);
    check(curatorId, String);

    var deepstream = Deepstreams.findOne({shortId: shortId}, {fields: {'mainCuratorId': 1}});

    if (this.userId !== deepstream.mainCuratorId){
      throw new Meteor.Error('Only the primary curator may remove another curator');
    }

    if (curatorId === deepstream.mainCuratorId){
      throw new Meteor.Error('The primary curator may not be removed');
    }

    return updateDeepstream.call(this, {shortId: shortId}, {$pull: { curatorIds: curatorId}});
  },
  voteInPoll (contextBlockId, optionNumber) {
    check(contextBlockId, String);
    check(optionNumber, Number);
    var voteChoice = "data." + optionNumber + ".value";
    // use query object to set value dynamically
    var query = {};
    query[voteChoice] = 1;
    return ContextBlocks.update(contextBlockId, {
      $inc: query
    }); 
  },
  returnCuratorNames(curatorIds){
    check(curatorIds, [String]);
    var curatorProfiles = Meteor.users.find({_id: {$in: curatorIds}},{fields:{profile:1}}).fetch();
    var nameList = [];
    curatorProfiles.forEach(function(user){
      nameList.push(user.profile.name);
    });
    return nameList;
  },
  favoriteDeepstream (streamShortId) {
    check(streamShortId, String);
    return changeFavorite.call(this, streamShortId, true);
  },
  unfavoriteDeepstream (streamShortId) {
    check(streamShortId, String);
    return changeFavorite.call(this, streamShortId, false);
  },
  designateEditorsPick (streamShortId) {
    check(streamShortId, String);
    return changeEditorsPick.call(this, streamShortId, true);
  },
  stripEditorsPick (streamShortId) {
    check(streamShortId, String);
    return changeEditorsPick.call(this, streamShortId, false);
  },
  deleteDeepstream: function(shortId){
    check(shortId, String);
    if (!this.userId) {
      throw new Meteor.Error('not-logged-in', 'Sorry, you must be logged in to delete a deepstream');
    }

    var stream = Deepstreams.findOne({shortId: shortId, curatorIds: this.userId});

    if (!stream) {
      throw new Meteor.Error('deepstream not found by curator to delete. stream short id: ' + shortId + '  userId: ' + this.userId);
    }

    if (stream.onAir){
      var unpublishSuccessful = unpublishDeepstream.call(this, shortId);
      if (!unpublishSuccessful) {
        throw new Meteor.Error('unpublish failed ' + shortId + '  userId: ' + this.userId);
      }
    }

    return updateDeepstream.call(this, { shortId: shortId }, {
      $set: {
        onAir: false,
        deleted: true,
        deletedAt: new Date
      }
    });
  },
  createDeepstream (shortId, initialStream) { // TO-DO find a way to generate these ids in a trusted way server without compromising UI speed
    var user = Meteor.user();
    if (!user) {
      throw new Meteor.Error('not-logged-in', 'Sorry, you must be logged in to create a deepstream');
    }
    var accessPriority = user.accessPriority;
    if(!accessPriority || accessPriority > createAccessLevel){
      throw new Meteor.Error('user does not have create access. userId: ' + this.userId);
    }

    var streamPathSegment = generateStreamPathSegment(shortId);
    var userPathSegment= user.username;

    Deepstreams.insert({
      savedAt: new Date,
      userPathSegment: userPathSegment,
      streamPathSegment: streamPathSegment,
      mainCuratorId: this.userId,
      curatorIds: [this.userId],
      curatorName: user.profile.name || user.username,
      curatorUsername: user.username,
      shortId: shortId,
      creationStep: CREATION_STEPS[0]
    });

    if (Meteor.isClient){
      Session.set('showPreviewOverlayForStreamId', null);
      FlowRouter.go('curate', {userPathSegment: userPathSegment, streamPathSegment: streamPathSegment});
    }

    if(initialStream){
      Meteor.call('addStreamToStream', shortId, initialStream);
    }

    return {
      userPathSegment: userPathSegment,
      streamPathSegment: streamPathSegment
    };
  }
});
