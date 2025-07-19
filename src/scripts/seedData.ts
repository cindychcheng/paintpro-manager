import { db } from '../models/database';

const seedData = async () => {
  console.log('🌱 Seeding database with sample data...');

  try {
    // Clear existing data
    await db.run('DELETE FROM project_areas');
    await db.run('DELETE FROM estimates');
    await db.run('DELETE FROM clients');
    await db.run('DELETE FROM communications');
    await db.run('DELETE FROM photos');
    await db.run('DELETE FROM quality_checkpoints');

    // Reset sequences
    await db.run('UPDATE number_sequences SET current_number = 0 WHERE sequence_type = "estimate"');
    await db.run('UPDATE number_sequences SET current_number = 0 WHERE sequence_type = "invoice"');

    // Insert sample clients
    const client1 = await db.run(
      `INSERT INTO clients (name, email, phone, address, city, state, zip_code, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'John Smith',
        'john.smith@email.com',
        '(555) 123-4567',
        '123 Main Street',
        'Vancouver',
        'BC',
        'V6B 1A1',
        'Prefers Benjamin Moore paints, has two dogs'
      ]
    );

    const client2 = await db.run(
      `INSERT INTO clients (name, email, phone, address, city, state, zip_code, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Sarah Johnson',
        'sarah.j@homeowner.com',
        '(555) 987-6543',
        '456 Oak Avenue',
        'Burnaby',
        'BC',
        'V5H 2M3',
        'Previous customer, very detail-oriented'
      ]
    );

    const client3 = await db.run(
      `INSERT INTO clients (name, email, phone, address, city, state, zip_code, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'ABC Corporation',
        'facilities@abccorp.com',
        '(555) 555-0123',
        '789 Business Park Drive',
        'Richmond',
        'BC',
        'V6X 3P7',
        'Commercial client, requires all work done after hours'
      ]
    );

    console.log('✅ Clients created');

    // Create estimates with proper numbering
    const estimate1 = await db.run(
      `INSERT INTO estimates (
        estimate_number, client_id, title, description, status, total_amount,
        labor_cost, material_cost, markup_percentage, valid_until
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'EST-0001',
        client1.id,
        'Interior Painting - Living Room & Kitchen',
        'Complete interior painting of living room and kitchen areas including prep work, primer, and two coats of paint.',
        'sent',
        2450.00,
        1800.00,
        350.00,
        15.0,
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
      ]
    );

    const estimate2 = await db.run(
      `INSERT INTO estimates (
        estimate_number, client_id, title, description, status, total_amount,
        labor_cost, material_cost, markup_percentage, valid_until
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'EST-0002',
        client2.id,
        'Exterior House Painting',
        'Full exterior house painting including siding, trim, doors, and shutters. Includes pressure washing, scraping, priming, and two coats of quality exterior paint.',
        'approved',
        8750.00,
        6000.00,
        1500.00,
        18.0,
        new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 45 days from now
      ]
    );

    const estimate3 = await db.run(
      `INSERT INTO estimates (
        estimate_number, client_id, title, description, status, total_amount,
        labor_cost, material_cost, markup_percentage, valid_until
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'EST-0003',
        client3.id,
        'Office Interior Renovation',
        'Painting of conference rooms, hallways, and reception area. Modern color scheme with accent walls.',
        'draft',
        5200.00,
        3600.00,
        800.00,
        20.0,
        null
      ]
    );

    // Update the sequence counter
    await db.run('UPDATE number_sequences SET current_number = 3 WHERE sequence_type = "estimate"');

    console.log('✅ Estimates created');

    // Add project areas for each estimate
    await db.run(
      `INSERT INTO project_areas (
        estimate_id, area_name, area_type, surface_type, square_footage, ceiling_height,
        prep_requirements, paint_type, paint_brand, paint_color, finish_type,
        number_of_coats, labor_hours, labor_rate, material_cost, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        estimate1.id,
        'Living Room',
        'indoor',
        'drywall',
        320.0,
        9.0,
        'Fill nail holes, light sanding, primer on new drywall patches',
        'Latex',
        'Benjamin Moore',
        'Classic Gray (OC-23)',
        'Eggshell',
        2,
        24.0,
        45.0,
        200.00,
        'Customer requested low-VOC paint'
      ]
    );

    await db.run(
      `INSERT INTO project_areas (
        estimate_id, area_name, area_type, surface_type, square_footage, ceiling_height,
        prep_requirements, paint_type, paint_brand, paint_color, finish_type,
        number_of_coats, labor_hours, labor_rate, material_cost, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        estimate1.id,
        'Kitchen',
        'indoor',
        'drywall',
        180.0,
        9.0,
        'Clean grease stains, patch holes, prime stained areas',
        'Latex',
        'Benjamin Moore',
        'White Dove (OC-17)',
        'Semi-gloss',
        2,
        16.0,
        45.0,
        150.00,
        'Semi-gloss for easy cleaning in kitchen'
      ]
    );

    await db.run(
      `INSERT INTO project_areas (
        estimate_id, area_name, area_type, surface_type, square_footage, ceiling_height,
        prep_requirements, paint_type, paint_brand, paint_color, finish_type,
        number_of_coats, labor_hours, labor_rate, material_cost, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        estimate2.id,
        'Exterior Siding',
        'outdoor',
        'wood',
        1200.0,
        null,
        'Pressure wash, scrape loose paint, sand smooth, prime bare wood',
        'Acrylic Latex',
        'Sherwin Williams',
        'Naval (SW 6244)',
        'Satin',
        2,
        80.0,
        50.0,
        800.00,
        'Premium exterior paint for durability'
      ]
    );

    await db.run(
      `INSERT INTO project_areas (
        estimate_id, area_name, area_type, surface_type, square_footage, ceiling_height,
        prep_requirements, paint_type, paint_brand, paint_color, finish_type,
        number_of_coats, labor_hours, labor_rate, material_cost, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        estimate2.id,
        'Trim & Doors',
        'outdoor',
        'wood',
        240.0,
        null,
        'Sand, fill gaps with caulk, prime any bare wood',
        'Acrylic Latex',
        'Sherwin Williams',
        'Pure White (SW 7005)',
        'Semi-gloss',
        2,
        40.0,
        50.0,
        700.00,
        'Contrasting white trim'
      ]
    );

    await db.run(
      `INSERT INTO project_areas (
        estimate_id, area_name, area_type, surface_type, square_footage, ceiling_height,
        prep_requirements, paint_type, paint_brand, paint_color, finish_type,
        number_of_coats, labor_hours, labor_rate, material_cost, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        estimate3.id,
        'Conference Room A',
        'indoor',
        'drywall',
        280.0,
        10.0,
        'Patch screw holes from previous artwork, light sanding',
        'Latex',
        'Benjamin Moore',
        'Hale Navy (HC-154)',
        'Eggshell',
        2,
        18.0,
        50.0,
        180.00,
        'Accent wall in navy blue'
      ]
    );

    await db.run(
      `INSERT INTO project_areas (
        estimate_id, area_name, area_type, surface_type, square_footage, ceiling_height,
        prep_requirements, paint_type, paint_brand, paint_color, finish_type,
        number_of_coats, labor_hours, labor_rate, material_cost, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        estimate3.id,
        'Reception Area',
        'indoor',
        'drywall',
        400.0,
        12.0,
        'Fill nail holes, spot prime any stains',
        'Latex',
        'Benjamin Moore',
        'Cloud White (OC-130)',
        'Flat',
        2,
        28.0,
        50.0,
        320.00,
        'High ceiling area, will need scaffolding'
      ]
    );

    await db.run(
      `INSERT INTO project_areas (
        estimate_id, area_name, area_type, surface_type, square_footage, ceiling_height,
        prep_requirements, paint_type, paint_brand, paint_color, finish_type,
        number_of_coats, labor_hours, labor_rate, material_cost, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        estimate3.id,
        'Hallways',
        'indoor',
        'drywall',
        180.0,
        9.0,
        'Touch up scuff marks, light cleaning',
        'Latex',
        'Benjamin Moore',
        'Moonshine (OC-142)',
        'Eggshell',
        1,
        12.0,
        50.0,
        120.00,
        'Light color to brighten hallways'
      ]
    );

    console.log('✅ Project areas created');

    // Add some sample communications
    await db.run(
      `INSERT INTO communications (
        client_id, estimate_id, communication_type, direction, subject, content, status, sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        client1.id,
        estimate1.id,
        'email',
        'outbound',
        'Estimate EST-0001 - Interior Painting',
        'Hi John, attached is your estimate for the living room and kitchen painting project. Please review and let me know if you have any questions.',
        'sent',
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
      ]
    );

    await db.run(
      `INSERT INTO communications (
        client_id, estimate_id, communication_type, direction, subject, content, status, sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        client2.id,
        estimate2.id,
        'phone',
        'inbound',
        'Estimate Approval',
        'Sarah called to approve the exterior painting estimate. She wants to schedule for next month.',
        'delivered',
        new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      ]
    );

    console.log('✅ Communications created');

    // Add some paint library entries
    await db.run(
      `INSERT INTO paint_library (
        brand, product_line, color_name, color_code, finish_type, coverage_per_gallon,
        price_per_gallon, voc_rating, primer_required, surface_types, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Benjamin Moore',
        'Regal Select',
        'Classic Gray',
        'OC-23',
        'Eggshell',
        400,
        65.99,
        'Low VOC',
        false,
        JSON.stringify(['drywall', 'wood', 'metal']),
        'Premium interior paint with excellent coverage'
      ]
    );

    await db.run(
      `INSERT INTO paint_library (
        brand, product_line, color_name, color_code, finish_type, coverage_per_gallon,
        price_per_gallon, voc_rating, primer_required, surface_types, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Sherwin Williams',
        'Duration Exterior',
        'Naval',
        'SW 6244',
        'Satin',
        350,
        78.99,
        'Low VOC',
        true,
        JSON.stringify(['wood', 'metal', 'stucco']),
        'Self-priming exterior paint with superior durability'
      ]
    );

    console.log('✅ Paint library entries created');

    console.log('🎉 Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log('  • 3 Clients created');
    console.log('  • 3 Estimates created (EST-0001, EST-0002, EST-0003)');
    console.log('  • 7 Project areas created');
    console.log('  • 2 Communications logged');
    console.log('  • 2 Paint library entries added');
    console.log('\n🚀 Ready to test the application!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  seedData()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export default seedData;