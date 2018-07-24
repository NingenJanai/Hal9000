var winston = require('winston');

const axios = require('axios');
const _ = require('lodash');
const monk = require('monk');
const { Observable, Observer } = require('rxjs');

const Question = require('./question.js');


module.exports = class TriviaService {
    constructor(MONGO_DB) {
        this.MONGO_DB = MONGO_DB;
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

    storeQuestion(question) {
        return Observable.create(observer => {
            let db = monk(this.MONGO_DB);

            let collection = db.get('questions');

            collection.insert({ timestamp: Date.now(), category: question.getCategory(), users: [] })
                .then(docs => {
                    observer.next(docs);
                    observer.complete();
                })
                .catch(err => {
                    winston.error(err);
                    observer.error(err);
                })
                .then(() => db.close());
        });
    }

    storeQuestionAnswer(questionID, userID, correct) {
        let db = monk(this.MONGO_DB);

        let collection = db.get('questions');

        collection.update(
            { _id: questionID },
            {
                $push: {
                    "users": { userID: userID, correct: correct, timestamp: Date.now() }
                }
            })
            .then(() => db.close())
            .catch(err => {
                winston.error(err);
            });
    }

    getQuestion(channelID) {
        let url = `${this.baseUrl}&category=${this.category}`;

        axios.get(url)
            .then(res => {
                try {
                    let question = new Question(res.data.results[0]).setChannelID(channelID).setCategory(this.category);

                    this.storeQuestion(question).subscribe(doc => {
                        question.setID(doc._id);

                        if (this.observer) this.observer.next(question);
                    });
                } catch (err) {
                    if (this.observer) this.observer.error(err);
                }
            })
            .catch(err => {
                if (this.observer) this.observer.error(err);
            });
    }
}