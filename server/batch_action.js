/* Below is General Definition ================================================================= */
const moment = require("moment");

const commUtil = require("./common_util");
const commVar = require("./common_var");
const eudbEx = require("./eu_mysqlEx")();
// const scheduler = require("./eu_scheduler").getInstance();
const scheduler = commVar.getInstance().get("euScheuler");
const cliAction = require("./cli_action");

/* Below is Inner Function ================================================================= */
function tickCallback(batchCmds, jobInfo, userId) {
    let async = require("async");
    let batchObjs = [];
    let tasks = [
        function(callback) {
            batchCmds.forEach((command, index) => {
                let runId = (userId) ? userId : command.job_user;
                let postData = commUtil.parseJsonForDB(command.command_context);
                let orderStr = `${index + 1}/${batchCmds.length}`;
                postData["batch_id"] = jobInfo.jobId;
                postData["batch_order"] = orderStr;
                postData["user_id"] = `${runId}@job${jobInfo.jobId}_${jobInfo.jobTitle}(${orderStr})`;

                let enbId = (postData.henb_id) ? postData.henb_id : 0;
                let groupName = (postData.commandGroup) ? postData.commandGroup : undefined;
                let batchObj = {
                    enbId: enbId,
                    groupName: groupName,
                    postData: JSON.stringify(postData)
                };

                batchObjs.push(batchObj);
            });
            callback(null, batchObjs);
        },
        function(batches, callback) {
            var send = function(postData, _callback) {
                cliAction.handleCliActionForBatch(postData, _callback);
            };

            var next = function(index) {
                if (!batches[index]) return callback(null);

                var data = batches[index];
                send(data, function(err) {
                    if (err) console.error(`${err.message}\n` + err.stack);
                    next(index + 1);
                });
            };

            next(0);
        }
    ];

    async.waterfall(tasks, function(err) {
        if (err)
            console.error(`${err.message}\n` + err.stack);
        else
            console.log(`### The batch(${jobInfo.jobId}_${jobInfo.jobTitle}) operation was completed. ###############################################`);
    });
}

function endCallback(io, jobId, type, status = 3) {
    console.log(`IN> endCallback(jobId: ${jobId}, type: ${type}, status: ${status})`);

    return new Promise((resolve, reject) => {
        let queryStr = `DELETE FROM HeMS_Batch_Job_Current
            WHERE job_id='${jobId}'`;

        let cbCommit = function(rows) {
            let aliveJob = scheduler.getJobs()[jobId];
            if (aliveJob) aliveJob.cancel(true);

            console.debug(`endCallback.then(), result =`, rows);
            if (io) io.sockets.emit("batch-job-status-reload", rows);
            return resolve(rows);
        };

        let cbRollback = function(err) {
            return reject(err);
        };

        let tasks = [
            function (rows) {
                // Transaction #1 result
                if (rows && rows.hasOwnProperty("affectedRows") && rows.affectedRows) {
                    return `UPDATE HeMS_Batch_Job
                        SET job_status=${status}
                        WHERE job_id='${jobId}'`;
                } else {
                    throw new Error(`Affected rows is empty!!!`);
                }
            },
            function (rows) {
                // Transaction #2 result
            }
        ];

        eudbEx.beginTs(cbCommit, cbRollback, queryStr, tasks);
    });
}

function endCallbackDelete(jobId) {
    console.log(`IN> endCallbackDelete(jobId: ${jobId})`);
    return new Promise((resolve, reject) => {

        let queryStr = `DELETE FROM HeMS_Batch_Job_Current
            WHERE job_id='${jobId}'`;

        let cbCommit = function(rows) {
            let aliveJob = scheduler.getJobs()[jobId];
            if (aliveJob) {
                aliveJob.cancel();
            }

            console.log(`endCallbackDelete.then(), result =`, rows);
            commVar.getInstance().get("euIo").sockets.emit("batch-job-status-reload", rows);
            return resolve(rows);
        };

        let cbRollback = function(err) {
            return reject(err);
        };

        let tasks = [
            function (rows) {
                console.log(`rows =`, rows);

                // Regardless of the value rows
                let query = `DELETE FROM HeMS_Batch_Job
                    WHERE job_id='${jobId}'`;

                return query;
            },
            function (rows) {
                console.log(`rows =`, rows);

                if (rows && rows.hasOwnProperty("affectedRows") && rows.affectedRows) {
                    // console.log(`>>[SQL RESULT] success query, rows.affectedRows =`, rows.affectedRows);
                    let query = `DELETE FROM HeMS_Batch_Job_Command
                        WHERE job_id='${jobId}'`;

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
    });
}

function handleBatchJobAdd(req, res, pool) {
    console.log(`IN> handleBatchJobAdd()`);

    let type = req.body.type;
    let rowData = req.body.rowData;
    let userId = req.session.user;
    console.debug(`User(${userId}), CMD(${type}), rowData =`, rowData);

    // get Form data
    let title = req.body.title_batch_job;
    let interval = req.body.sel_batch_interval;
    let startTime = (req.body.cal_start_time) ? `'${moment(req.body.cal_start_time).format()}'` : null;
    let endTime = (req.body.cal_end_time) ? `'${moment(req.body.cal_end_time).format()}'` : null;
    console.debug(`title(${title}), interval(${interval}), startTime(${startTime}), endTime(${endTime})`);

    let queryStr = `INSERT INTO HeMS_Batch_Job
        SET job_title='${title}', start_time=${startTime}, end_time=${endTime}, job_interval='${interval}', job_user='${userId}', job_status='0';`

    let retVal = {
        success: false,
        status: 400,
        message: "",
        draw: 0
    };

    let cbCommit = function(rows) {
        retVal.success = true;
        retVal.draw = 1;
        retVal.message = `Request was Done!!!`;

        res.status(200).send(retVal);
    };

    let cbRollback = function(err) {
        retVal.message = (err) ? `${err.message}` : `Request was rollback!!!`;
        res.status(400).send(retVal);
    };

    let tasks = [
        function (rows) {
            console.log(`rows =`, rows);

            if (rows && rows.hasOwnProperty("affectedRows") && rows.affectedRows) {
                let query = `SELECT job_id FROM HeMS_Batch_Job
                    WHERE job_title='${title}';`;
                return query;
            } else {
                throw new Error(`Affected rows is empty!!!`);
            }
        },
        function (rows) {
            console.log(`rows =`, rows);

            if (rows && rows.length && rowData) {
                let linkPhrase = "";

                for (let i = 0; i < rowData.length; i++) {
                    if (i > 0) linkPhrase += ",";
                    linkPhrase += `(${rows[0].job_id}, ${rowData[i].command_id}, ${i})`;
                }
                console.log(`linkPhrase =`, linkPhrase);
                let query = `INSERT INTO HeMS_Batch_Job_Command
                    VALUES ${linkPhrase};`;
                return query;
            } else {
                throw new Error(`Affected rows or rowData is empty!!!`);
            }
        },
        function (rows) {
            console.log(`rows =`, rows);
        }
    ];

    eudbEx.beginTs(cbCommit, cbRollback, queryStr, tasks);
}

function handleBatchJobRun(req, res) {
    console.log(`IN> handleBatchJobRun()`);

    let type = req.body.type,
        rowData = req.body.rowData,
        userId = req.session.user,
        queryStr, callback, rule, state = 1,
        jobId = rowData.job_id + "",
        jobTitle = rowData.job_title;

    let jobInfo = {
        jobId: jobId,
        jobTitle: jobTitle
    }
    console.debug(`User(${userId}), CMD(${type}), rowData =`, rowData);

    // Run Query
    queryStr = `UPDATE HeMS_Batch_Job
        SET job_user='${userId}', job_status='2'
        WHERE job_title='${rowData.job_title}'`;

    let retVal = {
        success: false,
        status: 400,
        message: "",
        draw: 0
    };

    let cbCommit = function(rows) {
        let aliveJob = scheduler.getJobs()[jobId];
        if (aliveJob) {
            aliveJob.reschedule(rule); // re-scheduled job if the job exists in job list of scheduler
        } else {
            // created new scheduler job
            scheduler.runJob(jobId, rule, callback, function() {
                endCallback(req.app.io, jobId, "RUN")
                .then(result => {
                    console.debug(`endCallback.then(), result =`, result);
                })
                .catch(err => {
                    console.error(`${err.message}\n` + err.stack);
                });
            });
        }

        retVal.success = true;
        retVal.draw = 1;

        res.status(200).send(retVal);
    };

    let cbRollback = function(err) {
        retVal.message = (err) ? `${err.message}` : `Request was rollback!!!`;
        res.status(400).send(retVal);
    };

    let tasks = [
        function (rows) {
            // Transaction #1 result
            if (rows && rows.hasOwnProperty("affectedRows") && rows.affectedRows) {
                return `SELECT a.command_id, a.command_name, a.command_context FROM HeMS_Batch_Command a, HeMS_Batch_Job_Command b
                    WHERE b.job_id=${jobId} AND a.command_id=b.command_id
                    ORDER BY b.command_exe_order ASC`;
            } else {
                throw new Error(`Affected rows is empty!!!`);
            }
        },
        function (rows) {
            // Transaction #2 result
            if (rows && rows.length && rowData) {
                const DELAY_SECONDS = 3;
                let startTime = (rowData.start_time) ? moment.utc(rowData.start_time).subtract(DELAY_SECONDS, "seconds").format("YYYY-MM-DD HH:mm:ss") : undefined,
                    endTime = (rowData.end_time) ? moment.utc(rowData.end_time).add(DELAY_SECONDS, "seconds").format("YYYY-MM-DD HH:mm:ss") : undefined,
                    numHour = (rowData.start_time) ? moment.utc(rowData.start_time).hour() : undefined,
                    numDayOfWeek = (rowData.start_time) ? moment.utc(rowData.start_time).day() : undefined,
                    numDayOfMonth = (rowData.start_time) ? moment.utc(rowData.start_time).date() : undefined;

                let numMinute = (rowData.start_time) ? moment.utc(rowData.start_time).minute() : undefined;
                console.debug(`startTime(${startTime}), endTime(${endTime}), numHour(${numHour}), numDayOfWeek(${numDayOfWeek}), numDayOfMonth(${numDayOfMonth}), numMinute(${numMinute})`);

                // Start a scheduler
                switch (commVar.getInstance().getConst("INTERVAL_STR")[rowData.job_interval]) {
                    case "BATCH_INTERVAL_NOW":
                        rule = moment().add(DELAY_SECONDS, "seconds").toDate(); // it will run after the delay seconds.
                        state = 0;
                        break;

                    case "BATCH_INTERVAL_ONCE":
                        rule = startTime;
                        break;

                    case "BATCH_INTERVAL_DAY":
                        rule = {
                            start: startTime,
                            end: endTime,
                            rule: `${numMinute} ${numHour} * * *`
                        };
                        break;

                    case "BATCH_INTERVAL_WEEK":
                        rule = {
                            start: startTime,
                            end: endTime,
                            rule: `${numMinute} ${numHour} * * ${numDayOfWeek}`
                        };
                        break;

                    case "BATCH_INTERVAL_MONTH":
                        rule = {
                            start: startTime,
                            end: endTime,
                            rule: `${numMinute} ${numHour} ${numDayOfMonth} * *`
                        };
                        break;

                    default:
                        throw new Error(`Unknown interval value(${rowData.job_interval})`);
                }
                // console.debug(`rule = `, rule);
                callback = tickCallback.bind(null, rows, jobInfo, userId);
                let ruleStr = (rowData.job_interval < 2) ? rule : commUtil.stringifyJsonForDB(rule);

                return `INSERT INTO HeMS_Batch_Job_Current
                    SET job_id='${jobId}', rule="${ruleStr}", state=0, job_executed_time=NOW(), job_stopped_time=''`;
            } else {
                throw new Error(`Affected rows or rowData is empty!!!`);
            }
        },
        function (rows) {
            // Transaction #3 result
        }
    ];

    eudbEx.beginTs(cbCommit, cbRollback, queryStr, tasks);
}

function handleBatchJobStop(req, res) {
    console.log(`IN> handleBatchJobStop()`);

    let type = req.body.type;
    let rowData = req.body.rowData;
    let userId = req.session.user;
    let queryStr, callback, rule, jobId = rowData.job_id + "";

    console.log(`User(${userId}), CMD(${type}), rowData =`, rowData);

    let retVal = {
        success: false,
        message: "",
        draw: 0
    };

    endCallback(req.app.io, jobId, "STOP", 1)
    .then(result => {
        console.debug(`endCallback.then(), result =`, result);
        retVal.success = true;
        retVal.draw = 1;
        res.status(200).send(retVal);
    })
    .catch(err => {
        console.error(`${err.message}\n` + err.stack);
        retVal.message = err.message;
        res.status(400).send(retVal);
    });
}

function handleBatchJobDelete(req, res, pool) {
    console.log(`IN> handleBatchJobDelete()`);

    let type = req.body.type;
    let rowData = req.body.rowData;
    let userId = req.session.user;
    let queryStr, callback, rule;

    console.log(`User(${userId}), CMD(${type}), rowData =`, rowData);

    let retVal = {
        success: false,
        message: "",
        draw: 0
    };

    endCallbackDelete(rowData.job_id)
        .then(result => {
            console.log(`endCallbackDelete.then(), result =`, result);
            retVal.success = true;
            retVal.draw = 1;

            res.status(200).send(retVal);
        })
        .catch(err => {
            console.error(`${err.message}\n` + err.stack);
            retVal.message = err.message;
            res.status(400).send(retVal);
        });
}

function handleBatchCommandDelete(req, res, pool) {
    console.log(`IN> handleBatchJobDelete()`);

    let type = req.body.type;
    let rowData = req.body.selected;
    console.log(`CMD(${type}), rowData =`, rowData);

    let ids = commUtil.getValues(rowData, "command_id").join(",");
    console.log(`ids =`, ids);

    let queryStr = `UPDATE HeMS_Batch_Command
        SET delete_flag=1
        WHERE command_id IN (${ids});`;

    let retVal = {
        success: false,
        message: "",
        status: 400,
        draw: 0
    };

    eudbEx.runQuery(queryStr,
        () => { // finally
            res.status(retVal.status).send(retVal);
        },
        (rows) => { // success
            if (rows.affectedRows && rows.affectedRows > 0) {
                // console.log(`>>[SQL RESULT] result len = ${rows.affectedRows}`);
                retVal.success = true;
                retVal.draw = 1;
                retVal.status = 200;
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
                retVal.message = "Not found item!!";
            }
        });
}

/* Below is Export Function ================================================================= */
/**
 * get the item List of limited item count per a page of Batch Command List.
 */
exports.getBatchCommandList = function(req, res, pool) {
    console.log(`IN> getBatchCommandList()`);

    let queryStr = `SELECT * FROM HeMS_Batch_Command
        WHERE delete_flag=0
        ORDER BY command_id desc;

        SELECT count(*) as count FROM HeMS_Batch_Command
        WHERE delete_flag=0;`;

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
                // console.log(`>>[SQL RESULT] success query, rows.length =`, rows[0].length);
                retVal.success = true;
                retVal.draw = req.body.draw;
                retVal.recordsTotal = rows[1][0].count;
                retVal.recordsFiltered = rows[1][0].count;
                retVal.data = rows[0];
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
                // throw new Error(`Not Found!!!`);
            }
        });
};

/**
 * get the item List of limited item count per a page of Batch Job List.
 */
exports.getBatchJobList = function(req, res, pool) {
    console.log(`IN> getBatchJobList()`);

    let columns = req.body.columns;
    let order = req.body.order;
    let start = parseInt(req.body.start);
    let length = parseInt(req.body.length);
    let search = req.body.search;

    let ORDER_BY_PHRASE = commUtil.makeOrderPhrase(order, columns);

    let queryStr = `SELECT * FROM HeMS_Batch_Job
        WHERE job_title like '%${search.value}%' OR job_user like '%${search.value}%'
        ORDER BY ${ORDER_BY_PHRASE}, job_id desc;

        SELECT count(*) as count FROM HeMS_Batch_Job;`;

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
                // console.log(`>>[SQL RESULT] success query, rows.length =`, rows[0].length);
                retVal.success = true;
                retVal.draw = req.body.draw;
                retVal.recordsTotal = rows[1][0].count;
                retVal.recordsFiltered = rows[1][0].count;
                retVal.data = rows[0];
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
                // throw new Error(`Not Found!!!`);
            }
        });
};

/**
 * get the item List of limited item count per a page of Batch Job List.
 */
exports.getBatchJobView = function(req, res, pool) {
    console.log(`IN> getBatchJobView()`);

    let columns = req.body.columns;
    let order = req.body.order;

    let rowData = req.body.rowData;
    let ORDER_BY_PHRASE = commUtil.makeOrderPhrase(order, columns)

    let queryStr = `SELECT (b.command_exe_order + 1) AS 'command_order', a.command_id, a.command_name, a.command_context FROM HeMS_Batch_Command a, HeMS_Batch_Job_Command b
        WHERE b.job_id=${rowData.job_id} AND a.command_id=b.command_id
        ORDER BY ${ORDER_BY_PHRASE};

        SELECT count(*) as count FROM HeMS_Batch_Command a, HeMS_Batch_Job_Command b
        WHERE b.job_id=${rowData.job_id} AND a.command_id=b.command_id;`;
    /* let queryStr = `SELECT (@cnt := @cnt + 1) AS 'command_order', a.command_id, a.command_name, a.command_context FROM HeMS_Batch_Command a, HeMS_Batch_Job_Command b
        CROSS JOIN (SELECT @cnt := 0) AS dummy
        WHERE b.job_id=${rowData.job_id} AND a.command_id=b.command_id
        ORDER BY ${ORDER_BY_PHRASE};

        SELECT count(*) as count FROM HeMS_Batch_Command a, HeMS_Batch_Job_Command b
        CROSS JOIN (SELECT @cnt := 0) AS dummy
        WHERE b.job_id=${rowData.job_id} AND a.command_id=b.command_id;`; */

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
                // console.log(`>>[SQL RESULT] success query, rows.length =`, rows[0].length);
                retVal.success = true;
                retVal.draw = req.body.draw;
                retVal.recordsTotal = rows[1][0].count;
                retVal.recordsFiltered = rows[1][0].count;
                retVal.data = rows[0];
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
                // throw new Error(`Not Found!!!`);
            }
        });
};

/**
 * get the item List of limited item count per a page of Batch Result List.
 */
exports.getBatchResultView = function(req, res, pool) {
    console.log(`IN> getBatchResultView()`);

    let columns = req.body.columns;
    let order = req.body.order;

    let rowData = req.body.rowData;
    // let runTimeOn = moment.utc(rowData.start_time).format("HH:mm");
    // let runTimeBefore1min = moment.utc(rowData.start_time).subtract(1, "minute").format("HH:mm");
    // let runTimeAfter1min = moment.utc(rowData.start_time).add(1, "minute").format("HH:mm");

    let ORDER_BY_PHRASE = commUtil.makeOrderPhrase(order, columns);
    let queryStr = `SELECT * FROM HeMS_Command_History
        WHERE user_id like '${rowData.job_user}@job${rowData.job_id}_${rowData.job_title}%'
        ORDER BY ${ORDER_BY_PHRASE};

        SELECT count(*) as count FROM HeMS_Command_History
        WHERE user_id like '${rowData.job_user}@job${rowData.job_id}_${rowData.job_title}%';`;

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
                // console.log(`>>[SQL RESULT] success query, rows.length =`, rows[0].length);
                retVal.success = true;
                retVal.draw = req.body.draw;
                retVal.recordsTotal = rows[1][0].count;
                retVal.recordsFiltered = rows[1][0].count;
                retVal.data = rows[0];
            } else {
                // console.log(`>>[SQL RESULT] Not Found!!!`);
                // throw new Error(`Not Found!!!`);
            }
        });
};

/**
 * re-arrange batch jobs to Scheduler.
 */
exports.rearrangeBatchJobToScheduler = function(io) {
    console.log(`IN> rearrangeBatchJobToScheduler()`);

    let queryStr = `SELECT a.id, a.job_id, a.rule, b.command_id, b.command_exe_order, c.command_name, c.command_context, d.job_interval, d.job_user, d.job_title
        FROM HeMS_Batch_Job_Current a, HeMS_Batch_Job_Command b, HeMS_Batch_Command c, HeMS_Batch_Job d
        WHERE a.job_id=b.job_id
        AND a.job_id=d.job_id
        AND b.command_id=c.command_id
        AND d.job_status=2
        ORDER BY a.id, a.job_id, b.command_exe_order;`;

    eudbEx.runQuery(queryStr,
        () => { // finally
            console.debug(`rearrangeBatchJobToScheduler(), Running Batch Jobs =`, this.getJobs());
        },
        (rows) => { // success
            if (rows.length > 0) {
                // get values of job_id, and then remove the dulplicated values.
                let jobs = commUtil.getValues(rows, "job_id").reduce((a, b) => {
                    if (a.indexOf(b) < 0) a.push(b);
                    return a;
                }, []);

                jobs.forEach(id => {
                    // get commands with same job_id in rows to array
                    let commands = rows.filter(obj => {
                        return obj.job_id === id;
                    });

                    let jobInfo = {
                        jobId: id + "",
                        jobTitle: commands[0].job_title
                    };
                    let callback = tickCallback.bind(null, commands, jobInfo);
                    let rule = (commands[0].job_interval < 2) ? commands[0].rule : commUtil.parseJsonForDB(commands[0].rule);
                    this.runJob(jobInfo.jobId, rule, callback, function() {
                        endCallback(io, jobInfo.jobId, "REARRANGE")
                        .then(result => {
                            console.debug(`endCallback.then(), result =`, result);
                        })
                        .catch(err => {
                            console.error(`${err.message}\n` + err.stack);
                        });
                    });
                });
            }
        }, null, null);
};

/**
 * handling to add a batch item in Batch Job List.
 */
exports.handleBatchJobAction = function(req, res, pool) {
    let type = req.body.type;
    console.log(`IN> handleBatchAction(type: ${type})`);

    switch (type) {
        case "Add":
            handleBatchJobAdd(req, res, pool);
            break;
        case "Run":
            handleBatchJobRun(req, res, pool);
            break;
        case "Stop":
            handleBatchJobStop(req, res, pool);
            break;
        case "Delete":
            handleBatchJobDelete(req, res, pool);
            break;
        default:
            break;
    }
};

/**
 * handling to add a batch item in Batch Command List.
 */
exports.handleBatchCommandAction = function(req, res, pool) {
    let type = req.body.type;
    console.log(`IN> handleBatchCommandAction(type: ${type})`);

    switch (type) {
        case "Delete":
            handleBatchCommandDelete(req, res, pool);
            break;
        default:
            break;
    }
};