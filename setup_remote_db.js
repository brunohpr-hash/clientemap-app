const { Client } = require('pg');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbUrl = "postgresql://postgres.aihztgmrurqtqrcnuvze:ClientemapDBA%212026@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require";

async function run() {
    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    try {
        console.log("Connecting to Cloud DB...");
        await client.connect();
        
        console.log("Reading SQL dump...");
        const ddl = fs.readFileSync('deploy_utf8.sql', 'utf8');
        
        console.log("Executing huge Schema DDL on Supabase. This may take 2 seconds...");
        await client.query(ddl);
        
        console.log("Schema injected success. Now hashing admin password...");
        const hash = await bcrypt.hash("Admin@123456", 12);
        
        console.log("Inserting Super Admin 'admin@clientemap.com' in the User Table...");
        await client.query(`
            INSERT INTO "User" (id, name, email, password, role) 
            VALUES (gen_random_uuid(), 'Administrator', 'admin@clientemap.com', $1, 'admin')
            ON CONFLICT (email) DO NOTHING;
        `, [hash]);

        console.log("--- SUCCESS: Database Complete ---");
        process.exit(0);
    } catch (e) {
        console.error("--- FATAL ERROR IN PG CLIENT ---", e);
        process.exit(1);
    }
}

run();
