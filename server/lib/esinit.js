var ES = Meteor.npmRequire('elasticsearch');
esClient = new ES.Client({
  hosts: (process.env.ELASTICSEARCH_URL ? process.env.ELASTICSEARCH_URL.split(',') : null) ||
  (Meteor.settings.ELASTICSEARCH_URL ? Meteor.settings.ELASTICSEARCH_URL.split(',') : null) ||
  ["localhost:9200"]
});


ping = Meteor.wrapAsync(esClient.ping, esClient);

ping({
  // ping usually has a 3000ms timeout
  requestTimeout: 30000,

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
var deleteData = Meteor.wrapAsync(esClient.deleteByQuery, esClient);
var deleteIndex = Meteor.wrapAsync(esClient.indices.delete, esClient);


resetES = function () {
  if(indexExists({index: ES_CONSTANTS.index})){
    console.log("indexExists function: going to delete index");
    deleteIndex({index: ES_CONSTANTS.index});
  }

  console.log("indexExists function: going to create");
  createIndex({index: ES_CONSTANTS.index});

  console.log("Opening index");

  openIndex({index: ES_CONSTANTS.index});

  //Meteor._sleepForMs(1000); // if Meteor is crashing here (possible IndexPrimaryShardNotAllocatedException error), uncomment this line until it boots successfully, then comment it back out

  console.log("indexExists function: going to close index");
  closeIndex({index: ES_CONSTANTS.index});
  console.log("indexExists function: going to apply settings");


  var putIndexSuccess = putSettings({
    index: ES_CONSTANTS.index,
    type: "stream",
    body: {
      "analysis": {
        "analyzer": {
          "my_ngram_analyzer": {
            "tokenizer": "my_ngram_tokenizer",
            "filter": ["standard", "lowercase",]// "synonym",]
          }
        },
        "tokenizer": {
          "my_ngram_tokenizer": {
            "type": "nGram",
            "min_gram": 2,
            "max_gram": 15,
            "token_chars": ["letter", "digit"],
          }
        },
      }
    }
  });

  if (putIndexSuccess) {
    console.log("ElasticSearch: putSettings: Success");
    console.log(putIndexSuccess);
  } else {
    console.log("ElasticSearch: putSettings: Error");
  }

  console.log("indexExists function: going to apply mappings");

  var mappingSuccess = putMapping({
    index: ES_CONSTANTS.index,
    type: "stream",
    requestTimeout: 90000,
    "body": {
      "stream": {
        "_ttl": { // if ttl works we don't need timestamp because the documents will be deleted automatically
          "enabled": true
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
            "analyzer": "my_ngram_analyzer", //"analyzers" English and more
          },
          "tags": {
            "type": "string",
            "analyzer": "my_ngram_analyzer", //"analyzers" English and more
          },
          "description": {
            "type": "string",
            "analyzer": "my_ngram_analyzer",
          },
          "source": {
            "type": "string",
          },
        },
      },
    }
  });

  if (mappingSuccess) {
    console.log("ElasticSearch: putMapping: Success");
    console.log(mappingSuccess);
  } else {
    console.log("ElasticSearch: putMapping: Faild to map data");
  }
  openIndex({index: ES_CONSTANTS.index});
};
