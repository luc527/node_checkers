// Forma de uso: Toast.fire(...) no mesmo lugar que seria Swal.fire(...)
const Toast = Swal.mixin({
    toast: true,
    position: 'top-right',
    iconColor: 'white',
    customClass: {
        popup: 'colored-toast'
    },
    showConfirmButton: false,
    timer: 3000,
})