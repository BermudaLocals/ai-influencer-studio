#!/usr/bin/env node
/**
 * AI Art Studio Setup Script
 * Run this to initialize the database schema for OpenArt-style features
 */
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setup() {
  console.log('🔧 Setting up AI Art Studio database...\n');

  try {
    const schemaPath = path.join(__dirname, 'server/models/artGallerySchema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📊 Creating tables...');
    // Enable uuid extension if not exists
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"').catch(() => {});
    
    await pool.query(schema);
    
    console.log('✅ Tables created successfully!');
    console.log('\n📋 Created:');
    console.log('  • art_generations - Store all image generations');
    console.log('  • art_collections - User image collections');
    console.log('  • art_collection_items - Many-to-many link');
    console.log('  • art_favorites - User favorites');
    console.log('  • art_custom_models - Custom LoRA/DreamBooth models');
    console.log('  • art_style_presets - 10 system style presets');
    console.log('  • art_generation_queue - Async processing queue');
    console.log('  • art_credit_transactions - Credit usage tracking');

    // Verify tables
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'art_%'
    `);
    
    console.log(`\n✨ ${result.rows.length} art tables are ready!`);
    
    // Check data
    const styles = await pool.query('SELECT COUNT(*) FROM art_style_presets');
    console.log(`🎨 ${styles.rows[0].count} style presets loaded`);

  } catch (err) {
    console.error('❌ Setup failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }

  console.log('\n🚀 AI Art Studio is ready!');
  console.log('   Access at: /art-studio/index.html');
}

setup();
