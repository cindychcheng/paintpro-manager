import { db } from '../models/database';

/**
 * Migration script to update invoice sequence to start from 1000
 * This ensures the next invoice will be INV-1001
 */
async function updateInvoiceSequence() {
  try {
    console.log('🔄 Starting invoice sequence migration...');
    
    // Check current sequence
    const currentSequence = await db.get(
      'SELECT * FROM number_sequences WHERE sequence_type = ?',
      ['invoice']
    );
    
    console.log('📊 Current invoice sequence:', currentSequence);
    
    if (!currentSequence) {
      console.log('❌ Invoice sequence not found in database');
      return;
    }
    
    // Update the sequence to 1000
    const result = await db.run(
      'UPDATE number_sequences SET current_number = ? WHERE sequence_type = ?',
      [1000, 'invoice']
    );
    
    console.log('✅ Update result:', result);
    
    // Verify the update
    const updatedSequence = await db.get(
      'SELECT * FROM number_sequences WHERE sequence_type = ?',
      ['invoice']
    );
    
    console.log('✅ Updated invoice sequence:', updatedSequence);
    console.log('🎯 Next invoice will be: INV-1001');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Export for use in other scripts
export { updateInvoiceSequence };

// Run if called directly
if (require.main === module) {
  updateInvoiceSequence()
    .then(() => {
      console.log('✅ Invoice sequence migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}