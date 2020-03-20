require('./Entity');
require('./client/Inventory');

var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.get('/style.css', function(req, res) {
	res.sendFile(__dirname + "/client/style.css");
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(process.env.PORT || 2000);
console.log("Server started.");

var SOCKET_LIST = {};
var USERNAME_LIST = [];

var DEBUG = true;

var isUsernameTaken = function(data, cb) {
    if(USERNAME_LIST.includes(data.username))
        cb(true);
    else
        cb(false);
}

var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket) {
	socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;
	
	socket.on('signIn',function(data) { //{username,password}
        isUsernameTaken(data, function(res) {
            if(res) {
                socket.emit('signInResponse',{success:false});		
            } else {
                Player.onConnect(socket,data.username);
                socket.emit('signInResponse',{success:true});
                USERNAME_LIST.push(data.username);
            }
        });
	});
	
	socket.on('disconnect', function() {
        delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket, function(username) {
			if(username !== undefined) {
				USERNAME_LIST.splice(USERNAME_LIST.indexOf(username), 1);
			}
		});
	});
	socket.on('evalServer',function(data) {
		if(!DEBUG)
			return;
		var res = eval(data);
		socket.emit('evalAnswer',res);		
	});
});

setInterval(function() {
	var packs = Entity.getFrameUpdateData();
	for(var i in SOCKET_LIST){
		var socket = SOCKET_LIST[i];
		socket.emit('init',packs.initPack);
		socket.emit('update',packs.updatePack);
		socket.emit('remove',packs.removePack);
	}
	
}, 1000 / 25);