window.enclosingAnchorTag = null;
window.selectedNode = null;

window.saveCallback =  function(err, success, cb) {
  var saveUIUpdateDelay = 300;
  setTimeout(function(){
    if (err) {
      return Session.set('saveState', 'failed');
    }
    if (!success) {
      return Session.set('saveState', 'failed');
    }
    Session.set('saveState', 'saved');
  }, saveUIUpdateDelay);
  if(cb){
    cb(err, success);
  }
  if (err){
    throw(err);
  }
};

window.refreshContentDep = new Tracker.Dependency();


var scrollToRelativePosition = function(offset) {
  var selectedNarrative = $('.vertical-narrative-section.selected');
  if (selectedNarrative){
    $('body,html').animate({
      scrollTop: $('.vertical-narrative-section.selected').position().top + offset
    }, 200, 'easeInCubic');
  }
};



Template.stream_search.events({
  'mouseenter .horizontal-narrative-section' () {
    document.body.style.overflow = 'hidden';
  },
  'mouseleave .horizontal-narrative-section' (){
    document.body.style.overflow='auto';
  }
});

Template.stream_search.onDestroyed(function(){
  document.body.style.overflow='auto';
});

Template.add_context.helpers({
  listMode (){
    return emptyContextBlockOfCurrentMediaDataType().searchList;
  },
  searchListTemplate (){
    return emptyContextBlockOfCurrentMediaDataType().searchListTemplate;
  },
  searchSoloTemplate (){
    return emptyContextBlockOfCurrentMediaDataType().searchSoloTemplate;
  }
});

Template.content_icons.helpers(contextHelpers);


Template.content_icons.helpers({
  disableAllButStream (){
    // return bool to determine if first creation step
    return _.contains(['find_stream'], this.creationStep);
  }
});


Template.content_icons.events(_.object(_.map(contextTypes, function(type){
    return 'click .' + type + '-button'
  })
  , _.map(contextTypes, function(type) {
    return function() {
      Session.set('mediaDataType', type);
    };
  }))
);

Template.content_icons.events({
  'click button' () {
    clearCurrentContext(); // clear current context whenever click on a context button
  }
});

Template.add_context.events({
  'mouseenter .search-results-container' () {
    document.body.style.overflow = 'hidden';
  },
  'mouseleave .search-results-container' (){
    document.body.style.overflow='auto';
  }
});

Template.add_context.onDestroyed(function(){
  document.body.style.overflow='auto';
});

window.addStream = function(stream, template) {
  Session.set('query', null); // clear query so it doesn't seem like you're editing this card next time open the new card menu
  Session.set('saveState', 'saving');
  template.focusResult.set(null);

  Meteor.call('addStreamToStream', Session.get("streamShortId"), stream, function(err, streamId){
    saveCallback(err, streamId);
  });
};

window.addContext = function(contextBlock) { // add or suggest
  var user;

  /* require login
  if (user = Meteor.user()) {
    contextBlock.authorId = user._id;
    contextBlock.rank = 0; // places above existing ranked context
    if(mainPlayer.getElapsedTime()){
      if(Session.get('videoMarkerTouched')){
        var videoMarkerArray = Session.get('userVideoMarker').split(':').reverse();
        contextBlock.videoMarker = moment.duration({hours: videoMarkerArray[2], minutes: videoMarkerArray[1], seconds: videoMarkerArray[0]}).asSeconds();
      } else {
        contextBlock.videoMarker = mainPlayer.getElapsedTime();
      }
    }
  } else {
    $('#login-modal').modal('show');
    return;
  }
  */
  
  //do not req login
  
  if(user = Meteor.user()){
    contextBlock.authorId = user._id;
  } else {
    contextBlock.authorId = 1;
  }
  contextBlock.rank = 0; // places above existing ranked context
  if(mainPlayer.getElapsedTime()){
    if(Session.get('videoMarkerTouched')){
      var videoMarkerArray = Session.get('userVideoMarker').split(':').reverse();
      contextBlock.videoMarker = moment.duration({hours: videoMarkerArray[2], minutes: videoMarkerArray[1], seconds: videoMarkerArray[0]}).asSeconds();
    } else {
      contextBlock.videoMarker = mainPlayer.getElapsedTime();
    }
  }
  

  if (Session.get('curateMode')) {
    Session.set('saveState', 'saving');

    Meteor.setTimeout(function () { // scroll to top and focus annotation box
      $('.context-browser>.context-area').scrollTop(0);
      $('.context-section[data-context-id=' + contextBlock._id + '] textarea').focus();
    });

    Meteor.call('addContextToStream', Session.get("streamShortId"), contextBlock, function (err, contextId) {
      saveCallback(err, contextId, function(){
        console.log('context added');
        Session.set('contextMode', 'curate');
        Session.set('mediaDataType', 'selectCard');
      });
    });
  } else { // suggest content
    Meteor.call('suggestContext', Session.get("streamShortId"), contextBlock, function (err, contextId) {
      saveCallback(err, contextId, function(){
        console.log('context suggested');
        Session.set('contextMode', 'context');
        Session.set('mediaDataType', 'selectCard');
      });
    });
  }
};



Template.link_twitter.events({
  "click button" () {
    if (!Meteor.user()){
      notifyInfo('Please log in to link your twitter account');
      return
    }

    Meteor.linkWithTwitter({
      requestPermissions: ['user']
    }, function (err) {
      if (err) {
        notifyError("Twitter login failed");
        throw(err);
      } else if (!Meteor.user().profile.bio){
        Meteor.call('setBioFromTwitter')
      }
    });
    analytics.track('Click Link Twitter');
  }
});

Template.videoMarkerInput.onCreated(function(){
  Session.set('videoMarkerTouched', false);
  Session.set('userVideoMarker', 0);
});

Template.videoMarkerInput.onDestroyed(function(){
  Session.set('videoMarkerTouched', false);
  Session.set('userVideoMarker', 0);
});

Template.videoMarkerInput.helpers({
  videoMarkerEstimate(){
    if(!Session.get('videoMarkerTouched')){
      return moment.duration(Session.get("currentTimeElapsed"), "seconds").format("h:mm:ss", {trim: false});
    } else {
      return Session.get('userVideoMarker');
    }
  }
});

Template.videoMarkerInput.events({
  'focus input#video-marker-input' (e, template){
    // on focus pause the videoMarker input
    console.log('focused in on the video marker currently at: ' + $('#video-marker-input').val());
    Session.set('userVideoMarker', $('#video-marker-input').val());
    Session.set('videoMarkerTouched', true);
  },
  'keyup input#video-marker-input' (e, template){
    console.log('keyup on input');
    Session.set('videoMarkerTouched', true);
    Session.set('userVideoMarker', $('#video-marker-input').val());
    if(e.which === 13){
      var textContent = template.$('#video-marker-input').val();
      var videoMarkerArray = textContent.split(':').reverse();
      var videoMarker = moment.duration({hours: videoMarkerArray[2], minutes: videoMarkerArray[1], seconds: videoMarkerArray[0]}).asSeconds();
      videoMarker = moment.duration(videoMarker, "seconds").format("h:mm:ss", {trim: false});
      template.$('#video-marker-input').val(videoMarker);
    }
  },
  'blur input#video-marker-input' (e, template){
    var textContent = template.$('#video-marker-input').val();
    var videoMarkerArray = textContent.split(':').reverse();
    var videoMarker = moment.duration({hours: videoMarkerArray[2], minutes: videoMarkerArray[1], seconds: videoMarkerArray[0]}).asSeconds();
    videoMarker = moment.duration(videoMarker, "seconds").format("h:mm:ss", {trim: false});
    template.$('#video-marker-input').val(videoMarker);
  }
});
