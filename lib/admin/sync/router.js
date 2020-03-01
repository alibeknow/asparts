'use strict';
const
  Router    = require('asparts.core.router'),
  catalog      = require('./catalog/router');

const router = Router();

router.use('/catalog', catalog);

exports = module.exports = router;
