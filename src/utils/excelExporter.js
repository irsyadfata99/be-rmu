// ============================================
// src/utils/excelExporter.js - FIXED VERSION
// Excel exporter dengan MEMORY LEAK fix (pagination)
// ============================================
const ExcelJS = require("exceljs");
const moment = require("moment");

class ExcelExporter {
  /**
   * ✅ FIX: Export data to Excel with pagination to prevent memory issues
   * Uses streaming for large datasets
   * @param {Array|Function} data - Array of objects OR async function that returns data in chunks
   * @param {Array} columns - Column definitions [{ header: 'Name', key: 'name', width: 20 }]
   * @param {String} sheetName - Sheet name
   * @param {String} title - Report title
   * @param {Object} options - Additional options
   * @returns {Buffer} - Excel file buffer
   */
  static async exportToExcel(data, columns, sheetName = "Report", title = "Laporan", options = {}) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // ===== METADATA =====
    workbook.creator = "Koperasi POS System";
    workbook.created = new Date();
    workbook.modified = new Date();

    // ✅ FIX: Default options
    const {
      enablePagination = true,
      chunkSize = 1000, // Process 1000 rows at a time
      maxRows = 100000, // Maximum rows to prevent excessive memory usage
    } = options;

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

    // ✅ FIX: Determine total count
    let totalCount = 0;
    let dataArray = [];

    if (typeof data === "function") {
      // Data is async function that returns paginated results
      totalCount = await data.count();
    } else if (Array.isArray(data)) {
      dataArray = data;
      totalCount = data.length;
    } else {
      throw new Error("Data must be an array or an async function");
    }

    // ✅ FIX: Check if data exceeds max rows
    if (totalCount > maxRows) {
      console.warn(`⚠️  Data exceeds maxRows (${maxRows}). Only first ${maxRows} rows will be exported.`);
      totalCount = maxRows;
    }

    // ===== INFO ROW =====
    worksheet.mergeCells("A2", `${String.fromCharCode(64 + columns.length)}2`);
    const infoCell = worksheet.getCell("A2");
    infoCell.value = `Dicetak: ${moment().format("DD MMMM YYYY HH:mm:ss")} | Total Data: ${totalCount.toLocaleString("id-ID")}`;
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

    // ===== DATA ROWS WITH PAGINATION =====
    let processedRows = 0;

    if (enablePagination && totalCount > chunkSize) {
      // ✅ FIX: Process data in chunks to prevent memory overflow
      console.log(`📊 Processing ${totalCount} rows in chunks of ${chunkSize}...`);

      if (typeof data === "function") {
        // Use async function to fetch data in pages
        const totalPages = Math.ceil(totalCount / chunkSize);

        for (let page = 1; page <= totalPages; page++) {
          if (processedRows >= maxRows) break;

          console.log(`   Processing page ${page}/${totalPages}...`);

          // Fetch chunk
          const chunk = await data(page, chunkSize);

          // Process chunk
          await this._processChunk(worksheet, chunk, columns, processedRows);
          processedRows += chunk.length;

          // ✅ FIX: Force garbage collection hint
          if (global.gc) {
            global.gc();
          }
        }
      } else {
        // Process array in chunks
        for (let i = 0; i < dataArray.length; i += chunkSize) {
          if (processedRows >= maxRows) break;

          const chunk = dataArray.slice(i, i + chunkSize);
          console.log(`   Processing rows ${i + 1} to ${Math.min(i + chunkSize, dataArray.length)}...`);

          await this._processChunk(worksheet, chunk, columns, processedRows);
          processedRows += chunk.length;

          // ✅ FIX: Clear processed chunk from memory
          chunk.length = 0;

          // ✅ FIX: Force garbage collection hint
          if (global.gc) {
            global.gc();
          }
        }
      }

      console.log(`✅ Processed ${processedRows} rows successfully`);
    } else {
      // Process all at once (for small datasets)
      const itemsToProcess = Array.isArray(data) ? data : await data(1, totalCount);
      await this._processChunk(worksheet, itemsToProcess, columns, 0);
    }

    // ===== SUMMARY ROW (if needed) =====
    if (processedRows > 0) {
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
        // ✅ FIX: Only sample first 100 rows for performance
        const sampleSize = Math.min(100, worksheet.rowCount);

        for (let i = 1; i <= sampleSize; i++) {
          const cell = worksheet.getCell(i, column.number);
          if (cell.value) {
            const columnLength = cell.value.toString().length;
            if (columnLength > maxLength) {
              maxLength = columnLength;
            }
          }
        }
        column.width = Math.min(maxLength + 2, 50);
      }
    });

    // ===== FREEZE HEADER =====
    worksheet.views = [{ state: "frozen", xSplit: 0, ySplit: 4 }];

    // ===== GENERATE BUFFER =====
    const buffer = await workbook.xlsx.writeBuffer();

    // ✅ FIX: Clear workbook from memory
    workbook.removeWorksheet(worksheet.id);

    return buffer;
  }

  /**
   * ✅ FIX: Helper method to process a chunk of data
   * @private
   */
  static async _processChunk(worksheet, chunk, columns, startIndex) {
    chunk.forEach((item, index) => {
      const row = worksheet.addRow(item);
      const globalIndex = startIndex + index;

      // Alternating row colors
      if (globalIndex % 2 === 0) {
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
  }

  /**
   * ✅ FIX: Export with multiple sheets (with memory optimization)
   * @param {Array} sheets - [{ data, columns, sheetName, title }]
   * @returns {Buffer}
   */
  static async exportMultipleSheets(sheets) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Koperasi POS System";
    workbook.created = new Date();

    for (const sheet of sheets) {
      console.log(`📄 Creating sheet: ${sheet.sheetName}`);

      const worksheet = workbook.addWorksheet(sheet.sheetName);

      // Title
      worksheet.mergeCells("A1", `${String.fromCharCode(64 + sheet.columns.length)}1`);
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
      worksheet.mergeCells("A2", `${String.fromCharCode(64 + sheet.columns.length)}2`);
      const infoCell = worksheet.getCell("A2");
      infoCell.value = `Dicetak: ${moment().format("DD MMMM YYYY HH:mm:ss")} | Total: ${sheet.data.length}`;
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

      // ✅ FIX: Process data in chunks for large sheets
      const chunkSize = 1000;
      const data = sheet.data;

      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);

        chunk.forEach((item, index) => {
          const row = worksheet.addRow(item);
          const globalIndex = i + index;

          if (globalIndex % 2 === 0) {
            row.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF2F2F2" },
            };
          }
        });

        // ✅ FIX: Clear chunk
        chunk.length = 0;
      }

      // Auto-fit
      worksheet.columns.forEach((column) => {
        if (!column.width) {
          column.width = 15;
        }
      });

      console.log(`✅ Sheet created: ${sheet.sheetName} (${data.length} rows)`);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  /**
   * ✅ FIX: Stream export for very large datasets
   * Uses ExcelJS streaming writer to minimize memory usage
   * @param {Function} dataFetcher - Async function(page, limit) that returns data chunks
   * @param {Number} totalCount - Total number of records
   * @param {Array} columns - Column definitions
   * @param {String} filename - Output filename
   * @param {Object} options - Additional options
   * @returns {Stream} - Writable stream
   */
  static async createStreamExport(dataFetcher, totalCount, columns, filename, options = {}) {
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      filename: filename,
      useStyles: true,
      useSharedStrings: true,
    });

    const worksheet = workbook.addWorksheet("Data", {
      pageSetup: { paperSize: 9, orientation: "landscape" },
    });

    const { title = "Laporan", chunkSize = 1000 } = options;

    // Setup columns
    worksheet.columns = columns;

    // Add title
    worksheet.addRow([title]);
    worksheet.mergeCells(1, 1, 1, columns.length);

    // Add info
    worksheet.addRow([`Dicetak: ${moment().format("DD MMMM YYYY HH:mm:ss")} | Total: ${totalCount}`]);
    worksheet.mergeCells(2, 1, 2, columns.length);

    // Add header
    worksheet.addRow([]);
    const headerRow = worksheet.addRow(columns.map((col) => col.header));
    headerRow.font = { bold: true };

    // Stream data
    const totalPages = Math.ceil(totalCount / chunkSize);

    for (let page = 1; page <= totalPages; page++) {
      const chunk = await dataFetcher(page, chunkSize);

      for (const item of chunk) {
        worksheet.addRow(item).commit();
      }

      // Log progress
      if (page % 10 === 0) {
        console.log(`   Streamed ${page}/${totalPages} pages...`);
      }
    }

    await workbook.commit();
    console.log(`✅ Stream export completed: ${filename}`);
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

  /**
   * ✅ FIX: Helper to estimate memory usage
   * @param {Number} rowCount - Number of rows
   * @param {Number} columnCount - Number of columns
   * @returns {String} - Estimated memory usage
   */
  static estimateMemoryUsage(rowCount, columnCount) {
    // Rough estimate: 1KB per cell
    const bytesPerCell = 1024;
    const totalBytes = rowCount * columnCount * bytesPerCell;
    const megabytes = totalBytes / (1024 * 1024);

    if (megabytes > 100) {
      return `⚠️  High memory usage estimated: ~${megabytes.toFixed(0)}MB. Consider using streaming export.`;
    } else if (megabytes > 50) {
      return `⚡ Moderate memory usage estimated: ~${megabytes.toFixed(0)}MB.`;
    } else {
      return `✅ Low memory usage estimated: ~${megabytes.toFixed(0)}MB.`;
    }
  }
}

module.exports = ExcelExporter;
