# Hal9000
Discord bot with movie and tv show trivia

## Config

The bot will look for its config in a file called bot-config.json or if the file doesn't exists will look into the env variables.

### bot-config.json

```
{
   "BOT_TOKEN": "YOUR-BOT-TOKEN",
   "CHANNEL_ID_TRIVIA" : ID-OF-THE-CHANNEL-FOR-TRIVIA
}
```

### env
```
process.env.BOT_TOKEN = "YOUR-BOT-TOKEN";
process.env.CHANNEL_ID_TRIVIA = ID-OF-THE-CHANNEL-FOR-TRIVIA;
```