var __hasProp = {}.hasOwnProperty,
    __extends = function (child, parent) {
      for (var key in parent) {
        if (__hasProp.call(parent, key)) child[key] = parent[key];
      }
      function ctor() {
        this.constructor = child;
      }

      ctor.prototype = parent.prototype;
      child.prototype = new ctor();
      child.__super__ = parent.prototype;
      return child;
    };

var getIdFromUrl = function(url){
  return _.chain(url.split('/')).compact().last().value().match(/[\d]*/)[0]
};

ContextBlock = (function () {
  function ContextBlock(doc) {
    _.extend(this, doc);
  }

  ContextBlock.prototype.creationDateString = function () {
    return formatDateNice(this.reference.creationDate);
  };

  ContextBlock.prototype.creationDateCompactString = function () {
    return formatDateCompact(this.reference.creationDate);
  };

  ContextBlock.prototype.providerName = function() {
    return this.source.toUpperCase().replace(/\_/, ' ');
  };

  ContextBlock.prototype.hasSoloMode = function() {
    return this.soloModeLocation ? true : false;
  };

  ContextBlock.prototype.hoverIconTemplate = function(){
    switch (this.soloModeLocation){
      case 'overlay':
        return 'expand_in_overlay_icon'
      case 'sidebar':
        return 'expand_in_sidebar_icon'
    }
  };

  return ContextBlock;
})();

youtubeMapFn = function (e) {
  return {
    reference: {
      title: e.title,
      description: e.description,
      id: e.videoId,
      username: e.channelTitle,
      userId: e.channelId,
      creationDate: new Date(e.publishedAt),
      noPreview: !e.thumbnails,
      live: e.liveBroadcastContent === 'live'
    },
    live: e.liveBroadcastContent === 'live',
    source: 'youtube'
  }
};

ustreamMapFn = function (e) { // this is post-insert from pre-loading ustream results
  return {
    reference: {
      title: e.title,
      description: $($.parseHTML(e.description)).text(),
      id: e.id,
      username: e.username,
      currentViewers: e.currentViewers,
      thumbnailUrl: e.imageUrl.small,
      previewUrl: e.imageUrl.medium,
      totalViews: e.totalViews,
      userId: e.user.id,
      creationDate: e.creationDate,
      lastStreamedAt: e.lastStreamedAt
    },
    live: e.live,
    source: 'ustream'
  }
};

bambuserMapFn = function (e) {
  return {
    reference: {
      title: e.title,
      id: e.id,
      username: e.username,
      totalViews: e.totalViews,
      userId: e.owner.uid,
      creationDate: e.creationDate,
      tags: e.tags,
      previewUrl: e.preview
    },
    live: e.live,
    source: 'bambuser'
  }
};

twitchMapFn = function (e) {
  return {
    reference: {
      title: e.channel.status,
      description: e.channel.game,
      id: e._id,
      channelName: e.channel.name,
      currentViewers: e.viewers,
      totalViews: e.channel.views,
      channelId: e.channel.id,
      creationDate: new Date(e.created_at)
    },
    live: true,
    source: 'twitch'
  }
};

ContextBlock.searchMappings = {
  all_streaming_services: {
    methodName: 'streamSearchList',
    mapFn (e) {
      var stream;
      switch (e._streamSource) {
        case 'youtube':
          stream = youtubeMapFn(e);
          break;
        case 'bambuser':
          stream = bambuserMapFn(e);
          break;
        case 'ustream':
          stream = ustreamMapFn(e);
          break;
        case 'twitch':
          stream = twitchMapFn(e);
          break;
        default:
          console.error(e);
          throw new Meteor.Error('Unknown stream source')
      }
      delete stream._streamSource; // this was only for internal use
      return stream;
    }
  },
  youtube: {
    methodName: 'youtubeVideoSearchList',
    mapFn: youtubeMapFn
  },
  bambuser: {
    methodName: 'bambuserVideoSearchList',
    mapFn: bambuserMapFn
  },
  ustream: {
    methodName: 'ustreamVideoSearchList',
    mapFn: ustreamMapFn
  },
  embed: {
    methodName: 'embedToStreamMagic',
    mapFn (e) {
      return {
        reference: {
          title: e.title, //'cats rock',//e.channel.status,
          description: 'No description', //e.channel.game,
          id: 'custom-embed-' + Random.id(8), //e._id,
          channelName: 'Custom Embed',//e.channel.name,
          url: e.url,
          currentViewers: 0, //e.viewers,
          totalViews: 0, //e.channel.views,
          channelId: '0',// e.channel.id,
          creationDate: new Date()//new Date(e.created_at)
        },
        live: false,
        source: 'embed'
      }
    }
  },
  meerkat: {
    methodName: 'meerkatUsernameToStream',
    mapFn (e) {
      return {
        reference: {
          title: e.title, //'cats rock',//e.channel.status,
          description: 'No description', //e.channel.game,
          id: 'meerkat-embed-' + Random.id(8), //e._id,
          channelName: 'Meerkat Embed',//e.channel.name,
          url: e.url,
          currentViewers: 0, //e.viewers,
          totalViews: 0, //e.channel.views,
          channelId: '0',// e.channel.id,
          creationDate: new Date() //new Date(e.created_at)
        },
        live: false,
        source: 'meerkat'
      }
    }
  },
  twitcast: {
    methodName: 'twitcastUsernameToStream',
    mapFn (e) {
      return {
        reference: {
          title: e.title, //'cats rock',//e.channel.status,
          description: 'No description', //e.channel.game,
          id: 'twitcast-embed-' + Random.id(8), //e._id,
          channelName: e.username, //'Twitcast Embed', //e.channel.name,
          url: e.url,
          currentViewers: 0, //e.viewers,
          totalViews: 0, //e.channel.views,
          channelId: '0',// e.channel.id,
          creationDate: new Date() //new Date(e.created_at)
        },
        live: false,
        source: 'twitcast'
      }
    }
  },
  twitch: {
    methodName: 'twitchVideoSearchList',
    mapFn: twitchMapFn
  },
  vimeo: {
    methodName: 'vimeoVideoSearchList',
    mapFn (e) {
      return {
        reference: {
          title: e.name,
          description: e.description,
          id: getIdFromUrl(e.uri),
          username: e.user.name,
          creationDate: new Date(e.created_time),
          previewImage: getIdFromUrl(e.pictures.uri)
        }
      }
    }
  },
  soundcloud: {
    methodName: 'soundcloudAudioSearchList',
    mapFn (e) {
      return {
        reference: {
          title: e.title,
          description: e.description,
          id: e.id,
          username: e.channelTitle,
          userId: e.user_id,
          creationDate: new Date(e.created_at),
          artworkUrl: e.artwork_url
        }
      }
    }
  },
  twitter: {
    methodName: 'twitterSearchList',
    mapFn (e) {
      var item = {
        reference: {
          text: e.text,
          extendedEntities: e.extended_entities,
          retweetedStatus: e.retweeted_status,
          entities: e.entities,
          id: e.id_str,
          username: e.user.name,
          screenname: e.user.screen_name,
          userPic: e.user.profile_image_url_https,
          creationDate: new Date(e.created_at)
        }
      };
      return item;
    }
  },
  imgur: {
    methodName: 'imgurImageSearchList',
    mapFn (e) {
      return {
        reference: {
          id: e.id,
          username: e.account_url,
          userId: e.account_id,
          fileExtension: e.link.substring(e.link.lastIndexOf('.') + 1),
          title: e.title,
          hasMP4: e.mp4 ? true : false,
          hasWebM: e.webm ? true : false,
          height: e.height,
          width: e.width
        }
      }
    }
  },
  flickr: {
    methodName: 'flickrImageSearchList',
    mapFn (e) {
      var username, uploadDate, title, lgUrl, lgHeight, lgWidth, flickrOwnerId;
      if (e.media) {
        //if single image result
        flickrOwnerId = e.owner.nsid;
        ownername = e.owner.username;
        uploadDate = e.dateuploaded;
        title = e.title._content;
      } else {
        //if search result
        flickrOwnerId = e.owner;
        ownername = e.ownername;
        uploadDate = e.dateupload;
        title = e.title;
      }
      
      var info = {
        reference: {
          ownerName: ownername,
          flickrOwnerId: flickrOwnerId,
          uploadDate: new Date(parseInt(uploadDate) * 1000),
          flickrFarm: e.farm,
          flickrSecret: e.secret,
          id: e.id,
          flickrServer: e.server,
          title: title
        }
      };
      
      // find the largest version of image available
      _.each(['z', 'c', 'l', 'h', 'k', 'o'], function(sizeSuffix) {
        if (e['url_' + sizeSuffix]) {
          lgUrl = e['url_' + sizeSuffix];
          // - lgHeight and width don't get set accurately.
          //lgHeight = e['height_'+ sizeSuffix];
          //lgWidth = e['width_'+ sizeSuffix];
        }
      });
      
      if (lgUrl) {
        _.extend(info.reference, {
          lgUrl : lgUrl
          // - lgHeight and width don't get set accurately.
          //lgHeight: lgHeight,
          //lgWidth: lgWidth
        })
      }

      return info;
    }
  },
  cloudinary: {
    notSearch: true
  },
  giphy: {
    methodName: 'giphyGifSearchList',
    mapFn (e) {
      return {
        reference: {
          id: e.id,
          username: e.username,
          source: e.source
        }
      }
    }
  }
};

Stream = (function (_super) {
  __extends(Stream, _super);

  function Stream(doc) {
    Stream.__super__.constructor.call(this, doc);
    this.type = 'stream';
  }

  Stream.prototype.videoId = function () {
    //if (this.source === 'youtube') {
      return this.reference.id;
    //}
  };

  Stream.prototype.title = function () {
    //if (this.source === 'youtube') {
      return this.reference.title;
    //}
  };

  Stream.prototype.createdAtString = function () {
    return this.reference.creationDate;
  };

  Stream.prototype.caption = function () {
    if (_.contains('youtube', 'ustream'), this.source) {
      return this.reference.description;
    }
  };

  Stream.prototype.username = function () {
    return this.reference.username || this.reference.channelName;
  };

  Stream.prototype.currentViewers = function () {
    switch (this.source){
      case 'bambuser':
        return null;
      default:
        return this.reference.currentViewers;
    }
  };
  Stream.prototype.totalViews = function () {
    switch (this.source){
      default:
        return this.reference.totalViews;
    }
  };


  Stream.prototype.creationDate = function () {
    return this.reference.creationDate
  };

  Stream.prototype.autoplayUrl = function(){
    if (this.source === 'bambuser') {
      return this.url() + "&autoplay=1";
    } else {
      return this.url() + "&autoplay=true&auto_play=true&loop=1";
    }
  };

  Stream.prototype.iframePreviewUrl = function(){
    switch (this.source){
      case 'youtube':
        return this.autoplayUrl() + '&fs=0'; // unfortunately, youtube doesn't have mute or volume parameters
      case 'ustream':
        return this.autoplayUrl() + '&volume=0';
      case 'bambuser':
        return this.autoplayUrl() + '&mute=1';
      case 'twitch':
        return this.autoplayUrl() + '&volume=0';
      default:
        return this.autoplayUrl() +'&volume=0' + '&mute=1' + '&fs=0' + '&automute=0'
    }
  };

  Stream.prototype.url = function () {
    switch (this.source){
      case 'youtube':
        return '//www.youtube.com/embed/' + this.reference.id + '?enablejsapi=1&modestbranding=1&rel=0&iv_load_policy=3&autohide=1&loop=1&playlist=' +this.reference.id;
      case 'ustream':
        return '//www.ustream.tv/embed/' + this.reference.id + '?html5ui';
      case 'bambuser':
        return '//embed.bambuser.com/channel/' + this.reference.username + '?chat=0';
      case 'twitch':
        return '//www.twitch.tv/' + this.reference.channelName + '/embed?';
      case 'ml30':{
        return 'https://civic.mit.edu/ml30-deepstream/?';
      }
      default:
        url = this.reference.url;
        if(url.substr(-1) === '/') {
          url = url.substr(0, url.length - 1);
          url += '?';
        }
        return url;
    }
  };

  Stream.prototype.flashVars = function(){
    if (this.source === 'bambuser') {
      //return 'vid=' + Template.instance().activeStream.get().reference.id + '&autostart=yes';
      return 'username=' + this.reference.username + '&autostart=yes';
    } else if (this.source === 'twitch') {
      return 'channel=' + this.reference.channelName + '&auto_play=true&start_volume=25';
    } else if (this.source === 'twitcast') {
      return 'user=' + this.reference.channelName + '&lang=en&myself=&seed=&pass=&mute=2';
    }
  };
  Stream.prototype.hasPreviewImage = function(){
    switch (this.source){
      case 'youtube':
        if(this.noPreview){
          return false;
        }
        break;
      case 'ustream':
        if(this.reference.previewUrl.indexOf('/images/defaults') !== -1){
          return false;
        }
        break;
      case 'bambuser':
        if(!this.reference.previewUrl){
          return false;
        }
        break;
      case 'twitch':
        if(!this.live){
          return false;
        }
        break;
    }
    return true;
  };
  Stream.prototype.previewUrl = function () {
    switch (this.source){
      case 'youtube':
        // TO-DO - if this.noPreview, show something nice instead of blank youtube thing
        return '//img.youtube.com/vi/' + this.reference.id + '/0.jpg';
      case 'ustream':
        // TO-DO - if contains /images/defaults, show something nice instead of blank ustream thing
        return this.reference.previewUrl;
      case 'meerkat':
        return 'http://res.cloudinary.com/' + Meteor.settings['public'].CLOUDINARY_CLOUD_NAME + '/image/upload/v1468868234/placeholder_mkmovie_qbnfsn.png';
      case 'twitcast':
        return 'http://res.cloudinary.com/' + Meteor.settings['public'].CLOUDINARY_CLOUD_NAME + '/image/upload/v1468944027/placeholder_tcmovie_qbnfsn_dlqiki.png';
      case 'bambuser':
        return this.reference.previewUrl;
      case 'twitch':
        return "http://static-cdn.jtvnw.net/previews-ttv/live_user_" + this.reference.channelName + "-320x180.jpg";
      case 'ml30':
        return '//res.cloudinary.com/' + Meteor.settings['public'].CLOUDINARY_CLOUD_NAME + '/image/upload/static/MIT_ML_Logo_white';
      default:
        var cloudinaryLink = 'http://res.cloudinary.com/' + Meteor.settings['public'].CLOUDINARY_CLOUD_NAME + '/image/upload/';
        if(this.fullDetails){
          switch (this.fullDetails.host) {
            case 'player.vimeo.com':
              return cloudinaryLink + 'v1468856998/placeholder_vimeomovie_jrmlx7.png';
            case 'ustream.tv':
              return cloudinaryLink + 'v1468856997/placeholder_usmovie_gwkpvr.png';
            case 'www.ustream.tv':
              return cloudinaryLink + 'v1468856997/placeholder_usmovie_gwkpvr.png';
            case 'periscope.tv':
              return cloudinaryLink + 'v1468856998/placeholder_psmovie_ruc7y3.png';
            case 'www.periscope.tv':
              return cloudinaryLink + 'v1468856998/placeholder_psmovie_ruc7y3.png';
            case 'soundcloud.com':
              return cloudinaryLink + 'v1468856998/placeholder_scmovie_lkmct0.png';
            case 'w.soundcloud.com':
              return cloudinaryLink + 'v1468856998/placeholder_scmovie_lkmct0.png';
            case 'facebook.com':
              return cloudinaryLink + 'v1468856998/placeholder_fbmovie_lgtesc.png';
            case 'www.facebook.com':
              return cloudinaryLink + 'v1468856998/placeholder_fbmovie_lgtesc.png';
            case 'tunein.com':
              return cloudinaryLink + 'v1468856998/placeholder_timovie_rphufn.png';
            case 'www.tunein.com':
              return cloudinaryLink + 'v1468856998/placeholder_timovie_rphufn.png';
            case 'livestream.com':
              return cloudinaryLink + 'v1469465261/placeholder_lsmovie_tayglj.png';
            case 'www.livestream.com':
              return cloudinaryLink + 'v1469465261/placeholder_lsmovie_tayglj.png';
            case 'vine.co':
              return cloudinaryLink + 'v1470843170/placeholder_vn2movie_h7qqi7.png';
            case 'www.vine.co':
              return cloudinaryLink + 'v1470843170/placeholder_vn2movie_h7qqi7.png';
            case 'youtube.com':
              return cloudinaryLink + 'v1472609327/placeholder_wpmovie_cqbfeb.png';
            case 'www.youtube.com':
              return cloudinaryLink + 'v1472609327/placeholder_wpmovie_cqbfeb.png';
            case 'www.wral.com':
              return cloudinaryLink + 'v1472593841/placeholder_wralmovie_akkodp.png';
            case 'wral.com':
              return cloudinaryLink + 'v1472593841/placeholder_wralmovie_akkodp.png';
            default:
              return cloudinaryLink + 'v1466257562/placeholder_movie_rad2ai.png';
          }
        }
        return cloudinaryLink + 'v1466257562/placeholder_movie_rad2ai.png';
    }
  };
  Stream.prototype.thumbnailUrl = function () {
    switch (this.source){
      case 'youtube':
        return '//i.ytimg.com/vi/' + this.reference.id + '/default.jpg';
      case 'ustream':
        return this.reference.thumbnailUrl;
      case 'meerkat':
        return 'http://res.cloudinary.com/' + Meteor.settings['public'].CLOUDINARY_CLOUD_NAME + '/image/upload/v1468868234/placeholder_mkmovie_qbnfsn.png';
      case 'twitcast':
        return 'http://res.cloudinary.com/' + Meteor.settings['public'].CLOUDINARY_CLOUD_NAME + '/image/upload/v1468944027/placeholder_tcmovie_qbnfsn_dlqiki.png';
      case 'bambuser':
        return this.reference.previewUrl;
      case 'twitch':
        return "http://static-cdn.jtvnw.net/previews-ttv/live_user_" + this.reference.channelName + "-80x45.jpg";
      case 'ml30':
        return '//res.cloudinary.com/' + Meteor.settings['public'].CLOUDINARY_CLOUD_NAME + '/image/upload/static/MIT_ML_Logo_white';
      default:
        var cloudinaryLink = 'http://res.cloudinary.com/' + Meteor.settings['public'].CLOUDINARY_CLOUD_NAME + '/image/upload/';
        if(this.fullDetails){
          switch (this.fullDetails.host) {
            case 'player.vimeo.com':
              return cloudinaryLink + 'v1468856998/placeholder_vimeomovie_jrmlx7.png';
            case 'ustream.tv':
              return cloudinaryLink + 'v1468856997/placeholder_usmovie_gwkpvr.png';
            case 'www.ustream.tv':
              return cloudinaryLink + 'v1468856997/placeholder_usmovie_gwkpvr.png';
            case 'periscope.tv':
              return cloudinaryLink + 'v1468856998/placeholder_psmovie_ruc7y3.png';
            case 'www.periscope.tv':
              return cloudinaryLink + 'v1468856998/placeholder_psmovie_ruc7y3.png';
            case 'soundcloud.com':
              return cloudinaryLink + 'v1468856998/placeholder_scmovie_lkmct0.png';
            case 'w.soundcloud.com':
              return cloudinaryLink + 'v1468856998/placeholder_scmovie_lkmct0.png';
            case 'facebook.com':
              return cloudinaryLink + 'v1468856998/placeholder_fbmovie_lgtesc.png';
            case 'www.facebook.com':
              return cloudinaryLink + 'v1468856998/placeholder_fbmovie_lgtesc.png';
            case 'tunein.com':
              return cloudinaryLink + 'v1468856998/placeholder_timovie_rphufn.png';
            case 'www.tunein.com':
              return cloudinaryLink + 'v1468856998/placeholder_timovie_rphufn.png';
            case 'livestream.com':
              return cloudinaryLink + 'v1469465261/placeholder_lsmovie_tayglj.png';
            case 'www.livestream.com':
              return cloudinaryLink + 'v1469465261/placeholder_lsmovie_tayglj.png';
            case 'vine.co':
              return cloudinaryLink + 'v1470843170/placeholder_vn2movie_h7qqi7.png';
            case 'www.vine.co':
              return cloudinaryLink + 'v1470843170/placeholder_vn2movie_h7qqi7.png';
            case 'youtube.com':
              return cloudinaryLink + 'v1472609327/placeholder_wpmovie_cqbfeb.png';
            case 'www.youtube.com':
              return cloudinaryLink + 'v1472609327/placeholder_wpmovie_cqbfeb.png';
            case 'www.wral.com':
              return cloudinaryLink + 'v1472593841/placeholder_wralmovie_akkodp.png';
            case 'wral.com':
              return cloudinaryLink + 'v1472593841/placeholder_wralmovie_akkodp.png';
            default:
              return cloudinaryLink + 'v1466257562/placeholder_movie_rad2ai.png';
          }
        }
        return cloudinaryLink + 'v1466257562/placeholder_movie_rad2ai.png';
    }
  };
  Stream.prototype.sourceUrl = function () {
    if (this.source === 'youtube') {
      return 'https://www.youtube.com/watch?v=' + this.reference.id;
    } else if (this.source === 'ustream') {
      return 'https://www.ustream.tv/channel/' + this.reference.id;
    } else if (this.source === 'bambuser'){
      return 'http://bambuser.com/channel/' + this.reference.username;
    } else if (this.source === 'twitch'){
      return 'http://www.twitch.tv/' + this.reference.channelName;
    }
  };
  Stream.prototype.providerIconUrl = function() {
    switch (this.source) {
      case 'youtube':
        return 'https://s.ytimg.com/yts/img/favicon-vflz7uhzw.ico';
      case 'ustream':
        return 'http://static-cdn1.ustream.tv/images/favicon:1.ico';
      case 'bambuser':
        return 'http://static.bambuser.com/themes/b4/favicon.ico';
      case 'twitch':
        return 'http://www.twitch.tv/favicon.ico';
    }
  };
  Stream.prototype.searchList = true;
  Stream.prototype.searchListTemplate = 'create_stream_section';
  Stream.prototype.searchSoloTemplate = 'create_stream_section';

  return Stream;

})(ContextBlock);

VideoBlock = (function (_super) {
  __extends(VideoBlock, _super);

  function VideoBlock(doc) {
    VideoBlock.__super__.constructor.call(this, doc);
    this.type = 'video';
    if (this.source == null) {
      this.source = 'youtube';
    }
  }

  VideoBlock.prototype.title = function () {
    if (this.source === 'youtube' || this.source === 'vimeo') {
      return this.reference.title
    }
  };

  VideoBlock.prototype.caption = function () {
    if (this.source === 'youtube' || this.source === 'vimeo') {
      return this.reference.description
    }
  };

  VideoBlock.prototype.username = function () {
    if (this.source === 'youtube' || this.source === 'vimeo') {
      return this.reference.username
    }
  };

  VideoBlock.prototype.creationDate = function () {
    if (this.source === 'youtube' || this.source === 'vimeo') {
      return this.reference.creationDate
    }
  };

  VideoBlock.prototype.url = function () {
    if (this.source === 'youtube') {
      return '//www.youtube.com/embed/' + this.reference.id;
    } else if (this.source === 'vimeo') {
      return '//player.vimeo.com/video/' + this.reference.id;
    }
  };

  VideoBlock.prototype.autoplayUrl= function () {
    return this.url() + '?autoplay=true'
  };

  VideoBlock.prototype.previewUrl = function () {
    if (this.source === 'youtube') {
      return '//img.youtube.com/vi/' + this.reference.id + '/0.jpg';
    } else if (this.source === 'vimeo') {
      return '//i.vimeocdn.com/video/' + this.reference.previewImage + '_640x359.jpg'
    }
  };

  VideoBlock.prototype.thumbnailUrl = function () {
    if (this.source === 'youtube') {
      return '//i.ytimg.com/vi/' + this.reference.id + '/default.jpg';
    } else if (this.source === 'vimeo') {
      return '//i.vimeocdn.com/video/' + this.reference.previewImage + '_100x75.jpg'
    }
  };



  VideoBlock.prototype.anchorMenuSnippet = function () {
    return this.reference.title;
  };

  VideoBlock.prototype.previewHeightAtGivenWidth = function(width){
    if (this.source === 'youtube') {
      return Math.floor(width * 360 / 480);
    } else if (this.source === 'vimeo') {
      return Math.floor(width * 359 / 640);
    }
  };

  VideoBlock.prototype.providerIconUrl = function() {
    switch (this.source) {
      case 'youtube':
        return 'https://s.ytimg.com/yts/img/favicon-vflz7uhzw.ico';
      case 'vimeo':
        return 'https://f.vimeocdn.com/images_v6/favicon.ico';
    }
  };


  VideoBlock.prototype.soloModeLocation = 'overlay';
  VideoBlock.prototype.soloModeTemplate = 'display_video_section';
  VideoBlock.prototype.listModeItemTemplate = 'preview_video_section';
  VideoBlock.prototype.portraitListModeItemTemplate = 'portrait_preview_video_section';
  VideoBlock.prototype.annotationAllowed = true;
  VideoBlock.prototype.countListModeViewAsRead = true;
  VideoBlock.prototype.searchList = true;
  VideoBlock.prototype.searchListTemplate = 'create_video_section';
  VideoBlock.prototype.searchSoloTemplate = 'create_video_section';
  VideoBlock.prototype.homepagePreview = false;
  VideoBlock.prototype.homepagePreviewTemplate  = 'homepage_preview_video_section';

  return VideoBlock;

})(ContextBlock);

AudioBlock = (function (_super) {
  __extends(AudioBlock, _super);

  function AudioBlock(doc) {
    AudioBlock.__super__.constructor.call(this, doc);
    this.type = 'audio';
    if (this.source == null) {
      this.source = 'soundcloud';
    }
  }

  AudioBlock.prototype.url = function () {
    if (this.source === 'soundcloud') {
      return '//w.soundcloud.com/player/?url=https://api.soundcloud.com/tracks/' + this.reference.id + '&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&visual=true'
    }
  };

  AudioBlock.prototype.artworkUrl = function () {
    if (this.source === 'soundcloud') {
      return this.reference.artworkUrl;
    }
  };

  AudioBlock.prototype.previewUrl = function () {
    if (this.source === 'soundcloud' && this.reference.artworkUrl) {
      return this.reference.artworkUrl.replace(/large\.jpg/, "t500x500.jpg");
    }
  };

  AudioBlock.prototype.anchorMenuSnippet = function () {
    return this.reference.title;
  };



  AudioBlock.prototype.providerIconUrl = function() {
    return 'https://a-v2.sndcdn.com/assets/images/sc-icons/favicon-2cadd14b.ico';
  };




  AudioBlock.prototype.soloModeLocation = null;
  AudioBlock.prototype.soloModeTemplate = 'display_audio_section';
  AudioBlock.prototype.listModeItemTemplate = 'display_audio_section';
  AudioBlock.prototype.portraitListModeItemTemplate = 'portrait_display_audio_section';
  AudioBlock.prototype.annotationAllowed = true;
  AudioBlock.prototype.countListModeViewAsRead = true;
  AudioBlock.prototype.searchList = true;
  AudioBlock.prototype.searchListTemplate = 'create_audio_section';
  AudioBlock.prototype.searchSoloTemplate = 'create_audio_section';
  AudioBlock.prototype.homepagePreview = false;
  AudioBlock.prototype.homepagePreviewTemplate = null;

  return AudioBlock;

})(ContextBlock);

TwitterBlock = (function (_super) {
  __extends(TwitterBlock, _super);

  function TwitterBlock(doc) {
    TwitterBlock.__super__.constructor.call(this, doc);
    this.type = 'twitter';
    if (this.source == null) {
      this.source = 'twitter';
    }
  }

  TwitterBlock.prototype.userpic = function () {
    return this.reference.userPic
  };

  TwitterBlock.prototype.username = function () {
    return this.reference.username
  };

  TwitterBlock.prototype.screenname = function () {
    return this.reference.screenname
  };

  TwitterBlock.prototype.text = function () {
    return this.reference.userPic
  };

  TwitterBlock.prototype.date = function () {
    return this.reference.creationDate
  };

  TwitterBlock.prototype.tweet_url = function () {
    return '//twitter.com/' + this.reference.screenname + '/status/' + this.reference.id
  };

  TwitterBlock.prototype.user_url = function () {
    return '//twitter.com/' + this.reference.screenname
  };

  TwitterBlock.prototype.twitter_url = function () {
    return '//twitter.com/'
  };

  TwitterBlock.prototype.retweet_action = function () {
    return '//twitter.com/intent/retweet?tweet_id=' + this.reference.id
  };

  TwitterBlock.prototype.reply_action = function () {
    return '//twitter.com/intent/tweet?in_reply_to=' + this.reference.id
  };

  TwitterBlock.prototype.favorite_action = function () {
    return '//twitter.com/intent/favorite?tweet_id=' + this.reference.id
  };

  TwitterBlock.prototype.imgUrl = function () {
    var imgUrl;
    if (this.extendedEntities) {
      imgUrl = this.extendedEntities.media[0].media_url_https;
    }
    if (this.reference.retweetedStatus) {
      if (this.reference.retweetedStatus.entities.media) {
        imgUrl = this.reference.retweetedStatus.entities.media[0].media_url
      }
    } else {
      if (this.reference.entities.media) {
        imgUrl = this.reference.entities.media[0].media_url
      }
    }
    return imgUrl
  };

  TwitterBlock.prototype.retweet_url = function () {
    return '//twitter.com/' + this.reference.retweetedStatus.user.screen_name
  };

  TwitterBlock.prototype.retweetUser = function () {
    if (this.reference.retweetedStatus) {
      return this.reference.retweetedStatus.user.screen_name;
    }
  };

  TwitterBlock.prototype.anchorMenuSnippet = function () {
    return this.reference.text;
  };

  TwitterBlock.prototype.links = function () {

    if (this.reference.retweetedStatus) {
      var urls = this.reference.retweetedStatus.entities.urls;
    } else {
      var urls = this.reference.entities.urls;
    }
    return urls
  };

  TwitterBlock.prototype.formattedTweet = function () {
    var text = this.reference.text; // twttr seems to be escaping appropriately itself

    if (this.imgUrl()) {
      var imgIndex = text.lastIndexOf("https://") || text.lastIndexOf("http://");
      text = text.substring(0, imgIndex);
    }

    return twttr.txt.autoLink(text, {
      urlEntities: this.links(),
      targetBlank: true
    });
  };


  TwitterBlock.prototype.providerIconUrl = function() {
    return '//abs.twimg.com/favicons/favicon.ico';
  };



  TwitterBlock.prototype.soloModeLocation = null;
  TwitterBlock.prototype.soloModeTemplate = null;
  TwitterBlock.prototype.listModeItemTemplate = 'display_twitter_section';
  TwitterBlock.prototype.portraitListModeItemTemplate = 'portrait_display_twitter_section';
  TwitterBlock.prototype.annotationAllowed = true;
  TwitterBlock.prototype.countListModeViewAsRead = true;
  TwitterBlock.prototype.searchList = true;
  TwitterBlock.prototype.searchListTemplate = 'create_twitter_section';
  TwitterBlock.prototype.searchSoloTemplate = 'create_twitter_section';
  TwitterBlock.prototype.homepagePreview = true;
  TwitterBlock.prototype.homepagePreviewTemplate = 'homepage_preview_twitter_section';

  return TwitterBlock;

})(ContextBlock);

ImageBlock = (function (_super) {
  __extends(ImageBlock, _super);

  function ImageBlock(doc) {
    ImageBlock.__super__.constructor.call(this, doc);
    this.type = 'image';
    if (!this.source) { // TO-DO Remove
      this.source = 'imgur';
    }
  };

  ImageBlock.prototype.showVideo = function () {
    return this.webMUrl() || this.mp4Url();
  };

  ImageBlock.prototype.webMUrl = function () {
    if (this.source === 'imgur' && this.reference.hasWebM) {
      return '//i.imgur.com/' + this.reference.id + '.webm';
    }
  };

  ImageBlock.prototype.mp4Url = function () {
    if (this.source === 'imgur' && this.reference.hasMP4) {
      return '//i.imgur.com/' + this.reference.id + '.mp4';
    }
  };

  ImageBlock.prototype.url = function () {
    switch (this.source) {
      case 'local':
        return '/' + this.reference.id;
      case 'link':
        return this.reference.url;
      case 'imgur':
        return '//i.imgur.com/' + this.reference.id + '.' + this.reference.fileExtension;
      case 'flickr':
        var flickrUrl = '//farm' + this.reference.flickrFarm + '.staticflickr.com/' + this.reference.flickrServer + '/' + this.reference.id + '_' + this.reference.flickrSecret + '.jpg';
        if(this.reference.lgUrl){
          //if(large url) use it -- different flickrSecrets -> thus use full url
          flickrUrl = this.reference.lgUrl;
        }
        return  flickrUrl;
      case 'giphy':
        return '//media4.giphy.com/media/' + this.reference.id + '/giphy.gif';
      case 'embedly':
        return this.reference.url;
      case 'cloudinary':
        // TO-DO maybe use jpeg instead of png in certain situations
        return '//res.cloudinary.com/' + Meteor.settings['public'].CLOUDINARY_CLOUD_NAME + '/image/upload/c_limit,h_520,w_520/' + this.reference.id;
    }
  };

  ImageBlock.prototype.isFlickr = function () {
    return (this.source === 'flickr');
  }

  ImageBlock.prototype.webUrl = function () {
    switch (this.source) {
      case 'flickr':
        if (this.reference.flickrOwnerId) {
          return '//www.flickr.com/photos/' + this.reference.flickrOwnerId + '/' + this.reference.id;
        } else {
          return encodeFlickrUrl(this.reference.id)
        }
    }
  };

  ImageBlock.prototype.ownerUrl = function () {
    switch (this.source) {
      case 'flickr':
        if (this.reference.flickrOwnerId) {
          return '//www.flickr.com/photos/' + this.reference.flickrOwnerId;
        }
    }
  };


  ImageBlock.prototype.ownerName = function () {
    switch (this.source) {
      case 'flickr':
        return this.reference.ownerName;
    }
  };

  ImageBlock.prototype.uploadDate = function () {
    switch (this.source) {
      case 'flickr':
        if (this.reference.uploadDate) {
          return this.reference.uploadDate.toDateString();
        }
    }
  };

  ImageBlock.prototype.previewUrl = function () {
    switch (this.source) {
      case 'local':
        return '/' + this.reference.id;
      case 'link':
        return this.reference.url;
      case 'imgur':
        if (this.reference.fileExtension === 'gif') {
          return '//i.imgur.com/' + this.reference.id + 'l' + '.' + this.reference.fileExtension;
        } else {
          return '//i.imgur.com/' + this.reference.id + '.' + this.reference.fileExtension;
        }
      case 'flickr':
        return '//farm' + this.reference.flickrFarm + '.staticflickr.com/' + this.reference.flickrServer + '/' + this.reference.id + '_' + this.reference.flickrSecret + '.jpg';
      case 'giphy':
        return '//media4.giphy.com/media/' + this.reference.id + '/giphy.gif';
      case 'embedly':
        return this.reference.url;
      case 'cloudinary':
        return '//res.cloudinary.com/' + Meteor.settings['public'].CLOUDINARY_CLOUD_NAME + '/image/upload/c_limit,h_520,w_520/' + this.reference.id;
    }
  };

  ImageBlock.prototype.thumbnailUrl = function () {
    switch (this.source) {
      case 'local':
        return '/' + this.reference.id;
      case 'imgur':
        return '//i.imgur.com/' + this.reference.id + 't' + '.' + this.reference.fileExtension;
      case 'flickr':
        return '//farm' + this.reference.flickrFarm + '.staticflickr.com/' + this.reference.flickrServer + '/' + this.reference.id + '_' + this.reference.flickrSecret + '_t' + '.jpg';
      case 'giphy':
        return '//media4.giphy.com/media/' + this.reference.id + '/200_d.gif';
      case 'embedly':
        return this.reference.thumbnailUrl;
      case 'cloudinary':
        // f_auto is slightly worse quality but less bandwidth
        return '//res.cloudinary.com/' + Meteor.settings['public'].CLOUDINARY_CLOUD_NAME + '/image/upload/f_auto,c_limit,h_150,w_260/' + this.reference.id;
    }
  };

  ImageBlock.prototype.anchorMenuSnippet = function () {
    return this.description || this.reference.title || this.reference.description || this.reference.id;
  };

  ImageBlock.prototype.heightAtGivenWidth = function(width){
    var height;
    if (height = this.reference.height){
      return height * width / this.reference.width;
    } else {
      return null;
    }
  };

  ImageBlock.prototype.providerName = function() {
    switch (this.source) {
      case 'cloudinary':
        return 'Curator Upload';
      default:
        return _super.prototype.providerName.call(this);
    }
  };

  ImageBlock.prototype.providerIconUrl = function() {
    switch (this.source) {
      case 'flickr':
        return 'https://s.yimg.com/pw/favicon.ico';
      case 'imgur':
        return '//s.imgur.com/images/favicon-32x32.png';
      default:
        return '/images/image_icon.svg'
    }
  };

  //

  ImageBlock.prototype.soloModeLocation = 'overlay';
  ImageBlock.prototype.soloModeTemplate = 'display_image_section';
  ImageBlock.prototype.listModeItemTemplate = 'preview_image_section';
  ImageBlock.prototype.portraitListModeItemTemplate = 'portrait_preview_image_section';
  ImageBlock.prototype.annotationAllowed = true;
  ImageBlock.prototype.countListModeViewAsRead = true;
  ImageBlock.prototype.searchList = true;
  ImageBlock.prototype.searchListTemplate = 'create_image_section';
  ImageBlock.prototype.searchSoloTemplate = 'create_image_section';
  ImageBlock.prototype.homepagePreview = false;
  ImageBlock.prototype.homepagePreviewTemplate = null;

  return ImageBlock;

})(ContextBlock);

MapBlock = (function (_super) {
  __extends(MapBlock, _super);

  function MapBlock(doc) {
    MapBlock.__super__.constructor.call(this, doc);
    this.type = 'map';
    if (this.source == null) {
      this.source = 'google_maps';
    }
  }

  MapBlock.prototype.longSnippet = function () {
    return this.reference.mapQuery;
  };

  MapBlock.prototype.anchorMenuSnippet = function () {
    return this.reference.mapQuery;
  };

  MapBlock.prototype.escape = function (value) {
    return encodeURIComponent(value).replace(/%20/g, "+");
  };

  MapBlock.prototype.url = function () {
    if (this.source === 'google_maps') {
      return 'https://www.google.com/maps/embed/v1/place?' + 'key=' + GOOGLE_API_CLIENT_KEY + '&q=' + this.escape(this.reference.mapQuery) + '&maptype=' + this.escape(this.reference.mapType);
    }
  };

  MapBlock.prototype.previewUrl = function (height, width) {
    height = height || 300;
    width = width || 520;
    if (this.source === 'google_maps') {
      return 'https://maps.googleapis.com/maps/api/staticmap?' + 'key=' + GOOGLE_API_CLIENT_KEY + '&center=' + this.escape(this.reference.mapQuery) + '&maptype=' + this.escape(this.reference.mapType) + '&size=' + width + 'x' + height + '&markers=color:red|' + this.escape(this.reference.mapQuery);
    }
  };


  MapBlock.prototype.providerIconUrl = function() {
    return '//www.google.com/images/branding/product/ico/maps_32dp.ico';
  };


  MapBlock.prototype.soloModeLocation = 'overlay';
  MapBlock.prototype.soloModeTemplate = 'display_map_section';
  MapBlock.prototype.listModeItemTemplate = 'preview_map_section';
  MapBlock.prototype.portraitListModeItemTemplate = 'portrait_preview_map_section';
  MapBlock.prototype.annotationAllowed = true;
  MapBlock.prototype.countListModeViewAsRead = true;
  MapBlock.prototype.searchList = false;
  MapBlock.prototype.searchListTemplate = null;
  MapBlock.prototype.searchSoloTemplate = 'create_map_section';
  MapBlock.prototype.homepagePreview = false;
  MapBlock.prototype.homepagePreviewTemplate = null;

  return MapBlock;

})(ContextBlock);

TextBlock = (function (_super) {
  __extends(TextBlock, _super);

  function TextBlock(doc) {
    TextBlock.__super__.constructor.call(this, doc);
    this.type = 'text';
    if (!this.source) {
      this.source = 'plaintext';
    }
  }

  TextBlock.prototype.longSnippet = function () {
    var maxLength;
    maxLength = 40;
    if (this.content.length <= maxLength) {
      return this.content;
    } else {
      return this.content.slice(0, maxLength) + '...';
    }
  };

  TextBlock.prototype.anchorMenuSnippet = function () {
    return this.content;
  };

  TextBlock.prototype.providerName = function() {
    return 'Comment'
  };

  TextBlock.prototype.providerIconUrl = function() {
    return '/images/free_text_icon.svg'
  };


  TextBlock.prototype.soloModeLocation = 'sidebar';
  TextBlock.prototype.soloModeTemplate = 'display_text_section';
  TextBlock.prototype.listModeItemTemplate = 'preview_text_section';
  TextBlock.prototype.portraitListModeItemTemplate = 'portrait_preview_text_section';
  TextBlock.prototype.annotationAllowed = false;
  TextBlock.prototype.countListModeViewAsRead = false;
  TextBlock.prototype.searchList = false;
  TextBlock.prototype.searchListTemplate = null;
  TextBlock.prototype.searchSoloTemplate = 'create_text_section';
  TextBlock.prototype.homepagePreview = true;
  TextBlock.prototype.homepagePreviewTemplate = 'homepage_preview_text_section';

  return TextBlock;

})(ContextBlock);

PollBlock = (function (_super) {
  __extends(PollBlock, _super);

  function PollBlock(doc) {
    PollBlock.__super__.constructor.call(this, doc);
    this.type = 'poll';
    if (!this.source) {
      this.source = 'pie_poll';
    }
  }

  PollBlock.prototype.longSnippet = function () {
    var maxLength;
    maxLength = 40;
    if (this.content.length <= maxLength) {
      return this.content;
    } else {
      return this.content.slice(0, maxLength) + '...';
    }
  };

  PollBlock.prototype.anchorMenuSnippet = function () {
    return this.content;
  };

  PollBlock.prototype.providerName = function() {
    return 'Poll'
  };

  PollBlock.prototype.providerIconUrl = function() {
    return '/images/poll_icon.svg'
  };


  PollBlock.prototype.soloModeLocation = null; //'sidebar';
  PollBlock.prototype.soloModeTemplate = 'display_poll_section';
  PollBlock.prototype.listModeItemTemplate = 'preview_poll_section';
  PollBlock.prototype.portraitListModeItemTemplate = 'portrait_preview_poll_section';
  PollBlock.prototype.annotationAllowed = false;
  PollBlock.prototype.countListModeViewAsRead = false;
  PollBlock.prototype.searchList = false;
  PollBlock.prototype.searchListTemplate = null;
  PollBlock.prototype.searchSoloTemplate = 'create_poll_section';
  PollBlock.prototype.homepagePreview = false;
  PollBlock.prototype.homepagePreviewTemplate = null; //'homepage_preview_poll_section';

  return PollBlock;

})(ContextBlock);

LinkBlock = (function (_super) {
  __extends(LinkBlock, _super);

  function LinkBlock(doc) {
    LinkBlock.__super__.constructor.call(this, doc);
    this.type = 'link';
  }

  LinkBlock.prototype.title = function () {
    return this.reference.title || this.reference.originalUrl;
  };

  LinkBlock.prototype.linkDescription = function () {
    return this.reference.description || '';
  };

  LinkBlock.prototype.thumbnailUrl = function () {
    return this.reference.thumbnailUrl || '//res.cloudinary.com/fold/image/upload/v1/static/LINK_SQUARE.svg';
  };

  LinkBlock.prototype.imageOnLeft = function () {
    return !this.reference.thumbnailUrl || (this.reference.thumbnailWidth / this.reference.thumbnailHeight) <= 1.25;
  };

  LinkBlock.prototype.url = function () {
    return this.reference.url || this.reference.originalUrl;
  };

  LinkBlock.prototype.providerUrl = function () {
    return this.reference.providerUrl;
  };

  LinkBlock.prototype.providerTruncatedUrl = function () {
    return this.reference.providerUrl.replace(/(https?:\/\/)?(www\.)?/, "");
  };

  LinkBlock.prototype.anchorMenuSnippet = function () {
    return this.title();
  };


  LinkBlock.prototype.providerName = function () {
    return 'Link';
  };

  LinkBlock.prototype.providerIconUrl = function() {
    return '/images/link_icon.svg'
  };

  LinkBlock.prototype.hoverIconTemplate = function(){
    return 'link_hover_icon'
  };

  LinkBlock.prototype.soloModeLocation = null;
  LinkBlock.prototype.soloModeTemplate = null;
  LinkBlock.prototype.listModeItemTemplate = 'display_link_section';
  LinkBlock.prototype.portraitListModeItemTemplate = 'portrait_display_link_section';
  LinkBlock.prototype.annotationAllowed = true;
  LinkBlock.prototype.countListModeViewAsRead = true;
  LinkBlock.prototype.searchList = false;
  LinkBlock.prototype.searchListTemplate = null;
  LinkBlock.prototype.searchSoloTemplate = 'create_link_section';
  LinkBlock.prototype.homepagePreview = false;
  LinkBlock.prototype.homepagePreviewTemplate = null;

  return LinkBlock;

})(ContextBlock);

if(Meteor.isClient){
  var cleanNewsHtmlOptions = {
    allowedTags: ['p'], // only allow p
    format: false,
    removeAttrs: ['class', 'id']
  };

  window.cleanNewsHtml = function(html){
    return $.htmlClean(html, cleanNewsHtmlOptions);
  };
}

NewsBlock = (function (_super) {
  __extends(NewsBlock, _super);

  function NewsBlock(doc) {
    NewsBlock.__super__.constructor.call(this, doc);
    this.type = 'news';
  }

  NewsBlock.prototype.title = function () {
    return this.reference.title || this.reference.originalUrl;
  };

  NewsBlock.prototype.introduction = function () {
    return this.reference.description || '';
  };

  NewsBlock.prototype.html = function () {
    return cleanNewsHtml(this.reference.content);
  };

  NewsBlock.prototype.text = function () {
    return $($.parseHTML(this.html())).text();
  };

  NewsBlock.prototype.headerImageUrl = function () {
    return this.reference.topImage ? this.reference.topImage.url : null;
  };

  NewsBlock.prototype.providerName = function () {
    return this.reference.providerName;
  };

  NewsBlock.prototype.providerIconUrl = function () {
    return this.reference.providerIconUrl;
  };

  NewsBlock.prototype.primaryAuthor = function () {
    return this.reference.primaryAuthor;
  };
  //
  //NewsBlock.prototype.imageOnLeft = function () {
  //  return !this.reference.thumbnailUrl || (this.reference.thumbnailWidth / this.reference.thumbnailHeight) <= 1.25;
  //};

  NewsBlock.prototype.url = function () {
    return this.reference.url || this.reference.originalUrl;
  };

  //NewsBlock.prototype.providerUrl = function () {
  //  return this.reference.providerUrl;
  //};

  NewsBlock.prototype.providerTruncatedUrl = function () {
    return (this.reference.url || this.reference.originalUrl).replace(/(https?:\/\/)?(www\.)?/, "").replace(/\/.*/, "");
  };

  NewsBlock.prototype.anchorMenuSnippet = function () {
    return this.title();
  };

  NewsBlock.prototype.publicationDate = function(){
    if(this.reference.publishedMs){
      return this.reference.publishedOffset ? new Date(this.reference.publishedMs + this.reference.publishedOffset) : new Date(this.reference.publishedMs);
    }
  };

  NewsBlock.prototype.soloModeLocation = 'sidebar';
  NewsBlock.prototype.soloModeTemplate = 'display_news_section';
  NewsBlock.prototype.listModeItemTemplate = 'preview_news_section';
  NewsBlock.prototype.portraitListModeItemTemplate = 'portrait_preview_news_section';
  NewsBlock.prototype.annotationAllowed = true;
  NewsBlock.prototype.countListModeViewAsRead = false;
  NewsBlock.prototype.searchList = false;
  NewsBlock.prototype.searchListTemplate = null;
  NewsBlock.prototype.searchSoloTemplate = 'create_news_section';
  NewsBlock.prototype.homepagePreview = true;
  NewsBlock.prototype.homepagePreviewTemplate = 'homepage_preview_news_section';

  return NewsBlock;

})(ContextBlock);
