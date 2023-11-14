const form = document.forms['login'];

form.onsubmit = async ev => {
    ev.preventDefault();

    const username = form.username.value;
    const password = form.password.value;

    const response = await request('POST', '/login', {username, password});
    if (!response) {
        return;
    }

    if (!response.ok) {
        errorToast(response.body.message);
        return;
    }

    scheduleSuccessToast('Logged on successfully!');

    location.assign('/');
};