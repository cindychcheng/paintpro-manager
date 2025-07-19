import cron from 'node-cron';
import { db } from '../models/database';

export const setupCronJobs = () => {
  console.log('🔄 Setting up automated communication jobs...');

  // Check for overdue invoices daily at 9 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Checking for overdue invoices...');
    try {
      const overdueInvoices = await db.all(`
        SELECT i.*, c.name as client_name, c.email as client_email
        FROM invoices i
        JOIN clients c ON i.client_id = c.id
        WHERE i.status = 'sent' 
        AND i.due_date < date('now')
        AND c.email IS NOT NULL
      `);

      for (const invoice of overdueInvoices) {
        // Update invoice status to overdue
        await db.run('UPDATE invoices SET status = "overdue" WHERE id = ?', [invoice.id]);
        
        // TODO: Send overdue notice email
        console.log(`Invoice ${invoice.invoice_number} is overdue for ${invoice.client_name}`);
      }
    } catch (error) {
      console.error('Error checking overdue invoices:', error);
    }
  });

  // Send maintenance reminders monthly on the 1st at 10 AM
  cron.schedule('0 10 1 * *', async () => {
    console.log('Checking for maintenance reminders...');
    try {
      // Find completed projects that might need maintenance
      const projects = await db.all(`
        SELECT DISTINCT c.*, i.created_at as project_date
        FROM clients c
        JOIN invoices i ON c.id = i.client_id
        WHERE i.status = 'paid'
        AND date(i.created_at, '+365 days') <= date('now', '+30 days')
        AND c.email IS NOT NULL
      `);

      for (const client of projects) {
        // TODO: Send maintenance reminder email
        console.log(`Maintenance reminder due for ${client.name}`);
      }
    } catch (error) {
      console.error('Error sending maintenance reminders:', error);
    }
  });

  console.log('🚀 Cron jobs initialized successfully');
};