Template.contest_details.events({
  "click .signin" (d) {
    Session.set('signingIn', true);
    analytics.track('Click login & signup button on contest page', trackingInfoFromPage());
    Meteor.setTimeout(function(){$2('.signin-overlay').scrollTop(0);},100);
  }
});