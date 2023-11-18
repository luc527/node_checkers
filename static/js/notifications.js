// In HTTP/1.1 there's a limit to how many simultaneous requests to a single
// host can exist. This makes using an EventSource a little harder.
// To work around this, one tab could create the EventSource and use a BroadcastChannel to
// broadcast it to other tabs. But this requires HTTPs. And it also requires a leader
// election algorithm to decide which tab should create the EventSource.
// Which requires using navigator.locks. Which, again, requires HTTPS.

let gNotificationsWindow = null;

document.addEventListener('DOMContentLoaded', () => {
    gNotificationsWindow = new NotificationsWindow(document.querySelector('.notifications-window'));
    setInterval(pollNotifications, 1000 * 5);
    pollNotifications();
});

async function pollNotifications() {
    const {ok, body} = await request('GET', '/notifications');
    if (!ok) {
        console.warn('Failed to get notifications');
    } else if (body.length == 0) {
        // console.log('No new notifications');
    } else {
        for (const notif of body) {
            console.log({notif});
        }
    }
};

class NotificationsWindow {

    // TODO initial notifications, for notifications saved in localStoreage

    // TODO highlight header if window is closed and there are new notifications

    constructor(elem) {
        this.body          = elem.querySelector('.notifications-body');
        this.container     = elem.querySelector('.notifications-container');
        this.toggleButton  = elem.querySelector('.notifications-toggle-button');
        this.toggleIcon    = this.toggleButton.querySelector('i');
        this.open          = false;
        this.iconTimeout   = null;
        this.notifications = [];

        this.toggleButton.addEventListener('click', () => {
            this.toggle();
        });
    }

    toggle(open) {
        if (open === undefined) {
            open = !this.open;
        }
        this.body.style.height = open ? '60vh' : '0';
        this.open = open;
        if (this.iconTimeout) {
            clearTimeout(this.iconTimeout);
        }
        this.iconTimeout = setTimeout(() => {
            this.toggleIcon.classList.remove(open ? 'bi-arrow-bar-up'   : 'bi-arrow-bar-down');
            this.toggleIcon.classList.add   (open ? 'bi-arrow-bar-down' : 'bi-arrow-bar-up');
        }, 500); //500ms is the height transition duration
    }

    add(notification) {
        if (this.notifications.length == 20) {
            this.notifications.shift().remove();
        }
        const elem = makeNotificationElement(notification);
        this.notifications.push(elem);
        this.container.insertAdjacentElement('afterbegin', elem);
    }
}