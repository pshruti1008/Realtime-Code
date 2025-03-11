// index.js (Backend)
import express from "express";
import http from "http";
import { Server } from "socket.io";
import axios from "axios";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Adjust if frontend is hosted elsewhere
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const rooms = new Map();

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("joinRoom", ({ roomId }) => {
    socket.join(roomId);
    if (!rooms.has(roomId)) {
      rooms.set(roomId, "");
    }
    socket.emit("loadCode", rooms.get(roomId));
  });

  socket.on("codeChange", ({ code, roomId }) => {
    rooms.set(roomId, code);
    socket.to(roomId).emit("codeUpdate", code);
  });

  socket.on("compileCode", async ({ code, roomId, language, version }) => {
    if (rooms.has(roomId)) {
      try {
        const response = await axios.post("https://emkc.org/api/v2/piston/execute", {
          language,
          version,
          files: [{ content: code }],
        });

        console.log("API Response:", response.data);
        io.to(roomId).emit("codeResponse", response.data);
      } catch (error) {
        console.error("Compilation Error:", error.response?.data || error.message);
        io.to(roomId).emit("codeResponse", { run: { output: "Error in execution" } });
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

server.listen(3000, () => console.log("Server running on port 3000"));
