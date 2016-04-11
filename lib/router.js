setTitle = function(pageName){
  if (Meteor.isClient){
    var title;
    if(pageName) {
      title = pageName + ' - DeepStream';
    } else {
      title = 'DeepStream';
    }
    document.title = title;
    $('meta[property="og:title"]').attr('content', title);
    $('meta[name="twitter:title"]').attr('content', title);
  }
};

setMetaImage = function(imageUrl){
  if (Meteor.isClient){
    if (imageUrl){
      $('meta[property="og:image"]').attr('content', imageUrl.replace(/^\/\//, "https://")); // replace protocol-less url with https
      $('meta[property="og:image:secure_url"]').attr('content', imageUrl.replace(/^\/\//, "https://")); // replace protocol-less url with https
      $('meta[name="twitter:image"]').attr('content', imageUrl.replace(/^\/\//, "https://")); // replace protocol-less url with https
    } else {
      $('meta[property="og:image"]').attr('content', "https://res.cloudinary.com/deepstream/image/upload/v1/static/DEEPSTREAM_fb_image.png");
      $('meta[property="og:image:secure_url"]').attr('content', "https://res.cloudinary.com/deepstream/image/upload/v1/static/DEEPSTREAM_fb_image.png");
      $('meta[name="twitter:image"]').attr('content', "https://res.cloudinary.com/deepstream/image/upload/v1/static/DEEPSTREAM_twitter_image.png");
    }
  }
};



setMetaDescription = function(desc){
  if (Meteor.isClient){
    if (desc){
      $('meta[name="description"]').attr('content', desc);
      $('meta[property="og:description"]').attr('content', desc);
      $('meta[name="twitter:description"]').attr('content', desc);
    } else {
      $('meta[name="description"]').attr('content', 'Transforming the livestream experience through cross-site search and engaging user-selected content.');
      $('meta[property="og:description"]').attr('content', 'Transforming the livestream experience through cross-site search and engaging user-selected content.');
      $('meta[name="twitter:description"]').attr('content', 'Transforming the livestream experience through cross-site search and engaging user-selected content.');
    }
  }
};

setStatusCode = function(statusCode){
  if (Meteor.isClient){
    if(!statusCode){
      statusCode = '200';
    }
    $('meta[name=prerender-status-code]').remove();
    $('head').append('<meta name="prerender-status-code" content="' + statusCode + '">');
  }
};

var longTermSubs = new SubsManager({
  cacheLimit: 9999,
  expireIn: 60 * 60 * 24 // one day
});

var shortTermSubs = new SubsManager({
  cacheLimit: 10,
  expireIn: 45 // seconds
});

FlowRouter.route("/", {
  name: "home",
  action () {
    setTitle();
    setMetaImage();
    setMetaDescription();
    setStatusCode();
    return BlazeLayout.render("home");
  },
  subscriptions () {
    this.register('deepstreamsOnAir', longTermSubs.subscribe('deepstreamsOnAir'));
    this.register('bestStreams', shortTermSubs.subscribe('bestStreams'));
    this.register('mostRecentStreams', shortTermSubs.subscribe('mostRecentStreams'));

    //this.register('currentDeepstreamContext', Meteor.subscribe('deepstreamAllContext'));
    this.register('currentDeepstreamContext', Meteor.subscribe('deepstreamHomepageContext', ['SEDsDRNb','3zruKDSm'])); //this allows us to have context blocks for everythig in home.js but only returns context blocks (regardless of short id given) with SEDsDRNb short id. 
  },
  triggersEnter: [function(){
    Session.set('mediaDataType', null); // so doesn't show up on stream preview icons
    $('html, body').scrollTop(0);
  }]
});

FlowRouter.route("/about", {
  name: "about",
  action () {
    setTitle('About');
    setMetaImage();
    setMetaDescription();
    setStatusCode();
    return BlazeLayout.render("about");
  },
  triggersEnter: [function(){
    $('html, body').scrollTop(0);
  }]
});

FlowRouter.route("/terms", {
  name: "terms",
  action () {
    setTitle('Terms');
    setMetaImage();
    setMetaDescription();
    setStatusCode();
    BlazeLayout.render("terms");
  },
  triggersEnter: [function(){
    $('html, body').scrollTop(0);
  }]
});

FlowRouter.route("/privacy", {
  name: "privacy",
  action () {
    setTitle('Privacy');
    setMetaImage();
    setMetaDescription();
    setStatusCode();
    BlazeLayout.render("privacy");
  },
  triggersEnter: [function(){
    $('html, body').scrollTop(0);
  }]
});


FlowRouter.route("/watch/:userPathSegment/:streamPathSegment", {
  name: "watch",
  action (params, queryParams) {
    setMetaImage();
    var shortId = idFromPathSegment(params.streamPathSegment);
    BlazeLayout.render("watch_page", {onCuratePage: false, userPathSegment: params.userPathSegment, streamPathSegment: params.streamPathSegment, shortId: shortId, curatorInviteCode: queryParams.curator_invite_code});
  },
  subscriptions: function(params) {
    var shortId = idFromPathSegment(params.streamPathSegment);
    this.register('currentDeepstreamContext', Meteor.subscribe('deepstreamContext', shortId));

    // (if comment this back in, need to deal with unpublishing after coming from homepage which will remove this ds from the homepage subscription)
    //if (Meteor.isClient) { // if full deepstream is already loaded due to visiting homepage, don't wait for it
    //  var fastRenderPayload = FastRender.debugger.getPayload();
    //  var deepstream = Deepstreams.findOne({shortId: shortId}, {reactive: false});
    //  if (!fastRenderPayload.subscriptions.singleDeepstream && deepstream && !deepstream.creationStep) { // check creationStep because if it's a new deepstream we must subscribe
    //    return
    //  }
    //}
    this.register('currentDeepstream', Meteor.subscribe('singleDeepstreamOnAir', params.userPathSegment, shortId));
  },
  triggersEnter: [function(){
    $('html, body').scrollTop(0);
  }]
});

FlowRouter.route("/curate/:userPathSegment/:streamPathSegment", {
  name: "curate",
  action (params, queryParams) {
    setMetaDescription();
    var shortId = idFromPathSegment(params.streamPathSegment);
    BlazeLayout.render("watch_page", {onCuratePage: true, userPathSegment: params.userPathSegment, streamPathSegment: params.streamPathSegment, shortId: shortId, curatorInviteCode: queryParams.curator_invite_code});
  },
  subscriptions: function(params) {
    var shortId = idFromPathSegment(params.streamPathSegment);
    this.register('currentDeepstreamContext', Meteor.subscribe('deepstreamContext', shortId));
    this.register('currentSuggestedDeepstreamContext', Meteor.subscribe('deepstreamSuggestedContext', shortId));
    this.register('currentDeepstream', Meteor.subscribe('singleDeepstream', params.userPathSegment, shortId));
  },
  triggersEnter: [function(){
    $('html, body').scrollTop(0);
  }, function(){
    Session.set('curateMode', true);
  }],
  triggersExit: [function(){
    Session.set('curateMode', false);
  }]
});

FlowRouter.route("/embed/:userPathSegment/:streamPathSegment", {
  name: "embed",
  triggersEnter: [function(context, redirect){
    activateEmbedMode();
    redirect('watch', context.params);
  }]
});

FlowRouter.route("/featured/:userPathSegment/:streamPathSegment", {
  name: "featured",
  triggersEnter: [function(context, redirect){
    activateFeaturedMode();
    redirect('watch', context.params);
  }]
});

FlowRouter.route("/twitter-signup", {
  name: "twitter-signup",
  subscriptions () {
    this.register('tempUser', Meteor.subscribe('tempUsernamePub'));
  },
  action () {
    // TODO these can be passed into signup render
    Session.set("emailUser", false);
    Session.set('signingInWithTwitter', false);
    setTitle('Signup');
    setMetaImage();
    setMetaDescription();
    setStatusCode();
    return BlazeLayout.render("signup");
  },
  triggersEnter: [function(){
    $('html, body').scrollTop(0);
  }]
});

FlowRouter.route("/email-signup", {
  name: "email-signup",
  action () {
    Session.set("emailUser", true);
    Session.set('signingInWithTwitter', false);
    setTitle('Signup');
    setMetaImage();
    setMetaDescription();
    setStatusCode();
    return BlazeLayout.render("signup");
  },
  triggersEnter: [function(){
    $('html, body').scrollTop(0);
  }]
});

FlowRouter.route("/signup", {
  name: "signup",
  action () {
    Session.set("emailUser", true);
    Session.set('signingInWithTwitter', false);
    setTitle('Signup');
    setMetaImage();
    setMetaDescription();
    setStatusCode();
    return BlazeLayout.render("signup_page");
  },
  triggersEnter: [function(){
    $('html, body').scrollTop(0);
  }]
});


FlowRouter.route("/login", {
  name: "login",
  action () {
    setTitle('Login');
    setMetaImage();
    setMetaDescription();
    setStatusCode();
    return BlazeLayout.render("login")
  },
  triggersEnter: [function(){
    $('html, body').scrollTop(0);
  }]
});

FlowRouter.route("/my_streams", {
  name: "my_streams",
  action () {
    setTitle('My Deep Streams');
    setMetaImage();
    setMetaDescription();
    setStatusCode();
    BlazeLayout.render("my_streams");
  },
  subscriptions () {
    this.register('myDeepstreams', longTermSubs.subscribe('myDeepstreams'));
  },
  triggersEnter: [function(){
    $('html, body').scrollTop(0);
  }]
});


FlowRouter.route("/recover-password", {
  name: "recover_password",
  action () {
    setTitle('Recover Password');
    setMetaImage();
    setMetaDescription();
    setStatusCode();
    BlazeLayout.render("recover_password");
  },
  triggersEnter: [function(){
    $('html, body').scrollTop(0);
  }]
});

FlowRouter.route("/reset-password/:resetPasswordToken", {
  name: "reset_password",
  action (params) {
    setTitle('Reset Password');
    setMetaImage();
    setMetaDescription();
    setStatusCode();
    Session.set("resetPasswordToken", params.resetPasswordToken);
    return BlazeLayout.render("reset_password");
  },
  triggersEnter: [function(){
    $('html, body').scrollTop(0);
  }]
});


FlowRouter.route("/unsubscribe", {
  path: "unsubscribe",
  action (params, queryParams){
    BlazeLayout.render("unsubscribe", {emailType: queryParams.email_type});
  },
  triggersEnter: [function(){
    $('html, body').scrollTop(0);
  }]
});

FlowRouter.route("/stats", {
  path: "stats",
  action (){
    BlazeLayout.render("stats");
  },
  triggersEnter: [function(){
    $('html, body').scrollTop(0);
  }]
});

FlowRouter.notFound = {
  action (){
    setStatusCode(404);
  }
};

// handle user bailing in middle of twitter signup, before a username is chosen. this probably only happens on page load or reload.
FlowRouter.triggers.enter([function(context, redirect) {
  var currentRoute = context.route;

  if (!Session.get('signingInWithTwitter')) { // don't forcible logout user if in the middle of twitter signup
    var user = Meteor.user();
    if (user && currentRoute){
      if(!user.username && currentRoute !== 'twitter-signup'){ // if user has no username, confirm they are on the page where they can fill that out
        Meteor.logout(); // otherwise log them out
        setTimeout(function(){
          throw new Meteor.Error('Forcibly logged out user, presumably because they did not finish twitter signup (setting username etc...)');
        }, 0);
      }
    }
  }
}]);






FlowRouter.subscriptions = function() {
  this.register('userData', longTermSubs.subscribe('userData'));
};



//
//FlowRouter.route("profile", {
//  path: "/profile/:username", // can put in display username
//  template: "profile",
//  action () {
//    if (this.ready()) {
//      setTitle(this.params.username + "'s Profile");
//      setMetaImage();
//      setMetaDescription();
//      return this.render();
//    }
//  },
//  waitOn () {
//    var username = this.params.username;
//    return [Meteor.subscribe('userProfilePub', username),
//           Meteor.subscribe('userStoriesPub', username)];
//  },
//  data () {
//    var username = this.params.username;
//    var user;
//      if (this.ready()) {
//        user = Accounts.findUserByUsername(username);
//        if (user) {
//          setStatusCode();
//          return {
//            user : user
//          }
//        } else {
//          setStatusCode("404");
//          this.render("user_not_found");
//        }
//      }
//  },
//  onRun (){
//    $('html, body').scrollTop(0);
//    this.next();
//  }
//});
//
//
//
////FlowRouter.route("loading", {
////  path: "loading",
////  template: "loading_page"
////});
//

