const mysql = require("mysql2");
const fs = require("fs");
const dotenv = require("dotenv");

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: "utf8mb4",
  waitForConnections: true,
  connectionLimit: 50,
  queueLimit: 0,
  connectTimeout: 10000,
  multipleStatements: true,
});

const logError = (error) => {
  fs.appendFileSync(
    "mysql-errors.log",
    `${new Date().toISOString()} - ${error}\n`
  );
};

pool.getConnection((err, connection) => {
  if (err) {
    logError(err);
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      console.error("❌ Database connection was closed.");
    } else if (err.code === "ER_CON_COUNT_ERROR") {
      console.error("❌ Database has too many connections.");
    } else if (err.code === "ECONNREFUSED") {
      console.error("❌ Database connection was refused.");
    } else {
      console.error("❌ MySQL Connection Error:", err);
    }
  } else {
    console.log("✅ MySQL Database Connected Successfully!");
    console.log("🌐 Connection ID:", connection.threadId);
    connection.release();
  }
});

pool.on("error", (err) => {
  logError(err);
  console.error("⚠️ MySQL Pool Error:", err);
});

const promisePool = pool.promise();

setInterval(async () => {
  try {
    await promisePool.query("SELECT 1");
    console.log("✅ MySQL connection is healthy:");
  } catch (error) {
    logError(error);
    console.error("⚠️ MySQL Health Check Failed:", error);
  }
}, 30000);

process.on("SIGINT", async () => {
  try {
    await promisePool.end();
    console.log("🛑 MySQL Pool Closed Gracefully");
    process.exit(0);
  } catch (error) {
    logError(error);
    console.error("Error closing MySQL pool:", error);
    process.exit(1);
  }
});

module.exports = promisePool;
