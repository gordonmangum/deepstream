# Deepstream

## Getting Started
To start, run: `./start`. 

You'll want `elasticsearch` running in another window. 

If you don't have it installed, `./start` will guide you through that process.

To reset the database, run: `./reset`


## Hosting Deepstream

### Heroku Instructions

There should be 1 `stream_worker` dyno

To rebuild the elasticsearch index in production, use the command
`heroku run reset_es_worker`

## Whitelisted Services

Currently Deepstreams can be complemented by supported providers of embedable streaming and video services.

Supported providers currently:

- Facebook(embed code)
- livestream.com (embed code)
- Periscope (url)
- SoundCloud (embed code)
- Tunein Radio (embed code)
- Ustream (embed code)
- Vimeo (embed code)
- Meerkat (username)
- Twitcast (username)
- Vine (embed code)
