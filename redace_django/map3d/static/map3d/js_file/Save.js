/**
 * セーブに関する関数群
 */

/**
 * グラフエリアのセーブボタン
 * スペクトルデータをスペクトルリストに保存する。
 * @param {*} counter 
 */
function save_spectral(counter) {
    const modalHTML = `
        <div class="modal fade" id="dynamicModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header" id="modalHeader" style="display: none;">
                <button type="button" class="btn-close" aria-label="Close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body" id="modalBody" style="text-align: center;">
                <img src="/collect_static/map3d/image/loading.gif" alt="Loading..."><br>
                <span id="loadingText">Loading...</span>
              </div>
            </div>
          </div>
        </div>
      `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modalElement = document.getElementById('dynamicModal');
    const bootstrapModal = new bootstrap.Modal(modalElement);
    bootstrapModal.show();
    modalElement.addEventListener('hidden.bs.modal', () => {
        modalElement.remove();
    });

    let graphCounter = counter + 1;
    let description = document.getElementById(`save_memo_${graphCounter}`).value;

    if (description.length <= 100) {
        $.ajax({
            type: 'POST',
            headers: { 'X-CSRFToken': csrftoken },
            url: 'spectrum/new',
            contentType: 'application/json',
            data: JSON.stringify({
                spectral_data: dataSave[counter],
                description: description,
            }),
            success: function (response) {
                if (response.status === "success") {
                    document.getElementById(`save_memo_${graphCounter}`).value = '';
                    get_record_spectra();
                    document.getElementById('modalBody').innerHTML = '<h3>Save completed!!!</h3>';
                    enableModalClose(modalElement);
                } 
                else {
                    document.getElementById('modalBody').innerHTML = `Error: ${response.message}`;
                    enableModalClose(modalElement);
                }
            },
            error: function (xhr, status, error) {
                const errorMessage = xhr.responseText || "An unknown error occurred.";
                document.getElementById('modalBody').innerHTML = `Error: ${errorMessage}`;
                enableModalClose(modalElement);
            }
        });
    } 
    else {
        document.getElementById('modalBody').innerHTML = 'Comments can be up to 100 characters long.';
        enableModalClose(modalElement);
    }

    function enableModalClose(modalElement) {
        const modalHeader = document.getElementById('modalHeader');
        if (modalHeader) {
            modalHeader.style.display = 'flex';
        }
        modalElement.setAttribute('data-bs-backdrop', 'true');
        modalElement.setAttribute('data-bs-keyboard', 'true');
    }
}



$(function () {
    let $body = $('body');

    $('#annotate_spectra').on('click', function () {
        console.log('aakdkdkdkdoaednfiaernf');
        $(body).toggleClass('annotate_open');
    });
});

/**
 * スペクトルリスト内の各データのメモ更新
 * @param {*} id 
 */
function update_description(id) {
    console.log(id);
    console.log(typeof id);

    let description_new = document.getElementById(id).value;

    console.log(description_new);
    console.log(typeof description_new);
}
