import winston from 'winston';
import moment from 'moment';

import _ from 'lodash';
import MongoClient from 'mongodb';
//const MongoClient = require('mongodb').MongoClient;
import { Observable } from 'rxjs';

export default class DBService {
    constructor(MONGO_DB) {
        this.MONGO_DB = MONGO_DB;
        console.log('mdb', this.MONGO_DB);
    }
    
    createTriviaCategories() {
        return new Observable(observer => {
            try {
                let categories = require('../trivia.categories.json');

                MongoClient.connect(this.MONGO_DB, function (err, db) {
                    if (err) throw err;
                    var dbo = db.db("hal");
                    let collection = dbo.collection("trivia_categories");
                    collection.deleteMany({})
                        .then(() => {
                            return collection.insertMany(categories);
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
                });
            } catch (err) {
                console.log(err);
                winston.error(err);
                observer.error(err);
            }
        });
    }

    getTriviaCategories() {
        return new Observable(observer => {
            MongoClient.connect(this.MONGO_DB, function (err, db) {
                if (err) throw err;
                var dbo = db.db("hal");
                dbo.collection("trivia_categories").find({}).toArray(function (err, docs) {
                    if (err) throw err;
                    observer.next(docs);
                    observer.complete();
                    db.close();
                });
            });
        });
    }

    createCommands() {
        return new Observable(observer => {
            try {
                let commands = require('../commands.json');

                MongoClient.connect(this.MONGO_DB, function (err, db) {
                    if (err) throw err;
                    var dbo = db.db("hal");
                    let collection = dbo.collection("commands");
                    collection.deleteMany({})
                        .then(() => {
                            return collection.insertMany(commands);
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
                });
            } catch (err) {
                console.log(err);
                winston.error(err);
                observer.error(err);
            }
        });
    }

    getCommands() {
        return new Observable(observer => {
            MongoClient.connect(this.MONGO_DB, function (err, db) {
                if (err) throw err;
                var dbo = db.db("hal");
                dbo.collection("commands").find({}).toArray(function (err, docs) {
                    if (err) throw err;
                    observer.next(docs);
                    observer.complete();
                    db.close();
                });
            });
        });
    }

    saveTournament(tournament) {
        return new Observable(observer => {
            MongoClient.connect(this.MONGO_DB, function (err, db) {
                if (err) throw err;
                var dbo = db.db("hal");
                let collection = dbo.collection("tournaments");
                collection.deleteMany({})
                    .then(() => {
                        return collection.insertOne({ timestamp: Date.now(), category: tournament.getCategoryID(), users: [] });
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
            });
        });
    }

    deleteTournament(tournamentID) {
        return new Observable(observer => {
            MongoClient.connect(this.MONGO_DB, function (err, db) {
                if (err) throw err;
                var dbo = db.db("hal");
                let collection = dbo.collection("tournaments");
                collection.deleteOne({ _id: tournamentID })
                    .then(() => {
                        observer.next(true);
                        observer.complete();
                    })
                    .catch(err => {
                        console.log(err);
                        winston.error(err);
                        observer.error(false);
                    })
                    .then(() => db.close());
            });
        });
    }

    saveTournamentUser(tournamentID, userID) {
        return new Observable(observer => {
            MongoClient.connect(this.MONGO_DB, function (err, db) {
                if (err) throw err;
                var dbo = db.db("hal");
                let collection = dbo.collection("tournaments");
                collection.updateOne({ _id: tournamentID }, {
                    $push: {
                        "users": { userID: userID, timestamp: Date.now() }
                    }
                })
                    .then(() => {
                        observer.next(true);
                        observer.complete();
                    })
                    .catch(err => {
                        console.log(err);
                        winston.error(err);
                        observer.error(false);
                    })
                    .then(() => db.close());
            });
        });
    }

    saveQuestion(question) {
        return new Observable(observer => {
            MongoClient.connect(this.MONGO_DB, function (err, db) {
                if (err) throw err;
                var dbo = db.db("hal");
                let collection = dbo.collection("questions");
                collection.insertOne({ timestamp: Date.now(), category: question.getCategoryID(), tournament_id: question.getTournamentID(), users: [] })
                    .then((docs) => {
                        observer.next(docs);
                        observer.complete();
                    })
                    .catch(err => {
                        console.log(err);
                        winston.error(err);
                        observer.error(false);
                    })
                    .then(() => db.close());
            });
        });
    }

    saveAnswer(questionID, userID, correct) {
        return new Observable(observer => {
            MongoClient.connect(this.MONGO_DB, function (err, db) {
                if (err) throw err;
                var dbo = db.db("hal");
                let collection = dbo.collection("questions");
                collection.updateOne(
                    { _id: questionID },
                    {
                        $push: {
                            "users": { userID: userID, correct: correct, timestamp: Date.now() }
                        }
                    })
                    .then((docs) => {
                        observer.next(docs);
                        observer.complete();
                    })
                    .catch(err => {
                        console.log(err);
                        winston.error(err);
                        observer.error(false);
                    })
                    .then(() => db.close());
            });
        });
    }

    getWeeklyRankingData() {
        var start = moment().startOf('isoWeek').toDate().getTime();
        var end = moment().endOf('isoWeek').toDate().getTime();

        return this.getRankingData(start, end);
    }

    getRankingData(start, end) {
        return new Observable(observer => {
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

            MongoClient.connect(this.MONGO_DB, function (err, db) {
                if (err) throw err;
                var dbo = db.db("hal");
                let collection = dbo.collection("questions");
                collection.aggregate(operations)
                    .then((docs) => {
                        observer.next(docs);
                        observer.complete();
                    })
                    .catch(err => {
                        console.log(err);
                        winston.error(err);
                        observer.error(false);
                    })
                    .then(() => db.close());
            });
        });
    }

    getTournamentRankingData(tournament_id) {
        return new Observable(observer => {
            MongoClient.connect(this.MONGO_DB, function (err, db) {
                if (err) throw err;
                var dbo = db.db("hal");
                let collection = dbo.collection("questions");
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
                    .then((docs) => {
                        observer.next(docs);
                        observer.complete();
                    })
                    .catch(err => {
                        console.log(err);
                        winston.error(err);
                        observer.error(false);
                    })
                    .then(() => db.close());
            });
        });
    }
}
