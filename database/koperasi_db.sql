-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Oct 07, 2025 at 11:22 PM
-- Server version: 8.0.30
-- PHP Version: 8.3.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `koperasi_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `members`
--

CREATE TABLE `members` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `unique_id` varchar(20) NOT NULL COMMENT 'Format: BDG-001, KBG-002, dll',
  `nik` varchar(16) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `address` varchar(255) NOT NULL,
  `region_code` varchar(10) NOT NULL COMMENT 'Kode wilayah: BDG, KBG, CMH, dll',
  `region_name` varchar(100) NOT NULL,
  `whatsapp` varchar(15) NOT NULL,
  `gender` enum('Laki-laki','Perempuan') NOT NULL,
  `total_debt` decimal(15,2) NOT NULL DEFAULT '0.00' COMMENT 'Total hutang member ke koperasi',
  `total_transactions` int NOT NULL DEFAULT '0',
  `monthly_spending` decimal(15,2) NOT NULL DEFAULT '0.00' COMMENT 'Total belanja bulan ini',
  `total_points` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `members`
--

INSERT INTO `members` (`id`, `unique_id`, `nik`, `full_name`, `address`, `region_code`, `region_name`, `whatsapp`, `gender`, `total_debt`, `total_transactions`, `monthly_spending`, `total_points`, `is_active`, `created_at`, `updated_at`) VALUES
('03ddf534-c4e6-4ab9-ac73-22d51aff85a5', 'GRT-002', '3205010201900009', 'Indah Permata', 'Jl. Ahmad Yani No. 30, Garut', 'GRT', 'Garut', '089012345678', 'Perempuan', 0.00, 0, 0.00, 0, 1, '2025-10-08 04:43:46', '2025-10-08 04:43:46'),
('0e8a3772-11ef-4c55-a010-03b5e90918cf', 'BDG-007', '3273010501950005', 'Andi Wijaya Kusuma', 'Jl. Buah Batu No. 200, Bandung', 'BDG', 'Bandung', '081234567555', 'Laki-laki', 0.00, 0, 0.00, 0, 1, '2025-10-08 04:45:51', '2025-10-08 04:45:51'),
('0fd7596b-0c38-451f-ad5e-92a8230aa301', 'BDG-005', '3273010201880002', 'Ibu Fatimah Zahra', 'Jl. Dago No. 88, Bandung', 'BDG', 'Bandung', '081234567222', 'Perempuan', 1750000.00, 32, 950000.00, 850, 1, '2025-10-08 04:45:51', '2025-10-08 04:45:51'),
('123f5e1c-1257-4cfa-8171-ccdc5ac8c012', 'SMI-002', '3272010201900015', 'Olivia Putri', 'Jl. Sukaraja No. 40, Sukabumi', 'SMI', 'Kota Sukabumi', '086678901234', 'Perempuan', 0.00, 0, 0.00, 0, 1, '2025-10-08 04:43:46', '2025-10-08 04:43:46'),
('16dbfeff-8adf-4465-84d6-5b7c88e6726d', 'CMH-001', '3277010101900006', 'Fitri Handayani', 'Jl. Baros No. 50, Cimahi', 'CMH', 'Cimahi', '086789012345', 'Perempuan', 0.00, 0, 0.00, 0, 1, '2025-10-08 04:43:46', '2025-10-08 04:43:46'),
('1ceda887-b2ae-4eec-9b28-18f6d7eb0f81', 'BGR-001', '3271010101900018', 'Ridwan Kamil', 'Jl. Pajajaran No. 99, Bogor', 'BGR', 'Bogor', '089901234567', 'Laki-laki', 0.00, 0, 0.00, 0, 1, '2025-10-08 04:43:46', '2025-10-08 04:43:46'),
('2faac765-fd76-486e-b5fb-c3c81410a1c1', 'CMH-002', '3277010201900007', 'Gunawan Wijaya', 'Jl. Raya Cibabat No. 75, Cimahi', 'CMH', 'Cimahi', '087890123456', 'Laki-laki', 0.00, 0, 0.00, 0, 1, '2025-10-08 04:43:46', '2025-10-08 04:43:46'),
('305218c3-4b9c-49b7-b89e-152f9c500ccb', 'BDG-006', '3273010401920004', 'Ny. Ratna Sari Dewi', 'Jl. Setiabudi No. 100, Bandung', 'BDG', 'Bandung', '081234567444', 'Perempuan', 0.00, 85, 2800000.00, 4200, 1, '2025-10-08 04:45:51', '2025-10-08 04:45:51'),
('318bab3f-0de2-4c91-8f72-e15d51aebff4', 'BDG-011', '3217085909010013', 'admin2', 'JL contoh 2 margha', 'BDG', 'Bandung', '081234567891', 'Laki-laki', 0.00, 0, 0.00, 0, 1, '2025-10-08 05:21:15', '2025-10-08 05:21:15'),
('3862527d-6613-441d-af44-da178ad8a2c7', 'BDG-001', '3273010101900001', 'Ahmad Hidayat', 'Jl. Merdeka No. 123, Bandung', 'BDG', 'Bandung', '081234567890', 'Laki-laki', 0.00, 0, 0.00, 0, 1, '2025-10-08 04:43:46', '2025-10-08 04:43:46'),
('3b5b3367-23d5-4e0a-b1fc-2031c5296a58', 'BGR-004', '3271010201920002', 'Maya Anggraini', 'Jl. Raya Tajur No. 200, Bogor', 'BGR', 'Bogor', '089234567222', 'Perempuan', 2100000.00, 55, 1850000.00, 1650, 1, '2025-10-08 04:45:51', '2025-10-08 04:45:51'),
('45d1db26-5328-4419-9448-2cc7b5bd4f42', 'CMH-003', '3277010101870001', 'H. Cecep Ruhyat', 'Jl. Raya Baros No. 100, Cimahi', 'CMH', 'Cimahi', '082234567111', 'Laki-laki', 1200000.00, 28, 850000.00, 680, 1, '2025-10-08 04:45:51', '2025-10-08 04:45:51'),
('49ccbe64-8648-43f4-99a5-91e4ff9a6b50', 'BGR-002', '3271010201900019', 'Sarah Azhari', 'Jl. Raya Tajur No. 88, Bogor', 'BGR', 'Bogor', '081012345678', 'Perempuan', 0.00, 0, 0.00, 0, 1, '2025-10-08 04:43:46', '2025-10-08 04:43:46'),
('4b820fc5-29c6-4f0d-9880-d10bd77b1f22', 'CJR-003', '3203010101930001', 'Kartika Dewi Lestari', 'Jl. Dr. Muwardi No. 35, Cianjur', 'CJR', 'Cianjur', '088234567111', 'Perempuan', 600000.00, 18, 520000.00, 320, 1, '2025-10-08 04:45:51', '2025-10-08 04:45:51'),
('4cb3711a-facc-4b85-b110-98bf518a237e', 'BDG-010', '3217085909010012', 'admin2', 'JL. Contoh', 'BDG', 'Bandung', '081234567890', 'Laki-laki', 0.00, 0, 0.00, 0, 1, '2025-10-08 05:15:58', '2025-10-08 05:15:58'),
('5a652f62-e232-4153-9051-0cf4d361c512', 'BDG-002', '3273010201900002', 'Siti Nurhaliza', 'Jl. Sudirman No. 456, Bandung', 'BDG', 'Bandung', '082345678901', 'Perempuan', 0.00, 0, 0.00, 0, 1, '2025-10-08 04:43:46', '2025-10-08 04:43:46'),
('5dc4ad00-f43c-443c-895d-f14ad4664300', 'KBG-004', '3204010201920002', 'Fitri Handayani, S.Pd', 'Jl. Majalaya No. 180, Kab. Bandung', 'KBG', 'Kabupaten Bandung', '083234567222', 'Perempuan', 0.00, 38, 1350000.00, 1580, 1, '2025-10-08 04:45:51', '2025-10-08 04:45:51'),
('60981fcb-49ec-431d-9958-a5263189f65b', 'GRT-001', '3205010101900008', 'Hendra Saputra', 'Jl. Cimanuk No. 25, Garut', 'GRT', 'Garut', '088901234567', 'Laki-laki', 0.00, 0, 0.00, 0, 1, '2025-10-08 04:43:46', '2025-10-08 04:43:46'),
('62255913-9cdf-4214-a5e6-bdfb5b1801d4', 'BDG-004', '3273010101850001', 'Haji Abdullah Permana', 'Jl. Cihampelas No. 150, Bandung', 'BDG', 'Bandung', '081234567111', 'Laki-laki', 2500000.00, 45, 1500000.00, 1250, 1, '2025-10-08 04:45:51', '2025-10-08 04:45:51'),
('6673a6c8-fca9-44a3-93a1-b1efd3f69084', 'TSM-001', '3278010101900012', 'Lukman Hakim', 'Jl. Sutisna Senjaya No. 45, Tasikmalaya', 'TSM', 'Tasikmalaya', '083345678901', 'Laki-laki', 0.00, 0, 0.00, 0, 1, '2025-10-08 04:43:46', '2025-10-08 04:43:46'),
('79156721-352f-44da-8bd5-045f6634eecd', 'TSM-003', '3278010101910001', 'Intan Purnama Sari', 'Jl. Sutisna Senjaya No. 120, Tasikmalaya', 'TSM', 'Tasikmalaya', '086234567111', 'Perempuan', 1500000.00, 42, 1150000.00, 980, 1, '2025-10-08 04:45:51', '2025-10-08 04:45:51'),
('795f13da-c605-476e-a414-1d0cdb4a6924', 'BGR-003', '3271010101880001', 'Lukman Hakim, MBA', 'Jl. Pajajaran No. 150, Bogor', 'BGR', 'Bogor', '089234567111', 'Laki-laki', 0.00, 110, 3200000.00, 5800, 1, '2025-10-08 04:45:51', '2025-10-08 04:45:51'),
('840397d5-08c3-4648-8d97-e288207ac33d', 'SMD-002', '3211010201900011', 'Kartika Sari', 'Jl. Prabu Geusan Ulun No. 20, Sumedang', 'SMD', 'Sumedang', '082234567890', 'Perempuan', 0.00, 0, 0.00, 0, 1, '2025-10-08 04:43:46', '2025-10-08 04:43:46'),
('8f38545f-98a4-4f0e-9739-40c0bb673ee8', 'BDG-008', '3273010601980006', 'Bella Anastasia', 'Jl. Soekarno Hatta No. 350, Bandung', 'BDG', 'Bandung', '081234567666', 'Perempuan', 0.00, 0, 0.00, 0, 1, '2025-10-08 04:45:51', '2025-10-08 04:45:51'),
('963a32ea-e98f-4faf-a73e-13575730381d', 'KBG-002', '3204010201900005', 'Eko Prasetyo', 'Jl. Raya Majalaya No. 200, Kabupaten Bandung', 'KBG', 'Kabupaten Bandung', '085678901234', 'Laki-laki', 0.00, 0, 0.00, 0, 1, '2025-10-08 04:43:46', '2025-10-08 04:43:46'),
('9c40ee46-475d-4afc-b45f-98d3ee416c0d', 'TSM-002', '3278010201900013', 'Maya Angelina', 'Jl. HZ Mustofa No. 60, Tasikmalaya', 'TSM', 'Tasikmalaya', '084456789012', 'Perempuan', 0.00, 0, 0.00, 0, 1, '2025-10-08 04:43:46', '2025-10-08 04:43:46'),
('a4adafef-a644-49be-9c17-bc4f35ebced1', 'KBB-001', '3217010101900020', 'Tono Sumarno', 'Jl. Kolonel Masturi No. 150, Kab. Bandung Barat', 'KBB', 'Kabupaten Bandung Barat', '082123456789', 'Laki-laki', 0.00, 0, 0.00, 0, 1, '2025-10-08 04:43:46', '2025-10-08 04:43:46'),
('c6ab89b6-fe8a-40e8-bc5c-3622d1f875cb', 'KBG-003', '3204010101880001', 'Pak Endang Kurnia', 'Jl. Raya Soreang No. 250, Kab. Bandung', 'KBG', 'Kabupaten Bandung', '083234567111', 'Laki-laki', 3500000.00, 65, 2200000.00, 1950, 1, '2025-10-08 04:45:51', '2025-10-08 04:45:51'),
('c7ba4743-de11-44f6-be2e-3b9f997938f7', 'KBB-002', '3217010101900001', 'Nanda Pratama Wijaya', 'Jl. Kolonel Masturi No. 300, Kab. Bandung Barat', 'KBB', 'Kabupaten Bandung Barat', '081334567111', 'Laki-laki', 950000.00, 25, 780000.00, 550, 1, '2025-10-08 04:45:51', '2025-10-08 04:45:51'),
('d1c9d1e1-23f2-4c91-a93d-c8daf6f4ca2b', 'CMH-004', '3277010201900002', 'Devi Novitasari', 'Jl. Cibabat No. 75, Cimahi', 'CMH', 'Cimahi', '082234567222', 'Perempuan', 0.00, 52, 1950000.00, 2850, 1, '2025-10-08 04:45:51', '2025-10-08 04:45:51'),
('d6155d6e-5cdb-4860-abe5-78d03001145c', 'KBG-001', '3204010101900004', 'Dewi Lestari', 'Jl. Raya Soreang No. 100, Kabupaten Bandung', 'KBG', 'Kabupaten Bandung', '084567890123', 'Perempuan', 0.00, 0, 0.00, 0, 1, '2025-10-08 04:43:46', '2025-10-08 04:43:46'),
('d8809c02-4bb4-465b-af42-a19199a83ea0', 'SMI-001', '3272010101900014', 'Nanda Pratama', 'Jl. Pelabuhan II No. 35, Sukabumi', 'SMI', 'Kota Sukabumi', '085567890123', 'Laki-laki', 0.00, 0, 0.00, 0, 1, '2025-10-08 04:43:46', '2025-10-08 04:43:46'),
('df7b1184-ea06-4de4-96e2-6ac772874fb8', 'CJR-001', '3203010101900016', 'Putra Ramadhan', 'Jl. Dr. Muwardi No. 12, Cianjur', 'CJR', 'Cianjur', '087789012345', 'Laki-laki', 0.00, 0, 0.00, 0, 1, '2025-10-08 04:43:46', '2025-10-08 04:43:46'),
('e34575c0-c11f-4795-bcad-1138e65ce501', 'CJR-002', '3203010201900017', 'Qory Sandrina', 'Jl. Veteran No. 18, Cianjur', 'CJR', 'Cianjur', '088890123456', 'Perempuan', 0.00, 0, 0.00, 0, 1, '2025-10-08 04:43:46', '2025-10-08 04:43:46'),
('e5c8e5df-4bde-4d3c-808a-515e9f902ebc', 'BDG-009', '3273010701750007', 'Pak Bambang Sutrisno (NONAKTIF)', 'Jl. Cibeunying No. 45, Bandung', 'BDG', 'Bandung', '081234567777', 'Laki-laki', 500000.00, 15, 0.00, 150, 0, '2025-10-08 04:45:51', '2025-10-08 04:45:51'),
('f0336514-b3b8-4a02-8000-13e24983c52b', 'GRT-003', '3205010101900001', 'Guntur Prasetyo', 'Jl. Cimanuk No. 50, Garut', 'GRT', 'Garut', '084234567111', 'Laki-laki', 850000.00, 22, 680000.00, 450, 1, '2025-10-08 04:45:51', '2025-10-08 04:45:51'),
('f453e181-50f6-4911-87aa-150e87ca7b87', 'SMI-003', '3272010101850001', 'Joko Priyono', 'Jl. Pelabuhan II No. 60, Sukabumi', 'SMI', 'Kota Sukabumi', '087234567111', 'Laki-laki', 0.00, 0, 0.00, 0, 1, '2025-10-08 04:45:51', '2025-10-08 04:45:51'),
('f4eba499-e1cd-4f52-9b55-96a368fe3fa8', 'BDG-003', '3273010301900003', 'Budi Santoso', 'Jl. Asia Afrika No. 789, Bandung', 'BDG', 'Bandung', '083456789012', 'Laki-laki', 0.00, 0, 0.00, 0, 1, '2025-10-08 04:43:46', '2025-10-08 04:43:46'),
('f916f61b-7caa-4c4e-bc00-c2e92a63d3fd', 'SMD-003', '3211010101890001', 'Hendra Gunawan, ST', 'Jl. Mayor Abdurachman No. 30, Sumedang', 'SMD', 'Sumedang', '085234567111', 'Laki-laki', 0.00, 95, 2750000.00, 4150, 1, '2025-10-08 04:45:51', '2025-10-08 04:45:51'),
('fae25ba5-7de1-40c2-b67f-4d6301865c82', 'SMD-001', '3211010101900010', 'Joko Susanto', 'Jl. Mayor Abdurachman No. 15, Sumedang', 'SMD', 'Sumedang', '081123456789', 'Laki-laki', 0.00, 0, 0.00, 0, 1, '2025-10-08 04:43:46', '2025-10-08 04:43:46');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `name` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('ADMIN','KASIR') NOT NULL DEFAULT 'KASIR',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `name`, `password`, `role`, `is_active`, `created_at`, `updated_at`) VALUES
('0aca2c90-f5ce-46d5-8b56-d7ae0a1c87c9', 'admin', 'admin@koperasi.com', 'Administrator', '$2b$10$xNOGExHh98Rm3uOT1/gAdO/KRNAFDMmNrMw09H.wvAxRPjpw.Dom2', 'ADMIN', 1, '2025-10-07 19:02:55', '2025-10-07 19:02:55'),
('71177e67-81cb-4be4-842f-24598d4318a0', 'kasir', 'kasir@koperasi.com', 'Kasir', '$2b$10$hmOY1kgqM3s0SNhqIuHlFeV7GpWprJN8Uy63s5rA1awRrqEfmBONe', 'KASIR', 1, '2025-10-07 19:02:55', '2025-10-07 19:02:55');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `categories_name_unique` (`name`),
  ADD UNIQUE KEY `categories_name` (`name`),
  ADD KEY `categories_is_active` (`is_active`);

--
-- Indexes for table `members`
--
ALTER TABLE `members`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `members_uniqueId_unique` (`unique_id`),
  ADD UNIQUE KEY `members_nik_unique` (`nik`),
  ADD UNIQUE KEY `members_unique_id` (`unique_id`),
  ADD UNIQUE KEY `members_nik` (`nik`),
  ADD KEY `members_region_code` (`region_code`),
  ADD KEY `members_is_active` (`is_active`),
  ADD KEY `members_full_name` (`full_name`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_username_unique` (`username`),
  ADD UNIQUE KEY `users_email_unique` (`email`),
  ADD UNIQUE KEY `users_username` (`username`),
  ADD UNIQUE KEY `users_email` (`email`),
  ADD KEY `users_role` (`role`),
  ADD KEY `users_is_active` (`is_active`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
