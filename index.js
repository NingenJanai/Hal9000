//var winston = require('winston');
import winston from 'winston';
import Hal from './types/hal.js';
//const Hal = require('./types/hal');

// Configure winston settings
winston.clear();
winston.add(new winston.transports.Console, { colorize: true, level: 'debug' });
winston.add(new winston.transports.File({ filename: 'hal.log', level: 'error' }));

// Start HAL
const hal = await new Hal().start();
