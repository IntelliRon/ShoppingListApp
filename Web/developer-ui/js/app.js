/**
 * Developer Dashboard - Main Application
 * Manages page navigation, authentication, and configuration UI
 */

const App = (() => {
	let currentConfig = null;

	/**
	 * Initialize the application
	 */
	async function init() {
		// Check if user is authenticated
		if (!AuthModule.isAuthenticated()) {
			showLoginModal();
			return;
		}

		hideLoginModal();
		updateUserInfo();
		attachEventListeners();
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
	 * Attach event listeners
	 */
	function attachEventListeners() {
		// Login form
		const loginForm = document.getElementById("login-form");
		if (loginForm) {
			loginForm.addEventListener("submit", handleLogin);
		}

		// Logout button
		const logoutBtn = document.getElementById("logout-btn");
		if (logoutBtn) {
			logoutBtn.addEventListener("click", handleLogout);
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

		if (!username || !password) {
			errorDiv.textContent = "Please enter username and password";
			return;
		}

		const result = await AuthModule.login(username, password);

		if (!result.success) {
			errorDiv.textContent = result.error || "Login failed";
			return;
		}

		// Check if user is developer
		const user = AuthModule.getUser();
		if (!user.is_developer) {
			AuthModule.clearSession();
			errorDiv.textContent = "Only developers can access this dashboard";
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
	 * Load status page
	 */
	async function loadStatusPage() {
		const statusInfo = document.getElementById("status-info");
		if (!statusInfo) return;

		try {
			const response = await AuthModule.authFetch("http://localhost:3000/api/v1/health");
			const data = await response.json();

			if (data.success) {
				statusInfo.innerHTML = `
					<div class="status-item">
						<strong>Status:</strong> ${data.data.status}
					</div>
					<div class="status-item">
						<strong>Uptime:</strong> ${formatUptime(data.data.uptime)}
					</div>
					<div class="status-item">
						<strong>Environment:</strong> ${data.data.environment}
					</div>
					<div class="status-item">
						<strong>Database:</strong> ${data.data.checks.database}
					</div>
					<div class="status-item">
						<strong>CSV Access:</strong> ${data.data.checks.csvAccess}
					</div>
				`;
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

		// Collect all form values
		document.querySelectorAll("[data-config-key]").forEach((input) => {
			const key = input.dataset.configKey;
			let value = input.value;

			// Type conversion
			if (input.type === "number") {
				value = parseInt(value, 10);
			} else if (input.type === "checkbox") {
				value = input.checked;
			}

			updates[key] = value;
		});

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
	 * Show error message
	 */
	function showError(message) {
		// eslint-disable-next-line no-alert
		alert(`Error: ${message}`);
	}

	/**
	 * Show success message
	 */
	function showSuccess(message) {
		// eslint-disable-next-line no-alert
		alert(message);
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

	// Auto-initialize when DOM is ready
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}

	return {
		init,
	};
})();
