# HAL 9000
Discord bot about movies and TV shows

- Trivia about movies and tv shows from https://opentdb.com/ with the score tracking in a Mongo Database

- Information display about persons, movies and tv shows from https://www.themoviedb.org/


## Config

The bot will look for its config in a file called hal.config.json or if the file doesn't exists will look into the env variables.

### hal.config.json

```
{
   "BOT_TOKEN": "YOUR-BOT-TOKEN",
   "CHANNEL_ID_TRIVIA" : ID-OF-THE-CHANNEL-FOR-TRIVIA,
   "MONGO_DB": "MONGO-CONNECTION-STRING",
   "THE_MOVIE_DB": "THE-MOVIE-DB-API-KEY"
}
```

### env
```
process.env.BOT_TOKEN = "YOUR-BOT-TOKEN";
process.env.CHANNEL_ID_TRIVIA = ID-OF-THE-CHANNEL-FOR-TRIVIA;
process.env.MONGO_DB = "MONGO-CONNECTION-STRING"
process.env.THE_MOVIE_DB = "THE-MOVIE-DB-API-KEY"
```