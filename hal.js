var Discord = require('discord.io');
var winston = require('winston');

const { Observable, pipe } = require('rxjs');
const { throttleTime } = require('rxjs/operators');

const HalConfig = require('./hal.config.js');

const TriviaService = require('./trivia.service.js');
const TMDBService = require('./tmdb.service.js');
const StatsService = require('./stats.service.js');

const Question = require('./question.js');
const Message = require('./message.js');

module.exports = class Hal {
    constructor() {
        this.config = new HalConfig();

        this.question = undefined;

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

        // Subscribe throttle to a new trivia command
        this.trivia.subscribe().pipe(throttleTime(10000)).subscribe(it => {
            this.question = it;
            this.sendMessage(it.message());
        });

        this.tmdb.subscribe().subscribe(it => {
            this.sendMessage(it);
        });
    }

    onMessage(user, userID, channelID, message, evt) {
        if (message.substring(0, 1) == '!') {
            var args = message.split(' ');
            var cmd = args.splice(0, 1)[0].toLowerCase();

            if (this.config.CHANNEL_ID_TRIVIA == channelID) {
                switch (cmd) {
                    case '!help':
                        this.sendMessage(new Message(channelID, `Use **!trivia** or **!trivia** *category* to start a new trivia question *(categories: tv / movies)*.
After the category is set **!trivia** will remember the last category.
Use **!answer** *number* to answer and **!stats** to see the current scores.
**!trivia** command can only be used every 10 seconds.`));
                        break;
                    case '!trivia':
                        if (args.length == 1)
                            this.trivia.setCategory(args[0].toLowerCase() == 'tv' ? this.trivia.TV : this.trivia.MOVIES);

                        this.trivia.getQuestion(channelID);

                        break;
                    case '!answer':
                        if (!this.question || this.question.isSolved()) {
                            this.sendMessage(new Message(channelID, `Currently there's no trivia running. Use !trivia to start a new one`));
                        } else if (args.length == 1) {
                            if (this.question.canAnswer(userID)) {
                                let correct = this.question.answer(args[0], userID);

                                this.trivia.storeQuestionAnswer(this.question.getID(), userID, correct);

                                if (correct) {
                                    this.sendMessage(new Message(channelID, `Congratulations <@${userID}>. Your are **correct**!`));
                                } else {
                                    this.sendMessage(new Message(channelID, `Sorry <@${userID}>. Your are **wrong**`));
                                }
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
                }
            } else {
                switch (cmd) {
                    //case '!format':
                    //    if (channelID == '----------') {
                    //        this.bot.getMessages({ channelID: channelID }, (error, response) => {
                    //            let message_ids = response.map(it => it.id);
                    //            this.bot.deleteMessages({ channelID: channelID, messageIDs: message_ids });
                    //        });
                    //    }
                    //    break;

                    case '!help':
                        this.sendMessage(new Message(channelID, `Use **!person** *query* to search for a person.
Use **!movie** *query* to search for a movie.
Use **!show** *query* to search for a tv show.`));
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