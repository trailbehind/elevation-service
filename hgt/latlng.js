// Copied from https://github.com/perliedman/node-hgt/blob/master/src/latlng.js
module.exports = function _latLng(ll) {
    if (ll.lat !== undefined && ll.lng !== undefined) {
        return ll;
    }

    return new LatLng(ll[0], ll[1])
};

function LatLng(lat, lng) {
  this.lat = lat;
  this.lng = lng;
}

LatLng.prototype = {
  toString: function() {
    return 'lat=' + this.lat + ', lng=' + this.lng
  }
}