// ============================================
// src/seeders/seedMembersAdvanced.js
// Seeder untuk membuat data member dengan status realistic
// (ada yang punya hutang, poin, transaksi, dll)
// ============================================
const { sequelize } = require("../config/database");
const Member = require("../models/Member");
require("dotenv").config();

// Helper function untuk generate random number
const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const randomDecimal = (min, max) =>
  (Math.random() * (max - min) + min).toFixed(2);

// Data member dengan berbagai status
const memberData = [
  // === MEMBER AKTIF DENGAN HUTANG ===
  {
    nik: "3273010101850001",
    fullName: "Haji Abdullah Permana",
    address: "Jl. Cihampelas No. 150, Bandung",
    regionCode: "BDG",
    whatsapp: "081234567111",
    gender: "Laki-laki",
    totalDebt: 2500000, // Punya hutang 2.5 juta
    totalTransactions: 45,
    monthlySpending: 1500000,
    totalPoints: 1250,
    isActive: true,
  },
  {
    nik: "3273010201880002",
    fullName: "Ibu Fatimah Zahra",
    address: "Jl. Dago No. 88, Bandung",
    regionCode: "BDG",
    whatsapp: "081234567222",
    gender: "Perempuan",
    totalDebt: 1750000, // Punya hutang 1.75 juta
    totalTransactions: 32,
    monthlySpending: 950000,
    totalPoints: 850,
    isActive: true,
  },

  // === MEMBER AKTIF TANPA HUTANG (LOYAL CUSTOMER) ===
  {
    nik: "3273010301900003",
    fullName: "Dr. Rudi Hartono, SE",
    address: "Jl. Pasteur No. 25, Bandung",
    regionCode: "BDG",
    whatsapp: "081234567333",
    gender: "Laki-laki",
    totalDebt: 0, // Tidak punya hutang
    totalTransactions: 120, // Sering belanja
    monthlySpending: 3500000,
    totalPoints: 5500, // Banyak poin
    isActive: true,
  },
  {
    nik: "3273010401920004",
    fullName: "Ny. Ratna Sari Dewi",
    address: "Jl. Setiabudi No. 100, Bandung",
    regionCode: "BDG",
    whatsapp: "081234567444",
    gender: "Perempuan",
    totalDebt: 0,
    totalTransactions: 85,
    monthlySpending: 2800000,
    totalPoints: 4200,
    isActive: true,
  },

  // === MEMBER BARU (BELUM ADA TRANSAKSI) ===
  {
    nik: "3273010501950005",
    fullName: "Andi Wijaya Kusuma",
    address: "Jl. Buah Batu No. 200, Bandung",
    regionCode: "BDG",
    whatsapp: "081234567555",
    gender: "Laki-laki",
    totalDebt: 0,
    totalTransactions: 0,
    monthlySpending: 0,
    totalPoints: 0,
    isActive: true,
  },
  {
    nik: "3273010601980006",
    fullName: "Bella Anastasia",
    address: "Jl. Soekarno Hatta No. 350, Bandung",
    regionCode: "BDG",
    whatsapp: "081234567666",
    gender: "Perempuan",
    totalDebt: 0,
    totalTransactions: 0,
    monthlySpending: 0,
    totalPoints: 0,
    isActive: true,
  },

  // === MEMBER TIDAK AKTIF ===
  {
    nik: "3273010701750007",
    fullName: "Pak Bambang Sutrisno (NONAKTIF)",
    address: "Jl. Cibeunying No. 45, Bandung",
    regionCode: "BDG",
    whatsapp: "081234567777",
    gender: "Laki-laki",
    totalDebt: 500000, // Masih punya hutang tapi tidak aktif
    totalTransactions: 15,
    monthlySpending: 0,
    totalPoints: 150,
    isActive: false, // TIDAK AKTIF
  },

  // === MEMBER DARI REGION LAIN ===
  // Cimahi
  {
    nik: "3277010101870001",
    fullName: "H. Cecep Ruhyat",
    address: "Jl. Raya Baros No. 100, Cimahi",
    regionCode: "CMH",
    whatsapp: "082234567111",
    gender: "Laki-laki",
    totalDebt: 1200000,
    totalTransactions: 28,
    monthlySpending: 850000,
    totalPoints: 680,
    isActive: true,
  },
  {
    nik: "3277010201900002",
    fullName: "Devi Novitasari",
    address: "Jl. Cibabat No. 75, Cimahi",
    regionCode: "CMH",
    whatsapp: "082234567222",
    gender: "Perempuan",
    totalDebt: 0,
    totalTransactions: 52,
    monthlySpending: 1950000,
    totalPoints: 2850,
    isActive: true,
  },

  // Kabupaten Bandung
  {
    nik: "3204010101880001",
    fullName: "Pak Endang Kurnia",
    address: "Jl. Raya Soreang No. 250, Kab. Bandung",
    regionCode: "KBG",
    whatsapp: "083234567111",
    gender: "Laki-laki",
    totalDebt: 3500000, // Hutang besar
    totalTransactions: 65,
    monthlySpending: 2200000,
    totalPoints: 1950,
    isActive: true,
  },
  {
    nik: "3204010201920002",
    fullName: "Fitri Handayani, S.Pd",
    address: "Jl. Majalaya No. 180, Kab. Bandung",
    regionCode: "KBG",
    whatsapp: "083234567222",
    gender: "Perempuan",
    totalDebt: 0,
    totalTransactions: 38,
    monthlySpending: 1350000,
    totalPoints: 1580,
    isActive: true,
  },

  // Garut
  {
    nik: "3205010101900001",
    fullName: "Guntur Prasetyo",
    address: "Jl. Cimanuk No. 50, Garut",
    regionCode: "GRT",
    whatsapp: "084234567111",
    gender: "Laki-laki",
    totalDebt: 850000,
    totalTransactions: 22,
    monthlySpending: 680000,
    totalPoints: 450,
    isActive: true,
  },

  // Sumedang
  {
    nik: "3211010101890001",
    fullName: "Hendra Gunawan, ST",
    address: "Jl. Mayor Abdurachman No. 30, Sumedang",
    regionCode: "SMD",
    whatsapp: "085234567111",
    gender: "Laki-laki",
    totalDebt: 0,
    totalTransactions: 95,
    monthlySpending: 2750000,
    totalPoints: 4150,
    isActive: true,
  },

  // Tasikmalaya
  {
    nik: "3278010101910001",
    fullName: "Intan Purnama Sari",
    address: "Jl. Sutisna Senjaya No. 120, Tasikmalaya",
    regionCode: "TSM",
    whatsapp: "086234567111",
    gender: "Perempuan",
    totalDebt: 1500000,
    totalTransactions: 42,
    monthlySpending: 1150000,
    totalPoints: 980,
    isActive: true,
  },

  // Sukabumi
  {
    nik: "3272010101850001",
    fullName: "Joko Priyono",
    address: "Jl. Pelabuhan II No. 60, Sukabumi",
    regionCode: "SMI",
    whatsapp: "087234567111",
    gender: "Laki-laki",
    totalDebt: 0,
    totalTransactions: 0,
    monthlySpending: 0,
    totalPoints: 0,
    isActive: true,
  },

  // Cianjur
  {
    nik: "3203010101930001",
    fullName: "Kartika Dewi Lestari",
    address: "Jl. Dr. Muwardi No. 35, Cianjur",
    regionCode: "CJR",
    whatsapp: "088234567111",
    gender: "Perempuan",
    totalDebt: 600000,
    totalTransactions: 18,
    monthlySpending: 520000,
    totalPoints: 320,
    isActive: true,
  },

  // Bogor
  {
    nik: "3271010101880001",
    fullName: "Lukman Hakim, MBA",
    address: "Jl. Pajajaran No. 150, Bogor",
    regionCode: "BGR",
    whatsapp: "089234567111",
    gender: "Laki-laki",
    totalDebt: 0,
    totalTransactions: 110,
    monthlySpending: 3200000,
    totalPoints: 5800,
    isActive: true,
  },
  {
    nik: "3271010201920002",
    fullName: "Maya Anggraini",
    address: "Jl. Raya Tajur No. 200, Bogor",
    regionCode: "BGR",
    whatsapp: "089234567222",
    gender: "Perempuan",
    totalDebt: 2100000,
    totalTransactions: 55,
    monthlySpending: 1850000,
    totalPoints: 1650,
    isActive: true,
  },

  // Kabupaten Bandung Barat
  {
    nik: "3217010101900001",
    fullName: "Nanda Pratama Wijaya",
    address: "Jl. Kolonel Masturi No. 300, Kab. Bandung Barat",
    regionCode: "KBB",
    whatsapp: "081334567111",
    gender: "Laki-laki",
    totalDebt: 950000,
    totalTransactions: 25,
    monthlySpending: 780000,
    totalPoints: 550,
    isActive: true,
  },
];

const seedMembersAdvanced = async () => {
  try {
    console.log("🌱 Starting ADVANCED member seeding...\n");
    console.log("This will create members with realistic transaction data:\n");
    console.log("  ✅ Active members with debt");
    console.log("  ✅ Loyal customers (no debt, high points)");
    console.log("  ✅ New members (no transaction history)");
    console.log("  ✅ Inactive members");
    console.log("");

    // Connect to database
    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    // Sync models
    await sequelize.sync({ force: false });
    console.log("✅ Models synced\n");

    console.log(
      `📝 Creating ${memberData.length} members with realistic data...\n`
    );

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Region mapping
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

    // Create members one by one
    for (const data of memberData) {
      try {
        // Check if NIK already exists
        const existingNik = await Member.findOne({ where: { nik: data.nik } });
        if (existingNik) {
          console.log(`⏭️  Skipped: ${data.fullName} (NIK already exists)`);
          skippedCount++;
          continue;
        }

        // Generate unique ID
        const uniqueId = await Member.generateUniqueId(data.regionCode);

        // Get region name
        const regionName = REGIONS[data.regionCode];

        // Create member
        const member = await Member.create({
          uniqueId,
          nik: data.nik,
          fullName: data.fullName,
          address: data.address,
          regionCode: data.regionCode,
          regionName: regionName,
          whatsapp: data.whatsapp,
          gender: data.gender,
          totalDebt: data.totalDebt || 0,
          totalTransactions: data.totalTransactions || 0,
          monthlySpending: data.monthlySpending || 0,
          totalPoints: data.totalPoints || 0,
          isActive: data.isActive !== undefined ? data.isActive : true,
        });

        // Show status
        let status = "";
        if (!member.isActive) {
          status = "❌ NONAKTIF";
        } else if (member.totalDebt > 0) {
          status = `💳 Hutang: Rp ${member.totalDebt.toLocaleString("id-ID")}`;
        } else if (member.totalPoints > 1000) {
          status = `⭐ Loyal (${member.totalPoints} poin)`;
        } else if (member.totalTransactions === 0) {
          status = "🆕 Member Baru";
        } else {
          status = `✅ Aktif (${member.totalTransactions}x transaksi)`;
        }

        console.log(`✅ ${member.uniqueId} - ${member.fullName}`);
        console.log(`   ${status}`);
        console.log(`   📍 ${member.regionName}\n`);

        successCount++;
      } catch (error) {
        console.error(`❌ Error creating ${data.fullName}:`, error.message);
        errorCount++;
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("📊 SEEDING SUMMARY");
    console.log("=".repeat(70));
    console.log(`✅ Successfully created: ${successCount} members`);
    console.log(`⏭️  Skipped (already exist): ${skippedCount} members`);
    console.log(`❌ Failed: ${errorCount} members`);
    console.log(`📝 Total attempted: ${memberData.length} members`);
    console.log("=".repeat(70) + "\n");

    // Show detailed statistics
    const totalMembers = await Member.count();
    const activeMembers = await Member.count({ where: { isActive: true } });
    const inactiveMembers = await Member.count({ where: { isActive: false } });

    const { Op } = require("sequelize");
    const membersWithDebt = await Member.count({
      where: {
        totalDebt: { [Op.gt]: 0 },
      },
    });

    const newMembers = await Member.count({
      where: {
        totalTransactions: 0,
      },
    });

    console.log("📈 DATABASE STATISTICS");
    console.log("=".repeat(70));
    console.log(`Total members: ${totalMembers}`);
    console.log(`├─ Active members: ${activeMembers}`);
    console.log(`├─ Inactive members: ${inactiveMembers}`);
    console.log(`├─ Members with debt: ${membersWithDebt}`);
    console.log(`└─ New members (no transactions): ${newMembers}`);
    console.log("=".repeat(70) + "\n");

    // Calculate total debt and points
    const members = await Member.findAll();
    const totalDebtSum = members.reduce(
      (sum, m) => sum + parseFloat(m.totalDebt || 0),
      0
    );
    const totalPointsSum = members.reduce(
      (sum, m) => sum + parseInt(m.totalPoints || 0),
      0
    );
    const totalTransactionsSum = members.reduce(
      (sum, m) => sum + parseInt(m.totalTransactions || 0),
      0
    );
    const totalSpendingSum = members.reduce(
      (sum, m) => sum + parseFloat(m.monthlySpending || 0),
      0
    );

    console.log("💰 FINANCIAL STATISTICS");
    console.log("=".repeat(70));
    console.log(
      `Total Debt (Piutang): Rp ${totalDebtSum.toLocaleString("id-ID")}`
    );
    console.log(
      `Total Points: ${totalPointsSum.toLocaleString("id-ID")} points`
    );
    console.log(
      `Total Transactions: ${totalTransactionsSum.toLocaleString(
        "id-ID"
      )} transactions`
    );
    console.log(
      `Total Monthly Spending: Rp ${totalSpendingSum.toLocaleString("id-ID")}`
    );
    console.log("=".repeat(70) + "\n");

    // Show members by region
    console.log("🗺️  MEMBERS BY REGION");
    console.log("=".repeat(70));

    const regionCodes = [
      "BDG",
      "KBG",
      "KBB",
      "CMH",
      "GRT",
      "SMD",
      "TSM",
      "SMI",
      "CJR",
      "BGR",
    ];

    for (const regionCode of regionCodes) {
      const count = await Member.count({ where: { regionCode } });
      if (count > 0) {
        const regionMembers = await Member.findAll({
          where: { regionCode },
          order: [["uniqueId", "ASC"]],
        });

        const regionDebt = regionMembers.reduce(
          (sum, m) => sum + parseFloat(m.totalDebt || 0),
          0
        );
        const regionPoints = regionMembers.reduce(
          (sum, m) => sum + parseInt(m.totalPoints || 0),
          0
        );

        console.log(
          `\n${regionCode} (${REGIONS[regionCode]}): ${count} member(s)`
        );
        console.log(
          `  💳 Total Debt: Rp ${regionDebt.toLocaleString("id-ID")}`
        );
        console.log(
          `  ⭐ Total Points: ${regionPoints.toLocaleString("id-ID")}`
        );

        regionMembers.forEach((m) => {
          let badge = "";
          if (!m.isActive) badge = "❌";
          else if (m.totalDebt > 0) badge = "💳";
          else if (m.totalPoints > 1000) badge = "⭐";
          else if (m.totalTransactions === 0) badge = "🆕";
          else badge = "✅";

          console.log(`  ${badge} ${m.uniqueId}: ${m.fullName}`);
          if (m.totalDebt > 0) {
            console.log(
              `      └─ Debt: Rp ${parseFloat(m.totalDebt).toLocaleString(
                "id-ID"
              )}`
            );
          }
          if (m.totalPoints > 0) {
            console.log(`      └─ Points: ${m.totalPoints}`);
          }
        });
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("🎉 Advanced seeding completed successfully!");
    console.log("=".repeat(70));
    console.log("\n💡 TIP: You now have realistic test data for:");
    console.log("  - Testing credit/debt features");
    console.log("  - Testing points redemption");
    console.log("  - Testing member search and filtering");
    console.log("  - Testing reports and analytics\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error during seeding:", error);
    process.exit(1);
  }
};

// Run seeder
seedMembersAdvanced();
