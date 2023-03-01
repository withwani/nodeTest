/* Below is General Definition ================================================================= */
const path = require("path");

const moment = require("moment");
const async = require("async");

const commUtil = require("./common_util");
const commVar = require("./common_var");

/* for the backup upload function

function BackupObj(filename) {
    // console.log(`filename =`, filename); // i.e. 20171010160427-HeMS_Alarm_History-T-Backup.sql
    let params = filename.split("-");

    this.date = moment().format("YYYY-MM-DD HH:mm:ss");
    // this.backupDate = moment(params[0], "YYYY-MM-DD HH:mm:ss");
    this.target = params[1];
    this.type = params[2];
    this.filename = filename;
    // this.isApplied = "N";
    // this.appliedDate = "";
} */

/* Below is Export Function ================================================================= */
/**
 * get backup files list
 * @param {object} req The request from Client.
 * @param {object} res The response to Client.
 * @param {object} pool The DB pool.
 */
exports.getBackupListAction = function getDBBackupListAction(req, res, pool) {
    console.log("IN> getBackupListAction()");

    var draw = req.body.draw;
    var columns = req.body.columns;
    var order = req.body.order;
    var start = parseInt(req.body.start);
    var length = parseInt(req.body.length);
    var search = req.body.search;

    let ORDER_BY_PHRASE = commUtil.makeOrderPhrase(order, columns);

    // console.log(`req.body = `, req.body);
    let query = `SELECT * FROM HeMS_Backup_History
        WHERE bk_file like '%${search.value}%' OR bk_target like '%${search.value}%'
        ORDER BY ${ORDER_BY_PHRASE} limit ${start},${length};

        SELECT count(*) as count FROM HeMS_Backup_History
        WHERE bk_file like '%${search.value}%' OR bk_target like '%${search.value}%';`;

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
                console.debug(`$$[EXEC SQL] :` + exec.sql);
                if (err) {
                    console.error(`${err.message}\n` + err.stack);
                    return;
                }

                if (rows.length > 0) {
                    // console.log(`>>[SQL RESULT] Backup counts = ${rows[0].length}`);
                } else {
                    // console.log(">>[SQL RESULT] Empty backup");
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
 * Handles backup action
 * @param {object} req The request from Client.
 * @param {object} res The response to Client.
 * @param {object} pool The DB pool.
 */
exports.handleBackupAction = function handleDBBackupActionEvent(req, res, pool) {
    console.log("IN> handleBackupAction(), do nothing!!!");

    let rowData = req.body.rowData;
    let type = req.body.type;
    console.log(`type(${type}), rowData = `, rowData);

    async.waterfall([
            function handleTerminalCmd(callback) {
                console.log(`[ASYNC, T0] handleTerminalCmd()`);

                let backupFile = path.resolve(commVar.getInstance().get("backupPath"), rowData.bk_file);
                let importPath = commVar.getInstance().get("importPath");

                const copyQuery = `cp ${backupFile} ${importPath}`;
                console.log(`Query =`, copyQuery);

                const {
                    exec
                } = require("child_process");
                exec(copyQuery, (error, stdout, stderr) => {
                    if (error) {
                        // console.error(`${error.message}\n` + error.stack);
                        callback(error, "Terminal Command Query Error");
                        return;
                    }
                    console.log(`stdout: ${stdout}`);
                    console.log(`stderr: ${stderr}`);
                    callback(null);
                });
            },
            function insertImportedBackupInfo(callback) {
                console.log(`[ASYNC, T1] insertImportedBackupInfo(callback)`);

                let query = `INSERT INTO HeMS_Backup_Import (imported_date, imported_target, imported_target_type, imported_file, is_applied, applied_date)
                VALUES ('${moment().format("YYYY-MM-DD HH:mm:ss")}', '${rowData.bk_target}', '${rowData.bk_target_type}', '${rowData.bk_file}', 'N', NULL)
                ON DUPLICATE KEY UPDATE imported_file=imported_file`;

                if (pool) {
                    // get connection poll
                    pool.getConnection(function (err, conn) {
                        if (err) {
                            console.log("getConnection err");
                            conn.release(); //must release
                            callback(err, "DB Connection Error");
                            return;
                        }
                        console.log("DB thread ID :" + conn.threadId);

                        var exec = conn.query(query, function (err, rows) {
                            conn.release(); //must release
                            console.debug(`$$[EXEC SQL] :` + exec.sql);
                            if (err) {
                                console.error(`${err.message}\n` + err.stack);
                                return;
                            }

                            if (rows.affectedRows && rows.affectedRows > 0) {
                                // console.log(`>>[SQL RESULT] result len = ${rows.affectedRows}`);
                                callback(null, "Done");
                            } else {
                                // console.log(">>[SQL RESULT] Wrong result");
                                callback(new Error("NOK: The file was not inserted to DB.(cause: Query error)"));
                            }
                        });
                    });
                }
            }
        ],
        function (err, result) { // result function
            console.log(`[ASYNC, DONE] result =`, result);
            if (err) {
                console.error(`${err.message}\n` + err.stack);
                res.status(400).send(err.message);
                return;
            }

            res.json({
                result: true,
                draw: 1
            });
            res.end();
        });
};

/**
 * Check the duplicated file
 * @param {object} req The request from Client.
 * @param {object} res The response to Client.
 * @param {object} pool The DB pool.
 */
exports.checkBackupDuplication = function checkDuplicatedFile(pool, res, data, socket) {
    console.log("IN> checkBackupDuplication()");

    /* for the backup upload function

    let query = `SELECT * FROM HeMS_Backup_Import WHERE imported_file='${data.file}'`;

    if (pool) {
        // get connection poll
        pool.getConnection(function (err, conn) {
            if (err) {
                console.log("getConnection err");
                conn.release(); //must release
                return;
            }
            console.log("DB thread ID :" + conn.threadId);

            // var exec = conn.query(`SELECT EXISTS (SELECT * FROM HeMS_Package_List WHERE package_file_name = '${data}') as result`, function(err, rows) {
            var exec = conn.query(query, function (err, rows) {
                conn.release(); //must release
                console.debug(`$$[EXEC SQL] :` + exec.sql);
                if (err) {
                    console.error(`${err.message}\n` + err.stack);
                    return;
                    // throw err;
                }

                let result = false;
                if (rows.length > 0) {
                    // console.log(`>>[SQL RESULT] File existence check: NOK`);
                } else {
                    // console.log(`>>[SQL RESULT] File existence check: OK, process next step...`);
                    result = true;
                }
                socket.emit("backup-check-duplication-result", result);
            });
        });
    } */
};

/**
 * Handles uploaded backup files
 * @param {object} req The request from Client.
 * @param {object} res The response to Client.
 * @param {object} pool The DB pool.
 */
exports.handleBackupUploadAction = function handleBackupUloadAction(req, res, pool) {
    console.log(`IN> handleBackupUploadAction()`);

    /* for the backup upload function

    let files = req.files;
    console.log(`files =`, files);

    let bkObj = new BackupObj(files[0].originalname); // for single file, multi-file is TBD...
    console.log(`Backup Object =`, bkObj);

    let query = `INSERT INTO HeMS_Backup_Import (imported_date, imported_target, imported_target_type, imported_file, is_applied, applied_date)
        VALUES ('${bkObj.date}', '${bkObj.target}', '${bkObj.type}', '${bkObj.filename}', 'N', NULL)
        ON DUPLICATE KEY UPDATE imported_file=imported_file`;

    // if(checkFileExist(files)) { // validation check
    if (pool) {
        // get connection poll
        pool.getConnection(function (err, conn) {
            if (err) {
                console.log("getConnection err");
                conn.release(); //must release
                return;
            }
            console.log("DB thread ID : " + conn.threadId);

            var exec = conn.query(query, function (err, rows) {
                conn.release(); //must release
                console.debug(`$$[EXEC SQL] :` + exec.sql);

                if (err) {
                    console.error(`${err.message}\n` + err.stack);
                    return;
                }

                if (rows.affectedRows > 0) {
                    console.log("SUCCESS: The file was inserted to DB.");
                    res.send("OK");
                } else {
                    console.log("FAILURE: The file was not inserted to DB.");
                    res.status(400).send("NOK: The file was not inserted to DB.(cause: Query error)");
                }
            });
        });
    } */
};