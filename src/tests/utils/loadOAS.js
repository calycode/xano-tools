// src/tests/utils/loadOAS.js
import Swagger from 'swagger-client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_SPEC_TOKEN = process.env.API_SPEC_TOKEN;

export async function loadOAS() {
   const client = await Swagger(
      `https://you-xano-instance.xano.io/api:{api_group}?token=${API_SPEC_TOKEN}&type=json`
   );
   return client.spec;
}
