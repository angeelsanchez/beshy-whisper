#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs-extra');
const path = require('path');
const { createGzip } = require('zlib');
const chalk = require('chalk');
const ora = require('ora');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

class SimpleSupabaseBackup {
    constructor() {
        this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        this.serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!this.supabaseUrl || !this.serviceRoleKey) {
            throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
        }

        // Initialize Supabase client with service role
        this.supabase = createClient(this.supabaseUrl, this.serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        this.backupDir = './backups';
        this.logFile = './logs/backup.log';
        
        // Known tables from your schema
        this.tables = [
            'users',
            'entries', 
            'push_tokens',
            'notifications',
            'likes',
            'objectives'
        ];
        
        // Ensure directories exist
        fs.ensureDirSync(this.backupDir);
        fs.ensureDirSync(path.dirname(this.logFile));
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
        
        return `supabase_simple_backup_${timestamp}.json.gz`;
    }

    async backupTable(tableName) {
        const spinner = ora(`Backing up table: ${tableName}`).start();
        
        try {
            let allData = [];
            const pageSize = 1000;
            let from = 0;
            let hasMore = true;

            while (hasMore) {
                const { data, error } = await this.supabase
                    .from(tableName)
                    .select('*')
                    .range(from, from + pageSize - 1);

                if (error) {
                    // If table doesn't exist or we don't have permission, skip it
                    if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('permission')) {
                        spinner.warn(`Table ${tableName} not found or no permission - skipping`);
                        return {
                            table: tableName,
                            rowCount: 0,
                            data: [],
                            skipped: true,
                            reason: error.message
                        };
                    }
                    throw error;
                }

                if (data && data.length > 0) {
                    allData = allData.concat(data);
                    from += pageSize;
                    hasMore = data.length === pageSize;
                } else {
                    hasMore = false;
                }
            }

            spinner.succeed(`✅ ${tableName}: ${allData.length} rows`);
            return {
                table: tableName,
                rowCount: allData.length,
                data: allData
            };

        } catch (error) {
            spinner.fail(`❌ ${tableName}: ${error.message}`);
            this.log('error', `Failed to backup table ${tableName}`, { error: error.message });
            return {
                table: tableName,
                rowCount: 0,
                data: [],
                error: error.message
            };
        }
    }

    async createBackup() {
        const filename = this.generateBackupFilename();
        const filepath = path.join(this.backupDir, filename);

        console.log(chalk.cyan.bold('\n🗄️  Simple Supabase Backup\n'));
        this.log('info', 'Starting simple backup...', { filename });

        try {
            const backup = {
                metadata: {
                    created_at: new Date().toISOString(),
                    supabase_url: this.supabaseUrl,
                    backup_type: 'simple_api',
                    version: '1.0.0'
                },
                tables: {}
            };

            let totalRows = 0;
            let successfulTables = 0;

            // Backup each table
            for (const tableName of this.tables) {
                const tableBackup = await this.backupTable(tableName);
                backup.tables[tableName] = tableBackup;
                
                if (!tableBackup.error && !tableBackup.skipped) {
                    totalRows += tableBackup.rowCount;
                    successfulTables++;
                }
            }

            // Save backup to compressed file
            const spinner = ora('Writing backup file...').start();
            const backupData = JSON.stringify(backup, null, 2);
            
            const gzip = createGzip({ level: 9 });
            const writeStream = fs.createWriteStream(filepath);
            
            await new Promise((resolve, reject) => {
                gzip.pipe(writeStream);
                gzip.on('error', reject);
                writeStream.on('error', reject);
                writeStream.on('finish', resolve);
                gzip.end(backupData);
            });

            const stats = fs.statSync(filepath);
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            
            spinner.succeed(`Backup completed successfully (${sizeMB} MB)`);

            console.log(chalk.green.bold('\n✅ Backup Summary:'));
            console.log(chalk.gray(`📁 File: ${filepath}`));
            console.log(chalk.gray(`📊 Size: ${sizeMB} MB`));
            console.log(chalk.gray(`📋 Tables: ${successfulTables}/${this.tables.length} successful`));
            console.log(chalk.gray(`📝 Total rows: ${totalRows}`));

            // Show table details
            console.log(chalk.cyan('\n📋 Table Details:'));
            Object.values(backup.tables).forEach(table => {
                if (table.skipped) {
                    console.log(chalk.yellow(`   ${table.table}: skipped (${table.reason})`));
                } else if (table.error) {
                    console.log(chalk.red(`   ${table.table}: error (${table.error})`));
                } else {
                    console.log(chalk.green(`   ${table.table}: ${table.rowCount} rows`));
                }
            });

            this.log('success', 'Backup completed successfully', {
                filename,
                size: stats.size,
                sizeMB: `${sizeMB} MB`,
                totalRows,
                successfulTables,
                totalTables: this.tables.length
            });

            return filepath;

        } catch (error) {
            console.log(chalk.red.bold('\n❌ Backup failed!'));
            console.log(chalk.red(error.message));
            this.log('error', 'Backup failed', { error: error.message });
            throw error;
        }
    }
}

// Run backup if this script is executed directly
if (require.main === module) {
    const backup = new SimpleSupabaseBackup();
    backup.createBackup().catch(error => {
        console.error(chalk.red('Backup failed:', error.message));
        process.exit(1);
    });
}

module.exports = SimpleSupabaseBackup;