export default {
  origin: [
    'https://credcars.com.ng',
    'https://app.credcars.com.ng',
    'https://devapp.credcars.com.ng',
    /http:\/\/localhost:[1-9]+/,
    /http:\/\/127.0.0.1:[1-9]+/,
    /http:\/\/[0-255].[0-255].[0-255].[0-255]:[0-6000]+/,
    /http(s)?:\/\/credcars\.com\.ng/,
    /http(s)?:\/\/app\.credcars\.com\.ng/,
    /http(s)?:\/\/devapp\.credcars\.com\.ng/,
  ],
  allowedHeaders:
    'Content-Type, Accept, Access-Control-Allow-Origin, Authorization',
};
