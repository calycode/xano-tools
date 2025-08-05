// src/utils/pathPlaceholders.js
export function resolvePathTemplate(template, params = {}) {
   return template.replace(/{([^}]+)}/g, (_, key) =>
      params[key] !== undefined ? params[key] : `{${key}}`
   );
}
