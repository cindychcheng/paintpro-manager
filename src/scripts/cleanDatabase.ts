import { db } from '../models/database';

/**
 * Script to clean all estimates, invoices, and related data for fresh start
 * CAUTION: This will permanently delete all estimates and invoices
 */
async function cleanDatabase() {
  try {
    console.log('🧹 Starting database cleanup...');
    console.log('⚠️  WARNING: This will delete ALL estimates and invoices!');
    
    // Create backup before cleanup
    console.log('💾 Creating backup before cleanup...');
    const backupPath = await (db as any).createBackup(`pre_cleanup_${Date.now()}.db`);
    if (backupPath) {
      console.log('✅ Backup created successfully');
    } else {
      console.log('⚠️ Backup creation failed, but continuing...');
    }
    
    // Start transaction for atomic cleanup
    await db.run('BEGIN TRANSACTION');
    
    try {
      // 1. Delete related data first (foreign key constraints)
      console.log('🗑️ Deleting related data...');
      
      // Delete payments (references invoices)
      const paymentsResult = await db.run('DELETE FROM payments');
      console.log(`   • Deleted ${paymentsResult.changes || 0} payments`);
      
      // Delete project areas (references estimates/invoices)
      const projectAreasResult = await db.run('DELETE FROM project_areas');
      console.log(`   • Deleted ${projectAreasResult.changes || 0} project areas`);
      
      // Delete quality checkpoints (via project_areas)
      const qualityResult = await db.run('DELETE FROM quality_checkpoints');
      console.log(`   • Deleted ${qualityResult.changes || 0} quality checkpoints`);
      
      // Delete photos (references project_areas/quality_checkpoints)
      const photosResult = await db.run('DELETE FROM photos WHERE project_area_id IS NOT NULL OR quality_checkpoint_id IS NOT NULL');
      console.log(`   • Deleted ${photosResult.changes || 0} project photos`);
      
      // Delete communications (references estimates/invoices)
      const communicationsResult = await db.run('DELETE FROM communications WHERE estimate_id IS NOT NULL OR invoice_id IS NOT NULL');
      console.log(`   • Deleted ${communicationsResult.changes || 0} communications`);
      
      // Delete estimate revisions and change logs
      const revisionsResult = await db.run('DELETE FROM estimate_revisions');
      console.log(`   • Deleted ${revisionsResult.changes || 0} estimate revisions`);
      
      const changeLogsResult = await db.run('DELETE FROM estimate_change_log');
      console.log(`   • Deleted ${changeLogsResult.changes || 0} estimate change logs`);
      
      // 2. Delete main tables
      console.log('🗑️ Deleting main tables...');
      
      // Delete all invoices
      const invoicesResult = await db.run('DELETE FROM invoices');
      console.log(`   • Deleted ${invoicesResult.changes || 0} invoices`);
      
      // Delete all estimates
      const estimatesResult = await db.run('DELETE FROM estimates');
      console.log(`   • Deleted ${estimatesResult.changes || 0} estimates`);
      
      // 3. Reset sequences
      console.log('🔄 Resetting number sequences...');
      
      // Reset estimate sequence to 0
      await db.run('UPDATE number_sequences SET current_number = 0 WHERE sequence_type = ?', ['estimate']);
      console.log('   • Reset estimate sequence to 0 (next will be EST-0001)');
      
      // Reset invoice sequence to 1000
      await db.run('UPDATE number_sequences SET current_number = 1000 WHERE sequence_type = ?', ['invoice']);
      console.log('   • Reset invoice sequence to 1000 (next will be INV-1001)');
      
      // 4. Reset SQLite auto-increment counters
      console.log('🔄 Resetting auto-increment counters...');
      await db.run('DELETE FROM sqlite_sequence WHERE name IN (?, ?)', ['estimates', 'invoices']);
      console.log('   • Reset auto-increment counters');
      
      // Commit transaction
      await db.run('COMMIT');
      
      console.log('✅ Database cleanup completed successfully!');
      console.log('');
      console.log('📊 Summary:');
      console.log('   • All estimates and invoices deleted');
      console.log('   • All related data cleaned up');
      console.log('   • Sequences reset: EST-0001, INV-1001');
      console.log('   • Clients preserved (not deleted)');
      console.log('   • Company settings preserved');
      console.log('');
      console.log('🎯 Ready for fresh data entry!');
      
    } catch (error) {
      // Rollback on error
      await db.run('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    throw error;
  }
}

// Export for use in other scripts
export { cleanDatabase };

// Run if called directly
if (require.main === module) {
  cleanDatabase()
    .then(() => {
      console.log('✅ Database cleanup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Cleanup failed:', error);
      process.exit(1);
    });
}