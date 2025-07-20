import { faker } from '@faker-js/faker';

export function generateMockDataForSchema(schema) {
   if (!schema || typeof schema !== 'object') return null;

   switch (schema.type) {
      case 'object': {
         const obj = {};
         for (const [key, value] of Object.entries(schema.properties || {})) {
            obj[key] = generateMockDataForSchema(value);
         }
         return obj;
      }
      case 'string': {
         if (schema.format === 'email') return faker.internet.email();
         return faker.lorem.word();
      }
      case 'integer': {
         return faker.number.int({ min: 1, max: 1000 });
      }
      case 'number': { // Added support for number type
         return faker.number.float({ min: 0, max: 1000, precision: 0.01 });
      }
      case 'boolean': {
         return faker.datatype.boolean();
      }
      case 'array': {
         return [generateMockDataForSchema(schema.items)];
      }
      default:
         return null;
   }
}
