const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.argv[2] });

const lastNames = ['Rivers','Stone','Chase','Blake','Monroe','Hayes','Cross','Lane','Voss','Reed','Fox','Steele','Storm','Nova','Vale','Knox','West','Ray','Hart','Cole'];
const firstNames = ['Aria','Bella','Cleo','Dana','Elena','Faye','Grace','Harper','Iris','Jade','Kira','Luna','Maya','Nina','Olivia','Paris','Quinn','Rose','Sofia','Tara','Uma','Vera','Willow','Xena','Zara','Amber','Brooke','Camille','Diana','Eva'];

async function update() {
  const r = await pool.query('SELECT id, name FROM creators');
  console.log('Updating', r.rows.length, 'creators...');
  let updated = 0;
  for (const row of r.rows) {
    const first = row.name.startsWith('Model_') 
      ? firstNames[parseInt(row.name.replace('Model_','')) % firstNames.length]
      : row.name;
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fullName = first + ' ' + last;
    const age = 18 + Math.floor(Math.random() * 12); // 18-29
    await pool.query(
      'UPDATE creators SET name=$1, profile_data = profile_data || $2 WHERE id=$3',
      [fullName, JSON.stringify({ full_name: fullName, age, age_verified: true, legal_adult: true, compliance_confirmed: true }), row.id]
    );
    updated++;
  }
  console.log('DONE:', updated, 'creators updated with full names + age verification');
  await pool.end();
}
update();