const _successToastKey = 'checkers-success-toast';

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

const _tooltips = new WeakMap();

document.addEventListener('DOMContentLoaded', () => {
    for (const x of document.querySelectorAll('[data-bs-toggle="tooltip"]')) {
        const tooltip = new bootstrap.Tooltip(x);
        _tooltips.set(x, tooltip);
    }
});