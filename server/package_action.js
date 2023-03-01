/* Below is General Definition ================================================================= */
const commUtil = require('./common_util');
const moment = require("moment");
// const fs = require("fs");
const eudbEx = require("./eu_mysqlEx")();

function PackageObj(filename, model, software, firmware, active) {

    function convertFilenameToVersion(filename) {
        let tempArr = (filename.split(".")[0]).split("_");
        let mCode = tempArr[0]; // manufacturing code
        tempArr.splice(0, 2); // delete mCode, SPICO
        let version = `${mCode}_${tempArr.join(".")}`;
        return version;
    }

    function getSwFwVersion(ver, flag) {
        let temp = ver.split("_");
        return (flag === "sw") ? temp[1] : "";

        /* if (temp[0] === "EU" || temp[0] === "CT") {
            return (flag === "sw") ? temp[1] : "";
        } else if (temp[0] === "ACS-RM130(ND)" || temp[0] === "ACS-PU300(KG)") {
            return (flag === "sw") ? temp[1] : "";
        } */
    }

    this.filename = filename;
    this.version = convertFilenameToVersion(filename);
    this.model = model || "";
    this.firmware = firmware || getSwFwVersion(this.version, "fw");
    this.software = software || getSwFwVersion(this.version, "sw");
    this.releaseDate = moment().format("YYYY-MM-DD HH:mm:ss");
    this.active = active || false;
}

/* Below is Export Function ================================================================= */

/**
 * Get directory path
 * @param {integer} level The upper level to return path, 0: current directory, 1: parent directory path
 * @return {string} The absolute path with until specified parent directory.
 */
/* function getDirPath(level) {
    console.log(`IN> getDirPath(${level})`);

    var order = level;
    var dirname = __dirname.split("/");
    var result = "";

    for (var i = 0; i < dirname.length - order; i++) {
        result += dirname[i] + "/";
    }
    console.log("getDirPath(), result = " + result);
    return result;
} */

/**
 * Check file existence & duplication
 * @param {object} upFile The uploaded file objects.
 * @return {boolean} Return whether the file already exists or is duplicated.
 */
/* function checkFileExist(upFile) {
    console.log(`IN> checkFileExist()`);

    if (!upFile) {
        console.log(`Input file is null. ${upFile}`);
        return false;
    }

    var savedFile = upFile;
    var count = 0;
    let existFile = [];

    for (var i = 0; i < savedFile.length; i++) {
        console.log(`existence check! file[${i}] path: ${savedFile[i].path}`);
        if (fs.existsSync(savedFile[i].path)) { // for server test, returns true if the file exists, false otherwise.
            existFile.push(savedFile[i].filename);
            count++;
        }
    }

    if (count) { // Any file already exists.
        console.log(`Any file already exists in file system. ${existFile}`);
        return false;
    }

    return true;
} */

exports.checkPackageDuplication = function checkDuplicatedFile(pool, res, data, socket) {
    console.log("IN> checkPackageDuplication()");

    if (pool) {
        // get connection poll
        pool.getConnection(function(err, conn) {
            if (err) {
                console.log("getConnection err");
                conn.release(); //must release
                return;
            }
            console.log("DB thread ID :" + conn.threadId);

            let query = `SELECT count(*) as count FROM HeMS_Package_List WHERE package_file_name='${data.file}'`;
            let result = false;

            // var exec = conn.query(`SELECT EXISTS (SELECT * FROM HeMS_Package_List WHERE package_file_name = '${data}') as result`, function(err, rows) {
            var exec = conn.query(query, function(err, rows) {
                conn.release(); //must release
                console.debug("$$[EXEC SQL] : " + exec.sql);

                if (err) {
                    // throw err;
                    // console.log(`>>[SQL RESULT] Processing the query returned an error!, err =`, err);
                }

                if (rows.length > 0) {
                    if (rows[0].count > 0) {
                        // console.log(`>>[SQL RESULT] File existence check: NOK`);
                    } else {
                        // console.log(`>>[SQL RESULT] File existence check: OK, process next step...`);
                        result = true;
                    }
                } else {
                    // console.log(`>>[SQL RESULT] Something wrong! rows is empty!`);
                }
                socket.emit("package-check-duplication-result", result);
            });
        });
    }
};

exports.getPackageListItem = function (req, res, pool) {
    console.log("IN> getPackageListItem()");

    // var draw = req.body.draw;
    var columns = req.body.columns;
    var order = req.body.order;
    var start = parseInt(req.body.start);
    var length = parseInt(req.body.length);
    var search = req.body.search;

    let ORDER_BY_PHRASE = commUtil.makeOrderPhrase(order, columns);
    let query = `SELECT * FROM HeMS_Package_List
        WHERE package_version like '%${search.value}%' OR package_file_name like '%${search.value}%'
        ORDER BY ${ORDER_BY_PHRASE} limit ${start},${length};

        SELECT count(*) as count FROM HeMS_Package_List
        WHERE package_version like '%${search.value}%' OR package_file_name like '%${search.value}%';`;

    if (pool) {
        // get connection poll
        pool.getConnection(function(err, conn) {
            if (err) {
                console.log("getConnection err");
                conn.release(); //must release
                return;
            }
            console.log("DB thread ID :" + conn.threadId);

            var exec = conn.query(query, function(err, rows) {
                conn.release(); //must release
                console.debug("$$[EXEC SQL] : " + exec.sql);
                if (err) {
                    throw err;
                }

                if (rows.length > 0) {
                    // console.log(`>>[SQL RESULT] Package file counts = ${rows[0].length}`);
                } else {
                    // console.log(">>[SQL RESULT] Empty Package file");
                }

                var list = [];
                list = rows[0];

                var json = {
                    "type": true,
                    "draw": req.body.draw,
                    "recordsTotal": rows[1][0].count,
                    "recordsFiltered": rows[1][0].count,
                    "data": list
                };
                res.json(json);
            });
        });
    }
};

/**
 * This is the funtion for handling of actions related the Package
 * @param {object} req GUI request
 * @param {object} res GUI response
 * @param {object} pool DB pool
 */
exports.handlePackageAction = function handlePackageActionEvent(req, res, pool) {
    console.log("IN> handlePackageAction()");

    let rowData = req.body.rowData;
    let type = req.body.type;
    let actFlag = (req.body.active == "true") ? true : false;
    console.log(`type(${type}), rowData = `, rowData);

    // In add case, refer to the function handlePkgUploadAct()
    let editQuery = `UPDATE HeMS_Package_List
        SET firmware_version='${rowData.firmware_version}', software_version='${rowData.software_version}', model_name='${rowData.model_name}'
        WHERE package_no='${rowData.package_no}'`;
    let delQuery = `DELETE FROM HeMS_Package_List
        WHERE package_no='${rowData.package_no}'`;

    let query = ``;

    let setActiveFlagQuery = `UPDATE HeMS_Package_List
        SET active_flag=
            CASE
                WHEN package_no=${rowData.package_no} THEN 'Y'
            ELSE
                NULL
            END
        WHERE model_name='${rowData.model_name}'`;

    let unsetActiveFlagQuery = `UPDATE HeMS_Package_List
        SET active_flag=NULL
        WHERE package_no=${rowData.package_no}`;


    switch (type) {
        case "EDIT":
            query = editQuery;
            break;
        case "DEL":
            query = delQuery;
            break;

        default:
            console.log(`Unknown Type(${type})`);
            break;
    }

    let retVal = {
        result: false,
        type: type,
        draw: 0,
        message: null,
        data: null
    };

    let cbCommit = function(rows) {
        retVal.result = true;
        retVal.draw = 1;
        retVal.message = `[SUCCESS] request was successful.`;
        retVal.data = rows;
        console.log(`retVal =`, retVal);
        res.json(retVal);
    };

    let cbRollback = function(err) {
        retVal.message = `[ERROR] err no(${err.errno}), code: ${err.code}`;
        console.log(`retVal =`, retVal);
        res.json(retVal);
    };

    let tasks = [
        function (rows) {
            console.log(`rows =`, rows);

            if (rows.affectedRows) {
                if (type == "EDIT") {
                    return (actFlag) ? setActiveFlagQuery : unsetActiveFlagQuery;
                }

                return null; // passed the rows to next then
            } else {
                throw (new Error(`Invalid Query Result: affectedRows = ${rows.affectedRows}`));
            }
        },
        function (rows) {
            console.log(`rows =`, rows);
        }
    ];

    eudbEx.beginTs(cbCommit, cbRollback, query, tasks);
};

/**
 * Handles uploaded package files
 * @param {object} req The request from Client.
 * @param {object} res The response to Client.
 * @param {object} pool The DB pool.
 */
exports.handlePkgUploadAct = function handlePackageUloadAction(req, res, pool) { //, io) {
    console.log(`IN> handlePkgUploadAct()`);

    let files = req.files;
    console.log(`Received files =`, files);
    let swVer = req.body.sw_ver;
    let fwVer = req.body.fw_ver;
    let mdName = req.body.md_name;
    let actFlag = (req.body.act_flag == "true") ? true : false;
    console.log(`[Param Info] sw_ver: ${swVer}, fw_ver: ${fwVer}, model_name: ${mdName}, active_flag: ${actFlag}`);

    let pkgObj = new PackageObj(files[0].originalname, mdName, swVer, fwVer, actFlag); // for single file, multi-file is TBD...
    console.log(`new Package Object =`, pkgObj);

    var postfix = (pkgObj.filename).substr((pkgObj.filename).lastIndexOf("."));
    console.log(`postfix =`, postfix);

    // let pattern = new RegExp(/([A-z]+)_([0-9]+)\.([0-9]+)\.([0-9]+)/);
    let pattern = new RegExp(/([A-z-()0-9]+)_([0-9]+)\.([0-9]+)\.([0-9]+)/);
    if (!pattern.test(pkgObj.version)) {
        console.error(`Wrong PKG version pattern! PKG version =`, pkgObj.version);
        res.status(400).send("NOK: The file was not inserted to DB.(CAUSE: Wrong pattern)");
        return;
    }

    let insertQuery = `INSERT INTO HeMS_Package_List (package_version, firmware_version, software_version, released_date, package_file_name, model_name)
        VALUES ('${pkgObj.version}', '${pkgObj.firmware}', '${pkgObj.software}', '${pkgObj.releaseDate}', '${pkgObj.filename}', '${pkgObj.model}')`;

    let activeUpdateQuery = `UPDATE HeMS_Package_List
        SET active_flag=
            CASE
                WHEN package_file_name='${files[0].originalname}' THEN 'Y'
            ELSE
                NULL
            END
        WHERE model_name='${mdName}'`;

    let queryStr = insertQuery;

    let cbCommit = function(rows) {
        if (rows.affectedRows) {
            console.log(`SUCCESS: Querying was successful.`);
            res.send("Querying was successful.");
        } else {
            console.log(`FAILURE: Querying failed.`);
            res.status(400).send(`NOK: Querying failed.`);
        }
    };

    let cbRollback = function(err) {
        if (err) console.error(err.message);
        res.status(400).send(`NOK-Rollback Query:${err.message}`);
    };

    let tasks = [
        function (rows) {
            console.log(`rows =`, rows);

            if (rows.affectedRows && actFlag) {
                return activeUpdateQuery;
            } else {
                return null;
            }
        },
        function (rows) {
            console.log(`rows =`, rows);
        }
    ];

    eudbEx.beginTs(cbCommit, cbRollback, queryStr, tasks);
};

/**
 * Handles set to active package files
 * @param {object} req The request from Client.
 * @param {object} res The response to Client.
 * @param {object} pool The DB pool.
 * @param {object} io IO socket.
 */
exports.handlePkgSetToActiveAct = function handlePackageSetToActiveAction(req, res) {

    let type = req.body.type;
    let rowData = req.body.rowData;
    console.log(`IN> handlePkgSetToActiveAct(), type(${type}), rowData =`, rowData);

    let queryStr = `UPDATE HeMS_Package_List SET active_flag=
        CASE WHEN package_no=${rowData.package_no} THEN 'Y'
        ELSE NULL
        END WHERE model_name='${rowData.model_name}'`;

    let retVal = {
        result: false,
        draw: 0,
        message: "",
        data: null
    };

    eudbEx.runQuery(queryStr,
        () => { // finally
            res.json(retVal);
        },
        (rows) => { // success
            if (rows.affectedRows && rows.affectedRows > 0) {
                retVal.result = true;
                retVal.draw = 1;
                retVal.message = `Set to Active action is done, the page will be reloaded.`;
                retVal.data = rows;

                req.app.io.sockets.emit("set-new-active-package", {
                    messageType: "broadcast",
                    command: "set_new_active_package",
                    transactionId: "",
                    result: retVal
                });
            }
        },
        (err) => {
            if (err) {
                console.error(`${err.message}\n` + err.stack);
                retVal.message = err.message;
                retVal.data = err;
            }
        });
};