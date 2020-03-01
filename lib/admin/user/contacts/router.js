'use strict';
const
  Router    = require('asparts.core.router'),
  contacts  = require('./index'),
  check     = require('asparts.core.check');

const rights = {
  admin: check.access('admin'),
  corp_manager: check.access(check.some(['major_manager', 'manager', 'can_see_users'])),
  major_manager: check.access(check.some(['major_manager', 'manager']))
};

const router = Router();

router.get('/:user_id/view', rights.corp_manager, contacts.view);
router.get('/:user_id/edit', rights.corp_manager, contacts.edit);
router.post('/save', rights.corp_manager, contacts.save);

exports = module.exports = router;
