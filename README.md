Deepstream
=============

Deepstream is currently under development.

To start, run: `./start`. You'll want `elasticsearch` running in another window. If you don't have it installed, `./start` will guide you through that process.
To reset the database, run: `./reset`


*Heroku Instructions*

There should be 1 `stream_worker` dyno

To rebuild the elasticsearch index in production, use the command
`heroku run reset_es_worker`
