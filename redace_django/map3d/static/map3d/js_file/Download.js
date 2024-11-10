/**
 * ダウンロードに関する関数群
 */

/**
 * 今現在の日時を取得
 * @returns today = [year, month, date, hours, minutes, seconds]
 */
function getToday() {
    let days = new Date();
    let year = days.getFullYear();
    let month = ('0' + (days.getMonth() + 1)).slice(-2);
    let date = ('0' + days.getDate()).slice(-2);
    let hours = ('0' + days.getHours()).slice(-2);
    let minutes = ('0' + days.getMinutes()).slice(-2);
    let seconds = ('0' + days.getSeconds()).slice(-2);
    let today = [year, month, date, hours, minutes, seconds];
    return today;
}

/**
 * 補助情報エリアのデータをダウンロード用に配列作成
 * @returns 
 */
function createAncillaryArray() {
    let data = [];
    let tr = $('iframe').contents().find('table.ancillary tr'); //全行を取得
    for (let i = 0, l = tr.length; i < l; i++) {
        let cells = tr.eq(i).children(); //1行目から順にth、td問わず列を取得
        for (let j = 0, m = cells.length; j < m; j++) {
            if (typeof data[i] == 'undefined') data[i] = [];
            data[i][j] = cells.eq(j).text(); //i行目j列の文字列を取得
        }
    }

    let dataNew = [];
    for (let i = 0; i < data.length; i = i + 2) {
        for (let j = 0; j < 3; j++) {
            if (data[i][j] != 'NULL') {
                dataNew.push([data[i][j], data[i + 1][j]]);
            }
        }
    }

    return dataNew;
}

/**
 * XLSXでダウンロード
 */
function downloadAncXLSX() {
    let data = createAncillaryArray();
    let obsID = $('.cesium-infoBox-title').text();
    let filename = `${obsID}_AncInfo.xlsx`;

    function sheet_to_workbook(sheet, opts) {
        var n = opts && opts.sheet ? opts.sheet : 'Sheet1';
        var sheets = {};
        sheets[n] = sheet;
        return { SheetNames: [n], Sheets: sheets };
    }

    function aoa_to_workbook(data, opts) {
        return sheet_to_workbook(XLSX.utils.aoa_to_sheet(data, opts), opts);
    }

    function s2ab(s) {
        var buf = new ArrayBuffer(s.length);
        var view = new Uint8Array(buf);
        for (var i = 0; i != s.length; ++i) view[i] = s.charCodeAt(i) & 0xff;
        return buf;
    }

    var wb_out = XLSX.write(aoa_to_workbook(data), { type: 'binary' });

    saveAs(new Blob([s2ab(wb_out)], { type: 'application/octet-stream' }), filename);
}

/**
 * JSON文字列でダウンロード
 */
function downloadAncJSON() {
    let data = createAncillaryArray();
    var json = {};
    for (let i = 0; i < data.length; i++) {
        json[data[i][0]] = isNaN(data[i][1]) ? data[i][1] : Number(data[i][1]);
    }
    json = JSON.stringify(json, undefined, 1);

    let obsID = $('.cesium-infoBox-title').text();
    let filename = `${obsID}_AncInfo.json`;
    saveAs(new Blob([json], { type: 'application/json' }), filename);
}

/**
 * CSVでダウンロード
 */
function downloadAncCSV() {
    let data = createAncillaryArray();
    let csv = '';
    for (let i = 0; i < data.length; i++) {
        csv += `${data[i][0]},${data[i][1]}\n`;
    }

    let obsID = $('.cesium-infoBox-title').text();
    let filename = `${obsID}_AncInfo.csv`;
    let buf = new Uint8Array([0xef, 0xbb, 0xbf]);
    saveAs(new Blob([buf, csv], { type: 'text/csv' }), filename);
}

/**
 * PVLでダウンロード
 */
function downloadAncPVL() {
    let data = createAncillaryArray();
    let pvl = [];
    let str = '';

    pvl.push(['SERVICE = "RED_ACE"\n']);
    pvl.push(['OBJECT = ancillary\n']);
    for (let i = 0; i < data.length; i++) {
        str = isNaN(data[i][1]) ? `\t${data[i][0]} = ${data[i][1]}\n` : `\t${data[i][0]} = ${Number(data[i][1])}\n`;
        pvl.push([str]);
    }
    pvl.push(['END_OBJECT = ancillary\n']);
    pvl.push(['END\n']);

    let obsID = $('.cesium-infoBox-title').text();
    let filename = `${obsID}_AncInfo.pvl`;
    saveAs(new Blob(pvl, { type: 'text/plain;charset=UTF-8' }), filename);
}

/**
 * グラフエリア下部のダウンロードボタン、CSV形式
 * @param {*} value 
 */
function downloadGraphCSV(value) {
    let selectedDownloadValue = $('input[name=download_type]:checked').val();
    let labelList = chartList[value].user_attrs_.labels;
    let dataArr = chartList[value].file_;
    let [yyyy, MM, dd, hh, mm, ss] = getToday();
    let buf = new Uint8Array([0xef, 0xbb, 0xbf]);

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    let newLabelList = [];
    for (let i = 1; i < labelList.length; i++) {
        newLabelList.push(labelList[i].replace(/\s+/g, ''));
    }

    if (selectedDownloadValue === 'one') {
        delayedLoop();
        async function delayedLoop() {
            let csv = 'wavelength[μm]';
            for (let i = 1; i < labelList.length; i++) {
                csv += `,reflectance${i}`;
            }
            csv += '\n';
            for (let i = 0; i < dataArr.length; i++) {
                csv += `${dataArr[i][0]}`;
                for (let j = 1; j < dataArr[0].length; j++) {
                    csv += `,${dataArr[i][j]}`;
                }
                csv += '\n';
            }

            let filename = `${yyyy}${MM}${dd}_${hh}${mm}${ss}_inOne_spectra.csv`;
            saveAs(new Blob([buf, csv], { type: 'text/csv' }), filename);
            console.log(`Download >> ${filename}`);
            await sleep(100);

            csv = 'Reflectance Number,Label Name\n';
            for (let i = 0; i < newLabelList.length; i++) {
                csv += `reflectance${i + 1},`;
                csv += `${newLabelList[i]}\n`;
            }

            filename = `${yyyy}${MM}${dd}_${hh}${mm}${ss}_inOne_catalogue.csv`;
            saveAs(new Blob([buf, csv], { type: 'text/csv' }), filename);
            console.log(`Download >> ${filename}`);
        }
    } else if (selectedDownloadValue === 'each') {
        const zip = new JSZip();
        delayedLoop();
        async function delayedLoop() {
            for (let i = 1; i < labelList.length; i++) {
                let csv = `wavelength[μm],reflectance\n`;
                for (let j = 0; j < dataArr.length; j++) {
                    csv += `${dataArr[j][0]},${dataArr[j][i]}\n`;
                }

                let num = ('0000' + i).slice(-4);
                let filename = `spectrum${num}.csv`;

                // ZIPファイルにCSVデータを追加
                zip.file(filename, csv);

                await sleep(100);
            }

            filename = `catalogue.csv`;
            csv = 'File Name,Label Name\n';
            for (let i = 0; i < newLabelList.length; i++) {
                num = ('0000' + (i + 1)).slice(-4);
                csv += `spectrum${num},`;
                csv += `${newLabelList[i]}\n`;
            }
            zip.file(filename, csv);

            // ZIPファイルを生成
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const uri = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.download = `${yyyy}${MM}${dd}_${hh}${mm}${ss}_inEach.zip`;
            link.href = uri;
            link.click();
            console.log(`Download >> ${link.download}`);
        }
    }
}

/**
 * ROI範囲のスペクトルデータをダウンロード、CSV形式
 * @param {*} data 
 */
function download_csv_roi_area(data) {
    let dataObj = JSON.parse(data);
    let wavArr = dataObj['band_bin_center'];
    let refArr = dataObj['reflectance'];
    let obsID = dataObj['obs_ID'];
    let coordinate = dataObj['coordinate'];
    let filename = `${obsID}_E_${coordinate[0]}_N_${coordinate[1]}.csv`;

    console.log('download_csv_roi_area');
    console.log(dataObj);

    // Header
    let csv = 'wavelength[μm]';
    for (let j = 1; j <= refArr.length; j++) {
        csv += `,reflectance${j}`;
    }
    csv += '\n';

    // Spectral Data
    for (let i = 0; i < wavArr.length; i++) {
        csv += wavArr[i];
        for (let j = 0; j < refArr.length; j++) {
            if (refArr[j][i] !== -1) {
                csv += `,${refArr[j][i]}`;
            } else {
                csv += ',' + NaN;
            }
        }
        csv += '\n';
    }

    let buf = new Uint8Array([0xef, 0xbb, 0xbf]);
    saveAs(new Blob([buf, csv], { type: 'text/csv' }), filename);
}

// TODO
/**
 * サムネイル画像ウィンドウのダウンロードボタン、csvダウンロード（全ピクセル）。
 * 機能してない。
 * @param {*} data
 */
function download_csv_spectral_allpixel(data) {
    var dataObj = JSON.parse(data);
    console.log(dataObj);

    var filename = dataObj['obs_ID'] + '.csv';
    var sp_csv = '';

    // イメージサイズ[X, Y], バンド数
    sp_csv += dataObj['Image_size'][0] + ',';
    sp_csv += dataObj['Image_size'][1] + ',';
    sp_csv += dataObj['band_number'] + '\n';
    // sp_csv += dataObj["band_number"].length + "\n";

    // x座標(波長)
    wavelength_list = dataObj['band_bin_center'].split(',');
    wavelength_list.map(Number);
    if (wavelength_list[0] > wavelength_list[wavelength_list.length - 1]) {
        wavelength_list.reverse();
    }
    for (var i = 0; i < dataObj['band_number']; i++) {
        sp_csv += wavelength_list[i] + ',';
    }
    sp_csv = sp_csv.slice(0, -1); // 最後のコンマ除去
    sp_csv += '\n';

    // y座標(反射率)
    // if (dataObj["reflectance"] !== -1) {
    //     for (var i = 0; i < dataObj["reflectance"].length; i++) { // バンド数(x、yのペア)
    //         sp_csv += wavelength_list[i] + ",";
    //     }
    // }
    // for (var i = 0; i < dataObj["band_number"]; i++) {
    //     sp_csv += dataObj["reflectance"][i] + "\n";
    // }

    // y座標(反射率)、1バンドのrefを全て取れる。
    for (var i = 0; i < dataObj['Image_size'][1]; i++) {
        sp_csv += dataObj['reflectance'][i] + '\n';
    }

    var buf = new Uint8Array([0xef, 0xbb, 0xbf]);
    saveAs(new Blob([buf, sp_csv], { type: 'text/csv' }), filename);
}
