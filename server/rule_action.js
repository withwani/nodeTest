/* Below is General Definition ================================================================= */
const { exec } = require("child_process");
const readline = require("readline");
const stream = require("stream");

const commVar = require("./common_var");

const _EMS_ACC_PW = commVar.getInstance().get("euConfig").webConfig.password || commVar.getInstance().get("euConfig").emsConfig.password || "hems123";
const _EMS_ACC_ID = commVar.getInstance().get("euConfig").webConfig.user || commVar.getInstance().get("euConfig").emsConfig.user || "hems";
/* const _EMS_ACC_PW = commVar.getInstance().get("euConfig").emsConfig.password || "hems123";
const _EMS_ACC_ID = commVar.getInstance().get("euConfig").emsConfig.user || "hems"; */

/* Below is Inner Function ================================================================= */
function cleanErrMsg(msg) {
    return msg.replace(`echo ${_EMS_ACC_PW} | sudo -kS `, "").replace(`[sudo] password for ${_EMS_ACC_ID}: `, "");
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/* Below is External Function ================================================================= */
exports.getRuleList = function(req, res, pool) {
    console.log(`IN> getRuleList()`);

    let retVal = {
        draw: 0,
        recordsTotal: 0,
        recordsFiltered: 0,
        data: []
    };

    // Get all rules
    exec(`echo ${_EMS_ACC_PW} | sudo -kS iptables -nL --line-numbers`, (error, stdout, stderr) => {
        if (error) {
            console.error(`${error.message}\n` + error.stack);
            retVal.message = cleanErrMsg(error.message);
            res.json(retVal);
            return;
        }
        // console.debug(`stdout: ${stdout}`);
        // console.debug(`stderr: ${stderr}`);

        if (stdout) {
            var Readable = stream.Readable;

            // readline에 사용할 input stream 만들기
            var inputStream = new Readable();
            inputStream.push(stdout);
            inputStream.push(null);

            const rl = readline.createInterface({
                input: inputStream,
                crlfDelay: Infinity
            });

            let tempStr, mChain, mPolicy, arColumn = [], arRule = [];
            rl.on("line", (line) => { // 한 행씩 읽어와서 처리
                if (!line) return;

                // console.debug(`Line from file: ${line}`);
                tempStr = line.split(" ");

                if (tempStr[0] == "Chain") { // 체인 정보 취득
                    // get Chain
                    mChain = tempStr[1];
                    mPolicy = tempStr[3].substring(0, tempStr[3].length - 1);
                    // console.debug(`mPolicy =`, mPolicy);
                } else if (tempStr[0] == "num") { // 컬럼 정보 취득
                    // get Column title
                    if (!arColumn.length) {
                        arColumn.push("chain");
                        tempStr.forEach(item => {
                            if (item) arColumn.push(item);
                        });
                        arColumn.push("description");
                    }
                } else { // 규칙 정보 취득
                    if (mChain == "INPUT" || mChain == "FORWARD" || mChain == "OUTPUT") {
                        temp = line.split("  ");
                        // get Rule
                        let rule = {}, idx = 1;
                        rule["chain"] = mChain;
                        temp.forEach(item => {
                            if (item) {
                                rule[arColumn[idx++]] = item;
                            }
                        });
                        arRule.push(rule);
                    }
                }
            });

            rl.on("close", () => { // 작업 종료 시 테이블 정보 회신
                if (arRule.length) {
                    retVal.draw = 1;
                    retVal.recordsTotal = arRule.length;
                    retVal.recordsFiltered = arRule.length;
                    retVal.data = arRule;
                }
                res.json(retVal);
            });
        }
    });
};

exports.handleRuleActionEvent = function(req, res, pool) {
    console.log(`IN> handleRuleActionEvent()`);

    let rowData = req.body.rowData;
    let type = req.body.type;
    console.log(`type(${type}), rowData = `, rowData);

    let ips = rowData.source.split(":"),
        sIp = ips[0],
        // sPort = (ips[1]) ? ips[1] : "80",
        dPort = commVar.getInstance().get("serverPort"),
        // dInfo = commVar.getInstance().get("serverIp").web,
        chain = rowData.chain || "INPUT",
        target = rowData.target || "ACCEPT";

    let cmd = ``;
    if (type == "ADD") { // handling Add action
        cmd = `iptables -A ${chain} -p tcp -s ${sIp} --dport ${dPort} -j ${target} -m comment --comment "${rowData.description}"`;
        // cmd = `iptables -A INPUT -p tcp -s ${sIp} --sport ${sPort} -d ${dInfo.host} --dport ${dInfo.port} -j ${target}`;
    } else { // handling Delete action
        cmd = `iptables -D ${chain} ${rowData.num}`;
    }
    console.debug(`iptables:`, cmd);
    // console.debug(`executed cmd: echo ${_EMS_ACC_PW} | sudo -kS ${cmd}`);

    var retVal = {
        type: type,
        draw: 0,
        message: ""
    };

    exec(`echo ${_EMS_ACC_PW} | sudo -kS ${cmd}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`${error.message}\n` + error.stack);
            retVal.message = cleanErrMsg(error.message);
            res.json(retVal);
            return;
        }
        console.debug(`stdout: ${stdout}`);
        console.debug(`stderr: ${stderr}`);

        // Check the OS version
        let prettyName;
        exec(`cat /etc/os-release`, (error, stdout, stderr) => { // CentOS7
            if (error) {
                console.error(`${error.message}\n` + error.stack);
            }
            console.debug(`stdout: ${stdout}`);
            console.debug(`stderr: ${stderr}`);

            if (stdout) {
                var Readable = stream.Readable;

                // readline에 사용할 input stream 만들기
                var inputStream = new Readable();
                inputStream.push(stdout);
                inputStream.push(null);

                const rl = readline.createInterface({
                    input: inputStream,
                    crlfDelay: Infinity
                });

                rl.on("line", (line) => { // 한 행씩 읽어와서 처리
                    if (!line) return;

                    let info = line.split("=");
                    if (info[0] == "PRETTY_NAME") {
                        prettyName = info[1].replace(/\"/gi, "");
                    }
                });

                rl.on("close", () => { // 작업 종료 시 테이블 정보 회신
                    let osInfo = prettyName.split(" ");
                    let osName = osInfo[0];
                    let osVer;

                    if (osName == "CentOS") {
                        osVer = osInfo[2];
                    } else if (osName == "Ubuntu") {
                        osVer = osInfo[1];
                    }

                    console.debug(`Current OS is ${osName} ${osVer}`);
                    if (osName == "CentOS" && osVer == "7") {
                        // Restart iptables service on CentOS7 system using systemctl command
                        exec(`echo ${_EMS_ACC_PW} | sudo -kS service iptables save`, (error, stdout, stderr) => { // CentOS7 System
                            if (error) {
                                console.error(`${error.message}\n` + error.stack);
                                retVal.message = cleanErrMsg(error.message);
                                res.json(retVal);
                                return;
                            }
                            console.debug(`[CentOS] stdout: ${stdout}`);
                            console.debug(`[CentOS] stderr: ${stderr}`);

                            exec(`echo ${_EMS_ACC_PW} | sudo -kS systemctl restart iptables`, (error, stdout, stderr) => { // CentOS7 System
                                if (error) {
                                    console.error(`${error.message}\n` + error.stack);
                                    retVal.message = cleanErrMsg(error.message);
                                    res.json(retVal);
                                    return;
                                }
                                console.debug(`[CentOS] stdout: ${stdout}`);
                                console.debug(`[CentOS] stderr: ${stderr}`);
    
                                retVal.draw = 1;
                                retVal.message = stdout || cleanErrMsg(stderr);
                                console.debug(`[CentOS] Return JSON = `, retVal);
                                res.json(retVal);
                            });
                        });
                    } else {
                        // Restart iptables service on Ubuntu Or CentOS6 system using service command
                        exec(`echo ${_EMS_ACC_PW} | sudo -kS service iptables save`, (error, stdout, stderr) => { // Other System
                            if (error) {
                                console.error(`${error.message}\n` + error.stack);
                                retVal.message = cleanErrMsg(error.message);
                                res.json(retVal);
                                return;
                            }
                            console.debug(`[Others] stdout: ${stdout}`);
                            console.debug(`[Others] stderr: ${stderr}`);

                            exec(`echo ${_EMS_ACC_PW} | sudo -kS service iptables restart`, (error, stdout, stderr) => {
                                if (error) {
                                    console.error(`${error.message}\n` + error.stack);
                                    retVal.message = cleanErrMsg(error.message);
                                    res.json(retVal);
                                    return;
                                }
                                console.debug(`[Others] stdout: ${stdout}`);
                                console.debug(`[Others] stderr: ${stderr}`);

                                retVal.draw = 1;
                                retVal.message = stdout || cleanErrMsg(stderr);
                                console.debug(`[Others] Return JSON = `, retVal);
                                res.json(retVal);
                            });
                        });
                    }
                });
            }
        });
    });
};