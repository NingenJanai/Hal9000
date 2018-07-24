module.exports = class HalConfig {
    constructor() {
        try {
            let hal_config = require('./hal.config.json');

            this.BOT_TOKEN = hal_config.BOT_TOKEN;
            this.CHANNEL_ID_TRIVIA = hal_config.CHANNEL_ID_TRIVIA;
            this.MONGO_DB = hal_config.MONGO_DB;
            this.THE_MOVIE_DB = hal_config.THE_MOVIE_DB;
        } catch (e) {
            this.BOT_TOKEN = process.env.BOT_TOKEN;
            this.CHANNEL_ID_TRIVIA = process.env.CHANNEL_ID_TRIVIA;
            this.MONGO_DB = process.env.MONGO_DB;
            this.THE_MOVIE_DB = process.env.THE_MOVIE_DB;
        }
    }
}
