// ============================================
// src/utils/printFormatter.js
// Utility untuk format template print (Dot Matrix & Thermal)
// ✅ OPTIMIZED: 9.5" x 11" continuous form, 15 items per page
// ============================================
const { terbilang, formatCurrency } = require("./terbilang");
const Setting = require("../models/Setting");

/**
 * Generate Dot Matrix Invoice HTML (Continuous Form - 9.5" x 11")
 * Format untuk transaksi KREDIT - 15 items per page
 */
async function generateDotMatrixInvoice(saleData) {
  const { invoiceNumber, saleDate, member, items, totalAmount, discountAmount, finalAmount, dpAmount, remainingDebt, dueDate, notes } = saleData;

  // Get settings
  const companyName = await Setting.get("company_name", "KOPERASI YAMUGHNI");
  const companyAddress = await Setting.get("company_address", "Jalan Kaum No. 4 Samping Terminal Cicaheum");
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

  // Split items into chunks of 15
  const itemsPerPage = 15;
  const itemChunks = [];
  for (let i = 0; i < items.length; i += itemsPerPage) {
    itemChunks.push(items.slice(i, i + itemsPerPage));
  }

  // Generate items table HTML for each page
  let pagesHtml = "";

  itemChunks.forEach((chunk, pageIndex) => {
    const isFirstPage = pageIndex === 0;
    const isLastPage = pageIndex === itemChunks.length - 1;

    // Generate items for this page
    let itemsHtml = "";
    chunk.forEach((item, index) => {
      const globalIndex = pageIndex * itemsPerPage + index + 1;
      const no = String(globalIndex).padEnd(3);
      const qty = String(item.quantity).padEnd(4);
      const unit = item.unit.padEnd(7);
      const name = item.productName.substring(0, 25).padEnd(25);
      const price = formatCurrency(item.sellingPrice).padStart(12);
      const disc = item.discountAmount ? formatCurrency(item.discountAmount).padStart(8) : "-".padStart(8);
      const subtotal = formatCurrency(item.subtotal).padStart(14);

      itemsHtml += `${no} ${qty} ${unit} ${name} ${price} ${disc} ${subtotal}\n`;
    });

    // Build page content
    pagesHtml += `
<div class="page ${isFirstPage ? "first-page" : "continuation-page"}">
  ${
    isFirstPage
      ? `
  <!-- Header hanya di halaman pertama -->
  <div class="header">
    <div style="font-weight: bold; font-size: 10pt;">${companyName}</div>
    <div>${companyAddress}</div>
    <div>${companyPhone}</div>
    <div>${companyWebsite}</div>
  </div>
  <div class="line"></div>

  <div class="info-row">
    <span>Faktur No.: ${invoiceNumber}</span>
    <span>${companyCity}, ${formattedDate}</span>
  </div>

  <div class="line"></div>

  <div class="info-grid">
    <div>Kepada Yth.</div>
    <div>
      <div>ID MEMBER : ${memberId}</div>
      <div>NAMA      : ${memberName}</div>
      <div>AREA      : ${memberArea}</div>
      ${dueDate ? `<div>JATUH TEMPO: ${formattedDueDate}</div>` : ""}
    </div>
  </div>

  <div class="line"></div>
  `
      : `
  <!-- Lanjutan halaman ${pageIndex + 1} -->
  <div style="margin-bottom: 3mm; font-weight: bold;">Faktur No.: ${invoiceNumber} - Halaman ${pageIndex + 1}</div>
  <div class="line"></div>
  `
  }

  <pre class="table-header">No  Qty  Satuan  Nama Barang               Harga       Disc     Jumlah</pre>
  <div class="line"></div>
  <pre class="items-content">${itemsHtml}</pre>
  <div class="line"></div>

  ${
    isLastPage
      ? `
  <!-- Footer hanya di halaman terakhir -->
  <div class="compact-spacing"><strong>TERBILANG:</strong> ${terbilang(finalAmount)}</div>

  <div class="line"></div>

  <div class="footer-section">
    <div>
      <div class="compact-spacing">Setiap pembayaran harap</div>
      <div class="compact-spacing">ditransfer langsung ke rekening:</div>
      <div class="compact-spacing"><strong>${bankName}: ${bankAccount}</strong></div>
      <div class="compact-spacing"><strong>${bankAccountName}</strong></div>
    </div>
    <div style="text-align: right;">
      <div class="compact-spacing">TOTAL FAKTUR  : ${formatCurrency(totalAmount)}</div>
      ${discountAmount > 0 ? `<div class="compact-spacing">JUMLAH DISC   : ${formatCurrency(discountAmount)}</div>` : ""}
      <div class="compact-spacing">JUMLAH BAYAR  : ${formatCurrency(finalAmount)}</div>
      ${dpAmount > 0 ? `<div class="compact-spacing">DP            : ${formatCurrency(dpAmount)}</div>` : ""}
      <div class="compact-spacing"><strong>SISA KREDIT   : ${formatCurrency(remainingDebt)}</strong></div>
    </div>
  </div>

  ${notes ? `<div class="compact-spacing" style="margin-top: 2mm;">Catatan: ${notes}</div>` : ""}

  <div class="footer-section" style="margin-top: 8mm;">
    <div class="signature">
      <div>Yang menerima,</div>
      <div class="signature-line"></div>
    </div>
    <div class="signature">
      <div>Hormat Kami,</div>
      <div class="signature-line"></div>
    </div>
  </div>

  <div class="line" style="margin-top: 3mm;"></div>
  <div style="text-align: center; margin-top: 2mm;">======== Terima kasih ========</div>
  `
      : ""
  }
</div>
${!isLastPage ? '<div class="page-break"></div>' : ""}
`;
  });

  // HTML Template - 9.5" x 11" Continuous Form
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Faktur ${invoiceNumber}</title>
  <style>
    /* ✅ OPTIMIZED: 9.5" x 11" continuous form, safe margins */
    @page {
      size: 9.5in auto; /* ← UBAH: auto height agar tidak fixed 11in */
      margin: 0;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 8.5pt;
      line-height: 1.05;
      margin: 0;
      padding: 0;
      width: 9.5in;
    }
    
    .page {
      padding: 4mm 8mm;
      /* ← HAPUS: min-height: 11in; */
      position: relative;
    }
    
    .header {
      text-align: center;
      line-height: 1.15;
      margin-bottom: 3mm;
    }
    
    .line {
      border-bottom: 1px solid #000;
      margin: 1.5mm 0;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      margin: 0.5mm 0;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 90px 1fr;
      gap: 2mm;
      margin: 1mm 0;
    }
    
    .footer-section {
      margin-top: 3mm;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10mm;
    }
    
    .signature {
      text-align: center;
      margin-top: 12mm;
    }
    
    .signature-line {
      margin-top: 12mm;
      border-top: 1px solid #000;
      width: 120px;
      display: inline-block;
    }
    
    pre {
      margin: 0;
      font-family: 'Courier New', Courier, monospace;
      font-size: 8.5pt;
      line-height: 1.05;
      white-space: pre;
    }
    
    .compact-spacing {
      margin: 1mm 0;
    }
    
    .page-break {
      page-break-after: always;
      break-after: page;
    }
    
    .table-header {
      font-weight: bold;
    }
    
    /* ✅ TAMBAHAN: Hide page numbers & URL di print */
    @media print {
      @page {
        margin: 0; /* Remove default margins */
      }
      
      body {
        padding: 0;
        margin: 0;
      }
      
      .page {
        page-break-after: auto;
      }
      
      .page-break {
        page-break-after: always;
        break-after: page;
      }
      
      button, .no-print {
        display: none !important;
      }
      
      /* ✅ Hide browser URL & page counter */
      @page {
        margin: 0;
        size: 9.5in auto;
      }
      
      /* Hide header & footer pada preview print Chrome/Edge */
      html, body {
        margin: 0 !important;
        padding: 0 !important;
      }
    }
  </style>
</head>
<body>
${pagesHtml}

<script type="text/javascript">
(function() {
  var printed = false;
  
  function doPrint() {
    if (!printed) {
      printed = true;
      
      // ✅ TAMBAHAN: Set print options via CSS before print
      var style = document.createElement('style');
      style.textContent = '@page { margin: 0; size: 9.5in auto; }';
      document.head.appendChild(style);
      
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
 * Generate Thermal Receipt HTML (58mm width)
 * Format untuk transaksi TUNAI
 */
async function generateThermalReceipt(saleData) {
  const { invoiceNumber, saleDate, member, user, items, totalAmount, discountAmount, finalAmount, paymentReceived, changeAmount } = saleData;

  // Get settings
  const companyName = await Setting.get("company_name", "KOPERASI YAMUGHNI");
  const companyAddress = await Setting.get("company_address", "Jl. Kaum No. 4 Cicaheum");
  const companyPhone = await Setting.get("company_phone", "Telp: (022) 20503787");

  // Format date & time
  const date = new Date(saleDate);
  const formattedDate = `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  const formattedTime = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

  // Member info
  const memberId = member ? member.uniqueId : "-";
  const memberName = member ? member.fullName : "UMUM";
  const kasirName = user ? user.name : "Kasir";

  // Generate items
  let itemsHtml = "";
  items.forEach((item) => {
    const name = item.productName.substring(0, 32);
    const qty = item.quantity;
    const price = formatCurrency(item.sellingPrice);
    const subtotal = formatCurrency(item.subtotal).padStart(22);

    itemsHtml += `${name}
  ${qty} x ${price}${subtotal}\n\n`;
  });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Struk ${invoiceNumber}</title>
  <style>
    @page {
      size: 58mm auto;
      margin: 0;
    }
    
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 9pt;
      line-height: 1.3;
      margin: 0;
      padding: 5mm;
      width: 58mm;
    }
    
    .header {
      text-align: center;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .line {
      border-bottom: 1px dashed #000;
      margin: 5px 0;
    }
    
    .text-center {
      text-align: center;
    }
    
    pre {
      margin: 0;
      font-family: 'Courier New', Courier, monospace;
      font-size: 9pt;
    }
    
    @media print {
      body { padding: 0; }
      button { display: none !important; }
    }
  </style>
</head>
<body>
<div class="header">${companyName}</div>
<div class="text-center">
${companyAddress}
${companyPhone}
</div>
<div class="line"></div>
<pre>
No: ${invoiceNumber}
Tgl: ${formattedDate} ${formattedTime}
Kasir: ${kasirName}
${member ? `Member: ${memberId}` : ""}
${member ? `Nama: ${memberName}` : ""}
</pre>
<div class="line"></div>
<pre>${itemsHtml}</pre>
<div class="line"></div>
<pre>
TOTAL             ${formatCurrency(totalAmount).padStart(16)}
${discountAmount > 0 ? `DISCOUNT          ${formatCurrency(discountAmount).padStart(16)}` : ""}
${discountAmount > 0 ? `BAYAR             ${formatCurrency(finalAmount).padStart(16)}` : ""}
BAYAR             ${formatCurrency(paymentReceived).padStart(16)}
KEMBALI           ${formatCurrency(changeAmount).padStart(16)}
</pre>
<div class="line"></div>
<div class="text-center">
<strong>Terima Kasih</strong><br>
Belanja Lagi Ya!
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
 * Generate Debt Payment Receipt (Thermal 58mm)
 * Format untuk bukti pembayaran cicilan hutang member
 */
async function generateDebtPaymentReceipt(paymentData) {
  const { receiptNumber, paymentDate, member, debt, payment, user } = paymentData;

  // Get settings
  const companyName = await Setting.get("company_name", "KOPERASI YAMUGHNI");
  const companyAddress = await Setting.get("company_address", "Jl. Kaum No. 4 Cicaheum");
  const companyPhone = await Setting.get("company_phone", "Telp: (022) 20503787");

  // Format date & time
  const date = new Date(paymentDate);
  const formattedDate = `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  const formattedTime = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

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
      size: 58mm auto;
      margin: 0;
    }
    
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 9pt;
      line-height: 1.3;
      margin: 0;
      padding: 5mm;
      width: 58mm;
    }
    
    .header {
      text-align: center;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .line {
      border-bottom: 1px dashed #000;
      margin: 5px 0;
    }
    
    .text-center {
      text-align: center;
    }
    
    .text-right {
      text-align: right;
    }
    
    .bold {
      font-weight: bold;
    }
    
    pre {
      margin: 0;
      font-family: 'Courier New', Courier, monospace;
      font-size: 9pt;
    }
    
    @media print {
      body { padding: 0; }
      button { display: none !important; }
    }
  </style>
</head>
<body>
<div class="header">${companyName}</div>
<div class="text-center">
${companyAddress}
${companyPhone}
</div>
<div class="line"></div>

<div class="header">BUKTI PEMBAYARAN HUTANG</div>

<div class="line"></div>
<pre>
No Bukti : ${receiptNumber}
Tgl Bayar: ${formattedDate} ${formattedTime}
Kasir    : ${kasirName}
</pre>
<div class="line"></div>
<pre>
ID Member: ${memberId}
Nama     : ${memberName}
Wilayah  : ${memberRegion}
</pre>
<div class="line"></div>
<pre>
No Faktur: ${debt.invoiceNumber}

RINCIAN PEMBAYARAN:
Total Hutang      ${formatCurrency(debt.totalAmount).padStart(16)}
Sudah Dibayar     ${formatCurrency(debt.paidAmount - payment.amount).padStart(16)}
<strong>Bayar Sekarang    ${formatCurrency(payment.amount).padStart(16)}</strong>
</pre>
<div class="line"></div>
<pre>
<strong>SISA HUTANG       ${formatCurrency(debt.remainingAmount).padStart(16)}</strong>
</pre>
<div class="line"></div>
<pre>
Metode Bayar: ${paymentMethodLabel}
${payment.notes ? `Catatan: ${payment.notes}` : ""}
</pre>
<div class="line"></div>
<div class="text-center">
<strong>Terima Kasih</strong><br>
Mohon Simpan Bukti Ini
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
