export default {
  origin: [
    'https://credcars.com.ng',
    'https://app.credcars.com.ng',
    'https://devapp.credcars.com.ng',
    // Development origins - only allow localhost with common ports
    /http:\/\/localhost:(3000|3001|8080|5173|5174|4200)/,
    /http:\/\/127\.0\.0\.1:(3000|3001|8080|5173|5174|4200)/,
    // Production patterns - more strict
    /https:\/\/credcars\.com\.ng(\/.*)?$/,
    /https:\/\/app\.credcars\.com\.ng(\/.*)?$/,
    /https:\/\/devapp\.credcars\.com\.ng(\/.*)?$/,
  ],
  allowedHeaders:
    'Content-Type, Accept, Access-Control-Allow-Origin, Authorization, X-Requested-With',
};
