// ============================================
// 3. src/controllers/authController.js
// ============================================
const User = require("../models/User");
const ApiResponse = require("../utils/response");
const jwt = require("jsonwebtoken");

class AuthController {
  // POST /api/auth/register - Register new user (Only ADMIN can create users)
  static async register(req, res, next) {
    try {
      const { username, email, name, password, role } = req.body;

      // Validation
      if (!username || !email || !name || !password) {
        return ApiResponse.error(res, "Semua field harus diisi", 422, {
          username: !username ? ["Username harus diisi"] : undefined,
          email: !email ? ["Email harus diisi"] : undefined,
          name: !name ? ["Nama harus diisi"] : undefined,
          password: !password ? ["Password harus diisi"] : undefined,
        });
      }

      // Check if username exists
      const existingUsername = await User.findOne({ where: { username } });
      if (existingUsername) {
        return ApiResponse.error(res, "Username sudah digunakan", 422, {
          username: ["Username sudah digunakan"],
        });
      }

      // Check if email exists
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        return ApiResponse.error(res, "Email sudah digunakan", 422, {
          email: ["Email sudah digunakan"],
        });
      }

      // Create user
      const user = await User.create({
        username,
        email,
        name,
        password,
        role: role || "KASIR", // Default KASIR
      });

      return ApiResponse.success(
        res,
        {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
        },
        "User berhasil didaftarkan",
        201
      );
    } catch (error) {
      next(error);
    }
  }

  // POST /api/auth/login - Login user
  static async login(req, res, next) {
    try {
      const { username, password } = req.body;

      // Validation
      if (!username || !password) {
        return ApiResponse.error(res, "Username dan password harus diisi", 422, {
          username: !username ? ["Username harus diisi"] : undefined,
          password: !password ? ["Password harus diisi"] : undefined,
        });
      }

      // Find user by username
      const user = await User.findOne({ where: { username } });

      if (!user) {
        return ApiResponse.error(res, "Username atau password salah", 401);
      }

      // Check if user is active
      if (!user.isActive) {
        return ApiResponse.error(res, "User tidak aktif", 403);
      }

      // Compare password
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return ApiResponse.error(res, "Username atau password salah", 401);
      }

      // Generate JWT token
      const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

      return ApiResponse.success(
        res,
        {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            role: user.role,
            isActive: user.isActive,
          },
        },
        "Login berhasil"
      );
    } catch (error) {
      next(error);
    }
  }

  // GET /api/auth/me - Get current user info
  static async me(req, res, next) {
    try {
      const user = req.user;

      return ApiResponse.success(
        res,
        {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        "User info berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  // POST /api/auth/change-password - Change password
  static async changePassword(req, res, next) {
    try {
      const { oldPassword, newPassword } = req.body;
      const user = req.user;

      // Validation
      if (!oldPassword || !newPassword) {
        return ApiResponse.error(res, "Password lama dan baru harus diisi", 422);
      }

      if (newPassword.length < 6) {
        return ApiResponse.error(res, "Password baru minimal 6 karakter", 422);
      }

      // Verify old password
      const isOldPasswordValid = await user.comparePassword(oldPassword);

      if (!isOldPasswordValid) {
        return ApiResponse.error(res, "Password lama salah", 401);
      }

      // Update password
      await user.update({ password: newPassword });

      return ApiResponse.success(res, null, "Password berhasil diubah");
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
