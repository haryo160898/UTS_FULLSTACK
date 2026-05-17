@echo off
REM HR Management System - Windows Setup Script

echo.
echo ================================
echo HR Management System - Setup
echo ================================
echo.

REM Check if MySQL is installed
echo [*] Checking MySQL installation...
mysql --version >nul 2>&1
if errorlevel 1 (
    echo [X] MySQL is not installed or not in PATH
    echo.
    echo Please install MySQL first:
    echo   Download from: https://dev.mysql.com/downloads/mysql/
    echo.
    echo Or add MySQL to PATH:
    echo   1. Find MySQL installation folder
    echo   2. Add bin folder to Windows PATH
    echo.
    pause
    exit /b 1
)
echo [OK] MySQL found
echo.

REM Check if .env.local exists
echo [*] Checking .env.local...
if not exist .env.local (
    echo [!] Creating .env.local...
    (
        echo # Database Configuration
        echo DB_HOST=localhost
        echo DB_PORT=3306
        echo DB_USER=root
        echo DB_PASSWORD=root
        echo DB_NAME=411231174_haryokusumow
        echo DB_CHARSET=utf8mb4
        echo DB_TIMEZONE=+00:00
        echo.
        echo # Node Environment
        echo NODE_ENV=development
        echo.
        echo # API Configuration
        echo NEXT_PUBLIC_API_URL=http://localhost:5000
        echo API_PORT=5000
        echo API_HOST=localhost
        echo.
        echo # JWT Configuration
        echo JWT_SECRET=hr-system-secret-jwt-key-2024-production-secure
        echo REFRESH_SECRET=hr-system-refresh-secret-key-2024-production
        echo JWT_EXPIRES_IN=15m
        echo REFRESH_EXPIRES_IN=7d
        echo.
        echo # Google reCAPTCHA Keys
        echo NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Le1D-EsAAAAAGh-_uhDsHNOHu32cNBDkyNLMFIS
        echo RECAPTCHA_SECRET_KEY=6Le1D-EsAAAAAKELC-B3oTOYhy_CEd-M7cH2RBOW
        echo.
        echo # File Upload Configuration
        echo MAX_FILE_SIZE=10485760
        echo UPLOAD_DIR=uploads
    ) > .env.local
    echo [OK] .env.local created
) else (
    echo [OK] .env.local exists
)
echo.

REM Ask for MySQL password
echo [*] MySQL Setup
set /p DB_PASSWORD="Enter MySQL root password (default: root): "
if "%DB_PASSWORD%"=="" set "DB_PASSWORD=root"
echo.

REM Update .env.local
echo [*] Updating .env.local...
REM Using simple replacement for Windows
for /f "delims=" %%A in (.env.local) do (
    if "%%A"=="DB_PASSWORD=root" (
        echo DB_PASSWORD=%DB_PASSWORD%
    ) else (
        echo %%A
    )
) > .env.local.tmp
move /Y .env.local.tmp .env.local
echo [OK] .env.local updated
echo.

REM Create database
echo [*] Creating database...
mysql -u root -p%DB_PASSWORD% << EOF
CREATE DATABASE IF NOT EXISTS `411231174_haryokusumow`;
SHOW DATABASES;
EOF

if errorlevel 1 (
    echo [X] Failed to create database
    echo Please check your MySQL password and try again
    pause
    exit /b 1
)
echo [OK] Database created
echo.

REM Run database setup script
echo [*] Running database setup script...
mysql -u root -p%DB_PASSWORD% 411231174_haryokusumow < database-setup.sql

if errorlevel 1 (
    echo [X] Failed to create tables
    echo Please check database-setup.sql
    pause
    exit /b 1
)
echo [OK] Database tables created
echo.

REM Verify database
echo [*] Verifying database...
mysql -u root -p%DB_PASSWORD% -e "USE 411231174_haryokusumow; SHOW TABLES;"
echo.

REM Install dependencies
echo [*] Installing dependencies...
if exist package.json (
    where pnpm >nul 2>&1
    if errorlevel 1 (
        where npm >nul 2>&1
        if errorlevel 1 (
            echo [X] Neither pnpm nor npm found
            pause
            exit /b 1
        )
        echo Using npm...
        call npm install
    ) else (
        echo Using pnpm...
        call pnpm install
    )
)
echo [OK] Dependencies installed
echo.

echo ================================
echo [OK] Setup Complete!
echo ================================
echo.
echo Next steps:
echo 1. Open Command Prompt/PowerShell Window 1
echo 2. Run: node server.js
echo 3. Open Command Prompt/PowerShell Window 2
echo 4. Run: pnpm run dev (or npm run dev)
echo 5. Open browser: http://localhost:3000/login
echo.
echo Login credentials:
echo   Email: admin@hr-system.com
echo   Password: admin123
echo.
echo IMPORTANT: Change password immediately after first login!
echo.
pause
