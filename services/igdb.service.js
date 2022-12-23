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
            });
    }
}