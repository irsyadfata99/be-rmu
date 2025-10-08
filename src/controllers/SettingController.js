// ============================================
// src/controllers/SettingController.js
// Controller untuk manage settings aplikasi
// ============================================
const Setting = require("../models/Setting");
const ApiResponse = require("../utils/response");

class SettingController {
  // ============================================
  // GET /api/settings - Get all settings
  // ============================================
  static async getAll(req, res, next) {
    try {
      const { group } = req.query;

      let settings;

      if (group) {
        // Get by group
        settings = await Setting.findAll({
          where: { group },
          order: [
            ["group", "ASC"],
            ["key", "ASC"],
          ],
        });
      } else {
        // Get all
        settings = await Setting.findAll({
          order: [
            ["group", "ASC"],
            ["key", "ASC"],
          ],
        });
      }

      // Group settings by group
      const grouped = {};
      settings.forEach((setting) => {
        if (!grouped[setting.group]) {
          grouped[setting.group] = [];
        }
        grouped[setting.group].push({
          key: setting.key,
          value: setting.getParsedValue(),
          type: setting.type,
          description: setting.description,
        });
      });

      return ApiResponse.success(
        res,
        {
          settings: grouped,
          raw: settings,
        },
        "Settings berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // GET /api/settings/:key - Get setting by key
  // ============================================
  static async getByKey(req, res, next) {
    try {
      const { key } = req.params;

      const setting = await Setting.findOne({ where: { key } });

      if (!setting) {
        return ApiResponse.notFound(res, "Setting tidak ditemukan");
      }

      return ApiResponse.success(
        res,
        {
          key: setting.key,
          value: setting.getParsedValue(),
          type: setting.type,
          group: setting.group,
          description: setting.description,
        },
        "Setting berhasil diambil"
      );
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // PUT /api/settings/:key - Update setting
  // ============================================
  static async update(req, res, next) {
    try {
      const { key } = req.params;
      const { value, type, group, description } = req.body;

      // Validation
      if (value === undefined || value === null) {
        return ApiResponse.error(res, "Value harus diisi", 422);
      }

      const setting = await Setting.findOne({ where: { key } });

      if (!setting) {
        // Create new setting if not exists
        const newSetting = await Setting.set(
          key,
          value,
          type || "TEXT",
          group || "GENERAL",
          description
        );

        return ApiResponse.created(
          res,
          {
            key: newSetting.key,
            value: newSetting.getParsedValue(),
            type: newSetting.type,
            group: newSetting.group,
            description: newSetting.description,
          },
          "Setting berhasil dibuat"
        );
      }

      // Update existing setting
      const stringValue =
        typeof value === "object" ? JSON.stringify(value) : String(value);

      await setting.update({
        value: stringValue,
        ...(type && { type }),
        ...(group && { group }),
        ...(description !== undefined && { description }),
      });

      return ApiResponse.success(
        res,
        {
          key: setting.key,
          value: setting.getParsedValue(),
          type: setting.type,
          group: setting.group,
          description: setting.description,
        },
        "Setting berhasil diupdate"
      );
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // PUT /api/settings/bulk - Bulk update settings
  // ============================================
  static async bulkUpdate(req, res, next) {
    try {
      const { settings } = req.body;

      // Validation
      if (!settings || !Array.isArray(settings)) {
        return ApiResponse.error(res, "Settings harus berupa array", 422);
      }

      const results = [];

      for (const item of settings) {
        const { key, value, type, group, description } = item;

        if (!key || value === undefined) {
          continue;
        }

        try {
          const setting = await Setting.set(
            key,
            value,
            type || "TEXT",
            group || "GENERAL",
            description
          );

          results.push({
            key: setting.key,
            value: setting.getParsedValue(),
            success: true,
          });
        } catch (error) {
          results.push({
            key,
            error: error.message,
            success: false,
          });
        }
      }

      return ApiResponse.success(res, results, "Bulk update settings selesai");
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // POST /api/settings/initialize - Initialize default settings
  // ============================================
  static async initialize(req, res, next) {
    try {
      await Setting.initializeDefaults();

      const settings = await Setting.findAll({
        order: [
          ["group", "ASC"],
          ["key", "ASC"],
        ],
      });

      return ApiResponse.success(
        res,
        settings,
        "Default settings berhasil diinisialisasi"
      );
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // DELETE /api/settings/:key - Delete setting
  // ============================================
  static async delete(req, res, next) {
    try {
      const { key } = req.params;

      const setting = await Setting.findOne({ where: { key } });

      if (!setting) {
        return ApiResponse.notFound(res, "Setting tidak ditemukan");
      }

      await setting.destroy();

      return ApiResponse.success(res, { key }, "Setting berhasil dihapus");
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SettingController;
