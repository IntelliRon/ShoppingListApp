/**
 * Configuration Module
 * Manages configuration display, editing, and API interactions
 */

const ConfigModule = (() => {
	const API_URL = "http://localhost:3000/api/v1/developer";

	/**
	 * Fetch current configuration from server
	 */
	async function fetchConfig() {
		try {
			const response = await AuthModule.authFetch(`${API_URL}/config`);

			if (!response.ok) {
				throw new Error("Failed to fetch configuration");
			}

			const data = await response.json();
			return { success: true, config: data.data };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	/**
	 * Update configuration values
	 */
	async function updateConfig(updates) {
		try {
			const response = await AuthModule.authFetch(`${API_URL}/config`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ updates }),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error?.message || "Failed to update configuration");
			}

			const data = await response.json();
			return { success: true, config: data.data.config };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	/**
	 * Reload configuration from server
	 */
	async function reloadConfig() {
		try {
			const response = await AuthModule.authFetch(`${API_URL}/config/reload`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				throw new Error("Failed to reload configuration");
			}

			const data = await response.json();
			return { success: true, config: data.data.config };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	/**
	 * Render configuration form
	 */
	function renderConfigForm(config) {
		const formElement = document.getElementById("config-form");
		if (!formElement) return;

		formElement.innerHTML = "";

		// Helper to create form group
		function createFormGroup(
			label,
			key,
			value,
			type = "text",
			options = null,
			constraints = {}
		) {
			const group = document.createElement("div");
			group.className = "form-group";

			const labelEl = document.createElement("label");
			labelEl.textContent = label;
			labelEl.htmlFor = key;

			let input;
			if (options) {
				// Create dropdown
				input = document.createElement("select");
				input.id = key;
				input.name = key;
				input.dataset.configKey = key;

				options.forEach((opt) => {
					const option = document.createElement("option");
					option.value = opt;
					option.textContent = opt;
					if (opt === value) {
						option.selected = true;
					}
					input.appendChild(option);
				});
			} else {
				// Create regular input
				input = document.createElement("input");
				input.type = type;
				input.id = key;
				input.name = key;
				input.value = value;
				input.dataset.configKey = key;

				// Apply constraints for number inputs
				if (type === "number") {
					if (constraints.min !== undefined) {
						input.min = constraints.min;
					}
					if (constraints.max !== undefined) {
						input.max = constraints.max;
					}
					if (constraints.step !== undefined) {
						input.step = constraints.step;
					}
				}
			}

			group.appendChild(labelEl);
			group.appendChild(input);

			return group;
		}

		// Render sections
		if (config.server) {
			const section = document.createElement("div");
			section.className = "config-section";
			const title = document.createElement("h3");
			title.textContent = "Server";
			section.appendChild(title);

			section.appendChild(
				createFormGroup("Port", "server.port", config.server.port, "number", null, {
					min: 1,
					max: 65535,
					step: 1,
				})
			);
			section.appendChild(
				createFormGroup("Environment", "server.env", config.server.env, "text", [
					"development",
					"production",
					"test",
					"staging",
				])
			);

			formElement.appendChild(section);
		}

		if (config.auth) {
			const section = document.createElement("div");
			section.className = "config-section";
			const title = document.createElement("h3");
			title.textContent = "Authentication";
			section.appendChild(title);

			section.appendChild(
				createFormGroup(
					"Bcrypt Rounds",
					"auth.bcrypt_rounds",
					config.auth.bcrypt_rounds,
					"number",
					null,
					{
						min: 4,
						max: 15,
						step: 1,
					}
				)
			);
			section.appendChild(
				createFormGroup(
					"Min Password Length",
					"auth.password_min_length",
					config.auth.password_min_length,
					"number",
					null,
					{
						min: 4,
						max: 128,
						step: 1,
					}
				)
			);
			section.appendChild(
				createFormGroup(
					"Session Expiry (days)",
					"auth.session_expiry_days",
					config.auth.session_expiry_days,
					"number",
					null,
					{
						min: 1,
						max: 365,
						step: 1,
					}
				)
			);
			section.appendChild(
				createFormGroup(
					"Session Rotation (days)",
					"auth.session_rotation_days",
					config.auth.session_rotation_days,
					"number",
					null,
					{
						min: 1,
						max: 365,
						step: 1,
					}
				)
			);

			formElement.appendChild(section);
		}

		if (config.limits) {
			const section = document.createElement("div");
			section.className = "config-section";
			const title = document.createElement("h3");
			title.textContent = "Limits";
			section.appendChild(title);

			section.appendChild(
				createFormGroup(
					"Max Items Per List",
					"limits.max_items_per_list",
					config.limits.max_items_per_list,
					"number",
					null,
					{
						min: 1,
						max: 10000,
						step: 1,
					}
				)
			);
			section.appendChild(
				createFormGroup(
					"Max Sections Per List",
					"limits.max_sections_per_list",
					config.limits.max_sections_per_list,
					"number",
					null,
					{
						min: 1,
						max: 1000,
						step: 1,
					}
				)
			);
			section.appendChild(
				createFormGroup(
					"Max Lists Per User",
					"limits.max_lists_per_user",
					config.limits.max_lists_per_user,
					"number",
					null,
					{
						min: 1,
						max: 1000,
						step: 1,
					}
				)
			);
			section.appendChild(
				createFormGroup(
					"Max Username Length",
					"limits.max_username_length",
					config.limits.max_username_length,
					"number",
					null,
					{
						min: 3,
						max: 255,
						step: 1,
					}
				)
			);
			section.appendChild(
				createFormGroup(
					"Max List Name Length",
					"limits.max_list_name_length",
					config.limits.max_list_name_length,
					"number",
					null,
					{
						min: 1,
						max: 255,
						step: 1,
					}
				)
			);
			section.appendChild(
				createFormGroup(
					"Max Item Name Length",
					"limits.max_item_name_length",
					config.limits.max_item_name_length,
					"number",
					null,
					{
						min: 1,
						max: 255,
						step: 1,
					}
				)
			);
			section.appendChild(
				createFormGroup(
					"Max Section Name Length",
					"limits.max_section_name_length",
					config.limits.max_section_name_length,
					"number",
					null,
					{
						min: 1,
						max: 255,
						step: 1,
					}
				)
			);

			formElement.appendChild(section);
		}

		if (config.rateLimit) {
			const section = document.createElement("div");
			section.className = "config-section";
			const title = document.createElement("h3");
			title.textContent = "Rate Limiting";
			section.appendChild(title);

			// Enabled checkbox
			const enableGroup = document.createElement("div");
			enableGroup.className = "form-group checkbox";
			const checkbox = document.createElement("input");
			checkbox.type = "checkbox";
			checkbox.id = "rateLimit.enabled";
			checkbox.name = "rateLimit.enabled";
			checkbox.checked = config.rateLimit.enabled;
			checkbox.dataset.configKey = "rateLimit.enabled";
			const label = document.createElement("label");
			label.htmlFor = "rateLimit.enabled";
			label.textContent = "Enabled";
			enableGroup.appendChild(checkbox);
			enableGroup.appendChild(label);
			section.appendChild(enableGroup);

			section.appendChild(
				createFormGroup(
					"Window (ms)",
					"rateLimit.windowMs",
					config.rateLimit.windowMs,
					"number",
					null,
					{
						min: 1000,
						max: 3600000,
						step: 1000,
					}
				)
			);
			section.appendChild(
				createFormGroup(
					"Max Requests",
					"rateLimit.max",
					config.rateLimit.max,
					"number",
					null,
					{
						min: 1,
						max: 10000,
						step: 1,
					}
				)
			);

			formElement.appendChild(section);
		}

		if (config.logging) {
			const section = document.createElement("div");
			section.className = "config-section";
			const title = document.createElement("h3");
			title.textContent = "Logging";
			section.appendChild(title);

			section.appendChild(
				createFormGroup("Log Level", "logging.level", config.logging.level, "text", [
					"debug",
					"info",
					"warn",
					"error",
				])
			);

			formElement.appendChild(section);
		}
	}

	return {
		fetchConfig,
		updateConfig,
		reloadConfig,
		renderConfigForm,
	};
})();
