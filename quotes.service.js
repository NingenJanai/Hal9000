var Discord = require('discord.io');
var winston = require('winston');
var moment = require('moment');

const axios = require('axios');
const _ = require('lodash');

const { Observable, Observer, interval, pipe, forkJoin } = require('rxjs');
const { take, map } = require('rxjs/operators');

const Message = require('./message');

module.exports = class QuotesService {
    constructor(API_KEY) {
        this.baseUrl = 'https://andruxnet-random-famous-quotes.p.mashape.com/?cat=movies&count=1';
        this.API_KEY = API_KEY;
    }

    // Observable where the information will be sent
    onMessage() {
        return Observable.create(observer => {
            this.onMessage$ = observer;
        });
    }

    getQuote() {
        return Observable.create(observer => {
            axios.get(this.baseUrl, { headers: { 'X-Mashape-Key': this.API_KEY } })
                .then(res => {
                    if (observer) {
                        observer.next(res.data[0]);
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
}