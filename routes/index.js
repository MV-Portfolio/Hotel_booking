var express = require('express');
var router = express.Router();
var moment = require('moment');

var CLIENT_ID = '334165856871-71o1a8v5kbr5vrevtjgsbkmo1qpt4vj9.apps.googleusercontent.com';
var {OAuth2Client} = require('google-auth-library');
var google_client = new OAuth2Client(CLIENT_ID);

var sessions = {};

/*

    Home page

*/

router.get('/', function(req, res) {
    res.render('index', {
        title: 'FindHotels',
        user: sessions[req.session.id],
        client_id: CLIENT_ID
    });
});

/*

    User login

*/

function authenticateSession(session_id, user_id, email, first_name, type) {
    sessions[session_id] = {
        'id': user_id,
        'username': email,
        'first_name': first_name,
        'type': type
    }
}

router.post('/login-openid.json', function(req, res) {
    var data = req.body;
    var sql_query;

    if (data.openid_token === undefined) return;

    async function verify() {
        const ticket = await google_client.verifyIdToken({
            idToken: data.openid_token,
            audience: CLIENT_ID
        });

        const payload = ticket.getPayload();
        const google_id = payload.sub;

        req.pool.getConnection(function(err, conn) {
            if (err) throw err;

            sql_query = 'SELECT * FROM user WHERE email = "' + payload.email + '"';
            conn.query(sql_query, function(err, results) {
                if (err) throw err;

                if (results.length == 0) {
                    sql_query = 'INSERT INTO user (email, google_id, last_name, first_name) VALUES ("' +
                        payload.email + '", "' +
                        google_id + '", "' +
                        payload.family_name + '", "' +
                        payload.given_name + '")';
                    conn.query(sql_query, function(err, result) {
                        if (err) throw err;
                        authenticateSession(req.session.id, result.insertId, payload.email,
                                            payload.given_name, 'user');

                    });
                }

                else if (results[0].google_id === google_id) {
                    authenticateSession(req.session.id, results[0].user_id, results[0].email,
                                        results[0].first_name, 'user');
                }
            });

            conn.release();
            res.redirect('/');
        });
    }

    verify().catch(console.error);
});

router.post('/login-credential.json', function(req, res) {
    var data = req.body;
    var sql_query;

    req.pool.getConnection(function(err, conn) {
        if (err) throw err;

        sql_query = 'SELECT * FROM user WHERE email = "' + data.email + '"';
        conn.query(sql_query, function(err, results) {
            if (results.length > 0) {
                var user = results[0];
                if (user.password === data.password) {
                    authenticateSession(req.session.id, user.user_id, user.email, user.first_name, 'user');
                }
            }
        });

        conn.release();
    });

    res.redirect('back');
});

router.get('/logout', function(req, res) {
    if (sessions[req.session.id] !== undefined) {
        req.session.destroy();
    }

    res.redirect('/');
});

/*

    User registraton

*/

router.post('/register.json', function(req, res) {
    var data = req.body;
    var sql_query;

    req.pool.getConnection(function(err, conn) {
        if (err) throw err;

        sql_query = 'SELECT * FROM user WHERE email = "' + data.email + '"';
        conn.query(sql_query, function(err, results) {
            if (err) throw err;

            if (results.length == 0) {
                sql_query = 'INSERT INTO user (email, password, first_name, last_name) VALUES ("' + 
                    data.email + '", "' +
                    data.password + '", "' +
                    data.first_name + '", "' +
                    data.last_name + '")';
                conn.query(sql_query, function(err, result) {
                    if (err) throw err;
                    authenticateSession(req.session.id, result.insertId, data.email,
                                        data.first_name, 'user');
                    res.redirect('back');
                });
            }
        });

        conn.release();
    });
});

/*

    Search results

*/

router.get('/search', function(req, res) {
    var entries = [];
    var sql_query;
    search_query = req.query.q;

    req.pool.getConnection(function(err, conn) {
        if (err) throw err;

        sql_query = 'SELECT room.room_id as id, hotel.name as hotel, ' +
                        'hotel.address as address, room.beds as beds, ' +
                        'room.bathrooms as bathrooms, room.aircon as aircon, ' +
                        'room.wifi as wifi, room.price as price ' +
                    'FROM hotel INNER JOIN room ' +
                    'ON hotel.hotel_id = room.hotel_id ' +
                    'WHERE room.removed = false';
        conn.query(sql_query, function(err, results) {
            if (err) throw err;
            res.render('search', {
                title: 'Search Results | FindHotels',
                user: sessions[req.session.id],
                client_id: CLIENT_ID,
                entries: results,
                query: req.query.q,
                checkin: moment().format('YYYY-MM-DD'),
                checkout: moment().add(1, 'days').format('YYYY-MM-DD')
            });
        });

        conn.release();
    });
});

/*

    Manage bookings

*/

router.get('/bookings', function(req, res) {
    if (sessions[req.session.id] === undefined ||
        sessions[req.session.id].type !== 'user') {
        res.redirect('/');
        return;
    }

    req.pool.getConnection(function(err, conn) {
        if (err) throw err;

        var sql_query = 'SELECT ' + 
                            'booking.booking_id as id, ' +
                            'hotel.name AS hotel, ' +
                            'booking.checkin AS checkin, ' +
                            'booking.checkout AS checkout, ' +
                            'booking.price AS price ' +
                        'FROM booking INNER JOIN room ' +
                            'ON booking.room_id = room.room_id ' +
                        'INNER JOIN hotel ' +
                            'ON room.hotel_id = hotel.hotel_id ' +
                        'WHERE ' +
                            'booking.user_id = ' + sessions[req.session.id].id + ' AND ' +
                            'booking.cancelled = false';
        conn.query(sql_query, function(err, results) {
            if (err) throw err;

            for (var i = 0; i < results.length; i++) {
                results[i].checkin = moment(results[i].checkin).format('YYYY-MM-DD');
                results[i].checkout = moment(results[i].checkout).format('YYYY-MM-DD');
            }

            res.render('bookings', {
                title: 'Manage Bookings | FindHotels',
                user: sessions[req.session.id],
                client_id: CLIENT_ID,
                bookings: results
            });
        });

        conn.release();
    });
});

router.post('/add-booking.json', function(req, res) {
    if (sessions[req.session.id] === undefined) return;
    var room_id, sql_query;
    var data = req.body;

    console.log(data);

    req.pool.getConnection(function(err, conn) {
        if (err) throw err;

        sql_query = 'INSERT INTO booking (room_id, user_id, checkin, checkout, price) VALUES (' +
                        data.room_id + ', ' +
                        sessions[req.session.id].id + ', "' +
                        data.checkin + '", "' + 
                        data.checkout + '", ' +
                        data.price + ')';
        conn.query(sql_query, function(err, results) {
            if (err) throw err;
        });

        conn.release();
    });

    res.sendStatus(200);
});

router.post('/cancel-booking.json', function(req, res) {
    var sql_query;
    var data = req.body;

    req.pool.getConnection(function(err, conn) {
        if (err) throw err;

        sql_query = 'UPDATE booking ' +
                    'SET cancelled = true ' +
                    'WHERE booking_id = ' + data.booking_id;
        conn.query(sql_query, function(err, results) {
            if (err) throw err;
        });

        conn.release();
    });

    res.redirect('/bookings');
});


/*

    Manage rooms

*/

router.get('/rooms', function(req, res) {
    if (sessions[req.session.id] === undefined ||
        sessions[req.session.id].type !== 'manager') {
        res.redirect('/');
        return;
    }

    var username = sessions[req.session.id].username;
    var user = users[username];
    var hotel = hotels[user.hotel_id];

    var user_rooms = [];
    for (var i = 0; i < rooms.length; i++) {
        var room = rooms[i];
        if (room.hotel_id === users[username].hotel_id && !room.deleted) {
            user_rooms.push(room);
        }
    }

    res.render('rooms', {
        title: 'Manage Rooms | FindHotels',
        user: sessions[req.session.id],
        client_id: CLIENT_ID,
        hotel_name: hotel.name,
        rooms: user_rooms
    });
});

router.post('/delete-room.json', function(req, res) {
    rooms[req.body.room_id].deleted = true;
    writeToFile('data/rooms.json', rooms);
    res.redirect('back');
});

module.exports = router;
