-- HR Management System Database Setup
-- Run this SQL script to create the database and tables

-- Create Database
CREATE DATABASE IF NOT EXISTS `411231174_haryokusumow`;
USE `411231174_haryokusumow`;

-- ========================================
-- Employees Table
-- ========================================
CREATE TABLE IF NOT EXISTS `employees` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_code` varchar(20) NOT NULL UNIQUE,
  `full_name` varchar(100) NOT NULL,
  `gender` enum('Male','Female') DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `email` varchar(100) NOT NULL UNIQUE,
  `phone_number` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `postal_code` varchar(10) DEFAULT NULL,
  `division` varchar(100) DEFAULT NULL,
  `position` varchar(100) DEFAULT NULL,
  `salary` decimal(12,2) DEFAULT NULL,
  `join_date` date DEFAULT NULL,
  `employment_status` enum('Active','Inactive','Resigned') DEFAULT 'Active',
  `profile_photo` varchar(255) DEFAULT NULL,
  `emergency_contact` varchar(100) DEFAULT NULL,
  `emergency_phone` varchar(20) DEFAULT NULL,
  `education` varchar(100) DEFAULT NULL,
  `marital_status` enum('Single','Married') DEFAULT 'Single',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_code` (`employee_code`),
  UNIQUE KEY `email` (`email`),
  INDEX `idx_division` (`division`),
  INDEX `idx_employment_status` (`employment_status`),
  INDEX `idx_join_date` (`join_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ========================================
-- Users Table
-- ========================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) DEFAULT NULL,
  `username` varchar(100) NOT NULL UNIQUE,
  `email` varchar(100) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL,
  `role` enum('Admin','Employee') DEFAULT 'Employee',
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `remember_token` varchar(255) DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_users_employee` (`employee_id`),
  INDEX `idx_role` (`role`),
  INDEX `idx_status` (`status`),
  CONSTRAINT `fk_users_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ========================================
-- Sample Data
-- ========================================

-- Sample Admin User
-- Username: admin
-- Email: admin@hr-system.com
-- Password: admin123 (bcrypt hash)
INSERT INTO `users` (`username`, `email`, `password`, `role`, `status`, `created_at`, `updated_at`)
VALUES ('admin', 'admin@hr-system.com', '$2a$10$1vCJQoVd5TvvXmVp/YFf.Of/aDfHN7Xj5.7OxJKT1TlWZqB3zcPBa', 'Admin', 'Active', NOW(), NOW());

-- Sample Employee Data
INSERT INTO `employees` (
  `employee_code`, `full_name`, `gender`, `birth_date`, `email`, `phone_number`,
  `address`, `city`, `province`, `postal_code`, `division`, `position`, `salary`,
  `join_date`, `employment_status`, `emergency_contact`, `emergency_phone`,
  `education`, `marital_status`
) VALUES (
  'EMP001', 'John Doe', 'Male', '1990-01-15', 'john.doe@hr-system.com', '+62812345678',
  '123 Main Street', 'Jakarta', 'Jakarta', '12000', 'IT', 'Software Engineer', 5000000,
  '2022-01-10', 'Active', 'Jane Doe', '+62812345679', 'S1 Computer Science', 'Single'
),
(
  'EMP002', 'Jane Smith', 'Female', '1992-03-20', 'jane.smith@hr-system.com', '+62812345680',
  '456 Oak Avenue', 'Bandung', 'Jawa Barat', '40123', 'HR', 'HR Manager', 4500000,
  '2021-06-15', 'Active', 'Mike Smith', '+62812345681', 'S1 Business', 'Married'
),
(
  'EMP003', 'Michael Johnson', 'Male', '1988-07-10', 'michael.johnson@hr-system.com', '+62812345682',
  '789 Pine Road', 'Surabaya', 'Jawa Timur', '60188', 'Finance', 'Finance Director', 6000000,
  '2020-03-01', 'Active', 'Sarah Johnson', '+62812345683', 'S1 Accounting', 'Married'
);

-- ========================================
-- Views for Reporting (Optional)
-- ========================================

-- View for Employee Statistics
CREATE OR REPLACE VIEW `v_employee_statistics` AS
SELECT 
  d.division,
  COUNT(*) as total_employees,
  SUM(CASE WHEN e.employment_status = 'Active' THEN 1 ELSE 0 END) as active_employees,
  AVG(e.salary) as average_salary,
  MAX(e.salary) as max_salary,
  MIN(e.salary) as min_salary
FROM employees e
LEFT JOIN (SELECT DISTINCT division FROM employees WHERE division IS NOT NULL) d
ON e.division = d.division
WHERE e.division IS NOT NULL
GROUP BY d.division;

-- View for Employee Count by Status
CREATE OR REPLACE VIEW `v_employee_by_status` AS
SELECT 
  employment_status,
  COUNT(*) as count
FROM employees
GROUP BY employment_status;
