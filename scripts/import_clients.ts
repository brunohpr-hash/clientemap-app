import { prisma } from "../lib/prisma";
import fs from "fs";
import path from "path";
import { v4 as uuid } from "uuid";

async function run() {
  try {
    const dataPath = path.join(__dirname, "data.txt");
    console.log(`Lendo arquivo TXT em: ${dataPath}`);
    const text = fs.readFileSync(dataPath, "utf8");
    
    const lines = text.split('\n');
    let clients = [];
    
    console.log("Analisando as linhas do documento...");
    for (const line of lines) {
      if (!line.trim() || line.includes("Nome CNPJ/CPF") || line.includes("Mostrando de") || line.includes("Data Início")) {
          continue;
      }
      
      const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})$/);
      if (!dateMatch) continue; 
      
      const dateStr = dateMatch[1]; 
      const [d, m, y] = dateStr.split('/');
      const dataInicio = new Date(`${y}-${m}-${d}T00:00:00.000Z`);
      
      let rest = line.substring(0, line.length - dateStr.length).trim();
      
      let cmc = null;
      const cmcMatch = rest.match(/ (\d+)$/);
      if (cmcMatch) {
          cmc = cmcMatch[1];
          rest = rest.substring(0, rest.length - cmc.length).trim();
      }
      
      let ie = null;
      const ieMatch = rest.match(/ (ISENTO|\d[\d\.-]+)$/);
      if (ieMatch) {
          ie = ieMatch[1];
          rest = rest.substring(0, rest.length - ie.length).trim();
      }
      
      let cnpj = null;
      const cnpjMatch = rest.match(/ ([\d\.\-\/]+)$/);
      if (cnpjMatch) {
          cnpj = cnpjMatch[1];
          rest = rest.substring(0, rest.length - cnpj.length).trim();
      } else {
          continue;
      }
      
      const nome = rest;
      
      clients.push({
          razaoSocial: nome.substring(0, 300),
          cnpjCpf: cnpj,
          inscricaoEstadual: ie === 'ISENTO' ? null : (ie ? ie.substring(0,50) : null),
          inscricaoMunicipal: cmc ? cmc.substring(0,50) : null,
          dataInicioContabilidade: dataInicio,
          regimeTributario: "simples_nacional",
          status: "active"
      });
    }
    
    console.log(`Foram encontrados ${clients.length} clientes válidos. Gerando arquivo SQL...`);
    
    let sql = `
-- Script de importação em lote de ${clients.length} clientes
-- Gerado automaticamente a partir do PDF

`;

    for (const c of clients) {
       sql += `INSERT INTO clients (id, razao_social, cnpj_cpf, inscricao_estadual, inscricao_municipal, regime_tributario, data_inicio_contabilidade, status, created_at, updated_at) 
VALUES ('${uuid()}', '${c.razaoSocial.replace(/'/g, "''")}', '${c.cnpjCpf}', ${c.inscricaoEstadual ? `'${c.inscricaoEstadual}'` : 'NULL'}, ${c.inscricaoMunicipal ? `'${c.inscricaoMunicipal}'` : 'NULL'}, '${c.regimeTributario}', ${c.dataInicioContabilidade ? `'${c.dataInicioContabilidade.toISOString()}'` : 'NULL'}, '${c.status}', NOW(), NOW())
ON CONFLICT (cnpj_cpf) DO NOTHING;\n`;
    }
    
    const sqlPath = path.join(__dirname, "insert_clients.sql");
    fs.writeFileSync(sqlPath, sql, "utf8");
    
    console.log(`\n--- SUCESSO! Arquivo SQL gerado em: ${sqlPath} ---`);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

run();
