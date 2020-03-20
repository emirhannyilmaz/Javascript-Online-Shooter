var initPack = {player:[],bullet:[]};
var removePack = {player:[],bullet:[]};

Entity = function(param){
	var self = {
		x:1500,
		y:1200,
		spdX:0,
		spdY:0,
		id:"",
		map:'map',
	}
	if(param) {
		if(param.x)
			self.x = param.x;
		if(param.y)
			self.y = param.y;
		if(param.map)
			self.map = param.map;
		if(param.id)
			self.id = param.id;		
	}
	
	self.update = function(){
		self.updatePosition();
	}
	self.updatePosition = function(){
		self.x += self.spdX;
		self.y += self.spdY;
	}
	self.getDistance = function(pt){
		return Math.sqrt(Math.pow(self.x-pt.x,2) + Math.pow(self.y-pt.y,2));
	}
	return self;
}
Entity.getFrameUpdateData = function(){
	var pack = {
		initPack:{
			player:initPack.player,
			bullet:initPack.bullet,
		},
		removePack:{
			player:removePack.player,
			bullet:removePack.bullet,
		},
		updatePack:{
			player:Player.update(),
			bullet:Bullet.update(),
		}
	};
	initPack.player = [];
	initPack.bullet = [];
	removePack.player = [];
	removePack.bullet = [];
	return pack;
}

Player = function(param){
	var self = Entity(param);
	self.number = "" + Math.floor(10 * Math.random());
	self.username = param.username;
	self.pressingRight = false;
	self.pressingLeft = false;
	self.pressingUp = false;
	self.pressingDown = false;
	self.pressingAttack = false;
	self.mouseAngle = 0;
	self.maxSpd = 10;
	self.hp = 10;
	self.hpMax = 10;
	self.score = 0;
    self.inventory = new Inventory(param.socket,true);
    self.socket = param.socket;
	
	//var super_update = self.update;
	self.update = function() {
		self.updateSpd();
		
		//super_update();
		
		if(self.pressingAttack) {
			self.shootBullet(self.mouseAngle);
		}
	}
	self.shootBullet = function(angle) {
		if(Math.random() < 0.1)
			self.inventory.addItem("potion",1);
		Bullet({
			parent:self.id,
			angle:angle,
			x:self.x,
			y:self.y,
			map:self.map,
		});
	}
	
	self.updateSpd = function() {
		var oldX = self.x;
		var oldY = self.y;

		if(self.pressingRight)
			self.x += 10;
		if(self.pressingLeft)
			self.x -= 10;	
		if(self.pressingDown)
			self.y += 10;	
		if(self.pressingUp)
			self.y -= 10;

		if(self.x < self.width/2)
			self.x = self.width/2;
		if(self.x > Maps.current.width-self.width/2)
			self.x = Maps.current.width - self.width/2;
		if(self.y < self.height/2)
			self.y = self.height/2;
		if(self.y > Maps.current.height - self.height/2)
			self.y = Maps.current.height - self.height/2;
		
		if(Maps.current.isPositionWall(self)){
			self.x = oldX;
			self.y = oldY;			
		}
	}
	
	self.getInitPack = function(){
		return {
			id:self.id,
			x:self.x,
			y:self.y,	
			number:self.number,	
			hp:self.hp,
			hpMax:self.hpMax,
			score:self.score,
			map:self.map
		};
	}
	self.getUpdatePack = function(){
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			hp:self.hp,
			score:self.score,
			map:self.map,
			angle:self.mouseAngle
		}	
	}
	
	Player.list[self.id] = self;
	
	initPack.player.push(self.getInitPack());
	return self;
}
Player.list = {};
Player.onConnect = function(socket,username){
	var map = 'map';
	map = 'map';
	/*if(Math.random() < 0.5)
		map = 'map2';*/
	var player = Player({
		username:username,
		id:socket.id,
		map:map,
		socket:socket,
	});

	socket.on('keyPress',function(data){
		if(data.inputId === 'left')
			player.pressingLeft = data.state;
		else if(data.inputId === 'right')
			player.pressingRight = data.state;
		else if(data.inputId === 'up')
			player.pressingUp = data.state;
		else if(data.inputId === 'down')
			player.pressingDown = data.state;
		else if(data.inputId === 'attack')
			player.pressingAttack = data.state;
		else if(data.inputId === 'mouseAngle')
			player.mouseAngle = data.state;
	});
	
	setCollisionMap(player.map);

	socket.on('changeMap',function(data) {
		player.x = 1500;
		player.y = 1200;

		if(player.map === 'map2') {
			player.map = 'map';
		} else {
			player.map = 'map2';
		}

		setCollisionMap(player.map);
	});
	
	socket.on('sendMsgToServer',function(data) {
		for(var i in Player.list){
			Player.list[i].socket.emit('addToChat', player.username + ': ' + data);
		}
	});
	socket.on('sendPmToServer',function(data){ //data:{username,message}
		var recipientSocket = null;
		for(var i in Player.list)
			if(Player.list[i].username === data.username)
				recipientSocket = Player.list[i].socket;
		if(recipientSocket === null){
			socket.emit('addToChat','The player ' + data.username + ' is not online.');
		} else {
			recipientSocket.emit('addToChat','From ' + player.username + ':' + data.message);
			socket.emit('addToChat','To ' + data.username + ':' + data.message);
		}
	});
	
	socket.emit('init',{
		selfId:socket.id,
		player:Player.getAllInitPack(),
		bullet:Bullet.getAllInitPack(),
	})
}
Player.getAllInitPack = function(){
	var players = [];
	for(var i in Player.list)
		players.push(Player.list[i].getInitPack());
	return players;
}

Player.onDisconnect = function(socket, cb) {
    if(Player.list[socket.id] !== undefined)
        cb(Player.list[socket.id].username);
	delete Player.list[socket.id];
	removePack.player.push(socket.id);
}
Player.update = function() {
	var pack = [];
	for(var i in Player.list){
		var player = Player.list[i];
		player.update();
		pack.push(player.getUpdatePack());		
	}
	return pack;
}

Bullet = function(param){
	var self = Entity(param);
	self.id = Math.random();
	self.angle = param.angle;
	self.spdX = Math.cos(param.angle/180 * Math.PI) * 50;
	self.spdY = Math.sin(param.angle/180 * Math.PI) * 50;
	self.parent = param.parent;
	
	self.timer = 0;
	self.toRemove = false;
	var super_update = self.update;
	self.update = function(){
		if(self.timer++ > 100)
			self.toRemove = true;
		super_update();
		
		for(var i in Player.list){
			var p = Player.list[i];
			if(self.map === p.map && self.getDistance(p) < 32 && self.parent !== p.id){
				p.hp -= 1;

				if(p.hp <= 0) {
					var shooter = Player.list[self.parent];
					if(shooter)
						shooter.score += 1;
					p.hp = p.hpMax;
					p.x = 1500;
					p.y = 1200;
					//p.x = Math.random() * 1210;
					//p.y = Math.random() * 600;
				}
				self.toRemove = true;
			}
			if(Maps.current.isPositionWall(self)) {
				self.toRemove = true;
			}
		}
	}
	self.getInitPack = function(){
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			map:self.map,
		};
	}
	self.getUpdatePack = function(){
		return {
			id:self.id,
			x:self.x,
			y:self.y,		
		};
	}
	
	Bullet.list[self.id] = self;
	initPack.bullet.push(self.getInitPack());
	return self;
}
Bullet.list = {};

Bullet.update = function(){
	var pack = [];
	for(var i in Bullet.list){
		var bullet = Bullet.list[i];
		bullet.update();
		if(bullet.toRemove){
			delete Bullet.list[i];
			removePack.bullet.push(bullet.id);
		} else
			pack.push(bullet.getUpdatePack());		
	}
	return pack;
}

Bullet.getAllInitPack = function(){
	var bullets = [];
	for(var i in Bullet.list)
		bullets.push(Bullet.list[i].getInitPack());
	return bullets;
}

Maps = function(grid) {
	var TILE_SIZE = 64;
	var self = {
		width:grid[0].length * TILE_SIZE,
		height:grid.length * TILE_SIZE,
		grid:grid,
	}
	
	self.isPositionWall = function(pt) {
		var gridX = Math.floor(pt.x / TILE_SIZE);
		var gridY = Math.floor(pt.y / TILE_SIZE);

		if(gridX < 0 || gridX >= self.grid[0].length)
			return true;
		if(gridY < 0 || gridY >= self.grid.length)
			return true;
		return self.grid[gridY][gridX];
	}

	return self;
}

var setCollisionMap = function(map) {
	var mapJsonFile = require('./client/assets/map/map.json');
	var mapJsonData = JSON.stringify(mapJsonFile);
	var mapJson = JSON.parse(mapJsonData);
	var mapCollisionArray = mapJson.layers[3].data;

	var map2JsonFile = require('./client/assets/map2/map2.json');
	var map2JsonFile = JSON.stringify(map2JsonFile);
	var map2Json = JSON.parse(map2JsonFile);
	var map2CollisionArray = map2Json.layers[2].data;

	var array2D = [];

	if(map === 'map') {
		for(var i = 0 ; i < 100; i++) {
			array2D[i] = [];
			for(var j = 0 ; j < 100; j++) {
				array2D[i][j] = mapCollisionArray[i * 100 + j];
			}
		}

		Maps.current = Maps(array2D);
	} else if(map === 'map2') {
		for(var i = 0 ; i < 100; i++){
			array2D[i] = [];
			for(var j = 0 ; j < 100; j++){
				array2D[i][j] = map2CollisionArray[i * 100 + j];
			}
		}

		Maps.current = Maps(array2D);
	}
}