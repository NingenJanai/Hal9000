const axios = require('axios');
const { Observable, Observer, interval, pipe } = require('rxjs');
const { take } = require('rxjs/operators');

module.exports = class BaseService {
    onMessage() {
        return Observable.create(observer => {
            this.onMessage$ = observer;
        });
    }

    sendMessages(messages, channelID, max) {
        interval(1000).pipe(take(max ? (messages.length > max ? max : messages.length) : messages.length)).subscribe(it => {
            if (this.onMessage$) this.onMessage$.next(messages[it]);
        });
    }

    getData(url, data) {
        return Observable.create(observer => {
            axios.get(url, data)
                .then(res => {
                    if (observer) {
                        observer.next(res.data);
                        observer.complete();
                    }
                })
                .catch(err => {
                    if (observer) {
                        observer.error(err);
                        observer.complete();
                    }
                });
        });
    }
}