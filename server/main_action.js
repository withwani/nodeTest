/* Below is General Definition ================================================================= */
// const moment = require("moment");
// const async = require("async");

const commUtil = require("./common_util");
const commVar = require("./common_var");
const eudbEx = require("./eu_mysqlEx")();

const enbAct = require("./enb_action");

var alertSoundTimer;

const TOTAL_ENB_CNT = commVar.getInstance().get("totEnbCnt") || commVar.getInstance().getConst("TOTAL_ENB_CNT_MAIN_STATUS_BOARD");
console.debug(`TOTAL_ENB_CNT =`, TOTAL_ENB_CNT);

/* Below is Inner Function ================================================================= */
function getAreaListData() {
    console.log(`IN> getAreaListData()`);

    let queryStr = `SELECT DISTINCT main_area FROM v_area
        WHERE main_area_code <> "";`;

    let retVal = {};
    // getting Area List from the DB
    eudbEx.runQuery(queryStr,
        () => { // finally
            return retVal;
        },
        (rows) => { // success
            if (rows.length > 0) {
                // console.log(">>[SQL RESULT] Querying was successful");
                retVal.success = true;
                retVal.areas = commUtil.getValues(rows, "main_area");
            } else {
                // console.log(">>[SQL RESULT] Querying failed");
            }
        },
        (err) => { // failure
            console.error(`${err.message}\n` + err.stack);
        });
}

function getAlarmBoardWholeData(area) {
    console.log(`IN> getAlarmBoardWholeData(), area =`, area);

    return new Promise((resolve, reject) => {

        if (area == commVar.getInstance().get("area_supervisor")) area = '';
        let serverType = commVar.getInstance().get("serverType");
        let extraServiceCntQuery = (serverType == "1") ? `AND a.henb_id='1'` : `AND a.henb_id IN (
            SELECT henb_id FROM HeMS_Device
            WHERE ifnull(main_area, '') LIKE '%${area}%'
        )`;
        let extraAlarmCntQuery = (serverType == "1") ? `AND henb_id='1'` : `AND henb_id IN (
            SELECT henb_id FROM HeMS_Device
            WHERE ifnull(main_area, '') LIKE '%${area}%'
        )`;
        let queryStr = `SELECT c.parameter_value as status, count(*) as cnt FROM (
                SELECT 'ins' as parameter_value FROM HeMS_Device_Param a, HeMS_Parameter b
                WHERE b.parameter_name = 'InternetGatewayDevice.Services.FAPService.1.FAPControl.LTE.X_VENDOR_BB_STATE'
                AND a.parameter_id = b.parameter_id
                AND a.parameter_value = '2'
                AND a.henb_id NOT IN (
                    SELECT henb_id FROM HeMS_Current_Alarm
                    WHERE alarm_code='40101'
                )
                ${extraServiceCntQuery}
                UNION ALL
                SELECT 'oos' as parameter_value FROM HeMS_Device_Param a, HeMS_Parameter b
                WHERE b.parameter_name = 'InternetGatewayDevice.Services.FAPService.1.FAPControl.LTE.X_VENDOR_BB_STATE'
                AND a.parameter_id = b.parameter_id
                AND a.parameter_value IN ('', '0', '1')
                ${extraServiceCntQuery}
                UNION ALL
                SELECT 'oos' as parameter_value FROM HeMS_Device_Param a, HeMS_Parameter b
                WHERE b.parameter_name = 'InternetGatewayDevice.Services.FAPService.1.FAPControl.LTE.X_VENDOR_BB_STATE'
                AND a.parameter_id = b.parameter_id
                AND a.parameter_value = '2'
                AND a.henb_id IN (
                    SELECT henb_id FROM HeMS_Current_Alarm
                    WHERE alarm_code='40101'
                )
                ${extraServiceCntQuery}
            ) c GROUP BY c.parameter_value;

            SELECT 'Critical' severity, count(*) cnt FROM HeMS_Current_Alarm
            WHERE alarm_code BETWEEN '40001' and '49999'
            AND severity = 'Critical'
            ${extraAlarmCntQuery}
            UNION ALL
            SELECT 'Major' severity, count(*) cnt FROM HeMS_Current_Alarm
            WHERE alarm_code BETWEEN '40001' and '49999'
            AND severity = 'Major'
            ${extraAlarmCntQuery}
            UNION ALL
            SELECT 'Minor' severity, count(*) cnt FROM HeMS_Current_Alarm
            WHERE alarm_code BETWEEN '40001' and '49999'
            AND severity = 'Minor'
            ${extraAlarmCntQuery};

            SELECT 'Critical' severity, count(*) cnt FROM HeMS_Current_Alarm
            WHERE alarm_code between '10001' and '19999' AND severity='Critical'
            union all
            SELECT 'Major' severity, count(*) cnt FROM HeMS_Current_Alarm
            WHERE alarm_code between '10001' and '19999' AND severity='Major'
            union all
            SELECT 'Minor' severity, count(*) cnt FROM HeMS_Current_Alarm
            WHERE alarm_code between '10001' and '19999' AND severity='Minor';`;

        let retVal = {
            success: false,
            status: {
                tot: 0,
                ins: 0,
                oos: 0
            },
            alarm: {
                cri: 0,
                maj: 0,
                min: 0
            },
            emsAlarm: {
                cri: 0,
                maj: 0,
                min: 0
            }
        };

        // console.debug(`query =`, queryStr);
        eudbEx.runQuery(queryStr,
            () => { // finally
                resolve(retVal);
            },
            (rows) => { // success
                if (rows && rows.length == 3) {
                    // console.log(">>[SQL RESULT] Querying was successful");

                    // calculated Device Status count
                    if (rows[0].length > 0) {
                        // console.log(`>>[SQL RESULT] Querying(Device Status) was successful!`);
                        rows[0].forEach(row => {
                            if (row.status == "ins") {
                                retVal.status.ins = row.cnt;
                            } else if (row.status == "oos") {
                                retVal.status.oos = row.cnt;
                            }
                        });
                        retVal.status.tot = parseInt(retVal.status.ins) + parseInt(retVal.status.oos);
                        // console.debug(`Status count, TOT(${retVal.status.tot}) = INS(${retVal.status.ins}) + OOS(${retVal.status.oos})`);
                    } else {
                        // console.log(`>>[SQL RESULT] Querying(Device Status) failed!`);
                    }

                    // calculated Device Alarm count
                    if (rows[1].length > 0) {
                        // console.log(`>>[SQL RESULT] Querying(Device Alarm) was successful!`);
                        rows[1].forEach(row => {
                            if (row.severity == "Critical") {
                                retVal.alarm.cri = row.cnt;
                            } else if (row.severity == "Major") {
                                retVal.alarm.maj = row.cnt;
                            } else if (row.severity == "Minor") {
                                retVal.alarm.min = row.cnt;
                            }
                        });
                    } else {
                        // console.log(`>>[SQL RESULT] Querying(Device Alarm) failed!`);
                    }

                    // calculated EMS Alarm count
                    if (rows[2].length > 0) {
                        // console.log(`>>[SQL RESULT] Querying(EMS Alarm) was successful!`);
                        rows[2].forEach(row => {
                            if (row.severity == "Critical") {
                                retVal.emsAlarm.cri = row.cnt;
                            } else if (row.severity == "Major") {
                                retVal.emsAlarm.maj = row.cnt;
                            } else if (row.severity == "Minor") {
                                retVal.emsAlarm.min = row.cnt;
                            }
                        });
                    } else {
                        // console.log(`>>[SQL RESULT] Querying(EMS Alarm) failed!`);
                    }

                    retVal.success = true;
                } else {
                    retVal.message = `Querying failed!`;
                    // console.log(">>[SQL RESULT] Querying failed");
                }
            },
            (err) => { // failure
                console.error(`${err.message}\n` + err.stack);
                reject(err);
            });
    });
}

function getStatusBoardWholeData(cb) {
    console.log(`IN> getStatusBoardWholeData()`);

    let queryStr = `SELECT c.henb_id,
        max(case when c.param_name = 'Name' then c.param_value end) henb_name,
        max(case when c.param_name = 'Critical' then c.param_value end) critical,
        max(case when c.param_name = 'Major' then c.param_value end) major,
        max(case when c.param_name = 'Minor' then c.param_value end) minor,
        max(case when c.param_name = 'State' then c.param_value end) state,
        max(case when c.param_name = 'AlarmCode' then ifnull(c.param_value,0) end) code,
        max(case when c.param_name = 'AreaCode' then c.param_value end) area
        FROM (
            SELECT b.henb_id, b.severity as param_name, ifnull(a.cnt, 0) as param_value FROM (
                SELECT henb_id, severity, count(*) cnt FROM HeMS_Current_Alarm a
                WHERE alarm_code between '40001' and '49999' AND severity <> 'Cleared'
                GROUP BY 1, 2
            ) a right outer join (
                SELECT henb_id, severity FROM HeMS_Device, v_severity
                WHERE henb_id between 1 and ${TOTAL_ENB_CNT}
            ) b on a.henb_id=b.henb_id AND a.severity=b.severity
            union all (
                SELECT a.henb_id, 'State' param_name, a.parameter_value param_value FROM HeMS_Device_Param a, HeMS_Parameter b
                WHERE a.henb_id between 1 and ${TOTAL_ENB_CNT}
                AND b.parameter_name = 'InternetGatewayDevice.Services.FAPService.1.FAPControl.LTE.X_VENDOR_BB_STATE'
                AND a.parameter_id = b.parameter_id
                ORDER BY 1, 2
            )
            union all (
                SELECT a.henb_id, 'AlarmCode' as param_name, a.alarm_code as param_value FROM HeMS_Current_Alarm a
                WHERE a.alarm_code = 40101 and a.henb_id between 1 and ${TOTAL_ENB_CNT}
                ORDER BY 1, 2
            )
            union all (
                SELECT a.henb_id, 'AreaCode' as param_name, a.main_area as param_value FROM HeMS_Device a
                WHERE a.henb_id between 1 and ${TOTAL_ENB_CNT}
                ORDER BY 1, 2
            )
            union all (
                SELECT a.henb_id, 'Name' as param_name, a.henb_name as param_value FROM HeMS_Device a
                WHERE a.henb_id between 1 and ${TOTAL_ENB_CNT}
                ORDER BY 1, 2
            )
        ) c
        GROUP BY c.henb_id;

        SELECT area_info FROM HeMS_User WHERE user_id = 'admin';

        SELECT DISTINCT main_area FROM v_area
        WHERE main_area_code <> "";`;

    let retVal = {
        success: false,
        supervisor: null,
        henb_cnt: 0,
        henb: [],
        areas: []
    }

    // getting Area List from the DB
    eudbEx.runQuery(queryStr,
        () => {
            cb(retVal);
        },
        (rows) => { // success
            if (rows && rows.length > 0) {
                retVal.success = true;

                let id, name, state, alarm;
                if (rows[0] && rows[0].length > 0) {
                    rows[0].forEach(row => {
                        id = row.henb_id || null;
                        name = row.henb_name || "";
                        state = null, alarm = null;
                        if (row.code != null && row.code == 40101) { // check link fail
                            state = "linkfail";
                        } else {
                            // check state
                            if (row.state == "2") { // INS
                                state = "ins";
                            } else if (row.state == "1" || row.state == "0") { // OOS
                                state = "oos";
                            } else {
                                console.error(`Unknown state of the eNB, state =`, row.state);
                            }

                            // check alarm
                            if (row.critical > "0") {
                                alarm = "cri";
                            } else if (row.major > "0") {
                                alarm = "maj";
                            } else if (row.minor > "0") {
                                alarm = "min";
                            }
                        }
                        retVal.henb.push({
                            id: id,
                            name: name,
                            state: state,
                            alarm: alarm,
                            area: row.area
                        });
                    });
                    retVal.henb_cnt = rows[0].length;
                }

                if (rows[1] && rows[1].length > 0) {
                    let supervisor = commVar.getInstance().get("area_supervisor");
                    if (supervisor) {
                        retVal.supervisor = supervisor;
                    } else {
                        retVal.supervisor = rows[1][0].area_info;
                        commVar.getInstance().set("area_supervisor", rows[1][0].area_info);
                    }
                }

                if (rows[2] && rows[2].length > 0) {
                    retVal.areas = commUtil.getValues(rows[2], "main_area");
                }
            }
        },
        (err) => { // failure
            console.error(`${err.message}\n` + err.stack);
        });
}
/* function getStatusBoardWholeData(cb) {
    console.log(`IN> getStatusBoardWholeData()`);

    let queryStr = `SELECT c.henb_id,
        max(case when c.param_name = 'Critical' then c.param_value end) critical,
        max(case when c.param_name = 'Major' then c.param_value end) major,
        max(case when c.param_name = 'Minor' then c.param_value end) minor,
        max(case when c.param_name = 'State' then c.param_value end) state,
        max(case when c.param_name = 'AlarmCode' then ifnull(c.param_value,0) end) code,
        max(case when c.param_name = 'AreaCode' then c.param_value end) area
        FROM (
            SELECT b.henb_id, b.severity as param_name, ifnull(a.cnt, 0) as param_value FROM (
                SELECT henb_id, severity, count(*) cnt FROM HeMS_Current_Alarm a
                WHERE alarm_code between '40001' and '49999' AND severity <> 'Cleared'
                GROUP BY 1, 2
            ) a right outer join (
                SELECT henb_id, severity FROM HeMS_Device, v_severity
                WHERE henb_id between 1 and ${TOTAL_ENB_CNT}
            ) b on a.henb_id=b.henb_id AND a.severity=b.severity
            union all (
                SELECT a.henb_id, 'State' param_name, a.parameter_value param_value FROM HeMS_Device_Param a, HeMS_Parameter b
                WHERE a.henb_id between 1 and ${TOTAL_ENB_CNT}
                AND b.parameter_name = 'InternetGatewayDevice.Services.FAPService.1.FAPControl.LTE.X_VENDOR_BB_STATE'
                AND a.parameter_id = b.parameter_id
                ORDER BY 1, 2
            )
            union all (
                SELECT a.henb_id, 'AlarmCode' as param_name, a.alarm_code as param_value FROM HeMS_Current_Alarm a
                WHERE a.alarm_code = 40101 and a.henb_id between 1 and ${TOTAL_ENB_CNT}
                ORDER BY 1, 2
            )
            union all (
                SELECT a.henb_id, 'AreaCode' as param_name, a.main_area as param_value FROM HeMS_Device a
                WHERE a.henb_id between 1 and ${TOTAL_ENB_CNT}
                ORDER BY 1, 2
            )
        ) c
        GROUP BY c.henb_id;
        SELECT area_info FROM HeMS_User WHERE user_id = 'admin';

        SELECT DISTINCT main_area FROM v_area
        WHERE main_area_code <> "";`;

    let retVal = {
        success: false,
        supervisor: null,
        henb_cnt: 0,
        henb: [],
        areas: []
    }

    // getting Area List from the DB
    eudbEx.runQuery(queryStr,
        () => {
            cb(retVal);
        },
        (rows) => { // success
            if (rows && rows.length > 0) {
                retVal.success = true;

                let id, state, alarm;
                if (rows[0] && rows[0].length > 0) {
                    rows[0].forEach(row => {
                        id = row.henb_id || null;
                        state = null, alarm = null;
                        if (row.code != null && row.code == 40101) { // check link fail
                            state = "linkfail";
                        } else {
                            // check state
                            if (row.state == "2") { // INS
                                state = "ins";
                            } else if (row.state == "1" || row.state == "0") { // OOS
                                state = "oos";
                            } else {
                                console.error(`Unknown state of the eNB, state =`, row.state);
                            }

                            // check alarm
                            if (row.critical > "0") {
                                alarm = "cri";
                            } else if (row.major > "0") {
                                alarm = "maj";
                            } else if (row.minor > "0") {
                                alarm = "min";
                            }
                        }
                        retVal.henb.push({
                            id: id,
                            state: state,
                            alarm: alarm,
                            area: row.area
                        });
                    });
                    retVal.henb_cnt = rows[0].length;
                }

                if (rows[1] && rows[1].length > 0) {
                    let supervisor = commVar.getInstance().get("area_supervisor");
                    if (supervisor) {
                        retVal.supervisor = supervisor;
                    } else {
                        retVal.supervisor = rows[1][0].area_info;
                        commVar.getInstance().set("area_supervisor", rows[1][0].area_info);
                    }
                }

                if (rows[2] && rows[2].length > 0) {
                    retVal.areas = commUtil.getValues(rows[2], "main_area");
                }
            }
        },
        (err) => { // failure
            console.error(`${err.message}\n` + err.stack);
        });
} */

/* Below is Export Function ================================================================= */
exports.getAlarmBoard = function (pool, io, data, socket) {
    console.log(`IN> getAlarmBoard(), data =`, data);

    if (pool) {
        // get connection poll
        pool.getConnection(function (err, conn) {
            if (err) {
                console.log("getConnection err");
                conn.release(); //must release
                return;
            }
            console.log("DB thread ID :" + conn.threadId);

            var id = "0003";
            var p_id = "1";

            var alarm_board = {
                status: {
                    tot: "0",
                    ins: "0",
                    oos: "0"
                },
                alarm: {
                    cri: "0",
                    maj: "0",
                    min: "0"
                },
                emsAlarm: {
                    cri: "0",
                    maj: "0",
                    min: "0"
                }
            };

            let query = `SELECT c.parameter_value as status, count(*) as cnt
                FROM (
                    SELECT 'ins' as parameter_value
                    FROM HeMS_Device_Param a, HeMS_Parameter b
                    WHERE b.parameter_name='InternetGatewayDevice.Services.FAPService.1.FAPControl.LTE.X_VENDOR_BB_STATE'
                        AND a.parameter_id=b.parameter_id
                        AND a.parameter_value='2'
                        AND a.henb_id not in (
                            SELECT henb_id
                            FROM HeMS_Current_Alarm
                            WHERE alarm_code='40101'
                        )
                    union all
                    SELECT 'oos' as parameter_value
                    FROM HeMS_Device_Param a, HeMS_Parameter b
                    WHERE b.parameter_name='InternetGatewayDevice.Services.FAPService.1.FAPControl.LTE.X_VENDOR_BB_STATE'
                        AND a.parameter_id=b.parameter_id
                        AND a.parameter_value in ('','0','1')
                    union all
                    SELECT 'oos' as parameter_value
                    FROM HeMS_Device_Param a, HeMS_Parameter b
                    WHERE b.parameter_name='InternetGatewayDevice.Services.FAPService.1.FAPControl.LTE.X_VENDOR_BB_STATE'
                        AND a.parameter_id=b.parameter_id
                        AND a.parameter_value='2'
                        AND a.henb_id in (
                            SELECT henb_id
                            FROM HeMS_Current_Alarm
                            WHERE alarm_code='40101'
                        )
                ) c group BY c.parameter_value`;

            var exec = conn.query(
                query,

                function (err, rows) {
                    //conn.release(); //must release
                    console.debug("$$[EXEC SQL] : " + exec.sql);

                    if (err) {
                        throw err;
                    }

                    if (rows.length > 0) {
                        // console.log(">>[SQL RESULT] Device success query: (%s, %s)", id, p_id);
                        // console.log(`rows =`, rows);
                        for (let i = 0; i < rows.length; i++) {
                            if (rows[i].status == "ins") alarm_board.status.ins = rows[i].cnt;
                            else if (rows[i].status == "oos") alarm_board.status.oos = rows[i].cnt;
                        }
                        alarm_board.status.tot = parseInt(alarm_board.status.ins) + parseInt(alarm_board.status.oos);
                        console.log(`Alarm Status: INS(${alarm_board.status.ins}), OOS(${alarm_board.status.oos}), TOTAL(${alarm_board.status.tot})`);
                    } else {
                        // console.log(">>[SQL RESULT] Device fail query: (%s, %s)", id, p_id);
                    }

                    let serverType = commVar.getInstance().get("serverType");
                    let extraQuery = serverType == "1" ? " AND henb_id='1'" : "";

                    query = `SELECT 'Critical' severity, count(*) cnt FROM HeMS_Current_Alarm
                        WHERE alarm_code between '40001' and '49999' AND severity='Critical'${extraQuery}
                        union all
                        SELECT 'Major' severity, count(*) cnt FROM HeMS_Current_Alarm
                        WHERE alarm_code between '40001' and '49999' AND severity='Major'${extraQuery}
                        union all
                        SELECT 'Minor' severity, count(*) cnt FROM HeMS_Current_Alarm
                        WHERE alarm_code between '40001' and '49999' AND severity='Minor'${extraQuery}`;

                    var exec1 = conn.query(
                        query,

                        function (err, rows) {
                            //conn.release(); //must release
                            console.debug("$$[EXEC SQL] : " + exec1.sql);

                            if (err) {
                                throw err;
                            }

                            if (rows.length > 0) {
                                // console.log(">>[SQL RESULT] eNB success query: (%s, %s)", id, p_id);
                                //console.dir(rows);
                                for (let i = 0; i < rows.length; i++) {
                                    if (rows[i].severity == "Critical") alarm_board.alarm.cri = rows[i].cnt;
                                    else if (rows[i].severity == "Major") alarm_board.alarm.maj = rows[i].cnt;
                                    else if (rows[i].severity == "Minor") alarm_board.alarm.min = rows[i].cnt;
                                }
                            } else {
                                // console.log(">>[SQL RESULT] eNB Alarm fail query: (%s, %s)", id, p_id);
                            }

                            query = `SELECT 'Critical' severity, count(*) cnt FROM HeMS_Current_Alarm
                                WHERE alarm_code between '10001' and '19999' AND severity='Critical'
                                union all
                                SELECT 'Major' severity, count(*) cnt FROM HeMS_Current_Alarm
                                WHERE alarm_code between '10001' and '19999' AND severity='Major'
                                union all
                                SELECT 'Minor' severity, count(*) cnt FROM HeMS_Current_Alarm
                                WHERE alarm_code between '10001' and '19999' AND severity='Minor'`;

                            var exec2 = conn.query(
                                query,

                                function (err, rows) {
                                    console.debug("$$[EXEC SQL] : " + exec2.sql);

                                    if (err) {
                                        throw err;
                                    }

                                    if (rows.length > 0) {
                                        // console.log(">>[SQL RESULT] EMS success query: (%s, %s)", id, p_id);
                                        //console.dir(rows);
                                        for (let i = 0; i < rows.length; i++) {
                                            if (rows[i].severity == "Critical") alarm_board.emsAlarm.cri = rows[i].cnt;
                                            else if (rows[i].severity == "Major") alarm_board.emsAlarm.maj = rows[i].cnt;
                                            else if (rows[i].severity == "Minor") alarm_board.emsAlarm.min = rows[i].cnt;
                                        }
                                    } else {
                                        // console.log(">>[SQL RESULT] EMS Alarm fail query: (%s, %s)", id, p_id);
                                    }
                                    conn.release(); //must release
                                    socket.emit("alarm-board", alarm_board);
                                }
                            );
                        }
                    );
                }
            );
        });
    }
};



exports.getStatusBoard = function (data, socket) {
    console.log(`IN> getStatusBoard(), data =`, data);

    getStatusBoardWholeData((retVal) => {
        if (data.op == "henbid-status-board") {
            socket.emit("henbid-status-board", retVal);
        } else {
            socket.emit("status-board", retVal);
        }
    });
};
/* exports.getStatusBoard = function(pool, io, data, socket) {
    console.log(`IN> getStatusBoard(), data =`, data);

    let queryStr = `SELECT c.henb_id,
        max(case when c.param_name = 'Critical' then c.param_value end) critical,
        max(case when c.param_name = 'Major' then c.param_value end) major,
        max(case when c.param_name = 'Minor' then c.param_value end) minor,
        max(case when c.param_name = 'State' then c.param_value end) state,
        max(case when c.param_name = 'AlarmCode' then ifnull(c.param_value,0) end) code,
        max(case when c.param_name = 'AreaCode' then c.param_value end) area
        FROM (
            SELECT b.henb_id, b.severity as param_name, ifnull(a.cnt, 0) as param_value FROM (
                SELECT henb_id, severity, count(*) cnt FROM HeMS_Current_Alarm a
                WHERE alarm_code between '40001' and '49999' AND severity <> 'Cleared'
                GROUP BY 1, 2
            ) a right outer join (
                SELECT henb_id, severity FROM HeMS_Device, v_severity
                WHERE henb_id between 1 and ${TOTAL_ENB_CNT}
            ) b on a.henb_id=b.henb_id AND a.severity=b.severity
            union all (
                SELECT a.henb_id, 'State' param_name, a.parameter_value param_value FROM HeMS_Device_Param a, HeMS_Parameter b
                WHERE a.henb_id between 1 and ${TOTAL_ENB_CNT}
                AND b.parameter_name = 'InternetGatewayDevice.Services.FAPService.1.FAPControl.LTE.X_VENDOR_BB_STATE'
                AND a.parameter_id = b.parameter_id
                ORDER BY 1, 2
            )
            union all (
                SELECT a.henb_id, 'AlarmCode' as param_name, a.alarm_code as param_value FROM HeMS_Current_Alarm a
                WHERE a.alarm_code = 40101 and a.henb_id between 1 and ${TOTAL_ENB_CNT}
                ORDER BY 1, 2
            )
            union all (
                SELECT a.henb_id, 'AreaCode' as param_name, a.main_area as param_value FROM HeMS_Device a
                WHERE a.henb_id between 1 and ${TOTAL_ENB_CNT}
                ORDER BY 1, 2
            )
        ) c
        GROUP BY c.henb_id;
        SELECT area_info FROM HeMS_User WHERE user_id = 'admin';`;

    let retVal = {
        pages: data.pages,
        henb_cnt: 0,
        henb: []
    };

    eudbEx.runQuery(queryStr,
        () => { // finally
            if (data.op == "henbid-status-board") {
                socket.emit("henbid-status-board", retVal);
            } else {
                socket.emit("status-board", retVal);
            }
        },
        (rows) => { // success
            if (rows && rows.length > 0) {
                // console.debug(`>>[SQL RESULT] rows.length = ${rows.length}`);

                let id, state, alarm;
                rows[0].forEach(row => {
                    id = row.henb_id || null;
                    state = null, alarm = null;

                    // check link fail
                    if (row.code != null && row.code == 40101) {
                        state = "linkfail";
                        // alarm = null;
                    } else {
                        // check state
                        if (row.state == "2") { // INS
                            state = "ins";
                        } else if (row.state == "1" || row.state == "0") { // OOS
                            state = "oos";
                        } else {
                            console.error(`Unknown state of the eNB, state =`, row.state);
                            // state = null;
                        }

                        // check alarm
                        if (row.critical > "0") {
                            alarm = "cri";
                        } else if (row.major > "0") {
                            alarm = "maj";
                        } else if (row.minor > "0") {
                            alarm = "min";
                        }
                    }
                    retVal.henb.push({
                        id: id,
                        state: state,
                        alarm: alarm,
                        area: row.area
                    });
                });
                retVal.henb_cnt = rows[0].length;

                let supervisor = commVar.getInstance().get("area_supervisor");
                if (supervisor) {
                    retVal.supervisor = supervisor;
                } else {
                    retVal.supervisor = rows[1][0].area_info;
                    commVar.getInstance().set("area_supervisor", rows[1][0].area_info);
                }
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
            }
        });
}; */

exports.getStatusInfo = function (data, socket) {
    console.log(`IN> getStatusInfo(), data =`, data);

    let id = data.henbid;
    let area = (!id || id == "0") ? data.area : null;

    enbAct.getEnbInfoDataFromDB(id, area)
        .then(retVal => {
            socket.emit("status-info", retVal);
        })
}

/* exports.getStatusInfo = function(pool, io, data, socket) {
    console.log(`IN> getStatusInfo(), data =`, data);

    var retVal = {
        HeNB_ID: "-",
        HeNB_Name: "-",
        EMS_URL: "-",
        NE_ID: "-",
        Location_Info: "-",
        Freq_Band: "-",
        ECI: "-",
        TAC: "-",
        PCI: "-",
        RSI: "-",
        State: "None",
        Op_State: "-",
        RF_State: "-",
        EARFCNUL: "-",
        EARFCNDL: "-",
        UL_B_width: "-",
        DL_B_width: "-",
        Latitude: "-",
        Longitude: "-",
        Hw_ver: "-",
        Sw_ver: "-",
        SN: "-",
        OUI: "-",
        Addr_Type: "-",
        Ip_Addr: "-",
        Sub_Mask: "-",
        Default_GW: "-"
    };
    var id = (data.henbid) ? data.henbid : "";

    let queryStr = `SELECT c.parameter_alias, b.parameter_value FROM HeMS_Parameter a, HeMS_Device_Param b, v_henb_info_param_list c
        WHERE b.henb_id=${id}
        AND a.parameter_name IN (SELECT parameter_name FROM v_henb_info_param_list)
        AND a.parameter_id=b.parameter_id
        AND a.parameter_name=c.parameter_name
        UNION ALL SELECT 'HeNB_Name', henb_name FROM HeMS_Device
        WHERE henb_id=${id}
        UNION ALL
        SELECT 'NE_ID', ne_id FROM HeMS_Device
        WHERE henb_id=${id}
        UNION ALL
        SELECT 'AREA', main_area FROM HeMS_Device
        WHERE henb_id=${id}
        UNION ALL
        SELECT 'Location_Info', location_info FROM HeMS_Device
        WHERE henb_id=${id}
        UNION ALL
        SELECT 'EMS_URL', parameter_value FROM HeMS_Device_Param
        WHERE henb_id=${id}
        AND parameter_id=(
            SELECT parameter_id FROM HeMS_Parameter
            WHERE parameter_name='InternetGatewayDevice.ManagementServer.URL'
        )`;

    eudbEx.runQuery(queryStr,
        () => { // finally
            socket.emit("status-info", retVal);
        },
        (rows) => { // success
            if (rows.length > 0) {
                // console.log(`>>[SQL RESULT] rows len = ${rows.length}`);

                for (var i = 0; i < rows.length; i++) {
                    retVal[rows[i].parameter_alias] = (rows[i].parameter_value) ? rows[i].parameter_value : "-";
                }
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
            }
            retVal.HeNB_ID = id;
        });
}; */

exports.setAlertSound = function (pool, io, data, socket) {
    console.log(`IN> setAlertSound(), data =`, data);

    if (alertSoundTimer) clearTimeout(alertSoundTimer);
    let queryStr = `UPDATE HeMS_User
        SET alert_sound=${data.allowSnd}
        WHERE user_id='${data.userId}'`;

    eudbEx.runQuery(queryStr,
        null,
        (rows) => { // success
            if (rows.affectedRows > 0) {
                // console.log(">>[SQL RESULT] Querying was successful");
            } else {
                // console.log(">>[SQL RESULT] Querying failed");
            }

            alertSoundTimer = setTimeout(() => {
                socket.handshake.session.allowSnd = data.allowSnd;
                socket.handshake.session.save(() => {
                    socket.emit("set-alert-sound", data.allowSnd);
                    console.log(`Sent alert-sound message: ${data.allowSnd}`);
                    console.log(`Saved allowSnd value(${data.allowSnd}) into the session.`);
                });
            }, 3000);
        },
        (err) => { // failure
            console.error(`${err.message}\n` + err.stack);
        });
};

exports.handleKeepAliveMsgRecvAct = function (req, res, cb) {
    let keepAliveMsgBody = "",
        result = "",
        henbId = "",
        command = "",
        transactionId = "",
        messageType = "";

    req.on("data", function (chunk) {
        keepAliveMsgBody += chunk;
    });

    req.on("end", function () {
        console.log("No more data in response.");
        console.log("EMS data: " + keepAliveMsgBody.toString());
        // console.log("=====================================================================================");

        if (keepAliveMsgBody != "Error") {
            let keepAliveMsgJson = JSON.parse(keepAliveMsgBody.escapeSpecialCharsForParse());
            messageType = keepAliveMsgJson.messageType;
            command = keepAliveMsgJson.command;
            transactionId = keepAliveMsgJson.transaction_id;
            henbId = keepAliveMsgJson.henb_id;
            result = keepAliveMsgJson.result;

            // console.log(`[JSON] messageType: ${messageType}, command: ${command}, transactionId: ${transactionId}, henb_id: ${henbId}, result: ${result}`);
            if (result) {
                res.writeHead("200", {
                    "Content-Type": "text/html; charset=utf8"
                });
            } else {
                res.writeHead("400", {
                    "Content-Type": "text/html;charset=utf8"
                });
            }
        } else {
            res.writeHead("200", {
                "Content-Type": "text/html; charset=utf8"
            });
        }
        if (cb) cb;
        res.end();
        // console.log("=====================================================================================");

        if (req.app.io) {
            req.app.io.sockets.emit("keepalive-message-receive", {
                messageType: messageType,
                command: command,
                transactionId: transactionId,
                henbId: henbId,
                result: result
            });
        } else {
            console.log("io undefined : keepalive-message-receive do not send.");
        }
    });

    req.on("error", err => {
        console.error(`${err.message}\n` + err.stack);
        res.writeHead("400", {
            "Content-Type": "text/html;charset=utf8"
        });
        if (cb) cb;
        res.end();
        // console.log("=====================================================================================");
    });
};

exports.getStatusWholeDataExceptCurrentAlarm = function (req, res) {
    console.log(`IN> getStatusWholeDataExceptCurrentAlarm()`);

    getStatusBoardWholeData((retVal) => {
        res.json(retVal);
    });
}
/* exports.getStatusWholeDataExceptCurrentAlarm = function (req, res, pool) {
    console.log(`IN> getStatusWholeDataExceptCurrentAlarm()`);

    let queryStr = `SELECT c.henb_id,
        max(case when c.param_name = 'Critical' then c.param_value end) critical,
        max(case when c.param_name = 'Major' then c.param_value end) major,
        max(case when c.param_name = 'Minor' then c.param_value end) minor,
        max(case when c.param_name = 'State' then c.param_value end) state,
        max(case when c.param_name = 'AlarmCode' then ifnull(c.param_value,0) end) code,
        max(case when c.param_name = 'AreaCode' then c.param_value end) area
        FROM (
            SELECT b.henb_id, b.severity as param_name, ifnull(a.cnt, 0) as param_value FROM (
                SELECT henb_id, severity, count(*) cnt FROM HeMS_Current_Alarm a
                WHERE alarm_code between '40001' and '49999' AND severity <> 'Cleared'
                GROUP BY 1, 2
            ) a right outer join (
                SELECT henb_id, severity FROM HeMS_Device, v_severity
                WHERE henb_id between 1 and ${TOTAL_ENB_CNT}
            ) b on a.henb_id=b.henb_id AND a.severity=b.severity
            union all (
                SELECT a.henb_id, 'State' param_name, a.parameter_value param_value FROM HeMS_Device_Param a, HeMS_Parameter b
                WHERE a.henb_id between 1 and ${TOTAL_ENB_CNT}
                AND b.parameter_name = 'InternetGatewayDevice.Services.FAPService.1.FAPControl.LTE.X_VENDOR_BB_STATE'
                AND a.parameter_id = b.parameter_id
                ORDER BY 1, 2
            )
            union all (
                SELECT a.henb_id, 'AlarmCode' as param_name, a.alarm_code as param_value FROM HeMS_Current_Alarm a
                WHERE a.alarm_code = 40101 and a.henb_id between 1 and ${TOTAL_ENB_CNT}
                ORDER BY 1, 2
            )
            union all (
                SELECT a.henb_id, 'AreaCode' as param_name, a.main_area as param_value FROM HeMS_Device a
                WHERE a.henb_id between 1 and ${TOTAL_ENB_CNT}
                ORDER BY 1, 2
            )
        ) c
        GROUP BY c.henb_id;
        SELECT area_info FROM HeMS_User WHERE user_id = 'admin';

        SELECT DISTINCT main_area FROM v_area
        WHERE main_area_code <> "";`;

    let retVal = {
        success: false,
        supervisor: null,
        henb_cnt: 0,
        henb: [],
        areas: []
    }

    // getting Area List from the DB
    eudbEx.runQuery(queryStr,
        () => { // finally
            res.json(retVal);
        },
        (rows) => { // success
            if (rows.length > 0) {
                // console.log(">>[SQL RESULT] Querying was successful");
                retVal.success = true;

                let id, state, alarm;
                rows[0].forEach(row => {
                    id = row.henb_id || null;
                    state = null, alarm = null;


                    if (row.code != null && row.code == 40101) { // check link fail
                        state = "linkfail";
                    } else {
                        // check state
                        if (row.state == "2") { // INS
                            state = "ins";
                        } else if (row.state == "1" || row.state == "0") { // OOS
                            state = "oos";
                        } else {
                            console.error(`Unknown state of the eNB, state =`, row.state);
                        }

                        // check alarm
                        if (row.critical > "0") {
                            alarm = "cri";
                        } else if (row.major > "0") {
                            alarm = "maj";
                        } else if (row.minor > "0") {
                            alarm = "min";
                        }
                    }

                    retVal.henb.push({
                        id: id,
                        state: state,
                        alarm: alarm,
                        area: row.area
                    });
                });
                retVal.henb_cnt = rows[0].length;

                let supervisor = commVar.getInstance().get("area_supervisor");
                if (supervisor) {
                    retVal.supervisor = supervisor;
                } else {
                    retVal.supervisor = rows[1][0].area_info;
                    commVar.getInstance().set("area_supervisor", rows[1][0].area_info);
                }

                retVal.areas = commUtil.getValues(rows[2], "main_area");
            } else {
                // console.log(">>[SQL RESULT] Querying failed");
            }
        },
        (err) => { // failure
            console.error(`${err.message}\n` + err.stack);
        });
} */

exports.getAreaList = function (req, res, pool) {
    console.log(`IN> getAreaList()`);
    res.json(getAreaListData());
}

exports.getAlarmBoardData = function (req, res) {
    console.log(`IN> getAlarmBoardData()`);
    getAlarmBoardWholeData(req.body.area)
        .then(result => {
            res.json(result);
        });
}

exports.getEnbInfoData = function (req, res) {
    // console.log(`IN> getEnbInfoData()`);

    let id = req.body.enb;
    let area = (!id || id == "0") ? req.body.area : null;

    enbAct.getEnbInfoDataFromDB(id, area)
        .then(result => {
            res.json(result);
        });
}