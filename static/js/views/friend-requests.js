document.querySelectorAll('.btn-cancel').forEach(btn => {
    const fromId = btn.getAttribute('data-from-id');
    const toId   = btn.getAttribute('data-to-id');

    btn.addEventListener('click', async () => {
        const {ok, body} = await request('DELETE', `/friendRequests?from=${fromId}&to=${toId}`);
        if (ok) {
            scheduleSuccessToast('Request cancelled');
            const url = new URL(location);
            url.searchParams.delete('tab');
            url.searchParams.append('tab', 'sent');
            location.assign(url);
        } else {
            errorToast(body.message);
        }
    });
});

document.querySelectorAll('.btn-accept').forEach(btn => {
    const fromId = btn.getAttribute('data-from-id');
    const toId   = btn.getAttribute('data-to-id');

    btn.addEventListener('click', async () => {
        const {ok, body} = await request('DELETE', `/friendRequests?from=${fromId}&to=${toId}&action=accept`);
        if (ok) {
            scheduleSuccessToast('Request accepted');
            location.reload();
        } else {
            errorToast(body.message);
        }
    });
});

document.querySelectorAll('.btn-reject').forEach(btn => {
    const fromId = btn.getAttribute('data-from-id');
    const toId   = btn.getAttribute('data-to-id');

    btn.addEventListener('click', async () => {
        const {ok, body} = await request('DELETE', `/friendRequests?from=${fromId}&to=${toId}&action=reject`);
        if (ok) {
            scheduleSuccessToast('Request rejected');
            location.reload();
        } else {
            errorToast(body.message);
        }
    });
});