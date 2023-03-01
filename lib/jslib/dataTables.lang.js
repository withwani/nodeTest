const DT_LANG = {
    "en": {
        "sEmptyTable": "No data available in table",
        "sInfo": "Showing _START_ to _END_ of _TOTAL_ entries",
        "sInfoEmpty": "Showing 0 to 0 of 0 entries",
        "sInfoFiltered": "(filtered from _MAX_ total entries)",
        "sInfoPostFix": "",
        "sInfoThousands": ",",
        "sLengthMenu": "Show _MENU_ entries",
        "sLoadingRecords": "Loading...",
        "sProcessing": "Processing...",
        "sSearch": "Search:",
        "sZeroRecords": "No matching records found",
        "oPaginate": {
            "sFirst": "First",
            "sLast": "Last",
            "sNext": "Next",
            "sPrevious": "Previous"
        },
        "oAria": {
            "sSortAscending": ": activate to sort column ascending",
            "sSortDescending": ": activate to sort column descending"
        },
        "select": {
            "rows": {
                "_": ", <strong>%d rows selected</strong>",
                "0": "",
                "1": ", <strong>1 row selected</strong>"
            }
        }
    },
    "ko": {
        "sEmptyTable": "데이터가 없습니다",
        "sInfo": "_START_ - _END_ / _TOTAL_",
        "sInfoEmpty": "0 - 0 / 0",
        "sInfoFiltered": "(총 _MAX_ 개)",
        "sInfoPostFix": "",
        "sInfoThousands": ",",
        "sLengthMenu": "페이지당 줄수 _MENU_",
        "sLoadingRecords": "읽는중...",
        "sProcessing": "처리중...",
        "sSearch": "검색:",
        "sZeroRecords": "검색 결과가 없습니다",
        "oPaginate": {
            "sFirst": "처음",
            "sLast": "마지막",
            "sNext": "다음",
            "sPrevious": "이전"
        },
        "oAria": {
            "sSortAscending": ": 오름차순 정렬",
            "sSortDescending": ": 내림차순 정렬"
        },
        "select": {
            "rows": {
                "_": ", <strong>%d 개 선택됨</strong>",
                "0": "",
                "1": ", <strong>1 개 선택됨</strong>"
            }
        }
    },
    "jp": {
        "sEmptyTable": "テーブルにデータがありません",
        "sInfo": " _TOTAL_ 件中 _START_ から _END_ まで表示",
        "sInfoEmpty": " 0 件中 0 から 0 まで表示",
        "sInfoFiltered": "（全 _MAX_ 件より抽出）",
        "sInfoPostFix": "",
        "sInfoThousands": ",",
        "sLengthMenu": "_MENU_ 件表示",
        "sLoadingRecords": "読み込み中...",
        "sProcessing": "処理中...",
        "sSearch": "検索:",
        "sZeroRecords": "一致するレコードがありません",
        "oPaginate": {
            "sFirst": "先頭",
            "sLast": "最終",
            "sNext": "次",
            "sPrevious": "前"
        },
        "oAria": {
            "sSortAscending": ": 列を昇順に並べ替えるにはアクティブにする",
            "sSortDescending": ": 列を降順に並べ替えるにはアクティブにする"
        },
        "select": {
            "rows": {
                "_": ", <strong>%d 行を選択しました。</strong>",
                "0": "",
                "1": ", <strong>1 行を選択しました。</strong>"
            }
        }
    }
};

function getDtLang() {
    console.debug(`IN> getDtLang(${userLang})`);
    return DT_LANG[userLang || "ko"];
}