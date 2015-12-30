Handlebars.registerHelper("debugContext", function() {
  return console.log(this);
});

Handlebars.registerHelper("log", function(v) {
  return console.log(v);
});

Handlebars.registerHelper("curateMode", function() {
  return Session.get("curateMode");
});

Handlebars.registerHelper("browseSuggestionsMode", function() {
  return browseSuggestionsMode();
});

Handlebars.registerHelper("dateInPast", function(date) {
  if(!date){
    return null
  }
  return moment(date).fromNow();
});


Handlebars.registerHelper("currentContext", function(){
  return getCurrentContext()
});


Handlebars.registerHelper("hasContext", function(v) {
  return !_.isEmpty(this);
});


Handlebars.registerHelper("saving", function() {
  return Session.get("saving");
});

Handlebars.registerHelper("signingIn", function() {
  return Session.get("signingIn");
});

Handlebars.registerHelper("showEditorsPickButton", function(){
  return Session.get('showEditorsPickButton') && Meteor.user().admin;
});

Handlebars.registerHelper("isContextOfType", function(type) {
  return type == this.type;
});

Handlebars.registerHelper("UsersCollection", Meteor.users);

Handlebars.registerHelper("isCurator", function() {
  return Meteor.userId() && _.contains(this.curatorIds, Meteor.userId());
});

Handlebars.registerHelper("isMainCurator", function() {
  return Meteor.userId() && this.mainCuratorId === Meteor.userId();
});

Handlebars.registerHelper("windowWidth", function() {
  return Session.get("windowWidth");
});

Handlebars.registerHelper("windowHeight", function() {
  return Session.get("windowHeight");
});

Handlebars.registerHelper("CONTEXT_WIDTH", function() {
  return window.CONTEXT_WIDTH;
});

Handlebars.registerHelper('showDeepstreamAboutOverlay', function() {
  return Session.get('showDeepstreamAboutOverlay');
});

Handlebars.registerHelper("embedMode", function() {
  return window.embedMode();
});

Handlebars.registerHelper("isMobile", function() {
  return window.isMobile();
});

Handlebars.registerHelper("newContextAvailable", function() {
  return Session.get('newContextAvailable');
});

getMainStreamHeight = function(offset){
  return Session.get("windowHeight") - 60 - 65 - 130 - 20 + (offset || 0);
};

getMainStreamMaxWidth = function(offset){
  return Session.get("windowWidth") - 400;
};

Handlebars.registerHelper("mainStreamMaxWidth", function(offset) {
  return getMainStreamMaxWidth(offset);
});

Handlebars.registerHelper("mainStreamHeight", function(offset) {
  return getMainStreamHeight(offset);
});

Handlebars.registerHelper("overlayContentMaxWidth", function() {
  return Session.get("windowWidth") - 285 - 3 * 20 - 2 * 10; // PiPWidth - 3 * leftMargin - padding
});



Handlebars.registerHelper("profileImage", function(user, size) {
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

Handlebars.registerHelper("formatNumber", function(num){
  if(!num){
    return 0;
  }
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
});

Handlebars.registerHelper("formatDate", window.formatDate);
Handlebars.registerHelper("formatDateNice", window.formatDateNice);
Handlebars.registerHelper("formatDateCompact", window.formatDateCompact);
