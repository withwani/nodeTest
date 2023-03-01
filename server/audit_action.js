/* Below is General Definition ================================================================= */

const path = require("path");
// const parser = require("xml-js");
const fs = require("fs");
// const moment = require("moment");

// const commUtil = require("./common_util");
const commVar = require("./common_var");
// const eudbEx = require("./eu_mysqlEx")();

/* Below is Inner Function ================================================================= */
exports.getAuditData = function(req, res) {
    console.log(`IN> getAuditData()`);

    // let auditName = "audit.log";
    let auditName = req.body.filename;
    let auditPath = commVar.getInstance().get("auditPath");

    let retVal = {
        file: null,
        error: null
    }

    /* 디렉토리에서 파일리스트 읽어오기
    fs.readdir(auditPath, function(err, fileList) {
        if (err) {
            console.error(`${err.message}\n` + err.stack);
        }
        console.debug(`fileList =`, fileList);
    }); */

    // 동기 방식: 파일 크기가 크면 파일 읽기에 소모되는 시간만큼 멈춰있게 된다.
    /* try {
        retVal.file = fs.readFileSync(path.join(auditPath, auditName), "utf8");
        console.log(`file =`, retVal.file);
        res.json(retVal);
    } catch (err) {
        console.error(`${err.message}\n` + err.stack);
        retVal.error = `${err.message}\n` + err.stack;
        res.json(retVal);
    } */

    // 비동기 방식: 파일 읽기가 끝나면 콜백 호출로 처리한다.
    fs.readFile(path.join(auditPath, auditName), "utf8", function (err, data) {
        if (err) {
            console.error(`${err.message}\n` + err.stack);
            retVal.error = `${err.message}\n` + err.stack;
            // res.json(retVal);
            res.status(400).send(retVal.error);
        } else {
            // console.debug(`file =`, data);
            retVal.success = true;
            retVal.file = data;
            res.json(retVal);
        }
    });
};