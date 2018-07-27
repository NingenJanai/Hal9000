const _ = require('lodash');
const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities();

const Message = require('./message');
const Question = require('./question');

module.exports = class Tournament {
    constructor(category_id, questions) {
        this._id = undefined;

        this.questions = [];

        questions.forEach(it => {
            this.questions.push(new Question(it));
        });

        this.setCategoryID(category_id);

        this.question = undefined;

        this.started = false;
        this.finished = false;

        // To store which users that can participate in the tournament
        this.users = [];
    }

    getUsers() {
        return this.users;
    }

    getID() {
        return this._id;
    }

    setID(id) {
        this._id = id;
        this.questions.forEach(it => {
            it.setTournamentID(this._id);
        });

        return this;
    }

    getCategoryID() {
        return this.category_id;
    }

    setCategoryID(category_id) {
        this.category_id = category_id;
        this.questions.forEach(it => {
            it.setCategoryID(category_id);
        });
        return this;
    }

    getChannelID() {
        return this.channelID;
    }

    setChannelID(channelID) {
        this.channelID = channelID;
        this.questions.forEach(it => {
            it.setChannelID(channelID);
        });
        return this;
    }

    isFinished() {
        return this.finished;
    }

    isStarted() {
        return this.started;
    }

    canJoin(userID) {
        return !this.isFinished() && !this.isStarted() && _.filter(this.users, it => it == userID);
    }

    join(userID) {
        this.users.push(userID);
    }

    start() {
        this.started = true;
        return this;
    }

    finish() {
        this.finished = true;
    }

    canAnswer(userID) {
        return _.find(this.users, it => it == userID);
    }

    hasQuestionsLeft() {
        console.log('hasQuestionsLeft', this.questions.length);
        return this.questions.length > 0;
    }

    getQuestion() {
        if (this.questions && this.questions.length > 0) {
            this.question = this.questions.splice(0, 1)[0];
            return this.question;
        } else {
            // TOURNAMENT FINISHED
            this.finish();
            return undefined;
        }
    }

    answer(number, userID) {
        return this.question.answer(number, userID);
    }

    message() {
        return this.question.message();
    }
}
