var Discord = require('discord.io');
var winston = require('winston');

const { Observable, pipe, timer } = require('rxjs');
const { throttleTime } = require('rxjs/operators');

const _ = require('lodash');

const HalConfig = require('./hal.config');

const SecurityService = require('./security.service');
const TriviaService = require('./trivia.service');
const TMDBService = require('./tmdb.service');
const OMDBService = require('./omdb.service');
const QuotesService = require('./quotes.service');
const StatsService = require('./stats.service');

const Question = require('./question');
const Message = require('./message');

module.exports = class Hal {
    constructor() {
        this.config = new HalConfig();

        this.question = undefined;
        this.tournament = undefined;

        this.security = new SecurityService(this.config.MONGO_DB);
        this.trivia = new TriviaService(this.config.MONGO_DB);
        this.stats = new StatsService(this.config.MONGO_DB);
        this.tmdb = new TMDBService(this.config.THE_MOVIE_DB);
        this.omdb = new OMDBService(this.config.OMDB);
        this.quotes = new QuotesService(this.config.MASHAPE);

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

        // Subscription to new questions throttled so there can never be two questions in less than 2 seconds
        this.trivia.onQuestion().pipe(throttleTime(2000))
            .subscribe(it => {
                this.question = it;
                this.sendMessage(it.message());
            });

        this.tmdb.onMessage()
            .subscribe(it => {
                this.sendMessage(it);
            });

        this.omdb.onMessage()
            .subscribe(it => {
                this.sendMessage(it);
            });
    }

    onMessage(user, userID, channelID, message, evt) {
        if (message.substring(0, 1) == '!') {
            let command = this.security.getCommand(message);

            if (command && this.security.canRunCommand(command, channelID)) {
                var args = _.filter(message.replace(command.name, '').trim().split(' '), it => it != '');

                switch (command.name) {
                    case '!help':
                        this.sendMessage(new Message(channelID, command.text));
                        break;
                    case '!help trivia':
                        this.trivia.getTriviaCategories().subscribe(res => {
                            let message = new Message(channelID, '');
                            res.forEach(cat => {
                                message.text += `Use **!trivia ${cat.name}** for *${cat.description}* questions\n`;
                            });
                            this.sendMessage(message);
                        });
                        break;
                    case '!cookies':
                        let message = new Message(channelID, '', command.embed);
                        this.sendMessage(message);
                        break;
                    case '!quote':
                        this.quotes.getQuote().subscribe(res => {
                            let message = new Message(channelID, '', {
                                color: 3447003,
                                title: res.author,
                                description: res.quote
                            });
                            this.sendMessage(message);
                        });
                        break;
                    case '!trivia':
                        if (!this.tournament || this.tournament.isFinished()) {
                            if (args.length == 1) {
                                let new_category = this.trivia.setCategoryByName(args[0]);
                                if (!new_category) {
                                    this.sendMessage(new Message(channelID, `Category **${args[0]}** doesn't exist. Use **!help trivia** to see available categories.`));
                                    break;
                                }
                            }

                            this.trivia.getQuestion(channelID);
                        } else {
                            this.sendMessage(new Message(channelID, `Currently there's a tournament running. Please wait for it to finish before starting a trivia question.`));
                        }
                        break;
                    case '!tournament':
                        if (this.tournament && !this.tournament.isFinished()) {
                            this.sendMessage(new Message(channelID, `Currently there's a tournament already running. Please wait for it to finish before starting a new one.`));
                        } else if (args.length < 2) {
                            this.sendMessage(new Message(channelID, `You must specify the category and number of questions of the tournament. Use **!tournament** *category* *size* to start a new tournament *(max size is 50)*`));
                        } else {
                            let errors = [];

                            let category = this.trivia.setCategoryByName(args[0]);
                            let size = parseInt(args[1]);

                            if (!category) errors.push(`Category **${args[0]}** doesn't exist. Use **!help trivia** to see available categories.\n`);
                            if (typeof size !== "number" || size < 10 || size > 50) errors.push(`Size **${args[1]}** is not a valid size. Min size is 10 and max is 50.\n`);

                            if (errors.length > 0) {
                                this.sendMessage(new Message(channelID, this.arrayToString(errors)));
                            } else {
                                this.trivia.createTournament(category, size)
                                    .subscribe(tournament => {
                                        this.tournament = tournament;
                                        this.trivia.joinTournament(tournament, userID).subscribe(res => {
                                            this.sendMessage(new Message(channelID, `Tournament will start in 60 seconds. Use **!join tournament** to join.`));
                                            // Tournament starts after 60 seconds
                                            timer(60000).subscribe(() => {
                                                if (this.tournament.getUsers().length < 2) {
                                                    this.sendMessage(new Message(channelID, `Not enought players to start the tournament.`));
                                                    this.trivia.cancelTournament(tournament).subscribe(res => {
                                                        this.tournament = undefined;
                                                    });
                                                }
                                                else
                                                    this.trivia.startTournament(channelID, this.tournament);
                                            });
                                        });

                                    });
                            }
                        }
                        break;
                    case '!join tournament':
                        if (this.tournament && !this.tournament.isStarted() && !this.tournament.isFinished()) {
                            this.trivia.joinTournament(this.tournament, userID)
                                .subscribe(res => {
                                    this.sendMessage(new Message(channelID, `User <@${userID}> has joined the tournament`));
                                });
                        } else {
                            this.sendMessage(new Message(channelID, `Currently there's no tournament running. Use **!tournament** *category* *size* to start a new tournament *(max size is 50)*`));
                        }
                        break;
                    case '!answer':
                        if (!this.question) {
                            this.sendMessage(new Message(channelID, `Currently there's no trivia running. Use !trivia to start a new one`));
                        }
                        else if (this.question.isSolved()) {
                            this.sendMessage(new Message(channelID, `Sorry <@${userID}>. You were too **slow**`));
                        }
                        else if (args.length == 1) {
                            let error = '';

                            if (this.tournament && !this.tournament.isFinished()) {
                                error = this.tournament.canAnswer(userID) ? '' : `Sorry <@${userID}>. You **are not participating in the tournament.**.`;
                            } else {
                                error = this.question.canAnswer(userID) ? '' : `Sorry <@${userID}>. You **already gave an answer**.`;
                            }

                            if (error == '') {
                                this.trivia
                                    .answerQuestion(this.question, args[0], userID)
                                    .subscribe(correct => {
                                        if (correct)
                                            this.sendMessage(new Message(channelID, `Congratulations <@${userID}>. You are **correct**!`));
                                        else
                                            this.sendMessage(new Message(channelID, `Sorry <@${userID}>. You are **wrong**.`));

                                        if (this.tournament && !this.tournament.isFinished()) {
                                            if (correct || this.question.getUsers().length == this.tournament.getUsers().length) {
                                                if (this.tournament.hasQuestionsLeft()) {
                                                    timer(3000).subscribe(() => {
                                                        this.trivia.getQuestion(channelID);
                                                    });
                                                }
                                                else {
                                                    this.tournament.finish();
                                                    this.stats.getTournamentRanking(this.tournament._id, this.bot.users).subscribe(text => {
                                                        this.sendMessage(new Message(channelID, text));
                                                    });
                                                }
                                            }
                                        }
                                    });
                            } else {
                                this.sendMessage(new Message(channelID, error));
                            }
                        }
                        break;
                    case '!stats':
                        this.stats.getRanking(this.bot.users).subscribe(text => {
                            this.sendMessage(new Message(channelID, text));
                        });
                        break;
                    case '!person':
                        if (args.length > 0) {
                            let query = this.arrayToString(args);
                            this.tmdb.searchPerson(query, channelID);
                        } else {
                            this.sendMessage(new Message(channelID, `You must specify a search parameter`));
                        }
                        break;
                    case '!movie':
                        if (args.length > 0) {
                            let query = this.arrayToString(args);
                            //this.tmdb.searchMovie(query, channelID);
                            this.tmdb.searchShow(query, channelID);
                        } else {
                            this.sendMessage(new Message(channelID, `You must specify a search parameter`));
                        }
                        break;
                    case '!show':
                        if (args.length > 0) {
                            let query = this.arrayToString(args);
                            //this.tmdb.searchShow(query, channelID);
                            this.omdb.searchShow(query, channelID);
                        } else {
                            this.sendMessage(new Message(channelID, `You must specify a search parameter`));
                        }
                        break;
                    //case '!format':
                    //    this.bot.getMessages({ channelID: channelID }, (error, response) => {
                    //        let message_ids = response.map(it => it.id);
                    //        this.bot.deleteMessages({ channelID: channelID, messageIDs: message_ids });    
                    //    });
                }
            }
        }
    };

    arrayToString(args) {
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
