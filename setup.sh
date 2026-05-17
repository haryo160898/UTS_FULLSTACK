#!/bin/bash

# HR Management System - Setup Script
# This script automates the database and application setup

echo "================================"
echo "HR Management System - Setup"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if MySQL is installed
echo "[*] Checking MySQL installation..."
if ! command -v mysql &> /dev/null; then
    echo -e "${RED}[✗] MySQL is not installed${NC}"
    echo "Please install MySQL first:"
    echo "  macOS: brew install mysql-server"
    echo "  Ubuntu: sudo apt-get install mysql-server"
    echo "  Windows: Download from https://dev.mysql.com/downloads/mysql/"
    exit 1
fi
echo -e "${GREEN}[✓] MySQL found${NC}"
echo ""

# Check if .env.local exists
echo "[*] Checking .env.local..."
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}[!] Creating .env.local${NC}"
    cat > .env.local << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=411231174_haryokusumow
DB_CHARSET=utf8mb4
DB_TIMEZONE=+00:00

# Node Environment
NODE_ENV=development

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000
API_PORT=5000
API_HOST=localhost

# JWT Configuration
JWT_SECRET=hr-system-secret-jwt-key-2024-production-secure
REFRESH_SECRET=hr-system-refresh-secret-key-2024-production
JWT_EXPIRES_IN=15m
REFRESH_EXPIRES_IN=7d

# Google reCAPTCHA Keys
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Le1D-EsAAAAAGh-_uhDsHNOHu32cNBDkyNLMFIS
RECAPTCHA_SECRET_KEY=6Le1D-EsAAAAAKELC-B3oTOYhy_CEd-M7cH2RBOW

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads
EOF
    echo -e "${GREEN}[✓] .env.local created${NC}"
else
    echo -e "${GREEN}[✓] .env.local exists${NC}"
fi
echo ""

# Read MySQL password
echo "[*] MySQL Setup"
read -p "Enter MySQL root password (default: root): " -e -i "root" DB_PASSWORD
echo ""

# Update .env.local with correct password
echo "[*] Updating .env.local with MySQL password..."
sed -i.bak "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env.local
echo -e "${GREEN}[✓] .env.local updated${NC}"
echo ""

# Create database
echo "[*] Creating database..."
mysql -u root -p"$DB_PASSWORD" << EOF
CREATE DATABASE IF NOT EXISTS \`411231174_haryokusumow\`;
SHOW DATABASES;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}[✓] Database created${NC}"
else
    echo -e "${RED}[✗] Failed to create database${NC}"
    echo "Please check your MySQL password and try again"
    exit 1
fi
echo ""

# Run database setup script
echo "[*] Running database setup script..."
mysql -u root -p"$DB_PASSWORD" 411231174_haryokusumow < database-setup.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}[✓] Database tables created${NC}"
else
    echo -e "${RED}[✗] Failed to create tables${NC}"
    echo "Please check database-setup.sql"
    exit 1
fi
echo ""

# Verify database
echo "[*] Verifying database..."
TABLES=$(mysql -u root -p"$DB_PASSWORD" -e "USE 411231174_haryokusumow; SHOW TABLES;" 2>/dev/null | wc -l)

if [ "$TABLES" -gt 0 ]; then
    echo -e "${GREEN}[✓] Database verified${NC}"
    mysql -u root -p"$DB_PASSWORD" -e "USE 411231174_haryokusumow; SHOW TABLES;"
else
    echo -e "${YELLOW}[!] No tables found in database${NC}"
fi
echo ""

# Install dependencies
echo "[*] Installing dependencies..."
if command -v pnpm &> /dev/null; then
    pnpm install
elif command -v npm &> /dev/null; then
    npm install
else
    echo -e "${RED}[✗] Neither pnpm nor npm found${NC}"
    exit 1
fi
echo -e "${GREEN}[✓] Dependencies installed${NC}"
echo ""

echo "================================"
echo -e "${GREEN}Setup Complete!${NC}"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Open a new terminal window"
echo "2. Start backend:  node server.js"
echo "3. Open another terminal window"
echo "4. Start frontend: pnpm run dev"
echo "5. Open http://localhost:3000/login"
echo ""
echo "Login credentials:"
echo "  Email: admin@hr-system.com"
echo "  Password: admin123"
echo ""
echo "IMPORTANT: Change the password immediately after first login!"
echo ""
