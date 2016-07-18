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
    var query = new Keen.Query("count_unique", {
      eventCollection: "View stream",
      filters: [
      {
          "operator": "not_contains",
          "property_name": "ip_geo_info.city",
          "property_value": "null"
      }
      ],
      interval: "daily",
      targetProperty: "ip_address",
      timeframe: "this_5_days",
      timezone: "UTC"
    });

    client.draw(query, document.getElementById("chart-01"), {
      // Custom configuration here
      chartType: "areachart",
      title: false,
      width: "auto",
      chartOptions: {
        chartArea: {
          height: "85%",
          left: "5%",
          top: "5%",
          width: "80%"
        },
        isStacked: true
      }
    }); 
  });
});
Template.dashboard.onRendered(function(){});
Template.dashboard.onDestroyed(function(){});