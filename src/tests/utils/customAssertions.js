import { expect } from 'vitest';

/**
 * Assert that the response status is OK.
 * @param {Response} res - The fetch response object.
 * @param {string} method - The HTTP method.
 * @param {string} path - The API endpoint path.
 */
export function assertResponseStatus(res, method, path) {
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
export function assertResponseDefined(result, method, path) {
  expect(
    result,
    `${method.toUpperCase()}:${path} | ❌ Response was undefined.`
  ).toBeDefined();
}

/**
 * Validate the response schema.
 * @param {boolean} isValid - The expected JSON schema.
 * @param {Array<string>} errors - The parsed response body.
 * @param {string} method - The HTTP method.
 * @param {string} path - The API endpoint path.
 */
export function assertResponseSchema(isValid, errors = null, method, path) {
  expect(
    isValid,
    `${method.toUpperCase()}:${path} | ❌ Response schema was not valid. Validation errors: ${JSON.stringify(
      errors, null, 2
    )}`
  ).toBe(true);
}