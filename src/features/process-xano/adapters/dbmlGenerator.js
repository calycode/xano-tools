/**
 * Ensures that each table has a primary key column.
 */
function ensurePrimaryKey(jsonSchema) {
   const hasPrimaryKey = jsonSchema.schema.some((column) => column.name === 'id');
   if (!hasPrimaryKey) {
      jsonSchema.schema.unshift({
         name: 'id',
         type: 'int',
         nullable: false,
         default: null,
      });
   }
   return jsonSchema;
}

/**
 * Converts a single table schema to DBML format.
 */
function convertSchemaToDbml(schema) {
   const tableName = schema.name;
   const columns = schema.schema;

   let dbml = `Table ${tableName} {\n`;

   columns.forEach((column) => {
      const columnName = column.name;
      const columnType = column.type;
      const isNullable = column.nullable ? null : 'not null';
      const isPrimaryKey = columnName === 'id' ? 'pk' : null;
      let defaultValue = null;

      if (column.default !== undefined && column.default !== null) {
         if (typeof column.default === 'string') {
            defaultValue = `default: "${column.default}"`;
         } else {
            defaultValue = `default: ${column.default}`;
         }
      }

      let refSetting = null;
      if (column.type === 'obj') {
         const subTableName = `${tableName}_${column.name}`;
         const relationshipType = column.style && column.style.type === 'list' ? '>' : '-';
         refSetting = `ref: ${relationshipType} ${subTableName}.id`;
      }

      const settings = [isNullable, isPrimaryKey, defaultValue, refSetting].filter(
         (setting) => setting !== null
      );
      const columnSettings = settings.length > 0 ? ` [${settings.join(', ')}]` : '';

      dbml += `  ${columnName} ${columnType}${columnSettings}\n`;
   });

   dbml += '}\n';

   return dbml;
}

/**
 * Converts a single table schema to SQL CREATE TABLE statement.
 */
function convertSchemaToSql(schema) {
   const tableName = schema.name;
   const columns = schema.schema;

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
function jsonToDbmlAndSql(jsonSchema) {
   const tables = [];

   function processTable(schema, parentTableName = null) {
      schema = ensurePrimaryKey(schema);

      tables.push({
         name: schema.name,
         dbml: convertSchemaToDbml(schema),
         sql: convertSchemaToSql(schema),
      });

      // Recursively process nested objects to create subtables
      schema.schema.forEach((column) => {
         if (column.type === 'obj') {
            const subTableName = `${schema.name}_${column.name}`;
            const subTableSchema = {
               name: subTableName,
               schema: column.children || [],
            };
            processTable(subTableSchema, schema.name);
         }
      });
   }

   processTable(jsonSchema);

   return tables;
}

/**
 * Returns a pretty string with all DBML and SQL statements.
 */
function allDbmlAndSqlToString(tables) {
   let result = '';
   tables.forEach((table) => {
      result += `\n---\n# Table: ${table.name}\n\n## DBML\n\`\`\`dbml\n${table.dbml}\`\`\`\n`;
      result += `\n## SQL\n\`\`\`sql\n${table.sql}\n\`\`\`\n`;
   });
   return result;
}

// Export both the structured and string versions
export { jsonToDbmlAndSql, allDbmlAndSqlToString };
