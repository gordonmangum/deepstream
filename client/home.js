
loginWithTwitter = function () {
  Session.set('signingInWithTwitter', true);
  Meteor.loginWithTwitter({
    requestPermissions: ['user']
  }, function (err) {
    if (err) {
      notifyError("Twitter login failed");
      Session.set('signingInWithTwitter', false);
      throw(err); // throw error so we see it on kadira
    } else if (!Meteor.user().username) { // if they are signing up for the first time they won't have a username yet
      FlowRouter.go('twitter-signup');
    } else { // otherwise they are a returning user, they are now logged in and free to proceed
      notifyLogin();
    }
  });
};

loginWithEmail = function () {
  FlowRouter.go('login')
};

Template.login_buttons.helpers({
  showUserInfo () {
    return Template.instance().showUserInfo.get();
  },
  loggingOut () {
    return Template.instance().loggingOut.get();
  }
});

Template.login_buttons.onCreated(function () {
  this.showUserInfo = new ReactiveVar(false);
  this.loggingOut = new ReactiveVar(false);
});

Template.login_buttons.events({
  "mouseenter .user-action" (d) {
    Template.instance().showUserInfo.set(true);
  },
  "mouseleave .user-action" (d) {
    Template.instance().showUserInfo.set(false);
  },
  "click .signin" (d) {
    Session.set('signingIn', true);
    analytics.track('Click login signup button', trackingInfoFromPage());
  },
  "click .logout" (e, t) {
    e.preventDefault();
    t.showUserInfo.set(false);
    t.loggingOut.set(true);
    Meteor.logout(() =>
      t.loggingOut.set(false)
    );
  }
});

window.setSigningInFrom = function () {
  Session.set('signingInFrom', FlowRouter.current().path);
};

window.returnFromSignIn = function () {
  closeSignInOverlay();
  FlowRouter.go(Session.get('signingInFrom') || '/');
};

var closeSignInOverlay = function () {
  Session.set('signingIn', false);
};

// TO-DO close sign in overlay on esc (27) need to do on whole window though

Template.signin_overlay.onCreated(function() {
  this.showLoginForm = new ReactiveVar();
});

Template.signin_overlay.helpers({
  showLoginForm (){
    return true; //Template.instance().showLoginForm.get();
  }
});

Template.signin_overlay.events({
  "click .close" (e, t) {
    closeSignInOverlay();
    t.showLoginForm.set(false);
    analytics.track('Click close sign-in overlay');
  },
  "click .twitter-signin, click .twitter-signup" (e, t) {
    closeSignInOverlay();
    t.showLoginForm.set(false);
    loginWithTwitter();
    analytics.track('Click login with Twitter');
  },
  "click .email-signin" (e, t) {
    closeSignInOverlay();
    t.showLoginForm.set(false);
    loginWithEmail();
    analytics.track('Click login with email');
  },
  "click .show-login-form" (e,t) {
    t.showLoginForm.set(true);
  }
});

Template.signup_page.events({
  "click .twitter-signin" (d) {
    loginWithTwitter();
    analytics.track('Click sign up with Twitter');
  }
});

// DEEPSTREAM

Template.top_banner.helpers({
  showBestStreams () {
    return Session.equals('homeStreamListMode', 'best');
  },
  showMostRecentStreams () {
    return Session.equals('homeStreamListMode', 'most_recent');
  }
});

Template.home.onCreated(function () {
  var that = this;
  Session.set('homeStreamListMode', 'best');
  Session.set('homeStreamListType', 'both');
  Session.set('homeStreamListQuery', null);

  this.noMoreStreamResults = new ReactiveVar();
  this.loadingStreamResults = new ReactiveVar();

  this.autorun(() => {
    if(Session.get('homeStreamListMode') !== 'search'){
      that.noMoreStreamResults.set(null);
      that.loadingStreamResults.set(null);
    }
  });

  this.streamSearch = function(query){
    that.loadingStreamResults.set(true);
    that.noMoreStreamResults.set(null);
    Meteor.call('streamSearchList', query, function (err, results) {
      that.loadingStreamResults.set(false);
      if (err) {
        that.noMoreStreamResults.set('No more results'); // TO-DO - surface error to user?
        throw(err);
        return;
      }

      var items = results.items;
      var nextPage = results.nextPage;

      if (!items || !items.length) {
        that.noMoreStreamResults.set('No results found');
        return;
      }
      _.chain(items)
        .map(ContextBlock.searchMappings['all_streaming_services'].mapFn || _.identity)
        .each(function (item, i) {
          _.extend(item, {
            type: "stream",
            //authorId: Meteor.user() ? Meteor.user()._id : ,
            searchQuery: query,
            searchOption: "homepage_search",
            nextPage: nextPage,
            ordinalId: count(),
            fullDetails: items[i] // include all original details from the api
          });
          //_.defaults(item, {
          //  source: source // for multi-source search, may already have a source
          //});

          SearchResults.insert(item);
        });
    });
  }

});



Template.home.helpers({
  noMoreStreamResults (){
    return Template.instance().noMoreStreamResults.get();
  },
  loadingStreamResults (){
    return Template.instance().loadingStreamResults.get();
  },
  showDeepstreamsOnly (){
    return Session.equals('homeStreamListType', 'deepstreams');
  },
  showLivestreamsOnly (){
    return Session.equals('homeStreamListType', 'livestreams');
  },
  showDeepstreamsAndLivestreams (){
    return Session.equals('homeStreamListType', 'both');
  },
  showDeepstreams (){
    return Session.equals('homeStreamListType', 'both') || Session.equals('homeStreamListType', 'deepstreams');
  },
  showLivestreams (){
    return Session.equals('homeStreamListType', 'both') || Session.equals('homeStreamListType', 'livestreams');
  }
});

var getCheckBoxesNames = [
    "youtube",
    "bambuser",
    "ustream",
    "twitch"
  ];


var updateCheckBoxes = function(){

  var checked  = getCheckBoxesNames.filter(function(elem){
    var id = elem + "-checkbox";
    return document.getElementById(id).checked;
  });

  if(checked.length == 0){
    console.log("No boxes were selected");
  }
  Session.set("checkedBoxes", checked);
};

var getHomepageStreamSearchResults = function() {
  return SearchResults.find({
    searchQuery: Session.get('homeStreamListQuery'),
    searchOption: "homepage_search",
    source: {$in: Session.get("checkedBoxes")}
  });
};

Template.home.events({
  "change #livestreams-checkbox,#deepstream-checkbox"(e, t){
    var boxes = getCheckBoxesNames.filter(function (i) {
      return i !== "deepstream";
    });
    var livestreams = document.getElementById("livestreams-checkbox");
    var deepstreams = document.getElementById("deepstream-checkbox");

    if(livestreams.checked){
      boxes.forEach(function(box){
        document
          .getElementById(box + "-checkbox")
          .checked = true;
      });
    }else{
      boxes.forEach(function(box){
        document
          .getElementById(box + "-checkbox")
          .checked = false;
      });
    }
    updateCheckBoxes();
    var mode;
    //11
    if(deepstreams.checked && livestreams.checked){
      mode = 'both';
    }
    //10
    else if(deepstreams.checked && !livestreams.checked){
      mode = 'deepstreams';
    }
    //01
    else if(!deepstreams.checked && livestreams.checked){
      mode = 'livestreams';
    }
    //00
    else {
    // hide eveything?
    }
    Session.set('homeStreamListType', mode);
  },
  "change #deepstream-checkbox,#youtube-checkbox,#bambuser-checkbox,#ustream-checkbox,#twitch-checkbox" (e,t ){
   updateCheckBoxes();
  },
"focus .stream-search-form" (e,t){
  updateCheckBoxes();
  if(checkboxes.hasAttribute("hidden")){
    checkboxes.removeAttribute("hidden");
  }
}, "submit .stream-search-form" (e, t) {

    e.preventDefault();
    var query = t.$('#stream-search-input').val();

    Session.set('homeStreamListQuery', query);
    Session.set('homeStreamListMode', 'search');

    if(getHomepageStreamSearchResults().count() === 0){
      //t.streamSearch(query);
    } else {
      SearchResults.remove({type: 'stream'});
      t.noMoreStreamResults.set(null);
    }
    t.streamSearch(query);

    analytics.track('Search on homepage', {
      query: query,
      label: query
    });
  },
  "click .show-best-streams" (e, t) {
    t.$('#stream-search-input').val('');
    Session.set('homeStreamListMode', 'best');
    analytics.track('Click best streams button on homepage');
  },
  "click .show-most-recent-streams" (e, t) {
    t.$('#stream-search-input').val('');
    Session.set('homeStreamListMode', 'most_recent');
    analytics.track('Click most recent button on homepage');
  },
  "click .logo-title" (e, t){
    Session.set('homeStreamListType', 'both');
    Session.set('homeStreamListMode', 'best');
  }
});

Template.deepstreams.helpers({
  streams () {
    if (FlowRouter.subsReady()) {
      var selector = {onAir: true};
      var sort = {}; //{ live: -1 }; this is penalising newly created youtube streams that are not live
      switch (Session.get('homeStreamListMode')) {
        case 'best':
          _.extend(selector, {
            editorsPick: true
          });
          _.extend(sort, {
            editorsPickAt: -1
          });
          break;
        case 'most_recent':
          _.extend(sort, {
            createdAt: -1
          });
          break;
        case 'search':
          var regExp = buildRegExp(Session.get('homeStreamListQuery'));
          _.extend(selector, {
            $or: [
              {title: regExp},
              {description: regExp},
              {username: regExp}
              //{ $text: { $search: searchText, $language: 'en' } }
            ]
          });
          break;
      }
      return Deepstreams.find(selector, {
        sort: sort
      }, {
        reactive: false
      });
    }
  },
  subsReady (){
    return FlowRouter.subsReady();
  }
});

Template.deepstream_preview.onCreated(function(){
  this.subscribe('deepstreamPreviewContext', this.data.deepstream.shortId);
});

Template.deepstream_preview.helpers({
  title () {
    return this.title || '(untitled)';
  },
  linkPath () {
    return Template.instance().data.linkToCurate ? this.curatePath() : this.watchPath();
  },
  contentPreviews (){
    return this.topContextsOfTypes(HOMEPAGE_PREVIEW_CONTEXT_TYPES, 2);
  }
});

Template.deepstream_preview.events({
  'click a' () {
    analytics.track('Click deepstream link on homepage', {
      label: this._id,
      title: this.title
    });
  },
  'click .content' () {
    analytics.track('Click deepstream content preview on homepage');
  }
});

Template.streams.helpers({
  streams () {
    if (FlowRouter.subsReady()) {
      switch (Session.get('homeStreamListMode')) {
        case 'best':
          return Streams.find({}, {
            sort: {
              currentViewers: -1
            },
            limit: 20,
            reactive: false
          }).map(function(stream){
            return _.extend({_id: stream._id}, ContextBlock.searchMappings['all_streaming_services'].mapFn(stream));
          }).map(function(stream){ return new Stream(stream)}); // TODO refactor all this so that streams make a bit more sense
          break;
        case 'most_recent':
          return Streams.find({}, {
            sort: {
              creationDate: -1
            },
            limit: 20,
            reactive: false
          }).map(function(stream){
            return _.extend({_id: stream._id}, ContextBlock.searchMappings['all_streaming_services'].mapFn(stream));
          }).map(function(stream){ return new Stream(stream)});
          break;
        case 'search':
          return getHomepageStreamSearchResults().map(function(stream){ return new Stream(stream)});
      }
    }
  }
});

Template.stream_preview.events({
  'click .close' (e,t){
    Session.set('showPreviewOverlayForStreamId', null);
  },
  'click .show-preview-overlay' (e,t){
    Session.set('showPreviewOverlayForStreamId', this._id);
    analytics.track('Click stream on homepage', {
      label: this.source,
      contentSource: this.source
    });
  }
});

Template.stream_preview.helpers({
  'showPreviewOverlay' (){
    return Session.equals('showPreviewOverlayForStreamId', this._id);
  },
  'showViews' (){
    return (typeof this.totalViews()) !== "undefined"
  }
});

Template.my_streams.helpers({
  streams () {
    if (FlowRouter.subsReady()) {
      return Deepstreams.find({curatorIds: Meteor.user()._id});
    }
  }
});

Template.my_streams.events({
  'click .delete-deepstream': function(){
    if (confirm('Are you sure you want to delete this deepstream? This cannot be undone.')){
      Meteor.call('deleteDeepstream', this.shortId, function(err, result) {
        if(err || !result){
          notifyError('Delete failed.');
        }
      });
    }
  }
});

//VIVIAN IS MESSING AROUND HERE:
var alreadyRan = false;
Template.card_preview.helpers({
  streams () {
    return {
    "_id" : "cTDAwDRzupAcJNEjQ",
    "savedAt" : "2016-04-10T17:10:15.973Z",
    "userPathSegment" : "curat0r",
    "streamPathSegment" : "international-space-station-livecam-3zruKDSm",
    "mainCuratorId" : "iZP79DDdcJtv4BxjT",
    "curatorIds" : [
      "iZP79DDdcJtv4BxjT"
    ],
    "curatorName" : "Dr Stream",
    "curatorUsername" : "curat0r",
    "shortId" : "3zruKDSm",
    "creationStep" : null,
    "description" : "This is a livecam from the International Space Station. Enjoy amazing views of Earth while learning about the ISS.",
    "title" : "International Space Station LiveCam",
    "live" : true,
    "onAir" : true,
    "directorMode" : false,
    "createdAt" : "2016-04-10T17:10:15.226Z",
    "streams" : [
      {
        "reference" : {
          "title" : "Live_ISS_Stream",
          "description" : "Live video from the International Space Station includes internal views when the crew is on-duty and Earth views at other times. The video is accompanied by audio of conversations between the crew and Mission Control. This video is only available when the space station is in contact with the ground. During \"loss of signal\" periods, viewers will see a blue screen. Since the station orbits the Earth once every 90 minutes, it experiences a sunrise or a sunset about every 45 minutes. When the station is in darkness, external camera video may appear black, but can sometimes provide spectacular views of lightning or city lights below.",
          "id" : "9408562",
          "username" : "NASAtelevision",
          "currentViewers" : 421,
          "thumbnailUrl" : "http://static-cdn1.ustream.tv/i/channel/picture/9/4/0/8/9408562/9408562_iss_hr_1330361780,120x90,r:1.jpg",
          "previewUrl" : "http://static-cdn1.ustream.tv/i/channel/picture/9/4/0/8/9408562/9408562_iss_hr_1330361780,320x180,r:1.jpg",
          "totalViews" : 51620152,
          "userId" : "796050",
          "creationDate" : "2011-09-27T19:16:09Z",
          "lastStreamedAt" : "2015-09-16T20:16:28Z"
        },
        "live" : true,
        "source" : "ustream",
        "type" : "stream",
        "authorId" : "iZP79DDdcJtv4BxjT",
        "searchQuery" : "iss",
        "fullDetails" : {
          "_id" : "nvu5kQbwQY2mJQq7W",
          "id" : "9408562",
          "title" : "Live_ISS_Stream",
          "isProtected" : false,
          "urlTitleName" : "live-iss-stream",
          "description" : "Live video from the International Space Station includes internal views when the crew is on-duty and Earth views at other times. The video is accompanied by audio of conversations between the crew and Mission Control. This video is only available when the space station is in contact with the ground. During \"loss of signal\" periods, viewers will see a blue screen. Since the station orbits the Earth once every 90 minutes, it experiences a sunrise or a sunset about every 45 minutes. When the station is in darkness, external camera video may appear black, but can sometimes provide spectacular views of lightning or city lights below.\n",
          "lastStreamedAt" : "2015-09-16T20:16:28Z",
          "totalViews" : 51620152,
          "rating" : "0.000",
          "status" : "live",
          "viewersNow" : "421",
          "url" : "http://www.ustream.tv/channel/live-iss-stream",
          "embedTag" : "<object classid=\"clsid:d27cdb6e-ae6d-11cf-96b8-444553540000\" width=\"320\" height=\"260\" id=\"utv259631\"><param name=\"flashvars\" value=\"autoplay=false&amp;brand=embed&amp;cid=9408562\"/><param name=\"allowfullscreen\" value=\"true\"/><param name=\"allowscriptaccess\" value=\"always\"/><param name=\"movie\" value=\"http://www.ustream.tv/flash/viewer.swf\"/><embed flashvars=\"autoplay=false&amp;brand=embed&amp;cid=9408562\" width=\"320\" height=\"260\" allowfullscreen=\"true\" allowscriptaccess=\"always\" id=\"utv259631\" name=\"utv_n_279502\" src=\"http://www.ustream.tv/flash/viewer.swf\" type=\"application/x-shockwave-flash\" /></object>",
          "imageUrl" : {
            "small" : "http://static-cdn1.ustream.tv/i/channel/picture/9/4/0/8/9408562/9408562_iss_hr_1330361780,120x90,r:1.jpg",
            "medium" : "http://static-cdn1.ustream.tv/i/channel/picture/9/4/0/8/9408562/9408562_iss_hr_1330361780,320x180,r:1.jpg"
          },
          "user" : {
            "id" : "796050",
            "userName" : "NASAtelevision",
            "url" : "http://www.ustream.tv/user/NASAtelevision"
          },
          "_streamSource" : "ustream",
          "username" : "NASAtelevision",
          "creationDate" : "2011-09-27T19:16:09Z",
          "currentViewers" : 421,
          "createdAtInUStreamTime" : "2011-09-27 12:16:09",
          "live" : true,
          "oneIfCurrent" : 1
        },
        "_id" : "2ZyXi9FvkGTMP4eZo",
        "addedAt" : "2015-09-17T15:51:43.018Z"
      },
      {
        "reference" : {
          "title" : "ISS HD Earth Viewing Experiment",
          "description" : "***QUICK NOTES ABOUT HDEV VIDEO***\nBlack Image = International Space Station (ISS) is on the night side of the Earth. \n\nNo Audio = Normal. There is no audio by design. Add your own soundtrack.\n\nFor a display of the real time ISS location plus the HDEV imagery, visit here: http://eol.jsc.nasa.gov/HDEV/\n\nThe High Definition Earth Viewing (HDEV) experiment aboard the ISS was activated April 30, 2014. It is mounted on the External Payload Facility of the European Space Agency’s Columbus module. This experiment includes several commercial HD video cameras aimed at the earth which are enclosed in a pressurized and temperature controlled housing.  Video from these cameras is transmitted back to earth and also streamed live on this channel. While the experiment is operational, views will typically sequence though the different cameras. Between camera switches, a gray and then black color slate will briefly appear. Since the ISS is in darkness during part of each orbit, the images will be dark at those times. During periods of loss of signal with the ground or when HDEV is not operating, a gray color slate or previously recorded video may be seen.  \nAnalysis of this experiment will be conducted to assess the effects of the space environment on the equipment and video quality which may help decisions about cameras for future missions. High school students helped with the design of some of the HDEV components through the High Schools United with NASA to Create Hardware (HUNCH) program. Student teams will also help operate the experiment.  To learn more about the HDEV experiment, visit here:  http://www.nasa.gov/mission_pages/station/research/experiments/917.html",
          "id" : "17074538",
          "username" : "NASAtelevision",
          "currentViewers" : 1048,
          "thumbnailUrl" : "http://static-cdn1.ustream.tv/i/channel/picture/1/7/0/7/17074538/17074538,120x90,r:3.jpg",
          "previewUrl" : "http://static-cdn1.ustream.tv/i/channel/picture/1/7/0/7/17074538/17074538,320x180,r:3.jpg",
          "totalViews" : 53222984,
          "userId" : "796050",
          "creationDate" : "2014-01-27T18:31:39Z",
          "lastStreamedAt" : "2015-09-17T07:17:42Z"
        },
        "live" : false,
        "source" : "ustream",
        "type" : "stream",
        "authorId" : "iZP79DDdcJtv4BxjT",
        "searchQuery" : "iss",
        "fullDetails" : {
          "_id" : "cELb8QTGM4Co2kZKr",
          "id" : "17074538",
          "title" : "ISS HD Earth Viewing Experiment",
          "isProtected" : false,
          "urlTitleName" : "iss-hdev-payload",
          "description" : "***QUICK NOTES ABOUT HDEV VIDEO***\nBlack Image = International Space Station (ISS) is on the night side of the Earth. \n\nNo Audio = Normal. There is no audio by design. Add your own soundtrack.\n\nFor a display of the real time ISS location plus the HDEV imagery, visit here: http://eol.jsc.nasa.gov/HDEV/\n\nThe High Definition Earth Viewing (HDEV) experiment aboard the ISS was activated April 30, 2014. It is mounted on the External Payload Facility of the European Space Agency’s Columbus module. This experiment includes several commercial HD video cameras aimed at the earth which are enclosed in a pressurized and temperature controlled housing.  Video from these cameras is transmitted back to earth and also streamed live on this channel. While the experiment is operational, views will typically sequence though the different cameras. Between camera switches, a gray and then black color slate will briefly appear. Since the ISS is in darkness during part of each orbit, the images will be dark at those times. During periods of loss of signal with the ground or when HDEV is not operating, a gray color slate or previously recorded video may be seen.  \nAnalysis of this experiment will be conducted to assess the effects of the space environment on the equipment and video quality which may help decisions about cameras for future missions. High school students helped with the design of some of the HDEV components through the High Schools United with NASA to Create Hardware (HUNCH) program. Student teams will also help operate the experiment.  To learn more about the HDEV experiment, visit here:  http://www.nasa.gov/mission_pages/station/research/experiments/917.html",
          "lastStreamedAt" : "2015-09-17T07:17:42Z",
          "totalViews" : 53222984,
          "rating" : "0.000",
          "status" : "live",
          "viewersNow" : "1048",
          "url" : "http://www.ustream.tv/channel/iss-hdev-payload",
          "embedTag" : "<object classid=\"clsid:d27cdb6e-ae6d-11cf-96b8-444553540000\" width=\"320\" height=\"260\" id=\"utv488309\"><param name=\"flashvars\" value=\"autoplay=false&amp;brand=embed&amp;cid=17074538\"/><param name=\"allowfullscreen\" value=\"true\"/><param name=\"allowscriptaccess\" value=\"always\"/><param name=\"movie\" value=\"http://www.ustream.tv/flash/viewer.swf\"/><embed flashvars=\"autoplay=false&amp;brand=embed&amp;cid=17074538\" width=\"320\" height=\"260\" allowfullscreen=\"true\" allowscriptaccess=\"always\" id=\"utv488309\" name=\"utv_n_599727\" src=\"http://www.ustream.tv/flash/viewer.swf\" type=\"application/x-shockwave-flash\" /></object>",
          "imageUrl" : {
            "small" : "http://static-cdn1.ustream.tv/i/channel/picture/1/7/0/7/17074538/17074538,120x90,r:3.jpg",
            "medium" : "http://static-cdn1.ustream.tv/i/channel/picture/1/7/0/7/17074538/17074538,320x180,r:3.jpg"
          },
          "user" : {
            "id" : "796050",
            "userName" : "NASAtelevision",
            "url" : "http://www.ustream.tv/user/NASAtelevision"
          },
          "_streamSource" : "ustream",
          "username" : "NASAtelevision",
          "creationDate" : "2014-01-27T18:31:39Z",
          "currentViewers" : 1048,
          "createdAtInUStreamTime" : "2014-01-27 10:31:39",
          "live" : true,
          "oneIfCurrent" : 1
        },
        "_id" : "oNGGos4wgLi45Z8ZW",
        "addedAt" : "2015-09-17T16:49:35.474Z"
      }
    ],
    "activeStreamId" : "oNGGos4wgLi45Z8ZW",
    "onAirSince" : "2015-09-17T15:55:58.874Z",
    "firstOnAirAt" : "2015-09-17T15:55:58.874Z",
    "deleted" : false,
    "contextBlocks" : [
      {
        "type" : "image",
        "source" : "imgur",
        "addedAt" : "2016-04-10T17:10:15.396Z",
        "_id" : "uN7DMxEELSKgkGahZ",
        "rank" : 0
      },
      {
        "type" : "image",
        "source" : "imgur",
        "addedAt" : "2016-04-10T17:10:15.436Z",
        "_id" : "7DLH4R5K69nmwQXbc",
        "rank" : 0
      },
      {
        "type" : "news",
        "source" : "embedly",
        "addedAt" : "2016-04-10T17:10:15.477Z",
        "_id" : "9p8XQRR7Jdq4KjY5o",
        "rank" : 0
      },
      {
        "type" : "news",
        "source" : "embedly",
        "addedAt" : "2016-04-10T17:10:15.530Z",
        "_id" : "4hKPBw9BR4AE7wBFa",
        "rank" : 0
      },
      {
        "type" : "news",
        "source" : "embedly",
        "addedAt" : "2016-04-10T17:10:15.595Z",
        "_id" : "dGeo6ihBGLjm43gKQ",
        "rank" : 0
      },
      {
        "type" : "video",
        "source" : "youtube",
        "addedAt" : "2016-04-10T17:10:15.648Z",
        "_id" : "PeDygKRBtkzJNC7jM",
        "rank" : 0
      },
      {
        "type" : "twitter",
        "source" : "twitter",
        "addedAt" : "2016-04-10T17:10:15.677Z",
        "_id" : "Le5nAW7BaM2Cyri3n",
        "rank" : 0
      },
      {
        "type" : "twitter",
        "source" : "twitter",
        "addedAt" : "2016-04-10T17:10:15.770Z",
        "_id" : "rhiHghRMdX4k29gyn",
        "rank" : 0
      },
      {
        "type" : "twitter",
        "source" : "twitter",
        "addedAt" : "2016-04-10T17:10:15.809Z",
        "_id" : "zN9o6ipybRsKNiJJN",
        "rank" : 0
      },
      {
        "type" : "twitter",
        "source" : "twitter",
        "addedAt" : "2016-04-10T17:10:15.852Z",
        "_id" : "oRyhFe27aRNCMruoN",
        "rank" : 0
      },
      {
        "type" : "text",
        "source" : "plaintext",
        "addedAt" : "2016-04-10T17:10:15.903Z",
        "_id" : "RybasEE6vGgqvFogz",
        "rank" : 0
      },
      {
        "type" : "audio",
        "source" : "soundcloud",
        "addedAt" : "2016-04-10T17:10:15.924Z",
        "_id" : "wi5tbTdKKhLEm2urS",
        "rank" : 0
      },
      {
        "type" : "link",
        "source" : "embedly",
        "addedAt" : "2016-04-10T17:10:15.954Z",
        "_id" : "kN5kNSqDLrTA84A3w",
        "rank" : 0
      }
    ],
    "curatorInviteCodes" : [ ],
    "favorited" : [ ],
    "favoritedTotal" : 0,
    "curatorWebcamStream" : {
      "type" : "stream"
    },
    "analytics" : {
      "views" : {
        "byConnection" : 1,
        "byIP" : 1,
        "byId" : 0,
        "total" : 1
      },
      "shares" : {
        "byConnection" : 0,
        "byIP" : 0,
        "byId" : 0,
        "total" : 0
      }
    }
  };
  },
streamTags () {
  //Meteor.call()//IGNORE FOR NOW. JUST PRETEND WE HAVE TAGS FOR STREAMS
  return [{tag:'hello'},{tag:'world'},{tag:'bottle'},{tag:'neck'}];
},
callToActionType () {
  switch(this.type){
    case "news":
      return 'READ MORE';
      break;
    case "video":
      return 'WATCH NOW';
      break;
    case "image":
      return 'ZOOM';
      break;
  }
},
contextBox () {
  //we need to return a workable set of data
  if (FlowRouter.subsReady()) {
    if(!alreadyRan){
      //var boxes = this.contextBlocks;
      //for (var i = 0; i < 3; i++) {
      //  var box = boxes[i];
        //var boxId = box._id;
        //HERE YOU WOULD FIND THE ACTUAL CONTEXT BLOCK
        //BUT TODAY, WE ARE GONNA FAKE IT SO HARD IT HURTS

        //The ids of context blocks we want: uN7DMxEELSKgkGahZ, 7DLH4R5K69nmwQXbc, 9p8XQRR7Jdq4KjY5o,
        var one = {
          "_id" : "uN7DMxEELSKgkGahZ",
          "reference" : {
            "id" : "xzrl9",
            "username" : "ShiningLoudSlowNinja",
            "userId" : "912509",
            "fileExtension" : "jpg",
            "title" : "Welcome to Earth... The Big Blue Marble",
            "hasMP4" : false,
            "hasWebM" : false,
            "height" : 2700,
            "width" : 2700,
            "description" : "",
            "mapType" : "satellite"
          },
          "type" : "image",
          "authorId" : "iZP79DDdcJtv4BxjT",
          "streamShortId" : "3zruKDSm",
          "searchQuery" : "blue marble",
          "fullDetails" : {
            "id" : "xzrl9",
            "title" : "Welcome to Earth... The Big Blue Marble",
            "description" : null,
            "datetime" : 1355192212,
            "type" : "image/jpeg",
            "animated" : false,
            "width" : 2700,
            "height" : 2700,
            "size" : 756990,
            "views" : 966,
            "bandwidth" : 731252340,
            "vote" : null,
            "favorite" : false,
            "nsfw" : false,
            "section" : "",
            "account_url" : "ShiningLoudSlowNinja",
            "account_id" : 912509,
            "comment_preview" : null,
            "topic" : null,
            "topic_id" : 0,
            "link" : "http://i.imgur.com/xzrl9.jpg",
            "comment_count" : 10,
            "ups" : 10,
            "downs" : 0,
            "points" : 10,
            "score" : 10,
            "is_album" : false
          },
          "source" : "imgur",
          "addedAt" :"2016-04-10T17:10:15.396Z",
          "savedAt" : "2016-04-10T17:10:15.396Z",
          "annotation" : "The Blue Marble is a famous photo of the Earth, taken by the crew of the Apollo 17 spacecraft. It became a symbol of the environmental movement, as a depiction of Earth's frailty, vulnerability, and isolation amid the vast expanse of space."
        };
        var two = {
          "_id": "7DLH4R5K69nmwQXbc",
          "reference": {
            "id": "M0DPO9l",
            "username": "Gattermeier",
            "userId": "8307210",
            "fileExtension": "jpg",
            "title": "ISS",
            "hasMP4": false,
            "hasWebM": false,
            "height": 360,
            "width": 640,
            "description": "",
            "mapType": "satellite"
          },
          "type": "image",
          "authorId": "iZP79DDdcJtv4BxjT",
          "streamShortId": "3zruKDSm",
          "searchQuery": "iss",
          "fullDetails": {
            "id": "M0DPO9l",
            "title": "ISS",
            "description": null,
            "datetime": 1391830176,
            "type": "image/jpeg",
            "animated": false,
            "width": 640,
            "height": 360,
            "size": 121956,
            "views": 400,
            "bandwidth": 48782400,
            "vote": null,
            "favorite": false,
            "nsfw": false,
            "section": "",
            "account_url": "Gattermeier",
            "account_id": 8307210,
            "comment_preview": null,
            "topic": null,
            "topic_id": 0,
            "link": "http://i.imgur.com/M0DPO9l.jpg",
            "comment_count": 1,
            "ups": 13,
            "downs": 1,
            "points": 12,
            "score": 12,
            "is_album": false
          },
          "source": "imgur",
          "addedAt": "2016-04-10T17:10:15.436Z",
          "savedAt": "2016-04-10T17:10:15.436Z",
          "annotation": "An image of the International Space Station"
        };
        var three = {
            "_id" : "9p8XQRR7Jdq4KjY5o",
            "fullDetails" : {
              "provider_url" : "http://time.com",
              "description" : "One of the trickiest questions for a Soyuz spacecraft approaching the International Space Station (ISS) is where to park. The ISS may be larger than a football field, but it's got only so many ways to get inside, and with crewed spacecraft and uncrewed cargo ships regularly shuttling up and down, docking ports-or at least the right docking port-can be at a premium.",
              "embeds" : [ ],
              "safe" : true,
              "provider_display" : "time.com",
              "related" : [ ],
              "favicon_url" : "https://s0.wp.com/wp-content/themes/vip/time2014/img/time-favicon.ico",
              "authors" : [
                {
                  "url" : "http://time.com/author/jeffrey-kluger/",
                  "name" : "Jeffrey Kluger"
                }
              ],
              "images" : [
                {
                  "caption" : null,
                  "url" : "https://timedotcom.files.wordpress.com/2015/08/soyuz.jpg?quality=65&strip=color&w=550",
                  "height" : 366,
                  "width" : 550,
                  "colors" : [
                    {
                      "color" : [
                        153,
                        171,
                        186
                      ],
                      "weight" : 0.7893066406
                    },
                    {
                      "color" : [
                        17,
                        19,
                        22
                      ],
                      "weight" : 0.12109375
                    },
                    {
                      "color" : [
                        68,
                        79,
                        91
                      ],
                      "weight" : 0.0895996094
                    }
                  ],
                  "entropy" : 5.2125775536,
                  "size" : 44224
                },
                {
                  "caption" : null,
                  "url" : "https://i2.wp.com/timedotcom.files.wordpress.com/2015/08/soyuz.jpg?fit=440%2C330&quality=65&strip=color",
                  "height" : 292,
                  "width" : 440,
                  "colors" : [
                    {
                      "color" : [
                        152,
                        172,
                        187
                      ],
                      "weight" : 0.7963867188
                    },
                    {
                      "color" : [
                        17,
                        19,
                        22
                      ],
                      "weight" : 0.11962890620000001
                    },
                    {
                      "color" : [
                        67,
                        79,
                        90
                      ],
                      "weight" : 0.083984375
                    }
                  ],
                  "entropy" : 5.05482685188,
                  "size" : 35329
                },
                {
                  "caption" : null,
                  "url" : "https://timedotcom.files.wordpress.com/2015/09/greys-anatomy.jpg?quality=65&strip=color&w=405&h=229&crop=1",
                  "height" : 229,
                  "width" : 405,
                  "colors" : [
                    {
                      "color" : [
                        203,
                        203,
                        213
                      ],
                      "weight" : 0.3718261719
                    },
                    {
                      "color" : [
                        162,
                        146,
                        141
                      ],
                      "weight" : 0.2666015625
                    },
                    {
                      "color" : [
                        85,
                        60,
                        28
                      ],
                      "weight" : 0.1701660156
                    },
                    {
                      "color" : [
                        142,
                        87,
                        66
                      ],
                      "weight" : 0.0546875
                    },
                    {
                      "color" : [
                        6,
                        6,
                        6
                      ],
                      "weight" : 0.052001953100000005
                    }
                  ],
                  "entropy" : 6.5990033443,
                  "size" : 17376
                },
                {
                  "caption" : null,
                  "url" : "https://timedotcom.files.wordpress.com/2015/09/gettyimages-476306724.jpg?quality=65&strip=color&w=405&h=229&crop=1",
                  "height" : 229,
                  "width" : 405,
                  "colors" : [
                    {
                      "color" : [
                        190,
                        179,
                        202
                      ],
                      "weight" : 0.8803710938
                    },
                    {
                      "color" : [
                        35,
                        23,
                        17
                      ],
                      "weight" : 0.0705566406
                    },
                    {
                      "color" : [
                        77,
                        52,
                        39
                      ],
                      "weight" : 0.0295410156
                    },
                    {
                      "color" : [
                        118,
                        86,
                        73
                      ],
                      "weight" : 0.01953125
                    }
                  ],
                  "entropy" : 5.0591444021,
                  "size" : 24547
                }
              ],
              "cache_age" : 86400,
              "language" : "English",
              "app_links" : [ ],
              "original_url" : "http://time.com/4008222/soyuz-space-station/",
              "url" : "http://time.com/4008222/soyuz-space-station/",
              "media" : {

              },
              "title" : "How Astronauts Dock at the Space Station",
              "offset" : null,
              "lead" : null,
              "content" : "<div>\n<figure><img src=\"https://timedotcom.files.wordpress.com/2015/08/soyuz.jpg?quality=65&amp;strip=color&amp;w=550\"></figure><p>One of the trickiest questions for a Soyuz spacecraft approaching the International Space Station (ISS) is where to park. The ISS may be larger than a football field, but it's got only so many ways to get inside, and with crewed spacecraft and uncrewed cargo ships regularly shuttling up and down, docking ports-or at least the right docking port-can be at a premium.</p>\n<p>In the pre-dawn hours of Sept. 28, space station astronaut Scott Kelly, along with cosmonauts Mikhail Kornienko and Gennady Padalka, will be required to do a bit of delicate flying to sort just that kind of problem out.</p>\n<p>The three crewmen arrived at the station on March 29, with Padalka slated to spend six months aloft, and Kelly and Kornienko scheduled for a marathon <a href=\"http://time.com/space-nasa-scott-kelly-mission/\">one year in space</a>. They docked their Soyuz spacecraft at the station's Poisk module-a 16-ft. (4.8 m) Russian node that was added to the ISS in 2009 as a science lab, observation point and egress compartment for astronauts embarking on spacewalks. It's remained there ever since, and that's a concern.</p>\n<p>The five-plus months the ship has been hanging off the station in the alternating searing heat and deep freeze of orbital space can take its toll on the hardware, and since the crews rely on the ships as their way back to Earth, NASA and the Russian space agency, Roscosmos, instituted a rule: 180 days is the maximum amount of time a Soyuz can remain aloft before detaching and returning to Earth. But Kelly and Kornienko are set to stay for 365 days-which complicates their ride home.</p>\n<p><strong>MORE:</strong> <a href=\"http://time.com/space\">TIME is producing a series of documentary films about the record-breaking mission to space. Watch them here</a>.</p>\n<p>Their Soyuz is not the only one that's on hand. There's another one for the other three crewmembers who are currently aboard. (Another NASA-Roscosmos rule: there must always be enough seats for everyone to be able to bail out immediately in the event of an emergency.) And on September 2, a third ship, carrying three more crew members, is set to arrive for a changeover of personnel. Not all docking nodes are equal-the Poisk is a better target since it faces Earth-and that requires a little juggling. Mission rules-to say nothing of basic physics-make the job a delicate one.</p>\n<p>At 3:09 AM EDT, the complete Padalka-Kornienko-Kelly team will climb fully suited into their Soyuz. Technically, it does not take all three men to do the job. Padalka, who is one of the most experienced Soyuz pilots extant, has joked that he could fly the thing with two cabbages in the other seats. But in the event of Soyuz emergency requiring an immediate reentry, all three men must be aboard-lest a solitary pilot come home, leaving five people aboard the ISS and only three seats on the remaining Soyuz.</p>\n<p>The crew will then undock from the Poisk and re-dock to the nearby Zvezda module, or service module-a straight distance of only a few dozen yards. But these kinds of orbital maneuvers require care, with both the station and the Soyuz orbiting the Earth at 17,133 mph (27,572 k/h) but moving just a few feet or inches at a time relative to each other.</p>\n<p>\"They'll undock, then back out 200 meters or so,\" says NASA TV commentator and overall space station authority Rob Navias. \"Then they'll fly around to the back end of the service module, do a lateral translation, fly retrograde, then move in for a docking at the aft end of the module.\" If that sounds like an awfully complicated way to say, essentially, that they'll back up, turn around and pull in at another door, it's less techno-babble than it is a reflection of the complexity of even the most straightforward maneuvers in space.</p>\n<p>Two of the newly arriving crew members will be only short-timers, staying on the station for just 10 days. They'll then fly home with Padalka in the older ship, leaving the fresh one for Kelly, Kornienko and another crew member six months later.</p>\n<p>The ISS may be the most complicated job site on-or off-the planet, but it's one that could proudly display a sign reading \"14 years without an accident.\" Playing by all the workplace safety rules will help keep that record going.</p>\n</div>",
              "entities" : [
                {
                  "count" : 3,
                  "name" : "Padalka"
                },
                {
                  "count" : 3,
                  "name" : "Kelly"
                },
                {
                  "count" : 3,
                  "name" : "Earth"
                },
                {
                  "count" : 2,
                  "name" : "Poisk"
                },
                {
                  "count" : 2,
                  "name" : "ISS"
                },
                {
                  "count" : 2,
                  "name" : "Kornienko"
                },
                {
                  "count" : 2,
                  "name" : "NASA"
                },
                {
                  "count" : 2,
                  "name" : "Russian"
                },
                {
                  "count" : 1,
                  "name" : "Scott Kelly"
                },
                {
                  "count" : 1,
                  "name" : "Roscosmos"
                },
                {
                  "count" : 1,
                  "name" : "Gennady Padalka"
                },
                {
                  "count" : 1,
                  "name" : "Mikhail Kornienko"
                },
                {
                  "count" : 1,
                  "name" : "AM EDT"
                },
                {
                  "count" : 1,
                  "name" : "Rob Navias"
                }
              ],
              "favicon_colors" : [
                {
                  "color" : [
                    239,
                    6,
                    15
                  ],
                  "weight" : 0.00024414060000000002
                },
                {
                  "color" : [
                    252,
                    252,
                    252
                  ],
                  "weight" : 0.00024414060000000002
                }
              ],
              "keywords" : [
                {
                  "score" : 74,
                  "name" : "soyuz"
                },
                {
                  "score" : 40,
                  "name" : "kornienko"
                },
                {
                  "score" : 38,
                  "name" : "iss"
                },
                {
                  "score" : 34,
                  "name" : "padalka"
                },
                {
                  "score" : 34,
                  "name" : "station"
                },
                {
                  "score" : 32,
                  "name" : "docking"
                },
                {
                  "score" : 31,
                  "name" : "space"
                },
                {
                  "score" : 30,
                  "name" : "poisk"
                },
                {
                  "score" : 27,
                  "name" : "crew"
                },
                {
                  "score" : 23,
                  "name" : "ship"
                }
              ],
              "published" : 1440695840000,
              "provider_name" : "TIME",
              "type" : "html"
            },
            "authorId" : "iZP79DDdcJtv4BxjT",
            "streamShortId" : "3zruKDSm",
            "searchQuery" : "http://time.com/4008222/soyuz-space-station/",
            "fromEmbedly" : true,
            "version" : "em1",
            "reference" : {
              "primaryAuthor" : "Jeffrey Kluger",
              "primaryAuthorUrl" : "http://time.com/author/jeffrey-kluger/",
              "title" : "How Astronauts Dock at the Space Station",
              "description" : "One of the trickiest questions for a Soyuz spacecraft approaching the International Space Station (ISS) is where to park. The ISS may be larger than a football field, but it's got only so many ways to get inside, and with crewed spacecraft and uncrewed cargo ships regularly shuttling up and down, docking ports-or at least the right docking port-can be at a premium.",
              "content" : "<p>One of the trickiest questions for a Soyuz spacecraft approaching the International Space Station (ISS) is where to park. The ISS may be larger than a football field, but it's got only so many ways to get inside, and with crewed spacecraft and uncrewed cargo ships regularly shuttling up and down, docking ports-or at least the right docking port-can be at a premium.</p><p>In the pre-dawn hours of Sept. 28, space station astronaut Scott Kelly, along with cosmonauts Mikhail Kornienko and Gennady Padalka, will be required to do a bit of delicate flying to sort just that kind of problem out.</p><p>The three crewmen arrived at the station on March 29, with Padalka slated to spend six months aloft, and Kelly and Kornienko scheduled for a marathon one year in space. They docked their Soyuz spacecraft at the station's Poisk module-a 16-ft. (4.8 m) Russian node that was added to the ISS in 2009 as a science lab, observation point and egress compartment for astronauts embarking on spacewalks. It's remained there ever since, and that's a concern.</p><p>The five-plus months the ship has been hanging off the station in the alternating searing heat and deep freeze of orbital space can take its toll on the hardware, and since the crews rely on the ships as their way back to Earth, NASA and the Russian space agency, Roscosmos, instituted a rule: 180 days is the maximum amount of time a Soyuz can remain aloft before detaching and returning to Earth. But Kelly and Kornienko are set to stay for 365 days-which complicates their ride home.</p><p>MORE: TIME is producing a series of documentary films about the record-breaking mission to space. Watch them here.</p><p>Their Soyuz is not the only one that's on hand. There's another one for the other three crewmembers who are currently aboard. (Another NASA-Roscosmos rule: there must always be enough seats for everyone to be able to bail out immediately in the event of an emergency.) And on September 2, a third ship, carrying three more crew members, is set to arrive for a changeover of personnel. Not all docking nodes are equal-the Poisk is a better target since it faces Earth-and that requires a little juggling. Mission rules-to say nothing of basic physics-make the job a delicate one.</p><p>At 3:09 AM EDT, the complete Padalka-Kornienko-Kelly team will climb fully suited into their Soyuz. Technically, it does not take all three men to do the job. Padalka, who is one of the most experienced Soyuz pilots extant, has joked that he could fly the thing with two cabbages in the other seats. But in the event of Soyuz emergency requiring an immediate reentry, all three men must be aboard-lest a solitary pilot come home, leaving five people aboard the ISS and only three seats on the remaining Soyuz.</p><p>The crew will then undock from the Poisk and re-dock to the nearby Zvezda module, or service module-a straight distance of only a few dozen yards. But these kinds of orbital maneuvers require care, with both the station and the Soyuz orbiting the Earth at 17,133 mph (27,572 k/h) but moving just a few feet or inches at a time relative to each other.</p><p>\"They'll undock, then back out 200 meters or so,\" says NASA TV commentator and overall space station authority Rob Navias. \"Then they'll fly around to the back end of the service module, do a lateral translation, fly retrograde, then move in for a docking at the aft end of the module.\" If that sounds like an awfully complicated way to say, essentially, that they'll back up, turn around and pull in at another door, it's less techno-babble than it is a reflection of the complexity of even the most straightforward maneuvers in space.</p><p>Two of the newly arriving crew members will be only short-timers, staying on the station for just 10 days. They'll then fly home with Padalka in the older ship, leaving the fresh one for Kelly, Kornienko and another crew member six months later.</p><p>The ISS may be the most complicated job site on-or off-the planet, but it's one that could proudly display a sign reading \"14 years without an accident.\" Playing by all the workplace safety rules will help keep that record going.</p>",
              "topImage" : {
                "url" : "https://timedotcom.files.wordpress.com/2015/08/soyuz.jpg?quality=65&strip=color&w=550",
                "height" : 366,
                "width" : 550
              },
              "providerName" : "TIME",
              "providerIconUrl" : "https://s0.wp.com/wp-content/themes/vip/time2014/img/time-favicon.ico",
              "originalUrl" : "http://time.com/4008222/soyuz-space-station/",
              "url" : "http://time.com/4008222/soyuz-space-station/",
              "publishedMs" : 1440695840000,
              "publishedOffset" : null,
              "mapType" : "satellite"
            },
            "source" : "embedly",
            "type" : "news",
            "addedAt" :"2016-04-10T17:10:15.477Z",
            "savedAt" : "2016-04-10T17:10:15.477Z",
            "annotation" : "A detailed look at the process of docking at the ISS."
          };
        var four = {
            "_id" : "dGeo6ihBGLjm43gKQ",
            "fullDetails" : {
              "provider_url" : "http://www.theguardian.com",
              "description" : "A pair of Russian cosmonauts embark on a six-hour space walk, floating more than 200 miles above the earth's surface, to install new equipment and carry out maintenance tasks including window cleaning.",
              "embeds" : [ ],
              "safe" : true,
              "provider_display" : "www.theguardian.com",
              "related" : [ ],
              "favicon_url" : "https://assets.guim.co.uk/images/favicons/79d7ab5a729562cebca9c6a13c324f0e/32x32.ico",
              "authors" : [
                {
                  "url" : null,
                  "name" : "Source: Reuters"
                }
              ],
              "images" : [
                {
                  "caption" : null,
                  "url" : "https://i.guim.co.uk/img/static/sys-images/Guardian/Pix/audio/video/2015/8/10/1439227917698/KP_384794_crop_1200x720.jpg?w=1200&q=85&auto=format&sharp=10&s=da289a80261932ff2d861a598844eeda",
                  "height" : 720,
                  "width" : 1200,
                  "colors" : [
                    {
                      "color" : [
                        210,
                        228,
                        248
                      ],
                      "weight" : 0.3547363281
                    },
                    {
                      "color" : [
                        102,
                        163,
                        247
                      ],
                      "weight" : 0.2026367188
                    },
                    {
                      "color" : [
                        42,
                        38,
                        48
                      ],
                      "weight" : 0.2019042969
                    },
                    {
                      "color" : [
                        132,
                        141,
                        160
                      ],
                      "weight" : 0.0861816406
                    },
                    {
                      "color" : [
                        82,
                        76,
                        82
                      ],
                      "weight" : 0.080078125
                    }
                  ],
                  "entropy" : 6.40449329645,
                  "size" : 156954
                },
                {
                  "caption" : null,
                  "url" : "https://i.guim.co.uk/img/static/sys-images/Guardian/Pix/audio/video/2015/8/10/1439227919747/KP_384794_crop_640x360.jpg?w=640&h=360&q=85&auto=format&sharp=10&s=72bce0a310c1f6bfe45621dd89875f22",
                  "height" : 360,
                  "width" : 640,
                  "colors" : [
                    {
                      "color" : [
                        213,
                        230,
                        249
                      ],
                      "weight" : 0.33203125
                    },
                    {
                      "color" : [
                        42,
                        38,
                        48
                      ],
                      "weight" : 0.2314453125
                    },
                    {
                      "color" : [
                        102,
                        163,
                        247
                      ],
                      "weight" : 0.185546875
                    },
                    {
                      "color" : [
                        92,
                        90,
                        101
                      ],
                      "weight" : 0.1647949219
                    },
                    {
                      "color" : [
                        131,
                        139,
                        156
                      ],
                      "weight" : 0.0861816406
                    }
                  ],
                  "entropy" : 6.4232088333,
                  "size" : 62000
                }
              ],
              "cache_age" : 86400,
              "language" : "English",
              "app_links" : [
                {
                  "url" : "gnmguardian://science/video/2015/aug/10/cosmonauts-step-outside-international-space-station-clean-windows-video?contenttype=article&source=applinks",
                  "type" : "ios",
                  "app_store_id" : "409128287",
                  "app_name" : "The Guardian"
                }
              ],
              "original_url" : "http://www.theguardian.com/science/video/2015/aug/10/cosmonauts-step-outside-international-space-station-clean-windows-video",
              "url" : "http://www.theguardian.com/science/video/2015/aug/10/cosmonauts-step-outside-international-space-station-clean-windows-video",
              "media" : {

              },
              "title" : "Cosmonauts step outside International Space Station to clean the windows - video",
              "offset" : -14400000,
              "lead" : null,
              "content" : "<div>\n<p>A pair of Russian cosmonauts embark on a six-hour space walk, floating more than 200 miles above the earth's surface, to install new equipment and carry out maintenance tasks including window cleaning. Station commander Gennady Padalka and flight engineer Mikhail Kornienko left the station's Pirs module at 1420 GMT, installing equipment to help crew members manoeuvre outside the ISS, before cleaning a porthole window to remove years of dirt left by exhaust fumes from visiting ships. The expedition is the 188th ISS spacewalk and the tenth for Padalka, who has spent more time in space than any other human</p>\n</div>",
              "entities" : [
                {
                  "count" : 1,
                  "name" : "ISS"
                },
                {
                  "count" : 1,
                  "name" : "Mikhail Kornienko"
                },
                {
                  "count" : 1,
                  "name" : "Gennady Padalka"
                },
                {
                  "count" : 1,
                  "name" : "Padalka"
                }
              ],
              "favicon_colors" : [
                {
                  "color" : [
                    241,
                    246,
                    249
                  ],
                  "weight" : 0.1069335938
                },
                {
                  "color" : [
                    0,
                    88,
                    140
                  ],
                  "weight" : 0.0834960938
                },
                {
                  "color" : [
                    0,
                    0,
                    0
                  ],
                  "weight" : 0.038574218800000004
                },
                {
                  "color" : [
                    82,
                    147,
                    181
                  ],
                  "weight" : 0.0209960938
                }
              ],
              "keywords" : [
                {
                  "score" : 17,
                  "name" : "padalka"
                },
                {
                  "score" : 15,
                  "name" : "iss"
                },
                {
                  "score" : 10,
                  "name" : "1420"
                },
                {
                  "score" : 10,
                  "name" : "installing"
                },
                {
                  "score" : 10,
                  "name" : "kornienko"
                },
                {
                  "score" : 10,
                  "name" : "porthole"
                },
                {
                  "score" : 10,
                  "name" : "six-hour"
                },
                {
                  "score" : 10,
                  "name" : "pirs"
                },
                {
                  "score" : 9,
                  "name" : "equipment"
                },
                {
                  "score" : 9,
                  "name" : "window"
                }
              ],
              "published" : 1439213640000,
              "provider_name" : "the Guardian",
              "type" : "html"
            },
            "authorId" : "iZP79DDdcJtv4BxjT",
            "streamShortId" : "3zruKDSm",
            "searchQuery" : "http://www.theguardian.com/science/video/2015/aug/10/cosmonauts-step-outside-international-space-station-clean-windows-video",
            "fromEmbedly" : true,
            "version" : "em1",
            "reference" : {
              "primaryAuthor" : "Source: Reuters",
              "title" : "Cosmonauts step outside International Space Station to clean the windows - video",
              "description" : "A pair of Russian cosmonauts embark on a six-hour space walk, floating more than 200 miles above the earth's surface, to install new equipment and carry out maintenance tasks including window cleaning.",
              "content" : "<p>A pair of Russian cosmonauts embark on a six-hour space walk, floating more than 200 miles above the earth's surface, to install new equipment and carry out maintenance tasks including window cleaning. Station commander Gennady Padalka and flight engineer Mikhail Kornienko left the station's Pirs module at 1420 GMT, installing equipment to help crew members manoeuvre outside the ISS, before cleaning a porthole window to remove years of dirt left by exhaust fumes from visiting ships. The expedition is the 188th ISS spacewalk and the tenth for Padalka, who has spent more time in space than any other human</p>",
              "topImage" : {
                "url" : "https://i.guim.co.uk/img/static/sys-images/Guardian/Pix/audio/video/2015/8/10/1439227917698/KP_384794_crop_1200x720.jpg?w=1200&q=85&auto=format&sharp=10&s=da289a80261932ff2d861a598844eeda",
                "height" : 720,
                "width" : 1200
              },
              "providerName" : "the Guardian",
              "providerIconUrl" : "https://assets.guim.co.uk/images/favicons/79d7ab5a729562cebca9c6a13c324f0e/32x32.ico",
              "originalUrl" : "http://www.theguardian.com/science/video/2015/aug/10/cosmonauts-step-outside-international-space-station-clean-windows-video",
              "url" : "http://www.theguardian.com/science/video/2015/aug/10/cosmonauts-step-outside-international-space-station-clean-windows-video",
              "publishedMs" : 1439213640000,
              "publishedOffset" : -14400000,
              "mapType" : "satellite"
            },
            "source" : "embedly",
            "type" : "news",
            "addedAt" : "2016-04-10T17:10:15.595Z",
            "savedAt" : "2016-04-10T17:10:15.595Z"
          };
        return four;//[one, two, three];
      //}
    }

    alreadyRan = true;
  }
}
});
Template.cards_with_deepstreams.onCreated(function(){
  //this.subscribe('deepstreamPreviewContext', this.data.deepstream.shortId);
});
Template.card_preview.onCreated(function(){
  //this.subscribe('deepstreamPreviewContext', this.data.deepstream.shortId);
});
Template.deepstream_behind_card.onCreated(function(){

});
