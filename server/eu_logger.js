const commUtil = require("./common_util"); // defined for using Object.isEmpty()

// get modules
// const winston = require("winston");
const fs = require("fs");
const path = require("path");
const moment = require("moment");
const fsExistsSync = require("../jslib/existsSync");
const winstonFile = require("winston-daily-rotate-file");

const {
    createLogger,
    format,
    transports
} = require("winston");
// const winstonDaily = require("winston-daily-rotate-file");

// Ignore log messages if the have { private: true }
/* const isSecret = /super secret/; // 'super secret' -> 'su*** se****'
const filterSecret = format((info, opts) => {
    info.message = info.message.replace(isSecret, "su*** se****");
    return info;
}); */

function mkdirSync(dirPath) {
    if (!fsExistsSync(dirPath)) {
        fs.mkdirSync(dirPath);
    }
};

/* var traceCaller = function (n) {
    if (isNaN(n) || n < 0) n = 1;
    n += 1;
    var s = new Error().stack,
        a = s.indexOf("\n", 5);
    while (n--) {
        a = s.indexOf("\n", a + 1);
        if (a < 0) {
            a = s.lastIndexOf("\n", s.length);
            break;
        }
    }
    let b = s.indexOf("\n", a + 1);
    if (b < 0) b = s.length;
    a = Math.max(s.lastIndexOf(" ", b), s.lastIndexOf("/", b));
    b = s.lastIndexOf(":", b);
    s = s.substring(a + 1, b);
    return s;
};

function timeStampFormat() {
    return moment().format("YYYY-MM-DD HH:mm:ss.SSS ZZ");
} */

/**
 * Parses and returns info about the call stack at the given index.
 */
function getStackInfo(stackIndex) {
    // get call stack, and analyze it
    // get all file, method, and line numbers
    var stacklist = (new Error()).stack.split('\n').slice(3); // Console.module.exports.getInstance.console.log

    // stack trace format:
    // http://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
    // do not remove the regex expresses to outside of this method (due to a BUG in node.js)
    var stackReg = /at\s+(.*)\s+\((.*):(\d*):(\d*)\)/gi;
    var stackReg2 = /at\s+()(.*):(\d*):(\d*)/gi;

    let getLogIdx = stacklist.findIndex(val => val.indexOf("Console.module.exports.getInstance.console") > -1);
    if (getLogIdx > -1) stackIndex = getLogIdx + 1;
    var s = stacklist[stackIndex] || stacklist[0];
    var sp = stackReg.exec(s) || stackReg2.exec(s);

    if (sp && sp.length === 5) {
        return {
            method: sp[1],
            relativePath: path.relative(path.join(__dirname, '..'), sp[2]),
            line: sp[3],
            pos: sp[4],
            file: path.basename(sp[2]),
            stack: stacklist.join('\n')
        };
    }
}

/**
 * Attempts to add file and line number info to the given log arguments.
 */
function formatLogArguments(args, stackIndex) {
    args = Array.prototype.slice.call(args);

    let stackInfo = getStackInfo(stackIndex);
    // let stackInfo = getStackInfo(1);
    if (stackInfo) {
        // get file path relative to project root
        var calleeStr = `( ${stackInfo.relativePath}:${stackInfo.line} )`;

        if (typeof(args[0]) === "string") {
            args[0] = calleeStr + ' ' + args[0];
        } else {
            args.unshift(calleeStr);
        }

        args.forEach((val, idx) => {
            if (idx === 0) return;
            if (typeof(val) != "object") {
                args[idx] = val + "";
            }
        })
    }

    return args;
}

function printOutInfo(info) {
    try {
        if (typeof info.meta === "object") {
            info.meta = (commUtil.isEmpty(info.meta)) ? "{}" : JSON.stringify(info.meta, undefined, 4);
        }
    } catch (error) {
        info.meta = error.message;
    } finally {
        return `${moment().format("YYYY-MM-DDTHH:mm:ss.SSSZ").trim()} ${info.level}: ${info.message || ""} ${info.meta || ""}`;
    }

    /* if (typeof info.meta === "object") {
        info.meta = (commUtil.isEmpty(info.meta)) ? "{}" : JSON.stringify(info.meta, undefined, 4);
    }
    return `${moment().format("YYYY-MM-DDTHH:mm:ss.SSSZ").trim()} ${info.level}: ${info.message || ""} ${info.meta || ""}`; */
}

function initiate(serverPath, logConfig) {
    let logDirPath = path.resolve(serverPath, logConfig.path);
    // let logFilePath = path.resolve(serverPath, logConfig.path, logConfig.filename);

    mkdirSync(logDirPath); // make a directory

    // const tsFormat = () => moment().format('YYYY-MM-DD hh:mm:ss').trim();
    // const tsFormat = () => moment()add(9, 'hours').format('YYYY-MM-DD hh:mm:ss').trim();

    const dailyFileTransport = new transports.DailyRotateFile({
        format: format.combine(
            format.timestamp(),
            // format.colorize(),
            format.splat(),
            // format.simple(),
            // format.prettyPrint(),
            format.printf(printOutInfo)
        ),
        filename: `./${logConfig.path}/${logConfig.filename}-%DATE%.log`,
        level: logConfig.level,
        datePattern: "YYYY-MM-DD-HH",
        colorize: false,
        zippedArchive: logConfig.zippedArchive,
        maxSize: logConfig.maxSize,
        maxFiles: logConfig.maxFiles
    });

    dailyFileTransport.on("rotate", function(oldFilename, newFilename) {
        // do something fun
        console.log(`[ROTATE] oldFilename =`, oldFilename);
        console.log(`[ROTATE] newFilename =`, newFilename);
    });

    const consoleTransport = new transports.Console({
        format: format.combine(
            format.timestamp(),
            // format.colorize(),
            format.splat(),
            // format.simple(),
            // format.prettyPrint()
            format.printf(printOutInfo)
        )
        // level: logConfig.level
    });

    // creates a logger
    let logger = createLogger({
        // format: format.combine(filterSecret(), format.json()),
        level: logConfig.level,
        transports: [
            consoleTransport,
            dailyFileTransport
        ]
    });

    // binds handling method each log level
    for (let level in logger.levels) {
        logger[level] = (function(levelFunc) {
            return function() {
                levelFunc.apply(this, formatLogArguments(arguments, logConfig.stackIndex)); // apply arguments in levelFunc() of the logger
            };
        })(logger[level]);
    }

    return logger;
}

module.exports = (function() {
    var instance;

    return {
        // get instance by singleton pattern
        getInstance: function(serverPath, logConfig) {
            if (!instance) {
                instance = initiate(serverPath, logConfig);
                /* for (let level in instance.levels) {
                    // level = error, warn, info, http, verbose, debug, silly
                    console[level] = () => {
                        if (logConfig.enable) instance[level].apply(this, arguments);
                    }
                } */

                // override console method
                // var backupconsolelog = console.log.bind(console);
                console.debug = function() {
                    // backupconsolelog.apply(this, arguments);
                    if (logConfig.enable) instance.debug.apply(this, arguments);
                }
                console.log = function() {
                    // backupconsolelog.apply(this, arguments);
                    if (logConfig.enable) instance.info.apply(this, arguments);
                }
                console.info = function() {
                    // backupconsolelog.apply(this, arguments);
                    if (logConfig.enable) instance.info.apply(this, arguments);
                }
                console.warn = function() {
                    // backupconsolelog.apply(this, arguments);
                    if (logConfig.enable) instance.warn.apply(this, arguments);
                }
                console.error = function() {
                    // backupconsolelog.apply(this, arguments);
                    if (logConfig.enable) instance.error.apply(this, arguments);
                }
            }
            return instance;
        }
    };
})();