import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import initializeSocket from "./utils/socket.js"; // Import the socket function
import http from "http";    
const app = express();
const server = http.createServer(app); // Define server here

const io = initializeSocket(server);


import connectDB from "./config/db.js";
import { config } from "process";

const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

app.use(express.static("public"));

app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);




connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGO DB connection is f**ked !!", err);
  });