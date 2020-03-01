'use strict';
const
  Router       = require('asparts.core.router'),
  admin        = require('./index'),
  user         = require('./user/router'),
  manager      = require('./manager/router'),
  sync         = require('./sync/router'),
  balance      = require('./balance'),
  check        = require('asparts.core.check'),
  interim_user = require('./user');

const rights = {
  admin: check.access('admin'),
  major_manager: check.access('major_manager'),
  manager: check.access('manager'),
  balance_access: check.access('balance_access')
};

const router = Router();

router.use('/user', user);
router.get('/interim-user/:phone', rights.manager, interim_user.interim_user);
router.use('/manager', manager);
router.post('/recache', rights.major_manager, admin.recache);

//рендер переключателя скидки для менеджера
router.post('/switch_tariff', rights.manager, admin.switch_tariff);
router.post('/get_short_view_tariff', rights.manager, admin.get_short_view_tariff);
router.get('/view-roles', rights.admin, admin.view_roles);

// Управление обменом с 1с
router.use('/sync', rights.admin, sync);

// Просмотр баланса по услугам
router.get('/balance', rights.balance_access, balance.index);

exports = module.exports = router;
