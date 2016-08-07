Template.about.onRendered(function() {
  Meteor.setTimeout(function(){ 
  var hash = document.location.hash.substr(1);
  if (hash && !Template.about.scrolled) {
  var scroller = function() {
    return $("html, body").stop();
  };

  Meteor.setTimeout(function() {
    var elem = $("a[name='" + hash + "']");
    if (elem.length) {
      scroller().scrollTop(elem.offset().top);
      // Guard against scrolling again w/ reactive changes
      Template.about.scrolled = true;
    }
   }, 
  0);
  }
  },0);
});

Template.about.destroyed = function() {
  delete Template.about.scrolled;
};
