// ============================================
// src/scripts/fixMemberData.js
// Script untuk memperbaiki data member yang bermasalah
// ============================================
const { sequelize } = require("../config/database");
const Member = require("../models/Member");
require("dotenv").config();

const fixMemberData = async () => {
  try {
    console.log("🔧 Starting member data fix...\n");

    // Connect to database
    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    // Get all members
    const members = await Member.findAll({
      where: { regionCode: "BDG" },
      order: [["uniqueId", "ASC"]],
    });

    console.log(`Found ${members.length} BDG members\n`);

    // Region mapping
    const REGIONS = {
      BDG: "Bandung",
      KBG: "Kabupaten Bandung",
      KBB: "Kabupaten Bandung Barat",
      CMH: "Cimahi",
      GRT: "Garut",
      SMD: "Sumedang",
      TSM: "Tasikmalaya",
      SMI: "Kota Sukabumi",
      CJR: "Cianjur",
      BGR: "Bogor",
    };

    let fixedCount = 0;

    for (const member of members) {
      const needsFix = !member.regionName || member.regionName === null;

      if (needsFix) {
        const regionName = REGIONS[member.regionCode] || "Unknown";

        await member.update({
          regionName: regionName,
          totalDebt: member.totalDebt || 0,
          totalTransactions: member.totalTransactions || 0,
          monthlySpending: member.monthlySpending || 0,
          totalPoints: member.totalPoints || 0,
        });

        console.log(`✅ Fixed: ${member.uniqueId} - ${member.fullName}`);
        fixedCount++;
      } else {
        console.log(`✓ OK: ${member.uniqueId} - ${member.fullName}`);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`🎉 Fixed ${fixedCount} members`);
    console.log("=".repeat(60));

    // Test search for all BDG members
    console.log("\n🔍 Testing search for all BDG members:\n");

    for (const member of members) {
      try {
        const found = await Member.findOne({
          where: { uniqueId: member.uniqueId },
        });

        if (found && found.isActive) {
          console.log(`✅ ${found.uniqueId}: ${found.fullName} - SEARCHABLE`);
        } else if (found && !found.isActive) {
          console.log(`⚠️  ${found.uniqueId}: ${found.fullName} - INACTIVE`);
        } else {
          console.log(`❌ ${member.uniqueId}: NOT FOUND`);
        }
      } catch (error) {
        console.log(`❌ ${member.uniqueId}: ERROR - ${error.message}`);
      }
    }

    console.log("\n✅ All done!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
};

// Run fix
fixMemberData();
