var winston = require('winston');

const _ = require('lodash');
const monk = require('monk');
const { Observable, Observer } = require('rxjs');

const Question = require('./question.js');

module.exports = class DBService {
    constructor(MONGO_DB) {
        this.MONGO_DB = MONGO_DB;
    }

    saveQuestion(question) {
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

    saveAnswer(questionID, userID, correct) {
        return Observable.create(observer => {
            let db = monk(this.MONGO_DB);

            let collection = db.get('questions');

            collection.update(
                { _id: questionID },
                {
                    $push: {
                        "users": { userID: userID, correct: correct, timestamp: Date.now() }
                    }
                })
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
}