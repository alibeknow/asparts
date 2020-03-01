'use strict';
const
  log    = require('asparts.core.log').getLogger('start'),
  app    = require('asparts.core.app');

const modules = [
  './index',
  'asparts.auth',
  'asparts.static',
  'asparts.asterisk'
];
const routers = [];
modules.forEach(function (module_name) {
  try {
    routers.push(require(module_name));
  } catch (ex) {
    log.warn('error on load module ', module_name, ex);
    //Do nothing
  }
});

app(routers, require('asparts.core.websocket.service'));
