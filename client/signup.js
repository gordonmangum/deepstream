Template.signup_form.onCreated(function() {
  this.signupError = new ReactiveVar();
  this.emailError = new ReactiveVar();
  this.nameError = new ReactiveVar();
  this.usernameError = new ReactiveVar();
  this.passwordError = new ReactiveVar();
  this.password2Error = new ReactiveVar();
  this.disableSignup = new ReactiveVar();
});

Template.signup_form.helpers({
  tempUsername () {
    if (Meteor.user()) {
      return Meteor.user().tempUsername;
    }
    return;
  },
  emailUser () {
   return this.emailUser || Session.get('emailUser');
  },
  signupError () {
    return Template.instance().signupError.get();
  },
  emailError () {
    return Template.instance().emailError.get();
  },
  nameError () {
    return Template.instance().nameError.get();
  },
  usernameError () {
    return Template.instance().usernameError.get();
  },
  passwordError () {
    return Template.instance().passwordError.get();
  },
  password2Error () {
    return Template.instance().password2Error.get();
  },
  disableSignup () {
    return Template.instance().disableSignup.get();
  }
});

var checkEmailField =  function(e, t) {
  var email = $('input#signup-email').val();
  email = trimInput(email);

  var result = checkValidEmail(email);
  if (!result.status) {
    t.emailError.set(result.message)
  } else {
    t.emailError.set(false)
  }
};

var checkNameField = function(e, t) {
  var name = $('input#signup-name').val();
  name = trimInput(name);

  var result = checkValidName(name);
  if (!result.status) {
    t.nameError.set(result.message)
  } else {
    t.nameError.set(false)
  }
};

var checkUsernameField = function(e, t) {
  var username = $("#signup-username").val();
  username = trimInput(username);

  var result = checkValidUsername(username);
  if (!result.status) {
    t.usernameError.set(result.message)
  } else {
    t.usernameError.set(false)
  }
};

var checkPasswordFields = function(e, t) {
  var p1 = $("#signup-password").val();
  var p2 = $("#signup-password2").val();

  var result = checkValidPassword(p1);
  if (!result.status) {
    t.passwordError.set(result.message);
  } else {
    t.passwordError.set(false);
  }

  var result2 = checkValidPasswordConfirmation(p1, p2);
  if (!result2.status) {
    t.password2Error.set(result2.message);
  } else {
    t.password2Error.set(false);
  }
};

var enterPress = function(e){
  return e.keyCode === 13
};

Template.signup_form.events({
  'blur input#signup-email': checkEmailField,
  'keypress input#signup-email' (e,t) {
    if (enterPress(e)) {
      checkEmailField(e, t);
    }
  },
  'blur input#signup-name': checkNameField,
  'keypress input#signup-name' (e,t) {
    if (enterPress(e)) {
      checkNameField(e, t);
    }
  },
  'blur input#signup-username': checkUsernameField,
  'keypress input#signup-username' (e,t) {
    if (enterPress(e)) {
      checkUsernameField(e, t);
    }
  },
  'blur input#signup-password, blur input#signup-password2': checkPasswordFields,
  'keypress input#signup-password, blur input#signup-password2' (e,t) {
    if (enterPress(e)) {
      checkPasswordFields(e, t);
    }
  },
  'submit #signup-form' (e, t) {
    e.preventDefault();

    if(t.disableSignup.get()){
      return
    } else {
      t.disableSignup.set(true)
    }

    if (t.emailError.get() || t.usernameError.get() || t.passwordError.get()|| t.password2Error.get()) {
      t.signupError.set('Please fix errors in required fields');
      t.disableSignup.set(false);
      return;
    } else {
      t.signupError.set(null);
    }

    var inputs = $('#signup-form').serializeArray();
    var userInfo = {};
    _.each(inputs, function (input) {
      key = input['name'];
      value = input['value'];
      userInfo[key] = value;
    });

    if (Meteor.user()) { // if just finishing signup and already created a user via twitter
      Meteor.call('updateInitialTwitterUserInfo', userInfo, function (err) {
        t.disableSignup.set(false);
        if (err) {
          t.signupError.set(err.reason || err.error);
        } else {
          if(!Session.get('redirectAfterLogin')){
            returnFromSignIn();
          }
          notifyLogin();
        }
      });
    } else { // if email user
      Accounts.createUser({
        email: userInfo.email,
        password: userInfo.password,
        username: userInfo.username,
        signupCode: userInfo.signupCode,
        profile : {
          "name" : userInfo.name
        }
      }, function(err) {
        t.disableSignup.set(false);
        if (err) {
          if (err.error === 'username') {
            t.usernameError.set(err.reason || err.error);
          } else if (err.error === 'email') {
            t.emailError.set(err.reason || err.error);
          } else {
            t.signupError.set(err.reason || err.error);
          }

        } else {
          analytics.track('Click signup with email');
          returnFromSignIn();
          notifyLogin();
        }
      });
    }
  }
});
