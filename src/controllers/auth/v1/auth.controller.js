const database = require("../../../config/connection");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

// -------------------- Generate Bearer Token --------------------
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.user_id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// -------------------- Generate User Id --------------------
const generateUserId = async () => {
  let userId;
  let exists = true;

  while (exists) {
    userId = uuidv4();

    const [rows] = await database.query(
      "SELECT COUNT(*) AS count FROM users WHERE user_id = ?",
      [userId]
    );
    exists = rows[0].count > 0;
  }

  return userId;
};

// -------------------- Account Register --------------------
const register = async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  if (!email || !password || !firstName) {
    return res.status(400).json({ success: false, message: "Missing fields." });
  }

  try {
    const [existing] = await database.query(
      "SELECT user_id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length) {
      return res
        .status(400)
        .json({ success: false, message: "Email already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userId = await generateUserId();

    await database.query(
      "INSERT INTO users (user_id, email, password) VALUES ( ?, ?, ?)",
      [userId, email, hashedPassword]
    );

    await database.query(
      "INSERT INTO user_details (user_id, first_name, last_name) VALUES (?, ?, ?)",
      [userId, firstName, lastName || null]
    );

    res.json({ success: true, message: "User registered." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// -------------------- Username Availability Check --------------------
const checkUsername = async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res
      .status(400)
      .json({ available: false, message: "Username is required." });
  }

  try {
    const [rows] = await database.query(
      "SELECT user_id FROM users WHERE username = ?",
      [username]
    );

    if (rows.length > 0) {
      return res.json({ available: false });
    } else {
      return res.json({ available: true });
    }
  } catch (err) {
    console.error("DB error:", err);
    return res.status(500).json({ available: false, message: "Server error" });
  }
};

// -------------------- Create Username --------------------
const createUsername = async (req, res) => {
  const { username } = req.body;
  const userId = req.user?.user_id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  if (!username) {
    return res
      .status(400)
      .json({ success: false, message: "Username is required" });
  }

  try {
    const [existing] = await database.query(
      "SELECT user_id FROM users WHERE username = ?",
      [username]
    );

    if (existing.length > 0) {
      return res
        .status(400)
        .json({ success: false, message: "Username already taken" });
    }

    await database.query("UPDATE users SET username = ? WHERE user_id = ?", [
      username,
      userId,
    ]);

    return res.json({ success: true, message: "Username updated" });
  } catch (err) {
    console.error("DB error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// -------------------- Login To Account --------------------
const login = async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  try {
    const [rows] = await database.query(
      "SELECT * FROM users WHERE email = ? OR username = ?",
      [identifier, identifier]
    );

    if (rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    const user = rows[0];

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid Credentials" });
    }

    res.json({
      success: true,
      message: "Login successful",
      userId: user.user_id,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// -------------------- Send Login OTP --------------------
const sendLoginOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email required" });
  }

  try {
    const [userRows] = await database.query(
      "SELECT user_id FROM users WHERE email = ?",
      [email]
    );
    if (userRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const userId = userRows[0].user_id;

    const otp = Math.floor(10000 + Math.random() * 90000);

    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    await database.query("DELETE FROM user_otps WHERE user_id = ?", [userId]);

    await database.query(
      "INSERT INTO user_otps (user_id, otp_code, expires_at) VALUES (?, ?, ?)",
      [userId, otp.toString(), expiresAt]
    );

    console.log(`Send OTP ${otp} to ${email}`);

    res.json({ success: true, message: "OTP sent to your email" });
  } catch (err) {
    console.error("OTP send error:", err);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};

// -------------------- Verify Login OTP --------------------
const verifyLoginOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res
      .status(400)
      .json({ success: false, message: "Email and OTP required" });
  }

  try {
    const [userRows] = await database.query(
      "SELECT user_id, email FROM users WHERE email = ?",
      [email]
    );

    if (userRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const user = userRows[0];
    const userId = user.user_id;

    const [otpRows] = await database.query(
      "SELECT otp_code, expires_at FROM user_otps WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    if (otpRows.length === 0) {
      return res.status(400).json({ success: false, message: "No OTP found" });
    }

    const storedOtp = otpRows[0].otp_code;
    const expiresAt = new Date(otpRows[0].expires_at);
    const now = new Date();

    if (otp !== storedOtp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (now > expiresAt) {
      return res
        .status(400)
        .json({ success: false, message: "This OTP expired" });
    }

    const token = generateToken(user);

    return res.json({ success: true, message: "OTP verified", token });
  } catch (err) {
    console.error("OTP verify error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// -------------------- Check Auth --------------------
const checkAuth = async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { userId } = decoded;

    const [rows] = await database.query(
      "SELECT user_id, email, username FROM users WHERE user_id = ?",
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user: rows[0] });
  } catch (err) {
    console.error("Token invalid:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// -------------------- Log Out --------------------
const logout = async (req, res) => {
  return res.json({ success: true, message: "Logged out" });
};

module.exports = {
  register,
  checkUsername,
  createUsername,
  login,
  sendLoginOtp,
  verifyLoginOtp,
  checkAuth,
  logout,
};
