import * as assert from 'uvu/assert';
import { AssertDefinition } from '@repo/types';

/**
 * Assert that the response status is OK.
 */
function assertResponseStatus(context) {
   const { requestOutcome, method, path } = context;
   if (!requestOutcome.ok) {
      throw new assert.Assertion({
         actual: requestOutcome.status,
         expects: 200,
         operator: 'statusOk',
         message: `${method.toUpperCase()}:${path} | ❌ Response status was ${
            requestOutcome.status
         } (expected 200)`,
         details: '', // You could add more details or a diff here if you want
      });
   }
}

/**
 * Assert that the response is defined.
 */
function assertResponseDefined(context) {
   const { result, method, path } = context;
   if (result === undefined || result === null) {
      throw new assert.Assertion({
         actual: result,
         expects: 'defined',
         operator: 'responseDefined',
         message: `${method.toUpperCase()}:${path} | ❌ Response was undefined.`,
      });
   }
}

/**
 * Validate the response schema.
 */
function assertResponseSchema(context) {
   const { isValid, errors = null, method, path } = context;
   if (!isValid) {
      throw new assert.Assertion({
         actual: isValid,
         expects: true,
         operator: 'responseSchema',
         message: `${method.toUpperCase()}:${path} | ❌ Response schema was not valid.`,
         details: `Validation errors: ${JSON.stringify(errors, null, 2)}`,
      });
   }
}

// The map: keys are assertion names
const availableAsserts: AssertDefinition = {
   statusOk: {
      fn: assertResponseStatus,
      level: 'error',
   },
   responseDefined: {
      fn: assertResponseDefined,
      level: 'warn',
   },
   responseSchema: {
      fn: assertResponseSchema,
      level: 'off',
   },
};

export { availableAsserts };
