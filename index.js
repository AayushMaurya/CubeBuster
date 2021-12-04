const http = require("http");
const app = require("express")();
const port = process.env.PORT || 8000
app.get("/",(req, res)=> res.sendFile(__dirname+"/client/index.html"));
app.listen(8000, ()=>console.log("listening to port 9091"));
const websocketServer = require("websocket").server

const httpServer = http.createServer();
httpServer.listen(9090, () => {
    console.log("listening to port 9090");
});

// this will hold record of all the clients
const clients = {};
const games = {};

const wsServer = new websocketServer({
    "httpServer": httpServer
});

wsServer.on("request", request => {
    // connect
    const connection = request.accept(null, request.origin);
    connection.on("open", () => console.log("connection opened"));
    connection.on("closed", () => console.log("connection is closed"));
    connection.on("message", message => {
        const result = JSON.parse(message.utf8Data);
        // message will contain the message from the client
        console.log(result);

        // if user want to create a new game
        if(result.method == "create")
        {
            const clientId = result.clientId;
            const gameId = guid();
            games[gameId] = {
                "id": gameId,
                "balls": 20,
                "clients": [],
                "state": {}
            }

            const payLoad = {
                "method": "create",
                "game": games[gameId]
            }

            const con = clients[clientId].connection;
            con.send(JSON.stringify(payLoad));

            console.log("client ", clientId, "has created game ", gameId);
        }

        // joining a game
        if(result.method == "join")
        {
            const clientId = result.clientId;
            const gameId = result.gameId;
            const game = games[gameId];

            if(game.clients.length >= 3)
            {
                return;
            }

            const color = {"0": "Red", "1": "Green", "2": "Blue"}[game.clients.length];

            game.clients.push({
                "clientId": clientId,
                "color": color
            });

            console.log("client ", clientId, "has requested to join game ", gameId, "color assigned = ", color);

            // start playing
            if(game.clients.length == 3)
                updateGameState();

            const payLoad = {
                "method": "join",
                "game": game
            }

            // tell all the clients about the newly added player
            game.clients.forEach(c => {
                clients[c.clientId].connection.send(JSON.stringify(payLoad));
            });
        }

        // user plays
        if(result.method == "play")
        {
            const gameId = result.gameId;
            const ballId = result.ballId;
            const color = result.color;

            const state = games[gameId].state;
            // if(!state)
            //     state = {};
            
            state[ballId] = color;
            games[gameId].state = state;
        }
    });

    const clientId = guid();
    clients[clientId] = {
        "connection": connection
    }

    const payLoad = {
        "method": "connect",
        "clientId": clientId
    }
    // send back the connect message
    connection.send(JSON.stringify(payLoad));

});

// this function is to create a unique ID 
function S4() {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

function guid() {
    return (S4() + S4() + "-" + S4() + "-4" + S4().substr(0, 3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
}

function updateGameState(){
    for (const g of Object.keys(games)){

        const payLoad = {
            "method": "update",
            "game" : games[g]   
        }

        games[g].clients.forEach(c => {
            clients[c.clientId].connection.send(JSON.stringify(payLoad));
        });
    }

    setTimeout(updateGameState, 500);
}