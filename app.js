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
      if (rooms[hostToRoomID[socket.id]]) {
        rooms[hostToRoomID[socket.id]].push(payload.clintId);
        clientToRoom[payload.clintId] = hostToRoomID[socket.id];
        const userInthisRoom = rooms[hostToRoomID[socket.id]].filter(
          (id) => id !== payload.clintId
        );
        io.to(payload.clintId).emit("permission is granted", {
          userInthisRoom,
        });
      }
    } else {
      io.to(payload.clintId).emit("permission is rejected", {
        message: "Permission Rejected.",
        roomToName,
      });
    }
  });
  socket.on("sending signal", (payload) => {
    io.to(payload.userToSignal).emit("user joiend", {
      clientId: payload.callerID,
      clientSignal: payload.signal,

      id: socket.id,
    });
  });
  socket.on("returning signal", (payload) => {
    io.to(payload.callerID).emit("receiving return signal", {
      signal: payload.signal,
      id: socket.id,
    });
  });
  socket.on("for leve action get to other client", (payload) => {
    // console.log(payload.disClient);
    io.to(payload.otherClient).emit("remove that client", {
      removeClient: payload.disClient,
    });
  });
  //peerVideo component
  socket.on("request for name", (payload) => {
    const clientName = clintToName[payload.id];

    socket.emit("client name", { clientName });
  });
  socket.on("for room name", (payload) => {
    // console.log("hii");
    const roomId = hostToRoomID[payload.id];
    const roomName = roomToName[roomId];
    socket.emit("room name", { roomName });
  });
  //lave meeting client
  socket.on("leave from metting", (data) => {
    const roomOfClient = clientToRoom[socket.id];
    const host = roomToHost[roomOfClient];
    let exceptHost;
    if (rooms[roomOfClient]) {
      const stilHaveInRoom = rooms[roomOfClient].filter(
        (id) => id !== socket.id
      );
      rooms[roomOfClient] = stilHaveInRoom;
      exceptHost = stilHaveInRoom.filter((id) => id !== host);
    }

    delete clientToRoom[socket.id];

    socket.emit("peer destroy", { roomToName });
    if (data === "leave") {
      io.to(host).emit("client disconnected mess to host", {
        disClient: socket.id,
        rooms: exceptHost,
      });
    }

    if (rooms[roomOfClient].length < 1) {
      delete rooms[roomOfClient];
    }
  });
  socket.on("back to see room", (payload) => {
    socket.emit("rooms", { roomToName });
  });
  socket.on("cheack you are this room", (check) => {
    if (clientToRoom[socket.id] == check.roomID) {
      socket.emit("data match");
    }
  });
  socket.on("close the meeting", () => {
    socket.emit("disconnect all clint video in host");
  });
  socket.on("disconnect host to client", () => {
    const roomID = hostToRoomID[socket.id];
    // console.log(roomID);
    delete roomToName[roomID];
    socket.broadcast.emit("host leave", { roomID });
    delete roomToHost[roomID];
    delete hostToRoomID[roomID];
  });
  socket.on("This clint should to leave", (payload) => {
    io.to(payload.clientId).emit("go and leave", "leave");
  });
  socket.on("disconnect", () => {
    if (hostToRoomID[socket.id]) {
      const roomID = hostToRoomID[socket.id];
      delete roomToName[roomID];
      socket.broadcast.emit("host leave", { roomID, roomToName });
      // console.log(hostToRoomID[socket.id]);
      // delete rooms[roomID];

      delete roomToHost[roomID];
      delete hostToRoomID[roomID];
    } else if (clientToRoom[socket.id]) {
      const roomOfClient = clientToRoom[socket.id];

      const host = roomToHost[roomOfClient];

      const stilHaveInRoom = rooms[roomOfClient].filter(
        (id) => id !== socket.id
      );

      rooms[roomOfClient] = stilHaveInRoom;
      delete clientToRoom[socket.id];
      delete clintToName[socket.id];
      const exceptHost = stilHaveInRoom.filter((id) => id !== host);
      io.to(host).emit("client disconnected mess to host", {
        disClient: socket.id,
        rooms: exceptHost,
      });
    }
  });
});

server.listen(process.env.PORT || 4000, () => {
  console.log("The port 4000 is ready to start..");
});
