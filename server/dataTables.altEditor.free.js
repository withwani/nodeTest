/*! Datatables altEditor 1.0
 */

/**
 * @summary     altEditor
 * @description Lightweight editor for DataTables
 * @version     1.0
 * @file        dataTables.editor.lite.js
 * @author      kingkode (www.kingkode.com) && KasperOlesen && kwpark
 * @contact     www.kingkode.com/contact
 * @copyright   Copyright 2016 Kingkode
 *
 * This source file is free software, available under the following license:
 *   MIT license - http://datatables.net/license/mit
 *
 * This source file is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE. See the license files for details.
 *
 * For details please refer to: http://www.kingkode.com
 */

/* Reworked edition
 This is a modified version of the altEditor 1.0
 New functionality:
  - Input validation.
  - Dublicate data check.
  - Server communication with AJAX calls.
  - Refresh button for reloading data from ajax source.
  - Cancel button for undoing unsaved changes.
 Reworked:
  - Modal windows.
  - table rendering.
  - Add/Edit/Delete functions.
  - midified for Account page
*/
var altEditorObj;
// var usedPageTitles = ["Account", "Package", "Fault", "Neighbor Setting"];
(function (factory) {
    if (typeof define === "function" && define.amd) {
        // AMD
        define(["jquery", "datatables.net"], function ($) {
            return factory($, window, document);
        });
    } else if (typeof exports === "object") {
        // CommonJS
        module.exports = function (root, $) {
            if (!root) {
                root = window;
            }

            if (!$ || !$.fn.dataTable) {
                $ = require("datatables.net")(root, $).$;
            }

            return factory($, root, root.document);
        };
    } else {
        // Browser
        return factory(jQuery, window, document);
        // let testA = factory(jQuery, window, document);
        // console.log(`testA =`, testA);
    }
}(function ($, window, document, undefined) {
    "use strict";
    var DataTable = $.fn.dataTable;

    var _instance = 0;

    /**
     * altEditor provides modal editing of records for Datatables
     *
     * @class altEditor
     * @constructor
     * @param {object} oTD DataTables settings object
     * @param {object} oConfig Configuration object for altEditor
     */
    var altEditor = function (dt, opts) {
        if (!DataTable.versionCheck || !DataTable.versionCheck("1.10.8")) {
            throw ("Warning: altEditor requires DataTables 1.10.8 or greater");
        }

        // User and defaults configuration object
        this.c = $.extend(true, {},
            DataTable.defaults.altEditor,
            altEditor.defaults,
            opts
        );

        /**
         * @namespace Settings object which contains customisable information for altEditor instance
         */
        this.s = {
            /** @type {DataTable.Api} DataTables' API instance */
            dt: new DataTable.Api(dt),

            /** @type {String} Unique namespace for events attached to the document */
            namespace: ".altEditor" + (_instance++)
        };

        /**
         * @namespace Common and useful DOM elements for the class instance
         */
        this.dom = {
            /** @type {jQuery} altEditor handle */
            modal: $('<div class="dt-altEditor-handle"/>'),
        };

        /* Constructor logic */
        this._constructor();
        // console.log(`this = `, this);
    };

    $.extend(altEditor.prototype, {
        /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         * Constructor
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

        /**
         * Initialise the RowReorder instance
         *
         * @private
         */
        _constructor: function () {
            // console.log('altEditor Enabled')
            var that = this;
            var dt = this.s.dt;

            this._setup();

            dt.on("destroy.altEditor", function () {
                dt.off(".altEditor");
                $(dt.table().body()).off(that.s.namespace);
                $(document.body).off(that.s.namespace);
            });
        },
        /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         * Private methods
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

        /**
         * Setup dom and bind button actions
         *
         * @private
         */
        _setup: function () {
            // console.log('Setup');

            var that = this;
            var dt = this.s.dt;
            // console.debug(`this.s =`, this.s);

            // add modal
            $("body").append(`
                <div class="modal fade" id="altEditor-modal" tabindex="-1" role="dialog">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                <h4 class="modal-title"></h4>
                            </div>
                            <div class="modal-body">
                                <p></p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                                <input type="submit" form="altEditor-form" class="btn btn-primary"></input>
                            </div>
                        </div>
                    </div>
                </div>`);

            // Save and Cancel button on bottom of table, but not used
            /*$(document).on('click', '#saveButton', function(e) {
                sendJsonData(that);
            });
            $(document).on('click', '#cancelButton', function(e) {
                undoChanges(that);
            });*/

            // add Edit Button
            if (this.s.dt.button("edit:name")) {
                this.s.dt.button("edit:name").action(function (e, dt, node, config) {
                    var rows = dt.rows({
                        selected: true
                    }).count();

                    that._openEditModal();
                });

                $(document).on("click", "#editRowBtn", function (e) { // 2nd invocation
                    console.log(`altEditor editRowBtn event!`);
                    $("#editRowBtn").button({
                        loadingText: i18n("loading...")
                    });
                    $("#editRowBtn").button("loading");
                    if (initValidation(that)) {
                        e.preventDefault();
                        e.stopPropagation();
                        // $("#cancelButton").prop("disabled", false);

                        if (e.hasOwnProperty("reqHandler") && e.hasOwnProperty("rowData")) {
                            e.reqHandler(e.rowData, e.rowType || "EDIT");
                            // e.reqHandler(e.rowData, "EDIT");
                            setTimeout(() => {
                                $("#altEditor-modal").bsModal("hide");
                            }, 1000);
                        }
                    } else {
                        reqInvalidMsgOnModal(e.invalidMsg);
                        setTimeout(() => {
                            $("#editRowBtn").button("reset");
                        }, 1000);
                    }
                });

                /* $(document).on("input", "#user_password", function (e) {
                    console.log(`altEditor input event! value =`, $(this).val());
                }); */
            }

            // add Delete Button
            if (this.s.dt.button("delete:name")) {
                this.s.dt.button("delete:name").action(function (e, dt, node, config) {
                    var rows = dt.rows({
                        selected: true
                    }).count();

                    that._openDeleteModal();
                });

                $(document).on("click", "#deleteRowBtn", function (e) {
                    console.log(`altEditor deleteRowBtn event!`);
                    $("#deleteRowBtn").button({
                        loadingText: i18n("loading...")
                    });
                    $("#deleteRowBtn").button("loading");

                    e.preventDefault();
                    e.stopPropagation();
                    // $(this).prop("disabled", true);
                    // $("#cancelButton").prop("disabled", false);

                    if (e.hasOwnProperty("reqHandler") && e.hasOwnProperty("rowData")) {
                        e.reqHandler(e.rowData, e.rowType || "DEL");
                        // e.reqHandler(e.rowData, "DEL");
                        setTimeout(() => {
                            $("#altEditor-modal").bsModal("hide");
                        }, 1000);
                    } else if (altEditorObj.hasOwnProperty("reqHandler") && altEditorObj.hasOwnProperty("rowData")) { // TODO: Batch 페이지에서 이벤트 전달이 정상적이지 않아서 변경됨.
                        altEditorObj.reqHandler(altEditorObj.rowData, altEditorObj.rowType || "DEL");
                        setTimeout(() => {
                            $("#altEditor-modal").bsModal("hide");
                        }, 1000);
                    }
                });
            }

            // add Add Button
            if (this.s.dt.button("add:name")) {
                this.s.dt.button("add:name").action(function (e, dt, node, config) {
                    var rows = dt.rows({
                        selected: true
                    }).count();

                    //Deselect any selected row
                    //Important for match-check
                    dt.row({
                        selected: true
                    }).deselect();

                    that._openAddModal();
                });

                $(document).on("click", "#addRowBtn", function (e) {
                    console.log(`altEditor addRowBtn event!`);
                    $("#addRowBtn").button({
                        loadingText: i18n("loading...")
                    });
                    $("#addRowBtn").button("loading");

                    if (initValidation(that)) {
                        e.preventDefault();
                        e.stopPropagation();
                        // $("#cancelButton").prop("disabled", false);

                        if (e.hasOwnProperty("reqHandler") && e.hasOwnProperty("rowData")) {
                            e.reqHandler(e.rowData, e.rowType || "ADD");
                            // e.reqHandler(e.rowData, "ADD");
                            setTimeout(() => {
                                $("#altEditor-modal").bsModal("hide");
                            }, 1000);
                        }
                    } else {
                        // return;
                        reqInvalidMsgOnModal(e.invalidMsg);
                        setTimeout(() => {
                            $("#addRowBtn").button("reset");
                        }, 1000);
                    }
                });
            }

            // add Refresh button
            if (this.s.dt.button("refresh:name")) {
                this.s.dt.button("refresh:name").action(function (e, dt, node, config) {
                    // kwpark ---> for reload page
                    if (dt) {
                        dt.buttons.info(i18n("Reload"), i18n("Reloading data of this table."), 1500);
                        dt.ajax.reload();
                    }
                    // <--- kwpark

                    /* blocked post to server
                    $.post('php/dhcp.php', {'act': 'get'}).done(function(res) {
                        dt.ajax.reload();
                        console.log("Datatable reloaded.")
                    });*/
                });
            }
        },
        /**
         * Emit an event on the DataTable for listeners
         *
         * @param  {string} name Event name
         * @param  {array} args Event arguments
         * @private
         */
        _emitEvent: function (name, args) {
            this.s.dt.iterator("table", function (ctx, i) {
                $(ctx.nTable).triggerHandler(name + ".dt", args);
            });
        },
        /**
         * Open Edit Modal for selected row
         *
         * @private
         */
        _openEditModal: function (modalTitle, submitTitle, submitId, table) {
            var that = this;
            var dt = (table) ? table : this.s.dt;
            var columnDefs = [];

            //Adding column attributes to object.
            //Assuming that the first defined column is ID - Therefore skipping that
            //and starting at index 1, because we dont wanna be able to change the ID.
            // for( var i = 1; i < dt.context[0].aoColumns.length; i++ )
            for (var i = 0; i < dt.context[0].aoColumns.length; i++) { // kwpark
                // fixed TTA #16
                columnDefs.push({
                    title: dt.context[0].aoColumns[i].sTitle || "",
                    name: dt.context[0].aoColumns[i].data || "",
                    type: dt.context[0].aoColumns[i].type || "",
                    options: dt.context[0].aoColumns[i].options || "",
                    msg: dt.context[0].aoColumns[i].errorMsg || "",
                    hoverMsg: dt.context[0].aoColumns[i].hoverMsg || "",
                    pattern: dt.context[0].aoColumns[i].pattern || "",
                    special: dt.context[0].aoColumns[i].special || "",
                    hide: dt.context[0].aoColumns[i].hide || "", // kwpark
                    visible: dt.context[0].aoColumns[i].visible || "", // kwpark
                    mandatory: dt.context[0].aoColumns[i].mandatory || "", // kwpark
                    editable: dt.context[0].aoColumns[i].editable || "", // kwpark
                    value: dt.context[0].aoColumns[i].value || "", // kwpark
                    unique: dt.context[0].aoColumns[i].unique || ""
                });
            }
            console.log(`columnDefs = `, columnDefs); // kwpark
            var adata = dt.rows({
                selected: true
            });

            //Building edit-form
            var data = "";

            data += "<form name='altEditor-form' role='form'>";

            for (var j = 0; j < columnDefs.length; j++) {
                if (columnDefs[j].hide) continue; // kwpark, for hide item

                data += "<div class='form-group'>";
                data += "<div class='col-sm-5 col-md-5 col-lg-5 text-right' style='padding-top:4px;'>";
                data += "<label for='" + columnDefs[j].title + "'>" + columnDefs[j].title + ":</label></div>";
                data += "<div class='col-sm-6 col-md-6 col-lg-6'>";

                /* blocked this for new logic of building edit form
                //Adding text-inputs and errorlabels
                if(columnDefs[j].type.includes("text")){
                  data += "<input type='" + columnDefs[j].type + "' id='" + columnDefs[j].name + "'  pattern='" + columnDefs[j].pattern + "'  title='" + columnDefs[j].hoverMsg + "' name='" + columnDefs[j].title + "' placeholder='" + columnDefs[j].title + "' data-special='" + columnDefs[j].special + "' data-errorMsg='" + columnDefs[j].msg + "' data-unique='" + columnDefs[j].unique + "' style='overflow:hidden'  class='form-control  form-control-sm' value='" + adata.data()[0][columnDefs[j].name] + "'>";
                  data += "<label id='" + columnDefs[j].name + "label" + "' class='errorLabel'></label>";
                }

                //Adding readonly-fields
                if(columnDefs[j].type.includes("readonly")){
                  data += "<input type='text' readonly  id='" + columnDefs[j].title + "' name='" + columnDefs[j].title + "' placeholder='" + columnDefs[j].title + "' style='overflow:hidden'  class='form-control  form-control-sm' value='" + adata.data()[0][columnDefs[j].name] + "'>";
                }

                //Adding select-fields
                if(columnDefs[j].type.includes("select")){
                var options = "";
                for (var i = 0; i < columnDefs[j].options.length; i++) {
                    // console.log(`adata.data()[0] = `, adata.data()[0]);
                    // console.log(`adata.data()[0][${columnDefs[j].name}] = `, adata.data()[0][columnDefs[j].name]);
                    // console.log(`columnDefs[${j}].options[${i}] = `, columnDefs[j].options[i]);

                    //Assigning the selected value of the <selected> option
                    // if(adata.data()[0][columnDefs[j].name].includes(columnDefs[j].options[i])){
                    if(adata.data()[0][columnDefs[j].name] == columnDefs[j].options[i]){ // kwpark
                    options += "<option value='" + columnDefs[j].options[i] + "'selected>" + columnDefs[j].options[i] + "</option>";
                    }else{
                    options += "<option value='" + columnDefs[j].options[i] + "'>" + columnDefs[j].options[i] + "</option>";
                    }
                }
                data += "<select class='form-control'>" + options + "</select>";
                }*/

                // kwpark ---> new logic of building edit form
                if (columnDefs[j].hasOwnProperty("editable") && !columnDefs[j].editable) { // for editable item
                    data += "<input type='text' readonly  id='" + columnDefs[j].title + "' name='" + columnDefs[j].title + "' placeholder='" + columnDefs[j].title + "' style='overflow:hidden; background-color: whitesmoke !important'  class='form-control  form-control-sm' value='" + adata.data()[0][columnDefs[j].name] + "'>";
                } else {
                    //Adding text-inputs and errorlabels
                    if (columnDefs[j].type == "text") {
                        data += "<input type='" + columnDefs[j].type + "' id='" + columnDefs[j].name + "'  pattern='" + columnDefs[j].pattern + "'  title='" + columnDefs[j].hoverMsg + "' name='" + columnDefs[j].title + "' placeholder='" + columnDefs[j].title + "' data-special='" + columnDefs[j].special + "' data-errorMsg='" + columnDefs[j].msg + "' data-unique='" + columnDefs[j].unique + "' style='overflow:hidden'  class='form-control  form-control-sm' value='" + adata.data()[0][columnDefs[j].name] + "'>";
                        data += "<label id='" + columnDefs[j].name + "label" + "' class='errorLabel eu-errorLabel'></label>";
                    }
                    //Adding password-fields
                    if (columnDefs[j].type == "password") {
                        // data += "<input type='" + columnDefs[j].type + "' id='" + columnDefs[j].name + "'  pattern='" + columnDefs[j].pattern + "'  title='" + columnDefs[j].hoverMsg + "' name='" + columnDefs[j].title + "' placeholder='" + columnDefs[j].title + "' data-special='" + columnDefs[j].special + "' data-errorMsg='" + columnDefs[j].msg + "' data-unique='" + columnDefs[j].unique + "' style='overflow:hidden'  class='form-control  form-control-sm' value='" + adata.data()[0][columnDefs[j].name] + "'>";
                        data += `<input type='${columnDefs[j].type}' id='${columnDefs[j].name}' pattern='${columnDefs[j].pattern}' title='${columnDefs[j].hoverMsg}' name='${columnDefs[j].title}' placeholder='${columnDefs[j].title}' data-special='${columnDefs[j].special}' data-errorMsg='${columnDefs[j].msg}' data-unique='${columnDefs[j].unique}' style='overflow:hidden' class='form-control form-control-sm' value=''>`;
                        // An element to toggle between password visibility
                        // data += `<input type="checkbox" onclick="showPassword()"><span class="i18n" data-i18n="Show Password" style="margin-left:5px; margin-right:5px;">Show Password</span>`;
                        data += `<input type="checkbox" onclick="showPassword()"><span class="i18n" data-i18n="${i18n("Show Password")}" style="margin-left:5px; margin-right:5px;">${i18n("Show Password")}</span>`;
                        data += "<label id='" + columnDefs[j].name + "label" + "' class='errorLabel eu-errorLabel'></label>";
                    }
                    //Adding checker-fields
                    if (columnDefs[j].type == "checker") {
                        if (adata.data()[0][columnDefs[j].name] == "Y") {
                            data += `<input type="checkbox" id="${columnDefs[j].name}" name="${columnDefs[j].title}" checked>`;
                        } else {
                            data += `<input type="checkbox" id="${columnDefs[j].name}" name="${columnDefs[j].title}">`;
                        }
                        data += "<label id='" + columnDefs[j].name + "label" + "' class='errorLabel eu-errorLabel'></label>";
                    }
                    //Adding readonly-fields
                    if (columnDefs[j].type == "readonly") {
                        data += "<input type='text' readonly id='" + columnDefs[j].title + "' name='" + columnDefs[j].title + "' placeholder='" + columnDefs[j].title + "' style='overflow:hidden'  class='form-control  form-control-sm' value='" + (columnDefs[j].value) ? columnDefs[j].value : adata.data()[0][columnDefs[j].name] + "'>";
                        // data += "<input type='text' readonly id='" + columnDefs[j].title + "' name='" + columnDefs[j].title + "' placeholder='" + columnDefs[j].title + "' style='overflow:hidden'  class='form-control  form-control-sm' value='" + adata.data()[0][columnDefs[j].name] + "'>";
                    }
                    //Adding select-fields
                    if (columnDefs[j].type == "select") {
                        let options = "";
                        for (let k = 0; k < columnDefs[j].options.length; k++) {

                            //Assigning the selected value of the <selected> option
                            // if(adata.data()[0][columnDefs[j].name].includes(columnDefs[j].options[k])){
                            if (adata.data()[0][columnDefs[j].name] == columnDefs[j].options[k]) { // kwpark
                                options += "<option value='" + columnDefs[j].options[k] + "'selected>" + columnDefs[j].options[k] + "</option>";
                            } else {
                                options += "<option value='" + columnDefs[j].options[k] + "'>" + columnDefs[j].options[k] + "</option>";
                            }
                        }
                        data += "<select class='form-control'>" + options + "</select>";
                        // data += "<select class='form-control'>" + options + "</select>";
                    }
                    //Adding multi-complex-select-fields
                    if (columnDefs[j].type == "select_ex") {
                        let options = "";
                        for (let k = 0; k < columnDefs[j].options.length; k++) {
                            //Assigning the selected value of the <selected> option
                            if (adata.data()[0][columnDefs[j].name] == columnDefs[j].options[k]) { // kwpark
                                options += "<option value='" + columnDefs[j].options[k] + "'selected>" + columnDefs[j].options[k] + "</option>";
                            } else {
                                options += "<option value='" + columnDefs[j].options[k] + "'>" + columnDefs[j].options[k] + "</option>";
                            }
                        }
                        data += "<select class='form-control'>" + options + "</select>";
                    }

                    if (columnDefs[j].type == "select_ex_object") { // neighbor only, use option with object {strings, values}
                        let options = "";
                        for (let k = 0; k < columnDefs[j].options.strings.length; k++) {
                            //Assigning the selected value of the <selected> option
                            if (adata.data()[0][columnDefs[j].name] == columnDefs[j].options.strings[k]) { // kwpark
                                options += "<option value='" + columnDefs[j].options.values[k] + "'selected>" + columnDefs[j].options.strings[k] + "</option>";
                            } else {
                                options += "<option value='" + columnDefs[j].options.values[k] + "'>" + columnDefs[j].options.strings[k] + "</option>";
                            }
                        }
                        data += "<select class='form-control'>" + options + "</select>";
                    }

                    //Adding eustyle-select-fields
                    if (columnDefs[j].type == "eu-select") {
                        var options = `<div class="menu">`;
                        for (var i = 0; i < columnDefs[j].options.length; i++) {
                            options += `<div class="item" data-value='${columnDefs[j].options[i]}'>${columnDefs[j].options[i]}</div>`;
                        }
                        options += `</div>`;
                        data += `<div class='ui fluid selection dropdown eu-editor'>
                            <input id="${columnDefs[j].name}" name="${columnDefs[j].title}" type="hidden" value="${adata.data()[0][columnDefs[j].name]}">
                            <i class="dropdown icon"></i>
                            <div class="text">${adata.data()[0][columnDefs[j].name]}</div>
                            ${options}
                        </div>`;
                    }

                    if (columnDefs[j].type == "eu-select-multi") {
                        var options = `<div class="menu">`;
                        for (var i = 0; i < columnDefs[j].options.length; i++) {
                            options += `<div class="item" data-value='${columnDefs[j].options[i]}'>${columnDefs[j].options[i]}</div>`;
                        }
                        options += `</div>`;
                        data += `<div class='ui fluid multiple selection dropdown eu-editor'>
                            <input id="${columnDefs[j].name}" name="${columnDefs[j].title}" type="hidden" value="${adata.data()[0][columnDefs[j].name]}">
                            <i class="dropdown icon"></i>
                            <div class="text">${adata.data()[0][columnDefs[j].name]}</div>
                            ${options}
                        </div>`;
                    }

                    if (columnDefs[j].type == "eu-datetime") {
                        loadCssNJsIfNotAlreadyLoadedForSomeReason("calendar.min");
                        data += `<div class='ui fluid calendar'>
                            <div class="ui input left icon">
                            <i class="calendar icon"></i>
                            <input type="text" id="${columnDefs[j].name}" name="${columnDefs[j].title}" placeholder="Date/Time" value="${adata.data()[0][columnDefs[j].name]}">
                        </div>`;
                    }

                    if (columnDefs[j].type == "eu-pld") {
                        let mType = adata.data()[0]["parameter_type"];
                        if (mType == "boolean-force") { // because of the parameter that is boolean type without true/false value.
                            var options = `<div class="menu">`;
                            options += `<div class="item" data-value='true'>true</div>`;
                            options += `<div class="item" data-value='false'>false</div>`;
                            options += `</div>`;
                            data += `<div class='ui fluid selection dropdown eu-editor'>
                                <input id="${columnDefs[j].name}" name="${columnDefs[j].title}" type="hidden" value="${adata.data()[0][columnDefs[j].name]}">
                                <i class="dropdown icon"></i>
                                <div class="text">${adata.data()[0][columnDefs[j].name]}</div>
                                ${options}
                            </div>`;
                        } else if (mType == "dateTime-pending") {
                            data += `<div class='ui fluid calendar'>
                                <div class="ui input left icon">
                                    <i class="calendar icon"></i>
                                    <input type="text" id="${columnDefs[j].name}" name="${columnDefs[j].title}" placeholder="Date/Time" value="${adata.data()[0][columnDefs[j].name]}">
                                </div>
                            </div>`;
                        } else { // string, unsignedInt, int
                            let idx = (PLD_IDS && PLD_Tree) ? PLD_IDS.indexOf(adata.data()[0]["parameter_name"]) : -1;
                            if (idx > -1) {
                                let pldTreeInfo = PLD_Tree[idx],
                                    pldData = pldTreeInfo.data,
                                    isEnum = pldData["isenum"],
                                    isList = pldData["islist"];

                                if (isEnum) {
                                    let enumVal, enumStr = pldData["enum_strings"].split("|"),
                                        enumType = pldData["enum_group_value_type"];

                                    if (enumType == 0) {
                                        enumVal = pldData["enum_values"].split("|");
                                    } else {
                                        enumVal = enumStr;
                                    }

                                    let options = `<div class="menu">`;
                                    for (let i = 0; i < enumStr.length; i++) {
                                        options += `<div class="item" data-value='${enumVal[i]}'>${enumStr[i]}</div>`;
                                    }
                                    options += `</div>`;
                                    data += `<div class='ui fluid ${(isList) ? "multiple " : ""}selection dropdown eu-editor'>
                                        <input id="${columnDefs[j].name}" name="${columnDefs[j].title}" type="hidden" value="${adata.data()[0][columnDefs[j].name]}">
                                        <i class="dropdown icon"></i>
                                        <div class="text">${adata.data()[0][columnDefs[j].name]}</div>
                                        ${options}
                                    </div>`;
                                } else {
                                    data += "<input type='" + columnDefs[j].type + "' id='" + columnDefs[j].name + "'  pattern='" + columnDefs[j].pattern + "'  title='" + columnDefs[j].hoverMsg + "' name='" + columnDefs[j].title + "' placeholder='" + columnDefs[j].title + "' data-special='" + columnDefs[j].special + "' data-errorMsg='" + columnDefs[j].msg + "' data-unique='" + columnDefs[j].unique + "' style='overflow:hidden'  class='form-control  form-control-sm' value='" + adata.data()[0][columnDefs[j].name] + "'>";
                                    data += "<label id='" + columnDefs[j].name + "label" + "' class='errorLabel eu-errorLabel'></label>";
                                }
                            } else {
                                console.warn(`Not found the parameter(${adata.data()[0]["parameter_name"]}) in PLD_Tree!`)
                                data += "<input type='" + columnDefs[j].type + "' id='" + columnDefs[j].name + "'  pattern='" + columnDefs[j].pattern + "'  title='" + columnDefs[j].hoverMsg + "' name='" + columnDefs[j].title + "' placeholder='" + columnDefs[j].title + "' data-special='" + columnDefs[j].special + "' data-errorMsg='" + columnDefs[j].msg + "' data-unique='" + columnDefs[j].unique + "' style='overflow:hidden'  class='form-control  form-control-sm' value='" + adata.data()[0][columnDefs[j].name] + "'>";
                                data += "<label id='" + columnDefs[j].name + "label" + "' class='errorLabel eu-errorLabel'></label>";
                            }
                        }
                    }
                } // <--- kwpark
                data += "</div><div style='clear:both;'></div></div>";
            }
            data += "</form>";

            $("#altEditor-modal").on("show.bs.modal", function () {
                $("#altEditor-modal").find(".modal-title").html((modalTitle) ? i18n(modalTitle) : i18n(`Edit Record`));
                $("#altEditor-modal").find(".modal-body").html(`<pre> ${data} </pre>`);
                $("#altEditor-modal").find(".modal-footer").html(`<button type='button' data-content='remove' class='btn btn-default' data-dismiss='modal'>${i18n("Close")}</button>
                    <button type='button' data-content='remove' class='btn btn-primary' id='${(submitId) ? submitId : "editRowBtn"}'>${((submitTitle) ? i18n(submitTitle) : i18n("Submit"))}</button>`);

                /* before to apply submit ID
                $("#altEditor-modal").find(".modal-title").html((modalTitle) ? i18n(modalTitle) : i18n(`Edit Record`));
                $("#altEditor-modal").find(".modal-body").html(`<pre> ${data} </pre>`);
                $("#altEditor-modal").find(".modal-footer").html(`<button type='button' data-content='remove' class='btn btn-default' data-dismiss='modal'>${i18n("Close")}</button>
                    <button type='button' data-content='remove' class='btn btn-primary' id='editRowBtn'>${((submitTitle) ? i18n(submitTitle) : i18n("Submit"))}</button>`); */
                /* before to apply translation code
                $("#altEditor-modal").find(".modal-title").html((modalTitle) ? `${modalTitle}` : `Edit Record`);
                $("#altEditor-modal").find(".modal-body").html(`<pre> ${data} </pre>`);
                $("#altEditor-modal").find(".modal-footer").html(`<button type='button' data-content='remove' class='btn btn-default' data-dismiss='modal'>Close</button>
                    <button type='button' data-content='remove' class='btn btn-primary' id='editRowBtn'>${((submitTitle) ? submitTitle : "Submit")}</button>`); */
                /* Original code
                $("#altEditor-modal").find(".modal-title").html("Edit Record");
                $("#altEditor-modal").find(".modal-body").html("<pre>" + data + "</pre>");
                $("#altEditor-modal").find(".modal-footer").html("<button type='button' data-content='remove' class='btn btn-default' data-dismiss='modal'>Close</button>\
                    <button type='button' data-content='remove' class='btn btn-primary' id='editRowBtn'>Submit</button>"); */
            });
            $("#altEditor-modal").bsModal("show");
            $("#altEditor-modal input[0]").focus();
            $("#altEditor-modal .dropdown.eu-editor").dropdown();
            $("#altEditor-modal .dropdown.eu-editor.multiple").dropdown({
                maxSelections: 10
            });

            /* if (columnDefs[j].editorOnChange) {
                var f = columnDefs[j].editorOnChange; // FIXME what if more than 1 editorOnChange ?
                $(selector).find("#" + columnDefs[j].name).on('change', function(elm) {
                    f(elm, that);
                });
            } */
        },
        _editRowData: function () {
            var that = this;
            var dt = this.s.dt;

            // kwpark --->
            /* console.log(`IN> _editRowData() from ${$(document)[0].title}`);
            if (usedPageTitles.indexOf($(document)[0].title) > -1) {
                console.log(`buttonEvents =`, buttonEvents);
                if (buttonEvents[$(document)[0].title]) {
                    return buttonEvents[$(document)[0].title].edit(dt);
                } else {
                    return;
                }
            } */
            // <--- kwpark

            //Data from table columns
            var columnIds = [];
            //Data from input-fields
            var dataSet = [];
            //Complete new row data
            var rowDataArray = {};
            // table field data
            var adata = dt.rows({
                selected: true
            });

            //Getting the IDs and Values of the tablerow
            for (let i = 0; i < dt.context[0].aoColumns.length; i++) {
                columnIds.push({
                    id: dt.context[0].aoColumns[i].id,
                    dataSet: adata.data()[0][dt.context[0].aoColumns[i].data]
                });
            }

            //Adding the ID & value of DT_RowId
            rowDataArray[columnIds[0].id] = columnIds[0].dataSet;

            //Getting the inputs from the edit-modal
            $('form[name="altEditor-form"] *').filter(":input").each(function (i) {
                dataSet.push($(this).val());
            });

            //Adding the inputs from the edit-modal
            for (let i = 0; i < dataSet.length; i++) {
                rowDataArray[columnIds[i + 1].id] = dataSet[i];
            }

            //Displaying the updated row data in the datatable
            dt.row({
                selected: true
            }).data(rowDataArray);

            //Disabling the modal-edit-confirm button
            $("#editRowBtn").prop("disabled", true);

            //Success message for modal
            reqSuccessMsgOnModal();
            /* $("#altEditor-modal .modal-body .alert").remove();

            var message = '<div class="alert alert-success" role="alert">\
                <strong>Success!</strong> This record has been updated.\
                </div>';

            $("#altEditor-modal .modal-body").append(message); */
        },
        /**
         * Open Delete Modal for selected row
         *
         * @private
         */
        _openDeleteModal: function (modalTitle, submitTitle, submitId, table) {
            var that = this;
            var dt = (table) ? table : this.s.dt;
            var columnDefs = [];

            //Adding attribute IDs and values to object
            //  for( var i = 1; i < dt.context[0].aoColumns.length; i++ )
            for (var i = 0; i < dt.context[0].aoColumns.length; i++) // kwpark
            {
                // fixed TTA #16
                columnDefs.push({
                    title: dt.context[0].aoColumns[i].sTitle || "",
                    name: dt.context[0].aoColumns[i].data || "",
                    hide: dt.context[0].aoColumns[i].hide || "" // kwpark
                });
            }
            var adata = dt.rows({
                selected: true
            });

            //Building delete-modal
            var data = "";

            // NOTE: Delete modal 에서 배열의 정수값으로 표현되는 것을 String으로 변환해주는 예외처리부
            var exceptionField = ["package_no", "user_password", "job_interval", "job_status"];
            data += "<form name='altEditor-form' role='form'>";
            for (var j = 0; j < columnDefs.length; j++) {
                if (columnDefs[j].hide) continue; // kwpark, for hide item

                if (exceptionField.indexOf(columnDefs[j].name) > -1) {
                    switch (columnDefs[j].name) {
                        case "user_password":
                            // data += "<div class='form-group'><label for='" + columnDefs[j].title + "'>" + columnDefs[j].title + " :  </label><input  type='hidden'  id='" + columnDefs[j].title + "' name='" + columnDefs[j].title + "' placeholder='" + columnDefs[j].title + "' style='overflow:hidden'  class='form-control' value='" + adata.data()[0][columnDefs[j].name] + "' >" + "************" + "</input></div>";
                            data += `<div class='form-group'><label for='${columnDefs[j].title}'>${columnDefs[j].title} : </label><input type='hidden' id='${columnDefs[j].title}' name='${columnDefs[j].title}' placeholder='${columnDefs[j].title}' style='overflow:hidden' class='form-control' value='${adata.data()[0][columnDefs[j].name]}' >************</input></div>`;
                            break;

                        case "job_interval":
                            data += `<div class='form-group'><label for='${columnDefs[j].title}'>${columnDefs[j].title} : </label><input type='hidden' id='${columnDefs[j].title}' name='${columnDefs[j].title}' placeholder='${columnDefs[j].title}' style='overflow:hidden' class='form-control' value='${adata.data()[0][columnDefs[j].name]}' >${common_var.getInstance().getConst("INTERVAL_STR")[+adata.data()[0][columnDefs[j].name]]}</input></div>`;
                            break;

                        case "job_status":
                            data += `<div class='form-group'><label for='${columnDefs[j].title}'>${columnDefs[j].title} : </label><input type='hidden' id='${columnDefs[j].title}' name='${columnDefs[j].title}' placeholder='${columnDefs[j].title}' style='overflow:hidden' class='form-control' value='${adata.data()[0][columnDefs[j].name]}' >${common_var.getInstance().getConst("STATUS_STR")[+adata.data()[0][columnDefs[j].name]]}</input></div>`;
                            break;

                        case "package_no":
                        default:
                            // do not display
                            break;
                    }
                } else {
                    data += "<div class='form-group'><label for='" + columnDefs[j].title + "'>" + columnDefs[j].title + " :  </label><input  type='hidden'  id='" + columnDefs[j].title + "' name='" + columnDefs[j].title + "' placeholder='" + columnDefs[j].title + "' style='overflow:hidden'  class='form-control' value='" + adata.data()[0][columnDefs[j].name] + "' >" + adata.data()[0][columnDefs[j].name] + "</input></div>";
                }
            }
            data += "</form>";

            $("#altEditor-modal").on("show.bs.modal", function () {
                $("#altEditor-modal").find(".modal-title").html((modalTitle) ? i18n(modalTitle) : i18n(`Delete Record`));
                $("#altEditor-modal").find(".modal-body").html(`<pre> ${data} </pre>`);
                $("#altEditor-modal").find(".modal-footer").html(`<button type='button' data-content='remove' class='btn btn-default' data-dismiss='modal'>${i18n("Close")}</button>
                    <button id='${(submitId) ? submitId : "deleteRowBtn"}' type='button' data-content='remove' class='btn btn-danger'>${((submitTitle) ? i18n(submitTitle) : i18n("Delete"))}</button>`);
                /* before to apply submit id
                $("#altEditor-modal").find(".modal-title").html((modalTitle) ? i18n(modalTitle) : i18n(`Delete Record`));
                $("#altEditor-modal").find(".modal-body").html(`<pre> ${data} </pre>`);
                $("#altEditor-modal").find(".modal-footer").html(`<button type='button' data-content='remove' class='btn btn-default' data-dismiss='modal'>${i18n("Close")}</button>
                    <button id='deleteRowBtn' type='button' data-content='remove' class='btn btn-danger'>${((submitTitle) ? i18n(submitTitle) : i18n("Delete"))}</button>`); */
                /* before to apply translation code
                $("#altEditor-modal").find(".modal-title").html((modalTitle) ? `${modalTitle}` : `Delete Record`);
                $("#altEditor-modal").find(".modal-body").html(`<pre> ${data} </pre>`);
                $("#altEditor-modal").find(".modal-footer").html(`<button type='button' data-content='remove' class='btn btn-default' data-dismiss='modal'>Close</button>
                    <button id='deleteRowBtn' type='button' data-content='remove' class='btn btn-danger'>${((submitTitle) ? submitTitle : "Delete")}</button>`); */
                /* Original code
                $("#altEditor-modal").find(".modal-title").html("Delete Record");
                $("#altEditor-modal").find(".modal-body").html("<pre>" + data + "</pre>");
                $("#altEditor-modal").find(".modal-footer").html("<button type='button' data-content='remove' class='btn btn-default' data-dismiss='modal'>Close</button>\
                    <button id='deleteRowBtn' type='button'  data-content='remove' class='btn btn-danger'>Delete</button>"); */
            });
            $("#altEditor-modal").bsModal("show");
            $("#altEditor-modal input[0]").focus();
        },
        _deleteRow: function () {
            var that = this;
            var dt = this.s.dt;

            // kwpark --->
            /* console.log(`IN> _deleteRow() from ${$(document)[0].title}`);
            if (usedPageTitles.indexOf($(document)[0].title) > -1) {
                console.log(`buttonEvents =`, buttonEvents);
                if (buttonEvents[$(document)[0].title]) {
                    return buttonEvents[$(document)[0].title].delete(dt);
                } else {
                    return;
                }
            } */
            // <--- kwpark

            reqSuccessMsgOnModal("This record has been deleted.");
            /* $("#altEditor-modal .modal-body .alert").remove();

            var message = '<div class="alert alert-success" role="alert">\
                <strong>Success!</strong> This record has been deleted.\
                </div>';

            $("#altEditor-modal .modal-body").append(message); */

            dt.row({
                selected: true
            }).remove();
            dt.draw();
        },
        /**
         * Open Add Modal for selected row
         *
         * @private
         */
        _openAddModal: function (modalTitle, submitTitle, submitId, table) {
            var that = this;
            var dt = (table) ? table : this.s.dt;
            var columnDefs = [];

            // console.debug(`this =`, this);

            //Adding column attributes to object.
            for (var i = 0; i < dt.context[0].aoColumns.length; i++) {
                // fixed TTA #16
                columnDefs.push({
                    title: dt.context[0].aoColumns[i].sTitle || "",
                    name: dt.context[0].aoColumns[i].data || "",
                    type: dt.context[0].aoColumns[i].type || "",
                    accept: dt.context[0].aoColumns[i].accept || "",
                    options: dt.context[0].aoColumns[i].options || "",
                    msg: dt.context[0].aoColumns[i].errorMsg || "",
                    hoverMsg: dt.context[0].aoColumns[i].hoverMsg || "",
                    pattern: dt.context[0].aoColumns[i].pattern || "",
                    special: dt.context[0].aoColumns[i].special || "",
                    visible: dt.context[0].aoColumns[i].visible || "", // kwpark
                    hide: dt.context[0].aoColumns[i].hide || "", // kwpark
                    mandatory: dt.context[0].aoColumns[i].mandatory || "", // kwpark
                    editable: dt.context[0].aoColumns[i].editable || "", // kwpark
                    value: dt.context[0].aoColumns[i].value || "", // kwpark
                    unique: dt.context[0].aoColumns[i].unique || ""
                });
            }

            //Building add-form
            var data = "";
            data += "<form name='altEditor-form' role='form'>";
            for (var j = 0; j < columnDefs.length; j++) {
                if (columnDefs[j].hide) continue; // kwpark, for hide item

                data += "<div class='form-group'><div class='col-sm-5 col-md-5 col-lg-5 text-right' style='padding-top:4px;'><label for='" + columnDefs[j].title + "'>" + columnDefs[j].title + ":</label></div><div class='col-sm-6 col-md-6 col-lg-6'>";

                //Adding text-inputs and errorlabels
                if (columnDefs[j].type == "text") {
                    data += "<input type='" + columnDefs[j].type + "' id='" + columnDefs[j].name + "'  pattern='" + columnDefs[j].pattern + "'  title='" + columnDefs[j].hoverMsg + "' name='" + columnDefs[j].title + "' placeholder='" + columnDefs[j].title + "' data-special='" + columnDefs[j].special + "' data-errorMsg='" + columnDefs[j].msg + "' data-unique='" + columnDefs[j].unique + "' style='overflow:hidden'  class='form-control  form-control-sm' value=''>";
                    data += "<label id='" + columnDefs[j].name + "label" + "' class='errorLabel eu-errorLabel'></label>";
                }
                //Adding password-fields
                if (columnDefs[j].type == "password") {
                    // data += "<input type='" + columnDefs[j].type + "' id='" + columnDefs[j].name + "'  pattern='" + columnDefs[j].pattern + "'  title='" + columnDefs[j].hoverMsg + "' name='" + columnDefs[j].title + "' placeholder='" + columnDefs[j].title + "' data-special='" + columnDefs[j].special + "' data-errorMsg='" + columnDefs[j].msg + "' data-unique='" + columnDefs[j].unique + "' style='overflow:hidden'  class='form-control  form-control-sm' value=''>";
                    data += `<input type='${columnDefs[j].type}' id='${columnDefs[j].name}' pattern='${columnDefs[j].pattern}' title='${columnDefs[j].hoverMsg}' name='${columnDefs[j].title}' placeholder='${columnDefs[j].title}' data-special='${columnDefs[j].special}' data-errorMsg='${columnDefs[j].msg}' data-unique='${columnDefs[j].unique}' data-alert='' style='overflow:hidden' class='form-control form-control-sm' value=''>`;
                    // An element to toggle between password visibility
                    // data += `<input type="checkbox" onclick="showPassword()"><span class="i18n" data-i18n="Show Password" style="margin-left:5px; margin-right:5px;">Show Password</span>`;
                    data += `<input type="checkbox" onclick="showPassword()"><span class="i18n" data-i18n="${i18n("Show Password")}" style="margin-left:5px; margin-right:5px;">${i18n("Show Password")}</span>`;
                    data += "<label id='" + columnDefs[j].name + "label" + "' class='errorLabel eu-errorLabel'></label>";
                }
                //Adding picker-fields
                if (columnDefs[j].type == "picker") {
                    data += `<div class="input-group">
                        <span class="input-group-btn">
                            <span class="btn btn-primary btn-file">
                                <i class="attach icon"></i><input type="file" accept="${columnDefs[j].accept}" id="${columnDefs[j].name}" name="${columnDefs[j].name}" single>
                            </span>
                        </span>
                        <input type="text" id="_${columnDefs[j].name}" placeholder="${i18n("Browse")}&hellip;" pattern="${columnDefs[j].pattern}" title="${columnDefs[j].hoverMsg}" name="${columnDefs[j].title}" data-special="${columnDefs[j].special}" data-errorMsg="${columnDefs[j].msg}" data-unique="${columnDefs[j].unique}" class="form-control" readonly>
                    </div>`;
                    data += "<label id='" + columnDefs[j].name + "label" + "' class='errorLabel eu-errorLabel'></label>";
                }
                //Adding checker-fields
                if (columnDefs[j].type == "checker") {
                    data += `<input type="checkbox" id="${columnDefs[j].name}" name="${columnDefs[j].title}">`;
                    data += "<label id='" + columnDefs[j].name + "label" + "' class='errorLabel eu-errorLabel'></label>";
                }
                //Adding readonly-fields
                if (columnDefs[j].type == "readonly") {
                    data += "<input type='text' readonly  id='" + columnDefs[j].name + "' name='" + columnDefs[j].title + "' placeholder='" + columnDefs[j].title + "' style='overflow:hidden'  class='form-control  form-control-sm' value='" + columnDefs[j].value + "'>";
                }

                //Adding select-fields
                if (columnDefs[j].type == "select") {
                    var options = "";
                    for (var i = 0; i < columnDefs[j].options.length; i++) {
                        options += "<option value='" + columnDefs[j].options[i] + "'>" + columnDefs[j].options[i] + "</option>";
                    }
                    data += "<select class='form-control'>" + options + "</select>";
                }

                if (columnDefs[j].type == "eu-select") {
                    var options = `<div class="menu">`;
                    for (var i = 0; i < columnDefs[j].options.length; i++) {
                        // options += `<option class="item" value='${columnDefs[j].options[i]}'>${columnDefs[j].options[i]}</option>`;
                        options += `<div class="item" data-value='${columnDefs[j].options[i]}'>${columnDefs[j].options[i]}</div>`;
                    }
                    options += `</div>`;
                    data += `<div class='ui fluid selection dropdown eu-editor'>
                        <input id="${columnDefs[j].name}" name="${columnDefs[j].title}" type="hidden" value="${columnDefs[j].options[0]}">
                        <i class="dropdown icon"></i>
                        <div class="text">${columnDefs[j].options[0]}</div>
                        ${options}
                    </div>`;
                }

                /* if (columnDefs[j].editorOnChange) {
                    var f = columnDefs[j].editorOnChange; // FIXME what if more than 1 editorOnChange ?
                    $(selector).find("#" + columnDefs[j].name).on('change', function(elm) {
                        f(elm, that);
                    });
                } */

                data += "</div><div style='clear:both;'></div></div>";
            }
            data += "</form>";

            $("#altEditor-modal").on("show.bs.modal", function () {
                $("#altEditor-modal").find(".modal-title").html((modalTitle) ? i18n(modalTitle) : i18n(`Add Record`));
                $("#altEditor-modal").find(".modal-body").html(`<pre> ${data} </pre>`);
                $("#altEditor-modal").find(".modal-footer").html(`<button type='button' data-content='remove' class='btn btn-default' data-dismiss='modal'>${i18n("Close")}</button>
                    <input type='submit' data-content='remove' class='btn btn-primary' id='${(submitId) ? submitId : "addRowBtn"}' value='${((submitTitle) ? i18n(submitTitle) : i18n("Add"))}'></input>`);

                /* before to apply submit ID
                $("#altEditor-modal").find(".modal-title").html((modalTitle) ? i18n(modalTitle) : i18n(`Add Record`));
                $("#altEditor-modal").find(".modal-body").html(`<pre> ${data} </pre>`);
                $("#altEditor-modal").find(".modal-footer").html(`<button type='button' data-content='remove' class='btn btn-default' data-dismiss='modal'>${i18n("Close")}</button>
                    <input type='submit' data-content='remove' class='btn btn-primary' id='addRowBtn' value='${((submitTitle) ? i18n(submitTitle) : i18n("Add"))}'></input>`); */

                /* before to apply translation code
                $("#altEditor-modal").find(".modal-title").html((modalTitle) ? `${modalTitle}` : `Add Record`);
                $("#altEditor-modal").find(".modal-body").html(`<pre> ${data} </pre>`);
                $("#altEditor-modal").find(".modal-footer").html(`<button type='button' data-content='remove' class='btn btn-default' data-dismiss='modal'>Close</button>
                    <input type='submit' data-content='remove' class='btn btn-primary' id='addRowBtn' value='${((submitTitle) ? submitTitle : "Add")}'></input>`); */
                /* Original code
                $("#altEditor-modal").find(".modal-title").html("Add Record");
                $("#altEditor-modal").find(".modal-body").html("<pre>" + data + "</pre>");
                $("#altEditor-modal").find(".modal-footer").html("<button type='button' data-content='remove' class='btn btn-default' data-dismiss='modal'>Close</button>\
                    <input type='submit' data-content='remove' class='btn btn-primary' id='addRowBtn' value='Add'></input>"); */
            });
            $("#altEditor-modal").bsModal("show");
            $("#altEditor-modal input[0]").focus();
            $("#altEditor-modal .dropdown.eu-editor").dropdown();
        },
        _addRowData: function () {
            var that = this;
            var dt = this.s.dt;

            // kwpark --->
            /* console.log(`IN> _addRowData() from ${$(document)[0].title}`);
            if (usedPageTitles.indexOf($(document)[0].title) > -1) {
                console.log(`buttonEvents =`, buttonEvents);
                if (buttonEvents[$(document)[0].title]) {
                    return buttonEvents[$(document)[0].title].add(dt);
                } else {
                    return;
                }
            } */
            // <--- kwpark

            //Finding the biggest numerical ID, incrementing it and assigning the new ID to the new row.
            var highestID = Math.max.apply(Math, dt.column(0).data()) + 1;
            var rowID = "" + highestID;
            //Containers with data from table columns
            var columnIds = [];
            //Data from input-fields.
            var inputDataSet = [];
            //Complete new row data
            var rowDataArray = {};

            //Getting the IDs of the tablerow
            for (var i = 0; i < dt.context[0].aoColumns.length; i++) {
                columnIds.push({
                    id: dt.context[0].aoColumns[i].id
                });
            }

            //Adding the ID & value of DT_RowId
            rowDataArray[columnIds[0].id] = rowID;

            //Getting the inputs from the modal
            $('form[name="altEditor-form"] *').filter(":input").each(function (i) {
                inputDataSet.push($(this).val());
            });

            //Adding the inputs from the modal to rowArray
            for (var i = 0; i < inputDataSet.length; i++) {
                rowDataArray[columnIds[i + 1].id] = inputDataSet[i];
            }

            //Adding the new row to the datatable
            dt.row.add(rowDataArray).draw(false);

            //Success message for modal
            reqSuccessMsgOnModal("This record has been added.");
            /* $("#altEditor-modal .modal-body .alert").remove();
            var message = '<div class="alert alert-success" role="alert">\
                <strong>Success!</strong> This record has been added.\
                </div>';
            $("#altEditor-modal .modal-body").append(message); */
        },
        _getExecutionLocationFolder: function () {
            var fileName = "dataTables.altEditor.js";
            var scriptList = $("script[src]");
            var jsFileObject = $.grep(scriptList, function (el) {
                if (el.src.indexOf(fileName) !== -1) {
                    return el;
                }
            });
            var jsFilePath = jsFileObject[0].src;
            var jsFileDirectory = jsFilePath.substring(0, jsFilePath.lastIndexOf("/") + 1);
            return jsFileDirectory;
        }
    });

    /**
     * altEditor version
     *
     * @static
     * @type      String
     */
    altEditor.version = "1.0";

    /**
     * altEditor defaults
     *
     * @namespace
     */
    altEditor.defaults = {
        /** @type {Boolean} Ask user what they want to do, even for a single option */
        alwaysAsk: false,

        /** @type {string|null} What will trigger a focus */
        focus: null, // focus, click, hover

        /** @type {column-selector} Columns to provide auto fill for */
        columns: "", // all

        /** @type {boolean|null} Update the cells after a drag */
        update: null, // false is editor given, true otherwise

        /** @type {DataTable.Editor} Editor instance for automatic submission */
        editor: null
    };

    /**
     * Classes used by altEditor that are configurable
     *
     * @namespace
     */
    altEditor.classes = {
        /** @type {String} Class used by the selection button */
        btn: "btn"
    };

    // Attach a listener to the document which listens for DataTables initialisation
    // events so we can automatically initialise
    $(document).on("preInit.dt.altEditor", function (e, settings, json) {
        if (e.namespace !== "dt") {
            return;
        }
        // console.log(`settings =`, settings);
        var init = settings.oInit.altEditor;
        var defaults = DataTable.defaults.altEditor;

        if (init || defaults) {
            var opts = $.extend({}, init, defaults);

            if (init !== false) {
                altEditorObj = new altEditor(settings, opts);
                // console.log(`altEditorObj =`, altEditorObj);
            }
        }
    });

    // Alias for access
    DataTable.altEditor = altEditor;
    return altEditor;
}));

function getAltEditorObj() {
    return altEditorObj;
}

// kwpark ---> for invisible item
/* var buttonEvents = {};

function setButtonEvent(title, events) {
    console.log(`IN> setButtonEvent(), ${title}, events = `, events);
    buttonEvents[title] = events;

    console.log(`buttonEvents = `, buttonEvents);
} */

function checkRealItemIdx(dt, idx) {
    let aoColumn = dt.context[0].aoColumns[idx];
    if (aoColumn && aoColumn.hasOwnProperty("hide") && aoColumn.hide) {
        idx++;
        return checkRealItemIdx(dt, idx);
    }
    return idx;
}

function showPassword() {
    var x = document.getElementById("user_password");
    if (x.type === "password") {
        x.type = "text";
    } else {
        x.type = "password";
    }
}

// checks whether the password was changed or not.
function checkChangePassword(dt) {
    let orgPw = dt.row({
        selected: true
    }).data().user_password;
    let chgPw = document.getElementById("user_password").value;

    console.log(`orgPw(${orgPw}) vs. chgPw(${chgPw})`);
    return (orgPw === chgPw);
}

// show the result message of the request on the modal window
// processing message
function reqProcessMsgOnModal(alertMsg = "This record will be updated soon.") {
    console.log(`IN> reqProcessMsgOnModal(), alertMsg = `, alertMsg);

    $("#altEditor-modal .modal-body .alert").remove();
    var alertDiv = `<div class="alert alert-info" role="alert">
        <strong>${i18n("Processing...")}</strong> ${i18n(alertMsg)}
    </div>`;
    $("#altEditor-modal .modal-body").append(alertDiv);
}
// success message
function reqSuccessMsgOnModal(alertMsg = "This record has been updated.") {
    console.log(`IN> reqSuccessMsgOnModal(), alertMsg = `, alertMsg);

    $("#altEditor-modal .modal-body .alert").remove();
    var alertDiv = `<div class="alert alert-success" role="alert">
        <strong>${i18n("Success...")}</strong> ${i18n(alertMsg)}
    </div>`;
    $("#altEditor-modal .modal-body").append(alertDiv);
}
// failure message
function reqFailureMsgOnModal(alertMsg = "This record has been occurred an error.") {
    console.log(`IN> reqFailureMsgOnModal(), alertMsg = `, alertMsg);

    $("#altEditor-modal .modal-body .alert").remove();
    let alertDiv = `<div class="alert alert-danger" role="alert">
        <strong>${i18n("Failure...")}</strong> ${i18n(alertMsg)}
    </div>`;
    $("#altEditor-modal .modal-body").append(alertDiv);
}
// invalid input value message
function reqInvalidMsgOnModal(alertMsg = "Please re-check input values.") {
    console.log(`IN> reqInvalidMsgOnModal(), alertMsg = `, alertMsg);

    $("#altEditor-modal .modal-body .alert").remove();
    let alertDiv = `<div class="alert alert-warning" role="alert">
        <strong>${i18n("Invalid...")}</strong> ${i18n(alertMsg)}
    </div>`;
    $("#altEditor-modal .modal-body").append(alertDiv);
}

function loadCssNJsIfNotAlreadyLoadedForSomeReason(name) {
    var ss = document.styleSheets;
    for (var i = 0, max = ss.length; i < max; i++) {
        if (ss[i].href == `${name}.css`)
            return;
    }
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${name}.css`;

    var script = document.createElement("script");
    script.type = "text/javascript";
    script.src = `${name}.js`;

    document.getElementsByTagName("head")[0].appendChild(link);
    document.getElementsByTagName('head')[0].appendChild(script);
}

// <--- kwpark

//Input validation for text-fields
var initValidation = function (tableObj) {
    var dt = tableObj.s.dt;
    var isValid = false;
    var errorcount = 0;
    var matchcount = 0;

    var matchIdx = -1; // kwpark

    //Looping through all inputs
    $('form[name="altEditor-form"] *').filter(":input").each(function (i) {

        // kwpark ---> for invisible item
        if (i <= matchIdx) {
            matchIdx++;
            matchIdx = checkRealItemIdx(dt, matchIdx);
        } else {
            matchIdx = checkRealItemIdx(dt, i);
        }
        // console.log(`i = ${i}, matchIdx = `, matchIdx);
        // <--- kwpark

        //We only want the check text inputs.
        // if ($(this).attr("type") === "text" || $(this).attr("type") === "password") {
        if ($(this).attr("type") === "text" || $(this).attr("type") === "password" || $(this).attr("type") === "eu-pld") {
            var errorLabel = "#" + $(this).attr("id") + "label";
            // var unique = $(this).attr("data-unique");

            $(errorLabel).css("color", "red"); // kwpark, changed color to red

            //Inputvalidation for port range
            if ($(this).attr("data-special") === "portRange") {
                var ports;
                if ($(this).val().includes(":")) {
                    ports = $(this).val().split(":");

                    //If port numbers aren't integers, then the "<" doesnt work properly
                    var num1 = parseInt(ports[0]);
                    var num2 = parseInt(ports[1]);

                    if (num1 < num2) {
                        if (ports[0].match($(this).attr("pattern")) && ports[1].match($(this).attr("pattern"))) {
                            $(errorLabel).hide();
                            $(errorLabel).empty();
                        } else {
                            $(errorLabel).html($(this).attr("data-errorMsg"));
                            $(errorLabel).show();
                            errorcount++;
                        }
                    } else {
                        $(errorLabel).html($(this).attr("data-errorMsg"));
                        $(errorLabel).show();
                        errorcount++;
                    }
                } else if (!$(this).val().match($(this).attr("pattern"))) {
                    //If the port isnt a range
                    $(errorLabel).html($(this).attr("data-errorMsg"));
                    $(errorLabel).show();
                    errorcount++;
                } else {
                    $(errorLabel).hide();
                    $(errorLabel).empty();
                }
            }

            if ($(this).attr("data-special") === "password") {
                /** Validate password with regular expression
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
                /* const regex = /^.*(?=.{8,10})(?=.*[a-zA-Z])(?=.*?[A-Z])(?=.*\d)(?=.+?[\W|_])[a-zA-Z0-9!@#$%^&*()-_+={}\|\\\/]+$/g;
                console.log(`type =`, typeof regex); */
                const regex = new RegExp($(this).attr("pattern"), "g");
                console.log(`type =`, typeof regex);
                const str = $(this).val();
                if (str && !regex.test(str)) {
                    $(errorLabel).html($(this).attr("data-errorMsg"));
                    $(errorLabel).show();
                    errorcount++;
                } else if ($(this).is("[data-alert]") && $(this).attr("data-alert") != "") { // checks the empty password when the account is added.
                    $(errorLabel).html($(this).attr("data-alert"));
                    $(errorLabel).show();
                    errorcount++;
                }
                /* if ($(this).val() && !$(this).val().match($(this).attr("pattern"))) {
                    //If the port isnt a range
                    $(errorLabel).html($(this).attr("data-errorMsg"));
                    $(errorLabel).show();
                    errorcount++;
                } else if ($(this).is("[data-alert]") && $(this).attr("data-alert") != "") { // checks the empty password when the account is added.
                    $(errorLabel).html($(this).attr("data-alert"));
                    $(errorLabel).show();
                    errorcount++;
                } */
            } else {
                let aoColumn = dt.context[0].aoColumns[matchIdx];
                let isMandatory = (aoColumn && aoColumn.hasOwnProperty("mandatory")) ? aoColumn.mandatory : false;

                if ($(this).attr("type") === "eu-pld") {
                    let rowData = dt.row({
                        selected: true
                    }).data();

                    let start = 0,
                        end = 0,
                        str = $(this).val(),
                        type, val;

                    if (rowData) { // Default and Specific page
                        start = rowData.value_range_start;
                        end = rowData.value_range_end;
                        type = rowData.parameter_type;
                    } else { // Result page
                        let rangeVal = $("#Range").val();
                        let temp = rangeVal.split("~");
                        start = temp[0];
                        end = temp[1];
                        type = $("#Type").val();
                    }

                    if (type === "string") {
                        val = str.length;
                    } else if (type === "int" || type === "unsignedInt") {
                        val = +str;
                    } else {
                        val = str;
                    }

                    if (start == 0 && end == 0) {
                        $(errorLabel).css("color", "gray"); // changed color to gray
                        $(errorLabel).html(`${i18n("Passing validation check. reason is Wrong Range")}, (${start}<= ${val} <=${end})`);
                        $(errorLabel).show();
                    } else {
                        if (val < start || end < val) {
                            if (isMandatory) {
                                errorcount++;
                            } else {
                                $(errorLabel).css("color", "gray"); // changed color to gray
                            }

                            $(errorLabel).html(`${i18n("Out of range")}, (${start}<= ${val} <=${end})`);
                            $(errorLabel).show();
                        } else {
                            $(errorLabel).hide();
                            $(errorLabel).empty();
                        }
                    }
                } else {
                    //All other text-inputs
                    // console.log(`$(this).context.pattern =`, $(this).context.pattern);
                    // if ($(this).val() == "" || !$(this).context.checkValidity()) {
                    const regex = new RegExp($(this).attr("pattern"), "g"); // 패턴 체크 함수를 checkValidity() -> test() 로 변경
                    let str = $(this).val();
                    if (str && !regex.test(str)) {
                        if (isMandatory) {
                            errorcount++;
                        } else {
                            $(errorLabel).css("color", "gray"); // changed color to gray
                        }

                        // fixed TTA #16
                        if ($(this).attr("data-errorMsg")) {
                            $(errorLabel).html($(this).attr("data-errorMsg") + ((isMandatory) ? "" : `(${i18n("Optional")})`));
                            $(errorLabel).show();
                        } else {
                            $(errorLabel).hide();
                            $(errorLabel).empty();
                        }
                    } else if ($(this).is("[data-alert]") && $(this).attr("data-alert") != "") { // manually check point using data-alert attribute
                        $(errorLabel).html($(this).attr("data-alert"));
                        $(errorLabel).show();
                        errorcount++;
                    } else {
                        $(errorLabel).hide();
                        $(errorLabel).empty();
                    }
                }
                /* //All other text-inputs
                // console.log(`$(this).context.pattern =`, $(this).context.pattern);
                // if ($(this).val() == "" || !$(this).context.checkValidity()) {
                const regex = new RegExp($(this).attr("pattern"), "g"); // 패턴 체크 함수를 checkValidity() -> test() 로 변경
                const str = $(this).val();
                if (str && !regex.test(str)) {
                    if (isMandatory) {
                        errorcount++;
                    } else {
                        $(errorLabel).css("color", "gray"); // changed color to gray
                    }

                    // fixed TTA #16
                    if ($(this).attr("data-errorMsg")) {
                        $(errorLabel).html($(this).attr("data-errorMsg") + ((isMandatory) ? "" : `(${i18n("Optional")})`));
                        $(errorLabel).show();
                    } else {
                        $(errorLabel).hide();
                        $(errorLabel).empty();
                    }
                } else if ($(this).is("[data-alert]") && $(this).attr("data-alert") != "") { // manually check point using data-alert attribute
                    $(errorLabel).html($(this).attr("data-alert"));
                    $(errorLabel).show();
                    errorcount++;
                } else {
                    $(errorLabel).hide();
                    $(errorLabel).empty();
                } */

                //Checking for dublicate data in columns with unique attribute
                if ($(this).attr("data-unique") === "true") {
                    var input = $(this).val();
                    //Looping through an array with all data from the column
                    //   $.each(dt.column(i+1).data(), function(index, value) {
                    $.each(dt.column(i).data(), function (index, value) { // kwpark
                        value = value + ""; // convert to string if the value is integer.
                        //Skipping data from the selected row
                        if (index != dt.cell(".selected", 0).data()) {
                            //If value is not empty and found in column
                            if (input != "" && input.toLowerCase() === value.toLowerCase()) {
                                $(errorLabel).html(i18n("Error: Duplicate data is not allowed."));
                                $(errorLabel).show();
                                matchcount++;
                                // return false;
                            }
                        }
                    });
                }
            }
        }
    });

    //When no errors in input and no matches are found
    isValid = (errorcount == 0 && matchcount == 0) ? true : false;

    return isValid;
};

/** Validate password with regular expression
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

/* let testStr = "testk11";
let patternStr = "^(?=.*[0-9a-zA-Z]).{6,}$"; //"^(?=.*[\da-zA-Z]).{6,}$";
let pattern = new RegExp(patternStr); // ^(?=.*[0-9a-zA-Z]).{6,}$
// let pattern = new RegExp(/^(?=.*[a-zA-Z])((?=.*\d)|(?=.*\W)).{6,20}$/); // ^(?=.*[0-9a-zA-Z]).{6,}$
// let pattern = /^(?=.*[a-zA-Z])((?=.*\d)|(?=.*\W)).{6,8}$/;
console.log(`patternStr =`, patternStr);
console.log(`pattern =`, pattern);
console.log(`test =`, pattern.test(testStr));
console.log(`match =`, testStr.match(pattern));
console.log(`match =`, testStr.match(patternStr)); */


/*var undoChanges = function(tableObj) {
    var dt = tableObj.s.dt;

    //Modal creation
    $('#altEditor-modal').on('show.bs.modal', function() {
        $('#altEditor-modal').find('.modal-title').html('Cancel changes');
        $('#altEditor-modal').find('.modal-body').html('Are you sure you want to undo unsaved changes?');
        $('#altEditor-modal').find('.modal-footer').html("<button type='button' class='btn btn-danger' data-dismiss='modal'>No</button>\
     <button class='btn btn-success' data-dismiss='modal' id='cancelConfirm'>Yes</button>");
    });
    $('#altEditor-modal').bsModal('show');

    //Reload table from AJAX URL on cancel
    $(document).on('click', '#cancelConfirm', function(e) {
        dt.ajax.reload();
        $('#cancelButton').attr('disabled', 'disabled');
    });
};

var sendJsonData = function(tableObj) {
    var dt = tableObj.s.dt;

    //Building JSON template
    var jsonDataArray = {};
    var comepleteJsonData = {};
    comepleteJsonData.aaData = [];

    //Container for response from server
    var response = document.getElementById('messages');

    //Adding data from each row to JSON array
    for (var i = 0; i < dt.context[0].aoData.length; i++) {
        jsonDataArray[i] = dt.row(i).data();
    }
    //Adding the JSON array to the comlete JSON template
    comepleteJsonData.aaData.push(jsonDataArray);

    //AJAX call to server
    var jqxhr = $.ajax({
        url: 'php/' + dt.context[0].sTableId + '.php',
        type: 'POST',
        cache: false,
        data: {
            raw: comepleteJsonData
        }
    })
    .done(function(data) {
        response.innerHTML = data;
        $('#cancelButton').prop('disabled', 'disabled');

    })
    .fail(function(error) {
        response.style.color = 'red';
        response.innerHTML = '*Errorcode from server: ' + error.status;

    });
};*/