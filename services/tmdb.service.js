var moment = require('moment');

const _ = require('lodash');

const { Observable, forkJoin } = require('rxjs');
const { map } = require('rxjs/operators');

const Message = require('../types/message');

const BaseService = require('./base.service');

module.exports = class TMDBService extends BaseService {
    constructor(API_KEY) {
        super();

        this.baseUrl = 'https://api.themoviedb.org/3';
        this.API_KEY = API_KEY;
    }

    searchPerson(query, channelID) {
        this.getData(`${this.baseUrl}/search/person?api_key=${this.API_KEY}&language=en-US&query=${query}`)
            .subscribe(res => {
                let messages = [];

                let results = _.take(res.results, 5);

                let exact_matches = _.filter(results, it => _.toLower(it.name) == _.toLower(query));
                if (exact_matches.length > 0) results = exact_matches;

                if (results.length == 0) {
                    this.sendMessages([new Message(channelID, `No data found for query: **${query}**`)]);
                    return;
                }

                results.forEach((it, ix) => {
                    let message = new Message(channelID);

                    message.content += `**${ix > 0 ? '\n\n' : ''}${it.name}**\n\n`;

                    it.known_for.forEach((k, kx) => {
                        message.content += `**${kx > 0 ? '\n' : ''}${k.original_title}**\n`;
                        if (k.overview.trim() != '')
                            message.content += `\`\`\`${k.overview}\`\`\``;
                    });

                    messages.push(message);

                    if (it.profile_path) {
                        messages.push(new Message(channelID, {
                            'image': {
                                'url': `https://image.tmdb.org/t/p/w200${it.profile_path}`
                            }
                        }));
                    }
                });

                this.sendMessages(messages);
            });
    }

    searchMovie(query, channelID) {
        this.getData(`${this.baseUrl}/search/movie?api_key=${this.API_KEY}&language=en-US&query=${query}`)
            .subscribe(res => {
                let results = _.take(res.results, 5);

                let exact_matches = _.filter(results, it => _.toLower(it.title) == _.toLower(query) || _.toLower(it.original_title) == _.toLower(query));
                if (exact_matches.length > 0) results = exact_matches;

                if (results.length == 0) {
                    this.sendMessages([new Message(channelID, `No data found for query: **${query}**`)]);
                    return;
                }
            
                var details$ = [];

                results.forEach((it, ix) => {
                    details$.push(new Observable(observer => {
                        this.getData(`${this.baseUrl}/movie/${it.id}?api_key=${this.API_KEY}`).pipe(map(it => it.imdb_id)).subscribe(imdb_id => {
                            let messages = [];

                            let message = new Message(channelID);
                            message.content += `**${ix > 0 ? '\n\n' : ''}${it.title}** ${it.title != it.original_title ? '*(' + it.original_title + ')*' : ''}\n`;

                            if (it.release_date && it.release_date.trim() != '')
                                message.content += `*${moment(it.release_date).format('MMMM Do YYYY')}*\n`

                            if (imdb_id.trim() != '')
                                message.content += `<https://www.imdb.com/title/${imdb_id}>\n\n`;

                            if (it.overview.trim() != '')
                                message.content += `\`\`\`${it.overview}\`\`\`\n\n`;

                            messages.push(message);

                            if (it.poster_path) {
                                messages.push(new Message(channelID, {
                                    'image': {
                                        'url': `https://image.tmdb.org/t/p/w200${it.poster_path}`
                                    }
                                }));
                            }

                            observer.next(messages);
                            observer.complete();
                        });
                    }));
                });

                forkJoin(details$).subscribe(messages => {
                    this.sendMessages(_.flatten(messages)); 
                });
            });
    }

    searchShow(query, channelID) {
        this.getData(`${this.baseUrl}/search/tv?api_key=${this.API_KEY}&language=en-US&query=${query}`)
            .subscribe(res => {
                let messages = [];

                let results = _.take(res.results, 5);

                let exact_matches = _.filter(results, it => _.toLower(it.name) == _.toLower(query) || _.toLower(it.original_name) == _.toLower(query));
                if (exact_matches.length > 0) results = exact_matches;

                if (results.length == 0) {
                    this.sendMessages([new Message(channelID, `No data found for query: **${query}**`)]);
                    return;
                }

                results.forEach((it, ix) => {
                    let message = new Message(channelID);

                    message.content += `**${ix > 0 ? '\n\n' : ''}${it.name}** ${it.name != it.original_name ? '*(' + it.original_name + ')*' : ''}\n`;

                    message.content += `*${moment(it.first_air_date).format('MMMM Do YYYY')}*\n\n`

                    if (it.overview.trim() != '')
                        message.content += `\`\`\`${it.overview}\`\`\`\n\n`;

                    messages.push(message);

                    if (it.poster_path) {
                        messages.push(new Message(channelID, {
                            title: 'Poster',
                            image: {
                                url: `https://image.tmdb.org/t/p/w200${it.poster_path}`
                            }
                        }));
                    }
                });

                this.sendMessages(messages);
            });
    }
}