'use strict';
const
  extend = require('util')._extend,
  url    = require('url');

const
  async         = require('asparts.core.async'),
  log           = require('asparts.core.log').getLogger('admin'),
  moment        = require('asparts.core.moment'),
  db_cache      = require('asparts.core.db_cache'),
  db            = require('asparts.core.db'),
  user_fetcher  = require('asparts.auth.fetcher'),
  phone         = require('asparts.core.common/lib/phone'),
  order_fetcher = require('asparts.order.fetcher');

moment.locale('ru');

let
  order_prepare_status,
  order_status;

db_cache.registerCache(
  'order_prepare_status',
  `
    select *
      from as_order_status_type
     order by order_index
  `,
  function () {
    return undefined;
  },
  function (err, data) {
    order_status = {};
    order_prepare_status = [];
    async.each(data, function (val, callback) {
      order_status[val.unicode] = val;
      if (val.unicode === 'create' || val.unicode === 'finished') {
        // do nothing
      } else if (val.unicode === 'assigned') {
        order_prepare_status.push({
          unicode: 'assigned',
          label_mng_past: 'Создан'
        });
      } else {
        order_prepare_status.push({
          unicode: val.unicode,
          label_mng_past: val.label_mng_past || val.name
        });
      }
      callback();
    }, function () {
      return undefined;
    });
  }
);

function get_busines_card (user_phone, startDate, endDate, callback) {
  if (!user_phone) {
    callback();
    return false;
  }
  db.query(`
    select bc.date
          ,m.fio
      from as_busines_card as bc
      left outer join as_user as m on m.id = bc.manager_id
     where bc.phone=:user_phone
       and bc.date between cast(:startDate as timestamp) and cast(:endDate as timestamp)
  order by bc.date
  `, {
    user_phone,
    startDate,
    endDate
  }, (err, data) => {
    if (!err && data && data.rows) {
      async.each(data.rows, function (bc, callback) {
        bc.date = moment(bc.date).format('DD.MM.YYYY HH:MM');
        callback();
      }, function () {
        callback(null, data.rows);
      });
    } else {
      log.warn(err);
      callback(err, []);
    }
  });
}

function get_call_by_phone (user_phone, startDate, endDate, callback) {
  if (!user_phone) {
    callback();
    return false;
  }
  db.query(`
  with userp as (
     select phone
       from as_order
      where phone=:user_phone
      order by id
      limit 1
  )
  select ci.client_number
        ,ci.call_external_id
        ,ci.call_date
        ,ci.order_id
        ,u.fio as manager
    from as_call_incoming as ci
    left outer join as_user as u on u.id = ci.talk_manager_id
    left outer join userp as up on up.phone = ci.client_number
   where ci.client_number = up.phone
     and ci.call_date between cast(:startDate as timestamp) and cast(:endDate as timestamp)
   union
  select co.client_number
        ,co.call_external_id
        ,co.call_date
        ,co.order_id
        ,u.fio as manager
    from as_call_outgoing as co
    left outer join as_user as u on u.id = co.manager_id
    left join userp as up on up.phone = co.client_number
   where co.client_number = up.phone
     and co.call_date between cast(:startDate as timestamp) and cast(:endDate as timestamp)
   order by call_date desc
  `, {
    user_phone,
    startDate,
    endDate
  }, function (err, data) {
    if (!err && data && data.rows) {
      async.each(data.rows, function (call, callback) {
        call.call_date = moment(call.call_date).format('DD.MM.YYYY HH:MM');
        callback();
      }, function () {
        callback(null, data.rows);
      });
    } else {
      callback(err);
    }
  });
}

function get_call_by_id (user, startDate, endDate, callback) {
  if (!user.id) {
    callback();
    return false;
  }
  db.query(`
  with userp as (
     select phone,
            user_id
       from as_order
      where user_id=:user_id
      order by id
      limit 1
  )
  select ci.client_number
        ,ci.call_external_id
        ,ci.call_date
        ,ci.order_id
        ,u.fio as manager
    from as_call_incoming as ci
    left outer join as_user as u on u.id = ci.talk_manager_id
    left join userp as up on up.phone = ci.client_number
   where ci.client_number = up.phone
     and ci.call_date between cast(:startDate as timestamp) and cast(:endDate as timestamp)
   union
  select co.client_number
        ,co.call_external_id
        ,co.call_date
        ,co.order_id
        ,u.fio as manager
    from as_call_outgoing as co
    left outer join as_user as u on u.id = co.manager_id
    left join userp as up on up.phone = co.client_number
   where co.client_number = up.phone
     and co.call_date between cast(:startDate as timestamp) and cast(:endDate as timestamp)
   order by call_date
  `, {
    user_id: user.id,
    startDate,
    endDate
  }, function (err, data) {
    if (!err && data && data.rows) {
      async.each(data.rows, function (call, callback) {
        call.call_date = moment(call.call_date).format('DD.MM.YYYY HH:MM');
        callback();
      }, function () {
        callback(null, data.rows);
      });
    } else {
      callback(err);
    }
  });
}

function fetchUserList (callback) {
  const query = `
    select u.id
          ,u.fio
          ,u.le_short_name
          ,u.phone
          ,u.email
          ,d.name as discount
          ,u.client_type_id as user_type
      from as_user as u
      left outer join as_discount as d on d.id = u.discount_id
     order by u.fio
  `;
  db.query(query, function (err, users) {
    if (!err && users) {
      callback(err, users.rows);
    } else {
      log.warn('fail on fetch users', err);
      callback(err, []);
    }
  });
}

function fetchUserRoles (user, callback) {
  const query = `
    select r.role
          ,r.title
      from as_role r
      order by r.title
  `;
  db.query(query, function (err, data) {
    if (!err && data) {
      const roles = user.roles;
      user.role_list = [];
      async.each(data.rows, function (role, callback) {
        if (roles[role.role] !== 1) {
          roles[role.role] = {role: role.role, title: role.title, is_active: 0};
        } else {
          roles[role.role] = {role: role.role, title: role.title, is_active: 1};
        }
        user.role_list.push(roles[role.role]);
        callback();
      }, function () {
        callback(null, user);
      });
    } else {
      log.warn('fail on fetch user roles', err);
      callback(err, user);
    }
  });
}

function fetchUserDiscount (user, callback) {
  const query = `
    select d.*
      from as_discount d
     where d.id = :discount_id
     limit 1
  `;
  if (user.discount_id) {
    db.query(query, {discount_id: user.discount_id}, function (err, data) {
      if (!err && data) {
        data = data.rows[0];
        user.discount = {
          user_id: user.id,
          name: data.name,
          discount_id: data.id
        };
        callback(null, user);
      } else {
        log.warn('fail on fetch user roles', err);
        callback(err, user);
      }
    });
  } else {
    user.discount = {
      user_id: user.id
    };
    callback(null, user);
  }
}

function fetchUserWidgetQueue (user, callback) {
  db.query(`
    select q.id
          ,q.title
          ,q.prefix
          ,case when q.id in (
            select source_id
              from as_manager_access_widget where user_id=:user_id
            ) then true
            else false
           end as is_active
      from as_widget_source as q
  `, {
    user_id: user.id
  }, (err, data) => {
    user.widget_access = data.rows;
    callback(err);
  });
}

function fetchUserTemplates (user, callback) {
  db.query(`
    select t.id
          ,t.name
          ,t.template
          ,case when t.id in (
            select template_id
              from as_user2template where user_id=:user_id
            ) then true
            else false
           end as is_active
      from as_template_business_card as t
  `, {
    user_id: user.id
  }, (err, data) => {
    user.user_template = data.rows;
    callback(err);
  });
}

function fetchUserDinamicDiscount (user, callback) {
  db.query(`
    select t.id
          ,t.name
          ,case when t.id in (
            select discount_id
              from as_user2discount where user_id=:user_id
            ) then true
            else false
           end as is_active
      from as_discount as t
  `, {
    user_id: user.id
  }, (err, data) => {
    log.warn(data.rows);
    user.user_discount = data.rows;
    callback(err);
  });
}

function fetchUserDeps (user, callback) {
  db.query(`
    select d.id
          ,d.name
          ,case when d.id in (select dep_id
                                from as_user2dep
                               where user_id=:user_id
                             ) then true
           else false
           end as is_active
      from as_dep as d
      where d.is_disabled=false
      order by d.sort_index
  `, {
    user_id: user.id
  }, (err, data) => {
    user.user_deps = data.rows;
    callback(err);
  });
}

function fetchUserManagerGroups (user, callback) {
  db.query(`
    select g.id
    ,g.value
    ,g.unicode
    ,case when g.id in (select group_id
                          from as_user2manager_group
                        where user_id=:user_id
                      ) then true
    else false
    end as is_active
  from as_spr_common g where g.spr_descr_id = as_spr_common_descr_lookup('spr_as_issue_manager_group')
  order by g.sort_index, g.value
  `, {
    user_id: user.id
  }, (err, data) => {
    user.manager_groups = data.rows;
    callback(err);
  });
}

function fetchManagerDeliveryTypes (user, callback) {
  const query = `
    select dt.id
          ,dt.name
          ,dt.unicode
      from as_spr_delivery_type dt
     where is_disabled=false
     order by dt.name
  `;
  db.query(query, function (err, data) {
    if (!err && data) {
      if (!user.delivery_types) {
        extend(user, {delivery_types: {}});
      }
      const dtypes = user.delivery_types;

      async.each(data.rows, function (dtype, callback) {
        if (dtypes[dtype.unicode]) {
          dtypes[dtype.unicode] =
            extend(dtypes[dtype.unicode], {delivery_types_name: dtype.name, is_active: 1});
        } else {
          dtypes[dtype.unicode] = {
            delivery_type_id: dtype.id,
            delivery_type_unicode: dtype.unicode,
            delivery_types_name: dtype.name,
            is_active: 0
          };
        }
        callback();
      }, function () {
        callback(null, user);
      });
    } else {
      log.warn('fail on fetch delivery_types', err);
      callback(err, user);
    }
  });
}

function getActiveCheckbox (obj) {
  const names = [];
  let cnt = 0;
  Object.keys(obj).forEach(function (key) {
    if (obj[key] === 'on') {
      cnt = cnt + 1;
      names[cnt] = key;
    }
  });
  return names;
}

exports.user_list = function (req, res) {
  res.render('/admin/user/list', {
    'X-content-container': '#main-content',
    user: req.getUser()
  });
};

exports.get_user_list = function (req, res) {
  fetchUserList(function (err, users) {
    res.json({
      data: users
    });
  });
};

exports.interim_user = function (req, res) {
  const
    prm       = req.prm(),
    startDate = moment(prm.startDate, 'DD-MM-YYYY').isValid() ? moment(prm.startDate, 'DD-MM-YYYY') : moment().subtract(31, 'days'),
    endDate   = moment(prm.endDate, 'DD-MM-YYYY').isValid() ? moment(prm.endDate, 'DD-MM-YYYY') : moment().add(1, 'days'),
    status    = prm.status || undefined;
  async.parallel({
    call_data: callback => {
      get_call_by_phone(phone.trimPhone(prm.phone), startDate, endDate, function (err, data) {
        if (err) {
          callback(err, []);
        } else {
          callback(null, data);
        }
      });
    },
    get_user: callback => {
      db.query(`
      select o.fio
            ,o.phone
            ,o.email
            ,'ph' as client_type_unicode
        from as_order o
       where o.phone = :phone
       order by o.id desc limit 1
      `, {
        phone: phone.trimPhone(prm.phone)
      }, function (err, data) {
        if (!err && data && data.rowCount) {
          callback(null, data.rows[0]);
        } else {
          callback(err, {});
        }
      });
    },
    busines_card: callback => {
      get_busines_card(phone.trimPhone(prm.phone), startDate, endDate, callback);
    },
    get_order: callback => {
      order_fetcher.fetchOrdersByPhone(db, startDate, endDate, status, phone.trimPhone(prm.phone), function (err, data) {
        async.eachSeries(data, function iteratee (item, callback) {
          order_fetcher.fetchOrder(db, item.id, function (err, order) {
            item.need2payMax = order.need2payMax;
            callback();
          });
        }, function done () {
          callback(null, {
            orders: data
          });
        });
      });
    }
  }, function (err, data) {
    res.render('/admin/user', {
      data: data.get_user,
      orders: data.get_order,
      call_data: data.call_data,
      busines_card: data.busines_card,
      showPeriodSelect: 1,
      showStatusSelect: 1,
      startDate: startDate.format('DD-MM-YYYY'),
      endDate: endDate.format('DD-MM-YYYY'),
      status,
      select_statuses: order_prepare_status,
      report_content: url.parse(req.originalUrl).pathname,
      'X-content-container': '#main-content'
    });
  });
};

exports.user = function (req, res) {
  let
    opts,
    busines_card,
    call_data;

  const
    prm       = req.prm(),
    startDate = moment(prm.startDate, 'DD-MM-YYYY').isValid() ? moment(prm.startDate, 'DD-MM-YYYY') : moment().subtract(31, 'days'),
    endDate   = moment(prm.endDate, 'DD-MM-YYYY').isValid() ? moment(prm.endDate, 'DD-MM-YYYY') : moment().add(1, 'days'),
    status    = prm.status || undefined;
  user_fetcher.fetchUserById(prm.user_id, function (err, user) {
    async.series([function (callback) {
      fetchUserRoles(user, function (err) {
        callback(err);
      });
    }, function (callback) {
      fetchManagerDeliveryTypes(user, function (err) {
        callback(err);
      });
    }, function (callback) {
      fetchUserManagerGroups(user, function (err) {
        callback(err);
      });
    }, function (callback) {
      fetchUserDiscount(user, function (err) {
        callback(err);
      });
    }, function (callback) {
      fetchUserDinamicDiscount(user, function (err) {
        callback(err);
      });
    }, function (callback) {
      fetchUserWidgetQueue(user, function (err) {
        callback(err);
      });
    }, function (callback) {
      fetchUserTemplates(user, function (err) {
        callback(err);
      });
    }, function (callback) {
      fetchUserDeps(user, function (err) {
        callback(err);
      });
    }, function (callback) {
      get_call_by_id(user, startDate, endDate, function (err, data) {
        call_data = data;
        callback(err);
      });
    }, function (callback) {
      db.query(`
        select phone
              ,user_id
          from as_order
         where user_id=:user_id
         order by id
         limit 1
      `, {
        user_id: parseInt(prm.user_id, 10)
      }, function (err, data) {
        if (!err && data && data.rowCount) {
          get_busines_card(phone.trimPhone(data.rows[0].phone), startDate, endDate, function (err, data) {
            if (!err && data) {
              busines_card = data;
            }
            callback();
          });
        } else {
          callback();
        }
      });
    }, function (callback) {
      order_fetcher.fetchOrders4me(db, startDate, endDate, status, prm.user_id, function (err, data) {
        async.eachSeries(data, function iteratee (item, callback) {
          order_fetcher.fetchOrder(db, item.id, function (err, order) {
            item.need2payMax = order.need2payMax;
            callback();
          });
        }, function done () {
          opts = {
            orders: data
          };
          callback();
        });
      });
    }], function () {
      res.render('/admin/user', {
        data: user,
        orders: opts,
        call_data,
        busines_card,
        discount: user.discount,
        showPeriodSelect: 1,
        showStatusSelect: 1,
        startDate: startDate.format('DD-MM-YYYY'),
        endDate: endDate.format('DD-MM-YYYY'),
        status,
        select_statuses: order_prepare_status,
        report_content: url.parse(req.originalUrl).pathname,
        'X-content-container': '#main-content',
        user: req.getUser()
      });
    });
  });
};

exports.save_roles = function (req, res) {
  const prm = req.prm();

  db.query('select as_user_save_new_roles(:_user_id, :_new_roles)', {
    _user_id: prm.user_id,
    _new_roles: getActiveCheckbox(prm)
  }, function (err) {
    if (err) {
      log.warn('problem on save_roles', err);
      res.json({
        type: 'response',
        errors: [err],
        success: !err
      });
    } else {
      res.json({
        type: 'response',
        errors: [],
        success: true,
        data: {
          notification: 'Роли успешно сохранены.'
        }
      });
    }
  });
};

exports.save_delivery_types = function (req, res) {
  const prm = req.prm();

  db.query('select as_user_save_delivery_types(:_user_id, :_dtypes)', {
    _user_id: prm.user_id,
    _dtypes: getActiveCheckbox(prm)
  }, function (err) {
    if (err) {
      log.warn('problem on save_delivery_types', err);
      res.json({
        type: 'response',
        errors: [err],
        success: !err
      });
    } else {
      res.json({
        type: 'response',
        errors: [],
        success: true,
        data: {
          notification: 'Виды доставок успешно сохранены.'
        }
      });
    }
  });
};

exports.save_manager_group = function (req, res) {
  const prm = req.prm();

  async.auto({
    remove_old_access: callback => {
      db.query(`
        delete from as_user2manager_group where user_id = :_user_id
      `, {
        _user_id: prm.user_id
      }, err => {
        callback(err);
      });
    },
    add_new_access: ['remove_old_access', callback => {
      async.eachSeries(getActiveCheckbox(prm), (item, next) => {
        if (!item) {
          next();
        } else {
          db.query(`
            insert into as_user2manager_group (
              user_id
              ,group_id
            ) values (
              :user_id
              ,:group_id
            )
          `, {
            user_id: prm.user_id,
            group_id: parseInt(item, 10)
          }, err => {
            next(err);
          });
        }
      }, err => {
        callback(err);
      });
    }]
  }, err => {
    if (err) {
      log.warn('problem on save_manager_group', err);
      res.json({
        type: 'response',
        errors: [err],
        success: !err
      });
    } else {
      res.json({
        type: 'response',
        errors: [],
        success: true,
        data: {
          notification: 'Сохранено.'
        }
      });
    }
  });
};

exports.save_widget_access = function (req, res) {
  const prm = req.prm();

  async.auto({
    remove_old_access: callback => {
      db.query(`
        delete from as_manager_access_widget where user_id = :_user_id
      `, {
        _user_id: prm.user_id
      }, err => {
        callback(err);
      });
    },
    add_new_access: ['remove_old_access', callback => {
      async.eachSeries(getActiveCheckbox(prm), (item, next) => {
        if (!item) {
          next();
        } else {
          db.query(`
            insert into as_manager_access_widget (
              user_id
              ,source_id
            ) values (
              :user_id
              ,(select id from as_widget_source where prefix = :prefix)
            )
          `, {
            user_id: prm.user_id,
            prefix: item
          }, err => {
            next(err);
          });
        }
      }, err => {
        callback(err);
      });
    }]
  }, err => {
    if (err) {
      log.warn('problem on save_widget_access', err);
      res.json({
        type: 'response',
        errors: [err],
        success: !err
      });
    } else {
      res.json({
        type: 'response',
        errors: [],
        success: true,
        data: {
          notification: 'Доступы успешно сохранены.'
        }
      });
    }
  });
};

exports.save_user_deps = function (req, res) {
  const prm = req.prm();

  async.auto({
    remove_old_access: callback => {
      db.query(`
        delete from as_user2dep where user_id = :_user_id
      `, {
        _user_id: prm.user_id
      }, err => {
        callback(err);
      });
    },
    add_new_access: ['remove_old_access', callback => {
      async.eachSeries(getActiveCheckbox(prm), (item, next) => {
        if (!item) {
          next();
        } else {
          db.query(`
            insert into as_user2dep (
              user_id
              ,dep_id
            ) values (
              :user_id
              ,:dep_id
            )
          `, {
            user_id: prm.user_id,
            dep_id: parseInt(item, 10)
          }, err => {
            next(err);
          });
        }
      }, err => {
        callback(err);
      });
    }]
  }, err => {
    if (err) {
      log.warn('problem on save_user_deps', err);
      res.json({
        type: 'response',
        errors: [err],
        success: !err
      });
    } else {
      res.json({
        type: 'response',
        errors: [],
        success: true,
        data: {
          notification: 'Сохранено.'
        }
      });
    }
  });
};

exports.save_user_template = function (req, res) {
  const prm = req.prm();

  async.auto({
    remove_old_access: callback => {
      db.query(`
        delete from as_user2template where user_id = :_user_id
      `, {
        _user_id: prm.user_id
      }, err => {
        callback(err);
      });
    },
    add_new_access: ['remove_old_access', callback => {
      async.eachSeries(getActiveCheckbox(prm), (item, next) => {
        if (!item) {
          next();
        } else {
          db.query(`
            insert into as_user2template (
              user_id
              ,template_id
            ) values (
              :user_id
              ,:template_id
            )
          `, {
            user_id: prm.user_id,
            template_id: parseInt(item, 10)
          }, err => {
            next(err);
          });
        }
      }, err => {
        callback(err);
      });
    }]
  }, err => {
    if (err) {
      log.warn('problem on save_user_templates', err);
      res.json({
        type: 'response',
        errors: [err],
        success: !err
      });
    } else {
      res.json({
        type: 'response',
        errors: [],
        success: true,
        data: {
          notification: 'Сохранено.'
        }
      });
    }
  });
};

exports.user_get_logins = function (req, res) {
  const
    prm = req.prm();

  db.query(`
    select ul.login
          ,ul.id
      from as_user_login as ul
     where ul.user_id = :user_id
  `, {
    user_id: prm.user_id
  }, (err, data) => {
    res.renderDialog('/admin/user/user_login', {
      user_id: prm.user_id,
      logins: data.rows
    });
  });
};

exports.reset_password = function (req, res) {
  const
    prm = req.prm();

  db.query(`
    update as_user_login set hash=md5(:hash::text) where id=:login_id
  `, {
    login_id: prm.login_id,
    hash: prm.pwd
  }, () => {
    res.json({
      type: 'response',
      errors: [],
      success: true,
      data: {
        notification: 'Пароль сброшен.'
      }
    });
  });
};

exports.save_user_discount = function (req, res) {
  const prm = req.prm();

  async.auto({
    remove_old_access: callback => {
      db.query(`
        delete from as_user2discount where user_id = :_user_id
      `, {
        _user_id: prm.user_id
      }, err => {
        callback(err);
      });
    },
    add_new_access: ['remove_old_access', callback => {
      async.eachSeries(getActiveCheckbox(prm), (item, next) => {
        if (!item) {
          next();
        } else {
          db.query(`
            insert into as_user2discount (
              user_id
              ,discount_id
            ) values (
              :user_id
              ,:discount_id
            )
          `, {
            user_id: prm.user_id,
            discount_id: parseInt(item, 10)
          }, err => {
            next(err);
          });
        }
      }, err => {
        callback(err);
      });
    }]
  }, err => {
    if (err) {
      log.warn('problem on save_user_discount', err);
      res.json({
        type: 'response',
        errors: [err],
        success: !err
      });
    } else {
      res.json({
        type: 'response',
        errors: [],
        success: true,
        data: {
          notification: 'Сохранено.'
        }
      });
    }
  });
};
