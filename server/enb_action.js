/* Below is General Definition ================================================================= */
const moment = require("moment");
// const async = require("async");

// const commUtil = require("./common_util");
const commVar = require("./common_var");
const eudbEx = require("./eu_mysqlEx")();

const csUtil = require("./common_server_util");

/* Below is Inner Function ================================================================= */
function updateSpecifiedEnbUsingSocket(io, data) {
    console.log(`IN> updateSpecifiedEnbUsingSocket()`);

    // update main page
    let enbInfo = {};
    enbInfo["henb_cnt"] = data.length;
    enbInfo["henb"] = [];

    data.forEach(enb => {
        enbInfo.henb.push({
            id: enb.id,
            state: enb.state,
            alarm: enb.alarm,
            area: enb.area
        });
    });

    if (io) io.sockets.emit("henbid-status-board", enbInfo);
}
/* function updateSpecifiedEnbUsingSocket(io, enbId, state, alarm, area) {
    console.log(`IN> updateSpecifiedEnbUsingSocket(enbID:${enbId}, state:${state})`);

    // update main page
    let enbInfo = {
        henb_cnt: 1,
        henb: [{
            id: enbId,
            state: state,
            alarm: alarm,
            area: area
        }]
    };
    if (io) io.sockets.emit("henbid-status-board", enbInfo);
} */

function recordDeviceHistory(emsDevice, username, opFlag, cbSuccess, cbFailure) {
    let opTime = (emsDevice.regist_date) ? emsDevice.regist_date : emsDevice.operation_time;

    let queryStr = `INSERT INTO HeMS_Device_History SET henb_id=${emsDevice.henb_id}, hems_id=${emsDevice.hems_id}, serial_number='${emsDevice.serial_number}',
        oui='${emsDevice.oui}', henb_name='${emsDevice.henb_name}', device_type_id=${emsDevice.device_type_id}, operation_flag='${opFlag}', operation_time='${opTime}', operation_user_id='${username}'`;

    eudbEx.runQuery(queryStr,
        null,
        (rows) => { // success
            if (rows.affectedRows > 0) {
                // console.log(">>[SQL RESULT] Success eNB Add History");
                if (cbSuccess) cbSuccess();
            } else {
                // console.log(">>[SQL RESULT] Fail eNB Add History");
                if (cbFailure) cbFailure();
            }
        });
}

/* Below is Export Function ================================================================= */

function getEnbInfoDataFromDB(id, area) {
    console.log(`IN> getEnbInfoDataFromDB(), eNB id(${id}), area(${area})`);

    let queryStr = ``;
    if (area) {
        var areaVal = (area == commVar.getInstance().get("area_supervisor")) ? "" : area;
        queryStr = `SELECT c.parameter_alias, b.parameter_value FROM HeMS_Parameter a, HeMS_Device_Param b, v_henb_info_param_list c
            WHERE b.henb_id=(SELECT min(henb_id) FROM HeMS_Device WHERE main_area like '${areaVal}%')
            AND a.parameter_name IN (SELECT parameter_name FROM v_henb_info_param_list)
            AND a.parameter_id=b.parameter_id
            AND a.parameter_name=c.parameter_name
            UNION ALL SELECT 'HeNB_Name', henb_name FROM HeMS_Device
            WHERE henb_id=(SELECT min(henb_id) FROM HeMS_Device WHERE main_area like '${areaVal}%')
            UNION ALL SELECT 'HeNB_ID', henb_id FROM HeMS_Device
            WHERE henb_id=(SELECT min(henb_id) FROM HeMS_Device WHERE main_area like '${areaVal}%')
            UNION ALL
            SELECT 'NE_ID', ne_id FROM HeMS_Device
            WHERE henb_id=(SELECT min(henb_id) FROM HeMS_Device WHERE main_area like '${areaVal}%')
            UNION ALL
            SELECT 'AREA', main_area FROM HeMS_Device
            WHERE henb_id=(SELECT min(henb_id) FROM HeMS_Device WHERE main_area like '${areaVal}%')
            UNION ALL
            SELECT 'Location_Info', location_info FROM HeMS_Device
            WHERE henb_id=(SELECT min(henb_id) FROM HeMS_Device WHERE main_area like '${areaVal}%')
            UNION ALL
            SELECT 'S1LinkList', parameter_value FROM HeMS_Device_Param
            WHERE henb_id=(SELECT min(henb_id) FROM HeMS_Device WHERE main_area like '${areaVal}%')
            AND parameter_id=(
                SELECT parameter_id FROM HeMS_Parameter
                WHERE parameter_name='InternetGatewayDevice.Services.FAPService.1.FAPControl.LTE.Gateway.S1SigLinkServerList'
            )
            UNION ALL
            SELECT 'EMS_URL', parameter_value FROM HeMS_Device_Param
            WHERE henb_id=(SELECT min(henb_id) FROM HeMS_Device WHERE main_area like '${areaVal}%')
            AND parameter_id=(
                SELECT parameter_id FROM HeMS_Parameter
                WHERE parameter_name='InternetGatewayDevice.ManagementServer.URL'
            )`;

    } else {
        queryStr = `SELECT c.parameter_alias, b.parameter_value FROM HeMS_Parameter a, HeMS_Device_Param b, v_henb_info_param_list c
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
            SELECT 'S1LinkList', parameter_value FROM HeMS_Device_Param
            WHERE henb_id=${id}
            AND parameter_id=(
                SELECT parameter_id FROM HeMS_Parameter
                WHERE parameter_name='InternetGatewayDevice.Services.FAPService.1.FAPControl.LTE.Gateway.S1SigLinkServerList'
            )
            UNION ALL
            SELECT 'EMS_URL', parameter_value FROM HeMS_Device_Param
            WHERE henb_id=${id}
            AND parameter_id=(
                SELECT parameter_id FROM HeMS_Parameter
                WHERE parameter_name='InternetGatewayDevice.ManagementServer.URL'
            );`;
    }

    return new Promise((resolve, reject) => {

        let retVal = {};
        eudbEx.runQuery(queryStr,
            () => { // finally
                resolve(retVal);
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
                if (!area) retVal.HeNB_ID = id;
            },
            (err) => { // failure
                console.error(`${err.message}\n` + err.stack);
                reject(err);
            });
    });
}
exports.getEnbInfoDataFromDB = getEnbInfoDataFromDB;

exports.getEnbInfo = function (req, res, pool, callback) {
    console.log(`IN> getEnbInfo(), eNB id =`, req.query.henbid);

    if (!req.query.henbid) { // when the page is launched without eNB id ...
        console.error(`Undefined eNodeB ID!!!`);
        callback(req, res, null);
        return;
    }

    getEnbInfoDataFromDB(req.query.henbid)
        .then(retVal => {
            callback(req, res, retVal);
        })
        .catch(err => {
            console.log(`err =`, err);
            callback(req, res, null);
        });

}

exports.setEnbAdd = function (req, res) {
    console.log(`IN> setEnbAdd(), eNB ID:`, req.body.HeNB_ID);

    function getInsertParams(obj) {
        const intFields = ["henb_id", "hems_id", "logical_henb_id", "device_type_id", "mgmt_port", "auto_upgrade_flag", "status"];
        let keys = Object.keys(obj);
        let retStr = ``;
        keys.forEach((key, idx) => {
            let value = (intFields.includes(key)) ? `${obj[key]}` : `'${obj[key]}'`;
            retStr += (idx) ? `, ${key}=${value}` : `${key}=${value}`;
        });
        console.debug(`IN> getInsertParams(), retStr =`, retStr);
        return retStr;
    }

    let enbId = req.body.HeNB_ID,
        pldEnbId = req.body.PLD_id,
        regDate = moment().format(),
        emsDevice = {
            henb_id: enbId,
            hems_id: 1,
            ne_id: req.body.NE_ID,
            serial_number: req.body.SN,
            oui: req.body.OUI,
            location_info: req.body.Loc_Info,
            henb_name: req.body.HeNB_Name,
            device_type_id: 1,
            password: "",
            mgmt_ip: "",
            mgmt_port: 0,
            auto_upgrade_flag: 0,
            status: 0,
            main_area: req.body.Area,
            regist_date: regDate
        };
    console.debug(`Query, enbId(${enbId}), pldEnbId(${pldEnbId}), regDate(${regDate}), emsDevice =`, emsDevice);

    let queryStr = `INSERT INTO HeMS_Device SET ${getInsertParams(emsDevice)};`

    let retVal = {
        success: false,
        enbId: enbId,
        message: ``
    };

    let cbCommit = function (rows) {
        retVal.success = true;
        retVal.enbId = enbId;
        recordDeviceHistory(emsDevice, req.session.user, "ADD", function () {
            updateSpecifiedEnbUsingSocket(req.app.io, [{
                id: +enbId,
                name: emsDevice.henb_name,
                state: "oos",
                alarm: null,
                area: emsDevice.main_area
            }]);
            res.json(retVal);
        }, function () {
            updateSpecifiedEnbUsingSocket(req.app.io, [{
                id: +enbId,
                name: emsDevice.henb_name,
                state: "oos",
                alarm: null,
                area: emsDevice.main_area
            }]);
            retVal.message = `Recording the device history of this failed.`;
            res.json(retVal);
        });
    };

    let cbRollback = function (err) {
        retVal.message = (err) ? `${err.message}` : `Request was rollback!!!`;
        res.json(retVal);
    };

    let tasks = [
        function (rows) {
            // Transaction #1 result
            if (rows && rows.hasOwnProperty("affectedRows") && rows.affectedRows) {
                let query = ``;
                if (+pldEnbId) {
                    query = `INSERT INTO HeMS_Device_Param SELECT ${enbId}, parameter_id, parameter_value, isPLD FROM HeMS_Device_Param WHERE henb_id=${pldEnbId};`;
                } else {
                    query = `INSERT INTO HeMS_Device_Param SELECT ${enbId}, parameter_id, parameter_default_value, isPLD FROM HeMS_Parameter;`;
                }
                return query;
            } else {
                throw new Error(`Affected rows is empty!!!`);
            }
        },
        function (rows) {
            // Transaction #2 result
            if (rows && rows.hasOwnProperty("affectedRows") && rows.affectedRows) {
                let query = `UPDATE HeMS_Device_Param a, HeMS_Parameter b SET a.parameter_value=
                    CASE WHEN b.parameter_name = 'InternetGatewayDevice.DeviceInfo.SerialNumber' THEN '${emsDevice.serial_number}'
                        WHEN b.parameter_name = 'InternetGatewayDevice.DeviceInfo.ManufacturerOUI' THEN '${emsDevice.oui}'
                        WHEN b.parameter_name = 'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.Common.CellIdentity' THEN ${req.body.ECI}
                        WHEN b.parameter_name = 'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.EPC.TAC' THEN ${req.body.TAC}
                        WHEN b.parameter_name = 'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.RF.PhyCellID' THEN ${req.body.PCI}
                        WHEN b.parameter_name = 'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.RF.FreqBandIndicator' THEN ${req.body.Freq_Band}
                        WHEN b.parameter_name = 'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.RF.EARFCNUL' THEN ${req.body.EARFCNUL}
                        WHEN b.parameter_name = 'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.RF.EARFCNDL' THEN ${req.body.EARFCNDL}
                        WHEN b.parameter_name = 'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.RF.ULBandwidth' THEN '${req.body.UL_B_width}'
                        WHEN b.parameter_name = 'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.RF.DLBandwidth' THEN '${req.body.DL_B_width}'
                        WHEN b.parameter_name = 'InternetGatewayDevice.Services.FAPService.1.FAPControl.LTE.Gateway.S1SigLinkServerList' THEN '${req.body.S1LinkList}'
                    END
                    WHERE a.parameter_id=b.parameter_id
                    AND a.henb_id=${enbId}
                    AND b.parameter_name in (
                        'InternetGatewayDevice.DeviceInfo.SerialNumber',
                        'InternetGatewayDevice.DeviceInfo.ManufacturerOUI',
                        'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.Common.CellIdentity',
                        'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.EPC.TAC',
                        'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.RF.PhyCellID',
                        'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.RF.FreqBandIndicator',
                        'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.RF.EARFCNUL',
                        'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.RF.EARFCNDL',
                        'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.RF.ULBandwidth',
                        'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.RF.DLBandwidth',
                        'InternetGatewayDevice.Services.FAPService.1.FAPControl.LTE.Gateway.S1SigLinkServerList'
                    );`
                return query;
            } else {
                throw new Error(`Affected rows or rowData is empty!!!`);
            }
        },
        function (rows) {
            // Transaction #3 result
        }
    ];

    eudbEx.beginTs(cbCommit, cbRollback, queryStr, tasks);
};

exports.getCheckParamDuplicate = function (req, res, pool) {
    console.log(`IN> getCheckParamDuplicate()`);

    const switchToDB = {
        "HeNB_ID": "henb_id",
        "HeNB_Name": "henb_name",
        "SN": "serial_number",
        "NE_ID": "ne_id"
    };

    let pName = Object.keys(req.query)[0];
    let pValue = req.query[pName];
    console.log(`Checking pName(${pName}) and pValue(${pValue})`);

    let queryStr,
        retVal = {
            name: pName,
            value: pValue,
            result: {
                code: 0,
                string: null
            }
        };

    // checking error
    if (pName == "HeNB_ID" && (pValue <= 0 || pValue > 10000)) {
        retVal.result.string = "Invalid range. Input[1-10000]";
    } else if (pName == "ECI" && (pValue <= 0 || pValue > 268435455)) {
        retVal.result.string = "Invalid range. Input[1-268435455]";
    }

    // returns a result with error message
    if (retVal.result.string) {
        res.json(retVal);
        return;
    }

    // makes a query string
    if (pName != "ECI") {
        queryStr = `SELECT ${switchToDB[pName]} FROM HeMS_Device WHERE ${switchToDB[pName]}='${pValue}';`;
    } else {
        queryStr = `SELECT c.parameter_alias, b.parameter_value FROM HeMS_Parameter a, HeMS_Device_Param b, v_henb_info_param_list c
            WHERE a.parameter_name IN (
                SELECT parameter_name FROM v_henb_info_param_list
                WHERE parameter_alias='${pName}'
            )
            AND a.parameter_id=b.parameter_id
            AND a.parameter_name=c.parameter_name
            AND b.parameter_value='${pValue}';`;
    }


    eudbEx.runQuery(queryStr,
        () => { // finally
            res.json(retVal);
        },
        (rows) => { // success
            if (rows.length > 0) {
                // console.log(`>>[SQL RESULT] success query, rows.length =`, rows.length);
                retVal.result.string = "It is already in use.(Duplicate)";
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
                // throw new Error(`Not Found!!!`);
                retVal.result.code = 1;
                retVal.result.string = "Can be use.(No duplicate)";
            }
        });
};

exports.checkParamValidation = function (req, res) {
    console.log(`IN> checkParamValidation()`);

    const switchToDB = {
        "HeNB_ID": "henb_id",
        "HeNB_Name": "henb_name",
        "SN": "serial_number",
        "NE_ID": "ne_id"
    };

    let pName = req.body.name;
    let pValue = req.body.value;
    console.log(`Checking pName(${pName}) and pValue(${pValue})`);

    let retVal = {
        success: false,
        message: ``
    };

    if (pName == "HeNB_ID") { // 변경 가능한 기지국 최대값으로 인해 추가된 코드
        let maxCnt = commVar.getInstance().get("totEnbCnt");
        console.log(`MAX eNodeB Count, totEnbCnt =`, maxCnt);

        if (+pValue > maxCnt) {
            retVal.message = csUtil.i18n("$1 must be in an integer range($2)", pName, `1..${maxCnt}`);
            res.json(retVal);
            return;
        }
    }

    let queryStr = ``;
    if (pName != "ECI") {
        queryStr = `SELECT ${switchToDB[pName]} FROM HeMS_Device WHERE ${switchToDB[pName]}='${pValue}';`;
    } else {
        queryStr = `SELECT c.parameter_alias, b.parameter_value FROM HeMS_Parameter a, HeMS_Device_Param b, v_henb_info_param_list c
            WHERE a.parameter_name IN (
                SELECT parameter_name FROM v_henb_info_param_list
                WHERE parameter_alias='${pName}'
            )
            AND a.parameter_id=b.parameter_id
            AND a.parameter_name=c.parameter_name
            AND b.parameter_value='${pValue}';`;
    }

    eudbEx.runQuery(queryStr,
        () => { // finally
            res.json(retVal);
        },
        (rows) => { // success
            if (rows.length > 0) {
                // console.log(`>>[SQL RESULT] success query, rows.length =`, rows.length);
                retVal.message = "It is already in use.(Duplicate)";
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
                retVal.success = true;
                retVal.message = "Can be use.(No duplicate)";
            }
        });
};

exports.setEnbDelete = function (req, res) {
    console.log(`IN> setEnbDelete()`);

    var delDate = moment().format(),
        id = req.body.henbid,
        user = req.session.user;

    let queryStr = `SELECT henb_id, hems_id, serial_number, oui, henb_name, device_type_id, 'DELETE' as operation_flag, '${delDate}' as operation_time, '${user}' as operation_user_id FROM HeMS_Device WHERE henb_id = ${id};

        DELETE HeMS_Device, HeMS_Device_Param, HeMS_Current_Alarm FROM HeMS_Device
        LEFT JOIN HeMS_Device_Param ON HeMS_Device.henb_id = HeMS_Device_Param.henb_id
        LEFT JOIN HeMS_Current_Alarm ON  HeMS_Device.henb_id = HeMS_Current_Alarm.henb_id
        WHERE HeMS_Device.henb_id = ${id};`;

    let retVal = {
        success: false,
        enbId: 0,
        message: ``
    };

    eudbEx.runQuery(queryStr,
        () => { // finally
            res.json(retVal);
        },
        (rows) => { // success
            if (rows[0].length > 0 && rows[1].affectedRows > 0) {
                // console.log(`>>[SQL RESULT] success query.`);
                retVal.success = true;
                retVal.enbId = id;
                recordDeviceHistory(rows[0][0], req.session.user, "DELETE", function () {
                    updateSpecifiedEnbUsingSocket(req.app.io, [{
                        id: +id,
                        name: "-",
                        state: null,
                        alarm: null,
                        area: null
                    }]);
                });
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
                retVal.message = `Not Found!!!`;
            }
        });
};

exports.setEnbMove = function (req, res) {
    console.log(`IN> setEnbMove()`);

    var moveDate = moment().format(),
        from = req.body.from,
        to = req.body.to,
        user = req.session.user;

    let retVal = {
        success: false,
        enbId: 0,
        message: ``
    };

    let queryStr = `SELECT henb_id FROM HeMS_Device
        WHERE henb_id=${to}`;

    let cbCommit = function (rows) {
        retVal.success = true;
        retVal.enbId = to;

        recordDeviceHistory(rows[0], req.session.user, "MOVE", function () {
            res.json(retVal);
        });
    };

    let cbRollback = function (err) {
        retVal.message = (err && err.message) ? `${csUtil.i18n(err.message)}` : `Request was rollback!!!`;
        res.json(retVal);
    };

    let tasks = [
        function (rows) {
            // Transaction #1 result
            if (rows && rows.length) {
                throw new Error(`The position has already an eNodeB!`);
            } else {
                return `UPDATE HeMS_Device SET henb_id=${to} where henb_id=${from};
                    UPDATE HeMS_Device_Param SET henb_id=${to} where henb_id=${from};
                    UPDATE HeMS_Current_Alarm SET henb_id=${to} where henb_id=${from};
                    UPDATE HeMS_Alarm_History SET henb_id=${to} where henb_id=${from};
                    UPDATE HeMS_Event_History SET henb_id=${to} where henb_id=${from};
                    UPDATE HeMS_Command_History SET henb_id=${to} where henb_id=${from};
                    UPDATE HeMS_Device_History SET henb_id=${to} where henb_id=${from};
                    UPDATE HeMS_Stat_AR SET henb_id=${to} where henb_id=${from};
                    UPDATE HeMS_Stat_CD SET henb_id=${to} where henb_id=${from};
                    UPDATE HeMS_Stat_HA SET henb_id=${to} where henb_id=${from};
                    UPDATE HeMS_Stat_HO SET henb_id=${to} where henb_id=${from};
                    UPDATE HeMS_Stat_IH SET henb_id=${to} where henb_id=${from};
                    UPDATE HeMS_Stat_LS SET henb_id=${to} where henb_id=${from};
                    UPDATE HeMS_Stat_PA SET henb_id=${to} where henb_id=${from};
                    UPDATE HeMS_Stat_PD SET henb_id=${to} where henb_id=${from};
                    UPDATE HeMS_Stat_RA SET henb_id=${to} where henb_id=${from};
                    UPDATE HeMS_Stat_RC SET henb_id=${to} where henb_id=${from};
                    UPDATE HeMS_Stat_RD SET henb_id=${to} where henb_id=${from};
                    UPDATE HeMS_Stat_RF SET henb_id=${to} where henb_id=${from};
                    UPDATE HeMS_Stat_RP SET henb_id=${to} where henb_id=${from};
                    UPDATE HeMS_Stat_RR SET henb_id=${to} where henb_id=${from};
                    UPDATE HeMS_Stat_UI SET henb_id=${to} where henb_id=${from};`;
            }
        },
        function (rows) {
            // Transaction #1 result
            if (rows && rows.length) {
                return `SELECT henb_id, hems_id, serial_number, oui, henb_name, device_type_id, 'MOVE' as operation_flag, '${moveDate}' as operation_time, '${user}' as operation_user_id, main_area FROM HeMS_Device WHERE henb_id=${to};`;
            } else {
                throw new Error(`The process of any rows failed!!!`);
            }
        },
        function (rows) {
            // Transaction #2 result
            if (rows && rows.length) {
                //
            } else {
                throw new Error(`Affected rows or rowData is empty!!!`);
            }
        }
    ];

    eudbEx.beginTs(cbCommit, cbRollback, queryStr, tasks);
};

exports.setEnbChange = function (req, res, pool) {
    console.log(`IN> setEnbChange()`);

    let enbId = req.body.HeNB_ID,
        eciVal = req.body.ECI,
        updateDate = moment().format(),
        emsDevice = {
            henb_id: enbId,
            hems_id: 1,
            serial_number: req.body.SN,
            oui: req.body.OUI,
            henb_name: req.body.HeNB_Name,
            device_type_id: 1,
            operation_time: updateDate
        };
    console.log(`Query, enbId(${enbId}), eciVal(${eciVal}), updateDate(${updateDate}), emsDevice =`, emsDevice);

    let queryStr = `SELECT count(*) as count FROM HeMS_Parameter a, HeMS_Device_Param b, v_henb_info_param_list c
        WHERE a.parameter_name IN (
            SELECT parameter_name FROM v_henb_info_param_list
            WHERE parameter_alias='ECI'
        )
        AND a.parameter_id=b.parameter_id
        AND b.henb_id<>${enbId}
        AND a.parameter_name=c.parameter_name
        AND b.parameter_value='${eciVal}';`;

    let retVal = {
        success: false,
        enbId: enbId,
        message: ``
    };

    let cbCommit = function (rows) {
        retVal.success = true;
        retVal.enbId = enbId;
        recordDeviceHistory(emsDevice, req.session.user, "CHANGE", function () {
            res.json(retVal);
        }, function () {
            retVal.message = `Recording the device history of this failed.`;
            res.json(retVal);
        });

        if (req.app.io) req.app.io.sockets.emit("reload-page", {
            id: enbId,
            area: req.body.Area
        });
    };

    let cbRollback = function (err) {
        retVal.message = (err) ? `${err.message}` : `Request was rollback!!!`;
        res.json(retVal);
    };

    let tasks = [
        function (rows) {
            // Transaction #1 result
            if (rows[0].count > 0) {
                // console.log(">>[SQL RESULT] Duplicated.");
                throw new Error("ECI is already in use.(Duplicated)");
            } else {
                return `UPDATE HeMS_Device
                    SET ne_id='${req.body.NE_ID}', henb_name='${req.body.HeNB_Name}', serial_number='${req.body.SN}', oui='${req.body.OUI}', updated_date='${updateDate}', location_info='${req.body.Loc_Info}', main_area='${req.body.Area}'
                    WHERE henb_id='${enbId}';`;
            }
        },
        function (rows) {
            // Transaction #2 result
            if (rows && rows.hasOwnProperty("affectedRows") && rows.affectedRows) {
                let query = `UPDATE HeMS_Device_Param a, HeMS_Parameter b SET a.parameter_value=
                    CASE WHEN b.parameter_name = 'InternetGatewayDevice.DeviceInfo.SerialNumber' THEN '${req.body.SN}'
                        WHEN b.parameter_name = 'InternetGatewayDevice.DeviceInfo.ManufacturerOUI' THEN '${req.body.OUI}'
                        WHEN b.parameter_name = 'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.Common.CellIdentity' THEN ${req.body.ECI}
                        WHEN b.parameter_name = 'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.EPC.TAC' THEN ${req.body.TAC}
                        WHEN b.parameter_name = 'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.RF.PhyCellID' THEN ${req.body.PCI}
                        WHEN b.parameter_name = 'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.RF.FreqBandIndicator' THEN ${req.body.Freq_Band}
                        WHEN b.parameter_name = 'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.RF.EARFCNUL' THEN ${req.body.EARFCNUL}
                        WHEN b.parameter_name = 'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.RF.EARFCNDL' THEN ${req.body.EARFCNDL}
                        WHEN b.parameter_name = 'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.RF.ULBandwidth' THEN '${req.body.UL_B_width}'
                        WHEN b.parameter_name = 'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.RF.DLBandwidth' THEN '${req.body.DL_B_width}'
                        WHEN b.parameter_name = 'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.PHY.PRACH.RootSequenceIndex' THEN '${req.body.RSI}'
                        WHEN b.parameter_name = 'InternetGatewayDevice.Services.FAPService.1.FAPControl.LTE.Gateway.S1SigLinkServerList' THEN '${req.body.S1LinkList}'
                    END
                    WHERE a.parameter_id=b.parameter_id
                    AND a.henb_id=${enbId}
                    AND b.parameter_name in (
                        'InternetGatewayDevice.DeviceInfo.SerialNumber',
                        'InternetGatewayDevice.DeviceInfo.ManufacturerOUI',
                        'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.Common.CellIdentity',
                        'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.EPC.TAC',
                        'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.RF.PhyCellID',
                        'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.RF.FreqBandIndicator',
                        'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.RF.EARFCNUL',
                        'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.RF.EARFCNDL',
                        'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.RF.ULBandwidth',
                        'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.RF.DLBandwidth',
                        'InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.PHY.PRACH.RootSequenceIndex',
                        'InternetGatewayDevice.Services.FAPService.1.FAPControl.LTE.Gateway.S1SigLinkServerList'
                    );`
                return query;
            } else {
                throw new Error(`Affected rows or rowData is empty!!!`);
            }
        },
        function (rows) {
            // Transaction #3 result
        }
    ];

    eudbEx.beginTs(cbCommit, cbRollback, queryStr, tasks);
};

exports.handleFindEnb = function (req, res, pool) {
    console.log(`IN> handleFindEnb()`);

    let enbId = req.body.enbId ? `'${req.body.enbId}'` : "null";
    let neId = (req.body.neId != "null") ? `'%${req.body.neId}%'` : "null"; // match partial word
    let enbName = req.body.enbName ? `'${req.body.enbName}'` : "null";
    let serialNo = req.body.serialNo ? `'${req.body.serialNo}'` : "null";
    let eci = req.body.eci ? `'${req.body.eci}'` : "null";
    let ipAddr = (req.body.ipAddr != "null") ? `'%${req.body.ipAddr}%'` : "null"; // match partial word
    let pci = req.body.pci ? `'${req.body.pci}'` : "null";
    let tac = req.body.tac ? `'${req.body.tac}'` : "null";
    let plmnId = req.body.plmnId ? `'${req.body.plmnId}'` : "null";
    let locInfo = req.body.locInfo ? `'%${req.body.locInfo}%'` : "null";

    console.debug(`Received data > enbId: ${enbId}, neId: ${neId}, enbName: ${enbName}, serialNo: ${serialNo}, eci: ${eci}, ipAddr: ${ipAddr}, pci: ${pci}, tac: ${tac}, plmnId: ${plmnId}, locInfo: ${locInfo}`);

    let eciObjName = "InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.Common.CellIdentity";
    let pciObjName = "InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.RF.PhyCellID";
    let ipObjName = "InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.IPInterface.1.IPInterfaceIPAddress";
    let tacObjName = "InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.EPC.TAC";
    let eciParamName = "CellIdentity";
    let pciParamName = "PhyCellID";
    let ipParamName = "IPInterfaceIPAddress";
    let tacParamName = "TAC";

    let queryStr = `SELECT x.henb_id, x.ne_id, x.henb_name, x.serial_number, x.oui , y.ECI, y.IP, y.PCI, y.TAC, z.plmnid_list, x.location_info FROM
        (
            SELECT a.henb_id, a.ne_id, a.henb_name, a.serial_number, a.oui, a.location_info FROM HeMS_Device a
            WHERE henb_id=${enbId}
                OR ne_id like ${neId}
                OR henb_name=${enbName}
                OR serial_number=${serialNo}
                OR location_info like ${locInfo}
            UNION
            SELECT a.henb_id, a.ne_id, a.henb_name, a.serial_number, a.oui, a.location_info FROM HeMS_Device a, HeMS_Device_Param b, HeMS_Parameter c
            WHERE a.henb_id=b.henb_id AND b.parameter_id=c.parameter_id
            AND
            (
                (c.parameter_name='${eciObjName}' AND b.parameter_value=${eci})
                OR
                (c.parameter_name='${ipObjName}' AND b.parameter_value like ${ipAddr})
                OR
                (c.parameter_name='${pciObjName}' AND b.parameter_value=${pci})
                OR
                (c.parameter_name='${tacObjName}' AND b.parameter_value=${tac})
            )
            UNION
            SELECT a.henb_id, a.ne_id, a.henb_name, a.serial_number, a.oui, a.location_info FROM HeMS_Device a, v_plmnid_list_active b
            WHERE a.henb_id=b.henb_id
            AND b.plmnid=${plmnId}
        ) x,
        (
            SELECT b.henb_id,
                MAX(IF(a.parameter_alias='${eciParamName}', b.parameter_value, NULL)) AS ECI,
                MAX(IF(a.parameter_alias='${ipParamName}', b.parameter_value, NULL)) AS IP,
                MAX(IF(a.parameter_alias='${pciParamName}', b.parameter_value, NULL)) AS PCI,
                MAX(IF(a.parameter_alias='${tacParamName}', b.parameter_value, NULL)) AS TAC
            FROM HeMS_Parameter a, HeMS_Device_Param b
            WHERE a.parameter_name IN (
                '${eciObjName}',
                '${ipObjName}',
                '${pciObjName}',
                '${tacObjName}'
            )
            AND a.parameter_id=b.parameter_id
            GROUP BY 1
        ) y,
        (
            SELECT henb_id, group_concat(plmnid separator ',') as plmnid_list FROM v_plmnid_list_active
            GROUP BY 1
        ) z
        WHERE x.henb_id=y.henb_id
        AND x.henb_id=z.henb_id`;

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
                retVal.success = true;
                retVal.draw = req.body.draw;
                retVal.recordsTotal = rows.length;
                retVal.recordsFiltered = rows.length;
                retVal.data = rows;
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
                // throw new Error(`Not Found!!!`);
            }
        });
};