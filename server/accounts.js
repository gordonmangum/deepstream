checkSignupCode = function(code){
  if (!code || code.toLowerCase().trim() !== 'begin'){
    throw new Meteor.Error("FOLD is open only to select authors ahead of our launch in early April. If you'd like to write a story, please email us at fold@media.mit.edu and ask for the *secret code*");
  }
}

Accounts.validateNewUser(function(user) {
  if (user.username){ // only if an email user. if twitter user will do this later
    checkSignupCode(user.signupCode);
    checkUsername(user.username);
  }
  return true
});

Accounts.onCreateUser(function(options, user) {
 if(!options || !user) {
    throw new Meteor.Error('Error creating user');
  return;
  }

  if (options.profile) {
    user.profile = options.profile;
  } else {
    user.profile = {};
  }

  if (options.signupCode) {
    user.signupCode = options.signupCode;
  }

  if (user.services.twitter) { // twitter signup
    user.tempUsername = user.services.twitter.screenName;
    user.profile.twitterUser = true;
  } else { // email signup
    user.profile.displayUsername = options.username;
  }

  return user;
});

Accounts.onLogin(function(arg){
  var user = arg.user;
  if (user.services && user.services.twitter && user.profile && !user.profile.twitterUser) { // twitter signin when link accounts
    Meteor.users.update({_id: user._id}, {$set: {'profile.twitterUser': true }});
  }
});
