/**
 * ジャンプ機能群
 */

/**
 * LatLonから飛ぶ場所取得。多分ね、確認して。
 * @param {*} record_id 
 * @param {*} record 
 */
function move_map(record_id, record) {
    for ( var num in record) {
        if (record[num]["id"] == record_id) {
            jump_point = record[num];
            break;
        }
    }
    console.log(jump_point)
    latitude = jump_point['lat']
    longitude = jump_point['lon']
    zoom_Level = jump_point['zoom']
    jumpLocation(jump_point['N'])
}

/**
 * 飛ぶ場所とズームレベルを取得。多分ね、確認して。
 * @param {*} N 
 */
function jumpLocation(N) {
	var zoomLevel;
	N = Number(N);
    //**********jump to coordinate which is input by user on GIS**********
	if (N == -1) {
		var char_y = document.locationSetForm.latitude.value;
		var char_x = document.locationSetForm.longitude.value;
		zoomLevel = document.locationSetForm.select_zoom.value;
	} else if (N == 1) {
		var char_y = FootprintHist[N-1][1];
		var char_x = FootprintHist[N-1][0];
		zoomLevel = 1500000;
	} else if (N == 2) {
		var char_y = FootprintHist[N-1][1];
		var char_x = FootprintHist[N-1][0];
		zoomLevel = 1500000;
        //**********default display**********
	} else if (N == 3) {
        var char_y = latitude;
        var char_x = longitude;
        var zoomLevel = zoom_Level;
        //**********jump to GIS from user's home**********
    } else if (N == 4) {
        var char_y = latitude;
        var char_x = longitude;
        var zoomLevel = zoom_Level;
        //**********add code which open graph palet, thumbnail palet**********
    } else {
        // NOT REACHED
	}

	var y = parseFloat(char_y);
	var x = parseFloat(char_x);
	if ((y >= -90) && (y <= 90)) {
        var ellipsoid = new Cesium.Ellipsoid(1, 1, 1);
        roots.map.camera.flyTo({
            destination:Cesium.Cartesian3.fromDegrees(x, y, zoomLevel, ellipsoid, new Cesium.Cartesian3())
        });
        var xx = String(x);
        var yy = String(y);
	} else {
		alert("input lat/long value is invalid");
	};
};