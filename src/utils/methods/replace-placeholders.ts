// src/tests/utils/replacePlaceholders.js

const replacePlaceholders = (template, replacements) => {
   if (typeof template === 'string') {
      return template.replace(/\{([^}]+)\}/g, (_, key) => {
         // Support case-insensitive keys in replacements
         const foundKey = Object.keys(replacements).find(
            (k) => k.toLowerCase() === key.toLowerCase()
         );
         return foundKey ? replacements[foundKey] : '';
      });
   }
   if (Array.isArray(template)) {
      return template.map((item) => replacePlaceholders(item, replacements));
   }
   if (typeof template === 'object' && template !== null) {
      return Object.fromEntries(
         Object.entries(template).map(([key, value]) => [key, replacePlaceholders(value, replacements)])
      );
   }
   return template;
};

export { replacePlaceholders };
