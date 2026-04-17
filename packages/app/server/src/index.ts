import express from "express"
import cookieParser from "cookie-parser"
import authRouter from "./routes/auth.js"
import gradesRouter from "./routes/grades.js"
import counselingRouter from "./routes/counseling.js"
import { connectDB } from "./db.js"

const app = express()
const port = Number(process.env.PORT ?? 3001)
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173"

app.use(express.json())
app.use(cookieParser())

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", clientOrigin)
  res.header("Access-Control-Allow-Credentials", "true")
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization")
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")

  if (req.method === "OPTIONS") {
    res.status(204).end()
    return
  }

  next()
})

app.get("/health", (_req, res) => {
  res.json({ ok: true })
})

app.use("/api/auth", authRouter)
app.use("/api/grades", gradesRouter)
app.use("/api/counseling", counselingRouter)

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Teacher ERP API listening on port ${port}`)
    })
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err)
    process.exit(1)
  })