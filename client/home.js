
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
      if(window.mainPlayer){
        window.resetMainPlayer();
      }
      notifyLogin();
    }
  });
};

loginWithEmail = function () {
  FlowRouter.go('login')
};
Template.login_buttons2016.helpers({
  showUserInfo () {
    return Template.instance().showUserInfo.get();
  },
  loggingOut () {
    return Template.instance().loggingOut.get();
  }
});

Template.login_buttons2016.onCreated(function () {
  this.showUserInfo = new ReactiveVar(false);
  this.loggingOut = new ReactiveVar(false);
});

Template.login_buttons2016.events({
  "mouseenter .user-action" (d) {
    Template.instance().showUserInfo.set(true);
  },
  "mouseleave .user-action" (d) {
    Template.instance().showUserInfo.set(false);
  },
  "click .signin" (d) {
    Session.set('signingIn', true);
    analytics.track('Click login & signup button on top navigation', trackingInfoFromPage());
  },
  "click .logout" (e, t) {
    e.preventDefault();
    t.showUserInfo.set(false);
    t.loggingOut.set(true);
    Meteor.logout(() => {
      if(window.mainPlayer){
        window.resetMainPlayer();
      }
      t.loggingOut.set(false)
    });
  }
});

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
    analytics.track('Click login & signup button on top navigation', trackingInfoFromPage());
  },
  "click .logout" (e, t) {
    e.preventDefault();
    t.showUserInfo.set(false);
    t.loggingOut.set(true);
    Meteor.logout(() => {
      if(window.mainPlayer){
        window.resetMainPlayer();
      }
      t.loggingOut.set(false)
    });
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
  "click .twitter-signin" (e, t) {
    closeSignInOverlay();
    t.showLoginForm.set(false);
    loginWithTwitter();
    analytics.track('Click login with Twitter');
  },
  "click .twitter-signup" (e, t) {
    closeSignInOverlay();
    t.showLoginForm.set(false);
    loginWithTwitter();
    analytics.track('Click signup with Twitter');
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
  "change #livestreams-checkbox" (e, t){
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
    } else {
      boxes.forEach(function(box){
        document
          .getElementById(box + "-checkbox")
          .checked = false;
      });
    }
    updateCheckBoxes();
  },
  "change #deepstream-checkbox,#livestreams-checkbox,#youtube-checkbox,#bambuser-checkbox,#ustream-checkbox,#twitch-checkbox" (e, t){
    var deepstreams = document.getElementById("deepstream-checkbox");
    var livestreams = document.getElementById("livestreams-checkbox");
    updateCheckBoxes();
    var yt = document.getElementById("youtube-checkbox");
    var tw = document.getElementById("twitch-checkbox");
    var bu = document.getElementById("bambuser-checkbox");
    var us = document.getElementById("ustream-checkbox");    
    if(yt.checked || tw.checked || bu.checked || us.checked){
      livestreams.checked = true;
    }
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
    var livestreams = document.getElementById("livestreams-checkbox");
    var yt = document.getElementById("youtube-checkbox");
    var tw = document.getElementById("twitch-checkbox");
    var bu = document.getElementById("bambuser-checkbox");
    var us = document.getElementById("ustream-checkbox");    
    if(yt.checked || tw.checked || bu.checked || us.checked){
      livestreams.checked = true;
    }

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
  },
  "mouseenter #videoOverlay" (e, t){
    $('.activate-featured-hover p').fadeIn();
  },
  "mouseleave #videoOverlay" (e, t){
    $('.activate-featured-hover p').fadeOut();
  }
});

Template.deepstreams.helpers({
  deepstreamsToDisplay (type) {
    if (FlowRouter.subsReady()) {
      var selector = {onAir: true};
      var sort = {}; //{ live: -1 }; this is penalising newly created youtube streams that are not live
      switch (type) {
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
            savedAt: -1
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
        sort: sort,
        limit: 6,
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
  contentPreviews (){
    return this.topContextsOfTypes(HOMEPAGE_PREVIEW_CONTEXT_TYPES, 2);
  },
  description () {
    return this.description || 'Description not currently provided';
  },
  title () {
    return this.title || '(untitled)';
  },
  linkPath () {
    return Template.instance().data.linkToCurate ? this.curatePath() : this.watchPath();
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
      switch (type) {
        case 'best':
          return Streams.find({}, {
            sort: {
              currentViewers: -1
            },
            limit: 10,
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
            limit: 10,
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
  streams (published) {
    if (FlowRouter.subsReady()) {
      if(published) {
        var deepstreams = Deepstreams.find({curatorIds: Meteor.user()._id, onAir: true}).fetch();
      } else {
        var deepstreams = Deepstreams.find({curatorIds: Meteor.user()._id, onAir: false}).fetch();
      }
      
      deepstreams.forEach(function(val, index, arr){ arr[index] = _.extend(arr[index], {showDeleteButton: true})});
      return deepstreams;
    }
  }
});

Template.my_streams.events({
  'click .delete-deepstream': function(event){
    event.preventDefault();
    if (confirm('Are you sure you want to delete this deepstream? This cannot be undone.')){
      Meteor.call('deleteDeepstream', this.shortId, function(err, result) {
        if(err || !result){
          notifyError('Delete failed.');
        }
      });
    }
  }
});


Template.chart_home_banner.onRendered(function(){
  /* New Chart */
  var width = 1200;
  var height = 350;
  var randomLength = function(len){
    return Math.floor(Math.random() * len) + 1;
  }
  var data = {
   nodes: [{
     name: "A",
     x: randomLength(width),
     y: randomLength(height)
   }, {
     name: "B",
     x: randomLength(width),
     y: randomLength(height)
   }, {
     name: "C",
     x: randomLength(width),
     y: randomLength(height)
   }, {
     name: "D",
     x: randomLength(width),
     y: randomLength(height)
   },
   {
     name: "A",
     x: randomLength(width),
     y: randomLength(height)
   }, {
     name: "B",
     x: randomLength(width),
     y: randomLength(height)
   }, {
     name: "C",
     x: randomLength(width),
     y: randomLength(height)
   }, {
     name: "D",
     x: randomLength(width),
     y: randomLength(height)
   },
  {
     name: "A",
     x: randomLength(width),
     y: randomLength(height)
   }, {
     name: "B",
     x: randomLength(width),
     y: randomLength(height)
   }, {
     name: "C",
     x: randomLength(width),
     y: randomLength(height)
   }, {
     name: "D",
     x: randomLength(width),
     y: randomLength(height)
   }],
   links: [{
     source: 0,
     target: 1
   }, {
     source: 1,
     target: 2
   }, {
     source: 2,
     target: 3
   }, ]
 };

 var c10 = d3.scale.category10();
 var svg = d3.select("#banner")
   .append("svg")
   .attr("width", 1200)
   .attr("height", 350);

 var drag = d3.behavior.drag()
   .on("drag", function(d, i) {
     d.x += d3.event.dx
     d.y += d3.event.dy
     d3.select(this).attr("cx", d.x).attr("cy", d.y);
     links.each(function(l, li) {
       if (l.source == i) {
         d3.select(this).attr("x1", d.x).attr("y1", d.y);
       } else if (l.target == i) {
         d3.select(this).attr("x2", d.x).attr("y2", d.y);
       }
     });
   });

 var links = svg.selectAll("link")
   .data(data.links)
   .enter()
   .append("line")
   .attr("class", "link")
   .attr("x1", function(l) {
     var sourceNode = data.nodes.filter(function(d, i) {
       return i == l.source
     })[0];
     d3.select(this).attr("y1", sourceNode.y);
     return sourceNode.x
   })
   .attr("x2", function(l) {
     var targetNode = data.nodes.filter(function(d, i) {
       return i == l.target
     })[0];
     d3.select(this).attr("y2", targetNode.y);
     return targetNode.x
   })
   .attr("fill", "none")
   .attr("stroke", "white");

 var nodes = svg.selectAll("node")
   .data(data.nodes)
   .enter()
   .append("circle")
   .attr("class", "node")
   .attr("cx", function(d) {
     return d.x
   })
   .attr("cy", function(d) {
     return d.y
   })
   .attr("r", 15)
   .attr("fill", function(d, i) {
     return c10(i);
   })
   .call(drag);
  
  /* new chart end */
  /*
  //Width and height
  var w = 200;
  var h = 200;
  var outerRadius = w / 2;
  var innerRadius = 0;
  var arc = d3.svg.arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);
  var pie = d3.layout.pie()
    .sort(null)
    .value(function(d)
    {
      return d.value;
    });
  //Easy colors accessible via a 10-step ordinal scale
  var color = d3.scale.category10();
  
  //access to contextId
  var contextId = this.data._id;
  
  //Create SVG element add the context block id to it -----------------------------------------
  var svg = d3.select("#pieChart-" + this.data._id)
    .attr("width", w)
    .attr("height", h);
  var key = function(d)
  {
    return d.data.name; //._id;
  };
  Tracker.autorun(function(){
    if(contextId){
      var modifier = {
        fields:
        {
          value: 1
        }
      };
      var query = {};
      query._id = contextId;
      var dataset = ContextBlocks.find(query, {data: 1}).fetch()[0];
      if(dataset){
        dataset = dataset.data; 
        var totalVotes = 0;
        dataset.forEach(function(value, index, array){
          totalVotes += value.value; 
        });
        var arcs = svg.selectAll("g.arc")
          .data(pie(dataset), key);
        var newGroups = arcs.enter()
          .append("g")
          .attr("class", "arc")
          .attr("transform", "translate(" + outerRadius + "," + outerRadius +
            ")");
        //Draw arc paths
        newGroups.append("path")
          .attr("fill", function(d, i)
          {
            return color(i);
          })
          .attr("d", arc);
        //Labels
        newGroups.append("text")
          .attr("transform", function(d)
          {
            return "translate(" + arc.centroid(d) + ")";
          })
          .attr("text-anchor", "middle")
          .text(function(d)
          {
            if(totalVotes < 1){
              //don't annotate small values
              return '0%';
            }
            var percentage = Math.round((d.value/totalVotes)*100);
            if(percentage<10){
              //don't annotate small values
              return '';
            }
            return percentage + '%';
          });
        arcs.transition()
          .select('path')
          .attrTween("d", function(d)
          {
            this._current = this._current || d;
            var interpolate = d3.interpolate(this._current, d);
            this._current = interpolate(0);
            return function(t)
            {
              return arc(interpolate(t));
            };
          });
        arcs.transition()
          .select('text')
          .attr("transform", function(d)
          {
            return "translate(" + arc.centroid(d) + ")";
          })
          .text(function(d)
          {
            if(totalVotes < 1){
              return '0%';
            }
            var percentage = Math.round((d.value/totalVotes)*100);
            if(percentage<10){
              //don't annotate small values
              return '';
            }
            return percentage + '%';
          });
        arcs.exit()
          .remove();
      }
    }
  });
  */
});