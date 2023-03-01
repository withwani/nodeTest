const moment = require("moment");

// const commUtil = require("./common_util");
const commVar = require("./common_var");

const langPack = commVar.getInstance().get("langPack"); // 서버 시작할 때 설정된 언어코드를 사용할 때, 최초 발생 시점이 server.js > eu_router.js 호출 시점이다.
// console.debug(`########### langPack =`, langPack);

/**
 * Calculates the object size
 * @param {object} obj Target object
 * @returns {integer} the object size
 */
Object.size = (obj) => {
    var size = 0,
        key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

Object.clone = (obj) => {
    if (obj === null || typeof obj !== "object") {
        return obj;
    }

    const result = Array.isArray(obj) ? [] : {};

    for (let key of Object.keys(obj)) {
        result[key] = Object.clone(obj[key])
    }

    return result; // deep copy
}

Object.merge = (target, source) => {
    if (target === null || typeof target !== "object" || source === null || typeof source !== "object") {
        return null;
    }

    for (let key of Object.keys(source)) {
        if (source[key] instanceof Object) Object.assign(source[key], Object.merge(target[key], source[key]));
    }

    // Join `target` and modified `source`
    return Object.clone(Object.assign(target || {}, source)); // deep copy
}

/**
 * Trnaslate to specific language with value
 * @param {string} key key string
 * @param  {...any} vals argument values
 */
function i18n(key, ...vals) {
    let temp = (langPack && langPack[key]) ? langPack[key] : key;

    if (vals.length > 0) {
        vals.forEach((val, idx) => {
            temp = temp.replace(`\$${idx+1}`, val);
        });
    }

    return temp;
}
exports.i18n = i18n;
/* function i18n(key, ...vals) {
    if(!key) return "";

    let str = (langPack) ? (langPack[key] || key) : key;
    console.debug(`Before i18n =`, str);
    if (vals && vals.length > 0) {
        vals.forEach((val, idx) => {
            // str = str.replace("$" + (idx + 1), val);
            str = str.replace(`\$${idx+1}`, val);
        });
    }
    console.debug(`After i18n =`, str);
    return str;
};
exports.i18n = i18n; */

// fixed TTA #11 #12
/**
 * Translate name array to specific language
 * @param {array} names name array to translate
 */
function translateNames(names) {
    console.log(`IN> translateNames(${langPack.langdesc}), names =`, names);

    var data = ``;
    names.forEach((name, idx) => {
        if (idx != 0) data += ",";
        data += `"${(langPack[name]) ? langPack[name] : name}"`;
    });
    data += `\n`;
    // console.debug(`return names =`, data);
    return data;
}
exports.translateNames = translateNames;

/**
 * Compare timestamp
 * @param {string} time check timestamp string
 * @param {string} opt "minutes", "days", etc options
 * @param {integer} val comparison value
 */
function diffTime(time, opt, val) {
    /* let now = moment(), end = moment(time);
    let duration = moment.duration(now.diff(end));
    let mins = duration.asMinutes(); // result is float type because the third argument is true.
    console.log(`diff: ${now} - ${end} =`, mins);

    return (mins > val); */

    let curTime = moment(),
        checkTime = moment(time);
    let timeDiff = curTime.diff(checkTime, opt, true); // result is float type because the third argument is true.
    // console.log(`timeDiff: ${curTime} - ${checkTime} =`, timeDiff);
    console.log(`Time difference >>>>> ${curTime} - ${checkTime} = ${timeDiff} / ${val}`);

    return (timeDiff > val);
}
exports.diffTime = diffTime;

/**
 * gernerats a salt value
 * @param {integer} len Salt length
 */
function genSalt(len) {
    var saltLen = len,
        charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_+={}",
        retVal = "";
    for (var i = 0, n = charset.length; i < saltLen; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}
exports.genSalt = genSalt;

/* changed to Object.clone() and Object.merge()
function objClone(obj, deep = true) {
    if(obj === null || typeof obj !== "object") {
        return obj;
    }

    if (deep) {
        const result = Array.isArray(obj) ? [] : {};

        for(let key of Object.keys(obj)) {
            result[key] = objClone(obj[key])
        }

        return result; // deep copy
    }

    return Object.assign({}, obj); // shallow copy
}
exports.objClone = objClone;

// Merge a `source` object to a `target` recursively
function objMerge(target, source, deep = true) {
    // Iterate through `source` properties and if an `Object` set property to merge of `target` and `source` properties
    for (let key of Object.keys(source)) {
        if (source[key] instanceof Object) Object.assign(source[key], objMerge(target[key], source[key]));
    }

    // Join `target` and modified `source`
    let result = Object.assign(target || {}, source);  // shallow copy
    if (deep) return objClone(result);  // deep copy
    return result;
}
exports.objMerge = objMerge; */

/* get Function name
function someFunc() {
    var ownName = arguments.callee.toString();
    console.log(`ownName`, ownName);
    ownName = ownName.substr('function '.length);        // trim off "function "
    console.log(`ownName`, ownName);
    ownName = ownName.substr(0, ownName.indexOf('('));        // trim off everything after the function name
    console.log(`ownName`, ownName);
}

someFunc(); */