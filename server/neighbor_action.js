/* Below is General Definition ================================================================= */
const commUtil = require("./common_util");
const cliList = require("./cli_server_data");
// const moment = require("moment");
// const async = require("async");

const CLI_LTE = cliList.getCliItem("DIS_NGBRLTE_CELL");
const CLI_CDMA = cliList.getCliItem("DIS_NGBRLTE_ITRATCDMA");
const CLI_UMTS = cliList.getCliItem("DIS_NGBRLTE_IRATUMTS");
const CLI_GSM = cliList.getCliItem("DIS_NGBRLTE_IRATGSM");

let neighborObjName = [{
    type: "LTE",
    disCmd: (CLI_LTE) ? CLI_LTE.name : "DIS_NGBRLTE_CELL",
    objName: (CLI_LTE) ? CLI_LTE.object_name : "InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.NeighborList.LTECell."
}, {
    type: "CDMA",
    disCmd: (CLI_CDMA) ? CLI_CDMA.name : "DIS_NGBRLTE_ITRATCDMA",
    objName: (CLI_CDMA) ? CLI_CDMA.object_name : "InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.NeighborList.InterRATCell.CDMA2000."
}, {
    type: "UMTS",
    disCmd: (CLI_UMTS) ? CLI_UMTS.name : "DIS_NGBRLTE_IRATUMTS",
    objName: (CLI_UMTS) ? CLI_UMTS.object_name : "InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.NeighborList.InterRATCell.UMTS."
}, {
    type: "GSM",
    disCmd: (CLI_GSM) ? CLI_GSM.name : "DIS_NGBRLTE_IRATGSM",
    objName: (CLI_GSM) ? CLI_GSM.object_name : "InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.NeighborList.InterRATCell.GSM."
}];
// console.log(`neighborObjName =`, neighborObjName);

/* Below is Export Function ================================================================= */
/**
 * get neighbor list
 * @param {object} req The request from Client.
 * @param {object} res The response to Client.
 * @param {object} pool The DB pool.
 */
exports.getNeighborListAction = function (req, res, pool) {
    console.log(`IN> getNeighborListAction()`);

    let enbId = req.body.enbId;
    let type = req.body.type;
    console.log(`Received data, enbId: ${enbId}, type: ${type}`);

    var retJson = {
        type: false,
        draw: 0,
        recordsTotal: 0,
        recordsFiltered: 0,
        data: []
    };

    let objName;
    for (let obj of neighborObjName) {
        if (type === obj.type) {
            objName = obj.objName;
            break;
        }
    }
    console.log(`Type(${type}), objName =`, objName);

    if (!objName) {
        console.error(`[ERROR] Unknown type(${type}), return back!!!`);
        res.json(retJson);
        return;
    }

    let query = `SELECT x.parameter_name, x.parameter_value
        FROM (
            SELECT a.parameter_id, a.parameter_name,
                CASE WHEN a.isenum=1 AND a.islist=0 THEN
                    el.enum_string
                ELSE
                    b.parameter_value
                END parameter_value
            FROM HeMS_Parameter a
                LEFT JOIN HeMS_Device_Param b ON a.parameter_id=b.parameter_id
                LEFT JOIN HeMS_Parameter_Enum_Lst el ON a.enum_group_no=el.enum_group_no
                    AND ((a.enum_group_value_type=0 AND b.parameter_value=el.enum_value) OR (a.enum_group_value_type=1 AND b.parameter_value=el.enum_string))
            WHERE b.henb_id=${enbId}
                AND a.parameter_name like "${objName}%"
            ORDER BY a.object_id, a.parameter_id
        ) x`;

    if (pool) {
        // get connection poll
        pool.getConnection(function (err, conn) {
            if (err) {
                console.log("getConnection err");
                conn.release(); //must release
                return;
            }
            console.log("DB thread ID :" + conn.threadId);

            var exec = conn.query(query, function (err, rows) {
                conn.release(); //must release
                console.debug("$$[EXEC SQL] : " + exec.sql);
                if (err) {
                    console.error(`>>[SQL ERROR] err:`, err.message);
                    res.json(retJson);
                    return;
                }

                if (rows && rows.length > 0) {
                    // console.log(`>>[SQL RESULT] Result row counts = ${rows.length}`);

                    var list = [];
                    let curIndex = 1;
                    let paramObj = {};

                    paramObj["Index"] = curIndex + "";

                    rows.forEach(function (row) {
                        let params = row.parameter_name.split(".");
                        let paramIndex = params[params.length - 2];
                        let paramName = params[params.length - 1];

                        if (curIndex == paramIndex) {
                            paramObj[paramName + ""] = row.parameter_value;
                        } else {
                            list.push(paramObj);
                            paramObj = {};
                            curIndex = +paramIndex;
                            paramObj["Index"] = curIndex + "";
                            paramObj[paramName + ""] = row.parameter_value;
                        }
                    });
                    list.push(paramObj);
                    // console.log(`>>[SQL RESULT] Result list cnt = ${list.length}`);
                    // console.log(`list(cnt: ${list.length}, param_cnt: ${list[0].length}) =`, list);

                    retJson.type = true;
                    retJson.draw = 1;
                    retJson.recordsTotal = list.length;
                    retJson.recordsFiltered = list.length;
                    retJson.data = list;
                } else {
                    // console.log(">>[SQL RESULT] Empty result");
                }

                res.json(retJson);
            });
        });
    }
};

/**
 * set neighbor list
 * @param {object} req The request from Client.
 * @param {object} res The response to Client.
 * @param {object} pool The DB pool.
 */
exports.setNeighborListAction = function (req, res, pool) {
    console.log(`IN> setNeighborListAction(), henbid: ${req.body.henb_id}, nei_type: ${req.body.nei_type}, index: ${req.body.index}`);

    var param_name = [];
    var param_value = [];

    for (let name in req.body) {
        if (name == "henb_id" || name == "nei_type" || name == "index") {
            console.log("name:" + name);
            continue;
        }
        param_name.push(name);
        param_value.push(req.body[name]);
    }
    // console.dir(param_name);
    // console.dir(param_value);
    console.log("length:" + param_name.length);

    var id = req.body.henb_id;
    var nei_type = req.body.nei_type;
    var index = req.body.index;
    var nei_name = "InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.NeighborList.LTECell." + index + ".";
    if (nei_type == "1") nei_name = "InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.NeighborList.InterRATCell.CDMA2000." + index + ".";
    var cnt = param_name.length;
    // var reg_date = moment().format();

    var result = {
        henbid: "",
        result: {
            code: 1,
            string: "OK"
        }
    };
    result.henbid = id;

    var queryText = "UPDATE HeMS_Device_Param a, HeMS_Parameter b SET a.parameter_value = CASE";
    for (let i = 0; i < cnt; i++) {
        queryText = queryText + " WHEN b.parameter_name = '" + nei_name + param_name[i] + "' THEN '" + param_value[i] + "'";
    }
    queryText = queryText + " END WHERE a.parameter_id = b.parameter_id AND a.henb_id = '" + id + "' AND b.parameter_name in (";
    for (let i = 0; i < cnt; i++) {
        if (i == cnt - 1) queryText = queryText + "'" + nei_name + param_name[i] + "');";
        else queryText = queryText + "'" + nei_name + param_name[i] + "',";
    }

    console.log(queryText);

    if (pool) {
        // get connection poll
        pool.getConnection(function(err, conn) {
            if (err) {
                console.log("getConnection err");
                conn.release(); //must release
                return;
            }
            console.log("DB thread ID :" + conn.threadId);

            var exec = conn.query(
                queryText,

                function(err, rows) {
                    conn.release(); //must release
                    console.debug("$$[EXEC SQL] : " + exec.sql);

                    if (err) {
                        result.result.code = 0;
                        result.result.string = "eNB " + id + " sql error code=" + err.code + ",errno=" + err.errno;
                        console.log(result.result.string);
                        res.json(result);
                        res.end();
                        return;
                        //throw err;
                    }

                    //console.dir(rows);

                    if (rows.affectedRows > 0) {
                        result.result.code = 1;
                        // console.log(">>[SQL RESULT] ", result.result.string);
                    } else {
                        result.result.code = 0;
                        result.result.string = "eNB (" + id + ") Not Found Parameter (" + name + ")";
                        // console.log(">>[SQL RESULT] ", result.result.string);
                    }
                    res.json(result);
                    res.end();
                }
            );
        });
    }
};

/**
 * update the changed neighbor list
 * @param {object} req The request from Client.
 * @param {object} res The response to Client.
 * @param {object} pool The DB pool.
 */
exports.handleApplyChangedNeighborAction = function (req, res, pool) {
    console.log(`IN> handleApplyChangedNeighborAction()`);

    let enbId = req.body.enbId;
    let type = req.body.type;
    let rowData = req.body.rowData;

    let retVal = {
        result: false,
        draw: 0,
        message: "",
        data: null
    };

    let selObj, objName;
    for (let obj of neighborObjName) {
        if (type === obj.type) {
            selObj = obj;
            objName = obj.objName;
            break;
        }
    }
    console.log(`Type(${type}), objName =`, objName);

    if (!selObj || !objName) {
        console.error(`[ERROR] Unknown type(${type}), return back!!!`);
        retVal.message = `[ERROR] Unknown type(${type}), return back!!!`;
        retVal.data = null;
        res.json(retVal);
        res.end();
        return;
    }

    let obj = cliList.getCliItem(selObj.disCmd);
    let params = obj.para;
    let aliases = commUtil.getValues(params, "alias"); // automatically make a array of the param name
    aliases.splice(1, 0, "Alias"); // manually add 'Alias' param name because there is no the param in the cli_data
    console.log(`aliases =`, aliases);

    let setPhrase = "";

    rowData.forEach(function (row, cnt) {
        // let params = Object.keys(row);
        let index = row["Index"];

        if (cnt > 0) setPhrase += "\n\n"; //"&#10;";
        aliases.forEach(function (name, i) {
            setPhrase += `WHEN b.parameter_name = "${objName}${index}.${name}" THEN "${row[name]}"`;
            if ((i + 1) < aliases.length) setPhrase += "\n"; //"&#10;";
        });
    });
    console.log(`setPhrase =`, setPhrase);

    let query = `UPDATE HeMS_Device_Param a, HeMS_Parameter b
        SET a.parameter_value=
        CASE
            ${setPhrase}
        ELSE
            a.parameter_value
        END
        WHERE a.parameter_id=b.parameter_id
            AND a.henb_id=${enbId}
            AND b.parameter_name like "${objName}%"`;
    /* let query = `UPDATE HeMS_Device_Param a, HeMS_Parameter b
        SET a.parameter_value=
        CASE
            ${setPhrase}
        ELSE
            a.parameter_value
        END
        WHERE a.parameter_id=b.parameter_id
            AND a.henb_id=${enbId}
            AND (b.parameter_name like "${OBJ_NAME_LTECell}%"
                OR b.parameter_name like "${OBJ_NAME_InterRATCell_CDMA2000}%")`; */

    if (pool) {
        // get connection poll
        pool.getConnection(function (err, conn) {
            if (err) {
                console.log("getConnection err");
                conn.release(); //must release
                return;
            }
            console.log("DB thread ID :" + conn.threadId);

            var exec = conn.query(query, function (err, rows) {
                conn.release(); //must release
                console.debug("$$[EXEC SQL] : " + exec.sql);
                if (err) {
                    console.log(`>>[SQL err] = `, err);
                    retVal.message = err.message;
                    retVal.data = err;
                    res.json(retVal);
                    res.end();
                    return;
                }

                if (rows.affectedRows && rows.affectedRows > 0) {
                    // console.log(`>>[SQL RESULT] result len = ${rows.affectedRows}`);
                    retVal.result = true;
                } else {
                    // console.log(">>[SQL RESULT] Wrong result");
                }

                console.log(`rows = `, rows);
                retVal.draw = 1;
                retVal.message = `Apply action is done, the page will be reloaded.`;
                retVal.data = rows;
                res.json(retVal);
                res.end();
            });
        });
    }
};