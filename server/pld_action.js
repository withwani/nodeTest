/* Below is General Definition ================================================================= */
// const moment = require("moment");

const commUtil = require("./common_util");
// const commVar = require("./common_var");
const eudbEx = require("./eu_mysqlEx")();
const csUtil = require("./common_server_util");

/* Below is Inner Function ================================================================= */

/* Below is Export Function ================================================================= */
exports.getPldTemplateList = function(req, res, pool) {
    console.log("getPldTemplateList");

    let start = parseInt(req.body.start);
    let length = parseInt(req.body.length);
    let search = req.body.search;

    let retVal = {
        success: false,
        draw: 0,
        recordsTotal: 0,
        recordsFiltered: 0,
        data: []
    };

    let queryStr = `SELECT '0' as 'select', henb_id, henb_name, serial_number, regist_date, updated_date FROM HeMS_Device
        WHERE henb_id like '%${search.value}%' OR henb_name like '%${search.value}%' OR serial_number like '%${search.value}%'
        ORDER BY henb_id ASC LIMIT ${start},${length};

        SELECT count(*) as count FROM HeMS_Device
        WHERE henb_id like '%${search.value}%' OR henb_name like '%${search.value}%' OR serial_number like '%${search.value}%';`;

    eudbEx.runQuery(queryStr,
        () => { // finally
            res.json(retVal);
        },
        (rows) => { // success
            if (rows.length > 0) {
                // console.log(`>>[SQL RESULT] Querying was successful!`);
                let templateData = [{
                    select: "0",
                    henb_id: "0",
                    henb_name: "Default Tamplate PLD",
                    serial_number: "-",
                    regist_date: "-",
                    updated_date: "-"
                }];

                rows[0].forEach(row => {
                    row.select = row.henb_id;
                    templateData.push(row);
                });

                retVal.success = true;
                retVal.draw = req.body.draw;
                retVal.recordsTotal = rows[1][0].count;
                retVal.recordsFiltered = rows[1][0].count;
                retVal.data = templateData;
            } else {
                // console.log(`>>[SQL RESULT] Querying failed!`);
            }
        },
        (err) => { // failure
            console.error(`${err.message}\n` + err.stack);
        });
};

exports.getPldList = function(req, res) {
    console.log(`IN> getPldList()`);

    // var draw = req.body.draw;
    let columns = req.body.columns;
    let order = req.body.order;
    let start = parseInt(req.body.start);
    let length = parseInt(req.body.length);
    let search = req.body.search;

    let ids = req.body.ids;
    let params = req.body.params;
    console.debug(`ids`, ids);
    console.debug(`params`, params);

    let idPhrase = (ids && ids.length) ? `AND b.henb_id IN ('${ids.join("', '")}')` : ``;
    let paramPhrase = (params && params.length) ? `AND a.parameter_id IN ('${params.join("', '")}')` : ``;

    const ORDER_BY_PHRASE = (order[0].column == 1) ? `object_id asc, ${commUtil.makeOrderPhrase(order, columns)}` : `${commUtil.makeOrderPhrase(order, columns)}, object_id asc`; // Additionally, sorting by object_id for grouping
    const LENGTH_PHRASE = (length && length > 0) ? ` LIMIT ${start},${length}` : ``;
    let queryStr = ``;

    let retVal = {
        success: false,
        draw: 0,
        recordsTotal: 0,
        recordsFiltered: 0,
        data: []
    };

    if (!ids) {
        res.json(retVal);
        return;
    }

    if (ids.includes("default")) {
        queryStr = `SELECT a.parameter_id, a.object_id, a.parameter_name, "default" as henb_id, a.parameter_type, a.parameter_access, a.value_unit, a.value_range_start, a.value_range_end, a.isPLD, a.parameter_default_value AS parameter_value
            FROM HeMS_Parameter a
            WHERE (a.parameter_type like '%${search.value}%' OR a.parameter_name like '%${search.value}%' OR a.parameter_default_value like '%${search.value}%')
            ${paramPhrase}
            AND a.object_id > 2
            ORDER BY ${ORDER_BY_PHRASE}${LENGTH_PHRASE};

            SELECT count(*) AS count FROM HeMS_Parameter a
            WHERE (a.parameter_type like '%${search.value}%'  OR a.parameter_name like '%${search.value}%' OR a.parameter_default_value like '%${search.value}%')
            ${paramPhrase}
            AND a.object_id > 2;`
    } else {
        if (ids.length) {
            queryStr = `SELECT a.parameter_id, a.object_id, a.parameter_name, b.henb_id, a.parameter_type, a.parameter_access, a.value_unit, a.value_range_start, a.value_range_end, b.isPLD,
                    CASE WHEN a.isenum=1 AND a.islist=0 THEN
                        el.enum_string
                    ELSE
                        b.parameter_value
                    END parameter_value
                FROM HeMS_Parameter a
                    LEFT JOIN HeMS_Device_Param b ON a.parameter_id=b.parameter_id
                    LEFT JOIN HeMS_Parameter_Enum_Lst el ON a.enum_group_no=el.enum_group_no
                        AND ((a.enum_group_value_type=0 AND b.parameter_value=el.enum_value) OR (a.enum_group_value_type=1 AND b.parameter_value=el.enum_string))
                WHERE (a.parameter_type like '%${search.value}%' OR b.henb_id like '%${search.value}%' OR a.parameter_name like '%${search.value}%' OR b.parameter_value like '%${search.value}%')
                    AND a.parameter_id=b.parameter_id
                    ${idPhrase}
                    ${paramPhrase}
                    AND a.object_id > 2
                ORDER BY ${ORDER_BY_PHRASE}${LENGTH_PHRASE};

                SELECT count(*) AS count FROM HeMS_Parameter a, HeMS_Device_Param b
                WHERE (a.parameter_type like '%${search.value}%' OR b.henb_id like '%${search.value}%' OR a.parameter_name like '%${search.value}%' OR b.parameter_value like '%${search.value}%')
                    AND a.parameter_id=b.parameter_id
                    ${idPhrase}
                    ${paramPhrase}
                    AND a.object_id > 2;`
        }
    }

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

exports.getPLDWholeData = function(req, res) {
    console.log(`IN> getPLDWholeData()`);

    let search = req.body.search;
    let type = req.body.type;
    let ids = req.body.ids;
    let params = req.body.params;
    console.debug(`search`, search);
    console.debug(`type`, type);
    console.debug(`ids`, ids);
    console.debug(`params`, params);

    let queryStr = ``;

    if (type == "default") {
        queryStr = `SELECT a.parameter_id, a.object_id, a.parameter_name, "default" as henb_id, a.parameter_type, a.parameter_access, a.value_unit, a.value_range_start, a.value_range_end, a.isPLD, a.parameter_default_value AS parameter_value
            FROM HeMS_Parameter a
            WHERE (a.parameter_type like '%${search}%' OR a.parameter_name like '%${search}%' OR a.parameter_default_value like '%${search}%')
            AND a.object_id > 2
            ORDER BY parameter_id asc, object_id asc;`
    } else {
        if (!ids || !ids.length) {
            res.json({success: false, data: null});
            return;
        }

        let idPhrase = (ids && ids.length) ? `AND b.henb_id IN ('${ids.join("', '")}')` : ``;
        let paramPhrase = (params && params.length) ? `AND a.parameter_id IN ('${params.join("', '")}')` : ``;
        const ORDER_BY_PHRASE = (type === "specific") ? "parameter_id asc, object_id asc" : "parameter_name asc, henb_id asc, object_id asc";


        queryStr = `SELECT a.parameter_id, a.object_id, a.parameter_name, b.henb_id, a.parameter_type, a.parameter_access, a.value_unit, a.value_range_start, a.value_range_end, b.isPLD,
                CASE WHEN a.isenum=1 AND a.islist=0 THEN
                    el.enum_string
                ELSE
                    b.parameter_value
                END parameter_value
            FROM HeMS_Parameter a
                LEFT JOIN HeMS_Device_Param b ON a.parameter_id=b.parameter_id
                LEFT JOIN HeMS_Parameter_Enum_Lst el ON a.enum_group_no=el.enum_group_no
                    AND ((a.enum_group_value_type=0 AND b.parameter_value=el.enum_value) OR (a.enum_group_value_type=1 AND b.parameter_value=el.enum_string))
            WHERE (a.parameter_type like '%${search}%' OR b.henb_id like '%${search}%' OR a.parameter_name like '%${search}%' OR b.parameter_value like '%${search}%')
                AND a.parameter_id=b.parameter_id
                ${idPhrase}
                ${paramPhrase}
                AND a.object_id > 2
            ORDER BY ${ORDER_BY_PHRASE};`
    }

    let retVal = {
        success: false,
        data: []
    };

    eudbEx.runQuery(queryStr,
        () => { // finally
            res.json(retVal);
        },
        (rows) => { // success
            if (rows.length > 0) {
                // console.log(`>>[SQL RESULT] Querying was successful!`);
                // const colNames = ["Parameter Name","eNB ID","Value","Type","Range","Unit","PLD","R/W"];
                const colNames = ["Parameter ID", "Parameter Name","eNB ID","Value","Type","Range","Unit","PLD","R/W"];
                let lines = [csUtil.translateNames(colNames)], temp;
                rows.forEach(row => {
                    // temp = `"${row.parameter_name}","${row.henb_id}","${row.parameter_value}","${row.parameter_type}","${row.value_range_start}~${row.value_range_end}","${row.value_unit}","${row.isPLD}","${row.parameter_access}"\n`;
                    temp = `"${row.parameter_id}","${row.parameter_name}","${row.henb_id}","${row.parameter_value}","${row.parameter_type}","${row.value_range_start}~${row.value_range_end}","${row.value_unit}","${row.isPLD}","${row.parameter_access}"\n`;
                    lines.push(temp);
                });

                retVal.success = true;
                retVal.data = lines;
            } else {
                // console.log(`>>[SQL RESULT] Querying failed!`);
            }
        },
        (err) => { // failure
            console.error(`${err.message}\n` + err.stack);
        });
};

exports.getRegisteredEnb = function(req, res) {
    console.log(`IN> getRegisteredEnb()`);

    let queryStr = `SELECT henb_id FROM HeMS_Device WHERE henb_id between 1 and 1000;`

    let retVal = {
        success: false,
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
                retVal.data = rows;
            } else {
                // console.log(`>>[SQL RESULT] Querying failed!`);
            }
        },
        (err) => { // failure
            console.error(`${err.message}\n` + err.stack);
        });
};

exports.handlePldValue = function(req, res) {
    console.log(`IN> handlePldValue()`);

    let rowData = req.body.rowData;
    let type = req.body.type;
    console.debug(`type(${type}), rowData = `, rowData);

    let enbId = rowData.henb_id;
    let paramId = rowData.parameter_id;
    let paramVal = rowData.parameter_value;

    let temp = rowData.value_range.split("~");
    let valueRangeStart = (temp && temp.length == 2) ? +temp[0] : undefined;
    let valueRangeEnd = (temp && temp.length == 2) ? +temp[1] : undefined;

    let retVal = {
        success: false,
        draw: 0,
        message: "",
        data: []
    };

    if (!Number.isInteger(valueRangeStart) || !Number.isInteger(valueRangeEnd)) {
        retVal.message = `${csUtil.i18n("Invalid Format")} (i.e., 0~127)`;
        retVal.henbid = (enbId && +enbId > 0) ? enbId : 0;
        res.json(retVal);
        return;
    }

    let queryStr = ``;

    if (type === "default") {
        queryStr = `UPDATE HeMS_Parameter SET parameter_default_value='${paramVal}', value_range_start='${valueRangeStart}', value_range_end='${valueRangeEnd}'
            WHERE parameter_id='${paramId}';`;
    } else {
        queryStr = `UPDATE HeMS_Device_Param SET parameter_value='${paramVal}'
            WHERE parameter_id='${paramId}'
            AND henb_id IN (${enbId});
            UPDATE HeMS_Parameter SET value_range_start='${valueRangeStart}', value_range_end='${valueRangeEnd}'
            WHERE parameter_id='${paramId}';`;
    }

    eudbEx.runQuery(queryStr,
        () => { // finally
            retVal.henbid = (enbId && +enbId > 0) ? enbId : 0;
            res.json(retVal);
        },
        (rows) => { // success
            if (rows && (rows.length || rows.affectedRows)) {
                // console.log(`>>[SQL RESULT] Querying was successful!`);
                retVal.success = true;
                retVal.draw = 1;
                retVal.message = "OK";
                retVal.data = rows;
            } else {
                // console.log(`>>[SQL RESULT] Querying failed!`);
                retVal.message = `Not Found Parameter in parameter ID(${paramId}) and eNB ID(${enbId})`;
            }
        },
        (err) => { // failure
            console.error(`${err.message}\n` + err.stack);
        });
};