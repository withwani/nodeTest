// const commUtil = require("./common_util");
const moment = require("moment");
const eudbEx = require("./eu_mysqlEx")();

let statTables = [{
    id: "S_AR",
    name: "HeMS_Stat_AR",
    title: "CPU Usage"
}, {
    id: "S_CD",
    name: "HeMS_Stat_CD",
    title: "CQI Distribution" // deprecated
}, {
    id: "S_HA",
    name: "HeMS_Stat_HA",
    title: "HARQ" // deprecated
}, {
    id: "S_HO",
    name: "HeMS_Stat_HO",
    title: "Handover"
}, {
    id: "S_IH",
    name: "HeMS_Stat_IH",
    title: "Inter&Intra handover"
}, {
    id: "S_LS",
    name: "HeMS_Stat_LS",
    title: "Line Statistics"
}, {
    id: "S_PA",
    name: "HeMS_Stat_PA",
    title: "Paging"
}, {
    id: "S_PD",
    name: "HeMS_Stat_PD",
    title: "PDCP"
}, {
    id: "S_RA",
    name: "HeMS_Stat_RA",
    title: "Random Access"
}, {
    id: "S_RC",
    name: "HeMS_Stat_RC",
    title: "RRC Connection"
}, {
    id: "S_RD",
    name: "HeMS_Stat_RD",
    title: "Attempted Redirection Info"
}, {
    id: "S_RF",
    name: "HeMS_Stat_RF",
    title: "RF Statistics"
}, {
    id: "S_RP",
    name: "HeMS_Stat_RP",
    title: "Random Access Procedure" // deprecated
}, {
    id: "S_RR",
    name: "HeMS_Stat_RR",
    title: "Radio resource"
}, {
    id: "S_UI",
    name: "HeMS_Stat_UI",
    title: "User Info"
}];

var getStatWeeklyFrontValueString = function(column) {
    var value_string = "";

    for (var i = 0; i < column.length; i++) {
        value_string = value_string + `,a.${column[i]} `;
    }

    return value_string;
};

var getStatValueQuery = function(columns, conditions) {
    var retQuery = "";

    for (var i = 0; i < columns.length; i++) {
        retQuery = retQuery + `, ${conditions[i]} as ${columns[i]}`;
    }

    return retQuery;
};

exports.getStatColumn = function(req, res, pool) {
    console.log(`IN> getStatColumn()`);

    let enbId = req.body.henb_id;
    let category = req.body.category; // Index of statTables
    let periodic = req.body.periodic; // 0: 5 minutes, 1: Hourly, 2: Daily, 3: Weekly, 4: Monthly
    let startDate = moment(req.body.start_date).format();
    let endDate = moment(req.body.end_date).format();
    console.log(`Request Info. enbId: ${enbId}, category: ${category}, periodic: ${periodic}, startDate: ${startDate}, endDate: ${endDate}`);

    let selTable = statTables[category];
    console.log(`Selected table =`, selTable);

    // let selectPhrase;
    // let phraseEnd;
    let theads = ["Start Time", "End Time", "eNB ID"]; // <thead> tag for html code
    let columns = [];
    let conditions = [];

    let queryStr = `SELECT * FROM HeMS_Stat_Columns WHERE stat_row_id='${selTable.id}';`;

    let retVal = {
        success: false
    };

    eudbEx.runQuery(queryStr,
        () => { // finally
            res.json(retVal);
            // console.log(`===== Quering terminated =====`);
        },
        (rows) => { // success
            if (rows.length > 0) {
                // console.log(`>>[SQL RESULT] success query, rows.length = ${rows.length}`);
                for (var i = 0; i < rows.length; i++) {
                    theads.push(rows[i].stat_column_title); // e.g. CPU Average Usage
                    columns.push(rows[i].stat_column_id); // e.g. CPU_AVG_USAGE
                    conditions.push(rows[i].stat_column_select_method); // e.g. ROUND(AVG(CPU_AVG_USAGE),0)
                }
                console.log(`theads, columns =`, {
                    theads,
                    columns
                });

                retVal.success = true;
                retVal.info = req.body;
                retVal.thead = theads;
                retVal.column = columns;
                retVal.condition = conditions;
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
                // throw new Error(`Not Found!!!`);
            }
        }
    );
}

/**
 * get statistics data
 */
exports.getStatData = function(req, res, pool) {
    console.log(`IN> getStatData()`);

    let enbId = req.body.henb_id;
    let category = req.body.category; // Index of statTables
    let periodic = req.body.periodic; // 0: 5 minutes, 1: Hourly, 2: Daily, 3: Weekly, 4: Monthly
    let startDate = moment(req.body.start_date).format();
    let endDate = moment(req.body.end_date).format();
    console.log(`Request Info. enbId: ${enbId}, category: ${category}, periodic: ${periodic}, startDate: ${startDate}, endDate: ${endDate}`);

    let selTable = statTables[category];
    console.log(`Selected table =`, selTable);

    let selectPhrase,
        countPhrase = ``,
        phraseEnd;
    let theads = req.body.theads; // <thead> tag for html code
    let columns = req.body.columns;
    let conditions = req.body.conditions;

    if (periodic == 0) {
        selectPhrase = "start_time AS start, end_time AS end";
        phraseEnd = "";
    } else if (periodic == 1) {
        selectPhrase = `FROM_UNIXTIME(UNIX_TIMESTAMP(CONCAT(DATE(start_time)," ",HOUR(start_time), ":00:00"))) AS start,
            CASE hour(start_time)
                WHEN 23 THEN
                    FROM_UNIXTIME(UNIX_TIMESTAMP(CONCAT(DATE(DATE_ADD(start_time, INTERVAL +1 DAY))," ",0,":00:00")))
            ELSE
                FROM_UNIXTIME(UNIX_TIMESTAMP(CONCAT(DATE(start_time)," ", HOUR(start_time)+1,":00:00")))
            END AS end`;
        phraseEnd = "";
    } else if (periodic == 2) {
        selectPhrase = `DATE(start_time) AS start, FROM_UNIXTIME(UNIX_TIMESTAMP(DATE(start_time))+(24*3600)) AS end`;
        phraseEnd = "";
    } else if (periodic == 3) {
        var selectWeekly = getStatWeeklyFrontValueString(columns);
        selectPhrase = `a.start, a.end, a.henb_id ${selectWeekly} FROM(
            SELECT DATE(DATE_ADD(start_time, INTERVAL -(DAYOFWEEK(start_time)-1) DAY)) AS start,
                DATE(DATE_ADD(start_time, INTERVAL (7-DAYOFWEEK(start_time)) DAY)) AS end`;
        countPhrase = ` FROM (
            SELECT DATE(DATE_ADD(start_time, INTERVAL -(DAYOFWEEK(start_time)-1) DAY)) AS start,
                DATE(DATE_ADD(start_time, INTERVAL (7-DAYOFWEEK(start_time)) DAY)) AS end, henb_id`;
        phraseEnd = `) a ORDER BY 1`;
    } else if (periodic == 4) {
        selectPhrase = `ADDDATE(DATE(start_time), INTERVAL -DAY(start_time)+1 DAY) AS start,
            CASE
                WHEN MONTH(start_time) IN (1,3,5,7,8,10,12)
                    THEN ADDDATE(DATE(start_time), INTERVAL 32-DAY(start_time) DAY)
                WHEN MONTH(start_time) = 2 AND (YEAR(start_time) % 4 = 0) AND ((YEAR(start_time) % 100 <> 0) OR (YEAR(start_time) % 400 = 0))
                    THEN ADDDATE(DATE(start_time), INTERVAL 30-DAY(start_time) DAY)
                WHEN MONTH(start_time) = 2 AND (YEAR(start_time) % 4 <> 0)
                    THEN ADDDATE(DATE(start_time), INTERVAL 29-DAY(start_time) DAY)
                WHEN MONTH(start_time) IN (4,6,9,11)
                    THEN ADDDATE(DATE(start_time), INTERVAL 31-DAY(start_time) DAY)
            END AS end`;
        phraseEnd = "";
    }

    let columnNames = getStatValueQuery(columns, conditions);
    let dataQueryStr = `SELECT "" as stat_no, ${selectPhrase}, henb_id${columnNames} FROM ${selTable.name}
        WHERE henb_id=${enbId}
        AND start_time >= DATE_ADD('${startDate}', INTERVAL '0' MINUTE_SECOND)
        AND end_time <= DATE_ADD('${endDate}', INTERVAL '0' MINUTE_SECOND)
        GROUP BY 1,2,3${phraseEnd}`;

    let queryStr = `${dataQueryStr};

        SELECT count(*) as count FROM(
            ${dataQueryStr}
        ) b;`;

    var retVal = {
        success: false,
        draw: 0,
        recordsTotal: 0,
        recordsFiltered: 0,
        data: []
    };

    console.log(`queryStr =`, queryStr);

    eudbEx.runQuery(queryStr,
        () => { // finally
            res.json(retVal);
            // console.log(`===== Quering terminated =====`);
        },
        (rows) => { // success
            if (rows.length > 0) {
                // console.log(`>>[SQL RESULT] success query, rows.length = ${rows.length}`);

                rows[0].forEach((row, i) => {
                    row.stat_no = i + 1;
                });

                retVal.success = true;
                retVal.draw = 1;
                retVal.recordsTotal = rows[1][0].count;
                retVal.recordsFiltered = rows[1][0].count;
                retVal.data = rows[0];
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
                // throw new Error(`Not Found!!!`);
            }
        });
};