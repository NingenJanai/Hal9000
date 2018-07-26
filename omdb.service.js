var Discord = require('discord.io');
var winston = require('winston');
var moment = require('moment');

const axios = require('axios');
const _ = require('lodash');

const { Observable, Observer, interval, pipe, forkJoin } = require('rxjs');
const { take, map } = require('rxjs/operators');

const Message = require('./message');

module.exports = class OMDBService {
    constructor(API_KEY) {
        this.API_KEY = API_KEY;
        this.baseUrl = `http://www.omdbapi.com/?apikey=${this.API_KEY}&plot=full`;
    }

    // Observable where the information will be sent
    onMessage() {
        return Observable.create(observer => {
            this.onMessage$ = observer;
        });
    }

    getData(url) {
        return Observable.create(observer => {
            axios.get(url)
                .then(res => {
                    if (observer) {
                        observer.next(res.data);
                        observer.complete();
                    }
                })
                .catch(err => {
                    if (observer) {
                        observer.error(err);
                        observer.complete();
                    }
                });
        });
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

            let message = new Message(channelID);

            message.text += `**${movie.Title}**\n`;

            if (movie.Released)
                message.text += `*${movie.Released}*\n`

            if (movie.imdbID)
                message.text += `<https://www.imdb.com/title/${movie.imdbID}>\n\n`;

            if (movie.Poster) {
                message.embed = {
                    'image': {
                        'url': `${movie.Poster}`
                    }
                };
            }

            if (movie.Plot != '')
                message.text += `\`\`\`${movie.Plot}\`\`\`\n\n`;
            
            this.sendMessages([message]); 
        });
    }

    searchShow(query, channelID) {
        this._searchShow(query).subscribe(show => {
            if (show.Response != "True") {
                this.sendMessages([new Message(channelID, `No data found for query: **${query}**`)]);
                return;
            }

            let message = new Message(channelID);

            message.text += `**${show.Title}**\n`;

            if (show.Released)
                message.text += `*${show.Released}*\n`

            if (show.imdbID)
                message.text += `<https://www.imdb.com/title/${show.imdbID}>\n\n`;

            if (show.Poster) {
                message.embed = {
                    'image': {
                        'url': `${show.Poster}`
                    }
                };
            }

            if (show.Plot != '')
                message.text += `\`\`\`${show.Plot}\`\`\`\n\n`;

            this.sendMessages([message]);
        });
    }

    sendMessages(messages, channelID, max) {
        interval(1000).pipe(take(max ? (messages.length > max ? max : messages.length) : messages.length)).subscribe(it => {
            if (this.onMessage$) this.onMessage$.next(messages[it]);
        });
    }
}