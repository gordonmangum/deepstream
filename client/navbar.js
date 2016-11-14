Template.minimal_navbar.helpers({
  loggedIn() { return Meteor.user() },
  showDesktopMode: window.showDesktopMode,
  cardListContainerHidden () {
    if(Session.get('cardListContainerHidden')){
      return true;
    }
    return false;
  },
  showShowSuggestionsButton (){
    return Session.get('curateMode') && this.hasPendingSuggestions();
  },
  thisDeepstream () {
    if (FlowRouter.subsReady()) {
      return Deepstreams.findOne({shortId: Session.get('streamShortId')});
    }
  },
  showPreviewEditButton (){
    return !this.creationStep || this.creationStep === 'go_on_air';
  },
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
    if(Session.equals('showSuggestionBrowser', 'suggestions')){
      return Session.set('showSuggestionBrowser', null);
    }
    if(Session.get('contextMode') == 'curate' ){
      return Session.set('contextMode', 'context')
    }
    if(Session.get('contextMode') != 'context' ){
      return Session.set('contextMode', 'context');
    }
    if(getCurrentContext()){
      return clearCurrentContext();
    } else if(Session.get('mediaDataType')){
      if(Session.get('contextMode') == 'context' ){
        Session.set('mediaDataType', null);
        return Session.set('cardListContainerHidden', true);
      }
      if(Session.get('mediaDataType') == 'selectCard'){
        Session.set('contextMode', 'curate');
        return Session.set('mediaDataType', null);
      } else {
        return Session.set('mediaDataType', 'selectCard');
      }
    } else {
      $('#card-list-container').toggleClass('col-xs-4 col-xs-0');
      $('#watch-video-container').toggleClass('col-xs-8 col-xs-12');
      return Session.set('cardListContainerHidden', true);
    }
    //TO DO, when in search result takes you back from 
    // when on stack click back hides stack.
  },
  'click .show-cards' () {
    $('#card-list-container').toggleClass('col-xs-4 col-xs-0');
    $('#watch-video-container').toggleClass('col-xs-8 col-xs-12');
    return Session.set('cardListContainerHidden', null)
  },
  'click .show-suggestions'(){
    analytics.track('Click show suggestions browser', trackingInfoFromPage());
    Session.set('contextMode', 'context');
    Session.set('showSuggestionBrowser', 'suggestions');
    //Session.set('contextMode', 'suggestions');
    Session.set('mediaDataType', null);
    Session.set('activeContextId', null);
  },
  'click .return-to-curate' (){
    Session.set('curateMode', true);
    analytics.track('Curator clicked edit deepstream', trackingInfoFromPage());
  },
});