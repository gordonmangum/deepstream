Template.admin_deepstreams_content.onCreated( () => {
  let template = Template.instance();

  template.searchQuery = new ReactiveVar();
  template.searchPublished = new ReactiveVar(true);
  template.searching   = new ReactiveVar( false );

  template.autorun( () => {
    template.searching.get();
    template.subscribe('deepstreamsForAdmin', template.searchQuery.get(), template.searchPublished.get(), () => {
      Meteor.setTimeout(() => {
        template.searching.set( false );
      }, 1000); // delay cause users dont like super responsive interface
    });
  });
});

Template.admin_deepstreams_content.helpers({
  searching() {
    return Template.instance().searching.get();
  },
  query() {
    return Template.instance().searchQuery.get();
  },
  deepstreams() {
    let deepstreams = Deepstreams.find();
    if (deepstreams) {
      return deepstreams;
    }
  }
});

Template.admin_deepstreams_content.events({
  'keyup [name="search"]' ( event, template ) {
    let value = event.target.value.trim();

    if ( value !== '' /*&& event.keyCode === 13*/ ) {
      template.searchQuery.set( value );
      template.searching.set( true );
    }

    if ( value === '' ) {
      template.searchQuery.set( value );
    }
  },
  'change [name="published"]' ( event, template ) {
    let value = event.target.value.trim();
    if(value === "published"){
      template.searchPublished.set(true);
    } else {
      template.searchPublished.set(false);
    }
    template.searching.set(true);
  }
});