const express = require("express");
const cors = require("cors");
const app = express();
const authRouter = require("./src/routes/auth");
const userRouter = require("./src/routes/user");

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use("/auth", authRouter);
app.use("/user", userRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
