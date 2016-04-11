
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
  }
});
Template.cards_with_deepstreams.onCreated(function(){
  //this.subscribe('deepstreamPreviewContext', this.data.deepstream.shortId);
});
//Template.card_preview.helpers({
//  contextBox () {
//  console.log('card preview helper..this: ',this);
//  return this.contextBlocks[0];
//}
//});
Template.card_preview.onCreated(function(){
  //this.subscribe('deepstreamPreviewContext', this.data.deepstream.shortId);
});
Template.deepstream_behind_card.onCreated(function(){

});
