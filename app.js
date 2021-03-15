const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server, {
  cors: {
    origin: "*",
  },
});

const rooms = {};
const hostToRoomID = {};
const roomToHost = {};
const roomToName = {};
const clientToRoom = {};
const clintToName = {};
io.on("connection", (socket) => {
  socket.on("create room", (room) => {
    rooms[room.roomId] = [socket.id];
    roomToName[room.roomId] = room.roomName;
    hostToRoomID[socket.id] = room.roomId;
    roomToHost[room.roomId] = socket.id;
    socket.emit("self room id", { selfRoom: room.roomId });
    socket.broadcast.emit("rooms", { roomToName });
  });

  socket.on("new clint join to room", (clint) => {
    clintToName[socket.id] = clint.name;
    socket.emit("rooms", { roomToName });
  });
  socket.on("connect request to host", (id) => {
    const nameClint = clintToName[socket.id];
    const hostId = roomToHost[id.hostRoomId];
    io.to(hostId).emit("for permission", {
      clientId: socket.id,
      name: nameClint,
    });
  });
  socket.on("permission status send host", (payload) => {
    if (payload.accept) {
      rooms[hostToRoomID[socket.id]].push(payload.clintId);
      clientToRoom[payload.clintId] = hostToRoomID[socket.id];
      const userInthisRoom = rooms[hostToRoomID[socket.id]].filter(
        (id) => id !== payload.clintId
      );
      console.log(userInthisRoom);
      io.to(payload.clintId).emit("permission is granted", { userInthisRoom });
    } else {
      io.to(payload.clintId).emit("permission is rejected", {
        message: "Permission Rejected.",
        roomToName,
      });
    }
  });
  socket.on("sending signal", (payload) => {
    let name, host;
    if (clintToName[socket.id]) {
      name = clintToName[socket.id];
    } else {
      host = roomToName[hostToRoomID[socket.id]];
    }
    io.to(payload.userToSignal).emit("user joiend", {
      clientId: payload.callerID,
      clientSignal: payload.signal,
      name,
      host,
    });
  });
  socket.on("returning signal", (payload) => {
    let name, host;
    if (clintToName[socket.id]) {
      name = clintToName[socket.id];
    } else {
      host = roomToName[hostToRoomID[socket.id]];
    }
    io.to(payload.callerID).emit("receiving return signal", {
      signal: payload.signal,
      id: socket.id,
      name,
      host,
    });
  });
  socket.on("disconnect", () => {
    if (hostToRoomID[socket.id]) {
      const roomID = hostToRoomID[socket.id];
      console.log(hostToRoomID[socket.id]);
      delete rooms[roomID];
      delete roomToName[roomID];
      delete roomToHost[roomID];
      delete hostToRoomID[roomID];
    } else {
      console.log(clientToRoom[socket.id]);
      delete clientToRoom[socket.id];
      delete clintToName[socket.id];
    }
  });
});

server.listen(process.env.PORT || 4000, () => {
  console.log("The port 4000 is ready to start..");
});
