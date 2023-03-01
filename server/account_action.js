/* Below is General Definition ================================================================= */
// const moment = require("moment");

const commUtil = require("./common_util");
const commVar = require("./common_var");
const eudbEx = require("./eu_mysqlEx")();
const csUtil = require("./common_server_util");

/* Below is Export Function ================================================================= */
/**
 * get items of Account List.
 */
exports.getUserAccountList = function(req, res, pool) {
    console.log("IN> getUserAccountList()");

    var columns = req.body.columns;
    var order = req.body.order;
    var search = req.body.search;

    let ORDER_BY_PHRASE = commUtil.makeOrderPhrase(order, columns);
    let queryStr = `SELECT * FROM HeMS_User
        WHERE user_id like '%${search.value}%' OR user_name like '%${search.value}%'
        ORDER BY ${ORDER_BY_PHRASE};

        SELECT count(*) as count FROM HeMS_User
        WHERE user_id like '%${search.value}%' OR user_name like '%${search.value}%';`;

    let retVal = {
        success: false,
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
                // console.log(`>>[SQL RESULT] Querying was successful!`);
                retVal.success = true;
                retVal.draw = req.body.draw;
                retVal.recordsTotal = rows[1][0].count;
                retVal.recordsFiltered = rows[1][0].count;
                retVal.data = rows[0];
            } else {
                // console.log(`>>[SQL RESULT] Querying failed!`);
            }
        },
        (err) => { // failure
            console.error(`${err.message}\n` + err.stack);
        });
};

exports.handleUserAccoutActionEvent = function(req, res, pool) {
    console.log(`IN> handleUserAccoutActionEvent()`);

    let rowData = req.body.rowData;
    let type = req.body.type;
    console.log(`type(${type}), rowData = `, rowData);

    let salt = "", pwPhrase = ""; // do not updated the password when the value is empty
    if ((type == "EDIT" || type == "ADD" ) && rowData.user_password) {
        salt = csUtil.genSalt(12);
        console.debug(`salt =`, salt);
        pwPhrase = `
        user_password=SHA2('${rowData.user_password + salt}', 256),
        salt='${salt}',`;
    }

    let addQuery = `INSERT INTO HeMS_User SET
        user_id='${rowData.user_id}',
        user_name='${rowData.user_name}',
        ${pwPhrase}
        user_level='${rowData.user_level}',
        regist_date='${rowData.regist_date}',
        updated_date='${rowData.updated_date}',
        email='${rowData.email}',
        phone_no='${rowData.phone_no}',
        area_info='${rowData.area_info || commVar.getInstance().get("area_supervisor")}'`;
    let editQuery = `UPDATE HeMS_User SET
        user_name='${rowData.user_name}',
        ${pwPhrase}
        user_status='${rowData.user_status}',
        user_level='${rowData.user_level}',
        area_info='${rowData.area_info}',
        updated_date='${rowData.updated_date}',
        email='${rowData.email}',
        phone_no='${rowData.phone_no}',
        area_info='${rowData.area_info}'
        WHERE user_id = '${rowData.user_id}'`;
    let delQuery = `DELETE FROM HeMS_User
        WHERE user_id='${rowData.user_id}'`;

    let queryStr = ``;

    switch (type) {
        case "ADD":
            queryStr = addQuery;
            break;
        case "EDIT":
            queryStr = editQuery;
            break;
        case "DEL":
            queryStr = delQuery;
            break;
        default:
            console.log(`Unknown Type(${type})`);
            break;
    }

    let retVal = {
        success: false,
        draw: 0,
        message: "",
        data: []
    };

    eudbEx.runQuery(queryStr,
        () => { // finally
            res.json(retVal);
        },
        (rows) => { // success
            if (rows && rows.affectedRows > 0) {
                // console.log(`>>[SQL RESULT] Querying(${type}) was successful!`);
                retVal.success = true;
                retVal.draw = 1;
                retVal.message = "success";
                retVal.data = rows;
            } else {
                // console.log(`>>[SQL RESULT] Querying(${type}) failed!`);
                retVal.message = `Querying(${type}) failed!`;
            }
        },
        (err) => { // failure
            console.error(`${err.message}\n` + err.stack);
            retVal.message = err.message;
        });
};
/* exports.handleUserAccoutActionEvent = function(req, res, pool) {
    console.log(`IN> handleUserAccoutActionEvent()`);

    let rowData = req.body.rowData;
    let type = req.body.type;
    let bSuccess = false;
    console.log(`type(${type}), rowData = `, rowData);

    let pwPhrase = ""; // do not updated the password when the value is empty
    if (type == "EDIT" && rowData.user_password) {
        pwPhrase = ` user_password=SHA2('${rowData.user_password}', 256),`;
    }

    let addQuery = `INSERT INTO HeMS_User
        VALUES ('${rowData.user_id}', '${rowData.user_name}', SHA2('${rowData.user_password}', 256), '0', '${rowData.user_level}', '${rowData.regist_date}', '${rowData.updated_date}', '${rowData.email}', '${rowData.phone_no}', 'en', NULL, NULL, 1, 0, '${rowData.area_info || commVar.getInstance().get("area_supervisor")}', 0, NULL, NULL)`;
    let editQuery = `UPDATE HeMS_User
        SET user_name='${rowData.user_name}',${pwPhrase} user_status='${rowData.user_status}', user_level='${rowData.user_level}', area_info='${rowData.area_info}', updated_date='${rowData.updated_date}', email='${rowData.email}', phone_no='${rowData.phone_no}'
        WHERE user_id = '${rowData.user_id}'`;
    let delQuery = `DELETE FROM HeMS_User
        WHERE user_id='${rowData.user_id}'`;
    // Not used yet
    // let loginQuery = `UPDATE HeMS_User
    //     SET user_status='${rowData.user_status}'
    //     WHERE user_id='${rowData.user_id}'`;
    // let logoutQuery = `UPDATE HeMS_User
    //     SET user_status='${rowData.user_status}'
    //     WHERE user_id='${rowData.user_id}'`;

    let queryStr = ``;

    switch (type) {
        case "ADD":
            queryStr = addQuery;
            break;
        case "EDIT":
            queryStr = editQuery;
            break;
        case "DEL":
            queryStr = delQuery;
            break;
        // Not used yet
        // case "LOGIN":
        //     queryStr = loginQuery;
        //     break;
        // case "LOGOUT":
        //     queryStr = logoutQuery;
        //     break;

        default:
            console.log(`Unknown Type(${type})`);
            break;
    }

    let retVal = {
        success: false,
        draw: 0,
        message: "",
        data: []
    };

    eudbEx.runQuery(queryStr,
        () => { // finally
            res.json(retVal);
        },
        (rows) => { // success
            if (rows && rows.affectedRows > 0) {
                // console.log(`>>[SQL RESULT] Querying(${type}) was successful!`);
                retVal.success = true;
                retVal.draw = 1;
                retVal.message = "success";
                retVal.data = rows;
            } else {
                // console.log(`>>[SQL RESULT] Querying(${type}) failed!`);
                retVal.message = `Querying(${type}) failed!`;
            }
        },
        (err) => { // failure
            console.error(`${err.message}\n` + err.stack);
            retVal.message = err.message;
        });
}; */

exports.setUserLanguage = function(pool, data) {
    console.log(`IN> setUserLanguage()`);

    let userId = data.user.id;
    let userLang = data.user.lang;
    if (!userId || !userLang) return;

    let queryStr = `UPDATE HeMS_User SET language='${userLang}' WHERE user_id='${userId}'`;

    eudbEx.runQuery(queryStr,
        null,
        (rows) => { // success
            if (rows && rows.affectedRows > 0) {
                // console.log(`>>[SQL RESULT] Querying(${type}) was successful!`);
            } else {
                // console.log(`>>[SQL RESULT] Querying(${type}) failed!`);
            }
        },
        (err) => { // failure
            console.error(`${err.message}\n` + err.stack);
        });
};

exports.getPermitList = function(req, res) {
    console.log("IN> getPermitList()");

    var columns = req.body.columns;
    var order = req.body.order;
    var search = req.body.search;

    let ORDER_BY_PHRASE = commUtil.makeOrderPhrase(order, columns);
    let queryStr = `SELECT * FROM HeMS_Client
        WHERE ip_addr like '%${search.value}%' OR mac_addr like '%${search.value}%' OR memo like '%${search.value}%'
        ORDER BY ${ORDER_BY_PHRASE};

        SELECT count(*) as count FROM HeMS_Client
        WHERE ip_addr like '%${search.value}%' OR mac_addr like '%${search.value}%' OR memo like '%${search.value}%';`;

    let retVal = {
        success: false,
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
                // console.log(`>>[SQL RESULT] Querying was successful!`);
                retVal.success = true;
                retVal.draw = req.body.draw;
                retVal.recordsTotal = rows[1][0].count;
                retVal.recordsFiltered = rows[1][0].count;
                retVal.data = rows[0];
            } else {
                // console.log(`>>[SQL RESULT] Querying failed!`);
            }
        },
        (err) => { // failure
            console.error(`${err.message}\n` + err.stack);
        });
};

exports.handlePermitActionEvent = function(req, res) {
    console.log(`IN> handlePermitActionEvent()`);

    let rowData = req.body.rowData;
    let type = req.body.type;
    console.log(`type(${type}), rowData = `, rowData);

    let addQuery = `INSERT INTO HeMS_Client SET ip_addr='${rowData.ip_addr}', mac_addr='${rowData.mac_addr}', memo='${rowData.memo}'`;
    let editQuery = `UPDATE HeMS_Client SET mac_addr='${rowData.mac_addr}', memo='${rowData.memo}' WHERE ip_addr='${rowData.ip_addr}'`;
    let delQuery = `DELETE FROM HeMS_Client WHERE ip_addr='${rowData.ip_addr}'`;
    // let addQuery = `INSERT INTO HeMS_Client SET ip_addr=HEX(INET6_ATON('${rowData.ip_addr}')), mac_addr='${rowData.mac_addr}', memo='${rowData.memo}'`;
    // let editQuery = `UPDATE HeMS_Client SET ip_addr=HEX(INET6_ATON('${rowData.ip_addr}')), mac_addr='${rowData.mac_addr}', memo='${rowData.memo}'`;
    // let delQuery = `DELETE FROM HeMS_Client WHERE ip_addr=HEX(INET6_ATON('${rowData.ip_addr}'))`;

    let queryStr = ``;

    switch (type) {
        case "ADD":
            queryStr = addQuery;
            break;
        case "EDIT":
            queryStr = editQuery;
            break;
        case "DEL":
            queryStr = delQuery;
            break;
        default:
            console.log(`Unknown Type(${type})`);
            break;
    }

    let retVal = {
        success: false,
        draw: 0,
        message: "",
        data: []
    };

    eudbEx.runQuery(queryStr,
        () => { // finally
            res.json(retVal);
        },
        (rows) => { // success
            if (rows && rows.affectedRows > 0) {
                // console.log(`>>[SQL RESULT] Querying(${type}) was successful!`);
                retVal.success = true;
                retVal.draw = 1;
                retVal.message = "success";
                retVal.data = rows;
            } else {
                // console.log(`>>[SQL RESULT] Querying(${type}) failed!`);
                retVal.message = `Querying(${type}) failed!`;
            }
        },
        (err) => { // failure
            console.error(`${err.message}\n` + err.stack);
            retVal.message = err.message;
        });
};

exports.handleUserAccoutTimeoutEvent = function(req, res) {
    console.log(`IN> handleUserAccoutTimeoutEvent()`);

    let timeout = req.body.timeout;
    // console.debug(`timeout = `, timeout);

    let queryStr = `UPDATE HeMS_Config SET config_value=${timeout} WHERE config_name='WC_timeout'`;

    let retVal = {
        success: false,
        draw: 0,
        message: "",
        data: []
    };

    eudbEx.runQuery(queryStr,
        () => { // finally
            res.json(retVal);
        },
        (rows) => { // success
            if (rows && rows.affectedRows > 0) {
                // console.log(`>>[SQL RESULT] Querying was successful!`);
                retVal.success = true;
                retVal.draw = 1;
                retVal.message = "success";
                retVal.data = rows;

                let conf = commVar.getInstance().get("euConfig");
                conf.webConfig.timeout = timeout;
                // console.debug(`conf`, conf);
                commVar.getInstance().set("euConfig", conf);
                // console.debug(`commVar.getInstance().get("euConfig")`, commVar.getInstance().get("euConfig"));
            } else {
                // console.log(`>>[SQL RESULT] Querying failed!`);
                retVal.message = `Querying failed!`;
            }
        },
        (err) => { // failure
            console.error(`${err.message}\n` + err.stack);
            retVal.message = err.message;
        });
};