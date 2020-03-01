'use strict';
const
  db           = require('asparts.core.db'),
  log          = require('asparts.core.log').getLogger('admin'),
  message_bc   = require('asparts.core.message.pub_sub'),
  ws_content   = require('asparts.core.websocket/lib/content'),
  async        = require('asparts.core.async');

exports.recache = function (req, res) {
  message_bc.send('recache', {
    jade: 1,
    db_cache: {
      all: 1
    }
  });
  res.json({
    type: 'response',
    errors: [],
    success: true,
    data: {
      notification: 'Сигнал очистки кеша разослан.'
    }
  });
};

exports.get_short_view_tariff = function (req, res) {
  db.query(`
    select
      u2d.discount_id as id
      ,d.name
      ,(select di.name from as_user u left outer join as_discount as di on di.id=u.discount_id where u.id=:id) cur_discount
     from as_user2discount as u2d
      left join as_discount as d on u2d.discount_id = d.id
     where u2d.user_id = :id
    `, {
      id: req.getUser().id
    }, function (err, resultSet) {
      if (!err && resultSet && resultSet.rowCount) {
        const discount = resultSet.rows;
        discount.push({
          name: 'нет %',
          cur_discount: resultSet.rows[0].cur_discount
        });
        res.render('/admin/short_view', {
          'X-content-container': '#short_view_tariff',
          as_discount: discount,
          user: req.getUser()
        });
      } else {
        log.warn(`render tariff short view: ${err}`);
      }
    }
  );
};

exports.switch_tariff = function (req, res) {
  const prm = req.prm();
  db.query(`
    update as_user
       set discount_id=:discount_id
     where id=:user_id
    `, {
      user_id: req.getUser().id,
      discount_id: prm.discount_id
    }, function (err) {
      if (err) {
        log.warn(`switch tariff: ${err}`);
        res.json({
          type: 'response',
          errors: ['Не получилось обновить тариф, попробуйте еще раз позже.'],
          success: false,
          data: {
          }
        });
      } else {
        ws_content.session(req.session.sessionID, {
          'X-content-container': '#cur_discount_name',
          content: prm.discount_name
        });
        res.json({
          type: 'response',
          errors: [],
          success: true,
          data: {
            notification: 'Тарифный успешно план обновился.',
            refresh: true
          }
        });
      }
    }
  );
};

function fetchManagerRoles (managers, callback) {
  const
    fetchManagers = [];
  async.each(managers, (manager, next) => {
    const
      roles = {};
    async.each(manager.role, (role, nextRole) => {
      roles[role] = 1;
      nextRole();
    });
    manager.fetchRole = roles;
    fetchManagers.push(manager);
    next();
  }, err => {
    if (err) {
      callback(err);
    } else {
      callback(null, fetchManagers);
    }
  });
}

function fetchAllRoles (users, callback) {
  const
    managers = [],
    query = `
      select r.role
            ,r.title
        from as_role r
        order by r.role
    `;
  db.query(query, function (err, data) {
    if (!err && data) {
      async.each(users, (user, nextUser) => {
        const
          roles = user.fetchRole;
        async.each(data.rows, function (role, callback) {
          if (roles[role.role] !== 1) {
            user.fetchRole[role.role] = 0;
          }
          callback();
        });
        managers.push(user);
        nextUser();
      }, err => {
        if (err) {
          callback(err);
        } else {
          callback(null, managers, data.rows);
        }
      });
    }
  });
}

exports.view_roles = function (req, res) {
  db.query(`
    select u.fio
          ,array_agg(r.role order by r.role) as role
      from as_user as u
      left outer join as_user2role as u2r on u.id = u2r.user_id
      left outer join as_role as r on r.id = u2r.role_id
     where r.id is not null
     group by u.fio
     order by u.fio
  `, (err, data) => {
    if (err) {
      log.warn(err);
    } else {
      fetchManagerRoles(data.rows, (err, data) => {
        if (err) {
          log.warn(err);
        } else {
          fetchAllRoles(data, (err, result, roles) => {
            if (err) {
              log.warn(err);
            } else {
              res.render('/admin/view_roles', {
                'X-content-container': '#main-content',
                managers: result,
                roles
              });
            }
          });
        }
      });
    }
  });
};
