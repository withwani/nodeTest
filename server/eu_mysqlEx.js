const mysql = require("mysql");
const config = require("config");
const async = require("async");

const promiseFinally = require("promise.prototype.finally");
// Add `finally()` to `Promise.prototype`
promiseFinally.shim();

const commUtil = require("./common_util");
const commVar = require("./common_var");
// const csUtil = require("./common_server_util");

function getQid(len) {
    var saltLen = len,
        charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_+={}",
        retVal = "";
    for (var i = 0, n = charset.length; i < saltLen; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}

module.exports = function () {
    let instance;
    function EuSqlEx(pool) {
        this.pool = pool;
    }

    function getPool() {
        return commVar.getInstance().get("euDbPool") || (function () {
            let dbConfig = commVar.getInstance().get("euConfig") || (function () {
                let defaultConfig = config.get("development");
                let tempConfig = JSON.parse(JSON.stringify(defaultConfig)); // deep copy
                tempConfig.dbConfig.host = tempConfig.emsConfig.host; // NOTE: DB and EMS has same location
                return tempConfig.dbConfig;
            })();
            return mysql.createPool(dbConfig);
        })();
    }

    function query(conn, sql, isTs = false) {
        return new Promise((resolve, reject) => {
            if (!conn) {
                reject({error: `getConnection error! conn is Null`});
            } else {
                // let exec = conn.query(sql, (err, rows) => {
                conn.query(sql, (err, rows) => {
                    if (!isTs) conn.release();
                    if (err) {
                        reject(err);
                    } else {
                        // console.debug(`$$[EXEC SQL] :` + exec.sql);
                        resolve(rows);
                    }
                });
            }
        });
    }

    function rollback(conn, callback, tid) {
        if (conn) {
            console.log(`[SQL] Transaction[${tid}] rollback <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<`);
            conn.rollback(function() {
                conn.release();
                if (callback) callback();
            });
        }
        return;
    }

    function commit(conn, callback, tid) {
        conn.commit(function(err) {
            if (err) {
                throw err;
            }

            console.log(`[SQL] Transaction[${tid}] commit <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<`);
            conn.release();
            if (callback) callback();
        });
    }

    return {
        runQuery: function (queryStr, cbAlways, cbSuccess, cbError, isLog = true) {
            let pool = (instance) ? instance.pool : (function() {
                if (!instance) {
                    let pool = getPool();
                    instance = new EuSqlEx(pool);
                }
                return instance.pool;
            })();

            /* if (commUtil.isNull(queryStr)) {
                if (cbAlways) cbAlways();
                return;
            } */

            // let qid = csUtil.genSalt(8);
            let qid = getQid(8);
            // get connection poll
            pool.getConnection(function(err, conn) {
                if (err) {
                    console.error(`${err.message}\n` + err.stack);
                } else {
                    if (isLog) console.log(`[SQL] Single[${qid}] Query:\n`, queryStr);
                    query(conn, queryStr)
                        .then(rows => {
                            if (isLog) console.log(`[SQL] Single[${qid}] rows =`, rows);
                            if (cbSuccess) cbSuccess(rows);
                        })
                        .catch(err => {
                            console.error(`${err.message}\n` + err.stack);
                            if (cbError) cbError(err);
                        })
                        .finally(() => {
                            if (cbAlways) cbAlways();
                        });
                }
            });

        },
        beginTs: function (cbCommit, cbRollback, firstQuery, cbs, isLog = true) {
            let pool = (instance) ? instance.pool : (function() {
                if (!instance) {
                    let pool = getPool();
                    instance = new EuSqlEx(pool);
                }
                return instance.pool;
            })();

            if (pool) {
                // get connection poll
                pool.getConnection(function(err, conn) {
                    if (err) { console.error(err); conn.release(); return; }

                    // let tid = csUtil.genSalt(8);
                    let tid = getQid(8);
                    conn.beginTransaction(function(err) {
                        if (err) { console.error(err); rollback(conn, cbRollback(err), tid); return; }

                        console.log(`[SQL] Transaction[${tid}] begin >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>`);
                        let queryStr = firstQuery;

                        let count = 0;
                        let results = [];
                        async.whilst(
                            function checkQueryCount() { // check function
                                return count < cbs.length;
                            },
                            function runQueryTs(callback) { // loop function
                                if (isLog) console.log(`[SQL] Transaction[${tid}] #${count + 1} Query:\n`, queryStr);
                                query(conn, queryStr, true)
                                .then(rows => {
                                    if (isLog) console.log(`[SQL] Transaction[${tid}] #${count + 1} rows =`, rows);
                                    queryStr = cbs[count](rows);
                                    results.push("OK");

                                    if (!queryStr) {
                                        count = cbs.length;
                                    } else {
                                        count++;
                                    }

                                    callback(null, count, rows); // go to checkQueryCount()
                                })
                                .catch(err => {
                                    console.error(`${err.message}\n` + err.stack);
                                    rollback(conn, cbRollback(err), tid);
                                });
                            },
                            function (err, n, rows) { // finish function
                                if(err) {
                                    throw err;
                                } else {
                                    console.log(`[SQL] Transaction[${tid}] summary: CB cnt(${cbs.length}), results =`, results);
                                    commit(conn, cbCommit(rows), tid);
                                }
                            }
                        );
                    });
                });
            }
        }
    }
};