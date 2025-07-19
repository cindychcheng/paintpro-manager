import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'painting_business.db');

export class DatabaseManager {
  private db: Database;

  constructor() {
    this.db = new sqlite3.Database(DB_PATH);
    this.initializeTables();
  }

  private async initializeTables(): Promise<void> {
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
}

export const db = new DatabaseManager();