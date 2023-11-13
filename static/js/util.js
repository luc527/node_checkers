const _successToastKey = 'checkers-success-toast';
const _accessTokenKey = 'checkers-access-token';

const _successToast = sessionStorage.getItem(_successToastKey);
if (_successToast) {
    Toast.fire({
        icon: 'success',
        text: _successToast,
    });
    sessionStorage.removeItem(_successToastKey);
}

function scheduleSuccessToast(text) {
    sessionStorage.setItem(_successToastKey, text);
}


function errorToast(text) {
    Toast.fire({
        icon: 'error',
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
            return false;
        }
    }

    return {
        ok: res.ok,
        body: resBody,
    };
}