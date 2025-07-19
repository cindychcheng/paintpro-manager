import { db } from '../models/database';
import { NumberSequence } from '../types';

export class NumberService {
  /**
   * Generate next estimate number (EST-XXXX format)
   */
  static async getNextEstimateNumber(): Promise<string> {
    const sequence = await db.get(
      'SELECT * FROM number_sequences WHERE sequence_type = ?',
      ['estimate']
    ) as NumberSequence;

    const nextNumber = sequence.current_number + 1;
    
    // Update the sequence
    await db.run(
      'UPDATE number_sequences SET current_number = ? WHERE sequence_type = ?',
      [nextNumber, 'estimate']
    );

    // Format as EST-0001, EST-0002, etc.
    return `EST-${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Generate next invoice number (INV-XXXX format)
   */
  static async getNextInvoiceNumber(): Promise<string> {
    const sequence = await db.get(
      'SELECT * FROM number_sequences WHERE sequence_type = ?',
      ['invoice']
    ) as NumberSequence;

    const nextNumber = sequence.current_number + 1;
    
    // Update the sequence
    await db.run(
      'UPDATE number_sequences SET current_number = ? WHERE sequence_type = ?',
      [nextNumber, 'invoice']
    );

    // Format as INV-0001, INV-0002, etc.
    return `INV-${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Get current sequence numbers for display
   */
  static async getCurrentSequences(): Promise<{ estimate: number; invoice: number }> {
    const estimateSeq = await db.get(
      'SELECT current_number FROM number_sequences WHERE sequence_type = ?',
      ['estimate']
    ) as { current_number: number };

    const invoiceSeq = await db.get(
      'SELECT current_number FROM number_sequences WHERE sequence_type = ?',
      ['invoice']
    ) as { current_number: number };

    return {
      estimate: estimateSeq.current_number,
      invoice: invoiceSeq.current_number
    };
  }
}