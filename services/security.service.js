var winston = require('winston');

const _ = require('lodash');

const DBService = require('./db.service');

module.exports = class SecurityService {
    constructor(MONGO_DB) {
        this.db = new DBService(MONGO_DB);
        this.db.getCommands().subscribe(res => {
            this.security = res;
        });
    }

    createCommands() {
        return this.db.createCommands();
    }

    getCommand(message) {
        let tmp = _.filter(_.reverse(_.orderBy(this.security, it => it.name.length)), it => _.toLower(message).startsWith(it.name));

        return tmp.length > 0 ? tmp[0] : undefined;
    }

    canRunCommand(command, channelID) {
        return _.find(command.channels, c => c == '*' || c == channelID) != undefined;
    }
}