const { Client } = require("pg");
const dns = require("dns");

// Force Node to try IPv6 since the Supabase direct host only has AAAA records
dns.setDefaultResultOrder("verbatim");

async function tryConnect(connStr) {
  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  await client.connect();
  return client;
}

async function main() {
  let client;
  
  // Try direct connection first, then pooler
  const urls = [
    { name: "Direct (IPv6)", url: "postgresql://postgres:ClientemapDBA%212026@db.aihztgmrurqtqrcnuvze.supabase.co:5432/postgres" },
    { name: "Pooler (6543)", url: "postgresql://postgres.aihztgmrurqtqrcnuvze:ClientemapDBA%212026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres" },
    { name: "Pooler (5432)", url: "postgresql://postgres.aihztgmrurqtqrcnuvze:ClientemapDBA%212026@aws-1-sa-east-1.pooler.supabase.com:5432/postgres" },
  ];

  for (const { name, url } of urls) {
    try {
      console.log(`Tentando conexão via ${name}...`);
      client = await tryConnect(url);
      console.log(`Conectado via ${name}!\n`);
      break;
    } catch (e) {
      console.log(`  Falhou: ${e.message}`);
    }
  }

  if (!client) {
    console.error("\nNão foi possível conectar ao banco por nenhuma rota.");
    process.exit(1);
  }

  // 1. Total database size
  const dbSize = await client.query(`
    SELECT pg_size_pretty(pg_database_size(current_database())) AS size,
           pg_database_size(current_database()) AS size_bytes;
  `);

  console.log("========================================");
  console.log("  TAMANHO TOTAL DO BANCO DE DADOS");
  console.log("========================================");
  console.log(`  Tamanho:  ${dbSize.rows[0].size}`);
  console.log(`  Limite:   8 GB (plano Pro Supabase)`);
  const usedPct = ((Number(dbSize.rows[0].size_bytes) / (8 * 1024 * 1024 * 1024)) * 100).toFixed(2);
  console.log(`  Uso:      ${usedPct}%`);
  console.log("");

  // 2. Per-table sizes (using information_schema + pg_total_relation_size)
  const tables = await client.query(`
    SELECT
      t.table_name AS "table",
      pg_size_pretty(pg_total_relation_size(quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))) AS total_size,
      pg_total_relation_size(quote_ident(t.table_schema) || '.' || quote_ident(t.table_name)) AS total_bytes,
      pg_size_pretty(pg_relation_size(quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))) AS data_size,
      (SELECT count(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = t.table_schema) AS col_count
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
    ORDER BY pg_total_relation_size(quote_ident(t.table_schema) || '.' || quote_ident(t.table_name)) DESC;
  `);

  console.log("========================================");
  console.log("  TAMANHO POR TABELA");
  console.log("========================================");
  console.log(
    "  " +
      "Tabela".padEnd(35) +
      "Tamanho".padEnd(12) +
      "Dados".padEnd(12)
  );
  console.log("  " + "-".repeat(59));
  for (const row of tables.rows) {
    console.log(
      "  " +
        row.table.padEnd(35) +
        row.total_size.padEnd(12) +
        row.data_size.padEnd(12)
    );
  }
  console.log("");

  // 3. Row counts per table
  const counts = await client.query(`
    SELECT 'users' AS t, count(*)::int AS n FROM users
    UNION ALL SELECT 'clients', count(*)::int FROM clients
    UNION ALL SELECT 'sectors', count(*)::int FROM sectors
    UNION ALL SELECT 'categories', count(*)::int FROM categories
    UNION ALL SELECT 'particularidades', count(*)::int FROM particularidades
    UNION ALL SELECT 'particularidade_attachments', count(*)::int FROM particularidade_attachments
    UNION ALL SELECT 'particularidade_history', count(*)::int FROM particularidade_history
    UNION ALL SELECT 'notifications', count(*)::int FROM notifications
    UNION ALL SELECT 'audit_log', count(*)::int FROM audit_log
    UNION ALL SELECT 'refresh_tokens', count(*)::int FROM refresh_tokens
    UNION ALL SELECT 'system_settings', count(*)::int FROM system_settings
    UNION ALL SELECT 'client_responsibles', count(*)::int FROM client_responsibles
    UNION ALL SELECT 'user_sectors', count(*)::int FROM user_sectors
    ORDER BY n DESC;
  `);

  console.log("========================================");
  console.log("  CONTAGEM DE REGISTROS POR TABELA");
  console.log("========================================");
  console.log("  " + "Tabela".padEnd(35) + "Registros");
  console.log("  " + "-".repeat(45));
  let totalRows = 0;
  for (const row of counts.rows) {
    console.log("  " + row.t.padEnd(35) + row.n);
    totalRows += row.n;
  }
  console.log("  " + "-".repeat(45));
  console.log("  " + "TOTAL".padEnd(35) + totalRows);
  console.log("");

  // 4. Storage bucket usage
  try {
    const storageSize = await client.query(`
      SELECT
        bucket_id,
        COUNT(*) AS file_count,
        pg_size_pretty(COALESCE(SUM((metadata->>'size')::bigint), 0)) AS total_size,
        COALESCE(SUM((metadata->>'size')::bigint), 0) AS total_bytes
      FROM storage.objects
      GROUP BY bucket_id
      ORDER BY total_bytes DESC;
    `);

    console.log("========================================");
    console.log("  SUPABASE STORAGE (ANEXOS)");
    console.log("========================================");
    if (storageSize.rows.length === 0) {
      console.log("  Nenhum arquivo armazenado ainda.");
    } else {
      for (const row of storageSize.rows) {
        console.log(`  Bucket: ${row.bucket_id}`);
        console.log(`  Arquivos: ${row.file_count}`);
        console.log(`  Tamanho: ${row.total_size}`);
        const storagePct = ((Number(row.total_bytes) / (1024 * 1024 * 1024)) * 100).toFixed(2);
        console.log(`  Uso: ${storagePct}% de 1 GB`);
      }
    }
    console.log("");
  } catch (e) {
    console.log("  SUPABASE STORAGE: Não foi possível consultar (permissão restrita via pooler)");
    console.log("");
  }

  await client.end();
}

main().catch((err) => {
  console.error("Erro:", err.message);
  process.exit(1);
});

