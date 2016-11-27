window.notifyFeature = function(message){
  $.amaran({
      content: {
        message: message,
        color: 'white',
        bgcolor: '#EA1D75' // remix-color
      },
      'position' :'top right',
      theme:'colorful',
      delay: 5000
    }
  );
};

window.notifySuccess = function(message){
  $.amaran({
      content: {
        message: message,
        color: 'white',
        bgcolor: '#1DB259' // action-color
      },
      'position' :'top right',
      theme:'colorful',
      delay: 5000
    }
  );
};

window.notifyCard = function(cardDataObject){
  console.log(cardDataObject);
  $.amaran({
      content: {
        themeName: 'cardNotificationTheme',
        CDO: cardDataObject,
        color: 'white',
        bgcolor: '#4D4D4D' // action-color
      },
      'position' :'top right',
      delay: 5000,
      themeTemplate:function(data){
      return '<div class="card-notification-container context-mini-preview" data-context-id="'+ data.CDO.cardId +' " data-target="#carousel-portrait-context" data-slide-to="2"> <div class="row"> <div class="col-xs-3"><img src="' + data.CDO.image+'"/></div> <div class="col-xs-9" style="padding-left: 0;"><p>' + data.CDO.message + '</p></div> </div> </div>';
      },
      //sticky: true,
      //clearAll: true
    }
  );
};

window.notifyLogin = function(){
  var user = Meteor.user();
  var name = user.profile.name ? user.profile.name.split(' ')[0] : user.profile.username;
  notifySuccess('Welcome ' + name + '!');
};


window.notifyError = function(message){
  $.amaran({
      content: {
        message: message,
        color: 'white',
        bgcolor: '#ff1b0c' // danger-color
      },
      'position' :'top right',
      theme:'colorful',
      delay: 5000
    }
  );
};

window.notifyInfo = function(message){
  $.amaran({
      content: {
        message: message,
        color: 'white',
        bgcolor: '#585094' // panel-color
      },
      'position' :'top right',
      theme:'colorful',
      delay: 5000
    }
  );
};

window.notifyDeploy = function(message, sticky){
  $.amaran({
      content: {
        message: message,
        color: 'white',
        bgcolor: '#585094' // panel-color
      },
      'position' :'top right',
      theme:'colorful',
      sticky: sticky,
      clearAll: true
    }
  );
  $('.amaran').addClass('migration-notification');
};
