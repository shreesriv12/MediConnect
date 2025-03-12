import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";

import { app, server } from "./utils/socket.js";

import connectDB from "./config/db.js";

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
      console.log(`🤖 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGO DB connection is f**ked !!", err);
  });