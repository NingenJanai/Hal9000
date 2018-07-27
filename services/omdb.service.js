var Discord = require('discord.js');

var winston = require('winston');

const _ = require('lodash');

const Message = require('../types/message');
const BaseService = require('./base.service');

module.exports = class OMDBService extends BaseService {
    constructor(API_KEY) {
        super();

        this.API_KEY = API_KEY;
        this.baseUrl = `http://www.omdbapi.com/?apikey=${this.API_KEY}&plot=full`;
    }

    _searchMovie(query) {
        let url = `${this.baseUrl}&t=${query}&type=movie`;
        return this.getData(url);
    }

    _searchShow(query) {
        let url = `${this.baseUrl}&t=${query}&type=series`;
        return this.getData(url);
    }

    _getMovie(id) {
        let url = `${this.baseUrl}/movie/${id}?api_key=${this.API_KEY}`;
        return this.getData(url);
    }

    searchMovie(query, channelID) {
        this._searchMovie(query).subscribe(movie => {
            if (movie.Response != "True") {
                this.sendMessages([new Message(channelID, `No data found for query: **${query}**`)]);
                return;
            }

            let messages = [];

            let message = new Message(channelID);

            message.content += `**${movie.Title}**\n`;

            if (movie.Released)
                message.content += `*${movie.Released}*\n`

            if (movie.imdbID)
                message.content += `<https://www.imdb.com/title/${movie.imdbID}>\n\n`;

            if (movie.Plot != '')
                message.content += `\`\`\`${movie.Plot}\`\`\`\n\n`;

            messages.push(message);

            if (movie.Poster) {
                messages.push(new Message(channelID, new Discord.RichEmbed({
                    'image': {
                        'url': `${movie.Poster}`
                    }
                })));
            }
            
            this.sendMessages(messages); 
        });
    }

    searchShow(query, channelID) {
        this._searchShow(query).subscribe(show => {
            if (show.Response != "True") {
                this.sendMessages([new Message(channelID, `No data found for query: **${query}**`)]);
                return;
            }

            let messages = [];

            let message = new Message(channelID);

            message.content += `**${show.Title}**\n`;

            if (show.Released)
                message.content += `*${show.Released}*\n`

            if (show.imdbID)
                message.content += `<https://www.imdb.com/title/${show.imdbID}>\n\n`;

            if (show.Plot != '')
                message.content += `\`\`\`${show.Plot}\`\`\`\n\n`;

            messages.push(message);

            if (show.Poster) {
                messages.push(new Message(channelID, new Discord.RichEmbed({
                    'image': {
                        'url': `${show.Poster}`
                    }
                })));
            }

            this.sendMessages(messages);
        });
    }
}