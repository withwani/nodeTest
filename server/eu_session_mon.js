"use strict";

// get modules
// const commUtil = require("./common_util");
// const commVar = require("./common_var");
const eudbEx = require("./eu_mysqlEx")();
// const csUtil = require("./common_server_util");

function clearSessionStore(store) {
    console.log(`IN> clearSessionStore()`);

    function destroySession(ids) {
        let id = ids.pop();
        console.debug(`[SESSION] Trying to delete the ${id} session.`);
        store.destroy(id, function(err) {
            if (err) {
                console.error(`${err.message}\n` + err.stack);
                return false;
            }
            if (ids.length > 0) {
                console.debug(`[SESSION] Successful deletion of ${id} session.` );
                return destroySession(ids);
            } else {
                console.debug(`[SESSION] Deletion completed.` );
                return true;
            }
        });
    }

    let ids = [];
    let queryStr = `SELECT * FROM HeMS_Sessions`;
    eudbEx.runQuery(queryStr,
        () => { // finally
            console.debug(`[SESSION] clear sid =`, ids);
            if (ids.length) destroySession(ids);
        },
        (rows) => { // success
            if (rows && rows.length > 0) {
                let jsonObj;
                rows.forEach((row) => {
                    if (row.data) {
                        jsonObj = JSON.parse(row.data);
                        if(!jsonObj.user || !jsonObj.mainSocketID) ids.push(row.session_id);
                    } else {
                        ids.push(row.session_id);
                    }
                });
            }
        },
        (err) => { // failure
            console.error(`${err.message}\n` + err.stack);
        }, false);
}

function getConnectedClients(sess) {
    // console.log(`[SESSION] IN> getConnectedClients(), sessions =`, sess);

    return new Promise((resolve, reject) => {
        let queryStr = `SELECT * FROM HeMS_Sessions`;

        let cbCommit = function(rows) {
            // commit
            // console.debug(`[SESSION] sess`, sess);
            resolve(sess);
        };

        let cbRollback = function(err) {
            // rollback
            reject(err);
        };

        let tasks = [
            function (rows) {
                // Transaction #1 result
                if (rows && rows.length > 0) {
                    let users = [], jsonObj;
                    rows.forEach((row) => {
                        // if (row.data && row.data !== "") {
                        if (row.data) {
                            jsonObj = JSON.parse(row.data);
                            if(jsonObj.user && jsonObj.mainSocketID) {
                                // sess[row.session_id] = Object.assign({}, jsonObj); // shallow copy
                                sess[row.session_id] = Object.clone(jsonObj); // deep copy
                                users.push(jsonObj.user);
                            }
                        }
                    });

                    if (users.length) {
                        return `UPDATE HeMS_User SET user_status =
                            CASE WHEN user_id in ('${users.join("','")}') THEN 1
                            ELSE 0
                            END`;
                    } else {
                        return null;
                    }
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

module.exports = (function() {
    var instance;

    function SessionMap() {
        this.sessions = {};
    }

    SessionMap.prototype.get = function(id) {
        if (id) {
            return (this.sessions && this.sessions[id]) ? this.sessions[id] : null;
        } else {
            return (this.sessions) ? this.sessions : null;
        }
    }

    SessionMap.prototype.set = function(id, ss) {
        if (!id || !ss) return null;

        // if (!this.sessions[id]) this.sessions[id] = {};

        // this.sessions[id] = Object.assign({}, ss);
        this.sessions[id] = Object.clone(ss); // deep copy

        return this.sessions[id];
    }

    SessionMap.prototype.getf = function(id, name) {
        if (!id || !name) return null;

        return (this.sessions[id] && this.sessions[id][name]) ? this.sessions[id][name] : null;
    }

    SessionMap.prototype.setf = function(id, name, val) {
        if (!id || !name || !val) return null;

        if (!this.sessions[id]) this.sessions[id] = {};

        this.sessions[id][name] = val;
        return this.sessions[id][name];
    }

    SessionMap.prototype.delf = function(id, name) {
        if (!id || !name) return null;

        if (this.sessions[id]) {
            delete this.sessions[id][name];
        }
        return this.sessions[id];
    }

    SessionMap.prototype.len = function() {
        return Object.keys(this.sessions).length;
    }

    SessionMap.prototype.view = function() {
        return this.sessions;
    }

    SessionMap.prototype.clear = function(store) {
        return clearSessionStore(store);
    }

    SessionMap.prototype.sync = function(callee, cb) {
        this.sessions = {};

        getConnectedClients(this.sessions)
        .then(sess => {
            // console.debug(`[SESSION] ${(callee) ? (callee + " -> ") : ""}sync-then, sess`, sess);
        })
        .catch(err => {
            // console.debug(`[SESSION] ${(callee) ? (callee + " -> ") : ""}sync-catch, err`, err);
            console.error(err);
        })
        .finally(() => {
            console.debug(`[SESSION] ${(callee) ? (callee + " -> ") : ""}sync-finally, sess`, this.sessions);
            if(cb) cb(this.sessions);
        });
    }

    function initiate() {
        let SessMap = new SessionMap();

        return {
            sync: function(callee, cb) {
                // sync with db
                return SessMap.sync(callee, cb);
            },
            clear: function(store) {
                // clear unnecessary sessions
                return SessMap.clear(store);
            },
            len: function() {
                // get length sessions
                return SessMap.len();
            },
            view: function() {
                // view whole sessions
                return SessMap.view();
            },
            get: function(id) {
                // get session data using sid
                return SessMap.get(id);
            },
            set: function(id, ss) {
                // set session data using sid
                return SessMap.set(id, ss);
            },
            /* set: function(id, data) {
                // set session data
            },
            del: function(id) {
                // delete session data
            }, */
            getField: function(id, name) {
                // get field
                return SessMap.getf(id, name);
            },
            setField: function(id, name, val) {
                // set field
                return SessMap.setf(id, name, val);
            },
            setFields: function(id, obj) {
                // return Object.assign(SessMap.get(id), obj);
                return Object.merge(SessMap.get(id), obj);
            },
            delField: function(id, name) {
                // del field
                return SessMap.delf(id, name);
            }
        };
    }

    return {
        getInstance: function() {
            // get instance by singleton pattern
            if (!instance) {
                instance = initiate();
            }
            return instance;
        }
    };
})();