function cancelBooking(booking_id) {
    $.post('/cancel-booking.json', { booking_id: booking_id })
        .then(function() { location.reload(); });
}
