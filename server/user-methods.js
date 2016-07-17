var TWITTER_API_KEY = process.env.TWITTER_API_KEY || Meteor.settings.TWITTER_API_KEY;
var TWITTER_API_SECRET = process.env.TWITTER_API_SECRET || Meteor.settings.TWITTER_API_SECRET;
var KEEN_PROJECT_ID =  process.env.KEEN_PROJECT_ID || Meteor.settings.KEEN_PROJECT_ID;
var KEEN_MASTER_KEY =  process.env.KEEN_MASTER_KEY || Meteor.settings.KEEN_MASTER_KEY;

var Twit = Meteor.npmRequire('twit');
var Keen = Meteor.npmRequire('keen-js');

/* KEEN analytics testing DEFUNCT FOR DELETION
var scopedKey = Keen.utils.encryptScopedKey(KEEN_MASTER_KEY, {
  "allowed_operations": ["read"],
  "filters": [{
    "property_name": "userPathSegment",
    "operator": "eq",
    "property_value": "dwanderton"
  }]
});

// Do something with this new scoped key
var client2 = new Keen({
  projectId: KEEN_PROJECT_ID,
  readKey: scopedKey
});

setTimeout(function(){
  var extraction = new Keen.Query("count", {
    event_collection: "View stream",
    timeframe: "this_14_days"
  });

  // Send query
  client2.run(extraction, function(err, response){
    // if (err) handle the error
    console.log(err);
    console.log(response);
    //console.log('result is: ', response.result);
  });
},10000);

*/

var makeTwitterCall = function (apiCall, params) {
  var res;
  var user = Meteor.user();
  var client = new Twit({
    consumer_key: TWITTER_API_KEY,
    consumer_secret: TWITTER_API_SECRET,
    access_token: user.services.twitter.accessToken,
    access_token_secret: user.services.twitter.accessTokenSecret
  });

  var twitterResultsSync = Meteor.wrapAsync(client.get, client);
  try {
    res = twitterResultsSync(apiCall, params);
  }
  catch (err) {
    if (err.statusCode !== 404) {
      throw err;
    }
    res = {};
  }
  return res;
};

Meteor.methods({
  createKeenScopedKey(){
    var user = Meteor.user();
    if(!user.keenScopedKey){
      var username = user.username;
      var scopedKey = Keen.utils.encryptScopedKey(KEEN_MASTER_KEY, {
        "allowed_operations": ["read"],
        "filters": [{
          "property_name": "userPathSegment",
          "operator": "eq",
          "property_value": username
        }]
      });
      return Meteor.users.update({
          _id: user._id
      }, {
        $set: {
          "keenScopedKey": scopedKey
        }
      });
    }
    return;
  },
  updateInitialTwitterUserInfo (userInfo) {
    check(userInfo, Object);

    var user = Meteor.user();
    if (!user.tempUsername) {
      return
    }
    var username = userInfo.username,
        email = userInfo.email;

    if (!email) {
      throw new Meteor.Error('Please enter your email');
    }
    check(username, String);
    check(email, String);


    checkUserSignup(username, email);
    //checkSignupCode(userInfo.signupCode);

    //get twitter info
    var res;
    if (user.services.twitter) {
      var twitterParams = {
        user_id: user.services.twitter.id
      };
      try {
        res = makeTwitterCall("users/show", twitterParams);
      }
      catch (err) {
        res = {};
      }
    }

    var bio = (res && res.description) ? res.description : "";

    return Meteor.users.update({
      _id: this.userId
    }, {
      $set: {
        "profile.name": userInfo.name || username,
        "username": username,
        "profile.bio": bio
      },
      $unset: {"tempUsername": ""},
      $push: {
        "emails": {"address": userInfo.email, "verified": false}
      }
    });
  },
  setBioFromTwitter () {
    var user = Meteor.user();
    if (user && user.profile && user.services.twitter) {
      var res;
      var twitterParams = {
        user_id: user.services.twitter.id
      };
      res = makeTwitterCall("users/show", twitterParams);

      var bio = res.description;

      if (bio) {
        return Meteor.users.update({
          _id: this.userId
        }, {
          $set: {
            "profile.bio": bio
          }
        });
      }
    }
  },
  unsubscribe (emailType){
    check(emailType, String);
    return Meteor.users.update({
      _id: this.userId
    }, {
      $addToSet: {
        "unsubscribes": emailType
      }
    });
  },
  resubscribe (emailType){
    check(emailType, String);
    return Meteor.users.update({
      _id: this.userId
    }, {
      $pull: {
        "unsubscribes": emailType
      }
    });
  }
});
