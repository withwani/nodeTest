/* Below is General Definition ================================================================= */
const moment = require("moment");

// const commUtil = require("./common_util");
const commVar = require("./common_var");
// const eudbEx = require("./eu_mysqlEx")();

/* Below is Inner Function ================================================================= */
exports.getTraceList = function (req, res, pool) {
    console.log(`IN> getTraceList()`);

    function parseTraceFilename(filename, number) {
        var _name = filename;

        return (function (name, no) {
            let temp = name.split("-");
            let datetime = moment(temp[0].substring(1, temp[0].length).replace(/\./, " ")).format("YYYY-MM-DD HH:mm:ss");
            let ids = temp[1].split(".");
            let cellId = parseInt(ids[1], 16); // parse hex to decimal
            let traceId = ids[2] + "." + ids[3];

            // console.debug(`datetime =`, datetime);
            // console.debug(`cellId =`, cellId);
            // console.debug(`traceId =`, traceId);

            return {
                trace_no: no,
                trace_file_name: name,
                cell_id: cellId,
                trace_id: traceId,
                trace_date: datetime
            }
        })(_name, number);
    }

    var retVal = {
        draw: 0,
        recordsTotal: 0,
        recordsFiltered: 0,
        data: []
    };

    let tracePath = commVar.getInstance().get("tracePath");
    const fs = require("fs");

    fs.readdir(tracePath, function (err, fileList) {
        if (err) {
            console.error(`${err.message}\n` + err.stack);
            res.json(retVal);
            return;
        }

        // console.debug(fileList);
        if (fileList) {
            retVal.success = true;
            retVal.draw = req.body.draw;
            retVal.recordsTotal = fileList.length;
            retVal.recordsFiltered = fileList.length;
            for (let i = 0; i < fileList.length; i++) {
                retVal.data.push(parseTraceFilename(fileList[i], i + 1));
            }
        }
        // console.debug(`retVal =`, retVal);
        res.json(retVal);
    });
};

exports.getTraceFileObj = function (data, socket) {
    console.log(`IN> getTraceFileObj(), data =`, data);

    const path = require("path");
    const parser = require("xml-js");
    const fs = require("fs");

    let xml = fs.readFileSync(path.join(commVar.getInstance().get("tracePath"), data.file), "utf8");
    let json = parser.xml2json(xml, {
        compact: true,
        spaces: 4
    });

    let retJson = {
        name: data.file,
        xml: xml,
        json: json
    }

    socket.emit("get-trace-obj", retJson);
}