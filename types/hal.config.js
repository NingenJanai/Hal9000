import fs from 'fs/promises';

export default class HalConfig {
    static async getConfig() {
        try {
            var hal_config = await fs.readFile('./hal.config.json');
            return JSON.parse(hal_config);
        } catch {
            return {
                BOT_TOKEN : process.env.BOT_TOKEN,
                CHANNEL_ID_TRIVIA : process.env.CHANNEL_ID_TRIVIA,
                MONGO_DB : process.env.MONGO_DB,
                THE_MOVIE_DB : process.env.THE_MOVIE_DB,
                OMDB : process.env.OMDB,
                MASHAPE : process.env.MASHAPE,
                IGDB : process.env.IGDB
            }
        }
    }
}
