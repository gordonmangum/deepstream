Template.minimal_navbar.helpers({
  loggedIn() { return Meteor.user() }
});

Template.minimal_navbar.events({
  "click .logout" (e, t) {
    e.preventDefault();
    Meteor.logout(() => {
      if(window.mainPlayer){
        window.resetMainPlayer();
      }
    });
  },
  'click .back-button': function(){
    if(Session.get('contextMode') != 'context'){
      return Session.set('contextMode', 'context');
    }
    if(getCurrentContext()){
      return clearCurrentContext();
    } else if(Session.get('mediaDataType')){
      if(Session.get('mediaDataType') == 'selectCard'){
        return Session.set('mediaDataType', null);
      } else {
        return Session.set('mediaDataType', 'selectCard');
      }
    } else {
      return Session.set('mediaDataType', null);
    }
    
    //TO DO, when in search result takes you back from 
    // when on stack click back hides stack.
  },
  'click .show-suggestions'(){
    analytics.track('Click show suggestions browser', trackingInfoFromPage());
    Session.set('contextMode', 'suggestions');
    Session.set('mediaDataType', null);
    Session.set('activeContextId', null);
  },
});