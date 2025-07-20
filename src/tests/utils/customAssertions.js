// src/tests/utils/customAssertions.js
import * as assert from 'uvu/assert';

/**
 * Assert that the response status is OK.
 * @param {object} context
 */
function assertResponseStatus(context) {
   const { res, method, path } = context;
   assert.ok(
      res.ok,
      `${method.toUpperCase()}:${path} | ❌ Response was not OK. Status: ${res.status}`
   );
}

/**
 * Assert that the response is defined.
 * @param {object} context
 */
function assertResponseDefined(context) {
   const { result, method, path } = context;
   assert.ok(
      result !== undefined && result !== null,
      `${method.toUpperCase()}:${path} | ❌ Response was undefined.`
   );
}

/**
 * Validate the response schema.
 * @param {object} context
 */
function assertResponseSchema(context) {
   const { isValid, errors = null, method, path } = context;
   assert.ok(
      isValid,
      `${method.toUpperCase()}:${path} | ❌ Response schema was not valid. Validation errors: ${JSON.stringify(
         errors,
         null,
         2
      )}`
   );
}

const availableAsserts = {
   statusOk: assertResponseStatus,
   responseDefined: assertResponseDefined,
   responseSchema: assertResponseSchema,
};

export { availableAsserts, assertResponseStatus, assertResponseDefined, assertResponseSchema };
