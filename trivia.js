const axios = require('axios');
const _ = require('lodash');
const Question = require('./question.js');
const { Observable, Observer } = require('rxjs');

module.exports = class Trivia {
    constructor() {
        this.baseUrl = 'https://opentdb.com/api.php?amount=1';
        this.MOVIES = 11;
        this.TV = 14;
        this.category = this.MOVIES;
    }

    subscribe() {
        this.result$ = Observable.create((observer) => {
            this.observer = observer;
        });
        return this.result$;
    }

    setCategory(category) {
        this.category = category;
    }

    getQuestion(channelID) {
        
        axios.get(`${this.baseUrl}&category=${this.category}`)
            .then(res => {
                try {
                    let question = new Question(res.data.results[0]);

                    if (this.observer) this.observer.next({
                        question: question,
                        channelID: channelID
                    });
                } catch (err) {
                    observer.error(err);
                }
            })
            .catch(err => {
                observer.error(err);
            });
    }
}