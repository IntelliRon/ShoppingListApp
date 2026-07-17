/**
 * Developer Dashboard - Main Application
 * Manages page navigation, authentication, and configuration UI
 */

/**
 * Wait for required modules to be loaded
 */
function waitForModules() {
	return new Promise((resolve) => {
		if (typeof AuthModule !== "undefined" && typeof ConfigModule !== "undefined") {
			resolve();
			return;
		}
		const checkInterval = setInterval(() => {
			if (typeof AuthModule !== "undefined" && typeof ConfigModule !== "undefined") {
				clearInterval(checkInterval);
				resolve();
			}
		}, 10);
	});
}

const App = (() => {
	let currentConfig = null;
	let lastStatusReloadTime = 0;
	const STATUS_RELOAD_COOLDOWN = 5000; // 5 seconds
	let statusCooldownTimer = null;

	/**
	 * Initialize the application
	 */
	async function init() {
		// Always attach event listeners for login form and password toggle
		attachEventListeners();

		// Check if user is authenticated
		if (!AuthModule.isAuthenticated()) {
			showLoginModal();
			return;
		}

		hideLoginModal();
		updateUserInfo();
		await loadConfigPage();
	}

	/**
	 * Show login modal
	 */
	function showLoginModal() {
		const modal = document.getElementById("login-modal");
		const app = document.getElementById("app");
		if (modal) {
			modal.classList.add("active");
		}
		if (app) {
			app.style.display = "none";
		}
	}

	/**
	 * Hide login modal
	 */
	function hideLoginModal() {
		const modal = document.getElementById("login-modal");
		const app = document.getElementById("app");
		if (modal) {
			modal.classList.remove("active");
		}
		if (app) {
			app.style.display = "grid";
		}
	}

	/**
	 * Update user info display
	 */
	function updateUserInfo() {
		const userInfo = document.getElementById("user-info");
		const user = AuthModule.getUser();

		if (user && userInfo) {
			userInfo.textContent = `Welcome, ${user.username}`;
		}
	}

	/**
	 * Toggle password visibility
	 */
	function handleTogglePassword(e) {
		e.preventDefault();
		const passwordInput = document.getElementById("password");
		const iconShow = document.getElementById("icon-show");
		const iconHide = document.getElementById("icon-hide");

		if (passwordInput.type === "password") {
			passwordInput.type = "text";
			iconShow.classList.add("hidden");
			iconHide.classList.remove("hidden");
		} else {
			passwordInput.type = "password";
			iconShow.classList.remove("hidden");
			iconHide.classList.add("hidden");
		}
	}

	/**
	 * Attach event listeners
	 */
	function attachEventListeners() {
		// Login form
		const loginForm = document.getElementById("login-form");
		if (loginForm) {
			loginForm.addEventListener("submit", handleLogin);
		}

		// Password toggle
		const toggleBtn = document.getElementById("toggle-password");
		if (toggleBtn) {
			toggleBtn.addEventListener("click", handleTogglePassword);
		}

		// Logout button
		const logoutBtn = document.getElementById("logout-btn");
		if (logoutBtn) {
			logoutBtn.addEventListener("click", handleLogout);
		}

		// Status reload button
		const reloadStatusBtn = document.getElementById("reload-status-btn");
		if (reloadStatusBtn) {
			reloadStatusBtn.addEventListener("click", handleReloadStatus);
		}

		// Navigation links
		const navLinks = document.querySelectorAll(".nav-link:not(.logout)");
		navLinks.forEach((link) => {
			link.addEventListener("click", handleNavigation);
		});

		// Config buttons
		const saveBtn = document.getElementById("save-config-btn");
		if (saveBtn) {
			saveBtn.addEventListener("click", handleSaveConfig);
		}

		const reloadBtn = document.getElementById("reload-config-btn");
		if (reloadBtn) {
			reloadBtn.addEventListener("click", handleReloadConfig);
		}
	}

	/**
	 * Handle login form submission
	 */
	async function handleLogin(e) {
		e.preventDefault();

		const username = document.getElementById("username").value;
		const password = document.getElementById("password").value;
		const errorDiv = document.getElementById("login-error");

		// Clear previous errors
		errorDiv.textContent = "";
		errorDiv.style.display = "none";

		if (!username || !password) {
			errorDiv.textContent = "Please enter username and password";
			errorDiv.style.display = "block";
			return;
		}

		try {
			const result = await AuthModule.login(username, password);

			if (!result.success) {
				errorDiv.textContent = result.error || "Login failed";
				errorDiv.style.display = "block";
				return;
			}

			// Check if user is developer
			const user = AuthModule.getUser();
			if (!user || !user.is_developer) {
				AuthModule.clearSession();
				errorDiv.textContent = "Only developers can access this dashboard";
				errorDiv.style.display = "block";
				return;
			}
		} catch (err) {
			errorDiv.textContent = "An error occurred during login. Please try again.";
			errorDiv.style.display = "block";
			return;
		}

		// Reset form
		document.getElementById("login-form").reset();
		errorDiv.textContent = "";

		// Initialize app
		init();
	}

	/**
	 * Handle logout
	 */
	async function handleLogout(e) {
		e.preventDefault();

		await AuthModule.logout();
		showLoginModal();
	}

	/**
	 * Handle navigation between pages
	 */
	function handleNavigation(e) {
		e.preventDefault();

		const page = e.target.dataset.page;
		if (!page) return;

		// Update active nav link
		document.querySelectorAll(".nav-link").forEach((link) => {
			link.classList.remove("active");
		});
		e.target.classList.add("active");

		// Show/hide pages
		document.querySelectorAll(".page").forEach((p) => {
			p.classList.remove("active");
		});

		const pageElement = document.getElementById(`${page}-page`);
		if (pageElement) {
			pageElement.classList.add("active");

			// Load page data if needed
			if (page === "config") {
				loadConfigPage();
			} else if (page === "status") {
				loadStatusPage();
			}
		}
	}

	/**
	 * Load configuration page
	 */
	async function loadConfigPage() {
		const result = await ConfigModule.fetchConfig();

		if (!result.success) {
			showError("Failed to load configuration: " + result.error);
			return;
		}

		currentConfig = result.config;
		ConfigModule.renderConfigForm(currentConfig);
	}

	/**
	 * Start cooldown timer for status reload button
	 */
	function startStatusCooldownTimer() {
		const reloadBtn = document.getElementById("reload-status-btn");
		let remainingMs = STATUS_RELOAD_COOLDOWN;

		// Clear any existing timer
		if (statusCooldownTimer) {
			clearInterval(statusCooldownTimer);
		}

		reloadBtn.disabled = true;
		// Show initial countdown
		updateStatusButtonCountdown(reloadBtn, remainingMs);

		statusCooldownTimer = setInterval(() => {
			remainingMs -= 1000;
			if (remainingMs <= 0) {
				clearInterval(statusCooldownTimer);
				statusCooldownTimer = null;
				reloadBtn.disabled = false;
				reloadBtn.textContent = "Reload Status";
			} else {
				updateStatusButtonCountdown(reloadBtn, remainingMs);
			}
		}, 1000);
	}

	/**
	 * Update status button with countdown
	 */
	function updateStatusButtonCountdown(btn, remainingMs) {
		const remainingSeconds = Math.ceil(remainingMs / 1000);
		btn.textContent = `Wait ${remainingSeconds}s...`;
	}

	/**
	 * Reload status page
	 */
	async function handleReloadStatus() {
		const reloadBtn = document.getElementById("reload-status-btn");

		// Check if button is disabled (in cooldown)
		if (reloadBtn.disabled) {
			return;
		}

		lastStatusReloadTime = Date.now();
		reloadBtn.disabled = true;
		reloadBtn.textContent = "Loading...";

		await loadStatusPage();

		// Start the cooldown timer
		startStatusCooldownTimer();
	}

	/**
	 * Load status page
	 */
	async function loadStatusPage() {
		const statusInfo = document.getElementById("status-info");
		if (!statusInfo) return;

		try {
			const response = await AuthModule.authFetch("http://localhost:3000/api/v1/health");
			const data = await response.json();

			if (data.success) {
				// Clear previous content
				statusInfo.innerHTML = "";

				// Create status items using DOM methods to prevent XSS
				const createStatusItem = (label, value) => {
					const div = document.createElement("div");
					div.className = "status-item";
					const strong = document.createElement("strong");
					strong.textContent = label + ":";
					div.appendChild(strong);
					div.appendChild(document.createTextNode(` ${value}`));
					return div;
				};

				statusInfo.appendChild(createStatusItem("Status", data.data.status));
				statusInfo.appendChild(createStatusItem("Uptime", formatUptime(data.data.uptime)));
				statusInfo.appendChild(createStatusItem("Environment", data.data.environment));
				statusInfo.appendChild(createStatusItem("Database", data.data.checks.database));
				statusInfo.appendChild(createStatusItem("CSV Access", data.data.checks.csvAccess));
			} else {
				statusInfo.innerHTML = "<p>Server is unhealthy</p>";
			}
		} catch (error) {
			showError("Failed to load server status: " + error.message);
		}
	}

	/**
	 * Handle save configuration
	 */
	async function handleSaveConfig() {
		const updates = {};
		let hasValidationError = false;

		// Collect all form values with validation
		document.querySelectorAll("[data-config-key]").forEach((input) => {
			// Stop processing if validation error already found
			if (hasValidationError) return;

			const key = input.dataset.configKey;
			let value = input.value;

			// Type conversion and validation
			if (input.type === "number") {
				value = parseInt(value, 10);

				// Basic sanity checks (backend will do full validation)
				if (Number.isNaN(value)) {
					showError(`Invalid number value for ${key}`);
					hasValidationError = true;
					return;
				}

				if (key.includes("port") && (value < 1 || value > 65535)) {
					showError(`Port must be between 1 and 65535`);
					hasValidationError = true;
					return;
				}

				if (key.includes("bcrypt_rounds") && (value < 4 || value > 15)) {
					showError(`Bcrypt rounds must be between 4 and 15`);
					hasValidationError = true;
					return;
				}

				if (key.includes("password_min_length") && (value < 4 || value > 128)) {
					showError(`Password min length must be between 4 and 128`);
					hasValidationError = true;
					return;
				}

				if (key.startsWith("limits.")) {
					// Mirror backend per-key validation (from developerController.js)
					if (key === "limits.max_username_length") {
						// Username length must be between 3 and 255 (min 3 enforced in authService)
						if (value < 3 || value > 255) {
							showError(`max_username_length must be between 3 and 255`);
							hasValidationError = true;
							return;
						}
					} else if (
						key === "limits.max_list_name_length" ||
						key === "limits.max_item_name_length" ||
						key === "limits.max_section_name_length"
					) {
						// Name length limits: 1-1000
						if (value < 1 || value > 1000) {
							showError(`${key} must be between 1 and 1000`);
							hasValidationError = true;
							return;
						}
					} else {
						// Other limits (max_items_per_list, max_sections_per_list, max_lists_per_user): 1-10000
						if (value < 1 || value > 10000) {
							showError(`${key} must be between 1 and 10000`);
							hasValidationError = true;
							return;
						}
					}
				}

				if (
					key.startsWith("rateLimit.") &&
					key.includes("windowMs") &&
					(value < 1000 || value > 3600000)
				) {
					showError(`Rate limit window must be between 1000ms and 3600000ms`);
					hasValidationError = true;
					return;
				}

				if (
					key.startsWith("rateLimit.") &&
					key.includes("max") &&
					(value < 1 || value > 10000)
				) {
					showError(`Rate limit max must be between 1 and 10000`);
					hasValidationError = true;
					return;
				}
			} else if (input.type === "checkbox") {
				value = input.checked;
			}

			updates[key] = value;
		});

		// Stop if validation error occurred
		if (hasValidationError) {
			return;
		}

		// If server.port is being changed, save it to localStorage for subsequent API calls
		if (updates["server.port"]) {
			localStorage.setItem("api_port", updates["server.port"]);
		}

		const result = await ConfigModule.updateConfig(updates);

		if (!result.success) {
			showError("Failed to save configuration: " + result.error);
			return;
		}

		currentConfig = result.config;
		showSuccess("Configuration saved successfully");
	}

	/**
	 * Handle reload configuration
	 */
	async function handleReloadConfig() {
		const result = await ConfigModule.reloadConfig();

		if (!result.success) {
			showError("Failed to reload configuration: " + result.error);
			return;
		}

		currentConfig = result.config;
		ConfigModule.renderConfigForm(currentConfig);
		showSuccess("Configuration reloaded successfully");
	}

	/**
	 * Show toast notification
	 */
	function showToast(message, type = "success") {
		const container = document.getElementById("toast-container");
		const toast = document.createElement("div");
		toast.className = `toast ${type}`;
		toast.textContent = message;

		container.appendChild(toast);

		// Auto-remove after 3 seconds
		setTimeout(() => {
			toast.style.animation = "slideOut 0.3s ease-out forwards";
			setTimeout(() => toast.remove(), 300);
		}, 3000);
	}

	/**
	 * Show error message
	 */
	function showError(message) {
		showToast(`Error: ${message}`, "error");
	}

	/**
	 * Show success message
	 */
	function showSuccess(message) {
		showToast(message, "success");
	}

	/**
	 * Format uptime in human-readable format
	 */
	function formatUptime(seconds) {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		const parts = [];
		if (hours > 0) parts.push(`${hours}h`);
		if (minutes > 0) parts.push(`${minutes}m`);
		if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

		return parts.join(" ");
	}

	// Auto-initialize when DOM is ready and modules are loaded
	async function autoInit() {
		await waitForModules();
		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", init);
		} else {
			await init();
		}
	}

	autoInit();

	return {
		init,
	};
})();
