function featureChanged(feature, id) {
    const nameSelectorId = `tagSelector_name_${feature}`;
    const nameSelector = document.getElementById(nameSelectorId);

    if (!nameSelector) {
        console.error(`Error: Element with ID "${nameSelectorId}" not found.`);
        return;
    }

    if (id === "not") {
        // セレクターを defaultOptionText のみ残す状態にする
        const defaultOptionText =
            feature === "mission" ? "-- Select Mission Name --" : "-- Select Feature Name --";
        nameSelector.innerHTML = `<option id="not">${defaultOptionText}</option>`;
        return;
    }

    const loadingElement = document.getElementById(`loading_${feature}`);
    const tagNameElement = document.getElementById(nameSelectorId);

    if (!loadingElement) {
        console.error(`Error: Loading element with ID "loading_${feature}" not found.`);
        return;
    }

    // ローディング表示 & セレクター非表示
    loadingElement.style.display = "block";

    if (tagNameElement) {
        tagNameElement.style.display = "none";
    }

    $.ajax({
        type: "POST",
        headers: { "X-CSRFToken": csrftoken },
        url: "search/feature",
        contentType: "application/json",
        data: JSON.stringify({
            feature: feature,
            id: id,
        }),

        success: function (response) {
            // ローディング非表示 & セレクター再表示
            loadingElement.style.display = "none";

            if (tagNameElement) {
                tagNameElement.style.display = "block";
            }

            // セレクターを初期化してデフォルトオプションを設定
            const defaultOptionText =
                feature === "mission" ? "-- Select Mission Name --" : "-- Select Feature Name --";
            nameSelector.innerHTML = `<option id="not">${defaultOptionText}</option>`;

            // レスポンスデータの処理
            response.data.forEach((row) => {
                const option = document.createElement("option");
                option.value = row.observation_id || row.name; // 値のフィールドに応じて調整
                option.textContent = row.observation_id || row.name;
                nameSelector.appendChild(option);
            });
        },
        error: function (error) {
            // ローディング非表示 & セレクター再表示
            loadingElement.style.display = "none";

            if (tagNameElement) {
                tagNameElement.style.display = "block";
            }

            console.error("Error occurred:", error);
        },
    });
}



// 1ページあたりの表示数
const page_limit = 45;

function search() {
    // 検索ワード取得
    let search_input = document.getElementById("search_input").value;

    // select項目取得
    const selectElement_mission = document.getElementById("tagSelector_mission");
    const selectedMission = selectElement_mission.options[selectElement_mission.selectedIndex].id;

    const selectElement_name_mission = document.getElementById("tagSelector_name_mission");
    const selectedNameMission = selectElement_name_mission.options[selectElement_name_mission.selectedIndex].value;

    const selectElement_type = document.getElementById("tagSelector_type");
    const selectedId = selectElement_type.options[selectElement_type.selectedIndex].id;

    const selectElement_name_type = document.getElementById("tagSelector_name_type");
    const selectedNameId = selectElement_name_type.options[selectElement_name_type.selectedIndex].value;

    // 検索結果を表示する要素を初期化
    const ul = document.getElementById("results_list");
    ul.innerHTML = "";

    let result_title = document.getElementById("result_title");
    result_title.innerHTML = "Results";

    // ページネーションのインジケータとコンテナを初期化
    const pageIndicator = document.getElementById("pagination_page");
    const pagination = document.getElementById("pagination");
    if (pageIndicator) pageIndicator.textContent = "";
    if (pagination) pagination.innerHTML = "";

    displayAllPins(null, false);

    let input_data;
    let item_data;

    // 全選択
    if (selectedMission != 'not' && selectedNameMission != "-- Select Mission Name --" && selectedId != 'not' && selectedNameId != "-- Select Feature Name --" && search_input.length > 0) {
        alert("Don't select all and enter search terms at the same time");
        addListItem(null, false);
        return;
    }
    // MissionNameとMission ID
    else if (selectedMission != 'not' && selectedNameMission != "-- Select Mission Name --" && selectedId == 'not' && selectedNameId == "-- Select Feature Name --" && search_input.length == 0) {
        input_data = selectedNameMission;
        item_data = selectedMission;
    }

    // MissionNameと検索ワード
    else if (selectedMission != 'not' && selectedNameMission == "-- Select Mission Name --" && selectedId == 'not' && selectedNameId == "-- Select Feature Name --" && search_input.length > 0) {
        if (search_input.length > 40) {
            alert("You can enter up to 40 characters.");
            return;
        }
        else {
            search_input = search_input.replace(/[\s\u3000]/g, '');
            console.log(search_input)
            input_data = search_input;
            item_data = selectedMission;
        }

    }

    // MissionName
    else if (selectedMission != 'not' && selectedNameMission == "-- Select Mission Name --" && selectedId == 'not' && selectedNameId == "-- Select Feature Name --" && search_input.length == 0) {
        input_data = '';
        item_data = selectedMission;
    }

    // FeatureTypeとFeatureName
    else if (selectedMission == 'not' && selectedNameMission == "-- Select Mission Name --" && selectedId != 'not' && selectedNameId != "-- Select Feature Name --" && search_input.length == 0) {
        input_data = selectedNameId;
        item_data = selectedId;
    }

    // FeatureTypeと検索ワード
    else if (selectedMission == 'not' && selectedNameMission == "-- Select Mission Name --" && selectedId != 'not' && selectedNameId == "-- Select Feature Name --" && search_input.length > 0) {
        if (search_input.length > 40) {
            alert("You can enter up to 40 characters.");
            return;
        }
        else {
            search_input = search_input.replace(/[\s\u3000]/g, '');
            input_data = search_input;
            item_data = selectedId;
        }

    }

    // FeatureType
    else if (selectedMission == 'not' && selectedNameMission == "-- Select Mission Name --" && selectedId != 'not' && selectedNameId == "-- Select Feature Name --" && search_input.length == 0) {
        input_data = '';
        item_data = selectedId;
    }

    // 検索ワード
    else if (selectedMission == 'not' && selectedNameMission == "-- Select Mission Name --" && selectedId == 'not' && selectedNameId == "-- Select Feature Name --" && search_input.length > 0) {
        if (search_input.length > 40) {
            alert("You can enter up to 40 characters.");
            return;
        }
        else {
            search_input = search_input.replace(/[\s\u3000]/g, '');
            input_data = search_input;
            item_data = 'not';
        }
    }
    else if (selectedMission != 'not' && selectedId != 'not') {
        if (search_input.length == 0) {
            alert("Do not set Mission Name and Feature Type at the same time.")
        }
        else {
            alert("Do not set Mission Name and Feature Type at the same time (and search terms)")
        }
        addListItem(null, false);
        return;
    }
    else if ((selectedMission != 'not' && selectedNameMission != "-- Select Mission Name --" && search_input.length > 0) || (selectedId != 'not' && selectedNameId != "-- Select Feature Name --" && search_input.length > 0)) {
        alert("When selecting Mission ID or Feature Name, do not enter a search term.");
        addListItem(null, false);
        return;
    }

    // 全未選択
    else if (selectedMission == 'not' && selectedNameMission == "-- Select Mission Name --" && selectedId == 'not' && selectedNameId == "-- Select Feature Name --" && search_input.length == 0) {
        alert("Please search to use a checklist or input search word");
        addListItem(null, false);
        return;
    }
    const loadingElement = document.getElementById("loading_results");
    loadingElement.style.display = "block";

    $.ajax({
        type: "POST",
        headers: { "X-CSRFToken": csrftoken },
        url: "search/",
        contentType: "application/json",
        data: JSON.stringify({
            search: input_data,
            check_item: item_data,
        }),

        success: function (response) {
            loadingElement.style.display = "none";
            // 検索結果を表示する処理
            if (response.data && response.data.length > 0) {
                console.log("検索結果:", response.data);
                result_title.innerHTML = `Results<br><strong>${response.data.length} Hit!</strong>`;

                let checker = false;
                if (response.data.length > page_limit) checker = true;
                addListItem(response.data, checker);
            }
            else {
                result_title.innerHTML = "Results<br><strong>0 Hit!</strong>";
            }
        },
        error: function (error) {
            console.error("転送エラー:", error);
        },
    });
}

// 検索結果のDOMを作成
function addListItem(resultText, checker) {
    const ul = document.getElementById("results_list");
    ul.innerHTML = '';

    if (checker) {
        let currentPage = 1; // 現在のページ番号
        const itemsPerPage = page_limit; // 1ページあたりのアイテム数
        const totalPages = Math.ceil(resultText.length / itemsPerPage); // 総ページ数
        const buttonsPerRow = 6; // 数字ボタンの最大数

        const pageIndicator = document.getElementById("pagination_page"); // ページ数表示用の<i>

        // ページネーションを初期化
        const pagination = document.getElementById("pagination");
        if (pagination) {
            pagination.innerHTML = ''; // ページネーションをクリア
        }

        // ページを切り替える関数
        function renderPage(page) {
            currentPage = page;
            ul.innerHTML = ''; // リストをクリア

            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, resultText.length);

            // ページに対応する結果を表示
            const resultText_30 = resultText.slice(startIndex, endIndex);
            displayAllPins(resultText_30, true);

            for (let i = 0; i < resultText_30.length; i++) {
                const li = document.createElement("li");
                const p = document.createElement("p");
                p.textContent = resultText_30[i].name;

                const button = document.createElement("button");
                const icon = document.createElement("i");
                icon.className = "fas fa-location-arrow";
                button.appendChild(icon);

                button.addEventListener("click", () => {
                    move_from_list_search(resultText_30[i]);
                });

                li.appendChild(p);
                li.appendChild(button);
                ul.appendChild(li);
            }

            // ページインジケータを更新
            updatePageIndicator();

            // ページネーションボタンの更新
            updatePaginationButtons();
        }

        // ページネーションのボタンを生成
        function updatePaginationButtons() {
            if (pagination) {
                pagination.innerHTML = '';
                const paginationRow = document.createElement("div");
                paginationRow.className = "pagination-row";

                // << ボタン
                const firstButton = document.createElement("button");
                firstButton.textContent = "<<";
                firstButton.addEventListener("click", () => renderPage(1));
                paginationRow.appendChild(firstButton);

                // < ボタン
                const prevButton = document.createElement("button");
                prevButton.textContent = "<";
                prevButton.addEventListener("click", () => {
                    if (currentPage > 1) renderPage(currentPage - 1);
                });
                paginationRow.appendChild(prevButton);

                pagination.appendChild(paginationRow);

                // 数字ボタン
                const startPage = Math.max(1, currentPage - Math.floor(buttonsPerRow / 2));
                const endPage = Math.min(totalPages, startPage + buttonsPerRow - 1);

                for (let i = startPage; i <= endPage; i++) {
                    const pageButton = document.createElement("button");
                    pageButton.textContent = i;

                    if (i === currentPage) {
                        pageButton.style.backgroundColor = "#007bff";
                        pageButton.style.color = "white";
                        pageButton.style.border = "1px solid #007bff";
                        pageButton.style.cursor = "default";
                    }
                    else {
                        pageButton.style.backgroundColor = "";
                        pageButton.style.color = "";
                        pageButton.style.border = "";
                        pageButton.style.cursor = "pointer";
                    }

                    pageButton.addEventListener("click", () => renderPage(i));
                    paginationRow.appendChild(pageButton);
                }

                // > ボタン
                const nextButton = document.createElement("button");
                nextButton.textContent = ">";
                nextButton.addEventListener("click", () => {
                    if (currentPage < totalPages) renderPage(currentPage + 1);
                });
                paginationRow.appendChild(nextButton);

                // >> ボタン
                const lastButton = document.createElement("button");
                lastButton.textContent = ">>";
                lastButton.addEventListener("click", () => renderPage(totalPages));
                paginationRow.appendChild(lastButton);

                pagination.appendChild(paginationRow);
            }
        }

        // ページインジケータを更新
        function updatePageIndicator() {
            if (pageIndicator) {
                pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
            }
        }

        // 最初のページをレンダリング
        renderPage(1);
    }
    else {
        displayAllPins(resultText, true);
        for (let i = 0; i < resultText.length; i++) {
            const li = document.createElement("li");
            const p = document.createElement("p");
            p.textContent = resultText[i].name;

            const button = document.createElement("button");
            const icon = document.createElement("i");
            icon.className = "fas fa-location-arrow";
            button.appendChild(icon);

            button.addEventListener("click", () => {
                move_from_list_search(resultText[i]);
            });

            li.appendChild(p);
            li.appendChild(button);
            ul.appendChild(li);
        }

        // ページインジケータを非表示または初期化
        if (pageIndicator) {
            pageIndicator.textContent = '';
        }
        updatePaginationButtons();
    }
}

function displayAllPins(data, check) {
    if (!check) {
        roots.map.dataSources.remove(currentGeoJson);
        currentGeoJson = null;
    }
    else {
        const geojson = {
            type: "FeatureCollection",
            features: data.map((item) => ({
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [item.lon, item.lat],
                },
                properties: {
                    name: item.name,
                    description: `<div style="height:500px;"><p>This pin may be slightly out of specification. Please consider it as a guide only.<br><br>If you want to search Obs. data(CRISM or THEMIS) in more detail, click the second button from the top left of the screen.</p><img src="/collect_static//map3d/image/sample_button.gif" width="80%"></div>`,
                },
            })),
        };

        if (currentGeoJson) {
            roots.map.dataSources.remove(currentGeoJson);
            currentGeoJson = null;
        }

        Cesium.GeoJsonDataSource.load(geojson, {
            markerColor: Cesium.Color.BLUE,
            clampToGround: true,
        }).then(function (dataSource) {
            currentGeoJson = dataSource;
            roots.map.dataSources.add(dataSource);
        });

    }

}

// クリック時にピンの色を変更する処理
function move_from_list_search(item) {
    const latitude = item.lat;
    const longitude = item.lon;

    if (currentGeoJson) {
        // すべてのピンを青色にリセット
        currentGeoJson.entities.values.forEach((entity) => {
            entity.billboard.color = Cesium.Color.BLUE;
        });

        // 対象のピンを赤色に変更
        const entity = currentGeoJson.entities.values.find(
            (e) => e.properties.name.getValue() === item.name
        );
        if (entity) {
            entity.billboard.color = Cesium.Color.RED; // ピンの色を赤に変更
            roots.map.selectedEntity = entity; // InfoBox を表示
        }
    }

    // カメラを移動
    roots.map.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 1500000),
    });
}


function reset_search() {
    document.getElementById('tagSelector_mission').value = "-- Select Mission --";
    document.getElementById('tagSelector_name_mission').innerHTML = '<option id="not">-- Select Mission Name --</option>';
    document.getElementById('tagSelector_type').value = "-- Select Feature Type --";
    document.getElementById('tagSelector_name_type').innerHTML = '<option id="not">-- Select Feature Name --</option>';

    let result_title = document.getElementById("result_title");
    result_title.innerHTML = "Results";
    const pagination = document.getElementById("pagination");
    if (pagination) {
        pagination.innerHTML = '';
    }
    const pageIndicator = document.getElementById("pagination_page");
    if (pageIndicator) {
        pageIndicator.textContent = '';
    }
    const ul = document.getElementById("results_list");
    ul.innerHTML = '';

    displayAllPins(null, false);
    
    document.getElementById("search_input").value = '';
}