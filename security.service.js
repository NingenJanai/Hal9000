var winston = require('winston');

const _ = require('lodash');
const { Observable, Observer } = require('rxjs');

const DBService = require('./db.service.js');

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

    canRunCommand(command, channelID) {
        return _.find(this.security, it => it.name == command && _.find(it.channels, c => c == '*' || c == channelID));
    }
}