const bcrypt = require('bcrypt');

let db;

/**
 * Initialize user model with database connection
 * @param {Object} database - MySQL database connection
 */
function init(database) {
  db = database;
}

/**
 * Create a new user
 * @param {Object} userData - User data { username, email, password }
 * @returns {Promise} - Returns created user
 */
async function createUser(userData) {
  const { username, email, password } = userData;
  
  // Hash password using bcrypt
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  return new Promise((resolve, reject) => {
    const sql = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
    db.query(sql, [username, email, hashedPassword], (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve({
        id: result.insertId,
        username,
        email,
        password: hashedPassword
      });
    });
  });
}

/**
 * Find user by username
 * @param {string} username - Username to search
 * @returns {Promise} - Returns user object or null
 */
function findUserByUsername(username) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM users WHERE username = ?";
    db.query(sql, [username], (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(result[0] || null);
    });
  });
}

/**
 * Find user by email
 * @param {string} email - Email to search
 * @returns {Promise} - Returns user object or null
 */
function findUserByEmail(email) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM users WHERE email = ?";
    db.query(sql, [email], (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(result[0] || null);
    });
  });
}

/**
 * Find user by ID
 * @param {number} id - User ID
 * @returns {Promise} - Returns user object or null
 */
function findUserById(id) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT id, username, email, created_at, updated_at FROM users WHERE id = ?";
    db.query(sql, [id], (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(result[0] || null);
    });
  });
}

/**
 * Compare password with hashed password
 * @param {string} plainPassword - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise} - Returns true if password matches
 */
function comparePassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Update user password
 * @param {number} userId - User ID
 * @param {string} newPassword - New plain text password
 * @returns {Promise} - Returns true if updated successfully
 */
async function updatePassword(userId, newPassword) {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
  
  return new Promise((resolve, reject) => {
    const sql = "UPDATE users SET password = ? WHERE id = ?";
    db.query(sql, [hashedPassword, userId], (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(result.affectedRows > 0);
    });
  });
}

module.exports = {
  init,
  createUser,
  findUserByUsername,
  findUserByEmail,
  findUserById,
  comparePassword,
  updatePassword
};

