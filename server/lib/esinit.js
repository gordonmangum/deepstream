
esClient = function initES(){
var ES = Meteor.npmRequire('elasticsearch');
var esClient = new ES.Client({
                 host: process.env.ELASTICSEARCH_URL || Meteor.settings.ELASTICSEARCH_URL || "localhost:9200"
});


var ping = Meteor.wrapAsync(esClient.ping, esClient);

ping({
  // ping usually has a 3000ms timeout
  requestTimeout: Infinity,

  // undocumented params are appended to the query string
  hello: "elasticsearch!"
}, function (error) {
  if (error) {
    console.trace('ELASTIC: elasticsearch cluster is down!');
  } else {
    console.log('ELASTIC: All is well');
  }
});

var indexExists = Meteor.wrapAsync(esClient.indices.exists, esClient);
var createIndex = Meteor.wrapAsync(esClient.indices.create, esClient);
var putMapping = Meteor.wrapAsync(esClient.indices.putMapping, esClient);
var putSettings = Meteor.wrapAsync(esClient.indices.putSettings, esClient);
var closeIndex = Meteor.wrapAsync(esClient.indices.close, esClient);
var openIndex = Meteor.wrapAsync(esClient.indices.open, esClient);
var deleteData = Meteor.wrapAsync(esClient.delete, esClient);

function esCreateMapping(json, callback){
	putMapping(json, callback);
}

// if (process.env.NODE_ENV === 'development' && indexExists({index: ES_CONSTANTS.index}) ){
//   console.log("Going to cleanup ES");
//     deleteData({
//       index: ES_CONSTANTS.index,
//       type: "stream",
//       body: {
//         "query":{
//           "match_all": {}
//         }
//       }
//     },function(e, r){
//       if (e)
//       console.log(e);
//       else {
//         console.log("Deleted all ES data");
//       }
//     });
//   }

if (!indexExists({index: ES_CONSTANTS.index})){
  console.log("indexExists function: going to create");
	 createIndex({index: ES_CONSTANTS.index });
   Meteor._sleepForMs(1000);
   closeIndex({index: ES_CONSTANTS.index});
   console.log("indexExists function: going to close index");

   console.log("indexExists function: going to apply settings");

   putSettings({
              index: ES_CONSTANTS.index,
              type: "stream",
              body: {
                "analysis" : {
                  "analyzer" : {
                    "my_ngram_analyzer" : {
                      "tokenizer" : "my_ngram_tokenizer",
                      "filter" : ["standard", "lowercase", "synonym",]
                    }
                  },
                  "tokenizer": {
                    "my_ngram_tokenizer":{
                      "type": "nGram",
                      "min_gram": 2,
                      "max_gram": 15,
                      "token_chars": ["letter", "digit"],
                  }
                },
                  "filter" : {
                    "synonym" : {
                      "type" : "synonym",
                      "synonyms_path" : "analysis/wn_s.pl"
                    }
                  }
                }
              }

              // "body":{
              //     "analysis": {
              //       "analyzer": {
              //         "my_ngram_analyzer": {
              //           "tokenizer": "my_ngram_tokenizer",
              //           "filter": ["standard", "lowercase"]
              //       }
              //     },
              //       "tokenizer": {
              //         "my_ngram_tokenizer":{
              //           "type": "nGram",
              //           "min_gram": 2,
              //           "max_gram": 15,
              //           "token_chars": ["letter", "digit"]
              //         }
              //       }
              //     }
              //   }
            }, function(err, result){
              if(err){
                console.log("ElasticSearch: putSettings: Error");
                console.log(err);
            }
              else {
                console.log("ElasticSearch: putSettings: Success");
                console.log(result);
              }
            });
      Meteor._sleepForMs(1000);
      console.log("indexExists function: going to apply mappings");

      esCreateMapping({
              index: ES_CONSTANTS.index,
              type: "stream",
              "body":{
                "stream":{
                      "_ttl": { // if ttl works we don't need timestamp because the documents will be deleted automatically
                        "enabled" : true,
                        "default" : "3m"
                      },
                      "properties": {
                        "title": {
                          "type": "string",
                          "_boost": 5, // give it more priority
                          "analyzer": "my_ngram_analyzer", //"analyzers" English and more
                        },
                        "broadcaster": {
                          "type": "string",
                          "_boost": 10,
                        },
                        "tags": {
                          "type": "string",
                        },
                        "description":{
                          "type": "string",
                          "analyzer": "my_ngram_analyzer",
                        },
                        "source": {
                          "type": "string",
                        },
                      },
                    },
                  }
            }, function(err, result){
              if(err){
                console.log("ElasticSearch: putMapping: Faild to map data");
                console.log(err);
              }
              else {
                console.log("ElasticSearch: putMapping: Success");
                console.log(result);
              }
            });
    openIndex({index: ES_CONSTANTS.index});
  }

return esClient;
}();
