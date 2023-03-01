/*! PLD Table Creator 0.1.0
 * ©2017-9999 EUCAST Ltd - eu-cast.com
 */

/**
 * @summary     PLD_TABLE_CREATOR
 * @description cteates data to present the TreePanel and ParameterPanel for the PLD menu
 * @version     0.1.0
 * @file        pld_create_tree.js
 * @author      kwpark
 * @contact     www.eu-cast.com
 * @copyright   Copyright 2017-9999 EUCAST Ltd.
 *
 * This source file is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY.
 *
 * @changed
 * 20200918     created the file.
 *              version up to 0.1.0
 */

/** Module */
const fs = require("fs");
const moment = require("moment");

const commUtil = require("./common_util");
// const csUtil = require("./common_server_util");
const commVar = require("./common_var");
const eudbEx = require("./eu_mysqlEx")();

/** Constant */
// create file
const PLD_CLIENT_FILE_NAME = "pld_data.js";
const PLD_CLIENT_FILE_PATH = commUtil.getPath(PLD_CLIENT_FILE_NAME).absoluteFile;
const PLD_SERVER_FILE_NAME = "pld_server_data.js";
const PLD_SERVER_FILE_PATH = commUtil.getPath(PLD_SERVER_FILE_NAME).absoluteFile;

// Exception case

/** Variable */

/** Class */

/** Prototype */

/** Inner Function */
function makePldDataFile() {
    console.log(`IN> makePldDataFile()`);
    let lines = [];

    let queryStr = `SELECT p.*, ve.enum_strings, ve.enum_values FROM HeMS_Parameter p
        LEFT JOIN v_enum_comma_strings ve ON p.parameter_id = ve.parameter_id
        WHERE object_id > 2;`;

    eudbEx.runQuery(queryStr,
        () => { // finally
            fs.writeFile(PLD_SERVER_FILE_PATH, lines.join("\n"), "utf8", function(error) { // create cli_server_data.js
                if (error) throw error;
                console.log("Completed creating PLD DATA!!");
            });

            fs.writeFile(PLD_CLIENT_FILE_PATH, lines.join("\n"), "utf8", function(error) { // create cli_data.js
                if (error) throw error;
                console.log("Completed creating PLD TREE!!");
            });
        },
        (rows) => { // success
            if (rows.length > 0) {
                // console.log(`>>[SQL RESULT] Querying was successful!`);

                lines.push("//");
                lines.push("// Tree Data");
                lines.push("var PLD_Tree = [");
                let temp = makePldTreeData(rows);
                lines = lines.concat(temp);

                lines.push("];");
            }
        },
        (err) => { // failure
            console.error(`${err.message}\n` + err.stack);
        }, false);
}

function makePldTreeData(rows) {
    console.log(`IN> makePldData()`);

    let datas = [];
    let pGroupIds = [];
    let now = moment().format("YYYY-MM-DD")
    let jsonObj = { id: "ROOT", parent: "#", text: `PLD LIST(${now})`, type: "folder", state: {disabled: true, opened: true} };
    datas.push(`${commUtil.indent(JSON.stringify(jsonObj), 1, 4)},`);
    jsonObj = { id: "InternetGatewayDevice", parent: "ROOT", text: "InternetGatewayDevice", type: "folder", state: {disabled: true, opened: true} };
    datas.push(`${commUtil.indent(JSON.stringify(jsonObj), 1, 4)},`);
    pGroupIds.push("InternetGatewayDevice");

    rows.forEach(row => {
        let paramName = row.parameter_name,
            groups = paramName.split("."),
            lastDepth = groups.length - 1,
            parents = [], pName, pId, pText;

        groups.forEach((g, d) => {
            parents.push(g);

            return result = ((group, depth) => {
                if (depth == lastDepth) { // last one
                    pId = paramName;
                    pName = parents.slice(0, parents.length-1).join(".")
                    pText = (+row.isPLD === 0) ? `${group} (N)` : `${group} (P)`;

                    if(+row.parameter_access === 1) {
                        jsonObj = { id: pId, parent: pName, text: pText, type: "readOnly", data: row }
                    } else {
                        jsonObj = { id: pId, parent: pName, text: pText, type: "default", data: row }
                    }
                    datas.push(`${commUtil.indent(JSON.stringify(jsonObj), depth + 1, 4)},`);
                } else {
                    pId = parents.join("."),
                    pText = group;
                    if (!pGroupIds.includes(pId)) {
                        pGroupIds.push(pId);
                        pName = parents.slice(0, parents.length-1).join(".");
                        jsonObj = { id: pId, parent: pName, text: pText, type: "folder", state: {disabled: true, opened: false}  }
                        datas.push(`${commUtil.indent(JSON.stringify(jsonObj), depth + 1, 4)},`);
                    }
                }
                return true;
            })(g, d);
        });
    });

    return datas;
}

/** External Function */
exports.createPldDataFile = function() {
    console.log(`IN> createPldDataFile(), create PLD data files(pld_data.js, pld_server_data.js)`);
    makePldDataFile();
};