// common variables
// console.log(`Start import_common.js`);
var multilang;
var userId = "";
var userLevel = 2;
var userLang = "";
var allowSnd = 1;
var debugMode = 0;
var userArea = null;
var serverMode = "multi";
var modelName = "euc";
var bannerTitle = "EUCAST EMS";
var firewall = false;
var title = "Noname";
var totEnbCnt = 10000;

// var socket = io();
var socket;
var sessionId;
var clientIp = "";
var hostIp = "";
var hostPort = "";

/* Change url path
console.log(`window.location.pathname`, window.location);
if(typeof(history.pushState) == "function") {
    history.replaceState(null, null, `/`);
    // let loc = window.location;
    // history.pushState({}, null, `${loc.protocol}//${loc.hostname}${loc.pathname}`);
    // history.replaceState({}, null, `${loc.protocol}//${loc.hostname}${loc.pathname}`);
} */

// activate of mainmenu-nave and submenu-nav
$("#cfg-dropdown").dropdown({
    action: "hide"
});
$("#fault-dropdown").dropdown({
    action: "hide"
});
$("#history-dropdown").dropdown({
    action: "hide"
});
$("#hems-dropdown").dropdown({
    action: "hide"
});
$("#db-dropdown").dropdown({
    action: "hide"
});
$("#core-dropdown").dropdown({
    action: "hide"
});

// select language if the function is used
$("#select-language").dropdown({
    // action: 'hide',
    onChange: function (value, text, $selectedItem) {
        // console.log(`text(${text}), value(${value}), selectedItem =`, $selectedItem);

        if (value && value != "") {
            sessionStorage.setItem("selectedLanguageCode", value);
            userLang = value;

            io().emit("msg", {
                id: "user",
                op: "user-set-language",
                user: {
                    id: (userId || ""),
                    // pw: "DownloadFile",
                    lang: value
                }
            });

            // langSelectChange(this);
            langSelectChange(value);
        }
    }
});

// common APIs
/**
 * Calculates the object size
 * @param {object} obj Target object
 * @returns {integer} the object size
 */
Object.size = function (obj) {
    var size = 0,
        key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

// turned the console log of the browser off
/* (function () {
    console.log = function() {};
})(); */

/**
 * Receiver of the common socket for gethering of the socket connection
 */
/* (function commonSocketReceiver() {
    console.log("IN> commonSocketReceiver() > Receiver of the common socket communication.");

    // socket = io();
    socket = io({
        transports: ["websocket"],
        upgrade: false
    });
    console.log(`[SOCKET] Getting a socket!!!`);

    socket.on("socket-connection", function (data) {
        console.log(`[SOCKET.ON] socket-connection, socket.id(${socket.id}, data =`, data);
        if (data.op_flag) {
            if ($(document)[0].title == `Main : ${bannerTitle}`) {
                console.log(`[SOCKET.ON] This is a main page, it will try to registering the socket of this page.`);
                socket.emit("main-socket-regist", {
                    id: "socket",
                    op: "regist",
                    data: socket.id
                });
            }
        } else {
            console.debug(`Close window, this.sid(${sessionId}) === data.sid(${data.sid})`);
            if (sessionId === data.sid) {
                if ($(document)[0].title == `Main : ${bannerTitle}`) {
                    window.location.href = "/expired";
                } else {
                    // window.close(); // opened window or tab will be closed.
                    window.open(location, "_self").close(); // fixed the problem that the window is not closed(solution by hack)
                }
            }
        }
    });
})(); */

/**
 * Operate keypress event in input node
 */
function preventKeyEvent() {
    console.log(`IN> preventKeyEvent() > prevent which keyCode`);
    $(document).on("keypress", "input", function (e) {
        if (e.which === 13) { // 13: ENTER
            // Simplifying the selector of the next input
            // because this isn't the problem
            $(this).next().focus();
            return false;
        }
    });
}

/** DOM 콘텐츠가 로드 된 이후 호출됨. window.onload 이벤트와 같음 */
/* window.addEventListener('DOMContentLoaded', function() {
    console.log(`IN> DOMContentLoaded`);
}); */

/** DOM 구성요소를 모두 로드 한 후에 호출되는 콜백으로 오직 하나의 문서에 하나의 함수만 존재한다. 중복으로 정의시 뒤에 가장 마지막에 호출되는 함수가 사용된다. */
window.onload = function () {
    console.log(`IN> onload()`);
    // this.onLoad();
    // refreshLabels();
};

/* function onLoad() {
    console.log(`onLoad(), userLang =`, userLang);
    // create object, load JSON file, default to 'nl', and callback to initList when ready loading
    if (!multilang) {
        multilang = new MultiLang("languages.json", (userLang || "en"), this.initList, function(phrases) {
            // console.log(`localStorage.getItem("selectedLanguagePhrases") =`, localStorage.getItem("selectedLanguagePhrases"));
            if (!localStorage.getItem("selectedLanguagePhrases")) {
                localStorage.setItem("selectedLanguagePhrases", JSON.stringify(phrases)); // set all languages into SesssionStorage
                console.log(`Completed setting ${userLang || "en"} Language phrases!!!`);
            }
            if (!localStorage.getItem("selectedLanguageCode")) {
                localStorage.setItem("selectedLanguageCode", userLang); // set all languages into SesssionStorage
                console.log(`Completed setting ${userLang || "en"} Language Code!!!`);
            }
        });
    } else {
        console.log(`MultiLang obj was already assigned.`);
    }

    // alternatively
    //multilang = new MultiLang('languages.json', null, this.initList); // default to browser language
    //multilang = new MultiLang('languages.json'); // only load JSON, no callback
} */

function onLoad() {
    console.log(`IN> onLoad()`);
    refreshLabels();
}

function delLangPackTitle(pack) {
    const regexp = /^page[A-Za-z0-9_]{4,}/;

    let temp = $.extend({}, pack);
    Object.keys(temp).forEach(key => {
        if (regexp.test(key)) {
            delete temp[key];
        }
    });
    return temp;
}

/**
 * assigned an instance of the MultiLang class
 */
let langPack;
function initMultiLang(lang) {
    console.log(`initMultiLang(), lang =`, lang);

    // create object, load JSON file, default to 'nl', and callback to initList when ready loading
    if (!multilang) {
        multilang = new MultiLang("languages.json", lang, this.initList, function (phrases) {
            localStorage.setItem("selectedLanguagePhrases", JSON.stringify(phrases)); // set all languages into SesssionStorage
            localStorage.setItem("selectedLanguageCode", lang); // set all languages into SesssionStorage
            // langPack = phrases[lang];
            langPack = delLangPackTitle(phrases[lang]);
            console.log(`MultiLang, Completed setting ${lang} Language phrases and code!!!`);
        });
    } else {
        console.log(`MultiLang, the instance was already assigned.`);
    }

    // alternatively
    //multilang = new MultiLang('languages.json', null, this.initList); // default to browser language
    //multilang = new MultiLang('languages.json'); // only load JSON, no callback
}

/**
 * Initialize the language list
 * initMultiLang() 함수 호출 후 multilang 객체 생성 시 onSetPhrases() 함수 이후에 호출된다.
 */
function initList() {
    console.log(`IN> initList(), MultiLang, init language list.`);

    // refreshLabels(); // window.onload 시로 이동함
    setTimeout(() => { // 가끔 번역 안될 때가 있어서 지연시간을 추가함.
        refreshLabels(); // window.onload 시로 이동함
    }, 50);
}

/**
 * Change the value of the language setting
 * @param {string} sel Selected language value of the dropdown
 */
function langSelectChange(sel) {
    console.log(`IN> langSelectChange(sel), sel =`, sel);
    // switch to selected language code
    multilang.setLanguage(sel);

    // refresh labels
    refreshLabels();
}

/**
 * Reload all labels to changed language
 */
function refreshLabels() {
    console.log(`IN> refreshLabels()`);
    // Basically do the following for all document elements:
    //document.getElementById("Options").textContent = multilang.get("Options");
    // loop through all document elements

    // var allnodes = document.body.getElementsByTagName("*");
    var allnodes = document.getElementsByClassName("i18n");
    // console.log(`allnodes =`, allnodes);
    for (let i = 0; i < allnodes.length; i++) {
        // get id current elements
        // var idname = allnodes[node].id;
        // get name current elements
        // var idname = (allnodes[node].name || allnodes[node].id);
        var i18n = allnodes[i].dataset.i18n;
        // if id exists, set translated text
        if (i18n != "") {
            allnodes[i].textContent = multilang.get(i18n);
            // console.log(`${i}: i18n=${i18n}, translated =`, allnodes[i].textContent);
        }
    }
}

/**
 * Get the language pack of the languate JSON file
 * @param {string} code The language code(e.g. kr, eu, ...)
 * @returns {object} The JSON object
 */
function getLanguagePack(code) {
    console.log(`IN> getLanguagePack(${code})`);

    let phrases = localStorage.getItem("selectedLanguagePhrases");
    // console.log(`localStorage.getItem("selectedLanguagePhrases") =`, phrases);
    if (phrases) {
        console.log(`getLanguagePack, Completed loading LANGUAGE JSON file!!!!!!!!!!!!!!!!!!`);
        return delLangPackTitle(JSON.parse(phrases)[code]);
        // return JSON.parse(phrases)[code];
    } else {
        console.log(`getLanguagePack, Did not load LANGUAGE JSON file yet, return null!!!!!!`);
        return null;
    }
}

const DEFAULT_VALIDATION_DATA = {
    HeNB_ID: ["empty", `integer[1..${totEnbCnt}]`],
    NE_ID: "empty",
    HeNB_Name: "empty",
    OUI: "empty",
    SN: "empty",
    ECI: "empty",
    TAC: "empty",
    PCI: "empty",
    Freq_Band: ["empty", "minCount[1]"],
    EARFCNUL: "empty",
    EARFCNDL: "empty",
    UL_B_width: "empty",
    DL_B_width: "empty",
    SeGW1: "empty",
    Loc_Info: "empty",
    Area: ["empty", "minCount[1]"],
    S1LinkList: "empty"
};
const VALIDATION_DATA_JSON = "config/validation.json";
/**
 * Get the filed data of form for validation check
 * @param {any} defaultData The default value
 * @param {fn} cbAlways The callback function always called after returning the result
 * @param {fn} cbDone The callback function when the result was successful
 * @param {fn} cbFail The callback function when the result failed
 * @returns {object} The JSON object
 */
function getFieldData(defaultData, cbAlways, cbDone, cbFail) {
    console.log(`IN> getFieldData()`);
    let validData = (defaultData) ? defaultData : DEFAULT_VALIDATION_DATA;

    // return $.getJSON() // for checking fail()
    return $.getJSON(VALIDATION_DATA_JSON)
        .done(function (data, textStatus, jqXHR) {
            console.log(`$.getJSON.done, data =`, data);
            // console.log(`textStatus =`, textStatus);

            validData = data[userLang];
            console.log(`totEnbCnt`, totEnbCnt);
            validData.HeNB_ID.rules[1].type = `integer[1..${totEnbCnt}]`; // for variable range of the eNodeB ID

            if (cbDone) cbDone(validData);
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            console.log(`$.getJSON.fail, errorThrown =`, errorThrown);
            // console.log(`textStatus =`, textStatus);

            if (cbFail) cbFail(errorThrown);
        })
        .always(function (data, textStatus, errorThrown) {
            // console.log(`$.getJSON.always, data =`, data);
            // console.log(`$.getJSON.always, errorThrown =`, errorThrown);

            if (cbAlways) cbAlways(validData, textStatus, errorThrown);
        });
}

/**
 * Rendering to the specific date format without UTC offset
 * @param {date} data The current date
 * @returns {date} the converted date format
 */
function renderingDateFormat(data) {
    return (!data || data == "") ? "" : moment(data).format("YYYY-MM-DD HH:mm:ss");
    // return (!data || data == "") ? "" : moment(data).utcOffset(0).format("YYYY-MM-DD HH:mm:ss"); // UTC -> Default(KST) 로 변경 후 utcOffset(0) 옵션 삭제
}

/**
 * Set buttons of the altEditor table
 * @param {array} btnArr The array to store buttons to use
 * @param  {...any} btns The button to use
 */
function setTableButton(btnArr, ...btns) {
    console.log(`IN> setTableButton(), btns =`, btns);

    btns.forEach(function (btn) {
        btnArr.push(btn);
    });
}

/**
 * Transferred event is stop in this function and do not transfer to anywhere
 * @param {event} event The event tranferring from the parent node
 */
function stopEvent(event) {
    event.preventDefault(); // prevent the default action of the event
    event.stopPropagation(); // stop propagation of the event to parent node
    event.stopImmediatePropagation(); // immediately stop propagation of the event to parent or same level node
}

/**
 * Regex validation check of the value
 * @param {event} event The event
 * @param {string} type Type of the value
 */
function validate(event, type) {
    let theEvent = event || window.event;
    let key = theEvent.keyCode || theEvent.which;
    key = String.fromCharCode(key);
    let regex;

    if (type == "number" || type == "unsignedInt")
        regex = /[0-9]/;
    else if (type == "int")
        regex = /^[-]?\d*$/g; // negative, positive, zero
    else if (type == "ipaddr")
        regex = /[0-9.]/;
    else if (type == "ipaddr_list")
        regex = /[0-9.,]/;
    else if (type == "string")
        return; // skip
    // regex = /[a-zA-Z0-9_\.-\s]/; // included '_', '.', '-' and space special character
    // sample regex included more special character : [a-zA-Z0-9\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"\s]
    else
        regex = /[0-9]/;

    if (!regex.test(key)) {
        theEvent.returnValue = false;
        if (theEvent.preventDefault) theEvent.preventDefault();
    }
}

/**
 * Prevents entering of characters except allowed charactor
 * @param {object} obj The key up event object
 */
function skip_hangul(obj) {
    if (obj.keyCode == 8 || obj.keyCode == 9 || obj.keyCode == 37 || obj.keyCode == 39 || obj.keyCode == 46) return;
    obj.value = obj.value.replace(/[\ㄱ-ㅎㅏ-ㅣ가-힝]/g, "");
}

/**
 * Check validation of the input value
 * @param {object} paramObj Object of the parameter (e.g. DIS_CELLCFGLTE_EPC.para[X])
 * @param {string, integer} paramVal The value of the parameter (e.g. 9)
 * @returns {object} ResultCode and error message
 */
function checkValidOfParamVal(paramObj, paramVal) {
    // console.log(`IN> checkValidOfParamVal(paramVal: ${paramVal}), paramObj =`, paramObj);
    let retVal = {
        resultCode: 0, // 0:red(NOK), 1:green(OK), 101-:gray(Ignore)
        errorMsg: ""
    };

    if (!paramObj || paramObj.type === "string" || paramObj.type === "boolean") {
        console.log(`Ignored NULL value, string and boolean type.`);
        retVal.resultCode = 1;
        retVal.errorMsg = "";
        return retVal;
    }

    // paramObj.type -> int, unsignedInt
    if (common_util.isNull(paramObj.rangeStart) || common_util.isNull(paramObj.rangeEnd) || +paramObj.rangeStart >= +paramObj.rangeEnd) {
        console.log(`Ignored the invalid range.`);
        retVal.resultCode = 101;
        retVal.errorMsg = `Invalid Range!(${paramObj.rangeStart}<=${paramVal}<=${paramObj.rangeEnd})`;
        return retVal;
    }

    if (common_util.between(paramVal, paramObj.rangeStart, paramObj.rangeEnd)) { // range check
        retVal.resultCode = 1;
        retVal.errorMsg = "";
    } else {
        console.log(`Out of range!!! (${paramObj.rangeStart} <= ${paramVal} <= ${paramObj.rangeEnd})`);
        retVal.resultCode = 0;
        retVal.errorMsg = `Out of range!(${paramObj.rangeStart}<=${paramVal}<=${paramObj.rangeEnd})`;
    }

    // console.log(`checkValidOfParamVal(), retVal =`, retVal);
    return retVal;
}

/**
 * Check validation of the input value
 * @param {object} paramObjs All object of the parameter (e.g. DIS_CELLCFGLTE_EPC.para)
 * @param {integer} paramIdx The index of the parameter (e.g. -1, 0, 1, ...)
 * @param {string} paramName The name of the parameter (e.g. TAC)
 * @param {string, integer} paramVal The value of the parameter (e.g. 9)
 * @returns {object} ResultCode and error message
 */
function checkValidOfInputVal(paramObjs, paramIdx, paramName, paramVal) {
    // console.log(`IN> checkValidOfInputVal(paramIdx: ${paramIdx}, paramName: ${paramName}, paramVal: ${paramVal}), paramObjs =`, paramObjs);
    let retVal = {
        resultCode: 0, // 0:red(NOK), 1:green(OK), 101-:gray(Ignore)
        errorMsg: ""
    };

    if (paramName) {
        if (paramIdx > 0) {
            let srcObj = paramObjs[paramIdx];

            if (srcObj.alias === paramName) {
                retVal = checkValidOfParamVal(srcObj, paramVal);
            }
        } else {
            console.error(`There is no item named ${paramName}`);
            retVal.resultCode = 1; // Ignored, (e.g. Index ...)
            retVal.errorMsg = `Passed this parameter(${paramName})`;
        }
    } else {
        console.error(`Wrong paramName(${paramName}) or paramVal(${paramVal})`);
    }

    console.log(`checkValidOfInputVal(), retVal =`, retVal);
    return retVal;
}

/**
 * Change the language of DataTables columns and buttons
 * @param {array} columns Array of the DataTables column
 * @param {array} buttons Array of the DataTables button
 * @param {fn} cbCol Callback function for the columns
 * @param {fn} cbBtn Callback function for the buttons
 */
function changeDtColBtn(columns, buttons, cbCol, cbBtn) {
    console.log(`IN> changeDTableBtnCol()`);
    // supported multi-language for column title
    if (columns) {
        columns.forEach(function (column) {
            if (langPack && userLang != "en") {
                if (langPack[column.title]) {
                    column.title = langPack[column.title];
                }
            }

            if (cbCol) cbCol(column);
        });
    }
    // supported multi-language for column title
    if (buttons) {
        buttons.forEach(function (button) {
            if (langPack && userLang != "en") {
                if (langPack[button.text]) {
                    button.text = langPack[button.text];
                }
            }

            if (cbBtn) cbBtn(button);
        });
    }
}

/**
 * For CSV button
 */
function setCSVTitleDefault(name) {
    let searchText = $(".dataTables_filter input").val() || "";
    return setCSVTitleWithSearch(searchText, name || false);
}
/**
 * For CSV button
 */
function setCSVTitleWithSearch(search, isWhole) {
    let title = document.title.split(":")[0].trim().replace(" ", "_") || "";
    let whole = '';
    if (typeof isWhole == "boolean") {
        whole = (isWhole) ? "whole" : "";
    } else {
        whole = isWhole;
    }
    return makeFilename(true, title, whole, search);
}
/**
 * For CSV button
 */
function makeFilename(bDate, ...vals) {
    let names = [];

    if (vals && vals.length > 0) {
        names = names.concat(vals);
    }
    if (bDate) names.push(moment().format("YYYYMMDD_HHmmss"));

    return names.filter(Boolean).join("-"); // except null value
}

/**
 * Converting the rendering object received from server
 */
function convertRenderObj(stringifyObj) {
    // The stringifyObj is an object after implemented JSON.stringify()
    return JSON.parse(stringifyObj.replace(/&#34;/gi, "\""));
}

/**
 * Showing a modal window
 */
function showEuModal(type, options, content, multi) {
    switch (type) {
        case "table":
            $(`#${type}_list`).DataTable(options);
            break;

        default:
            break;
    }

    $(`#${type}-modal`).removeClass("hidden");
    $(`#${type}-content`).html(content);
    $(`#${type}-modal`).modal("show");
}

function hideEuModal(type) {
    $(`#${type}-modal`).modal("hide");
    $(`#${type}-content`).html("");
    $(`#${type}-modal`).addClass("hidden");
}
// console.log(`End import_common.js`);


function i18n(str, ...vals) {
    let temp = (langPack && langPack[str]) ? langPack[str] : str;

    if (vals.length > 0) {
        vals.forEach((val, idx) => {
            temp = temp.replace(`\$${idx + 1}`, val);
        });
    }

    return temp;
}
/* function i18n(str, ...vals) {
    if (vals.length > 0) {
        return (common_util.getObjSize(multilang.phrases)) ? multilang.getv(str, vals) : ((key, args) => {
            if (langPack) {
                let temp = langPack[key];
                args.forEach((a, i) => {
                    temp = temp.replace(`\$${i+1}`, a);
                });
                temp = (temp || key);
                return temp;
            } else {
                return key;
            }
        })(str, vals);
    } else {
        return (common_util.getObjSize(multilang.phrases)) ? multilang.get(str) : (langPack) ? langPack[str] : str;
    }
} */

function toBool(val) {
    let type = typeof val;

    if (type == "boolean") {
        return val;
    } else if (type == "string") {
        return (val == "true");
    } else if (type == "number") {
        return (+val != 0);
    } else {
        return !(val === "" || val == null || val == undefined || (val != null && typeof val == "object" && !Object.keys(val).length));
    }
}

/* function getCkVal(name) {
    let strCookies = document.cookie;
    console.log(`strCookies`, strCookies);
    let cookieArr = strCookies.split(";");
    console.log(`cookieArr`, cookieArr);

    let temp, result;
    cookieArr.some(ck => {
        temp = ck.split("=");
        if (name == temp[0]) {
            result = temp[1];
            return true;
        }
    });

    return result;
} */