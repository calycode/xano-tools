import Ajv2020 from 'ajv/dist/2020.js';
import ajvErrors from 'ajv-errors';

const ajv = new Ajv2020({ allErrors: true, strict: false });
ajvErrors(ajv);

// Use Map with a serialized schema as the key
const validatorCache = new Map();

export function validateSchema(schema, data) {
   // Serialize the schema for caching
   const schemaKey = JSON.stringify(schema);

   let validate = validatorCache.get(schemaKey);
   if (!validate) {
      validate = ajv.compile(schema);
      validatorCache.set(schemaKey, validate);
   }
   const isValid = validate(data);
   return {
      isValid,
      errors: validate.errors,
   };
}
