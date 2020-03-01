'use strict';
module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-eslint');
  grunt.loadNpmTasks('grunt-requirejs');
  const path = require('path');
  const bower = grunt.file.readJSON('.bowerrc');
  const relPathRJS = '../../..';
  function wrapRJSBower (fileName) {
    return path.join(relPathRJS, bower.directory, fileName);
  }
  // function wrapRJS (fileName) {
  //   return path.join(relPathRJS, fileName);
  // }
  // eslint-disable-next-line no-unused-vars
  function wrapBower (fileName) {
    return path.join(bower.directory, fileName);
  }

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    requirejs: {
      std: {
        options: {
          dir: 'static/dist/js',
          baseUrl: 'static/source/js',
          //mainConfigFile: 'static/source/js/app_prod.js',
          paths: {
            'jquery.dataTables.min.js': wrapRJSBower('/datatables.net/js/jquery.dataTables.min')
          },
          preserveLicenseComments: false,
          shim: {
            'jquery.dataTables.min.js': {
              deps: [
                'jquery'
              ]
            }
          },
          optimize: 'uglify2',
          uglify2: {
            //Example of a specialized config. If you are fine
            //with the default options, no need to specify
            //any of these properties.
            output: {
              beautify: false
            },
            'max-line-len': 100,
            compress: {
              sequences: false,
              global_defs: {
                DEBUG: false,
                PRODUCTION: true
              }
            },
            comments: '/@foo/',
            warnings: true,
            mangle: false
          },
          onBuildWrite (moduleName, path, contents) {
              //Always return a value.
              //This is just a contrived example.
            return contents.replace(/this.container.children('.modal')/g, '$(this.container).children(\'.modal\')');
          }/*,
          modules: [
            //First set up the common build layer.
            {
              //module names are relative to baseUrl
              name: 'catalog',
              include: [
              ]
            }
          ]*/
        }
      }
    },
    cssmin: {
      css: {
        options: {
          keepSpecialComments: 0
        },
        files: {
          'static/dist/css/jquery.dataTables.min.css': [
            'static/source/css/jquery.dataTables.min.css'
          ]
        }
      }
    },
    eslint: {
      server: {
        options: {
          jshintrc: '.eslintrc'
        },
        files: {
          src: ['lib/**/*.js', '*.js']
        }
      }
    }
  });
  grunt.registerTask('build', ['requirejs', 'cssmin']);
  grunt.registerTask('check', ['eslint']);
  grunt.registerTask('default', ['build', 'check']);
};
