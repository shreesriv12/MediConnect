import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import initializeSocket from "./src/utils/socket.js"; 
import http from "http";   
import dotenv from 'dotenv' 
const app = express();
const server = http.createServer(app); 
import nodemailer from "nodemailer";


const io = initializeSocket(server);

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


import connectDB from "./src/config/db.js";
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
    console.log("Mongo Connection Error", err);
  });



  import doctorRouter from './src/routes/doctor.routes.js'
  import clientRouter from './src/routes/client.routes.js'
   import paymentRouter from './src/routes/payment.routes.js';
  app.use("/doctor",doctorRouter);
  app.use('/client',clientRouter);
  app.use('/payments', paymentRouter);


