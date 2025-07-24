// src/lint-xano/XanoLinter.js
import infrastructure from '../../../util-resources/xano_underlying_infrastructure.js';
import { availableRules } from './rules/index.js';
import { ESLint } from 'eslint';
import { isNotEmpty } from './utils/index.js';

// ----- Utilities -----
const eslint = new ESLint({
   overrideConfig: [
      {
         languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'module',
         },
         rules: {
            'no-unused-vars': 'warn',
            'no-console': 'off',
            camelcase: 'warn',
         },
      },
   ],
});

// ----- Linting rule functions -----
async function lintObject(obj, errors, ruleConfig, parentKey = '', parentObj = obj) {
   for (const key in obj) {
      const value = obj[key];

      for (const [ruleName, ruleFn] of Object.entries(availableRules)) {
         const level = ruleConfig[ruleName] || 'off';
         if (level === 'off') continue;

         // Call rule function with appropriate arguments
         let ruleResult = null;
         if (
            ruleName === 'is-camel-case' &&
            key === 'as' &&
            !parentKey.includes('dbo') &&
            isNotEmpty(value)
         ) {
            ruleResult = ruleFn(value, parentKey);
         } else if (ruleName === 'is-valid-verb' && key === 'verb') {
            ruleResult = ruleFn(value, parentObj?.name);
         } else if (ruleName === 'is-description-present' && key === 'description') {
            ruleResult = ruleFn(obj, parentKey);
         }

         // Add rule result to errors array if it exists
         if (ruleResult) {
            errors.push({ ...ruleResult, level });
         }
      }

      // [ ] TODO: Extract to the rules as this is also a rule!
      // Safeguard database queries from failing because of query expressions
      if (
         parentKey.includes('search.expression') &&
         parentKey.includes('statement.left') &&
         key === 'filters' &&
         value.length > 0
      ) {
         errors.push({
            message: `Database query left operand should not have filters in "${obj.index ?? ''} ${
               obj.name
            } ${obj.as ?? ''}".`,
            rule: "DB queries: Don't put filters in left operand",
         });
      }

      // [ ] TODO: Extract to the rules as this is also a rule!
      // Keep the queries clean of commented out code:
      if (key === 'disabled' && value === true) {
         errors.push({
            message: `Disabled logic step found in "${parentObj.name}" as "${obj.index} ${obj.name} ${obj.as}".`,
            rule: 'Good practice: remove commented code',
         });
      }

      // [ ] TODO: Check if eslint rules need to be changed since XANO now uses DENO!
      // Lint JavaScript if it is a 'lambda' function
      if (key === 'value' && parentObj?.name === 'code' && typeof value === 'string') {
         try {
            const results = await eslint.lintText(value);
            results.forEach((result) => {
               result.messages.forEach((msg) => {
                  errors.push({
                     message: `${obj.index ?? ''} ${obj.name} Lint error in code: ${
                        msg.message
                     } (at line ${msg.line}, column ${msg.column})`,
                     rule: 'ESLint: JavaScript Linting',
                  });
               });
            });
         } catch (err) {
            errors.push({
               message: `Error linting JavaScript code: ${err.message}`,
               rule: 'ESLint: JavaScript Linting',
            });
         }
      }

      // Lint Javascript if it is a 'lambda' or 'map' filter:
      if (key === 'name' && (value === 'lambda' || value === 'map')) {
         const code = obj?.arg[0]?.value ?? '';
         if (typeof code === 'string') {
            try {
               const results = await eslint.lintText(code);
               results.forEach((result) => {
                  result.messages.forEach((msg) => {
                     errors.push({
                        message: `${obj.index ?? ''} ${obj.name} Lint error in code: ${
                           msg.message
                        } (at line ${msg.line}, column ${msg.column})`,
                        rule: 'ESLint: JavaScript Linting',
                     });
                  });
               });
            } catch (err) {
               errors.push({
                  message: `Error linting JavaScript code: ${err.message}`,
                  rule: 'ESLint: JavaScript Linting',
               });
            }
         }
      }

      // Recurse if value is an object
      if (typeof value === 'object' && value !== null) {
         if (Array.isArray(value)) {
            for (let index = 0; index < value.length; index++) {
               await lintObject(
                  value[index],
                  errors,
                  ruleConfig,
                  `${parentKey}${key}[${index}].`,
                  obj
               );
            }
         } else {
            await lintObject(value, errors, ruleConfig, `${parentKey}${key}.`, obj);
         }
      }
   }
}

// ----- Linter class -----
class XanoLinter {
   constructor(config, backendLogic) {
      this.ruleConfig = config.rules || {};
      this.backendLogic = backendLogic;
      this.xanoInfrastructure = infrastructure;
   }

   async lint() {
      const errors = [];
      await lintObject(this.backendLogic, errors, this.ruleConfig);
      return errors;
   }
}

export default XanoLinter;
