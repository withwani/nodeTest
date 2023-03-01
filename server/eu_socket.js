// const commUtil = require("./common_util");
// const commVar = require("./common_var");

const serverAction = require("./server_action");
const sessionMon = require("./eu_session_mon").getInstance();

// const moment = require("moment");

module.exports = function(io, pool, sessionStore) {
    // This code is executed when the server and client sockets are connected.
    io.on("connection", function(socket) {

        let sess = socket.handshake.session,
            sId = socket.handshake.sessionID,
            sUser = socket.handshake.session.user,
            sMainScId = socket.handshake.session.mainSocketID,
            sHostIp = socket.handshake.headers.host,
            sClientIp = socket.handshake.session.clientIp;

        console.debug(`[SOCKET] ACCESSED: SID[${sUser}:${sId} > ${sMainScId}], SocID[${socket.id}], IP[${sClientIp}->${sHostIp}]`);
        if (!sUser || !sId) { // [Exception] have no session
            console.warn(`[Exception] Unknown User, Did not have a session!!!`);
            socket.disconnect();

            socket.disconnect("session-destory", sId);
            sessionStore.destroy(sId, function(err) {
                if (err) {
                    console.error(`${err.message}\n` + err.stack);
                    return;
                }
                console.warn(`[SOCKET] DESTROYED session: SID[${sUser}:${sId}], SocID[${socket.id}], IP[${sHostIp}->${sClientIp}], Unknown user's session was destroyed!`);
                socket.emit("socket-connection", {
                    op_flag: false,
                    sid: sId
                });

                sessionMon.sync("socket-disconnect -> session-destory");
            });
            return;
        } else {
            socket.emit("socket-connection", { // sends a msg to regist main socket id
                op_flag: true,
                sid: sId
            });
        }

        socket.on("main-socket-regist", function(data) {
            console.debug(`[SOCKET] RECEIVED from main-socket-regist, data =`, data);

            // save the assigned socket id of Main page on the session
            console.debug(`[SOCKET] REGISTERED mainSocketID: SID[${sUser}:${sId}], SocID[${socket.id}], IP[${sClientIp}->${sHostIp}]`);
            socket.handshake.session.mainSocketID = socket.id;
            socket.handshake.session.save((err) => {
                if (err) {
                    console.error(`${err.message}\n` + err.stack);
                    return;
                }

                let timer = sessionMon.getField(sId, "timer");
                if (timer) {
                    clearTimeout(timer);
                    sessionMon.delField(sId, "timer");
                }
                sessionMon.sync("socket-main-regist -> session.save");
            });
        });

        // disconnect 관련 이벤트
        // Tip) Main 페이지를 벗어나면 이 이벤트가 발생한다.
        socket.on("disconnect", function(reason) {
            console.debug(`[SOCKET] DISCONNECTED: SID[${sUser}:${sId} > ${socket.handshake.session.mainSocketID}], SocID[${socket.id}], IP[${sClientIp}->${sHostIp}], reason =`, reason);

            if (socket.handshake.session.mainSocketID && socket.id === socket.handshake.session.mainSocketID) { // compares whether the value is the main socket id of the current connected user.
                console.debug(`[SOCKET] CLOSED Main: SID[${sUser}:${sId}], SocID[${socket.id}], IP[${sClientIp}->${sHostIp}]`);

                delete socket.handshake.session.mainSocketID;
                socket.handshake.session.save((err) => {
                    if (err) {
                        console.error(`${err.message}\n` + err.stack);
                        return;
                    }

                    console.debug(`[SOCKET] DELETED mainSocketID: SID[${sUser}:${sId}], SocID[${socket.id}], IP[${sHostIp}], this session will be destroyed after 3sec.`);
                    let timer = setTimeout(function() {
                        socket.disconnect("session-destory", sId);
                        sessionStore.destroy(sId, function(err) {
                            if (err) {
                                console.error(`${err.message}\n` + err.stack);
                                return;
                            }
                            // Records to history
                            serverAction.set_login_history(pool, sess, "Closed");
                            console.warn(`[SOCKET] DESTROYED session: SID[${sUser}:${sId}], SocID[${socket.id}], IP[${sHostIp}->${sClientIp}], this session was destroyed! sending the broadcast message to other page.`);
                            socket.broadcast.emit("socket-connection", {
                                op_flag: false,
                                sid: sId
                            });

                            sessionMon.sync("socket-disconnect -> session-destory");
                        });
                        console.debug(`[SOCKET] sessionMon, sessions =`, sessionMon.view());
                    }, 3000);
                    sessionMon.setField(sId, "timer", timer);
                    // console.debug(`sessions =`, sessionMon.view());
                });
            }
        });

        // Below part can be handled the request received from client.
        // msg 관련 이벤트
        socket.on("msg", function(data) {
            // console.debug(`[SOCKET] Received DATA: User:ID[${socket.handshake.session.user}:${socket.id}], data =`, data);

            if (data.id === "main") {
                if (data.op === "all" || data.op === "alarm-board") {
                    serverAction.get_alarm_board(pool, io, data, socket);
                }
                if (data.op === "all" || data.op === "status-board") {
                    serverAction.get_status_board(pool, io, data, socket);
                }
                // if (data.op === "all" || data.op === "status-board" || data.op === "status-info") {
                if (data.op === "status-info") {
                    serverAction.get_status_info(pool, io, data, socket);
                }
                /* if (data.op === "henbid-status-board") {
                    serverAction.get_status_board(pool, io, data, socket);
                } */
                if (data.op === "set-alert-sound") {
                    serverAction.set_alert_sound(pool, io, data.value, socket);
                }
            }

            if (data.id === "cli") {
                if (data.op === "cli-param-enum-list") {
                    serverAction.get_cli_param_enum_list(data, socket);
                } else if (data.op === "cli-installed-pkg-version") {
                    serverAction.get_installed_pkg_version(pool, io, data, socket);
                }
            }

            if (data.id === "package") {
                if (data.op === "package-check-duplication") {
                    serverAction.check_package_duplication(pool, io, data, socket);
                }
            }

            if (data.id === "realmsg") {
                if (data.op === "realmsg-on" || data.op === "realmsg-off") {
                    serverAction.set_real_msg_on((data.op === "realmsg-on") ? true : false);
                }
            }

            if (data.id === "ems") {
                // Notice. ems-status-info-start is started by Router(post: /ems_status_noti)/
                if (data.op === "ems-status-info-bind") {
                    serverAction.ems_status_info_bind(socket, data.config);
                }
            }

            if (data.id === "user") {
                if (data.op === "user-set-language") {
                    serverAction.set_user_language(pool, data);
                }
            }

            if (data.id === "backup") {
                if (data.op === "backup-check-duplication") {
                    serverAction.check_backup_duplication(pool, io, data, socket);
                }
            }

            if (data.id === "restore") {
                if (data.op === "restore-check-duplication") {
                    serverAction.check_restore_duplication(pool, io, data, socket);
                }
            }

            if (data.id === "trace") {
                if (data.op === "get-trace-obj") {
                    serverAction.get_trace_file_obj(data, socket);
                }
            }
        });
    });
};