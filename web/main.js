/*
 *
 * Ursprung: (links unten): {lat: -2.8115, lng: -0}
 * 1km lat === 0.188 ===>
 * 1km lng === 0.189
 */
var dataUrl = 'http://' + (document.location.host || 'localhost') + ':12302/';
var initialZoom = 7;
var tileSize = 256;
var map;
function log2(x) {
    return Math.log(x) / Math.LN2;
}
function isOutOfBounds(coords, zoom) {
    var numTiles = Math.pow(2, zoom - 1);
    if (coords.y < 0 || coords.y >= numTiles) {
        return null;
    }
    if (coords.x < 0 || coords.x >= numTiles) {
        return null;
    }
}
var armaMapType = new google.maps.ImageMapType({
    getTileUrl: function (coord, zoom) {
        var x = coord.x;
        var y = coord.y;
        var numTiles = Math.pow(2, zoom - 1);
        /*if (isOutOfBounds(coord, zoom)) {
            return null;
        }*/
        var tileZoom = zoom - initialZoom;
        x = x - numTiles;
        y = y - numTiles;
        console.log('map coords ' + coord.x + ' / ' + coord.y + ', zoom: ' + zoom + '. looking for tiles ' + tileZoom + ' / ' + x + ' / ' + y);
        var myY = Math.pow(2, tileZoom) - (y + 1);
        var baseURL = 'stratis_18022/';
        baseURL += [tileZoom, x, myY].join('/') + '.png';
        return baseURL;
    },
    tileSize: new google.maps.Size(tileSize, tileSize),
    isPng: true,
    minZoom: initialZoom,
    maxZoom: initialZoom + 7,
    name: 'Stratis T10'
});
function init() {
    map = new google.maps.Map(document.querySelector('#map'), {
        zoom: 7,
        center: new google.maps.LatLng(0, 0),
        mapTypeControlOptions: {
            mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'armaMapType']
        }
    });
    map.mapTypes.set('map', armaMapType);
    map.setMapTypeId('map');
}
google.maps.event.addDomListener(window, 'load', init);
/**
 * in-game coordinates are in meters, with 0,0 at south west corner of map
 * @param x
 * @param y
 * @param z
 *
 * For simplicity's sake, I will translate
 *
 */
function gameCoordsToLatLng(x, y) {
    return new google.maps.LatLng(y * 0.000189 + +-2.8115, x * 0.000188);
}
function latLngToGameCoords(latLng) {
    return {
        x: latLng.lat() / 0.000188,
        y: latLng.lng() + 2.8115 / 0.000189,
        z: 0
    };
}
setInterval(function () {
    var markers = {};
    $.get(dataUrl, function (data) {
        _.each(data, function (val, name) {
            var m = markers[name] || new google.maps.Marker({
                position: { lat: 0, lng: 0 },
                map: map,
                title: name
            });
            m.setPosition(gameCoordsToLatLng(val[0], val[1]));
            markers[name] = m;
        });
    });
}, 2000);
//# sourceMappingURL=main.js.map