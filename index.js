'use strict';

require('asparts.core.jade').addJadePath(require('path').resolve(__dirname, 'views'));

const
  Router      = require('asparts.core.router'),
  path        = require('path'),
  express     = require('express');

const
  bower_dir  = '.bower',
  static_opt = {
    index: 'index.false',
    dotfiles: 'ignore'
  };

const paths = [
  express.static(path.resolve(__dirname, 'static/source/js'), static_opt),
  express.static(path.resolve(__dirname, 'static/source/css'), static_opt),
  express.static(path.resolve(__dirname, bower_dir, 'datatables.net/js'), static_opt),
  express.static(path.resolve(__dirname, bower_dir, 'datatables.net-dt/css'), static_opt),
  express.static(path.resolve(__dirname, bower_dir, 'datatables.net-dt/images'), static_opt)

];

if (process.env.NODE_ENV === 'production') {
  paths.unshift(express.static(path.resolve(__dirname, 'static/dist/js'), static_opt));
  paths.unshift(express.static(path.resolve(__dirname, 'static/dist/css'), static_opt));
  paths.unshift(express.static(path.resolve(__dirname, 'static/dist/images'), static_opt));
}

paths.push();

const router = Router();

router.use('/admin/images', paths);
router.use('/admin/js', paths);
router.use('/admin/css', paths);
router.use(require('./lib/router'));

exports = module.exports = router;
