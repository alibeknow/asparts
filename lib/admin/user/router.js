'use strict';
const
  Router    = require('asparts.core.router'),
  user      = require('./index'),
  contacts  = require('./contacts/router'),
  discount  = require('./discount/router'),
  check     = require('asparts.core.check');
const rights = {
  admin: check.access('admin'),
  corp_manager: check.access(check.some(['major_manager', 'manager', 'can_see_users'])),
  major_manager: check.access(check.some(['major_manager', 'manager']))
};

const router = Router();

router.use('/contacts', rights.corp_manager, contacts);
router.use('/discount', rights.corp_manager, discount);
router.get('/list', rights.corp_manager, user.user_list);
router.get('/get', rights.corp_manager, user.get_user_list);

router.get('/:user_id', rights.corp_manager, user.user);
router.get('/:user_id/get-logins', rights.corp_manager, user.user_get_logins);
router.post('/:login_id/reset-password', rights.corp_manager, user.reset_password);
router.post('/save_roles', rights.admin, user.save_roles);
router.post('/save_delivery_types', rights.admin, user.save_delivery_types);
router.post('/save_manager_group', rights.admin, user.save_manager_group);
router.post('/save_widget_access', rights.admin, user.save_widget_access);
router.post('/save_user_deps', rights.admin, user.save_user_deps);
router.post('/save_user_template', rights.admin, user.save_user_template);
router.post('/save_user_discount', rights.admin, user.save_user_discount);

exports = module.exports = router;
