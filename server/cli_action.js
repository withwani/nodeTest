/* Below is General Definition ================================================================= */
const moment = require("moment");

const commUtil = require("./common_util");
const commVar = require("./common_var");
const eudbEx = require("./eu_mysqlEx")();
// const cliList = require('./cli_server_data');

const runHttps = commVar.getInstance().get("runHttps"); // WEB과 EMS 사이의 통신은 내부통신으로 HTTPS을 사용할 필요가 없다.
const prot = (runHttps) ? require("https") : require("http"); // // feature HTTPS
const PROT_NAME = (runHttps) ? "https" : "http";

const options = {
    // protocol: 'http',
    // url: 'http://192.168.61.8:48710',
    host: "localhost",
    port: "48710", // default: 48710
    // method: "POST",
    // family: 6,
    headers: {
        "User-Agent": "GUI",
        "Content-Type": "text/xml; charset=utf-8", //'application/json',
        "Content-Length": ""
    },
    headerSent: "true",
    rejectUnauthorized: false
};

let resultObj = {};
var isRun = false; // for getting packag version list

/* Below is Object ================================================================= */
// CLI Parameter Object
function ParamObj(sess, cliName, henbId, userId, indexId = -1) { // added indexId for ACT-DOWNLOAD-RET
    console.log(`[ParamObj] Create new object with cliName(${cliName}), henbId(${henbId}), userId(${userId}) and indexId(${indexId})`);

    function getMessageType(cliName) {
        if (cliName.includes("DIS_")) { // DIS command
            return "getParameterValues";
        } else if (cliName.includes("CHG_")) { // CHG command
            return "setParameterValues";
        } else if (cliName.includes("ADD_")) { // ADD command
            return "AddObject";
        } else if (cliName.includes("DEL_")) { // DEL command
            return "DeleteObject";
        } else if (cliName.includes("RESET_")) { // RESET command
            return "Reboot";
        } else if (cliName.includes("ACT_DOWNLOAD_")) { // ACT command, changed the included name for ACT-DOWNLOAD-RET
            return "Download";
        } else if (cliName.includes("ACT_UPLOAD_LOGFILE")) { // ACT command
            return "Upload";
        } else if (cliName.includes("ACT_DUAL_SWITCH")) { // ACT command
            return "DUAL";
        } else {
            return "Unknown";
        }
    }

    this.command = cliName.replace(/_/gi, "-"); // replace all from '_' to '-' using regex
    this.henb_id = henbId;
    this.transaction_id = "";
    this.eventTime = moment().format("YYYY-MM-DD HH:mm:ss");
    this.user_id = userId;
    if (indexId < 0) {
        this.user_ip = `${PROT_NAME}://${sess.hostIp}:${sess.hostPort}/realtime_message`; // feature HTTPS
    } else {
        this.user_ip = `${PROT_NAME}://${sess.hostIp}:${sess.hostPort}/cli_action_result`; // feature HTTPS
    }
    this.messageType = getMessageType(cliName);
    // this.paramList = [];

    // console.log('------------------------------------------------------------>');
    // console.dir(this);
    // console.log('<------------------------------------------------------------');
}

// Parameter Item Object for parameterList
function ParamItem(paramName) {
    this.parameterName = paramName;
    // this.parameterType = paramType;
    // this.parameterValue = paramValue;
}

/* Below is Prototype ================================================================= */
// get a list for getParameterValues
ParamObj.prototype.makeGetParamList = function (cliItem, category, indexId) {
    /** ToDo List
     * TODO:1
     * DIS-REMLTE-CELLBCCH
     * DIS-REMLTE-CELLRF
     * DIS_REMLTECELL_BCCHPLMN
     * 위 세개의 명령어의 parameter는 “InternetGatewayDevice.Services.FAPService.1.REM.LTE.Cell.” 로 동일합니다.
     *
     * TODO:2
     * CHG_AUTODOWN_PERMIT
     * DIS_AUTODOWN_PERMIT
     * 위 두개의 명령어의 parameter는 HeMS_Device > "auto_upgrade_flag" 로 정의합니다.
     */

    let exceptionList = {
        "DIS_RRU_CONF": "InternetGatewayDevice.FAP.X_VENDOR_RRU.config.1.",
        "DIS_RRU_STS": "InternetGatewayDevice.FAP.X_VENDOR_RRU.status.1.",
        "DIS_RET_INFO": "InternetGatewayDevice.FAP.X_VENDOR_RET.1."


        // 'DIS_AUTODOWN_PERMIT'           :[],
        // 'DIS_SCTP_INFO'                 :['.AssocNumberOfEntries'],
        // 'DIS_LTEIDLEMODE_IRATCDMA'      :['.MaxCDMA2000BandEntries', '.CDMA2000BandNumberOfEntries'],
        // 'DIS_SON_ANR'                   :['.ANR_DEFAULT_NR_STATUS', '.ANR_DEFAULT_HO_STATUS', '.ANR_DEFAULT_X2_STATUS', '.Nr_status'],
        // 'DIS_GPS_INFO'                  :['.GPSReset'],
        // 'DIS_DEVICE_INFO'               :['.CPUUsage', '.Total', '.Free']
    };

    function isExceptedItem(item, exceptionItems) {
        for (let i = 0; i < exceptionItems.length; i++) {
            if (item.includes(exceptionItems[i])) {
                return true;
            }
        }
        return false;
    }

    console.log("[ParamObj] Make a list for getParameterValues");
    this.paramList = [];
    let pItem;

    if (category === "EMS") {
        for (let i = 0; i < cliItem.para_cnt; i++) {
            pItem = new ParamItem(cliItem.para[i].name); // using for db
            this.paramList.push(pItem);
        }
    } else if (Object.keys(exceptionList).includes(cliItem.name)) {
        pItem = new ParamItem(`${cliItem.object_name}${indexId}.`);
        this.paramList.push(pItem);
    } else {
        pItem = new ParamItem(cliItem.object_name);
        this.paramList.push(pItem);
    }

    // console.log('------------------------------------------------------------>');
    // console.dir(this);
    // console.log('<------------------------------------------------------------');
};

ParamObj.prototype.makeSetParamList = function (cliItem, indexId, req) {
    console.log("[ParamObj] Make a list for setParameterValues");

    /*function getParamType(pType) {
        console.log(`pType = ${pType}`);
        switch(pType) {
            case 'M':
                console.log('This is a Mandatory item');
                return 'string';
            case 'O':
                console.log('This is an Optional item');
                return 'string';
            default:
                console.log('Entered to default');
                return 'string';
        }
    }*/

    function parseEnumType(value, para) { // for Neighbor Setting
        // converting for the received value to string
        if (para.isEnum == "1") { // value type
            if (para.enumType == "0") {
                // convert to integer value
                let enumStrs = para.enumStr.split("|");
                return para.enumVal.split("|")[enumStrs.indexOf(value)];
            } else {
                return value;
            }
        }
        return value;
    }

    // this.paramList = [];
    let paramList = [];
    // console.debug(`this =`, this);
    // console.debug(`isArray(${Array.isArray(indexId)}), indexId = `, indexId);
    if (Array.isArray(indexId)) { // for Neighbor Setting
        let rowData = indexId;

        rowData.forEach(function (row, index, array) {
            // console.debug(`[${index}] row =`, row);
            let paraName = "";
            let keys = Object.keys(row);
            for (let i = 0; i < cliItem.para_cnt; i++) {
                if (keys.indexOf(cliItem.para[i].alias) < 0) continue;

                paraName = `${cliItem.object_name}${row["Index"]}.${cliItem.para[i].alias}`;
                let pItem = new ParamItem(paraName);
                pItem.parameterType = cliItem.para[i].type;
                pItem.parameterValue = parseEnumType(row[cliItem.para[i].alias], cliItem.para[i]);
                // pItem.parameterValue = row[cliItem.para[i].alias];

                paramList.push(pItem);
            }
        });
        this.paramList = paramList;
        // console.debug(`paramList =`, this.paramList);
    } else {
        let paraName = ""; // for multi-instance object
        for (let i = 0; i < cliItem.para_cnt; i++) {
            let pValue = req.body["i_para" + (i + 1)];
            if (!pValue || pValue == "") continue; // skip this parameter

            if (+indexId > 0) { // for multi-instance object
                // paraName = cliItem.object_name + indexId + '.' + cliItem.para[i].name.split('.').pop();
                paraName = cliItem.object_name + indexId + "." + cliItem.para[i].alias;
            } else {
                paraName = cliItem.para[i].name;
            }

            // let pItem = new ParamItem(cliItem.para[i].name);
            let pItem = new ParamItem(paraName); // for multi-instance object
            // pItem.parameterType = getParamType(cliItem.para[i].optionality);
            pItem.parameterType = cliItem.para[i].type;
            if (cliItem.para[i].isEnum === "1" && cliItem.para[i].isList === "1") {
                pValue = (req.body.selectedVal)[i];
            }
            pItem.parameterValue = pValue;

            paramList.push(pItem);
        }
        this.paramList = paramList;
        // console.debug(`paramList =`, this.paramList);
    }

    // console.log('------------------------------------------------------------>');
    // console.dir(this);
    // console.log('<------------------------------------------------------------');
};

// get a list for Reboot
ParamObj.prototype.makeGetBodyValue = function (cliItem, req, messageType, indexId) { // added indexId for ACT-DOWNLOAD-RET
    console.log(`[ParamObj] Make a key for makeGetBodyValue, messageType(${messageType}), indexId(${indexId})`);

    let onlyPLD = req.body.onlyPLD || "false"; // Notice: this is a string value
    let pValue = req.body["i_para1"];
    console.log(`>>> pValue[i_para1] = ${pValue}, onlyPLD = ${onlyPLD}`);

    if (messageType == "Reboot") {
        this.commandKey = (+pValue) ? "HardReset" : "";
    } else if (messageType == "AddObject") {
        this.objectName = cliItem.object_name;
        this.objectOption = (onlyPLD === "true") ? "PLD" : "";
    } else if (messageType == "DeleteObject") {
        this.objectName = cliItem.object_name + pValue + ".";
        this.objectOption = (onlyPLD === "true") ? "PLD" : "";
    } else if (messageType == "Download") {
        if (this.command == "ACT-DOWNLOAD-RET") {
            this.fileType = `X RET ${indexId}`;
        } else if (this.command == "ACT-DOWNLOAD-ACU") {
            this.fileType = `X ACU`;
        } else { // "ACT-DOWNLOAD-ACU" etc...
            this.fileType = cliItem.para[0].alias;
        }
        this.targetFileName = pValue; // use enumVal
    } else if (messageType == "Upload") {
        this.fileType = cliItem.para[0].alias + " " + (+pValue + 1);
    } else if (messageType == "DUAL") {
        // nothing to do
    }

    // console.log('------------------------------------------------------------>');
    // console.dir(this);
    // console.log('<------------------------------------------------------------');
};

// for JSON.parse()
String.prototype.escapeSpecialCharsForParse = function () {
    return this.replace(/\n/g, "\\n");
    /*.replace(/\'/g, "\\'")
    .replace(/\"/g, '\\"')
    .replace(/\&/g, "\\&")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\b/g, "\\b")
    .replace(/\f/g, "\\f");*/
};
String.prototype.escapeSpecialCharsForGui = function () {
    return this.replace(/(?:\r\n|\r|\n)/g, "<br/>");
    // return this.replace('\n', '&#13;&#10;');
    // return this.replace(/\n/g, "&#13;&#10;");
    /*.replace(/\'/g, "\\'")
    .replace(/\"/g, '\\"')
    .replace(/\&/g, "\\&")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\b/g, "\\b")
    .replace(/\f/g, "\\f");*/
};

/* Below is Inner Function ================================================================= */
function makeCLIQueryJSON(postObj, cli_item, indexId, req, category, runMode) {
    console.log("IN> makeCLIQueryJSON()");

    switch (postObj.messageType) {
        case "getParameterValues": // for display command
            postObj.makeGetParamList(cli_item, category, indexId);
            break;

        case "setParameterValues": // for change command
            postObj.makeSetParamList(cli_item, indexId, req);
            break;

        case "AddObject": // for add command
        case "DeleteObject": // for delete command
        case "Download": // for download package file
        case "Upload": // for upload log file
        case "Reboot": // for reset
        case "DUAL": // for dual switch
            postObj.makeGetBodyValue(cli_item, req, postObj.messageType, indexId); // added indexId for ACT-DOWNLOAD-RET
            break;

        default:
            console.log("Unknown messageType! messageType = " + postObj.messageType);
            break;
    }

    if (runMode === "_batch") {
        postObj["commandGroup"] = category;
    }

    return JSON.stringify(postObj);
}

function sendReqToHeMS(pool, postObj, cli_item, indexId, req, res, category) {
    console.log("IN> sendReqToHeMS()");

    let postData;

    let runMode = req.body.runMode;
    console.log(`CLI runnig mode:`, runMode);
    if (runMode === "_batch") {
        delete postObj.eventTime;
        let ips = postObj.user_ip.split("/");
        ips[ips.length - 1] = "realtime_message";
        postObj.user_ip = ips.join("/");
        console.log(`Converted user_ip =`, postObj.user_ip);

        postData = makeCLIQueryJSON(postObj, cli_item, indexId, req, category, runMode);
        console.log("queryData(%d) = " + postData.replace(/{/, "{\n    ").replace(/,/gi, ",\n    ").replace(/\[/gi, "[\n    ").replace(/]/gi, "\n]"), Buffer.byteLength(postData)); //.toString());

        // console.log(`postData =`, postData);

        // TODO: HeMS_Batch_Command 에 추가하기.

        // let contextStr = JSON.stringify(JSON.parse(postData.escapeSpecialCharsForParse())).replace(/\"/gi, "\'");
        // let contextStr = JSON.stringify(JSON.parse(postData.escapeSpecialCharsForParse()));
        let contextStr = postData.replace(/\\/gi, "").replace(/\"/gi, "\'");
        // let contextStr = commUtil.stringifyJsonForDB(postData.replace(/\\/gi, ""));
        console.log(`contextStr =`, contextStr);

        var queryStr = `INSERT INTO HeMS_Batch_Command
            SET command_name='${cli_item.name}', command_context="${contextStr}"`;

        var retVal = {
            success: false,
            status: 400,
            message: "",
            data: {}
        };

        eudbEx.runQuery(queryStr,
            () => { // finally
                res.status(retVal.status).send(JSON.stringify(retVal));
            },
            (rows) => { // success
                if (rows.affectedRows && rows.affectedRows > 0) {
                    // console.log(`>>[SQL RESULT] success query, rows.affectedRows =`, rows.affectedRows);
                    retVal.success = true;
                    retVal.status = 200;
                    retVal.message = `[SUCCESS] Request was successful!`;
                    retVal.data.result = `[REGISTERD TO BATCH]\n+----------------------------------------------------------------------------------+\n${JSON.stringify(JSON.parse(postData.escapeSpecialCharsForParse()), undefined, 4)}\n+----------------------------------------------------------------------------------+\nRESULT: OK\nCOMPLETED`;
                } else {
                    // console.log(`>>[SQL RESULT] There is no affected rows!!!`);
                    // throw new Error(`INSERT Failed!!!`);
                }
            });
    } else { // cli mode
        postData = makeCLIQueryJSON(postObj, cli_item, indexId, req, category, runMode);
        console.log("queryData(%d) = " + postData.replace(/{/, "{\n    ").replace(/,/gi, ",\n    ").replace(/\[/gi, "[\n    ").replace(/]/gi, "\n]"), Buffer.byteLength(postData)); //.toString());

        options.headers["Content-Length"] = Buffer.byteLength(postData);
        console.log(`options =`, options);
        // var hemsReq = prot.request(options, (hemsRes) => {
        var hemsReq = prot.request(options, (hemsRes) => {
            console.log("STATUS: " + hemsRes.statusCode);
            console.log("HEADERS: " + JSON.stringify(hemsRes.headers));

            let HemsData = "";
            hemsRes.on("data", (chunk) => {
                HemsData += chunk;
            });

            hemsRes.on("end", () => {
                // console.log('No more data in response.');
                console.log("EMS data: " + HemsData);

                if (HemsData == "Error") {
                    resultObj.success = false;
                    resultObj.status = 404;
                    resultObj.message = `Request failure! EMS data=${HemsData}`;
                    res.status(resultObj.status).send();
                } else if (runMode === "_neighbor") {
                    resultObj.success = true;
                    resultObj.status = 200;
                    resultObj.message = `[SUCCESS] Request was successful!`;
                    res.status(resultObj.status).send(JSON.stringify(resultObj));
                }
            });
        });

        hemsReq.on("error", (e) => {
            console.log(`problem with request: ${e.message}`);
            resultObj.success = false;
            resultObj.status = 404;
            resultObj.message = `${e.message}`;
            res.status(resultObj.status).send();
        });

        hemsReq.write(postData);
        hemsReq.end();
        if (postObj && postObj.transaction_Id) commVar.getInstance().set("transactionId", postObj.transaction_Id + 1); // count transactionId
        console.log("<<<------------------------ Ended the hemsReq for CLI -------------------------");
    }
}

function sendReqToHeMSForBatch(batchData) {

    return new Promise((resolve, reject) => {
        console.log("IN> sendReqToHeMSForBatch()");

        // let postData = JSON.stringify(JSON.parse(batchData));
        let postData = batchData;
        console.log(`batchData =`, JSON.parse(batchData));

        options.headers["Content-Length"] = Buffer.byteLength(postData);
        console.log(`prot options =`, options);
        var httpReq = prot.request(options, (httpRes) => {
            console.log("STATUS: " + httpRes.statusCode);
            console.log("HEADERS: " + JSON.stringify(httpRes.headers));

            let HemsData = "";
            httpRes.on("data", (chunk) => {
                HemsData += chunk;
            });

            httpRes.on("end", () => {
                if (HemsData == "Error") {
                    console.error(`Request failure! EMS data=${HemsData}`);
                } else {
                    console.log("EMS data: " + HemsData);
                    resolve(HemsData);
                }
            });
        });

        httpReq.on("error", (e) => {
            console.log(`problem with request: ${e.message}`);
            reject(e);
        });

        httpReq.write(postData);
        httpReq.end();
        console.log("<<<------------------------ Ended the hemsReq for Batch -------------------------");
    });
};

/* Below is Export Function ================================================================= */
exports.handleCliAction = function (req, res, pool) {
    console.log("IN> handleCliAction()");

    const cliName = req.body.cli_name;
    const paraCnt = req.body.para_cnt;
    const henbId = req.body.i_henb_id;
    const indexId = req.body.i_index_id; // for multi-instance object
    const userId = req.body.userId;
    const category = req.body.category;
    const sess = req.session;

    console.log(`GUI ParamInfo: param.len:${req.param.length}, userId:${userId}, cliName:${cliName},
                henbId:${henbId}, paraCnt:${paraCnt}, indexId:${indexId}, category:${category}`);

    var cli_item = (require("./cli_server_data")).getCliItem(cliName); //cliList.getCliList(cliName);
    // console.log(`Handling CLI item =`, cli_item);
    // console.log("get CLI item, name:%s, para_cnt:%d", cli_item.name, cli_item.para_cnt);

    let postObj = new ParamObj(sess, cliName, henbId, userId, indexId || 0); // added indexId for ACT-DOWNLOAD-RET

    if (category === "EMS" || category === "DUAL") {
        options.host = (req.session.hostIp).replace("[", "").replace("]", "");
        options.port = (category === "EMS") ? "48700" : "48710";

        sendReqToHeMS(pool, postObj, cli_item, indexId, req, res, category);
        return res;
    }

    const queryStr = `SELECT d.parameter_value FROM HeMS_Device_Param d
        JOIN HeMS_Parameter p ON p.parameter_id=d.parameter_id
        WHERE p.parameter_name='InternetGatewayDevice.ManagementServer.URL'
        AND d.henb_id=${henbId}`;

    eudbEx.runQuery(queryStr,
        () => { // finally
            // return res;
        },
        (rows) => { // success
            // console.log(">>[SQL RESULT] rows.length = ", rows.length);
            if (rows.length > 0) {
                for (let i = 0; i < rows.length; i++) {
                    // console.log(`rows[${i}].parameter_value = ${rows[i].parameter_value}`);
                    let urlObj = commUtil.getURLProperty(rows[i].parameter_value); // rows[i].parameter_value is whole adress with protocol, host and port
                    console.debug(`urlObj =`, urlObj);
                    // options.host = urlObj.host;
                    options.port = urlObj.port;
                    options.host = (req.session.hostIp) ? (req.session.hostIp).replace(/\[/g, "").replace(/\]/g, "") : "";
                    // options.port = req.session.hostPort;
                }

                sendReqToHeMS(pool, postObj, cli_item, indexId, req, res, "eNB");
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
                resultObj.success = false;
                resultObj.status = 404;
                resultObj.message = `Empty result! query=${exec.sql}`;
                console.log(resultObj.message);
                res.status(resultObj.status).send(JSON.stringify(resultObj));
            }
        });

    return res;
};

exports.handleCliActionForBatch = function (batchObj, _callback) {
    console.log("IN> handleCliActionForBatch()");

    if (!batchObj) {
        console.error(`Argument batchObj is NULL!`);
        _callback(new Error(`Argument batchObj is NULL!`));
        return;
    }

    console.debug(`GUI batchObj:`, batchObj);
    let enbId = batchObj.enbId;
    let groupName = batchObj.groupName;
    let batchData = batchObj.postData;
    let urlObj;

    if (+enbId > 0) {
        const queryStr = `SELECT d.parameter_value FROM HeMS_Device_Param d
        JOIN HeMS_Parameter p ON p.parameter_id=d.parameter_id
        WHERE p.parameter_name='InternetGatewayDevice.ManagementServer.URL'
        AND d.henb_id=${enbId}`;

        eudbEx.runQuery(queryStr,
            () => { // finally
                // do nothing...
            },
            (rows) => { // success
                // console.log(">>[SQL RESULT] rows.length = ", rows.length);
                if (rows.length) {
                    urlObj = commUtil.getURLProperty(rows[0].parameter_value); // rows[i].parameter_value is whole adress with protocol, host and port
                    options.host = urlObj.host;
                    options.port = urlObj.port;

                    sendReqToHeMSForBatch(batchData)
                        .then((res) => {
                            console.log(`success =`, res);
                            _callback();
                        })
                        .catch(err => {
                            console.log(`err =`, err);
                            _callback(err);
                        });
                }
            });
    } else {
        urlObj = commUtil.getURLProperty(JSON.parse(batchData).user_ip);
        options.host = urlObj.host;
        options.port = (groupName === "EMS") ? "48700" : "48710";

        sendReqToHeMSForBatch(batchData)
            .then((res) => {
                console.log(`success =`, res);
                _callback();
            })
            .catch(err => {
                console.log(`err =`, err);
                _callback(err);
            });
    }
};

exports.handleCliActionForNeighbor = function (req, res, pool) {
    console.log("IN> handleCliActionForNeighbor()");

    let henbId = req.body.enbId;
    let type = req.body.type;
    let rowData = req.body.rowData;
    let cliName = req.body.cliName;
    let userId = req.body.userId;
    let sess = req.session;
    console.log(`GUI ParamInfo: eNB ID(${henbId}), type(${type}), userId:${userId}, cliName:${cliName}, rowData =`, rowData);

    var cli_item = (require("./cli_server_data")).getCliItem(cliName); //cliList.getCliList(cliName);
    console.log("get CLI item, name:%s, para_cnt:%d", cli_item.name, cli_item.para_cnt);

    let postObj = new ParamObj(sess, cliName, henbId, userId);

    const queryStr = `SELECT d.parameter_value FROM HeMS_Device_Param d
        JOIN HeMS_Parameter p ON p.parameter_id=d.parameter_id
        WHERE p.parameter_name='InternetGatewayDevice.ManagementServer.URL'
        AND d.henb_id=${henbId}`;

    eudbEx.runQuery(queryStr,
        () => { // finally
            return res;
        },
        (rows) => { // success
            // console.log(">>[SQL RESULT] rows.length = ", rows.length);
            if (rows.length > 0) {
                for (let i = 0; i < rows.length; i++) {
                    // console.log(`rows[${i}].parameter_value = ${rows[i].parameter_value}`);
                    let urlObj = commUtil.getURLProperty(rows[i].parameter_value);
                    console.debug(`urlObj =`, urlObj);
                    // options.host = urlObj.host;
                    options.port = urlObj.port;
                    options.host = (req.session.hostIp).replace("[", "").replace("]", "");
                    // options.port = req.session.hostPort;
                }

                sendReqToHeMS(pool, postObj, cli_item, rowData, req, res);
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
                resultObj.success = false;
                resultObj.status = 404;
                resultObj.message = `Empty result! query=${exec.sql}`;
                console.log(resultObj.message);
                res.status(resultObj.status).send(JSON.stringify(resultObj));
            }
        });
};

exports.handleCliResultAction = function (req, res, pool, guiRes) {
    console.log("IN> handleCliResultAction()");

    let resultBody = "";
    req.on("data", function (chunk) {
        resultBody += chunk;
    });

    req.on("end", function () {
        // console.log('No more data in response.');
        console.log("EMS data: " + resultBody.toString());
        // console.log("=====================================================================================");

        if (resultBody) {
            resultObj.success = true;
            resultObj.status = 200;
            resultObj.message = `[SUCCESS] Request was successful!`;
            resultObj.data = JSON.parse(resultBody.escapeSpecialCharsForParse());
            res.status(resultObj.status).send();
            guiRes.status(resultObj.status).send(JSON.stringify(resultObj));
        } else {
            resultObj.success = false;
            resultObj.status = 404;
            resultObj.message = `[FAILURE] Request failure, cause = Empty result JSON data!`;
            res.status(resultObj.status).send();
            guiRes.status(resultObj.status).send(JSON.stringify(resultObj));
        }
        commVar.getInstance().del("cliRes"); // delete the client response
        console.log("=====================================================================================");
    });

    req.on("error", (e) => {
        resultObj.success = false;
        resultObj.status = 400;
        resultObj.message = `[ERROR] Occurred an error! err=\n${e.message}`;
        console.log(resultObj.message);
        res.status(resultObj.status).send(JSON.stringify(resultObj));

        console.log("=====================================================================================");
    });
};

exports.getCliParamEnumList = function (data, socket) {
    console.log("IN> getCliParamEnumList()");

    const cliServerData = require("./cli_server_data");

    let paramId = data.cli.parameter_id;
    let paramName = data.cli.parameter_name;
    let cmdAliases = data.cli.command_alias;
    // let CLI_List = require('./js/cli_server_data').CLI_List;

    let queryForDownFile = ``;
    if (cmdAliases.length > 0) {
        let cliPkgDownGroup = commVar.getInstance().getConst("CLI_PKG_DOWN_GROUP");
        cmdAliases.forEach((alias) => {
            if (Object.keys(cliPkgDownGroup).includes(alias)) {
                let whereIn = (cliPkgDownGroup[alias].length > 1) ? cliPkgDownGroup[alias].join("','") : cliPkgDownGroup[alias];
                queryForDownFile += `SELECT @i:=@i+1 AS enum_value, p.package_file_name AS enum_string FROM HeMS_Package_List AS p, (SELECT @i:=-1) AS dummy
                    WHERE p.model_name IN ('${whereIn}')
                    ORDER BY released_date DESC;\n`;
            }
        });
    }

    // not used yet
    let queryWithParamId = `SELECT l.enum_value, l.enum_string FROM HeMS_Parameter g, HeMS_Parameter_Enum_Lst l
        WHERE g.parameter_id = ${paramId} AND g.enum_group_no = l.enum_group_no;`;
    let queryWithParamName = `SELECT l.enum_value, l.enum_string FROM HeMS_Parameter g, HeMS_Parameter_Enum_Lst l, HeMS_Parameter p
        WHERE p.parameter_name = "${paramName}" AND g.enum_group_no = l.enum_group_no AND g.parameter_id = p.parameter_id`;


    let queryStr = ``;
    if (paramName == "DownloadFile") {
        // for package enum list
        // exception for DownloadFile
        queryStr = queryForDownFile;
    } else { // not used yet
        if (paramId != 0) {
            // query with parameter_id
            queryStr = queryWithParamId;
        } else {
            // query with parameter_name
            queryStr = queryWithParamName;
        }
    }

    let retVal = 0;
    eudbEx.runQuery(queryStr,
        () => { // finally
            if (socket) socket.emit("cli-param-enum-list-result", retVal);
        },
        (rows) => { // success
            // console.log(">>[SQL RESULT] rows.length = ", rows.length);

            if (rows.length > 0) {
                if (paramName == "DownloadFile") {
                    let enumStr = [];
                    rows.forEach((row, idx) => {
                        // console.log(`row =`, row);
                        // for package enum list
                        let CLI_CMD = cliServerData.getCliItem(cmdAliases[idx]);

                        // let enumVal = []; // not used
                        enumStr = [];
                        if (row.length) {
                            // parsing result enum list
                            row.forEach(pkg => {
                                // enumVal.push(pkg.enum_value);
                                enumStr.push(pkg.enum_string);
                            });

                            // updates client cli data for ACT_DOWNLOAD_FILE
                            let tempStr = enumStr.join("|");
                            CLI_CMD.para[0].enumStr = tempStr;
                            CLI_CMD.para[0].enumVal = tempStr;
                        }
                    });
                }

                retVal = rows;
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
            }
        });
};

exports.getInstalledPkgVersion = function (pool, io, data, socket) {
    console.log(`getInstalledPkgVersion, data =`, data);

    console.log(`isRun =`, isRun);
    if (isRun) {
        console.log(`isRunning, so return this query.`);
        return;
    }

    isRun = true;

    let queryStr = `SELECT henb_id, parameter_value FROM HeMS_Device_Param
        WHERE parameter_id=(SELECT parameter_id FROM HeMS_Parameter WHERE parameter_name='InternetGatewayDevice.DeviceInfo.SoftwareVersion')`;

    let enbIds = [],
        paramVals = [];
    eudbEx.runQuery(queryStr,
        () => { // finally
            socket.emit("installed-pkg-version", enbIds, paramVals);
            isRun = false;
        },
        (rows) => { // success
            // console.log(">>[SQL RESULT] rows.length = ", rows.length);
            if (rows.length > 0) {
                for (let i = 0; i < rows.length; i++) {
                    enbIds.push(rows[i].henb_id);
                    paramVals.push(rows[i].parameter_value);
                }
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
            }
        });
};

exports.getPkgListUsingFreqBand = function (req, res) {
    console.log(`IN> getPkgListUsingFreqBand()`);

    let enbId = +req.body.id; // string
    let cliName = req.body.alias; // string
    console.debug(`enbId = ${enbId}, cliName =`, cliName);

    let queryStr = `SELECT henb_id, parameter_value FROM HeMS_Device_Param
        WHERE parameter_id=(SELECT parameter_id FROM HeMS_Parameter WHERE parameter_name='InternetGatewayDevice.Services.FAPService.1.CellConfig.LTE.RAN.RF.FreqBandIndicator')`;

    var retVal = {
        success: false,
        status: 400,
        message: "",
        draw: 0,
        data: []
    };

    let cbCommit = function (rows) {
        retVal.success = true;
        retVal.draw = 1;
        retVal.message = `Request was Done!!!`;
        retVal.data = rows;
        res.status(200).send(retVal);
    };

    let cbRollback = function (err) {
        retVal.message = (err) ? `${err.message}` : `Request was rollback!!!`;
        res.status(400).send(retVal);
    };

    let tasks = [
        function (rows) {
            console.log(`rows =`, rows);

            if (rows && rows.length) {

                let enbIds = commUtil.getValues(rows, "henb_id");
                let idx = enbIds.indexOf(enbId);
                console.debug(`Index(${idx}), enbIds =`, enbIds);

                let freqBand = 0,
                    whereIn;
                const FREQ_BAND_GROUP = commVar.getInstance().getConst("CLI_FREQ_BAND_GROUP");
                const TDD_DOWN_GROUP = ["HeNB-TDD,EL-2000-TDD,EL-4000-TDD", "EL-6000-TDD"];
                const FDD_DOWN_GROUP = ["HeNB-FDD,EL-2000-FDD,EL-4000-FDD", "EL-6000-FDD"];
                if (idx > -1) {
                    freqBand = rows[idx].parameter_value;
                    console.debug(`FreqBand =`, freqBand);
                    if (FREQ_BAND_GROUP.TDD.includes(freqBand)) {
                        whereIn = TDD_DOWN_GROUP.join("','");
                    } else if (FREQ_BAND_GROUP.FDD.includes(freqBand)) {
                        whereIn = FDD_DOWN_GROUP.join("','");
                    } else {
                        throw new Error(`Unknown Freq Band(${freqBand})!!!`);
                    }
                } else {
                    throw new Error(`Not found eNB ID(${enbId})!!!`);
                }

                let query = `SELECT @i:=@i+1 AS enum_value, p.package_file_name AS enum_string FROM HeMS_Package_List AS p, (SELECT @i:=-1) AS dummy
                    WHERE p.model_name IN ('${whereIn}')
                    ORDER BY released_date DESC;`;
                return query;
            } else {
                throw new Error(`Affected rows is empty!!!`);
            }
        },
        function (rows) {
            console.log(`rows =`, rows);
        }
    ];

    eudbEx.beginTs(cbCommit, cbRollback, queryStr, tasks);
};

exports.getPkgListUsingModelName = function (req, res) {
    console.log("IN> getPkgListUsingModelName()");

    let cliName = req.body.alias; // string
    let pkgGroup = commVar.getInstance().getConst("CLI_PKG_DOWN_GROUP")[cliName];
    console.debug(`cliName = ${cliName}, pkgGroup =`, pkgGroup);

    var retVal = {
        success: false,
        status: 400,
        message: "",
        draw: 0,
        data: []
    };

    if (!pkgGroup) {
        retVal.message = `Can't find the package group!!!`;
        res.status(retVal.status).send(retVal);
        return;
    }

    let whereIn = (pkgGroup.length > 1) ? pkgGroup.join("','") : pkgGroup;
    let queryStr = `SELECT @i:=@i+1 AS enum_value, p.package_file_name AS enum_string FROM HeMS_Package_List AS p, (SELECT @i:=-1) AS dummy
        WHERE p.model_name IN ('${whereIn}')
        ORDER BY released_date DESC;`

    eudbEx.runQuery(queryStr,
        () => { // finally
            res.status(retVal.status).send(retVal);
        },
        (rows) => { // success
            // console.log(">>[SQL RESULT] rows.length = ", rows.length);

            if (rows && rows.length) {
                retVal.success = true;
                retVal.status = 200;
                retVal.draw = 1;
                retVal.message = `Request was Done!!!`;
                retVal.data = rows;
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
            }
        });
};