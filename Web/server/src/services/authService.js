/**
 * Authentication Service
 * Handles user registration, login, password hashing, and JWT token generation
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const crypto = require("crypto");
const csvService = require("./csvService");
const configService = require("./configService");

// Handle uuid import (works with both CommonJS and ESM)
let uuidv4;
try {
	const uuidModule = require("uuid");
	uuidv4 = uuidModule.v4 || uuidModule.default?.v4;
} catch (error) {
	// Fallback to Node.js built-in crypto.randomUUID() for cryptographically secure IDs
	uuidv4 = () => crypto.randomUUID();
}

const USERS_FILE =
	process.env.TEST_USERS_FILE ||
	path.join(__dirname, "..", "..", configService.get("database.users_file"));

const BLACKLIST_FILE =
	process.env.TEST_BLACKLIST_FILE ||
	path.join(__dirname, "..", "..", configService.get("database.blacklist_file"));

/**
 * Validate username format
 */
function validateUsername(username) {
	const minLength = 3;
	const maxLength = configService.get("limits.max_username_length");
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
	const minLength = configService.get("auth.password_min_length");

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
	const rounds = configService.get("auth.bcrypt_rounds");
	return bcrypt.hash(password, rounds);
}

/**
 * Compare password with hash
 */
async function comparePassword(password, hash) {
	return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token with fixed expiry
 * Note: Token rotation is deferred to MVP-2
 * Tokens are issued once and expire after configService.get("auth.session_expiry_days") (default 30 days)
 * Requires JWT_SECRET env var in production
 */
function generateToken(userId) {
	const secret = process.env.JWT_SECRET || configService.get("auth.jwt_secret");
	const env = process.env.NODE_ENV || "development";

	// In production (not test or dev), JWT_SECRET MUST be explicitly set (not default)
	if (env === "production" && secret === configService.get("auth.jwt_secret")) {
		throw new Error(
			"FATAL: JWT_SECRET environment variable must be set in production. Using default secret is a critical security risk."
		);
	}

	const expiresIn = configService.get("auth.session_expiry_days") * 24 * 60 * 60; // Convert days to seconds

	return jwt.sign(
		{
			userId,
			jti: crypto.randomUUID(), // Unique token ID to prevent collision when logins happen in same second
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
		const secret = process.env.JWT_SECRET || configService.get("auth.jwt_secret");
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

	// Normalize email to lowercase for case-insensitive uniqueness
	const normalizedEmail = email.toLowerCase();

	// Hash password first (before any async file operations)
	const passwordHash = await hashPassword(password);

	// Create user record
	const userId = `u_${uuidv4()}`;
	const user = {
		user_id: userId,
		username,
		email: normalizedEmail,
		password_hash: passwordHash,
		is_developer: "false",
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};

	// Register with atomic duplicate check + insert under per-file lock
	// The entire read+check+write happens atomically in one enqueued operation
	await csvService.appendWithDuplicateCheck(USERS_FILE, [user], {
		usernameFn: (u) => u.username === username,
		emailFn: (u) => u.email === normalizedEmail,
	});

	// Generate token
	const token = generateToken(userId);

	return {
		user_id: userId,
		username,
		email: normalizedEmail,
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
	const expiresIn = configService.get("auth.session_expiry_days") * 24 * 60 * 60; // seconds

	return {
		user_id: user.user_id,
		username: user.username,
		email: user.email,
		is_developer: user.is_developer === "true",
		token,
		expires_in: expiresIn,
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
	// Validate new password first before performing read
	const validation = validatePassword(newPassword);
	if (!validation.valid) {
		throw new Error(validation.error);
	}

	// Hash new password
	const newPasswordHash = await hashPassword(newPassword);

	// Perform atomic read-verify-update under file lock
	await csvService.updateRecordsWithVerify(USERS_FILE, async (records) => {
		// Find user and verify old password
		const user = records.find((u) => u.user_id === userId);
		if (!user) {
			return { verified: false, error: "User not found" };
		}

		const passwordMatch = await comparePassword(oldPassword, user.password_hash);
		if (!passwordMatch) {
			return { verified: false, error: "Current password is incorrect" };
		}

		// Verification passed, return updated records
		const updated = records.map((u) =>
			u.user_id === userId
				? {
					...u,
					password_hash: newPasswordHash,
					updated_at: new Date().toISOString(),
				}
				: u
		);

		return { verified: true, updated };
	});
}

/**
 * Add token to blacklist to prevent reuse after logout
 */
async function blacklistToken(token) {
	// Decode token to get expiry time
	const decoded = jwt.decode(token);
	if (!decoded || !decoded.exp) {
		throw new Error("Invalid token format");
	}

	// Create blacklist record with token hash (don't store the actual token for security)
	const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
	const record = {
		token_hash: tokenHash,
		blacklisted_at: new Date().toISOString(),
		expires_at: new Date(decoded.exp * 1000).toISOString(), // JWT exp is in seconds
	};

	// Add to blacklist CSV
	await csvService.appendCSV(BLACKLIST_FILE, [record]);
}

/**
 * Check if token is in blacklist
 */
async function isTokenBlacklisted(token) {
	const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

	const blacklistedRecord = await csvService.findRecord(
		BLACKLIST_FILE,
		(record) => record.token_hash === tokenHash
	);

	return !!blacklistedRecord;
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
	blacklistToken,
	isTokenBlacklisted,
};
