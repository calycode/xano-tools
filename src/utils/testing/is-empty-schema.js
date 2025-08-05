function isEmptySchema(schema) {
   if (!schema) return true;
   // If it's an array and empty
   if (Array.isArray(schema) && schema.length === 0) return true;
   // If it's an object and has no keys (or only type/description)
   if (typeof schema === 'object') {
      // If no properties/items and only type/description
      const keys = Object.keys(schema).filter((k) => !['type', 'description'].includes(k));
      if (keys.length === 0) return true;
      // If it has properties, but properties is empty
      if (schema.properties && Object.keys(schema.properties).length === 0) return true;
      // If it has items, but items is empty
      if (schema.items && isEmptySchema(schema.items)) return true;
   }
   return false;
}

export { isEmptySchema };