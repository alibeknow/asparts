'use strict';
const url = require('url');
const log = require('asparts.core.log').getLogger('sync-status');
const http = require('asparts.core.http')({
  timeout: parseInt(process.env.SYNC_STATUS_TIMEOUT, 10) || 2000,
  timer: true,
  errro_handle: true,
  cache: false
});

exports.status = (req, res) => {
  http.request(url.format({
    protocol: 'http:',
    host: process.env.SYNC_STATUS_HOST || 'localhost:3001',
    port: process.env.SYNC_STATUS_PORT || '3001',
    pathname: '/status/sync/catalog',
    method: 'GET'
  }), function (err, data) {
    if (err) {
      log.warn('errror on get status', err);
      res.json({
        type: 'response',
        errors: [err],
        success: !err
      });
    } else {
      log.info('sync ', data);
      res.render('/admin/sync/catalog/status', {
        imports: JSON.parse(data)
      });
    }
  });
};
