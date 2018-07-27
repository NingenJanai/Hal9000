# HAL 9000
Discord bot about movies and TV shows

- Trivia from https://opentdb.com/ with the score tracking in a Mongo Database

- Information display about persons, movies and tv shows from https://www.themoviedb.org/ and https://www.omdbapi.com/

- Movie quote display from https://market.mashape.com/andruxnet/random-famous-quotes

## Config

The bot will look for its config in a file called hal.config.json or if the file doesn't exists will look into the env variables.

### hal.config.json

```
{
   "BOT_TOKEN": "YOUR-BOT-TOKEN",
   "MONGO_DB": "MONGO-CONNECTION-STRING",
   "THE_MOVIE_DB": "THE-MOVIE-DB-API-KEY",
   "MASHAPE": "YOUR-MASHAPE-API-KEY"
   "OMDB": "YOUR-OMDB-API-KEY",
   "IGDB": "YOUR-IGDB-API-KEY"
}
```

### env
```
process.env.BOT_TOKEN = "YOUR-BOT-TOKEN";
process.env.MONGO_DB = "MONGO-CONNECTION-STRING"
process.env.THE_MOVIE_DB = "THE-MOVIE-DB-API-KEY"
process.env.MASHAPE = "YOUR-MASHAPE-API-KEY"
process.env.OMDB = "YOUR-OMDB-API-KEY"
process.env.IGDB = "YOUR-IGDB-API-KEY"
```

## Commands

Commands can only be run on the channels that have access to them, the configuration of the commands is kept on a collection in the Mongo database with the following format:

```
[
  {
    "name": "!help",
    "text": "Use **!trivia** or **!trivia** *category* to start a new trivia question *use* **!help-trivia** *to see the available categories*.\nAfter the category is set **!trivia** will remember the last category.\nUse **!answer** *number* to answer and **!stats** to see the current scores.\n**!trivia** command can only be used every 10 seconds.\nUse **!tournament** *category* *size* to start a new tournament *(max size is 50)*.",
    "channels": [ "CHANNEL-ID" ]
  },
  {
    "name": "!help trivia",
    "channels": [ "CHANNEL-ID" ]
  },
  {
    "name": "!help",
    "text": "Use **!person** *query* to search for a person.\nUse **!movie** *query* to search for a movie.\nUse **!show** *query* to search for a tv show.\nUse **!quote** to get a random movie quote.",
    "channels": [ "*" ]
  },
  {
    "name": "!cookies",
    "embed": {
      "image": {
        "url": "IMAGE-URL"
      }
    },
    "channels": [ "*" ]
  },
  {
    "name": "!trivia",
    "channels": [ "CHANNEL-ID" ]
  },
  {
    "name": "!answer",
    "channels": [ "CHANNEL-ID" ]
  },
  {
    "name": "!tournament",
    "text":  "The tournament will start in 60 seconds, players can join by using **!join tournament**.",
    "channels": [ "CHANNEL-ID" ]
  },
  {
    "name": "!join tournament",
    "channels": [ "CHANNEL-ID" ]
  },
  {
    "name": "!stats",
    "channels": [ "CHANNEL-ID" ]
  },
  {
    "name": "!person",
    "channels": [ "*" ]
  },
  {
    "name": "!movie",
    "channels": [ "*" ]
  },
  {
    "name": "!show",
    "channels": [ "*" ]
  },
  {
    "name": "!quote",
    "channels": [ "*" ]
  }
]
```
