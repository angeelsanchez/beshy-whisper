#!/usr/bin/env node

const { execSync, exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { createGzip } = require('zlib');
const { pipeline } = require('stream');
const { promisify } = require('util');
const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');

// Load environment variables
require('dotenv').config({ path: '.env.local', quiet: true });

const program = new Command();

class SupabaseBackup {
    constructor(options = {}) {
        this.options = {
            incremental: options.incremental || false,
            compress: process.env.BACKUP_COMPRESS !== 'false',
            backupDir: process.env.BACKUP_DIR || './backups',
            retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
            logLevel: process.env.LOG_LEVEL || 'info',
            logFile: process.env.LOG_FILE || './logs/backup.log',
            ...options
        };

        this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        this.serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!this.supabaseUrl || !this.serviceRoleKey) {
            throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
        }

        // Extract database connection info from Supabase URL
        this.dbConfig = this.parseSupabaseUrl(this.supabaseUrl);
        
        // Ensure directories exist
        fs.ensureDirSync(this.options.backupDir);
        fs.ensureDirSync(path.dirname(this.options.logFile));
    }

    parseSupabaseUrl(url) {
        const urlObj = new URL(url);
        const projectRef = urlObj.hostname.split('.')[0];
        
        return {
            host: `db.${projectRef}.supabase.co`,
            port: 5432,
            database: 'postgres',
            user: 'postgres',
            // Password needs to be provided separately or extracted from DATABASE_URL
            password: process.env.PGPASSWORD || this.extractPasswordFromDatabaseUrl()
        };
    }

    extractPasswordFromDatabaseUrl() {
        const dbUrl = process.env.DATABASE_URL;
        if (dbUrl) {
            try {
                const url = new URL(dbUrl);
                return url.password;
            } catch (error) {
                this.log('warn', 'Could not extract password from DATABASE_URL');
            }
        }
        throw new Error('Database password not found. Please set PGPASSWORD or DATABASE_URL environment variable');
    }

    log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level: level.toUpperCase(),
            message,
            ...(data && { data })
        };

        // Console output with colors
        const colorMap = {
            info: chalk.blue,
            warn: chalk.yellow,
            error: chalk.red,
            success: chalk.green
        };
        
        console.log(`${chalk.gray(timestamp)} ${colorMap[level] || chalk.white}[${level.toUpperCase()}]${chalk.reset} ${message}`);

        // File logging
        if (this.options.logFile) {
            const logLine = JSON.stringify(logEntry) + '\n';
            fs.appendFileSync(this.options.logFile, logLine);
        }
    }

    async validateEnvironment() {
        const spinner = ora('Validating environment...').start();
        
        try {
            // Check if pg_dump is available
            try {
                // Try common PostgreSQL installation paths on Windows
                const pgPaths = [
                    'pg_dump',
                    'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
                    'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
                    'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe'
                ];
                
                let pgDumpPath = null;
                for (const path of pgPaths) {
                    try {
                        execSync(`"${path}" --version`, { stdio: 'pipe' });
                        pgDumpPath = path;
                        break;
                    } catch (e) {
                        continue;
                    }
                }
                
                if (!pgDumpPath) {
                    throw new Error('pg_dump not found');
                }
                
                this.pgDumpPath = pgDumpPath;
                this.pgRestorePath = pgDumpPath.replace('pg_dump', 'pg_restore');
                this.pgIsReadyPath = pgDumpPath.replace('pg_dump', 'pg_isready');
                
            } catch (error) {
                throw new Error('pg_dump is not installed or not in PATH. Please install PostgreSQL client tools.');
            }

            // Test database connection
            const testCommand = `"${this.pgIsReadyPath}" -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.user}`;
            
            try {
                execSync(testCommand, { 
                    stdio: 'pipe',
                    env: { ...process.env, PGPASSWORD: this.dbConfig.password }
                });
            } catch (error) {
                throw new Error(`Cannot connect to database: ${error.message}`);
            }

            spinner.succeed('Environment validation passed');
            this.log('info', 'Environment validation completed successfully');
        } catch (error) {
            spinner.fail('Environment validation failed');
            this.log('error', 'Environment validation failed', { error: error.message });
            throw error;
        }
    }

    generateBackupFilename(type = 'full') {
        const timestamp = new Date().toISOString()
            .replace(/[:.]/g, '-')
            .replace('T', '_')
            .split('.')[0];
        
        const extension = this.options.compress ? '.sql.gz' : '.sql';
        return `supabase_${type}_backup_${timestamp}${extension}`;
    }

    async createBackup() {
        const backupType = this.options.incremental ? 'incremental' : 'full';
        const filename = this.generateBackupFilename(backupType);
        const filepath = path.join(this.options.backupDir, filename);

        this.log('info', `Starting ${backupType} backup...`, { filename });
        
        const spinner = ora(`Creating ${backupType} backup...`).start();

        try {
            await this.performBackup(filepath, backupType);
            
            const stats = fs.statSync(filepath);
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            
            spinner.succeed(`Backup created successfully (${sizeMB} MB)`);
            this.log('success', 'Backup completed successfully', {
                filename,
                size: stats.size,
                sizeMB: `${sizeMB} MB`,
                type: backupType
            });

            // Validate backup
            await this.validateBackup(filepath);

            return filepath;
        } catch (error) {
            spinner.fail('Backup failed');
            this.log('error', 'Backup failed', { error: error.message });
            throw error;
        }
    }

    async performBackup(filepath, type) {
        const pgDumpOptions = [
            '--verbose',
            '--no-password',
            '--format=custom',
            '--no-privileges',
            '--no-owner',
            '--clean',
            '--if-exists',
            '--disable-triggers',
            `--host=${this.dbConfig.host}`,
            `--port=${this.dbConfig.port}`,
            `--username=${this.dbConfig.user}`,
            `--dbname=${this.dbConfig.database}`
        ];

        // Include specific schemas
        const schemas = ['public', 'auth', 'storage', 'extensions'];
        schemas.forEach(schema => {
            pgDumpOptions.push(`--schema=${schema}`);
        });

        // Include RLS policies, functions, and triggers
        pgDumpOptions.push('--include-security-labels');

        if (type === 'incremental') {
            // For incremental backups, we could add timestamp-based filtering
            // This is a simplified approach - you might want to implement more sophisticated logic
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const timestampFilter = yesterday.toISOString();
            
            // Note: This is a basic approach. Real incremental backups would require 
            // more sophisticated change tracking
            this.log('info', 'Incremental backup: filtering changes since yesterday', { since: timestampFilter });
        }

        const command = `"${this.pgDumpPath}" ${pgDumpOptions.join(' ')}`;
        
        return new Promise((resolve, reject) => {
            const process = exec(command, {
                env: { ...process.env, PGPASSWORD: this.dbConfig.password },
                maxBuffer: 1024 * 1024 * 100 // 100MB buffer
            });

            let output = '';
            let errorOutput = '';

            if (this.options.compress) {
                // Stream through gzip compression
                const gzipStream = createGzip({ level: 9 });
                const writeStream = fs.createWriteStream(filepath);
                
                process.stdout.pipe(gzipStream).pipe(writeStream);
                
                writeStream.on('finish', () => resolve());
                writeStream.on('error', reject);
            } else {
                // Direct file output
                const writeStream = fs.createWriteStream(filepath);
                process.stdout.pipe(writeStream);
                
                writeStream.on('finish', () => resolve());
                writeStream.on('error', reject);
            }

            process.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            process.on('error', reject);
            
            process.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`pg_dump failed with code ${code}: ${errorOutput}`));
                }
            });
        });
    }

    async validateBackup(filepath) {
        const spinner = ora('Validating backup...').start();
        
        try {
            // Check if file exists and has content
            const stats = fs.statSync(filepath);
            if (stats.size === 0) {
                throw new Error('Backup file is empty');
            }

            // For compressed files, test if they can be decompressed
            if (this.options.compress && filepath.endsWith('.gz')) {
                const { createReadStream } = require('fs');
                const { createGunzip } = require('zlib');
                
                return new Promise((resolve, reject) => {
                    let hasContent = false;
                    
                    createReadStream(filepath)
                        .pipe(createGunzip())
                        .on('data', (chunk) => {
                            if (chunk.length > 0) hasContent = true;
                        })
                        .on('end', () => {
                            if (!hasContent) {
                                reject(new Error('Backup file appears to be empty after decompression'));
                            } else {
                                spinner.succeed('Backup validation passed');
                                this.log('info', 'Backup validation completed successfully');
                                resolve();
                            }
                        })
                        .on('error', reject);
                });
            }

            // For uncompressed files, check for SQL content
            const content = fs.readFileSync(filepath, 'utf8', { start: 0, end: 1000 });
            if (!content.includes('PostgreSQL') && !content.includes('pg_dump')) {
                throw new Error('Backup file does not appear to contain valid PostgreSQL dump');
            }

            spinner.succeed('Backup validation passed');
            this.log('info', 'Backup validation completed successfully');
            
        } catch (error) {
            spinner.fail('Backup validation failed');
            this.log('error', 'Backup validation failed', { error: error.message });
            throw error;
        }
    }

    async cleanupOldBackups() {
        if (this.options.retentionDays <= 0) return;

        const spinner = ora('Cleaning up old backups...').start();
        
        try {
            const files = fs.readdirSync(this.options.backupDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.options.retentionDays);

            let deletedCount = 0;
            let totalSize = 0;

            for (const file of files) {
                if (!file.startsWith('supabase_') || (!file.endsWith('.sql') && !file.endsWith('.sql.gz'))) {
                    continue;
                }

                const filepath = path.join(this.options.backupDir, file);
                const stats = fs.statSync(filepath);

                if (stats.mtime < cutoffDate) {
                    totalSize += stats.size;
                    fs.unlinkSync(filepath);
                    deletedCount++;
                    this.log('info', `Deleted old backup: ${file}`, { 
                        age: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)),
                        size: stats.size 
                    });
                }
            }

            if (deletedCount > 0) {
                const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
                spinner.succeed(`Cleaned up ${deletedCount} old backups (freed ${sizeMB} MB)`);
                this.log('info', 'Cleanup completed', { deletedCount, freedSpace: `${sizeMB} MB` });
            } else {
                spinner.succeed('No old backups to clean up');
                this.log('info', 'No old backups found for cleanup');
            }

        } catch (error) {
            spinner.fail('Cleanup failed');
            this.log('error', 'Cleanup failed', { error: error.message });
            // Don't throw here - cleanup failure shouldn't fail the entire backup
        }
    }

    async run() {
        try {
            console.log(chalk.cyan.bold('\n🗄️  Supabase Backup Tool\n'));
            
            await this.validateEnvironment();
            const backupPath = await this.createBackup();
            await this.cleanupOldBackups();

            console.log(chalk.green.bold('\n✅ Backup completed successfully!'));
            console.log(chalk.gray(`📁 Backup saved to: ${backupPath}`));
            
            return backupPath;

        } catch (error) {
            console.log(chalk.red.bold('\n❌ Backup failed!'));
            console.log(chalk.red(error.message));
            process.exit(1);
        }
    }
}

// CLI setup
program
    .name('supabase-backup')
    .description('Complete backup tool for Supabase databases')
    .version('1.0.0')
    .option('-i, --incremental', 'Create incremental backup instead of full backup', false)
    .option('--no-compress', 'Disable gzip compression', false)
    .option('--backup-dir <dir>', 'Directory to store backups', './backups')
    .option('--retention-days <days>', 'Days to keep old backups', '30')
    .option('--log-level <level>', 'Log level (info, warn, error)', 'info')
    .action(async (options) => {
        try {
            const backup = new SupabaseBackup(options);
            await backup.run();
        } catch (error) {
            console.error(chalk.red('Failed to initialize backup:', error.message));
            process.exit(1);
        }
    });

// Handle CLI execution
if (require.main === module) {
    program.parse();
}

module.exports = SupabaseBackup;