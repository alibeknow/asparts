'use strict';
const
  db        = require('asparts.core.db'),
  log       = require('asparts.core.log').getLogger('admin manager'),
  Router    = require('asparts.core.router'),
  check     = require('asparts.core.check');

const router = Router();

function fetchUserManagerList (callback) {
  const query = String.raw `
    select u.fio
          ,u.phone_int
          ,u.email
          ,u.phone
          ,u.id
          ,u.icq
      from as_user u
          ,as_role r
          ,as_user2role u2r
     where u.id=u2r.user_id
       and r.id = u2r.role_id
       and r.role in ('manager', 'internal_manager')
     order by u.fio
  `;

  db.query(query, function (err, users) {
    if (!err && users) {
      callback(err, users.rows);
    } else {
      log.warn('fail on fetch user with role manager', err);
      callback(err, []);
    }
  });
}

router.get('/list', check.access('major_manager'), function (req, res) {
  res.render('/admin/user/manager_list', {
    'X-content-container': '#main-content',
    user: req.getUser()
  });
});

router.get('/get', check.access('major_manager'), function (req, res) {
  fetchUserManagerList(function (err, users) {
    res.json({
      data: users
    });
  });
});

exports = module.exports = router;
