// ============================================
// src/seeders/seedMembers.js
// Seeder untuk membuat data member dummy
// ============================================
const { sequelize } = require("../config/database");
const Member = require("../models/Member");
require("dotenv").config();

// Data member dummy untuk setiap region
const memberData = [
  // Region: Bandung (BDG)
  {
    nik: "3273010101900001",
    fullName: "Ahmad Hidayat",
    address: "Jl. Merdeka No. 123, Bandung",
    regionCode: "BDG",
    whatsapp: "081234567890",
    gender: "Laki-laki",
  },
  {
    nik: "3273010201900002",
    fullName: "Siti Nurhaliza",
    address: "Jl. Sudirman No. 456, Bandung",
    regionCode: "BDG",
    whatsapp: "082345678901",
    gender: "Perempuan",
  },
  {
    nik: "3273010301900003",
    fullName: "Budi Santoso",
    address: "Jl. Asia Afrika No. 789, Bandung",
    regionCode: "BDG",
    whatsapp: "083456789012",
    gender: "Laki-laki",
  },

  // Region: Kabupaten Bandung (KBG)
  {
    nik: "3204010101900004",
    fullName: "Dewi Lestari",
    address: "Jl. Raya Soreang No. 100, Kabupaten Bandung",
    regionCode: "KBG",
    whatsapp: "084567890123",
    gender: "Perempuan",
  },
  {
    nik: "3204010201900005",
    fullName: "Eko Prasetyo",
    address: "Jl. Raya Majalaya No. 200, Kabupaten Bandung",
    regionCode: "KBG",
    whatsapp: "085678901234",
    gender: "Laki-laki",
  },

  // Region: Cimahi (CMH)
  {
    nik: "3277010101900006",
    fullName: "Fitri Handayani",
    address: "Jl. Baros No. 50, Cimahi",
    regionCode: "CMH",
    whatsapp: "086789012345",
    gender: "Perempuan",
  },
  {
    nik: "3277010201900007",
    fullName: "Gunawan Wijaya",
    address: "Jl. Raya Cibabat No. 75, Cimahi",
    regionCode: "CMH",
    whatsapp: "087890123456",
    gender: "Laki-laki",
  },

  // Region: Garut (GRT)
  {
    nik: "3205010101900008",
    fullName: "Hendra Saputra",
    address: "Jl. Cimanuk No. 25, Garut",
    regionCode: "GRT",
    whatsapp: "088901234567",
    gender: "Laki-laki",
  },
  {
    nik: "3205010201900009",
    fullName: "Indah Permata",
    address: "Jl. Ahmad Yani No. 30, Garut",
    regionCode: "GRT",
    whatsapp: "089012345678",
    gender: "Perempuan",
  },

  // Region: Sumedang (SMD)
  {
    nik: "3211010101900010",
    fullName: "Joko Susanto",
    address: "Jl. Mayor Abdurachman No. 15, Sumedang",
    regionCode: "SMD",
    whatsapp: "081123456789",
    gender: "Laki-laki",
  },
  {
    nik: "3211010201900011",
    fullName: "Kartika Sari",
    address: "Jl. Prabu Geusan Ulun No. 20, Sumedang",
    regionCode: "SMD",
    whatsapp: "082234567890",
    gender: "Perempuan",
  },

  // Region: Tasikmalaya (TSM)
  {
    nik: "3278010101900012",
    fullName: "Lukman Hakim",
    address: "Jl. Sutisna Senjaya No. 45, Tasikmalaya",
    regionCode: "TSM",
    whatsapp: "083345678901",
    gender: "Laki-laki",
  },
  {
    nik: "3278010201900013",
    fullName: "Maya Angelina",
    address: "Jl. HZ Mustofa No. 60, Tasikmalaya",
    regionCode: "TSM",
    whatsapp: "084456789012",
    gender: "Perempuan",
  },

  // Region: Sukabumi (SMI)
  {
    nik: "3272010101900014",
    fullName: "Nanda Pratama",
    address: "Jl. Pelabuhan II No. 35, Sukabumi",
    regionCode: "SMI",
    whatsapp: "085567890123",
    gender: "Laki-laki",
  },
  {
    nik: "3272010201900015",
    fullName: "Olivia Putri",
    address: "Jl. Sukaraja No. 40, Sukabumi",
    regionCode: "SMI",
    whatsapp: "086678901234",
    gender: "Perempuan",
  },

  // Region: Cianjur (CJR)
  {
    nik: "3203010101900016",
    fullName: "Putra Ramadhan",
    address: "Jl. Dr. Muwardi No. 12, Cianjur",
    regionCode: "CJR",
    whatsapp: "087789012345",
    gender: "Laki-laki",
  },
  {
    nik: "3203010201900017",
    fullName: "Qory Sandrina",
    address: "Jl. Veteran No. 18, Cianjur",
    regionCode: "CJR",
    whatsapp: "088890123456",
    gender: "Perempuan",
  },

  // Region: Bogor (BGR)
  {
    nik: "3271010101900018",
    fullName: "Ridwan Kamil",
    address: "Jl. Pajajaran No. 99, Bogor",
    regionCode: "BGR",
    whatsapp: "089901234567",
    gender: "Laki-laki",
  },
  {
    nik: "3271010201900019",
    fullName: "Sarah Azhari",
    address: "Jl. Raya Tajur No. 88, Bogor",
    regionCode: "BGR",
    whatsapp: "081012345678",
    gender: "Perempuan",
  },

  // Region: Kabupaten Bandung Barat (KBB)
  {
    nik: "3217010101900020",
    fullName: "Tono Sumarno",
    address: "Jl. Kolonel Masturi No. 150, Kab. Bandung Barat",
    regionCode: "KBB",
    whatsapp: "082123456789",
    gender: "Laki-laki",
  },
];

const seedMembers = async () => {
  try {
    console.log("🌱 Starting member seeding...\n");

    // Connect to database
    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    // Sync models
    await sequelize.sync({ force: false });
    console.log("✅ Models synced\n");

    // Check if members already exist
    const existingMembers = await Member.count();
    if (existingMembers > 0) {
      console.log(
        `⚠️  Warning: ${existingMembers} members already exist in database`
      );
      console.log("Do you want to continue? This will add more members.");
      console.log("If you want to reset, drop the members table first.\n");
    }

    console.log(`📝 Creating ${memberData.length} members...\n`);

    let successCount = 0;
    let errorCount = 0;

    // Create members one by one
    for (const data of memberData) {
      try {
        // Check if NIK already exists
        const existingNik = await Member.findOne({ where: { nik: data.nik } });
        if (existingNik) {
          console.log(`⏭️  Skipped: ${data.fullName} (NIK already exists)`);
          continue;
        }

        // Generate unique ID
        const uniqueId = await Member.generateUniqueId(data.regionCode);

        // Get region name
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
          totalDebt: 0,
          totalTransactions: 0,
          monthlySpending: 0,
          totalPoints: 0,
          isActive: true,
        });

        console.log(
          `✅ Created: ${member.uniqueId} - ${member.fullName} (${member.regionName})`
        );
        successCount++;
      } catch (error) {
        console.error(`❌ Error creating ${data.fullName}:`, error.message);
        errorCount++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 SEEDING SUMMARY");
    console.log("=".repeat(60));
    console.log(`✅ Successfully created: ${successCount} members`);
    console.log(`❌ Failed: ${errorCount} members`);
    console.log(`📝 Total attempted: ${memberData.length} members`);
    console.log("=".repeat(60) + "\n");

    // Show some statistics
    const totalMembers = await Member.count();
    const activeMembers = await Member.count({ where: { isActive: true } });

    console.log("📈 DATABASE STATISTICS");
    console.log("=".repeat(60));
    console.log(`Total members in database: ${totalMembers}`);
    console.log(`Active members: ${activeMembers}`);
    console.log(`Inactive members: ${totalMembers - activeMembers}`);
    console.log("=".repeat(60) + "\n");

    // Show members by region
    console.log("🗺️  MEMBERS BY REGION");
    console.log("=".repeat(60));

    const REGIONS = [
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

    for (const regionCode of REGIONS) {
      const count = await Member.count({ where: { regionCode } });
      if (count > 0) {
        const members = await Member.findAll({
          where: { regionCode },
          order: [["uniqueId", "ASC"]],
        });
        console.log(`\n${regionCode}: ${count} member(s)`);
        members.forEach((m) => {
          console.log(`  - ${m.uniqueId}: ${m.fullName}`);
        });
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("🎉 Seeding completed successfully!");
    console.log("=".repeat(60) + "\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error during seeding:", error);
    process.exit(1);
  }
};

// Run seeder
seedMembers();
