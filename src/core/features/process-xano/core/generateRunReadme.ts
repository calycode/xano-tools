import { xanoQueryToSql } from '../adapters/xanoQueryToSql';
import { statementsMap } from '../../../utils';

function getMethodType(method) {
   if (method.name === 'mvp:function' && method.context?.function?.id) return 'function';
   if (method.context?.dbo?.id) return 'dbo';
   return 'general';
}

function getMethodDescription(method, type, functionMapping, dboMapping) {
   if (type === 'function' && method.context?.function?.id) {
      return functionMapping[method.context.function.id]?.description || '//...';
   }
   if (type === 'dbo' && method.context?.dbo?.id) {
      return dboMapping[method.context.dbo.id]?.description || '//...';
   }
   return method.description || '//...';
}

function getFunctionLink(method, functionMapping) {
   const functionId = method.context?.function?.id;
   if (functionId && functionMapping[functionId]) {
      const functionName = functionMapping[functionId].name;
      const functionPath = `/repo/function/${functionName.replace(/\//g, '_')}/`;
      return `**[${functionName}](${functionPath})**`;
   }
   return '';
}

function getDboLink(method, dboMapping) {
   const dboId = method.context?.dbo?.id;
   if (dboId && dboMapping[dboId]) {
      const dboName = dboMapping[dboId].name;
      const dboPath = `/repo/dbo/${dboName.replace(/\//g, '_')}/`;
      return `**[${dboName}](${dboPath})**`;
   }
   return '';
}

function getReturnedValueKind(method) {
   if (method.context?.dbo && method.name.includes('dbo_view')) {
      const kind = method.context?.return?.type;
      return kind ? `**${kind.toUpperCase()}**` : '';
   }
   return '';
}

function getSqlSentence(method) {
   if (
      method.context?.dbo?.id &&
      method.context?.search?.expression &&
      method.context.search.expression.length > 0
   ) {
      return `  *SQL sentence*: \n\n  \`\`\`\n  ${xanoQueryToSql(
         method.context.search.expression
      )}\n  \`\`\`\n\n`;
   }
   return '';
}

function generateQueryLogicDescription(
   runList: any[],
   level = 0,
   functionMapping: Record<string, any> = {},
   dboMapping: Record<string, any> = {}
): string {
   if (!Array.isArray(runList)) return '';

   const indent = '  '.repeat(level);
   let description = '';

   for (const method of runList) {
      if (method.disabled) continue;

      const methodType = getMethodType(method);
      const methodDescription = getMethodDescription(
         method,
         methodType,
         functionMapping,
         dboMapping
      );

      // Display name
      const usedXanoMethod = statementsMap.get(method.name);
      const displayName = usedXanoMethod ? usedXanoMethod.display : method.name;

      // Links
      const functionLink = getFunctionLink(method, functionMapping);
      const dboLink = getDboLink(method, dboMapping);

      // Compose
      description += `${indent}- **${displayName}** ${functionLink} ${dboLink}\n`;
      description += `${indent}  *Description*: ${methodDescription}\n\n`;

      // Return variable
      if (method.as && method.as.trim() !== '') {
         description += `${indent}  *Returns value as*: _**${method.as}**_ ${getReturnedValueKind(
            method
         )}\n\n`;
      }

      // SQL
      description += getSqlSentence(method);

      // Recursively process nested runs (context.run, context[any].run, method.run)
      const nestedRuns: any[][] = [];

      if (method.context?.run && Array.isArray(method.context.run))
         nestedRuns.push(method.context.run);

      if (method.context) {
         for (const key in method.context) {
            if (Array.isArray(method.context[key]?.run)) nestedRuns.push(method.context[key].run);
         }
      }

      if (Array.isArray(method.run)) nestedRuns.push(method.run);

      for (const nestedRun of nestedRuns) {
         description += generateQueryLogicDescription(
            nestedRun,
            level + 1,
            functionMapping,
            dboMapping
         );
      }
   }

   return description;
}

export { generateQueryLogicDescription };
