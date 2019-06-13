function deleteRoom(room_id) {
    $.post('/delete-room.json', { room_id: room_id })
        .then(function() { location.reload(); });
}
