document.querySelectorAll('.btn-send-request').forEach(btn => {
    const id = btn.getAttribute('data-id');
    btn.addEventListener('click', async () => {
        if (btn.hasAttribute('disabled')) {
            return;
        }
        const {ok, body} = await request('POST', '/friendRequests', {id});
        if (ok) {
            successToast('Friendship request sent');
            btn.setAttribute('disabled', 'disabled');
            
            const tooltip = _tooltips.get(btn.parentElement)
            tooltip?.setContent({'.tooltip-inner': 'Already sent request'});
            tooltip?.hide();
        } else {
            errorToast(body.message);
        }
    });
});
