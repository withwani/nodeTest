// document =======================================
// $(document).ready(function () {
//     console.log(`Main3.ejs ready`);
// });

// 1. 웹소켓 클라이언트 객체 생성
const webSocket = new WebSocket("ws://192.168.219.188:3000");
// const webSocket = new WebSocket("ws://127.0.0.1:3000");
// const webSocket = new WebSocket("ws://localhost:3000");


// 2. 웹소켓 이벤트 처리
// 2-1) 연결 이벤트 처리
webSocket.onopen = () => {
    console.log("웹소켓서버와 연결 성공");
};

// 2-2) 메세지 수신 이벤트 처리
webSocket.onmessage = function (event) {
    console.log(`서버 웹소켓에게 받은 데이터: ${event.data}`);
}

// 2-3) 연결 종료 이벤트 처리
webSocket.onclose = function () {
    console.log("서버 웹소켓 연결 종료");
}

// 2-4) 에러 발생 이벤트 처리
webSocket.onerror = function (event) {
    console.log(event)
}


// 3. 버튼 클릭 이벤트 처리
// 3-1) 웹소켓 서버에게 메세지 보내기
let count = 1; //, timer;
document.getElementById("btn_send").onclick = function () {

    if (webSocket.readyState === webSocket.OPEN) { // 연결 상태 확인
        webSocket.send(`start`); // 웹소켓 서버에게 메시지 전송
    } else {
        alert("연결된 웹소켓 서버가 없습니다.");
    }
}

document.getElementById("btn_stop").onclick = function () {

    if (webSocket.readyState === webSocket.OPEN) { // 연결 상태 확인
        // webSocket.send(`증가하는 숫자를 보냅니다 => ${count}`); // 웹소켓 서버에게 메시지 전송
        // count++; // 보낼때마다 숫자를 1씩 증가

        //if (timer) clearInterval(timer);
        webSocket.send(`stop`); // 웹소켓 서버에게 메시지 전송
    } else {
        alert("연결된 웹소켓 서버가 없습니다.");
    }
}

// 3-2) 웹소켓 서버와 연결 끊기
document.getElementById("btn_close").onclick = function () {

    if (webSocket.readyState === webSocket.OPEN) { // 연결 상태 확인
        webSocket.close(); // 연결 종료

    } else {
        alert("연결된 웹소켓 서버가 없습니다.");
    }
}

//real-time feed random math function
function realTimeFeed(callback) {
    var tick = {};
    tick.plot0 = parseInt(10 + 90 * Math.random(), 10);
    tick.plot1 = parseInt(10 + 90 * Math.random(), 10);
    callback(JSON.stringify(tick));
};

// define top level feed control functions
function clearGraph() {
    zingchart.exec('myChart', 'clearfeed')
}

function startGraph() {
    zingchart.exec('myChart', 'startfeed');
}

function stopGraph() {
    zingchart.exec('myChart', 'stopfeed');
}

function randomizeInterval() {
    let interval = Math.floor(Math.random() * (1000 - 50)) + 50;
    zingchart.exec('myChart', 'setinterval', {
        interval: interval,
        update: false
    });
    output.textContent = 'Interval set to: ' + interval;
}
// window:load event for Javascript to run after HTML
// because this Javascript is injected into the document head
window.addEventListener('load', () => {
    // Javascript code to execute after DOM content

    //clear start stop click events
    document.getElementById('clear').addEventListener('click', clearGraph);
    document.getElementById('start').addEventListener('click', startGraph);
    document.getElementById('stop').addEventListener('click', stopGraph);
    document.getElementById('random').addEventListener('click', randomizeInterval);

    // full ZingChart schema can be found here:
    // https://www.zingchart.com/docs/api/json-configuration/
    const myConfig = {
        //chart styling
        type: 'line',
        globals: {
            fontFamily: 'Roboto',
        },
        backgroundColor: '#fff',
        title: {
            backgroundColor: '#1565C0',
            text: 'Real-Time Line Chart',
            color: '#fff',
            height: '30x',
        },
        plotarea: {
            marginTop: '80px'
        },
        crosshairX: {
            lineWidth: 4,
            lineStyle: 'dashed',
            lineColor: '#424242',
            marker: {
                visible: true,
                size: 9
            },
            plotLabel: {
                backgroundColor: '#fff',
                borderColor: '#e3e3e3',
                borderRadius: 5,
                padding: 15,
                fontSize: 15,
                shadow: true,
                shadowAlpha: 0.2,
                shadowBlur: 5,
                shadowDistance: 4,
            },
            scaleLabel: {
                backgroundColor: '#424242',
                padding: 5
            }
        },
        scaleY: {
            guide: {
                visible: false
            },
        },
        tooltip: {
            visible: false
        },
        //real-time feed
        refresh: {
            type: 'feed',
            transport: 'websockets',
            // url: 'wss://zingchart-ws-demo.glitch.me',
            url: 'ws://192.168.219.188:3000',
            method: 'push'
            interval: 200,
            maxTicks: 10,
            adjustScale: true,
            resetTimeout: 10,
            stopTimeout: 30
        },
        plot: {
            shadow: 1,
            shadowColor: '#eee',
            shadowDistance: '10px',
            lineWidth: 5,
            hoverState: {
                visible: false
            },
            marker: {
                visible: false
            },
            aspect: 'spline'
        },
        series: [{
            values: [],
            lineColor: '#2196F3',
            text: 'Blue Line'
        }, {
            values: [],
            lineColor: '#ff9800',
            text: 'Orange Line'
        }]
    };

    // render chart with width and height to
    // fill the parent container CSS dimensions
    zingchart.render({
        id: 'myChart',
        data: myConfig,
        height: '100%',
        width: '100%',
    });
});
