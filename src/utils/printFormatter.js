// ============================================
// src/utils/printFormatter.js
// Utility untuk format template print (Dot Matrix & Thermal)
// ============================================
const { terbilang, formatCurrency } = require("./terbilang");
const Setting = require("../models/Setting");

/**
 * Generate Dot Matrix Invoice HTML (80 characters width)
 * Format untuk transaksi KREDIT
 */
async function generateDotMatrixInvoice(saleData) {
  const {
    invoiceNumber,
    saleDate,
    member,
    items,
    totalAmount,
    discountAmount,
    finalAmount,
    dpAmount,
    remainingDebt,
    dueDate,
    notes,
  } = saleData;

  // Get settings
  const companyName = await Setting.get("company_name", "KOPERASI YAMUGHNI");
  const companyAddress = await Setting.get(
    "company_address",
    "Jalan Kaum No. 4 Samping Terminal Cicaheum"
  );
  const companyPhone = await Setting.get(
    "company_phone",
    "Telepon (022) 20503787, 085877877877"
  );
  const companyWebsite = await Setting.get(
    "company_website",
    "www.yamughni.info"
  );
  const companyCity = await Setting.get("company_city", "Bandung");
  const bankName = await Setting.get("bank_name", "MANDIRI");
  const bankAccount = await Setting.get(
    "bank_account_number",
    "131-00-1687726-0"
  );
  const bankAccountName = await Setting.get(
    "bank_account_name",
    "KOPERASI YAMUGHNI"
  );

  // Format date
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const date = new Date(saleDate);
  const formattedDate = `${date.getDate()} ${
    months[date.getMonth()]
  } ${date.getFullYear()}`;

  // Format due date
  let formattedDueDate = "";
  if (dueDate) {
    const dueDateObj = new Date(dueDate);
    formattedDueDate = `${dueDateObj.getDate()} ${
      months[dueDateObj.getMonth()]
    } ${dueDateObj.getFullYear()}`;
  }

  // Member info
  const memberName = member ? member.fullName : "UMUM";
  const memberArea = member
    ? `${member.regionCode} (${member.regionName})`
    : "-";
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

  // HTML Template
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Faktur ${invoiceNumber}</title>
  <style>
    @page {
      size: 21cm 14.85cm;
      margin: 0;
    }
    
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10pt;
      line-height: 1.2;
      margin: 0;
      padding: 15mm;
      white-space: pre;
    }
    
    .header {
      text-align: center;
      font-weight: bold;
      margin-bottom: 10px;
    }
    
    .line {
      border-bottom: 1px solid #000;
      margin: 5px 0;
    }
    
    .section {
      margin: 10px 0;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .text-right {
      text-align: right;
    }
    
    .text-center {
      text-align: center;
    }
    
    .bold {
      font-weight: bold;
    }
    
    @media print {
      body {
        padding: 0;
      }
      
      button {
        display: none;
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

Faktur No.: ${invoiceNumber}                    ${companyCity}, ${formattedDate}

Kepada Yth.                     ID MEMBER : ${memberId}
                                NAMA      : ${memberName}
                                AREA      : ${memberArea}
                                ${
                                  dueDate
                                    ? `JATUH TEMPO: ${formattedDueDate}`
                                    : ""
                                }

<div class="line"></div>
No  Qty  Satuan  Nama Barang          Harga     Disc   Jumlah
<div class="line"></div>
${itemsHtml}<div class="line"></div>

TERBILANG: ${amountWords}

                                    TOTAL FAKTUR  : ${formatCurrency(
                                      totalAmount
                                    )}
Setiap pembayaran harap             JUMLAH DISC   : ${formatCurrency(
    discountAmount
  )}
ditorehkan langsung ke rekening:    JUMLAH BAYAR  : ${formatCurrency(
    finalAmount
  )}
${bankName}: ${bankAccount}         ${
    dpAmount > 0 ? `DP            : ${formatCurrency(dpAmount)}` : ""
  }
${bankAccountName}                  SISA KREDIT   : ${formatCurrency(
    remainingDebt
  )}

${notes ? `Catatan: ${notes}` : ""}

Yang menerima,                              Hormat Kami,




(................)                          (................)
<div class="line"></div>

<div style="text-align: center; margin-top: 20px;">
  <button onclick="window.print()" style="padding: 10px 20px; font-size: 14px; cursor: pointer; background: #4CAF50; color: white; border: none; border-radius: 4px;">
    🖨️ PRINT
  </button>
  <button onclick="window.close()" style="padding: 10px 20px; font-size: 14px; cursor: pointer; background: #f44336; color: white; border: none; border-radius: 4px; margin-left: 10px;">
    ✖ TUTUP
  </button>
</div>

<script>
  // Auto print saat page load
  window.addEventListener('load', function() {
    // Delay 500ms untuk memastikan content sudah render
    setTimeout(function() {
      window.print();
    }, 500);
  });
</script>
</body>
</html>`;

  return html;
}

/**
 * Generate Thermal Receipt HTML (32 characters width)
 * Format untuk transaksi TUNAI
 */
async function generateThermalReceipt(saleData) {
  const {
    invoiceNumber,
    saleDate,
    member,
    user,
    items,
    totalAmount,
    discountAmount,
    finalAmount,
    paymentReceived,
    changeAmount,
  } = saleData;

  // Get settings
  const companyName = await Setting.get("company_name", "KOPERASI YAMUGHNI");
  const companyAddress = await Setting.get(
    "company_address",
    "Jl. Kaum No. 4 Cicaheum"
  );
  const companyPhone = await Setting.get(
    "company_phone",
    "Telp: (022) 20503787"
  );

  // Format date & time
  const date = new Date(saleDate);
  const formattedDate = `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
  const formattedTime = `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;

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

  // HTML Template
  const html = `
<!DOCTYPE html>
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
    
    .text-right {
      text-align: right;
    }
    
    .text-center {
      text-align: center;
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
      body {
        padding: 0;
      }
      
      button {
        display: none;
      }
    }
  </style>
</head>
<body>
<div class="header">
${companyName}
</div>
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
<pre>
${itemsHtml}</pre>
<div class="line"></div>
<pre>
TOTAL             ${formatCurrency(totalAmount).padStart(16)}
${
  discountAmount > 0
    ? `DISCOUNT          ${formatCurrency(discountAmount).padStart(16)}`
    : ""
}
${
  discountAmount > 0
    ? `BAYAR             ${formatCurrency(finalAmount).padStart(16)}`
    : ""
}
BAYAR             ${formatCurrency(paymentReceived).padStart(16)}
KEMBALI           ${formatCurrency(changeAmount).padStart(16)}
</pre>
<div class="line"></div>
<div class="text-center">
<strong>Terima Kasih</strong><br>
Belanja Lagi Ya!
</div>
<div class="line"></div>

<div style="text-align: center; margin-top: 10px;">
  <button onclick="window.print()" style="padding: 8px 16px; font-size: 12px; cursor: pointer; background: #4CAF50; color: white; border: none; border-radius: 4px;">
    🖨️ PRINT
  </button>
  <button onclick="window.close()" style="padding: 8px 16px; font-size: 12px; cursor: pointer; background: #f44336; color: white; border: none; border-radius: 4px; margin-left: 5px;">
    ✖ TUTUP
  </button>
</div>

<script>
  // Auto print saat page load
  window.addEventListener('load', function() {
    // Delay 500ms untuk memastikan content sudah render
    setTimeout(function() {
      window.print();
    }, 500);
  });
</script>
</body>
</html>`;

  return html;
}

module.exports = {
  generateDotMatrixInvoice,
  generateThermalReceipt,
};
