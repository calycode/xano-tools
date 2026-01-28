require('dotenv').config();

module.exports = [
   {
      path: '/users',
      method: 'GET',
      headers: {
         'Authorization': `Bearer ${process.env.API_TOKEN || 'default-token'}`,
         'X-Custom-Header': process.env.CUSTOM_HEADER || 'default-value',
      },
      queryParams: [
         {
            name: 'limit',
            value: process.env.QUERY_LIMIT || '10',
         },
      ],
      requestBody: null,
      store: [
         {
            key: 'userId',
            path: '$.data[0].id',
         },
      ],
      customAsserts: {},
   },
   {
      path: '/users/{{ENVIRONMENT.userId}}',
      method: 'GET',
      headers: {
         'Authorization': `Bearer ${process.env.API_TOKEN || 'default-token'}`,
      },
      queryParams: [],
      requestBody: null,
      store: [],
      customAsserts: {},
   },
];