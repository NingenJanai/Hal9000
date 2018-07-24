var winston = require('winston');
var moment = require('moment');

const axios = require('axios');
const _ = require('lodash');

const { Observable, Observer, interval, pipe } = require('rxjs');
const { take } = require('rxjs/operators');

module.exports = class InformationService {
    constructor(API_KEY) {
        this.baseUrl = 'https://api.themoviedb.org/3';
        this.API_KEY = API_KEY;
    }

    subscribe() {
        this.result$ = Observable.create((observer) => {
            this.observer = observer;
        });
        return this.result$;
    }

    getData(url) {
        return Observable.create(observer => {
            axios.get(url)
                .then(res => {
                    if (observer) observer.next(res.data);
                })
                .catch(err => {
                    if (observer) observer.error(err);
                });
        });
    }

    getPerson(query) {
        let url = `${this.baseUrl}/search/person?api_key=${this.API_KEY}&language=en-US&query=${query}`;
        return this.getData(url);
    }

    getMovie(query) {
        let url = `${this.baseUrl}/search/movie?api_key=${this.API_KEY}&language=en-US&query=${query}`;
        return this.getData(url);
    }

    getShow(query) {
        let url = `${this.baseUrl}/search/tv?api_key=${this.API_KEY}&language=en-US&query=${query}`;
        return this.getData(url);
    }

    getPersonInfo(query, channelID) {
        this.getPerson(query).subscribe(res => {
            let messages = [];

            let results = res.results;

            let exact_matches = _.filter(results, it => _.toLower(it.name) == _.toLower(query));
            if (exact_matches.length > 0) results = exact_matches;

            results.forEach((it, ix) => {
                let message = '';

                message += `**${ix > 0 ? '\n\n' : ''}${it.name}**\n\n`;

                if (it.profile_path)
                    message += `https://image.tmdb.org/t/p/w200${it.profile_path}\n\n`;

                it.known_for.forEach((k, kx) => {
                    message += `**${kx > 0 ? '\n' : ''}${k.original_title}**\n`;
                    if (k.overview.trim() != '')
                        message += `\`\`\`${k.overview}\`\`\``;

                    //if (k.poster_path)
                    //    message += `https://image.tmdb.org/t/p/w200${k.poster_path}\n`;
                });

                messages.push(message);
            });

            this.sendMessages(messages, channelID, 5);
        });
    }

    getMovieInfo(query, channelID) {
        this.getMovie(query).subscribe(res => {
            let messages = [];

            let results = res.results;

            let exact_matches = _.filter(results, it => _.toLower(it.title) == _.toLower(query));
            if (exact_matches.length > 0) results = exact_matches;

            results.forEach((it, ix) => {
                let message = '';

                message += `**${ix > 0 ? '\n\n' : ''}${it.title}**\n`;
                message += `*${moment(it.release_date).format('MMMM Do YYYY')}*\n\n`

                if (it.poster_path)
                    message += `https://image.tmdb.org/t/p/w200${it.poster_path}\n\n`;

                if (it.overview.trim() != '')
                    message += `\`\`\`${it.overview}\`\`\`\n\n`;

                messages.push(message);
            });

            this.sendMessages(messages, channelID, 5); 
        });
    }


    getShowInfo(query, channelID) {
        this.getShow(query).subscribe(res => {
            let messages = [];

            let results = res.results;

            let exact_matches = _.filter(results, it => _.toLower(it.name) == _.toLower(query));
            if (exact_matches.length > 0) results = exact_matches;

            results.forEach((it, ix) => {
                let message = '';

                message += `**${ix > 0 ? '\n\n' : ''}${it.name}**\n`;
                message += `*${moment(it.first_air_date).format('MMMM Do YYYY')}*\n\n`

                if (it.poster_path)
                    message += `https://image.tmdb.org/t/p/w200${it.poster_path}\n\n`;

                if (it.overview.trim() != '')
                    message += `\`\`\`${it.overview}\`\`\`\n\n`;

                messages.push(message);
            });

            this.sendMessages(messages, channelID, 5);
        });
    }

    sendMessages(messages, channelID, max) {
        interval(1000).pipe(take(max ? (messages.length > max ? max : messages.length) : messages.length)).subscribe(it => {
            this.observer.next({
                message: messages[it],
                channelID: channelID
            });
        });
    }
}