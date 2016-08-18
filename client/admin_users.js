Template.admin_users_content.onCreated( () => {
  let template = Template.instance();

  template.searchQuery = new ReactiveVar();
  template.searching   = new ReactiveVar( false );

  template.autorun( () => {
    template.searching.get();
    template.subscribe('usersForAdmin', template.searchQuery.get(), () => {
      Meteor.setTimeout(() => {
        template.searching.set( false );
      }, 1000); // delay cause users dont like super responsive interface
    });
  });
});

Template.admin_users_content.helpers({
  searching() {
    return Template.instance().searching.get();
  },
  query() {
    return Template.instance().searchQuery.get();
  },
  users() {
    let users = Meteor.users.find();
    if (users) {
      console.info(users.fetch());
      return users;
    }
  }
});

Template.admin_users_content.events({
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

Template.admin_user_row.helpers({
  lastLogin(services){
    if(services.resume){
      if(services.resume.loginTokens){
        if(services.resume.loginTokens[0]){
          return services.resume.loginTokens[0].when;
        }
      }
    }
    return '-';
  },
  isUserFromTwitter(services){
    if(services.twitter && services.twitter.id){
      return 'Twitter';
    }
    return 'Email';
  },
  userEmail(emails){
    if(emails){
      if(emails[0]){
        return emails[0].address;
      }
    }
    return '-';
  }
});