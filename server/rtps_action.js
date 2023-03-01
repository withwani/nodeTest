$(document).ready(function () {
    console.log(`main DOM ready`);
    console.log(`init, GAP(${GOAL_POSE_GAP}), SPD(${ROBOT_SPEED}) `)
    // $('#page_two').hide();
});

/* $('#menu_robot1').on('click', function () {
    console.log("menu robot1");
    $('#page_one').show();
    $('#page_two').hide();
});
$('#submit_start').on('click', function () {
    console.log("submit start");
    $('#page_one').hide();
    $('#page_two').show();
    // startNode($('#typeEmailX').val());
}); */

$('#automove').change(function () {
    console.log($(this).prop('checked'));

    /* if ($(this).prop('checked')) {
        // getTurn = true;
        gearshift = 0;
    } else {
        // move(0, 0); // stop
        backHome = true;
        gearshift = 0;
    } */
});

const SERVER_IP = "http://192.168.32.32:8080";
const SERVER_PATH = "robot";
// const ROBOT_WS_IP = "ws://192.168.28.125:9090";
const ROBOT_WS_IP = "ws://192.168.31.196:9090";
const RB1_NAME = "turtle1";

const MSG_EXAMPLE_NAME = "/example/topic";
const MSG_LOG_NAME = "/rosout";
const MSG_TWIST_NAME = "cmd_vel";
const MSG_POSE_NAME = "pose";
const MSG_COLOR_NAME = "color_sensor";

const RB1_MSG_EXAMPLE_NAME = MSG_EXAMPLE_NAME;
const RB1_MSG_LOG_NAME = MSG_LOG_NAME;
// const RB1_MSG_TWIST_NAME = `/${RB1_NAME}/${MSG_TWIST_NAME}`;
const RB1_MSG_TWIST_NAME = `/${MSG_TWIST_NAME}`;
const RB1_MSG_POSE_NAME = `/${RB1_NAME}/${MSG_POSE_NAME}`;
const RB1_MSG_COLOR_NAME = `/${RB1_NAME}/${MSG_COLOR_NAME}`;

const MSG_LOG_TYPE = "rcl_interfaces/msg/Log";
const MSG_STRING_TYPE = "std_msgs/msg/String";
// const MSG_TWIST_TYPE = "geometry_msgs/msg/Twist";
const MSG_TWIST_TYPE = "geometry_msgs/Twist";
const MSG_POSE_TYPE = "turtlesim/msg/Pose";
const MSG_COLOR_TYPE = "turtlesim/msg/Color";
const GOAL_DISTANCE = 100;
const GOAL_POSE_GAP = 1;
const GOAL_EPSILON = 0.001; //0.0000000001;
const ROBOT_SPEED = 1;

let firstPose, startPose = {
    x: 0,
    y: 0,
    theta: 0,
    linear_velocity: 0,
    angular_velocity: 0
};
let gearshift = 0; // R: -1, N: 0, D: 1
let speed = 0, getTurn = true, goalPose = 0, backHome = false;
let cnt1 = 0, cnt2 = 0, cnt3 = 0, cnt4 = 0;

const url = `ws://192.168.28.113:9093/ws/robot`;
const wasSocket = new WebSocket(url);
console.log('try to ws, url =', url);

wasSocket.onopen = (event) => {
    console.log('WAS WebSocket opened, url =', url)
    wasSocket.send("WAS Hi!");
};

wasSocket.onmessage = (event) => {
    // console.log(event.data);
};

function isOpen(ws) {
    return ws.readyState === ws.OPEN
}

// Send text to all users through the server
function sendJSON(type, m) {

    console.log(`ws msg sent. type =`, type);
    return;

    // Send the msg object as a JSON-formatted string.
    let msg = getJsonObj(type, m);
    console.log(`ws msg =`, msg);
    // console.log(`ws msg sent. type =`, type);

    // return;

    if (isOpen(wasSocket)) {
        // console.log(`ws msg =`, msg);
        console.log(`was msg =`, type);
        wasSocket.send(msg);
    }
    // return;

    /* if (isOpen(jwSocket)) {
        // console.log(`ws msg =`, msg);
        console.log(`jw msg =`, type);
        jwSocket.send(msg);
    }

    if (isOpen(jySocket)) {
        // console.log(`ws msg =`, msg);
        console.log(`jy msg =`, type);
        jySocket.send(msg);
    } */
}

/* const url = '';
const protocols = '';
const jwSocket = new WebSocket("ws://192.168.32.32:8080/ws/robot");
const jySocket = new WebSocket("ws://192.168.32.129:8080/ws/robot");

jwSocket.onopen = (event) => {
    console.log('JW WebSocket opened')
    jwSocket.send("JW Hi!");
};

jwSocket.onmessage = (event) => {
    // console.log(event.data);
}

jySocket.onopen = (event) => {
    console.log('JY WebSocket opened')
    jySocket.send("JY Hi!");
};

jySocket.onmessage = (event) => {
    console.log(event.data);
}

function isOpen(ws) {
    return ws.readyState === ws.OPEN
}

// Send text to all users through the server
function sendJSON(type, m) {

    // return;


    // Send the msg object as a JSON-formatted string.
    let msg = getJsonObj(type, m);
    // console.log(`ws msg =`, msg);
    // console.log(`ws msg sent. type =`, type);
    // if (type == "log") console.log(`ws msg =`, msg);

    return;

    if (!isOpen(jwSocket)) return;
    jwSocket.send(msg);

    if (!isOpen(jySocket)) return;
    jySocket.send(msg);
}

function sendText() {
    // Construct a msg object containing the data the server needs to process the message from the chat client.
    const msg = {
        type: "message",
        text: document.getElementById("text").value,
        id: clientID,
        date: Date.now()
    };

    // Send the msg object as a JSON-formatted string.
    jwSocket.send(JSON.stringify(msg));
    jySocket.send(JSON.stringify(msg));

    // Blank the text input element, ready to receive the next line of text from the user.
    document.getElementById("text").value = "";
}

function startNode(ipAddr) {
    var node_launcher = new ROSLIB.Topic({
        ros: ros,
        name: MSG_EXAMPLE_NAME,
        messageType: MSG_STRING_TYPE
    });

    var msg = new ROSLIB.Message({
        data: ipAddr
    });

    node_launcher.publish(msg);
}

function requestPOST(type, m) {
    // console.log("requestPOST()", type);
    let url = `${SERVER_IP}/${SERVER_PATH}/${type}`;
    // console.log(url);

    fetch(url, {
        method: 'POST', // or 'PUT'
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
        },
        body: getJsonObj(type, m),
    })
        .then((res) => {
            console.log('Response:', res);
        })
        .then((data) => {
            console.log('Success:', data);
        })
        .catch((err) => {
            console.error('Error:', err);
        });

    // $.ajax({
    //     type: 'post',
    //     url: url,
    //     data: getJsonObj(type, m),
    //     beforeSend: function (xhr) {
    //         xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    //     },
    //     success: function (data) {   //파일 주고받기가 성공했을 경우
    //         console.log("success:", data);
    //     },
    //     error: function (request, status, error) {     // 실패 시
    //         console.log("code:" + request.status + "\n" + "message:" + request.responseText + "\n" + "error:" + error);
    //     }
    // });
}

function testPOST(type, m) {
    // console.log("requestPOST()", type);
    let url = `/mobile1`; // for test

    fetch(url, {
        method: 'POST', // or 'PUT'
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
        },
        body: getJsonObj(type, m),
    })
        .then((res) => {
            console.log('Response:', res);
        })
        .then((data) => {
            console.log('Success:', data);
        })
        .catch((err) => {
            console.error('Error:', err);
        });
} */

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //최댓값은 제외, 최솟값은 포함
}

let isTest = false, mlx; // for test
function getJsonObj(type, m) {
    // console.log("getJsonObj()", type);
    let txt, now = Date.now();
    switch (type) {
        case 'log':
            // console.log('log m');
            txt = `{
                    "type": "${type}",
                    "stamp": {
                        "sec": "${m.stamp.sec}",
                        "nanosec": "${m.stamp.nanosec}",
                        "level": "${m.stamp.level}",
                        "name": "${m.stamp.name}",
                        "msg": "${m.stamp.msg}",
                        "file": "${m.stamp.file}",
                        "function": "${m.stamp.function}",
                        "line": "${m.stamp.line}"
                    }
                }`;
            return JSON.stringify(JSON.parse(txt));

        case 'pose':
            // console.log('pose m');
            txt = `{
                "type": "${type}",
                "x": ${m.x},
                "y": ${m.y},
                "theta": ${m.theta},
                "linear_velocity": ${m.linear_velocity},
                "angular_velocity": ${m.angular_velocity},
                "sendDate": ${now}
            }`;
            return JSON.stringify(JSON.parse(txt));

        case 'twist':

            mlx = (isTest) ? getRandomInt(-100, 100) : m.linear.x;

            // console.log('twist m');
            txt = `{
                "type": "${type}",
                "linear": {
                    "x": ${mlx},
                    "y": 0,
                    "z": 0
                },
                "angular": {
                    "x": 0,
                    "y": 0,
                    "z": ${m.angular.z}
                },
                "sendDate": ${now}
            }`;
            return JSON.stringify(JSON.parse(txt));

        case 'color':
            // console.log('color m');
            txt = `{
                "type": "${type}",
                "r": ${m.r},
                "g": ${m.g},
                "b": ${m.b},
                "sendDate": ${now}
            }`;
            return JSON.stringify(JSON.parse(txt));

        default:
            console.log('Entered to default');
            return null;
    }
}

function isEmpty(param) {
    return Object.keys(param).length === 0;
}

/* function backToHome(m) {
    if (!getTurn) return goalPose;
    getTurn = false;

    console.log(`backToHome(), firstPose =`, firstPose);
    gearshift = (m.x > firstPose.x) ? -1 : 1;
    speed = Math.abs(ROBOT_SPEED) * gearshift;
    goalPose = firstPose.x;
    console.log(`goalPose(${goalPose}), gearshift(spd: ${speed}) =`, (gearshift > 0) ? "D" : "R");
    return goalPose;
}

function autoMoveInit(m) {
    // console.log(`autoMoveInit(), gearshift =`, gearshift);
    // console.log(`autoMoveInit(), getTurn =`, getTurn);

    if (!getTurn) return goalPose;
    getTurn = false;

    // console.log("autoMoveInit()", m);
    // startPose = {};
    startPose = Object.assign({}, m);
    console.log(`autoMoveInit(), startPose =`, startPose);

    if (!gearshift) {
        firstPose = Object.assign({}, startPose);
        console.log(`firstPose =`, firstPose);
        gearshift = 1;
    } else {
        // gearshift = gearshift * (-1);
    }

    speed = Math.abs(ROBOT_SPEED) * gearshift;
    goalPose = (gearshift > 0) ? firstPose.x + GOAL_POSE_GAP : firstPose.x;
    console.log(`goalPose(${goalPose}), gearshift(spd: ${speed}) =`, (gearshift > 0) ? "D" : "R");
    return goalPose;
}

function checkToGoal(cur, goal) {
    if (!goal || !cur) return 0;

    let x = cur.toFixed(GOAL_FIXED), gx = goal.toFixed(GOAL_FIXED);
    let epsilon = GOAL_EPSILON;
    // console.log(`POSE, cur:${x}, goal:${gx}`)
    // console.log(`POSE, gap:${Math.abs(gx - x)}, epsilon:${epsilon}, result: ${(Math.abs(gx - x) < epsilon)}`)

    // if ((Math.abs(gx - x) < epsilon) || (gearshift > 0 && x >= gx) || (gearshift < 0 && x <= gx) || !gearshift) {
    if ((Math.abs(gx - x) < epsilon) || (gearshift > 0 && x >= gx) || (gearshift < 0 && x <= gx)) {
        if (!backHome) gearshift = gearshift * (-1);
        return 0;
    } else {
        return Math.abs(ROBOT_SPEED) * (gearshift);
    }
}

function autoMove(s, d, f) {
    //
    let x, cd = 0;
    let spd = s, dist = d, t0 = 0, t1 = 0;
    let isChecked = $('#automove').is(':checked');

    if (t0 == 0) t0 = Date.now(); // init start time

    if (f > 0) {
        x = Math.abs(spd);
    } else {
        x = Math.abs(spd) * (-1);
    }

    // let cnt = 0;
    // console.log(`linear.x = ${x}, f = ${f}`);

    while (cd < dist) {
        move(x, 0);
        t1 = Date.now(); // get cur time
        cd = spd * (t1 - t0);

        // if (++cnt > 100000) break;
        if (cd >= dist) { // stop the robot
            console.log(`Goal dist(${dist}), cd(${cd})`);
            move(0, 0);
            gearshift *= (-1);
            break;
        }
    }
} */

var ros = new ROSLIB.Ros({
    url: ROBOT_WS_IP
});

ros.on('error', function (error) {
    console.log(`ROS(${ROBOT_WS_IP}) occurred an error.`)
    document.getElementById('status').innerHTML = 'Error';
});

ros.on('connection', function () {
    console.log(`ROS(${ROBOT_WS_IP}) is connected.`)
    document.getElementById('status').innerHTML = 'Connected';
});

ros.on('close', function () {
    console.log(`ROS(${ROBOT_WS_IP}) is closed.`)
    document.getElementById('status').innerHTML = 'Closed';
});

var cmd_vel_listener = new ROSLIB.Topic({
    ros: ros,
    name: RB1_MSG_TWIST_NAME,
    messageType: MSG_TWIST_TYPE
});

var txt_listner = new ROSLIB.Topic({
    ros: ros,
    name: RB1_MSG_POSE_NAME,
    messageType: MSG_POSE_TYPE
});

var color_listner = new ROSLIB.Topic({
    ros: ros,
    name: RB1_MSG_COLOR_NAME,
    messageType: MSG_COLOR_TYPE
});

var log_listner = new ROSLIB.Topic({
    ros: ros,
    name: RB1_MSG_LOG_NAME,
    messageType: MSG_LOG_TYPE
});

txt_listner.subscribe(function (m) {
    document.getElementById("pose_x").innerHTML = m.x;
    document.getElementById("pose_y").innerHTML = m.y;
    document.getElementById("pose_theta").innerHTML = m.theta;
    document.getElementById("pose_linear_velocity").innerHTML = m.linear_velocity;
    document.getElementById("pose_angular_velocity").innerHTML = m.angular_velocity;

    /* if ($('#automove').is(':checked')) {
        move(checkToGoal(m.x, autoMoveInit(m)), 0);
    } else {
        move(checkToGoal(m.x, backToHome(m)), 0);
        backHome = true;
    } */

    /* if ($('#automove').is(':checked')) {
        autoMoveInit(m);
    } else {
        backToHome(m);
    }
    move(checkToGoal(m.x, goalPose), 0); */

    // sendJSON("pose", m);
    /* if (++cnt1 > 100) {
        // requestPOST("pose", m);
        // testPOST("pose", m);
        cnt1 = 0;
    } */
});

cmd_vel_listener.subscribe(function (m) {
    document.getElementById("cv_lin_x").innerHTML = m.linear.x;
    document.getElementById("cv_lin_y").innerHTML = m.linear.y;
    document.getElementById("cv_lin_z").innerHTML = m.linear.z;
    document.getElementById("cv_ang_x").innerHTML = m.angular.x;
    document.getElementById("cv_ang_y").innerHTML = m.angular.y;
    document.getElementById("cv_ang_z").innerHTML = m.angular.z;

    if ($('#automove').is(':checked')) {
        // move(10, 10); // auto-moving(forward, right)
        // console.log("[twist] checked, x =", parseInt(m.linear.x));
        // if (!parseInt(m.linear.x) && !gearshift) {
        if (!parseInt(m.linear.x)) {
            console.log("[twist] moving stoped, get turn, x =", m.linear.x);
            // getTurn = true;

            // autoMove(ROBOT_SPEED, GOAL_DISTANCE, gearshift);
        }
    }

    // sendJSON("twist", m);
    /* if (++cnt2 > 100) {
        // requestPOST("twist", m);
        // testPOST("twist", m);
        cnt2 = 0;
    } */
});

color_listner.subscribe(function (m) {
    document.getElementById("color_r").innerHTML = m.r;
    document.getElementById("color_g").innerHTML = m.g;
    document.getElementById("color_b").innerHTML = m.b;

    /* if ($('#automove').is(':checked')) {
        move(10, 10); // auto-moving(forward, right)
        console.log("[color] checked, r =", m.r);
    } */

    // sendJSON("color", m);
    /* if (++cnt3 > 100) {
        // requestPOST("color", m);
        // testPOST("color", m);
        cnt3 = 0;
    } */
});

// let output;
log_listner.subscribe(function (m) {


    // output = Object.assign({}, m);

    // sendJSON("log", m);
    /* if (++cnt4 > 100) {
        // requestPOST("color", m);
        // testPOST("color", m);
        cnt4 = 0;
    } */
});

var move = function (linear, angular) {
    var twist = new ROSLIB.Message({
        linear: {
            x: linear,
            y: 0.0,
            z: 0.0
        },
        angular: {
            x: 0.0,
            y: 0.0,
            z: angular
        }
    });
    cmd_vel_listener.publish(twist);
}

var createJoystick = function () {
    var options = {
        zone: document.getElementById('zone_joystick'),
        threshold: 0.1,
        position: { left: 50 + '%', top: 80 + '%' },
        mode: 'static',
        size: 150,
        color: '#000000',
    };
    manager = nipplejs.create(options);

    linear_speed = 0;
    angular_speed = 0;

    manager.on('start', function (event, data) {
        console.log("Movement start");
        timer = setInterval(function () {
            console.log(`lin x: ${linear_speed}, ang z: ${angular_speed}`);
            move(linear_speed, angular_speed);
        }, 25);
        debug(data);
    });

    manager.on('move', function (event, data) {
        console.log("Moving");
        max_linear = 1.0; // m/s
        max_angular = 1.0; // rad/s
        max_distance = 100.0; // pixels;
        linear_speed = Math.sin(data.angle.radian) * max_linear * data.distance / max_distance;
        angular_speed = -Math.cos(data.angle.radian) * max_angular * data.distance / max_distance;

        debug(data);
    });

    manager.on('pressure', function (event, data) {
        debug({ pressure: data });
    });

    manager.on('end', function () {
        console.log("Movement end");
        if (timer) {
            clearInterval(timer);
        }
        self.move(0, 0);
    });
}

var sId = function (sel) {
    return document.getElementById(sel);
};
var elDebug = sId('joystick_info');
var els = {
    position: {
        x: elDebug.querySelector('.position .x .data'),
        y: elDebug.querySelector('.position .y .data')
    },
    force: elDebug.querySelector('.force .data'),
    pressure: elDebug.querySelector('.pressure .data'),
    distance: elDebug.querySelector('.distance .data'),
    angle: {
        radian: elDebug.querySelector('.angle .radian .data'),
        degree: elDebug.querySelector('.angle .degree .data')
    },
    direction: {
        x: elDebug.querySelector('.direction .x .data'),
        y: elDebug.querySelector('.direction .y .data'),
        angle: elDebug.querySelector('.direction .angle .data')
    }
};


// Print data into elements
function debug(obj) {
    function parseObj(sub, el) {
        for (var i in sub) {
            if (typeof sub[i] === 'object' && el) {
                parseObj(sub[i], el[i]);
            } else if (el && el[i]) {
                el[i].innerHTML = sub[i];
            }
        }
    }
    setTimeout(function () {
        parseObj(obj, els);
    }, 0);
}

var nbEvents = 0;
window.onload = function () {
    createJoystick();
}