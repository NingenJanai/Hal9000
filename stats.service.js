const _ = require('lodash');
const monk = require('monk');
const { Observable, Observer } = require('rxjs');

module.exports = class StatsService {
    constructor(MONGO_DB) {
        this.MONGO_DB = MONGO_DB;
    }

    getRankingData() {
        return Observable.create(observer => {
            let db = monk(this.MONGO_DB);

            let collection = db.get('questions');

            collection.aggregate([
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

    getRanking(users) {
        return Observable.create(observer => {
            this.getRankingData().subscribe(res => {
                let message = `**RANKING:**\n`;
                res.forEach((it) => {
                    let user = _.find(users, u => u.id == it._id);
                    message += `\n${user.username}: **${it.points}**`;
                });
                observer.next(message);
                observer.complete();
            });
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

    getTournamentRanking(tournament_id, users) {
        return Observable.create(observer => {
            this.getTournamentRankingData(tournament_id).subscribe(res => {
                let message = `**TOURNAMENT RANKING:**\n`;
                res.forEach((it) => {
                    let user = _.find(users, u => u.id == it._id);
                    message += `\n${user.username}: **${it.points}**`;
                });
                observer.next(message);
                observer.complete();
            });
        });
    }
}