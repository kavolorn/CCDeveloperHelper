var React = require('react');
var Application = React.createClass({
    getInitialState: function () {
        return {
            chromeConnected: false
        };
    },
    render: function () {
        var chromeConnected = this.state.chromeConnected ? "YES" : "NO";
        return (
            <div class="container">
                <h3>CC Developer Helper</h3>

                <p>Chrome connected: {chromeConnected}.</p>
            </div>
        );
    }
});
var application = React.render(<Application/>, document.body);


var WebSocket = require('faye-websocket'),
    http = require('http'),
    sockets = [],
    csInterface = new CSInterface();

var server = http.createServer(function (request, response) {
    if (request.url.match(/\/debug\/.*/i)) {
        debugHandler(request, response);
    }
    else {
        response.writeHeader(404, {"Content-Type": "text/html"});
        response.end();
    }
});
server.on('upgrade', function (request, socket, body) {
    if (WebSocket.isWebSocket(request)) {
        var ws = new WebSocket(request, socket, body);
        ws.on('open', function (event) {
            sockets.push(ws);
            application.setState({
                chromeConnected: true
            });
            console.log((new Date()) + ' Socket is opened for Peer ' + sockets.indexOf(ws) + '.');
        });
        ws.on('message', function (event) {
            console.log((new Date()) + ' Message received from Peer ' + sockets.indexOf(ws) + '.');
            console.log(event.data);
        });
        ws.on('close', function (event) {
            console.log((new Date()) + ' Socket is closed for Peer ' + sockets.indexOf(ws) + '.');
            sockets.splice(sockets.indexOf(ws), 1);
            if (sockets.length == 0) {
                application.setState({
                    chromeConnected: false
                });
            }
            ws = null;
        });
    }
});
server.listen(8001);

var debugHandler = function (request, response) {

    response.end();
    
    // Processing if only chrome is connected
    if (!application.state.chromeConnected) {
        console.log("Chrome is not connected.");
        return;
    }

    // Parsing request
    console.log("Debug request received:", request.url);
    var params = request.url.split("/");
    var extensionId = params[2];
    var port = params[3];

    // Searching for extension
    var extensions = csInterface.getExtensions();
    for (var i = 0; i < extensions.length; i++) {
        if (extensions[i].id == extensionId) {
            break;
        }
        if (i == extensions.length - 1) {
            console.log("No extension found.");
            return;
        }
    }

    if (sockets.length == 0) {
        console.log("No active connections to chrome were found.");
        return;
    }

    console.log("Closing " + extensionId + " if opened.");
    var event = new CSEvent("close_" + extensionId, "APPLICATION");
    csInterface.dispatchEvent(event);

    var action = JSON.stringify({
        action: "closeDebugUrl",
        data: {
            port: port
        }
    });
    sockets[0].send(action);
    
    setTimeout(function () {
        console.log("Opening " + extensionId + ".");
        csInterface.requestOpenExtension(extensionId);
    }, 200);

    setTimeout(function () {
        console.log("Getting debugger info from http://localhost:" + port + "/json/list.");
        var req = http.request({
            host: "localhost",
            port: port,
            path: "/json/list"
        }, function (response) {
            var buffer = '';
            response.on('data', function (chunk) {
                buffer += chunk;
            });
            response.on('end', function () {
                var response = JSON.parse(buffer)[0];
                if (response.devtoolsFrontendUrl) {
                    var action = JSON.stringify({
                        action: "openDebugUrl",
                        data: {
                            url: "http://localhost:" + port + response.devtoolsFrontendUrl,
                            port: port
                        }
                    });
                    sockets[0].send(action);
                }
                else {
                    console.log("DevtoolsFrontendUrl is not received.");
                }
            });
        });
        req.on('error', function(e) {
            console.warn('Problem with request: ' + e.message);
        });
        req.end();
    }, 700)
};