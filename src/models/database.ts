import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';
import path from 'path';

// Determine database path with fallback logic for Railway
function getDatabasePath(): string {
  if (process.env.NODE_ENV === 'production') {
    const fs = require('fs');
    
    // Try Railway volume mount path first
    const volumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH;
    if (volumePath) {
      const volumeDbPath = path.join(volumePath, 'painting_business.db');
      try {
        // Ensure the directory exists
        fs.mkdirSync(path.dirname(volumeDbPath), { recursive: true });
        return volumeDbPath;
      } catch (error) {
        console.error('❌ Cannot use volume path:', (error as Error).message);
      }
    }
    
    // Try /data directory
    try {
      const dataPath = '/data';
      fs.mkdirSync(dataPath, { recursive: true });
      return path.join(dataPath, 'painting_business.db');
    } catch (error) {
      console.error('❌ Cannot create /data directory:', (error as Error).message);
    }
    
    // Try /tmp as fallback (writable but not persistent)
    try {
      const tmpPath = '/tmp';
      fs.mkdirSync(tmpPath, { recursive: true });
      console.log('⚠️ Using /tmp for database (data will not persist between deployments)');
      return path.join(tmpPath, 'painting_business.db');
    } catch (error) {
      console.error('❌ Cannot use /tmp directory:', (error as Error).message);
    }
    
    // Final fallback to /app
    console.log('⚠️ Using /app for database (data will not persist between deployments)');
    return path.join('/app', 'painting_business.db');
  }
  
  // Development
  return path.join(process.cwd(), 'painting_business.db');
}

const DB_PATH = getDatabasePath();

export class DatabaseManager {
  private db: Database;

  constructor() {
    console.log(`🗄️ Initializing database at: ${DB_PATH}`);
    
    // Log volume mount information in production
    if (process.env.NODE_ENV === 'production') {
      console.log(`🔗 Railway volume mount path: ${process.env.RAILWAY_VOLUME_MOUNT_PATH || 'NOT SET'}`);
      console.log(`📁 Production data directory: ${path.dirname(DB_PATH)}`);
      
      // Check directory permissions
      const fs = require('fs');
      const dbDir = path.dirname(DB_PATH);
      try {
        fs.accessSync(dbDir, fs.constants.W_OK);
        console.log(`✅ Directory ${dbDir} is writable`);
      } catch (error) {
        console.error(`❌ Directory ${dbDir} is not writable:`, (error as Error).message);
      }
    }
    
    // Check if database file exists
    const fs = require('fs');
    const dbExists = fs.existsSync(DB_PATH);
    console.log(`📊 Database file exists: ${dbExists}`);
    
    if (dbExists) {
      const stats = fs.statSync(DB_PATH);
      console.log(`📈 Database file size: ${stats.size} bytes`);
    }
    
    // Ensure the database directory exists before creating the database
    const dbDir = path.dirname(DB_PATH);
    try {
      fs.mkdirSync(dbDir, { recursive: true });
    } catch (error) {
      console.error('❌ Could not create database directory:', (error as Error).message);
    }
    
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Error opening database:', err);
        console.error('❌ Database path:', DB_PATH);
        console.error('❌ Directory exists:', fs.existsSync(dbDir));
        console.error('❌ Directory writable:', (() => {
          try {
            fs.accessSync(dbDir, fs.constants.W_OK);
            return true;
          } catch {
            return false;
          }
        })());
        
        // Don't throw - try to continue with in-memory database
        console.log('🔄 Attempting fallback to in-memory database...');
        this.db = new sqlite3.Database(':memory:', (memErr) => {
          if (memErr) {
            console.error('❌ Even in-memory database failed:', memErr);
            throw memErr;
          }
          console.log('⚠️ Using in-memory database (data will not persist)');
        });
      } else {
        console.log('✅ Database connected successfully');
      }
    });
    this.initializeTables();
  }

  private async initializeTables(): Promise<void> {
    try {
      console.log('Initializing database tables...');
      const queries = [
      // Clients table
      `CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        zip_code TEXT,
        job_address TEXT,
        job_city TEXT,
        job_state TEXT,
        job_zip_code TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Estimates table
      `CREATE TABLE IF NOT EXISTS estimates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        estimate_number TEXT UNIQUE NOT NULL,
        client_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'converted')),
        total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        labor_cost DECIMAL(10,2) DEFAULT 0,
        material_cost DECIMAL(10,2) DEFAULT 0,
        markup_percentage DECIMAL(5,2) DEFAULT 0,
        valid_until DATE,
        revision_number INTEGER DEFAULT 1,
        parent_estimate_id INTEGER,
        terms_and_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients (id),
        FOREIGN KEY (parent_estimate_id) REFERENCES estimates (id)
      )`,

      // Invoices table
      `CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT UNIQUE NOT NULL,
        estimate_id INTEGER,
        client_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
        total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        paid_amount DECIMAL(10,2) DEFAULT 0,
        due_date DATE,
        payment_terms TEXT DEFAULT 'Net 30',
        terms_and_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients (id),
        FOREIGN KEY (estimate_id) REFERENCES estimates (id)
      )`,

      // Project areas/zones
      `CREATE TABLE IF NOT EXISTS project_areas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        estimate_id INTEGER,
        invoice_id INTEGER,
        area_name TEXT NOT NULL,
        area_type TEXT CHECK (area_type IN ('indoor', 'outdoor')),
        surface_type TEXT,
        square_footage DECIMAL(8,2),
        ceiling_height DECIMAL(4,2),
        prep_requirements TEXT,
        paint_type TEXT,
        paint_brand TEXT,
        paint_color TEXT,
        finish_type TEXT,
        number_of_coats INTEGER DEFAULT 2,
        labor_hours DECIMAL(4,2),
        labor_rate DECIMAL(6,2),
        material_cost DECIMAL(8,2),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (estimate_id) REFERENCES estimates (id),
        FOREIGN KEY (invoice_id) REFERENCES invoices (id)
      )`,

      // Quality control checkpoints
      `CREATE TABLE IF NOT EXISTS quality_checkpoints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_area_id INTEGER NOT NULL,
        checkpoint_type TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
        inspector_name TEXT,
        completion_date DATETIME,
        temperature DECIMAL(4,1),
        humidity DECIMAL(4,1),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_area_id) REFERENCES project_areas (id)
      )`,

      // Photo documentation
      `CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_area_id INTEGER,
        quality_checkpoint_id INTEGER,
        client_id INTEGER,
        photo_type TEXT CHECK (photo_type IN ('before', 'during', 'after', 'damage', 'color_sample')),
        file_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        description TEXT,
        taken_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_area_id) REFERENCES project_areas (id),
        FOREIGN KEY (quality_checkpoint_id) REFERENCES quality_checkpoints (id),
        FOREIGN KEY (client_id) REFERENCES clients (id)
      )`,

      // Communication tracking
      `CREATE TABLE IF NOT EXISTS communications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        estimate_id INTEGER,
        invoice_id INTEGER,
        communication_type TEXT CHECK (communication_type IN ('email', 'phone', 'text', 'in_person')),
        direction TEXT CHECK (direction IN ('inbound', 'outbound')),
        subject TEXT,
        content TEXT,
        status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
        scheduled_for DATETIME,
        sent_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients (id),
        FOREIGN KEY (estimate_id) REFERENCES estimates (id),
        FOREIGN KEY (invoice_id) REFERENCES invoices (id)
      )`,

      // Email templates
      `CREATE TABLE IF NOT EXISTS email_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        subject TEXT NOT NULL,
        content TEXT NOT NULL,
        template_type TEXT CHECK (template_type IN ('estimate_sent', 'project_start', 'project_complete', 'payment_reminder', 'follow_up', 'maintenance_reminder')),
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Paint/material library
      `CREATE TABLE IF NOT EXISTS paint_library (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brand TEXT NOT NULL,
        product_line TEXT,
        color_name TEXT,
        color_code TEXT,
        finish_type TEXT,
        coverage_per_gallon INTEGER,
        price_per_gallon DECIMAL(6,2),
        voc_rating TEXT,
        primer_required BOOLEAN DEFAULT 0,
        surface_types TEXT, -- JSON array of suitable surfaces
        notes TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Payments tracking
      `CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_method TEXT,
        payment_date DATE NOT NULL,
        reference_number TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices (id)
      )`,

      // Sequence tracking for estimate/invoice numbers
      `CREATE TABLE IF NOT EXISTS number_sequences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sequence_type TEXT UNIQUE NOT NULL,
        current_number INTEGER NOT NULL DEFAULT 0,
        prefix TEXT,
        format TEXT
      )`
    ];

    for (const query of queries) {
      await this.run(query);
    }

      // Initialize sequences if not exists
      await this.run(`INSERT OR IGNORE INTO number_sequences (sequence_type, current_number, prefix, format) 
                      VALUES ('estimate', 0, 'EST-', 'EST-XXXX')`);
      await this.run(`INSERT OR IGNORE INTO number_sequences (sequence_type, current_number, prefix, format) 
                      VALUES ('invoice', 0, 'INV-', 'INV-XXXX')`);

      // Enhanced database migration with comprehensive error handling
      await this.performSchemaMigration();
      
      // Version control enhancement migration
      await this.performVersionControlMigration();
      
      // Check existing data counts
      try {
        const clientCount = await this.get('SELECT COUNT(*) as count FROM clients');
        const estimateCount = await this.get('SELECT COUNT(*) as count FROM estimates');
        const invoiceCount = await this.get('SELECT COUNT(*) as count FROM invoices');
        
        console.log('📊 Current data counts:');
        console.log(`   👥 Clients: ${clientCount?.count || 0}`);
        console.log(`   📋 Estimates: ${estimateCount?.count || 0}`);
        console.log(`   💰 Invoices: ${invoiceCount?.count || 0}`);
      } catch (error) {
        console.log('⚠️ Could not check data counts:', (error as Error).message);
      }
      
      console.log('✅ Database tables initialized successfully');
    } catch (error) {
      console.error('Error initializing database tables:', error);
      throw error;
    }
  }

  public run(query: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  public get(query: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  public all(query: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  public close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Enhanced schema migration with comprehensive error handling and rollback capabilities
   */
  private async performSchemaMigration(): Promise<void> {
    const migrationName = 'add_job_address_columns';
    console.log(`🔄 Starting schema migration: ${migrationName}`);
    
    try {
      // Check if migration has already been applied
      const migrationRecord = await this.checkMigrationStatus(migrationName);
      if (migrationRecord?.completed) {
        console.log(`ℹ️ Migration '${migrationName}' already completed - skipping`);
        return;
      }

      // Create backup before migration
      console.log('💾 Creating backup before migration...');
      const backupPath = await this.createBackup(`pre_migration_${migrationName}_${Date.now()}.db`);
      if (!backupPath) {
        console.log('⚠️ Backup creation failed, but continuing with migration');
      }

      // Clean up old backups
      await this.cleanupOldBackups();

      // Create migration log entry
      await this.createMigrationLog(migrationName, 'started');

      // Check current schema state
      const tableInfo = await this.all("PRAGMA table_info(clients)");
      const existingColumns = tableInfo.map((col: any) => col.name);
      
      const columnsToAdd = [
        { name: 'job_address', type: 'TEXT' },
        { name: 'job_city', type: 'TEXT' },
        { name: 'job_state', type: 'TEXT' },
        { name: 'job_zip_code', type: 'TEXT' }
      ];

      let addedColumns: string[] = [];
      let migrationErrors: string[] = [];

      // Begin transaction for atomic migration
      await this.run('BEGIN TRANSACTION');

      try {
        for (const column of columnsToAdd) {
          if (existingColumns.includes(column.name)) {
            console.log(`ℹ️ Column ${column.name} already exists - skipping`);
          } else {
            try {
              await this.run(`ALTER TABLE clients ADD COLUMN ${column.name} ${column.type}`);
              addedColumns.push(column.name);
              console.log(`✅ Successfully added column: ${column.name}`);
            } catch (error) {
              const errorMsg = (error as Error).message;
              console.error(`❌ Failed to add column ${column.name}:`, errorMsg);
              migrationErrors.push(`Column ${column.name}: ${errorMsg}`);
              
              // If this is a critical error (not just "column already exists"), rollback
              if (!errorMsg.includes('duplicate column name')) {
                throw new Error(`Critical migration error for column ${column.name}: ${errorMsg}`);
              }
            }
          }
        }

        // Commit transaction if successful
        await this.run('COMMIT');
        
        // Mark migration as completed
        await this.updateMigrationLog(migrationName, 'completed', {
          addedColumns,
          errors: migrationErrors
        });

        console.log(`✅ Migration '${migrationName}' completed successfully`);
        if (addedColumns.length > 0) {
          console.log(`   📋 Added columns: ${addedColumns.join(', ')}`);
        }
        if (migrationErrors.length > 0) {
          console.log(`   ⚠️ Non-critical errors: ${migrationErrors.length}`);
        }

      } catch (error) {
        // Rollback transaction on error
        await this.run('ROLLBACK');
        
        await this.updateMigrationLog(migrationName, 'failed', {
          error: (error as Error).message,
          addedColumns,
          errors: migrationErrors
        });

        console.error(`❌ Migration '${migrationName}' failed and was rolled back:`, (error as Error).message);
        
        // Don't throw - allow application to continue with existing schema
        console.log(`🔄 Continuing with existing database schema`);
      }

    } catch (error) {
      console.error(`❌ Critical error during migration setup:`, (error as Error).message);
      console.log(`🔄 Continuing with existing database schema`);
    }
  }

  /**
   * Check if a migration has been applied
   */
  private async checkMigrationStatus(migrationName: string): Promise<any> {
    try {
      // Create migrations table if it doesn't exist
      await this.run(`CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_name TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        details TEXT
      )`);

      return await this.get('SELECT * FROM schema_migrations WHERE migration_name = ?', [migrationName]);
    } catch (error) {
      console.error('Error checking migration status:', (error as Error).message);
      return null;
    }
  }

  /**
   * Create a migration log entry
   */
  private async createMigrationLog(migrationName: string, status: string): Promise<void> {
    try {
      await this.run(
        'INSERT OR REPLACE INTO schema_migrations (migration_name, status) VALUES (?, ?)',
        [migrationName, status]
      );
    } catch (error) {
      console.error('Error creating migration log:', (error as Error).message);
    }
  }

  /**
   * Update migration log with completion status and details
   */
  private async updateMigrationLog(migrationName: string, status: string, details: any): Promise<void> {
    try {
      await this.run(
        'UPDATE schema_migrations SET status = ?, completed_at = CURRENT_TIMESTAMP, details = ? WHERE migration_name = ?',
        [status, JSON.stringify(details), migrationName]
      );
    } catch (error) {
      console.error('Error updating migration log:', (error as Error).message);
    }
  }

  /**
   * Create a backup of the database before performing migrations
   */
  public async createBackup(backupName?: string): Promise<string | null> {
    try {
      const fs = require('fs');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = backupName || `painting_business_backup_${timestamp}.db`;
      
      // Determine backup path based on environment
      let backupPath: string;
      if (process.env.NODE_ENV === 'production') {
        // In production, use Railway persistent volume for backups
        const volumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH || '/data';
        const primaryBackupDir = path.join(volumePath, 'backups');
        const fallbackBackupDir = '/tmp/backups';
        
        try {
          if (!fs.existsSync(primaryBackupDir)) {
            fs.mkdirSync(primaryBackupDir, { recursive: true });
          }
          backupPath = path.join(primaryBackupDir, backupFileName);
        } catch (error) {
          console.log('⚠️ Cannot create volume backups, using /tmp/backups');
          if (!fs.existsSync(fallbackBackupDir)) {
            fs.mkdirSync(fallbackBackupDir, { recursive: true });
          }
          backupPath = path.join(fallbackBackupDir, backupFileName);
        }
      } else {
        // In development, use local backups directory
        backupPath = path.join(process.cwd(), 'backups', backupFileName);
      }

      // Create backups directory if it doesn't exist
      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
        console.log(`📁 Created backup directory: ${backupDir}`);
      }

      // Copy database file
      fs.copyFileSync(DB_PATH, backupPath);
      
      const stats = fs.statSync(backupPath);
      console.log(`💾 Database backup created: ${backupPath} (${stats.size} bytes)`);
      
      // Log backup in database
      await this.logBackup(backupFileName, backupPath, stats.size);
      
      return backupPath;
    } catch (error) {
      console.error('❌ Failed to create database backup:', (error as Error).message);
      return null;
    }
  }

  /**
   * Log backup information in database
   */
  private async logBackup(fileName: string, filePath: string, fileSize: number): Promise<void> {
    try {
      // Create backups table if it doesn't exist
      await this.run(`CREATE TABLE IF NOT EXISTS database_backups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backup_name TEXT NOT NULL,
        backup_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT
      )`);

      await this.run(
        'INSERT INTO database_backups (backup_name, backup_path, file_size) VALUES (?, ?, ?)',
        [fileName, filePath, fileSize]
      );
    } catch (error) {
      console.error('Error logging backup:', (error as Error).message);
    }
  }

  /**
   * Get list of available backups
   */
  public async getBackupList(): Promise<any[]> {
    try {
      return await this.all('SELECT * FROM database_backups ORDER BY created_at DESC LIMIT 10');
    } catch (error) {
      console.error('Error retrieving backup list:', (error as Error).message);
      return [];
    }
  }

  /**
   * Clean up old backups (keep only last 5)
   */
  public async cleanupOldBackups(): Promise<void> {
    try {
      const fs = require('fs');
      const backups = await this.all('SELECT * FROM database_backups ORDER BY created_at DESC');
      
      if (backups.length > 5) {
        const oldBackups = backups.slice(5);
        
        for (const backup of oldBackups) {
          try {
            if (fs.existsSync(backup.backup_path)) {
              fs.unlinkSync(backup.backup_path);
              console.log(`🗑️ Removed old backup: ${backup.backup_name}`);
            }
            
            await this.run('DELETE FROM database_backups WHERE id = ?', [backup.id]);
          } catch (error) {
            console.error(`Error removing backup ${backup.backup_name}:`, (error as Error).message);
          }
        }
      }
    } catch (error) {
      console.error('Error during backup cleanup:', (error as Error).message);
    }
  }

  /**
   * Enhanced version control migration for estimates
   */
  private async performVersionControlMigration(): Promise<void> {
    const migrationName = 'enhance_estimate_version_control';
    console.log(`🔄 Starting version control migration: ${migrationName}`);
    
    try {
      // Check if migration has already been applied
      const migrationRecord = await this.checkMigrationStatus(migrationName);
      if (migrationRecord?.status === 'completed') {
        console.log(`ℹ️ Migration '${migrationName}' already completed - skipping`);
        return;
      }

      // Create migration log entry
      await this.createMigrationLog(migrationName, 'started');

      // Create estimate_revisions table for detailed version tracking
      await this.run(`CREATE TABLE IF NOT EXISTS estimate_revisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        estimate_id INTEGER NOT NULL,
        revision_number INTEGER NOT NULL,
        created_by TEXT DEFAULT 'system',
        revision_type TEXT CHECK (revision_type IN ('initial', 'price_adjustment', 'scope_change', 'client_request', 'correction')) DEFAULT 'price_adjustment',
        change_summary TEXT,
        change_details TEXT, -- JSON string of detailed changes
        previous_total_amount DECIMAL(10,2),
        new_total_amount DECIMAL(10,2),
        previous_markup_percentage DECIMAL(5,2),
        new_markup_percentage DECIMAL(5,2),
        approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
        approved_by TEXT,
        approved_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (estimate_id) REFERENCES estimates (id),
        UNIQUE(estimate_id, revision_number)
      )`);

      // Create estimate_change_log for audit trail
      await this.run(`CREATE TABLE IF NOT EXISTS estimate_change_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        estimate_id INTEGER NOT NULL,
        revision_id INTEGER,
        field_name TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        change_type TEXT CHECK (change_type IN ('created', 'updated', 'deleted', 'status_change')) DEFAULT 'updated',
        changed_by TEXT DEFAULT 'system',
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (estimate_id) REFERENCES estimates (id),
        FOREIGN KEY (revision_id) REFERENCES estimate_revisions (id)
      )`);

      // Add version control fields to estimates table if they don't exist
      const estimatesTableInfo = await this.all("PRAGMA table_info(estimates)");
      const existingColumns = estimatesTableInfo.map((col: any) => col.name);
      
      const versionControlColumns = [
        { name: 'is_current_version', type: 'BOOLEAN DEFAULT 1' },
        { name: 'version_group_id', type: 'TEXT' }, // Groups all versions of the same estimate
        { name: 'superseded_by', type: 'INTEGER' }, // Points to the revision that replaced this one
        { name: 'superseded_at', type: 'DATETIME' },
        { name: 'change_reason', type: 'TEXT' },
        { name: 'approved_by_client', type: 'BOOLEAN DEFAULT 0' },
        { name: 'client_approval_date', type: 'DATETIME' }
      ];

      let addedVersionColumns: string[] = [];

      for (const column of versionControlColumns) {
        if (!existingColumns.includes(column.name)) {
          try {
            await this.run(`ALTER TABLE estimates ADD COLUMN ${column.name} ${column.type}`);
            addedVersionColumns.push(column.name);
            console.log(`✅ Added version control column: ${column.name}`);
          } catch (error) {
            console.error(`❌ Failed to add column ${column.name}:`, (error as Error).message);
          }
        }
      }

      // Update existing estimates to have version_group_id if they don't have one
      await this.run(`UPDATE estimates 
                      SET version_group_id = 'EST-' || id || '-GROUP' 
                      WHERE version_group_id IS NULL`);

      // Mark migration as completed
      await this.updateMigrationLog(migrationName, 'completed', {
        tablesCreated: ['estimate_revisions', 'estimate_change_log'],
        columnsAdded: addedVersionColumns
      });

      console.log(`✅ Version control migration '${migrationName}' completed successfully`);
      if (addedVersionColumns.length > 0) {
        console.log(`   📋 Added version control columns: ${addedVersionColumns.join(', ')}`);
      }

    } catch (error) {
      await this.updateMigrationLog(migrationName, 'failed', {
        error: (error as Error).message
      });
      console.error(`❌ Version control migration '${migrationName}' failed:`, (error as Error).message);
      console.log(`🔄 Continuing with existing schema`);
    }
  }

  /**
   * Create a new revision of an estimate
   */
  public async createEstimateRevision(
    originalEstimateId: number, 
    changes: any, 
    revisionType: string = 'price_adjustment',
    changeSummary: string = '',
    createdBy: string = 'system'
  ): Promise<number | null> {
    try {
      // Get the original estimate
      const originalEstimate = await this.get('SELECT * FROM estimates WHERE id = ?', [originalEstimateId]);
      if (!originalEstimate) {
        throw new Error('Original estimate not found');
      }

      // Get the highest revision number for this estimate group
      const maxRevision = await this.get(
        'SELECT MAX(revision_number) as max_rev FROM estimates WHERE version_group_id = ?',
        [originalEstimate.version_group_id]
      );
      const newRevisionNumber = (maxRevision?.max_rev || 0) + 1;

      // Create revision record
      const revisionResult = await this.run(`
        INSERT INTO estimate_revisions (
          estimate_id, revision_number, created_by, revision_type, 
          change_summary, change_details, previous_total_amount, 
          new_total_amount, previous_markup_percentage, new_markup_percentage
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        originalEstimateId,
        newRevisionNumber,
        createdBy,
        revisionType,
        changeSummary,
        JSON.stringify(changes),
        originalEstimate.total_amount,
        changes.total_amount || originalEstimate.total_amount,
        originalEstimate.markup_percentage,
        changes.markup_percentage || originalEstimate.markup_percentage
      ]);

      console.log(`✅ Created estimate revision ${newRevisionNumber} for estimate ${originalEstimateId}`);
      console.log('Revision result:', revisionResult);
      return revisionResult.lastID || revisionResult.id;
    } catch (error) {
      console.error('Error creating estimate revision:', (error as Error).message);
      console.error('Full error:', error);
      return null;
    }
  }

  /**
   * Get revision history for an estimate
   */
  public async getEstimateRevisionHistory(estimateId: number): Promise<any[]> {
    try {
      const estimate = await this.get('SELECT version_group_id FROM estimates WHERE id = ?', [estimateId]);
      if (!estimate) return [];

      return await this.all(`
        SELECT 
          e.*,
          er.revision_type,
          er.change_summary,
          er.change_details,
          er.created_by,
          er.approval_status,
          er.approved_by,
          er.approved_at
        FROM estimates e
        LEFT JOIN estimate_revisions er ON e.id = er.estimate_id
        WHERE e.version_group_id = ?
        ORDER BY e.revision_number ASC
      `, [estimate.version_group_id]);
    } catch (error) {
      console.error('Error getting revision history:', (error as Error).message);
      return [];
    }
  }

  /**
   * Log estimate changes for audit trail
   */
  public async logEstimateChange(
    estimateId: number,
    revisionId: number | null,
    fieldName: string,
    oldValue: any,
    newValue: any,
    changeType: string = 'updated',
    changedBy: string = 'system'
  ): Promise<void> {
    try {
      await this.run(`
        INSERT INTO estimate_change_log (
          estimate_id, revision_id, field_name, old_value, new_value, 
          change_type, changed_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        estimateId,
        revisionId,
        fieldName,
        String(oldValue),
        String(newValue),
        changeType,
        changedBy
      ]);
    } catch (error) {
      console.error('Error logging estimate change:', (error as Error).message);
    }
  }
}

export const db = new DatabaseManager();