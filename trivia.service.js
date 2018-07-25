var winston = require('winston');

const axios = require('axios');
const _ = require('lodash');
const monk = require('monk');
const { Observable, Observer, of } = require('rxjs');

const Question = require('./question');
const DBService = require('./db.service');

module.exports = class TriviaService {
    constructor(MONGO_DB) {
        this.db = new DBService(MONGO_DB);
        this.baseUrl = 'https://opentdb.com/api.php?';

        this.questions_source = [];

        this.getTriviaCategories().subscribe(res => {
            this.categories = res;
            this.setCategory(this.categories[0]);
        });
    }

    createTriviaCategories() {
        return this.db.createTriviaCategories();
    }

    getTriviaCategories() {
        if (this.categories)
            return of(this.categories);
        else
            return this.db.getTriviaCategories();
    }

    // Observable where the questions will be sent
    onQuestion() {
        return Observable.create(observer => {
            this.onQuestion$ = observer;
        });
    }

    setCategory(category) {
        let new_category = _.find(this.categories, it => _.toLower(it.name) == _.toLower(category.name));

        console.log('setCategory', category, new_category, this.categories);

        if (new_category != this.category) {
            this.category = new_category;
            this.questions_source = [];
        }
    }

    readyQuestions() {
        return Observable.create(observer => {
            let id_category = this.category.category;
            
            let url = `${this.baseUrl}amount=50&category=${id_category}`;

            axios.get(url)
                .then(res => {
                    try {
                        this.questions_source = res.data.results;

                        if (observer) {
                            observer.next(this.questions_source);
                            observer.complete();
                        }
                    } catch (err) {
                        if (observer) {
                            winston.error(err);
                            observer.error(err);
                            observer.complete();
                        }
                    }
                })
                .catch(err => {
                    if (observer) {
                        winston.error(err);
                        observer.error(err);
                        observer.complete();
                    }
                });
        })
        
    }

    _getNextQuestion() {
        return Observable.create(observer => {
            if (this.questions_source && this.questions_source.length > 0) {
                
                let item = this.questions_source.splice(0, 1)[0];
                observer.next(new Question(item).setCategory(this.category.category));
            }
            else {
                this.readyQuestions().subscribe(res => {
                    let item = this.questions_source.splice(0, 1)[0];
                    observer.next(new Question(item).setCategory(this.category.category));
                });
            }
        });
    }

    getQuestion(channelID) {
        this._getNextQuestion().subscribe(question => {
            try {
                question.setChannelID(channelID);

                this.db
                    .saveQuestion(question)
                    .subscribe(doc => {
                        question.setID(doc._id);

                        if (this.onQuestion$) this.onQuestion$.next(question);
                    });
            } catch (err) {
                if (this.onQuestion$) this.onQuestion$.error(err);
            }
        });
    }

    answerQuestion(question, answer, userID) {
        return Observable.create(observer => {
            let correct = question.answer(answer, userID);

            this.db
                .saveAnswer(question._id, userID, correct)
                .subscribe(res => {
                    observer.next(correct);
                    observer.complete();
                });
        });
    }
}