function errorToast(text) {
    Toast.fire({
        icon: 'error',
        text,
    });
}

function successToast(text) {
    Toast.fire({
        icon: 'success',
        text,
    });
}

async function request(method, url, reqBody) {
    const headers = {
        'Content-Type': 'application/json',
    };

    const options = {
        method,
        headers,
    };
    if (reqBody) {
        options.body = JSON.stringify(reqBody);
    }

    const res = await fetch(url, options);
    const resText = ((await res.text()) ?? '').trim();

    let resBody = null;
    if (resText.length > 0) {
        try {
            resBody = JSON.parse(resText);
        } catch (error) {
            console.error(`request('${method}', '${url}'): failed to parse JSON: ${resText}`);
            errorToast('An unexpected error occurred.');
            return {
                ok: false,
                body: null,
            };
        }
    }

    return {
        ok: res.ok,
        body: resBody,
    };
}

function makeNotificationElement(notification) {
    const elem = document.createElement('div');
    elem.innerHTML = notification;
    // TODO
    return elem;
}