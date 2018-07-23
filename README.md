# HAL 9000
Discord bot with movie and tv show trivia from https://opentdb.com/

Score tracking is kept in Mongo DB

## Config

The bot will look for its config in a file called hal.config.json or if the file doesn't exists will look into the env variables.

### hal.config.json

```
{
   "BOT_TOKEN": "YOUR-BOT-TOKEN",
   "CHANNEL_ID_TRIVIA" : ID-OF-THE-CHANNEL-FOR-TRIVIA,
   "MONGO_DB": "MONGO-CONNECTION-STRING"
}
```

### env
```
process.env.BOT_TOKEN = "YOUR-BOT-TOKEN";
process.env.CHANNEL_ID_TRIVIA = ID-OF-THE-CHANNEL-FOR-TRIVIA;
process.env.MONGO_DB = "MONGO-CONNECTION-STRING"
```