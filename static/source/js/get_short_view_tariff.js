/* global define*/
'use strict';
define('/admin/js/get_short_view_tariff.js', [
  'jquery',
  'core/content'
], function ($, content) {
  return function () {
    content.fetch({
      type: 'post',
      silent: 1,
      url: '/admin/get_short_view_tariff'
    });
  };
});
