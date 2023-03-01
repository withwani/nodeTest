/* Below is General Definition ================================================================= */
const path = require("path");

const commUtil = require("./common_util");
const moment = require("moment");
const async = require("async");

function ImportObj(filename) {
    // console.log(`filename =`, filename); // i.e. 20171010160427-HeMS_Alarm_History-T-Backup.sql
    let params = filename.split("-");

    this.date = moment().format("YYYY-MM-DD HH:mm:ss");
    // this.backupDate = moment(params[0], "YYYY-MM-DD HH:mm:ss");
    this.target = params[1];
    this.type = params[2];
    this.filename = filename;
    // this.isApplied = "N";
    // this.appliedDate = "";
}

/* Below is Export Function ================================================================= */
/**
 * get restore files list
 * @param {object} req The request from Client.
 * @param {object} res The response to Client.
 * @param {object} pool The DB pool.
 */
exports.getRestoreListAction = function getDBRestoreListAction(req, res, pool) {
    console.log("IN> get_restore_list()");

    var draw = req.body.draw;
    var columns = req.body.columns;
    var order = req.body.order;
    var start = parseInt(req.body.start);
    var length = parseInt(req.body.length);
    var search = req.body.search;

    let ORDER_BY_PHRASE = commUtil.makeOrderPhrase(order, columns);
    let query = `SELECT * FROM HeMS_Backup_Import
        WHERE imported_file like '%${search.value}%' OR imported_target like '%${search.value}%'
        ORDER BY ${ORDER_BY_PHRASE} limit ${start},${length};

        SELECT count(*) as count FROM HeMS_Backup_Import
        WHERE imported_file like '%${search.value}%' OR imported_target like '%${search.value}%';`;

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
                    // console.log(`>>[SQL RESULT] Restore counts = ${rows[0].length}`);
                } else {
                    // console.log(">>[SQL RESULT] Empty restore");
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
 * Apply the seleted import file
 * @param {object} req The request from Client.
 * @param {object} res The response to Client.
 * @param {object} pool The DB pool.
 * @param {string} importPath The path of backup folder.
 */
exports.handleRestoreAction = function(req, res, pool, importPath) {
    console.log("IN> handleRestoreAction()");
    let rowData = req.body.rowData;
    let type = req.body.type;
    console.log(`type(${type}), rowData = `, rowData);

    let files = req.files;
    console.log(`files =`, files);

    if (type == "ADD") {
        let impObj = new ImportObj(files[0].originalname); // for single file, multi-file is TBD...
        console.log(`Backup Object =`, impObj);

        let query = `INSERT INTO HeMS_Backup_Import (imported_date, imported_target, imported_target_type, imported_file, is_applied, applied_date)
            VALUES ('${impObj.date}', '${impObj.target}', '${impObj.type}', '${impObj.filename}', 'N', NULL)
            ON DUPLICATE KEY UPDATE imported_file=imported_file`;

        // if(checkFileExist(files)) { // validation check
        if (pool) {
            // get connection poll
            pool.getConnection(function(err, conn) {
                if (err) {
                    console.log("getConnection err");
                    conn.release(); //must release
                    return;
                }
                console.log("DB thread ID : " + conn.threadId);

                var exec = conn.query(query, function(err, rows) {
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
        }
    } else if (type == "DEL") {
        let query = `DELETE FROM HeMS_Backup_Import
            WHERE imported_file='${rowData.imported_file}'`;

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
                        console.error(`${err.message}\n` + err.stack);
                        return;
                    }

                    if (rows.affectedRows && rows.affectedRows > 0) {
                        // console.log(`>>[SQL RESULT] result len = ${rows.affectedRows}`);
                        res.json({
                            result: true,
                            draw: 1
                        });
                        res.end();
                    } else {
                        // console.log(">>[SQL RESULT] Wrong result");
                        res.status(400).send("NOK: Wrong result!");
                    }
                });
            });
        }
    } else if (type == "APPLY") {
        async.waterfall([
                function handleTerminalCmd(callback) {
                    console.log(`[ASYNC, T0] handleTerminalCmd()`);

                    // let dbConfig = commVar.getInstance().get("euConfig").dbConfig;
                    let dbConfig = commVar.getInstance().get("euConfig").dbConfig;
                    // const applyQuery = `mysql -u${dbConfig.user} -p${dbConfig.password} ${dbConfig.database} < ${importPath}${rowData.imported_file}`;
                    // const applyQuery = `mysql -uroot -proot ${dbConfig.database} < ${importPath}${rowData.imported_file}`;
                    let importFile = path.resolve(importPath, rowData.imported_file);
                    const applyQuery = `mysql -uroot -proot ${dbConfig.database} < ${importFile}`;
                    console.log(`Apply Query =`, applyQuery);

                    const { exec } = require("child_process");
                    exec(applyQuery, (error, stdout, stderr) => {
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
                function updateImportedBackupInfo(callback) {
                    console.log(`[ASYNC, T1] updateImportedBackupInfo(callback)`);

                    let query = `UPDATE HeMS_Backup_Import
                    SET is_applied = 'Y', applied_date = '${moment().format("YYYY-MM-DD HH:mm:ss")}'
                    WHERE imported_file = '${rowData.imported_file}'`;

                    if (pool) {
                        // get connection poll
                        pool.getConnection(function(err, conn) {
                            if (err) {
                                console.log("getConnection err");
                                conn.release(); //must release
                                callback(err, "DB Connection Error");
                                return;
                            }
                            console.log("DB thread ID :" + conn.threadId);

                            var exec = conn.query(query, function(err, rows) {
                                conn.release(); //must release
                                console.debug("$$[EXEC SQL] : " + exec.sql);
                                if (err) {
                                    console.log(`>>[SQL err] = `, err);
                                    callback(err, "DB Update Error");
                                    return;
                                }

                                // if(rows.length > 0){
                                if (rows.affectedRows && rows.affectedRows > 0) {
                                    // console.log(`>>[SQL RESULT] result len = ${rows.affectedRows}`);
                                    callback(null, "Done");
                                } else {
                                    // console.log(">>[SQL RESULT] Wrong result");
                                    callback(new Error("Empty result!"));
                                }
                            });
                        });
                    }
                }
            ],
            function(err, result) { // result function
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
    }
};

/**
 * check the duplicated file
 * @param {object} req The request from Client.
 * @param {object} res The response to Client.
 * @param {object} pool The DB pool.
 * @param {object} socket The assigned socket.
 */
exports.checkRestoreDuplication = function checkDuplicatedFile(pool, res, data, socket) {
    console.log("IN> checkRestoreDuplication()");

    let query = `SELECT * FROM HeMS_Backup_Import WHERE imported_file='${data.file}'`;

    if (pool) {
        // get connection poll
        pool.getConnection(function(err, conn) {
            if (err) {
                console.log("getConnection err");
                conn.release(); //must release
                return;
            }
            console.log("DB thread ID :" + conn.threadId);

            // var exec = conn.query(`SELECT EXISTS (SELECT * FROM HeMS_Package_List WHERE package_file_name = '${data}') as result`, function(err, rows) {
            var exec = conn.query(query, function(err, rows) {
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
                socket.emit("restore-check-duplication-result", result);
            });
        });
    }
};

/**
 * Handles uploading of the imported files
 * @param {object} req The request from Client.
 * @param {object} res The response to Client.
 * @param {object} pool The DB pool.
 */
exports.handleImportUploadAction = function handleImportUloadAction(req, res, pool) {
    console.log(`IN> handleImportUploadAction()`);
    let files = req.files;
    console.log(`files =`, files);

    let impObj = new ImportObj(files[0].originalname); // for single file, multi-file is TBD...
    console.log(`Import Object =`, impObj);

    let query = `INSERT INTO HeMS_Backup_Import (imported_date, imported_target, imported_target_type, imported_file, is_applied, applied_date)
        VALUES ('${impObj.date}', '${impObj.target}', '${impObj.type}', '${impObj.filename}', 'N', NULL)
        ON DUPLICATE KEY UPDATE imported_file=imported_file`;

    // if(checkFileExist(files)) { // validation check
    if (pool) {
        // get connection poll
        pool.getConnection(function(err, conn) {
            if (err) {
                console.log("getConnection err");
                conn.release(); //must release
                return;
            }
            console.log("DB thread ID : " + conn.threadId);

            var exec = conn.query(query, function(err, rows) {
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
    }
};