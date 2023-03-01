'use strict';

const { exec } = require("child_process");
function runShell(query) {
    return new Promise((resolve, reject) => {
        // exec(`openssl aes-256-cbc -d -in "/home/kwpark/ems/config/encrypted.dat" -k "4C92C5BE"`, (error, stdout, stderr) => {
        exec(query, (error, stdout, stderr) => {
            if (error) {
                console.error(`${error.message}\n` + error.stack);
                reject(error.message);
            } else {
                // console.debug(`stdout: ${stdout}`);
                // console.debug(`stderr: ${stderr}`);
                resolve(stdout.replace(/(\r\n|\n|\r)/gm, ""));
            }
        });
    });
}
/* runShell(`openssl aes-256-cbc -d -in "/home/kwpark/ems/config/encrypted.dat" -k "4C92C5BE"`)
.then(output => console.log(`output`, output))
.catch(error => console.log(`output`, error)); */

module.exports = { runShell };