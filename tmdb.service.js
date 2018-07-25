var Discord = require('discord.io');
var winston = require('winston');
var moment = require('moment');

const axios = require('axios');
const _ = require('lodash');

const { Observable, Observer, interval, pipe, forkJoin } = require('rxjs');
const { take, map } = require('rxjs/operators');

const Message = require('./message');

module.exports = class TMDBService {
    constructor(API_KEY) {
        this.baseUrl = 'https://api.themoviedb.org/3';
        this.API_KEY = API_KEY;
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

    _searchPerson(query) {
        let url = `${this.baseUrl}/search/person?api_key=${this.API_KEY}&language=en-US&query=${query}`;
        return this.getData(url);
    }

    _searchMovie(query) {
        let url = `${this.baseUrl}/search/movie?api_key=${this.API_KEY}&language=en-US&query=${query}`;
        return this.getData(url);
    }

    _searchShow(query) {
        let url = `${this.baseUrl}/search/tv?api_key=${this.API_KEY}&language=en-US&query=${query}`;
        return this.getData(url);
    }

    _getMovie(id) {
        let url = `${this.baseUrl}/movie/${id}?api_key=${this.API_KEY}`;
        return this.getData(url);
    }

    searchPerson(query, channelID) {
        this._searchPerson(query).subscribe(res => {
            let results = _.take(res.results, 5);

            let exact_matches = _.filter(results, it => _.toLower(it.name) == _.toLower(query));
            if (exact_matches.length > 0) results = exact_matches;

            if (results.length == 0) {
                this.sendMessages([new Message(channelID, `No data found for query: **${query}**`)]);
                return;
            }

            results.forEach((it, ix) => {
                let message = new Message(channelID);

                message.text += `**${ix > 0 ? '\n\n' : ''}${it.name}**\n\n`;

                if (it.profile_path)
                    message.embed = {
                        'image': {
                            'url': `https://image.tmdb.org/t/p/w200${it.profile_path}`
                        }
                    };

                it.known_for.forEach((k, kx) => {
                    message.text += `**${kx > 0 ? '\n' : ''}${k.original_title}**\n`;
                    if (k.overview.trim() != '')
                        message.text += `\`\`\`${k.overview}\`\`\``;
                });

                messages.push(message);
            });

            this.sendMessages(messages);
        });
    }

    searchMovie(query, channelID) {
        this._searchMovie(query).subscribe(res => {
            let results = _.take(res.results, 5);

            let exact_matches = _.filter(results, it => _.toLower(it.title) == _.toLower(query) || _.toLower(it.original_title) == _.toLower(query));
            if (exact_matches.length > 0) results = exact_matches;

            if (results.length == 0) {
                this.sendMessages([new Message(channelID, `No data found for query: **${query}**`)]);
                return;
            }
            
            var details$ = [];

            results.forEach((it, ix) => {
                details$.push(Observable.create(observer => {
                    this._getMovie(it.id).pipe(map(it => it.imdb_id)).subscribe(imdb_id => {
                        let message = new Message(channelID);

                        message.text += `**${ix > 0 ? '\n\n' : ''}${it.title}** ${it.title != it.original_title ? '*(' + it.original_title + ')*' : ''}\n`;
                        message.text += `*${moment(it.release_date).format('MMMM Do YYYY')}*\n`

                        if (imdb_id.trim() != '')
                            message.text += `<https://www.imdb.com/title/${imdb_id}>\n\n`;

                        if (it.poster_path) {
                            message.embed = {
                                'image': {
                                    'url': `https://image.tmdb.org/t/p/w200${it.poster_path}`
                                }
                            };
                        }

                        if (it.overview.trim() != '')
                            message.text += `\`\`\`${it.overview}\`\`\`\n\n`;

                        observer.next(message);
                        observer.complete();
                    });
                }));
            });

            forkJoin(details$).subscribe(messages => {
                this.sendMessages(messages); 
            });
        });
    }

    searchShow(query, channelID) {
        this._searchShow(query).subscribe(res => {
            let results = _.take(res.results, 5);

            let exact_matches = _.filter(results, it => _.toLower(it.name) == _.toLower(query) || _.toLower(it.original_name) == _.toLower(query));
            if (exact_matches.length > 0) results = exact_matches;

            if (results.length == 0) {
                this.sendMessages([new Message(channelID, `No data found for query: **${query}**`)]);
                return;
            }

            results.forEach((it, ix) => {
                let message = new Message(channelID);

                message.text += `**${ix > 0 ? '\n\n' : ''}${it.name}** ${it.name != it.original_name ? '*(' + it.original_name + ')*' : ''}\n`;

                message.text += `*${moment(it.first_air_date).format('MMMM Do YYYY')}*\n\n`

                if (it.poster_path) {
                    message.embed = {
                        'image': {
                            'url': `https://image.tmdb.org/t/p/w200${it.poster_path}`
                        }
                    };
                }

                if (it.overview.trim() != '')
                    message.text += `\`\`\`${it.overview}\`\`\`\n\n`;

                messages.push(message);
            });

            this.sendMessages(messages);
        });
    }

    sendMessages(messages, channelID, max) {
        interval(1000).pipe(take(max ? (messages.length > max ? max : messages.length) : messages.length)).subscribe(it => {
            if (this.onMessage$) this.onMessage$.next(messages[it]);
        });
    }
}