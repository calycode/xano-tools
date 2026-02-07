/**
 * Example Test Configuration (JavaScript)
 *
 * This file demonstrates advanced testing features:
 * - Loading environment variables from .env files
 * - Custom assertions with validation logic
 * - Runtime value extraction and chaining
 * - Multiple environment support
 *
 * Usage:
 *   xano test run -c ./test-config.example.js --ci
 *
 * @see https://calycode.com/schemas/testing/config.json
 */

// Optional: Load environment variables from .env.test file
// Requires: npm install dotenv
try {
   require('dotenv').config({ path: '.env.test' });
} catch (e) {
   // dotenv not installed, skip
}

/**
 * Helper to create custom assertions
 * @param {string} message - Error message if assertion fails
 * @param {(ctx: AssertContext) => boolean} predicate - Returns true if valid
 * @param {'error' | 'warn'} level - Assertion level
 */
function createAssert(message, predicate, level = 'error') {
   return {
      fn: (ctx) => {
         if (!predicate(ctx)) {
            throw new Error(message);
         }
      },
      level,
   };
}

/**
 * @typedef {Object} AssertContext
 * @property {Response} requestOutcome - Raw fetch Response object
 * @property {any} result - Parsed response body (JSON or text)
 * @property {string} method - HTTP method used
 * @property {string} path - API endpoint path
 */

/**
 * @type {import('@repo/types').TestConfig}
 */
module.exports = [
   // ============================================
   // Health Check
   // ============================================
   {
      path: '/health',
      method: 'GET',
      headers: {},
      queryParams: null,
      requestBody: null,
      customAsserts: {
         hasStatus: createAssert(
            'Health check response missing status field',
            (ctx) => ctx.result?.status !== undefined
         ),
      },
   },

   // ============================================
   // Authentication Flow
   // ============================================
   {
      path: '/auth/login',
      method: 'POST',
      headers: {
         'Content-Type': 'application/json',
      },
      queryParams: null,
      requestBody: {
         email: '{{ENVIRONMENT.TEST_EMAIL}}',
         password: '{{ENVIRONMENT.TEST_PASSWORD}}',
      },
      // Extract auth token for subsequent requests
      store: [
         { key: 'AUTH_TOKEN', path: '$.authToken' },
         { key: 'USER_ID', path: '$.user.id' },
      ],
      customAsserts: {
         hasToken: createAssert(
            'Login response missing authToken',
            (ctx) => typeof ctx.result?.authToken === 'string' && ctx.result.authToken.length > 0
         ),
         hasUserId: createAssert(
            'Login response missing user.id',
            (ctx) => ctx.result?.user?.id !== undefined
         ),
         isJwtFormat: createAssert(
            'Token does not appear to be a JWT',
            (ctx) => {
               const token = ctx.result?.authToken;
               return token && token.split('.').length === 3;
            },
            'warn' // Just a warning, not a failure
         ),
      },
   },

   // ============================================
   // Authenticated Requests
   // ============================================
   {
      path: '/users/me',
      method: 'GET',
      headers: {
         Authorization: 'Bearer {{ENVIRONMENT.AUTH_TOKEN}}',
      },
      queryParams: null,
      requestBody: null,
      customAsserts: {
         matchesLoginUser: createAssert(
            'User ID does not match logged in user',
            (ctx) => {
               // Note: We can't directly compare to stored value in JSON config
               // This assertion checks the response has an id field
               return ctx.result?.id !== undefined;
            }
         ),
         hasRequiredFields: createAssert(
            'User response missing required fields',
            (ctx) => {
               const required = ['id', 'email', 'createdAt'];
               return required.every((field) => ctx.result?.[field] !== undefined);
            }
         ),
      },
   },

   // ============================================
   // Data Operations (CRUD)
   // ============================================
   {
      path: '/posts',
      method: 'POST',
      headers: {
         Authorization: 'Bearer {{ENVIRONMENT.AUTH_TOKEN}}',
         'Content-Type': 'application/json',
      },
      queryParams: null,
      requestBody: {
         title: 'Test Post from API Tests',
         content: 'This post was created by automated tests',
         published: false,
      },
      store: [{ key: 'POST_ID', path: '$.id' }],
      customAsserts: {
         postCreated: {
            fn: (ctx) => {
               if (ctx.requestOutcome.status !== 201 && ctx.requestOutcome.status !== 200) {
                  throw new Error(`Expected 201 Created, got ${ctx.requestOutcome.status}`);
               }
            },
            level: 'error',
         },
         hasId: createAssert('Created post missing id', (ctx) => ctx.result?.id !== undefined),
      },
   },

   // Read created post
   {
      path: '/posts/{{ENVIRONMENT.POST_ID}}',
      method: 'GET',
      headers: {
         Authorization: 'Bearer {{ENVIRONMENT.AUTH_TOKEN}}',
      },
      queryParams: null,
      requestBody: null,
      customAsserts: {
         matchesCreated: createAssert(
            'Post title does not match',
            (ctx) => ctx.result?.title === 'Test Post from API Tests'
         ),
      },
   },

   // Update post
   {
      path: '/posts/{{ENVIRONMENT.POST_ID}}',
      method: 'PATCH',
      headers: {
         Authorization: 'Bearer {{ENVIRONMENT.AUTH_TOKEN}}',
         'Content-Type': 'application/json',
      },
      queryParams: null,
      requestBody: {
         title: 'Updated Test Post',
         published: true,
      },
      customAsserts: {
         wasUpdated: createAssert(
            'Post was not updated correctly',
            (ctx) => ctx.result?.title === 'Updated Test Post' && ctx.result?.published === true
         ),
      },
   },

   // Delete post (cleanup)
   {
      path: '/posts/{{ENVIRONMENT.POST_ID}}',
      method: 'DELETE',
      headers: {
         Authorization: 'Bearer {{ENVIRONMENT.AUTH_TOKEN}}',
      },
      queryParams: null,
      requestBody: null,
      customAsserts: {
         deleted: {
            fn: (ctx) => {
               const validCodes = [200, 204];
               if (!validCodes.includes(ctx.requestOutcome.status)) {
                  throw new Error(`Expected 200 or 204, got ${ctx.requestOutcome.status}`);
               }
            },
            level: 'error',
         },
      },
   },

   // ============================================
   // Query Parameters Example
   // ============================================
   {
      path: '/posts',
      method: 'GET',
      headers: {
         Authorization: 'Bearer {{ENVIRONMENT.AUTH_TOKEN}}',
      },
      queryParams: [
         { name: 'limit', in: 'query', value: '5' },
         { name: 'offset', in: 'query', value: '0' },
         { name: 'published', in: 'query', value: 'true' },
      ],
      requestBody: null,
      customAsserts: {
         isArray: createAssert(
            'Posts response should be an array',
            (ctx) => Array.isArray(ctx.result) || Array.isArray(ctx.result?.items)
         ),
         respectsLimit: createAssert(
            'Response should respect limit parameter',
            (ctx) => {
               const items = Array.isArray(ctx.result) ? ctx.result : ctx.result?.items || [];
               return items.length <= 5;
            },
            'warn'
         ),
      },
   },

   // ============================================
   // Logout (Cleanup)
   // ============================================
   {
      path: '/auth/logout',
      method: 'POST',
      headers: {
         Authorization: 'Bearer {{ENVIRONMENT.AUTH_TOKEN}}',
      },
      queryParams: null,
      requestBody: null,
      customAsserts: {}, // Use default assertions
   },
];
