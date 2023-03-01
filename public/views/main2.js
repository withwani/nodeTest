// document =======================================
$(document).ready(function () {
    console.log(`Stat.ejs ready`);
    // console.log(`Stat.ejs ready, userLevel(${userLevel}), userLang(${userLang})`);

    // getFieldData(null, createUiForm);
    // runStatFormApi();
    initTableChart();

    // $("#henb_id").attr("placeholder", i18n("eNB ID"));
    // $("#start_date").attr("placeholder", i18n("Date/Time"));
    // $("#end_date").attr("placeholder", i18n("Date/Time"));
});

// Define and init variable, and common variables is defined in the file import_common.js (userId, userLevel, userLang, socket, sessionId, clientIp)
// const WIDTH_COL_NO = "50px";
// const WIDTH_COL_ID = "50px";
// const WIDTH_COL_TIME = "150px";

/* const categories = [
    "CPU Usage",
    "CQI Distribution", // deprecated
    "HARQ", // deprecated
    "Handover",
    "Inter&Intra handover",
    "Line Statistics",
    "Paging",
    "PDCP",
    "Random Access",
    "RRC Connection",
    "Attempted Redirection Info",
    "RF Statistics",
    "Random Access Procedure", // deprecated
    "Radio resource",
    "User Info"
]; */

const periodics = [
    "5 minutes",
    "Hourly",
    "Daily",
    "Weekly",
    "Monthly"
];

/** b.Sample Data for initializing chart */
const sampleData = [{
    text: "value1",
    values: [17, 27, 47, 7, 7, 28, 57, 9, 20, 10, 8, 17, 29, 10, 14]
}, {
    text: "value2",
    values: [17, 1, 5, 17, 7, 8, 7, 9, 20, 10, 8, 7, 9, 20, 10]
}, {
    text: "value3",
    values: [3, 90, 6, 17, 7, 8, 7, 9, 20, 10, 8, 7, 9, 20, 10]
}, {
    text: "value4",
    values: [4, 1, 17, 7, 7, 8, 7, 9, 20, 10, 8, 7, 9, 20, 10]
}, {
    text: "value5",
    values: [8, 9, 17, 13, 7, 8, 7, 9, 20, 10, 8, 7, 9, 20, 10]
}, {
    text: "value6",
    values: [18, 8, 17, 34, 66, 8, 7, 9, 20, 10, 8, 7, 9, 20, 10]
}, {
    text: "value7",
    values: [48, 7, 17, 17, 7, 8, 7, 9, 42, 10, 8, 7, 9, 20, 10]
}, {
    text: "value8",
    values: [22, 4, 17, 17, 1, 33, 7, 9, 20, 10, 8, 7, 9, 20, 10]
}, {
    text: "value9",
    values: [13, 3, 17, 17, 67, 55, 7, 9, 20, 10, 8, 7, 9, 20, 10]
}, {
    text: "value10",
    values: [89, 1, 17, 17, 23, 8, 7, 9, 43, 10, 8, 7, 9, 20, 10]
}];

const sampleScaleXData = (function () {
    let startDate = moment("2023-02-01 12:00:00").format("YYYY-MM-DD HH:mm:ss");
    let sampleDates = [startDate];
    for (let offset = 1; offset < sampleData[0].values.length; offset++) {
        sampleDates.push(
            moment(startDate)
                .add(offset, "h")
                .format("YYYY-MM-DD HH:mm:ss")
        ); //.toDate());
    }
    return sampleDates;
})();
/** e.Sample Data for initializing chart */

// const btnSaveToCSV = {
//     extend: "csv",
//     text: "Save to CSV",
//     title: `eNB_#`,
// };

// const DEFAULT_TITLE = "Statistics Chart";
let defaultTitle = "Tagless Chart";
let defaultType = "line";
let table;
let tableData;
let mTimer;
let stat_title = categories;
// let dtButtons = [];

// setting =======================================
$.fn.api.settings.api = {
    stat_form_action: "stat_get_column"
};

// event =======================================
/* $("#start_calendar").calendar({
    type: "datetime",
    disableMinute: "true",
    initialDate: null,
    formatter: {
        datetime: function(date, settings) {
            return (date) ? moment(date).format("YYYY-MM-DD HH:mm:ss") : "";
        }
    }
});

$("#end_calendar").calendar({
    type: "datetime",
    disableMinute: "true",
    initialDate: null,
    formatter: {
        datetime: function(date, settings) {
            return (date) ? moment(date).format("YYYY-MM-DD HH:mm:ss") : "";
        }
    }
}); */

// $(".ui.dropdown").dropdown();

// API =======================================
function setLoader(isActive) {
    if (isActive) {
        $("#div-stat-dimmer").addClass("active");
        $("#div-stat-loader").addClass("active");

        // $("#execute").addClass("disabled");
        $("#execute").addClass("loading");
    } else {
        $("#div-stat-dimmer").removeClass("active");
        $("#div-stat-loader").removeClass("active");

        // $("#execute").removeClass("disabled");
        $("#execute").removeClass("loading");
    }
}

function setAutoEnableNode() {
    mTimer = setTimeout(function () {
        setLoader(false);
    }, 60000); // 60 sec
}

function clearAutoEnableNode() {
    clearTimeout(mTimer);
}

function initTableChartDiv() {
    console.log(`IN> initTableChartDiv()`);

    $("#stat_table").remove();
    $("#stat_table_wrapper").remove();
    $("#stat_chart").remove();

    let addText = '<div id="stat_chart" style="margin:5px"></div>';
    let addTag = $(addText);
    addTag.appendTo("#div-stat-chart");

    addText = '<table name="stat_table" id="stat_table" class="ui small celled red nowrap table" style="margin-top:0px; width:100%;"></table>';
    addTag = $(addText);
    addTag.appendTo("#div-stat-table");
}

function initTableChart() {
    console.log(`IN> initTableChart()`);

    function dtInit() {
        console.log(`IN> dtInit()`);

        return table = $("#stat_table").DataTable({
            destroy: true,
            dom: "t",
            language: getDtLang()
        });

        // $("#stat_table_wrapper").attr("style", "margin:auto");
    }

    // init Chart
    createStatChart(defaultTitle, defaultType, sampleScaleXData, sampleData, null);

    // init Table
    if (table && table.data().any()) { // if the data of table exists...
        dtInit().clear().draw();
    } else {
        dtInit();
    }
}

// function createUiForm(fieldsData) {
//     $(".ui.form").form({
//         fields: fieldsData
//     });
// }

// function runStatFormApi() {
//     $("#stat_form").api({
//         action: "stat_form_action",
//         method: "POST",
//         serializeForm: true,
//         beforeSend: function(settings) { // check
//             let isValid = $("#stat_form").form("is valid");
//             console.debug(`Stat form, isValid =`, isValid);
//             if (!isValid) return false;

//             $(".ui.error.message > ul").remove(); // removes the error message when the form ran.
//             return settings;
//         },
//         /* onResponse: function(response) {
//             // console.log(`onResponse, response =`, response);
//             return response;
//         },
//         successTest: function(response) {
//             // console.log(`successTest, response =`, response);
//             return response.success || false;
//         }, */
//         onComplete: function(response) {
//             console.log(`onComplete, response =`, response);
//         },
//         onSuccess: function(response) {
//             console.log(`onSuccess, response =`, response);

//             initTableChartDiv();
//             createStatTableChart(response);
//         },
//         onFailure: function(response) {
//             console.log(`onFailure, response =`, response);

//             initTableChartDiv();
//             initTableChart();
//         }
//         /* onError: function(errorMessage) {
//             // console.log(`onError, errorMessage =`, errorMessage);
//         },
//         onAbort: function(errorMessage) {
//             // console.log(`onAbort, errorMessage =`, errorMessage);
//         } */
//     });
// }

function createStatChart(chartTitle, chartType, scaleXData, data, callback) {
    console.log(`IN> createStatChart(title:${title}, type:${chartType})`);

    if (!callback) console.log(`This chart is creating using sample data.`);

    let timerStart = Date.now();
    let chartData = {
        type: chartType, // Specify your chart type here.
        gui: {
            behaviors: [{
                id: 'DownloadPDF',
                enabled: 'none'
            }, {
                id: 'DownloadSVG',
                enabled: 'none'
            }, {
                id: 'DownloadCSV',
                enabled: 'none'
            }, {
                id: 'DownloadXLS',
                enabled: 'none'
            }, {
                id: 'ViewDataTable',
                enabled: 'none'
            }, {
                id: 'ViewSource',
                enabled: 'none'
            }, {
                id: 'CrosshairHide',
                enabled: 'all'
            }]
        },
        title: {
            "fontWeight": "normal",
            "fontStyle": "italic",
            textAlign: "left",
            text: chartTitle // Adds a title to your chart
        },
        legend: {
            layout: "x4",
            backgroundColor: "transparent",
            borderColor: "transparent",
            marker: {
                borderRadius: "50px",
                borderColor: "transparent"
            }
        },
        scaleX: {
            zooming: true,
            values: scaleXData
        },
        tooltip: {
            visible: false
        },
        crosshairX: {
            scaleLabel: {
                backgroundColor: "#fff",
                fontColor: "transparent"
            },
            plotLabel: {
                backgroundColor: "#fff",
                fontColor: "transparent",
                _text: "Number of hits : %v"
            }
        },
        series: data
    };

    zingchart.render({
        id: "stat_chart",
        output: "auto", // "canvas" | "svg" | "vml" | "auto"
        data: chartData,
        cache: {
            data: true
        },
        height: 550,
        events: {
            load: function (p) {
                console.log(`Chart loaded, p =`, p);
                console.debug("Time after creating chart: ", Date.now() - timerStart);
                if (callback) callback(null, "Done");
            },
            complete: function (p) {
                console.log(`Chart completed, p =`, p);
            }
        }
    });
}

function dtStatTable(res, callback) {
    console.log(`IN> dtStatTable(), res =`, res);
    let timerStart = Date.now();

    let thead = res.thead;
    let reqInfo = res.info;
    let column = reqInfo["columns"] = res.column;
    reqInfo["conditions"] = res.condition;
    console.debug(`Req Info =`, reqInfo);
    // console.debug(`$("#category").val(${$("#category").val()}) =`, categories[$("#category").val()]);
    // console.debug(`$("#periodic").val(${$("#periodic").val()}) =`, periodics[$("#periodic").val()]);

    let dtButtons = [{
        extend: "csv",
        text: "Save to CSV",
        title: `dtButtons title`,
        // title: `eNB_${reqInfo["henb_id"]}_${categories[$("#category").val()]}_${periodics[$("#periodic").val()]}`,
        bom: true
    }];

    let columnSet = [{
        title: "NO",
        data: "stat_no"
    }, {
        title: "Start Time",
        data: "start",
        render: renderingDateFormat
    }, {
        title: "End Time",
        data: "end",
        render: renderingDateFormat
    }, {
        title: "eNB ID",
        data: "henb_id"
    }];

    for (let i = 0; i < column.length; i++) {
        columnSet.push({
            title: thead[i + 3],
            data: column[i]
        });
    }
    console.debug(`columnSet =`, columnSet);

    let dtStatViewOption = common_var.getInstance().getDtOpts({
        serverSide: false,
        deferRender: false,
        ajax: {
            url: "/stat_get_data",
            type: "post",
            dataType: "json",
            data: reqInfo,
            dataSrc: function (json) {
                console.log(`Ajax response json =`, json);
                tableData = json.data;
                console.debug("Time after creating table: ", Date.now() - timerStart);
                callback(null, json.data);
                return json.data;
            }
        },
        columns: columnSet,
        buttons: dtButtons,
        scrollX: true,
        scrollY: common_var.getInstance().getConst("TABLE_SCROLLY_STAT_DATA"),
        scrollCollapse: true,
        ordering: false,
        searching: false,
        paging: false
    });

    changeDtColBtn(columnSet, dtButtons);
    table = $("#stat_table").DataTable(dtStatViewOption);
    // $("#stat_table").wrap('<div class="dataTables_scroll" />');
}

function createStatTableChart(res) {
    console.log(`IN> createStatTableChart(), res =`, res);

    if (!res || res instanceof Error) { // Handling Exception
        alert(res.message || i18n("Response has some error!, return back."));
        return;
    }

    let category = res.info.category;
    let type = (res.info.type == 1) ? "bar" : "line";
    console.debug(`category(${category}), type(${type})`);

    async.waterfall([
        function (callback) {
            console.log(`[ASYNC, T0] set loader and start creating the table and set the timer.`);
            setLoader(true);
            setAutoEnableNode();
            dtStatTable(res, callback); // redraw Stat table
        },
        function (rows, callback) {
            console.log(`[ASYNC, T1] completed to creating the table and calculate the data for creating the chart.`);
            let datas = [];
            let scaleXData = [];
            let column = "";
            console.debug(`res.column =`, res.column);

            for (let i = 0; i < res.column.length; i++) {
                let data = [];
                let value = [];
                column = res.column[i];

                for (let j = 0; j < rows.length; j++) {
                    for (let x in rows[j]) {
                        if (column == x) value.push(rows[j][x]);
                        if (i == 0 && x == "start") {
                            let xAxisTime = renderingDateFormat(rows[j][x]);
                            scaleXData.push(xAxisTime);
                        }
                    }
                }
                data = {
                    text: column,
                    values: value
                };
                datas.push(data);
            }

            // supported multi-language for column title
            for (let i = 0; i < stat_title.length; i++) {
                if (langPack) {
                    stat_title[i] = langPack[stat_title[i]];
                }
            }

            callback(null, scaleXData, datas);
        },
        function (scale, data, callback) {
            console.log(`[ASYNC, T2] creating the chart.`);
            createStatChart(stat_title[category], type, scale, data, callback); // redraw Stat chart
        }
    ], function (err, result) {
        if (err) {
            alert(res.message || i18n("Response has some error!, return back."));
        }
        console.log(`[ASYNC, DONE] completed to creating the chart and dismiss the loader and clear timer.`);
        setLoader(false);
        clearAutoEnableNode();
    });
}