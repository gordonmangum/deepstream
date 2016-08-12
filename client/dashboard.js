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
    var arrayOfKeenCharts= [];
    drawKeenCharts = function(arrayOfChartObjects){
      arrayOfChartObjects.forEach(function(val, index, arr){
        client.draw(val.query, val.element, val.config);
      });
    }
    arrayOfKeenCharts.push({
      query: 
        new Keen.Query("count",{
          eventCollection: "watch page rendered",
          filters: [
            {
              "operator": "not_contains",
              "property_name": "currentRouteName",
              "property_value": "curate"
            }
          ],
          timeframe: "this_30_days",
          timezone: "UTC"
        }),
      element: document.getElementById("chart-01"),
      config: {
        // Custom configuration here
        chartType: "metric",
        colors: ["#108761"],
        title: "Views",

        height: 200,
        chartOptions: {
          chartArea: {
            height: "85%",
            left: "5%",
            top: "5%",
            width: "90%"
          },
          isStacked: true
        }
      }
    });
    
    arrayOfKeenCharts.push({
      query: 
        new Keen.Query("count",{
          eventCollection: "watch page rendered",
          filters: [
            {
              "operator": "not_contains",
              "property_name": "currentRouteName",
              "property_value": "curate"
            }
          ],
          timeframe: "this_30_days",
          interval: "daily",
          timezone: "UTC"
        }),
      element: document.getElementById("chart-02"),
      config: {
        // Custom configuration here
        chartType: "areachart",
        title: false,

        height: 200,
        chartOptions: {
          chartArea: {
            height: "85%",
            left: "5%",
            top: "5%",
            width: "90%"
          },
          isStacked: true
        }
      }
    });
    arrayOfKeenCharts.push({
      query: 
        new Keen.Query("count",{
          eventCollection: "Click context section in list mode",
          filters: [
            {
              "operator": "not_contains",
              "property_name": "currentRouteName",
              "property_value": "curate"
            },
          ],
          timeframe: "this_30_days",
          timezone: "UTC"
        }),
      element: document.getElementById("chart-03"),
      config: {
        // Custom configuration here
        chartType: "metric",
        colors: ["#e8b93a"],
        title: "Card Clicks",

        height: 200,
        chartOptions: {
          chartArea: {
            height: "85%",
            left: "5%",
            top: "5%",
            width: "90%"
          },
          isStacked: true
        }
      }
    });
    arrayOfKeenCharts.push({
      query: 
        new Keen.Query("count",{
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
        }),
      element: document.getElementById("chart-04"),
      config: {
        // Custom configuration here
        chartType: "areachart",
        title: false,

        height: 200,
        chartOptions: {
          chartArea: {
            height: "85%",
            left: "5%",
            top: "5%",
            width: "90%"
          },
          isStacked: true
        }
      }
    });
    arrayOfKeenCharts.push({
      query: 
        new Keen.Query("count", {
          eventCollection: "Click mini-stream to set main stream",
          filters: [
            {
              "operator": "not_contains",
              "property_name": "currentRouteName",
              "property_value": "curate"
            }
          ],
          timeframe: "this_30_days",
          timezone: "UTC"
      }),
      element: document.getElementById("chart-05"),
      config: {
        // Custom configuration here
        chartType: "metric",
        colors: ["#00AF98"],
        title: "Video Clicks",
        height: 200,
        chartOptions: {
          chartArea: {
            height: "85%",
            left: "5%",
            top: "5%",
            width: "90%"
          },
          isStacked: true
        }
      }
    });
    arrayOfKeenCharts.push({
      query: 
        new Keen.Query("count", {
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
      }),
      element: document.getElementById("chart-06"),
      config: {
        // Custom configuration here
        chartType: "areachart",
        title: false,
        height: 200,
        chartOptions: {
          chartArea: {
            height: "85%",
            left: "5%",
            top: "5%",
            width: "90%"
          },
          isStacked: true
        }
      }
    });
    
    drawKeenCharts(arrayOfKeenCharts);

   
  });
});
Template.dashboard.onRendered(function(){});
Template.dashboard.onDestroyed(function(){});