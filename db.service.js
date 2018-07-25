var winston = require('winston');

const _ = require('lodash');
const monk = require('monk');
const { Observable, Observer } = require('rxjs');

const Question = require('./question.js');

module.exports = class DBService {
    constructor(MONGO_DB) {
        this.MONGO_DB = MONGO_DB;
    }

    createTriviaCategories() {
        return Observable.create(observer => {
            let db = monk(this.MONGO_DB);

            let collection = db.get('trivia_categories');
            collection.remove({})
                .then(() => {
                    return collection.insert([
                        { name: 'movie', description: 'Movies', category: 11 },
                        { name: 'tv', description: 'TV Shows', category: 14 },
                        { name: 'books', description: 'Books', category: 10 },
                        { name: 'games', description: 'Video games', category: 15 },
                        { name: 'anime', description: 'Anime / Manga', category: 31 },
                        { name: 'geography', description: 'Geography', category: 22 },
                        { name: 'science', description: 'Science & nature', category: 17 }
                    ]);
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
            let db = monk(this.MONGO_DB);

            let collection = db.get('commands');
            collection.remove({})
                .then(() => {
                    return collection.insert([
                        {
                            name: '!help',
                            text: 'Use **!trivia** or **!trivia** *category* to start a new trivia question *use* **!help-trivia** *to see the available categories*.\nAfter the category is set **!trivia** will remember the last category.\nUse **!answer** *number* to answer and **!stats** to see the current scores.\n**!trivia** command can only be used every 10 seconds.',
                            channels: ['469849162566074368']
                        },
                        { name: '!help trivia', channels: ['469849162566074368'] },
                        {
                            name: '!help',
                            text: 'Use **!person** *query* to search for a person.\nUse **!movie** *query* to search for a movie.\nUse **!show** *query* to search for a tv show.',
                            channels: ['*']
                        },
                        {
                            name: '!cookies',
                            embed: {
                                'image': {
                                    'url': 'https://data.whicdn.com/images/199674611/original.gif'
                                }
                            },
                            channels: ['*']
                        },
                        { name: '!trivia', channels: ['469849162566074368'] },
                        { name: '!answer', channels: ['469849162566074368'] },
                        { name: '!stats', channels: ['469849162566074368'] },
                        { name: '!person', channels: ['*'] },
                        { name: '!movie', channels: ['*'] },
                        { name: '!show', channels: ['*'] }
                    ]);
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