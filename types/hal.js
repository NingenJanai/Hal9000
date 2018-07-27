var Discord = require('discord.js');
var winston = require('winston');

const { Observable, pipe, timer, merge } = require('rxjs');
const { throttleTime } = require('rxjs/operators');

const _ = require('lodash');

// Types
const HalConfig = require('./hal.config');
const Question = require('./question');
const Message = require('./message');

// Services
const SecurityService = require('../services/security.service');
const TriviaService = require('../services/trivia.service');
const TMDBService = require('../services/tmdb.service');
const OMDBService = require('../services/omdb.service');
const IGDBService = require('../services/igdb.service');
const QuotesService = require('../services/quotes.service');
const StatsService = require('../services/stats.service');

module.exports = class Hal {
    constructor() {
        this.config = new HalConfig();

        this.question = undefined;
        this.tournament = undefined;

        this.security = new SecurityService(this.config.MONGO_DB);
        this.stats = new StatsService(this.config.MONGO_DB);
        this.trivia = new TriviaService(this.config.MONGO_DB);
        this.tmdb = new TMDBService(this.config.THE_MOVIE_DB);
        this.omdb = new OMDBService(this.config.OMDB);
        this.igdb = new IGDBService(this.config.IGDB);
        this.quotes = new QuotesService(this.config.MASHAPE);

        this.bot = new Discord.Client();

        this.bot.on('ready', (evt) => this.onReady(evt));
        this.bot.on('message', (message) => this.onMessage(message));
    }

    start() {
        this.bot.login(this.config.BOT_TOKEN);
        return this;
    }

    onReady(evt) {
        winston.info('Connected');
        winston.info('HAL9000 Logged in');

        // Subscription to new questions throttled so there can never be two questions in less than 2 seconds
        this.trivia.onQuestion().pipe(throttleTime(2000))
            .subscribe(question => {
                this.question = question;
                this.sendMessage(question.message());
            });

        this.trivia.onTournamentFinished()
            .subscribe(tournament => {
                this.stats.getTournamentRanking(tournament.getChannelID(), tournament.getID(), this.bot.users);
            });

        merge(this.trivia.onMessage(), this.tmdb.onMessage(), this.omdb.onMessage(), this.quotes.onMessage(), this.stats.onMessage())
            .subscribe(message => {
                this.sendMessage(message);
            });
    }

    onMessage(message) {
        let channelID = message.channel.id;
        let content = message.content;
        let users = this.bot.users;
        let userID = message.author.id;

        if (content.substring(0, 1) == '!') {
            let command = this.security.getCommand(content);

            if (command && this.security.canRunCommand(command, channelID)) {
                var args = _.filter(content.replace(command.name, '').trim().split(' '), it => it != '');
                let query = args.join(' ').trim();

                switch (command.name) {
                    case '!help':
                        this.sendMessage(new Message(channelID, command.text));
                        break;
                    case '!help trivia':
                        this.trivia.getTriviaHelp(channelID);
                        break;
                    case '!cookies':
                        this.sendMessage(new Message(channelID, new Discord.RichEmbed(command.embed)));
                        break;
                    case '!quote':
                        this.quotes.getQuote(channelID);
                        break;
                    case '!trivia':
                        if (this.trivia.tournamentIsRunning()) {
                            this.sendMessage(new Message(channelID, `Currently there's a tournament running. Please wait for it to finish before starting a trivia question.`));
                        } else if(args.length == 0 || (args.length == 1 && this.trivia.setCategoryByName(channelID, args[0]))) {
                            this.trivia.getQuestion(channelID);
                        }
                        break;
                    case '!tournament':
                        this.trivia.createTournament(channelID, args.length > 0 ? args[0] : '', args.length > 1 ? args[1] : '', userID);
                        break;
                    case '!join tournament':
                        this.trivia.joinTournament(channelID, userID);
                        break;
                    case '!answer':
                        this.trivia.answerQuestion(channelID, args[0], userID);
                        break;
                    case '!stats':
                        this.stats.getRanking(channelID, users);
                        break;
                    case '!person':
                        if (args.length > 0) {
                            this.tmdb.searchPerson(query, channelID);
                        } else {
                            this.sendMessage(new Message(channelID, `You must specify a search parameter`));
                        }
                        break;
                    case '!movie':
                        if (args.length > 0) {
                            this.tmdb.searchMovie(query, channelID);
                        } else {
                            this.sendMessage(new Message(channelID, `You must specify a search parameter`));
                        }
                        break;
                    case '!show':
                        if (args.length > 0) {
                            //this.tmdb.searchShow(query, channelID);
                            this.omdb.searchShow(query, channelID);
                        } else {
                            this.sendMessage(new Message(channelID, `You must specify a search parameter`));
                        }
                        break;
                    case "!game":
                        if (args.length > 0) {
                            this.igdb.searchGame(query, channelID);
                        } else {
                            this.sendMessage(new Message(channelID, `You must specify a search parameter`));
                        }
                        break;
                }
            }
        }
    };

    sendMessage(message) {
        let channel = this.bot.channels.get(message.channelID);
        channel.send(message.content);
    }
}
