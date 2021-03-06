/* jshint undef: true */
var request = require('request');
var async = require('async');
var fs = require('fs');
var _ = require('lodash');
_.str = require('underscore.string');
var async = require('async');
var extend = require('extend');
var argv = require('optimist').argv;
var joinr = require('joinr');

// MongoDB prefix queries are painful without this
RegExp.quote = require("regexp-quote");

/**
 *
 * @class Implements the main Apostrophe object. You typically have need only one per project, although you may have more. Due to the size of this module most methods are broken up into
 * individual files; this is not the complete list.
 */
function Apos() {
  var self = this;

  self.tasks = {};

  // Apostrophe is an event emitter/receiver
  require('events').EventEmitter.call(self);

  // An Apostrophe project could easily have numerous
  // page types all curious about events like "diff".
  // 1000 is unlikely but that's the point.
  self.setMaxListeners(1000);

  require('./migration.js')(self);

  require('./i18n.js')(self);

  require('./password.js')(self);

  require('./templates.js')(self);

  require('./pages.js')(self);

  require('./areas.js')(self);

  require('./permissions.js')(self);

  require('./prune.js')(self);

  require('./build.js')(self);

  require('./sanitize.js')(self);

  require('./appy.js')(self);

  require('./mongodb.js')(self);

  require('./utils.js')(self);

  require('./joinr.js')(self);

  require('./migrationTools.js')(self);

  require('./cache.js')(self);

  // Respond with a 500 error

  self.fail = function(req, res) {
    res.statusCode = 500;
    res.send('500 error, URL was ' + req.url);
  };

  // Respond with a 403 forbidden error

  self.forbid = function(res) {
    res.statusCode = 403;
    res.send('Forbidden');
  };

  // Respond with a 404 not found error

  self.notfound = function(req, res) {
    res.statusCode = 404;
    res.send('404 not found error, URL was ' + req.url);
  };

  // Generate a globally unique ID

  self.generateId = function() {
    // TODO use something better, although this is not meant to be
    // ultra cryptographically secure
    return Math.floor(Math.random() * 1000000000) + '' + Math.floor(Math.random() * 1000000000);
  };

  var assets = require('./assets.js');
  assets.construct(self);

  // Functionality related to the content area editor
  var editor = require('./editor.js');
  editor.construct(self);

  var files = require('./files.js');
  files.construct(self);

  var tags = require('./tags.js');
  tags.construct(self);

  require('./emailMixin.js')(self);

  require('./tasks.js')(self);

  // Initialize the Apostrophe object. Required options: `app` (Express application),
  // `uploadfs` (an instance of uploadfs for file management), `db` (a mongodb-native
  // database object). TODO: document additional options; however, note that the
  // `apostrophe-site` module already takes care of most of these graciously.

  self.init = function(options, callback) {

    self.app = options.app;

    self.fileGroups = options.fileGroups || self.fileGroups;

    self.uploadfs = options.uploadfs;

    self.options = options;

    self.db = options.db;

    self.lockups = options.lockups;

    self.afterGet = options.afterGet;

    // TODO this option isn't a great idea since the need for compatibility with
    // other methods in permissions.js is not clear
    if (options.permissions) {
      self.permissions = options.permissions;
    }

    if (options.controls) {
      self.defaultControls = options.controls;
    }

    // An id for this particular process that should be unique
    // even in a multiple server environment
    self._pid = self.generateId();

    // These files have already added methods and now need to do additional
    // work after other things are ready

    assets.init(self);

    files.init(self);

    require('./push.js')(self);

    editor.init(self);

    tags.init(self);

    // These files are loaded late so they can see other methods already
    // added, and/or self.options

    require('./aposLocals.js')(self);

    require('./videos.js')(self);

    require('./search.js')(self);

    _.each(options.locals || [], function(local, name) {
      self.addLocal(name, local);
    });

    // Given `page` and `total` query string parameters, render a pager.
    // `total` is the total number of pages, not the total number of items.
    // Browser-side javascript uses this route to render pagers without
    // code duplication
    self.app.get('/apos/pager', function(req, res) {
      return res.send(self.partial('pager', req.query));
    });

    if (self.uploadfs) {
      self.pushGlobalData({
        uploadsUrl: self.uploadfs.getUrl()
      });
    }

    self.pushGlobalData({
      mediaLibrary: self.options.mediaLibrary || {}
    });
    // Let the browser know about lockups so the editor can figure out
    // what's allowed where
    if (self.lockups) {
      self.pushGlobalData({
        lockups: self.lockups
      });
    }

    return self.initCollections(callback);
  };
}

// Required because EventEmitter is built on prototypal inheritance,
// calling the constructor is not enough
require('util').inherits(Apos, require('events').EventEmitter);

module.exports = function() {
  return new Apos();
};

