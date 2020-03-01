/* global define*/
'use strict';
define('/admin/js/manager.js', [
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
      ajax: '/admin/manager/get',
      columnDefs: [
        {
          targets: 0,
          data: 'fio',
          render: function (data, type, full) {
            return '<a target="_blank" href="/admin/user/' + full.id + '">' + data + '</a>';
          }
        },
        {
          targets: 1,
          data: 'phone_int',
          render: function (data) {
            return data;
          }
        },
        {
          targets: 2,
          data: 'phone',
          render: function (data) {
            return data;
          }
        },
        {
          targets: 3,
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
          targets: 4,
          data: 'icq',
          render: function (data) {
            return data;
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
