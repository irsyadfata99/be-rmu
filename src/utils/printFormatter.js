// ============================================
// src/utils/printFormatter.js
// Utility untuk format template print (Dot Matrix & Thermal)
// ✅ OPTIMIZED: 9.5" x 11" continuous form, 15 items per page
// ✅ UPDATED: Thermal receipt 58mm x 150mm dengan font lebih besar
// ============================================
const { terbilang, formatCurrency } = require("./terbilang");
const Setting = require("../models/Setting");

/**
/**
 * Generate Dot Matrix Invoice HTML (Continuous Form - 9.5" x 11")
 * Format untuk transaksi KREDIT - Fixed page size, auto pagination
 */
async function generateDotMatrixInvoice(saleData) {
  const { invoiceNumber, saleDate, member, items, totalAmount, discountAmount, finalAmount, dpAmount, remainingDebt, dueDate, notes } = saleData;

  // Get settings
  const companyName = await Setting.get("company_name", "KOPERASI YAMUGHNI");
  const companyAddress = await Setting.get("company_address", "Jalan Kaum No. 2 Samping Terminal Cicaheum");
  const companyPhone = await Setting.get("company_phone", "Telepon (022) 20503787, 085877877877");
  const companyWebsite = await Setting.get("company_website", "www.yamughni.info");
  const companyCity = await Setting.get("company_city", "Bandung");
  const bankName = await Setting.get("bank_name", "MANDIRI");
  const bankAccount = await Setting.get("bank_account_number", "131-00-1687726-0");
  const bankAccountName = await Setting.get("bank_account_name", "KOPERASI YAMUGHNI");

  // Format date
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const date = new Date(saleDate);
  const formattedDate = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;

  // Format due date
  let formattedDueDate = "";
  if (dueDate) {
    const dueDateObj = new Date(dueDate);
    formattedDueDate = `${dueDateObj.getDate()} ${months[dueDateObj.getMonth()]} ${dueDateObj.getFullYear()}`;
  }

  // Member info
  const memberName = member ? member.fullName : "UMUM";
  const memberArea = member ? `${member.regionCode} (${member.regionName})` : "-";
  const memberId = member ? member.uniqueId : "-";

  // Generate ALL items in one go (no manual chunking)
  let itemsHtml = "";
  items.forEach((item, index) => {
    const no = String(index + 1);
    const qty = String(item.quantity);
    const unit = item.unit;
    const name = item.productName.substring(0, 35);
    const price = formatCurrency(item.sellingPrice);
    const subtotal = formatCurrency(item.subtotal);

    itemsHtml += `
      <tr>
        <td style="text-align: left;">${no}</td>
        <td style="text-align: center;">${qty}</td>
        <td style="text-align: left;">${unit}</td>
        <td style="text-align: left;">${name}</td>
        <td style="text-align: right; white-space: nowrap; padding-right: 18mm;">${price}</td>
        <td style="text-align: right; white-space: nowrap; padding-right: 18mm;">${subtotal}</td>
      </tr>
    `;
  });

  // Single page with all content (browser handles pagination automatically)
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Faktur ${invoiceNumber}</title>
  <style>
    /* ✅ FIXED PAGE SIZE: 9.5" x 11" - Browser auto-paginates */
    @page {
      size: 9.5in 11in;
      margin: 0;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Tahoma', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.15;
      margin: 0;
      padding: 3mm 5mm;
      width: 9.5in;
    }
    
    .header {
      text-align: center;
      line-height: 1.25;
      margin-bottom: 2mm;
    }
    
    .line {
      border-bottom: 1px solid #000;
      margin: 1.2mm 0;
    }
    
    .kepada-section {
      margin: 1.2mm 0;
    }
    
    .kepada-section table {
      border-collapse: collapse;
      font-size: 11pt;
      width: 100%;
    }
    
    .kepada-section td {
      padding: 0.6mm 0;
      border: none;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.2mm 0;
    }
    
    .items-table th,
    .items-table td {
      padding: 1.2mm 1mm;
      border: none;
    }
    
    .items-table thead th {
      font-weight: bold;
      border-bottom: 1px solid #000;
    }
    
    .items-table tbody tr {
      page-break-inside: avoid;
    }
    
    .footer-section {
      margin-top: 2.5mm;
      display: flex;
      justify-content: space-between;
      gap: 8mm;
      page-break-inside: avoid;
    }
    
    .signature {
      text-align: center;
      margin-top: 8mm;
    }
    
    .signature-line {
      margin-top: 10mm;
      border-top: 1px solid #000;
      width: 130px;
      display: inline-block;
    }
    
    .compact-spacing {
      margin: 0.8mm 0;
    }
    
    @media print {
      body {
        padding: 3mm 5mm;
      }
      
      button, .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div style="font-weight: bold; font-size: 12pt; margin-bottom: 2mm;">${companyName}</div>
    <div>${companyAddress}  ${companyPhone}</div>
    <div>${companyWebsite}</div>
  </div>
  <div class="line"></div>

  <!-- Faktur Info -->
  <table style="width: 100%; border: none; margin: 1mm 0;">
    <tr>
      <td style="width: 50%; border: none; text-align: left;">Faktur No.: ${invoiceNumber}</td>
      <td style="width: 50%; border: none; text-align: right; padding-right: 18mm;">${companyCity}, ${formattedDate}</td>
    </tr>
  </table>

  <div class="line"></div>

  <!-- Member Info -->
  <div class="kepada-section">
    <div style="margin-bottom: 1mm;">Kepada Yth.</div>
    <table>
      <tr>
        <td style="width: 18%;">ID MEMBER</td>
        <td style="width: 2%;">:</td>
        <td style="width: 30%;">${memberId}</td>
        <td style="width: 18%;">AREA</td>
        <td style="width: 2%;">:</td>
        <td style="width: 30%; padding-right: 18mm;">${memberArea}</td>
      </tr>
      <tr>
        <td>NAMA</td>
        <td>:</td>
        <td>${memberName}</td>
        <td>JATUH TEMPO</td>
        <td>:</td>
        <td style="padding-right: 18mm;">${dueDate ? formattedDueDate : "-"}</td>
      </tr>
    </table>
  </div>

  <div class="line"></div>

  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="text-align: left; width: 5%;">No</th>
        <th style="text-align: center; width: 8%;">Qty</th>
        <th style="text-align: left; width: 12%;">Satuan</th>
        <th style="text-align: left; width: 45%;">Nama Barang</th>
        <th style="text-align: right; width: 15%; white-space: nowrap; padding-right: 18mm;">Harga</th>
        <th style="text-align: right; width: 15%; white-space: nowrap; padding-right: 18mm;">Jumlah</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>
  <div class="line"></div>

  <!-- Footer -->
  <div class="compact-spacing"><strong>TERBILANG:</strong> ${terbilang(finalAmount)}</div>

  <div class="line"></div>

  <div class="footer-section">
    <div style="flex: 1.2;">
      <div class="compact-spacing">Setiap pembayaran harap ditransfer langsung ke rekening:</div>
      <div class="compact-spacing"><strong>${bankName}: ${bankAccount}</strong></div>
      <div class="compact-spacing"><strong>${bankAccountName}</strong></div>
    </div>
    <div style="flex: 0.8; padding-right: 18mm;">
      <div class="compact-spacing" style="text-align: right;">TOTAL FAKTUR  : ${formatCurrency(finalAmount)}</div>
      <div class="compact-spacing" style="text-align: right;">DOWN PAYMENT  : ${dpAmount > 0 ? formatCurrency(dpAmount) : "-"}</div>
      <div class="compact-spacing" style="text-align: right;"><strong>SISA KREDIT   : ${formatCurrency(remainingDebt)}</strong></div>
    </div>
  </div>

  ${notes ? `<div class="compact-spacing" style="margin-top: 2mm;">Catatan: ${notes}</div>` : ""}

  <div class="footer-section" style="margin-top: 5mm;">
    <div class="signature">
      <div>Yang menerima,</div>
      <div class="signature-line"></div>
    </div>
    <div class="signature">
      <div>Hormat Kami,</div>
      <div class="signature-line"></div>
    </div>
  </div>

  <div class="line" style="margin-top: 2mm;"></div>
  <div style="text-align: center; margin-top: 1mm;">======== Terima kasih ========</div>

<script type="text/javascript">
(function() {
  var printed = false;
  
  function doPrint() {
    if (!printed) {
      printed = true;
      window.print();
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(doPrint, 300);
    });
  } else {
    setTimeout(doPrint, 300);
  }
  
  window.onload = function() {
    setTimeout(doPrint, 500);
  };
  
  window.onafterprint = function() {
    setTimeout(function() {
      window.close();
    }, 100);
  };
})();
</script>
</body>
</html>`;

  return html;
}

/**
 * Generate Thermal Receipt HTML (58mm x auto)
 * Format untuk transaksi TUNAI - Layout sesuai standar thermal receipt
 */
async function generateThermalReceipt(saleData) {
  const { invoiceNumber, saleDate, member, user, items, totalAmount, discountAmount, finalAmount, paymentReceived, changeAmount } = saleData;

  // Get settings
  const companyName = await Setting.get("company_name", "KOPERASI YAMUGHNI");
  const companyAddress = await Setting.get("company_address", "Jl. Kaum No. 2 Cicaheum");
  const companyPhone = await Setting.get("company_phone", "Telp: (022) 20503787");

  // Format date & time
  const date = new Date(saleDate);
  const formattedDate = `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
  const formattedTime = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;

  // Member info
  const memberId = member ? member.uniqueId : "-";
  const memberName = member ? member.fullName : "UMUM";
  const kasirName = user ? user.name : "Kasir";

  // Generate items
  let itemsHtml = "";
  items.forEach((item) => {
    const name = item.productName.substring(0, 30);
    const qty = item.quantity;
    const price = formatCurrency(item.sellingPrice);
    const subtotal = formatCurrency(item.subtotal);

    itemsHtml += `<div class="item">
<div class="item-name">${name}</div>
<div class="item-detail">${qty} x ${price}<span class="item-subtotal">${subtotal}</span></div>
</div>\n`;
  });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Struk ${invoiceNumber}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: auto;
      text-rendering: optimizeLegibility;
    }
    
    html, body {
      width: 80mm;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 14pt;
      font-weight: 600;
      line-height: 1.3;
      padding: 3mm 0mm 3mm 0mm;
      color: #000;
      background: #fff;
      text-align: center;
    }
    
    .wrapper {
      max-width: 72mm;
      margin: 0 auto;
      padding: 0;
    }
    
    .header {
      font-weight: 900;
      font-size: 16pt;
      margin-bottom: 2px;
      letter-spacing: 0.3px;
    }
    
    .subheader {
      font-size: 13pt;
      font-weight: 600;
      line-height: 1.2;
      margin-bottom: 1px;
    }
    
    .datetime {
      font-size: 13pt;
      font-weight: 600;
      margin: 3px 0 4px 0;
    }
    
    .line {
      border-bottom: 1px dashed #000;
      margin: 3px 0;
      width: 100%;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 12pt;
      font-weight: 600;
      margin: 2px 0;
      text-align: left;
      gap: 5px;
    }
    
    .info-label {
      flex: 0 0 auto;
      white-space: nowrap;
    }
    
    .info-value {
      flex: 1;
      text-align: right;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    
    .item {
      text-align: left;
      margin: 3px 0;
    }
    
    .item-name {
      font-size: 12pt;
      font-weight: 700;
      margin-bottom: 1px;
      word-wrap: break-word;
    }
    
    .item-detail {
      font-size: 11pt;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
    
    .item-subtotal {
      text-align: right;
      white-space: nowrap;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 13pt;
      font-weight: 700;
      margin: 2px 0;
      gap: 5px;
    }
    
    .total-label {
      flex: 0 0 auto;
      white-space: nowrap;
    }
    
    .total-value {
      flex: 1;
      text-align: right;
      overflow-wrap: break-word;
    }
    
    .footer {
      font-size: 13pt;
      margin-top: 4px;
      font-weight: 700;
    }
    
    @media print {
      * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        color-adjust: exact;
      }
      
      html, body {
        width: 80mm;
      }
      
      body { 
        padding: 3mm 0mm 8mm 0mm;
        font-size: 14pt;
        font-weight: 600;
        -webkit-filter: contrast(1.3) brightness(0.95);
        filter: contrast(1.3) brightness(0.95);
        text-align: center;
      }
      
      .wrapper {
        max-width: 72mm;
        margin: 0 auto;
        padding: 0;
      }
      
      button { 
        display: none !important; 
      }
      
      @page {
        size: 80mm auto;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
  <div class="header">${companyName}</div>
  <div class="subheader">${companyAddress}</div>
  <div class="subheader">${companyPhone}</div>
  <div class="datetime">${formattedDate} ${formattedTime}</div>
  
  <div class="line"></div>
  
  <div class="info-row">
    <span class="info-label">NO</span>
    <span class="info-value">: ${invoiceNumber}</span>
  </div>
  <div class="info-row">
    <span class="info-label">KASIR</span>
    <span class="info-value">: ${kasirName}</span>
  </div>
  ${
    member
      ? `<div class="info-row">
    <span class="info-label">MEMBER</span>
    <span class="info-value">: ${memberId}</span>
  </div>
  <div class="info-row">
    <span class="info-label">NAMA</span>
    <span class="info-value">: ${memberName}</span>
  </div>`
      : ""
  }
  
  <div class="line"></div>
  
  ${itemsHtml}
  
  <div class="line"></div>
  
  <div class="total-row">
    <span class="total-label">TOTAL</span>
    <span class="total-value">: ${formatCurrency(totalAmount)}</span>
  </div>
  ${
    discountAmount > 0
      ? `<div class="total-row">
    <span class="total-label">DISCOUNT</span>
    <span class="total-value">: ${formatCurrency(discountAmount)}</span>
  </div>
  <div class="total-row">
    <span class="total-label">GRAND TOTAL</span>
    <span class="total-value">: ${formatCurrency(finalAmount)}</span>
  </div>`
      : ""
  }
  <div class="total-row">
    <span class="total-label">BAYAR</span>
    <span class="total-value">: ${formatCurrency(paymentReceived)}</span>
  </div>
  <div class="total-row">
    <span class="total-label">KEMBALI</span>
    <span class="total-value">: ${formatCurrency(changeAmount)}</span>
  </div>
  
  <div class="line"></div>
  
  <div class="footer">
    .: TERIMA KASIH :.
  </div>
  </div>

<script type="text/javascript">
(function() {
  var printed = false;
  
  function doPrint() {
    if (!printed) {
      printed = true;
      window.print();
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(doPrint, 300);
    });
  } else {
    setTimeout(doPrint, 300);
  }
  
  window.onload = function() {
    setTimeout(doPrint, 500);
  };
  
  window.onafterprint = function() {
    setTimeout(function() {
      window.close();
    }, 100);
  };
})();
</script>
</body>
</html>`;

  return html;
}

/**
 * Generate Debt Payment Receipt (Thermal 58mm x auto)
 * Format untuk bukti pembayaran cicilan hutang member
 */
async function generateDebtPaymentReceipt(paymentData) {
  const { receiptNumber, paymentDate, member, debt, payment, user } = paymentData;

  // Get settings
  const companyName = await Setting.get("company_name", "KOPERASI YAMUGHNI");
  const companyAddress = await Setting.get("company_address", "Jl. Kaum No. 2 Cicaheum");
  const companyPhone = await Setting.get("company_phone", "Telp: (022) 20503787");

  // Format date & time
  const date = new Date(paymentDate);
  const formattedDate = `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
  const formattedTime = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;

  // Member info
  const memberId = member.uniqueId;
  const memberName = member.fullName;
  const memberRegion = member.regionName || "-";
  const kasirName = user ? user.name : "Kasir";

  // Payment method label
  const paymentMethodLabel =
    {
      CASH: "Tunai",
      TRANSFER: "Transfer",
      DEBIT: "Debit",
      CREDIT: "Kartu Kredit",
    }[payment.paymentMethod] || payment.paymentMethod;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bukti Pembayaran ${receiptNumber}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: auto;
      text-rendering: optimizeLegibility;
    }
    
    html, body {
      width: 80mm;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 14pt;
      font-weight: 600;
      line-height: 1.3;
      padding: 3mm 0mm 3mm 0mm;
      color: #000;
      background: #fff;
      text-align: center;
    }
    
    .wrapper {
      max-width: 72mm;
      margin: 0 auto;
      padding: 0;
    }
    
    .header {
      font-weight: 900;
      font-size: 16pt;
      margin-bottom: 2px;
      letter-spacing: 0.3px;
    }
    
    .subheader {
      font-size: 13pt;
      font-weight: 600;
      line-height: 1.2;
      margin-bottom: 1px;
    }
    
    .datetime {
      font-size: 13pt;
      font-weight: 600;
      margin: 3px 0 4px 0;
    }
    
    .section-title {
      font-size: 14pt;
      font-weight: 900;
      margin: 4px 0;
      letter-spacing: 0.3px;
    }
    
    .line {
      border-bottom: 1px dashed #000;
      margin: 3px 0;
      width: 100%;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 12pt;
      font-weight: 600;
      margin: 2px 0;
      text-align: left;
      gap: 5px;
    }
    
    .info-label {
      flex: 0 0 auto;
      white-space: nowrap;
    }
    
    .info-value {
      flex: 1;
      text-align: right;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    
    .amount-row {
      display: flex;
      justify-content: space-between;
      font-size: 12pt;
      font-weight: 700;
      margin: 2px 0;
      gap: 5px;
    }
    
    .amount-label {
      flex: 0 0 auto;
      white-space: nowrap;
    }
    
    .amount-value {
      flex: 1;
      text-align: right;
      overflow-wrap: break-word;
    }
    
    .highlight {
      font-size: 13pt;
      font-weight: 900;
    }
    
    .footer {
      font-size: 13pt;
      margin-top: 4px;
      font-weight: 700;
    }
    
    @media print {
      * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        color-adjust: exact;
      }
      
      html, body {
        width: 80mm;
      }
      
      body { 
        padding: 3mm 0mm 3mm 0mm;
        font-size: 14pt;
        font-weight: 600;
        -webkit-filter: contrast(1.3) brightness(0.95);
        filter: contrast(1.3) brightness(0.95);
        text-align: center;
      }
      
      .wrapper {
        max-width: 72mm;
        margin: 0 auto;
        padding: 0;
      }
      
      button { 
        display: none !important; 
      }
      
      @page {
        size: 80mm auto;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
  <div class="header">${companyName}</div>
  <div class="subheader">${companyAddress}</div>
  <div class="subheader">${companyPhone}</div>
  <div class="datetime">${formattedDate} ${formattedTime}</div>
  
  <div class="line"></div>
  
  <div class="section-title">BUKTI PEMBAYARAN HUTANG</div>
  
  <div class="line"></div>
  
  <div class="info-row">
    <span class="info-label">NO BUKTI</span>
    <span class="info-value">: ${receiptNumber}</span>
  </div>
  <div class="info-row">
    <span class="info-label">KASIR</span>
    <span class="info-value">: ${kasirName}</span>
  </div>
  
  <div class="line"></div>
  
  <div class="info-row">
    <span class="info-label">ID MEMBER</span>
    <span class="info-value">: ${memberId}</span>
  </div>
  <div class="info-row">
    <span class="info-label">NAMA</span>
    <span class="info-value">: ${memberName}</span>
  </div>
  <div class="info-row">
    <span class="info-label">UNIT KERJA</span>
    <span class="info-value">: ${memberRegion}</span>
  </div>
  
  <div class="line"></div>
  
  <div class="info-row">
    <span class="info-label">NO FAKTUR</span>
    <span class="info-value">: ${debt.invoiceNumber}</span>
  </div>
  
  <div class="line"></div>
  
  <div class="amount-row">
    <span class="amount-label">Total Hutang</span>
    <span class="amount-value">: ${formatCurrency(debt.totalAmount)}</span>
  </div>
  <div class="amount-row">
    <span class="amount-label">Sudah Dibayar</span>
    <span class="amount-value">: ${formatCurrency(debt.paidAmount - payment.amount)}</span>
  </div>
  <div class="amount-row highlight">
    <span class="amount-label">Bayar Sekarang</span>
    <span class="amount-value">: ${formatCurrency(payment.amount)}</span>
  </div>
  
  <div class="line"></div>
  
  <div class="amount-row highlight">
    <span class="amount-label">SISA HUTANG</span>
    <span class="amount-value">: ${formatCurrency(debt.remainingAmount)}</span>
  </div>
  
  <div class="line"></div>
  
  <div class="info-row">
    <span class="info-label">METODE BAYAR</span>
    <span class="info-value">: ${paymentMethodLabel}</span>
  </div>
  ${
    payment.notes
      ? `<div class="info-row">
    <span class="info-label">CATATAN</span>
    <span class="info-value">: ${payment.notes}</span>
  </div>`
      : ""
  }
  
  <div class="line"></div>
  
  <div class="footer">
    .: TERIMA KASIH :.<br>
    Mohon Simpan Bukti Ini
  </div>
  </div>

<script type="text/javascript">
(function() {
  var printed = false;
  function doPrint() {
    if (!printed) {
      printed = true;
      window.print();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(doPrint, 300);
    });
  } else {
    setTimeout(doPrint, 300);
  }
  window.onload = function() {
    setTimeout(doPrint, 500);
  };
  window.onafterprint = function() {
    setTimeout(function() {
      window.close();
    }, 100);
  };
})();
</script>
</body>
</html>`;

  return html;
}

// UPDATE module.exports - TAMBAHKAN generateDebtPaymentReceipt
module.exports = {
  generateDotMatrixInvoice,
  generateThermalReceipt,
  generateDebtPaymentReceipt, // ✅ TAMBAH INI
};
