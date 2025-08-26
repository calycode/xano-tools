// src/cli/features/process-xano/adapters/xanoQueryToSql.js

// Converts a JSON-based query expression into pseudo-SQL WHERE clause.
function xanoQueryToSql(expression) {
   return convertExpressionToSQL(expression);
}

function convertExpressionToSQL(expression) {
   if (!Array.isArray(expression)) return '';

   return expression
      .map((exp) => {
         if (exp.type === 'statement' && exp.statement) {
            const { op, left, right } = exp.statement;
            const leftOperand = convertOperandToSQL(left);
            const rightOperand = convertOperandToSQL(right);
            const operator = convertOperatorToSQL(op);
            const condition = `${leftOperand} ${operator} ${rightOperand}`;
            return (exp.or ? 'OR ' : 'AND ') + condition;
         }
         if (exp.type === 'group' && exp.group) {
            const groupCondition = convertExpressionToSQL(exp.group.expression);
            return (exp.or ? 'OR ' : 'AND ') + `(${groupCondition})`;
         }
         return '';
      })
      .join(' ')
      .replace(/^(AND|OR)\s/, ''); // Remove leading AND/OR
}

function convertOperandToSQL(operand) {
   if (!operand) return '';
   const { tag, operand: value } = operand;
   if (tag === 'col') return value;
   if (tag === 'input') return `:${value}`;
   if (tag === 'const:epochms') return 'CURRENT_TIMESTAMP';
   return value;
}

function convertOperatorToSQL(op) {
   switch (op) {
      case '=':
      case '>':
      case '<':
      case '>=':
      case '<=':
      case '!=':
         return op;
      default:
         return op;
   }
}

export { xanoQueryToSql };
