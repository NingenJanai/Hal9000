var winston = require('winston');
var moment = require('moment');

const _ = require('lodash');
const monk = require('monk');
const { Observable, Observer } = require('rxjs');

module.exports = class DBService {
    constructor(MONGO_DB) {
        this.MONGO_DB = MONGO_DB;
    }

    createTriviaCategories() {
        return Observable.create(observer => {
            try {
                let categories = require('../trivia.categories.json');

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
                        console.log(err);
                        winston.error(err);
                        observer.error(err);
                    })
                    .then(() => db.close());

            } catch (err) {
                console.log(err);
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
                let commands = require('../commands.json');

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

    getWeeklyRankingData() {
        var start = moment().startOf('isoWeek').toDate().getTime();
        var end = moment().endOf('isoWeek').toDate().getTime();

        return this.getRankingData(start, end);
    }

    getRankingData(start, end) {
        return Observable.create(observer => {
            let db = monk(this.MONGO_DB);

            let collection = db.get('questions');

            var operations = [];
            if (start && end) {
                operations.push({
                    $match: {
                        "timestamp": { $gte: start, $lte: end }
                    }
                });
            }

            operations.push({
                $unwind: {
                    path: "$users",
                    preserveNullAndEmptyArrays: true
                }
            });
            operations.push({
                $project: {
                    "users.userID": 1,
                    "users.correct": 1
                }
            });
            operations.push({
                $match: {
                    "users.correct": true
                }
            });
            operations.push({
                $group: {
                    _id: "$users.userID",
                    points: {
                        $sum: 1
                    }
                }
            });
            operations.push({
                $sort: {
                    points: -1
                }
            });

            collection.aggregate(operations)
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

    getTournamentRankingData(tournament_id) {
        return Observable.create(observer => {
            let db = monk(this.MONGO_DB);

            let collection = db.get('questions');

            collection.aggregate([
                {
                    $match: {
                        tournament_id: tournament_id
                    }
                },
                {
                    $unwind: {
                        path: "$users",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        "users.userID": 1,
                        "users.correct": 1
                    }
                },
                {
                    $match: {
                        "users.correct": true
                    }
                },
                {
                    $group: {
                        _id: "$users.userID",
                        points: {
                            $sum: 1
                        }
                    }
                },
                {
                    $sort: {
                        points: -1
                    }
                }
            ])
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
