// src/lint-xano/utils/index.js
function getNestedProperty(obj, path) {
   return path.split('.').reduce((acc, part) => {
      if (!acc) return undefined;
      const arrayMatch = part.match(/(\w+)\[(\d+)\]/);
      if (arrayMatch) {
         const [, arrayKey, index] = arrayMatch;
         return acc[arrayKey] ? acc[arrayKey][index] : undefined;
      }
      return acc[part];
   }, obj);
}

function isNotEmpty(value) {
   return value !== null && value !== undefined && value !== '';
}



export {
   getNestedProperty,
   isNotEmpty,
};
