// ============================================
// src/utils/excelExporter.js
// Utility untuk export data ke Excel menggunakan ExcelJS
// ============================================
const ExcelJS = require("exceljs");

class ExcelExporter {
  /**
   * Export data to Excel buffer
   * @param {Array} data - Array of objects to export
   * @param {Array} columns - Column definitions [{ header, key, width }]
   * @param {string} sheetName - Name of the worksheet
   * @param {string|object} titleOrOptions - Title string or options object
   * @returns {Promise<Buffer>} Excel file buffer
   */
  static async exportToExcel(data, columns, sheetName = "Data", titleOrOptions = {}) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // ✅ Handle both old (title as 4th param) and new (options object) formats
    const options = typeof titleOrOptions === "string" ? { title: titleOrOptions } : titleOrOptions;

    // ============================================
    // HEADER SECTION (if title provided)
    // ============================================
    let startRow = 1;

    if (options.title) {
      worksheet.mergeCells(`A1:${this.getColumnLetter(columns.length)}1`);
      const titleCell = worksheet.getCell("A1");
      titleCell.value = options.title;
      titleCell.font = { size: 16, bold: true };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      startRow = 3;
    }

    // Add export info
    if (options.title) {
      worksheet.getCell(`A2`).value = `Exported: ${new Date().toLocaleString("id-ID")}`;
      worksheet.getCell(`A2`).font = { size: 10, italic: true };
    }

    // ============================================
    // FILTER INFO (if provided)
    // ============================================
    if (options.filters && Object.keys(options.filters).length > 0) {
      startRow++;
      let filterText = "Filters: ";
      const filterParts = [];

      for (const [key, value] of Object.entries(options.filters)) {
        if (value) {
          filterParts.push(`${key}: ${value}`);
        }
      }

      filterText += filterParts.join(", ");
      worksheet.getCell(`A${startRow}`).value = filterText;
      worksheet.getCell(`A${startRow}`).font = { size: 10, italic: true };
      startRow += 2;
    } else if (options.title) {
      startRow++;
    }

    // ============================================
    // COLUMN HEADERS
    // ============================================
    worksheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || 15,
    }));

    // Style header row
    const headerRow = worksheet.getRow(startRow);
    headerRow.values = columns.map((col) => col.header);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.height = 20;

    // Add borders to header
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // ============================================
    // DATA ROWS
    // ============================================
    data.forEach((item, index) => {
      const row = worksheet.addRow(item);

      // Alternate row colors
      if (index % 2 === 0) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF2F2F2" },
        };
      }

      // Add borders
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFD3D3D3" } },
          left: { style: "thin", color: { argb: "FFD3D3D3" } },
          bottom: { style: "thin", color: { argb: "FFD3D3D3" } },
          right: { style: "thin", color: { argb: "FFD3D3D3" } },
        };

        // Format numbers
        if (typeof cell.value === "number") {
          cell.numFmt = "#,##0.00";
        }

        // Format dates
        if (cell.value instanceof Date) {
          cell.numFmt = "dd/mm/yyyy hh:mm";
        }
      });
    });

    // ============================================
    // SUMMARY/FOOTER (if provided)
    // ============================================
    if (options.summary) {
      const summaryRow = worksheet.addRow([]);
      summaryRow.height = 5;

      const summaryHeaderRow = worksheet.addRow(["SUMMARY"]);
      summaryHeaderRow.font = { bold: true, size: 12 };

      Object.entries(options.summary).forEach(([key, value]) => {
        const row = worksheet.addRow([key, value]);
        row.font = { bold: key.includes("Total") };
      });
    }

    // Auto-fit columns (backup if width not specified)
    worksheet.columns.forEach((column) => {
      if (!column.width) {
        let maxLength = 10;
        column.eachCell({ includeEmpty: false }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(maxLength + 2, 50);
      }
    });

    // ============================================
    // GENERATE BUFFER
    // ============================================
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  /**
   * Helper: Convert column number to letter (1 = A, 2 = B, etc)
   */
  static getColumnLetter(columnNumber) {
    let letter = "";
    while (columnNumber > 0) {
      const remainder = (columnNumber - 1) % 26;
      letter = String.fromCharCode(65 + remainder) + letter;
      columnNumber = Math.floor((columnNumber - 1) / 26);
    }
    return letter;
  }

  /**
   * Format currency for Excel
   */
  static formatCurrency(value) {
    return parseFloat(value || 0);
  }

  /**
   * Format date for Excel
   */
  static formatDate(date) {
    if (!date) return "";
    return new Date(date);
  }

  /**
   * Format status with color coding (returns object for conditional formatting)
   */
  static formatStatus(status) {
    const statusMap = {
      PAID: "✓ Lunas",
      PENDING: "⏳ Pending",
      PARTIAL: "⚠️ Cicilan",
      OVERDUE: "❌ Jatuh Tempo",
      CANCELLED: "🚫 Dibatalkan",
    };
    return statusMap[status] || status;
  }

  /**
   * ✅ Generate filename with timestamp
   * @param {string} baseName - Base filename (e.g., "Laporan_Return")
   * @returns {string} Filename with timestamp (e.g., "Laporan_Return_2025-01-11.xlsx")
   */
  static generateFilename(baseName) {
    const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    return `${baseName}_${timestamp}.xlsx`;
  }
}

module.exports = ExcelExporter;
