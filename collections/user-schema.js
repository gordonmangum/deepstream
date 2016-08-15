if(!this.Schema){
  Schema = {};
}

Schema.UserProfile = new SimpleSchema({
  name: {
    type: String,
    optional: true,
    min: 2,
    max: 127,
    autoValue () { // trim off whitespace
      if (this.isSet && typeof this.value === "string") {
        return this.value.trim();
      } else {
        this.unset()
      }
    }
  },
  bio: {
    type: String,
    optional: true,
    max: 160,
    autoValue () { // trim off whitespace
      if (this.isSet && typeof this.value === "string") {
        return this.value.trim();
      } else {
        this.unset()
      }
    },
    autoform: {
      rows: 7
    }
  },
  favorites: {
    type: [String],
    optional: true
  },
  profilePicture: {
    type: String,
    optional: true
  }
});

Schema.User = new SimpleSchema({
  username: {
    type: String,
    regEx: /^[a-zA-Z0-9_]*$/,
    min: 3,
    max: 15,
    optional: true,
    autoValue () {
      if (this.isSet && typeof this.value === "string") {
        return this.value.trim();
      } else {
        this.unset()
      }
    }
  },
  keenScopedKey: {
    type: String,
    optional: true
  },
  keenProjectId: {
    type: String,
    optional: true
  },
  tempUsername: {
    type: String,
    optional: true
  },
  emails: {
    type: [Object],
    optional: true
  },
  "emails.$.address": {
    type: String,
    regEx: SimpleSchema.RegEx.Email,
    label: "Email address",
    autoValue () {
      if (this.isSet && typeof this.value === "string") {
        return this.value.toLowerCase();
      } else {
        this.unset();
      }
    },
    autoform: {
      afFieldInput: {
        readOnly: true,
        disabled: true
      }
    }
  },
  "emails.$.verified": {
    type: Boolean
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
    }
  },
  admin: {
    type: Boolean,
    optional: true,
    autoValue (){
      this.unset(); // don't allow to be set from anywhere within the code
    }
  },
  accessPriority: {
    type: Number,
    optional: true
  },
  profile: {
    type: Schema.UserProfile,
    optional: true,
    defaultValue: {}
  },
  services: {
    type: Object,
    optional: true,
    blackbox: true
  },
  unsubscribes: {
    type: [String],
    optional: true
  }
});


Meteor.users.attachSchema(Schema.User);

SimpleSchema.messages({
  "regEx username": "Username may only contain letters, numbers, and underscores"
});
