var winston = require('winston');

const _ = require('lodash');
const monk = require('monk');
const { Observable, Observer } = require('rxjs');

const Question = require('./question');
module.exports = class DBService {
    constructor(MONGO_DB) {
        this.MONGO_DB = MONGO_DB;
    }

    createTriviaCategories() {
        return Observable.create(observer => {
            try {
                let categories = require('./trivia.categories.json');

                let db = monk(this.MONGO_DB);

                let collection = db.get('trivia_categories');
                collection.remove({})
                    .then(() => {
                        return collection.insert(categories);
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

            } catch (err) {
                winston.error(err);
                observer.error(err);
            }
        });
    }

    getTriviaCategories() {
        return Observable.create(observer => {
            let db = monk(this.MONGO_DB);

            let collection = db.get('trivia_categories');

            collection.find()
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

    createCommands() {
        return Observable.create(observer => {
            try {
                let commands = require('./commands.json');

                let db = monk(this.MONGO_DB);

                let collection = db.get('commands');
                collection.remove({})
                    .then(() => {
                        return collection.insert(commands);
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

            } catch (err) {
                winston.error(err);
                observer.error(err);
            }
        });
    }

    getCommands() {
        return Observable.create(observer => {
            let db = monk(this.MONGO_DB);

            let collection = db.get('commands');

            collection.find()
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

    saveTournament(tournament) {
        return Observable.create(observer => {
            let db = monk(this.MONGO_DB);

            let collection = db.get('tournaments');

            collection.insert({ timestamp: Date.now(), category: tournament.getCategoryID(), users: [] })
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

    deleteTournament(tournamentID) {
        return Observable.create(observer => {
            let db = monk(this.MONGO_DB);

            let collection = db.get('tournaments');
            collection.remove({ _id: tournamentID })
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

    saveTournamentUser(tournamentID, userID) {
        return Observable.create(observer => {
            let db = monk(this.MONGO_DB);

            let collection = db.get('tournaments');

            collection.update(
                { _id: tournamentID },
                {
                    $push: {
                        "users": { userID: userID, timestamp: Date.now() }
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

    saveQuestion(question) {
        return Observable.create(observer => {
            let db = monk(this.MONGO_DB);

            let collection = db.get('questions');

            collection.insert({ timestamp: Date.now(), category: question.getCategoryID(), tournament_id: question.getTournamentID(), users: [] })
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