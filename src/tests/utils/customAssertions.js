// src/tests/utils/customAssertions.js
import { expect } from 'vitest';

/**
 * Assert that the response status is OK.
 * @param {Response} res - The fetch response object.
 * @param {string} method - The HTTP method.
 * @param {string} path - The API endpoint path.
 */
function assertResponseStatus(context) {
  const { res, method, path } = context;
   expect(
      res.ok,
      `${method.toUpperCase()}:${path} | ❌ Response was not OK. Status: ${res.status}`
   ).toBe(true);
}

/**
 * Assert that the response is defined.
 * @param {any} result - The parsed response body.
 * @param {string} method - The HTTP method.
 * @param {string} path - The API endpoint path.
 */
function assertResponseDefined(context) {
  const { result, method, path } = context;
   expect(result, `${method.toUpperCase()}:${path} | ❌ Response was undefined.`).toBeDefined();
}

/**
 * Validate the response schema.
 * @param {boolean} isValid - The expected JSON schema.
 * @param {Array<string>} errors - The parsed response body.
 * @param {string} method - The HTTP method.
 * @param {string} path - The API endpoint path.
 */
function assertResponseSchema(context) {
  const { isValid, errors = null, method, path } = context
   expect(
      isValid,
      `${method.toUpperCase()}:${path} | ❌ Response schema was not valid. Validation errors: ${JSON.stringify(
         errors,
         null,
         2
      )}`
   ).toBe(true);
}

const availableAsserts = {
   statusOk: assertResponseStatus,
   responseDefined: assertResponseDefined,
   responseSchema: assertResponseSchema,
};

export { availableAsserts, assertResponseStatus, assertResponseDefined, assertResponseSchema };
