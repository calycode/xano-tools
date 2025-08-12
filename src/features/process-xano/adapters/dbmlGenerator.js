function splitTableDefinition(tableDefinition) {
   const tableName = tableDefinition.name;
   const columns = tableDefinition.schema;

   return { tableName, columns };
}

/**
 * Ensures that each table has a primary key column.
 */
function ensurePrimaryKey(tableDefinition) {
   const hasPrimaryKey = tableDefinition.schema.some((column) => column.name === 'id');
   if (!hasPrimaryKey) {
      tableDefinition.schema.unshift({
         name: 'id',
         type: 'int',
         nullable: false,
         default: null,
      });
   }
   return tableDefinition;
}

/**
 * Converts a single table schema to DBML format.
 */
function convertSchemaToDbml(tableDefinition) {
   const { tableName, columns } = splitTableDefinition(tableDefinition);

   let dbml = `Table ${tableName} {\n`;

   columns.forEach((column) => {
      const columnName = column.name;
      const columnType = column.type;
      const isNullable = column.nullable ? null : 'not null';
      const isPrimaryKey = columnName === 'id' ? 'pk' : null;

      // Set up default values for the table columns
      let defaultValue = null;
      if (column.default !== undefined && column.default !== null) {
         if (typeof column.default === 'string') {
            defaultValue = `default: "${column.default}"`;
         } else {
            defaultValue = `default: ${column.default}`;
         }
      }

      // Set up internal subrefernces references for the table columns
      let refSetting = null;
      if (column.type === 'obj') {
         const subTableName = `${tableName}_${column.name}`;
         const relationshipType = column.style && column.style.type === 'list' ? '>' : '-';
         refSetting = `ref: ${relationshipType} ${subTableName}.id`;
      }

      // Combine nullability, key-information, defaultvalue and references into a single setting
      const settings = [isNullable, isPrimaryKey, defaultValue, refSetting].filter(
         (setting) => setting !== null
      );
      const columnSettings = settings.length > 0 ? `[(${settings.join(', ')})]` : '';

      dbml += `  ${columnName} ${columnType} ${columnSettings}\n`;
   });

   dbml += '}\n';

   return dbml;
}

/**
 * Converts a single table schema to SQL CREATE TABLE statement.
 */
function convertSchemaToSql(tableDefinition) {
   const { tableName, columns } = splitTableDefinition(tableDefinition);

   const sqlColumns = columns.map((column) => {
      let sqlType;
      // Simple type mapping, expand as needed
      switch (column.type) {
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
            sqlType = 'INTEGER'; // Foreign key reference
            break;
         default:
            sqlType = column.type.toUpperCase();
      }

      const nullable = column.nullable ? '' : 'NOT NULL';
      const primaryKey = column.name === 'id' ? 'PRIMARY KEY' : '';

      let defaultValue = '';
      if (column.default !== undefined && column.default !== null) {
         if (typeof column.default === 'string') {
            defaultValue = `DEFAULT '${column.default}'`;
         } else {
            defaultValue = `DEFAULT ${column.default}`;
         }
      }

      return [column.name, sqlType, nullable, primaryKey, defaultValue].filter(Boolean).join(' ');
   });

   let sql = `CREATE TABLE ${tableName} (\n  ${sqlColumns.join(',\n  ')}\n);`;

   return sql;
}

/**
 * Converts a JSON schema to both DBML and SQL.
 * Returns an array of { name, dbml, sql } for each table.
 */
function jsonToDbmlAndSql(tableDefinition) {
   const tables = [];

   function processTable(tableDefinition) {
      tableDefinition = ensurePrimaryKey(tableDefinition);

      tables.push({
         name: tableDefinition.name,
         dbml: convertSchemaToDbml(tableDefinition),
         sql: convertSchemaToSql(tableDefinition),
      });

      // Recursively process nested objects to create subtables
      tableDefinition.schema.forEach((column) => {
         if (column.type === 'obj') {
            const subTableName = `${tableDefinition.name}_${column.name}`;
            const subTableDefinition = {
               name: subTableName,
               schema: column.children || [],
            };
            processTable(subTableDefinition);
         }
      });
   }

   processTable(tableDefinition);

   return tables;
}

/**
 * Returns a pretty string with all DBML and SQL statements.
 */
function convertXanoDBDescription(tableDefinition) {
   const tables = jsonToDbmlAndSql(tableDefinition);

   let result = '';

   tables.forEach((table) => {
      result += `
---

# Table: ${table.name}

## DBML

\`\`\`dbml
${table.dbml}
\`\`\`
                 `;
      result += `

## SQL
\`\`\`sql
${table.sql}
\`\`\`
                `;
   });

   return result;
}

// Export both the structured and string versions
export { convertXanoDBDescription };
