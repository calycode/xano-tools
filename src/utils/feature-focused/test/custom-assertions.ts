import * as assert from 'uvu/assert';

// [ ] CORE

/**
 * Assert that the response status is OK.
 */
function assertResponseStatus(context) {
   const { res, method, path } = context;
   if (!res.ok) {
      throw new assert.Assertion({
         actual: res.status,
         expects: 200,
         operator: 'statusOk',
         message: `${method.toUpperCase()}:${path} | ❌ Response status was ${
            res.status
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

const availableAsserts = {
   statusOk: assertResponseStatus,
   responseDefined: assertResponseDefined,
   responseSchema: assertResponseSchema,
};

export { availableAsserts };
