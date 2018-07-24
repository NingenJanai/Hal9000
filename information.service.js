var winston = require('winston');

const axios = require('axios');
const _ = require('lodash');

const { Observable, Observer } = require('rxjs');

module.exports = class InformationService {
    constructor(API_KEY) {
        this.baseUrl = 'https://api.themoviedb.org/3';
        this.API_KEY = API_KEY;
    }

    getPerson(query) {
        let url = `${this.baseUrl}/search/person?api_key=${this.API_KEY}&language=en-US&query=${query}`;

        return Observable.create(observer => {
            axios.get(url)
                .then(res => {
                    if (this.observer) this.observer.next(res);
                })
                .catch(err => {
                    if (this.observer) this.observer.error(err);
                });

        });
    }

    getPersonText(query) {
        return Observable.create(observer => {

            this.getPerson(query).subscribe(res => {
                let message = '';

                let results = res.results;
                results.forEach(it => {
                    message += `**${it.name}**\n`;

                    if (it.profile_path)
                        message += `https://image.tmdb.org/t/p/w200${it.profile_path}\n`;


                it.known_for.forEach(k => {
                    message += `**${k.original_title}**\n*${k.overview}*`

                    if (k.poster_path)
                        message += `https://image.tmdb.org/t/p/w200${k.poster_path}\n`;
                });

                observer.next(message);
                observer.complete();
            });
        });
    });
}
}