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
    
    console.log(stream);
    // set replay 
    if(numberOfStreamsBeforeAdd > 0){
      _.extend(modifierObject['$set'], {
        replayEnabled : false
      });
      if(Meteor.isClient){
        Session.set('replayContext', false);
      }
    } else if (numberOfStreamsBeforeAdd === 0 && !stream.live && stream.source === 'youtube') {
      _.extend(modifierObject['$set'], {
        replayEnabled : true
      });
      if(Meteor.isClient){
        Session.set('replayContext', true);
      }
    }
    

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


    var modifierObject = {
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
      modifierObject['$set'] = {
        activeStreamId: newActiveStream ? newActiveStream._id : null // set to another recent stream, preferably live
      }
    }
    
    var numberOfStreamsBeforeDelete = deepstream.streams.length;
  
    // set replay 
    if(numberOfStreamsBeforeDelete > 2 || numberOfStreamsBeforeDelete === 1){
      updateDeepstream.call(this, {shortId: shortId}, {$set: {'replayContext':false}}); 
      /* TypeError: Cannot set property 'replayEnabled' of undefined
      _.extend(modifierObject['$set'], {
        replayEnabled : false
      });
      */
      if(Meteor.isClient){
        window.resetMainPlayer();
        Session.set('replayContext', false);
      }
    } else if (numberOfStreamsBeforeDelete === 2 && !deepstream.streams[0].live) {
      updateDeepstream.call(this, {shortId: shortId}, {$set: {'replayContext':true}});
      /* TypeError: Cannot set property 'replayEnabled' of undefined
      _.extend(modifierObject['$set'], {
        replayEnabled : true
      });
      */
      if(Meteor.isClient){
        Session.set('replayContext', true);
      }
    }
    
    var numUpdated = updateDeepstream.call(this, {
      shortId: shortId
    }, modifierObject);

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
            from: 'Deepstream@deepstream.tv',
            subject: 'New DeepStream Published: ' + title,
            html: '<html><head><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><title>New DeepStream Published: ' + title + '</title><style>/* ------------------------------------- GLOBAL------------------------------------- */*{font-family: "Helvetica Neue", "Helvetica", Helvetica, Arial, sans-serif; font-size: 100%; line-height: 1.6em; margin: 0; padding: 0;}img{max-width: 600px; width: 100%;}body{-webkit-font-smoothing: antialiased; height: 100%; -webkit-text-size-adjust: none; width: 100% !important;}/* ------------------------------------- ELEMENTS------------------------------------- */a{color: #348eda;}.btn-primary{Margin-bottom: 10px; width: auto !important;}.btn-primary td{background-color: #348eda; border-radius: 25px; font-family: "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif; font-size: 14px; text-align: center; vertical-align: top;}.btn-primary td a{background-color: #348eda; border: solid 1px #348eda; border-radius: 25px; border-width: 10px 20px; display: inline-block; color: #ffffff; cursor: pointer; font-weight: bold; line-height: 2; text-decoration: none;}.last{margin-bottom: 0;}.first{margin-top: 0;}.padding{padding: 10px 0;}/* ------------------------------------- BODY------------------------------------- */table.body-wrap{padding: 20px; width: 100%;}table.body-wrap .container{border: 1px solid #f0f0f0;}/* ------------------------------------- FOOTER------------------------------------- */table.footer-wrap{clear: both !important; width: 100%;}.footer-wrap .container p{color: #666666; font-size: 12px;}table.footer-wrap a{color: #999999;}/* ------------------------------------- TYPOGRAPHY------------------------------------- */h1, h2, h3{color: #111111; font-family: "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif; font-weight: 200; line-height: 1.2em; margin: 40px 0 10px;}h1{font-size: 36px;}h2{font-size: 28px;}h3{font-size: 22px;}p, ul, ol{font-size: 14px; font-weight: normal; margin-bottom: 10px;}ul li, ol li{margin-left: 5px; list-style-position: inside;}/* --------------------------------------------------- RESPONSIVENESS------------------------------------------------------ *//* Set a max-width, and make it display as block so it will automatically stretch to that width, but will also shrink down on a phone or something */.container{clear: both !important; display: block !important; Margin: 0 auto !important; max-width: 600px !important;}/* Set the padding on the td rather than the div for Outlook compatibility */.body-wrap .container{padding: 20px;}/* This should also be a block element, so that it will fill 100% of the .container */.content{display: block; margin: 0 auto; max-width: 600px;}/* Lets make sure tables in the content area are 100% wide */.content table{width: 100%;}</style><script type="text/javascript" src="chrome-extension://aadgmnobpdmgmigaicncghmmoeflnamj/ng-inspector.js"></script></head><body bgcolor="#f6f6f6"><table class="body-wrap" bgcolor="#f6f6f6"> <tbody><tr> <td></td><td class="container" bgcolor="#FFFFFF"> <div class="content"> <table> <tbody><tr> <td> <h2>A new DeepStream has just been published!</h2><br><p>"' + title + '"' + ' was published at ' + new Date + ' by the user ' + currentUser.username + ' (' + currentUser.profile.name + ')</p><br><table class="btn-primary" cellpadding="0" cellspacing="0" border="0"> <tbody><tr> <td> <a href="' + Meteor.absoluteUrl() + '">Visit DeepStream.tv Now</a> </td></tr></tbody></table><br><p>Thanks, have a lovely day.</p><p><a href="https://twitter.com/streamdeeper">Follow @streamdeeper on Twitter</a></p></td></tr></tbody></table> </div></td><td></td></tr></tbody></table><table class="footer-wrap"> <tbody><tr> <td></td><td class="container"> <div class="content"> <table> <tbody><tr> <td align="center"></td></tr></tbody></table> </div></td><td></td></tr></tbody></table></body></html>'
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
    if(ContextBlocks.findOne(contextId)){
      return updateContextBlock.call(this, {"streamShortId": streamShortId, "_id": contextId }, {"$set": {"videoMarker": videoMarker}});
    } else {
      return updateSuggestedContextBlock.call(this, {"streamShortId": streamShortId, "_id": contextId }, {"$set": {"videoMarker": videoMarker}});
    }
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
      throw new Meteor.Error('Deepstream not on air or does not exist');
    }

    var user = Meteor.user();

    if(!user){
      /* req user login 
      throw new Meteor.Error('Must be logged in to suggest content');
      */
      //now we dont -- set up an anonymous user
      user = { username: 'anonymous', placeholder:true, _id: '0'}
    }
    var now = new Date;
    var contextBlockToInsert = _.extend({}, _.omit(contextBlock, '_id'), {
      streamShortId: streamShortId,
      authorId: user._id,
      addedAt: now,
      savedAt: now,
      suggestedAt: now,
      suggestedBy: user.id,
      suggestedByUsername: user.username,
      suggestionStatus: 'pending'
    });

    var success = SuggestedContextBlocks.insert(contextBlockToInsert);

    if(success){
      if (Meteor.isClient) {
        Session.set("previousMediaDataType", Session.get('mediaDataType'));
        Session.set("mediaDataType", null); // leave search mode
        if(user.placeholder){
          notifySuccess("Thanks for suggesting some great content! Sign up for an account to know when it gets approved!");
        } else {
          notifySuccess("Thanks for suggesting some great content! We'll let you know when it gets approved!");
        }
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
              from: 'Deepstream@deepstream.tv',
              subject: 'New content suggested for your DeepStream: ' + deepstream.title,
              html: '<html><head><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><title>New content suggested for your DeepStream: ' + deepstream.title +'</title><style>/* ------------------------------------- GLOBAL------------------------------------- */*{font-family: "Helvetica Neue", "Helvetica", Helvetica, Arial, sans-serif; font-size: 100%; line-height: 1.6em; margin: 0; padding: 0;}img{max-width: 600px; width: 100%;}body{-webkit-font-smoothing: antialiased; height: 100%; -webkit-text-size-adjust: none; width: 100% !important;}/* ------------------------------------- ELEMENTS------------------------------------- */a{color: #348eda;}.btn-primary{Margin-bottom: 10px; width: auto !important;}.btn-primary td{background-color: #348eda; border-radius: 25px; font-family: "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif; font-size: 14px; text-align: center; vertical-align: top;}.btn-primary td a{background-color: #348eda; border: solid 1px #348eda; border-radius: 25px; border-width: 10px 20px; display: inline-block; color: #ffffff; cursor: pointer; font-weight: bold; line-height: 2; text-decoration: none;}.last{margin-bottom: 0;}.first{margin-top: 0;}.padding{padding: 10px 0;}/* ------------------------------------- BODY------------------------------------- */table.body-wrap{padding: 20px; width: 100%;}table.body-wrap .container{border: 1px solid #f0f0f0;}/* ------------------------------------- FOOTER------------------------------------- */table.footer-wrap{clear: both !important; width: 100%;}.footer-wrap .container p{color: #666666; font-size: 12px;}table.footer-wrap a{color: #999999;}/* ------------------------------------- TYPOGRAPHY------------------------------------- */h1, h2, h3{color: #111111; font-family: "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif; font-weight: 200; line-height: 1.2em; margin: 40px 0 10px;}h1{font-size: 36px;}h2{font-size: 28px;}h3{font-size: 22px;}p, ul, ol{font-size: 14px; font-weight: normal; margin-bottom: 10px;}ul li, ol li{margin-left: 5px; list-style-position: inside;}/* --------------------------------------------------- RESPONSIVENESS------------------------------------------------------ *//* Set a max-width, and make it display as block so it will automatically stretch to that width, but will also shrink down on a phone or something */.container{clear: both !important; display: block !important; Margin: 0 auto !important; max-width: 600px !important;}/* Set the padding on the td rather than the div for Outlook compatibility */.body-wrap .container{padding: 20px;}/* This should also be a block element, so that it will fill 100% of the .container */.content{display: block; margin: 0 auto; max-width: 600px;}/* Lets make sure tables in the content area are 100% wide */.content table{width: 100%;}</style><script type="text/javascript" src="chrome-extension://aadgmnobpdmgmigaicncghmmoeflnamj/ng-inspector.js"></script></head><body bgcolor="#f6f6f6"><table class="body-wrap" bgcolor="#f6f6f6"> <tbody><tr> <td></td><td class="container" bgcolor="#FFFFFF"> <div class="content"> <table> <tbody><tr> <td> <h2>New content suggested for your DeepStream: '+ deepstream.title +'</h2><br><p> The user '+ user.username +' has suggested content for your Deepstream! You can check it out and decide whether or not to include it by clicking the button below!</p><br><table class="btn-primary" cellpadding="0" cellspacing="0" border="0"> <tbody><tr> <td> <a href="' + Meteor.absoluteUrl('curate/' + deepstream.userPathSegment + '/' + deepstream.streamPathSegment) + '">Click here to view your suggested content</a> </td></tr></tbody></table><br><p>Thanks, have a lovely day.</p><p><a href="https://twitter.com/streamdeeper">Follow @streamdeeper on Twitter</a></p></td></tr></tbody></table> </div></td><td></td></tr></tbody></table><table class="footer-wrap"> <tbody><tr> <td></td><td class="container"> <div class="content"> <table> <tbody><tr> <td align="center"> <p>To unsubscribe from this type of email, <a href=' + Meteor.absoluteUrl('unsubscribe?email_type=' + emailType) + '><unsubscribe>click here</unsubscribe></a>. </p></td></tr></tbody></table> </div></td><td></td></tr></tbody></table></body></html>'
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

        var suggester;
        if(suggester = Meteor.users.findOne(contextBlock.suggestedBy, {fields:{'emails.address':1, 'unsubscribes': 1}})){
          if(suggester.unsubscribes && _.contains(suggester.unsubscribes, emailType)){
            return
          }
          var email = suggester.emails[0].address;
          if (email){
          var deepstream = Deepstreams.findOne({shortId: contextBlock.streamShortId}, {fields: {title:1, userPathSegment: 1, streamPathSegment: 1}});
          Email.send({
            to: email,
            from: 'Deepstream@deepstream.tv',
            subject: 'Your suggested content has been approved!',
            html: '<html><head><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><title>Your suggested content has been approved!</title><style>/* ------------------------------------- GLOBAL------------------------------------- */*{font-family: "Helvetica Neue", "Helvetica", Helvetica, Arial, sans-serif; font-size: 100%; line-height: 1.6em; margin: 0; padding: 0;}img{max-width: 600px; width: 100%;}body{-webkit-font-smoothing: antialiased; height: 100%; -webkit-text-size-adjust: none; width: 100% !important;}/* ------------------------------------- ELEMENTS------------------------------------- */a{color: #348eda;}.btn-primary{Margin-bottom: 10px; width: auto !important;}.btn-primary td{background-color: #348eda; border-radius: 25px; font-family: "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif; font-size: 14px; text-align: center; vertical-align: top;}.btn-primary td a{background-color: #348eda; border: solid 1px #348eda; border-radius: 25px; border-width: 10px 20px; display: inline-block; color: #ffffff; cursor: pointer; font-weight: bold; line-height: 2; text-decoration: none;}.last{margin-bottom: 0;}.first{margin-top: 0;}.padding{padding: 10px 0;}/* ------------------------------------- BODY------------------------------------- */table.body-wrap{padding: 20px; width: 100%;}table.body-wrap .container{border: 1px solid #f0f0f0;}/* ------------------------------------- FOOTER------------------------------------- */table.footer-wrap{clear: both !important; width: 100%;}.footer-wrap .container p{color: #666666; font-size: 12px;}table.footer-wrap a{color: #999999;}/* ------------------------------------- TYPOGRAPHY------------------------------------- */h1, h2, h3{color: #111111; font-family: "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif; font-weight: 200; line-height: 1.2em; margin: 40px 0 10px;}h1{font-size: 36px;}h2{font-size: 28px;}h3{font-size: 22px;}p, ul, ol{font-size: 14px; font-weight: normal; margin-bottom: 10px;}ul li, ol li{margin-left: 5px; list-style-position: inside;}/* --------------------------------------------------- RESPONSIVENESS------------------------------------------------------ *//* Set a max-width, and make it display as block so it will automatically stretch to that width, but will also shrink down on a phone or something */.container{clear: both !important; display: block !important; Margin: 0 auto !important; max-width: 600px !important;}/* Set the padding on the td rather than the div for Outlook compatibility */.body-wrap .container{padding: 20px;}/* This should also be a block element, so that it will fill 100% of the .container */.content{display: block; margin: 0 auto; max-width: 600px;}/* Lets make sure tables in the content area are 100% wide */.content table{width: 100%;}</style><script type="text/javascript" src="chrome-extension://aadgmnobpdmgmigaicncghmmoeflnamj/ng-inspector.js"></script></head><body bgcolor="#f6f6f6"><table class="body-wrap" bgcolor="#f6f6f6"> <tbody><tr> <td></td><td class="container" bgcolor="#FFFFFF"> <div class="content"> <table> <tbody><tr> <td> <h2>Your suggested content has been approved!</h2><br><p>' + user.username + ' just approved the content you suggested for ' + deepstream.title + '! You can check it out by clicking the button below:</p><br><table class="btn-primary" cellpadding="0" cellspacing="0" border="0"> <tbody><tr> <td> <a href="' + Meteor.absoluteUrl('watch/' + deepstream.userPathSegment + '/' + deepstream.streamPathSegment) + '">Watch ' + deepstream.title + ' now</a> </td></tr></tbody></table><br><p>Thanks, have a lovely day.</p><p><a href="https://twitter.com/streamdeeper">Follow @streamdeeper on Twitter</a></p></td></tr></tbody></table> </div></td><td></td></tr></tbody></table><table class="footer-wrap"> <tbody><tr> <td></td><td class="container"> <div class="content"> <table> <tbody><tr> <td align="center"> <p>To unsubscribe from this type of email, <a href=' + Meteor.absoluteUrl('unsubscribe?email_type=' + emailType) + '><unsubscribe>click here</unsubscribe></a>. </p></td></tr></tbody></table> </div></td><td></td></tr></tbody></table></body></html>'
          })
        }
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
          from: 'Deepstream@deepstream.tv',
          subject: 'New Curator Invite Sent for Deepstream: ' + deepstream.title,
          html: '<html><head><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><title>New Curator Invite Sent for Deepstream: ' + deepstream.title + '</title><style>/* ------------------------------------- GLOBAL------------------------------------- */*{font-family: "Helvetica Neue", "Helvetica", Helvetica, Arial, sans-serif; font-size: 100%; line-height: 1.6em; margin: 0; padding: 0;}img{max-width: 600px; width: 100%;}body{-webkit-font-smoothing: antialiased; height: 100%; -webkit-text-size-adjust: none; width: 100% !important;}/* ------------------------------------- ELEMENTS------------------------------------- */a{color: #348eda;}.btn-primary{Margin-bottom: 10px; width: auto !important;}.btn-primary td{background-color: #348eda; border-radius: 25px; font-family: "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif; font-size: 14px; text-align: center; vertical-align: top;}.btn-primary td a{background-color: #348eda; border: solid 1px #348eda; border-radius: 25px; border-width: 10px 20px; display: inline-block; color: #ffffff; cursor: pointer; font-weight: bold; line-height: 2; text-decoration: none;}.last{margin-bottom: 0;}.first{margin-top: 0;}.padding{padding: 10px 0;}/* ------------------------------------- BODY------------------------------------- */table.body-wrap{padding: 20px; width: 100%;}table.body-wrap .container{border: 1px solid #f0f0f0;}/* ------------------------------------- FOOTER------------------------------------- */table.footer-wrap{clear: both !important; width: 100%;}.footer-wrap .container p{color: #666666; font-size: 12px;}table.footer-wrap a{color: #999999;}/* ------------------------------------- TYPOGRAPHY------------------------------------- */h1, h2, h3{color: #111111; font-family: "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif; font-weight: 200; line-height: 1.2em; margin: 40px 0 10px;}h1{font-size: 36px;}h2{font-size: 28px;}h3{font-size: 22px;}p, ul, ol{font-size: 14px; font-weight: normal; margin-bottom: 10px;}ul li, ol li{margin-left: 5px; list-style-position: inside;}/* --------------------------------------------------- RESPONSIVENESS------------------------------------------------------ *//* Set a max-width, and make it display as block so it will automatically stretch to that width, but will also shrink down on a phone or something */.container{clear: both !important; display: block !important; Margin: 0 auto !important; max-width: 600px !important;}/* Set the padding on the td rather than the div for Outlook compatibility */.body-wrap .container{padding: 20px;}/* This should also be a block element, so that it will fill 100% of the .container */.content{display: block; margin: 0 auto; max-width: 600px;}/* Lets make sure tables in the content area are 100% wide */.content table{width: 100%;}</style><script type="text/javascript" src="chrome-extension://aadgmnobpdmgmigaicncghmmoeflnamj/ng-inspector.js"></script></head><body bgcolor="#f6f6f6"><table class="body-wrap" bgcolor="#f6f6f6"> <tbody><tr> <td></td><td class="container" bgcolor="#FFFFFF"> <div class="content"> <table> <tbody><tr> <td> <h2>A new DeepStream has just been published!</h2><br><p>A new curator invite has just been sent in DeepStream "' + deepstream.title + '"' + ' at ' + new Date + ', the user ' + currentUser.username + ' (' + currentUser.profile.name + ') invited ' + email + ' to be a curator!</p><br><table class="btn-primary" cellpadding="0" cellspacing="0" border="0"> <tbody><tr> <td> <a href="' + Meteor.absoluteUrl() + '">Visit DeepStream.tv Now</a> </td></tr></tbody></table><br><p>Thanks, have a lovely day.</p><p><a href="https://twitter.com/streamdeeper">Follow @streamdeeper on Twitter</a></p></td></tr></tbody></table> </div></td><td></td></tr></tbody></table><table class="footer-wrap"> <tbody><tr> <td></td><td class="container"> <div class="content"> <table> <tbody><tr> <td align="center"></td></tr></tbody></table> </div></td><td></td></tr></tbody></table></body></html>'
        })
      }

      Email.send({
        to: email,
        from: 'Deepstream@deepstream.tv',
        subject: "You've been invited to help curate " + deepstream.title,
        html: '<html><head><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><title>You are invited to help curate ' + deepstream.title + '</title><style>/* ------------------------------------- GLOBAL------------------------------------- */*{font-family: "Helvetica Neue", "Helvetica", Helvetica, Arial, sans-serif; font-size: 100%; line-height: 1.6em; margin: 0; padding: 0;}img{max-width: 600px; width: 100%;}body{-webkit-font-smoothing: antialiased; height: 100%; -webkit-text-size-adjust: none; width: 100% !important;}/* ------------------------------------- ELEMENTS------------------------------------- */a{color: #348eda;}.btn-primary{Margin-bottom: 10px; width: auto !important;}.btn-primary td{background-color: #348eda; border-radius: 25px; font-family: "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif; font-size: 14px; text-align: center; vertical-align: top;}.btn-primary td a{background-color: #348eda; border: solid 1px #348eda; border-radius: 25px; border-width: 10px 20px; display: inline-block; color: #ffffff; cursor: pointer; font-weight: bold; line-height: 2; text-decoration: none;}.last{margin-bottom: 0;}.first{margin-top: 0;}.padding{padding: 10px 0;}/* ------------------------------------- BODY------------------------------------- */table.body-wrap{padding: 20px; width: 100%;}table.body-wrap .container{border: 1px solid #f0f0f0;}/* ------------------------------------- FOOTER------------------------------------- */table.footer-wrap{clear: both !important; width: 100%;}.footer-wrap .container p{color: #666666; font-size: 12px;}table.footer-wrap a{color: #999999;}/* ------------------------------------- TYPOGRAPHY------------------------------------- */h1, h2, h3{color: #111111; font-family: "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif; font-weight: 200; line-height: 1.2em; margin: 40px 0 10px;}h1{font-size: 36px;}h2{font-size: 28px;}h3{font-size: 22px;}p, ul, ol{font-size: 14px; font-weight: normal; margin-bottom: 10px;}ul li, ol li{margin-left: 5px; list-style-position: inside;}/* --------------------------------------------------- RESPONSIVENESS------------------------------------------------------ *//* Set a max-width, and make it display as block so it will automatically stretch to that width, but will also shrink down on a phone or something */.container{clear: both !important; display: block !important; Margin: 0 auto !important; max-width: 600px !important;}/* Set the padding on the td rather than the div for Outlook compatibility */.body-wrap .container{padding: 20px;}/* This should also be a block element, so that it will fill 100% of the .container */.content{display: block; margin: 0 auto; max-width: 600px;}/* Lets make sure tables in the content area are 100% wide */.content table{width: 100%;}</style><script type="text/javascript" src="chrome-extension://aadgmnobpdmgmigaicncghmmoeflnamj/ng-inspector.js"></script></head><body bgcolor="#f6f6f6"><table class="body-wrap" bgcolor="#f6f6f6"> <tbody><tr> <td></td><td class="container" bgcolor="#FFFFFF"> <div class="content"> <table> <tbody><tr> <td> <h2>You are invited to help curate: ' + deepstream.title + '</h2><br><p>' + currentUser.profile.name + ' (' + currentUser.username + ') just invited you to help curate their DeepStream ' + deepstream.title + '. To join in, click the button below. If you are curious about what DeepStream is click <a href=' + Meteor.absoluteUrl('about') + '>here</a>.</p><br><table class="btn-primary" cellpadding="0" cellspacing="0" border="0"> <tbody><tr> <td> <a href="' + Meteor.absoluteUrl('watch/' + deepstream.userPathSegment + '/' + deepstream.streamPathSegment + '?curator_invite_code=' + inviteCode) + '">Click here to help curate ' + deepstream.title + '</a> </td></tr></tbody></table><br><p>Thanks, have a lovely day.</p><p><a href="https://twitter.com/streamdeeper">Follow @streamdeeper on Twitter</a></p></td></tr></tbody></table> </div></td><td></td></tr></tbody></table><table class="footer-wrap"> <tbody><tr> <td></td><td class="container"> <div class="content"> <table> <tbody><tr> <td align="center"></td></tr></tbody></table> </div></td><td></td></tr></tbody></table></body></html>'
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
