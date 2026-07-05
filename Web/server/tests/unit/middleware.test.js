/**
 * Middleware Unit Tests
 */

const authMiddleware = require("../../src/middleware/authMiddleware");
const authService = require("../../src/services/authService");

jest.mock("../../src/services/authService");

describe("Auth Middleware", () => {
	let req, res, next;

	beforeEach(() => {
		req = {
			headers: {},
		};
		res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
		};
		next = jest.fn();
		jest.clearAllMocks();
	});

	describe("requireAuth", () => {
		it("should call next() if token is valid", () => {
			req.headers.authorization = "Bearer valid.token.here";
			authService.verifyToken.mockReturnValue({
				userId: "u_123",
			});

			authMiddleware.requireAuth(req, res, next);

			expect(next).toHaveBeenCalled();
			expect(req.userId).toBe("u_123");
		});

		it("should return 401 if no authorization header", () => {
			req.headers.authorization = undefined;

			authMiddleware.requireAuth(req, res, next);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(next).not.toHaveBeenCalled();
		});

		it("should return 401 if authorization format is invalid", () => {
			req.headers.authorization = "InvalidFormat";

			authMiddleware.requireAuth(req, res, next);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(next).not.toHaveBeenCalled();
		});

		it("should return 401 if token is invalid", () => {
			req.headers.authorization = "Bearer invalid.token";
			authService.verifyToken.mockReturnValue(null);

			authMiddleware.requireAuth(req, res, next);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(next).not.toHaveBeenCalled();
		});

		it("should handle missing Bearer keyword", () => {
			req.headers.authorization = "NoBearer token";

			authMiddleware.requireAuth(req, res, next);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(next).not.toHaveBeenCalled();
		});
	});

	describe("optionalAuth", () => {
		it("should add userId if valid token provided", () => {
			req.headers.authorization = "Bearer valid.token";
			authService.verifyToken.mockReturnValue({
				userId: "u_123",
			});

			authMiddleware.optionalAuth(req, res, next);

			expect(req.userId).toBe("u_123");
			expect(next).toHaveBeenCalled();
		});

		it("should call next without userId if no token", () => {
			req.headers.authorization = undefined;

			authMiddleware.optionalAuth(req, res, next);

			expect(req.userId).toBeUndefined();
			expect(next).toHaveBeenCalled();
		});

		it("should call next without userId if token invalid", () => {
			req.headers.authorization = "Bearer invalid.token";
			authService.verifyToken.mockReturnValue(null);

			authMiddleware.optionalAuth(req, res, next);

			expect(req.userId).toBeUndefined();
			expect(next).toHaveBeenCalled();
		});
	});

	describe("requireDeveloper", () => {
		it("should return 401 if not authenticated", async () => {
			delete req.userId;

			await authMiddleware.requireDeveloper(req, res, next);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(next).not.toHaveBeenCalled();
		});

		it("should return 403 if user not developer", async () => {
			req.userId = "u_123";
			authService.getUserById.mockResolvedValue({
				user_id: "u_123",
				is_developer: false,
			});

			await authMiddleware.requireDeveloper(req, res, next);

			expect(res.status).toHaveBeenCalledWith(403);
			expect(next).not.toHaveBeenCalled();
		});

		it("should call next if user is developer", async () => {
			req.userId = "u_123";
			authService.getUserById.mockResolvedValue({
				user_id: "u_123",
				is_developer: true,
			});

			await authMiddleware.requireDeveloper(req, res, next);

			expect(next).toHaveBeenCalled();
		});

		it("should handle error fetching user", async () => {
			req.userId = "u_123";
			authService.getUserById.mockRejectedValue(new Error("DB error"));

			await authMiddleware.requireDeveloper(req, res, next);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(next).not.toHaveBeenCalled();
		});
	});
});
