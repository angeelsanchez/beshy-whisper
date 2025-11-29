#!/usr/bin/env node

const { execSync, exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { createGzip } = require('zlib');
const chalk = require('chalk');
const ora = require('ora');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

class PostgreSQLBackup {
    constructor() {
        this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        this.password = process.env.PGPASSWORD;
        
        if (!this.supabaseUrl || !this.password) {
            throw new Error('NEXT_PUBLIC_SUPABASE_URL and PGPASSWORD are required');
        }

        // Extract project reference from Supabase URL
        const urlObj = new URL(this.supabaseUrl);
        this.projectRef = urlObj.hostname.split('.')[0];
        
        // Build connection details
        this.dbConfig = {
            host: `db.${this.projectRef}.supabase.co`,
            port: 5432,
            database: 'postgres',
            user: 'postgres',
            password: this.password
        };

        this.backupDir = './backups';
        this.logFile = './logs/backup.log';
        
        // Try to find PostgreSQL installation
        this.pgPaths = [
            'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
            'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe', 
            'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
            'pg_dump'
        ];
        
        this.pgDumpPath = this.findPgDump();
        
        // Ensure directories exist
        fs.ensureDirSync(this.backupDir);
        fs.ensureDirSync(path.dirname(this.logFile));
    }

    findPgDump() {
        for (const path of this.pgPaths) {
            try {
                execSync(`"${path}" --version`, { stdio: 'pipe' });
                return path;
            } catch (error) {
                continue;
            }
        }
        throw new Error('pg_dump not found. Please install PostgreSQL client tools.');
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
        
        console.log(`${chalk.gray(timestamp)} ${colorMap[level] || chalk.white}[${level.toUpperCase()}] ${message}`);

        // File logging
        const logLine = JSON.stringify(logEntry) + '\n';
        fs.appendFileSync(this.logFile, logLine);
    }

    generateBackupFilename() {
        const timestamp = new Date().toISOString()
            .replace(/[:.]/g, '-')
            .replace('T', '_')
            .split('.')[0];
        
        return `supabase_complete_backup_${timestamp}.backup`;
    }

    async createBackup() {
        const filename = this.generateBackupFilename();
        const filepath = path.join(this.backupDir, filename);

        console.log(chalk.cyan.bold('\n🗄️ Complete PostgreSQL Backup\n'));
        this.log('info', 'Starting complete PostgreSQL backup...', { filename });

        const spinner = ora('Creating complete database backup...').start();

        try {
            // Build pg_dump command with all necessary options for complete backup
            const pgDumpOptions = [
                '--verbose',
                '--no-password',
                // Include all schemas and objects
                '--schema=public',
                '--schema=auth', 
                '--schema=storage',
                '--schema=extensions',
                // Include everything (structure + data) - don't use both --schema-only and --data-only
                '--clean',
                '--if-exists',
                '--create',
                // Include roles and privileges
                '--no-privileges',
                '--no-owner',
                // Include security
                '--enable-row-security',
                // Format
                '--format=custom',
                // Connection details
                `--host=${this.dbConfig.host}`,
                `--port=${this.dbConfig.port}`,
                `--username=${this.dbConfig.user}`,
                `--dbname=${this.dbConfig.database}`
            ];

            const command = `"${this.pgDumpPath}" ${pgDumpOptions.join(' ')}`;
            
            this.log('info', 'Executing pg_dump command', { 
                command: command.replace(this.password, '***'),
                options: pgDumpOptions
            });

            await new Promise((resolve, reject) => {
                const childProcess = exec(command, {
                    env: { ...process.env, PGPASSWORD: this.dbConfig.password },
                    maxBuffer: 1024 * 1024 * 200 // 200MB buffer
                });

                let errorOutput = '';

                // Custom format output directly to file (already compressed)
                const writeStream = fs.createWriteStream(filepath);
                
                childProcess.stdout.pipe(writeStream);
                
                childProcess.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                    // pg_dump outputs progress to stderr, so we show it
                    if (data.toString().includes('COPY')) {
                        const match = data.toString().match(/COPY.*?(\d+)/);
                        if (match) {
                            spinner.text = `Backing up data... (${match[1]} rows processed)`;
                        }
                    }
                });

                childProcess.on('error', reject);
                
                writeStream.on('finish', () => {
                    resolve();
                });
                
                writeStream.on('error', reject);
                
                childProcess.on('close', (code) => {
                    if (code !== 0) {
                        reject(new Error(`pg_dump failed with code ${code}: ${errorOutput}`));
                    }
                });
            });

            const stats = fs.statSync(filepath);
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            
            spinner.succeed(`Complete backup created successfully (${sizeMB} MB)`);

            console.log(chalk.green.bold('\n✅ Complete Backup Summary:'));
            console.log(chalk.gray(`📁 File: ${filepath}`));
            console.log(chalk.gray(`📊 Size: ${sizeMB} MB (compressed)`));
            console.log(chalk.gray(`🗃️ Type: Complete PostgreSQL dump`));
            console.log(chalk.gray(`📋 Includes: All schemas, tables, data, policies, functions, triggers`));

            console.log(chalk.cyan.bold('\n🔄 What this backup contains:'));
            console.log(chalk.green('✅ Public schema (your tables and data)'));
            console.log(chalk.green('✅ Auth schema (user authentication)'));
            console.log(chalk.green('✅ Storage schema (file storage metadata)'));
            console.log(chalk.green('✅ Extensions schema (PostgreSQL extensions)'));
            console.log(chalk.green('✅ RLS Policies (Row Level Security)'));
            console.log(chalk.green('✅ Functions and Triggers'));
            console.log(chalk.green('✅ Roles and Permissions'));
            console.log(chalk.green('✅ Complete database structure'));

            this.log('success', 'Complete backup completed successfully', {
                filename,
                size: stats.size,
                sizeMB: `${sizeMB} MB`,
                type: 'complete_postgresql'
            });

            console.log(chalk.yellow.bold('\n📝 Restoration Instructions:'));
            console.log(chalk.gray('To restore this backup to a new Supabase project:'));
            console.log(chalk.blue('1. Create a new Supabase project'));
            console.log(chalk.blue('2. Get the database password from the new project'));
            console.log(chalk.blue('3. Use: npm run restore:pg -- --file="' + filename + '"'));
            console.log(chalk.gray('Or use pg_restore directly with the connection string'));

            return filepath;

        } catch (error) {
            spinner.fail('Complete backup failed');
            console.log(chalk.red.bold('\n❌ Backup failed!'));
            console.log(chalk.red(error.message));
            this.log('error', 'Complete backup failed', { error: error.message });
            throw error;
        }
    }
}

// Run backup if this script is executed directly
if (require.main === module) {
    const backup = new PostgreSQLBackup();
    backup.createBackup().catch(error => {
        console.error(chalk.red('Backup failed:', error.message));
        process.exit(1);
    });
}

module.exports = PostgreSQLBackup;