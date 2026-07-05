/**
 * Authentication Service
 * Handles user registration, login, password hashing, and JWT token generation
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const csvService = require("./csvService");
const config = require("../config/defaults.json");

// Handle uuid import (works with both CommonJS and ESM)
let uuidv4;
try {
	const uuidModule = require("uuid");
	uuidv4 = uuidModule.v4 || uuidModule.default?.v4;
} catch (error) {
	// Fallback to simple UUID v4 generation
	uuidv4 = () =>
		"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
			const r = (Math.random() * 16) | 0;
			const v = c === "x" ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});
}

const USERS_FILE =
	process.env.TEST_USERS_FILE || path.join(__dirname, "..", "..", config.database.users_file);

/**
 * Validate username format
 */
function validateUsername(username) {
	const minLength = 3;
	const maxLength = config.limits.max_username_length;
	const regex = /^[a-zA-Z0-9_]+$/;

	if (!username || typeof username !== "string") {
		return { valid: false, error: "Username is required" };
	}

	if (username.length < minLength) {
		return { valid: false, error: `Username must be at least ${minLength} characters` };
	}

	if (username.length > maxLength) {
		return { valid: false, error: `Username must be at most ${maxLength} characters` };
	}

	if (!regex.test(username)) {
		return {
			valid: false,
			error: "Username must contain only alphanumeric characters and underscores",
		};
	}

	return { valid: true };
}

/**
 * Validate password strength
 */
function validatePassword(password) {
	const minLength = config.auth.password_min_length;

	if (!password || typeof password !== "string") {
		return { valid: false, error: "Password is required" };
	}

	if (password.length < minLength) {
		return { valid: false, error: `Password must be at least ${minLength} characters` };
	}

	return { valid: true };
}

/**
 * Validate email format
 */
function validateEmail(email) {
	if (!email || typeof email !== "string") {
		return { valid: false, error: "Email is required" };
	}

	// Basic email validation regex
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	if (!emailRegex.test(email)) {
		return { valid: false, error: "Email format is invalid" };
	}

	if (email.length > 255) {
		return { valid: false, error: "Email must be at most 255 characters" };
	}

	return { valid: true };
}

/**
 * Hash password using bcrypt
 */
async function hashPassword(password) {
	const rounds = config.auth.bcrypt_rounds;
	return bcrypt.hash(password, rounds);
}

/**
 * Compare password with hash
 */
async function comparePassword(password, hash) {
	return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
function generateToken(userId) {
	const secret = process.env.JWT_SECRET || config.auth.jwt_secret;
	const expiresIn = config.auth.session_expiry_days * 24 * 60 * 60; // Convert days to seconds

	return jwt.sign(
		{
			userId,
			iat: Math.floor(Date.now() / 1000),
		},
		secret,
		{ expiresIn }
	);
}

/**
 * Verify and decode JWT token
 */
function verifyToken(token) {
	try {
		const secret = process.env.JWT_SECRET || config.auth.jwt_secret;
		return jwt.verify(token, secret);
	} catch (error) {
		return null;
	}
}

/**
 * Register new user
 */
async function registerUser(username, password, email) {
	// Validate inputs
	const usernameValidation = validateUsername(username);
	if (!usernameValidation.valid) {
		throw new Error(usernameValidation.error);
	}

	const passwordValidation = validatePassword(password);
	if (!passwordValidation.valid) {
		throw new Error(passwordValidation.error);
	}

	const emailValidation = validateEmail(email);
	if (!emailValidation.valid) {
		throw new Error(emailValidation.error);
	}

	// Hash password first (before any async file operations)
	const passwordHash = await hashPassword(password);

	// Create user record
	const userId = `u_${uuidv4()}`;
	const user = {
		user_id: userId,
		username,
		email,
		password_hash: passwordHash,
		is_developer: "false",
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};

	// Register with atomic duplicate check + insert under per-file lock
	// The entire read+check+write happens atomically in one enqueued operation
	await csvService.appendWithDuplicateCheck(USERS_FILE, [user], {
		usernameFn: (u) => u.username === username,
		emailFn: (u) => u.email === email,
	});

	// Generate token
	const token = generateToken(userId);

	return {
		user_id: userId,
		username,
		email,
		token,
		created_at: user.created_at,
	};
}

/**
 * Login user
 */
async function loginUser(username, password) {
	// Validate inputs
	if (!username || !password) {
		throw new Error("Username and password are required");
	}

	// Find user
	const user = await csvService.findRecord(USERS_FILE, (u) => u.username === username);
	if (!user) {
		throw new Error("Invalid username or password");
	}

	// Verify password
	const passwordMatch = await comparePassword(password, user.password_hash);
	if (!passwordMatch) {
		throw new Error("Invalid username or password");
	}

	// Generate token
	const token = generateToken(user.user_id);

	return {
		user_id: user.user_id,
		username: user.username,
		token,
	};
}

/**
 * Get user by ID
 */
async function getUserById(userId) {
	const user = await csvService.findRecord(USERS_FILE, (u) => u.user_id === userId);
	if (!user) {
		return null;
	}

	return {
		user_id: user.user_id,
		username: user.username,
		is_developer: user.is_developer === "true",
		created_at: user.created_at,
	};
}

/**
 * Change user password
 */
async function changePassword(userId, oldPassword, newPassword) {
	// Get user
	const user = await csvService.findRecord(USERS_FILE, (u) => u.user_id === userId);
	if (!user) {
		throw new Error("User not found");
	}

	// Verify old password
	const passwordMatch = await comparePassword(oldPassword, user.password_hash);
	if (!passwordMatch) {
		throw new Error("Current password is incorrect");
	}

	// Validate new password
	const validation = validatePassword(newPassword);
	if (!validation.valid) {
		throw new Error(validation.error);
	}

	// Hash new password
	const newPasswordHash = await hashPassword(newPassword);

	// Update user
	await csvService.updateRecords(
		USERS_FILE,
		(u) => u.user_id === userId,
		(u) => ({
			...u,
			password_hash: newPasswordHash,
			updated_at: new Date().toISOString(),
		})
	);
}

module.exports = {
	validateUsername,
	validatePassword,
	validateEmail,
	hashPassword,
	comparePassword,
	generateToken,
	verifyToken,
	registerUser,
	loginUser,
	getUserById,
	changePassword,
};
