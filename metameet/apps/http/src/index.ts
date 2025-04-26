import express from 'express';
import cors from 'cors';
import { router } from './routes/v1';
import client from "@repo/db";

const app = express();

// ✅ Handle CORS for any origin
app.use(cors({
  origin: '*',  // Allow requests from any origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ✅ Always handle OPTIONS (for preflight)
app.options('*', cors());

// Middleware
app.use(express.json());
app.use("/api/v1", router);

app.listen(3000, () => {
  console.log("API server running at http://localhost:3000");
});
