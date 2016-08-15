window.startTime = window.performance ? window.performance.timing.navigationStart : Date.now(); // mobile safari doesn't have timing api


$.cloudinary.config({
  cloud_name: Meteor.settings["public"].CLOUDINARY_CLOUD_NAME
});

window.createKeenScopedKey = function(){
  Meteor.call('createKeenScopedKey', function(err){
    if(err){
      console.error(err);
    }
  });
};

window.isHighDensity = ((window.matchMedia && (window.matchMedia('only screen and (min-resolution: 124dpi), only screen and (min-resolution: 1.3dppx), only screen and (min-resolution: 48.8dpcm)').matches || window.matchMedia('only screen and (-webkit-min-device-pixel-ratio: 1.3), only screen and (-o-min-device-pixel-ratio: 2.6/2), only screen and (min--moz-device-pixel-ratio: 1.3), only screen and (min-device-pixel-ratio: 1.3)').matches)) || (window.devicePixelRatio && window.devicePixelRatio > 1.3));

window.trimInput = function(val) {
  return val.replace(/^\s*|\s*$/g, "");
};


window.plainTextPaste = function(e) {
  var clipboardData = (e.originalEvent || e).clipboardData;
  e.preventDefault();
  return document.execCommand('insertText', false, clipboardData.getData('text/plain'));
};


window.isValidPassword = function(p) {
  if (p.length >= 6) {
    return true;
  } else {
    return false;
  }
};

window.checkValidEmail = function(email) {
  if (email.length === 0 ) {
    return { status: false, message: 'Please enter your e-mail address' };
  } else if (!SimpleSchema.RegEx.Email.test(email)) {
    return { status: false, message: 'Invalid e-mail address' };
  } else {
    return { status: true, message: false };
  }
};

window.checkValidName = function(name) {
  if (name.length === 0 ) {
    return { status: false, message: 'Please enter your first and last name' };
  } else if (name.length > 127 ) {
    return { status: false, message: 'Too long (maximum 127 characters)' };
  } else {
    return { status: true, message: false };
  }
};

window.checkValidPassword = function(p1) {
  if (p1.length === 0 ) {
    return { status: false, message: 'Please enter a password' };
  } else if (!isValidPassword(p1)) {
    return { status: false, message: 'Too short (minimum 6 characters)' };
  } else {
    return { status: true, message: false };
  }
};

window.checkValidPasswordConfirmation = function(p1, p2) {
  if (p2.length && p1!==p2) {
    return { status: false, message: 'Passwords do not match' };
  } else {
    return { status: true, message: false };
  }
};

window.checkValidUsername = function(username) {
  var usernameRegex = /^[a-zA-Z0-9-_]+$/;
  if (username.length === 0 ) {
    return { status: false, message: 'Please enter a username' };
  } else if (username.length < 3) {
  	return { status: false, message: 'Too short (minimum 3 chars)' };
  } else if (username.length > 15) {
  	return { status: false, message: 'Too long (maximum 15 chars)' };
  } else if (!username.match(usernameRegex)) {
    return { status: false, message: 'Please only use letters, numbers, -, and _' };
  } else {
    return { status: true, message: false };
  }
};

window.incrementReactiveVar = function(rv){
  return rv.set(rv.get() + 1);
};

// from https://bambuser.com/api/player_javascript
window.getFlashMovie = function(id) {
  if (navigator.appName.indexOf("Microsoft Internet") == -1) {
    if (document.embeds && document.embeds[id])
      return document.embeds[id];
  } else {
    return document.getElementById(id);
  }

  if (window.document[id]) {
    return window.document[id];
  }
  return document.getElementById(id);
};

window.textContentHelper = function() {
  var textContent, rows, placeholder, additionalClasses;
  if (this.type === 'text'){
    textContent = this.content || '';
    rows = 40;
    placeholder = '';
    additionalClasses = '';
  }
  else {
    textContent = this.annotation || '';
    rows = 3;
    placeholder = 'Add a caption'
    additionalClasses = 'annotation';
  }

  if (!Session.get('curateMode')) {
    if (textContent.length){
      return '<div class="text-content" dir="auto">' + _.escape(textContent).replace(/\n/g, "<br>") + '</div>';
    } else {
      return ''
    }
  } else {
    return '<textarea name="content" class="text-content editable ' + additionalClasses + '" rows="' + rows + '" placeholder="' + placeholder +  '" dir="auto">' + _.escape(textContent) + '</textarea>';
  }
};

window.pluralizeMediaType = function(mediaType){
  switch(mediaType){
    case 'news':
      return 'news';
    case 'text':
      return 'text';
    case 'poll':
      return 'polls';
    case 'chat':
      return 'chat';
    case 'twitter':
      return 'tweets';
    case 'audio':
      return 'audio';
    default:
      return mediaType + 's'
  }
};

window.singularizeMediaType = function(mediaType){
  switch(mediaType){
    case 'news':
      return 'story';
    case 'text':
      return 'text';
    case 'poll':
      return 'poll';
    case 'chat':
      return 'chat';
    case 'twitter':
      return 'tweet';
    case 'audio':
      return 'sound clip';
    default:
      return mediaType
  }
};

window.contextTypes = [
  "stream",
  "text",
  "poll",
  "image",
  "map",
  "video",
  "twitter",
  "audio",
  "link",
  "news"
];


//window.typeHelpers = _.object(contextTypes, _.map(contextTypes, function(type) {
//  return function() {
//    return this.type === type;
//  };
//}));



window.horizontalBlockHelpers = _.extend({}, {
  selected (){
    return true;
  },
  annotation: textContentHelper,
  showAnnotationSection () {
    return this.annotationAllowed && (Session.get('curateMode') || this.annotation) && !window.browseSuggestionsMode();
  },
  showVideoMarkerSection () {
    return Session.get('curateMode') && (mainPlayer.activeStream.get().source === "youtube" && !mainPlayer.activeStream.get().live)
  }
});


var i = 0;

window.count = function(){
  return i++;
};

window.getCurrentContext = function(){
  var currentContextId = Session.get("currentContextId");
  if (currentContextId){
    return ContextBlocks.findOne(currentContextId) || SuggestedContextBlocks.findOne(currentContextId) ;
  }
};

window.setCurrentContext = function(contextBlock){
  Session.set("currentContextId", contextBlock._id);
};

window.clearCurrentContext = function(){
  Session.set("currentContextId", null);
};

window.soloOverlayContextModeActive = function(){
  var currentContext = getCurrentContext();
  return currentContext && currentContext.soloModeLocation === 'overlay';
};


window.emptyContextBlockOfCurrentMediaDataType = function(){
  return newTypeSpecificContextBlock({type: Session.get('mediaDataType')});
};


window.contextHelpers = _.object(contextTypes, _.map(contextTypes, function(type) {
  return function() {
    return Session.get('mediaDataType') === type;
  };
}));


var weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Friday 2/20/2015 20:29:22
window.formatDate = function (date) {
  if (date) {
    var hms;
    hms = date.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
    return weekDays[date.getDay()] + " " + (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear() + " " + hms;
  }
};

// February 7th, 2015
window.formatDateNice = function (date) {
  if (date){
    return monthNames[(date.getMonth())] + " " + date.getDate() + ", " + date.getFullYear();
  }

};

// 2/7/2015
window.formatDateCompact = function (date) {
  if (date){
    return (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear();
  }

};

unthrottledUpdateActiveContext = function(){

  if($('.context-browser').hasClass('hide')){
    return;
  }

  var container = $('.context-browser>.context-area.list-mode');

  var containerOffset = container.offset();

  if (!containerOffset){
    return
  }

  var containerOffsetTop = containerOffset.top;
  var lastActivationBias = 10;
  var currentActivationBias = 30;
  var activeId;

  var orderedContextElements = $('.context-browser .list-item-context-plus-annotation');

  var orderedContextIds = orderedContextElements.map(function(i,e){ // get from DOM in case user hasn't updated to the latest context
    return $(e).data('context-id');
  });


  if (container[0].scrollHeight - container.scrollTop() - container.outerHeight() - lastActivationBias <= 0 ){
    activeId =  _.last(orderedContextIds);
  } else {
    var contextOffsetObjects = _.map(orderedContextElements, (e) => {
        e = $(e); // jquerify
        var offset = e.offset();
        if (offset){
          return {id: e.data('context-id'), offset: offset.top, height: e.outerHeight()};
        }
      }
    );

    activeId = _.chain(contextOffsetObjects)
      //.compact()
      .filter((obj) => {
        return obj.offset + obj.height / 2 > containerOffsetTop + currentActivationBias;
      })
      .pluck('id')
      .first()
      .value();
  }

  Session.set('activeContextId', activeId);
};


window.updateActiveContext = _.throttle(unthrottledUpdateActiveContext, 50, {leading: false});

window.scrollToContext = function(id){
  clearCurrentContext();
  Session.set('mediaDataType', null);
  Session.set('contextMode', 'context');
  Meteor.setTimeout(() => {
    var offset = 130;
    var contextToScrollTo = $('.context-section[data-context-id=' + id + ']');
    var container = $('.context-browser>.context-area');
    container.animate({scrollTop: (contextToScrollTo.offset().top - container.offset().top + container.scrollTop() - offset)});
  })
}

window.browseSuggestionsMode = function(){
  return Session.equals('contextMode', 'suggestions')
};

window.embedMode = function(){
  return Session.equals('embedMode', true);
};

window.featuredMode = function(){
  return Session.equals('featuredMode', true);
};

window.featuredPeek = function(){
  return Session.equals('featuredPeek', true);
};

window.activateEmbedMode = function(){
  return Session.set('embedMode', true); 
};

window.activateFeaturedMode = function(){
  Session.set('embedMode', true);
  Session.set('featuredMode', true);
  return Session.set('featuredPeek', true);
};

window.deactivateFeaturedMode = function(){
  Session.set('embedMode', false);
  Session.set('featuredMode', false);
  return Session.set('featuredPeek', false);
};

window.deactivateFeaturedPeekMode = function(){
  return Session.set('featuredPeek', false);
};

window.isMobile = function(){
  return (Meteor.Device.isPhone()) && !Meteor.Device.isBot()
};

window.trackingInfoFromPage = function () {
  var currentRoute = FlowRouter.current();
  var trackingInfoObject = {
    embed: false,
    featured: false
  };
  if(currentRoute.route.name === 'watch' || currentRoute.route.name === 'curate'){
    trackingInfoObject = _.extend({
      streamShortId: Session.get('streamShortId'),
      userPathSegment: currentRoute.params.userPathSegment,
      elapsedTime: window.mainPlayer.getElapsedTime()
    }, trackingInfoObject);
  } else if(currentRoute.route.name === 'embed'){
    trackingInfoObject = _.extend({
      embed: true,
      streamShortId: Session.get('streamShortId'),
      userPathSegment: currentRoute.params.userPathSegment,
      elapsedTime: window.mainPlayer.getElapsedTime()
    }, trackingInfoObject);
  } else if(currentRoute.route.name === 'featured'){
    trackingInfoObject = _.extend({
      featured: true,
      streamShortId: Session.get('streamShortId'),
      userPathSegment: currentRoute.params.userPathSegment
    }, trackingInfoObject);
  }
  return _.extend({
    currentRouteName: currentRoute.route.name,
    currentRoutePath: currentRoute.path
  }, trackingInfoObject);
};

window.trackingInfoFromContext = function (context) {
  return _.extend({
    label: context.type,
    contentType: context.type,
    contentSource: context.source,
    id: context._id,
    streamShortId: context.streamShortId
  }, trackingInfoFromPage())
};
