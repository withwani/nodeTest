const moment = require("moment");

const eudbEx = require("./eu_mysqlEx")();
const csUtil = require("./common_server_util");

/* Below is General Definition ================================================================= */
// Default config setting
const defaultConfig = {
    spans: [{
        os: [],
        interval: 5,
        retention: 60
    }]
};

// keep going flag
var isGoOn = true;

// current config
var curConfig = {};
// var curConfig;

/* Below is Export Function ================================================================= */
exports.handleEMSStatusNoti = function handleEMSStatusNotification(req, res, pool, io) {
    let emsStatusNotiBody = "";

    req.on("data", function (chunk) { // received a message
        emsStatusNotiBody += chunk;
    });

    req.on("end", function () {
        // console.log('No more data in response.');
        console.log("EMS data: " + emsStatusNotiBody.toString()); // ex) 2017-06-14 11:44:05.635
        // console.log('=====================================================================================');

        if (isGoOn && emsStatusNotiBody.length > 0) {
            tickDataForEmsStatusInfo(io, pool);
        }
        res.writeHead("200", {
            "Content-Type": "text/html; charset=utf8"
        });
        res.end();
        // console.log('=====================================================================================');
    });

    req.on("error", (e) => {
        console.log(`problem with request: ${e.message}`);
        res.writeHead("400", {
            "Content-Type": "text/html;charset=utf8"
        });
        res.end();
        // console.log('=====================================================================================');
    });
};

// start gathering status data for Chart
exports.handleEMSStatusStart = function handleEMSStatusStart(pool, io) {
    console.log(`IN> handleEMSStatusStart()`);
    tickDataForEmsStatusInfo(io, pool);

    setInterval(function () {
        if (isGoOn) tickDataForEmsStatusInfo(io, pool);
    }, 5000);
};

// bind a Client
exports.bindEMSStatusClient = function bindClientForEmsStatusInfo(socket, config) {
    console.log(`IN> bindEMSStatusClient()`); //, curConfig =`, curConfig);

    if (config) {
        config = Object.assgin({}, curConfig, config);
    } else {
        config = Object.create(curConfig);
    }
    // console.log(`config =`, config);

    // send a message to Client
    socket.emit("ems-status-start", config.spans);
};

// unbind a Client
exports.unbindEMSStatusClient = function unbindClientForEmsStatusInfo() {
    console.log("IN> unbindClientForEmsStatusInfo()");
    isGoOn = false;
};

// tic a data to Client for updating Chart
function tickDataForEmsStatusInfo(io, pool) {
    // console.log('IN> tickDataForEmsStatusInfo()');

    let defaultOS = {
        cpu: {
            user: 0,
            sys: 0,
            idle: 0
        },
        memory: {
            real: 0,
            swap: 0
        },
        load: 0,
        timestamp: 0
    };

    let queryStr = `SELECT * FROM HeMS_Server_Stat_Current;`;

    eudbEx.runQuery(queryStr,
        null,
        (rows) => { // success
            if (rows.length > 0) {
                // console.log(`>>[SQL RESULT] Current EMS Status info =`, rows[0]);

                // curConfig - null check
                if (!curConfig || !Object.keys(curConfig).length) {
                    // curConfig = Object.assign({}, defaultConfig); // shallow copy
                    curConfig = Object.clone(defaultConfig); // deep copy
                }

                curConfig.spans.forEach((span) => {
                    if (!span.hasOwnProperty("os")) span.os = [];
                    if (!span.os || !span.os.length) {
                        // init OS metrics
                        for (let i = 0; i < curConfig.retention; i++) {
                            span.os[i] = defaultOS;
                        }
                    }

                    // making chart data using DB data
                    let stat = {};
                    stat.cpu = {};
                    stat.memory = {};
                    stat.cpu.user = rows[0].CPU_USER;
                    stat.cpu.sys = rows[0].CPU_SYS;
                    stat.cpu.idle = rows[0].CPU_IDLE;
                    stat.memory.real = rows[0].MEM_RUSED;
                    stat.memory.swap = rows[0].MEM_SWAP;
                    stat.load = rows[0].DISK_USED;
                    stat.timestamp = Date.now();

                    // added a item of EMS status info
                    span.os.push(stat);

                    // shift array item
                    if (span.os.length >= span.retention) span.os.shift();

                    // sent to Client using broadcast message
                    if (io) io.emit("ems-status-stats", {
                        os: span.os[span.os.length - 2],
                        interval: span.interval,
                        retention: span.retention
                    });
                });
            } else {
                // console.log(">>[SQL RESULT] Not Found!!!");
            }
        },
        (err) => { // failure
            console.error(`${err.message}\n` + err.stack);
            if (io) io.emit("ems-status-stats", {});
        }, false);
}