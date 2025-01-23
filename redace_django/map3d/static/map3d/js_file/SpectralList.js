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
    let loading_results = document.getElementById("loading-results");
    loading_results.style.display = "block";

    $.ajax({
        type: 'POST',
        headers: { 'X-CSRFToken': csrftoken },
        url: 'ref_table/update/',
        contentType: 'application/json',
        data: JSON.stringify({
            user_info: f_s.username,
        }),
        success: function (response) {
            loading_results.style.display = "none";
            data = response.data;
            // 日付の降順でソート
            data.sort((a, b) => {
                return new Date(b.created_date) - new Date(a.created_date);
            });
            data_copy = data;

            // テーブル描画
            data.forEach((row, index) => {
                const tr = document.createElement("tr");
                tr.setAttribute("data-id", row.id); // 各行にデータIDを設定

                const point = formatPoint(row.latitude, row.longitude);
                let table_point = point.includes('<br>(') ? point.split('<br>')[0] + '...' : point;
                const created_date = formatDate(row.created_date);
                const edit_des = edit_descript(row.description);
                const formattedText = formatTextWithLineBreaks(row.description, 60);

                // メイン行
                tr.innerHTML = `
                  <th scope="col" width="50">${row.instrument}</th>
                  <th scope="col" width="200">${row.data_id}</th>
                  <th scope="col" width="140">${table_point}</th>
                  <th scope="col" width="140">${created_date}</th>
                  <th scope="col" width="270">${edit_des}</th>
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

                // グラフ行（初期は非表示）
                const graphRow = document.createElement("tr");
                graphRow.style.display = "none";
                graphRow.innerHTML = `
                  <td colspan="8" style="padding: 0;">
                      <div style="display: flex; width: 100%; height: 300px;">
                        <!-- グラフコンテナ -->
                        <div style="display: flex; width: 100%; height: 300px;">
                            <div id="graph-container-${index}" style="flex: 1; height: 100%; border-right: 1px solid #ccc;"></div>
                            <div style="flex: 1; height: 100%; display: flex; flex-direction: column; align-items: flex-start; padding: 10px; overflow-y: auto;">
                              <!-- コメントセクション -->
                              <div style="width: 100%; border: 1px solid #ccc; border-radius: 5px; padding: 10px; background-color: #f9f9f9;">
                                <h5 style="margin: 0 0 5px 0; font-size: 14px;">Note</h5>
                                <p style="margin: 0; word-wrap: break-word; font-size: 13px;">${formattedText}</p>
                              </div>
                              
                              <!-- 座標セクション -->
                              <div style="width: 100%; border: 1px solid #ccc; border-radius: 5px; padding: 10px; margin-bottom: 10px; background-color: #f9f9f9;">
                                <h5 style="margin: 0 0 5px 0; font-size: 14px;">Coordinate</h5>
                                <p style="margin: 0; word-wrap: break-word; font-size: 13px;">${point}</p>
                              </div>

                            </div>
                       </div>
                  </td>
                `;

                // クリック時のイベント
                tr.addEventListener("click", () => {
                    if (graphRow.style.display === "none") {
                        graphRow.style.display = "";
                        const graphContainer = document.getElementById(`graph-container-${index}`);
                        // 初回クリック時のみグラフ生成
                        if (!graphContainer.hasChildNodes()) {
                            // 別関数でグラフ生成 (row.id を使ってサーバーにデータを取りにいく)
                            createGraph(row.id, `graph-container-${index}`);
                        }
                    } 
                    else {
                        graphRow.style.display = "none";
                    }
                });

                tableBody.appendChild(tr);
                tableBody.appendChild(graphRow);
            });
        },
        error: function (error) {
            loading_results.style.display = "none";
            data = [];
        }
    });
}


// グラフ生成関数
function createGraph(rowId, containerId) {
    const graphContainer = document.getElementById(containerId);
    graphContainer.innerHTML = `
        <div class="loading-container" style="display: flex; justify-content: center; align-items: center; height: 100%;">
            <img src="/collect_static/map3d/image/loading.gif" alt="Loading..." style="width: 25px; height: 25px; margin-top: 50px;">
        </div>
    `;
    $.ajax({
        type: 'POST',
        headers: { 'X-CSRFToken': csrftoken },
        url: 'ref_table/get_graph_data/',
        contentType: 'application/json',
        data: JSON.stringify({ row_id: rowId }),
        success: function (response) {
            if (Array.isArray(response.data) && response.data.length > 0) {
                let firstItem = response.data[0];

                let wavelength = firstItem.wavelength;
                let reflectance = firstItem.reflectance;

                data_copy[rowId] = {
                    wavelength: wavelength,
                    reflectance: reflectance
                };


                // Dygraph用のグラフデータとラベルの生成
                let graphData;
                let labels = ["Wavelength"];

                if (Array.isArray(reflectance[0])) {
                    // reflectance が 2次元配列の場合
                    graphData = wavelength.map((w, i) => {
                        const rowData = [w];
                        reflectance.forEach(series => {
                            rowData.push(series[i] === -1 ? NaN : series[i]);
                        });
                        return rowData;
                    });
                    reflectance.forEach((_, seriesIndex) => {
                        labels.push(`Reflectance ${seriesIndex + 1}`);
                    });
                }
                else {
                    // reflectance が1次元配列の場合
                    graphData = wavelength.map((w, i) => [
                        w,
                        reflectance[i] === -1 ? NaN : reflectance[i]
                    ]);
                    labels.push("Reflectance");
                }

                graphContainer.innerHTML = "";
                // Dygraphの描画
                new Dygraph(
                    document.getElementById(containerId),
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
            else {
                console.error("Unexpected data structure or empty array in response.data");
            }
        },
        error: function (error) {
            console.error("Error fetching graph data:", error);
            alert("グラフ用データの取得に失敗しました。");
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

// 文章超過対策
function edit_descript(message) {
    if (message.length > 20) {
        return message.substr(0, 20);
    }
    else {
        return message;
    }
}

// 一定文字で改行させる関数
function formatTextWithLineBreaks(text, lineLength) {
    return text.replace(new RegExp(`(.{1,${lineLength}})`, 'g'), '$1<br>');
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

// データベースを更新 (一覧を再取得) する関数
function get_record_spectra() {
    user_info();
    table_info();
}

/* =========================================
   MOVE / EXPORT / DELETE 関数
   ========================================= */

function countCheckboxes(columnIndex) {
    // columnIndex=0 _ MOVE
    // columnIndex=1 _ EXPORT
    // columnIndex=2 _ DELETE

    let count = 0;
    const rows = document.querySelectorAll('#table-body > tr');
    let saveList = [];
    for (const row of rows) {
        // 行内のチェックボックスを取得
        const checkboxes = row.querySelectorAll('th input[type="checkbox"]');
        const dataId = row.getAttribute("data-id");

        if (columnIndex === 0 && count >= 2) {
            break;
        }

        if (checkboxes.length > columnIndex && checkboxes[columnIndex].checked) {
            const rowData = data_copy.find(d => d.id === parseInt(dataId, 10));
            if (rowData) {
                if (columnIndex === 0) { // MOVE
                    saveList.push({
                        instrument: rowData.instrument,
                        obs_id: rowData.obs_id,
                        latitude: rowData.latitude,
                        longitude: rowData.longitude,
                    });
                }
                else if (columnIndex === 1) { // EXPORT
                    let p = document.getElementById("export_list").value;
                    let owner = false;
                    let username = first_setting().username;
                    if (p == (username + "(" + 1 + ")")) {
                        owner = true;
                    }
                    p = p.replace(/\(\d+\)$/, '');

                    let f = document.getElementById("csv_format_list").value;

                    saveList.push({
                        id: rowData.id,
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
                else if (columnIndex === 2) { // DELETE
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

        const targetLocation = moveRows[0];
        const instrument = targetLocation.instrument;
        const obs_id = targetLocation.obs_id;
        const latitude = targetLocation.latitude[0];
        const longitude = targetLocation.longitude[0];

        // GeoJSON データ作成
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
                        description: `<div style="height:500px;"><p>This pin may be slightly out of specification. ...</p></div>`,
                    },
                },
            ],
        };

        if (currentGeoJson) {
            roots.map.dataSources.remove(currentGeoJson);
            currentGeoJson = null;
        }

        Cesium.GeoJsonDataSource.load(geojson, {
            markerColor: Cesium.Color.PINK,
            clampToGround: true,
        }).then(function (dataSource) {
            currentGeoJson = dataSource;
            roots.map.dataSources.add(dataSource);

            const entity = dataSource.entities.values[0];
            if (entity) {
                roots.map.selectedEntity = entity;
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
    const exportRows = countCheckboxes(1);
    if (exportRows.length > 0) {
        const modalHTML = `
        <div class="modal fade" id="dynamicModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static" style="z-index: 9999; background-color: rgba(0, 0, 0, 0.5);">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Export</h5>
              </div>
              <div class="modal-body" style="max-height: 400px; overflow-y: auto; overflow-x: hidden; overflow-wrap: break-word;  text-align: center;">
                <p>Do you want to export ${exportRows.length} data?</p>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">キャンセル</button>
                <button type="button" class="btn btn-primary" id="confirmExport">転送</button>
              </div>
            </div>
          </div>
        </div>
      `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modalElement = document.getElementById('dynamicModal');
        const bootstrapModal = new bootstrap.Modal(modalElement);

        // モーダル表示
        bootstrapModal.show();

        // モーダル閉じたらDOMから削除
        modalElement.addEventListener('hidden.bs.modal', () => {
            modalElement.remove();
        });

        document.getElementById('confirmExport').addEventListener('click', () => {
            document.querySelector('#dynamicModal .modal-body').innerHTML = `
                <img src="/collect_static/map3d/image/loading.gif" alt="Loading..." style="width: 50px; height: 50px; margin-bottom: 10px;">
                <p>Exporting...</p>
            `;
            document.querySelector('#dynamicModal .modal-footer').innerHTML = '';

            // 転送処理を開始
            handleExport(exportRows)
                .then((successMessage) => {
                    // 成功メッセージと保存先ディレクトリを表示
                    document.querySelector('#dynamicModal .modal-body').innerHTML = `
                        <p>Data transfer successful!</p>
                        <p style="text-align: left; white-space: pre-line;">JupyterHub directory<br>${successMessage}</p>
                    `;
                    document.querySelector('#dynamicModal .modal-footer').innerHTML = `
                        <button type="button" class="btn btn-primary" data-bs-dismiss="modal">OK</button>
                    `;
                })
                .catch((error) => {
                    // エラーメッセージを表示
                    document.querySelector('#dynamicModal .modal-body').innerHTML = `
                        <p>Error: ${error}</p>
                    `;
                    document.querySelector('#dynamicModal .modal-footer').innerHTML = `
                        <button type="button" class="btn btn-primary" data-bs-dismiss="modal">OK</button>
                    `;
                });
        });
    } 
    else {
        alert("Please check any check-box");
    }
}

// 転送処理を行う関数
function handleExport(exportRows) {
    return new Promise((resolve, reject) => {
        const fetchPromises = exportRows.map((row, i) => {
            return new Promise((resolveInner, rejectInner) => {
                $.ajax({
                    type: 'POST',
                    headers: { 'X-CSRFToken': csrftoken },
                    url: 'ref_table/get_graph_data/',
                    contentType: 'application/json',
                    data: JSON.stringify({ row_id: row.id }),
                    success: function (response) {
                        if (Array.isArray(response.data) && response.data.length > 0) {
                            const firstItem = response.data[0];
                            row.wavelength = firstItem.wavelength || [];
                            row.reflectance = firstItem.reflectance || [];
                            resolveInner();
                        } 
                        else {
                            rejectInner("Invalid data structure.");
                        }
                    },
                    error: function () {
                        rejectInner("Failed to fetch graph data.");
                    }
                });
            });
        });

        Promise.all(fetchPromises)
            .then(() => {
                // 全データの取得に成功した場合
                $.ajax({
                    type: 'POST',
                    headers: { 'X-CSRFToken': csrftoken },
                    url: 'ref_table/export/',
                    contentType: 'application/json',
                    data: JSON.stringify(exportRows),
                    success: function (response) {
                        if (response.results && response.results.length > 0) {
                            const successMessages = response.results
                                .filter((result) => result.status === "success")
                                .map((result) => `${result.file}`)
                                .join('\n\n');
                            resolve(successMessages);
                        } 
                        else {
                            reject("Export succeeded, but no results were returned.");
                        }
                    },
                    error: function () {
                        reject("Export failed during server request.");
                    }
                });
            })
            .catch((error) => {
                reject(error);
            });
    });
}

function delete_from_list() {
    const deleteRows = countCheckboxes(2);
    if (deleteRows.length > 0) {
        const modalHTML = `
        <div class="modal fade" id="deleteModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static" style="z-index: 9999; background-color: rgb(0 0 0 / .5);">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Delete Confirmation</h5>
              </div>
              <div class="modal-body text-center" style="max-height: 300px; overflow-y: auto; overflow-x: hidden; word-wrap: break-word; white-space: normal;">
                <p>Do you want to delete ${deleteRows.length} data?</p>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-danger" id="confirmDelete">Delete</button>
              </div>
            </div>
          </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modalElement = document.getElementById('deleteModal');
        const bootstrapModal = new bootstrap.Modal(modalElement);
        bootstrapModal.show();

        document.getElementById('confirmDelete').addEventListener('click', function () {
            modalElement.querySelector('.modal-body').innerHTML = `
              <img src="/collect_static/map3d/image/loading.gif" alt="Loading..." style="width: 50px; height: 50px; margin-top: 20px;">
              <p>Deleting...</p>
            `;
            modalElement.querySelector('.modal-footer').innerHTML = ''; // フッターを非表示

            $.ajax({
                type: 'POST',
                headers: { 'X-CSRFToken': csrftoken },
                url: 'ref_table/delete/',
                contentType: 'application/json',
                data: JSON.stringify(deleteRows),
                success: function (response) {
                    modalElement.querySelector('.modal-body').innerHTML = `
                      <p>Success: ${deleteRows.length} data items have been deleted</p>
                    `;
                    modalElement.querySelector('.modal-footer').innerHTML = `
                      <button type="button" class="btn btn-primary" data-bs-dismiss="modal" onclick='get_record_spectra();'>OK</button>
                    `;
                    console.log("削除成功:", response);
                },
                error: function (error) {
                    modalElement.querySelector('.modal-body').innerHTML = `
                      <p>An error occurred during deletion.</p>
                    `;
                    modalElement.querySelector('.modal-footer').innerHTML = `
                      <button type="button" class="btn btn-primary" data-bs-dismiss="modal">OK</button>
                    `;
                    console.error("Error:", error);
                }
            });
        });

        modalElement.addEventListener('hidden.bs.modal', () => {
            modalElement.remove();
        });
    }
    else {
        alert("Please check any check-box");
    }
}

