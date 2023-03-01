"use strict";

module.exports = (function() {
    // get modules
    const schedule = require("node-schedule");
    // let rule = "{'start': '2019-01-15 14:03:57', 'end': '2019-03-14 14:55:03', 'rule': '4 14 15 * *'}";
    // var j = schedule.scheduleJob(JSON.parse(rule), function() {
    //     console.log('Time for tea!');
    // });

    var instance;

    function initiate() {
        return {
            runJob: function(id, rule, tickCb, endCb) {
                // register a schedule
                let j = schedule.scheduleJob(id, rule, function() {
                    if (tickCb) tickCb();
                    if (endCb) {
                        if (!(schedule.scheduledJobs[id]).nextInvocation()) {
                            endCb();
                        }
                    }
                });
                // console.debug(`[SCHEDULER] Job ${id} =`, j);
            },
            stopJob: function(id, endCb) {
                // cancel the schedule
                let job = schedule.scheduledJobs[id];
                if (job) {
                    job.cancel(true);
                    if (endCb) endCb();
                    // let endJob = schedule.scheduledJobs[id + "end"];
                    // endJob.reschedule(new Date(Date.now() + 1000));
                }
            },
            getJobs: function() {
                return schedule.scheduledJobs;
            }
        };
    }

    return {
        getInstance: function(pool) {
            // get instance by singleton pattern
            if (!instance) {
                instance = initiate();
            }
            return instance;
        }
    };
})();