
import { Client, GatewayIntentBits } from 'discord.js';
import winston from 'winston';

import { merge } from 'rxjs';
import { throttleTime } from 'rxjs/operators';

import _ from 'lodash';

// Types
import HalConfig from './hal.config.js';
import Message from './message.js';

// Services
import SecurityService from '../services/security.service.js';
import TriviaService from '../services/trivia.service.js';
import TMDBService from '../services/tmdb.service.js';
import OMDBService from '../services/omdb.service.js';
import IGDBService from '../services/igdb.service.js';
import QuotesService from '../services/quotes.service.js';
import StatsService from '../services/stats.service.js';

export default class Hal { 
    async init() {
        this.config = await HalConfig.getConfig();

        this.question = undefined;
        this.tournament = undefined;

        this.security = new SecurityService(this.config.MONGO_DB);
        this.stats = new StatsService(this.config.MONGO_DB);
        this.trivia = new TriviaService(this.config.MONGO_DB);
        this.tmdb = new TMDBService(this.config.THE_MOVIE_DB);
        this.omdb = new OMDBService(this.config.OMDB);
        this.igdb = new IGDBService(this.config.IGDB);
        this.quotes = new QuotesService(this.config.MASHAPE);

        this.bot = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
            ],
        });

        this.bot.on('ready', (evt) => this.onReady(evt));
        this.bot.on('messageCreate', (message) => this.onMessage(message));
    }

    async start() {
        await this.init();
        
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
        let channelID = message.channelId;
        let content = message.content;
        let users = this.bot.users;
        let userID = message.author.id;

        if (content.substring(0, 1) == '!') {
            let command = this.security.getCommand(content);

            if (command && this.security.canRunCommand(command, channelID)) {
                var args = _.filter(_.toLower(content).replace(command.name, '').trim().split(' '), it => it != '');
                let query = args.join(' ').trim();

                switch (command.name) {
                    case '!help':
                        this.sendMessage(new Message(channelID, command.text));
                        break;
                    case '!help trivia':
                        this.trivia.getTriviaHelp(channelID);
                        break;
                    case '!cookies':
                        this.sendMessage(new Message(channelID, command.embed));
                        break;
                    case '!quote':
                        this.quotes.getQuote(channelID);
                        break;
                    case '!trivia':
                    case '!t':
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
                    case '!a':
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

    async sendMessage(message) {
        try {
            let channel = await this.bot.channels.fetch(message.channelID);
            if (typeof message.content === 'string' || message.content instanceof String)
                channel.send(message.content);
            else
                channel.send({ embeds: [ message.content] });
        } catch (err) {
            console.log(err);
            winston.error(err);
        }       
    }
}
