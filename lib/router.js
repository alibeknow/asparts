'use strict';
const
  Router    = require('asparts.core.router'),
  admin      = require('./admin/router');

const router = Router();

router.use('/admin', admin);

exports = module.exports = router;
