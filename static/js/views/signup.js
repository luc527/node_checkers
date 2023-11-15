const form = document.forms['signup'];

form.onsubmit = async ev => {
    ev.preventDefault();

    const username = form.username.value;
    const password = form.password.value;

    // TODO 1 is for testing
    const passwordMinLength = 1;

    if (password.length < passwordMinLength) {
        Toast.fire({
            icon: 'error',
            text: `Password too short (minimum ${passwordMinLength} characters)`,
        });
        return;
    }

    const response = await request('POST', '/signup', {username, password});
    if (!response) {
        return;
    }

    if (!response.ok) {
        errorToast(response.body.message);
        return;
    }

    scheduleSuccessToast('Signed up successfully!')

    location.assign('/login');
};