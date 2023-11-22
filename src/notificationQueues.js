class NotificationQueue {
    #data    = [];
    #timeout = null;
    #onEmpty = null;

    #resetTimeout() {
        if (this.#timeout) {
            clearTimeout(this.#timeout);
        }
        this.#timeout = setTimeout(() => {
            this.consume();
            this.#timeout = null;
        }, 1000 * 60 * 2);
    }

    constructor() {
        this.#resetTimeout();
    }

    enqueue(notif) {
        this.#data.push(notif);
        this.#resetTimeout();
    }

    size() {
        return this.#data.length;
    }

    consume() {
        const notifs = this.#data ?? [];
        this.#data = [];
        if (this.#onEmpty) {
            this.#onEmpty();
        }
        return notifs;
    }

    onEmpty(cb) {
        this.#onEmpty = cb;
    }
}

export default class NotificationQueues {
    #queues = new Map();

    enqueue(userId, message, link='') {
        const date = new Date();
        const notification = { message, link, date };
        console.log('enqueue', userId, notification);
        let queue = this.#queues.get(userId);
        if (!queue) {
            console.log(`creating new queue for ${userId}`);
            queue = new NotificationQueue();
            queue.onEmpty(() => {
                console.log(`freed queue for user ${userId}`);
                this.#queues.delete(userId);
            });
            this.#queues.set(userId, queue);
        } else {
            console.log(`appending onto existing queue for ${userId}`);
        }
        queue.enqueue(notification);
    }

    consume(userId) {
        const notifs = this.#queues.get(userId)?.consume() ?? [];
        console.log(`consume ${userId}`, notifs);
        return notifs;
    }

}