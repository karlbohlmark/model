
/**
 * Module dependencies.
 */

var Emitter = require('emitter')
  , JSON = require('json')
  , each = require('each')
  , noop = function(){};

/**
 * Mixin emitter.
 */

Emitter(exports);

/**
 * Register an error `msg` on `attr`.
 *
 * @param {String} attr
 * @param {String} msg
 * @return {Object} self
 * @api public
 */

exports.error = function(attr, msg){
  this.errors.push({
    attr: attr,
    message: msg
  });
  return this;
};

/**
 * Check if this model is new.
 *
 * @return {Boolean}
 * @api public
 */

exports.isNew = function(){
  var key = this.model.primaryKey;
  return ! this.has(key);
};

/**
 * Get / set the primary key.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api public
 */

exports.primary = function(val){
  var key = this.model.primaryKey;
  if (0 == arguments.length) return this[key]();
  return this[key](val);
};

/**
 * Validate the model and return a boolean.
 *
 * Example:
 *
 *    user.isValid()
 *    // => false
 *
 *    user.errors
 *    // => [{ attr: ..., message: ... }]
 *
 * @return {Boolean}
 * @api public
 */

exports.isValid = function(){
  this.validate();
  return 0 == this.errors.length;
};

/**
 * Return `false` or an object
 * containing the "dirty" attributes.
 *
 * @return {Object|Boolean}
 * @api public
 */

exports.changed = function(){
  var dirty = this.dirty;
  if (Object.keys(dirty).length) return dirty;
  return false;
};

/**
 * Perform validations.
 *
 * @api private
 */

exports.validate = function(){
  var self = this;
  var fns = this.model.validators;
  this.errors = [];
  each(fns, function(fn){ fn(self) });
};

/**
 * Destroy the model and mark it as `.destroyed`.
 *
 * Events:
 *
 *  - `destroy` on deletion
 *
 * @param {Function} fn
 * @api public
 */

exports.destroy = function(fn){
  if (this.isNew()) return fn(new Error('not saved'));
  var self = this;
  var url = this.url();
  fn = fn || noop;
  this.request('DELETE', url, function(err, res){
    if (err) return fn(err);
    self.emit('destroy');
    self.destroyed = true;
    fn();
  });
};

/**
 * Save and invoke `fn(err)`.
 *
 * Events:
 *
 *  - `save` on updates and saves
 *  - `update` on updates only
 *
 * @param {Function} fn
 * @api public
 */

exports.save = function(fn){
  if (!this.isNew()) return this.update(fn);
  var self = this;
  var url = this.model.url();
  fn = fn || noop;
  if (!this.isValid()) return fn(new Error('validation failed'));
  this.request('POST', url, function(err, res){
    if (err) return fn(err);
    if (res.body) self.primary(res.body.id);
    self.dirty = {};
    self.emit('save');
    fn();
  });
};

/**
 * Update and invoke `fn(err)`.
 *
 * @param {Function} fn
 * @api private
 */

exports.update = function(fn){
  var self = this;
  var url = this.url();
  fn = fn || noop;
  if (!this.isValid()) return fn(new Error('validation failed'));
  this.request('PUT', url, function(err){
    if (err) return fn(err);
    self.dirty = {};
    self.emit('update');
    fn();
  });
};

/**
 * Return a url for `path` relative to this model.
 *
 * Example:
 *
 *    var user = new User({ id: 5 });
 *    user.url('edit');
 *    // => "/users/5/edit"
 *
 * @param {String} path
 * @return {String}
 * @api public
 */

exports.url = function(path){
  var model = this.model;
  var url = model.base;
  var id = this.primary();
  if (0 == arguments.length) return url + '/' + id;
  return url + '/' + id + '/' + path;
};

/**
 * Perform request `method` against `url` and invoke `fn(res)`.
 *
 * TODO: replace with superagent and add testssss
 *
 * @param {String} method
 * @param {String} url
 * @param {Function} fn
 * @api private
 */

exports.request = function(method, url, fn){
  var self = this;
  var json = JSON.stringify(this);
  var req = new XMLHttpRequest;
  req.open(method, url, true);
  req.setRequestHeader('Content-Type', 'application/json');
  req.onreadystatechange = function(){
    if (4 == req.readyState) {
      var status = req.status / 100 | 0;
      var type = (req.getResponseHeader('Content-Type') || '').split(';')[0];
      var json = 'application/json' == type;
      if (2 == status) {
        if (json) req.body = JSON.parse(req.responseText);
        fn(null, req);
      } else {
        
      }
    }
  };
  req.send(json);
};

/**
 * Set multiple `attrs`.
 *
 * @param {Object} attrs
 * @return {Object} self
 * @api public
 */

exports.set = function(attrs){
  for (var key in attrs) {
    this[key](attrs[key]);
  }
  return this;
};

/**
 * Get `attr` value.
 *
 * @param {String} attr
 * @return {Mixed}
 * @api public
 */

exports.get = function(attr){
  return this.attrs[attr];
};

/**
 * Check if `attr` is present (not `null` or `undefined`).
 *
 * @param {String} attr
 * @return {Boolean}
 * @api public
 */

exports.has = function(attr){
  return null != this.attrs[attr];
};

/**
 * Return the JSON representation of the model.
 *
 * @return {Object}
 * @api public
 */

exports.toJSON = function(){
  return this.attrs;
};