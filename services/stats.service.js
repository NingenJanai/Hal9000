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
                let user = _.find(users, u => u.id == it._id);
                message.text += `\n${user.username}: **${it.points}**`;
            });

            if (this.onMessage$) this.onMessage$.next(message);
        });
    }

    getTournamentRanking(channelID, tournament_id, users) {
        this.db.getTournamentRankingData(tournament_id).subscribe(res => {
            let message = new Message(channelID, `**TOURNAMENT RANKING:**\n`);
            res.forEach((it) => {
                let user = _.find(users, u => u.id == it._id);
                message.text += `\n${user.username}: **${it.points}**`;
            });

            if (this.onMessage$) this.onMessage$.next(message);
        });
    }
}