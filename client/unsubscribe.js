Template.unsubscribe.onCreated(function(){
  this.unsubscribed = new ReactiveVar(false);
  this.resubscribed = new ReactiveVar(false);
  Meteor.call('unsubscribe', this.data.emailType(), (err, success) => {
    if(err || !success){
      notifyError('Unsubscribe failed. Please email us at deepstream@media.mit.edu')
    } else {
      this.unsubscribed.set(true);
    }
  })
});

Template.unsubscribe.events({
  'click .resubscribe'  (e, t){
    Meteor.call('resubscribe', t.data.emailType(), (err, success) => {
      if (err) {
        notifyError('Resubscribe failed. Please email us at deepstream@media.mit.edu')
      } else {
        t.resubscribed.set(true);
      }
    })
  }
});

Template.unsubscribe.helpers({
  'unsubscribed'  (){
    return Template.instance().unsubscribed.get();
  },
  'resubscribed'  (){
    return Template.instance().resubscribed.get();
  }
});
