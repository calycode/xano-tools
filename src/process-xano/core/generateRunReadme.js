import infrastructure from '../../../util-resources/xano_underlying_infrastructure.js';
import { xanoQueryToSql } from '../adapters/xanoQueryToSql.js';

/**
 * Recursively generates a description of the query logic.
 * @param {Array} runList - The list of methods that run during the query.
 * @param {number} level - The current recursion level (used for indentation).
 * @param {object} functionMapping - A mapping of function IDs to their paths.
 * @param {object} dboMapping - A mapping of dbo IDs to their paths.
 * @returns {string} - The generated description of the query logic.
 */
function generateQueryLogicDescription(runList, level = 0, functionMapping = {}, dboMapping = {}) {
   if (!runList || !Array.isArray(runList)) {
      return '';
   }

   let description = '';
   const indent = '  '.repeat(level);

   runList.forEach((method) => {
      if (method.disabled) {
         // Skip disabled methods
         return '';
      }

      let functionLink = '';
      if (method.context && method.context.function && method.context.function.id) {
         const functionId = method.context.function.id;
         if (functionMapping[functionId]) {
            const functionName = functionMapping[functionId].name;
            const functionPath = `/repo/function/${functionName.replace(/\//g, '_')}/`;
            functionLink = `**[${functionName}](${functionPath})**`;
         }
      }

      let dboLink = '';
      if (method.context && method.context.dbo && method.context.dbo.id) {
         const dboId = method.context.dbo.id;
         if (dboMapping[dboId]) {
            const dboName = dboMapping[dboId].name;
            const dboPath = `/repo/dbo/${dboName.replace(/\//g, '_')}/`;
            dboLink = `**[${dboName}](${dboPath})**`;
         }
      }

      // Use the display name instead of Xano's mvp:method syntax.
      const usedXanoMethod = infrastructure.statement.find(statement => statement.name === method.name);
      description += `${indent}- **${
         usedXanoMethod ? usedXanoMethod.display : method.name
      }** ${functionLink} ${dboLink}\n`;
      description += `${indent}  *Description*: ${method.description || '//....'}\n\n`;

      // if dbo_view then we can also say what's the type single or list or stream or... etc
      let returnedValueKind = '';
      if (method.context && method.context.dbo && method.name.includes('dbo_view')) {
         returnedValueKind = method.context?.return?.type ?? '';
      }

      // Add return variable information if 'method.as' is not empty
      if (method.as && method.as.trim() !== '') {
         description += `${indent}  *Returns value as*: _**${method.as}**_ ${returnedValueKind}\n\n`;
      }

      // If method is dbo and has a search expression then convert it to SQL
      if (
         method.context &&
         method.context.dbo &&
         method.context.dbo.id &&
         (method.context.search?.expression?.length ?? 0) > 0
      ) {
         description += `${indent}  *SQL sentence*: \n\n${indent}  \`\`\`\n${indent}  ${xanoQueryToSql(
            method.context.search.expression
         )}\n${indent}  \`\`\`\n\n`;
      }

      // Check for nested run keys in the context
      if (method.context) {
         // Check run key in the context
         if (method.context.run && Array.isArray(method.context.run)) {
            description += generateQueryLogicDescription(
               method.context.run,
               level + 1,
               functionMapping,
               dboMapping
            );
         }
         // Check for nested run keys in the context
         for (const key in method.context) {
            if (method.context[key] && Array.isArray(method.context[key].run)) {
               description += generateQueryLogicDescription(
                  method.context[key].run,
                  level + 1,
                  functionMapping,
                  dboMapping
               );
            }
         }
      }

      // Check for nested run keys directly in the method
      if (method.run && Array.isArray(method.run)) {
         description += generateQueryLogicDescription(
            method.run,
            level + 1,
            functionMapping,
            dboMapping
         );
      }
   });

   return description;
}

export { generateQueryLogicDescription };
