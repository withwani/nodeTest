/* Below is General Definition ================================================================= */
const moment = require("moment");
// const async = require("async");

const commUtil = require("./common_util");
const commVar = require("./common_var");
const eudbEx = require("./eu_mysqlEx")();
const csUtil = require("./common_server_util");

// const langPack = commVar.getInstance().get("langPack"); // 서버 시작할 때 설정된 언어코드를 사용할 때

/* for the fault db function */

/**
 * changed Date format to UTC offset 0
 */
function renderingDateFormatOnFault(data) {
    return (!data || data == "") ? "" : moment(data).format("YYYY-MM-DD HH:mm:ss");
    // return (!data || data == "") ? "" : moment(data).utcOffset(0).format("YYYY-MM-DD HH:mm:ss"); // UTC -> Default(KST) 로 변경 후 utcOffset(0) 옵션 삭제
}

/**
 * get the item List of limited item count per a page of Current Alarm.
 */
exports.getCurrentAlarmList = function(req, res, serverType) {
    console.log(`IN> getCurrentAlarmList(serverType: ${serverType})`);

    let columns = req.body.columns;
    let order = req.body.order;
    let start = parseInt(req.body.start);
    let length = parseInt(req.body.length);
    let search = req.body.search;
    let enbId = (serverType == 1) ? 1 : req.query.enbId;
    console.debug(`serverType: ${serverType}, enbId: ${enbId}`);

    const paramSelect = `ifnull(a.henb_id, 0) as henb_id, ifnull(a.henb_name, "EMS") as henb_name, b.alarm_code, b.alarm_raised_time, b.event_time, b.alarm_type, b.isACK, b.alarm_loc, b.severity, b.report_mechanism, b.probable_cause, b.specific_problem, b.additional_text`;
    // const enbWhere = (enbId) ? `a.henb_id=${enbId}) AND (` : `a.henb_id like '%${search.value}%' OR `;
    // const searchWhere = `(b.alarm_type=1 OR b.alarm_type=2) AND (${enbWhere}a.henb_name like '%${search.value}%' OR b.alarm_code like '%${search.value}%' OR b.alarm_type like '%${search.value}%' OR b.isACK like '%${search.value}%' OR b.severity like '%${search.value}%' OR b.report_mechanism like '%${search.value}%' OR b.probable_cause like '%${search.value}%' OR b.specific_problem like '%${search.value}%' OR b.additional_text like '%${search.value}%')`;
    const enbWhere = (enbId) ? `a.henb_id=${enbId}) AND b.isACK='0' AND (` : `a.henb_id like '%${search.value}%' OR `;
    const searchWhere = `(b.alarm_type=1 OR b.alarm_type=2) AND (${enbWhere}a.henb_name like '%${search.value}%' OR b.alarm_code like '%${search.value}%' OR b.alarm_type like '%${search.value}%' OR b.severity like '%${search.value}%' OR b.report_mechanism like '%${search.value}%' OR b.probable_cause like '%${search.value}%' OR b.specific_problem like '%${search.value}%' OR b.additional_text like '%${search.value}%')`;

    const ORDER_BY_PHRASE = commUtil.makeOrderPhrase(order, columns, true);
    const queryStr = `SELECT ${paramSelect} FROM HeMS_Device a
        RIGHT OUTER JOIN HeMS_Current_Alarm b ON a.henb_id = b.henb_id
        WHERE ${searchWhere}
        AND (b.henb_id IN (SELECT henb_id FROM HeMS_Device))
        ORDER BY ${ORDER_BY_PHRASE} LIMIT ${start},${length};

        SELECT count(*) as count FROM HeMS_Device a
        RIGHT OUTER JOIN HeMS_Current_Alarm b ON a.henb_id = b.henb_id
        WHERE ${searchWhere}
        AND (b.henb_id IN (SELECT henb_id FROM HeMS_Device));`;


    let retVal = {
        draw: 0,
        recordsTotal: 0,
        recordsFiltered: 0,
        data: []
    };

    eudbEx.runQuery(queryStr,
        () => { // finally
            res.json(retVal);
        },
        (rows) => { // success
            if (rows.length > 0) {
                // console.log(`>>[SQL RESULT] success query, rows.length =`, rows.length);
                retVal.type = true;
                retVal.draw = req.body.draw;
                retVal.recordsTotal = rows[1][0].count;
                retVal.recordsFiltered = rows[1][0].count;
                retVal.data = rows[0];
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
                // throw new Error(`Not Found!!!`);
            }
        });
};

exports.getCurrentAlarmListForEMS = function(req, res) {
    console.log(`IN> getCurrentAlarmListForEMS()`);

    let columns = req.body.columns;
    let order = req.body.order;
    let start = parseInt(req.body.start);
    let length = parseInt(req.body.length);
    let search = req.body.search;

    const paramSelect = `henb_id, alarm_code, alarm_raised_time, event_time, alarm_type, isACK, alarm_loc, severity, report_mechanism, probable_cause, specific_problem, additional_text`;
    const searchWhere = `(alarm_type=3 OR alarm_type=4) AND (alarm_code like '%${search.value}%' OR alarm_type like '%${search.value}%' OR isACK like '%${search.value}%' OR severity like '%${search.value}%' OR report_mechanism like '%${search.value}%' OR probable_cause like '%${search.value}%' OR specific_problem like '%${search.value}%' OR additional_text like '%${search.value}%')`;

    const ORDER_BY_PHRASE = commUtil.makeOrderPhrase(order, columns, true);
    const queryStr = `SELECT ${paramSelect} FROM HeMS_Current_Alarm
        WHERE ${searchWhere}
        ORDER BY ${ORDER_BY_PHRASE} LIMIT ${start},${length};

        SELECT count(*) as count FROM HeMS_Current_Alarm
        WHERE ${searchWhere};`;

    let retVal = {
        draw: 0,
        recordsTotal: 0,
        recordsFiltered: 0,
        data: []
    };

    eudbEx.runQuery(queryStr,
        () => { // finally
            res.json(retVal);
        },
        (rows) => { // success
            if (rows.length > 0) {
                // console.log(`>>[SQL RESULT] success query, rows.length =`, rows.length);
                retVal.type = true;
                retVal.draw = req.body.draw;
                retVal.recordsTotal = rows[1][0].count;
                retVal.recordsFiltered = rows[1][0].count;
                retVal.data = rows[0];
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
                // throw new Error(`Not Found!!!`);
            }
        });
};

/**
 * get the item List of whole item of Current Alarm.
 */
exports.getCurrentAlarmWholeData = function(req, res) {
    console.log(`IN> getCurrentAlarmWholeData(), url:` + req.originalUrl);

    let search = req.query.search || "";
    const paramSelect = `ifnull(a.henb_id, 0) as henb_id, ifnull(a.henb_name, "EMS") as henb_name, b.alarm_code, b.alarm_raised_time, b.event_time, b.alarm_type, b.isACK, b.alarm_loc, b.severity, b.report_mechanism, b.probable_cause, b.specific_problem, b.additional_text`;
    const searchWhere = `(a.henb_id like '%${search}%' OR a.henb_name like '%${search}%' OR b.alarm_code like '%${search}%' OR b.alarm_type like '%${search}%' OR b.isACK like '%${search}%' OR b.severity like '%${search}%' OR b.report_mechanism like '%${search}%' OR b.probable_cause like '%${search}%' OR b.specific_problem like '%${search}%' OR b.additional_text like '%${search}%')`;
    const queryStr = `SELECT ${paramSelect} FROM HeMS_Device a
        RIGHT OUTER JOIN HeMS_Current_Alarm b ON a.henb_id = b.henb_id
        WHERE ${searchWhere}
        AND (b.henb_id = 0 OR b.henb_id IN (SELECT henb_id FROM HeMS_Device))
        ORDER BY 4 desc`; // ORDER BY event_time desc;

    /* REVIEW: always get the whole data
    const queryStr = `SELECT * FROM HeMS_Current_Alarm
        ORDER BY event_time desc`; */

    // fixed TTA #11 #12
    // const langPack = commVar.getInstance().get("fullLangPack")[req.session.lang]; // 유저별로 다르게 설정할 때
    // const colNames = ["eNB", "Code", "Raised Time", "Event Time", "Type", "ACK", "Alarm Loc", "Severity", "Report Mechanism", "Probable Cause", "Specific Problem", "Additional Text", "Additional Information"];
    // let data = csUtil.translateNames(langPack, colNames);
    const colNames = ["eNB", "eNB Name", "Code", "Raised Time", "Event Time", "Type", "ACK", "Alarm Loc", "Severity", "Report Mechanism", "Probable Cause", "Specific Problem", "Additional Text"];
    let data = csUtil.translateNames(colNames);
    // console.debug(`data =`, data);

    /* REVIEW: write head of the response
    res.writeHead(200, {
        "Content-Type": "application/csv"
    }); */
    res.write(data);

    eudbEx.runQuery(queryStr,
        () => { // finally
            res.end();
        },
        (rows) => { // success
            if (rows.length > 0) {
                // console.log(`>>[SQL RESULT] success query, rows.length =`, rows.length);
                rows.forEach(row => {
                    data = `"${row.henb_id}","${row.henb_name}","${row.alarm_code}","${renderingDateFormatOnFault(row.alarm_raised_time)}","${renderingDateFormatOnFault(row.event_time)}","${row.alarm_type}","${row.isACK}","${row.alarm_loc}","${row.severity}","${row.report_mechanism}","${row.probable_cause}","${row.specific_problem}","${row.additional_text}"\n`;
                    res.write(data);
                });
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
                // throw new Error(`Not Found!!!`);
            }
        });
};

/**
 * get the item List of whole item of Current Alarm.
 */
exports.getCurrentAlarmWithArea = function(req, res) {
    console.log(`IN> getCurrentAlarmWithArea(), url:` + req.originalUrl);

    let columns = req.body.columns;
    let order = req.body.order;
    let start = parseInt(req.body.start);
    let length = parseInt(req.body.length);
    let search = req.body.search;
    let area = req.body.area;
    // console.debug(`area: ${area}`);

    const paramSelect = `a.henb_id, a.henb_name, b.alarm_code, b.alarm_raised_time, b.event_time, b.alarm_type, b.isACK, b.alarm_loc, b.severity, b.report_mechanism, b.probable_cause, b.specific_problem, b.additional_text`;
    // const extraPhrase = `(b.alarm_type=3 OR b.alarm_type=4)`; // for EMS alarm
    const extraPhrase = `(b.alarm_type=1 OR b.alarm_type=2)`; // for eNodeB alarm
    // const wherePhrase = `(a.henb_id like '%${search.value}%' OR a.henb_name like '%${search.value}%' OR b.alarm_code like '%${search.value}%' OR b.alarm_type like '%${search.value}%' OR b.isACK like '%${search.value}%' OR b.severity like '%${search.value}%' OR b.report_mechanism like '%${search.value}%' OR b.probable_cause like '%${search.value}%' OR b.specific_problem like '%${search.value}%' OR b.additional_text like '%${search.value}%')`;
    const wherePhrase = `(a.henb_id like '%${search.value}%' OR a.henb_name like '%${search.value}%' OR b.alarm_code like '%${search.value}%' OR b.alarm_type like '%${search.value}%' OR b.severity like '%${search.value}%' OR b.report_mechanism like '%${search.value}%' OR b.probable_cause like '%${search.value}%' OR b.specific_problem like '%${search.value}%' OR b.additional_text like '%${search.value}%') AND b.isACK='0'`;

    const areaPhrase = (area == commVar.getInstance().get("area_supervisor")) ? ` AND (${extraPhrase})` : ` AND (${extraPhrase} AND a.henb_id IN (
        SELECT henb_id FROM HeMS_Device
        WHERE main_area like '%${area}%'
    ))`;

    const ORDER_BY_PHRASE = commUtil.makeOrderPhrase(order, columns, true);
    let queryStr = `SELECT ${paramSelect} FROM HeMS_Device a
        RIGHT OUTER JOIN HeMS_Current_Alarm b ON a.henb_id = b.henb_id
        WHERE ${wherePhrase}${areaPhrase}
        ORDER BY ${ORDER_BY_PHRASE} LIMIT ${start},${length};

        SELECT count(*) as count FROM HeMS_Device a
        RIGHT OUTER JOIN HeMS_Current_Alarm b ON a.henb_id = b.henb_id
        WHERE ${wherePhrase}${areaPhrase}`;

    let retVal = {
        draw: 0,
        recordsTotal: 0,
        recordsFiltered: 0,
        data: []
    };

    eudbEx.runQuery(queryStr,
        () => { // finally
            res.json(retVal);
        },
        (rows) => { // success
            if (rows.length > 0) {
                // console.log(`>>[SQL RESULT] success query, rows.length =`, rows.length);
                retVal.type = true;
                retVal.draw = req.body.draw;
                retVal.recordsTotal = rows[1][0].count;
                retVal.recordsFiltered = rows[1][0].count;
                retVal.data = rows[0];
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
                // throw new Error(`Not Found!!!`);
            }
        });
};

/**
 * get the item List of limited item count per a page of History Alarm.
 */
exports.getHistoryAlarmList = function(req, res, serverType) {
    console.log(`IN> getHistoryAlarmList(serverType: ${serverType})`);

    // let draw = req.body.draw;
    let columns = req.body.columns;
    let order = req.body.order;
    let start = parseInt(req.body.start);
    let length = parseInt(req.body.length);
    let search = req.body.search;

    const paramSelect = `ifnull(a.henb_id, 0) as henb_id, ifnull(a.henb_name, "EMS") as henb_name, b.alarm_code, b.alarm_raised_time, b.alarm_changed_time, b.alarm_cleared_time, b.event_time, b.alarm_type, b.alarm_state, b.alarm_loc, b.severity, b.report_mechanism, b.probable_cause, b.specific_problem, b.additional_text`;
    const searchWhere = `(a.henb_id like '%${search.value}%' OR a.henb_name like '%${search.value}%' OR b.alarm_code like '%${search.value}%' OR b.alarm_type like '%${search.value}%' OR b.alarm_state like '%${search.value}%' OR b.severity like '%${search.value}%' OR b.report_mechanism like '%${search.value}%' OR b.probable_cause like '%${search.value}%' OR b.specific_problem like '%${search.value}%' OR b.additional_text like '%${search.value}%')`;
    const whereClause = (serverType == 1) ? `(a.henb_id=1) AND ${searchWhere}` : searchWhere;

    const ORDER_BY_PHRASE = commUtil.makeOrderPhrase(order, columns, true);
    const queryStr = `SELECT ${paramSelect} FROM HeMS_Device a
        RIGHT OUTER JOIN HeMS_Alarm_History b ON a.henb_id = b.henb_id
        WHERE ${whereClause}
        AND (b.henb_id = 0 OR b.henb_id IN (SELECT henb_id FROM HeMS_Device))
        ORDER BY ${ORDER_BY_PHRASE} LIMIT ${start}, ${length};

        SELECT count(*) as count FROM HeMS_Device a
        RIGHT OUTER JOIN HeMS_Alarm_History b ON a.henb_id = b.henb_id
        WHERE ${whereClause}
        AND (b.henb_id = 0 OR b.henb_id IN (SELECT henb_id FROM HeMS_Device));`;

    let retVal = {
        draw: 0,
        recordsTotal: 0,
        recordsFiltered: 0,
        data: []
    };

    eudbEx.runQuery(queryStr,
        () => { // finally
            res.json(retVal);
        },
        (rows) => { // success
            if (rows.length > 0) {
                // console.log(`>>[SQL RESULT] success query, rows.length =`, rows.length);
                retVal.type = true;
                retVal.draw = req.body.draw;
                retVal.recordsTotal = rows[1][0].count;
                retVal.recordsFiltered = rows[1][0].count;
                retVal.data = rows[0];
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
                // throw new Error(`Not Found!!!`);
            }
        });
};

/**
 * get the item List of whole item of History Alarm.
 */
exports.getHistoryAlarmWholeData = function(req, res) {
    console.log(`IN> getHistoryAlarmWholeData(), url:` + req.originalUrl);

    let search = req.query.search || "";
    const paramSelect = `ifnull(a.henb_id, 0) as henb_id, ifnull(a.henb_name, "EMS") as henb_name, b.alarm_code, b.alarm_raised_time, b.alarm_changed_time, b.alarm_cleared_time, b.event_time, b.alarm_type, b.alarm_state, b.alarm_loc, b.severity, b.report_mechanism, b.probable_cause, b.specific_problem, b.additional_text`;
    const searchWhere = `(a.henb_id like '%${search}%' OR a.henb_name like '%${search}%' OR b.alarm_code like '%${search}%' OR b.alarm_type like '%${search}%' OR b.alarm_state like '%${search}%' OR b.severity like '%${search}%' OR b.report_mechanism like '%${search}%' OR b.probable_cause like '%${search}%' OR b.specific_problem like '%${search}%' OR b.additional_text like '%${search}%')`;
    const queryStr = `SELECT ${paramSelect} FROM HeMS_Device a
        RIGHT OUTER JOIN HeMS_Alarm_History b ON a.henb_id = b.henb_id
        WHERE ${searchWhere}
        AND (b.henb_id = 0 OR b.henb_id IN (SELECT henb_id FROM HeMS_Device))
        ORDER BY 7 desc`; // event_time desc

    /* REVIEW: always get the whole data
    const queryStr = `SELECT * FROM HeMS_Alarm_History
        ORDER BY event_time desc`; */

    // fixed TTA #11 #12
    // const langPack = commVar.getInstance().get("fullLangPack")[req.session.lang]; // 유저별로 다르게 설정할 때
    // const colNames = ["NO","eNB","Code","Raised Time","Changed Time","Cleared Time","Event Time","Type","State","Alarm Loc","Severity","Report Mechanism","Probable Cause","Specific Problem","Additional Text","Additional Information"];
    // let data = csUtil.translateNames(langPack, colNames);
    const colNames = ["eNB","eNB Name","Code","Raised Time","Changed Time","Cleared Time","Event Time","Type","State","Alarm Loc","Severity","Report Mechanism","Probable Cause","Specific Problem","Additional Text"];
    let data = csUtil.translateNames(colNames);
    // console.debug(`data =`, data);

    /* REVIEW: write head of the response. if not set, it will be set to default header option
    res.writeHead(200, {
        "Content-Type": "application/csv"
    }); */
    res.write(data);

    eudbEx.runQuery(queryStr,
        () => { // finally
            res.end();
        },
        (rows) => { // success
            if (rows.length > 0) {
                // console.log(`>>[SQL RESULT] success query, rows.length =`, rows.length);
                rows.forEach(row => {
                    data = `"${row.henb_id}","${row.henb_name}","${row.alarm_code}","${renderingDateFormatOnFault(row.alarm_raised_time)}","${renderingDateFormatOnFault(row.alarm_changed_time)}","${renderingDateFormatOnFault(row.alarm_cleared_time)}","${renderingDateFormatOnFault(row.event_time)}","${row.alarm_type}","${row.alarm_state}","${row.alarm_loc}","${row.severity}","${row.report_mechanism}","${row.probable_cause}","${row.specific_problem}","${row.additional_text}"\n`;
                    res.write(data);
                });
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
                // throw new Error(`Not Found!!!`);
            }
        });
};

/**
 * get the item List of limited item count per a page of Alarm Code.
 */
exports.getAlarmCodeList = function(req, res, pool, isShowDeletedAlarm) {
    console.log(`IN> getAlarmCodeList(req, res, pool, ${isShowDeletedAlarm})`);

    var columns = req.body.columns;
    var order = req.body.order;
    var start = parseInt(req.body.start);
    var length = parseInt(req.body.length);
    var search = req.body.search;

    let extraOption = "";

    if (isShowDeletedAlarm) {
        // [TODO] get alarm list with deleted alarms, in other words, show all alarm.
    } else {
        // get alarm list without deleted alarms, show alarms of the condition "is_used=1"
        extraOption = " AND is_used=1";
    }

    const searchWhere = `(alarm_code like '%${search.value}%' OR probable_cause like '%${search.value}%' OR managed_object_instance like '%${search.value}%' OR specific_problem like '%${search.value}%')`;

    const ORDER_BY_PHRASE = commUtil.makeOrderPhrase(order, columns);
    const queryStr = `SELECT * FROM HeMS_Alarm_Code
        WHERE ${searchWhere}${extraOption}
        ORDER BY ${ORDER_BY_PHRASE} limit ${start}, ${length};

        SELECT count(*) as count FROM HeMS_Alarm_Code
        WHERE ${searchWhere}${extraOption};`;

    var retVal = {
        draw: 0,
        recordsTotal: 0,
        recordsFiltered: 0,
        data: []
    };

    eudbEx.runQuery(queryStr,
        () => { // finally
            res.json(retVal);
        },
        (rows) => { // success
            if (rows.length > 0) {
                // console.log(`>>[SQL RESULT] success query, rows.length =`, rows.length);
                retVal.type = true;
                retVal.draw = req.body.draw;
                retVal.recordsTotal = rows[1][0].count;
                retVal.recordsFiltered = rows[1][0].count;
                retVal.data = rows[0];
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
                // throw new Error(`Not Found!!!`);
            }
        });
};

/**
 * get the item List of whole item of Alarm Code.
 */
exports.getAlarmCodeWholeData = function(req, res, pool) {
    console.log(`IN> getAlarmCodeWholeData(), url:` + req.originalUrl);

    let search = (req.query.search) ? req.query.search : "";
    // let search = req.query.search;
    console.log(`searchText =`, search);

    const searchWhere = `(alarm_code like '%${search}%' OR probable_cause like '%${search}%' OR managed_object_instance like '%${search}%' OR specific_problem like '%${search}%')`;

    const queryStr = `SELECT alarm_code, alarm_type, event_type, severity, report_mechanism, probable_cause, managed_object_instance, specific_problem FROM HeMS_Alarm_Code
        WHERE is_used=1 AND ${searchWhere}
        ORDER BY alarm_code asc`;

    /* REVIEW: always get the whole data
    const queryStr = `SELECT * FROM HeMS_Alarm_Code
        ORDER BY alarm_code desc`; */

    // fixed TTA #11 #12
    // const langPack = commVar.getInstance().get("fullLangPack")[req.session.lang]; // 유저별로 다르게 설정할 때
    // const colNames = ["Alarm Code","Alarm Type","Event Type","Severity","Report Mechanism","Probable Cause","Managed Object Instance","Specific Problem"];
    // let data = csUtil.translateNames(langPack, colNames);
    const colNames = ["Alarm Code","Alarm Type","Event Type","Severity","Report Mechanism","Probable Cause","Managed Object Instance","Specific Problem"];
    let data = csUtil.translateNames(colNames);
    // console.debug(`data =`, data);

    /* REVIEW: write head of the response. if not set, it will be set to default header option
    res.writeHead(200, {
        "Content-Type": "application/csv"
    }); */
    res.write(data);

    eudbEx.runQuery(queryStr,
        () => { // finally
            res.end();
        },
        (rows) => { // success
            if (rows.length > 0) {
                // console.log(`>>[SQL RESULT] success query, rows.length =`, rows.length);
                rows.forEach(row => {
                    data = `"A${row.alarm_code}","${row.alarm_type}","${row.event_type}","${row.severity}","${row.report_mechanism}","${row.probable_cause}","${row.managed_object_instance}","${row.specific_problem}"\n`;
                    res.write(data);
                });
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
                // throw new Error(`Not Found!!!`);
            }
        });
};

exports.handleFaultAlarmListActionEvent = function(req, res) {
    console.log("IN> handleFaultAlarmListActionEvent()");

    let rowData = req.body.rowData;
    let type = req.body.type;
    console.log(`type(${type}), rowData = `, rowData);

    let addQuery = `INSERT INTO HeMS_Alarm_Code
        VALUES ('${rowData.alarm_code}', '${rowData.alarm_type}', '1', '${rowData.event_type}', '${rowData.severity}', '${rowData.report_mechanism}', '${rowData.probable_cause}', '${rowData.managed_object_instance}', '${rowData.specific_problem}', '')`;
    let delQuery = `UPDATE HeMS_Alarm_Code
        SET is_used='0'
        WHERE alarm_code='${rowData.alarm_code}'`;
    let editQuery = `UPDATE HeMS_Current_Alarm
        SET isACK='${rowData.isACK}'
        WHERE alarm_code='${rowData.alarm_code}'
        AND henb_id='${rowData.henb_id}'
        AND alarm_raised_time='${moment(rowData.alarm_raised_time).format("YYYY-MM-DD HH:mm:ss")}'
        AND alarm_loc='${rowData.alarm_loc}'`;

    let queryStr = ``;

    switch (type) {
        case "ADD":
            queryStr = addQuery;
            break;
        case "DEL":
            queryStr = delQuery;
            break;
        case "EDIT":
            queryStr = editQuery;
            break;

        default:
            console.log(`Unknown Type(${type})`);
            break;
    }

    var retVal = {
        result: false,
        type: type,
        draw: 0,
        message: ``,
        data: []
    };

    eudbEx.runQuery(queryStr,
        () => { // finally
            res.json(retVal);
        },
        (rows) => { // success
            if (rows.affectedRows && rows.affectedRows > 0) {
                // console.log(`>>[SQL RESULT] result len = ${rows.affectedRows}`);
                retVal.result = true;
                retVal.draw = 1;
                retVal.message = `${type} action is done, the page will be reloaded.`;
            } else {
                retVal.message = `${type} action is done, but the result rows is empty.`;
            }
        },
        (err) => { // failure
            retVal.message = err.message;
        });
};