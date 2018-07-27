var Discord = require('discord.js');

var winston = require('winston');

const _ = require('lodash');

const Message = require('../types/message');
const BaseService = require('./base.service');

module.exports = class IGDBService extends BaseService {
    constructor(API_KEY) {
        super();

        this.API_KEY = API_KEY;
        this.baseUrl = `https://api-endpoint.igdb.com/`;
    }

    searchGame(query, channelID) {
        this.getData(`${this.baseUrl}/games/?search=${query}&fields=name`, { headers: { 'user-key': this.API_KEY } })
            .subscribe(games => {
                console.log(games);

                games.forEach(it => {
                    this.getData(`${this.baseUrl}/games/${it.id}?fields=*`, { headers: { 'user-key': this.API_KEY } })
                        .subscribe(game => {
                            console.log(game);
                        });
                });
                //if (movie.Response != "True") {
                //    this.sendMessages([new Message(channelID, `No data found for query: **${query}**`)]);
                //    return;
                //}

                //let messages = [];

                //let message = new Message(channelID);

                //message.content += `**${movie.Title}**\n`;

                //if (movie.Released)
                //    message.content += `*${movie.Released}*\n`

                //if (movie.imdbID)
                //    message.content += `<https://www.imdb.com/title/${movie.imdbID}>\n\n`;

                //if (movie.Plot != '')
                //    message.content += `\`\`\`${movie.Plot}\`\`\`\n\n`;

                //messages.push(message);

                //if (movie.Poster) {
                //    messages.push(new Message(channelID, new Discord.RichEmbed({
                //        'image': {
                //            'url': `${movie.Poster}`
                //        }
                //    })));
                //}
            
                //this.sendMessages(messages); 
            });
    }
}