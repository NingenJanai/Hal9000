const _ = require('lodash');
const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities();

module.exports = class Question {
    constructor(data) {
        this.question = entities.decode(data.question);

        this.answers = [data.correct_answer, ...data.incorrect_answers];
        this.answers = _.map(_.shuffle(this.answers), it => entities.decode(it));

        this.correct_number = _.indexOf(this.answers, entities.decode(data.correct_answer)) + 1;
    }

    text() {
        let message = `**QUESTION:** ${this.question}\n`;
        this.answers.forEach((it, ix) => {
            message += `\n**${ix + 1}**:   *${it}*`;
        });
        return message;
    }
}
