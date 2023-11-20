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

function infoToast(text) {
    Toast.fire({
        icon: 'info',
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

function elt(tag, classes, ...children) {
    const e = document.createElement(tag);
    for (const c of classes) {
        e.classList.add(c);
    }
    for (const child of children) {
        e.append(child);
    }
    return e;
}
