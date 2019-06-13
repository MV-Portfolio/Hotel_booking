function onGoogleSignIn(google_user) {
    var id_token = google_user.getAuthResponse().id_token;
    $.post('/login-openid.json', { openid_token: id_token }, function() {
        var auth2 = gapi.auth2.getAuthInstance();
        auth2.signOut().then(function() {
            window.location.reload();
        });
    });
}
