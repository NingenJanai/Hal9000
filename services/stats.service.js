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
        this.db.getWeeklyRankingData().subscribe(res => {
            let message = this.getMessage(channelID, res, '**WEEKLY RANKING:**', users);
            if (this.onMessage$) this.onMessage$.next(message);

            this.db.getRankingData().subscribe(res => {
                let message = this.getMessage(channelID, res, '**\nGLOBAL RANKING:**', users);
                if (this.onMessage$) this.onMessage$.next(message);
            });
        });
    }

    getTournamentRanking(channelID, tournament_id, users) {
        this.db.getTournamentRankingData(tournament_id).subscribe(res => {
            let message = this.getMessage(channelID, res, '**TOURNAMENT RANKING:**', users);
            if (this.onMessage$) this.onMessage$.next(message);
        });
    }

    getMessage(channelID, data, title, users) {
        let message = new Message(channelID, title);
        if (data.length == 0)
            message.content += `\nNo players\n\n`;

        data.forEach((it, ix) => {
            message.content += `\n${this.getUsername(users, it._id)}: **${it.points}**${ix == data.length - 1 ? '\n\n' : ''}`;
        });

        return message;
    }

    getUsername(users, id) {
        let user = users.get(id);
        return user.username;
    }
}