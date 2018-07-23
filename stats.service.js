const _ = require('lodash');

module.exports = class StatsService {
    constructor() {
        this.players = [];
    }

    addPoints(user, userID, points) {
        if (!_.find(this.players, it => it.userID == userID))
            this.players.push({ userID: userID, user: user, points: 0 });

        _.map(this.players, it => {
            if (it.userID == userID) it.points += points;
        });
    }

    text() {
        let message = `**RANK:**\n`;
        _.reverse(_.orderBy(this.players, it => it.points)).forEach((it, ix) => {
            message += `\n${it.user}: **${it.points}**`;
        });
        return message;
    }
}