/* global define*/
'use strict';
define('/admin/js/users.js', [
  'jquery',
  '/admin/js/jquery.dataTables.min.js',
  '/admin/js/dataTables.bootstrap.min.js',
  'core/css'
], function ($, datatables, datatables_bt, css) {
  css.load('/admin/css/jquery.dataTables.min.css');
  function init_table () {
    $('.table__DataTable').DataTable({
      buttons: [],
      info: true,
      ajax: '/admin/user/get',
      columnDefs: [
        {
          targets: 0,
          data: 'fio',
          render: function (data, type, full) {
            var name = '';
            if (full.user_type == 113111) {
              name = data;
            } else {
              name = full.le_short_name;
            }
            return '<a target="_blank" href="/admin/user/' + full.id + '">' + name + '</a>';
          }
        },
        {
          targets: 1,
          data: 'phone',
          render: function (data) {
            return data;
          }
        },
        {
          targets: 2,
          data: 'email',
          render: function (data) {
            var render = '';
            if (data) {
              render = '<a href="mailto:' + data + '">' + data + '</a>';
            }
            return render;
          }
        },
        {
          targets: 3,
          data: 'discount',
          render: function (data) {
            return data;
          }
        },
        {
          targets: 4,
          data: 'user_type',
          render: function (data) {
            var type = '';
            if (data == 113111) {
              type = 'Физическое лицо';
            } else if (data == 113112) {
              type = 'Индивидуальный предприниматель';
            } else if (data == 113113) {
              type = 'Юридическое лицо';
            }
            return type;
          }
        },
        {
          targets: 5,
          sortable: false,
          render: function (data, type, full) {
            return '<i class="content-link fa fa-user" href="/admin/user/' + full.id+ '/get-logins"></i>';
          }
        }
      ],
      deferRender: true,
      responsive: true,
      fixedHeader: true,
      pageLength: 50,
      processing: true,
      language: {
        processing: '<span class="fa fa-spinner fa-pulse"></span> Идет загрузка',
        lengthMenu: 'Показать _MENU_ записей на страницу',
        zeroRecords: 'Нечего не найдено',
        info: 'Страница _PAGE_ из _PAGES_',
        infoEmpty: 'Пусто',
        search: 'Поиск:',
        infoFiltered: '',
        paginate: {
          first: '<<',
          last: '>>',
          next: '>',
          previous: '<'
        }
      }
    });
  }
  return init_table;
});
