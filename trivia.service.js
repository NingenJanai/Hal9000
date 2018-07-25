var winston = require('winston');

const axios = require('axios');
const _ = require('lodash');
const monk = require('monk');
const { Observable, Observer } = require('rxjs');

const Question = require('./question.js');
const DBService = require('./db.service.js');


module.exports = class TriviaService {
    constructor(MONGO_DB) {
        this.MONGO_DB = MONGO_DB;
        this.baseUrl = 'https://opentdb.com/api.php?amount=1';
        this.MOVIES = 11;
        this.TV = 14;
        this.category = this.MOVIES;
    }

    // Observable where the questions will be sent
    onQuestion() {
        return Observable.create(observer => {
            this.onQuestion$ = observer;
        });
    }

    setCategory(category) {
        this.category = category;
    }

    getQuestion(channelID) {
        let url = `${this.baseUrl}&category=${this.category}`;

        axios.get(url)
            .then(res => {
                try {
                    let question = new Question(res.data.results[0]).setChannelID(channelID).setCategory(this.category);

                    new DBService(this.MONGO_DB)
                        .saveQuestion(question)
                        .subscribe(doc => {
                            question.setID(doc._id);

                            if (this.onQuestion$) this.onQuestion$.next(question);
                        });
                } catch (err) {
                    if (this.onQuestion$) this.onQuestion$.error(err);
                }
            })
            .catch(err => {
                if (this.onQuestion$) this.onQuestion$.error(err);
            });
    }

    answerQuestion(question, answer, userID) {
        return Observable.create(observer => {
            let correct = question.answer(answer, userID);

            new DBService(this.MONGO_DB)
                .saveAnswer(question._id, userID, correct)
                .subscribe(res => {
                    observer.next(correct);
                    observer.complete();
                });
        });
    }
}