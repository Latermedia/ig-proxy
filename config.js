/* ./env.json is a json file of the form
{
  "development": {
    "INSTAGRAM_CLIENT_SECRET": "mytotallylegitinstagramapisecret"
  }
}
*/

var env;

try  {
  env = require('./env.json');
} catch(e) {
  if (e.code !== 'MODULE_NOT_FOUND') {
    throw e;
  } else {
    console.log('`./env.json` not found')
  }
}

module.exports = function() {
  var node_env = process.env.NODE_ENV || 'development';

  if (!env || !env[node_env]) {
    return {};
  } else {
    return env[node_env];
  }
};
