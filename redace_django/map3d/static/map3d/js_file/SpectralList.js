// このコードを読み込んだら自動実行する関数
document.addEventListener("DOMContentLoaded", () => {
    get_record_spectra();
});

// ユーザー・Project情報取得
function user_info() {
    // Username、Projectの更新
    let f_s = first_setting()
    let user_count = 1
    const selectElement = document.getElementById("export_list");
    selectElement.innerHTML = "";
    const option = document.createElement("option");
    option.value = (f_s.username + "(" + (user_count++) + ")")
    option.textContent = (f_s.username + "(" + "your account" + ")");
    selectElement.appendChild(option);
    f_s.projects.forEach(project => {
        const option = document.createElement("option");
        option.value = project + "(" + (user_count++) + ")";
        option.textContent = project;
        selectElement.appendChild(option);
    });
}

// テーブル情報取得
let data_copy;
function table_info() {
    let data = [];

    // 凡例を消す(css)
    const style = document.createElement('style');
    style.innerHTML = `
        .dygraph-legend {
            display: none !important;
        }
    `;
    document.head.appendChild(style);

    const tableBody = document.getElementById("table-body");
    tableBody.innerHTML = '';

    let f_s = first_setting()

    $.ajax({
        type: 'POST',
        headers: { 'X-CSRFToken': csrftoken },
        url: 'ref_table/update/',
        contentType: 'application/json',
        data: JSON.stringify({
            user_info: f_s.username,
        }),
        success: function (response) {
            data = response.data;
            data.reverse();
            data_copy = data;
            data.forEach((row, index) => {
                // console.log(JSON.stringify({
                //     data: row,
                // }))
                const tr = document.createElement("tr");
                tr.setAttribute("data-id", row.id); // 各行にデータIDを設定

                const point = formatPoint(row.latitude, row.longitude);
                let table_point = point.includes('<br>(') ? point.split('<br>')[0] + '...' : point;
                const created_date = formatDate(row.created_date);

                tr.innerHTML = `
                  <th scope="col" width="50">${row.instrument}</th>
                  <th scope="col" width="200">${row.data_id}</th>
                  <th scope="col" width="140">${table_point}</th>
                  <th scope="col" width="140">${created_date}</th>
                  <th scope="col" width="270">${row.description}</th>
                  <th scope="col" width="40" style="text-align: center; vertical-align: middle;">
                    <input type="checkbox" style="transform: scale(1.5);" onclick="event.stopPropagation();">
                  </th>
                  <th scope="col" width="40" style="text-align: center; vertical-align: middle;">
                    <input type="checkbox" style="transform: scale(1.5);" onclick="event.stopPropagation();">
                  </th>
                  <th scope="col" width="30" style="text-align: center; vertical-align: middle;">
                    <input type="checkbox" style="transform: scale(1.5);" onclick="event.stopPropagation();">
                  </th>
                `;

                const graphRow = document.createElement("tr");
                graphRow.style.display = "none";
                graphRow.innerHTML = `
                  <td colspan="8" style="padding: 0;">
                    <div style="display: flex; width: 100%; height: 300px;">
                      <div id="graph-container-${index}" style="flex: 1; height: 100%; border-right: 1px solid #ccc;"></div>
                      <div style="flex: 1; height: 100%; display: flex; align-items: flex-start; justify-content: flex-start; padding: 10px; overflow-y: auto;">
                        <p style="margin: 0;">${point}</p>
                      </div>
                    </div>
                  </td>
                `;

                tr.addEventListener("click", () => {
                    if (graphRow.style.display === "none") {
                        graphRow.style.display = "";
                        const graphContainer = document.getElementById(`graph-container-${index}`);
                        if (!graphContainer.hasChildNodes()) {
                            let graphData;
                            let labels = ["Wavelength"];

                            // reflectance が 1次元配列か 2次元配列かを判定
                            if (Array.isArray(row.reflectance[0])) {
                                // reflectance が 2次元配列の場合
                                graphData = row.wavelength.map((wavelength, i) => {
                                    const rowData = [wavelength];
                                    row.reflectance.forEach(series => {
                                        rowData.push(series[i] === -1 ? NaN : series[i]);
                                    });
                                    return rowData;
                                });

                                // 各系列のラベルを設定
                                row.reflectance.forEach((_, seriesIndex) => {
                                    labels.push(`Reflectance ${seriesIndex + 1}`);
                                });
                            } else {
                                // reflectance が 1次元配列の場合
                                graphData = row.wavelength.map((wavelength, i) => [
                                    wavelength,
                                    row.reflectance[i] === -1 ? NaN : row.reflectance[i] // -1をnullに変換
                                ]);

                                // ラベルを設定
                                labels.push("Reflectance");
                            }

                            // console.log(graphData)

                            new Dygraph(
                                graphContainer,
                                graphData,
                                {
                                    colors: ['#000080', '#8b0000', '#32cd32', '#ff00ff', '#f4a460'],
                                    ylabel: 'Reflectance',
                                    xlabel: 'Wavelength[μm]',
                                    legend: "always",
                                    animatedZooms: true,
                                    showRangeSelector: true,
                                    rangeSelectorHeight: 30,
                                    rangeSelectorPlotStrokeColor: 'rgb(80,80,80)',
                                    rangeSelectorPlotFillColor: 'rgb(80,80,80)',
                                    showRoller: true,
                                    labelsSeparateLines: true,
                                    labels: labels,
                                    pointClickCallback: null,
                                    hideOverlayOnMouseOut: true,
                                    labelsDiv: null,
                                    labelsDivStyles: {
                                        display: 'none',
                                    },
                                    connectSeparatedPoints: true,
                                }
                            );
                        }
                    } else {
                        graphRow.style.display = "none";
                    }
                });

                tableBody.appendChild(tr);
                tableBody.appendChild(graphRow);
            });
        },
        error: function (error) {
            data = [];
        }
    });
}


// 緯度経度
function formatPoint(lat, lon) {
    let point = '';
    for (let i = 0; i < lat.length; i++) {
        point += "(" + lat[i] + "," + lon[i] + ")<br>"
    }
    return point;
}

// 日付フォーマット変換関数
function formatDate(isoDateString) {
    const date = new Date(isoDateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}


// データベースを更新する関数
function get_record_spectra() {
    user_info();
    table_info();
}

function countCheckboxes(columnIndex) {
    // columnIndex=0 _ MOVE
    // columnIndex=1 _ EXPORT
    // columnIndex=2 _ DELETE

    // 選択したチェックボックスのカウント変数
    let count = 0;

    // テーブルボディ内のすべての行を取得
    const rows = document.querySelectorAll('#table-body > tr');
    let saveList = [];
    for (const row of rows) {
        // 行内の各チェックボックスを取得
        const checkboxes = row.querySelectorAll('th input[type="checkbox"]');
        const dataId = row.getAttribute("data-id");

        if (columnIndex === 0 && count >= 2) {
            // alert("If you want to use 'move_function', please check only one check-box.");
            // saveList = [];
            break;
        }

        if (checkboxes.length > columnIndex && checkboxes[columnIndex].checked) {
            const rowData = data_copy.find(d => d.id === parseInt(dataId, 10));
            if (rowData) {
                if (columnIndex === 0) { // MOVE用データ
                    saveList.push({
                        instrument: rowData.instrument,
                        obs_id: rowData.obs_id,
                        latitude: rowData.latitude,
                        longitude: rowData.longitude,
                    });
                }
                else if (columnIndex === 1) { // EXPORT用データ
                    let p = document.getElementById("export_list").value;
                    let owner = false;
                    if (p == (username + "(" + 1 + ")")) {
                        owner = true;
                    }
                    p = p.replace(/\(\d+\)$/, '');

                    let f = document.getElementById("csv_format_list").value;

                    saveList.push({
                        user: username,
                        project: p,
                        owner: owner,
                        format: f,
                        data_id: rowData.data_id,
                        latitude: rowData.latitude,
                        longitude: rowData.longitude,
                        wavelength: rowData.wavelength,
                        reflectance: rowData.reflectance,
                        description: rowData.description,
                    });
                }
                else if (columnIndex === 2) { // DELETE用データ
                    saveList.push({ id: rowData.id });
                }
                count++;
            }
        }
    }

    if (count == 0) {
        alert("Please check any check-box");
    }
    return saveList;
}


let currentGeoJson = null; // 現在の GeoJSON データを追跡

function move_from_list() {
    const moveRows = countCheckboxes(0);
    if (moveRows.length === 1) {
        console.log(moveRows);

        // Cesium のカメラ移動処理
        const targetLocation = moveRows[0];
        const instrument = targetLocation.instrument;
        const obs_id = targetLocation.obs_id;
        const latitude = targetLocation.latitude[0];
        const longitude = targetLocation.longitude[0];

        // GeoJSON データの作成
        const geojson = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [longitude, latitude],
                    },
                    properties: {
                        name: `${instrument}(${obs_id})`,
                        description: `If you want to search this data in detail, please click to button which is left-top screen`,
                    },
                },
            ],
        };

        if (currentGeoJson) {
            roots.map.dataSources.remove(currentGeoJson);
            currentGeoJson = null;
        }

        // GeoJSON データをロードしてピンを追加
        Cesium.GeoJsonDataSource.load(geojson, {
            markerColor: Cesium.Color.PINK, // ピンの色
            clampToGround: true, // 地表にクランプ
        }).then(function (dataSource) {
            currentGeoJson = dataSource; // 現在の GeoJSON を追跡
            roots.map.dataSources.add(dataSource);

            // 最初のエンティティを取得
            const entity = dataSource.entities.values[0];
            if (entity) {
                // InfoBox を表示
                roots.map.selectedEntity = entity;

                // カメラを移動
                roots.map.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 1500000),
                });
            }
        });
    } 
    else if (moveRows.length > 1) {
        alert("If you want to use 'move_function', please check only one check-box.");
    } 
    else {
        alert("No row selected for move functionality.");
    }
}



function export_from_list() {
    const exportRows = countCheckboxes(1); // チェックされた行を取得
    if (exportRows.length > 0) {
        console.log("Export対象の行:", JSON.stringify(exportRows));
        $.ajax({
            type: 'POST',
            headers: { 'X-CSRFToken': csrftoken },
            url: 'ref_table/export/',
            contentType: 'application/json',
            data: JSON.stringify(exportRows),
            success: function (response) {
                console.log("転送成功:", response);

                // レスポンスに含まれる結果を確認して処理
                if (response.results && response.results.length > 0) {
                    let successMessages = [];
                    let errorMessages = [];
                    
                    response.results.forEach((result, index) => {
                        if (result.status === "success") {
                            successMessages.push(`Success: ${result.file}\n\n`);
                        } else {
                            console.error(`ファイル作成エラー (${index + 1}): ${result.message}`);
                            errorMessages.push(`エラー: ${result.message}`);
                        }
                    });

                    // アラートを1回だけ表示
                    if (successMessages.length > 0) {
                        alert(successMessages.join('\n'));
                    }
                    if (errorMessages.length > 0) {
                        alert(errorMessages.join('\n'));
                    }
                } 
                else {
                    alert("転送成功しましたが、結果が返されませんでした。");
                }
            },
            error: function (error) {
                console.error("転送エラー:", error);
                alert("転送中にエラーが発生しました。");
            }
        });
    } else {
        alert("エクスポート対象の行を選択してください。");
    }
};



// 削除関数
function delete_from_list() {
    const deleteRows = countCheckboxes(2); // "delete"列に対応するチェックされた行を取得
    console.log(deleteRows)
    if (deleteRows.length > 0) {
        console.log("Delete対象の行:", deleteRows);
        $.ajax({
            type: 'POST',
            headers: { 'X-CSRFToken': csrftoken },
            url: 'ref_table/delete/',
            contentType: 'application/json',
            data: JSON.stringify(deleteRows),
            success: function (response) {
                console.log("削除成功:", response);
                alert("Success. The data you checked is deleted.");
                get_record_spectra(); // テーブルを更新
            },
            error: function (error) {
                console.error("削除エラー:", error);
                alert("削除中にエラーが発生しました。");
            }
        });
    }
};