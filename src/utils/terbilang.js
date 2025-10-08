// ============================================
// src/utils/terbilang.js
// Utility untuk convert angka ke terbilang (Indonesia)
// ============================================

/**
 * Angka satuan
 */
const satuan = [
  "",
  "Satu",
  "Dua",
  "Tiga",
  "Empat",
  "Lima",
  "Enam",
  "Tujuh",
  "Delapan",
  "Sembilan",
];

/**
 * Convert angka 1-19
 */
function convertLessThanTwenty(num) {
  if (num === 0) return "";
  if (num < 10) return satuan[num];
  if (num === 10) return "Sepuluh";
  if (num === 11) return "Sebelas";
  return satuan[num - 10] + " Belas";
}

/**
 * Convert angka 20-99
 */
function convertTens(num) {
  if (num < 20) return convertLessThanTwenty(num);
  const tens = Math.floor(num / 10);
  const ones = num % 10;
  return satuan[tens] + " Puluh" + (ones > 0 ? " " + satuan[ones] : "");
}

/**
 * Convert angka 100-999
 */
function convertHundreds(num) {
  if (num < 100) return convertTens(num);
  const hundreds = Math.floor(num / 100);
  const remainder = num % 100;
  const hundredText = hundreds === 1 ? "Seratus" : satuan[hundreds] + " Ratus";
  return hundredText + (remainder > 0 ? " " + convertTens(remainder) : "");
}

/**
 * Convert angka 1000-999999
 */
function convertThousands(num) {
  if (num < 1000) return convertHundreds(num);
  const thousands = Math.floor(num / 1000);
  const remainder = num % 1000;
  const thousandText =
    thousands === 1 ? "Seribu" : convertHundreds(thousands) + " Ribu";
  return thousandText + (remainder > 0 ? " " + convertHundreds(remainder) : "");
}

/**
 * Convert angka 1000000-999999999
 */
function convertMillions(num) {
  if (num < 1000000) return convertThousands(num);
  const millions = Math.floor(num / 1000000);
  const remainder = num % 1000000;
  return (
    convertHundreds(millions) +
    " Juta" +
    (remainder > 0 ? " " + convertThousands(remainder) : "")
  );
}

/**
 * Convert angka 1000000000-999999999999
 */
function convertBillions(num) {
  if (num < 1000000000) return convertMillions(num);
  const billions = Math.floor(num / 1000000000);
  const remainder = num % 1000000000;
  return (
    convertHundreds(billions) +
    " Miliar" +
    (remainder > 0 ? " " + convertMillions(remainder) : "")
  );
}

/**
 * Convert angka 1000000000000-999999999999999
 */
function convertTrillions(num) {
  if (num < 1000000000000) return convertBillions(num);
  const trillions = Math.floor(num / 1000000000000);
  const remainder = num % 1000000000000;
  return (
    convertHundreds(trillions) +
    " Triliun" +
    (remainder > 0 ? " " + convertBillions(remainder) : "")
  );
}

/**
 * Main function: Convert number to Indonesian words
 * @param {number} num - Number to convert
 * @param {boolean} includeRupiah - Include "Rupiah" suffix
 * @returns {string} - Number in words
 */
function terbilang(num, includeRupiah = true) {
  // Handle special cases
  if (num === 0) return includeRupiah ? "Nol Rupiah" : "Nol";
  if (num < 0) return "Minus " + terbilang(Math.abs(num), includeRupiah);

  // Round to nearest integer
  num = Math.round(num);

  // Convert
  let result = convertTrillions(num);

  // Add Rupiah suffix
  if (includeRupiah) {
    result += " Rupiah";
  }

  return result.trim();
}

/**
 * Format number to currency string
 * @param {number} num - Number to format
 * @returns {string} - Formatted currency (e.g., "Rp 1.513.000")
 */
function formatCurrency(num) {
  return (
    "Rp " +
    Math.round(num)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  );
}

/**
 * Parse currency string to number
 * @param {string} str - Currency string (e.g., "Rp 1.513.000")
 * @returns {number} - Number value
 */
function parseCurrency(str) {
  return parseFloat(str.replace(/[^0-9,-]/g, "").replace(",", ".")) || 0;
}

module.exports = {
  terbilang,
  formatCurrency,
  parseCurrency,
};
