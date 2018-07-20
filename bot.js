var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
const { Observable, pipe } = require('rxjs');
const { throttleTime } = require('rxjs/operators');

const Trivia = require('./trivia.js');
const Stats = require('./stats.js');

const trivia = new Trivia();
const stats = new Stats();

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true,
    level: 'debug'
});

var question = undefined;
var timestamp = Date.now();

// Initialize Discord Bot
var bot = new Discord.Client({
    token: auth.token,
    autorun: true
});

bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');

    // Subscribe throttle to a new trivia command
    trivia.subscribe().pipe(throttleTime(10000)).subscribe(it => {
        question = it.question;
        bot.sendMessage({
            to: it.channelID,
            message: it.question.text()
        });
    })
});

bot.on('message', function (user, userID, channelID, message, evt) {
    // Our bot needs to know if it will execute a command. It will listen for messages that will start with `!`
    if (message.substring(0, 1) == '!') {
        var args = message.substring(1).split(' ');
        var cmd = args[0];

        args = args.splice(1);

        let elapsed = (timestamp - Date.now() / 1000);

        switch (cmd) {
            case 'help':
                bot.sendMessage({
                    to: channelID,
                    message: `Use **!trivia** or **!trivia [category]** to start a new trivia question *(categories: tv / movies)*.
After the category is set **!trivia** will remember the last category.
Use **!answer [number]** to answer and **!stats** to see the current scores.
**!trivia** command can only be used every 10 seconds.`
                });
                break;
            case 'trivia':
                if (args.length == 1)
                    trivia.setCategory(args[0].toLowerCase() == 'tv' ? trivia.TV : trivia.MOVIES);
                
                trivia.getQuestion(channelID);

                break;
            case 'answer':
                if (!question) {
                    // TODO: Check last trivia time
                    /*bot.sendMessage({
                        to: channelID,
                        message: `Currently there's no trivia running. Use !trivia to start a new one`
                    });*/
                } else if (args.length == 1) {
                    if (question && args[0] == question.correct_number) {
                        stats.addPoints(user, userID, 1);

                        bot.sendMessage({
                            to: channelID,
                            message: `Congratulations <@${userID}>. Your answer is **correct**!`
                        });

                        question = undefined;
                    } else {
                        stats.addPoints(user, userID, 0);

                        bot.sendMessage({
                            to: channelID,
                            message: `Sorry <@${userID}>. Your answer is **wrong**`
                        });
                    }
                }
                break;
            case 'stats':

                // TODO: Show which users have guessed more right or wrong answers

                bot.sendMessage({
                    to: channelID,
                    message: stats.text()
                });
                break;
            // Just add any case commands if you want to..
        }
    }
});