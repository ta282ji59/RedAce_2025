const analysisCacheById = {};
let currentAnalysisRowId = null;

function apiUrl(path) {
  return `/map3d/${path.replace(/^\/?/, '')}`;
}

// このコードを読み込んだら自動実行する関数
document.addEventListener("DOMContentLoaded", () => {
    get_record_spectra();
    change_display();
});

function change_display(){
    const change_display_button = document.getElementById("change_display_button")
    const button_text = change_display_button.innerText;

    const spectral_graph = document.getElementById("spectral_graph")
    const save_list = document.getElementById("save_list")
    if(button_text == "Change to 'Save list'"){
        change_display_button.innerText = "Change to 'Graph list'";
        spectral_graph.style.display = 'block'
        save_list.style.display = 'none'
        spectral_graph.style.height = "auto";
    }
    else if(button_text == "Change to 'Graph list'"){
        change_display_button.innerText = "Change to 'Save list'";
        spectral_graph.style.display = 'none'
        save_list.style.display = 'block'
        save_list.style.height = "auto";
    }
}

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
const spectrumCacheByRowId = {};
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
                    <button type="submit" id="move-btn" onclick="move_from_list('${row.instrument}', '${row.instrument}', '${row.data_id}', ${row.latitude[0]}, ${row.longitude[0]});">
                        <i class="fas fa-location-arrow" style="color: black;" onMouseOut="this.style.color='black';" onMouseOver="this.style.color='Red';"></i>
                    </button>
                  </th>
                  <th scope="col" width="80" style="text-align:center;vertical-align:middle;">
                    <button type="button" class="btn btn-light btn-sm" onclick="openAnalysis('${row.id}','${row.instrument}','${row.data_id}')">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
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
                  <td colspan="9" style="padding: 0;">
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
                tr.addEventListener("click", (event) => {
                    // button,checkboxをクリックしても反応しないようにする
                    if (event.target.tagName === "BUTTON" || event.target.tagName === "INPUT"  || event.target.tagName === "I") {
                        return;
                    }
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

                spectrumCacheByRowId[rowId] = { wavelength, reflectance };


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
    document.querySelector('#export_all button').className = 'btn btn-warning'
    document.querySelector('#delete_all button').className = 'btn btn-warning'
}

/* =========================================
   MOVE / EXPORT / DELETE 関数
   ========================================= */

// 任意の列のチェックボックスを全てチェックする関数
function all_checked(row_name) {
    const rows = document.querySelectorAll('#table-body > tr');
    let row_number,button;

    if (row_name === 'export') {
        row_number = 1;
        button = document.querySelector('#export_all button');
    } else if (row_name === 'delete') {
        row_number = 2;
        button = document.querySelector('#delete_all button');
    }

    if (row_number) {
        let allChecked = true;

        // すべてのチェックボックスの状態を確認
        for (const row of rows) {
            const checkboxes = row.querySelectorAll('th input[type="checkbox"]');
            if (checkboxes.length >= row_number) {
                if (!checkboxes[row_number - 1].checked) {
                    allChecked = false;
                    break;
                }
            }
        }

        // 全チェック済みなら外し、そうでなければ全チェックする
        for (const row of rows) {
            const checkboxes = row.querySelectorAll('th input[type="checkbox"]');
            if (checkboxes.length >= row_number) {
                checkboxes[row_number - 1].checked = !allChecked;
            }
        }
        
        button.className = allChecked ? 'btn btn-warning' : 'btn btn-primary';
    }
}


function countCheckboxes(columnIndex) {
    // columnIndex=0 _ EXPORT
    // columnIndex=1 _ DELETE

    let count = 0;
    const rows = document.querySelectorAll('#table-body > tr');
    let saveList = [];
    for (const row of rows) {
        // 行内のチェックボックスを取得
        const checkboxes = row.querySelectorAll('th input[type="checkbox"]');
        const dataId = row.getAttribute("data-id");

        // if (columnIndex === 0 && count >= 2) {
        //     break;
        // }

        if (checkboxes.length > columnIndex && checkboxes[columnIndex].checked) {
            const rowData = data_copy.find(d => d.id === parseInt(dataId, 10));
            if (rowData) {
                // if (columnIndex === 0) { // MOVE
                //     saveList.push({
                //         instrument: rowData.instrument,
                //         obs_id: rowData.obs_id,
                //         latitude: rowData.latitude,
                //         longitude: rowData.longitude,
                //     });
                // }
                // else if (columnIndex === 1) { // EXPORT
                if (columnIndex === 0) { // EXPORT
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
                else if (columnIndex === 1) { // DELETE
                    saveList.push({ id: rowData.id });
                }
                count++;
            }
        }
    }

    // if (count == 0) {
    //     alert("Please check any check-box");
    // }
    return saveList;
}

let currentGeoJson = null; // 現在の GeoJSON データを追跡

function move_from_list(layerName, instrument, obs_id, latitude, longitude) {
    // CRISM か THEMIS のチェックをオンにする
    layer_check.layers.forEach(function (layer) {
        if (layer.name === instrument) {
            layer.show = true; // Cesium のレイヤーの表示を有効にする
        }
    });
    
    // latitude,longtitudeは座標を示す。sub_latは表示のずれ対策で補正している。数値的には正しい座標ではない(search.jsのdisplayAllPins関数でも似たようなことをしている)
    if(latitude < 80 && latitude > 0){
        sub_lat = latitude+0.1;
    }
    else if(latitude > -80 && latitude < 0){
        sub_lat = latitude-0.1;
    }
    else{
        sub_lat = latitude;
    }

    // GeoJSON データ作成
    const geojson = {
        type: "FeatureCollection",
        features: [
            {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [longitude, sub_lat],
                },
                properties: {
                    name: `${instrument}(${obs_id})`,
                    // name: `${instrument}`,
                    // description: `<div style="height:500px;"><p>This pin may be slightly out of specification. Please consider it as a guide only.<br><br>If you want to search Obs. data(CRISM or THEMIS) in more detail, click the second button from the top left of the screen.</p><img src="/collect_static//map3d/image/sample_button.gif" width="80%"></div>`,
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

    fetchDataClickedCoordinates(longitude, latitude,'spectral_move');
}

function export_from_list() {
    const exportRows = countCheckboxes(0);
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
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="confirmExport">Export</button>
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
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Closed</button>
                        <button type="button" class="btn btn-success"  data-bs-dismiss="modal" onclick="window.open('http://192.168.1.53:7010/', '_blank')">Open JupyterHub</button>

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
    const deleteRows = countCheckboxes(1);
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

// ★ Replace the whole function with this
window.openAnalysis = function (rowId, instrument, dataId) {
  const t = document.getElementById('spectral_list_toggle');
  if (t) t.checked = false;

  const old1 = document.getElementById('analysis_drawer');
  const old2 = document.getElementById('analysis_overlay');
  if (old1) old1.remove();
  if (old2) old2.remove();

  const DRAWER_WIDTH = 1060;
  const cssId = 'analysis_drawer_style_ctrl_v8_graph';
  if (!document.getElementById(cssId)) {
    const st = document.createElement('style');
    st.id = cssId;
    st.textContent = `
#analysis_overlay{position:fixed;inset:0;background:transparent;z-index:99997;display:none}
#analysis_drawer{position:fixed;top:0;right:-${DRAWER_WIDTH}px;width:${DRAWER_WIDTH}px;max-width:96vw;height:100%;
  background:#000;color:#111;z-index:99998;display:flex;flex-direction:column;transition:right .28s ease}
#analysis_drawer.show{right:0}
#analysis_hdr{display:flex;align-items:center;gap:.5rem;padding:.7rem .9rem;border-bottom:2px solid #fff;background:#000;color:#fff}
#analysis_hdr h5{margin:0;font-size:20px;font-weight:700;letter-spacing:.2px}
#analysis_close{margin-left:auto;width:26px;height:26px;border:none;border-radius:4px;background:#c83b3b;color:#fff;font-size:16px;line-height:1;cursor:pointer}
#analysis_ctrl{display:flex;gap:1rem;align-items:flex-start;padding:.9rem .9rem .5rem;background:#000;justify-content:flex-start;}
.ctrl-col{display:flex;flex-direction:column;gap:.8rem}
.ctrl-row{display:grid;grid-template-columns:140px 1fr;align-items:center;gap:.6rem;min-width:320px}
.ctrl-label{color:#fff;font-weight:700;font-size:16px;white-space:nowrap;justify-self:end}
.white-select,.white-input{appearance:none;-webkit-appearance:none;-moz-appearance:none;
  background:#fff;color:#111;border:2px solid #000;border-radius:8px;padding:.4rem .65rem;
  width:220px;max-width:220px;box-shadow:0 2px 0 rgba(0,0,0,.35)}
.idx-wrap{display:flex;gap:.5rem;align-items:center}
.idx-wrap input{width:105px}
.idx-dash{color:#fff;font-weight:700}
.btn-dummy{padding:.45rem .8rem;border:2px solid #000;background:#fff;color:#111;border-radius:8px;font-weight:600}
.btn-dummy:hover{filter:brightness(.95)}
#analysis_body{background:#000;padding:.6rem .9rem 1rem;overflow:auto;height:100%}
.table-wrap{background:#fff;border-radius:0;border:2px solid #000;overflow:hidden}
#analysis_tbl{width:100%;border-collapse:collapse;background:#fff}
#analysis_tbl th,#analysis_tbl td{border:2px solid #000;padding:.55rem .7rem;font-size:15px;color:#000;vertical-align:middle}
#analysis_tbl thead th{background:#fff;color:#000;font-weight:800;font-size:18px;text-align:center}
#analysis_tbl tbody td:nth-child(1){font-family:ui-monospace,Menlo,Consolas,monospace;letter-spacing:.08em}
@media (max-width:900px){.white-select,.white-input{width:220px;max-width:220px}.ctrl-row{min-width:360px;grid-template-columns:120px 1fr}}
#runStatus{margin-left:1rem;color:#fff;font-weight:600}
#errMsg{color:#ffaaaa;font-weight:700;margin-left:140px;margin-top:4px;display:none}
.graph-wrap{margin-top:12px;background:#fff;border:2px solid #000;border-top:none}
#spectrum_graph{width:100%;height:420px}
.hint-bar{color:#fff;font-size:12px;opacity:.8;margin-top:4px}
.clickable-row{cursor:pointer}
    `;
    document.head.appendChild(st);
  }

  const html = `
    <div id="analysis_overlay"></div>
    <aside id="analysis_drawer" aria-live="polite">
      <div id="analysis_hdr">
        <h5>Analysis</h5>
        <button id="analysis_close" aria-label="Close">✕</button>
      </div>
      <div id="analysis_ctrl">
        <div class="ctrl-col" id="leftCol">
          <div class="ctrl-row">
            <span class="ctrl-label">interp_type</span>
            <select id="sel_interp" class="white-select">
              <option value="liner" selected>liner</option>
              <option value="spi">sp</option>
            </select>
          </div>
          <div class="ctrl-row">
            <span class="ctrl-label">scaling_type</span>
            <select id="sel_scaling" class="white-select">
              <option value="norm" selected>Normalization</option>
              <option value="st">Standardization</option>
            </select>
          </div>
          <div class="ctrl-row">
            <span class="ctrl-label">similarity_method</span>
            <select id="sel_sim_type" class="white-select">
              <option value="pcc">Pearson’s r</option>
              <option value="cos" selected>Cos</option>
              <option value="edis">ED</option>
            </select>
          </div>
        </div>
        <div class="ctrl-col" id="rightCol">
          <div class="ctrl-row">
            <span class="ctrl-label">sort</span>
            <select id="sel_sort" class="white-select">
              <option value="sim_type">similarity_method</option>
              <option value="band">Band Number</option>
            </select>
          </div>
          <div class="ctrl-row">
            <span class="ctrl-label">ascending</span>
            <select id="sel_ascending" class="white-select">
              <option value="true" selected>True</option>
              <option value="false">False</option>
            </select>
          </div>
          <div class="ctrl-row">
            <span class="ctrl-label">wavelength range</span>
            <div class="idx-wrap">
              <input id="idx_min" class="white-input" type="number" step="0.001" placeholder="min wavelength (μm)">
              <span class="idx-dash">–</span>
              <input id="idx_max" class="white-input" type="number" step="0.001" placeholder="max wavelength (μm)">
            </div>
          </div>
          <div id="errMsg">Invalid index range</div>
        </div>
        <div id="analysis_actions" style="display:flex;flex-direction:column;align-items:flex-start;gap:10px;">
          <button id="runAnalysisBtn" class="btn-dummy" style="width:100px;">Run</button>
          <input id="downloadRowsInput"
                 class="white-input"
                 type="number"
                 inputmode="numeric"
                 min="1"
                 step="1"
                 placeholder="download # of rows"
                 style="width:180px;">
          <button id="downloadCsvBtn" class="btn-dummy" style="width:140px;">Download</button>
          <span id="runStatus"></span>
        </div>
      </div>

      <div id="analysis_body">
        <div class="table-wrap" id="tableWrap" style="display:none;">
          <table id="analysis_tbl">
            <thead>
              <tr id="theadRow">
                <th>SpectrumID</th>
                <th>SampleID</th>
                <th id="thMetric">similarity_method</th>
                <th id="thSort">Band Number</th>
                <th>SubType</th>
              </tr>
            </thead>
            <tbody id="analysisTbody"></tbody>
          </table>
        </div>
        <div id="spectrum_box_raw" class="graph-wrap" style="display:none;">
          <div id="spectrum_graph_raw"></div>
        </div>
        <div id="spectrum_box" class="graph-wrap" style="display:none;">
          <div id="spectrum_graph"></div>
        </div>
        <div class="hint-bar">Click a row to overlay library spectrum. Double-click legend to isolate.</div>
      </div>
    </aside>
  `;
  document.body.insertAdjacentHTML('beforeend', html);

  const overlay = document.getElementById('analysis_overlay');
  const drawer  = document.getElementById('analysis_drawer');
  requestAnimationFrame(() => {
    overlay.style.display = 'block';
    drawer.classList.add('show');
  });

  /* ====== Plotly & overlay utilities ====== */
  const AUTO_OVERLAY_TOP_N = 10;   // ← 上位何本重ねるか
  const PARALLEL_CHUNK     = 5;    // ← 同時 fetch 本数
  let targetWav = [];
  let targetRef = [];
  const overlayTraces = new Map(); // SpectrumID -> trace
  const localSpectrumCache = {};    // rowId -> { wav, ref }
  let targetRawX = [];
  let targetRawY = [];
  const rawTraces = new Map();

  // 先頭・末尾の 0 / -1 / 非数を null にする
  function dropEdgeZeros(arr) {
    if (!Array.isArray(arr)) return arr;
    const a = arr.slice();
    let i = 0, j = a.length - 1;
    while (i <= j && (!isFinite(a[i]) || a[i] === 0 || a[i] === -1)) { a[i] = null; i++; }
    while (j >= i && (!isFinite(a[j]) || a[j] === 0 || a[j] === -1)) { a[j] = null; j--; }
    return a;
  }
  
  function ensurePlotlyLoaded() {
    if (window.Plotly) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const id = 'plotly-autoload';
      if (document.getElementById(id)) {
        const iv = setInterval(() => {
          if (window.Plotly) { clearInterval(iv); resolve(); }
        }, 80);
        return;
      }
      const s = document.createElement('script');
      s.id = id;
      s.src = 'https://cdn.plot.ly/plotly-2.35.2.min.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Plotly load failed'));
      document.head.appendChild(s);
    });
  }

  // 端の 0 / -1 / きわめて小さい値を null にして縦の壁を消す
  function scrubEdgeGlitches(arr, eps = 0.03) {
    if (!Array.isArray(arr)) return arr;
    const a = arr.slice();
    let i = 0, j = a.length - 1;
  
    const bad = v => v == null || !isFinite(v) || v === -1 || v === 0 || Math.abs(v) <= eps;
  
    // 先頭側を削る
    while (i <= j && bad(+a[i])) { a[i] = null; i++; }
    // 末尾側を削る
    while (j >= i && bad(+a[j])) { a[j] = null; j--; }
  
    // 先頭近くに 1 点だけ 0 が混じるタイプのノイズも潰す（孤立 0 → null）
    for (let k = 1; k < a.length - 1; k++) {
      if (bad(+a[k]) && !bad(+a[k-1]) && !bad(+a[k+1])) a[k] = null;
    }
    return a;
  }

  function renderRaw() {
    const base = [{
      x: targetRawX, y: targetRawY, mode: 'lines',
      name: 'Target (raw)', line: { width: 2 }, connectgaps: true
    }];
    const traces = base.concat(Array.from(rawTraces.values()).map(t => ({ ...t, connectgaps: true })));
    const layout = {
      title: 'Raw Spectra Data',
      xaxis: { title: { text: 'Wavelength' }, tickmode: 'auto', nticks: 10, tickangle: -20, automargin: true, zeroline: false, autorange: true },
      yaxis: { title: { text: 'Reflectance' }, automargin: true, zeroline: false, autorange: true },
      legend: { orientation: 'h', y: -0.25 },
      margin: { l: 60, r: 10, t: 40, b: 80 },
      hovermode: 'x unified',
      showlegend: false
    };
    document.getElementById('spectrum_box_raw').style.display = 'block';
    Plotly.newPlot('spectrum_graph_raw', traces, layout, { responsive: true });
  }

  function renderScaled() {
    const base = [{ x: targetWav, y: targetRef, mode: 'lines', name: 'Target', line: { width: 2 }, connectgaps: true }];
    const traces = base.concat(
      Array.from(overlayTraces.values()).map(t => ({ ...t, connectgaps: true }))
    );
    const layout = {
      title: 'Scaled Spectra Data',
      xaxis: { title: { text: 'Wavelength' }, tickmode: 'auto', nticks: 10, tickangle: -20, automargin: true, zeroline: false, autorange: true },
      yaxis: { title: { text: 'Reflectance (scaled)' }, automargin: true, zeroline: false, autorange: true },
      legend: { orientation: 'h', y: -0.25 },
      margin: { l: 60, r: 10, t: 40, b: 80 },
      hovermode: 'x unified'
    };
    document.getElementById('spectrum_box').style.display = 'block';
    Plotly.newPlot('spectrum_graph', traces, layout, { responsive: true });
  }

  function padToTargetGrid(trX, trY, targetX) {
    if (!Array.isArray(trX) || !trX.length) return Array(targetX.length).fill(null);
    // 前提：align_to=target なので trX は targetX の“連続部分”になっている想定
    // 先頭の挿入位置（誤差対策に近似一致）
    const eps = 1e-6;
    let start = 0;
    while (start < targetX.length && targetX[start] + eps < trX[0]) start++;
    const out = Array(targetX.length).fill(null);
    for (let i = 0; i < trY.length && (start + i) < out.length; i++) {
      out[start + i] = trY[i];
    }
    return out;
  }

  // 先頭・末尾の連続無効値を完全に切り落とす
  function trimLeadingTrailingInvalid(x, y) {
    let start = 0;
    let end = y.length - 1;
  
    const bad = v => v == null || !isFinite(v) || v === 0 || v === -1;
  
    while (start <= end && bad(y[start])) start++;
    while (end >= start && bad(y[end])) end--;
  
    return {
      x: x.slice(start, end + 1),
      y: y.slice(start, end + 1)
    };
  }
  
  async function fetchPlotDataBatchScaled(wavelength, reflectance, overlayIds, opts) {
    const payload = await fetch(apiUrl('analysis/plotdata'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrftoken },
      body: JSON.stringify({
        interp_type:  opts.interp,
        scaling_type: opts.scaling,
        min_index:    opts.min_index,
        max_index:    opts.max_index,
        overlay_ids:  overlayIds,
        wavelength:   wavelength,
        reflectance:  Array.isArray(reflectance?.[0]) ? reflectance[0] : reflectance
      })
    }).then(r => r.json());

    if (payload.error) throw new Error(payload.error);
    const traces = Array.isArray(payload.traces) ? payload.traces : [];
    if (!traces.length) throw new Error('No scaled traces returned.');

    // traces[0] が Target（Scaled）
    const target = traces[0];
    targetWav = target.x || [];
    targetRef = target.y || [];

    const trimmed = trimLeadingTrailingInvalid(targetWav, targetRef);
    targetWav = trimmed.x;
    targetRef = trimmed.y;

    // Overlays（Scaled）
    overlayTraces.clear();
    for (let i = 1; i < traces.length; i++) {
      const tr = traces[i];
      if (!tr || !tr.name) continue;
      const paddedY = padToTargetGrid(tr.x, tr.y, targetWav);
      overlayTraces.set(String(tr.name), { 
        x: targetWav, 
        y: paddedY, 
        mode: 'lines', 
        name: tr.name, 
        line: { width: 1 } });
    }
  }

  // 先頭・末尾の0や-1を null にしてギャップにする
  function dropEdgeZeros(arr) {
    if (!Array.isArray(arr)) return arr;
    const a = arr.slice();
    let i = 0, j = a.length - 1;
    while (i <= j && (!isFinite(a[i]) || a[i] === 0 || a[i] === -1)) { a[i] = null; i++; }
    while (j >= i && (!isFinite(a[j]) || a[j] === 0 || a[j] === -1)) { a[j] = null; j--; }
    return a;
  }
  
  async function fetchPlotDataBatchRaw(wavelength, reflectance, overlayIds, opts) {
    const payload = await fetch(apiUrl('analysis/plotdata_raw'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrftoken },
      body: JSON.stringify({
        overlay_ids: overlayIds,
        wavelength:  wavelength,
        reflectance: Array.isArray(reflectance?.[0]) ? reflectance[0] : reflectance,
      })
    }).then(r => r.json());

    if (payload.error) throw new Error(payload.error);
    const traces = Array.isArray(payload.traces) ? payload.traces : [];
    if (!traces.length) throw new Error('No raw traces returned.');
  
    const target = traces[0];
    targetRawX = target.x || [];
    targetRawY = target.y || [];

    targetRawY = scrubEdgeGlitches(targetRawY);
  
    rawTraces.clear();
    for (let i = 1; i < traces.length; i++) {
      const tr = traces[i];
      if (!tr || !tr.name) continue;
      const cleanedY = scrubEdgeGlitches(tr.y);
      rawTraces.set(String(tr.name), { x: tr.x, y: cleanedY, mode: 'lines', name: tr.name, line: { width: 1 } });
    }

    targetRawY = dropEdgeZeros(targetRawY);

    rawTraces.forEach((tr, key) => {
      tr.y = dropEdgeZeros(tr.y);
      rawTraces.set(key, tr);
    });
  }

  // 追加: 先頭・末尾の0や無効値を null にするヘルパ
  function dropEdgeZeros(arr) {
    if (!Array.isArray(arr)) return arr;
    const a = arr.slice();
    let i = 0, j = a.length - 1;
  
    // 先頭側
    while (i <= j && (!isFinite(a[i]) || a[i] === 0 || a[i] === -1)) {
      a[i] = null; i++;
    }
    // 末尾側
    while (j >= i && (!isFinite(a[j]) || a[j] === 0 || a[j] === -1)) {
      a[j] = null; j--;
    }
    return a;
  }

  async function fetchSpectrumOverlay(spectrumId) {
    if (!spectrumId || overlayTraces.has(spectrumId)) return;
    const url = apiUrl(`analysis/spectrum/${encodeURIComponent(spectrumId)}?align_to=target`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`fetch failed (${resp.status})`);
    const { wavelength, reflectance, label } = await resp.json();
    const paddedY = padToTargetGrid(wavelength, reflectance, targetWav);
    overlayTraces.set(String(spectrumId), {
      x: targetWav,
      y: paddedY,
      mode: 'lines',
      name: label || String(spectrumId),
      line: { width: 1 }
    });
  }

  async function autoOverlayTopN(rows, limit) {
    const ids = rows.slice(0, limit).map(r => String(r.SpectrumID)).filter(Boolean);
    for (let i = 0; i < ids.length; i += PARALLEL_CHUNK) {
      const chunk = ids.slice(i, i + PARALLEL_CHUNK);
      await Promise.all(chunk.map(id => fetchSpectrumOverlay(id).catch(e => console.warn('overlay skip', id, e.message))));
      renderSpectrum(); // チャンクごとに再描画
    }
  }

  async function toggleOverlayBySpectrumId(spectrumId) {
    if (!spectrumId) return;
    if (overlayTraces.has(spectrumId)) {
      overlayTraces.delete(spectrumId);
      renderSpectrum();
      return;
    }
    try {
      await fetchSpectrumOverlay(spectrumId);
      renderSpectrum();
    } catch (e) {
      console.warn('Overlay fetch skipped:', e.message);
    }
  }

  function wavelengthToIndexRange(wavs, wavMin, wavMax) {
    // wavs: 昇順の波長配列を想定
    let min_index = null;
    let max_index = null ;
 
    if (wavMin !== null &&  Number.isFinite(wavMin)) {
      const i0 = wavs.findIndex(v => v >= wavMin);
      min_index = (i0 >= 0) ? i0 : null;
    }

    if (wavMax !== null && Number.isFinite(wavMax)) {
      let i1 = -1;
      for (let k = wavs.length - 1; k >= 0; k--) {
        if (wavs[k] <= wavMax) { i1 = k; break; }
      }
      // Python の slice は stop が「含まない」ので +1 する
      max_index = (i1 >= 0) ? (i1 + 1) : null;
    }

    if (min_index !== null && max_index !== null && max_index < min_index) {
      return { error: true, min_index: null, max_index: null };
    }
    return { error: false, min_index, max_index };
  }

  /* ====== Run with provided spectrum ====== */
  async function runWithSpectrum(wavelength, reflectance) {
    const interpSel = document.getElementById('sel_interp').value;
    const scalingSel = document.getElementById('sel_scaling').value;
    const simSel     = document.getElementById('sel_sim_type').value;
    const sortSel    = document.getElementById('sel_sort').value;
    const ascSel = document.getElementById('sel_ascending').value === 'true';
    const idxMinStr = document.getElementById('idx_min').value.trim();
    const idxMaxStr = document.getElementById('idx_max').value.trim();
    
    document.getElementById('thMetric').textContent = 'similarity_method';
    document.getElementById('thSort').textContent = 'Band number';

    const wavMin = (idxMinStr === '') ? null : parseFloat(idxMinStr);
    const wavMax = (idxMaxStr === '') ? null : parseFloat(idxMaxStr);

    const r = wavelengthToIndexRange(wavelength, wavMin, wavMax);
    if (r.error) throw new Error('Invalid wavelength range');

    let min_index = r.min_index;
    let max_index = r.max_index;

    const err = document.getElementById('errMsg');
    err.style.display = 'none';
    if (wavMin !== null && wavMax !== null && wavMax < wavMin) {
      err.style.display = 'block'; return;
    }

    const wrap  = document.getElementById('tableWrap');
    const tbody = document.getElementById('analysisTbody');
    wrap.style.display = 'block';
    tbody.innerHTML = `<tr><td colspan="5">Running…</td></tr>`;

    // 1) サーバ解析を実行して上位N件を取得（テーブル用）
    const res = await fetch(apiUrl('analysis/run/'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrftoken },
      body: JSON.stringify({
        interp_type:  interpSel,
        scaling_type: scalingSel,
        sim_type:     simSel,
        sort:         sortSel,
        ascending:    ascSel,
        top_n:        AUTO_OVERLAY_TOP_N,
        min_index:    min_index,
        max_index:    max_index,
        wavelength:   wavelength,
        reflectance:  Array.isArray(reflectance?.[0]) ? reflectance[0] : reflectance
      })
    }).then(r => r.json());

    if (res.error) throw new Error(res.error);
    const rows = Array.isArray(res.results) ? res.results : [];

    // テーブルを描画
    const metricKey = simSel;
    const htmlRows = rows.map(r => {
      const metricVal = (typeof r["similarity_method"] === 'number' && Number.isFinite(r["similarity_method"]))
      ? r["similarity_method"].toFixed(6)
      : (r["similarity_method"] ?? '');
      const bandVal = (r["Band Number"] ?? '');
      const sid = (r.SpectrumID ?? '');
      return `
        <tr class="clickable-row" data-spectrum-id="${sid}">
          <td>${sid}</td>
          <td>${r.SampleID ?? ''}</td>
          <td>${metricVal}</td>
          <td style="text-align:center">${bandVal}</td>
          <td>${r.SubType ?? ''}</td>
        </tr>
      `;
    }).join('');
    tbody.innerHTML = htmlRows || `<tr><td colspan="5">No rows</td></tr>`;

    // 行クリック：Scaled 側のトグル（※描画は renderScaled を呼ぶ）
    document.querySelectorAll('#analysis_tbl tbody tr').forEach(tr => {
      tr.addEventListener('click', async () => {
        const spectrumId = tr.getAttribute('data-spectrum-id') || tr.cells[0]?.textContent?.trim();
        if (!spectrumId) return;
        if (overlayTraces.has(spectrumId)) {
          overlayTraces.delete(spectrumId);
        } else {
          try {
            // 個別フェッチでも scaled を取得（既存APIを流用）
            const url = apiUrl(`analysis/spectrum/${encodeURIComponent(spectrumId)}?align_to=target`);
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`fetch failed (${resp.status})`);
            const { wavelength, reflectance, label } = await resp.json();
            overlayTraces.set(String(spectrumId), {
              x: wavelength, y: reflectance, mode: 'lines',
              name: label || String(spectrumId), line: { width: 1 }
            });
          } catch(e) {
            console.warn('Overlay fetch skipped:', e.message);
          }
        }
        renderScaled();
      });
    });

    // 2) Raw 一括 → 上のグラフ
    try {
      const ids = rows.slice(0, AUTO_OVERLAY_TOP_N).map(r => String(r.SpectrumID)).filter(Boolean);
      await ensurePlotlyLoaded();
      await fetchPlotDataBatchRaw(wavelength, reflectance, [], { min_index, max_index });
      renderRaw();
    } catch (e) {
      console.warn('raw batch failed:', e.message);
    }

    // 3) Scaled 一括 → 下のグラフ
    try {
      const ids = rows.slice(0, AUTO_OVERLAY_TOP_N).map(r => String(r.SpectrumID)).filter(Boolean);
      await fetchPlotDataBatchScaled(
        wavelength,
        reflectance,
        ids,
        { interp: interpSel, scaling: scalingSel, min_index, max_index }
      );
      renderScaled();
    } catch (e) {
      console.warn('scaled batch failed:', e.message);
    }
  }

  // Run クリック
  document.getElementById('runAnalysisBtn').addEventListener('click', async function () {
    const wrap  = document.getElementById('tableWrap');
    const tbody = document.getElementById('analysisTbody');
    wrap.style.display = 'block';
    tbody.innerHTML = `<tr><td colspan="5">Preparing spectrum…</td></tr>`;
  
    try {
      // ★ ここが質問の答えの場所 ★
      const cached = spectrumCacheByRowId[rowId];
      if (cached) {
        await runWithSpectrum(cached.wavelength, cached.reflectance);
        return;
      }
  
      // キャッシュが無ければサーバから取得
      const res = await fetch(apiUrl('ref_table/get_graph_data/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrftoken },
        body: JSON.stringify({ row_id: rowId })
      }).then(r => r.json());
  
      if (!Array.isArray(res.data) || res.data.length === 0) {
        throw new Error('No spectrum returned.');
      }
  
      const first = res.data[0];
      const wavelength  = first.wavelength || [];
      const reflectance = first.reflectance || [];
  
      // ★ 正しいキャッシュ保存先
      spectrumCacheByRowId[rowId] = { wavelength, reflectance };
  
      await runWithSpectrum(wavelength, reflectance);
  
    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="color:red;">
            ${err.message || 'Unexpected error'}
          </td>
        </tr>`;
      console.error('Run failed:', err);
    }
  });


    // CSV ダウンロード
  document.getElementById('downloadCsvBtn').addEventListener('click', async function () {
    try {
      const rowsStr = (document.getElementById('downloadRowsInput')?.value || '').trim();
      let download_rows = rowsStr === '' ? null : parseInt(rowsStr, 10);
      if (Number.isNaN(download_rows) || download_rows <= 0) download_rows = null;
      // まずターゲットスペクトルを取得（Run ボタンと同じロジック）
      const dc = (typeof window !== 'undefined' ? window.data_copy : undefined);
      const cachedFromGlobal = dc && dc[rowId] && dc[rowId].wavelength && dc[rowId].reflectance;
      const cachedLocal = localSpectrumCache[rowId] && localSpectrumCache[rowId].wavelength && localSpectrumCache[rowId].reflectance;

      let wavelength, reflectance;

      if (cachedFromGlobal) {
        ({ wavelength, reflectance } = dc[rowId]);
      } else if (cachedLocal) {
        ({ wavelength, reflectance } = localSpectrumCache[rowId]);
      } else {
        const res = await fetch(apiUrl('ref_table/get_graph_data/'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrftoken },
          body: JSON.stringify({ row_id: rowId })
        }).then(r => r.json());

        if (!Array.isArray(res.data) || res.data.length === 0) {
          throw new Error('No spectrum returned.');
        }
        const first = res.data[0];
        wavelength  = first.wavelength || [];
        reflectance = first.reflectance || [];
        localSpectrumCache[rowId] = { wavelength, reflectance };
        if (dc) {
          if (!dc[rowId]) dc[rowId] = {};
          dc[rowId].wavelength  = wavelength;
          dc[rowId].reflectance = reflectance;
        }
      }

      // フォームのパラメータを取得
      const interpSel = document.getElementById('sel_interp').value;
      const scalingSel = document.getElementById('sel_scaling').value;
      const simSel     = document.getElementById('sel_sim_type').value;
      const sortSel    = document.getElementById('sel_sort').value;
      const ascSel = document.getElementById('sel_ascending').value === 'true';
      const idxMinStr  = document.getElementById('idx_min').value.trim();
      const idxMaxStr  = document.getElementById('idx_max').value.trim();

      let wavMin = (idxMinStr === '') ? null : parseFloat(idxMinStr);
      let wavMax = (idxMaxStr === '') ? null : parseFloat(idxMaxStr);
      
      const r = wavelengthToIndexRange(wavelength, wavMin, wavMax);
      if (r.error) { err.style.display = 'block'; return; }

      let min_index = r.min_index;
      let max_index = r.max_index;

      // API を叩いて CSV を blob として受け取る
      const resp = await fetch(apiUrl('analysis/download_csv/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken
        },
        body: JSON.stringify({
          interp_type:  interpSel,
          scaling_type: scalingSel,
          sim_type:     simSel,
          sort:         sortSel,
          ascending:    ascSel,
          min_index:    min_index,
          max_index:    max_index,
          wavelength:   wavelength,
          reflectance:  Array.isArray(reflectance?.[0]) ? reflectance[0] : reflectance,
          download_rows: download_rows,
        })
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText || ('HTTP ' + resp.status));
      }

      const blob = await resp.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      const safe = (s) => String(s ?? '').replace(/[^\w.\-]+/g, '_');
      a.download = `analysis_${safe(simSel)}_${safe(dataId)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('CSV download failed:', e);
      alert('CSV のダウンロードに失敗しました: ' + (e && e.message ? e.message : e));
    }
  });

  function closeDrawer() {
    drawer.classList.remove('show');
    overlay.style.display = 'none';
    setTimeout(() => {
      drawer.remove();
      overlay.remove();
    }, 220);
  }
  document.getElementById('analysis_close').addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);
};
