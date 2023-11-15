document.querySelectorAll('.btn-unfriend').forEach(btn => {
    const id = btn.getAttribute('data-id');
    btn.addEventListener('click', async () => {
        const {ok, body} = await request('DELETE', `/friends?id=${id}`);
        if (!ok) {
            errorToast(body?.message);
        } else {
            scheduleSuccessToast('Friendship ended');
            location.reload();
        }
    });
});