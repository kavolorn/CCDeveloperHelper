var connectToCcDeveloperHelper = function()
{
    var socketClient = new WebSocket("ws://localhost:8001/");
    socketClient.onopen = function(event)
    {
        console.log("Connection opened.");
    }
    socketClient.onmessage = function(event)
    {
        console.log(event.data);
        var message = JSON.parse(event.data);
        if (message.action == 'openDebugUrl')
        {
            chrome.tabs.query({
                url: "http://localhost:" + message.data.port + "/*"
            }, function (tabs) {
                if (tabs.length >= 1) {
                    for (var i = tabs.length - 1; i > 0; i--) {
                        chrome.tabs.remove(tabs[i].id);
                    }
                    chrome.tabs.update(tabs[0].id, {
                        url: message.data.url
                    });
                }
                else if (tabs.length == 0) {
                    chrome.tabs.create({
                        url: message.data.url
                    });
                }
            });
        }
        else if (message.action == 'closeDebugUrl')
        {
            chrome.tabs.query({
                url: "http://localhost:" + message.data.port + "/*"
            }, function (tabs) {
                for (var i = tabs.length - 1; i >= 0; i--) {
                    chrome.tabs.remove(tabs[i].id);
                }
            });
        }
    }
    socketClient.onerror = function(event)
    {
        console.log("Connection error.");
    }
    socketClient.onclose = function(event)
    {
        console.log("Connection closed.");
        setTimeout(connectToCcDeveloperHelper, 2000);
    }
};

connectToCcDeveloperHelper();