const database = require("../../../config/connection");

// -------------------- Check Username Created --------------------
const checkUsernameCreated = async (req, res) => {
  const { userId } = req.user;

  try {
    const [rows] = await database.query(
      "SELECT username FROM users WHERE user_id = ?",
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const username = rows[0].username;

    return res.json({
      username: username && username.trim() !== "" ? username : null,
    });
  } catch (err) {
    console.error("Username check error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  checkUsernameCreated,
};
