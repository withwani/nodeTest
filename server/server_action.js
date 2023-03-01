// const commUtil = require("./common_util");
const commVar = require("./common_var");

const loginAction = require("./login_action.js");
const cliAction = require("./cli_action.js");
const realMsgAction = require("./realtime_message_action.js");
const packageAction = require("./package_action");
const backupAction = require("./backup_action");
const restoreAction = require("./restore_action");
const neighborAction = require("./neighbor_action");
const emsAction = require("./ems_action");
const faultAction = require("./fault_action");
const historyAction = require("./history_action");
const batchAction = require("./batch_action");
const traceAction = require("./trace_action");
const accountAction = require("./account_action");
const mainAction = require("./main_action");
const enbAction = require("./enb_action");
const pldAction = require("./pld_action");
const statAction = require("./stat_action");
const ruleAction = require("./rule_action");
const auditAction = require("./audit_action");

/* Below is Inner Function ================================================================= */

/* Below is Export Function ================================================================= */

/**
 * Login Actions #############################################################################
 */
exports.login_action = function (req, res, pool) {
    console.log(`[SERVER ACTION] login_action()`);
    loginAction.authUserAccount(req, res, pool);
};

/**
 * Forgot PW Actions #############################################################################
 */
exports.forgot_pw_action = function (req, res) {
    console.log(`[SERVER ACTION] forgot_pw_action()`);
    loginAction.forgotPassword(req, res);
};

/**
 * Main Actions #############################################################################
 */
exports.keepalive_message = function (req, res, cb) {
    console.log("[SERVER ACTION] keepalive_message()");
    mainAction.handleKeepAliveMsgRecvAct(req, res, cb);
};

exports.get_alarm_board = function (pool, io, data, socket) {
    console.log(`[SERVER ACTION] get_alarm_board()`);
    mainAction.getAlarmBoard(pool, io, data, socket);
};

exports.get_status_board = function (pool, io, data, socket) {
    console.log(`[SERVER ACTION] get_status_board()`);
    mainAction.getStatusBoard(data, socket);
};

exports.get_status_info = function (pool, io, data, socket) {
    console.log(`[SERVER ACTION] get_status_info()`);
    mainAction.getStatusInfo(data, socket);
};

exports.set_alert_sound = function (pool, io, value, socket) {
    console.log(`[SERVER ACTION] set_alert_sound()`);
    mainAction.setAlertSound(pool, io, value, socket);
};

exports.get_status_list = function (req, res, pool) {
    console.log(`[SERVER ACTION] get_status_list()`);
    mainAction.getStatusWholeDataExceptCurrentAlarm(req, res);
};

exports.get_status_count = function (req, res, pool) {
    console.log(`[SERVER ACTION] get_status_count()`);
    mainAction.getAlarmBoardData(req, res);
};

exports.get_enb_info = function (req, res) {
    console.log(`[SERVER ACTION] get_enb_info()`);
    mainAction.getEnbInfoData(req, res);
};

exports.get_area_list = function (req, res, pool) { // not used
    console.log(`[SERVER ACTION] get_area_list()`);
    mainAction.getAreaList(req, res, pool);
};

/**
 * Configuration > eNB Actions #############################################################################
 */
exports.get_henb_info = function (req, res, pool, callback) {
    console.log(`[SERVER ACTION] get_henb_info()`);
    enbAction.getEnbInfo(req, res, pool, callback);
};

exports.get_check_param_duplicate = function (req, res, pool) {
    console.log(`[SERVER ACTION] get_check_param_duplicate()`);
    enbAction.getCheckParamDuplicate(req, res, pool);
};

exports.set_enb_add = function (req, res) {
    console.log(`[SERVER ACTION] set_enb_add()`);
    enbAction.setEnbAdd(req, res);
};

exports.check_enb_param = function (req, res) {
    console.log(`[SERVER ACTION] check_enb_param()`);
    enbAction.checkParamValidation(req, res);
};

exports.set_henb_delete = function (req, res) {
    console.log(`[SERVER ACTION] set_henb_delete()`);
    enbAction.setEnbDelete(req, res);
};

exports.set_henb_move = function (req, res) {
    console.log(`[SERVER ACTION] set_henb_move()`);
    enbAction.setEnbMove(req, res);
};

exports.set_henb_change = function (req, res, pool) {
    console.log(`[SERVER ACTION] set_henb_change()`);
    enbAction.setEnbChange(req, res, pool);
};

exports.handle_find_enb = function (req, res, pool) {
    console.log(`[SERVER ACTION] handle_find_enb()`);
    enbAction.handleFindEnb(req, res, pool);
};

/**
 * Configuration > PLD Actions #############################################################################
 */
exports.get_pld_list = function (req, res) {
    console.log(`[SERVER ACTION] get_pld_list()`);
    pldAction.getPldList(req, res);
};

/* exports.save_pld_list = function(req, res, pool) {
    console.log(`[SERVER ACTION] save_pld_list()`);
    pldAction.savePldList(req, res, pool);
};

exports.pld_value_change_action = function(req, res, pool) {
    console.log(`[SERVER ACTION] pld_value_change_action()`);
    pldAction.setPldValue(req, res, pool);
};

exports.get_pld_value_enum = function(req, res, pool) {
    console.log(`[SERVER ACTION] get_pld_value_enum()`);
    pldAction.getPldValueEnum(req, res, pool);
}; */

exports.get_registered_enb = function (req, res) {
    console.log(`[SERVER ACTION] get_registered_enb()`);
    pldAction.getRegisteredEnb(req, res);
};

exports.export_pld_download_whole = function (req, res) {
    console.log(`[SERVER ACTION] export_pld_download_whole()`);
    pldAction.getPLDWholeData(req, res);
};

exports.update_pld_value = function (req, res) {
    console.log(`[SERVER ACTION] update_pld_value()`);
    pldAction.handlePldValue(req, res);
};

exports.get_pld_template_list = function (req, res, pool) {
    console.log(`[SERVER ACTION] get_pld_template_list()`);
    pldAction.getPldTemplateList(req, res, pool);
};

/**
 * Configuration > NeighborList Actions #############################################################################
 */
exports.get_neighbor_list = function (req, res, pool) {
    console.log("[SERVER ACTION] get_neighbor_list()");
    neighborAction.getNeighborListAction(req, res, pool);
};

exports.handle_apply_changed_neighbor = function (req, res, pool) {
    console.log("[SERVER ACTION] handle_apply_changed_neighbor()");
    neighborAction.handleApplyChangedNeighborAction(req, res, pool);
};

exports.nei_change_action = function (req, res, pool) {
    console.log(`[SERVER ACTION] nei_change_action()`);
    neighborAction.setNeighborListAction(req, res, pool);
};

/**
 * Configuration > CLI Actions #############################################################################
 */
exports.cli_action = function (req, res, pool) {
    console.log("[SERVER ACTION] cli_action()");
    let cliRes = cliAction.handleCliAction(req, res, pool);
    if (cliRes) commVar.getInstance().set("cliRes", cliRes);
};

exports.cli_action_for_neighbor = function (req, res, pool) {
    console.log("[SERVER ACTION] cli_action_for_neighbor()");
    cliAction.handleCliActionForNeighbor(req, res, pool);
};

exports.cli_action_result = function (req, res, pool, io) {
    console.log("[SERVER ACTION] cli_action_result()");
    if (commVar.getInstance().get("cliRes")) {
        cliAction.handleCliResultAction(req, res, pool, io);
    }
};

// exports.get_cli_param_enum_list = function(pool, io, data, socket) {
exports.get_cli_param_enum_list = function (data, socket) {
    console.log("[SERVER ACTION] get_cli_param_enum_list()");
    cliAction.getCliParamEnumList(data, socket);
    // cliAction.getCliParamEnumList(pool, io, data, socket);
};

exports.get_installed_pkg_version = function (pool, io, data, socket) {
    console.log("[SERVER ACTION] get_installed_pkg_version()");
    cliAction.getInstalledPkgVersion(pool, io, data, socket);
};

exports.get_pkg_list_using_freq_band = function (req, res) {
    console.log("[SERVER ACTION] get_pkg_list_using_freq_band()");
    cliAction.getPkgListUsingFreqBand(req, res);
};

exports.get_pkg_list_using_model_name = function (req, res) {
    console.log("[SERVER ACTION] get_pkg_list_using_model_name()");
    cliAction.getPkgListUsingModelName(req, res);
};

/**
 * Configuration > Batch Actions #############################################################################
 */
exports.get_batch_command_list = function (req, res, pool) {
    console.log(`[SERVER ACTION] get_batch_command_list()`);
    batchAction.getBatchCommandList(req, res, pool);
};

exports.get_batch_job_list = function (req, res, pool) {
    console.log(`[SERVER ACTION] get_batch_job_list()`);
    batchAction.getBatchJobList(req, res, pool);
};

exports.get_batch_job_view = function (req, res, pool) {
    console.log(`[SERVER ACTION] get_batch_job_view()`);
    batchAction.getBatchJobView(req, res, pool);
};

exports.get_batch_result_view = function (req, res, pool) {
    console.log(`[SERVER ACTION] get_batch_result_view()`);
    batchAction.getBatchResultView(req, res, pool);
};

exports.batch_job_action = function (req, res, pool) {
    console.log("[SERVER ACTION] batch_job_action()");
    batchAction.handleBatchJobAction(req, res, pool);
};

exports.batch_command_action = function (req, res, pool) {
    console.log("[SERVER ACTION] batch_command_action()");
    batchAction.handleBatchCommandAction(req, res, pool);
};

/**
 * Configuration > Rule Actions #############################################################################
 */
exports.get_rule_list = function (req, res, pool) {
    console.log(`[SERVER ACTION] get_rule_list()`);

    ruleAction.getRuleList(req, res, pool);
};

exports.handle_rule_action = function (req, res, pool) {
    console.log(`[SERVER ACTION] handle_rule_action()`);
    ruleAction.handleRuleActionEvent(req, res, pool);
};

/**
 * Fault Actions #############################################################################
 */
exports.get_current_alarm_list = function (req, res, serverType) {
    console.log(`[SERVER ACTION] get_current_alarm_list()`);
    faultAction.getCurrentAlarmList(req, res, serverType);
};

exports.get_current_alarm_list_for_ems = function (req, res) {
    console.log(`[SERVER ACTION] get_current_alarm_list_for_ems()`);
    faultAction.getCurrentAlarmListForEMS(req, res);
};

exports.export_current_alarm_whole = function (req, res, pool) {
    console.log(`[SERVER ACTION] export_current_alarm_whole()`);
    faultAction.getCurrentAlarmWholeData(req, res, pool);
};

exports.export_current_alarm_list_with_area = function (req, res) {
    console.log(`[SERVER ACTION] export_current_alarm_list_with_area()`);
    faultAction.getCurrentAlarmWithArea(req, res);
};

exports.get_history_alarm_list = function (req, res, serverType) {
    console.log(`[SERVER ACTION] get_history_alarm_list()`);
    faultAction.getHistoryAlarmList(req, res, serverType);
};

exports.export_history_alarm_whole = function (req, res, pool) {
    console.log(`[SERVER ACTION] export_history_alarm_whole()`);
    faultAction.getHistoryAlarmWholeData(req, res, pool);
};

exports.get_alarm_list = function (req, res, pool) {
    console.log(`[SERVER ACTION] get_alarm_list()`);
    faultAction.getAlarmCodeList(req, res, pool);
};

exports.export_alarm_code_whole = function (req, res, pool) {
    console.log(`[SERVER ACTION] export_alarm_code_whole()`);
    faultAction.getAlarmCodeWholeData(req, res, pool);
};

exports.handle_alarm_list_action = function (req, res, pool) {
    console.log(`[SERVER ACTION] handle_alarm_list_action()`);
    faultAction.handleFaultAlarmListActionEvent(req, res, pool);
};

/**
 * Statistics Actions #############################################################################
 */
exports.get_stat_column = function (req, res, pool) {
    console.log(`[SERVER ACTION] get_stat_column()`);
    statAction.getStatColumn(req, res, pool);
};

exports.get_stat_data = function (req, res, pool) {
    console.log(`[SERVER ACTION] get_stat_data()`);
    statAction.getStatData(req, res, pool);
};

/**
 * History Actions #############################################################################
 */
exports.get_event_history = function (req, res, pool, serverType) {
    console.log(`[SERVER ACTION] get_event_history()`);
    historyAction.getEventHistoryList(req, res, pool, serverType);
};
exports.export_event_history_whole = function (req, res, pool) {
    console.log(`[SERVER ACTION] export_event_history_whole()`);
    historyAction.getEventHistoryWholeData(req, res, pool);
};

exports.get_cli_history = function (req, res, pool, serverType) {
    console.log(`[SERVER ACTION] get_cli_history()`);
    historyAction.getCliHistoryList(req, res, pool, serverType);
};

exports.export_cli_history_whole = function (req, res, pool) {
    console.log(`[SERVER ACTION] export_cli_history_whole()`);
    historyAction.getCliHistoryWholeData(req, res, pool);
};

exports.get_login_history = function (req, res, pool) {
    console.log(`[SERVER ACTION] get_login_history()`);
    historyAction.getLoginHistoryList(req, res, pool);
};

exports.export_login_history_whole = function (req, res, pool) {
    console.log(`[SERVER ACTION] export_login_history_whole()`);
    historyAction.getLoginHistoryWholeData(req, res, pool);
};

exports.get_enb_history = function (req, res, pool, serverType) {
    console.log(`[SERVER ACTION] get_enb_history()`);
    historyAction.getEnbHistoryList(req, res, pool, serverType);
};

exports.export_enb_history_whole = function (req, res, pool) {
    console.log(`[SERVER ACTION] export_enb_history_whole()`);
    historyAction.getEnbHistoryWholeData(req, res, pool);
};

exports.set_login_history = function (pool, sess, type) {
    console.log(`[SERVER ACTION] set_login_history()`);
    historyAction.setLoginHistory(sess, type);
};

/**
 * History > Trace Actions #############################################################################
 */
exports.get_trace_list = function (req, res, pool) {
    console.log(`[SERVER ACTION] get_trace_list()`);

    traceAction.getTraceList(req, res, pool);
};

exports.get_trace_file_obj = function (data, socket) {
    console.log(`[SERVER ACTION] get_trace_file_obj()`);

    traceAction.getTraceFileObj(data, socket);
};

/**
 * Package Actions #############################################################################
 */
exports.get_package_list = function (req, res, pool) {
    console.log("[SERVER ACTION] get_package_list()");
    packageAction.getPackageListItem(req, res, pool);
};

exports.handle_package_action = function (req, res, pool) {
    console.log("[SERVER ACTION] handle_package_action()");
    packageAction.handlePackageAction(req, res, pool);
};

exports.package_upload = function (req, res, pool) {
    console.log("[SERVER ACTION] package_upload()");
    packageAction.handlePkgUploadAct(req, res, pool);
};

exports.set_active_package_flag = function (req, res) {
    console.log("[SERVER ACTION] set_active_package_flag()");
    packageAction.handlePkgSetToActiveAct(req, res);
};

exports.check_package_duplication = function (pool, io, data, socket) {
    console.log("[SERVER ACTION] check_package_duplication()");
    packageAction.checkPackageDuplication(pool, io, data, socket);
};

/**
 * EMS > Account Actions #############################################################################
 */
exports.get_account_info = function (req, res, pool) {
    console.log(`[SERVER ACTION] get_account_info()`);
    accountAction.getUserAccountList(req, res, pool);
};

exports.handle_account_action = function (req, res, pool) {
    console.log(`[SERVER ACTION] handle_account_action()`);
    accountAction.handleUserAccoutActionEvent(req, res, pool);
};

exports.set_user_language = function (pool, data) {
    console.log(`[SERVER ACTION] set_user_language()`);
    accountAction.setUserLanguage(pool, data);
};

exports.get_permit_list = function (req, res) {
    console.log(`[SERVER ACTION] get_permit_list()`);
    accountAction.getPermitList(req, res);
};

exports.handle_permit_action = function (req, res) {
    console.log(`[SERVER ACTION] handle_permit_action()`);
    accountAction.handlePermitActionEvent(req, res);
};

exports.handle_account_timeout = function (req, res) {
    console.log(`[SERVER ACTION] handle_account_timeout()`);
    accountAction.handleUserAccoutTimeoutEvent(req, res);
};

/**
 * EMS > Status Actions #############################################################################
 */
exports.ems_status_info_bind = function (socket, data) {
    // console.log('[SERVER ACTION] ems_status_info_bind()');
    emsAction.bindEMSStatusClient(socket, data);
};

/**
 * EMS > Audit Actions #############################################################################
 */
exports.get_audit_data = function (req, res) {
    console.log("[SERVER ACTION] get_audit_data()");
    auditAction.getAuditData(req, res);
};

/**
 * Realtime Message Actions #############################################################################
 */
exports.handle_realtime_message = function (req, res, cb) {
    console.log("[SERVER ACTION] handle_realtime_message()");
    realMsgAction.handleRealMsgRecvAct(req, res, cb);
};

exports.set_real_msg_on = function (val) {
    console.log("[SERVER ACTION] set_real_msg_on()");
    realMsgAction.setRealMsgOn(val);
    // console.debug(`realmsg isOn = ${realMsgAction.getRealMsgOn()}`);
};

/**
 * Backup & Restore Actions #############################################################################
 */
exports.get_backup_list = function (req, res, pool) {
    console.log("[SERVER ACTION] get_backup_list()");
    backupAction.getBackupListAction(req, res, pool);
};

exports.handle_backup_upload = function (req, res, pool) {
    console.log("[SERVER ACTION] handle_backup_upload()");
    backupAction.handleBackupUploadAction(req, res, pool);
};

exports.handle_backup_action = function (req, res, pool) {
    console.log("[SERVER ACTION] handle_backup_action()");
    backupAction.handleBackupAction(req, res, pool);
};

exports.check_backup_duplication = function (pool, io, data, socket) {
    console.log("[SERVER ACTION] check_backup_duplication()");
    backupAction.checkBackupDuplication(pool, io, data, socket);
};

exports.get_restore_list = function (req, res, pool) {
    console.log("[SERVER ACTION] get_restore_list()");
    restoreAction.getRestoreListAction(req, res, pool);
};

exports.handle_restore_upload = function (req, res, pool) {
    console.log("[SERVER ACTION] handle_restore_upload()");
    restoreAction.handleImportUploadAction(req, res, pool);
};

exports.handle_restore_action = function (req, res, pool, importPath) {
    console.log("[SERVER ACTION] handle_restore_action()");
    restoreAction.handleRestoreAction(req, res, pool, importPath);
};

exports.check_restore_duplication = function (pool, io, data, socket) {
    console.log("[SERVER ACTION] check_restore_duplication()");
    restoreAction.checkRestoreDuplication(pool, io, data, socket);
};