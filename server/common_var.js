(function (exports) {
    var instance;

    function PrivateVariable() {
        const DEFAULT_ROW_CNT = 18;

        const CONSTANT_VALUE = { // this object can be shared with client using the object name 'common_var'
            CONNECTION_LIMIT_CNT: 16,
            INTERVAL_STR: ["BATCH_INTERVAL_NOW", "BATCH_INTERVAL_ONCE", "BATCH_INTERVAL_DAY", "BATCH_INTERVAL_WEEK", "BATCH_INTERVAL_MONTH"],
            STATUS_STR: ["READY", "SUSPENDED", "RUNNING", "COMPLETED"],
            PKG_FILE_EXT: [".tar", ".gz", ".bin"],
            CLI_PKG_DOWN_GROUP: {
                "ACT_DOWNLOAD_FILE": ["HeNB-TDD,EL-2000-TDD,EL-4000-TDD", "HeNB-FDD,EL-2000-FDD,EL-4000-FDD", "EL-6000-TDD", "EL-6000-FDD"],
                "ACT_DOWNLOAD_ACU": ["ACU"],
                "ACT_DOWNLOAD_RET": ["RET"]
            },
            CLI_FREQ_BAND_GROUP: {
                "FDD": ["28", "3"],
                "TDD": ["38", "41", "45", "48"]
            },
            TABLE_ROW_CNT_DEFAULT: DEFAULT_ROW_CNT,
            TABLE_ROW_CNT_MAIN_FAULT: 5,
            TABLE_ROW_CNT_ENBINFO_FAULT: 4,
            TABLE_ROW_CNT_ENBADD: 15,
            TABLE_ROW_CNT_PLD: 8,
            TABLE_SCROLLY_DEFAULT: "70vh",
            TABLE_SCROLLY_60VH: "60vh",
            TABLE_SCROLLY_DATA_EMPTY: "100",
            TABLE_SCROLLY_BATCH_CMD: "15vh",
            TABLE_SCROLLY_BATCH_JOB: "25vh",
            TABLE_SCROLLY_STAT_DATA: "20vh",
            TABLE_SCROLLY_ENBINFO_FAULT: "15vh",
            TABLE_SCROLLY_MAIN_FAULT: "28vh",
            TOTAL_ENB_CNT_MAIN_STATUS_BOARD: 10000,
            LOGIN_FAILURE_MAX_CNT: 5,
            LOGIN_LOCK_RELEASE_TIME: 5
        }
        Object.freeze(CONSTANT_VALUE);

        // this can be used only server side using the object name 'commVar'
        this.euConfig;
        this.euDbPool;
        this.euScheuler;
        this.euIo;

        return {
            getConst: function (name) {
                // console.info(`[CONST] CONSTANT_VALUE[%{name}] =>`, this[name]);
                return (name) ? CONSTANT_VALUE[name] : undefined;
            },
            get: function (name) {
                // console.info(`[GET] this[%{name}] =>`, this[name]);
                return (name) ? this[name] : undefined;
            },
            set: function (name, value) {
                if (name && value) {
                    this[name] = value;
                    // console.info(`[SET] this[${name}] <=`, this[name]); // occurs the exception 'Converting circular structure to JSON'
                }
            },
            del: function (name) {
                // console.info(`[DEL] this[%{name}] =`, this[name]);
                delete this[name];
            },
            getDtOpts: function (opts) { // use client only
                const DT_DEFAULT_OPTIONS = {
                    // camelCase                    // Hungarian        | Meaning -> ref. https://datatables.net/upgrade/1.10-convert
                    pageLength: DEFAULT_ROW_CNT, // iDisplayLength   | Change the initial page length (number of rows per page)
                    serverSide: true, // bServerSide      | Feature control DataTables' server-side processing mode.
                    processing: true, // bProcessing      | Feature control the processing indicator.
                    deferRender: true, // bDeferRender     | Feature control deferred rendering for additional speed of initialisation.
                    destroy: true, // bDestroy         | Destroy any existing table matching the selector and replace with the new options.
                    dom: `Bfrtip`, // sDom             | Define the table control elements to appear on the page and in what order
                    language: getDtLang(), // oLanguage        | Language strings
                    order: [ // aaSorting        | Initial order (sort) to apply to the table
                            [0, "desc"]
                        ]
                        // , scrollX: true              // sScrollX         | Horizontal scrolling <- dataTables_scroll 와 같이 사용할 수 없다.
                        // , scrollY: "70vh"            // sScrollY         | Vertical scrolling
                        // , scrollCollapse: true       // bScrollCollapse  | Allow the table to reduce in height when a limited number of rows are shown.
                        /* , drawCallback: settings =>{ // fnDrawCallback   | Function that is called every time DataTables performs a draw.
                            console.log("Redraw occurred at: " + moment().format());
                            setTimeout(() => {
                                console.log(`Table columns adjust`);
                                // table.columns.adjust();
                                this.columns.adjust().responsive.recalc();
                            }, 200);
                        } */
                        // , autoWidth: true            // bAutoWidth       | Feature control DataTables' smart column width handling
                        ,
                    sPaginationType: "full_numbers"
                };

                return (opts) ? $.extend(DT_DEFAULT_OPTIONS, opts) : DT_DEFAULT_OPTIONS;
            }
        };
    }

    // getting an instance
    exports.getInstance = function () {
        // get instance by singleton pattern
        if (!instance) {
            console.log(`[NEW] instance is undefined, so assinged new instance class into the instance!!!`);
            instance = new PrivateVariable();
        }
        return instance;
    }

    // below is the external value
})(typeof exports === 'undefined' ? this['common_var'] = {} : exports);