/* Below is General Definition ================================================================= */
const fs = require("fs");

const moment = require("moment");

const commVar = require("./common_var");
const commUtil = require("./common_util");
const eudbEx = require("./eu_mysqlEx")();
const csUtil = require("./common_server_util");

// const langPack = commVar.getInstance().get("langPack"); // 서버 시작할 때 설정된 언어코드를 사용할 때

/* for the fault db function */

/**
 * changed Date format to UTC offset 0
 */
function renderingDateFormatOnHistory(data) {
    return (!data || data == "") ? "" : moment(data).format("YYYY-MM-DD HH:mm:ss");
    // return (!data || data == "") ? "" : moment(data).utcOffset(0).format("YYYY-MM-DD HH:mm:ss"); // UTC -> Default(KST) 로 변경 후 utcOffset(0) 옵션 삭제
}

/**
 * get the item List of limited item count per a page of Event History.
 */
exports.getEventHistoryList = function(req, res, pool, serverType) {
    console.log(`IN> getEventHistoryList(serverType: ${serverType})`);

    let columns = req.body.columns;
    let order = req.body.order;
    let start = parseInt(req.body.start);
    let length = parseInt(req.body.length);
    let search = req.body.search;

    // use single mode type
    let enbWhere = serverType == 1 ? `(henb_id=1) AND ` : "",
        searchWhere = `(henb_id like '%${search.value}%' OR event_code_name like '%${search.value}%')`;

    let whereClause = `${enbWhere}${searchWhere}`;

    let ORDER_BY_PHRASE = commUtil.makeOrderPhrase(order, columns);
    var queryStr = `SELECT * FROM HeMS_Event_History
        WHERE ${whereClause}
        ORDER BY ${ORDER_BY_PHRASE} LIMIT ${start},${length};

        SELECT count(*) as count FROM HeMS_Event_History
        WHERE ${whereClause};`;

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
        }
    );
};

/**
 * get the item List of whole item of Event History.
 */
exports.getEventHistoryWholeData = function(req, res, pool) {
    console.log(`IN> getEventHistoryWholeData(), url:` + req.originalUrl);

    let search = req.query.search ? req.query.search : "";
    console.log(`searchText =`, search);

    const searchWhere = `(henb_id like '%${search}%' OR event_code_name like '%${search}%')`;

    const queryStr = `SELECT * FROM HeMS_Event_History
        WHERE ${searchWhere}
        ORDER BY event_history_no desc`;

    /* REVIEW: always get the whole data
    const queryStr = `SELECT * FROM HeMS_Event_History
        ORDER BY event_history_no desc`; */

    // fixed TTA #11 #12
    // const langPack = commVar.getInstance().get("fullLangPack")[req.session.lang]; // 유저별로 다르게 설정할 때
    // const colNames = ["NO","eNB ID","Type","Code","Name","Time"];
    // let data = csUtil.translateNames(langPack, colNames);
    const colNames = ["NO","eNB ID","Type","Code","Name","Time"];
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
                    data = `"${row.event_history_no}","${row.henb_id}","${row.event_type}","${row.event_code}","${row.event_code_name}","${renderingDateFormatOnHistory(row.event_time)}"\n`;
                    res.write(data);
                });
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
                // throw new Error(`Not Found!!!`);
            }
        }
    );
};

/**
 * get the item List of limited item count per a page of CLI History.
 */
exports.getCliHistoryList = function(req, res, pool, serverType) {
    console.log(`IN> getCliHistoryList(serverType: ${serverType})`);

    let columns = req.body.columns;
    let order = req.body.order;
    let start = parseInt(req.body.start);
    let length = parseInt(req.body.length);
    let search = req.body.search;

    // use single mode type
    let enbWhere = serverType == 1 ? `(henb_id=1) AND ` : "",
        searchWhere = `(henb_id like '%${search.value}%' OR command_alias like '%${search.value}%' OR user_id like '%${search.value}%')`;

    let whereClause = `${enbWhere}${searchWhere}`;

    let ORDER_BY_PHRASE = commUtil.makeOrderPhrase(order, columns);
    var queryStr = `SELECT * FROM HeMS_Command_History
        WHERE ${whereClause}
        ORDER BY ${ORDER_BY_PHRASE} LIMIT ${start},${length};

        SELECT count(*) as count FROM HeMS_Command_History
        WHERE ${whereClause};`;

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
        }
    );
};

/**
 * get the item List of whole item of CLI History.
 */
exports.getCliHistoryWholeData = function(req, res, pool) {
    console.log(`IN> getCliHistoryWholeData(), url:` + req.originalUrl);

    let search = req.query.search ? req.query.search : "";
    console.log(`searchText =`, search);

    const searchWhere = `(henb_id like '%${search}%' OR command_alias like '%${search}%')`;

    const queryStr = `SELECT * FROM HeMS_Command_History
        WHERE ${searchWhere}
        ORDER BY command_history_no desc`;

    /* REVIEW: always get the whole data
    const queryStr = `SELECT * FROM HeMS_Command_History
        ORDER BY command_history_no desc`; */

    // fixed TTA #11 #12
    // const langPack = commVar.getInstance().get("fullLangPack")[req.session.lang]; // 유저별로 다르게 설정할 때
    // const colNames = ["NO","Code","Name","User ID","User IPAddress","eNB ID","Request Time","Response Time","Result","Fail Reason"];
    // let data = csUtil.translateNames(langPack, colNames);
    const colNames = ["NO","Code","Name","User ID","User IPAddress","eNB ID","Request Time","Response Time","Result","Fail Reason"];
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
                    data = `"${row.command_history_no}","${row.command_id}","${row.command_alias}","${row.user_id}","${row.user_ip}","${row.henb_id}","${renderingDateFormatOnHistory(row.request_time)}","${renderingDateFormatOnHistory(row.response_time)}","${row.result}","${row.fail_reason}"\n`;
                    res.write(data);
                });
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
                // throw new Error(`Not Found!!!`);
            }
        }
    );
};

/**
 * get the item List of limited item count per a page of Login History.
 */
exports.getLoginHistoryList = function(req, res, pool) {
    console.log(`IN> getLoginHistoryList()`);

    let columns = req.body.columns;
    let order = req.body.order;
    let start = parseInt(req.body.start);
    let length = parseInt(req.body.length);
    let search = req.body.search;

    // use single mode type
    let searchWhere = `(user_id like '%${search.value}%' OR user_ip_address like '%${search.value}%' OR event_type like '%${search.value}%')`;

    let ORDER_BY_PHRASE = commUtil.makeOrderPhrase(order, columns);
    var queryStr = `SELECT * FROM HeMS_Login_History
        WHERE ${searchWhere}
        ORDER BY ${ORDER_BY_PHRASE} LIMIT ${start},${length};

        SELECT count(*) as count FROM HeMS_Login_History
        WHERE ${searchWhere};`;

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
        }
    );
};

/**
 * get the item List of whole item of Login History.
 */
exports.getLoginHistoryWholeData = function(req, res, pool) {
    console.log(`IN> getLoginHistoryWholeData(), url:` + req.originalUrl);

    let search = req.query.search ? req.query.search : "";
    console.log(`searchText =`, search);

    const searchWhere = `(user_id like '%${search}%' OR user_ip_address like '%${search}%' OR event_type like '%${search}%')`;

    const queryStr = `SELECT * FROM HeMS_Login_History
        WHERE ${searchWhere}
        ORDER BY login_history_no desc`;

    /* REVIEW: always get the whole data
    const queryStr = `SELECT * FROM HeMS_Login_History
        ORDER BY login_history_no desc`; */

    // fixed TTA #11 #12
    // const langPack = commVar.getInstance().get("fullLangPack")[req.session.lang]; // 유저별로 다르게 설정할 때
    // const colNames = ["NO","User ID","User IPAddress","Type","Event Time"];
    // let data = csUtil.translateNames(langPack, colNames);
    const colNames = ["NO","User ID","User IPAddress","Type","Event Time"];
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
                    data = `"${row.login_history_no}","${row.user_id}","${row.user_ip_address}","${row.event_type}","${renderingDateFormatOnHistory(row.event_datetime)}"\n`;
                    res.write(data);
                });
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
                // throw new Error(`Not Found!!!`);
            }
        }
    );
};

/**
 * get the item List of limited item count per a page of eNB History.
 */
exports.getEnbHistoryList = function(req, res, pool, serverType) {
    console.log(`IN> getEnbHistoryList(serverType: ${serverType})`);

    let columns = req.body.columns;
    let order = req.body.order;
    let start = parseInt(req.body.start);
    let length = parseInt(req.body.length);
    let search = req.body.search;

    // use single mode type
    let enbWhere = serverType == 1 ? `(henb_id=1) AND ` : "",
        searchWhere = `(henb_id like '%${search.value}%' OR serial_number like '%${search.value}%' OR oui like '%${search.value}%' OR henb_name like '%${search.value}%' OR operation_flag like '%${search.value}%' OR operation_user_id like '%${search.value}%')`;

    let whereClause = `${enbWhere}${searchWhere}`;

    let ORDER_BY_PHRASE = commUtil.makeOrderPhrase(order, columns);
    var queryStr = `SELECT device_history_no, henb_id, serial_number, oui, henb_name, operation_flag, operation_time, operation_user_id FROM HeMS_Device_History
        WHERE ${whereClause}
        ORDER BY ${ORDER_BY_PHRASE} LIMIT ${start},${length};

        SELECT count(*) as count FROM HeMS_Device_History
        WHERE ${whereClause};`;

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
        }
    );
};

/**
 * get the item List of whole item of eNB History.
 */
exports.getEnbHistoryWholeData = function(req, res, pool) {
    console.log(`IN> getEnbHistoryWholeData(), url:` + req.originalUrl);

    let search = req.query.search ? req.query.search : "";
    console.log(`searchText =`, search);

    const searchWhere = `(henb_id like '%${search}%' OR serial_number like '%${search}%' OR oui like '%${search}%' OR henb_name like '%${search}%' OR operation_flag like '%${search}%' OR operation_user_id like '%${search}%')`;

    const queryStr = `SELECT * FROM HeMS_Device_History
        WHERE ${searchWhere}
        ORDER BY device_history_no desc`;

    /* REVIEW: always get the whole data
    const queryStr = `SELECT * FROM HeMS_Device_History
        ORDER BY device_history_no desc`; */

    // fixed TTA #11 #12
    // const langPack = commVar.getInstance().get("fullLangPack")[req.session.lang]; // 유저별로 다르게 설정할 때
    // const colNames = ["NO","eNB ID","Serial Number","OUI","eNB Name","Operation","Operation Time","Operator"];
    // let data = csUtil.translateNames(langPack, colNames);
    const colNames = ["NO","eNB ID","Serial Number","OUI","eNB Name","Operation","Operation Time","Operator"];
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
                    data = `"${row.device_history_no}","${row.henb_id}","${row.serial_number}","${row.oui}","${row.henb_name}","${row.operation_flag}","${renderingDateFormatOnHistory(row.operation_time)}","${row.operation_user_id}"\n`;
                    res.write(data);
                });
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
                // throw new Error(`Not Found!!!`);
            }
        }
    );
};

/**
 * show the detailed view of the Event item when the list item was double-clicked
 */
exports.showEventDetailedView = function(req, res) {
    console.log(`IN> showEventDetailedView()`);

    var filePath = req.body.event_logfile_name;
    var headStr = req.body.event_head_str;
    var buffer = new Buffer(100 * 1024);
    var jsonBuf = new Buffer(100 * 1024);
    jsonBuf = "";
    console.log(`filePath(${filePath}), headStr =`, headStr);

    fs.open(filePath, "r", function(err, fd) {
        if (err) {
            if (err.code === "ENOENT") {
                console.error("myfile does not exist");
                return;
            } else {
                throw err;
            }
        }

        fs.fstat(fd, function(err, stats) {
            console.log(`file size =`, stats.size);

            fs.read(fd, buffer, 0, buffer.length, 0, function(err, len, buf) {
                console.log(buf.toString("utf8", 0, len));
                jsonBuf = jsonBuf + buf.toString("utf8", 0, len);

                console.log("jsonBuf:" + jsonBuf);
                console.log("headStr:" + headStr);
                var json = {
                    data: jsonBuf,
                    filePath: filePath,
                    headStr: headStr
                };
                res.json(json);
            });
            fs.close(fd);
        });
    });
};

/**
 * show the detailed view of the CLI item when the list item was double-clicked
 */
exports.showCliDetailedView = function(req, res) {
    console.log(`IN> showCliDetailedView()`);

    var filePath = req.body.command_logfile_name;
    var headStr = req.body.command_head_str;
    var buffer = new Buffer(100 * 1024);
    var jsonBuf = new Buffer(100 * 1024);
    jsonBuf = "";
    console.log(`filePath(${filePath}), headStr =`, headStr);

    fs.open(filePath, "r", function(err, fd) {
        if (err) {
            if (err.code === "ENOENT") {
                console.error("myfile does not exist");
                return;
            } else {
                throw err;
            }
        }

        fs.fstat(fd, function(err, stats) {
            console.log(`file size =`, stats.size);

            fs.read(fd, buffer, 0, buffer.length, 0, function(err, len, buf) {
                console.log(buf.toString("utf8", 0, len));
                jsonBuf = jsonBuf + buf.toString("utf8", 0, len);

                console.log("jsonBuf:" + jsonBuf);
                console.log("headStr:" + headStr);
                var json = {
                    data: jsonBuf,
                    filePath: filePath,
                    headStr: headStr
                };
                res.json(json);
            });
            fs.close(fd);
        });
    });
};

exports.setLoginHistory = function(sess, type, isLog = true) {
    console.log(`IN> setLoginHistory(type: ${type}), UserID:`, sess.user);

    let now = moment().format();
    // console.debug(`Current Time:`, now);
    let queryStr = `INSERT INTO HeMS_Login_History SET user_id='${sess.user}', user_ip_address='${sess.clientIp}', hems_id=1, event_type='${type}',event_datetime='${now}'`;

    let cbCommit = function(rows) {
        // console.log(">>[SQL RESULT] Request was Done!!!");
    };

    let cbRollback = function(err) {
        // console.log(">>[SQL RESULT] Request was rollback!!!");
    };

    let tasks = [
        function (rows) {
            // Transaction #1 result
            if (type == "Login") {
                // Login Status
                return `UPDATE HeMS_User SET user_status=1, login_time='${now}', client_ip='${sess.clientIp}' WHERE user_id='${sess.user}'`;
            } else {
                // Logout or Socket Closed Status
                return `UPDATE HeMS_User SET user_status=0, client_ip='' WHERE user_id='${sess.user}'`;
            }
        },
        function (rows) {
            // Transaction #2 result
        }
    ];

    eudbEx.beginTs(cbCommit, cbRollback, queryStr, tasks, isLog);
}