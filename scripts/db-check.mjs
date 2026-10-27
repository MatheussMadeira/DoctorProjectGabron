// Confere a conexão com o banco e lista as tabelas. Uso: node --env-file=.env.local scripts/db-check.mjs
import { Pool } from "@neondatabase/serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const info = await pool.query("select current_database() as banco, current_user as usuario, split_part(version(), ' ', 2) as versao");
console.log(info.rows[0]);
const tabelas = await pool.query("select table_schema, table_name from information_schema.tables where table_schema not in ('pg_catalog','information_schema') order by 1, 2");
console.log(tabelas.rows.length ? tabelas.rows : "sem tabelas (banco vazio)");
await pool.end();
