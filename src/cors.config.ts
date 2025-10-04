export default {
  origin: [
    'https://credcars.com.ng',
    /http:\/\/localhost:[1-9]+/,
    /http:\/\/127.0.0.1:[1-9]+/,
    /http(s)?:\/\/credcars\.com\.ng/,
    // /\.bento-developers.vercel.app/,
    // /bento-people-ui.vercel.app/,
  ],
  allowedHeaders:
    'Content-Type, Accept, Access-Control-Allow-Origin, Authorization',
};
