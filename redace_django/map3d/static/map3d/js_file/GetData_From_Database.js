/**
 * データベースやDjangoのPythonファイルと通信する関数群
 */

// 下記、グローバル変数
var entity = new Cesium.Entity();
var flagEntity = 0;
var ratio_flag = false;
var ratio_flag2 = false;
var ratio_layer;
var ratio_layer_g;
var downCheckList = [];
var FootprintHist = new Array(2);
var htmlSaveButton;
var baseLayersList = ['MOLA_THEMIS_blend', 'MOLA_color', 'MDIM21_color', 'VIKING', 'THEMIS_night', 'THEMIS', 'MDIM21'];
var overlayLayersList = ['CRISM', 'THEMIS', 'Mars500K_Quads', 'Mars2M_Quads', 'Mars5M_Quads', 'NOMENCLATURE'];
var thumbnail_root = '/mnt';

Object.defineProperty(Object.prototype, 'forIn', {
    value: function (fn, self) {
        self = self || this;
        Object.keys(this).forEach(function (key, index) {
            var value = this[key];
            fn.call(self, key, value, index);
        }, this);
    },
});

var flag_STATE = {
    Red: 1,
    Green: 2,
    RedUpper: 4,
    GreenUpper: 8,
    None: 16,
};
var flag_thumbnailX = 0;
flag_thumbnailX = flag_thumbnailX | flag_STATE.None;
var flag_ref_position = true;
var clickCircle;
var wyoming;
var wyoming2;
var contentAncBox1 = {};
var contentAncBox2 = {};

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        let cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            let cookie = jQuery.trim(cookies[i]);
            if (cookie.substring(0, name.length + 1) === name + '=') {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
let csrftoken = getCookie('csrftoken');

/**
 * 地図上でクリックされた緯度経度のデータを持って来る
 * @param {*} lon 
 * @param {*} lat 
 * @returns 
 */
function fetchDataClickedCoordinates(lon, lat, checker) {
    let radiusCircle;
    const range = document.getElementById("rangeInput").value;
    if(checker == 'search' || checker == 'spectral_move'){
        radiusCircle = 0;
    }
    else if(range >= 0){
        radiusCircle = range*1000;
    }
    else{
        radiusCircle = Math.abs(document.getElementById('circle_mouse').value);
    }
    roots.map.entities.remove(clickCircle);
    getMousePosition();
    clickCircle = roots.map.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 0, roots.map.scene.globe.ellipsoid, new Cesium.Cartesian3()),
        ellipse: {
            semiMinorAxis: radiusCircle,
            semiMajorAxis: radiusCircle,
            height: -2975000,
            material: Cesium.Color.CHARTREUSE.withAlpha(0.6),
            outline: true,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 150,
        },
    });

    let numLayers = roots.map.imageryLayers.length;
    viewModel.layers.splice(0, viewModel.layers.length);
    for (let i = numLayers - 1; i >= 0; --i) {
        viewModel.layers.push(roots.map.imageryLayers.get(i));
    }

    flagEntity = 0;
    entity.description = {
        getValue: function () {
            return '';
        },
    };
    entity.name = 'Ancillary Info.';
    roots.map.selectedEntity = entity;

    lon %= 360;
    if (lon > 180) {
        lon -= 360;
    } else if (lon < -180) {
        lon += 360;
    }

    let layerList = [];
    // let currentBaseLayer;
    let wLayer1, wLayer2, whereBaseLayer;

    for (let i = 0; i < layer_check.layers.length; i++) {
        if (layer_check.layers[i]._show === true) {
            wLayer1 = layer_check.layers[i]._isBaseLayer;
            wLayer2 = layer_check.layers[i]._imageryProvider._layers;
            if (baseLayersList.indexOf(wLayer2) >= 0) {
                whereBaseLayer = i;
            } else {
                if (overlayLayersList.indexOf(wLayer2) < 0 && wLayer2 != void 0 && wLayer2 != 'test') {
                    if (whereBaseLayer == void 0) layerList.push(wLayer2);
                }
            }
            // if (wLayer1 == true) currentBaseLayer = wLayer2;
        }
    }

    if (layerList.length <= 0) return 0;

    let featureClickedCoordinates = {
        // "REQUEST": "GetFeatureInfo",
        // "VERSION": "NULL",
        // "SRS": "IAU2000:49900",
        QUERY_LAYERS: layerList,
        RADIUS_CIRCLE: radiusCircle,
        // "LAYERS": currentBaseLayer,
        // "WIDTH": "NULL",
        // "HEIGHT": "NULL",
        // "INFO_FORMAT": "json",
        X: lat,
        Y: lon,
    };

    console.log('====================')
    console.log('featureClickedCoordinates');
    console.log(featureClickedCoordinates);
    console.log('====================')

    $.ajax({
        type: 'POST',
        headers: { 'X-CSRFToken': csrftoken },
        url: 'db/',
        contentType: 'application/json',
        data: JSON.stringify(featureClickedCoordinates),
    }).then(
        function (data) {
            console.log('SUCCESS >> fetchDataClickedCoordinates');
            displayObsIdBox(data);
        },
        function () {
            console.log('ERROR >> fetchDataClickedCoordinates');
            alert('読み込み失敗');
        }
    );
}

/**
 * 関数fetchDataClickedCoordinatesで見つけたデータのリストを受け取る, ID一覧を表示する(ID_box)
 * @param {*} data 
 */
function displayObsIdBox(data) {
    console.log('=============-');
    console.log('displayObsIdBox')
    console.log(data);
    console.log('===========');
    let dataObject = JSON.parse(data);

    if (dataObject['hit_data'][0][0]['features'].length > 0) {
        let i;
        let obsCount = 0;
        let idSet = document.getElementById('IDArea');
        idSet.innerHTML = '';
        
        let offsetX, offsetY, isDragging = false;

        idSet.addEventListener("mousedown", (e) => {
            isDragging = true;
            offsetX = e.clientX - idSet.offsetLeft;
            offsetY = e.clientY - idSet.offsetTop;
            idSet.style.cursor = "grabbing";
        });

        document.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            idSet.style.left = `${e.clientX - offsetX}px`;
            idSet.style.top = `${e.clientY - offsetY}px`;
        });

        document.addEventListener("mouseup", () => {
            isDragging = false;
            idSet.style.cursor = "grab";
        });

        for (let j = 0; j < dataObject['hit_data'].length; j++) {
            let obsName = dataObject['hit_data'][j][0]['features'][0]['properties']['name'];
            let obsId = dataObject['hit_data'][j][0]['features'][0]['properties']['id'];
            let htmlObsIdBox = `
                <div class="button_obs">${obsName.toUpperCase()}
                    <button type="button" class="cesium-infoBox-close" onclick="removeElement(this)"}">×</button>
                </div>
                <form id="IDproduct${j}" name="IDproduct${j}">
                <input type="button" class="button_tra" name="product_ID${obsCount}" value="${obsId}" style="float:left;">`;

            for (i = 1; i < dataObject['hit_data'][j][0]['features'].length; i++) {
                if (i % 2 != 0) {
                    let min = String(Math.min((j + 1) * (4 + (i / 2 + 1) * 54), 300));
                    idSet.style.height = `${min}px`;
                }
                let num = i + obsCount;
                obsId = dataObject['hit_data'][j][0]['features'][i]['properties']['id'];
                htmlObsIdBox = `
                    ${htmlObsIdBox}
                    <input type="button" class="button_tra" name="product_ID${num}" value="${obsId}" style="float:left;">`;
            }

            let elementProductID = document.createElement('div');
            elementProductID.id = 'product_ID';
            elementProductID.innerHTML = `${htmlObsIdBox}</form>`;

            idSet.style.width = '320px';
            idSet.style.padding = '0px';
            idSet.style.margin = '0px';
            idSet.appendChild(elementProductID);

            for (i = 0; i < dataObject['hit_data'][j][0]['features'].length; i++) {
                let num = i + obsCount;
                let query = `#IDproduct${j} input[name="product_ID${num}"]`;
                let func = getAncillaryData.bind(null, dataObject['hit_data'][j][0]['features'][i]);
                document.querySelector(query).addEventListener('click', func);
            }
            obsCount += i;
        }
    }
}

/**
 * xボタン
 * @param {*} button 
 */
function removeElement(button) {
    let parent = button.parentNode.parentNode;
    parent.remove();
}

/**
 * Observation ID Box でクリックされたデータを受け取る
 * @param {*} data 
 */
function getAncillaryData(data) {
    console.log('getAncillaryData')
    console.log('===========')
    console.log(data)
    console.log('===========')
    $.ajax({
        type: 'POST',
        headers: { 'X-CSRFToken': csrftoken },
        url: 'dir/',
        contentType: 'application/json',
        data: JSON.stringify(data),
    }).then(
        function (data) {
            console.log('SUCCESS >> getAncillaryData');
            // console.log(data);
            displayThumbnailWindow(data);
        },
        function () {
            console.log('ERROR >> getAncillaryData');
            alert('読み込み失敗');
        }
    );
}

// loading時のエフェクト
let $loading = $('.cssload-thecube');
let $loading2 = $('.back-loading');

/**
 * イメージエリアの全ピクセルのスペクトルデータを取り出す
 * 使用してない
 * @param {*} obs_name 
 * @param {*} obs_ID 
 * @param {*} path 
 * @param {*} wavelength 
 * @param {*} flag 
 */
function getSpectralDataAll(obs_name, obs_ID, path, wavelength, flag) {
    $.ajax({
        type: 'POST',
        headers: { 'X-CSRFToken': csrftoken },
        url: 'reflectance/',
        contentType: 'application/json',
        data: JSON.stringify({
            operation: 'get',
            obs_name: obs_name,
            obs_ID: obs_ID,
            path: path,
            wavelength: wavelength,
            flag: flag,
        }),
    }).then(
        function (data) {
            console.log('SUCCESS >> getSpectralDataAll');
            download_csv_spectral_allpixel(data);
        },
        function () {
            console.log('ERROR >> getSpectralDataAll');
            alert('読み込み失敗');
        }
    );
}

/**
 * イメージエリアでクリックされたピクセルにデータがあれば取り出す
 * @param {*} px 
 * @param {*} imgSize 
 * @param {*} obsID 
 * @param {*} path 
 * @param {*} imgPath 
 * @param {*} obsName 
 * @param {*} wav 
 */
function getSpectralDataClickedPixel(px, imgSize, obsID, path, imgPath, obsName, wav) {
    // console.log(px);
    // console.log(imgSize);
    // console.log(obsID);
    // console.log(path);
    // console.log(imgPath);
    // console.log(obsName);
    // console.log(wav);

    // 左下基準の取得ピクセルを左上基準に変更（Cubデータが左上基準より）
    px[1] = imgSize[1] - px[1];

    // pixel座標がイメージサイズ(四角形)より内側ならデータ探す
    // ピクセル座標、左下基準。
    if (px[0] <= imgSize[0] && px[1] <= imgSize[1] && 0 <= px[0] && 0 <= px[1]) {
        $.ajax({
            type: 'POST',
            headers: { 'X-CSRFToken': csrftoken },
            url: 'reflectance/',
            contentType: 'application/json',
            data: JSON.stringify({
                operation: 'get',
                obs_name: obsName,
                obs_ID: obsID,
                path: path,
                Image_path: imgPath,
                wavelength: wav,
                pixels: px,
                // cube_coords: cube_coords,
                type: 'DIRECT',
            }),
            beforeSend: function () {
                $loading.removeClass('is-hide');
                $loading2.removeClass('is-hide');
            },
        }).then(
            function (data) {
                $loading.addClass('is-hide');
                $loading2.addClass('is-hide');
                console.log('SUCCESS >> getSpectralDataClickedPixel');
                // console.log(data);
                displaySpectralBox(data);
            },
            function () {
                $loading.addClass('is-hide');
                $loading2.addClass('is-hide');
                console.log('ERROR >> getSpectralDataClickedPixel');
                alert('読み込み失敗');
            }
        );
    } else {
        alert('No data.');
    }
}

/**
 * イメージエリアのselectモードで選択した複数ピクセルのスペクトルデータを取得
 * @param {*} pxArray 
 * @param {*} imgSize 
 * @param {*} obsID 
 * @param {*} path 
 * @param {*} imgPath 
 * @param {*} obsName 
 * @param {*} wav 
 */
function getSpectralDataRoiArea(pxArray, imgSize, obsID, path, imgPath, obsName, wav) {
    // 途中
    // cubデータが左上基準だから調整しているのだと思う。。
    // pxArray[0][0] = pxArray[0][0] - 1;
    // pxArray[1][0] = pxArray[1][0] - 1;
    // pxArray[0][1] = imgSize[1] - pxArray[0][1] - 1;
    // pxArray[1][1] = imgSize[1] - pxArray[1][1] - 1;

    let newPxArr = [];
    for (let i = 0; i < pxArray.length; i++) {
        newPxArr[i] = [];
        newPxArr[i].push(pxArray[i][0]);
        newPxArr[i].push(imgSize[1] - pxArray[i][1]);
    }

    $.ajax({
        type: 'POST',
        headers: { 'X-CSRFToken': csrftoken },
        url: 'reflectance/',
        contentType: 'application/json',
        data: JSON.stringify({
            operation: 'get',
            pixels: newPxArr,
            obs_name: obsName,
            obs_ID: obsID,
            path: path,
            Image_path: imgPath,
            wavelength: wav,
            // cube_coords: cube_coords,
            type: 'ROI',
        }),
        beforeSend: function () {
            $loading.removeClass('is-hide');
            $loading2.removeClass('is-hide');
        },
    }).then(
        function (data) {
            $loading.addClass('is-hide');
            $loading2.addClass('is-hide');
            console.log('SUCCESS >> getSpectralDataRoiArea');
            // console.log(data);
            displaySpectralBox(data);
            // download_csv_roi_area(data);
        },
        function () {
            $loading.addClass('is-hide');
            $loading2.addClass('is-hide');
            console.log('ERROR >> getSpectralDataRoiArea');
            alert('読み込み失敗');
        }
    );
}

spectral_jagged = new Array(3);