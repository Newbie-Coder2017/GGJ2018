const mapGenerator = require("./randomMapGenerator")

function socketEvents(io) {
	const rooms = []
	let lastRoomId=0
	io.on('connection', async function (socket) {
		socket.on('get_room', function (callback) {
			"use strict"
			let connected = false
			let i = rooms.length
			while (i--) {
				let room = rooms[i]
				if (room.participants.length === 0) {
					rooms.splice(i, 1)
					continue
				}
				if (room.participants.length === 1 && !connected) {
					connected = true
					if(room.participants[0]===socket)return
					let index = room.participants.push(socket)-1
					socket.join(room.id);
					socket.roomId = room.id
					callback(index)
				}

			}

			if (!connected) {
				const objects = mapGenerator(2000, 2000, 2, 25, 13)
				let newRoom = {id: ++lastRoomId, participants: [socket], objects}
				socket.roomId = newRoom.id
				rooms.push(newRoom)
				connected = true
				socket.join(newRoom.id);
				//generate map
				callback(0)
			}
			console.log(rooms)
		})
		socket.on('game ready', () => {
			let room = rooms.find((room)=>room.id===socket.roomId)
			io.sockets.in(socket.roomId).emit('game start', room.objects);
		})
		socket.on('satelites_changed', (satellites,userindex) => {
			socket.broadcast.to(socket.roomId).emit('updateSatellites', userindex,satellites);
		})
		socket.on('game results', (dominance) => {
			let room = rooms.find((room)=>room.id===socket.roomId)
			room.dominance=dominance
			socket.broadcast.to(socket.roomId).emit('resend game results', dominance);
		})
		socket.on('planet_flags_changed', (planet) => {
			socket.broadcast.to(socket.roomId).emit('planet_flags_update', planet);
		})
		socket.on('send_info',function (message) {
			socket.broadcast.to(socket.roomId).emit('resend_info', message);
		})
		socket.on('disconnect', () => {
			let closingRoom = rooms.find((room)=>room.id===socket.roomId)
			if (!closingRoom) return
			let roomIndex = rooms.indexOf(closingRoom)
			if(!closingRoom.dominance){
				socket.broadcast.to(closingRoom.id).emit('end game', `You won since your opponent has left`);
			}
			rooms.splice(roomIndex,1)
		})
	});
}

module.exports = socketEvents