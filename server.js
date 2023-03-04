const cluster = require('cluster');
const os = require('os');
const uuid = require('uuidjs');

// 접속 포트 지정
const port = process.argv[2] || 3000;

// 키 생성 - 서버 확인용
var instance_id = uuid.generate();

// 워커 생성
var cpuCount = os.cpus().length; // CPU 수
var workerCount = 6; // cpuCount / 2; // 2개의 컨테이너에 돌릴 예정 CPU수 / 2
var timer;

if (cluster.isMaster) { // 마스터일 경우
    console.log(`process.argv:`, process.argv);
    console.log(`port:`, port);
    console.log(`Server ID:`, instance_id);
    console.log(`Server CPU count:`, workerCount);
    console.log(`${workerCount} servers will be created.\n`);

    //워커 메시지 리스너
    var workerMsgListener = function (msg) {
        var worker_id = msg.worker_id;

        //마스터 아이디 요청
        if (msg.cmd === 'MASTER_ID') {
            cluster.workers[worker_id].send({
                cmd: 'MASTER_ID',
                master_id: instance_id
            });
        }
    }

    //CPU 수 만큼 워커 생성
    for (let i = 0; i < workerCount; i++) {
        console.log(`Worker created. [${i + 1}/${workerCount}]`);
        var worker = cluster.fork();

        //워커의 요청메시지 리스너
        worker.on('message', workerMsgListener);
    }

    //워커가 online상태가 되었을때
    cluster.on('online', function (worker) {
        console.log(`Worker online - wid: [${worker.process.pid}]`);
    });

    //워커가 죽었을 경우 다시 살림
    cluster.on('exit', function (worker) {
        console.log(`Worker destoryed - wid: [${worker.process.pid}]`);
        console.log('Other worker will be created.');

        var worker = cluster.fork();
        //워커의 요청메시지 리스너
        worker.on('message', workerMsgListener);
    });
} else if (cluster.isWorker) { //워커일 경우
    const path = require('path');
    const express = require('express');
    const app = express();
    const http = require('http').createServer(app);
    const io = require('socket.io')(http);
    // const config = require("./config/default.json").development;
    // const utils = require('./routes/common_utils');

    // var modbusConfig = Object.assign({}, config.modbus, {
    //     io: io
    // });

    var worker_id = cluster.worker.id;
    var master_id;

    // EJS setting
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'public/views'));
    console.log(`Completed setting of EJS!!!`);

    app.use(express.json({
        limit: "50mb"
    }));
    app.use(express.urlencoded({
        limit: "50mb",
        extended: true,
        parameterLimit: 1000000
    }));
    console.log(`Completed setting of bodyParser!!!`);

    console.log(`path =`, path.join(__dirname, 'public'));

    // Static path setting
    app.use(express.static(path.join(__dirname, '.')));
    app.use(express.static(path.join(__dirname, 'lib')));
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(express.static(path.join(__dirname, 'server')));
    app.use(express.static(path.join(__dirname, 'node_modules')));
    console.log(`Completed registering of the static path!!!`);

    //마스터에게 master_id 요청
    process.send({
        worker_id: worker_id,
        cmd: 'MASTER_ID'
    });

    process.on('message', function (msg) {
        if (msg.cmd === 'MASTER_ID') {
            master_id = msg.master_id;
        }
    });

    // CORS 설정, 클라이언트 접속시 에러 발생을 막기 위해
    app.all("/*", function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "X-Requested-With");
        next();
    });

    // Route 설정
    app.get('/', function (req, res) {
        console.log(`[ROUTER] Rendering main page, wid(${worker_id}/${workerCount})`);
        res.render('main4', {
            wid: worker_id
        });
        /* console.debug(`[ROUTER] Rendering main page, wid(${worker_id}/${workerCount}), ip =`, utils.getUserIP(req));
        res.render('main', {
            wid: worker_id,
            machineCnt: modbusConfig.machineCnt
        }); */
    });

    // MODBUS TCP 설정 및 실행
    // const modbus = require('./routes/modbus_bot').getInstance(modbusConfig);
    // modbus.start(); // start MODBUS TCP slave

    // Socket 설정
    app.io = io;

    io.on('connection', (socket) => {
        console.log('[SOCKET] A client connected, socket id =', socket.id);

        socket.on('join_room', (msg) => {
            console.log('[SOCKET] join_room, msg =', msg);

            /* modbusConfig.rooms.forEach(room => {
                socket.join(room._id);
                room.members.push(socket.id);
            });
            console.log(`[SOCKET] Join to rooms =`, modbusConfig.rooms);
            modbus.update();
            // modbus.update(modbusConfig.rooms);
            socket.emit('res_data', {
                msg: `${socket.id}, Welcome to join us!`,
                dset: modbus.getDset()
            });
            // socket.emit('res_data', `${socket.id}, Welcome to join us!`); */
        });

        socket.on('disconnect', () => {
            console.log('[SOCKET] Disconnected, socket id =', socket.id);

            /*  modbusConfig.rooms.forEach(room => {
                 socket.leave(room._id);
                 let idx = room.members.indexOf(socket.id);
                 if (idx > -1) room.members.splice(idx, 1);
             });
             console.log(`[SOCKET] Leave to rooms =`, modbusConfig.rooms);
             modbus.update();
             // modbus.update(modbusConfig.rooms);
             socket.emit('res_data', `${socket.id}, Goodbye!`); */
        });
    });

    let server = http.listen(port, function () {
        console.log(`Express HTTP server has started to the port ${server.address().port}, wid(${worker_id}/${workerCount})`);
    });


    // WebSocekt 서버(ws) 생성 및 구동
    // 1. ws 모듈 취득
    const wsModule = require('ws');

    // 2. WebSocket 서버 생성/구동
    const webSocketServer = new wsModule.Server({
        server: server, // WebSocket서버에 연결할 HTTP서버를 지정한다.
        // port: 30002 // WebSocket연결에 사용할 port를 지정한다(생략시, http서버와 동일한 port 공유 사용)
    });

    function getRandomInt(max) {
        return Math.floor(Math.random() * max);
    }

    // connection(클라이언트 연결) 이벤트 처리
    webSocketServer.on('connection', (ws, request) => {

        // 1) 연결 클라이언트 IP 취득
        const ip = request.headers['x-forwarded-for'] || request.connection.remoteAddress;

        console.log(`새로운 클라이언트[${ip}] 접속`);

        // 2) 클라이언트에게 메시지 전송
        if (ws.readyState === ws.OPEN) { // 연결 여부 체크
            // ws.send(`클라이언트[${ip}] 접속을 환영합니다 from 서버`); // 데이터 전송
            ws.send(`Client [${ip}] connected form Server`); // 데이터 전송
        }

        // 3) 클라이언트로부터 메시지 수신 이벤트 처리
        ws.on('message', (msg) => {
            console.log(`클라이언트[${ip}]에게 수신한 메시지 : ${msg}`);
            // ws.send('메시지 잘 받았습니다! from 서버')
            ws.send('Received the message from Server')


            if (msg == "start") {
                // start sending msg for test
                if (!timer) {
                    timer = setInterval(() => {
                        if (ws.readyState === ws.OPEN) { // 연결 여부 체크
                            let offset = getRandomInt(100);
                            let bleNo = getRandomInt(20);
                            ws.send(`{"data":[{"bleno":${bleNo},"dist":1,"default":-${offset},"kf_c":-${offset},"kf_java":-${offset},"index":"202302231${bleNo}${offset}","status":"0","date":"2023-02-23 11:36:27.686"}]}`);
                        } else {
                            if (timer) clearInterval(timer);
                        }
                    }, 500);
                }
            } else if (msg == "stop") {
                // stop sending msg for test
                if (timer) clearInterval(timer);
            } else if (msg === 'zingchart.startfeed') {
                // do nothing
            } else if (msg === 'zingchart.stopfeed') {
                // clear timeout
                clearInterval(socketTimeoutId);
            } else if (msg === 'zingchart.push') {
                // do nothing
            } else if (msg === 'zingchart.feed') {
                // start sending values to client
                socketTimeoutId = setInterval(() => {
                    // send a single object containing multiple properties
                    let tick = {};
                    // format the json to be
                    // {
                    //   plot0: 9
                    //   plot1: 10
                    // }
                    for (let i = 0; i < plots; i++) {
                        tick[`plot${i}`] = Math.random() * (max - min) + min
                    }
                    // add date to the json object
                    tick['scale-x'] = Date.now();
                    ws.send(JSON.stringify(tick));
                }, 200);
            }
        });

        // 4) 에러 처러
        ws.on('error', (error) => {
            console.log(`클라이언트[${ip}] 연결 에러발생 : ${error}`);
        });

        // 5) 연결 종료 이벤트 처리
        ws.on('close', () => {
            console.log(`클라이언트[${ip}] 웹소켓 연결 종료`);

            if (timer) clearInterval(timer);
        });
    });
}