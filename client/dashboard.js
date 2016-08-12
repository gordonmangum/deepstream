Template.dashboard.helpers({});
Template.dashboard.events({});
Template.dashboard.onCreated(function(){
  var dashboardReadKey = Meteor.user().keenScopedKey;
  var projectId = Meteor.user().keenProjectId;
  var client = new Keen({
    projectId: projectId,
    readKey: dashboardReadKey
  });
  
  Keen.ready(function(){
    var query = new Keen.Query("count",{
    eventCollection: "watch page rendered",
    filters: [
    {
        "operator": "not_contains",
        "property_name": "currentRouteName",
        "property_value": "curate"
    }
],
    interval: "daily",
    timeframe: "this_30_days",
    timezone: "UTC"
  });
    
    var query2 = new Keen.Query("count", {
    eventCollection: "Click context section in list mode",
    filters: [
    {
        "operator": "not_contains",
        "property_name": "currentRouteName",
        "property_value": "curate"
    },
],
    interval: "daily",
    timeframe: "this_30_days",
    timezone: "UTC"
  });
    
    var query3 = new Keen.Query("count", {
    eventCollection: "Click mini-stream to set main stream",
    filters: [
    {
        "operator": "not_contains",
        "property_name": "currentRouteName",
        "property_value": "curate"
    }
],
    interval: "daily",
    timeframe: "this_30_days",
    timezone: "UTC"
  });
    
      client.draw(query3, document.getElementById("chart-03"), {
      // Custom configuration here
      chartType: "areachart",
      title: false,
      width: "auto",
      height: "450px",
      chartOptions: {
        chartArea: {
          height: "85%",
          left: "5%",
          top: "5%",
          width: "90%"
        },
        isStacked: true
      }
    });
  
    client.draw(query2, document.getElementById("chart-02"), {
      // Custom configuration here
      chartType: "areachart",
      title: false,
      width: "auto",
      height: "450px",
      chartOptions: {
        chartArea: {
          height: "85%",
          left: "5%",
          top: "5%",
          width: "90%"
        },
        isStacked: true
      }
    });

    client.draw(query, document.getElementById("chart-01"), {
      // Custom configuration here
      chartType: "areachart",
      title: false,
      width: "auto",
      height: "450px",
      chartOptions: {
        chartArea: {
          height: "85%",
          left: "5%",
          top: "5%",
          width: "90%"
        },
        isStacked: true
      }
    }); 
  });
});
Template.dashboard.onRendered(function(){});
Template.dashboard.onDestroyed(function(){});