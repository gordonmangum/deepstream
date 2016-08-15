var __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };


SimpleSchema.debug = true; // TODO Remove after launch

if(!this.Schema){
  Schema = {};
}

var analyticsSchema = new SimpleSchema({
  byConnection: {
    type: Number,
    defaultValue: 0
  },
  byIP: {
    type: Number,
    defaultValue: 0
  },
  byId: {
    type: Number,
    defaultValue: 0
  },
  total: {
    type: Number,
    defaultValue: 0
  }
});

this.DeepstreamStats = new Mongo.Collection("story_stats");


var deepAnalyticsSchema = new SimpleSchema({
  uniqueViewersByConnection: {
    type: [String],
    defaultValue: []
  },
  uniqueViewersByIP: {
    type: [String],
    defaultValue: []
  },
  uniqueViewersByUserId: {
    type: [String],
    defaultValue: []
  },
  all: {
    type: [Object],
    blackbox: true
  }
});

Schema.DeepstreamStats = new SimpleSchema({
  streamId: {
    type: String
  },
  streamShortId: {
    type: String
  },
  deepAnalytics: {
    type: Object,
    optional: true
  },
  'deepAnalytics.views': {
    type: deepAnalyticsSchema
  },
  'deepAnalytics.shares': {
    type: deepAnalyticsSchema
  },
  analytics: {
    type: analyticsSchema,
    optional: true
  },
  'analytics.views': {
    type: analyticsSchema
  },
  'analytics.shares': {
    type: analyticsSchema
  }
});

this.DeepstreamStats.attachSchema(Schema.DeepstreamStats);


Schema.ContextReferenceProfile = new SimpleSchema({
  id: {
    type: String,
    optional: true
  },

  username: {
    type: String,
    optional: true
  },

  userId: {
    type: String,
    optional: true
  },

  source: {
    type: String,
    optional: true
  },

  artworkUrl: {
    type: String,
    optional: true
  },

  previewImage: {
    type: String,
    optional: true
  },

  title: {
    type: String,
    optional: true,
    defaultValue: ''
  },

  description: {
    type: String,
    optional: true,
    defaultValue: ''
  },
  fileExtension: {
    type: String,
    optional: true
  },

  // Youtube
  noPreview: {
    type: Boolean,
    optional: true
  },

  // Image

  flickrOwnerId: {
    type: String,
    optional: true
  },
  flickrFarm: {
    type: String,
    optional: true
  },
  flickrSecret: {
    type: String,
    optional: true
  },
  flickrServer: {
    type: String,
    optional: true
  },
  lgUrl:{
    type: String,
    optional:true
  },
  uploadDate: {
    type: Date,
    optional: true
  },
  ownerName: {
    type: String,
    optional: true
  },

  hasWebM: {
    type: Boolean,
    optional: true
  },

  hasMP4: {
    type: Boolean,
    optional: true
  },

  // Image upload, Imgur
  width: {
    type: Number,
    optional: true
  },
  height: {
    type: Number,
    optional: true
  },

  // twitter
  retweet: {
    type: String,
    optional: true
  },
  creationDate: {
    type: Date,
    optional: true
  },
  username: {
    type: String,
    optional: true
  },
  screenname: {
    type: String,
    optional: true
  },
  userId: {
    type: String,
    optional: true
  },
  userPic: {
    type: String,
    optional: true
  },
  text: {
    type: String,
    optional: true
  },
  entities: {
    type: Object,
    optional: true,
    blackbox: true
  },
  extendedEntities: {
    type: Object,
    optional: true,
    blackbox: true
  },
  retweetedStatus: {
    type: Object,
    optional: true,
    blackbox: true
  },

  // Link
  title: { type: String, optional: true },
  thumbnailUrl: { type: String, optional: true },
  url: { type: String, optional: true },
  originalUrl: { type: String, optional: true },
  providerName: { type: String, optional: true },
  providerUrl: { type: String, optional: true },
  authorUrl: { type: String, optional: true },
  authorName: { type: String, optional: true },
  thumbnailHeight: { type: Number, optional: true },
  thumbnailWidth: { type: Number, optional: true },
  embedlyType: { type: String, optional: true },
  imageOnLeft: { type: Boolean, optional: true },

  // Rich or Extract
  html: { type: String, optional: true },


  // Map

  mapQuery: {
    type: String,
    optional: true
  },
  mapType: {
    type: String,
    allowedValues: ['roadmap', 'satellite'],
    defaultValue: 'satellite',
    optional: true,
    autoform: {
      afFieldInput: {
        firstOption: false,
        options: 'allowed'
      }
    }
  },

  // Embedly extract (news)
  content: {
    type: String,
    optional: true
  },
  data: {
    type: [Object],
    minCount: 2,
    maxCount: 5,
    optional: true
  },
  'data.$.name': {
    type: String
  },
  'data.$.value':{
    type: String
  },
  providerIconUrl: {
    type: String,
    optional: true
  },
  publishedMs: {
    type: Number,
    optional: true
  },
  publishedOffset: {
    type: Number,
    optional: true
  },
  'topImage.url': {
    type: String,
    optional: true
  },
  'topImage.height': {
    type: Number,
    optional: true
  },
  'topImage.width': {
    type: Number,
    optional: true
  },
  'primaryAuthor': {
    type: String,
    optional: true
  },
  'primaryAuthorUrl': {
    type: String,
    optional: true
  }
});

Schema.ContextBlocks = new SimpleSchema({
  authorId: {
    type: String
  },
  streamShortId:{
    type: String
  },
  type: {
    type: String
  },
  source: {
    type: String,
    optional: true
  },
  fromEmbedly: {
    type: Boolean,
    optional: true
  },
  version: {
    type: String,
    optional: true
  },
  savedAt: {
    type: Date,
    optional: true
  },
  addedAt: {
    type: Date
  },
  videoMarker: {
    type: String,
    optional: true
  },
  deleted: {
    type: Boolean,
    optional: true
  },
  deletedAt: {
    type: Date,
    optional: true
  },
  fullDetails: {
    type: Object,
    optional: true,
    blackbox: true
  },
  annotation: {
    type: String,
    optional: true
  },
  content: {
    type: String,
    trim: false,
    optional: true
  },
  data: {
    type: [Object],
    minCount: 2,
    maxCount: 5,
    optional: true
  },
  'data.$.name': {
    type: String
  },
  'data.$.value':{
    type: Number
  },
  reference: {
    type: Schema.ContextReferenceProfile,
    optional: true
  },
  searchQuery: {
    type:String,
    optional:true
  },
  searchOption: {
    type: String,
    optional:true
  },
  // suggested context
  suggestionStatus: {
    type: String,
    allowedValues: ['pending', 'approved', 'rejected'],
    optional:true
  },
  suggestedAt: {
    type: Date,
    optional:true
  },
  suggestedBy: {
    type: String,
    optional:true
  },
  suggestedByUsername: {
    type: String,
    optional:true
  },
  moderatedAt: {
    type: Date,
    optional:true
  },
  moderatedBy: {
    type: String,
    optional:true
  },
  moderatedByUsername: {
    type: String,
    optional:true
  },
  idInDeepstream: {
    type: String,
    optional:true
  },
});

this.ContextBlocks = new Mongo.Collection("context_blocks", {
  transform (doc) {
    return newTypeSpecificContextBlock(doc);
  }
});

this.ContextBlocks.attachSchema(Schema.ContextBlocks);

this.SuggestedContextBlocks = new Mongo.Collection("suggested_context_blocks", {
  transform (doc) {
    return newTypeSpecificContextBlock(doc);
  }
});

this.SuggestedContextBlocks.attachSchema(Schema.ContextBlocks);



this.Streams = new Mongo.Collection("streams");

Schema.Streams = new SimpleSchema({
  _id: {
    type: String
  },
  addedAt: {
    type: Date
  },
  deletedAt: {
    type: Date,
    optional: true
  },
  authorId: {
    type: String,
    optional:true // seemed to be crashing out removeStreamFromStream 
  },
  type: {
    type: String
  },
  source: {
    type: String,
    optional: true
  },
  live: {
    type: Boolean
  },
  searchQuery: {
    type:String,
    optional:true
  },
  searchOption: {
    type: String,
    optional:true
  },
  fullDetails: {
    type: Object,
    optional: true,
    blackbox: true
  },
  reference: {
    type: new SimpleSchema({
      id: {
        type: String
      },
      title: {
        type: String
      },
      description: {
        type: String,
        optional: true
      },
      tags: {
        type: [Object],
        blackbox: true,
        optional: true
      },
      username: {
        type: String,
        optional: true // youtube sometimes doesn't have channel title, which we call username
      },
      url: {
        type: String,
        optional: true // only used by whitelist embeds
      },
      userId: {
        type: String,
        optional: true
      },
      channelName: {
        type: String,
        optional: true
      },
      channelId: {
        type: String,
        optional: true
      },
      creationDate: {
        type: Date
      },
      lastStreamedAt: {
        type: Date,
        optional: true
      },
      noPreview: {
        type: Boolean,
        optional: true
      },
      previewUrl: {
        type: String,
        optional: true
      },
      thumbnailUrl: {
        type: String,
        optional: true
      },
      totalViews: {
        type: Number,
        optional: true
      },
      currentViewers:{
        type: Number,
        optional: true
      }
    }),
    optional: true
  }
});


this.Deepstreams = new Mongo.Collection("deepstreams", {
  transform (doc) {
    return new Deepstream(doc);
  }
});


Schema.Deepstreams = new SimpleSchema({
  shortId: {
    type: String
  },
  userPathSegment: {
    type: String
  },
  replayEnabled: {
    type: Boolean,
    defaultValue: false
  },
  streamPathSegment: {
    type: String
  },
  activeStreamId: {
    type: String,
    optional: true
  },
  creationStep: {
    type: String,
    allowedValues: CREATION_STEPS,
    optional: true
  },
  mainCuratorId: {
    type: String
  },
  curatorIds: {
    type: [String]
  },
  curatorName: {
    type: String
  },
  curatorUsername: {
    type: String
  },
  description: {
    type: String,
    defaultValue: ''
  },
  title: {
    type: String,
    defaultValue: ''
  },
  savedAt: {
    type: Date
  },
  live: {
    type: Boolean,
    defaultValue: true
  },
  deleted: {
    type: Boolean,
    defaultValue: false
  },
  deletedAt: {
    type: Date,
    optional: true
  },
  onAir: {
    type: Boolean,
    defaultValue: false
  },
  onAirSince: {
    type: Date,
    optional: true
  },
  firstOnAirAt: {
    type: Date,
    optional: true
  },
  lastOnAirAt: {
    type: Date,
    optional: true
  },
  directorMode: {
    type: Boolean,
    defaultValue: false
  },
  createdAt: {
    type: Date,
    autoValue () {
      if (this.isInsert) {
        return new Date;
      } else if (this.isUpsert) {
        return {$setOnInsert: new Date};
      } else {
        this.unset();
      }
    },
    optional: true // optional because only added this field just before launch
  },
  contextBlocks: {
    type: [new SimpleSchema({
      _id: {
        type: String
      },
      addedAt: {
        type: Date
      },
      rank: {
        type: Number
      },
      type: {
        type: String
      },
      source: {
        type: String
      }
    })],
    defaultValue: [],
    minCount: 0,
    maxCount: 1000
  },
  curatorWebcamStream: {
    type: new SimpleSchema({
        'reference._id': {
          type: String,
          optional: true
        },
        'reference.username': {
          type: String,
          optional: true
        },
        source: {
          type: String,
          optional: true
        },
        type: {
          type: String,
          defaultValue: 'stream'
        }
      }),
    optional: true
  },
  curatorWebcamActive: {
    type: Boolean,
    optional: true
  },
  twitterTimelineId: {
    type: String,
    optional: true
  },
  streams: {
    type: [Schema.Streams],
    defaultValue: [],
    minCount: 0,
    maxCount: 100
  },
  curatorInviteCodes: { // these should never be exposed to the client
    type: [String],
    defaultValue: [],
    minCount: 0,
    maxCount: 100
  },
  deletedContent: {
    type: Object,
    optional: true
  },
  'deletedContent.contextBlocks': {
    type: [Object],  // list of contextblock ids
    minCount: 0,
    maxCount: 1000,
    blackbox: true // TO-DO this is temporary
  },
  'deletedContent.streams': {
    type: [Schema.Streams],
    minCount: 0,
    maxCount: 100
  },
  analytics: {
    type: Object
  },
  'analytics.views': {
    type: analyticsSchema
  },
  'analytics.shares': {
    type: analyticsSchema
  },
  favorited: {
    type: [String],
    defaultValue: []
  },
  favoritedTotal: {
    type: Number,
    defaultValue: 0
  },
  editorsPick: {
    type: Boolean,
    optional: true
  },
  editorsPickAt: {
    type: Date,
    optional: true
  }
});

this.Deepstreams.attachSchema(Schema.Deepstreams);
