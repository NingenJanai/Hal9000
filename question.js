const _ = require('lodash');
const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities();

module.exports = class Question {
    constructor(data) {
        this.solved = false;

        this.users = [];
        this.question = entities.decode(data.question);

        this.answers = [data.correct_answer, ...data.incorrect_answers];
        this.answers = _.map(_.shuffle(this.answers), it => entities.decode(it));

        this.correct_number = _.indexOf(this.answers, entities.decode(data.correct_answer)) + 1;
    }

    isSolved() {
        return this.solved;
    }

    canAnswer(userID) {
        return !_.find(this.users, it => it == userID);
    }

    answer(number, userID) {
        this.users.push(userID);
        this.solved = this.correct_number == number;
        return this.solved;
    }

    text() {
        let message = `**QUESTION:** ${this.question}\n`;
        this.answers.forEach((it, ix) => {
            message += `\n**${ix + 1}**:   *${it}*`;
        });
        return message;
    }
}
