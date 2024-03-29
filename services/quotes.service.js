import Message from '../types/message.js';
import BaseService from './base.service.js';

export default class QuotesService extends BaseService {
    constructor(API_KEY) {
        super();

        this.baseUrl = 'https://andruxnet-random-famous-quotes.p.mashape.com/?cat=movies&count=1';
        this.API_KEY = API_KEY;
    }

    getQuote(channelID) {
        this.getData(this.baseUrl, { headers: { 'X-Mashape-Key': this.API_KEY } })
            .subscribe(res => {
                if (this.onMessage$) {
                    let quote = res[0];

                    let message = new Message(channelID, {
                        color: 3447003,
                        title: quote.author,
                        description: quote.quote
                    });

                    this.onMessage$.next(message);
                }
            });
    }
}