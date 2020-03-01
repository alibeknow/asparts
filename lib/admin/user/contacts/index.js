'use strict';
const async = require('asparts.core.async'),
  log = require('asparts.core.log').getLogger('user-contacts'),
  db = require('asparts.core.db'),
  user_fetcher = require('@asparts/auth.fetcher');

exports.edit = function (req, res) {
  const prm = req.prm();
  const user_id = prm.user_id || exports.getUserId(req);
  if (user_id) {
    user_fetcher.fetchUserById(user_id, function (err, data) {
      if (!err && data) {
        res.render('/admin/user/contacts/edit', {
          'X-content-no-url': true,
          contacts: data
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
    user_fetcher.fetchUserById(user_id, function (err, data) {
      if (!err && data) {
        res.render('/admin/user/contacts/view', {
          'X-content-no-url': true,
          data,
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
  async.waterfall(
    [
      function (callback) {
        const query = `
      update as_user
          set icq=:icq
            ,email=:email
            ,phone=:phone
            ,phone_int=:phone_int
            ,chat2desk=:chat2desk
        where id = :user_id
    `;
        db.query(
          query,
          {
            user_id: prm.user_id,
            icq: prm.icq,
            email: prm.email,
            phone: prm.phone,
            phone_int: prm.phone_int,
            chat2desk: prm.chat2desk
          },
          function (err, resultSet) {
            if (
              !err &&
              resultSet &&
              resultSet.rowCount === 1 &&
              resultSet.command === 'UPDATE'
            ) {
              callback(err);
            } else {
              if (err) {
                log.error(err);
              }
              log.warn('unsave as_user ', prm, resultSet);
              callback('Контакты не сохранены.');
            }
          }
        );
      }
    ],
    function (err) {
      if (err) {
        log.warn('edit_contacts', err);
        res.json({
          type: 'response',
          errors: ['Не удалось поменять контакты'],
          success: false,
          data: {}
        });
      } else {
        user_fetcher.fetchUserById(prm.user_id, function (err, data) {
          if (!err && data) {
            res.render('/admin/user/contacts/view', {
              'X-content-no-url': true,
              data,
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
    }
  );
};
