var winston = require('winston');

const axios = require('axios');
const _ = require('lodash');
const monk = require('monk');
const { Observable, Observer, of } = require('rxjs');

const Question = require('../types/question');
const Tournament = require('../types/tournament');

const DBService = require('./db.service');
const BaseService = require('./base.service');

module.exports = class TriviaService extends BaseService {
    constructor(MONGO_DB) {
        super();

        this.db = new DBService(MONGO_DB);
        this.baseUrl = 'https://opentdb.com/api.php?';

        this.tournament = undefined;
        this.questions_source = [];

        this.getTriviaCategories().subscribe(res => {
            this.categories = res;
            this.setCategoryByName(this.categories[0].name);
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

    getCategory(name) {
        return _.find(this.categories, it => _.toLower(it.name) == _.toLower(name));
    }

    setCategoryByName(name) {
        let new_category = this.getCategory(name);

        if (new_category && new_category != this.category) {
            this.category = new_category;
            this.questions_source = [];
        }

        return new_category;
    }

    readyQuestions() {
        return Observable.create(observer => {
            let id_category = this.category.id;
            
            let url = `${this.baseUrl}amount=50&category=${id_category}`;

            axios.get(url)
                .then(res => {
                    try {
                        this.questions_source = res.data.results;

                        if (observer) {
                            observer.next(this.questions_source);
                        }
                    } catch (err) {
                        if (observer) {
                            winston.error(err);
                            observer.error(err);
                        }
                    }
                })
                .catch(err => {
                    if (observer) {
                        winston.error(err);
                        observer.error(err);
                    }
                });
        })
        
    }

    _getNextQuestion() {
        return Observable.create(observer => {
            let category = this.category;

            if (this.questions_source && this.questions_source.length > 0) {
                
                let item = this.questions_source.splice(0, 1)[0];
                observer.next(new Question(item).setCategoryID(this.category.id));
            }
            else {
                this.readyQuestions().subscribe(res => {
                    let item = this.questions_source.splice(0, 1)[0];
                    observer.next(new Question(item).setCategoryID(this.category.id));
                });
            }
        });
    }

    getQuestion(channelID) {
        let question$ = undefined;

        // If we are in a tournament we return the next tournament question
        if (this.tournament && this.tournament.isStarted() && !this.tournament.isFinished()) {
            question$ = of(this.tournament.getQuestion());
        } else {
            question$ = this._getNextQuestion();
        }

        question$.subscribe(question => {
            try {
                if (question) {
                    question.setChannelID(channelID);

                    this.db
                        .saveQuestion(question)
                        .subscribe(doc => {
                            question.setID(doc._id);

                            if (this.onQuestion$) this.onQuestion$.next(question);
                        });
                } else {
                    if (this.onQuestion$) this.onQuestion$.next(null);
                }
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

    createTournament(category, size) {
        return Observable.create(observer => {
            this.setCategoryByName(category);
            this.readyQuestions().subscribe(questions => {
                let tournament = new Tournament(this.category.id, questions.splice(0, size));

                this.db.
                    saveTournament(tournament)
                    .subscribe(doc => {
                        tournament.setID(doc._id);
                        observer.next(tournament);
                        observer.complete();
                    });
            });
        });
    }

    startTournament(channelID, tournament) {
        this.tournament = tournament.start(channelID);

        this.getQuestion(channelID);
    }

    cancelTournament(tournament) {
        return this.db.deleteTournament(tournament._id);
    }

    joinTournament(tournament, userID) {
        return Observable.create(observer => {
            try {
                if (tournament && tournament.canJoin(userID)) {
                    tournament.join(userID);

                    this.db
                        .saveTournamentUser(tournament._id, userID)
                        .subscribe(doc => {
                            if (observer) observer.next(doc);
                        });
                } else {
                    if (observer) observer.next(null);
                }
            } catch (err) {
                if (observer) observer.error(err);
            }
        });       
    }
}