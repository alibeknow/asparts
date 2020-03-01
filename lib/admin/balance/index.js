'use strict';
// const url = require('url');
const async = require('asparts.core.async');
const log = require('asparts.core.log').getLogger('balance');
const http = require('asparts.core.http')({
  timeout: parseInt(process.env.BALANCE_TIMEOUT, 10) || 2000,
  timer: true,
  errro_handle: true,
  cache: false
});

const SMSC_LOGIN = process.env.SMSC_LOGIN || '';
const SMSC_PASSWORD_MD5 = process.env.SMSC_PASSWORD_MD5 || '';
const SMSC_URL = '/sys/balance.php?login=' + SMSC_LOGIN + '&psw=' + SMSC_PASSWORD_MD5;
const SELECTEL_API = process.env.SELECTEL_API || '';

exports.index = (req, res) => {
  async.auto({
    getBalanceSMSC: callback => {
      const options = {
        protocol: 'https:',
        method: 'GET',
        hostname: 'smsc.ru',
        port: null,
        path: SMSC_URL,
        headers: {
          'cache-control': 'no-cache'
        }
      };

      http.request(options, (err, data) => {
        if (err) {
          log.warn('error on get balance smsc', err);
          callback(err);
        } else {
          log.info('balance smsc: ', data);
          callback(null, data);
        }
      });
    },
    getBalanceSELECTEL: callback => {
      const options = {
        protocol: 'https:',
        method: 'GET',
        hostname: 'api.selectel.ru',
        port: null,
        path: '/v1/billing/balance',
        headers: {
          'x-token': SELECTEL_API,
          'cache-control': 'no-cache'
        }
      };

      http.request(options, function (err, data) {
        if (err) {
          log.warn('error on get balance selectel', err);
          callback(err);
        } else {
          log.info('balance selectel: ', data);

          callback(null, data);
        }
      });
    },
    prepareBalance: ['getBalanceSMSC', 'getBalanceSELECTEL', (callback, results) => {
      const smsc = results.getBalanceSMSC || null;
      let selectelJSON = null;
      let selectel = null;
      try {
        selectelJSON = JSON.parse(results.getBalanceSELECTEL);

        selectel = {
          storage: (selectelJSON.storage.balance / 100) || 0,
          all: (selectelJSON.balance / 100) || 0
        };
      } catch (e) {
        log.warn('error on parse json balance selectel', e);
      }

      callback(null, {
        smsc,
        selectel
      });
    }]
  }, (err, results) => {
    if (err) {
      log.warn('errror on get balance', err);
      res.render('/admin/balance', {
        'X-content-container': '#main-content'
      });
    } else {
      res.render('/admin/balance', {
        'X-content-container': '#main-content',
        balance: results.prepareBalance
      });
    }
  });
};
