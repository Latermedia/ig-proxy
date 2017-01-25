# ig-proxy
This is a simple Node/Express app used to proxy Instagram API requests and authenticate those requests via Javascript Web Tokens.

### Motivation

- Use [Signed Requests](https://www.instagram.com/developer/secure-api-requests/) for the Instgram API to ensure that third parties can't use our API access tokens.
- Signed Requests require the API request to be made from our server, instead of directly from the browser.
- Didn't want these requests to be proxied through our main Rails app.
- Use short lived JWT to ensure the proxy isn't misused.
- JWT will have an expiration and a list of access tokens this user is allowed to use with the proxy.

### Dependencies

- [Node](https://nodejs.org/)
- [Express](https://expressjs.com/) - Simple Node web framework
- [http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware) - Nicely wraps [node-http-proxy](https://github.com/nodejitsu/node-http-proxy) for use with Express
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) - Handle Javascript Web Tokens
- [body-parse](https://github.com/expressjs/body-parser) - Deal with body params

### Instagram API Proxy

- Signed Requests
- Rewrite GET/DELETE
- Rewrite POST

### JWT

[Javascript Web Tokens](https://jwt.io/) is a simple token-based authentication protocol that allows two parties to securely make claims to each other.

### .env.json

You will need to add a `.env.json` file in the top level of your app directory. This will hold your environment variables for now. You will need two environment variables to get this app to work:

- `INSTAGRAM_CLIENT_SECRET`: The client secret for your Instagram app.
- `JWT_KEY`: The secret key used to sign and verify your JWT. This key is shared between this app and whatever app you are using to generate your JWT.

```json
{
  "development": {
    "INSTAGRAM_CLIENT_SECRET": "<CLIENT SECRET>",
    "JWT_KEY": "myjwtkey"
  }
}
```

### Run it locally

```> node app.js```

This will bring up the proxy server on `localhost:2000`. It's on port `2000` in case you have another server running on ports `3000` or `4000`. You can change this [here](https://github.com/Latermedia/ig-proxy/blob/master/app.js#L31) (or thereabouts…).

### IG Proxied Requests

Proxied requests will have the following format:

`<HOST>/proxy/instagram/<Instagram API path>?<Query Params>`

Example:

[/users/self/media/recent](https://www.instagram.com/developer/endpoints/users/#get_users_media_recent_self) would be requested via:

`http://localhost:2000/proxy/instagram/users/self?access_token=<ACCESS _TOKEN>`

### JWT Authenticated IG Proxied Requests

Proxied requests will have the following format:

`<HOST>/secure-proxy/instagram/<Instagram API path>?<Query Params>`

The JWT would be passed to the request in the `AUTHORIZATION` header as a Bearer token (`Bearer <JWT>`) or a query/body param with the key of `jwt`.

Example:

[/users/self/media/recent](https://www.instagram.com/developer/endpoints/users/#get_users_media_recent_self) would be requested via:

`http://localhost:2000/secure-proxy/instagram/users/self?access_token=<ACCESS _TOKEN>`

### JWT Authentication

The JWT for the client is validated in two places: first in [jwt/auth](https://github.com/Latermedia/ig-proxy/blob/master/jwt/auth.js), then in [jwt/igAuth](https://github.com/Latermedia/ig-proxy/blob/master/jwt/igAuth.js).

##### jwt/auth

1. Finds the token in either the `Authorization` header or as a query/body param with the key `jwt`.
2. Verifies the JWT for basic structure and [standard fields](https://en.wikipedia.org/wiki/JSON_Web_Token#Standard_fields).
   - This will catch things like expired tokens (`exp`), tokens that are not valid yet (`nbf`), among others.
3. Sets the decode JWT to a `jwtDecoded` property on the req object.
4. Calls the next middleware.

##### jwt/igAuth

1. Verifies that we have decoded JWT.
2. Grabs the access token being used to make the current API request.
3. Verifies that this access token is also present in the list of allowed access tokens in the JWT payload.
4. Calls the next middleware.

### JWT Format

JWTs allow you add additional claims to the payload of the token. These claims are just additional key/value pairs in the payload. 

The additional claim we are adding is a `tokens` claim. This is just an array of Instagram access tokens that you are permitting this user to make proxied requests with. The idea is that someone needs to have both the Instagram access token and a valid JWT in order to make a proxied request to your Instagram app.

```
{
  tokens: [ <ACCESS_TOKEN_1>, <ACCESS_TOKEN_2>, ... ]
}
```

### Full Example

We're going to assume the following for this example:

1. You have an Instagram app and its secret
2. You have a JWT key.
3. Both of the above are in the `.env.json` file.
4. Your node app is running on port `2000`.
5. You have an `access_token` for a user for your Instagram app.

Ok here we go:

Replace `<ACCESS TOKEN*>`, `<JWT KEY>` with the appropriate values

1. Create a JWT:

  ```javascript
  var jwt = require('jsonwebtoken');
  var payload = {
    exp: Math.floor(Date.now() / 1000) + (60 * 60),
    tokens: [ '<ACCESS TOKEN 1>', '<ACCESS TOKEN 2>' ]
  };
  var token = jwt.sign(payload, '<JWT KEY>');
  console.log(token);
  ```

2. Use the JWT for a request:

  `http://localhost:2000/secure-proxy/instagram/users/self?access_token=<ACCESS_TOKEN>&jwt=<JWT TOKEN>`

3. Validate the JWT works:
   - If you chop off the last character of JWT (creating an incorrect signature), your request should error.
   - If you modify the `exp` claim to be an hour in the past (creating an expired token), your request should error.
   - If you remove the access token you are actually making the proxied request with from the `tokens` claim (creating an unpermitted request), your request should fail.
