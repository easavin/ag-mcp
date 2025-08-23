# 🗄️ AgMCP Database Backup Guide

## 📋 Overview

Automated database backup solution for AgMCP with the following features:
- **Automated scheduling** via cron jobs
- **Compression** to save space
- **Retention management** (configurable)
- **Integrity verification**
- **Easy restore** process
- **Development and production** support

## 🚀 Quick Setup

### 1. **Set Up Automated Backups**
```bash
# Run the interactive setup
./scripts/setup-backup-cron.sh

# Choose your preferred backup frequency:
# 1) Every 6 hours
# 2) Daily at 2 AM  
# 3) Daily at 6 AM
# 4) Twice daily (6 AM and 6 PM)
# 5) Custom schedule
```

### 2. **Test Manual Backup**
```bash
# Create a backup now
./scripts/backup-database.sh

# List recent backups
./scripts/backup-database.sh --list

# Get help
./scripts/backup-database.sh --help
```

### 3. **Monitor Backup Logs**
```bash
# View backup logs
tail -f logs/backup.log

# View recent backup activity
tail -20 logs/backup.log
```

## 📁 File Structure

```
AgMCP/
├── scripts/
│   ├── backup-database.sh      # Main backup script
│   ├── setup-backup-cron.sh    # Cron job setup
│   └── restore-database.sh     # Database restore
├── backups/                    # Backup files (auto-created)
│   ├── agmcp_backup_20250823_140530.sql.gz
│   ├── agmcp_backup_20250823_200530.sql.gz
│   └── ...
└── logs/
    └── backup.log             # Backup activity logs
```

## ⚙️ Configuration

### **Environment Variables**

#### **Database Connection**
```bash
# Primary (recommended)
DATABASE_URL="postgresql://user:password@host:port/database"

# Alternative individual parameters
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_NAME="agmcp_dev"
```

#### **Backup Settings**
```bash
BACKUP_DIR="./backups"              # Backup directory
BACKUP_RETENTION_DAYS="30"          # Keep backups for 30 days
MAX_BACKUPS="50"                     # Maximum number of backups
```

### **Cron Schedule Examples**
```bash
# Daily at 3 AM
0 3 * * *

# Every 6 hours
0 */6 * * *

# Twice daily (morning and evening)
0 6,18 * * *

# Weekly on Sunday at midnight
0 0 * * 0

# Every weekday at 2 AM
0 2 * * 1-5
```

## 🔧 Script Commands

### **Backup Script (`backup-database.sh`)**
```bash
# Create backup
./scripts/backup-database.sh

# List recent backups
./scripts/backup-database.sh --list

# Clean old backups only
./scripts/backup-database.sh --cleanup

# Show help
./scripts/backup-database.sh --help
```

### **Cron Setup (`setup-backup-cron.sh`)**
```bash
# Interactive setup
./scripts/setup-backup-cron.sh

# View current cron jobs
crontab -l

# Edit cron jobs manually
crontab -e
```

### **Restore Script (`restore-database.sh`)**
```bash
# Interactive restore (lists available backups)
./scripts/restore-database.sh

# Restore specific backup
./scripts/restore-database.sh backups/agmcp_backup_20250823_140530.sql.gz

# List available backups
./scripts/restore-database.sh --list

# Show help
./scripts/restore-database.sh --help
```

## 🛡️ Backup Process Details

### **What Gets Backed Up**
- ✅ **All tables** (users, chat_sessions, messages, tokens, etc.)
- ✅ **Table structure** (schema, indexes, constraints)
- ✅ **Data** (all user data, chat history, connections)
- ✅ **Sequences** (auto-increment values)

### **What Doesn't Get Backed Up**
- ❌ **External integrations** (John Deere, Auravant data remains on their servers)
- ❌ **File uploads** (stored separately, not in database)
- ❌ **Environment variables** or configuration files

### **Backup Format**
- **Format**: PostgreSQL SQL dump (compressed with gzip)
- **Naming**: `agmcp_backup_YYYYMMDD_HHMMSS.sql.gz`
- **Compression**: Typically 80-90% size reduction
- **Integrity**: Verified after creation

### **Retention Management**
- **Time-based**: Automatically removes backups older than configured days
- **Count-based**: Keeps only the most recent N backups
- **Manual cleanup**: Can be run separately with `--cleanup` option

## 🔄 Restore Process

### **Safe Restore Steps**
1. **Lists available backups** with dates and sizes
2. **Creates pre-restore backup** of current database
3. **Verifies backup integrity** before proceeding
4. **Confirms destructive operation** with user
5. **Restores database** from selected backup
6. **Verifies successful restore** 

### **Emergency Restore**
```bash
# Quick restore from latest backup
LATEST=$(ls -t backups/agmcp_backup_*.sql.gz | head -1)
./scripts/restore-database.sh "$LATEST"
```

## 📊 Monitoring & Maintenance

### **Check Backup Status**
```bash
# View recent backups
./scripts/backup-database.sh --list

# Check disk usage
du -sh backups/

# Count backups
ls backups/agmcp_backup_*.sql.gz | wc -l

# View backup log
tail -f logs/backup.log
```

### **Cron Job Management**
```bash
# View scheduled jobs
crontab -l

# Check if backups are running
grep "backup-database" logs/backup.log | tail -5

# Test cron job manually
cd /path/to/AgMCP && ./scripts/backup-database.sh
```

### **Troubleshooting**
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT current_database();"

# Verify backup script
./scripts/backup-database.sh --help

# Check disk space
df -h

# Check PostgreSQL client tools
which pg_dump psql
```

## 🚨 Production Deployment

### **Production Setup Checklist**
- [ ] Set `DATABASE_URL` environment variable
- [ ] Configure `BACKUP_DIR` for appropriate location
- [ ] Set up cron job with `setup-backup-cron.sh`
- [ ] Ensure PostgreSQL client tools are installed
- [ ] Test backup and restore process
- [ ] Set up log rotation for `backup.log`
- [ ] Configure monitoring alerts for backup failures

### **Recommended Production Settings**
```bash
# Environment variables for production
BACKUP_DIR="/var/backups/agmcp"
BACKUP_RETENTION_DAYS="90"        # Keep longer in production
MAX_BACKUPS="100"                 # More backups in production

# Suggested cron schedule for production
0 2 * * *    # Daily at 2 AM when traffic is low
```

### **Production Monitoring**
```bash
# Check for backup failures
grep -i "error\|failed" logs/backup.log

# Monitor backup sizes (should be consistent)
ls -lh backups/ | tail -10

# Verify latest backup integrity
LATEST=$(ls -t backups/agmcp_backup_*.sql.gz | head -1)
gzip -t "$LATEST" && echo "✅ Latest backup is valid"
```

## 🎯 Benefits

### **Data Protection**
- **Automated**: No manual intervention required
- **Reliable**: Includes integrity verification
- **Compressed**: Efficient storage usage
- **Versioned**: Multiple restore points available

### **Disaster Recovery**
- **Point-in-time recovery** from any backup
- **Pre-restore backups** prevent double data loss
- **Quick restoration** process
- **Verification** ensures successful recovery

### **Maintenance**
- **Automatic cleanup** of old backups
- **Configurable retention** policies
- **Easy monitoring** via logs
- **Flexible scheduling** options

---

**🛡️ Your database is now protected with automated, reliable backups!** 🎉
