#!/usr/bin/env node

const { execSync, exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { createGunzip } = require('zlib');
const { createReadStream, createWriteStream } = require('fs');
const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const readline = require('readline');

// Load environment variables
require('dotenv').config({ path: '.env.local', quiet: true });

const program = new Command();

class SupabaseRestore {
    constructor(options = {}) {
        this.options = {
            backupFile: options.backupFile,
            force: options.force || false,
            createDatabase: options.createDatabase || false,
            skipConfirmation: options.skipConfirmation || false,
            logLevel: process.env.LOG_LEVEL || 'info',
            logFile: process.env.LOG_FILE || './logs/restore.log',
            ...options
        };

        this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        this.serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!this.supabaseUrl || !this.serviceRoleKey) {
            throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
        }

        // Extract database connection info from Supabase URL
        this.dbConfig = this.parseSupabaseUrl(this.supabaseUrl);
        
        // Ensure log directory exists
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
            // Check if pg_restore is available
            try {
                execSync('pg_restore --version', { stdio: 'pipe' });
            } catch (error) {
                throw new Error('pg_restore is not installed or not in PATH. Please install PostgreSQL client tools.');
            }

            // Test database connection
            const testCommand = `pg_isready -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.user}`;
            
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

    async validateBackupFile() {
        const spinner = ora('Validating backup file...').start();
        
        try {
            if (!this.options.backupFile) {
                throw new Error('Backup file path is required');
            }

            if (!fs.existsSync(this.options.backupFile)) {
                throw new Error(`Backup file not found: ${this.options.backupFile}`);
            }

            const stats = fs.statSync(this.options.backupFile);
            if (stats.size === 0) {
                throw new Error('Backup file is empty');
            }

            // Check if file is compressed
            const isCompressed = this.options.backupFile.endsWith('.gz');
            
            if (isCompressed) {
                // Test if compressed file can be read
                await new Promise((resolve, reject) => {
                    let hasContent = false;
                    
                    createReadStream(this.options.backupFile)
                        .pipe(createGunzip())
                        .on('data', (chunk) => {
                            if (chunk.length > 0) hasContent = true;
                        })
                        .on('end', () => {
                            if (!hasContent) {
                                reject(new Error('Compressed backup file appears to be empty'));
                            } else {
                                resolve();
                            }
                        })
                        .on('error', reject);
                });
            }

            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            spinner.succeed(`Backup file validated (${sizeMB} MB)`);
            this.log('info', 'Backup file validation completed successfully', {
                file: this.options.backupFile,
                size: stats.size,
                sizeMB: `${sizeMB} MB`,
                compressed: isCompressed
            });

        } catch (error) {
            spinner.fail('Backup file validation failed');
            this.log('error', 'Backup file validation failed', { error: error.message });
            throw error;
        }
    }

    async confirmRestore() {
        if (this.options.skipConfirmation || this.options.force) {
            return true;
        }

        console.log(chalk.yellow.bold('\n⚠️  WARNING: This will restore the database and may overwrite existing data!'));
        console.log(chalk.yellow(`Database: ${this.dbConfig.host}:${this.dbConfig.port}/${this.dbConfig.database}`));
        console.log(chalk.yellow(`Backup file: ${this.options.backupFile}`));

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question(chalk.red('\nDo you want to continue? Type "yes" to proceed: '), (answer) => {
                rl.close();
                resolve(answer.toLowerCase() === 'yes');
            });
        });
    }

    async createDatabaseBackup() {
        if (!this.options.force) {
            return; // Skip if not forced
        }

        const spinner = ora('Creating safety backup of current database...').start();
        
        try {
            const timestamp = new Date().toISOString()
                .replace(/[:.]/g, '-')
                .replace('T', '_')
                .split('.')[0];
            
            const safetyBackupFile = path.join(
                process.env.BACKUP_DIR || './backups',
                `safety_backup_before_restore_${timestamp}.sql.gz`
            );

            const pgDumpOptions = [
                '--verbose',
                '--no-password',
                '--format=custom',
                '--no-privileges',
                '--no-owner',
                '--clean',
                '--if-exists',
                `--host=${this.dbConfig.host}`,
                `--port=${this.dbConfig.port}`,
                `--username=${this.dbConfig.user}`,
                `--dbname=${this.dbConfig.database}`
            ];

            const command = `pg_dump ${pgDumpOptions.join(' ')}`;
            
            await new Promise((resolve, reject) => {
                const process = exec(command, {
                    env: { ...process.env, PGPASSWORD: this.dbConfig.password },
                    maxBuffer: 1024 * 1024 * 100 // 100MB buffer
                });

                const gzipStream = createGunzip({ level: 9 });
                const writeStream = createWriteStream(safetyBackupFile);
                
                process.stdout.pipe(gzipStream).pipe(writeStream);
                
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
                process.on('error', reject);
                
                process.on('close', (code) => {
                    if (code !== 0) {
                        reject(new Error(`Safety backup failed with code ${code}`));
                    }
                });
            });

            spinner.succeed(`Safety backup created: ${path.basename(safetyBackupFile)}`);
            this.log('info', 'Safety backup created successfully', { file: safetyBackupFile });

        } catch (error) {
            spinner.fail('Failed to create safety backup');
            this.log('error', 'Safety backup failed', { error: error.message });
            throw error;
        }
    }

    async performRestore() {
        const spinner = ora('Restoring database from backup...').start();
        
        try {
            const isCompressed = this.options.backupFile.endsWith('.gz');
            let restoreCommand;

            const pgRestoreOptions = [
                '--verbose',
                '--no-password',
                '--clean',
                '--if-exists',
                '--no-privileges',
                '--no-owner',
                '--disable-triggers',
                `--host=${this.dbConfig.host}`,
                `--port=${this.dbConfig.port}`,
                `--username=${this.dbConfig.user}`,
                `--dbname=${this.dbConfig.database}`
            ];

            if (isCompressed) {
                // For compressed files, we need to decompress first
                const tempFile = path.join(path.dirname(this.options.backupFile), 'temp_restore.sql');
                
                // Decompress first
                await new Promise((resolve, reject) => {
                    createReadStream(this.options.backupFile)
                        .pipe(createGunzip())
                        .pipe(createWriteStream(tempFile))
                        .on('finish', resolve)
                        .on('error', reject);
                });

                restoreCommand = `pg_restore ${pgRestoreOptions.join(' ')} "${tempFile}"`;
                
                // Clean up temp file after restore
                process.on('exit', () => {
                    try { fs.unlinkSync(tempFile); } catch {}
                });
                
            } else {
                restoreCommand = `pg_restore ${pgRestoreOptions.join(' ')} "${this.options.backupFile}"`;
            }

            await new Promise((resolve, reject) => {
                const process = exec(restoreCommand, {
                    env: { ...process.env, PGPASSWORD: this.dbConfig.password },
                    maxBuffer: 1024 * 1024 * 100 // 100MB buffer
                });

                let errorOutput = '';

                process.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });

                process.on('error', reject);
                
                process.on('close', (code) => {
                    if (code !== 0) {
                        // pg_restore often returns non-zero even for successful restores with warnings
                        // We'll check if the error output contains critical errors
                        const criticalErrors = errorOutput.toLowerCase().includes('fatal') || 
                                             errorOutput.toLowerCase().includes('connection') ||
                                             errorOutput.toLowerCase().includes('authentication');
                        
                        if (criticalErrors) {
                            reject(new Error(`pg_restore failed with code ${code}: ${errorOutput}`));
                        } else {
                            // Treat as warning and continue
                            this.log('warn', 'pg_restore completed with warnings', { 
                                code, 
                                warnings: errorOutput 
                            });
                            resolve();
                        }
                    } else {
                        resolve();
                    }
                });
            });

            spinner.succeed('Database restore completed successfully');
            this.log('success', 'Database restore completed successfully');

        } catch (error) {
            spinner.fail('Database restore failed');
            this.log('error', 'Database restore failed', { error: error.message });
            throw error;
        }
    }

    async validateRestore() {
        const spinner = ora('Validating restored database...').start();
        
        try {
            // Basic connectivity test
            const testCommand = `psql -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.user} -d ${this.dbConfig.database} -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"`;
            
            const result = execSync(testCommand, {
                env: { ...process.env, PGPASSWORD: this.dbConfig.password },
                encoding: 'utf8'
            });

            const tableCount = parseInt(result.match(/\d+/)?.[0] || '0');
            
            if (tableCount === 0) {
                throw new Error('No tables found in public schema after restore');
            }

            spinner.succeed(`Database validation passed (${tableCount} tables found)`);
            this.log('info', 'Database validation completed successfully', { tableCount });

        } catch (error) {
            spinner.fail('Database validation failed');
            this.log('error', 'Database validation failed', { error: error.message });
            throw error;
        }
    }

    async listAvailableBackups() {
        const backupDir = process.env.BACKUP_DIR || './backups';
        
        if (!fs.existsSync(backupDir)) {
            console.log(chalk.yellow('No backup directory found.'));
            return;
        }

        const files = fs.readdirSync(backupDir)
            .filter(file => file.startsWith('supabase_') && (file.endsWith('.sql') || file.endsWith('.sql.gz')))
            .map(file => {
                const filepath = path.join(backupDir, file);
                const stats = fs.statSync(filepath);
                const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
                const age = Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24));
                
                return {
                    file,
                    path: filepath,
                    size: `${sizeMB} MB`,
                    age: `${age} days ago`,
                    modified: stats.mtime.toISOString()
                };
            })
            .sort((a, b) => new Date(b.modified) - new Date(a.modified));

        if (files.length === 0) {
            console.log(chalk.yellow('No backup files found.'));
            return;
        }

        console.log(chalk.cyan.bold('\n📁 Available Backup Files:\n'));
        files.forEach((file, index) => {
            console.log(`${chalk.gray((index + 1).toString().padStart(2))}. ${chalk.white(file.file)}`);
            console.log(`    ${chalk.gray('Size:')} ${file.size} | ${chalk.gray('Age:')} ${file.age}`);
            console.log(`    ${chalk.gray('Path:')} ${file.path}\n`);
        });
    }

    async run() {
        try {
            console.log(chalk.cyan.bold('\n🔄 Supabase Restore Tool\n'));
            
            if (this.options.listBackups) {
                await this.listAvailableBackups();
                return;
            }

            await this.validateEnvironment();
            await this.validateBackupFile();

            const confirmed = await this.confirmRestore();
            if (!confirmed) {
                console.log(chalk.yellow('Restore cancelled by user.'));
                return;
            }

            if (this.options.force) {
                await this.createDatabaseBackup();
            }

            await this.performRestore();
            await this.validateRestore();

            console.log(chalk.green.bold('\n✅ Database restore completed successfully!'));
            console.log(chalk.gray(`📊 Restored from: ${this.options.backupFile}`));
            
        } catch (error) {
            console.log(chalk.red.bold('\n❌ Restore failed!'));
            console.log(chalk.red(error.message));
            process.exit(1);
        }
    }
}

// CLI setup
program
    .name('supabase-restore')
    .description('Restore tool for Supabase database backups')
    .version('1.0.0')
    .option('-f, --file <path>', 'Path to backup file to restore')
    .option('--force', 'Force restore without creating safety backup', false)
    .option('--skip-confirmation', 'Skip confirmation prompt', false)
    .option('--list-backups', 'List available backup files', false)
    .option('--log-level <level>', 'Log level (info, warn, error)', 'info')
    .action(async (options) => {
        try {
            const restore = new SupabaseRestore({
                backupFile: options.file,
                force: options.force,
                skipConfirmation: options.skipConfirmation,
                listBackups: options.listBackups,
                logLevel: options.logLevel
            });
            await restore.run();
        } catch (error) {
            console.error(chalk.red('Failed to initialize restore:', error.message));
            process.exit(1);
        }
    });

// Handle CLI execution
if (require.main === module) {
    program.parse();
}

module.exports = SupabaseRestore;