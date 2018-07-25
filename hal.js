var Discord = require('discord.io');
var winston = require('winston');

const { Observable, pipe } = require('rxjs');
const { throttleTime } = require('rxjs/operators');

const HalConfig = require('./hal.config.js');

const SecurityService = require('./security.service.js');
const TriviaService = require('./trivia.service.js');
const TMDBService = require('./tmdb.service.js');
const StatsService = require('./stats.service.js');

const Question = require('./question.js');
const Message = require('./message.js');

module.exports = class Hal {
    constructor() {
        this.config = new HalConfig();

        this.question = undefined;

        this.security = new SecurityService(this.config.MONGO_DB);
        this.trivia = new TriviaService(this.config.MONGO_DB);
        this.stats = new StatsService(this.config.MONGO_DB);

        this.tmdb = new TMDBService(this.config.THE_MOVIE_DB);

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

        // Subscription to new questions throttled so there can never be two questions in less than 10 seconds
        this.trivia.onQuestion().pipe(throttleTime(10000)).subscribe(it => {
            this.question = it;
            this.sendMessage(it.message());
        });

        this.tmdb.onMessage().subscribe(it => {
            this.sendMessage(it);
        });
    }

    onMessage(user, userID, channelID, message, evt) {
        if (message.substring(0, 1) == '!') {
            var args = message.split(' ');
            var cmd = args.splice(0, 1)[0].toLowerCase();

            let command = this.security.canRunCommand(cmd, channelID);

            if (command) {
                switch (command.name) {
                    case '!help':
                        if (args.length > 0 && args[0].toLowerCase() == 'trivia')
                        {
                            this.trivia.getTriviaCategories().subscribe(res => {
                                let message = new Message(channelID, '');
                                res.forEach(cat => {
                                    message.text += `Use **!trivia ${cat.name}** for *${cat.description}* questions\n`;
                                });
                                this.sendMessage(message);
                            });
                        }
                        else
                            this.sendMessage(new Message(channelID, command.text));
                        break;
                    case '!cookies':
                        let message = new Message(channelID, '', {
                            'image': {
                                'url': `https://data.whicdn.com/images/199674611/original.gif`
                            }
                        });
                        this.sendMessage(message);
                        break;
                    case '!trivia':
                        if (args.length == 1)
                            this.trivia.setCategory(args[0]);

                        this.trivia.getQuestion(channelID);

                        break;
                    case '!answer':
                        if (!this.question || this.question.isSolved()) {
                            this.sendMessage(new Message(channelID, `Currently there's no trivia running. Use !trivia to start a new one`));
                        } else if (args.length == 1) {
                            if (this.question.canAnswer(userID)) {
                                this.trivia
                                    .answerQuestion(this.question, args[0], userID)
                                    .subscribe(correct => {
                                        if (correct)
                                            this.sendMessage(new Message(channelID, `Congratulations <@${userID}>. You are **correct**!`));
                                        else
                                            this.sendMessage(new Message(channelID, `Sorry <@${userID}>. You are **wrong**`));
                                    });
                            } else {
                                this.sendMessage(new Message(channelID, `Sorry <@${userID}>. You **already gave an answer**`));
                            }
                        }
                        break;
                    case '!stats':
                        this.stats.getRankingText(this.bot.users).subscribe(text => {
                            this.sendMessage(new Message(channelID, text));
                        });
                        break;
                    case '!person':
                        if (args.length > 0) {
                            let query = this.getArgsString(args);
                            this.tmdb.searchPerson(query, channelID);
                        } else {
                            this.sendMessage(new Message(channelID, `You must specify a search parameter`));
                        }
                        break;
                    case '!movie':
                        if (args.length > 0) {
                            let query = this.getArgsString(args);
                            this.tmdb.searchMovie(query, channelID);
                        } else {
                            this.sendMessage(new Message(channelID, `You must specify a search parameter`));
                        }
                        break;
                    case '!show':
                        if (args.length > 0) {
                            let query = this.getArgsString(args);
                            this.tmdb.searchShow(query, channelID);
                        } else {
                            this.sendMessage(new Message(channelID, `You must specify a search parameter`));
                        }
                        break;
                }
            }
        }
    };

    getArgsString(args) {
        return args.join(' ').trim();
    }

    getUser(userID) {
        return this.bot.users[userID];
    }

    sendMessage(message) {
        this.bot.sendMessage({
            to: message.channelID,
            message: message.text,
            embed: message.embed
        });
    }
}
