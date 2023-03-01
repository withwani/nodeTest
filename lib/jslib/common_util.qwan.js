(function (exports) {
    /**
     * For parsing the string message to JSON
     */
    String.prototype.escapeSpecialCharsForParse = function () {
        return this.replace(/\n/g, "\\n");
        /*.replace(/\'/g, "\\'")
        .replace(/\"/g, '\\"')
        .replace(/\&/g, "\\&")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t")
        .replace(/\b/g, "\\b")
        .replace(/\f/g, "\\f");*/
    };

    /**
     * For parsing the string message to JSON
     */
    String.prototype.escapeSpecialCharsForGui = function () {
        return this.replace(/(?:\r\n|\r|\n)/g, "<br/>");
        // return this.replace('\n', '&#13;&#10;');
        // return this.replace(/\n/g, "&#13;&#10;");
        /*.replace(/\'/g, "\\'")
        .replace(/\"/g, '\\"')
        .replace(/\&/g, "\\&")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t")
        .replace(/\b/g, "\\b")
        .replace(/\f/g, "\\f");*/
    };

    /**
     * For deleting last index value of multi-instance parameter
     */
    String.prototype.trimLastIndexOfMultiInstance = function () {
        return this.replace(/.1.$/g, ".")
            .replace(/.i.$/g, ".");
    };

    /* Below is General Handler ================================================================= */
    /**
     * Checks whether the object is empty
     * @param {object} obj object
     * @return {boolean} return the result whether the object is empty
     */
    exports.isEmpty = function (obj) {
        for (var key in obj) {
            if (obj.hasOwnProperty(key))
                return false;
        }
        return true;
    };

    /**
     * Separates URL
     * @param {string} urlPath the url path to separate
     * @return {object} The object with as protocol, ip and port.
     */
    exports.getURLProperty = function (urlPath) {
        console.log(`[CommonUtil] getURLProperty(${urlPath})`);

        let path = urlPath,
            protocol = "",
            url, host, port;

        if (path.includes("://")) {
            path = urlPath.split("://");
            protocol = path[0];
            path = path[1];
        }

        if (path.includes("[")) { // IPv6 Address
            url = path.split("]");
            host = (url[0]) ? url[0].substring(1) : "";
            port = (url[1]) ? url[1].substring(1) : "";
        } else { // IPv4 Address
            url = path.split(":");
            host = (url[0]) ? url[0] : "";
            port = (url[1]) ? url[1] : "";
        }

        console.log(`protocol: ${protocol}, host: ${host}, port: ${port}`);
        return {
            protocol,
            host,
            port
        };
    };

    /**
     * Get file path
     * @param {string} filename the filename
     * @return {object} The object with absolute and relative path.
     */
    exports.getPath = function (filename) {
        // console.log(`[CommonUtil] getPath(${filename})`);
        let fullPath = __dirname;
        let path = fullPath.split("/");
        let cwd = path[path.length - 1];

        let absoluteDir = fullPath;
        let relativeDir = fullPath;

        let absoluteFile = fullPath + "/" + filename;
        let relativeFile = absoluteFile;

        // console.log(fullPath, path, cwd);
        return {
            absoluteDir,
            relativeDir,
            absoluteFile,
            relativeFile
        };
    };

    /**
     * Get function name and line number
     * @return {string} The string combined current function and line.
     * Usage:
     * getFuncLineNo();
     */
    exports.getFuncLineNo = function () {
        console.log("[CommonUtil] getFuncLineNo()");
        Object.defineProperty(global, "__stack", {
            get: function () {
                var orig = Error.prepareStackTrace;
                Error.prepareStackTrace = function (_, stack) {
                    return stack;
                };
                var err = new Error;
                Error.captureStackTrace(err, arguments.callee);
                var stack = err.stack;
                Error.prepareStackTrace = orig;
                return stack;
            }
        });

        Object.defineProperty(global, "__line", {
            get: function () {
                return __stack[1].getLineNumber();
            }
        });

        Object.defineProperty(global, "__function", {
            get: function () {
                return __stack[1].getFunctionName();
            }
        });

        // console.log(__line);
        console.log("[" + __function + ":" + __line + "]");

        return ("[" + __function + ":" + __line + "]");
    };

    /**
     * Indents the given string
     * @param {string} str  The string to be indented.
     * @param {number} tabCount  The amount of indentations to place at the
     *     beginning of each line of the string.
     * @param {number=} tabSize  Optional.  If specified, this should be
     *     the number of spaces to be used for each tab that would ordinarily be
     *     used to indent the text.  These amount of spaces will also be used to
     *     replace any tab characters that already exist within the string.
     * @return {string}  The new string with each line beginning with the desired
     *     amount of indentation.
     */
    exports.indent = function setIndent(str, tabCount, tabSize, insertTab = true) {
        // console.log(`[CommonUtil] indent(${str}, ${tabCount}, ${tabSize})`);
        str = str.replace(/^(?=.)/gm, new Array(tabCount + 1).join("\t"));
        if (insertTab) {
            tabCount = new Array(tabSize + 1 || 0).join(" "); // re-use
        }
        return (tabSize && insertTab) ? str.replace(/^\t+/g, function (tabs) {
            return tabs.replace(/./g, tabCount);
        }) : str;
    };

    /**
     * This function support the locale date with GMT offset, but I can't never change the format...
     * @param {number} inputTzOffset The offset of GMT timezone.
     * @return {string} The locale date string.
     * Usage
     * let offset = -(new Date().getTimezoneOffset()/60);
     * let localTime = getDateWithUTCOffset(offset);
     */
    exports.getLocaleDate = function getDateWithUTCOffset(inputTzOffset) {
        console.log(`[CommonUtil] getLocaleDate(${inputTzOffset})`);
        var now = new Date(); // get the current time

        var currentTzOffset = -now.getTimezoneOffset() / 60; // in hours, i.e. -4 in NY
        var deltaTzOffset = inputTzOffset - currentTzOffset; // timezone diff

        var nowTimestamp = now.getTime(); // get the number of milliseconds since unix epoch
        var deltaTzOffsetMilli = deltaTzOffset * 1000 * 60 * 60; // convert hours to milliseconds (tzOffsetMilli*1000*60*60)
        var outputDate = new Date(nowTimestamp + deltaTzOffsetMilli); // your new Date object with the timezone offset applied.

        return outputDate.toLocaleString();
    };

    /**
     * This function support the locale date with IOS offset.
     * @param {any} inputDate the input date.
     * @param {number} timeZoneOffset The offset of timezone.
     * @return {string} The ISO date string.
     * Usage
     * var offset = 9;
     * var date = new Date();
     * var iso_date = commUtil.GuiFormatToISOFormat(date, offset);
     */
    exports.GuiFormatToISOFormat = function (inputDate, timeZoneOffset) {

        var date = new Date(new Date(inputDate).getTime() + timeZoneOffset * 3600 * 1000);
        var time = date.toISOString();

        time = time.replace(/Z/, "");
        return time;
    };

    /**
     * This function support to return whether the value is numeric or others...
     * @param {object} value The value to check whether number or not
     * @return {boolean} The result of value check
     *
     * example)
     * isNumber( "-10" ) // true
     * isNumber( "+10" ) // true
     * isNumber( "-10", 2 ) // false
     * isNumber( "+10", 2 ) // false
     * isNumber( "0" ) // true
     * isNumber( "0xFF" ) // false
     * isNumber( "8e5" ) // false
     * isNumber( "3.1415" ) // true
     * isNumber( "3.1415", 4 ) // false
     * isNumber( "0144" ) // true
     * isNumber( ".423" ) // false
     * isNumber( "" ) // false
     * isNumber( "432,000" ) // true
     * isNumber( "432,000", 3 ) // false
     * isNumber( "23,223.002" ) // true
     * isNumber( "3,23,423" ) // false
     * isNumber( "-0x42" ) // false
     * isNumber( "7.2acdgs" ) // false
     * isNumber( {} ) // false
     * isNumber( NaN ) // false
     * isNumber( null ) // false
     * isNumber( true ) // false
     * isNumber( false ) // false
     * isNumber( Infinity ) // false
     * isNumber( undefined ) // false
     */
    function isNumber(value, opt) {
        value = String(value).replace(/^\s+|\s+$/g, ""); // trim left and right of string
        let regex;

        if (typeof (opt) == "undefined" || opt == "1") { // decimal included '+/-', ',' and '.'
            regex = /^[+\-]?(([1-9][0-9]{0,2}(,[0-9]{3})*)|[0-9]+){1}(\.[0-9]+)?$/g;
        } else if (opt == "2") { // decimal included ',' and '.'
            regex = /^(([1-9][0-9]{0,2}(,[0-9]{3})*)|[0-9]+){1}(\.[0-9]+)?$/g;
        } else if (opt == "3") { // decimal included '.'
            regex = /^[0-9]+(\.[0-9]+)?$/g;
        } else { // decimal included only number
            regex = /^[0-9]$/g;
        }

        if (regex.test(value)) {
            value = value.replace(/,/g, "");
            return isNaN(value) ? false : true;
        } else {
            return false;
        }
    }
    exports.isNumber = isNumber;

    /**
     * Get an array of objects according to key, value, or key and value matching
     * @param {object} obj Target object
     * @param {string} key The key for detecting
     * @param {string} val The value for detecting
     * @returns {array} The result array
     */
    function getObjects(obj, key, val) {
        var objects = [];
        for (var i in obj) {
            if (!obj.hasOwnProperty(i)) continue;
            if (typeof obj[i] == "object") {
                objects = objects.concat(getObjects(obj[i], key, val));
            } else
                //if key matches and value matches or if key matches and value is not passed (eliminating the case where key matches but passed value does not)
                if (i == key && obj[i] == val || i == key && val == "") { //
                    objects.push(obj);
                } else if (obj[i] == val && key == "") {
                //only add if the object is not already in the array
                if (objects.lastIndexOf(obj) == -1) {
                    objects.push(obj);
                }
            }
        }
        return objects;
    }
    exports.getObjects = getObjects;

    /**
     * Get an array of values that match on a certain key
     * @param {object} obj Target object, e.g. [{a: 1, b: 2, c: 3}, {a: 1, b: 2, c: 3}, ...]
     * @param {string} key The key for detecting
     * @returns {array} The result array
     */
    function getValues(obj, key) {
        var objects = [];
        for (var i in obj) {
            if (!obj.hasOwnProperty(i)) {
                objects.push("");
                continue;
            }
            if (typeof obj[i] == "object") {
                objects = objects.concat(getValues(obj[i], key));
            } else if (i == key) {
                objects.push(obj[i]);
            }
        }
        return objects;

        /**
         * another way

         return obj.map(function (a) { // the array of the specified key in the object array
            return a.key;
        }); */
    }
    exports.getValues = getValues;

    /**
     * Get an array of keys that match on a certain value
     * @param {object} obj Target object
     * @param {string} val The value for detecting
     * @returns {array} The result array
     */
    function getKeys(obj, val) {
        var objects = [];
        for (var i in obj) {
            if (!obj.hasOwnProperty(i)) continue;
            if (typeof obj[i] == "object") {
                objects = objects.concat(getKeys(obj[i], val));
            } else if (obj[i] == val) {
                objects.push(i);
            }
        }
        return objects;
    }
    exports.getKeys = getKeys;

    /** Validate str with regular expression
     * Example: ((?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%]).{6,20})
     * Description:
     * (                # Start of group
     * (?=.*\d)         # must contains one digit from 0-9
     * (?=.*[a-z])      # must contains one lowercase characters
     * (?=.*[A-Z])      # must contains one uppercase characters
     * (?=.*[@#$%])     # must contains one special symbols in the list "@#$%"
     * .                # match anything with previous condition checking
     * {6,20}           # length at least 6 characters and maximum of 20
     * )                # End of group
     */
    function checkStrPattern(str, pattern) {
        return (str.match(pattern));
        // OR return pattern.test(str);
        // OR new RegExp(pattern).test(str);
        // OR str.match(new RegExp(pattern));
    }
    exports.checkStrPattern = checkStrPattern;

    /**
     * Make ordering phrase for multi-columns
     * @param {array} orders Array of column index and ordering type
     * @param {array} columns Columns
     * @param {boolean} useIdx Ouput type. 0: column name, 1: column index
     * @returns {string} ORDER BY phrase
     */
    function makeOrderPhrase(orders, columns, useIdx = false) {
        // console.log(`IN> makeOrderPhrase(), orders =`, orders);
        let orderByPhrase = ``;
        for (let i = 0; i < orders.length; i++) {
            if (i > 0) orderByPhrase = orderByPhrase + `, `;
            orderByPhrase = orderByPhrase + `${(useIdx) ? parseInt(orders[i].column) + 1 : columns[parseInt(orders[i].column)].data} ${orders[i].dir}`;
        }
        // console.log(`orderByPhrase =`, orderByPhrase);
        return orderByPhrase;
    }
    exports.makeOrderPhrase = makeOrderPhrase;

    /**
     * the function is to round to a set number of decimal places
     * @param {float} value the value to round
     * @param {integer} decimals the number of decimal places to round the value
     */
    function round(value, decimals) {
        return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
    }
    exports.round = round;


    function getUserIP(req) {
        var ip;
        if (req.headers['x-forwarded-for']) {
            ip = req.headers['x-forwarded-for'].split(",")[0];
        } else if (req.connection && req.connection.remoteAddress) {
            ip = req.connection.remoteAddress;
        } else {
            ip = req.ip;
        }

        if (ip.includes(".")) { // IPv4
            let addrs = ip.split(":");
            ip = addrs[addrs.length - 1];
        } else { // IPv6
            // do nothing
        }

        return ip;

        /* return req.headers['x-forwarded-for'].split(',').pop() ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress; */

    }
    exports.getUserIP = getUserIP;

    function parseJsonForDB(str) {
        return JSON.parse(str.replace(/\'/gi, "\""));
    }
    exports.parseJsonForDB = parseJsonForDB;

    function stringifyJsonForDB(json) {
        return JSON.stringify(json).replace(/\"/gi, "\'");
    }
    exports.stringifyJsonForDB = stringifyJsonForDB;

    /**
     * Compare whether target array 1 equal with target array 2
     * @param {array} arr1 Target array 1
     * @param {array} arr2 Target array 2
     * @returns {boolean} if the result is equal, return true otherwise false
     */
    function arrEquals(arr1, arr2) {
        // if the other array is a falsy value, return
        if (!arr1 || !arr2)
            return false;

        // compare lengths - can save a lot of time
        if (arr1.length != arr2.length)
            return false;

        for (var i = 0; i < arr1.length; i++) {
            // Check if we have nested arrays
            if (arr1[i] instanceof Array && arr2[i] instanceof Array) {
                // recurse into the nested arrays
                if (!arr1[i].equals(arr2[i]))
                    return false;
            } else if (arr1[i] != arr2[i]) {
                // Warning - two different object instances will never be equal: {x:20} != {x:20}
                return false;
            }
        }
        return true;
    }
    exports.arrEquals = arrEquals;

    /**
     * Compare whether target object 1 equal with target object 2
     * @param {object} obj1 Target object 1
     * @param {object} obj2 Target object 1
     * @returns {boolean} if the result is equal, return true otherwise false
     */
    function objEquals(obj1, obj2) {
        //For the first loop, we only check for types
        for (propName in obj1) {
            //Check for inherited methods and properties - like .equals itself
            //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty
            //Return false if the return value is different
            if (obj1.hasOwnProperty(propName) != obj2.hasOwnProperty(propName)) {
                return false;
            }
            //Check instance type
            else if (typeof obj1[propName] != typeof obj2[propName]) {
                //Different types => not equal
                return false;
            }
        }
        //Now a deeper check using other objects property names
        for (propName in obj2) {
            //We must check instances anyway, there may be a property that only exists in obj2
            //I wonder, if remembering the checked values from the first loop would be faster or not
            if (obj1.hasOwnProperty(propName) != obj2.hasOwnProperty(propName)) {
                return false;
            } else if (typeof obj1[propName] != typeof obj2[propName]) {
                return false;
            }
            //If the property is inherited, do not check any more (it must be equa if both objects inherit it)
            if (!obj1.hasOwnProperty(propName))
                continue;

            //Now the detail check and recursion

            //This returns the script back to the array comparing
            /**REQUIRES Array.equals**/
            if (obj1[propName] instanceof Array && obj2[propName] instanceof Array) {
                // recurse into the nested arrays
                if (!obj1[propName].equals(obj2[propName]))
                    return false;
            } else if (obj1[propName] instanceof Object && obj2[propName] instanceof Object) {
                // recurse into another objects
                //console.log("Recursing to compare ", obj1[propName],"with",obj2[propName], " both named \""+propName+"\"");
                if (!obj1[propName].equals(obj2[propName]))
                    return false;
            }
            //Normal value comparison for strings and numbers
            else if (obj1[propName] != obj2[propName]) {
                return false;
            }
        }
        //If everything passed, let's say YES
        return true;
    }
    exports.objEquals = objEquals;

    /**
     * Check whether the value is null
     * @param {any} value Target value
     * @returns {boolean} if the value is null, return true otherwise false
     */
    function isNull(value) {
        /**
         * Check point!
         * when the value is integer 0...
         * condition 1. (value === "") --> return false
         * condition 2. (value == "") --> return true
         */
        if (value === "" || value == null || value == undefined || (value != null && typeof value == "object" && !Object.keys(value).length)) {
            return true;
        } else {
            return false;
        }
    }
    exports.isNull = isNull;

    /**
     * Check whether the value is in the range
     * @param {integer} val Target value
     * @param {integer} min The minimum value of the range
     * @param {integer} max The maximum value of the range
     * @returns {boolean} if the value is in the range, return true otherwise false
     */
    function between(val, min, max) {
        console.log(`${min} <= ${val} <= ${max}`);

        return +val >= +min && +val <= +max;
    }
    exports.between = between;

    // fixed TTA #11 #12
    /**
     * Translate name array to specific language
     * @param {json} langPack json language object of specific lauguage code
     * @param {array} names name array to translate
     */
    /* function translateNames(langPack, names) {
        console.log(`IN> translateNames(${langPack.langdesc}), names =`, names);

        var data = ``;
        names.forEach((name, idx) => {
            if (idx != 0) data += ",";
            data += `"${langPack[name]}"`;
        });
        data += `\n`;
        console.debug(`return names =`, data);
        return data;
    }
    exports.translateNames = translateNames; */

    /**
     * get the count of Object's keys
     * @param {object} obj Object
     * @returns {integer} size of the Object
     */
    function getObjSize(obj) {
        var size = 0,
            key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) size++;
        }
        return size;
    }
    exports.getObjSize = getObjSize;

    /**
     * rearranged object array by key value
     * @param {array} xs target array
     * @param {string} key key or condition
     *
     * ex 1)
     * console.log(groupBy(['one', 'two', 'three'], 'length')); => { '3': [ 'one', 'two' ], '5': [ 'three' ] }
     *
     * ex 2)
        let test = [
            { Phase: "Phase 1", Step: "Step 1", Task: "Task 1", Value: "5" },
            { Phase: "Phase 1", Step: "Step 1", Task: "Task 2", Value: "10" },
            { Phase: "Phase 1", Step: "Step 2", Task: "Task 1", Value: "15" },
            { Phase: "Phase 1", Step: "Step 2", Task: "Task 2", Value: "20" },
            { Phase: "Phase 2", Step: "Step 1", Task: "Task 1", Value: "25" },
            { Phase: "Phase 2", Step: "Step 1", Task: "Task 2", Value: "30" },
            { Phase: "Phase 2", Step: "Step 2", Task: "Task 1", Value: "35" },
            { Phase: "Phase 2", Step: "Step 2", Task: "Task 2", Value: "40" }
        ]
     * console.log(groupBy(test, 'Phase')); =>
        {
            'Phase 1': [
                { Phase: 'Phase 1', Step: 'Step 1', Task: 'Task 1', Value: '5' },
                { Phase: 'Phase 1', Step: 'Step 1', Task: 'Task 2', Value: '10' },
                { Phase: 'Phase 1', Step: 'Step 2', Task: 'Task 1', Value: '15' },
                { Phase: 'Phase 1', Step: 'Step 2', Task: 'Task 2', Value: '20' }],
            'Phase 2': [
                { Phase: 'Phase 2', Step: 'Step 1', Task: 'Task 1', Value: '25' },
                { Phase: 'Phase 2', Step: 'Step 1', Task: 'Task 2', Value: '30' },
                { Phase: 'Phase 2', Step: 'Step 2', Task: 'Task 1', Value: '35' },
                { Phase: 'Phase 2', Step: 'Step 2', Task: 'Task 2', Value: '40' }]
        }
     */
    function groupBy(xs, key) {
        return xs.reduce(function (rv, x) {
            (rv[x[key]] = rv[x[key]] || []).push(x);
            return rv;
        }, {});
    }
    exports.groupBy = groupBy;

})(typeof exports === 'undefined' ? this['common_util'] = {} : exports);