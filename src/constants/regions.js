// ============================================
// src/constants/regions.js
// SINGLE SOURCE OF TRUTH untuk region mapping
// ============================================

/**
 * Mapping region codes ke region names
 * Digunakan di:
 * - MemberController.js
 * - Member.js model
 * - Semua seeders (seedMembers.js, seedMembersAdvanced.js, fixMemberData.js)
 */
const REGIONS = {
  BDG: "Bandung",
  KBG: "Kabupaten Bandung",
  KBB: "Kabupaten Bandung Barat",
  KBT: "Kabupaten Bandung Timur",
  CMH: "Cimahi",
  GRT: "Garut",
  KGU: "Kabupaten Garut Utara",
  KGS: "Kabupaten Garut Selatan",
  SMD: "Sumedang",
  TSM: "Tasikmalaya",
  SMI: "Kota Sukabumi",
  KSI: "Kabupaten Sukabumi",
  KSU: "Kabupaten Sukabumi Utara",
  CJR: "Cianjur",
  BGR: "Bogor",
  KBR: "Kabupaten Bogor",
  YMG: "Yamughni",
  PMB: "Pembina",
};

/**
 * Get all region codes
 * @returns {string[]} Array of region codes
 */
const getRegionCodes = () => Object.keys(REGIONS);

/**
 * Get all region names
 * @returns {string[]} Array of region names
 */
const getRegionNames = () => Object.values(REGIONS);

/**
 * Get region name by code
 * @param {string} code - Region code
 * @returns {string|null} Region name or null if not found
 */
const getRegionName = (code) => REGIONS[code] || null;

/**
 * Validate region code
 * @param {string} code - Region code to validate
 * @returns {boolean} True if valid
 */
const isValidRegionCode = (code) => code in REGIONS;

/**
 * Get regions as array of objects (for API response)
 * @returns {Array<{code: string, name: string}>}
 */
const getRegionsArray = () => {
  return Object.entries(REGIONS).map(([code, name]) => ({
    code,
    name,
  }));
};

module.exports = {
  REGIONS,
  getRegionCodes,
  getRegionNames,
  getRegionName,
  isValidRegionCode,
  getRegionsArray,
};
