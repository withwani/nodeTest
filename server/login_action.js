/* Below is General Definition ================================================================= */
const async = require("async");
const moment = require("moment");

const historyAction = require("./history_action");

const commUtil = require("./common_util");
const commVar = require("./common_var");
const eudbEx = require("./eu_mysqlEx")();
const csUtil = require("./common_server_util");
const sessionMon = require("./eu_session_mon").getInstance();

/* Below is Variable and Const ================================================================= */

/* Below is Inner Function ================================================================= */
function getPermitData() {
    console.log(`IN> getPermitData()`);

    let queryStr = `SELECT * FROM HeMS_Client`;

    return new Promise((resolve, reject) => {
        eudbEx.runQuery(queryStr,
            null,
            (rows) => { // success
                // console.log(`>>[SQL RESULT] rows =`, rows);
                resolve(rows);
            },
            (err) => { // failure
                console.error(`${err.message}\n` + err.stack);
                reject(Error(csUtil.i18n("An error occurred in querying.")));
            });
    });
};

function checkClientIp(targetIp, ipObjs) {
    console.log(`IN> getPermitData(), ip =`, targetIp);

    // IP filtering
    let ipArr = commUtil.getValues(ipObjs, "ip_addr"),
        macArr = commUtil.getValues(ipObjs, "mac_addr");
    // console.debug(`ipArr =`, ipArr);
    // console.debug(`macArr =`, macArr);

    return new Promise((resolve, reject) => {
        if (ipArr.includes(targetIp)) { // check IP address
            resolve();
        } else {
            reject(Error(csUtil.i18n("This IP($1) is denied access.", targetIp)));
        }
    });
}

function getSecureInfo(id) {
    console.log(`IN> getSecureInfo()`);

    let queryStr = `SELECT fail_count, lock_time, salt FROM HeMS_User WHERE user_id='${id}'`;

    return new Promise((resolve, reject) => {
        eudbEx.runQuery(queryStr,
            null,
            (rows) => { // success
                if (rows && rows.length > 0) {
                    // console.log(`>>[SQL RESULT] Querying was successful!, rows =`, rows);
                    resolve(rows);
                } else {
                    // console.log(`>>[SQL RESULT] Querying failed!`);
                    // reject(Error(csUtil.i18n("Unknown account!")));
                    console.warn(`[Failed] Unknown account!`)
                    reject(Error());
                }
            },
            (err) => { // failure
                console.error(`${err.message}\n` + err.stack);
                reject(Error(csUtil.i18n("An error occurred in querying.")));
            },
            false);
    });
}

function checkLockState(rows, id) {
    console.log(`IN> checkLockState()`);

    return new Promise((resolve, reject) => {
        if (rows[0].fail_count >= commVar.getInstance().getConst("LOGIN_FAILURE_MAX_CNT")) {
            if (csUtil.diffTime(rows[0].lock_time, "minutes", commVar.getInstance().getConst("LOGIN_LOCK_RELEASE_TIME"))) { // 5분 이상이면 해제 -> 로그인 진행
                initFailCount(rows, id)
                    .then((rows) => resolve(rows))
                    .catch(err => reject(err));
            } else {
                console.warn(`[Failed] Lock state!`)
                reject(Error(csUtil.i18n("The account is in the Lock state.")));
            }
        } else {
            resolve(rows);
        }
    });
}

function checkSalt(rows) {
    console.log(`IN> checkSalt()`);

    return new Promise((resolve, reject) => {
        // console.debug(`salt =`, rows[0].salt);
        if (rows[0].salt) {
            // console.log(`>>[SQL RESULT] Querying was successful!`);
            resolve(rows);
        } else {
            // console.log(`>>[SQL RESULT] Querying failed!`);
            reject(Error("ForgotPW"));
        }
    });
}

function initFailCount(data, id) {
    console.log(`IN> initFailCount()`);

    let queryStr = `UPDATE HeMS_User SET fail_count=0 WHERE user_id='${id}'`;

    return new Promise((resolve, reject) => {
        eudbEx.runQuery(queryStr,
            null,
            (rows) => { // success
                if (rows && rows.affectedRows > 0) {
                    // console.log(`>>[SQL RESULT] Querying was successful!`);
                    data[0].fail_count = 0;
                    resolve(data);
                } else {
                    // console.log(`>>[SQL RESULT] Querying failed!`);
                    // reject(Error(csUtil.i18n("Invalid account!")));
                    console.warn(`[Failed] Invalid account!`)
                    reject(Error());
                }
            },
            (err) => { // failure
                console.error(`${err.message}\n` + err.stack);
                reject(Error(csUtil.i18n("An error occurred in querying.")));
            });
    });
}

function increaseFailCount(id) {
    console.log(`IN> increaseFailCount()`);

    let queryStr = `UPDATE HeMS_User SET fail_count=fail_count+1, lock_time='${moment().format("YYYY-MM-DD HH:mm:ss")}' WHERE user_id='${id}'`;

    return new Promise((resolve, reject) => {
        eudbEx.runQuery(queryStr,
            null,
            (rows) => { // success
                if (rows && rows.affectedRows > 0) {
                    // console.log(`>>[SQL RESULT] Querying was successful!`);
                    resolve();
                } else {
                    // console.log(`>>[SQL RESULT] Querying failed!`);
                    reject(Error(csUtil.i18n("Failed to increase the count of failures.")));
                }
            },
            (err) => { // failure
                console.error(`${err.message}\n` + err.stack);
                reject(Error(csUtil.i18n("An error occurred in querying.")));
            });
    });
}

function authUser(id, pw, fail, salt) {
    console.log(`IN> authUser()`);

    let failStr = `(${+fail + 1}/${commVar.getInstance().getConst("LOGIN_FAILURE_MAX_CNT")})`;
    let queryStr = `SELECT * FROM HeMS_User WHERE user_id='${id}' and user_password=SHA2('${pw + salt}', 256)`;

    return new Promise((resolve, reject) => {
        eudbEx.runQuery(queryStr,
            null,
            (rows) => { // success
                if (rows && rows.length > 0) {
                    // console.log(`>>[SQL RESULT] Querying was successful!`);
                    resolve(rows);
                } else {
                    // console.log(`>>[SQL RESULT] Querying failed!`);
                    // reject(Error(csUtil.i18n("Invalid account!") + failStr));
                    console.warn(`[Failed] Invalid account! ${failStr}`)
                    reject(Error(failStr));
                }
            },
            (err) => { // failure
                console.error(`${err.message}\n` + err.stack);
                reject(Error(csUtil.i18n("An error occurred in querying.")));
            },
            false);
    });
}

function updatePassword(id, pw) {
    console.log(`IN> updatePassword()`);

    let salt = csUtil.genSalt(12);
    let queryStr = `UPDATE HeMS_User SET user_password=SHA2('${pw + salt}', 256), salt='${salt}' WHERE user_id='${id}'`;

    return new Promise((resolve, reject) => {
        eudbEx.runQuery(queryStr,
            null,
            (rows) => { // success
                if (rows && rows.affectedRows > 0) {
                    // console.log(`>>[SQL RESULT] Querying was successful!`);
                    resolve();
                } else {
                    // console.log(`>>[SQL RESULT] Querying failed!`);
                    // reject(Error(csUtil.i18n("Invalid ID")));
                    console.warn(`[Failed] Invalid ID!!!`)
                    reject(Error());
                }
            },
            (err) => { // failure
                console.error(`${err.message}\n` + err.stack);
                reject(Error(csUtil.i18n("An error occurred in querying.")));
            });
    });
}

/* Below is Export Function ================================================================= */
exports.authUserAccount = function (req, res, pool) {
    console.log("IN> authUserAccount(res, req, pool)");

    let userId = req.body.user_id;
    let userPw = req.body.user_password;
    let connIp = commUtil.getUserIP(req);

    async.waterfall(
        [
            function checkAccessPermission(callback) {
                console.log(`[ASYNC, T0] checkAccessPermission()`);

                let usePermit = commVar.getInstance().get("euConfig").webConfig.permit || false;
                // if (userId != "admin" && usePermit) { // userId == "admin" 혹은 usePermit == false 일 때 Permit 기능을 사용하지 않음
                if (usePermit) {
                    getPermitData()
                        .then(rows => checkClientIp(connIp, rows))
                        .then(() => callback(null))
                        .catch(err => {
                            historyAction.setLoginHistory({
                                user: userId,
                                clientIp: connIp
                            }, "Denied");
                            callback(err);
                        });
                } else {
                    console.log(`IP filtering function is not used, so skip checking client IP. webConfig.permit =`, usePermit);
                    callback(null);
                }
            },
            function checkConnectionLimit(callback) {
                console.log(`[ASYNC, T1] checkConnectionLimit()`);

                let connCnt = sessionMon.len(); // total session count
                let connLimit = commVar.getInstance().get("euConfig").webConfig.connectLimit || commVar.getInstance().getConst("CONNECTION_LIMIT_CNT");
                console.log(`Current connection count: ${connCnt} / ${connLimit}`);

                if (connCnt > connLimit) { // 연결 제한 횟수 초과
                    callback(Error(csUtil.i18n(`Connection limit($1)!`, connLimit)));
                } else {
                    sessionMon.sync("login-check-duplicate", (sess) => {
                        let result = Object.keys(sess).some(sid => {
                            return (sess[sid] && sess[sid].mainSocketID && userId === sess[sid].user);
                        });
                        console.log(`Completed checking duplicate access of the user(${userId}).`);
                        (result) ? callback(Error(csUtil.i18n(`User $1 has already logged in!!!`, userId))): callback(null);
                    });
                }
            },
            function checkLockNSalt(callback) {
                console.log(`[ASYNC, T2] checkLockNSalt()`);

                getSecureInfo(userId)
                    .then(rows => checkLockState(rows, userId))
                    .then(rows => checkSalt(rows))
                    .then(rows => callback(null, rows))
                    .catch(err => {
                        if (err.message != "ForgotPW" && userId && connIp) {
                            historyAction.setLoginHistory({
                                user: userId,
                                clientIp: connIp
                            }, "Blocked");
                        }
                        callback(err)
                    });
            },
            function authAccount(secureInfo, callback) {
                console.log(`[ASYNC, T3] authAccount(), Account ID(${userId}), FailCnt(${secureInfo[0].fail_count})`);
                // console.debug(`Account ID(${userId}), PW(${userPw}), FailCnt(${secureInfo[0].fail_count}), Salt(${secureInfo[0].salt})`);

                authUser(userId, userPw, secureInfo[0].fail_count, secureInfo[0].salt)
                    .then(rows => initFailCount(rows, userId))
                    .then(rows => callback(null, rows))
                    .catch(err1 => {
                        historyAction.setLoginHistory({
                            user: userId,
                            clientIp: connIp
                        }, "Failed");
                        increaseFailCount(userId)
                            .then(() => callback(err1))
                            .catch(err2 => callback(err2));
                    });
            },
            function getUserLang(rows, callback) {
                console.log(`[ASYNC, T4] getUserLang()`);
                console.debug(`rows =`, rows);

                callback(null, rows, commVar.getInstance().get("langCode"));
                // langCode는 서버가 실행될 때 설정된 뒤 변경되지 않으므로 아래 함수는 실행할 필요가 없다.
                // getUserLanguage(pool, rows, callback); // return inner-callback
            },
            function saveSession(rows, lang, callback) {
                console.log(`[ASYNC, T5] saveSession(), lang(${lang})`);
                console.debug(`rows =`, rows);

                /* session save */
                let sess = req.session;
                let mHost = commUtil.getURLProperty(req.headers.host);
                sess.hostIp = mHost.host;
                sess.hostPort = mHost.port || commVar.getInstance().get("serverPort");
                sess.clientIp = connIp;
                sess.user = rows[0].user_id;
                sess.name = rows[0].user_name;
                sess.level = rows[0].user_level;
                sess.allowSnd = rows[0].alert_sound;
                sess.debugMode = rows[0].debug_mode;
                sess.area = rows[0].area_info;
                let configMode = commVar.getInstance().get("euConfig").webConfig.configMode;
                if (+sess.debugMode || configMode) { // for test
                    let langCode = commVar.getInstance().get("euConfig").webConfig.lang;
                    // sess.lang = (configMode) ? commVar.getInstance().get("euConfig").webConfig.lang : rows[0].user_lang || lang || "en"; // HeMS_User > HeMS_Config > "en"
                    sess.lang = (configMode) ? langCode : rows[0].user_lang || lang || "en";
                    sess.permit = true;
                } else {
                    sess.lang = lang || rows[0].user_lang || "en"; // HeMS_Config > HeMS_User > "en"
                }
                /* b.fixed TTA TEST 34, 35 */
                // let now = moment().format("YYYY-MM-DD HH:mm:ss");
                let now = moment().format();
                sess.timeout = now; // save to session
                // commVar.getInstance().setSs(sess.id, {timeout: now}); // save to common variable
                // sessionMon.setField(sess.id, "timeout", now);
                console.debug(`SessionInfo(${sess.id}): ID(${sess.user}), Name(${sess.name}), Lv(${sess.level}), IP(${sess.clientIp}), Lang(${sess.lang}), Area(${sess.area})`);
                /* e.fixed TTA TEST 34, 35 */
                sess.save(err => {
                    if (err) {
                        console.error(`${err.message}\n` + err.stack);
                        callback(Error(csUtil.i18n("Saving the session failed!")));
                    } else {
                        sessionMon.set(sess.id, sess);
                        // sessionMon.sync("login-session-save");
                        console.debug(`sessions =`, sessionMon.view());
                        callback(null, sess);
                    }
                });
            },
            function recordHistory(sess, callback) {
                console.log(`[ASYNC, T6] recordHistory()`);
                console.debug(`sess =`, sess);
                historyAction.setLoginHistory(sess, "Login");
                callback(null, "Done");
            }
            /* server.js > Processing Subsequence 순서로 이동
            , function makeCliData(callback) {
                console.log(`[ASYNC, T7] makeCliData()`);
                // if login is successful, the cli data file will be creadted.
                require("./cli_create_tree.js").createCliDataFile();
                callback(null, "Done");
            } */
        ],
        function (err, result) {
            console.log(`[ASYNC, DONE] result =`, result);
            if (err) {
                console.debug(`err =`, err);
                if (err.message == "ForgotPW") {
                    res.writeHead("200", {
                        "Content-Type": "text/html;charset=utf8"
                    });
                    res.write(`<meta http-equiv="refresh" content="0; URL=ForgotPW?id=${userId}">`);
                    res.end();
                } else {
                    res.writeHead("200", {
                        "Content-Type": "text/html;charset=utf8"
                    });
                    res.write(`<meta http-equiv="refresh" content="0; URL=/">`);
                    // res.write(`<script> alert('${csUtil.i18n("LOGIN FAILED!")} ${err.message}'); history.back(); </script>`); // 이전 alert도 같이 발생함(예. 세션만료)
                    res.write(`<script> alert('${csUtil.i18n("LOGIN FAILED!")} ${err.message}');</script>`);
                    res.end();
                }


            } else {
                res.writeHead("200", {
                    "Content-Type": "text/html;charset=utf8"
                });
                res.write('<meta http-equiv="refresh" content="0; URL=Main">');
                res.end();
            }

        }
    );
};

exports.forgotPassword = function (req, res) {
    console.log("IN> forgotPassword(res, req)");

    let userId = req.body.user_id;
    let userPw = req.body.new_password;
    console.debug(`userId (${userId}), userPw (${userPw})`);

    updatePassword(userId, userPw)
        .then(() => {
            res.writeHead("200", {
                "Content-Type": "text/html;charset=utf8"
            });
            res.write('<meta http-equiv="refresh" content="0; URL=/">');
            res.end();
        })
        .catch(err => {
            res.writeHead("200", {
                "Content-Type": "text/html;charset=utf8"
            });
            res.write(`<meta http-equiv="refresh" content="0; URL=ForgotPW?id=${userId}">`);
            res.end();
        });
};