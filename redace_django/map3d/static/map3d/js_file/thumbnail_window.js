/**
 * イメージエリアに関する関数群
 */

var existThumbnailWindow = 'None';
var historyJson1 = [];
var historyJson2 = [];
var countHistory1 = 0;
var countHistory2 = 0;
var historyTop1 = '';
var historyTop2 = '';

// window.alert = function (msg) {
//     jsFrame.showToast({ text: msg, align: 'center' });
// };

/**
 * JSFrame:JSライブラリ
 * フローティングウィンドウ初期化
 */
const jsFrame = new JSFrame({
    horizontalAlign: 'left',
    verticalAlign: 'top',
    parentElement: document.querySelector('#image_move'),
});

/**
 * フローティングウィンドウの生成
 * @param {*} frameNum 
 * @param {*} dataObj 
 * @param {*} color 
 * @param {*} footprintLayer 
 * @param {*} data 
 */
function createThumbnailFrame(frameNum, dataObj, color, footprintLayer, data) {
    let frameName = `thumbnail_frame${frameNum}`;

    const frame = jsFrame
        .create({
            name: frameName,
            title: dataObj['obs_ID'],
            left: 0,
            top: 180,
            width: 520,
            height: 540,
            minWidth: 400,
            minHeight: 400,
            movable: true,
            resizable: false,
            appearanceName: 'material',
            appearanceParam: {
                border: {
                    color: 'rgb(244, 133, 133)',
                    width: 1,
                },
                titleBar: {
                    leftMargin: 40,
                    color: 'white',
                    background: 'rgba(0,0,0,0.9)',
                    buttons: [
                        //Set font-awesome fonts(https://fontawesome.com/icons?d=gallery&m=free)
                        { fa: 'fas fa-times', name: 'closeButton', visible: true },
                        { fa: 'fas fa-window-maximize', name: 'maximizeButton', visible: true },
                        { fa: 'fas fa-window-restore', name: 'demaximizeButton', visible: false },
                        { fa: 'fas fa-window-minimize', name: 'minimizeButton', visible: true },
                        { fa: 'fas fa-caret-down', name: 'deminimizeButton', visible: false },
                        { fa: 'fas fa-location-arrow', name: 'location_jump', visible: true },
                        { fa: 'fas fa-file-download', name: 'download_all_ref', visible: true },
                        { fa: 'fas fa-info-circle', name: 'ancillaryInfo', visible: true },
                    ],
                    buttonsOnLeft: [
                        {
                            fa: 'fas fa-bars',
                            name: `menu${frameNum}`,
                            visible: true,
                            leftMargin: 40,
                            childMenuHTML: `
                                <div class="list-group">
                                    <div name="menu1" class="list-group-item list-group-item-action py-2">Menu Item 01</div>
                                    <div name="menu2" class="list-group-item list-group-item-action py-2">Menu Item 02</div>
                                    <div name="menu3" class="list-group-item list-group-item-action py-2">Menu Item 03</div>
                                </div>`,
                            childMenuWidth: 300,
                        },
                    ],
                },
            },
            style: {
                backgroundColor: 'rgba(0,0,0,0.9)',
                overflow: 'auto',
            },
            html: `
                <div id="${frameName}">
                    <div id="click_position${frameNum}"></div>
                    <div class="get_button${frameNum}">get</div>
                    <div class="remove_switch${frameNum}">remove mode</div>
                    <div class="select_switch${frameNum}">select mode</div>
                    <div class="clear_button${frameNum}">clear</div>
                    <div class="search_area">
                        <div class="search_switch${frameNum}"><i class="fa fa-retweet" style="font-size:13px;"></i></div>
                        <input id="search_input${frameNum}a" type="number" step="1" placeholder=" x (pixel)"/>
                        <input id="search_input${frameNum}b" type="number" step="1" placeholder=" y (pixel)"/>
                        <div class="search_button${frameNum}"><i class="fas fa-search"></i></div>
                    </div>
                    <div id="thumbnail_window${frameNum}" style="border-color:${color};">
                        <div id="ratio_select${frameNum}" name="ratio_select${frameNum}"></div>
                        <div id="slider${frameNum}"></div>
                        <div id="click_history${frameNum}"></div>
                        <div class="coords_type_switch${frameNum}">
                            <label><i class="fa fa-retweet" style="font-size:13px;"></i></label>
                        </div>
                    </div>
                </div>`,
        })
        .show();

    frame.setControl({
        maximizeButton: 'maximizeButton',
        demaximizeButton: 'demaximizeButton',
        minimizeButton: 'minimizeButton',
        deminimizeButton: 'deminimizeButton',
        hideButton: 'closeButton',
        animation: true,
        animationDuration: 150,
        restoreKey: 'Escape',
    });
    frame.control.on('hid', (frame) => {
        if (existThumbnailWindow === 'OnlyOrange') {
            existThumbnailWindow = 'None';
        } else if (existThumbnailWindow === 'OnlyGreen') {
            existThumbnailWindow = 'None';
        } else if (existThumbnailWindow === 'All') {
            if (color === 'orange') {
                existThumbnailWindow = 'OnlyGreen';
            } else if (color === 'green') {
                existThumbnailWindow = 'OnlyOrange';
            }
        }
        roots.map.entities.remove(footprintLayer);
        // CLOSE(frameNum);
        frame.closeFrame();
    });
    frame.on('location_jump', 'click', () => {
        jumpLocation(frameNum);
    });
    frame.on('download_all_ref', 'click', () => {
        getSpectralDataAll(
            dataObj['obs_name'],
            dataObj['obs_ID'],
            dataObj['path'],
            dataObj['ancillary']['band_bin_center'],
            1
        );
    });
    frame.on('ancillaryInfo', 'click', () => {
        displayAncillaryBox(data);
    });
    frame.on(`menu${frameNum}`, 'click', () => {
        // const name = evt.target.getAttribute('name');
        // if (name && name.startsWith('menu' + frameNum)) {
        //     alert(name + 'clicked');
        // }
    });
}

/**
 * 選択した火星マップ上のフットプリントに選択を示すレイヤー重ねる
 * @param {*} obsCoord 
 * @param {*} num 
 * @param {*} name 
 * @param {*} materialColor 
 * @returns 
 */
function overlapFootprintLayer(obsCoord, num, name, materialColor) {
    FootprintHist[num] = obsCoord;
    footprintLayer = roots.map.entities.add({
        name: name,
        polygon: {
            hierarchy: Cesium.Cartesian3.fromDegreesArray(obsCoord, roots.map.scene.globe.ellipsoid),
            perPositionHeight: true,
            clampToGround: true,
            material: materialColor,
            outline: true,
            outlineColor: Cesium.Color.RED,
        },
    });
    return footprintLayer;
}

/**
 * 選択したフットプリントのシーンを表示
 * @param {*} targetElement 
 * @param {*} dataObj 
 * @returns 
 */
function displayThumbnail(targetElement, dataObj) {
    let object = new Object();
    object.extent = [0, 0, dataObj['Mapping']['Image_size'][0], dataObj['Mapping']['Image_size'][1]];
    object.projection = new ol.proj.Projection({
        code: 'EPSG:3857',//'EPSG:4326', // 'pixels',
        units: 'pixels',
        extent: object.extent, // 範囲を表す数値の配列: [minx, miny, maxx, maxy]
    });

    wms_layers.ratio.object = {};
    wms_layers.ratio.object = object;
    let olMap = new ol.Map({
        target: targetElement,
        layers: [
            new ol.layer.Image({
                source: new ol.source.ImageStatic({
                    url: `/collect_static/${dataObj['Image_path']}`, //220928
                    projection: object.projection,
                    imageExtent: object.extent,
                }),
            }),
        ],
        view: new ol.View({
            projection: object.projection,
            extent: object.extent,
            center: ol.extent.getCenter(object.extent),
            zoom: 1,
            maxZoom: 6,
        }),
        logo: false,
        controls: ol.control.defaults().extend([
            new ol.control.OverviewMap(),
            new ol.control.FullScreen(),
            new ol.control.MousePosition({
                coordinateFormat: function (pxCoord) { // pxCoord: mouse position （pixel）
                    if (document.querySelector('.coords_type_switch1').classList.contains('active')) {
                        let pxY = dataObj['Mapping']['Image_size'][1] - Math.floor(pxCoord[1]);
                        let lon = dataObj['cube_coords']['lon'][pxY][Math.floor(pxCoord[0])];
                        let lat = dataObj['cube_coords']['lat'][pxY][Math.floor(pxCoord[0])];
                        return ol.coordinate.format([lon, lat], 'Lon: {x}, Lat: {y}', 5);
                    } else {
                        return ol.coordinate.format(pxCoord, 'Pixel [ x: {x}, y: {y} ]', 2);
                    }
                },
                projection: 'EPSG:3857',//'EPSG:4326',
                undefinedHTML: 'Outside',
            }),
        ]),
    });

    return olMap;
}

let thumbnailNum = 0;
let storeClickedPx = [];

/**
 * ObsIdBoxで選択されたデータのシーンを表示
 * @param {*} data 
 */
function displayThumbnailWindow(data) {
    // console.log(data);
    console.log("displayThumbnailWindow");
    let selectedWindow = 'None';

    // prettier-ignore
    [selectedWindow, existThumbnailWindow] = 
        existThumbnailWindow === 'None' ? ['Orange', 'OnlyOrange'] :
        existThumbnailWindow === 'OnlyOrange' ? ['Green', 'All'] :
        existThumbnailWindow === 'OnlyGreen' ? ['Orange', 'All'] :
        existThumbnailWindow === 'All' ? ['None', 'All'] : alert('ERROR: existThumbnailWindow.') ;

    let dataObj = JSON.parse(data);
    let [imgSize, obsID, path, imgPath, obsName, wav, coordinates] = [
        dataObj['Mapping']['Image_size'],
        dataObj['obs_ID'],
        dataObj['path'],
        dataObj['Image_path'],
        dataObj['obs_name'],
        dataObj['ancillary']['band_bin_center'],
        dataObj['geometry']['coordinates'],
    ];
    let obsCoord = Array.prototype.concat.apply([], Array.prototype.concat.apply([], coordinates));

    if (selectedWindow === 'Orange') {
        displayAncillaryBox(data);
        let layerColor = Cesium.Color.DARKORANGE.withAlpha(0.5);
        let footprintLayer = overlapFootprintLayer(obsCoord, 0, 'ORANGE', layerColor);
        createThumbnailFrame(1, dataObj, 'orange', footprintLayer, data);
        wms_layers.thumbnail = displayThumbnail('thumbnail_window1', dataObj);

        document.querySelector('.get_button1').addEventListener('click', () => {
            thumbnailNum = 0;
            // 赤いピクセルレイヤーを取得
            let pxArray = getSelectedPixels();
            getSpectralDataRoiArea(pxArray, imgSize, obsID, path, imgPath, obsName, wav);
            // 赤いピクセルレイヤーをオレンジに変える
            changePixelsColor(pxArray);
        });
        document.querySelector('.remove_switch1').addEventListener('click', () => {
            document.querySelector('.remove_switch1').classList.toggle('active');
            if (document.querySelector('.select_switch1').classList.contains('active')) {
                document.querySelector('.select_switch1').classList.toggle('active');
            }
        });
        document.querySelector('.select_switch1').addEventListener('click', () => {
            document.querySelector('.select_switch1').classList.toggle('active');
            if (document.querySelector('.remove_switch1').classList.contains('active')) {
                document.querySelector('.remove_switch1').classList.toggle('active');
            }
        });
        document.querySelector('.clear_button1').addEventListener('click', () => {
            thumbnailNum = 0;
            setAlignment([-1, -1], 'clear');
        });
        document.querySelector('.search_switch1').addEventListener('click', () => {
            if (document.getElementById('search_input1a').placeholder == ' x (pixel)') {
                document.getElementById('search_input1a').placeholder = ' Lon';
                document.getElementById('search_input1a').step = '0.00001';
                document.getElementById('search_input1b').placeholder = ' Lat';
                document.getElementById('search_input1b').step = '0.00001';
            } else {
                document.getElementById('search_input1a').placeholder = ' x (pixel)';
                document.getElementById('search_input1a').step = '1';
                document.getElementById('search_input1b').placeholder = ' y (pixel)';
                document.getElementById('search_input1b').step = '1';
            }

        });
        document.querySelector('.search_button1').addEventListener('click', () => {
            const searchInputA = document.getElementById('search_input1a').value;
            const searchInputB = document.getElementById('search_input1b').value;

            console.log("search");
            console.log(searchInputA);
            console.log(searchInputB);

            let pixel;
            if (document.getElementById('search_input1a').placeholder == ' Lon') {
                pixel = getPixelsFromLatLon(searchInputA, searchInputB, dataObj["cube_coords"]);
            } else {
                pixel = [searchInputA, searchInputB]
            }

            console.log(pixel);

            if (document.querySelector('.select_switch1').classList.contains('active')) {
                // 選択モード
                if (storeClickedPx.length === 0) {
                    storeClickedPx.push(pixel);
                    setAlignment(pixel, 1);
                } else {
                    setAlignment(pixel, 2);
                    storeClickedPx.length = 0;
                }
            } else {
                // 直接モード
                setAlignment(pixel, 0);
                getSpectralDataClickedPixel(pixel, imgSize, obsID, path, imgPath, obsName, wav);
            }

        });
        document.querySelector('.coords_type_switch1').addEventListener('click', () => {
            document.querySelector('.coords_type_switch1').classList.toggle('active');
        });

        // if (dataObj["Ratio_path_json"] != null) {
        //     var ratio_count = Object.keys(dataObj["Ratio_path_json"]).length;
        // } else {
        //     var ratio_count = 0;
        // }

        // if (ratio_count != 0) {
        //     let ratio_div = document.createElement("div");
        //     ratio_div.setAttribute("class", "ratio_band_set")
        //     ratio_div.innerHTML = '<select id="ratio_band" style="color:rgba(255,255,255,0.5); background:rgba(0,0,0,1);" onchange="ratio_layer1(this);"></select>';
        //     document.getElementById("ratio_select").appendChild(ratio_div);

        //     for (let i = 0; i < ratio_count; i++) {
        //         let op = document.createElement("option");
        //         op.value = dataObj["Ratio_path_json"][i]["path"];
        //         op.text = dataObj["Ratio_path_json"][i]["band"];
        //         document.getElementById("ratio_band").appendChild(op);
        //     }
        // }

        // Historyの初期化
        countHistory1 = 0;
        historyJson1.length = 0;
        historyTop1 = '';

        // clickしたピクセル位置を取得。サムネイル画像の左下基準、x,y軸で検索している。
        wms_layers.thumbnail.on('click', function (evt) {
            thumbnailNum = 0;
            if (document.querySelector('.select_switch1').classList.contains('active')) {
                // 選択モード
                storeClickedPx.push(evt.coordinate);
                if (storeClickedPx.length === 1) {
                    setAlignment(evt.coordinate, 1);
                } else {
                    setAlignment(evt.coordinate, 2);
                    storeClickedPx.length = 0;
                }
            } else if (document.querySelector('.remove_switch1').classList.contains('active')) {
                // 削除モード
                setAlignment(evt.coordinate, -1);
            } 
            
            // TODO SuperCam閲覧機能 2024/3/1(kuro)
            // else if($('#comparison').data('comparison-flg')) {
            //     setAlignment(evt.coordinate, 0);
            //     getOrbiterAndRoverSpectralDataClickedPixel(evt.coordinate, imgSize, obsID, path, imgPath, obsName, wav);

            // } 
            
            else {
                // 即取得モード
                setAlignment(evt.coordinate, 0);
                getSpectralDataClickedPixel(evt.coordinate, imgSize, obsID, path, imgPath, obsName, wav);
            }
        });
    } else if (selectedWindow === 'Green') {
        displayAncillaryBox(data);
        let layerColor = Cesium.Color.MEDIUMSEAGREEN.withAlpha(0.5);
        let footprintLayer = overlapFootprintLayer(obsCoord, 1, 'GREEN', layerColor);
        createThumbnailFrame(2, dataObj, 'green', footprintLayer, data);
        wms_layers.thumbnail2 = displayThumbnail('thumbnail_window2', dataObj);

        document.querySelector('.get_button2').addEventListener('click', () => {
            thumbnailNum = 1;
            // 赤いピクセルレイヤーを取得
            let pxArray = getSelectedPixels();
            getSpectralDataRoiArea(pxArray, imgSize, obsID, path, imgPath, obsName, wav);
            // 赤いピクセルレイヤーをオレンジに変える
            changePixelsColor(pxArray);
        });
        document.querySelector('.remove_switch2').addEventListener('click', () => {
            document.querySelector('.remove_switch2').classList.toggle('active');
        });
        document.querySelector('.select_switch2').addEventListener('click', () => {
            document.querySelector('.select_switch2').classList.toggle('active');
        });

        // if (dataObj["Ratio_path_json"] != null) {
        //     var ratio_count = Object.keys(dataObj["Ratio_path_json"]).length;
        // } else {
        //     var ratio_count = 0;
        // }

        // if (ratio_count != 0) {
        //     let ratio_div = document.createElement("div");
        //     ratio_div.setAttribute("class", "ratio_band_set2");
        //     ratio_div.innerHTML = '<select id="ratio_band2" style="color:rgba(255,255,255,0.5); background:rgba(0,0,0,1);" onchange="ratio_layer2(this);"></select>';
        //     document.getElementById("ratio_select2").appendChild(ratio_div);

        //     for (let i = 0; i < ratio_count; i++) {
        //         let op = document.createElement("option");
        //         op.value = dataObj["Ratio_path_json"][i]["path"];
        //         op.text = dataObj["Ratio_path_json"][i]["band"];
        //         document.getElementById("ratio_band2").appendChild(op);
        //     }
        // }

        // Historyの初期化
        countHistory2 = 0;
        historyJson2.length = 0;
        historyTop2 = '';

        // clickしたピクセル位置を取得。サムネイル画像の左下基準、x,y軸で検索している。
        wms_layers.thumbnail2.on('click', function (evt) {
            thumbnailNum = 1;
            if (document.querySelector('.select_switch2').classList.contains('active')) {
                // 選択モード
                storeClickedPx.push(evt.coordinate);
                if (storeClickedPx.length === 1) {
                    setAlignment(evt.coordinate, 1);
                } else {
                    setAlignment(evt.coordinate, 2);
                    storeClickedPx.length = 0;
                }
            } else if (document.querySelector('.remove_switch2').classList.contains('active')) {
                // 削除モード
                setAlignment(evt.coordinate, -1);
            } else {
                // 即取得モード
                setAlignment(evt.coordinate, 0);
                getSpectralDataClickedPixel(evt.coordinate, imgSize, obsID, path, imgPath, obsName, wav);
            }
        });
    }
}

function getLatLonFromPixels(pixelArr, cube_coords) {
    let latlon_coords = [];
    for (let i = 0; i < pixelArr.length; i++) {
        latlon_coords.push([cube_coords["lat"][pixelArr[i][1]][pixelArr[i][0]], cube_coords["lon"][pixelArr[i][1]][pixelArr[i][0]]])
    }

    return latlon_coords
}

// FIXME usui 検索ピクセルのずれ
function getPixelsFromLatLon(lon, lat, cube_coords) {
    // 小数点以下の桁数を返す
    function numDigitsUnder(num){
        return num.toString().split('.')[1].length;
    }
    
    // index検索
    function findIndexX(lon) {
        let endY = cube_coords["lon"].length - 1;
        let endX = cube_coords["lon"][0].length - 1;
        let diffA, diffB, diff_1px, index;

        for (let y = endY; y >= 0; y--) {
            for (let x = 0; x <= endX; x++) {
                if (cube_coords["lon"][y][x] >= lon) {
                    console.log(cube_coords["lon"][y][x], y, x);
                    diffA = cube_coords["lon"][y][x] - lon;
                    diff_1px = cube_coords["lon"][y][1] - cube_coords["lon"][y][0];

                    // if (diffA <= diff_1px) {
                    if (x > 0) {
                        diffB = lon - cube_coords["lon"][y][x-1];
                        index = (diffA <= diffB) ? x : x-1;
                        return index;
                    } else if (x == 0) {
                        index = x;
                        return index;
                    }
                    // }
                }
            }
        }
    }

    function findIndexY(lat) {
        let endY = cube_coords["lat"].length - 1;
        let endX = cube_coords["lat"][0].length - 1;
        let diffA, diffB, diff_1px, index;

        for (let y = endY; y >= 0; y--) {
            for (let x = 0; x <= endX; x++) {
                if (cube_coords["lat"][y][x] >= lat) {
                    console.log(cube_coords["lat"][y][x], y, x);
                    diffA = cube_coords["lat"][y][x] - lat;
                    diff_1px = cube_coords["lat"][endY][x] - cube_coords["lat"][endY-1][x];

                    // if (diffA <= diff_1px) {
                    if (y < endY) {
                        diffB = lat - cube_coords["lat"][y+1][x];
                        index = (diffA <= diffB) ? cube_coords["lat"].length - y : cube_coords["lat"].length - (y+1);
                        return index;
                    } else if (y == endY) {
                        index = cube_coords["lat"].length - y;
                        return index;
                    }
                    // }
                }
            }
        }
    }

    if (numDigitsUnder(lon) > 4 && numDigitsUnder(lat) > 4) {
        console.log(lon, lat);
        console.log(Number(lon), Number(lat));
        return [`${findIndexX(Number(lon))}`, `${findIndexY(Number(lat))}`];
    } else {
        alert('Please set the number of digits after the decimal point to 5 or more.');
    }
}

function setDrawLayerLines(coordinates, color) {
    // prettier-ignore
    let fillColor = 
        color === 'red' ? 'rgba(255, 0, 0, 0.08)' :
        color === 'orange' ? 'rgba(0, 0, 255, 0.06)' :
        color === 'green' ? 'rgba(0, 255, 0, 0.3)' :
        color === 'blue' ? 'rgba(0, 0, 255, 0.3)' : false;

    let layerLines = new ol.layer.Vector({
        source: new ol.source.Vector({
            features: [
                new ol.Feature({
                    geometry: new ol.geom.Polygon(coordinates),
                }),
            ],
        }),
        style: new ol.style.Style({
            stroke: new ol.style.Stroke({ color: color, width: 0.5 }),
            fill: new ol.style.Fill({
                color: fillColor,
            }),
        }),
    });
    return layerLines;
}

function setLayerCoordinates(x, y) {
    // prettier-ignore
    coordinates = [[[x, y], [x, y + 1], [x + 1, y + 1], [x + 1, y], [x, y]]]
    return coordinates;
}

function drawLayer(x, y, color, squareObj, thumbnailObj) {
    let key = `${x}-${y}`;
    if (!(key in squareObj[color])) {
        line = setDrawLayerLines(setLayerCoordinates(x, y), color);
        thumbnailObj.getLayers().push(line);
        squareObj[color][key] = [x, y, line];
    }
}

function removeSquareLayer(x, y, color, squareObj, thumbnailObj) {
    key = `${x}-${y}`;
    thumbnailObj.getLayers().remove(squareObj[color][key][2]);
    delete squareObj[color][key];
}

let roiAreaCoord = [];
let drawnLayers = {
    square1: { red: {}, orange: {} },
    square2: { red: {}, orange: {} },
    crossLines1: {},
    crossLines2: {},
};

// thumbnailWindow内で座標クリックした時の座標点から上下左右に伸びる直線描画
function setAlignment(click_point, flag) {
    console.log("click_point");
    console.log(click_point);
    let color, layerLines, thumbnailObj;
    let x = Math.trunc(click_point[0]);
    let y = Math.trunc(click_point[1]);

    if (thumbnailNum === 0) {
        thumbnailObj = wms_layers.thumbnail;
        var { square1: squareObj, crossLines1: crossObj } = drawnLayers;
    } else {
        thumbnailObj = wms_layers.thumbnail2;
        var { square2: squareObj, crossLines2: crossObj } = drawnLayers;
    }

    // 前回のバツマークを削除
    thumbnailObj.removeLayer(crossObj[0]);
    delete crossObj;

    // flag 0: 即取得モードのクリックされたピクセル枠+斜線を描画（１ピクセル）
    // flag 1: 選択モードの始点記憶
    // flag 2: 選択モードのクリックされたピクセル枠+斜線を描画（１ピクセル以上）
    // flag -1: 選択モードで描画されたピクセル枠を削除（１ピクセルずつ）

    if (flag === 0) {
        // クリックされたピクセル枠+斜線を描画
        drawLayer(x, y, 'orange', squareObj, thumbnailObj);
    } else if (flag === 1) {
        roiAreaCoord.push(x);
        roiAreaCoord.push(y);
    } else if (flag === 2) {
        roiAreaCoord.push(x);
        roiAreaCoord.push(y);
        let xStart = roiAreaCoord[0] <= roiAreaCoord[2] ? roiAreaCoord[0] : roiAreaCoord[2];
        let yStart = roiAreaCoord[1] <= roiAreaCoord[3] ? roiAreaCoord[3] : roiAreaCoord[1];
        let xWidth = Math.abs(roiAreaCoord[0] - roiAreaCoord[2]);
        let yWidth = Math.abs(roiAreaCoord[1] - roiAreaCoord[3]);

        for (let yAxis = yStart; yAxis >= yStart - yWidth; yAxis--) {
            for (let xAxis = xStart; xAxis <= xStart + xWidth; xAxis++) {
                drawLayer(xAxis, yAxis, 'red', squareObj, thumbnailObj);
            }
        }
        roiAreaCoord = [];
    } else if (flag === -1) {
        removeSquareLayer(x, y, 'red', squareObj, thumbnailObj);
    } else if (flag === 'search') {
        drawLayer(x, y, 'red', squareObj, thumbnailObj);
    } else if (flag === 'clear') {
        let squareRedArray2D = Object.values(squareObj.red);
        let squareOrangeArray2D = Object.values(squareObj.orange);
        for (let i = 0; i < squareRedArray2D.length; i++) {
            [x, y] = [squareRedArray2D[i][0], squareRedArray2D[i][1]];
            removeSquareLayer(x, y, 'red', squareObj, thumbnailObj);
        }
        for (let i = 0; i < squareOrangeArray2D.length; i++) {
            [x, y] = [squareOrangeArray2D[i][0], squareOrangeArray2D[i][1]];
            removeSquareLayer(x, y, 'orange', squareObj, thumbnailObj);
        }
    }

    // クリックされたピクセルにバツマークを描画（削除以外の時）
    if (!(flag === -1 || flag === 'search' || flag === 'clear')) {
        color = flag === 1 ? 'green' : 'blue';
        layerLines = setDrawLayerLines(setLayerCoordinates(x, y), color);
        thumbnailObj.getLayers().push(layerLines);
        crossObj[0] = layerLines;
    }
}

function getSelectedPixels() {
    let squareRedObj = thumbnailNum === 0 ? drawnLayers.square1.red : drawnLayers.square2.red;
    let squareRedArray2D = Object.values(squareRedObj);
    let pixelArr = [];
    for (let i = 0; i < squareRedArray2D.length; i++) {
        pixelArr.push([squareRedArray2D[i][0], squareRedArray2D[i][1]]);
    }
    return pixelArr;
}

function changePixelsColor(pixelArr) {
    let thumbnailObj, squareObj;
    [thumbnailObj, squareObj] =
        thumbnailNum === 0 ? [wms_layers.thumbnail, drawnLayers.square1] : [wms_layers.thumbnail2, drawnLayers.square2];

    for (let i = 0; i < pixelArr.length; i++) {
        let [x, y] = [pixelArr[i][0], pixelArr[i][1]];
        drawLayer(x, y, 'orange', squareObj, thumbnailObj);
        removeSquareLayer(x, y, 'red', squareObj, thumbnailObj);
    }
}

// 表レイアウト定義
// 観測時の補助情報を表示する
function displayAncillaryBox(data) {
    let dataObj = JSON.parse(data);

    if (flagEntity === 1) {
        entity.description = {
            getValue: function () {
                return '';
            },
        };
        entity.name = 'Ancillary info.';
    }
    flagEntity = 1;
    roots.map.selectedEntity = entity;

    let styleImg = 'position:absolute; left:10px; width:180px; height:180px; object-fit:contain;';
    let styleObsName =
        'position:absolute; right:5px; padding:0.5em 1em; margin:2em 0; background-color:rgba(0, 117, 226, 0.7);';
    let styleAncDL = 'position:absolute; width:105px; right:5px; background-color:#248; color:#fff;';
    let styleTable = 'position:absolute; top:200px; width:97%; table-layout:auto; font-size:8pt; font-family:serif;';
    let topAncBox = `
        <div style="height:500px;">
            <div>
                <img src="/collect_static/${dataObj['Image_path']}" style="${styleImg}">
                <div style="${styleObsName} font-size:15px;">${dataObj['obs_name']}</div>
            </div>
            <button style="${styleAncDL} top:90px;" id="anc_dl_xlsx">Download XLSX</button>
            <button style="${styleAncDL} top:113px;" id="anc_dl_json">Download JSON</button>
            <button style="${styleAncDL} top:136px;" id="anc_dl_csv">Download CSV</button>
            <button style="${styleAncDL} top:159px;" id="anc_dl_pvl">Download PVL</button>
            <table class="ancillary" border="1" style="${styleTable}">`;

    let stylePattern = 'background: rgba(0,0,0,0.8);';
    let stylePattern2 = 'background: rgba(255,255,255,0.2);';
    let tableAncBox = '';
    let nameAncBox = '';
    let valueAncBox = '';
    let keyCheck = 0;
    let index = 0;

    dataObj['ancillary'].forIn(function (key, value) {
        if (key !== 'band_bin_center') {
            nameAncBox += `<th style="${stylePattern}" align="center"><p style="width:120px;">${key}</p></th>`;
            valueAncBox += `<td style="${stylePattern2}" align="center"><p style="width:120px;">${value}</p></td>`;

            // 表の改行
            keyCheck = (index + 1) % 3;
            if (keyCheck == 0) {
                tableAncBox += `<tr>${nameAncBox}</tr><tr>${valueAncBox}</tr>`;
                nameAncBox = '';
                valueAncBox = '';
            }
            index++;
        }
    });

    let htmlAncBox;
    switch (keyCheck) {
        case 1:
            nameAncBox += `<th style="${stylePattern}" align="center">NULL</th>`;
            valueAncBox += `<td style="${stylePattern2}" align="center">NULL</td>`;
        case 2:
            nameAncBox += `<th style="${stylePattern}" align="center">NULL</th>`;
            valueAncBox += `<td style="${stylePattern2}" align="center">NULL</td>`;
        default:
            tableAncBox += `<tr>${nameAncBox}</tr><tr>${valueAncBox}</tr>`;
            htmlAncBox = `${topAncBox}${tableAncBox}</table></div>`;
    }

    entity.name = dataObj['obs_ID'];
    entity.description = {
        getValue: function () {
            return htmlAncBox;
        },
    };
}

let countHistory = 0;

// thumbnail box内, clickした座標を記録して参照出来るようにしてる
function click_history(data) {
    let dataObj = JSON.parse(data);

    // thumbnail boxの左上部分, clickされた座標表示
    function createClickPosition(num, countHistory) {
        document.getElementById(`click_position${num}`).innerHTML = `
            <button type="button" name="chistory0" align="right" value="1,${countHistory}" class="squareA"
            onclick="clickHistory(this);">
                Lon : ${dataObj['coordinate'][0]}<br>
                Lat : ${dataObj['coordinate'][1]}<br>
                Pixel [ x: ${Math.floor(dataObj['pixels'][0])}, y: ${Math.floor(dataObj['pixels'][1])}]
            </button>`;
    }

    function createClickHistory(num, countHistory) {
        let historyHeight = 35 * countHistory + 42;
        if (historyHeight > 440) historyHeight = 440;
        if (countHistory === 0) historyHeight = 0;
        document.getElementById(`click_history${num}`).style.height = `${historyHeight}px`;

        let element = num === 1 ? historyTop1 : historyTop2;
        element += document.getElementById(`click_history${num}`).innerHTML;
        document.getElementById(`click_history${num}`).innerHTML = element;

        let historyTop = `
            <button type="button" name="chistory0" align="right" 
            value="1,${countHistory}" class="squareB" onclick="clickHistory(this);">
                Lon : ${dataObj['coordinate'][0]}<br>
                Lat : ${dataObj['coordinate'][1]}<br>
                Pixel [ x: ${Math.floor(dataObj['pixels'][0])}, y: ${Math.floor(dataObj['pixels'][1])}]
            </button>`;

        if (num === 1) {
            historyTop1 = historyTop;
            countHistory1++;
            historyJson1.push(dataObj);
        } else {
            historyTop2 = historyTop;
            countHistory2++;
            historyJson2.push(dataObj);
        }
    }

    let isTypeDIRECT = dataObj['type'] === 'DIRECT' ? true : false;

    if (isTypeDIRECT) {
        if (thumbnailNum === 0) {
            createClickPosition(1, countHistory1);
            createClickHistory(1, countHistory1);
            // thumbnail boxの左上部分, clickされた座標表示
            // document.getElementById('click_position1').innerHTML = `
            //     <button type="button" name="chistory0" align="right"
            //     value="1,${Math.floor(countHistory1)}" class="squareA" onclick="clickHistory(this);">
            //         Lon : ${dataObj['coordinate'][0].toFixed(5)}<br>
            //         Lat : ${dataObj['coordinate'][1].toFixed(5)}<br>
            //         Pixel [ x: ${Math.floor(dataObj['pixels'][0])}, y: ${Math.floor(dataObj['pixels'][1])}]
            //     </button>`;

            // let historyHeight1 = 35 * countHistory1 + 42;
            // if (historyHeight1 > 440) historyHeight1 = 440;
            // if (countHistory1 == 0) historyHeight1 = 0;
            // historyHeight1 += 'px';
            // document.getElementById('click_history1').style.height = historyHeight1;

            // var element = historyTop1 + document.getElementById('click_history1').innerHTML;
            // document.getElementById('click_history1').innerHTML = element;

            // historyJson1.push(dataObj);

            // thumbnail boxの右部分, onclick(this)は押した箇所のhtml文1行取得<div class....></div>など取得
            // historyTop1 = `
            //     <button type="button" name="chistory0" align="right"
            //     value="1,${countHistory1}" class="squareB" onclick="clickHistory(this);">
            //         Lon : ${dataObj['coordinate'][0].toFixed(5)}<br>
            //         Lat : ${dataObj['coordinate'][1].toFixed(5)}<br>
            //         Pixel [ x: ${Math.floor(dataObj['pixels'][0])}, y: ${Math.floor(dataObj['pixels'][1])}]
            //     </button>`;

            // countHistory1++;
        } else if (thumbnailNum === 1) {
            document.getElementById('click_position2').innerHTML = `
            <button type="button" name="chistory0" align="right" 
            value="2,${countHistory2}" class="squareA" onclick="clickHistory(this);">
                Lon : ${dataObj['coordinate'][0].toFixed(5)}<br>
                Lat : ${dataObj['coordinate'][1].toFixed(5)}<br>
                Pixel [ x: ${Math.floor(dataObj['pixels'][0])}, y: ${Math.floor(dataObj['pixels'][1])}]
            </button>`;

            var historyHeight2 = 35 * countHistory2 + 42;
            if (historyHeight2 > 440) historyHeight2 = 440;
            if (countHistory2 == 0) historyHeight2 = 0;
            historyHeight2 += 'px';
            document.getElementById('click_history2').style.height = historyHeight2;

            var element = historyTop2 + document.getElementById('click_history2').innerHTML;
            document.getElementById('click_history2').innerHTML = element;

            historyJson2.push(dataObj);

            historyTop2 = `
            <div class="balloonoya">
            <button type="button" name="chistory0" align="right" 
            value="2,${Math.floor(countHistory2)}" class="squareB" onclick="clickHistory(this);">
                Lon : ${dataObj['coordinate'][0].toFixed(5)}<br>
                Lat : ${dataObj['coordinate'][1].toFixed(5)}<br>
                Pixel [ x: ${Math.floor(dataObj['pixels'][0])}, y: ${Math.floor(dataObj['pixels'][1])}]
            </button>`;

            countHistory2++;
        }
    }
}

// thumbnail boxの左上と右部分をクリックでspectral表示のためにデータ受け渡し
function clickHistory(object) {
    // info: [ thumbnail type, history number ]
    let info = object.value.split(',');
    console.log(info);
    let historyJson, dataObj, px, imgSize, obsID, obsName, path, imgPath, wav;

    if (info[0] === '1') {
        historyJson = JSON.stringify(historyJson1[info[1]]);
        dataObj = JSON.parse(historyJson);
        px = dataObj['pixels'];
        imgSize = dataObj['Image_size'];
        obsID = dataObj['obs_ID'];
        obsName = dataObj['obs_name'];
        path = dataObj['path'];
        imgPath = dataObj['Image_path'];
        wav = dataObj['band_bin_center'];
    } else if (info[0] === '2') {
        historyJson = JSON.stringify(historyJson2[info[1]]);
        dataObj = JSON.parse(historyJson);
        px = dataObj['pixels'];
        imgSize = dataObj['Image_size'];
        obsID = dataObj['obs_ID'];
        obsName = dataObj['obs_name'];
        path = dataObj['path'];
        imgPath = dataObj['Image_path'];
        wav = dataObj['band_bin_center'];
    }

    // 変更可能にする
    let flag = 0;

    setAlignment(px, flag);
    getSpectralDataClickedPixel(px, imgSize, obsID, path, imgPath, obsName, wav);
}
