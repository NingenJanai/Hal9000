var Discord = require('discord.io');
var winston = require('winston');

const { Observable, pipe } = require('rxjs');
const { throttleTime } = require('rxjs/operators');

const HalConfig = require('./hal.config.js');
const TriviaService = require('./trivia.service.js');
const Question = require('./question.js');
const StatsService = require('./stats.service.js');

module.exports = class Hal {
    constructor() {
        this.trivia = new TriviaService();
        this.question = undefined;
        this.config = new HalConfig();
        this.stats = new StatsService();

        this.bot = new Discord.Client({
            token: this.config.BOT_TOKEN,
            autorun: true
        });

        this.bot.on('ready', (evt) => this.onReady(evt));
        this.bot.on('message', (user, userID, channelID, message, evt) => this.onMessage(user, userID, channelID, message, evt));
    }

    onReady(evt) {
        winston.info('Connected');
        winston.info('Logged in as: ');
        winston.info(this.bot.username + ' - (' + this.bot.id + ')');

        // Subscribe throttle to a new trivia command
        this.trivia.subscribe().pipe(throttleTime(10000)).subscribe(it => {
            this.question = it.question;
            this.sendMessage(it.channelID, it.question.text());
        })
    }

    onMessage(user, userID, channelID, message, evt) {
        if (message.substring(0, 1) == '!') {
            var args = message.split(' ');
            var cmd = args.splice(0, 1)[0].toLowerCase();

            if (this.config.CHANNEL_ID_TRIVIA == channelID) {
                switch (cmd) {
                    case '!help':
                        this.sendMessage(channelID,`Use **!trivia** or **!trivia** *category* to start a new trivia question *(categories: tv / movies)*.
After the category is set **!trivia** will remember the last category.
Use **!answer** *number* to answer and **!stats** to see the current scores.
**!trivia** command can only be used every 10 seconds.`);
                        break;
                    case '!trivia':
                        if (args.length == 1)
                            this.trivia.setCategory(args[0].toLowerCase() == 'tv' ? this.trivia.TV : this.trivia.MOVIES);

                        this.trivia.getQuestion(channelID);

                        break;
                    case '!answer':
                        if (!this.question || this.question.isSolved()) {
                            this.sendMessage(channelID, `Currently there's no trivia running. Use !trivia to start a new one`);
                        } else if (args.length == 1) {
                            if (this.question.canAnswer(userID)) {
                                let correct = this.question.answer(args[0], userID);

                                if (correct) {
                                    this.stats.addPoints(user, userID, 1);

                                    this.sendMessage(channelID, `Congratulations <@${userID}>. Your are **correct**!`);
                                } else {
                                    this.stats.addPoints(user, userID, 0);

                                    this.sendMessage(channelID, `Sorry <@${userID}>. Your are **wrong**`);
                                }
                            } else {
                                this.sendMessage(channelID, `Sorry <@${userID}>. You **already gave an answer**`);
                            }
                        }
                        break;
                    case '!stats':
                        this.sendMessage(channelID, this.stats.text());
                        break;
                }
            }
        }
    };

    sendMessage(channelID, message) {
        this.bot.sendMessage({
            to: channelID,
            message: message
        });
    }
}