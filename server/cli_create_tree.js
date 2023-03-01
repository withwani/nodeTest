/*! CLI Table Creator 0.1.12
 * ©2017-9999 EUCAST Ltd - eu-cast.com
 */

/**
 * @summary     CLI_TABLE_CREATOR
 * @description cteates data to present the TreePanel and ParameterPanel for the CLI menu
 * @version     0.2.0
 * @file        cli_create_tree.js
 * @author      kwpark
 * @contact     www.eu-cast.com
 * @copyright   Copyright 2017-9999 EUCAST Ltd.
 *
 * This source file is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY.
 *
 * @changed
 * 20170630     changed the name because changed the DB table included the parameter enum_group_value_type from HeMS_Parameter_Enum_Grp to HeMS_Parameter.
 *              deleted unnecessary codes.
 *              version up to 0.1.12
 * 20200512     applied eu_mysqlEx module, and deleted unnecessary code and rearranged some logic.
 *              version up to 0.2.0
 */

/** Module */
const fs = require("fs");

const commUtil = require("./common_util");
const commVar = require("./common_var");
const eudbEx = require("./eu_mysqlEx")();

/** Constant */
// create file
const CLI_CLIENT_FILE_NAME = "cli_data.js";
const CLI_CLIENT_FILE_PATH = commUtil.getPath(CLI_CLIENT_FILE_NAME).absoluteFile;
const CLI_SERVER_FILE_NAME = "cli_server_data.js";
const CLI_SERVER_FILE_PATH = commUtil.getPath(CLI_SERVER_FILE_NAME).absoluteFile;

const QUERY_GET_CLI_DATA = `SELECT
        c.command_alias,
        c.description as command_description,
        ifnull(v.cnt,0) as parameter_count,
        ifnull(cp.parameter_id,0) as parameter_id,
        ifnull(p.parameter_name,"") as parameter_name,
        ifnull(o.object_name,"") as object_name,
        ifnull(p.parameter_alias,"") as parameter_alias,
        ifnull(p.parameter_type,"") as parameter_type,
        ifnull(p.parameter_default_value ,"") as parameter_default_value,
        ifnull(p.value_range_start,0) as value_range_start,
        ifnull(p.value_range_end,0) as value_range_end,
        ifnull(p.value_unit,0) as value_unit,
        ifnull(p.islist,0) as islist,
        ifnull(p.isenum,0) as isenum,
        ifnull(ve.enum_strings,"") as enum_strings,
        ifnull(ve.enum_values,"") as enum_values,
        ifnull(p.enum_group_value_type,"") as enum_group_value_type,
        ifnull(cp.optionality, "") as optionality,
        ifnull(p.description, "") as description
    FROM HeMS_Command c
    LEFT JOIN v_comm_param_cnt v ON c.command_id = v.command_id
    LEFT JOIN HeMS_Command_Parameter cp ON c.command_id = cp.command_id
    LEFT JOIN HeMS_Parameter p ON p.parameter_id = cp.parameter_id
    LEFT JOIN HeMS_Object o ON p.object_id = o.object_id
    LEFT JOIN v_enum_comma_strings ve ON p.parameter_id = ve.parameter_id
    WHERE substring_index(c.command_alias, '-', 1) in ("DIS", "CHG")
    union all
    SELECT
        c.command_alias,
        c.description as command_description,
        ifnull(v.cnt,0) as parameter_count,
        ifnull(cp.parameter_id,0) as parameter_id,
        ifnull(p.object_name,"") as parameter_name,
        ifnull(o.object_name,"") as object_name,
        "" as parameter_alias,
        "" as parameter_type,
        "" as parameter_default_value,
        "" as value_range_start,
        "" as value_range_end,
        "" as value_unit,
        "" as islist,
        "" as isenum,
        "" as enum_strings,
        "" as enum_values,
        "" as enum_group_value_type,
        ifnull(cp.optionality, "") as optionality,
        "" as description
    FROM HeMS_Command c
    LEFT JOIN v_comm_param_cnt v ON c.command_id = v.command_id
    LEFT JOIN HeMS_Command_Parameter cp ON c.command_id = cp.command_id
    LEFT JOIN HeMS_Object p ON p.object_id = cp.parameter_id
    LEFT JOIN HeMS_Object o ON p.object_id = o.object_id
    WHERE substring_index(c.command_alias, '-', 1) in ("ADD", "DEL")
    union all
    SELECT
        c.command_alias,
        c.description as command_description,
        ifnull(v.cnt,0) as parameter_count,
        ifnull(cp.parameter_id,0) as parameter_id,
        ifnull(p.parameter_name,"") as parameter_name,
        ifnull(o.object_name,"") as object_name,
        ifnull(p.parameter_alias,"") as parameter_alias,
        ifnull(p.parameter_type,"unsignedInt") as parameter_type,
        ifnull(p.parameter_default_value ,"0") as parameter_default_value,
        ifnull(p.value_range_start,0) as value_range_start,
        ifnull(p.value_range_end,1) as value_range_end,
        ifnull(p.value_unit, "") as value_unit,
        ifnull(p.islist,0) as islist,
        ifnull(p.isenum,0) as isenum,
        ifnull(ve.enum_strings,"") as enum_strings,
        ifnull(ve.enum_values,"") as enum_values,
        ifnull(p.enum_group_value_type,"") as enum_group_value_type,
        ifnull(cp.optionality, "") as optionality,
        ifnull(p.description, "") as description
    FROM HeMS_Command c
    LEFT JOIN v_comm_param_cnt v ON c.command_id = v.command_id
    LEFT JOIN HeMS_Command_Parameter cp ON c.command_id = cp.command_id
    LEFT JOIN HeMS_Parameter p ON p.parameter_id = cp.parameter_id
    LEFT JOIN HeMS_Object o ON p.object_id = o.object_id
    LEFT JOIN v_enum_comma_strings  ve ON p.parameter_id = ve.parameter_id
    WHERE substring_index(c.command_alias, '-', 1) in ("RESET", "ACT")`;

const QUERY_GET_CLI_TREE = `SELECT command_target, substring_index(command_alias,'-',1) as sub_group, command_alias, command_timeout FROM HeMS_Command
    WHERE substring_index(command_alias,'-',1) IN ('DIS', 'CHG', 'ADD', 'DEL', 'RESET', 'ACT')
    ORDER BY command_target ASC, field(substring_index(command_alias,'-',1), 'DIS', 'CHG', 'ADD', 'DEL', 'RESET', 'ACT'), command_alias`;

// Exception case
const EXCEPTION_PARAMETER_JSON_OBJECT = { // this query should be have just one parameter, if not it then this occurs an error because of without handler.
    RESET_ENODEB: {
        "name": "RESET_ENODEB",
        "object_name": "REBOOT_TYPE",
        "command_description": "Reboot eNB",
        "para_cnt": 1,
        "para": [{
            "id": 0,
            "name": "REBOOT_TYPE",
            "alias": "REBOOT_TYPE",
            "type": "unsignedInt",
            "defaultVal": "0",
            "rangeStart": "0",
            "rangeEnd": "1",
            "isList": "0",
            "isEnum": "1",
            "enumStr": "SOFT_RESET|HARD_RESET",
            "enumVal": "0|1",
            "enumType": "0",
            "optionality": "M",
            "description": "Reboot eNB"
        }]
    },
    ACT_DOWNLOAD_FILE: {
        "name": "ACT_DOWNLOAD_FILE",
        "object_name": "DownloadFile",
        "command_description": "Download TDD/FDD package file",
        "para_cnt": 1,
        "para": [{
            "id": 0,
            "name": "DownloadFile",
            "alias": "1 Firmware Upgrade Image",
            "type": "string",
            "defaultVal": "",
            "rangeStart": "",
            "rangeEnd": "",
            "isList": "0",
            "isEnum": "1",
            "enumStr": "",
            "enumVal": "",
            "enumType": "",
            "optionality": "M",
            "description": "Download TDD/FDD package file"
        }]
    },
    ACT_DOWNLOAD_ACU: {
        "name": "ACT_DOWNLOAD_ACU",
        "object_name": "DownloadFile",
        "command_description": "Downlaod ACU package file",
        "para_cnt": 1,
        "para": [{
            "id": 0,
            "name": "DownloadFile",
            "alias": "1 Firmware Upgrade Image",
            "type": "string",
            "defaultVal": "",
            "rangeStart": "",
            "rangeEnd": "",
            "isList": "0",
            "isEnum": "1",
            "enumStr": "",
            "enumVal": "",
            "enumType": "",
            "optionality": "M",
            "description": "Downlaod ACU package file"
        }]
    },
    ACT_DOWNLOAD_RET: {
        "name": "ACT_DOWNLOAD_RET",
        "object_name": "DownloadFile",
        "command_description": "Download RET package file",
        "para_cnt": 1,
        "para": [{
            "id": 0,
            "name": "DownloadFile",
            "alias": "1 Firmware Upgrade Image",
            "type": "string",
            "defaultVal": "",
            "rangeStart": "",
            "rangeEnd": "",
            "isList": "0",
            "isEnum": "1",
            "enumStr": "",
            "enumVal": "",
            "enumType": "",
            "optionality": "M",
            "description": "Download RET package file"
        }]
    },
    ACT_UPLOAD_LOGFILE: {
        "name": "ACT_UPLOAD_LOGFILE",
        "object_name": "InternetGatewayDevice.DeviceInfo.VendorLogFile.",
        "command_description": "Upload LOG file",
        "para_cnt": 1,
        "para": [{
            "id": 0,
            "name": "InternetGatewayDevice.DeviceInfo.VendorLogFile.1.Name",
            "alias": "4 Vendor Log File",
            "type": "string",
            "defaultVal": "",
            "rangeStart": "0",
            "rangeEnd": "15",
            "isList": "0",
            "isEnum": "1",
            "enumStr": "oam_logs.log|oam_radio.log|oam_sdm_logs.log|oam_system.log|oam_transport.log|rrc_l3.log|rrm.log|son.log|tr069_logs.log|troam_l2.log|ipsec.log|Schema_log.log|L2.log|auth.log|/spico/dump/core-dump-file|AlarmLog.csv",
            "enumVal": "0|1|2|3|4|5|6|7|8|9|10|11|12|13|14|15",
            "enumType": "0",
            "optionality": "M",
            "description": "Upload LOG file"
        }]
    },
    CHG_AUTODOWN_PERMIT: {
        "name": "CHG_AUTODOWN_PERMIT",
        "object_name": "AUTO_DOWNLOAD_PERMIT",
        "command_description": "Change AUTODOWN permission",
        "para_cnt": 1,
        "para": [{
            "id": 0,
            "name": "AUTO_DOWNLOAD_PERMIT",
            "alias": "AUTO_DOWNLOAD_PERMIT",
            "type": "unsignedInt",
            "defaultVal": "0",
            "rangeStart": "0",
            "rangeEnd": "1",
            "isList": "0",
            "isEnum": "1",
            "enumStr": "FALSE|TRUE",
            "enumVal": "0|1",
            "enumType": "0",
            "optionality": "M",
            "description": "Change AUTODOWN permission"
        }]
    },
    DIS_AUTODOWN_PERMIT: {
        "name": "DIS_AUTODOWN_PERMIT",
        "object_name": "AUTO_DOWNLOAD_PERMIT",
        "command_description": "Display AUTODOWN permission",
        "para_cnt": 1,
        "para": [{
            "id": 0,
            "name": "AUTO_DOWNLOAD_PERMIT",
            "alias": "AUTO_DOWNLOAD_PERMIT",
            "type": "unsignedInt",
            "defaultVal": "0",
            "rangeStart": "0",
            "rangeEnd": "1",
            "isList": "0",
            "isEnum": "1",
            "enumStr": "FALSE|TRUE",
            "enumVal": "0|1",
            "enumType": "0",
            "optionality": "O",
            "description": "Display AUTODOWN permission"
        }]
    }
};

/** Variable */

/** Class */
function CliListObj() {
    this.items = [];
}

function CliItemObj() {
    this.name = "";
    this.object_name = "";
    this.description = "";
    this.para_cnt = 0;
    this.para = [];
}

function CliItemParamObj() {
    this.id = 0;
    this.name = "";
    this.alias = "";
    this.type = "";
    this.defaultVal = "";
    this.rangeStart = "";
    this.rangeEnd = "";
    this.unit = "";
    this.isList = "";
    this.isEnum = "";
    this.enumStr = "";
    this.enumVal = "";
    this.enumType = "";
    this.optionality = "";
    this.description = "";
}

/** Prototype */
CliItemParamObj.prototype.setParamObj = function(paramObj) {
    Object.assign(this, paramObj);
};

CliItemParamObj.prototype.setRowParamObj = function(paramObj) {
    this.id = paramObj.parameter_id;
    this.name = paramObj.parameter_name;
    this.alias = paramObj.parameter_alias;
    this.type = paramObj.parameter_type;
    this.defaultVal = paramObj.parameter_default_value;
    this.rangeStart = paramObj.value_range_start;
    this.rangeEnd = paramObj.value_range_end;
    this.unit = paramObj.value_unit;
    this.isList = paramObj.islist;
    this.isEnum = paramObj.isenum;
    this.enumStr = paramObj.enum_strings;
    this.enumVal = paramObj.enum_values;
    this.enumType = paramObj.enum_group_value_type;
    this.optionality = paramObj.optionality;
    this.description = paramObj.description;
};

CliListObj.prototype.makeCliListTreeData = function(version) {
    console.log("IN> makeCliListTreeData()");

    let tempDatas, serverDatas, clientDatas;
    let queryStr = QUERY_GET_CLI_DATA

    let cbCommit = function() {
        fs.writeFile(CLI_SERVER_FILE_PATH, serverDatas.join("\n"), "utf8", function(error) { // create cli_server_data.js
            if (error) throw error;
            console.log("Completed creating CLI DATA!!");
        });

        fs.writeFile(CLI_CLIENT_FILE_PATH, clientDatas.join("\n"), "utf8", function(error) { // create cli_data.js
            if (error) throw error;
            console.log("Completed creating CLI TREE!!");
            console.log("<<============================== Processing Subsequence DONE.");
        });

    };

    let cbRollback = function(err) {
        console.error(err);
    };

    let tasks = [
        function (rows) {
            if (rows && rows.length) {
                tempDatas = createCliListData(this.items, rows, version)

                serverDatas = [].concat(tempDatas);
                serverDatas.push("//");
                serverDatas.push("exports.getCliItem = function(name) {");
                serverDatas.push("    return CLI_List[name];");
                serverDatas.push("};");

                return QUERY_GET_CLI_TREE;
            } else {
                throw new Error(`Affected rows is empty!!!`);
            }
        },
        function (rows) {
            if (rows && rows.length) {
                clientDatas = [].concat(tempDatas);

                clientDatas.push("//");
                clientDatas.push("// Tree Data");
                clientDatas.push("var CLI_Tree = [");

                clientDatas = clientDatas.concat(createCliTreeData(rows, version));

                clientDatas.push("];");
            } else {
                throw new Error(`Affected rows is empty!!!`);
            }
        }
    ];

    eudbEx.beginTs(cbCommit, cbRollback, queryStr, tasks, false);
};

/** Inner Function */
function getObjectNameWithoutIndex(object_name) {
    String.prototype.trimLastIndex = function() {
        return this.replace(/\.([0-9])+\.$/g, ".");
    };

    return object_name.trimLastIndex();
}

function getSpecificParaIdx(arr, key, val) {
    var result = [];

    // collect all positions
    arr.forEach(function(item, index) {
        if (item[key] === val) {
            result.push(index);
        }
    });
    return result.sort();
}

function createCliTreeData(rows, version) {
    console.log(`IN> createCliTreeData()`);

    const excludeItems = [
        "ADD-NGBRLTE-CELL",
        "DEL-NGBRLTE-CELL"
        // ,"ADD-NGBRLTE-ITRATCDMA",
        // "DEL-NGBRLTE-ITRATCDMA"
    ];

    let datas = [], parent = {};

    // id, parent, text

    const ORDER_CATEGORY_GROUP = ["DUAL", "EMS", "eNB"];
    const ORDER_COMMAND_GROUP = ["DIS", "CHG", "ADD", "DEL", "RESET", "ACT"];

    let jsonObj = { id: "VER", parent: "#", text: `COMMAND LIST(v${version})`, state: {disabled: true, opened: true} };
    datas.push(`${commUtil.indent(JSON.stringify(jsonObj), 1, 4)},`);
    // datas.push(JSON.stringify(jsonObj) + ",");
    ORDER_CATEGORY_GROUP.forEach(category => {
        jsonObj = { id: category, parent: "VER", text: category, state: {disabled: true} };
        datas.push(`${commUtil.indent(JSON.stringify(jsonObj), 1, 4)},`);
        // datas.push(JSON.stringify(jsonObj) + ",");

        ORDER_COMMAND_GROUP.forEach(command => {
            jsonObj = { id: `${category}_${command}`, parent: category, text: command, state: {disabled: true} };
            datas.push(`${commUtil.indent(JSON.stringify(jsonObj), 1, 4)},`);
            // datas.push(JSON.stringify(jsonObj) + ",");
        });
    });

    rows.forEach((row, i) => {
        // if (excludeItems.indexOf(row.command_alias) < 0) {
        if (!excludeItems.includes(row.command_alias)) {
            let alias = row.command_alias.replace(/-/gi, "_");
            // console.log(`alias =`, alias);

            jsonObj = { id: alias, parent: `${row.command_target}_${row.sub_group}`, text: alias, timeout: row.command_timeout }

            datas.push(`${commUtil.indent(JSON.stringify(jsonObj), 1, 4)}${(i == rows.length - 1) ? "" : ","}`);
            // datas.push(JSON.stringify(jsonObj) + ",");
        }
    });

    return datas;
}

function createCliListData(items, rows, version) {
    console.log(`IN> createCliListData()`);
    let isParam = false, cliItemObj, cliItemParamObj, extraParamObj, extraParamIds, zeroParamIds, temp, datas = [];
    // items = new Array();
    items = [];

    datas.push(`// v${version}`);
    datas.push(`// List Data`);
    datas.push(`var CLI_List = {`);

    rows.forEach((row, i) => {
        if (!isParam) {
            cliItemObj = new CliItemObj();
            cliItemObj.name = row.command_alias.replace(/-/gi, "_");

            if (Object.keys(EXCEPTION_PARAMETER_JSON_OBJECT).includes(cliItemObj.name)) {
                cliItemObj.object_name = EXCEPTION_PARAMETER_JSON_OBJECT[cliItemObj.name].object_name;
                cliItemObj.description = EXCEPTION_PARAMETER_JSON_OBJECT[cliItemObj.name].command_description;
                cliItemObj.para_cnt = EXCEPTION_PARAMETER_JSON_OBJECT[cliItemObj.name].para_cnt;

                extraParamObj = EXCEPTION_PARAMETER_JSON_OBJECT[cliItemObj.name].para;
                extraParamIds = extraParamObj.map(function(para) {
                    return para.id;
                });
                zeroParamIds = getSpecificParaIdx(extraParamObj, "id", 0);
            } else {
                cliItemObj.object_name = getObjectNameWithoutIndex(row.object_name);
                cliItemObj.description = row.command_description;
                cliItemObj.para_cnt = row.parameter_count;
                extraParamObj = null;
                extraParamIds = null;
                zeroParamIds = null;
            }

            // handle no parameter
            if (!cliItemObj.para_cnt) {
                items.push(cliItemObj);
                temp = `${commUtil.indent(cliItemObj.name, 1, 4)} : ${JSON.stringify(cliItemObj)}${(i == rows.length - 1) ? "" : ","}`;
                datas.push(temp);
            } else {
                isParam = true;
            }
        }
        // handle specific parameters defined by programmer, the parameter_id should be 0.
        let curIdx = (extraParamIds) ? extraParamIds.indexOf(row.parameter_id) : -1;
        // copy all extra parameter with id=0 to cliItemParamObj
        if (zeroParamIds && zeroParamIds.length > 0) {
            zeroParamIds.forEach(function(pos) {
                cliItemParamObj = new CliItemParamObj();
                cliItemParamObj.setParamObj(extraParamObj[pos]);
                cliItemObj.para.push(cliItemParamObj);
            });
        }

        // handle a parameter exist in db
        if (extraParamObj && row.parameter_id === 0) { // if the parameter_id of db is 0...
            // already do something at previous logic, so do not anything at this.
        } else if (extraParamObj && extraParamIds.length > 0) { // 예외처리 객체가 덮어쓰기 된 경우 다른건 무시함.
            // already do something at previous logic, so do not anything at this.
        } else if (extraParamObj && (curIdx > -1)) {
            // overwritten data, user defined data overwrites to cliItemParaObj object
            cliItemParamObj = new CliItemParamObj();
            cliItemParamObj.setParamObj(extraParamObj[curIdx]);
            cliItemObj.para.push(cliItemParamObj);
        } else {
            // no overwritten data
            cliItemParamObj = new CliItemParamObj();
            cliItemParamObj.setRowParamObj(row);

            // modified parameter to specific value
            if (cliItemParamObj.alias == "") {
                cliItemParamObj.alias = row.parameter_name.split(".").pop(); // get parameter alias using parameter name
            }
            if (cliItemObj.name.includes("DEL_")) {
                cliItemParamObj.optionality = "M";
            }

            // added a parameter
            cliItemObj.para.push(cliItemParamObj);
        }

        if (cliItemObj.para_cnt) { // 이 조건이 없으면 para_cnt가 0인 아이템이 중복으로 선언된다.
            if (i == rows.length - 1) { // last one
                isParam = false;
                items.push(cliItemObj);
                datas.push(`${commUtil.indent(cliItemObj.name, 1, 4)} : ${JSON.stringify(cliItemObj)}`);
            } else if (cliItemObj.name != (rows[i + 1].command_alias.replace(/-/gi, "_"))) { // end of params
                isParam = false;
                items.push(cliItemObj);
                datas.push(`${commUtil.indent(cliItemObj.name, 1, 4)} : ${JSON.stringify(cliItemObj)},`);
            }
        }
    });

    datas.push("};");
    datas.push("//");

    return datas;
}

/** External Function */
exports.createCliDataFile = function() {
    console.log(`IN> createCliDataFile(), create CLI data files(cli_data.js, cli_server_data.js)`);

    function createCliFiles(version) {
        new CliListObj().makeCliListTreeData(version);
    }

    const newVerStr = (commVar.getInstance().get("euConfig")).webConfig.cliVersion;

    if (!fs.existsSync(CLI_CLIENT_FILE_PATH)) {
        createCliFiles(newVerStr);
    } else {
        fs.readFile(CLI_CLIENT_FILE_PATH, "utf8", function(err, data) {
            if (!err) {
                let curVerStr = data.split("\n").shift().replace("// v", ""),
                    newVers = newVerStr.split("."),
                    curVers = curVerStr.split(".");
                console.debug(`createCliDataFile(), Checking CLI data version: Current(${curVers}) -> New(${newVers})`);

                newVers.some((ver, i) => {
                    // createCliFiles(newVerStr); // for test
                    // return true;
                    if (ver > curVers[i]) {
                        createCliFiles(newVerStr);
                        return true;
                    }

                    if (i == newVers.length-1) {
                        console.debug("createCliDataFile(), CLI data version up to date!!");
                        console.log("<<============================== Processing Subsequence DONE.");
                    }
                });
            } else {
                console.error(err);
                createCliFiles(newVerStr);
            }
        });
    }
};