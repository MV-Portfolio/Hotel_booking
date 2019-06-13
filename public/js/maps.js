var map;
var infowindow;
var geocoder;
var places;

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: -25.363, lng: 131.044 },
        zoom: 4
    });

    infowindow = new google.maps.InfoWindow();
    geocoder = new google.maps.Geocoder();
    places = new google.maps.places.PlacesService(map);
}

function searchMap(query) {
    geocoder.geocode({ "address": query }, function(results, status) {
        if (status == "OK") {
            map.setCenter(results[0].geometry.location);
            map.setZoom(15);
            markNearbyHotels(results[0].geometry.location);
        }
    });
}

function markNearbyHotels(place) {
    var request = {
        location: place,
        radius: "600",
        type: ["lodging"]
    };

    places.nearbySearch(request, function(results, status, pagination) {
        if (status !== google.maps.places.PlacesServiceStatus.OK) return;
        $.each(results, function(_, result) { createMarker(result); });
    });
}

function createMarker(place) {
    var marker = new google.maps.Marker({
        map: map,
        position: place.geometry.location
    });

    google.maps.event.addListener(marker, "click", function() {
        infowindow.setContent(place.name);
        infowindow.open(map, this);
    });
}

