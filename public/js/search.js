$(document).ready(function() {
    var query = $(".query").val();
    searchMap(query);
});

function bookRoom(room_id, price) {
    $.post("/add-booking.json", {
        room_id: room_id,
        checkin: $(".checkin").val(),
        checkout: $(".checkout").val(),
        price: price
    }, function() {
        alert("Room successfully booked!");
    });
}
