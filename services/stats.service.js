const _ = require('lodash');

const Message = require('../types/message');

const BaseService = require('./base.service');
const DBService = require('./db.service');

module.exports = class StatsService extends BaseService {
    constructor(MONGO_DB) {
        super();
        this.db = new DBService(MONGO_DB);
    }

    getRanking(channelID, users) {
        this.db.getRankingData().subscribe(res => {
            let message = new Message(channelID, `**RANKING:**\n`);
            res.forEach((it) => {
                message.content += `\n${this.getUsername(users, it._id)}: **${it.points}**`;
            });

            if (this.onMessage$) this.onMessage$.next(message);
        });
    }

    getTournamentRanking(channelID, tournament_id, users) {
        this.db.getTournamentRankingData(tournament_id).subscribe(res => {
            let message = new Message(channelID, `**TOURNAMENT RANKING:**\n`);
            res.forEach((it) => {
                message.content += `\n${this.getUsername(users, it._id)}: **${it.points}**`;
            });

            if (this.onMessage$) this.onMessage$.next(message);
        });
    }

    getUsername(users, id) {
        let user = users.get(id);
        return user.username;
    }
}