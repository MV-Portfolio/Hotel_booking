$(document).ready(function() {
    $("nav .register").click(openRegister);
    $("nav .login").click(openLogin);
    $("#modal-container .close").click(closeModals);
});


function openRegister() {
    $("#modal-container").show();
    $("#modal-register").show();
    $("#modal-login").hide();
}

function openLogin() {
    $("#modal-container").show();
    $("#modal-login").show();
    $("#modal-register").hide();
}

function closeModals() {
    $("#modal-container").hide();
    $("#modal-register").hide();
    $("#modal-login").hide();
}
