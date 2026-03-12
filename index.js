import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import artifactRoutes from "./routes/artifacts.js";
import userRoutes from "./routes/auth.js";
import connectDB from "./config/db.js";


connectDB();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Root Route
app.get("/", (req, res) => {
  res.send("Welcome to the Naija Heritage Museum API!");
});

// Health Check Route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Backend is running!",
  });
});

app.use("/api/artifacts", artifactRoutes);
app.use("/api/users", userRoutes);

// 404 handler (must be last)
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running at http://localhost:${PORT}`);
});