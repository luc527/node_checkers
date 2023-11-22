const form = document.forms['human-form'];

form.addEventListener('submit', async ev => {
    ev.preventDefault();

    const opponentName = encodeURIComponent(form.opponent.value ?? '').trim();
    const color        = encodeURIComponent(form.color.value);

    if (opponentName.length == 0) {
        errorToast(`Username missing`);
        return;
    }

    const {status, body} = await request('GET', `/users/checkName?name=${(opponentName)}`);
    if (status == 404) {
        errorToast(`User "${opponentName}" not found`);
    } else if (status == 200) {
        location.assign(`/play?mode=human&opponentId=${body.id}&color=${color}`);
    } else {
        errorToast(`Failed to check username: ${body.message}`);
    }
});