#!/usr/bin/env node

const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'localhost',
  port: 3308,
  user: 'rota_user',
  password: 'rota_password',
  database: 'rota_track'
};

// New staff list from user
const newStaffList = [
  'Stephen Cooper',
  'Darren Milhench', 
  'Darren Mycroft',
  'Kevin Gaskell',
  'Merv Permalloo',
  'Regan Stringer',
  'Matthew Cope',
  'AJ',
  'Michael Shaw',
  'Steven Richardson',
  'Chris Roach',
  'Simon Collins',
  'James Bennett',
  'Rob Mcpartland',
  'John Evans',
  'Charlotte Rimmer',
  'Carla Barton',
  'Andrew Trudgeon',
  'Stepen Bowater',
  'Matthew Bennett',
  'Stephen Scarsbrook',
  'Jordon Fish',
  'Stephen Haughton',
  'Stephen Maher',
  'Marcus Huntington',
  'Chris Roach', // Duplicate in list
  'Mark Walton',
  'Allen Butler',
  'Craig Butler',
  'Martin Hobson',
  'Martin Kenyon',
  'Scott Cartledge',
  'Tony Batters',
  'Lewis Yearsley',
  'Tomas Konkol',
  'David Sykes',
  'Darren Flowers',
  'Brian Cassidy',
  'Karen Blackett',
  'James Mitchell',
  'Alan Kelly',
  'Tomas Konkol', // Duplicate in list
  'David Sykes', // Duplicate in list
  'George Willerton',
  'Matthew Rushton',
  'Stuart Ford',
  'Lee Stafford',
  'Nicola Benger',
  'Jeff Robinson',
  'Dean Pickering',
  'Mark Lloyd',
  'Soloman Offei',
  'Stephen Burke',
  'Julie Greenough',
  'Edward Collier',
  'Phil Hillinshead',
  'Kevin Tomlinson',
  'Colin Bromley',
  'Gary Booth',
  'Lynne Warner',
  'Roy Harris',
  'Ian Moss',
  'Stephen Kirk',
  'Gavin Mardsden',
  'Andrew Hassall',
  'Paul Fisher',
  'Kyle Sanderson',
  'Peter Moss',
  'Chris Wardle',
  'Eloisa Andrew',
  'Gary Bromley',
  'Mike Brennan',
  'Lucy Redfearn',
  'Joe Redfearn',
  'Mark Dickinson',
  'Ian Speakes',
  'Paul Berry',
  'Robert Frost',
  'Andrew Gibson',
  'Nigel Beesley',
  'Paul Flowers',
  'Mark Haughton',
  'Alan Quinn',
  'Chris Huckaby',
  'Jason Newton',
  'Stuart Lomas',
  'Kyle Blackshaw',
  'Martin Smith',
  'Martin Fearon',
  'Luke Clements',
  'Chris Crombie',
  'Chris Threadgold'
];

async function addStaffMembers() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    // Get existing staff names
    console.log('📋 Fetching existing staff...');
    const [existingRows] = await connection.execute('SELECT name FROM porters');
    const existingNames = existingRows.map(row => row.name);
    console.log(`📊 Found ${existingNames.length} existing staff members`);
    
    // Remove duplicates from the new staff list (case-insensitive)
    const uniqueNewStaff = [...new Set(newStaffList)];
    console.log(`🔍 Removed ${newStaffList.length - uniqueNewStaff.length} duplicates from input list`);
    
    // Filter out staff that already exist in database (case-insensitive)
    const staffToAdd = uniqueNewStaff.filter(name => 
      !existingNames.some(existing => 
        existing.toLowerCase() === name.toLowerCase()
      )
    );
    
    console.log(`✅ ${staffToAdd.length} new staff members to add`);
    console.log(`❌ ${uniqueNewStaff.length - staffToAdd.length} staff members already exist`);
    
    if (staffToAdd.length === 0) {
      console.log('🎯 No new staff to add!');
      return;
    }
    
    // Add new staff members
    console.log('\n➕ Adding new staff members...');
    let addedCount = 0;
    
    for (const name of staffToAdd) {
      try {
        // Generate employee ID (P + next number)
        const [maxIdRows] = await connection.execute(
          'SELECT MAX(CAST(SUBSTRING(employee_id, 2) AS UNSIGNED)) as max_id FROM porters WHERE employee_id LIKE "P%"'
        );
        const nextId = (maxIdRows[0].max_id || 0) + 1;
        const employeeId = `P${nextId.toString().padStart(3, '0')}`;
        
        // Generate email
        const email = `${name.toLowerCase().replace(/\s+/g, '.')}.porter@hospital.nhs.uk`;
        
        // Insert new porter
        await connection.execute(
          `INSERT INTO porters (name, employee_id, email, phone, role, qualifications, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            name,
            employeeId,
            email,
            '01234 567890', // Default phone
            'Day Shift One', // Default role
            JSON.stringify(['Basic Porter']), // Default qualifications
            1 // Active
          ]
        );
        
        addedCount++;
        console.log(`  ✅ Added: ${name} (${employeeId})`);
        
      } catch (error) {
        console.error(`  ❌ Failed to add ${name}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Successfully added ${addedCount} staff members!`);
    
    // Show final count
    const [finalRows] = await connection.execute('SELECT COUNT(*) as total FROM porters');
    console.log(`📊 Total staff members in database: ${finalRows[0].total}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the script
addStaffMembers();
