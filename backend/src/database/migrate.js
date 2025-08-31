const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

/**
 * Database Migration Script
 * Initializes the LARK Labs AI Influencer database schema
 */

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔄 Starting database migration...');
    console.log(`📊 Connected to database: ${process.env.DATABASE_URL ? 'SET' : 'MISSING'}`);

    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');

    console.log('📋 Executing database schema...');
    
    // Execute schema with CREATE IF NOT EXISTS handling
    try {
      await pool.query(schema);
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ Tables already exist - skipping schema creation');
      } else {
        throw error; // Re-throw if it's a different error
      }
    }

    console.log('✅ Database schema created successfully!');
    console.log('📊 Tables created:');
    
    // List created tables
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    console.log(`🎯 Total tables: ${result.rows.length}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔚 Database connection closed');
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrate;