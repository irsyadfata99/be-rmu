// ============================================
// src/utils/printFormatter.js
// Utility untuk format template print (Dot Matrix & Thermal)
// ✅ FIXED: Continuous form format (21cm width, auto height)
// ============================================
const { terbilang, formatCurrency } = require("./terbilang");
const Setting = require("../models/Setting");

/**
 * Generate Dot Matrix Invoice HTML (Continuous Form - 21cm width)
 * Format untuk transaksi KREDIT - Mirip form asli NCR
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

  // Generate items table
  let itemsHtml = "";
  items.forEach((item, index) => {
    const no = String(index + 1).padEnd(3);
    const qty = String(item.quantity).padEnd(4);
    const unit = item.unit.padEnd(7);
    const name = item.productName.substring(0, 20).padEnd(20);
    const price = formatCurrency(item.sellingPrice).padStart(12);
    const disc = "-".padStart(6);
    const subtotal = formatCurrency(item.subtotal).padStart(12);

    itemsHtml += `${no} ${qty} ${unit} ${name} ${price} ${disc} ${subtotal}\n`;
  });

  // Terbilang
  const amountWords = terbilang(finalAmount);

  // HTML Template - Continuous Form Style
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Faktur ${invoiceNumber}</title>
  <style>
    /* ✅ CONTINUOUS FORM: 21cm width, auto height */
    @page {
      size: 21cm auto;
      margin: 0;
    }
    
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10pt;
      line-height: 1.3;
      margin: 0;
      padding: 10mm 8mm;
      width: 21cm;
      box-sizing: border-box;
    }
    
    .header {
      text-align: center;
      font-weight: bold;
      margin-bottom: 8px;
      font-size: 11pt;
    }
    
    .line {
      border-bottom: 1px solid #000;
      margin: 4px 0;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      margin: 2px 0;
    }
    
    .items-section {
      margin: 8px 0;
    }
    
    .footer-section {
      margin-top: 12px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    
    .signature {
      text-align: center;
      margin-top: 40px;
    }
    
    pre {
      margin: 0;
      font-family: 'Courier New', Courier, monospace;
      font-size: 10pt;
      white-space: pre;
    }
    
    @media print {
      body {
        padding: 0;
        margin: 0;
      }
      
      button, .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
<div class="header">
${companyName}
${companyAddress}
${companyPhone}
Website: ${companyWebsite}
</div>
<div class="line"></div>

<div class="info-row">
  <span>Faktur No.: ${invoiceNumber}</span>
  <span>${companyCity}, ${formattedDate}</span>
</div>

<br>
<div style="display: grid; grid-template-columns: 1fr 2fr;">
  <div>Kepada Yth.</div>
  <div>
    ID MEMBER : ${memberId}<br>
    NAMA      : ${memberName}<br>
    AREA      : ${memberArea}
    ${dueDate ? `<br>JATUH TEMPO: ${formattedDueDate}` : ""}
  </div>
</div>

<br>
<div class="line"></div>
<pre>No  Qty  Satuan  Nama Barang          Harga     Disc   Jumlah</pre>
<div class="line"></div>
<pre>${itemsHtml}</pre>
<div class="line"></div>

<br>
<div><strong>TERBILANG:</strong> ${amountWords}</div>

<br>
<div class="footer-section">
  <div>
    <div>Setiap pembayaran harap</div>
    <div>ditransfer langsung ke rekening:</div>
    <div><strong>${bankName}: ${bankAccount}</strong></div>
    <div><strong>${bankAccountName}</strong></div>
  </div>
  <div style="text-align: right;">
    <div>TOTAL FAKTUR  : ${formatCurrency(totalAmount)}</div>
    <div>JUMLAH DISC   : ${formatCurrency(discountAmount)}</div>
    <div>JUMLAH BAYAR  : ${formatCurrency(finalAmount)}</div>
    ${dpAmount > 0 ? `<div>DP            : ${formatCurrency(dpAmount)}</div>` : ""}
    <div><strong>SISA KREDIT   : ${formatCurrency(remainingDebt)}</strong></div>
  </div>
</div>

${notes ? `<br><div>Catatan: ${notes}</div>` : ""}

<br><br>
<div class="footer-section">
  <div class="signature">
    <div>Yang menerima,</div>
    <br><br><br>
    <div>(...............)</div>
  </div>
  <div class="signature">
    <div>Hormat Kami,</div>
    <br><br><br>
    <div>(...............)</div>
  </div>
</div>

<div class="line"></div>

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

module.exports = {
  generateDotMatrixInvoice,
  generateThermalReceipt,
};
