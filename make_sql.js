const fs = require('fs');
const bcrypt = require('bcryptjs');

async function go() {
    let ddl = fs.readFileSync('deploy_utf8.sql', 'utf8');
    const hash = await bcrypt.hash("Admin@123456", 12);
    
    ddl += "\n\n-- SEED DATA SETUP --\n";
    ddl += "INSERT INTO \"sectors\" (id, name, slug, color, \"order\", is_default) VALUES\n";
    ddl += "  (gen_random_uuid(), 'Contábil', 'contabil', '#3B82F6', 1, true),\n";
    ddl += "  (gen_random_uuid(), 'Fiscal', 'fiscal', '#10B981', 2, false),\n";
    ddl += "  (gen_random_uuid(), 'Departamento Pessoal', 'dp', '#F59E0B', 3, false),\n";
    ddl += "  (gen_random_uuid(), 'Societário', 'societario', '#8B5CF6', 4, false)\n";
    ddl += "ON CONFLICT (slug) DO NOTHING;\n";

    ddl += `\nINSERT INTO "users" (id, name, email, password_hash, role, status, updated_at) VALUES\n`;
    ddl += `  (gen_random_uuid(), 'Administrador', 'admin@clientemap.com', '${hash}', 'admin', 'active', now())\n`;
    ddl += `ON CONFLICT (email) DO NOTHING;\n`;

    fs.writeFileSync('full_setup.txt', ddl);
    console.log("File ready.");
}
go();
