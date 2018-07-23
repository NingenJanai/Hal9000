module.exports = class HalConfig {
    constructor() {
        try {
            let bot_config = require('./hal.config.json');
            this.BOT_TOKEN = bot_config.BOT_TOKEN;
            this.CHANNEL_ID_TRIVIA = bot_config.CHANNEL_ID_TRIVIA;
        } catch (e) {
            this.BOT_TOKEN = process.env.BOT_TOKEN;
            this.CHANNEL_ID_TRIVIA = process.env.CHANNEL_ID_TRIVIA;
        }
    }
}
