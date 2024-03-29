import axios from 'axios';

import { Observable, timer, pipe } from 'rxjs';
import { take } from 'rxjs/operators';

export default class BaseService {
    onMessage() {
        return new Observable(observer => {
            this.onMessage$ = observer;
        });
    }

    sendMessages(messages, channelID) {
        timer(0, 1000).pipe(take(messages.length)).subscribe(it => {
            if (this.onMessage$) this.onMessage$.next(messages[it]);
        });
    }

    getData(url, data) {
        return new Observable(observer => {
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