// ============================================
// src/utils/excelExporter.js
// Utility untuk export data ke Excel
// ============================================
const ExcelJS = require("exceljs");
const moment = require("moment");

class ExcelExporter {
  /**
   * Export data to Excel with auto-styling
   * @param {Array} data - Array of objects
   * @param {Array} columns - Column definitions [{ header: 'Name', key: 'name', width: 20 }]
   * @param {String} sheetName - Sheet name
   * @param {String} title - Report title
   * @returns {Buffer} - Excel file buffer
   */
  static async exportToExcel(
    data,
    columns,
    sheetName = "Report",
    title = "Laporan"
  ) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // ===== METADATA =====
    workbook.creator = "Koperasi POS System";
    workbook.created = new Date();
    workbook.modified = new Date();

    // ===== TITLE ROW =====
    worksheet.mergeCells("A1", `${String.fromCharCode(64 + columns.length)}1`);
    const titleCell = worksheet.getCell("A1");
    titleCell.value = title;
    titleCell.font = {
      name: "Calibri",
      size: 16,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    worksheet.getRow(1).height = 30;

    // ===== INFO ROW =====
    worksheet.mergeCells("A2", `${String.fromCharCode(64 + columns.length)}2`);
    const infoCell = worksheet.getCell("A2");
    infoCell.value = `Dicetak: ${moment().format(
      "DD MMMM YYYY HH:mm:ss"
    )} | Total Data: ${data.length}`;
    infoCell.font = { name: "Calibri", size: 10, italic: true };
    infoCell.alignment = { vertical: "middle", horizontal: "center" };
    worksheet.getRow(2).height = 20;

    // ===== HEADER ROW =====
    worksheet.addRow([]); // Empty row
    worksheet.columns = columns;

    const headerRow = worksheet.getRow(4);
    headerRow.values = columns.map((col) => col.header);
    headerRow.font = {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2F5597" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 25;

    // Add borders to header
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // ===== DATA ROWS =====
    data.forEach((item, index) => {
      const row = worksheet.addRow(item);

      // Alternating row colors
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

        // Format numbers with comma separator
        if (typeof cell.value === "number" && cell.value > 1000) {
          cell.numFmt = "#,##0";
        }
      });

      row.alignment = { vertical: "middle" };
      row.height = 20;
    });

    // ===== SUMMARY ROW (if needed) =====
    if (data.length > 0) {
      const summaryRow = worksheet.addRow([]);
      summaryRow.font = { bold: true };
      summaryRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFEB3B" },
      };
    }

    // ===== AUTO-FIT COLUMNS =====
    worksheet.columns.forEach((column) => {
      if (!column.width) {
        let maxLength = 10;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(maxLength + 2, 50);
      }
    });

    // ===== FREEZE HEADER =====
    worksheet.views = [{ state: "frozen", xSplit: 0, ySplit: 4 }];

    // ===== GENERATE BUFFER =====
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  /**
   * Export with multiple sheets
   * @param {Array} sheets - [{ data, columns, sheetName, title }]
   * @returns {Buffer}
   */
  static async exportMultipleSheets(sheets) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Koperasi POS System";
    workbook.created = new Date();

    for (const sheet of sheets) {
      const worksheet = workbook.addWorksheet(sheet.sheetName);

      // Title
      worksheet.mergeCells(
        "A1",
        `${String.fromCharCode(64 + sheet.columns.length)}1`
      );
      const titleCell = worksheet.getCell("A1");
      titleCell.value = sheet.title;
      titleCell.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
      titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      titleCell.alignment = { vertical: "middle", horizontal: "center" };
      worksheet.getRow(1).height = 30;

      // Info
      worksheet.mergeCells(
        "A2",
        `${String.fromCharCode(64 + sheet.columns.length)}2`
      );
      const infoCell = worksheet.getCell("A2");
      infoCell.value = `Dicetak: ${moment().format("DD MMMM YYYY HH:mm:ss")}`;
      infoCell.font = { size: 10, italic: true };
      infoCell.alignment = { vertical: "middle", horizontal: "center" };

      // Header
      worksheet.addRow([]);
      worksheet.columns = sheet.columns;
      const headerRow = worksheet.getRow(4);
      headerRow.values = sheet.columns.map((col) => col.header);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2F5597" },
      };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };

      // Data
      sheet.data.forEach((item, index) => {
        const row = worksheet.addRow(item);
        if (index % 2 === 0) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF2F2F2" },
          };
        }
      });

      // Auto-fit
      worksheet.columns.forEach((column) => {
        if (!column.width) {
          column.width = 15;
        }
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  /**
   * Generate filename with timestamp
   * @param {String} prefix - Filename prefix
   * @returns {String}
   */
  static generateFilename(prefix = "Laporan") {
    const timestamp = moment().format("YYYYMMDD_HHmmss");
    return `${prefix}_${timestamp}.xlsx`;
  }
}

module.exports = ExcelExporter;
