// src/tests/utils/replacePlaceholders.js
const replacePlaceholders = (obj, replacements) => {
   if (typeof obj === 'string') {
      return obj.replace(/{{ENVIRONMENT\.([A-Z0-9_]+)}}/g, (_, key) => replacements[key] || '');
   }
   if (Array.isArray(obj)) {
      return obj.map((item) => replacePlaceholders(item, replacements));
   }
   if (typeof obj === 'object' && obj !== null) {
      return Object.fromEntries(
         Object.entries(obj).map(([key, value]) => [key, replacePlaceholders(value, replacements)])
      );
   }
   return obj;
};

export { replacePlaceholders };