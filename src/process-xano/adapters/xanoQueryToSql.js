// Function to convert JSON expression to pseudo SQL
function convertExpressionToSQL(expression) {
   if (!expression || !Array.isArray(expression)) {
      return '';
   }

   return expression
      .map((exp) => {
         const { or, type, statement, group } = exp;
         if (type === 'statement' && statement) {
            const { op, left, right } = statement;
            const leftOperand = convertOperandToSQL(left);
            const rightOperand = convertOperandToSQL(right);
            const operator = convertOperatorToSQL(op);
            const condition = `${leftOperand} ${operator} ${rightOperand}`;
            return or ? `OR ${condition}` : `AND ${condition}`;
         } else if (type === 'group' && group) {
            const groupCondition = convertExpressionToSQL(group.expression);
            return or ? `OR (${groupCondition})` : `AND (${groupCondition})`;
         }
         return '';
      })
      .join(' ')
      .replace(/^(AND|OR)\s/, ''); // Remove leading AND/OR
}

// Function to convert operand to SQL
function convertOperandToSQL(operand) {
   if (!operand) {
      return '';
   }

   const { tag, operand: value } = operand;
   switch (tag) {
      case 'col':
         return value;
      case 'input':
         return `:${value}`;
      case 'const:epochms':
         return 'CURRENT_TIMESTAMP';
      default:
         return value;
   }
}

// Function to convert operator to SQL
function convertOperatorToSQL(op) {
   switch (op) {
      case '=':
         return '=';
      case '>':
         return '>';
      case '<':
         return '<';
      case '>=':
         return '>=';
      case '<=':
         return '<=';
      case '!=':
         return '!=';
      default:
         return op;
   }
}

// Main function to convert a search expression to pseudo SQL
function xanoQueryToSql(searchExpression) {
   return convertExpressionToSQL(searchExpression);
}

export { xanoQueryToSql };
