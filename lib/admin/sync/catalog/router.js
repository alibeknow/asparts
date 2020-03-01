'use strict';
const
  Router  = require('asparts.core.router'),
  sync    = require('./index');

const router = Router();

router.get('/status', sync.status);

exports = module.exports = router;
