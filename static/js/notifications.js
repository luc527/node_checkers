// In HTTP/1.1 there's a limit to how many simultaneous requests to a single
// host can exist. This makes using an EventSource a little harder.
// To work around this, one tab could create the EventSource and use a BroadcastChannel to
// broadcast it to other tabs. But this requires HTTPs. And it also requires a leader
// election algorithm to decide which tab should create the EventSource.
// Which requires using navigator.locks. Which, again, requires HTTPS.

const _notificationsKey = 'notifications';
const _notificationPollTime = 5 * 1000;

let _enabledInThisPage = true;

let _notificationPollingEnabled = null;
let _notificationPollInterval = null;

let _notificationsWindow = null;

document.addEventListener('DOMContentLoaded', () => {
    const url = new URL(location);
    _enabledInThisPage = url.searchParams.get('notifications') != 'disabled';
    if (!_enabledInThisPage) {
        document.querySelector('.notifications-window').remove();
        return;
    }

    _notificationsWindow = new NotificationsWindow(document.querySelector('.notifications-window'));
    for (const notif of getSavedNotifications()) {
        _notificationsWindow.addQuietly(notif);
    }

    toggleNotificationPolling(true);
});

document.addEventListener('visibilitychange', ev => {
    if (!_enabledInThisPage) {
        return;
    }
    toggleNotificationPolling(!document.hidden);
});

function toggleNotificationPolling(b) {
    if (b === _notificationPollingEnabled) {
        return;
    }
    // console.log((b ? 'enabling' : 'disabling') + ' notifications');
    _notificationPollingEnabled = b;
    if (b) {
        pollNotifications();
        _notificationPollInterval = setInterval(pollNotifications, _notificationPollTime);
    } else {
        clearInterval(_notificationPollInterval);
        _notificationPollInterval = null;
    }
}

async function pollNotifications() {
    const {ok, body: notifs} = await request('GET', '/notifications');
    if (!ok) {
        console.warn('Failed to get notifications');
    } else if (notifs.length == 0) {
        // console.log('No new notifications');
    } else {
        handleNotifications(notifs);
    }
};

function makeNotificationId() {
    return Math.random().toString(36).substring(2);
}

// TODO show notifications grouped by date

function handleNotifications(notifs) {
    const savedNotifs = getSavedNotifications();
    for (const notif of notifs) {
        notif.id = makeNotificationId();

        _notificationsWindow.add(notif);
        savedNotifs.push(notif);
    }
    saveNotifications(savedNotifs);
}

function getSavedNotifications() {
    const notifs = JSON.parse(localStorage.getItem(_notificationsKey) ?? '[]');
    return notifs;
}

function saveNotifications(notifs) {
    localStorage.setItem(_notificationsKey, JSON.stringify(notifs));
}

function clearSavedNotifications() {
    localStorage.removeItem(_notificationsKey);
}

function unsaveNotification(id) {
    let notifs = getSavedNotifications();
    notifs = notifs.filter(n => n.id != id);
    saveNotifications(notifs);
}

function makeNotificationElement(notification) {
    const {message, link} = notification;

    const elem = document.createElement('div');
    elem.classList.add('notification');

    elem.insertAdjacentHTML('beforeend', `
        <span class="notification-message">${message}</span>
    `);
    if (link) {
        elem.insertAdjacentHTML('beforeend', `
            <span class="notification-link">
                <button class="btn btn-link">
                    <i class="bi bi-box-arrow-up-right"></i>
                </button>
            </span>
        `);
    }

    return elem;
}

class NotificationsWindow {

    constructor(elem) {
        this.header        = elem.querySelector('.notifications-header');
        this.body          = elem.querySelector('.notifications-body');
        this.container     = elem.querySelector('.notifications-container');

        this.toggleButton  = elem.querySelector('.notifications-toggle-button');
        this.clearButton   = elem.querySelector('.notifications-clear-button');
        this.toggleIcon    = this.toggleButton.querySelector('i');
        this.open          = false;
        this.iconTimeout   = null;

        this.notifications = [];

        this.toggleButton.addEventListener('click', () => {
            _tooltips.get(this.toggleButton).hide();
            this.toggle()
        });

        this.clearButton.addEventListener('click', () => {
            this.clear();
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
        const heightTransitionDuration = 500;
        this.iconTimeout = setTimeout(() => {
            this.toggleIcon.classList.remove(open ? 'bi-caret-up'   : 'bi-caret-down');
            this.toggleIcon.classList.add   (open ? 'bi-caret-down' : 'bi-caret-up');
        }, heightTransitionDuration);
        if (open) {
            setTimeout(() => {
                this.header.classList.remove('highlight');
            }, heightTransitionDuration);
        }
    }

    add(notification) {
        this.addQuietly(notification);
        if (!this.open) {
            this.header.classList.add('highlight');
        }
    }

    clearNotification(elem) {
        const opacityTransitionDuration = 200;
        elem.style.opacity = 0;
        setTimeout(() => elem.remove(), opacityTransitionDuration);
    }

    addQuietly(notification) {
        if (this.notifications.length == 20) {
            this.notifications.shift().remove();
        }
        const elem = makeNotificationElement(notification);
        this.notifications.push(elem);
        this.container.insertAdjacentElement('afterbegin', elem);

        elem.querySelector('.btn-link')?.addEventListener('click', () => {
            unsaveNotification(notification.id);
            window.open(notification.link, '_blank');
            this.clearNotification(elem);
        });
    }

    clear() {
        this.notifications.forEach(elem => {
            this.clearNotification(elem);
        });
        this.notifications = [];
        clearSavedNotifications();
    }
}