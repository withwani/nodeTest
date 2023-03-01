// MultiLang - BdR 2016
// JavaScript object to handle multilanguage, load phrases from JSON etc.

var MultiLang = function (url, lang, onload, onSetPhrases) {
    // variables
    this.phrases = {};

    // keep only first two chareacters, for example 'en-US', 'fr', 'nl-NL', 'it', 'zh' etc.
    this.selectedLanguage = (lang || navigator.language || navigator.userLanguage).substring(0, 2);

    // onLoad callback function, call after loading JSON
    this.onLoad = onload;

    // load json from url
    if (typeof url !== "undefined") {
        var obj = this;
        var req = new XMLHttpRequest();

        // NOTE: will load asynchronously!
        req.open("GET", url, true);
        //req.setRequestHeader("User-Agent", navigator.userAgent);
        req.onreadystatechange = function (evt) {
            if (evt.target.readyState == 4 && evt.target.status == 200) // 요청이 정상(200)적으로 완료(4) 되었다면... // status == 200, do not allow "Cross origin requests"
            //if (evt.target.readyState == 4)// TESTING allow "Cross origin requests" to load from local harddisk
            {
                // load translations
                this.phrases = JSON.parse(evt.target.responseText);
                // console.log(`parsed JSON phrases =`, this.phrases);
                if (onSetPhrases) onSetPhrases(this.phrases);

                // verify that the currently selected language exists in the translations
                this.setLanguage(this.selectedLanguage);

                // do callback when loading JSON is ready
                if (this.onLoad) {
                    this.onLoad();
                }

            }
        }.bind(obj); // NOTE: bind onreadyfunction to MultiLang instead of XMLHttpRequest, so MultiLang.phrases will be set instead of added to XMLHttpRequest
        req.addEventListener("error", function (e) {
            console.log("MultiLang.js: Error reading json file.");
        }, false);

        req.send(null);
    }

    this.setLanguage = function (langcode) {

        // check if language code exists in translations
        if (!this.phrases.hasOwnProperty(langcode)) {
            // if it doesn't exist; default to first language 

            // NOTE: the order of properties in a JSON object are not *guaranteed* to be the same as loading time,
            // however in practice all browsers do return them in order
            for (var key in this.phrases) {
                if (this.phrases.hasOwnProperty(key)) {
                    langcode = key;
                    break;
                }
            }
        }

        // set as selected language code
        this.selectedLanguage = langcode;
    };

    this.get = function (key) {
        // get key phrase
        var str;
        // console.debug(`MultiLang get(), key(${key})`);

        // check if any languages were loaded
        if (this.phrases[this.selectedLanguage]) str = this.phrases[this.selectedLanguage][key];

        // if key does not exist, return the literal key
        str = (str || key);

        return str;
    };

    this.getv = function (key, ...vals) {
        if(!key) return "";

        let str = (this.phrases[this.selectedLanguage]) ? (this.phrases[this.selectedLanguage][key] || key) : key;
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

    this.getk = function (val) {
        var obj;
        // console.debug(`MultiLang getk(), val(${val})`);

        // check if any languages were loaded
        if (this.phrases[this.selectedLanguage]) obj = this.phrases[this.selectedLanguage];

        return Object.keys(obj).find(key => obj[key] === val);
    };
};