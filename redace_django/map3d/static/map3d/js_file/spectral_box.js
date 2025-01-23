/**
 * グラフエリアに関する関数群
 */

var saveNum = 0;
var lockNum = -1;
var chartList = [];
var dataSave = [[], [], []];
var graphCounter = 1;

/**
 * グラフエリア表示
 * @param {*} data 
 */
function displaySpectralBox(data) {
    let dataObj = JSON.parse(data);
    console.log("==========");
    console.log(dataObj);

    let funcArea, graphArea;
    /**
     * グラフエリアの背景部分
     */
    function createFuncArea() {
        funcArea = document.getElementById('graph_move');
        funcArea.style.width = '100%';
        funcArea.style.height = '600px';
        funcArea.style.background = 'rgba(5,5,5,0.6)';
    }

    /**
     * グラフエリアのプロット部分
     * @param {*} classTabName 
     */
    function createArea(classTabName) {
        graphArea = document.getElementsByClassName(classTabName.toString())[0];
        graphArea.style.background = 'rgb(232, 231, 231)';
        graphArea.style.position = 'absolute';
        graphArea.style.width = '650px';
        graphArea.style.height = '490px';
    }

    /**
     * Lockに関する部分
     * htmlの直書きはやめたいね
     */
    function setLockElement() {
        if (chartList.length == 0) {
            let down_ref_div2 = document.createElement('div');
            down_ref_div2.innerHTML = `
                    <div class="lock_type">
                        <label><input type="radio" id="Lock1" value=1 name="Lock" >Lock 1</label>
                        <label><input type="radio" id="Lock2" value=2 name="Lock" disabled="disabled">Lock 2</label>
                        <label><input type="radio" id="Lock3" value=3 name="Lock" disabled="disabled">Lock 3</label>
                        <label><input type="radio" id="graph_FIFO" name="Lock" value=-1 checked>FIFO</label>
                    </div>`;
            funcArea.appendChild(down_ref_div2);
        } else if (chartList.length == 1) {
            document.getElementById('Lock2').disabled = false;
        } else if (chartList.length == 2) {
            document.getElementById('Lock3').disabled = false;
        }
    }

    /**
     * グラフエリア下部の解析機能部分
     * htmlの直書きはやめたいね
     */
    function createFuncElement() {
        if (chartList.length != 3 && downCheckList.indexOf(graphCounter) == -1) {
            let counter = graphCounter - 1;
            downCheckList.push(graphCounter);

            let scalingButton = document.createElement('div');
            scalingButton.innerHTML = `
                <div class="normalize_button" onclick="scaling(${counter}, 'normalize');">Normalize</div>
                <div class="standardize_button" onclick="scaling(${counter}, 'standardize');">Standardize</div>
                <div class="stacking_button" onclick="smoothing(${counter}, 'stacking');">Stacking</div>
                <div class="undo_button" onclick="undoCurrentChart(${counter});">Undo</div>
                <div class="redo_button" onclick="redoChartUpdate(${counter});">Redo</div>`;
            funcArea.appendChild(scalingButton);

            let htmlDownloadType = document.createElement('div');
            htmlDownloadType.innerHTML = `
                <div class="download_type">
                    <label><input type="radio" id="one_file" value="one" name="download_type" checked> Merged</label>
                    <label><input type="radio" id="each_file" value="each" name="download_type"> Separate</label>
                </div>`;
            funcArea.appendChild(htmlDownloadType);

            // radioボタンの切り替え
            let radioDownloadType = document.querySelectorAll(`input[type='radio'][name='download_type']`);
            for (let target of radioDownloadType) {
                target.addEventListener('change', () => {});
            }

            // スペクトルプロットの下部ダウンロードボタン生成
            var htmlDownloadButton = document.createElement('div');
            htmlDownloadButton.innerHTML = `
                <div class="download_button" onclick="downloadGraphCSV(${counter});">Download</div>`;

            // スペクトルプロットの下部メモ欄生成
            htmlSaveMemo = document.createElement('div');
            htmlSaveMemo.innerHTML = `
                <input type="text" id="save_memo_${graphCounter}" value="" placeholder=" Jot your note down here." />`;

            // スペクトルプロットのリスト保存ボタン生成
            htmlSaveButton = document.createElement('div');
            let id = `save_spectral_${graphCounter}`;
            htmlSaveButton.innerHTML = `
                <div class="save_button" id="${id}" onclick="save_spectral(${counter});">Save to list</div>`;

            let idTabName = `graph_${graphCounter}_content`;
            document.getElementById(idTabName).appendChild(htmlDownloadButton);
            document.getElementById(idTabName).appendChild(htmlSaveMemo);
            document.getElementById(idTabName).appendChild(htmlSaveButton);
        }
    }

    /**
     * スタッキング
     * @param {*} preGraphArr 
     * @param {*} arrToAdd 
     * @returns 
     */
    function stackingSpectralData(preGraphArr, arrToAdd) {
        let refColNum = preGraphArr[0].length - 1;
        let tmpGraphArr = [];

        for (let i = 0; i < preGraphArr.length; i++) {
            tmpGraphArr.push(preGraphArr[i]);
            tmpGraphArr[i].push(null);
        }

        for (let i = 0; i < arrToAdd.length; i++) {
            for (let j = 0; j < tmpGraphArr.length; j++) {
                if (arrToAdd[i][0] == tmpGraphArr[j][0]) {
                    let newRefCol = tmpGraphArr[j].pop();
                    if (newRefCol == null) {
                        tmpGraphArr[j].push(arrToAdd[i][1]);
                        break;
                    } else {
                        tmpGraphArr[j].push(newRefCol); //?
                    }
                } else {
                    // 異なる波長域のデータを合体
                    if (tmpGraphArr.length - 1 === j) {
                        let null_arr = Array.apply(null, Array(refColNum)).map(function () {
                            return null;
                        });
                        Array.prototype.splice.apply(arrToAdd[i], [1, 0].concat(null_arr)); //挿入
                        tmpGraphArr.push(arrToAdd[i]);
                        break;
                    }
                }
            }
        }

        tmpGraphArr = tmpGraphArr.sort(function (a, b) {
            return a[0] - b[0];
        });
        return tmpGraphArr;
    }

    if (dataObj['reflectance'] !== -1) {
        let isTypeDIRECT = dataObj['type'] === 'DIRECT' ? true : false;
        let isTypeROI = dataObj['type'] === 'ROI' ? true : false;
        let newGraphArr = [];
        let band = 0;
        let wavList = dataObj['band_bin_center']; // Wavelength

        if (isTypeDIRECT) {
            let refList = dataObj['reflectance'];

            for (let i = 0; i < dataObj['band_number']; i++) {
                newGraphArr[i] = [];
                newGraphArr[i][0] = wavList[i];
                newGraphArr[i][1] = refList[i] !== -1 ? refList[i] : NaN;
            }
        } else if (isTypeROI) {
            let refArr = dataObj['reflectance'];

            for (let i = 0; i < dataObj['band_number']; i++) {
                newGraphArr[i] = [];
                newGraphArr[i][0] = wavList[i];
                for (let j = 0; j < refArr.length; j++) {
                    newGraphArr[i][j + 1] = refArr[j][i] !== -1 ? refArr[j][i] : NaN;
                }
            }
        }

        // スペクトル取得時グラフエリアに遷移
        // if (flag_ref_position) {
        //     $('html,body').animate({
        //         scrollTop: $('#graph_move').offset().top - 100,
        //     });
        //     flag_ref_position = false;
        // }

        createFuncArea();
        setLockElement();

        console.log("+++++++");

        /**
         * Lock判定
         */
        let lockCheck = Number($('input[name=Lock]:checked').val());
        if (lockCheck != -1) {
            lockNum = lockCheck;
            graphCounter = lockNum;
            saveNum = lockNum;
            dataSave[saveNum - 1].push(dataObj);
        } else {
            lockNum = -1;
            saveNum += 1;
            if (saveNum >= 4) saveNum = 1;
            if (dataSave[saveNum - 1].length >= 1) dataSave[saveNum - 1] = [];
            dataSave[saveNum - 1].push(dataObj);
        }

        // let htmlDownloadType = document.createElement('div');
        // htmlDownloadType.innerHTML = `
        //     <div class="download_type">
        //         <label><input type="radio" id="one_file" value="one" name="download_type" checked> In one file</label>
        //         <label><input type="radio" id="each_file" value="each" name="download_type"> In each file</label>
        //     </div>`;
        // funcArea.appendChild(htmlDownloadType);

        // // radioボタンの切り替え
        // let radioDownloadType = document.querySelectorAll(`input[type='radio'][name='download_type']`);
        // for (let target of radioDownloadType) {
        //     target.addEventListener('change', () => {});
        // }

        createArea(`graph${graphCounter}`);
        createFuncElement();

        console.log("-------");

        /**
         * グラフタイトル設定
         */
        let titleLon, titleLat, newLabel, graphArr, graphLabel;
        if (isTypeDIRECT) {
            titleLon = dataObj['coordinate'][0];
            titleLat = dataObj['coordinate'][1];
            newLabel = ['band', `${dataObj['obs_ID']}: E_${titleLon} N_${titleLat}`];
        } else if (isTypeROI) {
            newLabel = ['band'];
            for (let j = 0; j < dataObj['coordinate'].length; j++) {
                titleLon = dataObj['coordinate'][j][0];
                titleLat = dataObj['coordinate'][j][1];
                newLabel.push(`${dataObj['obs_ID']}: E_${titleLon} N_${titleLat}`);
            }
        }

        /**
         * ロック時の計算
         */
        let hasLock2 = lockNum === 2 && chartList.length >= 2 ? true : false;
        let hasLock3 = lockNum === 3 && chartList.length >= 3 ? true : false;
        if (chartList.length !== 0 && (lockNum === 1 || hasLock2 || hasLock3)) {
            graphLabel = chartList[lockNum - 1].user_attrs_.labels;
            graphLabel = graphLabel.concat(newLabel.slice(1));
            graphArr = chartList[lockNum - 1].file_;

            if (isTypeDIRECT) {
                graphArr = stackingSpectralData(graphArr, newGraphArr);
            } else if (isTypeROI) {
                for (let j = 0; j < newGraphArr[0].length - 1; j++) {
                    let newTmpGraphArr = [];
                    for (let i = 0; i < dataObj['band_number']; i++) {
                        newTmpGraphArr[i] = [];
                        newTmpGraphArr[i].push(newGraphArr[i][0]);
                        newTmpGraphArr[i].push(newGraphArr[i][j + 1]);
                    }
                    graphArr = stackingSpectralData(graphArr, newTmpGraphArr);
                }
            }
        } else {
            graphArr = newGraphArr;
            graphLabel = newLabel;
        }

        /**
         * グラフエリアのタブに関する。思い出せない、確認して。
         */
        if (chartList.length >= graphCounter) {
            chartList[graphCounter - 1].destroy();
        }

        let graphTabId = `graph_tab${graphCounter}`;
        document.getElementById(graphTabId).innerHTML = `${dataObj['obs_name']}::${dataObj['obs_ID']}`;
        changeTabColor(graphTabId, 'goldenrod');

        if (chartList.length === 0) {
            document.getElementById(graphTabId).style.backgroundColor = 'aqua';
        }

        // prettier-ignore
        let [graphTabId_A, graphTabId_B] =
            graphCounter === 1 ? ['graph_tab2', 'graph_tab3'] : 
            graphCounter === 2 ? ['graph_tab1', 'graph_tab3'] : ['graph_tab2', 'graph_tab1'];

        changeTabColor(graphTabId_A, '#d9d9d9');
        changeTabColor(graphTabId_B, '#d9d9d9');

        function changeTabColor(id, color) {
            if (document.getElementById(id).style.backgroundColor != null) {
                if ($(`#${id}`).css('background-color') != 'rgb(0, 255, 255)') {
                    $(`#${id}`).css('background-color', `${color}`);
                }
            }
        }

        console.log("-=-=-=-=-");

        let graphArrChart = graphArr.slice(); // スライスでコピーしている

        console.log(graphArrChart);
        console.log(chartList);
        console.log(graphArea);
        console.log(graphArrChart);

        /**
         * プロットする
         * Dygraph：JSライブラリ
         */
        chartList[graphCounter - 1] = new Dygraph(
            graphArea, // 表示ID名?
            graphArrChart, // グラフデータ
            {
                // オプション
                colors: ['#000080', '#8b0000', '#32cd32', '#ff00ff', '#f4a460'],
                title: `${dataObj['obs_ID']}: E_${titleLon} N_${titleLat}`,
                ylabel: 'Reflectance',
                xlabel: 'Wavelength[μm]',
                legend: 'always',
                animatedZooms: true,
                showRangeSelector: true,
                rangeSelectorHeight: 30,
                rangeSelectorPlotStrokeColor: 'rgb(80,80,80)',
                rangeSelectorPlotFillColor: 'rgb(80,80,80)',
                showRoller: true,
                labelsSeparateLines: true,
                labelsDivStyles: {
                    backgroundColor: 'rgb(48,48,48)',
                },
                labelsDiv: document.getElementById(`labels${graphCounter}`),
                highlightSeriesOpts: {
                    strokeWidth: 1.5,
                    strokeBorderWidth: 1,
                },
                connectSeparatedPoints: true,
                labels: graphLabel,
            }
        );

        console.log("==============");
        console.log(chartList);

        // dygraph生成時divが非表示だと生成されないため、タブ切り替え時にリサイズで生成する。
        document.querySelector('#graph_1').addEventListener('click', () => {
            chartList[0].resize();
        });
        document.querySelector('#graph_2').addEventListener('click', () => {
            chartList[1].resize();
        });
        document.querySelector('#graph_3').addEventListener('click', () => {
            chartList[2].resize();
        });

        graphCounter++;
        if (graphCounter >= 4) graphCounter = 1;
        click_history(data);
    } else {
        alert('No data.');
    }
}

function scaling(value, type) {
    // let selectedDownloadValue = $('input[name=download_type]:checked').val();
    let labelList = chartList[value].user_attrs_.labels;
    let dataArr = chartList[value].file_;
    storeCurrentChart(labelList, dataArr);
    // console.log(dataArr);

    $.ajax({
        type: 'POST',
        headers: { 'X-CSRFToken': csrftoken },
        url: 'reflectance/',
        contentType: 'application/json',
        data: JSON.stringify({
            operation: 'scaling',
            dataArr: dataArr,
            type: type,
        }),
    }).then(
        function (data) {
            console.log('SUCCESS >> scaling');
            // console.log(data);
            updateChart(value, type, data);
        },
        function () {
            console.log('ERROR >> scaling');
            alert('読み込み失敗');
        }
    );
}

function smoothing(value, type) {
    // let selectedDownloadValue = $('input[name=download_type]:checked').val();
    let labelList = chartList[value].user_attrs_.labels;
    let dataArr = chartList[value].file_;
    storeCurrentChart(labelList, dataArr);
    // console.log(dataArr);

    $.ajax({
        type: 'POST',
        headers: { 'X-CSRFToken': csrftoken },
        url: 'reflectance/',
        contentType: 'application/json',
        data: JSON.stringify({
            operation: 'smoothing',
            dataArr: dataArr,
            type: type,
        }),
    }).then(
        function (data) {
            console.log('SUCCESS >> smoothing');
            // console.log(data);
            updateChart(value, type, data);
        },
        function () {
            console.log('ERROR >> smoothing');
            alert('読み込み失敗');
        }
    );
}

var labelsStorageForUndo = [];
var spectraStorageForUndo = [];
function storeCurrentChart(labels, spectraData) {
    labelsStorageForUndo.push(labels);
    spectraStorageForUndo.push(spectraData);

    updateButtonState();

    console.log('store');
    console.log(labelsStorageForUndo);
    console.log(labelsStorageForRedo);
}

var labelsStorageForRedo = [];
var spectraStorageForRedo = [];
function undoCurrentChart(value) {
    let currentLabels = chartList[value].user_attrs_.labels;
    let currentChart = chartList[value].file_;
    labelsStorageForRedo.push(currentLabels);
    spectraStorageForRedo.push(currentChart);

    let previousLabels = labelsStorageForUndo.pop();
    let previousChart = spectraStorageForUndo.pop();
    chartList[value].updateOptions({
        labels: previousLabels,
        file: previousChart,
    });
    chartList[value].resize();

    updateButtonState();

    console.log('undo');
    console.log(labelsStorageForUndo);
    console.log(labelsStorageForRedo);
}

function redoChartUpdate(value) {
    let currentLabels = chartList[value].user_attrs_.labels;
    let currentChart = chartList[value].file_;
    labelsStorageForUndo.push(currentLabels);
    spectraStorageForUndo.push(currentChart);

    let nextLabels = labelsStorageForRedo.pop();
    let nextChart = spectraStorageForRedo.pop();
    chartList[value].updateOptions({
        labels: nextLabels,
        file: nextChart,
    });
    chartList[value].resize();

    updateButtonState();

    console.log('redo');
    console.log(labelsStorageForUndo);
    console.log(labelsStorageForRedo);
}

function updateButtonState() {
    var divElement = document.getElementsByClassName('undo_button')[0];
    if (spectraStorageForUndo.length === 0) {
        divElement.style.pointerEvents = 'none';
        divElement.style.backgroundColor = '#ccc'; // クリック不可時のスタイルを設定
    } else {
        divElement.style.pointerEvents = 'auto';
        divElement.style.backgroundColor = 'white'; // クリック可能時のスタイルを設定
    }

    var divElement = document.getElementsByClassName('redo_button')[0];
    if (spectraStorageForRedo.length === 0) {
        divElement.style.pointerEvents = 'none';
        divElement.style.backgroundColor = '#ccc'; // クリック不可時のスタイルを設定
    } else {
        divElement.style.pointerEvents = 'auto';
        divElement.style.backgroundColor = 'white'; // クリック可能時のスタイルを設定
    }
}

function updateChart(value, type, data) {
    let dataObj = JSON.parse(data);
    let dataArr = dataObj['dataArr'];
    let newDataArr = [];
    // console.log(dataObj);

    for (let i = 0; i < dataArr.length; i++) {
        newDataArr[i] = [];
        newDataArr[i][0] = dataArr[i][0];
        for (let j = 1; j < dataArr[0].length; j++) {
            newDataArr[i][j] = dataArr[i][j] !== -9999 ? dataArr[i][j] : NaN;
        }
    }

    if (type === 'stacking') {
        chartList[value].updateOptions({
            labels: ['band', 'stacked_ref'],
            file: newDataArr,
        });
    } else {
        chartList[value].updateOptions({
            file: newDataArr,
        });
    }
    chartList[value].resize();
}
