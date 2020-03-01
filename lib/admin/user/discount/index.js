'use strict';
const
  async        = require('asparts.core.async'),
  log          = require('asparts.core.log').getLogger('user-discount'),
  db           = require('asparts.core.db');

function fetchDiscountList (callback) {
  const query = `
    select d.id
          ,d.name
      from as_discount d
     order by d.name
  `;
  db.query(query, function (err, resultSet) {
    if (!err && resultSet) {
      callback(err, resultSet.rows);
    } else {
      log.warn('fail on fetch discounts', err);
      callback(err, []);
    }
  });
}

exports.fetchUserDiscount = function (user_id, callback) {
  const query = `
    select d.id discount_id
          ,u.id user_id
          ,d.name
      from as_user u
      left outer join as_discount d on d.id = u.discount_id
     where u.id = :user_id
  `;
  if (user_id) {
    db.query(query, {user_id}, function (err, data) {
      if (!err && data && data.rows && data.rows[0]) {
        const discout = data.rows[0];
        callback(null, discout);
      } else {
        log.warn('fail on fetch user discount', err);
        callback(err);
      }
    });
  } else {
    callback();
  }
};

exports.edit = function (req, res) {
  const prm = req.prm();
  const user_id = prm.user_id || exports.getUserId(req);
  if (user_id) {
    async.parallel({
      discount: async.apply(exports.fetchUserDiscount, user_id),
      discounts: fetchDiscountList
    }, function (err, result) {
      if (!err && result) {
        res.render('/admin/user/discount/edit', {
          'X-content-no-url': true,
          discount: result.discount,
          discounts: result.discounts
        });
      } else {
        log.warn('error on fetch user data for ', user_id, err);
        res.json({
          type: 'response',
          errors: ['Ошибка получения данных'],
          success: false
        });
      }
    });
  } else {
    res.renderDialog('/404', {});
  }
};

exports.view = function (req, res) {
  const prm = req.prm();
  const user_id = prm.user_id || exports.getUserId(req);
  if (user_id) {
    exports.fetchUserDiscount(user_id, function (err, discount) {
      if (!err && discount) {
        res.render('/admin/user/discount/view', {
          'X-content-no-url': true,
          discount,
          user: req.getUser()
        });
      } else {
        log.warn('error on fetch user data for ', user_id, err);
        res.json({
          type: 'response',
          errors: ['Ошибка получения данных'],
          success: false
        });
      }
    });
  } else {
    res.renderDialog('/404', {});
  }
};

exports.save = function (req, res) {
  const prm = req.prm();
  async.waterfall([function (callback) {
    const query = `
      update as_user
          set discount_id=:discount_id
        where id = :user_id
    `;
    if (prm.discount_id === '') {
      prm.discount_id = null;
    }
    db.query(query, {
      user_id: prm.user_id,
      discount_id: prm.discount_id
    }, function (err, resultSet) {
      if (!err && resultSet && resultSet.rowCount === 1 && resultSet.command === 'UPDATE') {
        callback(err);
      } else {
        if (err) {
          log.error(err);
        }
        log.warn('unsave as_user ', prm, resultSet);
        callback('Контакты не сохранены.');
      }
    });
  }], function (err) {
    if (err) {
      log.warn('edit_discount', err);
      res.json({
        type: 'response',
        errors: ['Не удалось поменять контакты'],
        success: false,
        data: {
        }
      });
    } else {
      exports.fetchUserDiscount(prm.user_id, function (err, discount) {
        if (!err && discount) {
          res.render('/admin/user/discount/view', {
            'X-content-no-url': true,
            discount,
            user: req.getUser()
          });
        } else {
          log.warn('error on fetch user data for ', prm.user_id, err);
          res.json({
            type: 'response',
            errors: ['Ошибка получения данных'],
            success: false
          });
        }
      });
    }
  });
};
