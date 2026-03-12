const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.argv[2] });
async function load() {
  let raw = fs.readFileSync(process.argv[3], 'utf8');
  raw = raw.replace(/^\uFEFF/, '').trim();
  const data = JSON.parse(raw);
  const creators = data.creators || data;
  console.log('Loading', creators.length, 'creators...');
  let saved = 0;
  const sql = 'INSERT INTO creators (id,name,niche,content_type,profile_data,image_urls,fanvue_profile,posting_schedule,status,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW()) ON CONFLICT (id) DO UPDATE SET profile_data=$5, updated_at=NOW()';
  for (const c of creators) {
    const id = (c.id || c.name || 'x').toLowerCase().replace(/[^a-z0-9]/g,'_');
    try {
      await pool.query(sql, [id, c.name||id, c.niche||'general', c.content_type||'adult', JSON.stringify(c), '[]', '{}', '{}', 'active']);
      saved++;
      if (saved % 10 === 0) console.log('Saved', saved, '/', creators.length);
    } catch(e) { console.log('Skip', id, e.message); }
  }
  console.log('DONE:', saved, 'creators loaded');
  await pool.end();
}
load();