Template.registerHelper("replayContextOn", function() {
    if(Session.get("replayContext")){
      return true;
    } else {
      return false;
    }
});

Template.registerHelper("debugContext", function() {
  return console.log(this);
});

Template.registerHelper("log", function(v) {
  return console.log(v);
});

Template.registerHelper("curateMode", function() {
  return Session.get("curateMode");
});

Template.registerHelper("browseSuggestionsMode", function() {
  return browseSuggestionsMode();
});

Template.registerHelper("dateInPast", function(date) {
  if(!date){
    return null
  }
  return moment(date).fromNow();
});


Template.registerHelper("currentContext", function(){
  return getCurrentContext()
});


Template.registerHelper("hasContext", function(v) {
  return !_.isEmpty(this);
});


Template.registerHelper("saving", function() {
  return Session.get("saving");
});

Template.registerHelper("signingIn", function() {
  return Session.get("signingIn");
});

Template.registerHelper("showEditorsPickButton", function(){
  return Session.get('showEditorsPickButton') && Meteor.user().admin;
});

Template.registerHelper("isContextOfType", function(type) {
  return type == this.type;
});

Template.registerHelper("UsersCollection", Meteor.users);

Template.registerHelper("isCurator", function() {
  if(this.curatorIds){
    Session.set('curatorIds', this.curatorIds);
  }
  return Meteor.userId() && _.contains(this.curatorIds, Meteor.userId());
});

Template.registerHelper("isCuratorInTemplate", function(){
  if(!Session.get('curatorIds')){
    if(this.curatorIds){
      Session.set('curatorIds', this.curatorIds);
    }
  }
  return Meteor.userId() && _.contains(Session.get('curatorIds'), Meteor.userId());
});

Template.registerHelper("isMainCurator", function() {
  return Meteor.userId() && this.mainCuratorId === Meteor.userId();
});

Template.registerHelper("windowWidth", function() {
  return Session.get("windowWidth");
});

Template.registerHelper("windowHeight", function(offset) {
  return Session.get("windowHeight") + (offset || 0);
});

Template.registerHelper("CONTEXT_WIDTH", function() {
  return window.CONTEXT_WIDTH;
});

Template.registerHelper('showDeepstreamAboutOverlay', function() {
  return Session.get('showDeepstreamAboutOverlay');
});

Template.registerHelper("embedMode", function() {
  return window.embedMode();
});

Template.registerHelper("featuredMode", function() {
  return window.featuredMode();
});

Template.registerHelper("featuredPeek", function() {
  return window.featuredPeek();
});

Template.registerHelper("isMobile", function() {
  return window.isMobile();
});

Template.registerHelper("newContextAvailable", function() {
  return Session.get('newContextAvailable');
});

getMainStreamHeight = function(offset){
  return Session.get("windowHeight") - 60 - 65 - 130 - 20 + (offset || 0);
};

getLeftSectionWidth = function(offset){
  return Session.get("windowWidth") - 400 + (offset || 0);
};

getTitleSectionWidth = function(offset){
  if(Session.get("windowWidth") > 900) {
    return Session.get("windowWidth") - 400 + (offset || 0);
  }
  return Session.get("windowWidth") - 50 + (offset || 0);
};

Template.registerHelper("leftSectionWidth", function(offset) {
  return getLeftSectionWidth(offset);
});

Template.registerHelper("titleSectionWidth", function(offset) {
  return getTitleSectionWidth(offset);
});

Template.registerHelper("mainStreamHeight", function(offset) {
  return getMainStreamHeight(offset);
});

Template.registerHelper("overlayContentMaxWidth", function() {
  return Session.get("windowWidth") - 285 - 3 * 20 - 2 * 10; // PiPWidth - 3 * leftMargin - padding
});



Template.registerHelper("profileImage", function(user, size) {
  var diameter;
  if (size === 'large'){
    diameter = 150;
  } else {
    diameter = 60;
  }
  var dprSetting = window.isHighDensity ? ',dpr_2.0' : '';
  if (user && user.profile) { 
    if ( user.profile.profilePicture) {
      return '//res.cloudinary.com/' + Meteor.settings['public'].CLOUDINARY_CLOUD_NAME + '/image/upload/w_' + diameter + ',h_' + diameter + ',c_fill,g_face' + dprSetting + '/' + user.profile.profilePicture
    } else if (user.services && user.services.twitter) {
      return '//res.cloudinary.com/' + Meteor.settings['public'].CLOUDINARY_CLOUD_NAME + '/image/twitter/w_' + diameter + ',h_' + diameter + ',c_fill,g_face' + dprSetting + '/' + user.services.twitter.id
    }
  }
});

Template.registerHelper("formatNumber", function(num){
  if(!num){
    return 0;
  }
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
});

Template.registerHelper("formatDate", window.formatDate);
Template.registerHelper("formatDateNice", window.formatDateNice);
Template.registerHelper("formatDateCompact", window.formatDateCompact);
