// src/cli/features/process-xano/adapters/dbmlGenerator.js

function splitTableDefinition(tableDef) {
   return { tableName: tableDef.name, columns: tableDef.schema };
}

function ensurePrimaryKey(tableDef) {
   if (!tableDef.schema.some((col) => col.name === 'id')) {
      tableDef.schema.unshift({
         name: 'id',
         type: 'int',
         nullable: false,
         default: null,
      });
   }
   return tableDef;
}

function convertSchemaToDbml(tableDef) {
   const { tableName, columns } = splitTableDefinition(tableDef);
   let dbml = `Table ${tableName} {\n`;
   for (const column of columns) {
      const { name, type, nullable, default: def, style, children } = column;
      const isPrimaryKey = name === 'id' ? 'pk' : null;
      const isNullable = nullable ? null : 'not null';
      let defaultValue =
         def !== undefined && def !== null
            ? typeof def === 'string'
               ? `default: "${def}"`
               : `default: ${def}`
            : null;
      let refSetting = null;
      if (type === 'obj') {
         const subTable = `${tableName}_${name}`;
         const relType = style && style.type === 'list' ? '>' : '-';
         refSetting = `ref: ${relType} ${subTable}.id`;
      }
      const settings = [isNullable, isPrimaryKey, defaultValue, refSetting].filter(Boolean);
      const settingsStr = settings.length ? ` [${settings.join(', ')}]` : '';
      dbml += `  ${name} ${type}${settingsStr}\n`;
   }
   dbml += '}\n';
   return dbml;
}

function convertSchemaToSql(tableDef) {
   const { tableName, columns } = splitTableDefinition(tableDef);
   const sqlCols = columns.map((col) => {
      let sqlType;
      switch (col.type) {
         case 'int':
            sqlType = 'INTEGER';
            break;
         case 'string':
            sqlType = 'VARCHAR(255)';
            break;
         case 'bool':
            sqlType = 'BOOLEAN';
            break;
         case 'float':
            sqlType = 'FLOAT';
            break;
         case 'obj':
            sqlType = 'INTEGER';
            break; // Foreign key
         default:
            sqlType = col.type.toUpperCase();
      }
      const nullable = col.nullable ? '' : 'NOT NULL';
      const primaryKey = col.name === 'id' ? 'PRIMARY KEY' : '';
      let defaultValue = '';
      if (col.default !== undefined && col.default !== null) {
         defaultValue =
            typeof col.default === 'string' ? `DEFAULT '${col.default}'` : `DEFAULT ${col.default}`;
      }
      return [col.name, sqlType, nullable, primaryKey, defaultValue].filter(Boolean).join(' ');
   });
   return `CREATE TABLE ${tableName} (\n  ${sqlCols.join(',\n  ')}\n);`;
}

function jsonToDbmlAndSql(tableDef) {
   const tables = [];
   function processTable(td) {
      ensurePrimaryKey(td);
      tables.push({
         name: td.name,
         dbml: convertSchemaToDbml(td),
         sql: convertSchemaToSql(td),
      });
      // Recursively process nested objects as subtables
      for (const col of td.schema) {
         if (col.type === 'obj') {
            processTable({
               name: `${td.name}_${col.name}`,
               schema: col.children || [],
            });
         }
      }
   }
   processTable(tableDef);
   return tables;
}

function convertXanoDBDescription(tableDef) {
   const tables = jsonToDbmlAndSql(tableDef);
   return tables
      .map(
         (table) =>
            `
---

# Table: ${table.name}

## DBML

\`\`\`dbml
${table.dbml}\`\`\`

## SQL

\`\`\`sql
${table.sql}\`\`\`
    `
      )
      .join('\n');
}

export { convertXanoDBDescription };
