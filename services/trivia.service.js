import winston from 'winston';

import _ from 'lodash';
import { Observable, of, timer, pipe } from 'rxjs';
import { take } from 'rxjs/operators';

import Question from '../types/question.js';
import Tournament from '../types/tournament.js';
import Message from '../types/message.js';
import BaseService from './base.service.js';
import DBService from './db.service.js';

export default class TriviaService extends BaseService {
    constructor(MONGO_DB) {
        super();

        this.db = new DBService(MONGO_DB);
        this.baseUrl = 'https://opentdb.com/api.php?';

        this.questions_source = [];

        this.category = undefined;
        this.question = undefined;
        this.tournament = undefined;

        // Ready categories
        this.db.getTriviaCategories().subscribe(res => {
            this.categories = res;
            this.category = this.categories[0];
        });
    }

    // Observable where the questions will be sent
    onQuestion() {
        return new Observable(observer => {
            this.onQuestion$ = observer;
        });
    }

    // Observable for when a tournament has finished
    onTournamentFinished() {
        return new Observable(observer => {
            this.onTournamentFinished$ = observer;
        });
    }

    createTriviaCategories() {
        return this.db.createTriviaCategories();
    }

    getTriviaHelp(channelID) {
        let source$ = undefined;
        if (this.categories)
            source$ = of(this.categories);
        else
            source$ = this.db.getTriviaCategories();

        source$.subscribe(res => {
            let message = new Message(channelID, '');
            res.forEach(cat => {
                message.content += `Use **!trivia ${cat.name}** or **!t ${cat.name}** for *${cat.description}* questions\n`;               
            });
            message.content += `\nUse **!answer number** or **!a number** to give an answer\n`;
            if (this.onMessage$) this.onMessage$.next(message);
        });
    }

    getCategory(name) {
        return _.find(this.categories, it => _.toLower(it.name) == _.toLower(name));
    }

    setCategoryByName(channelID, name) {
        let new_category = this.getCategory(name);

        if (new_category && new_category != this.category) {
            this.category = new_category;
            this.questions_source = [];
        }

        if (!new_category) this.sendMessages([new Message(channelID, `Category **${name}** doesn't exist. Use **!help trivia** to see available categories.`)]);
        return new_category;
    }

    readyQuestions(category_id) {
        return new Observable(observer => {
            let amount = 20;

            let url = `${this.baseUrl}amount=${amount}&category=${category_id}`;

            this.getData(url).subscribe(res => {
                try {
                    if (observer) observer.next(res.results);
                } catch (err) {
                    if (observer) {
                        winston.error(err);
                        observer.error(err);
                    }
                }
            });
        })
    }

    getNextQuestion() {
        // If we are in a tournament we return the next tournament question
        if (this.tournament && this.tournament.isStarted() && !this.tournament.isFinished()) {
            return of(this.tournament.getQuestion());
        } else {
            return new Observable(observer => {
                if (this.questions_source && this.questions_source.length > 0) {
                    let item = this.questions_source.splice(0, 1)[0];
                    observer.next(new Question(item).setCategoryID(this.category.id));
                }
                else {
                    this.readyQuestions(this.category.id).subscribe(questions => {
                        this.questions_source = questions;
                        let item = this.questions_source.splice(0, 1)[0];
                        observer.next(new Question(item).setCategoryID(this.category.id));
                    });
                }
            });
        }
    }

    tournamentIsRunning() {
        return this.tournament && !this.tournament.isFinished();
    }

    getQuestion(channelID) {
        this.getNextQuestion()
            .subscribe(res => {
                try {
                    if (res) {
                        this.question = res.setChannelID(channelID);

                        this.db
                            .saveQuestion(res)
                            .subscribe(doc => {
                                this.question = this.question.setID(doc._id);

                                if (this.onQuestion$) this.onQuestion$.next(this.question);
                            });
                    } else {
                        if (this.onQuestion$) this.onQuestion$.next(null);
                    }
                } catch (err) {
                    if (this.onQuestion$) this.onQuestion$.error(err);
                }
            });
    }

    answerQuestion(channelID, answer, userID) {
        if (!this.question) {
            this.sendMessages([new Message(channelID, `Currently there's no trivia running. Use !trivia to start a new one`)]);
        }
        else if (this.question.isSolved()) {
            this.sendMessages([new Message(channelID, `Sorry <@${userID}>. You were too **slow**`)]);
        }
        else {
            let error = '';

            if (this.tournament && !this.tournament.isFinished() && !this.tournament.canAnswer(userID)) 
                error = `Sorry <@${userID}>. You **are not participating in the tournament.**.`;

            if (error == '' && !this.question.canAnswer(userID))
                error = `Sorry <@${userID}>. You **already gave an answer**.`;

            if (error == '') {
                let correct = this.question.answer(answer, userID);

                this.db
                    .saveAnswer(this.question._id, userID, correct)
                    .subscribe(res => {
                        if (correct) {
                            this.sendMessages([new Message(channelID, _.random(0, 10) > 3 ? `Congratulations <@${userID}>. You are **correct**!` : `**Lucky guess** <@${userID}>!`)]);
                        }
                        else
                            this.sendMessages([new Message(channelID, _.random(0, 10) > 3 ? `Sorry <@${userID}>. You are **wrong**.` : `**How could you get that wrong** <@${userID}>!`)]);

                        if (this.tournament && !this.tournament.isFinished()) {
                            if (correct || this.question.getUsers().length == this.tournament.getUsers().length) {
                                if (this.tournament.hasQuestionsLeft()) {
                                    timer(5000).pipe(take(1)).subscribe(() => this.getQuestion(channelID));
                                }
                                else {
                                    this.tournament.finish();
                                    if (this.onTournamentFinished$) timer(5000).pipe(take(1)).subscribe(() => this.onTournamentFinished$.next(this.tournament));
                                }
                            }
                        }
                    });
            } else {
                this.sendMessages([new Message(channelID, error)]);
            }
        }
    }

    createTournament(channelID, category_name, size_text, userID) {
        if (this.tournament && !this.tournament.isFinished()) {
            this.sendMessages([new Message(channelID, `Currently there's a tournament already running. Please wait for it to finish before starting a new one.`)]);
        } else if (category_name.trim() == '' || size_text.trim() == '') {
            this.sendMessages([new Message(channelID, `You must specify the category and number of questions of the tournament. Use **!tournament** *category* *size* to start a new tournament *(max size is 50)*`)]);
        } else {
            let errors = [];

            let category = this.getCategory(category_name);
            let size = parseInt(size_text);

            if (!category) errors.push(`Category **${category_name}** doesn't exist. Use **!help trivia** to see available categories.\n`);
            if (typeof size !== "number" || size < 10 || size > 50) errors.push(`Size **${size_text}** is not a valid size. Min size is 10 and max is 50.\n`);

            if (errors.length > 0) {
                this.sendMessages([new Message(channelID, errors.join(' ').trim())]);
            } else {
                this.readyQuestions(category.id).subscribe(questions => {
                    let tournament = new Tournament(category.id, questions.splice(0, size)).setChannelID(channelID);

                    this.db.
                        saveTournament(tournament)
                        .subscribe(doc => {
                            this.tournament = tournament.setID(doc._id);
                            this.sendMessages([new Message(channelID, `*${category.description} tournament* will start in 60 seconds. Use **!join tournament** to join.`)]);
                            if (userID) this.joinTournament(channelID, userID);

                            // Tournament starts after 60 seconds
                            timer(60000).subscribe(() => {
                                if (this.tournament.getUsers().length < 2) {
                                    this.cancelTournament(tournament).subscribe(res => {
                                        this.sendMessages([new Message(channelID, `Not enough players to start the tournament.`)]);
                                        this.tournament = undefined;
                                    });
                                }
                                else
                                    this.startTournament();
                            });
                        });
                });
            }
        }
    }

    startTournament() {
        this.tournament.start();

        this.getQuestion(this.tournament.getChannelID());
    }

    joinTournament(channelID, userID) {
        if (this.tournament && this.tournament.canJoin(userID)) {
            this.tournament.join(userID);

            this.db
                .saveTournamentUser(this.tournament._id, userID)
                .subscribe(doc => {
                    this.sendMessages([new Message(channelID, `<@${userID}> has joined the tournament`)]);
                });
        } else {
            this.sendMessages([new Message(channelID, `Currently there's no tournament running. Use **!tournament** *category* *size* to start a new tournament *(max size is 50)*`)]);
        }
    }

    cancelTournament(tournament) {
        return this.db.deleteTournament(tournament._id);
    }
}
