/* Below is General Definition ================================================================= */
// const commUtil = require("./common_util");

var realmsgOn = false;

/* Below is Export Function ================================================================= */
exports.setRealMsgOn = function setRealtimeMessageTurnOn(isOn) {
    // console.log(`IN> setRealMsgOn(${isOn})`);
    realmsgOn = isOn;

    return realmsgOn;
};

exports.getRealMsgOn = function getRealtimeMessageTurnOn() {
    // console.log(`IN> getRealMsgOn(${realmsgOn})`);

    return realmsgOn;
};

exports.handleRealMsgAct = function handleRealtimeMessageAction(req, res, pool) {
    console.log("IN> handleRealMsgAct()");

    let henb_id = req.body.realmsg_henb_id;

    console.log(`GUI ParamInfo: param.len:${req.param.length}, henb_id:${henb_id}`);

    res.realmsg_henb_id = henb_id;
    res.writeHead(200);
    res.end("Set to " + ((!henb_id || !(+henb_id)) ? "All" : henb_id));
    // return res;
};

exports.handleRealMsgRecvAct = function handleRealtimeMessageReceiveAction(req, res, cb) {
    // console.log("IN> handleRealMsgRecvAct()");
    let realtimeMsgBody = "",
        result = "",
        henbId = "",
        command = "",
        transactionId = "",
        messageType = "";

    req.on("data", function(chunk) {
        realtimeMsgBody += chunk;
    });

    req.on("end", function() {
        console.log("No more data in response.");
        console.log("EMS data: " + realtimeMsgBody.toString());
        // console.log("=====================================================================================");

        if (realtimeMsgBody != "Error") {
            let realtimeMsgJson = JSON.parse(realtimeMsgBody.escapeSpecialCharsForParse());
            messageType = realtimeMsgJson.messageType;
            command = realtimeMsgJson.command;
            transactionId = realtimeMsgJson.transaction_id;
            henbId = realtimeMsgJson.henb_id;
            result = realtimeMsgJson.result;

            // console.log(`[JSON] messageType: ${messageType}, command: ${command}, transactionId: ${transactionId}, henb_id: ${henbId}, result: ${result}`);

            if (result) {
                res.writeHead("200", {"Content-Type": "text/html; charset=utf8"});
            } else {
                res.writeHead("400", {"Content-Type": "text/html; charset=utf8"});
            }
        } else {
            res.writeHead("200", {"Content-Type": "text/html; charset=utf8"});
        }
        if (cb) cb;
        res.end();
        // console.log("<<<=====================================================================================");

        // msgObj.messageType = messageType;
        // msgObj.command = command;
        // msgObj.transactionId = transactionId;
        // msgObj.henbId = henbId;
        // msgObj.result = result;

        // {messageType: messageType, command: command, transactionId: transactionId, henbId: henbId, result: result};
        if (req.app.io) {
            req.app.io.sockets.emit("realtime-message-receive", {
                messageType: messageType,
                command: command,
                transactionId: transactionId,
                henbId: henbId,
                result: result
            });
        } else {
            console.warn("io undefined : realtime-message-receive do not send.");
        }
    });

    req.on("error", (err) => {
        console.error(`${err.message}\n` + err.stack);
        res.writeHead("400", {"Content-Type": "text/html;charset=utf8"});
        if (cb) cb;
        res.end();
        // console.log("=====================================================================================");
    });
};