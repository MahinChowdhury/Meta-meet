import express from 'express';
import { router } from './routes/v1';
import client from "@repo/db"

const app = express();
app.use("/api/v1",router);

app.listen(3000);