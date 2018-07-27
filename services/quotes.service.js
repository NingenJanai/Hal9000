var Discord = require('discord.js');

var winston = require('winston');

const Message = require('../types/message');

const BaseService = require('./base.service');

module.exports = class QuotesService extends BaseService {
    constructor(API_KEY) {
        super();

        this.baseUrl = 'https://andruxnet-random-famous-quotes.p.mashape.com/?cat=movies&count=1';
        this.API_KEY = API_KEY;
    }

    getQuote(channelID) {
        this.getData(this.baseUrl, { headers: { 'X-Mashape-Key': this.API_KEY } })
            .subscribe(res => {
                if (this.onMessage$) {
                    console.log(res);
                    let quote = res[0];

                    let message = new Message(channelID, new Discord.RichEmbed({
                        color: 3447003,
                        title: quote.author,
                        description: quote.quote
                    }));

                    this.onMessage$.next(message);
                }
            });
    }
}