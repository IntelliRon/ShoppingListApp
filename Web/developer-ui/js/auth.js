/**
 * Authentication Module
 * Handles login, logout, and session management for developer dashboard
 */

const AuthModule = (() => {
	const API_URL = "http://localhost:3000/api/v1";
	const TOKEN_KEY = "dev_token";
	const USER_KEY = "dev_user";

	/**
	 * Login with username and password
	 */
	async function login(username, password) {
		try {
			const response = await fetch(`${API_URL}/auth/login`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ username, password }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error?.message || "Login failed");
			}

			// Store token and user info
			localStorage.setItem(TOKEN_KEY, data.data.token);
			localStorage.setItem(
				USER_KEY,
				JSON.stringify({
					userId: data.data.userId,
					username: data.data.username,
					is_developer: data.data.is_developer,
				})
			);

			return { success: true, data };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	/**
	 * Logout user
	 */
	async function logout() {
		try {
			const token = getToken();
			if (!token) {
				clearSession();
				return { success: true };
			}

			await fetch(`${API_URL}/auth/logout`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			clearSession();
			return { success: true };
		} catch (error) {
			// Clear session even if logout request fails
			clearSession();
			return { success: true };
		}
	}

	/**
	 * Get stored token
	 */
	function getToken() {
		return localStorage.getItem(TOKEN_KEY);
	}

	/**
	 * Get stored user info
	 */
	function getUser() {
		const userStr = localStorage.getItem(USER_KEY);
		return userStr ? JSON.parse(userStr) : null;
	}

	/**
	 * Check if user is authenticated
	 */
	function isAuthenticated() {
		const token = getToken();
		const user = getUser();
		return !!(token && user && user.is_developer);
	}

	/**
	 * Clear session
	 */
	function clearSession() {
		localStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(USER_KEY);
	}

	/**
	 * Add authorization header to fetch requests
	 */
	function authFetch(url, options = {}) {
		const token = getToken();
		if (!token) {
			return fetch(url, options);
		}

		const headers = {
			...options.headers,
			Authorization: `Bearer ${token}`,
		};

		return fetch(url, { ...options, headers });
	}

	return {
		login,
		logout,
		getToken,
		getUser,
		isAuthenticated,
		clearSession,
		authFetch,
	};
})();
