// src/lint-xano/rules/index.js
import { isNotEmpty } from '../../../utils/index';

const VALID_HEADERS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD']);

function isCamelCase(key, parentKey) {
   if (!/^[a-z][a-zA-Z0-9]*$/.test(key)) {
      return {
         message: `Key "${parentKey}${key}" should be in camelCase.`,
         rule: 'Good practice: camelCase',
      };
   }
   return null;
}

function isValidRouteName(route) {
   if (!/^\/[a-z0-9\-/]*$/.test(route)) {
      return {
         message: `Route name "${route}" does not follow the naming convention.`,
         rule: 'validRouteName',
      };
   }
   return null;
}

function isValidVerb(method, route) {
   if (!VALID_HEADERS.has(method)) {
      return {
         message: `Invalid method "${method}" for endpoint "${route}".`,
         rule: 'Invalid value: Endpoint verb is invalid',
      };
   }
   return null;
}

function isDescriptionPresent(object, parentKey = '') {
   if (!isNotEmpty(object.description) && object.disabled !== true) {
      // Handle the input descriptions separately
      if (parentKey.includes('input')) {
         return {
            message: `Description for input "${object.name}" is missing.`,
            rule: 'Good practice: descriptions',
         };
      }
      return {
         message: `Description for "${object.index ?? ''} ${object.name} ${
            object.as ?? ''
         }" is missing.`,
         rule: 'Good practice: descriptions',
      };
   }
}

const availableRules = {
   'is-camel-case': isCamelCase,
   'is-valid-route-name': isValidRouteName,
   'is-valid-verb': isValidVerb,
   'is-description-present': isDescriptionPresent,
};

export { availableRules };
