import { app, screen as screen$1, BrowserWindow, ipcMain } from "electron";
import { EventEmitter } from "events";
import require$$1 from "os";
import cp, { exec } from "child_process";
import path$1 from "node:path";
import * as fs$2 from "fs";
import fs__default from "fs";
import require$$0 from "constants";
import require$$0$1 from "stream";
import require$$4 from "util";
import require$$5 from "assert";
import * as path from "path";
import path__default from "path";
import WebSocket from "ws";
import https from "https";
import axios from "axios";
import { Region, screen, Point, mouse, Button } from "@nut-tree-fork/nut-js";
import sharp from "sharp";
import cv from "@techstark/opencv-js";
import { createWorker, PSM } from "tesseract.js";
import Store from "electron-store";
import { is, optimizer } from "@electron-toolkit/utils";
import { UiohookKey, uIOhook } from "uiohook-napi";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var lib = { exports: {} };
var fs$1 = {};
var universalify = {};
var hasRequiredUniversalify;
function requireUniversalify() {
  if (hasRequiredUniversalify) return universalify;
  hasRequiredUniversalify = 1;
  universalify.fromCallback = function(fn) {
    return Object.defineProperty(function() {
      if (typeof arguments[arguments.length - 1] === "function") fn.apply(this, arguments);
      else {
        return new Promise((resolve, reject) => {
          arguments[arguments.length] = (err, res) => {
            if (err) return reject(err);
            resolve(res);
          };
          arguments.length++;
          fn.apply(this, arguments);
        });
      }
    }, "name", { value: fn.name });
  };
  universalify.fromPromise = function(fn) {
    return Object.defineProperty(function() {
      const cb = arguments[arguments.length - 1];
      if (typeof cb !== "function") return fn.apply(this, arguments);
      else fn.apply(this, arguments).then((r) => cb(null, r), cb);
    }, "name", { value: fn.name });
  };
  return universalify;
}
var polyfills;
var hasRequiredPolyfills;
function requirePolyfills() {
  if (hasRequiredPolyfills) return polyfills;
  hasRequiredPolyfills = 1;
  var constants = require$$0;
  var origCwd = process.cwd;
  var cwd = null;
  var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;
  process.cwd = function() {
    if (!cwd)
      cwd = origCwd.call(process);
    return cwd;
  };
  try {
    process.cwd();
  } catch (er) {
  }
  if (typeof process.chdir === "function") {
    var chdir = process.chdir;
    process.chdir = function(d) {
      cwd = null;
      chdir.call(process, d);
    };
    if (Object.setPrototypeOf) Object.setPrototypeOf(process.chdir, chdir);
  }
  polyfills = patch;
  function patch(fs2) {
    if (constants.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
      patchLchmod(fs2);
    }
    if (!fs2.lutimes) {
      patchLutimes(fs2);
    }
    fs2.chown = chownFix(fs2.chown);
    fs2.fchown = chownFix(fs2.fchown);
    fs2.lchown = chownFix(fs2.lchown);
    fs2.chmod = chmodFix(fs2.chmod);
    fs2.fchmod = chmodFix(fs2.fchmod);
    fs2.lchmod = chmodFix(fs2.lchmod);
    fs2.chownSync = chownFixSync(fs2.chownSync);
    fs2.fchownSync = chownFixSync(fs2.fchownSync);
    fs2.lchownSync = chownFixSync(fs2.lchownSync);
    fs2.chmodSync = chmodFixSync(fs2.chmodSync);
    fs2.fchmodSync = chmodFixSync(fs2.fchmodSync);
    fs2.lchmodSync = chmodFixSync(fs2.lchmodSync);
    fs2.stat = statFix(fs2.stat);
    fs2.fstat = statFix(fs2.fstat);
    fs2.lstat = statFix(fs2.lstat);
    fs2.statSync = statFixSync(fs2.statSync);
    fs2.fstatSync = statFixSync(fs2.fstatSync);
    fs2.lstatSync = statFixSync(fs2.lstatSync);
    if (fs2.chmod && !fs2.lchmod) {
      fs2.lchmod = function(path2, mode, cb) {
        if (cb) process.nextTick(cb);
      };
      fs2.lchmodSync = function() {
      };
    }
    if (fs2.chown && !fs2.lchown) {
      fs2.lchown = function(path2, uid, gid, cb) {
        if (cb) process.nextTick(cb);
      };
      fs2.lchownSync = function() {
      };
    }
    if (platform === "win32") {
      fs2.rename = typeof fs2.rename !== "function" ? fs2.rename : (function(fs$rename) {
        function rename(from, to, cb) {
          var start = Date.now();
          var backoff = 0;
          fs$rename(from, to, function CB(er) {
            if (er && (er.code === "EACCES" || er.code === "EPERM" || er.code === "EBUSY") && Date.now() - start < 6e4) {
              setTimeout(function() {
                fs2.stat(to, function(stater, st) {
                  if (stater && stater.code === "ENOENT")
                    fs$rename(from, to, CB);
                  else
                    cb(er);
                });
              }, backoff);
              if (backoff < 100)
                backoff += 10;
              return;
            }
            if (cb) cb(er);
          });
        }
        if (Object.setPrototypeOf) Object.setPrototypeOf(rename, fs$rename);
        return rename;
      })(fs2.rename);
    }
    fs2.read = typeof fs2.read !== "function" ? fs2.read : (function(fs$read) {
      function read(fd, buffer2, offset, length, position, callback_) {
        var callback;
        if (callback_ && typeof callback_ === "function") {
          var eagCounter = 0;
          callback = function(er, _, __) {
            if (er && er.code === "EAGAIN" && eagCounter < 10) {
              eagCounter++;
              return fs$read.call(fs2, fd, buffer2, offset, length, position, callback);
            }
            callback_.apply(this, arguments);
          };
        }
        return fs$read.call(fs2, fd, buffer2, offset, length, position, callback);
      }
      if (Object.setPrototypeOf) Object.setPrototypeOf(read, fs$read);
      return read;
    })(fs2.read);
    fs2.readSync = typeof fs2.readSync !== "function" ? fs2.readSync : /* @__PURE__ */ (function(fs$readSync) {
      return function(fd, buffer2, offset, length, position) {
        var eagCounter = 0;
        while (true) {
          try {
            return fs$readSync.call(fs2, fd, buffer2, offset, length, position);
          } catch (er) {
            if (er.code === "EAGAIN" && eagCounter < 10) {
              eagCounter++;
              continue;
            }
            throw er;
          }
        }
      };
    })(fs2.readSync);
    function patchLchmod(fs22) {
      fs22.lchmod = function(path2, mode, callback) {
        fs22.open(
          path2,
          constants.O_WRONLY | constants.O_SYMLINK,
          mode,
          function(err, fd) {
            if (err) {
              if (callback) callback(err);
              return;
            }
            fs22.fchmod(fd, mode, function(err2) {
              fs22.close(fd, function(err22) {
                if (callback) callback(err2 || err22);
              });
            });
          }
        );
      };
      fs22.lchmodSync = function(path2, mode) {
        var fd = fs22.openSync(path2, constants.O_WRONLY | constants.O_SYMLINK, mode);
        var threw = true;
        var ret;
        try {
          ret = fs22.fchmodSync(fd, mode);
          threw = false;
        } finally {
          if (threw) {
            try {
              fs22.closeSync(fd);
            } catch (er) {
            }
          } else {
            fs22.closeSync(fd);
          }
        }
        return ret;
      };
    }
    function patchLutimes(fs22) {
      if (constants.hasOwnProperty("O_SYMLINK") && fs22.futimes) {
        fs22.lutimes = function(path2, at, mt, cb) {
          fs22.open(path2, constants.O_SYMLINK, function(er, fd) {
            if (er) {
              if (cb) cb(er);
              return;
            }
            fs22.futimes(fd, at, mt, function(er2) {
              fs22.close(fd, function(er22) {
                if (cb) cb(er2 || er22);
              });
            });
          });
        };
        fs22.lutimesSync = function(path2, at, mt) {
          var fd = fs22.openSync(path2, constants.O_SYMLINK);
          var ret;
          var threw = true;
          try {
            ret = fs22.futimesSync(fd, at, mt);
            threw = false;
          } finally {
            if (threw) {
              try {
                fs22.closeSync(fd);
              } catch (er) {
              }
            } else {
              fs22.closeSync(fd);
            }
          }
          return ret;
        };
      } else if (fs22.futimes) {
        fs22.lutimes = function(_a, _b, _c, cb) {
          if (cb) process.nextTick(cb);
        };
        fs22.lutimesSync = function() {
        };
      }
    }
    function chmodFix(orig) {
      if (!orig) return orig;
      return function(target, mode, cb) {
        return orig.call(fs2, target, mode, function(er) {
          if (chownErOk(er)) er = null;
          if (cb) cb.apply(this, arguments);
        });
      };
    }
    function chmodFixSync(orig) {
      if (!orig) return orig;
      return function(target, mode) {
        try {
          return orig.call(fs2, target, mode);
        } catch (er) {
          if (!chownErOk(er)) throw er;
        }
      };
    }
    function chownFix(orig) {
      if (!orig) return orig;
      return function(target, uid, gid, cb) {
        return orig.call(fs2, target, uid, gid, function(er) {
          if (chownErOk(er)) er = null;
          if (cb) cb.apply(this, arguments);
        });
      };
    }
    function chownFixSync(orig) {
      if (!orig) return orig;
      return function(target, uid, gid) {
        try {
          return orig.call(fs2, target, uid, gid);
        } catch (er) {
          if (!chownErOk(er)) throw er;
        }
      };
    }
    function statFix(orig) {
      if (!orig) return orig;
      return function(target, options, cb) {
        if (typeof options === "function") {
          cb = options;
          options = null;
        }
        function callback(er, stats) {
          if (stats) {
            if (stats.uid < 0) stats.uid += 4294967296;
            if (stats.gid < 0) stats.gid += 4294967296;
          }
          if (cb) cb.apply(this, arguments);
        }
        return options ? orig.call(fs2, target, options, callback) : orig.call(fs2, target, callback);
      };
    }
    function statFixSync(orig) {
      if (!orig) return orig;
      return function(target, options) {
        var stats = options ? orig.call(fs2, target, options) : orig.call(fs2, target);
        if (stats) {
          if (stats.uid < 0) stats.uid += 4294967296;
          if (stats.gid < 0) stats.gid += 4294967296;
        }
        return stats;
      };
    }
    function chownErOk(er) {
      if (!er)
        return true;
      if (er.code === "ENOSYS")
        return true;
      var nonroot = !process.getuid || process.getuid() !== 0;
      if (nonroot) {
        if (er.code === "EINVAL" || er.code === "EPERM")
          return true;
      }
      return false;
    }
  }
  return polyfills;
}
var legacyStreams;
var hasRequiredLegacyStreams;
function requireLegacyStreams() {
  if (hasRequiredLegacyStreams) return legacyStreams;
  hasRequiredLegacyStreams = 1;
  var Stream = require$$0$1.Stream;
  legacyStreams = legacy;
  function legacy(fs2) {
    return {
      ReadStream,
      WriteStream
    };
    function ReadStream(path2, options) {
      if (!(this instanceof ReadStream)) return new ReadStream(path2, options);
      Stream.call(this);
      var self2 = this;
      this.path = path2;
      this.fd = null;
      this.readable = true;
      this.paused = false;
      this.flags = "r";
      this.mode = 438;
      this.bufferSize = 64 * 1024;
      options = options || {};
      var keys = Object.keys(options);
      for (var index = 0, length = keys.length; index < length; index++) {
        var key = keys[index];
        this[key] = options[key];
      }
      if (this.encoding) this.setEncoding(this.encoding);
      if (this.start !== void 0) {
        if ("number" !== typeof this.start) {
          throw TypeError("start must be a Number");
        }
        if (this.end === void 0) {
          this.end = Infinity;
        } else if ("number" !== typeof this.end) {
          throw TypeError("end must be a Number");
        }
        if (this.start > this.end) {
          throw new Error("start must be <= end");
        }
        this.pos = this.start;
      }
      if (this.fd !== null) {
        process.nextTick(function() {
          self2._read();
        });
        return;
      }
      fs2.open(this.path, this.flags, this.mode, function(err, fd) {
        if (err) {
          self2.emit("error", err);
          self2.readable = false;
          return;
        }
        self2.fd = fd;
        self2.emit("open", fd);
        self2._read();
      });
    }
    function WriteStream(path2, options) {
      if (!(this instanceof WriteStream)) return new WriteStream(path2, options);
      Stream.call(this);
      this.path = path2;
      this.fd = null;
      this.writable = true;
      this.flags = "w";
      this.encoding = "binary";
      this.mode = 438;
      this.bytesWritten = 0;
      options = options || {};
      var keys = Object.keys(options);
      for (var index = 0, length = keys.length; index < length; index++) {
        var key = keys[index];
        this[key] = options[key];
      }
      if (this.start !== void 0) {
        if ("number" !== typeof this.start) {
          throw TypeError("start must be a Number");
        }
        if (this.start < 0) {
          throw new Error("start must be >= zero");
        }
        this.pos = this.start;
      }
      this.busy = false;
      this._queue = [];
      if (this.fd === null) {
        this._open = fs2.open;
        this._queue.push([this._open, this.path, this.flags, this.mode, void 0]);
        this.flush();
      }
    }
  }
  return legacyStreams;
}
var clone_1;
var hasRequiredClone;
function requireClone() {
  if (hasRequiredClone) return clone_1;
  hasRequiredClone = 1;
  clone_1 = clone;
  var getPrototypeOf = Object.getPrototypeOf || function(obj) {
    return obj.__proto__;
  };
  function clone(obj) {
    if (obj === null || typeof obj !== "object")
      return obj;
    if (obj instanceof Object)
      var copy2 = { __proto__: getPrototypeOf(obj) };
    else
      var copy2 = /* @__PURE__ */ Object.create(null);
    Object.getOwnPropertyNames(obj).forEach(function(key) {
      Object.defineProperty(copy2, key, Object.getOwnPropertyDescriptor(obj, key));
    });
    return copy2;
  }
  return clone_1;
}
var gracefulFs;
var hasRequiredGracefulFs;
function requireGracefulFs() {
  if (hasRequiredGracefulFs) return gracefulFs;
  hasRequiredGracefulFs = 1;
  var fs2 = fs__default;
  var polyfills2 = requirePolyfills();
  var legacy = requireLegacyStreams();
  var clone = requireClone();
  var util2 = require$$4;
  var gracefulQueue;
  var previousSymbol;
  if (typeof Symbol === "function" && typeof Symbol.for === "function") {
    gracefulQueue = Symbol.for("graceful-fs.queue");
    previousSymbol = Symbol.for("graceful-fs.previous");
  } else {
    gracefulQueue = "___graceful-fs.queue";
    previousSymbol = "___graceful-fs.previous";
  }
  function noop() {
  }
  function publishQueue(context, queue2) {
    Object.defineProperty(context, gracefulQueue, {
      get: function() {
        return queue2;
      }
    });
  }
  var debug = noop;
  if (util2.debuglog)
    debug = util2.debuglog("gfs4");
  else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ""))
    debug = function() {
      var m = util2.format.apply(util2, arguments);
      m = "GFS4: " + m.split(/\n/).join("\nGFS4: ");
      console.error(m);
    };
  if (!fs2[gracefulQueue]) {
    var queue = commonjsGlobal[gracefulQueue] || [];
    publishQueue(fs2, queue);
    fs2.close = (function(fs$close) {
      function close(fd, cb) {
        return fs$close.call(fs2, fd, function(err) {
          if (!err) {
            resetQueue();
          }
          if (typeof cb === "function")
            cb.apply(this, arguments);
        });
      }
      Object.defineProperty(close, previousSymbol, {
        value: fs$close
      });
      return close;
    })(fs2.close);
    fs2.closeSync = (function(fs$closeSync) {
      function closeSync(fd) {
        fs$closeSync.apply(fs2, arguments);
        resetQueue();
      }
      Object.defineProperty(closeSync, previousSymbol, {
        value: fs$closeSync
      });
      return closeSync;
    })(fs2.closeSync);
    if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || "")) {
      process.on("exit", function() {
        debug(fs2[gracefulQueue]);
        require$$5.equal(fs2[gracefulQueue].length, 0);
      });
    }
  }
  if (!commonjsGlobal[gracefulQueue]) {
    publishQueue(commonjsGlobal, fs2[gracefulQueue]);
  }
  gracefulFs = patch(clone(fs2));
  if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs2.__patched) {
    gracefulFs = patch(fs2);
    fs2.__patched = true;
  }
  function patch(fs22) {
    polyfills2(fs22);
    fs22.gracefulify = patch;
    fs22.createReadStream = createReadStream;
    fs22.createWriteStream = createWriteStream;
    var fs$readFile = fs22.readFile;
    fs22.readFile = readFile;
    function readFile(path2, options, cb) {
      if (typeof options === "function")
        cb = options, options = null;
      return go$readFile(path2, options, cb);
      function go$readFile(path22, options2, cb2, startTime) {
        return fs$readFile(path22, options2, function(err) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([go$readFile, [path22, options2, cb2], err, startTime || Date.now(), Date.now()]);
          else {
            if (typeof cb2 === "function")
              cb2.apply(this, arguments);
          }
        });
      }
    }
    var fs$writeFile = fs22.writeFile;
    fs22.writeFile = writeFile;
    function writeFile(path2, data, options, cb) {
      if (typeof options === "function")
        cb = options, options = null;
      return go$writeFile(path2, data, options, cb);
      function go$writeFile(path22, data2, options2, cb2, startTime) {
        return fs$writeFile(path22, data2, options2, function(err) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([go$writeFile, [path22, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
          else {
            if (typeof cb2 === "function")
              cb2.apply(this, arguments);
          }
        });
      }
    }
    var fs$appendFile = fs22.appendFile;
    if (fs$appendFile)
      fs22.appendFile = appendFile;
    function appendFile(path2, data, options, cb) {
      if (typeof options === "function")
        cb = options, options = null;
      return go$appendFile(path2, data, options, cb);
      function go$appendFile(path22, data2, options2, cb2, startTime) {
        return fs$appendFile(path22, data2, options2, function(err) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([go$appendFile, [path22, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
          else {
            if (typeof cb2 === "function")
              cb2.apply(this, arguments);
          }
        });
      }
    }
    var fs$copyFile = fs22.copyFile;
    if (fs$copyFile)
      fs22.copyFile = copyFile;
    function copyFile(src, dest, flags, cb) {
      if (typeof flags === "function") {
        cb = flags;
        flags = 0;
      }
      return go$copyFile(src, dest, flags, cb);
      function go$copyFile(src2, dest2, flags2, cb2, startTime) {
        return fs$copyFile(src2, dest2, flags2, function(err) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([go$copyFile, [src2, dest2, flags2, cb2], err, startTime || Date.now(), Date.now()]);
          else {
            if (typeof cb2 === "function")
              cb2.apply(this, arguments);
          }
        });
      }
    }
    var fs$readdir = fs22.readdir;
    fs22.readdir = readdir;
    var noReaddirOptionVersions = /^v[0-5]\./;
    function readdir(path2, options, cb) {
      if (typeof options === "function")
        cb = options, options = null;
      var go$readdir = noReaddirOptionVersions.test(process.version) ? function go$readdir2(path22, options2, cb2, startTime) {
        return fs$readdir(path22, fs$readdirCallback(
          path22,
          options2,
          cb2,
          startTime
        ));
      } : function go$readdir2(path22, options2, cb2, startTime) {
        return fs$readdir(path22, options2, fs$readdirCallback(
          path22,
          options2,
          cb2,
          startTime
        ));
      };
      return go$readdir(path2, options, cb);
      function fs$readdirCallback(path22, options2, cb2, startTime) {
        return function(err, files) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([
              go$readdir,
              [path22, options2, cb2],
              err,
              startTime || Date.now(),
              Date.now()
            ]);
          else {
            if (files && files.sort)
              files.sort();
            if (typeof cb2 === "function")
              cb2.call(this, err, files);
          }
        };
      }
    }
    if (process.version.substr(0, 4) === "v0.8") {
      var legStreams = legacy(fs22);
      ReadStream = legStreams.ReadStream;
      WriteStream = legStreams.WriteStream;
    }
    var fs$ReadStream = fs22.ReadStream;
    if (fs$ReadStream) {
      ReadStream.prototype = Object.create(fs$ReadStream.prototype);
      ReadStream.prototype.open = ReadStream$open;
    }
    var fs$WriteStream = fs22.WriteStream;
    if (fs$WriteStream) {
      WriteStream.prototype = Object.create(fs$WriteStream.prototype);
      WriteStream.prototype.open = WriteStream$open;
    }
    Object.defineProperty(fs22, "ReadStream", {
      get: function() {
        return ReadStream;
      },
      set: function(val) {
        ReadStream = val;
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(fs22, "WriteStream", {
      get: function() {
        return WriteStream;
      },
      set: function(val) {
        WriteStream = val;
      },
      enumerable: true,
      configurable: true
    });
    var FileReadStream = ReadStream;
    Object.defineProperty(fs22, "FileReadStream", {
      get: function() {
        return FileReadStream;
      },
      set: function(val) {
        FileReadStream = val;
      },
      enumerable: true,
      configurable: true
    });
    var FileWriteStream = WriteStream;
    Object.defineProperty(fs22, "FileWriteStream", {
      get: function() {
        return FileWriteStream;
      },
      set: function(val) {
        FileWriteStream = val;
      },
      enumerable: true,
      configurable: true
    });
    function ReadStream(path2, options) {
      if (this instanceof ReadStream)
        return fs$ReadStream.apply(this, arguments), this;
      else
        return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
    }
    function ReadStream$open() {
      var that = this;
      open(that.path, that.flags, that.mode, function(err, fd) {
        if (err) {
          if (that.autoClose)
            that.destroy();
          that.emit("error", err);
        } else {
          that.fd = fd;
          that.emit("open", fd);
          that.read();
        }
      });
    }
    function WriteStream(path2, options) {
      if (this instanceof WriteStream)
        return fs$WriteStream.apply(this, arguments), this;
      else
        return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
    }
    function WriteStream$open() {
      var that = this;
      open(that.path, that.flags, that.mode, function(err, fd) {
        if (err) {
          that.destroy();
          that.emit("error", err);
        } else {
          that.fd = fd;
          that.emit("open", fd);
        }
      });
    }
    function createReadStream(path2, options) {
      return new fs22.ReadStream(path2, options);
    }
    function createWriteStream(path2, options) {
      return new fs22.WriteStream(path2, options);
    }
    var fs$open = fs22.open;
    fs22.open = open;
    function open(path2, flags, mode, cb) {
      if (typeof mode === "function")
        cb = mode, mode = null;
      return go$open(path2, flags, mode, cb);
      function go$open(path22, flags2, mode2, cb2, startTime) {
        return fs$open(path22, flags2, mode2, function(err, fd) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([go$open, [path22, flags2, mode2, cb2], err, startTime || Date.now(), Date.now()]);
          else {
            if (typeof cb2 === "function")
              cb2.apply(this, arguments);
          }
        });
      }
    }
    return fs22;
  }
  function enqueue(elem) {
    debug("ENQUEUE", elem[0].name, elem[1]);
    fs2[gracefulQueue].push(elem);
    retry();
  }
  var retryTimer;
  function resetQueue() {
    var now = Date.now();
    for (var i = 0; i < fs2[gracefulQueue].length; ++i) {
      if (fs2[gracefulQueue][i].length > 2) {
        fs2[gracefulQueue][i][3] = now;
        fs2[gracefulQueue][i][4] = now;
      }
    }
    retry();
  }
  function retry() {
    clearTimeout(retryTimer);
    retryTimer = void 0;
    if (fs2[gracefulQueue].length === 0)
      return;
    var elem = fs2[gracefulQueue].shift();
    var fn = elem[0];
    var args = elem[1];
    var err = elem[2];
    var startTime = elem[3];
    var lastTime = elem[4];
    if (startTime === void 0) {
      debug("RETRY", fn.name, args);
      fn.apply(null, args);
    } else if (Date.now() - startTime >= 6e4) {
      debug("TIMEOUT", fn.name, args);
      var cb = args.pop();
      if (typeof cb === "function")
        cb.call(null, err);
    } else {
      var sinceAttempt = Date.now() - lastTime;
      var sinceStart = Math.max(lastTime - startTime, 1);
      var desiredDelay = Math.min(sinceStart * 1.2, 100);
      if (sinceAttempt >= desiredDelay) {
        debug("RETRY", fn.name, args);
        fn.apply(null, args.concat([startTime]));
      } else {
        fs2[gracefulQueue].push(elem);
      }
    }
    if (retryTimer === void 0) {
      retryTimer = setTimeout(retry, 0);
    }
  }
  return gracefulFs;
}
var hasRequiredFs;
function requireFs() {
  if (hasRequiredFs) return fs$1;
  hasRequiredFs = 1;
  (function(exports) {
    const u = requireUniversalify().fromCallback;
    const fs2 = requireGracefulFs();
    const api = [
      "access",
      "appendFile",
      "chmod",
      "chown",
      "close",
      "copyFile",
      "fchmod",
      "fchown",
      "fdatasync",
      "fstat",
      "fsync",
      "ftruncate",
      "futimes",
      "lchown",
      "lchmod",
      "link",
      "lstat",
      "mkdir",
      "mkdtemp",
      "open",
      "readFile",
      "readdir",
      "readlink",
      "realpath",
      "rename",
      "rmdir",
      "stat",
      "symlink",
      "truncate",
      "unlink",
      "utimes",
      "writeFile"
    ].filter((key) => {
      return typeof fs2[key] === "function";
    });
    Object.keys(fs2).forEach((key) => {
      if (key === "promises") {
        return;
      }
      exports[key] = fs2[key];
    });
    api.forEach((method) => {
      exports[method] = u(fs2[method]);
    });
    exports.exists = function(filename, callback) {
      if (typeof callback === "function") {
        return fs2.exists(filename, callback);
      }
      return new Promise((resolve) => {
        return fs2.exists(filename, resolve);
      });
    };
    exports.read = function(fd, buffer2, offset, length, position, callback) {
      if (typeof callback === "function") {
        return fs2.read(fd, buffer2, offset, length, position, callback);
      }
      return new Promise((resolve, reject) => {
        fs2.read(fd, buffer2, offset, length, position, (err, bytesRead, buffer3) => {
          if (err) return reject(err);
          resolve({ bytesRead, buffer: buffer3 });
        });
      });
    };
    exports.write = function(fd, buffer2, ...args) {
      if (typeof args[args.length - 1] === "function") {
        return fs2.write(fd, buffer2, ...args);
      }
      return new Promise((resolve, reject) => {
        fs2.write(fd, buffer2, ...args, (err, bytesWritten, buffer3) => {
          if (err) return reject(err);
          resolve({ bytesWritten, buffer: buffer3 });
        });
      });
    };
    if (typeof fs2.realpath.native === "function") {
      exports.realpath.native = u(fs2.realpath.native);
    }
  })(fs$1);
  return fs$1;
}
var win32;
var hasRequiredWin32;
function requireWin32() {
  if (hasRequiredWin32) return win32;
  hasRequiredWin32 = 1;
  const path2 = path__default;
  function getRootPath(p) {
    p = path2.normalize(path2.resolve(p)).split(path2.sep);
    if (p.length > 0) return p[0];
    return null;
  }
  const INVALID_PATH_CHARS = /[<>:"|?*]/;
  function invalidWin32Path(p) {
    const rp = getRootPath(p);
    p = p.replace(rp, "");
    return INVALID_PATH_CHARS.test(p);
  }
  win32 = {
    getRootPath,
    invalidWin32Path
  };
  return win32;
}
var mkdirs_1$1;
var hasRequiredMkdirs$1;
function requireMkdirs$1() {
  if (hasRequiredMkdirs$1) return mkdirs_1$1;
  hasRequiredMkdirs$1 = 1;
  const fs2 = requireGracefulFs();
  const path2 = path__default;
  const invalidWin32Path = requireWin32().invalidWin32Path;
  const o777 = parseInt("0777", 8);
  function mkdirs(p, opts, callback, made) {
    if (typeof opts === "function") {
      callback = opts;
      opts = {};
    } else if (!opts || typeof opts !== "object") {
      opts = { mode: opts };
    }
    if (process.platform === "win32" && invalidWin32Path(p)) {
      const errInval = new Error(p + " contains invalid WIN32 path characters.");
      errInval.code = "EINVAL";
      return callback(errInval);
    }
    let mode = opts.mode;
    const xfs = opts.fs || fs2;
    if (mode === void 0) {
      mode = o777 & ~process.umask();
    }
    if (!made) made = null;
    callback = callback || function() {
    };
    p = path2.resolve(p);
    xfs.mkdir(p, mode, (er) => {
      if (!er) {
        made = made || p;
        return callback(null, made);
      }
      switch (er.code) {
        case "ENOENT":
          if (path2.dirname(p) === p) return callback(er);
          mkdirs(path2.dirname(p), opts, (er2, made2) => {
            if (er2) callback(er2, made2);
            else mkdirs(p, opts, callback, made2);
          });
          break;
        // In the case of any other error, just see if there's a dir
        // there already.  If so, then hooray!  If not, then something
        // is borked.
        default:
          xfs.stat(p, (er2, stat2) => {
            if (er2 || !stat2.isDirectory()) callback(er, made);
            else callback(null, made);
          });
          break;
      }
    });
  }
  mkdirs_1$1 = mkdirs;
  return mkdirs_1$1;
}
var mkdirsSync_1;
var hasRequiredMkdirsSync;
function requireMkdirsSync() {
  if (hasRequiredMkdirsSync) return mkdirsSync_1;
  hasRequiredMkdirsSync = 1;
  const fs2 = requireGracefulFs();
  const path2 = path__default;
  const invalidWin32Path = requireWin32().invalidWin32Path;
  const o777 = parseInt("0777", 8);
  function mkdirsSync(p, opts, made) {
    if (!opts || typeof opts !== "object") {
      opts = { mode: opts };
    }
    let mode = opts.mode;
    const xfs = opts.fs || fs2;
    if (process.platform === "win32" && invalidWin32Path(p)) {
      const errInval = new Error(p + " contains invalid WIN32 path characters.");
      errInval.code = "EINVAL";
      throw errInval;
    }
    if (mode === void 0) {
      mode = o777 & ~process.umask();
    }
    if (!made) made = null;
    p = path2.resolve(p);
    try {
      xfs.mkdirSync(p, mode);
      made = made || p;
    } catch (err0) {
      if (err0.code === "ENOENT") {
        if (path2.dirname(p) === p) throw err0;
        made = mkdirsSync(path2.dirname(p), opts, made);
        mkdirsSync(p, opts, made);
      } else {
        let stat2;
        try {
          stat2 = xfs.statSync(p);
        } catch (err1) {
          throw err0;
        }
        if (!stat2.isDirectory()) throw err0;
      }
    }
    return made;
  }
  mkdirsSync_1 = mkdirsSync;
  return mkdirsSync_1;
}
var mkdirs_1;
var hasRequiredMkdirs;
function requireMkdirs() {
  if (hasRequiredMkdirs) return mkdirs_1;
  hasRequiredMkdirs = 1;
  const u = requireUniversalify().fromCallback;
  const mkdirs = u(requireMkdirs$1());
  const mkdirsSync = requireMkdirsSync();
  mkdirs_1 = {
    mkdirs,
    mkdirsSync,
    // alias
    mkdirp: mkdirs,
    mkdirpSync: mkdirsSync,
    ensureDir: mkdirs,
    ensureDirSync: mkdirsSync
  };
  return mkdirs_1;
}
var utimes;
var hasRequiredUtimes;
function requireUtimes() {
  if (hasRequiredUtimes) return utimes;
  hasRequiredUtimes = 1;
  const fs2 = requireGracefulFs();
  const os = require$$1;
  const path2 = path__default;
  function hasMillisResSync() {
    let tmpfile = path2.join("millis-test-sync" + Date.now().toString() + Math.random().toString().slice(2));
    tmpfile = path2.join(os.tmpdir(), tmpfile);
    const d = /* @__PURE__ */ new Date(1435410243862);
    fs2.writeFileSync(tmpfile, "https://github.com/jprichardson/node-fs-extra/pull/141");
    const fd = fs2.openSync(tmpfile, "r+");
    fs2.futimesSync(fd, d, d);
    fs2.closeSync(fd);
    return fs2.statSync(tmpfile).mtime > 1435410243e3;
  }
  function hasMillisRes(callback) {
    let tmpfile = path2.join("millis-test" + Date.now().toString() + Math.random().toString().slice(2));
    tmpfile = path2.join(os.tmpdir(), tmpfile);
    const d = /* @__PURE__ */ new Date(1435410243862);
    fs2.writeFile(tmpfile, "https://github.com/jprichardson/node-fs-extra/pull/141", (err) => {
      if (err) return callback(err);
      fs2.open(tmpfile, "r+", (err2, fd) => {
        if (err2) return callback(err2);
        fs2.futimes(fd, d, d, (err3) => {
          if (err3) return callback(err3);
          fs2.close(fd, (err4) => {
            if (err4) return callback(err4);
            fs2.stat(tmpfile, (err5, stats) => {
              if (err5) return callback(err5);
              callback(null, stats.mtime > 1435410243e3);
            });
          });
        });
      });
    });
  }
  function timeRemoveMillis(timestamp) {
    if (typeof timestamp === "number") {
      return Math.floor(timestamp / 1e3) * 1e3;
    } else if (timestamp instanceof Date) {
      return new Date(Math.floor(timestamp.getTime() / 1e3) * 1e3);
    } else {
      throw new Error("fs-extra: timeRemoveMillis() unknown parameter type");
    }
  }
  function utimesMillis(path3, atime, mtime, callback) {
    fs2.open(path3, "r+", (err, fd) => {
      if (err) return callback(err);
      fs2.futimes(fd, atime, mtime, (futimesErr) => {
        fs2.close(fd, (closeErr) => {
          if (callback) callback(futimesErr || closeErr);
        });
      });
    });
  }
  function utimesMillisSync(path3, atime, mtime) {
    const fd = fs2.openSync(path3, "r+");
    fs2.futimesSync(fd, atime, mtime);
    return fs2.closeSync(fd);
  }
  utimes = {
    hasMillisRes,
    hasMillisResSync,
    timeRemoveMillis,
    utimesMillis,
    utimesMillisSync
  };
  return utimes;
}
var stat;
var hasRequiredStat;
function requireStat() {
  if (hasRequiredStat) return stat;
  hasRequiredStat = 1;
  const fs2 = requireGracefulFs();
  const path2 = path__default;
  const NODE_VERSION_MAJOR_WITH_BIGINT = 10;
  const NODE_VERSION_MINOR_WITH_BIGINT = 5;
  const NODE_VERSION_PATCH_WITH_BIGINT = 0;
  const nodeVersion = process.versions.node.split(".");
  const nodeVersionMajor = Number.parseInt(nodeVersion[0], 10);
  const nodeVersionMinor = Number.parseInt(nodeVersion[1], 10);
  const nodeVersionPatch = Number.parseInt(nodeVersion[2], 10);
  function nodeSupportsBigInt() {
    if (nodeVersionMajor > NODE_VERSION_MAJOR_WITH_BIGINT) {
      return true;
    } else if (nodeVersionMajor === NODE_VERSION_MAJOR_WITH_BIGINT) {
      if (nodeVersionMinor > NODE_VERSION_MINOR_WITH_BIGINT) {
        return true;
      } else if (nodeVersionMinor === NODE_VERSION_MINOR_WITH_BIGINT) {
        if (nodeVersionPatch >= NODE_VERSION_PATCH_WITH_BIGINT) {
          return true;
        }
      }
    }
    return false;
  }
  function getStats(src, dest, cb) {
    if (nodeSupportsBigInt()) {
      fs2.stat(src, { bigint: true }, (err, srcStat) => {
        if (err) return cb(err);
        fs2.stat(dest, { bigint: true }, (err2, destStat) => {
          if (err2) {
            if (err2.code === "ENOENT") return cb(null, { srcStat, destStat: null });
            return cb(err2);
          }
          return cb(null, { srcStat, destStat });
        });
      });
    } else {
      fs2.stat(src, (err, srcStat) => {
        if (err) return cb(err);
        fs2.stat(dest, (err2, destStat) => {
          if (err2) {
            if (err2.code === "ENOENT") return cb(null, { srcStat, destStat: null });
            return cb(err2);
          }
          return cb(null, { srcStat, destStat });
        });
      });
    }
  }
  function getStatsSync(src, dest) {
    let srcStat, destStat;
    if (nodeSupportsBigInt()) {
      srcStat = fs2.statSync(src, { bigint: true });
    } else {
      srcStat = fs2.statSync(src);
    }
    try {
      if (nodeSupportsBigInt()) {
        destStat = fs2.statSync(dest, { bigint: true });
      } else {
        destStat = fs2.statSync(dest);
      }
    } catch (err) {
      if (err.code === "ENOENT") return { srcStat, destStat: null };
      throw err;
    }
    return { srcStat, destStat };
  }
  function checkPaths(src, dest, funcName, cb) {
    getStats(src, dest, (err, stats) => {
      if (err) return cb(err);
      const { srcStat, destStat } = stats;
      if (destStat && destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev) {
        return cb(new Error("Source and destination must not be the same."));
      }
      if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
        return cb(new Error(errMsg(src, dest, funcName)));
      }
      return cb(null, { srcStat, destStat });
    });
  }
  function checkPathsSync(src, dest, funcName) {
    const { srcStat, destStat } = getStatsSync(src, dest);
    if (destStat && destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev) {
      throw new Error("Source and destination must not be the same.");
    }
    if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
      throw new Error(errMsg(src, dest, funcName));
    }
    return { srcStat, destStat };
  }
  function checkParentPaths(src, srcStat, dest, funcName, cb) {
    const srcParent = path2.resolve(path2.dirname(src));
    const destParent = path2.resolve(path2.dirname(dest));
    if (destParent === srcParent || destParent === path2.parse(destParent).root) return cb();
    if (nodeSupportsBigInt()) {
      fs2.stat(destParent, { bigint: true }, (err, destStat) => {
        if (err) {
          if (err.code === "ENOENT") return cb();
          return cb(err);
        }
        if (destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev) {
          return cb(new Error(errMsg(src, dest, funcName)));
        }
        return checkParentPaths(src, srcStat, destParent, funcName, cb);
      });
    } else {
      fs2.stat(destParent, (err, destStat) => {
        if (err) {
          if (err.code === "ENOENT") return cb();
          return cb(err);
        }
        if (destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev) {
          return cb(new Error(errMsg(src, dest, funcName)));
        }
        return checkParentPaths(src, srcStat, destParent, funcName, cb);
      });
    }
  }
  function checkParentPathsSync(src, srcStat, dest, funcName) {
    const srcParent = path2.resolve(path2.dirname(src));
    const destParent = path2.resolve(path2.dirname(dest));
    if (destParent === srcParent || destParent === path2.parse(destParent).root) return;
    let destStat;
    try {
      if (nodeSupportsBigInt()) {
        destStat = fs2.statSync(destParent, { bigint: true });
      } else {
        destStat = fs2.statSync(destParent);
      }
    } catch (err) {
      if (err.code === "ENOENT") return;
      throw err;
    }
    if (destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev) {
      throw new Error(errMsg(src, dest, funcName));
    }
    return checkParentPathsSync(src, srcStat, destParent, funcName);
  }
  function isSrcSubdir(src, dest) {
    const srcArr = path2.resolve(src).split(path2.sep).filter((i) => i);
    const destArr = path2.resolve(dest).split(path2.sep).filter((i) => i);
    return srcArr.reduce((acc, cur, i) => acc && destArr[i] === cur, true);
  }
  function errMsg(src, dest, funcName) {
    return `Cannot ${funcName} '${src}' to a subdirectory of itself, '${dest}'.`;
  }
  stat = {
    checkPaths,
    checkPathsSync,
    checkParentPaths,
    checkParentPathsSync,
    isSrcSubdir
  };
  return stat;
}
var buffer;
var hasRequiredBuffer;
function requireBuffer() {
  if (hasRequiredBuffer) return buffer;
  hasRequiredBuffer = 1;
  buffer = function(size) {
    if (typeof Buffer.allocUnsafe === "function") {
      try {
        return Buffer.allocUnsafe(size);
      } catch (e) {
        return new Buffer(size);
      }
    }
    return new Buffer(size);
  };
  return buffer;
}
var copySync_1;
var hasRequiredCopySync$1;
function requireCopySync$1() {
  if (hasRequiredCopySync$1) return copySync_1;
  hasRequiredCopySync$1 = 1;
  const fs2 = requireGracefulFs();
  const path2 = path__default;
  const mkdirpSync = requireMkdirs().mkdirsSync;
  const utimesSync = requireUtimes().utimesMillisSync;
  const stat2 = requireStat();
  function copySync2(src, dest, opts) {
    if (typeof opts === "function") {
      opts = { filter: opts };
    }
    opts = opts || {};
    opts.clobber = "clobber" in opts ? !!opts.clobber : true;
    opts.overwrite = "overwrite" in opts ? !!opts.overwrite : opts.clobber;
    if (opts.preserveTimestamps && process.arch === "ia32") {
      console.warn(`fs-extra: Using the preserveTimestamps option in 32-bit node is not recommended;

    see https://github.com/jprichardson/node-fs-extra/issues/269`);
    }
    const { srcStat, destStat } = stat2.checkPathsSync(src, dest, "copy");
    stat2.checkParentPathsSync(src, srcStat, dest, "copy");
    return handleFilterAndCopy(destStat, src, dest, opts);
  }
  function handleFilterAndCopy(destStat, src, dest, opts) {
    if (opts.filter && !opts.filter(src, dest)) return;
    const destParent = path2.dirname(dest);
    if (!fs2.existsSync(destParent)) mkdirpSync(destParent);
    return startCopy(destStat, src, dest, opts);
  }
  function startCopy(destStat, src, dest, opts) {
    if (opts.filter && !opts.filter(src, dest)) return;
    return getStats(destStat, src, dest, opts);
  }
  function getStats(destStat, src, dest, opts) {
    const statSync = opts.dereference ? fs2.statSync : fs2.lstatSync;
    const srcStat = statSync(src);
    if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts);
    else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) return onFile(srcStat, destStat, src, dest, opts);
    else if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts);
  }
  function onFile(srcStat, destStat, src, dest, opts) {
    if (!destStat) return copyFile(srcStat, src, dest, opts);
    return mayCopyFile(srcStat, src, dest, opts);
  }
  function mayCopyFile(srcStat, src, dest, opts) {
    if (opts.overwrite) {
      fs2.unlinkSync(dest);
      return copyFile(srcStat, src, dest, opts);
    } else if (opts.errorOnExist) {
      throw new Error(`'${dest}' already exists`);
    }
  }
  function copyFile(srcStat, src, dest, opts) {
    if (typeof fs2.copyFileSync === "function") {
      fs2.copyFileSync(src, dest);
      fs2.chmodSync(dest, srcStat.mode);
      if (opts.preserveTimestamps) {
        return utimesSync(dest, srcStat.atime, srcStat.mtime);
      }
      return;
    }
    return copyFileFallback(srcStat, src, dest, opts);
  }
  function copyFileFallback(srcStat, src, dest, opts) {
    const BUF_LENGTH = 64 * 1024;
    const _buff = requireBuffer()(BUF_LENGTH);
    const fdr = fs2.openSync(src, "r");
    const fdw = fs2.openSync(dest, "w", srcStat.mode);
    let pos = 0;
    while (pos < srcStat.size) {
      const bytesRead = fs2.readSync(fdr, _buff, 0, BUF_LENGTH, pos);
      fs2.writeSync(fdw, _buff, 0, bytesRead);
      pos += bytesRead;
    }
    if (opts.preserveTimestamps) fs2.futimesSync(fdw, srcStat.atime, srcStat.mtime);
    fs2.closeSync(fdr);
    fs2.closeSync(fdw);
  }
  function onDir(srcStat, destStat, src, dest, opts) {
    if (!destStat) return mkDirAndCopy(srcStat, src, dest, opts);
    if (destStat && !destStat.isDirectory()) {
      throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`);
    }
    return copyDir(src, dest, opts);
  }
  function mkDirAndCopy(srcStat, src, dest, opts) {
    fs2.mkdirSync(dest);
    copyDir(src, dest, opts);
    return fs2.chmodSync(dest, srcStat.mode);
  }
  function copyDir(src, dest, opts) {
    fs2.readdirSync(src).forEach((item) => copyDirItem(item, src, dest, opts));
  }
  function copyDirItem(item, src, dest, opts) {
    const srcItem = path2.join(src, item);
    const destItem = path2.join(dest, item);
    const { destStat } = stat2.checkPathsSync(srcItem, destItem, "copy");
    return startCopy(destStat, srcItem, destItem, opts);
  }
  function onLink(destStat, src, dest, opts) {
    let resolvedSrc = fs2.readlinkSync(src);
    if (opts.dereference) {
      resolvedSrc = path2.resolve(process.cwd(), resolvedSrc);
    }
    if (!destStat) {
      return fs2.symlinkSync(resolvedSrc, dest);
    } else {
      let resolvedDest;
      try {
        resolvedDest = fs2.readlinkSync(dest);
      } catch (err) {
        if (err.code === "EINVAL" || err.code === "UNKNOWN") return fs2.symlinkSync(resolvedSrc, dest);
        throw err;
      }
      if (opts.dereference) {
        resolvedDest = path2.resolve(process.cwd(), resolvedDest);
      }
      if (stat2.isSrcSubdir(resolvedSrc, resolvedDest)) {
        throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`);
      }
      if (fs2.statSync(dest).isDirectory() && stat2.isSrcSubdir(resolvedDest, resolvedSrc)) {
        throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`);
      }
      return copyLink(resolvedSrc, dest);
    }
  }
  function copyLink(resolvedSrc, dest) {
    fs2.unlinkSync(dest);
    return fs2.symlinkSync(resolvedSrc, dest);
  }
  copySync_1 = copySync2;
  return copySync_1;
}
var copySync;
var hasRequiredCopySync;
function requireCopySync() {
  if (hasRequiredCopySync) return copySync;
  hasRequiredCopySync = 1;
  copySync = {
    copySync: requireCopySync$1()
  };
  return copySync;
}
var pathExists_1;
var hasRequiredPathExists;
function requirePathExists() {
  if (hasRequiredPathExists) return pathExists_1;
  hasRequiredPathExists = 1;
  const u = requireUniversalify().fromPromise;
  const fs2 = requireFs();
  function pathExists(path2) {
    return fs2.access(path2).then(() => true).catch(() => false);
  }
  pathExists_1 = {
    pathExists: u(pathExists),
    pathExistsSync: fs2.existsSync
  };
  return pathExists_1;
}
var copy_1;
var hasRequiredCopy$1;
function requireCopy$1() {
  if (hasRequiredCopy$1) return copy_1;
  hasRequiredCopy$1 = 1;
  const fs2 = requireGracefulFs();
  const path2 = path__default;
  const mkdirp = requireMkdirs().mkdirs;
  const pathExists = requirePathExists().pathExists;
  const utimes2 = requireUtimes().utimesMillis;
  const stat2 = requireStat();
  function copy2(src, dest, opts, cb) {
    if (typeof opts === "function" && !cb) {
      cb = opts;
      opts = {};
    } else if (typeof opts === "function") {
      opts = { filter: opts };
    }
    cb = cb || function() {
    };
    opts = opts || {};
    opts.clobber = "clobber" in opts ? !!opts.clobber : true;
    opts.overwrite = "overwrite" in opts ? !!opts.overwrite : opts.clobber;
    if (opts.preserveTimestamps && process.arch === "ia32") {
      console.warn(`fs-extra: Using the preserveTimestamps option in 32-bit node is not recommended;

    see https://github.com/jprichardson/node-fs-extra/issues/269`);
    }
    stat2.checkPaths(src, dest, "copy", (err, stats) => {
      if (err) return cb(err);
      const { srcStat, destStat } = stats;
      stat2.checkParentPaths(src, srcStat, dest, "copy", (err2) => {
        if (err2) return cb(err2);
        if (opts.filter) return handleFilter(checkParentDir, destStat, src, dest, opts, cb);
        return checkParentDir(destStat, src, dest, opts, cb);
      });
    });
  }
  function checkParentDir(destStat, src, dest, opts, cb) {
    const destParent = path2.dirname(dest);
    pathExists(destParent, (err, dirExists) => {
      if (err) return cb(err);
      if (dirExists) return startCopy(destStat, src, dest, opts, cb);
      mkdirp(destParent, (err2) => {
        if (err2) return cb(err2);
        return startCopy(destStat, src, dest, opts, cb);
      });
    });
  }
  function handleFilter(onInclude, destStat, src, dest, opts, cb) {
    Promise.resolve(opts.filter(src, dest)).then((include) => {
      if (include) return onInclude(destStat, src, dest, opts, cb);
      return cb();
    }, (error) => cb(error));
  }
  function startCopy(destStat, src, dest, opts, cb) {
    if (opts.filter) return handleFilter(getStats, destStat, src, dest, opts, cb);
    return getStats(destStat, src, dest, opts, cb);
  }
  function getStats(destStat, src, dest, opts, cb) {
    const stat3 = opts.dereference ? fs2.stat : fs2.lstat;
    stat3(src, (err, srcStat) => {
      if (err) return cb(err);
      if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts, cb);
      else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) return onFile(srcStat, destStat, src, dest, opts, cb);
      else if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts, cb);
    });
  }
  function onFile(srcStat, destStat, src, dest, opts, cb) {
    if (!destStat) return copyFile(srcStat, src, dest, opts, cb);
    return mayCopyFile(srcStat, src, dest, opts, cb);
  }
  function mayCopyFile(srcStat, src, dest, opts, cb) {
    if (opts.overwrite) {
      fs2.unlink(dest, (err) => {
        if (err) return cb(err);
        return copyFile(srcStat, src, dest, opts, cb);
      });
    } else if (opts.errorOnExist) {
      return cb(new Error(`'${dest}' already exists`));
    } else return cb();
  }
  function copyFile(srcStat, src, dest, opts, cb) {
    if (typeof fs2.copyFile === "function") {
      return fs2.copyFile(src, dest, (err) => {
        if (err) return cb(err);
        return setDestModeAndTimestamps(srcStat, dest, opts, cb);
      });
    }
    return copyFileFallback(srcStat, src, dest, opts, cb);
  }
  function copyFileFallback(srcStat, src, dest, opts, cb) {
    const rs = fs2.createReadStream(src);
    rs.on("error", (err) => cb(err)).once("open", () => {
      const ws = fs2.createWriteStream(dest, { mode: srcStat.mode });
      ws.on("error", (err) => cb(err)).on("open", () => rs.pipe(ws)).once("close", () => setDestModeAndTimestamps(srcStat, dest, opts, cb));
    });
  }
  function setDestModeAndTimestamps(srcStat, dest, opts, cb) {
    fs2.chmod(dest, srcStat.mode, (err) => {
      if (err) return cb(err);
      if (opts.preserveTimestamps) {
        return utimes2(dest, srcStat.atime, srcStat.mtime, cb);
      }
      return cb();
    });
  }
  function onDir(srcStat, destStat, src, dest, opts, cb) {
    if (!destStat) return mkDirAndCopy(srcStat, src, dest, opts, cb);
    if (destStat && !destStat.isDirectory()) {
      return cb(new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`));
    }
    return copyDir(src, dest, opts, cb);
  }
  function mkDirAndCopy(srcStat, src, dest, opts, cb) {
    fs2.mkdir(dest, (err) => {
      if (err) return cb(err);
      copyDir(src, dest, opts, (err2) => {
        if (err2) return cb(err2);
        return fs2.chmod(dest, srcStat.mode, cb);
      });
    });
  }
  function copyDir(src, dest, opts, cb) {
    fs2.readdir(src, (err, items) => {
      if (err) return cb(err);
      return copyDirItems(items, src, dest, opts, cb);
    });
  }
  function copyDirItems(items, src, dest, opts, cb) {
    const item = items.pop();
    if (!item) return cb();
    return copyDirItem(items, item, src, dest, opts, cb);
  }
  function copyDirItem(items, item, src, dest, opts, cb) {
    const srcItem = path2.join(src, item);
    const destItem = path2.join(dest, item);
    stat2.checkPaths(srcItem, destItem, "copy", (err, stats) => {
      if (err) return cb(err);
      const { destStat } = stats;
      startCopy(destStat, srcItem, destItem, opts, (err2) => {
        if (err2) return cb(err2);
        return copyDirItems(items, src, dest, opts, cb);
      });
    });
  }
  function onLink(destStat, src, dest, opts, cb) {
    fs2.readlink(src, (err, resolvedSrc) => {
      if (err) return cb(err);
      if (opts.dereference) {
        resolvedSrc = path2.resolve(process.cwd(), resolvedSrc);
      }
      if (!destStat) {
        return fs2.symlink(resolvedSrc, dest, cb);
      } else {
        fs2.readlink(dest, (err2, resolvedDest) => {
          if (err2) {
            if (err2.code === "EINVAL" || err2.code === "UNKNOWN") return fs2.symlink(resolvedSrc, dest, cb);
            return cb(err2);
          }
          if (opts.dereference) {
            resolvedDest = path2.resolve(process.cwd(), resolvedDest);
          }
          if (stat2.isSrcSubdir(resolvedSrc, resolvedDest)) {
            return cb(new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`));
          }
          if (destStat.isDirectory() && stat2.isSrcSubdir(resolvedDest, resolvedSrc)) {
            return cb(new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`));
          }
          return copyLink(resolvedSrc, dest, cb);
        });
      }
    });
  }
  function copyLink(resolvedSrc, dest, cb) {
    fs2.unlink(dest, (err) => {
      if (err) return cb(err);
      return fs2.symlink(resolvedSrc, dest, cb);
    });
  }
  copy_1 = copy2;
  return copy_1;
}
var copy;
var hasRequiredCopy;
function requireCopy() {
  if (hasRequiredCopy) return copy;
  hasRequiredCopy = 1;
  const u = requireUniversalify().fromCallback;
  copy = {
    copy: u(requireCopy$1())
  };
  return copy;
}
var rimraf_1;
var hasRequiredRimraf;
function requireRimraf() {
  if (hasRequiredRimraf) return rimraf_1;
  hasRequiredRimraf = 1;
  const fs2 = requireGracefulFs();
  const path2 = path__default;
  const assert = require$$5;
  const isWindows = process.platform === "win32";
  function defaults(options) {
    const methods = [
      "unlink",
      "chmod",
      "stat",
      "lstat",
      "rmdir",
      "readdir"
    ];
    methods.forEach((m) => {
      options[m] = options[m] || fs2[m];
      m = m + "Sync";
      options[m] = options[m] || fs2[m];
    });
    options.maxBusyTries = options.maxBusyTries || 3;
  }
  function rimraf(p, options, cb) {
    let busyTries = 0;
    if (typeof options === "function") {
      cb = options;
      options = {};
    }
    assert(p, "rimraf: missing path");
    assert.strictEqual(typeof p, "string", "rimraf: path should be a string");
    assert.strictEqual(typeof cb, "function", "rimraf: callback function required");
    assert(options, "rimraf: invalid options argument provided");
    assert.strictEqual(typeof options, "object", "rimraf: options should be object");
    defaults(options);
    rimraf_(p, options, function CB(er) {
      if (er) {
        if ((er.code === "EBUSY" || er.code === "ENOTEMPTY" || er.code === "EPERM") && busyTries < options.maxBusyTries) {
          busyTries++;
          const time = busyTries * 100;
          return setTimeout(() => rimraf_(p, options, CB), time);
        }
        if (er.code === "ENOENT") er = null;
      }
      cb(er);
    });
  }
  function rimraf_(p, options, cb) {
    assert(p);
    assert(options);
    assert(typeof cb === "function");
    options.lstat(p, (er, st) => {
      if (er && er.code === "ENOENT") {
        return cb(null);
      }
      if (er && er.code === "EPERM" && isWindows) {
        return fixWinEPERM(p, options, er, cb);
      }
      if (st && st.isDirectory()) {
        return rmdir(p, options, er, cb);
      }
      options.unlink(p, (er2) => {
        if (er2) {
          if (er2.code === "ENOENT") {
            return cb(null);
          }
          if (er2.code === "EPERM") {
            return isWindows ? fixWinEPERM(p, options, er2, cb) : rmdir(p, options, er2, cb);
          }
          if (er2.code === "EISDIR") {
            return rmdir(p, options, er2, cb);
          }
        }
        return cb(er2);
      });
    });
  }
  function fixWinEPERM(p, options, er, cb) {
    assert(p);
    assert(options);
    assert(typeof cb === "function");
    if (er) {
      assert(er instanceof Error);
    }
    options.chmod(p, 438, (er2) => {
      if (er2) {
        cb(er2.code === "ENOENT" ? null : er);
      } else {
        options.stat(p, (er3, stats) => {
          if (er3) {
            cb(er3.code === "ENOENT" ? null : er);
          } else if (stats.isDirectory()) {
            rmdir(p, options, er, cb);
          } else {
            options.unlink(p, cb);
          }
        });
      }
    });
  }
  function fixWinEPERMSync(p, options, er) {
    let stats;
    assert(p);
    assert(options);
    if (er) {
      assert(er instanceof Error);
    }
    try {
      options.chmodSync(p, 438);
    } catch (er2) {
      if (er2.code === "ENOENT") {
        return;
      } else {
        throw er;
      }
    }
    try {
      stats = options.statSync(p);
    } catch (er3) {
      if (er3.code === "ENOENT") {
        return;
      } else {
        throw er;
      }
    }
    if (stats.isDirectory()) {
      rmdirSync(p, options, er);
    } else {
      options.unlinkSync(p);
    }
  }
  function rmdir(p, options, originalEr, cb) {
    assert(p);
    assert(options);
    if (originalEr) {
      assert(originalEr instanceof Error);
    }
    assert(typeof cb === "function");
    options.rmdir(p, (er) => {
      if (er && (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM")) {
        rmkids(p, options, cb);
      } else if (er && er.code === "ENOTDIR") {
        cb(originalEr);
      } else {
        cb(er);
      }
    });
  }
  function rmkids(p, options, cb) {
    assert(p);
    assert(options);
    assert(typeof cb === "function");
    options.readdir(p, (er, files) => {
      if (er) return cb(er);
      let n = files.length;
      let errState;
      if (n === 0) return options.rmdir(p, cb);
      files.forEach((f) => {
        rimraf(path2.join(p, f), options, (er2) => {
          if (errState) {
            return;
          }
          if (er2) return cb(errState = er2);
          if (--n === 0) {
            options.rmdir(p, cb);
          }
        });
      });
    });
  }
  function rimrafSync(p, options) {
    let st;
    options = options || {};
    defaults(options);
    assert(p, "rimraf: missing path");
    assert.strictEqual(typeof p, "string", "rimraf: path should be a string");
    assert(options, "rimraf: missing options");
    assert.strictEqual(typeof options, "object", "rimraf: options should be object");
    try {
      st = options.lstatSync(p);
    } catch (er) {
      if (er.code === "ENOENT") {
        return;
      }
      if (er.code === "EPERM" && isWindows) {
        fixWinEPERMSync(p, options, er);
      }
    }
    try {
      if (st && st.isDirectory()) {
        rmdirSync(p, options, null);
      } else {
        options.unlinkSync(p);
      }
    } catch (er) {
      if (er.code === "ENOENT") {
        return;
      } else if (er.code === "EPERM") {
        return isWindows ? fixWinEPERMSync(p, options, er) : rmdirSync(p, options, er);
      } else if (er.code !== "EISDIR") {
        throw er;
      }
      rmdirSync(p, options, er);
    }
  }
  function rmdirSync(p, options, originalEr) {
    assert(p);
    assert(options);
    if (originalEr) {
      assert(originalEr instanceof Error);
    }
    try {
      options.rmdirSync(p);
    } catch (er) {
      if (er.code === "ENOTDIR") {
        throw originalEr;
      } else if (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM") {
        rmkidsSync(p, options);
      } else if (er.code !== "ENOENT") {
        throw er;
      }
    }
  }
  function rmkidsSync(p, options) {
    assert(p);
    assert(options);
    options.readdirSync(p).forEach((f) => rimrafSync(path2.join(p, f), options));
    if (isWindows) {
      const startTime = Date.now();
      do {
        try {
          const ret = options.rmdirSync(p, options);
          return ret;
        } catch (er) {
        }
      } while (Date.now() - startTime < 500);
    } else {
      const ret = options.rmdirSync(p, options);
      return ret;
    }
  }
  rimraf_1 = rimraf;
  rimraf.sync = rimrafSync;
  return rimraf_1;
}
var remove;
var hasRequiredRemove;
function requireRemove() {
  if (hasRequiredRemove) return remove;
  hasRequiredRemove = 1;
  const u = requireUniversalify().fromCallback;
  const rimraf = requireRimraf();
  remove = {
    remove: u(rimraf),
    removeSync: rimraf.sync
  };
  return remove;
}
var empty;
var hasRequiredEmpty;
function requireEmpty() {
  if (hasRequiredEmpty) return empty;
  hasRequiredEmpty = 1;
  const u = requireUniversalify().fromCallback;
  const fs2 = requireGracefulFs();
  const path2 = path__default;
  const mkdir = requireMkdirs();
  const remove2 = requireRemove();
  const emptyDir = u(function emptyDir2(dir, callback) {
    callback = callback || function() {
    };
    fs2.readdir(dir, (err, items) => {
      if (err) return mkdir.mkdirs(dir, callback);
      items = items.map((item) => path2.join(dir, item));
      deleteItem();
      function deleteItem() {
        const item = items.pop();
        if (!item) return callback();
        remove2.remove(item, (err2) => {
          if (err2) return callback(err2);
          deleteItem();
        });
      }
    });
  });
  function emptyDirSync(dir) {
    let items;
    try {
      items = fs2.readdirSync(dir);
    } catch (err) {
      return mkdir.mkdirsSync(dir);
    }
    items.forEach((item) => {
      item = path2.join(dir, item);
      remove2.removeSync(item);
    });
  }
  empty = {
    emptyDirSync,
    emptydirSync: emptyDirSync,
    emptyDir,
    emptydir: emptyDir
  };
  return empty;
}
var file;
var hasRequiredFile;
function requireFile() {
  if (hasRequiredFile) return file;
  hasRequiredFile = 1;
  const u = requireUniversalify().fromCallback;
  const path2 = path__default;
  const fs2 = requireGracefulFs();
  const mkdir = requireMkdirs();
  const pathExists = requirePathExists().pathExists;
  function createFile(file2, callback) {
    function makeFile() {
      fs2.writeFile(file2, "", (err) => {
        if (err) return callback(err);
        callback();
      });
    }
    fs2.stat(file2, (err, stats) => {
      if (!err && stats.isFile()) return callback();
      const dir = path2.dirname(file2);
      pathExists(dir, (err2, dirExists) => {
        if (err2) return callback(err2);
        if (dirExists) return makeFile();
        mkdir.mkdirs(dir, (err3) => {
          if (err3) return callback(err3);
          makeFile();
        });
      });
    });
  }
  function createFileSync(file2) {
    let stats;
    try {
      stats = fs2.statSync(file2);
    } catch (e) {
    }
    if (stats && stats.isFile()) return;
    const dir = path2.dirname(file2);
    if (!fs2.existsSync(dir)) {
      mkdir.mkdirsSync(dir);
    }
    fs2.writeFileSync(file2, "");
  }
  file = {
    createFile: u(createFile),
    createFileSync
  };
  return file;
}
var link;
var hasRequiredLink;
function requireLink() {
  if (hasRequiredLink) return link;
  hasRequiredLink = 1;
  const u = requireUniversalify().fromCallback;
  const path2 = path__default;
  const fs2 = requireGracefulFs();
  const mkdir = requireMkdirs();
  const pathExists = requirePathExists().pathExists;
  function createLink(srcpath, dstpath, callback) {
    function makeLink(srcpath2, dstpath2) {
      fs2.link(srcpath2, dstpath2, (err) => {
        if (err) return callback(err);
        callback(null);
      });
    }
    pathExists(dstpath, (err, destinationExists) => {
      if (err) return callback(err);
      if (destinationExists) return callback(null);
      fs2.lstat(srcpath, (err2) => {
        if (err2) {
          err2.message = err2.message.replace("lstat", "ensureLink");
          return callback(err2);
        }
        const dir = path2.dirname(dstpath);
        pathExists(dir, (err3, dirExists) => {
          if (err3) return callback(err3);
          if (dirExists) return makeLink(srcpath, dstpath);
          mkdir.mkdirs(dir, (err4) => {
            if (err4) return callback(err4);
            makeLink(srcpath, dstpath);
          });
        });
      });
    });
  }
  function createLinkSync(srcpath, dstpath) {
    const destinationExists = fs2.existsSync(dstpath);
    if (destinationExists) return void 0;
    try {
      fs2.lstatSync(srcpath);
    } catch (err) {
      err.message = err.message.replace("lstat", "ensureLink");
      throw err;
    }
    const dir = path2.dirname(dstpath);
    const dirExists = fs2.existsSync(dir);
    if (dirExists) return fs2.linkSync(srcpath, dstpath);
    mkdir.mkdirsSync(dir);
    return fs2.linkSync(srcpath, dstpath);
  }
  link = {
    createLink: u(createLink),
    createLinkSync
  };
  return link;
}
var symlinkPaths_1;
var hasRequiredSymlinkPaths;
function requireSymlinkPaths() {
  if (hasRequiredSymlinkPaths) return symlinkPaths_1;
  hasRequiredSymlinkPaths = 1;
  const path2 = path__default;
  const fs2 = requireGracefulFs();
  const pathExists = requirePathExists().pathExists;
  function symlinkPaths(srcpath, dstpath, callback) {
    if (path2.isAbsolute(srcpath)) {
      return fs2.lstat(srcpath, (err) => {
        if (err) {
          err.message = err.message.replace("lstat", "ensureSymlink");
          return callback(err);
        }
        return callback(null, {
          "toCwd": srcpath,
          "toDst": srcpath
        });
      });
    } else {
      const dstdir = path2.dirname(dstpath);
      const relativeToDst = path2.join(dstdir, srcpath);
      return pathExists(relativeToDst, (err, exists) => {
        if (err) return callback(err);
        if (exists) {
          return callback(null, {
            "toCwd": relativeToDst,
            "toDst": srcpath
          });
        } else {
          return fs2.lstat(srcpath, (err2) => {
            if (err2) {
              err2.message = err2.message.replace("lstat", "ensureSymlink");
              return callback(err2);
            }
            return callback(null, {
              "toCwd": srcpath,
              "toDst": path2.relative(dstdir, srcpath)
            });
          });
        }
      });
    }
  }
  function symlinkPathsSync(srcpath, dstpath) {
    let exists;
    if (path2.isAbsolute(srcpath)) {
      exists = fs2.existsSync(srcpath);
      if (!exists) throw new Error("absolute srcpath does not exist");
      return {
        "toCwd": srcpath,
        "toDst": srcpath
      };
    } else {
      const dstdir = path2.dirname(dstpath);
      const relativeToDst = path2.join(dstdir, srcpath);
      exists = fs2.existsSync(relativeToDst);
      if (exists) {
        return {
          "toCwd": relativeToDst,
          "toDst": srcpath
        };
      } else {
        exists = fs2.existsSync(srcpath);
        if (!exists) throw new Error("relative srcpath does not exist");
        return {
          "toCwd": srcpath,
          "toDst": path2.relative(dstdir, srcpath)
        };
      }
    }
  }
  symlinkPaths_1 = {
    symlinkPaths,
    symlinkPathsSync
  };
  return symlinkPaths_1;
}
var symlinkType_1;
var hasRequiredSymlinkType;
function requireSymlinkType() {
  if (hasRequiredSymlinkType) return symlinkType_1;
  hasRequiredSymlinkType = 1;
  const fs2 = requireGracefulFs();
  function symlinkType(srcpath, type, callback) {
    callback = typeof type === "function" ? type : callback;
    type = typeof type === "function" ? false : type;
    if (type) return callback(null, type);
    fs2.lstat(srcpath, (err, stats) => {
      if (err) return callback(null, "file");
      type = stats && stats.isDirectory() ? "dir" : "file";
      callback(null, type);
    });
  }
  function symlinkTypeSync(srcpath, type) {
    let stats;
    if (type) return type;
    try {
      stats = fs2.lstatSync(srcpath);
    } catch (e) {
      return "file";
    }
    return stats && stats.isDirectory() ? "dir" : "file";
  }
  symlinkType_1 = {
    symlinkType,
    symlinkTypeSync
  };
  return symlinkType_1;
}
var symlink;
var hasRequiredSymlink;
function requireSymlink() {
  if (hasRequiredSymlink) return symlink;
  hasRequiredSymlink = 1;
  const u = requireUniversalify().fromCallback;
  const path2 = path__default;
  const fs2 = requireGracefulFs();
  const _mkdirs = requireMkdirs();
  const mkdirs = _mkdirs.mkdirs;
  const mkdirsSync = _mkdirs.mkdirsSync;
  const _symlinkPaths = requireSymlinkPaths();
  const symlinkPaths = _symlinkPaths.symlinkPaths;
  const symlinkPathsSync = _symlinkPaths.symlinkPathsSync;
  const _symlinkType = requireSymlinkType();
  const symlinkType = _symlinkType.symlinkType;
  const symlinkTypeSync = _symlinkType.symlinkTypeSync;
  const pathExists = requirePathExists().pathExists;
  function createSymlink(srcpath, dstpath, type, callback) {
    callback = typeof type === "function" ? type : callback;
    type = typeof type === "function" ? false : type;
    pathExists(dstpath, (err, destinationExists) => {
      if (err) return callback(err);
      if (destinationExists) return callback(null);
      symlinkPaths(srcpath, dstpath, (err2, relative) => {
        if (err2) return callback(err2);
        srcpath = relative.toDst;
        symlinkType(relative.toCwd, type, (err3, type2) => {
          if (err3) return callback(err3);
          const dir = path2.dirname(dstpath);
          pathExists(dir, (err4, dirExists) => {
            if (err4) return callback(err4);
            if (dirExists) return fs2.symlink(srcpath, dstpath, type2, callback);
            mkdirs(dir, (err5) => {
              if (err5) return callback(err5);
              fs2.symlink(srcpath, dstpath, type2, callback);
            });
          });
        });
      });
    });
  }
  function createSymlinkSync(srcpath, dstpath, type) {
    const destinationExists = fs2.existsSync(dstpath);
    if (destinationExists) return void 0;
    const relative = symlinkPathsSync(srcpath, dstpath);
    srcpath = relative.toDst;
    type = symlinkTypeSync(relative.toCwd, type);
    const dir = path2.dirname(dstpath);
    const exists = fs2.existsSync(dir);
    if (exists) return fs2.symlinkSync(srcpath, dstpath, type);
    mkdirsSync(dir);
    return fs2.symlinkSync(srcpath, dstpath, type);
  }
  symlink = {
    createSymlink: u(createSymlink),
    createSymlinkSync
  };
  return symlink;
}
var ensure;
var hasRequiredEnsure;
function requireEnsure() {
  if (hasRequiredEnsure) return ensure;
  hasRequiredEnsure = 1;
  const file2 = requireFile();
  const link2 = requireLink();
  const symlink2 = requireSymlink();
  ensure = {
    // file
    createFile: file2.createFile,
    createFileSync: file2.createFileSync,
    ensureFile: file2.createFile,
    ensureFileSync: file2.createFileSync,
    // link
    createLink: link2.createLink,
    createLinkSync: link2.createLinkSync,
    ensureLink: link2.createLink,
    ensureLinkSync: link2.createLinkSync,
    // symlink
    createSymlink: symlink2.createSymlink,
    createSymlinkSync: symlink2.createSymlinkSync,
    ensureSymlink: symlink2.createSymlink,
    ensureSymlinkSync: symlink2.createSymlinkSync
  };
  return ensure;
}
var jsonfile_1;
var hasRequiredJsonfile$1;
function requireJsonfile$1() {
  if (hasRequiredJsonfile$1) return jsonfile_1;
  hasRequiredJsonfile$1 = 1;
  var _fs;
  try {
    _fs = requireGracefulFs();
  } catch (_) {
    _fs = fs__default;
  }
  function readFile(file2, options, callback) {
    if (callback == null) {
      callback = options;
      options = {};
    }
    if (typeof options === "string") {
      options = { encoding: options };
    }
    options = options || {};
    var fs2 = options.fs || _fs;
    var shouldThrow = true;
    if ("throws" in options) {
      shouldThrow = options.throws;
    }
    fs2.readFile(file2, options, function(err, data) {
      if (err) return callback(err);
      data = stripBom(data);
      var obj;
      try {
        obj = JSON.parse(data, options ? options.reviver : null);
      } catch (err2) {
        if (shouldThrow) {
          err2.message = file2 + ": " + err2.message;
          return callback(err2);
        } else {
          return callback(null, null);
        }
      }
      callback(null, obj);
    });
  }
  function readFileSync(file2, options) {
    options = options || {};
    if (typeof options === "string") {
      options = { encoding: options };
    }
    var fs2 = options.fs || _fs;
    var shouldThrow = true;
    if ("throws" in options) {
      shouldThrow = options.throws;
    }
    try {
      var content = fs2.readFileSync(file2, options);
      content = stripBom(content);
      return JSON.parse(content, options.reviver);
    } catch (err) {
      if (shouldThrow) {
        err.message = file2 + ": " + err.message;
        throw err;
      } else {
        return null;
      }
    }
  }
  function stringify(obj, options) {
    var spaces;
    var EOL = "\n";
    if (typeof options === "object" && options !== null) {
      if (options.spaces) {
        spaces = options.spaces;
      }
      if (options.EOL) {
        EOL = options.EOL;
      }
    }
    var str = JSON.stringify(obj, options ? options.replacer : null, spaces);
    return str.replace(/\n/g, EOL) + EOL;
  }
  function writeFile(file2, obj, options, callback) {
    if (callback == null) {
      callback = options;
      options = {};
    }
    options = options || {};
    var fs2 = options.fs || _fs;
    var str = "";
    try {
      str = stringify(obj, options);
    } catch (err) {
      if (callback) callback(err, null);
      return;
    }
    fs2.writeFile(file2, str, options, callback);
  }
  function writeFileSync(file2, obj, options) {
    options = options || {};
    var fs2 = options.fs || _fs;
    var str = stringify(obj, options);
    return fs2.writeFileSync(file2, str, options);
  }
  function stripBom(content) {
    if (Buffer.isBuffer(content)) content = content.toString("utf8");
    content = content.replace(/^\uFEFF/, "");
    return content;
  }
  var jsonfile2 = {
    readFile,
    readFileSync,
    writeFile,
    writeFileSync
  };
  jsonfile_1 = jsonfile2;
  return jsonfile_1;
}
var jsonfile;
var hasRequiredJsonfile;
function requireJsonfile() {
  if (hasRequiredJsonfile) return jsonfile;
  hasRequiredJsonfile = 1;
  const u = requireUniversalify().fromCallback;
  const jsonFile = requireJsonfile$1();
  jsonfile = {
    // jsonfile exports
    readJson: u(jsonFile.readFile),
    readJsonSync: jsonFile.readFileSync,
    writeJson: u(jsonFile.writeFile),
    writeJsonSync: jsonFile.writeFileSync
  };
  return jsonfile;
}
var outputJson_1;
var hasRequiredOutputJson;
function requireOutputJson() {
  if (hasRequiredOutputJson) return outputJson_1;
  hasRequiredOutputJson = 1;
  const path2 = path__default;
  const mkdir = requireMkdirs();
  const pathExists = requirePathExists().pathExists;
  const jsonFile = requireJsonfile();
  function outputJson(file2, data, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    const dir = path2.dirname(file2);
    pathExists(dir, (err, itDoes) => {
      if (err) return callback(err);
      if (itDoes) return jsonFile.writeJson(file2, data, options, callback);
      mkdir.mkdirs(dir, (err2) => {
        if (err2) return callback(err2);
        jsonFile.writeJson(file2, data, options, callback);
      });
    });
  }
  outputJson_1 = outputJson;
  return outputJson_1;
}
var outputJsonSync_1;
var hasRequiredOutputJsonSync;
function requireOutputJsonSync() {
  if (hasRequiredOutputJsonSync) return outputJsonSync_1;
  hasRequiredOutputJsonSync = 1;
  const fs2 = requireGracefulFs();
  const path2 = path__default;
  const mkdir = requireMkdirs();
  const jsonFile = requireJsonfile();
  function outputJsonSync(file2, data, options) {
    const dir = path2.dirname(file2);
    if (!fs2.existsSync(dir)) {
      mkdir.mkdirsSync(dir);
    }
    jsonFile.writeJsonSync(file2, data, options);
  }
  outputJsonSync_1 = outputJsonSync;
  return outputJsonSync_1;
}
var json;
var hasRequiredJson;
function requireJson() {
  if (hasRequiredJson) return json;
  hasRequiredJson = 1;
  const u = requireUniversalify().fromCallback;
  const jsonFile = requireJsonfile();
  jsonFile.outputJson = u(requireOutputJson());
  jsonFile.outputJsonSync = requireOutputJsonSync();
  jsonFile.outputJSON = jsonFile.outputJson;
  jsonFile.outputJSONSync = jsonFile.outputJsonSync;
  jsonFile.writeJSON = jsonFile.writeJson;
  jsonFile.writeJSONSync = jsonFile.writeJsonSync;
  jsonFile.readJSON = jsonFile.readJson;
  jsonFile.readJSONSync = jsonFile.readJsonSync;
  json = jsonFile;
  return json;
}
var moveSync_1;
var hasRequiredMoveSync$1;
function requireMoveSync$1() {
  if (hasRequiredMoveSync$1) return moveSync_1;
  hasRequiredMoveSync$1 = 1;
  const fs2 = requireGracefulFs();
  const path2 = path__default;
  const copySync2 = requireCopySync().copySync;
  const removeSync = requireRemove().removeSync;
  const mkdirpSync = requireMkdirs().mkdirpSync;
  const stat2 = requireStat();
  function moveSync2(src, dest, opts) {
    opts = opts || {};
    const overwrite = opts.overwrite || opts.clobber || false;
    const { srcStat } = stat2.checkPathsSync(src, dest, "move");
    stat2.checkParentPathsSync(src, srcStat, dest, "move");
    mkdirpSync(path2.dirname(dest));
    return doRename(src, dest, overwrite);
  }
  function doRename(src, dest, overwrite) {
    if (overwrite) {
      removeSync(dest);
      return rename(src, dest, overwrite);
    }
    if (fs2.existsSync(dest)) throw new Error("dest already exists.");
    return rename(src, dest, overwrite);
  }
  function rename(src, dest, overwrite) {
    try {
      fs2.renameSync(src, dest);
    } catch (err) {
      if (err.code !== "EXDEV") throw err;
      return moveAcrossDevice(src, dest, overwrite);
    }
  }
  function moveAcrossDevice(src, dest, overwrite) {
    const opts = {
      overwrite,
      errorOnExist: true
    };
    copySync2(src, dest, opts);
    return removeSync(src);
  }
  moveSync_1 = moveSync2;
  return moveSync_1;
}
var moveSync;
var hasRequiredMoveSync;
function requireMoveSync() {
  if (hasRequiredMoveSync) return moveSync;
  hasRequiredMoveSync = 1;
  moveSync = {
    moveSync: requireMoveSync$1()
  };
  return moveSync;
}
var move_1;
var hasRequiredMove$1;
function requireMove$1() {
  if (hasRequiredMove$1) return move_1;
  hasRequiredMove$1 = 1;
  const fs2 = requireGracefulFs();
  const path2 = path__default;
  const copy2 = requireCopy().copy;
  const remove2 = requireRemove().remove;
  const mkdirp = requireMkdirs().mkdirp;
  const pathExists = requirePathExists().pathExists;
  const stat2 = requireStat();
  function move2(src, dest, opts, cb) {
    if (typeof opts === "function") {
      cb = opts;
      opts = {};
    }
    const overwrite = opts.overwrite || opts.clobber || false;
    stat2.checkPaths(src, dest, "move", (err, stats) => {
      if (err) return cb(err);
      const { srcStat } = stats;
      stat2.checkParentPaths(src, srcStat, dest, "move", (err2) => {
        if (err2) return cb(err2);
        mkdirp(path2.dirname(dest), (err3) => {
          if (err3) return cb(err3);
          return doRename(src, dest, overwrite, cb);
        });
      });
    });
  }
  function doRename(src, dest, overwrite, cb) {
    if (overwrite) {
      return remove2(dest, (err) => {
        if (err) return cb(err);
        return rename(src, dest, overwrite, cb);
      });
    }
    pathExists(dest, (err, destExists) => {
      if (err) return cb(err);
      if (destExists) return cb(new Error("dest already exists."));
      return rename(src, dest, overwrite, cb);
    });
  }
  function rename(src, dest, overwrite, cb) {
    fs2.rename(src, dest, (err) => {
      if (!err) return cb();
      if (err.code !== "EXDEV") return cb(err);
      return moveAcrossDevice(src, dest, overwrite, cb);
    });
  }
  function moveAcrossDevice(src, dest, overwrite, cb) {
    const opts = {
      overwrite,
      errorOnExist: true
    };
    copy2(src, dest, opts, (err) => {
      if (err) return cb(err);
      return remove2(src, cb);
    });
  }
  move_1 = move2;
  return move_1;
}
var move;
var hasRequiredMove;
function requireMove() {
  if (hasRequiredMove) return move;
  hasRequiredMove = 1;
  const u = requireUniversalify().fromCallback;
  move = {
    move: u(requireMove$1())
  };
  return move;
}
var output;
var hasRequiredOutput;
function requireOutput() {
  if (hasRequiredOutput) return output;
  hasRequiredOutput = 1;
  const u = requireUniversalify().fromCallback;
  const fs2 = requireGracefulFs();
  const path2 = path__default;
  const mkdir = requireMkdirs();
  const pathExists = requirePathExists().pathExists;
  function outputFile(file2, data, encoding, callback) {
    if (typeof encoding === "function") {
      callback = encoding;
      encoding = "utf8";
    }
    const dir = path2.dirname(file2);
    pathExists(dir, (err, itDoes) => {
      if (err) return callback(err);
      if (itDoes) return fs2.writeFile(file2, data, encoding, callback);
      mkdir.mkdirs(dir, (err2) => {
        if (err2) return callback(err2);
        fs2.writeFile(file2, data, encoding, callback);
      });
    });
  }
  function outputFileSync(file2, ...args) {
    const dir = path2.dirname(file2);
    if (fs2.existsSync(dir)) {
      return fs2.writeFileSync(file2, ...args);
    }
    mkdir.mkdirsSync(dir);
    fs2.writeFileSync(file2, ...args);
  }
  output = {
    outputFile: u(outputFile),
    outputFileSync
  };
  return output;
}
var hasRequiredLib;
function requireLib() {
  if (hasRequiredLib) return lib.exports;
  hasRequiredLib = 1;
  (function(module) {
    module.exports = Object.assign(
      {},
      // Export promiseified graceful-fs:
      requireFs(),
      // Export extra methods:
      requireCopySync(),
      requireCopy(),
      requireEmpty(),
      requireEnsure(),
      requireJson(),
      requireMkdirs(),
      requireMoveSync(),
      requireMove(),
      requireOutput(),
      requirePathExists(),
      requireRemove()
    );
    const fs2 = fs__default;
    if (Object.getOwnPropertyDescriptor(fs2, "promises")) {
      Object.defineProperty(module.exports, "promises", {
        get() {
          return fs2.promises;
        }
      });
    }
  })(lib);
  return lib.exports;
}
var libExports = requireLib();
const fs = /* @__PURE__ */ getDefaultExportFromCjs(libExports);
const LOG_LEVEL_PRIORITY = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};
const LOG_LEVEL_COLORS = {
  debug: "\x1B[36m",
  // 青色
  info: "\x1B[32m",
  // 绿色
  warn: "\x1B[33m",
  // 黄色
  error: "\x1B[31m"
  // 红色
};
const COLOR_RESET = "\x1B[0m";
class Logger {
  static instance = null;
  window;
  /** 当前日志级别，低于此级别的日志不会输出 */
  minLevel = "debug";
  /** 是否启用时间戳 */
  enableTimestamp = true;
  /**
   * 获取 Logger 单例
   */
  static getInstance() {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  constructor() {
  }
  /**
   * 初始化 Logger
   * @param window Electron BrowserWindow 实例，用于向前端推送日志
   */
  init(window2) {
    this.window = window2;
  }
  /**
   * 设置最低日志级别
   * @param level 日志级别
   */
  setMinLevel(level) {
    this.minLevel = level;
  }
  /**
   * 设置是否启用时间戳
   * @param enable 是否启用
   */
  setTimestampEnabled(enable) {
    this.enableTimestamp = enable;
  }
  /**
   * 格式化时间戳
   * @returns 格式化的时间字符串 [HH:MM:SS.mmm]
   */
  getTimestamp() {
    if (!this.enableTimestamp) return "";
    const now = /* @__PURE__ */ new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    const ms = now.getMilliseconds().toString().padStart(3, "0");
    return `[${hours}:${minutes}:${seconds}.${ms}]`;
  }
  /**
   * 检查日志级别是否应该输出
   * @param level 要检查的日志级别
   */
  shouldLog(level) {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }
  /**
   * 输出 debug 级别日志
   * @param message 日志消息
   */
  debug(message) {
    this.log(message, "debug");
  }
  /**
   * 输出 info 级别日志
   * @param message 日志消息
   */
  info(message) {
    this.log(message, "info");
  }
  /**
   * 输出 warn 级别日志
   * @param message 日志消息
   * @param verboseOnly 是否仅在详细模式（debug 级别）下显示，默认 false
   *                    设为 true 时，只有当 minLevel 为 debug 时才会输出
   *                    用于那些"技术上是警告，但频繁出现会刷屏"的日志
   */
  warn(message, verboseOnly = false) {
    if (verboseOnly && this.minLevel !== "debug") {
      return;
    }
    this.log(message, "warn");
  }
  /**
   * 输出 error 级别日志
   * @param message 日志消息或 Error 对象
   */
  error(message) {
    const msg = message instanceof Error ? message.message : message;
    this.log(msg, "error");
    if (message instanceof Error && message.stack) {
      console.error(message.stack);
    }
  }
  /**
   * 核心日志方法
   * @param message 日志消息
   * @param level 日志级别
   */
  log(message, level) {
    if (!this.shouldLog(level)) return;
    const timestamp = this.getTimestamp();
    const color = LOG_LEVEL_COLORS[level];
    const levelTag = `[${level.toUpperCase()}]`.padEnd(7);
    console.log(`${color}${timestamp}${levelTag}${COLOR_RESET} ${message}`);
    this.sendLogToFrontend(`${timestamp}${levelTag} ${message}`, level);
  }
  /**
   * 向前端发送日志
   * @param message 日志消息
   * @param level 日志级别
   */
  sendLogToFrontend(message, level) {
    if (this.window) {
      this.window.webContents.send("log-message", { message, level });
    }
  }
}
const logger = Logger.getInstance();
const IS_WIN = process.platform === "win32";
const IS_MAC = process.platform === "darwin";
const IS_WSL = process.platform === "linux" && require$$1.release().toLowerCase().includes("microsoft");
class LCUConnector extends EventEmitter {
  /** 进程监听定时器句柄（未启动时为 null） */
  processWatcher = null;
  /**
   * @static
   * @description 从进程命令行中获取英雄联盟客户端的有关信息
   * @returns {Promise<LCUProcessInfo>}
   */
  static getLCUInfoFromProcess() {
    return new Promise((resolve) => {
      const command = IS_WIN ? `WMIC PROCESS WHERE name='LeagueClientUx.exe' GET commandline` : IS_WSL ? `WMIC.exe PROCESS WHERE "name='LeagueClientUx.exe'" GET commandline` : `ps x -o args | grep 'LeagueClientUx'`;
      cp.exec(command, (err, stdout, stderr) => {
        if (err || !stdout || stderr) {
          resolve(null);
          return;
        }
        console.log(`process命令执行结果：${stdout}`);
        const portMatch = stdout.match(/--app-port=(\d+)/);
        const tokenMatch = stdout.match(/--remoting-auth-token=([\w-]+)/);
        const pidMatch = stdout.match(/--app-pid=(\d+)/);
        const installDirectoryMatch = stdout.match(/--install-directory=(.*?)"/);
        if (portMatch && tokenMatch && pidMatch && installDirectoryMatch) {
          const data = {
            port: parseInt(portMatch[1]),
            pid: parseInt(pidMatch[1]),
            token: tokenMatch[1],
            installDirectory: path$1.dirname(installDirectoryMatch[1])
            //  父目录
          };
          resolve(data);
        } else resolve(null);
      });
    });
  }
  /**
   * @static
   * @description 检查给定的路径是否是一个有效的英雄联盟客户端路径
   * @param {string} dirPath - 目录路径
   * @returns {boolean}
   */
  static isValidLCUPath(dirPath) {
    if (!dirPath) {
      return false;
    }
    const lcuClientApp = IS_MAC ? "LeagueClient.app" : "LeagueClient.exe";
    const common = fs.existsSync(path$1.join(dirPath, lcuClientApp)) && fs.existsSync(path$1.join(dirPath, "Config"));
    const isGlobal = common && fs.existsSync(path$1.join(dirPath, "RADS"));
    const isCN = common && fs.existsSync(path$1.join(dirPath, "TQM"));
    const isGarena = common;
    return isGlobal || isCN || isGarena;
  }
  /**
   * @description 启动连接器，开始监听客户端进程和 lockfile
   */
  start() {
    this.initProcessWatcher();
  }
  stop() {
    this.clearProcessWatcher();
  }
  /**
   * @private
   * @description 初始化客户端进程监听器
   */
  initProcessWatcher() {
    return LCUConnector.getLCUInfoFromProcess().then((lcuData) => {
      if (lcuData) {
        this.emit("connect", lcuData);
        this.clearProcessWatcher();
        return;
      }
      logger.error("LOL客户端未启动，一秒后将再次检查...");
      if (!this.processWatcher) {
        this.processWatcher = setInterval(this.initProcessWatcher.bind(this), 1e3);
      }
    });
  }
  /**
   * @description 清除进程监听器
   */
  clearProcessWatcher() {
    if (this.processWatcher) {
      clearInterval(this.processWatcher);
      this.processWatcher = null;
    }
  }
}
var LcuEventUri = /* @__PURE__ */ ((LcuEventUri2) => {
  LcuEventUri2["READY_CHECK"] = "/lol-matchmaking/v1/ready-check";
  LcuEventUri2["GAMEFLOW_PHASE"] = "/lol-gameflow/v1/session";
  LcuEventUri2["CHAMP_SELECT"] = "/lol-champ-select/v1/session";
  LcuEventUri2["TFT_BATTLE_PASS"] = "/lol-tft-pass/v1/battle-pass";
  return LcuEventUri2;
})(LcuEventUri || {});
class LCUManager extends EventEmitter {
  port;
  token;
  httpsAgent;
  api;
  // 我们将拥有一个专属的 axios 实例
  ws = null;
  isConnected = false;
  // --- 单例模式核心 ---
  static instance = null;
  static init(details) {
    if (!LCUManager.instance) {
      LCUManager.instance = new LCUManager(details);
    }
    return LCUManager.instance;
  }
  static getInstance() {
    if (!LCUManager.instance) {
      console.error("[LCUManager] 尚未初始化，无法获取实例。");
      return null;
    }
    return LCUManager.instance;
  }
  /**
   * 全新的启动方法，它会先确认 REST API 就绪，再连接 WebSocket
   */
  async start() {
    console.log("🚀 [LCUManager] 开始启动，正在确认 API 服务状态...");
    try {
      await this.confirmApiReady();
      this.connectWebSocket();
    } catch (e) {
      console.error("❌ [LCUManager] 启动过程中发生错误:", e);
    }
  }
  // 构造函数是私有的，这确保了外部不能用 new 来创建实例
  constructor(details) {
    super();
    this.port = details.port;
    this.token = details.token;
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: false
      // LCU 使用的是自签名证书，我们必须忽略它
    });
    this.api = axios.create({
      baseURL: `https://127.0.0.1:${this.port}`,
      httpsAgent: this.httpsAgent,
      // 把我们的"通行证"交给 axios
      proxy: false,
      // ← 关键：禁止任何系统/环境变量代理!!!这里debug找了一万年才发现是这个问题。
      auth: {
        username: "riot",
        password: this.token
      },
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });
    console.log(`🔌 [LCUManager] 准备就绪，目标端口: ${this.port}`);
  }
  /**
   * 连接到 LCU WebSocket
   */
  connectWebSocket() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    const wsUrl = `wss://127.0.0.1:${this.port}`;
    this.ws = new WebSocket(wsUrl, {
      headers: { Authorization: "Basic " + Buffer.from(`riot:${this.token}`).toString("base64") },
      agent: this.httpsAgent
    });
    this.ws.on("open", () => {
      this.isConnected = true;
      console.log("✅ [LCUManager] WebSocket 连接成功！");
      this.emit("connect");
      this.subscribe("OnJsonApiEvent");
    });
    this.ws.on("message", (data) => {
      const messageString = data.toString();
      if (!messageString) return;
      try {
        const message = JSON.parse(messageString);
        if (message[0] === 8 && message[1] === "OnJsonApiEvent" && message[2]) {
          const eventData = message[2];
          const eventUri = eventData.uri;
          this.emit("lcu-event", eventData);
          if (Object.values(LcuEventUri).includes(eventUri)) {
            this.emit(eventUri, eventData);
          }
        }
      } catch (e) {
        console.error("❌ [LCUManager] 解析 WebSocket 消息失败:", e);
      }
    });
    this.ws.on("close", () => {
      if (this.isConnected) {
        console.log("❌ [LCUManager] WebSocket 连接已断开。");
        this.isConnected = false;
        this.emit("disconnect");
        this.unsubscribe("OnJsonApiEvent");
        LCUManager.instance = null;
      }
    });
    this.ws.on("error", (err) => {
      console.error("❌ [LCUManager] WebSocket 发生错误:", err);
    });
  }
  /**
   * 发送一个 REST API 请求到 LCU
   * @param method 'GET', 'POST', 'PUT', 'DELETE', etc.
   * @param endpoint API 端点, e.g., '/lol-summoner/v1/current-summoner'
   * @param body 请求体 (可选)
   */
  async request(method, endpoint, body) {
    try {
      const fullUrl = `${this.api.defaults.baseURL}${endpoint}`;
      console.log(`➡️  [LCUManager] 准备发起请求: ${method} ${fullUrl}`);
      const response = await this.api.request({
        method,
        url: fullUrl,
        // axios 会自动拼接 baseURL
        data: body
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`❌ [LCUManager] Axios 请求失败: ${error.message}`);
        throw new Error(`LCU 请求失败:endpoint:${endpoint} state: ${error.response?.status} - ${error.response?.statusText}`);
      } else {
        console.error(`❌ [LCUManager] 未知请求错误:`, error);
        throw error;
      }
    }
  }
  /**
   * 订阅一个 WebSocket 事件
   * @param event 事件名, e.g., 'OnJsonApiEvent'
   */
  subscribe(event) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify([5, event]));
    }
  }
  /**
   * 取消订阅一个 WebSocket 事件
   * @param event 事件名
   */
  unsubscribe(event) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify([6, event]));
    }
  }
  /**
   * 关闭所有连接
   */
  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
  /**
   * 确认 LCU API 服务就绪
   * @description 轮询检测 API 是否可用，带超时机制防止无限等待
   * @param timeoutMs 超时时间 (ms)，默认 30 秒
   * @throws 超时后抛出错误
   */
  async confirmApiReady(timeoutMs = 3e4) {
    const startTime = Date.now();
    const retryIntervalMs = 2e3;
    while (true) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(
          `[LCUManager] API 服务在 ${timeoutMs / 1e3} 秒内未就绪，请检查客户端状态`
        );
      }
      try {
        await this.request("GET", "/riotclient/ux-state");
        console.log("✅ [LCUManager] API 服务已就绪！");
        return;
      } catch (error) {
        const elapsed = Math.round((Date.now() - startTime) / 1e3);
        console.log(`⏳ [LCUManager] API 服务尚未就绪 (已等待 ${elapsed}s)，${retryIntervalMs / 1e3}s 后重试...`);
        await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
      }
    }
  }
  //  一堆专注于后端使用的方法
  getSummonerInfo() {
    return this.request("GET", "/lol-summoner/v1/current-summoner");
  }
  createCustomLobby(config) {
    logger.info("📬 [LCUManager] 正在创建自定义房间...");
    return this.request("POST", "/lol-lobby/v2/lobby", config);
  }
  createLobbyByQueueId(queueId) {
    logger.info(`📬 [LCUManager] 正在创建房间 (队列ID: ${queueId})...`);
    return this.request("POST", "/lol-lobby/v2/lobby", { queueId });
  }
  getCurrentGamemodeInfo() {
    return this.request("GET", "/lol-lobby/v1/parties/gamemode");
  }
  startMatch() {
    logger.info("📬 [LCUManager] 正在开始匹配...");
    return this.request("POST", "/lol-lobby/v2/lobby/matchmaking/search");
  }
  stopMatch() {
    logger.info("📬 [LCUManager] 正在停止匹配...");
    return this.request("DELETE", "/lol-lobby/v2/lobby/matchmaking/search");
  }
  async checkMatchState() {
    const result = await this.request("GET", "/lol-lobby/v2/lobby/matchmaking/search-state");
    return result.searchState;
  }
  getCustomGames() {
    return this.request("GET", "/lol-lobby/v1/custom-games");
  }
  getQueues() {
    return this.request("GET", "/lol-game-queues/v1/queues");
  }
  getChatConfig() {
    return this.request("GET", "/lol-game-queues/v1/queues");
  }
  getChampSelectSession() {
    return this.request("GET", "/lol-champ-select/v1/session");
  }
  getChatConversations() {
    return this.request("GET", "/lol-chat/v1/conversations");
  }
  getGameflowSession() {
    return this.request("GET", "/lol-gameflow/v1/session");
  }
  getExtraGameClientArgs() {
    return this.request("GET", "/lol-gameflow/v1/extra-game-client-args");
  }
  getLobby() {
    return this.request("GET", "/lol-lobby/v2/lobby");
  }
  //  接受对局
  acceptMatch() {
    return this.request("POST", "/lol-matchmaking/v1/ready-check/accept");
  }
  //  拒绝对局
  declineMatch() {
    return this.request("POST", "/lol-matchmaking/v1/ready-check/decline");
  }
  /**
   * 退出当前游戏（关闭游戏窗口）
   * @description 在 TFT 对局结束（玩家死亡）后调用，主动关闭游戏窗口
   *              调用后会触发 GAMEFLOW_PHASE 变为 "WaitingForStats"
   * @returns Promise<any>
   */
  quitGame() {
    logger.info("🚪 [LCUManager] 正在退出游戏...");
    return this.request("POST", "/lol-gameflow/v1/early-exit");
  }
  /**
   * 强制杀掉游戏进程
   * @description 直接通过 taskkill 命令杀掉 "League of Legends.exe" 进程
   *              比调用 LCU API 或点击 UI 更快更可靠
   * @returns Promise<boolean> 是否成功杀掉进程
   */
  killGameProcess() {
    return new Promise((resolve) => {
      logger.info("🔪 [LCUManager] 正在强制杀掉游戏进程...");
      const command = 'taskkill /F /IM "League of Legends.exe"';
      cp.exec(command, (err, stdout, stderr) => {
        if (err) {
          if (stderr.includes("not found") || stderr.includes("没有找到")) {
            logger.info("[LCUManager] 游戏进程不存在，无需杀掉");
            resolve(true);
          } else {
            logger.warn(`[LCUManager] 杀掉游戏进程失败: ${err.message}`);
            resolve(false);
          }
          return;
        }
        logger.info(`[LCUManager] 游戏进程已被杀掉: ${stdout.trim()}`);
        resolve(true);
      });
    });
  }
}
var register = {};
var sourceMapSupport = { exports: {} };
var sourceMap = {};
var sourceMapGenerator = {};
var base64Vlq = {};
var base64 = {};
var hasRequiredBase64;
function requireBase64() {
  if (hasRequiredBase64) return base64;
  hasRequiredBase64 = 1;
  var intToCharMap = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");
  base64.encode = function(number) {
    if (0 <= number && number < intToCharMap.length) {
      return intToCharMap[number];
    }
    throw new TypeError("Must be between 0 and 63: " + number);
  };
  base64.decode = function(charCode) {
    var bigA = 65;
    var bigZ = 90;
    var littleA = 97;
    var littleZ = 122;
    var zero = 48;
    var nine = 57;
    var plus = 43;
    var slash = 47;
    var littleOffset = 26;
    var numberOffset = 52;
    if (bigA <= charCode && charCode <= bigZ) {
      return charCode - bigA;
    }
    if (littleA <= charCode && charCode <= littleZ) {
      return charCode - littleA + littleOffset;
    }
    if (zero <= charCode && charCode <= nine) {
      return charCode - zero + numberOffset;
    }
    if (charCode == plus) {
      return 62;
    }
    if (charCode == slash) {
      return 63;
    }
    return -1;
  };
  return base64;
}
var hasRequiredBase64Vlq;
function requireBase64Vlq() {
  if (hasRequiredBase64Vlq) return base64Vlq;
  hasRequiredBase64Vlq = 1;
  var base642 = requireBase64();
  var VLQ_BASE_SHIFT = 5;
  var VLQ_BASE = 1 << VLQ_BASE_SHIFT;
  var VLQ_BASE_MASK = VLQ_BASE - 1;
  var VLQ_CONTINUATION_BIT = VLQ_BASE;
  function toVLQSigned(aValue) {
    return aValue < 0 ? (-aValue << 1) + 1 : (aValue << 1) + 0;
  }
  function fromVLQSigned(aValue) {
    var isNegative = (aValue & 1) === 1;
    var shifted = aValue >> 1;
    return isNegative ? -shifted : shifted;
  }
  base64Vlq.encode = function base64VLQ_encode(aValue) {
    var encoded = "";
    var digit;
    var vlq = toVLQSigned(aValue);
    do {
      digit = vlq & VLQ_BASE_MASK;
      vlq >>>= VLQ_BASE_SHIFT;
      if (vlq > 0) {
        digit |= VLQ_CONTINUATION_BIT;
      }
      encoded += base642.encode(digit);
    } while (vlq > 0);
    return encoded;
  };
  base64Vlq.decode = function base64VLQ_decode(aStr, aIndex, aOutParam) {
    var strLen = aStr.length;
    var result = 0;
    var shift = 0;
    var continuation, digit;
    do {
      if (aIndex >= strLen) {
        throw new Error("Expected more digits in base 64 VLQ value.");
      }
      digit = base642.decode(aStr.charCodeAt(aIndex++));
      if (digit === -1) {
        throw new Error("Invalid base64 digit: " + aStr.charAt(aIndex - 1));
      }
      continuation = !!(digit & VLQ_CONTINUATION_BIT);
      digit &= VLQ_BASE_MASK;
      result = result + (digit << shift);
      shift += VLQ_BASE_SHIFT;
    } while (continuation);
    aOutParam.value = fromVLQSigned(result);
    aOutParam.rest = aIndex;
  };
  return base64Vlq;
}
var util = {};
var hasRequiredUtil;
function requireUtil() {
  if (hasRequiredUtil) return util;
  hasRequiredUtil = 1;
  (function(exports) {
    function getArg(aArgs, aName, aDefaultValue) {
      if (aName in aArgs) {
        return aArgs[aName];
      } else if (arguments.length === 3) {
        return aDefaultValue;
      } else {
        throw new Error('"' + aName + '" is a required argument.');
      }
    }
    exports.getArg = getArg;
    var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/;
    var dataUrlRegexp = /^data:.+\,.+$/;
    function urlParse(aUrl) {
      var match = aUrl.match(urlRegexp);
      if (!match) {
        return null;
      }
      return {
        scheme: match[1],
        auth: match[2],
        host: match[3],
        port: match[4],
        path: match[5]
      };
    }
    exports.urlParse = urlParse;
    function urlGenerate(aParsedUrl) {
      var url = "";
      if (aParsedUrl.scheme) {
        url += aParsedUrl.scheme + ":";
      }
      url += "//";
      if (aParsedUrl.auth) {
        url += aParsedUrl.auth + "@";
      }
      if (aParsedUrl.host) {
        url += aParsedUrl.host;
      }
      if (aParsedUrl.port) {
        url += ":" + aParsedUrl.port;
      }
      if (aParsedUrl.path) {
        url += aParsedUrl.path;
      }
      return url;
    }
    exports.urlGenerate = urlGenerate;
    function normalize(aPath) {
      var path2 = aPath;
      var url = urlParse(aPath);
      if (url) {
        if (!url.path) {
          return aPath;
        }
        path2 = url.path;
      }
      var isAbsolute = exports.isAbsolute(path2);
      var parts = path2.split(/\/+/);
      for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
        part = parts[i];
        if (part === ".") {
          parts.splice(i, 1);
        } else if (part === "..") {
          up++;
        } else if (up > 0) {
          if (part === "") {
            parts.splice(i + 1, up);
            up = 0;
          } else {
            parts.splice(i, 2);
            up--;
          }
        }
      }
      path2 = parts.join("/");
      if (path2 === "") {
        path2 = isAbsolute ? "/" : ".";
      }
      if (url) {
        url.path = path2;
        return urlGenerate(url);
      }
      return path2;
    }
    exports.normalize = normalize;
    function join(aRoot, aPath) {
      if (aRoot === "") {
        aRoot = ".";
      }
      if (aPath === "") {
        aPath = ".";
      }
      var aPathUrl = urlParse(aPath);
      var aRootUrl = urlParse(aRoot);
      if (aRootUrl) {
        aRoot = aRootUrl.path || "/";
      }
      if (aPathUrl && !aPathUrl.scheme) {
        if (aRootUrl) {
          aPathUrl.scheme = aRootUrl.scheme;
        }
        return urlGenerate(aPathUrl);
      }
      if (aPathUrl || aPath.match(dataUrlRegexp)) {
        return aPath;
      }
      if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
        aRootUrl.host = aPath;
        return urlGenerate(aRootUrl);
      }
      var joined = aPath.charAt(0) === "/" ? aPath : normalize(aRoot.replace(/\/+$/, "") + "/" + aPath);
      if (aRootUrl) {
        aRootUrl.path = joined;
        return urlGenerate(aRootUrl);
      }
      return joined;
    }
    exports.join = join;
    exports.isAbsolute = function(aPath) {
      return aPath.charAt(0) === "/" || urlRegexp.test(aPath);
    };
    function relative(aRoot, aPath) {
      if (aRoot === "") {
        aRoot = ".";
      }
      aRoot = aRoot.replace(/\/$/, "");
      var level = 0;
      while (aPath.indexOf(aRoot + "/") !== 0) {
        var index = aRoot.lastIndexOf("/");
        if (index < 0) {
          return aPath;
        }
        aRoot = aRoot.slice(0, index);
        if (aRoot.match(/^([^\/]+:\/)?\/*$/)) {
          return aPath;
        }
        ++level;
      }
      return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
    }
    exports.relative = relative;
    var supportsNullProto = (function() {
      var obj = /* @__PURE__ */ Object.create(null);
      return !("__proto__" in obj);
    })();
    function identity(s) {
      return s;
    }
    function toSetString(aStr) {
      if (isProtoString(aStr)) {
        return "$" + aStr;
      }
      return aStr;
    }
    exports.toSetString = supportsNullProto ? identity : toSetString;
    function fromSetString(aStr) {
      if (isProtoString(aStr)) {
        return aStr.slice(1);
      }
      return aStr;
    }
    exports.fromSetString = supportsNullProto ? identity : fromSetString;
    function isProtoString(s) {
      if (!s) {
        return false;
      }
      var length = s.length;
      if (length < 9) {
        return false;
      }
      if (s.charCodeAt(length - 1) !== 95 || s.charCodeAt(length - 2) !== 95 || s.charCodeAt(length - 3) !== 111 || s.charCodeAt(length - 4) !== 116 || s.charCodeAt(length - 5) !== 111 || s.charCodeAt(length - 6) !== 114 || s.charCodeAt(length - 7) !== 112 || s.charCodeAt(length - 8) !== 95 || s.charCodeAt(length - 9) !== 95) {
        return false;
      }
      for (var i = length - 10; i >= 0; i--) {
        if (s.charCodeAt(i) !== 36) {
          return false;
        }
      }
      return true;
    }
    function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
      var cmp = strcmp(mappingA.source, mappingB.source);
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalLine - mappingB.originalLine;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalColumn - mappingB.originalColumn;
      if (cmp !== 0 || onlyCompareOriginal) {
        return cmp;
      }
      cmp = mappingA.generatedColumn - mappingB.generatedColumn;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.generatedLine - mappingB.generatedLine;
      if (cmp !== 0) {
        return cmp;
      }
      return strcmp(mappingA.name, mappingB.name);
    }
    exports.compareByOriginalPositions = compareByOriginalPositions;
    function compareByGeneratedPositionsDeflated(mappingA, mappingB, onlyCompareGenerated) {
      var cmp = mappingA.generatedLine - mappingB.generatedLine;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.generatedColumn - mappingB.generatedColumn;
      if (cmp !== 0 || onlyCompareGenerated) {
        return cmp;
      }
      cmp = strcmp(mappingA.source, mappingB.source);
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalLine - mappingB.originalLine;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalColumn - mappingB.originalColumn;
      if (cmp !== 0) {
        return cmp;
      }
      return strcmp(mappingA.name, mappingB.name);
    }
    exports.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;
    function strcmp(aStr1, aStr2) {
      if (aStr1 === aStr2) {
        return 0;
      }
      if (aStr1 === null) {
        return 1;
      }
      if (aStr2 === null) {
        return -1;
      }
      if (aStr1 > aStr2) {
        return 1;
      }
      return -1;
    }
    function compareByGeneratedPositionsInflated(mappingA, mappingB) {
      var cmp = mappingA.generatedLine - mappingB.generatedLine;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.generatedColumn - mappingB.generatedColumn;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = strcmp(mappingA.source, mappingB.source);
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalLine - mappingB.originalLine;
      if (cmp !== 0) {
        return cmp;
      }
      cmp = mappingA.originalColumn - mappingB.originalColumn;
      if (cmp !== 0) {
        return cmp;
      }
      return strcmp(mappingA.name, mappingB.name);
    }
    exports.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;
    function parseSourceMapInput(str) {
      return JSON.parse(str.replace(/^\)]}'[^\n]*\n/, ""));
    }
    exports.parseSourceMapInput = parseSourceMapInput;
    function computeSourceURL(sourceRoot, sourceURL, sourceMapURL) {
      sourceURL = sourceURL || "";
      if (sourceRoot) {
        if (sourceRoot[sourceRoot.length - 1] !== "/" && sourceURL[0] !== "/") {
          sourceRoot += "/";
        }
        sourceURL = sourceRoot + sourceURL;
      }
      if (sourceMapURL) {
        var parsed = urlParse(sourceMapURL);
        if (!parsed) {
          throw new Error("sourceMapURL could not be parsed");
        }
        if (parsed.path) {
          var index = parsed.path.lastIndexOf("/");
          if (index >= 0) {
            parsed.path = parsed.path.substring(0, index + 1);
          }
        }
        sourceURL = join(urlGenerate(parsed), sourceURL);
      }
      return normalize(sourceURL);
    }
    exports.computeSourceURL = computeSourceURL;
  })(util);
  return util;
}
var arraySet = {};
var hasRequiredArraySet;
function requireArraySet() {
  if (hasRequiredArraySet) return arraySet;
  hasRequiredArraySet = 1;
  var util2 = requireUtil();
  var has = Object.prototype.hasOwnProperty;
  var hasNativeMap = typeof Map !== "undefined";
  function ArraySet() {
    this._array = [];
    this._set = hasNativeMap ? /* @__PURE__ */ new Map() : /* @__PURE__ */ Object.create(null);
  }
  ArraySet.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
    var set = new ArraySet();
    for (var i = 0, len = aArray.length; i < len; i++) {
      set.add(aArray[i], aAllowDuplicates);
    }
    return set;
  };
  ArraySet.prototype.size = function ArraySet_size() {
    return hasNativeMap ? this._set.size : Object.getOwnPropertyNames(this._set).length;
  };
  ArraySet.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
    var sStr = hasNativeMap ? aStr : util2.toSetString(aStr);
    var isDuplicate = hasNativeMap ? this.has(aStr) : has.call(this._set, sStr);
    var idx = this._array.length;
    if (!isDuplicate || aAllowDuplicates) {
      this._array.push(aStr);
    }
    if (!isDuplicate) {
      if (hasNativeMap) {
        this._set.set(aStr, idx);
      } else {
        this._set[sStr] = idx;
      }
    }
  };
  ArraySet.prototype.has = function ArraySet_has(aStr) {
    if (hasNativeMap) {
      return this._set.has(aStr);
    } else {
      var sStr = util2.toSetString(aStr);
      return has.call(this._set, sStr);
    }
  };
  ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
    if (hasNativeMap) {
      var idx = this._set.get(aStr);
      if (idx >= 0) {
        return idx;
      }
    } else {
      var sStr = util2.toSetString(aStr);
      if (has.call(this._set, sStr)) {
        return this._set[sStr];
      }
    }
    throw new Error('"' + aStr + '" is not in the set.');
  };
  ArraySet.prototype.at = function ArraySet_at(aIdx) {
    if (aIdx >= 0 && aIdx < this._array.length) {
      return this._array[aIdx];
    }
    throw new Error("No element indexed by " + aIdx);
  };
  ArraySet.prototype.toArray = function ArraySet_toArray() {
    return this._array.slice();
  };
  arraySet.ArraySet = ArraySet;
  return arraySet;
}
var mappingList = {};
var hasRequiredMappingList;
function requireMappingList() {
  if (hasRequiredMappingList) return mappingList;
  hasRequiredMappingList = 1;
  var util2 = requireUtil();
  function generatedPositionAfter(mappingA, mappingB) {
    var lineA = mappingA.generatedLine;
    var lineB = mappingB.generatedLine;
    var columnA = mappingA.generatedColumn;
    var columnB = mappingB.generatedColumn;
    return lineB > lineA || lineB == lineA && columnB >= columnA || util2.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0;
  }
  function MappingList() {
    this._array = [];
    this._sorted = true;
    this._last = { generatedLine: -1, generatedColumn: 0 };
  }
  MappingList.prototype.unsortedForEach = function MappingList_forEach(aCallback, aThisArg) {
    this._array.forEach(aCallback, aThisArg);
  };
  MappingList.prototype.add = function MappingList_add(aMapping) {
    if (generatedPositionAfter(this._last, aMapping)) {
      this._last = aMapping;
      this._array.push(aMapping);
    } else {
      this._sorted = false;
      this._array.push(aMapping);
    }
  };
  MappingList.prototype.toArray = function MappingList_toArray() {
    if (!this._sorted) {
      this._array.sort(util2.compareByGeneratedPositionsInflated);
      this._sorted = true;
    }
    return this._array;
  };
  mappingList.MappingList = MappingList;
  return mappingList;
}
var hasRequiredSourceMapGenerator;
function requireSourceMapGenerator() {
  if (hasRequiredSourceMapGenerator) return sourceMapGenerator;
  hasRequiredSourceMapGenerator = 1;
  var base64VLQ = requireBase64Vlq();
  var util2 = requireUtil();
  var ArraySet = requireArraySet().ArraySet;
  var MappingList = requireMappingList().MappingList;
  function SourceMapGenerator(aArgs) {
    if (!aArgs) {
      aArgs = {};
    }
    this._file = util2.getArg(aArgs, "file", null);
    this._sourceRoot = util2.getArg(aArgs, "sourceRoot", null);
    this._skipValidation = util2.getArg(aArgs, "skipValidation", false);
    this._sources = new ArraySet();
    this._names = new ArraySet();
    this._mappings = new MappingList();
    this._sourcesContents = null;
  }
  SourceMapGenerator.prototype._version = 3;
  SourceMapGenerator.fromSourceMap = function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
    var sourceRoot = aSourceMapConsumer.sourceRoot;
    var generator = new SourceMapGenerator({
      file: aSourceMapConsumer.file,
      sourceRoot
    });
    aSourceMapConsumer.eachMapping(function(mapping) {
      var newMapping = {
        generated: {
          line: mapping.generatedLine,
          column: mapping.generatedColumn
        }
      };
      if (mapping.source != null) {
        newMapping.source = mapping.source;
        if (sourceRoot != null) {
          newMapping.source = util2.relative(sourceRoot, newMapping.source);
        }
        newMapping.original = {
          line: mapping.originalLine,
          column: mapping.originalColumn
        };
        if (mapping.name != null) {
          newMapping.name = mapping.name;
        }
      }
      generator.addMapping(newMapping);
    });
    aSourceMapConsumer.sources.forEach(function(sourceFile) {
      var sourceRelative = sourceFile;
      if (sourceRoot !== null) {
        sourceRelative = util2.relative(sourceRoot, sourceFile);
      }
      if (!generator._sources.has(sourceRelative)) {
        generator._sources.add(sourceRelative);
      }
      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
      if (content != null) {
        generator.setSourceContent(sourceFile, content);
      }
    });
    return generator;
  };
  SourceMapGenerator.prototype.addMapping = function SourceMapGenerator_addMapping(aArgs) {
    var generated = util2.getArg(aArgs, "generated");
    var original = util2.getArg(aArgs, "original", null);
    var source = util2.getArg(aArgs, "source", null);
    var name = util2.getArg(aArgs, "name", null);
    if (!this._skipValidation) {
      this._validateMapping(generated, original, source, name);
    }
    if (source != null) {
      source = String(source);
      if (!this._sources.has(source)) {
        this._sources.add(source);
      }
    }
    if (name != null) {
      name = String(name);
      if (!this._names.has(name)) {
        this._names.add(name);
      }
    }
    this._mappings.add({
      generatedLine: generated.line,
      generatedColumn: generated.column,
      originalLine: original != null && original.line,
      originalColumn: original != null && original.column,
      source,
      name
    });
  };
  SourceMapGenerator.prototype.setSourceContent = function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
    var source = aSourceFile;
    if (this._sourceRoot != null) {
      source = util2.relative(this._sourceRoot, source);
    }
    if (aSourceContent != null) {
      if (!this._sourcesContents) {
        this._sourcesContents = /* @__PURE__ */ Object.create(null);
      }
      this._sourcesContents[util2.toSetString(source)] = aSourceContent;
    } else if (this._sourcesContents) {
      delete this._sourcesContents[util2.toSetString(source)];
      if (Object.keys(this._sourcesContents).length === 0) {
        this._sourcesContents = null;
      }
    }
  };
  SourceMapGenerator.prototype.applySourceMap = function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
    var sourceFile = aSourceFile;
    if (aSourceFile == null) {
      if (aSourceMapConsumer.file == null) {
        throw new Error(
          `SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, or the source map's "file" property. Both were omitted.`
        );
      }
      sourceFile = aSourceMapConsumer.file;
    }
    var sourceRoot = this._sourceRoot;
    if (sourceRoot != null) {
      sourceFile = util2.relative(sourceRoot, sourceFile);
    }
    var newSources = new ArraySet();
    var newNames = new ArraySet();
    this._mappings.unsortedForEach(function(mapping) {
      if (mapping.source === sourceFile && mapping.originalLine != null) {
        var original = aSourceMapConsumer.originalPositionFor({
          line: mapping.originalLine,
          column: mapping.originalColumn
        });
        if (original.source != null) {
          mapping.source = original.source;
          if (aSourceMapPath != null) {
            mapping.source = util2.join(aSourceMapPath, mapping.source);
          }
          if (sourceRoot != null) {
            mapping.source = util2.relative(sourceRoot, mapping.source);
          }
          mapping.originalLine = original.line;
          mapping.originalColumn = original.column;
          if (original.name != null) {
            mapping.name = original.name;
          }
        }
      }
      var source = mapping.source;
      if (source != null && !newSources.has(source)) {
        newSources.add(source);
      }
      var name = mapping.name;
      if (name != null && !newNames.has(name)) {
        newNames.add(name);
      }
    }, this);
    this._sources = newSources;
    this._names = newNames;
    aSourceMapConsumer.sources.forEach(function(sourceFile2) {
      var content = aSourceMapConsumer.sourceContentFor(sourceFile2);
      if (content != null) {
        if (aSourceMapPath != null) {
          sourceFile2 = util2.join(aSourceMapPath, sourceFile2);
        }
        if (sourceRoot != null) {
          sourceFile2 = util2.relative(sourceRoot, sourceFile2);
        }
        this.setSourceContent(sourceFile2, content);
      }
    }, this);
  };
  SourceMapGenerator.prototype._validateMapping = function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource, aName) {
    if (aOriginal && typeof aOriginal.line !== "number" && typeof aOriginal.column !== "number") {
      throw new Error(
        "original.line and original.column are not numbers -- you probably meant to omit the original mapping entirely and only map the generated position. If so, pass null for the original mapping instead of an object with empty or null values."
      );
    }
    if (aGenerated && "line" in aGenerated && "column" in aGenerated && aGenerated.line > 0 && aGenerated.column >= 0 && !aOriginal && !aSource && !aName) {
      return;
    } else if (aGenerated && "line" in aGenerated && "column" in aGenerated && aOriginal && "line" in aOriginal && "column" in aOriginal && aGenerated.line > 0 && aGenerated.column >= 0 && aOriginal.line > 0 && aOriginal.column >= 0 && aSource) {
      return;
    } else {
      throw new Error("Invalid mapping: " + JSON.stringify({
        generated: aGenerated,
        source: aSource,
        original: aOriginal,
        name: aName
      }));
    }
  };
  SourceMapGenerator.prototype._serializeMappings = function SourceMapGenerator_serializeMappings() {
    var previousGeneratedColumn = 0;
    var previousGeneratedLine = 1;
    var previousOriginalColumn = 0;
    var previousOriginalLine = 0;
    var previousName = 0;
    var previousSource = 0;
    var result = "";
    var next;
    var mapping;
    var nameIdx;
    var sourceIdx;
    var mappings = this._mappings.toArray();
    for (var i = 0, len = mappings.length; i < len; i++) {
      mapping = mappings[i];
      next = "";
      if (mapping.generatedLine !== previousGeneratedLine) {
        previousGeneratedColumn = 0;
        while (mapping.generatedLine !== previousGeneratedLine) {
          next += ";";
          previousGeneratedLine++;
        }
      } else {
        if (i > 0) {
          if (!util2.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) {
            continue;
          }
          next += ",";
        }
      }
      next += base64VLQ.encode(mapping.generatedColumn - previousGeneratedColumn);
      previousGeneratedColumn = mapping.generatedColumn;
      if (mapping.source != null) {
        sourceIdx = this._sources.indexOf(mapping.source);
        next += base64VLQ.encode(sourceIdx - previousSource);
        previousSource = sourceIdx;
        next += base64VLQ.encode(mapping.originalLine - 1 - previousOriginalLine);
        previousOriginalLine = mapping.originalLine - 1;
        next += base64VLQ.encode(mapping.originalColumn - previousOriginalColumn);
        previousOriginalColumn = mapping.originalColumn;
        if (mapping.name != null) {
          nameIdx = this._names.indexOf(mapping.name);
          next += base64VLQ.encode(nameIdx - previousName);
          previousName = nameIdx;
        }
      }
      result += next;
    }
    return result;
  };
  SourceMapGenerator.prototype._generateSourcesContent = function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
    return aSources.map(function(source) {
      if (!this._sourcesContents) {
        return null;
      }
      if (aSourceRoot != null) {
        source = util2.relative(aSourceRoot, source);
      }
      var key = util2.toSetString(source);
      return Object.prototype.hasOwnProperty.call(this._sourcesContents, key) ? this._sourcesContents[key] : null;
    }, this);
  };
  SourceMapGenerator.prototype.toJSON = function SourceMapGenerator_toJSON() {
    var map = {
      version: this._version,
      sources: this._sources.toArray(),
      names: this._names.toArray(),
      mappings: this._serializeMappings()
    };
    if (this._file != null) {
      map.file = this._file;
    }
    if (this._sourceRoot != null) {
      map.sourceRoot = this._sourceRoot;
    }
    if (this._sourcesContents) {
      map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
    }
    return map;
  };
  SourceMapGenerator.prototype.toString = function SourceMapGenerator_toString() {
    return JSON.stringify(this.toJSON());
  };
  sourceMapGenerator.SourceMapGenerator = SourceMapGenerator;
  return sourceMapGenerator;
}
var sourceMapConsumer = {};
var binarySearch = {};
var hasRequiredBinarySearch;
function requireBinarySearch() {
  if (hasRequiredBinarySearch) return binarySearch;
  hasRequiredBinarySearch = 1;
  (function(exports) {
    exports.GREATEST_LOWER_BOUND = 1;
    exports.LEAST_UPPER_BOUND = 2;
    function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare, aBias) {
      var mid = Math.floor((aHigh - aLow) / 2) + aLow;
      var cmp = aCompare(aNeedle, aHaystack[mid], true);
      if (cmp === 0) {
        return mid;
      } else if (cmp > 0) {
        if (aHigh - mid > 1) {
          return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare, aBias);
        }
        if (aBias == exports.LEAST_UPPER_BOUND) {
          return aHigh < aHaystack.length ? aHigh : -1;
        } else {
          return mid;
        }
      } else {
        if (mid - aLow > 1) {
          return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare, aBias);
        }
        if (aBias == exports.LEAST_UPPER_BOUND) {
          return mid;
        } else {
          return aLow < 0 ? -1 : aLow;
        }
      }
    }
    exports.search = function search(aNeedle, aHaystack, aCompare, aBias) {
      if (aHaystack.length === 0) {
        return -1;
      }
      var index = recursiveSearch(
        -1,
        aHaystack.length,
        aNeedle,
        aHaystack,
        aCompare,
        aBias || exports.GREATEST_LOWER_BOUND
      );
      if (index < 0) {
        return -1;
      }
      while (index - 1 >= 0) {
        if (aCompare(aHaystack[index], aHaystack[index - 1], true) !== 0) {
          break;
        }
        --index;
      }
      return index;
    };
  })(binarySearch);
  return binarySearch;
}
var quickSort = {};
var hasRequiredQuickSort;
function requireQuickSort() {
  if (hasRequiredQuickSort) return quickSort;
  hasRequiredQuickSort = 1;
  function swap(ary, x, y) {
    var temp = ary[x];
    ary[x] = ary[y];
    ary[y] = temp;
  }
  function randomIntInRange(low, high) {
    return Math.round(low + Math.random() * (high - low));
  }
  function doQuickSort(ary, comparator, p, r) {
    if (p < r) {
      var pivotIndex = randomIntInRange(p, r);
      var i = p - 1;
      swap(ary, pivotIndex, r);
      var pivot = ary[r];
      for (var j = p; j < r; j++) {
        if (comparator(ary[j], pivot) <= 0) {
          i += 1;
          swap(ary, i, j);
        }
      }
      swap(ary, i + 1, j);
      var q = i + 1;
      doQuickSort(ary, comparator, p, q - 1);
      doQuickSort(ary, comparator, q + 1, r);
    }
  }
  quickSort.quickSort = function(ary, comparator) {
    doQuickSort(ary, comparator, 0, ary.length - 1);
  };
  return quickSort;
}
var hasRequiredSourceMapConsumer;
function requireSourceMapConsumer() {
  if (hasRequiredSourceMapConsumer) return sourceMapConsumer;
  hasRequiredSourceMapConsumer = 1;
  var util2 = requireUtil();
  var binarySearch2 = requireBinarySearch();
  var ArraySet = requireArraySet().ArraySet;
  var base64VLQ = requireBase64Vlq();
  var quickSort2 = requireQuickSort().quickSort;
  function SourceMapConsumer(aSourceMap, aSourceMapURL) {
    var sourceMap2 = aSourceMap;
    if (typeof aSourceMap === "string") {
      sourceMap2 = util2.parseSourceMapInput(aSourceMap);
    }
    return sourceMap2.sections != null ? new IndexedSourceMapConsumer(sourceMap2, aSourceMapURL) : new BasicSourceMapConsumer(sourceMap2, aSourceMapURL);
  }
  SourceMapConsumer.fromSourceMap = function(aSourceMap, aSourceMapURL) {
    return BasicSourceMapConsumer.fromSourceMap(aSourceMap, aSourceMapURL);
  };
  SourceMapConsumer.prototype._version = 3;
  SourceMapConsumer.prototype.__generatedMappings = null;
  Object.defineProperty(SourceMapConsumer.prototype, "_generatedMappings", {
    configurable: true,
    enumerable: true,
    get: function() {
      if (!this.__generatedMappings) {
        this._parseMappings(this._mappings, this.sourceRoot);
      }
      return this.__generatedMappings;
    }
  });
  SourceMapConsumer.prototype.__originalMappings = null;
  Object.defineProperty(SourceMapConsumer.prototype, "_originalMappings", {
    configurable: true,
    enumerable: true,
    get: function() {
      if (!this.__originalMappings) {
        this._parseMappings(this._mappings, this.sourceRoot);
      }
      return this.__originalMappings;
    }
  });
  SourceMapConsumer.prototype._charIsMappingSeparator = function SourceMapConsumer_charIsMappingSeparator(aStr, index) {
    var c = aStr.charAt(index);
    return c === ";" || c === ",";
  };
  SourceMapConsumer.prototype._parseMappings = function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    throw new Error("Subclasses must implement _parseMappings");
  };
  SourceMapConsumer.GENERATED_ORDER = 1;
  SourceMapConsumer.ORIGINAL_ORDER = 2;
  SourceMapConsumer.GREATEST_LOWER_BOUND = 1;
  SourceMapConsumer.LEAST_UPPER_BOUND = 2;
  SourceMapConsumer.prototype.eachMapping = function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
    var context = aContext || null;
    var order = aOrder || SourceMapConsumer.GENERATED_ORDER;
    var mappings;
    switch (order) {
      case SourceMapConsumer.GENERATED_ORDER:
        mappings = this._generatedMappings;
        break;
      case SourceMapConsumer.ORIGINAL_ORDER:
        mappings = this._originalMappings;
        break;
      default:
        throw new Error("Unknown order of iteration.");
    }
    var sourceRoot = this.sourceRoot;
    mappings.map(function(mapping) {
      var source = mapping.source === null ? null : this._sources.at(mapping.source);
      source = util2.computeSourceURL(sourceRoot, source, this._sourceMapURL);
      return {
        source,
        generatedLine: mapping.generatedLine,
        generatedColumn: mapping.generatedColumn,
        originalLine: mapping.originalLine,
        originalColumn: mapping.originalColumn,
        name: mapping.name === null ? null : this._names.at(mapping.name)
      };
    }, this).forEach(aCallback, context);
  };
  SourceMapConsumer.prototype.allGeneratedPositionsFor = function SourceMapConsumer_allGeneratedPositionsFor(aArgs) {
    var line = util2.getArg(aArgs, "line");
    var needle = {
      source: util2.getArg(aArgs, "source"),
      originalLine: line,
      originalColumn: util2.getArg(aArgs, "column", 0)
    };
    needle.source = this._findSourceIndex(needle.source);
    if (needle.source < 0) {
      return [];
    }
    var mappings = [];
    var index = this._findMapping(
      needle,
      this._originalMappings,
      "originalLine",
      "originalColumn",
      util2.compareByOriginalPositions,
      binarySearch2.LEAST_UPPER_BOUND
    );
    if (index >= 0) {
      var mapping = this._originalMappings[index];
      if (aArgs.column === void 0) {
        var originalLine = mapping.originalLine;
        while (mapping && mapping.originalLine === originalLine) {
          mappings.push({
            line: util2.getArg(mapping, "generatedLine", null),
            column: util2.getArg(mapping, "generatedColumn", null),
            lastColumn: util2.getArg(mapping, "lastGeneratedColumn", null)
          });
          mapping = this._originalMappings[++index];
        }
      } else {
        var originalColumn = mapping.originalColumn;
        while (mapping && mapping.originalLine === line && mapping.originalColumn == originalColumn) {
          mappings.push({
            line: util2.getArg(mapping, "generatedLine", null),
            column: util2.getArg(mapping, "generatedColumn", null),
            lastColumn: util2.getArg(mapping, "lastGeneratedColumn", null)
          });
          mapping = this._originalMappings[++index];
        }
      }
    }
    return mappings;
  };
  sourceMapConsumer.SourceMapConsumer = SourceMapConsumer;
  function BasicSourceMapConsumer(aSourceMap, aSourceMapURL) {
    var sourceMap2 = aSourceMap;
    if (typeof aSourceMap === "string") {
      sourceMap2 = util2.parseSourceMapInput(aSourceMap);
    }
    var version = util2.getArg(sourceMap2, "version");
    var sources = util2.getArg(sourceMap2, "sources");
    var names = util2.getArg(sourceMap2, "names", []);
    var sourceRoot = util2.getArg(sourceMap2, "sourceRoot", null);
    var sourcesContent = util2.getArg(sourceMap2, "sourcesContent", null);
    var mappings = util2.getArg(sourceMap2, "mappings");
    var file2 = util2.getArg(sourceMap2, "file", null);
    if (version != this._version) {
      throw new Error("Unsupported version: " + version);
    }
    if (sourceRoot) {
      sourceRoot = util2.normalize(sourceRoot);
    }
    sources = sources.map(String).map(util2.normalize).map(function(source) {
      return sourceRoot && util2.isAbsolute(sourceRoot) && util2.isAbsolute(source) ? util2.relative(sourceRoot, source) : source;
    });
    this._names = ArraySet.fromArray(names.map(String), true);
    this._sources = ArraySet.fromArray(sources, true);
    this._absoluteSources = this._sources.toArray().map(function(s) {
      return util2.computeSourceURL(sourceRoot, s, aSourceMapURL);
    });
    this.sourceRoot = sourceRoot;
    this.sourcesContent = sourcesContent;
    this._mappings = mappings;
    this._sourceMapURL = aSourceMapURL;
    this.file = file2;
  }
  BasicSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
  BasicSourceMapConsumer.prototype.consumer = SourceMapConsumer;
  BasicSourceMapConsumer.prototype._findSourceIndex = function(aSource) {
    var relativeSource = aSource;
    if (this.sourceRoot != null) {
      relativeSource = util2.relative(this.sourceRoot, relativeSource);
    }
    if (this._sources.has(relativeSource)) {
      return this._sources.indexOf(relativeSource);
    }
    var i;
    for (i = 0; i < this._absoluteSources.length; ++i) {
      if (this._absoluteSources[i] == aSource) {
        return i;
      }
    }
    return -1;
  };
  BasicSourceMapConsumer.fromSourceMap = function SourceMapConsumer_fromSourceMap(aSourceMap, aSourceMapURL) {
    var smc = Object.create(BasicSourceMapConsumer.prototype);
    var names = smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
    var sources = smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
    smc.sourceRoot = aSourceMap._sourceRoot;
    smc.sourcesContent = aSourceMap._generateSourcesContent(
      smc._sources.toArray(),
      smc.sourceRoot
    );
    smc.file = aSourceMap._file;
    smc._sourceMapURL = aSourceMapURL;
    smc._absoluteSources = smc._sources.toArray().map(function(s) {
      return util2.computeSourceURL(smc.sourceRoot, s, aSourceMapURL);
    });
    var generatedMappings = aSourceMap._mappings.toArray().slice();
    var destGeneratedMappings = smc.__generatedMappings = [];
    var destOriginalMappings = smc.__originalMappings = [];
    for (var i = 0, length = generatedMappings.length; i < length; i++) {
      var srcMapping = generatedMappings[i];
      var destMapping = new Mapping();
      destMapping.generatedLine = srcMapping.generatedLine;
      destMapping.generatedColumn = srcMapping.generatedColumn;
      if (srcMapping.source) {
        destMapping.source = sources.indexOf(srcMapping.source);
        destMapping.originalLine = srcMapping.originalLine;
        destMapping.originalColumn = srcMapping.originalColumn;
        if (srcMapping.name) {
          destMapping.name = names.indexOf(srcMapping.name);
        }
        destOriginalMappings.push(destMapping);
      }
      destGeneratedMappings.push(destMapping);
    }
    quickSort2(smc.__originalMappings, util2.compareByOriginalPositions);
    return smc;
  };
  BasicSourceMapConsumer.prototype._version = 3;
  Object.defineProperty(BasicSourceMapConsumer.prototype, "sources", {
    get: function() {
      return this._absoluteSources.slice();
    }
  });
  function Mapping() {
    this.generatedLine = 0;
    this.generatedColumn = 0;
    this.source = null;
    this.originalLine = null;
    this.originalColumn = null;
    this.name = null;
  }
  BasicSourceMapConsumer.prototype._parseMappings = function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    var generatedLine = 1;
    var previousGeneratedColumn = 0;
    var previousOriginalLine = 0;
    var previousOriginalColumn = 0;
    var previousSource = 0;
    var previousName = 0;
    var length = aStr.length;
    var index = 0;
    var cachedSegments = {};
    var temp = {};
    var originalMappings = [];
    var generatedMappings = [];
    var mapping, str, segment, end, value;
    while (index < length) {
      if (aStr.charAt(index) === ";") {
        generatedLine++;
        index++;
        previousGeneratedColumn = 0;
      } else if (aStr.charAt(index) === ",") {
        index++;
      } else {
        mapping = new Mapping();
        mapping.generatedLine = generatedLine;
        for (end = index; end < length; end++) {
          if (this._charIsMappingSeparator(aStr, end)) {
            break;
          }
        }
        str = aStr.slice(index, end);
        segment = cachedSegments[str];
        if (segment) {
          index += str.length;
        } else {
          segment = [];
          while (index < end) {
            base64VLQ.decode(aStr, index, temp);
            value = temp.value;
            index = temp.rest;
            segment.push(value);
          }
          if (segment.length === 2) {
            throw new Error("Found a source, but no line and column");
          }
          if (segment.length === 3) {
            throw new Error("Found a source and line, but no column");
          }
          cachedSegments[str] = segment;
        }
        mapping.generatedColumn = previousGeneratedColumn + segment[0];
        previousGeneratedColumn = mapping.generatedColumn;
        if (segment.length > 1) {
          mapping.source = previousSource + segment[1];
          previousSource += segment[1];
          mapping.originalLine = previousOriginalLine + segment[2];
          previousOriginalLine = mapping.originalLine;
          mapping.originalLine += 1;
          mapping.originalColumn = previousOriginalColumn + segment[3];
          previousOriginalColumn = mapping.originalColumn;
          if (segment.length > 4) {
            mapping.name = previousName + segment[4];
            previousName += segment[4];
          }
        }
        generatedMappings.push(mapping);
        if (typeof mapping.originalLine === "number") {
          originalMappings.push(mapping);
        }
      }
    }
    quickSort2(generatedMappings, util2.compareByGeneratedPositionsDeflated);
    this.__generatedMappings = generatedMappings;
    quickSort2(originalMappings, util2.compareByOriginalPositions);
    this.__originalMappings = originalMappings;
  };
  BasicSourceMapConsumer.prototype._findMapping = function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName, aColumnName, aComparator, aBias) {
    if (aNeedle[aLineName] <= 0) {
      throw new TypeError("Line must be greater than or equal to 1, got " + aNeedle[aLineName]);
    }
    if (aNeedle[aColumnName] < 0) {
      throw new TypeError("Column must be greater than or equal to 0, got " + aNeedle[aColumnName]);
    }
    return binarySearch2.search(aNeedle, aMappings, aComparator, aBias);
  };
  BasicSourceMapConsumer.prototype.computeColumnSpans = function SourceMapConsumer_computeColumnSpans() {
    for (var index = 0; index < this._generatedMappings.length; ++index) {
      var mapping = this._generatedMappings[index];
      if (index + 1 < this._generatedMappings.length) {
        var nextMapping = this._generatedMappings[index + 1];
        if (mapping.generatedLine === nextMapping.generatedLine) {
          mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
          continue;
        }
      }
      mapping.lastGeneratedColumn = Infinity;
    }
  };
  BasicSourceMapConsumer.prototype.originalPositionFor = function SourceMapConsumer_originalPositionFor(aArgs) {
    var needle = {
      generatedLine: util2.getArg(aArgs, "line"),
      generatedColumn: util2.getArg(aArgs, "column")
    };
    var index = this._findMapping(
      needle,
      this._generatedMappings,
      "generatedLine",
      "generatedColumn",
      util2.compareByGeneratedPositionsDeflated,
      util2.getArg(aArgs, "bias", SourceMapConsumer.GREATEST_LOWER_BOUND)
    );
    if (index >= 0) {
      var mapping = this._generatedMappings[index];
      if (mapping.generatedLine === needle.generatedLine) {
        var source = util2.getArg(mapping, "source", null);
        if (source !== null) {
          source = this._sources.at(source);
          source = util2.computeSourceURL(this.sourceRoot, source, this._sourceMapURL);
        }
        var name = util2.getArg(mapping, "name", null);
        if (name !== null) {
          name = this._names.at(name);
        }
        return {
          source,
          line: util2.getArg(mapping, "originalLine", null),
          column: util2.getArg(mapping, "originalColumn", null),
          name
        };
      }
    }
    return {
      source: null,
      line: null,
      column: null,
      name: null
    };
  };
  BasicSourceMapConsumer.prototype.hasContentsOfAllSources = function BasicSourceMapConsumer_hasContentsOfAllSources() {
    if (!this.sourcesContent) {
      return false;
    }
    return this.sourcesContent.length >= this._sources.size() && !this.sourcesContent.some(function(sc) {
      return sc == null;
    });
  };
  BasicSourceMapConsumer.prototype.sourceContentFor = function SourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
    if (!this.sourcesContent) {
      return null;
    }
    var index = this._findSourceIndex(aSource);
    if (index >= 0) {
      return this.sourcesContent[index];
    }
    var relativeSource = aSource;
    if (this.sourceRoot != null) {
      relativeSource = util2.relative(this.sourceRoot, relativeSource);
    }
    var url;
    if (this.sourceRoot != null && (url = util2.urlParse(this.sourceRoot))) {
      var fileUriAbsPath = relativeSource.replace(/^file:\/\//, "");
      if (url.scheme == "file" && this._sources.has(fileUriAbsPath)) {
        return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)];
      }
      if ((!url.path || url.path == "/") && this._sources.has("/" + relativeSource)) {
        return this.sourcesContent[this._sources.indexOf("/" + relativeSource)];
      }
    }
    if (nullOnMissing) {
      return null;
    } else {
      throw new Error('"' + relativeSource + '" is not in the SourceMap.');
    }
  };
  BasicSourceMapConsumer.prototype.generatedPositionFor = function SourceMapConsumer_generatedPositionFor(aArgs) {
    var source = util2.getArg(aArgs, "source");
    source = this._findSourceIndex(source);
    if (source < 0) {
      return {
        line: null,
        column: null,
        lastColumn: null
      };
    }
    var needle = {
      source,
      originalLine: util2.getArg(aArgs, "line"),
      originalColumn: util2.getArg(aArgs, "column")
    };
    var index = this._findMapping(
      needle,
      this._originalMappings,
      "originalLine",
      "originalColumn",
      util2.compareByOriginalPositions,
      util2.getArg(aArgs, "bias", SourceMapConsumer.GREATEST_LOWER_BOUND)
    );
    if (index >= 0) {
      var mapping = this._originalMappings[index];
      if (mapping.source === needle.source) {
        return {
          line: util2.getArg(mapping, "generatedLine", null),
          column: util2.getArg(mapping, "generatedColumn", null),
          lastColumn: util2.getArg(mapping, "lastGeneratedColumn", null)
        };
      }
    }
    return {
      line: null,
      column: null,
      lastColumn: null
    };
  };
  sourceMapConsumer.BasicSourceMapConsumer = BasicSourceMapConsumer;
  function IndexedSourceMapConsumer(aSourceMap, aSourceMapURL) {
    var sourceMap2 = aSourceMap;
    if (typeof aSourceMap === "string") {
      sourceMap2 = util2.parseSourceMapInput(aSourceMap);
    }
    var version = util2.getArg(sourceMap2, "version");
    var sections = util2.getArg(sourceMap2, "sections");
    if (version != this._version) {
      throw new Error("Unsupported version: " + version);
    }
    this._sources = new ArraySet();
    this._names = new ArraySet();
    var lastOffset = {
      line: -1,
      column: 0
    };
    this._sections = sections.map(function(s) {
      if (s.url) {
        throw new Error("Support for url field in sections not implemented.");
      }
      var offset = util2.getArg(s, "offset");
      var offsetLine = util2.getArg(offset, "line");
      var offsetColumn = util2.getArg(offset, "column");
      if (offsetLine < lastOffset.line || offsetLine === lastOffset.line && offsetColumn < lastOffset.column) {
        throw new Error("Section offsets must be ordered and non-overlapping.");
      }
      lastOffset = offset;
      return {
        generatedOffset: {
          // The offset fields are 0-based, but we use 1-based indices when
          // encoding/decoding from VLQ.
          generatedLine: offsetLine + 1,
          generatedColumn: offsetColumn + 1
        },
        consumer: new SourceMapConsumer(util2.getArg(s, "map"), aSourceMapURL)
      };
    });
  }
  IndexedSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
  IndexedSourceMapConsumer.prototype.constructor = SourceMapConsumer;
  IndexedSourceMapConsumer.prototype._version = 3;
  Object.defineProperty(IndexedSourceMapConsumer.prototype, "sources", {
    get: function() {
      var sources = [];
      for (var i = 0; i < this._sections.length; i++) {
        for (var j = 0; j < this._sections[i].consumer.sources.length; j++) {
          sources.push(this._sections[i].consumer.sources[j]);
        }
      }
      return sources;
    }
  });
  IndexedSourceMapConsumer.prototype.originalPositionFor = function IndexedSourceMapConsumer_originalPositionFor(aArgs) {
    var needle = {
      generatedLine: util2.getArg(aArgs, "line"),
      generatedColumn: util2.getArg(aArgs, "column")
    };
    var sectionIndex = binarySearch2.search(
      needle,
      this._sections,
      function(needle2, section2) {
        var cmp = needle2.generatedLine - section2.generatedOffset.generatedLine;
        if (cmp) {
          return cmp;
        }
        return needle2.generatedColumn - section2.generatedOffset.generatedColumn;
      }
    );
    var section = this._sections[sectionIndex];
    if (!section) {
      return {
        source: null,
        line: null,
        column: null,
        name: null
      };
    }
    return section.consumer.originalPositionFor({
      line: needle.generatedLine - (section.generatedOffset.generatedLine - 1),
      column: needle.generatedColumn - (section.generatedOffset.generatedLine === needle.generatedLine ? section.generatedOffset.generatedColumn - 1 : 0),
      bias: aArgs.bias
    });
  };
  IndexedSourceMapConsumer.prototype.hasContentsOfAllSources = function IndexedSourceMapConsumer_hasContentsOfAllSources() {
    return this._sections.every(function(s) {
      return s.consumer.hasContentsOfAllSources();
    });
  };
  IndexedSourceMapConsumer.prototype.sourceContentFor = function IndexedSourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];
      var content = section.consumer.sourceContentFor(aSource, true);
      if (content) {
        return content;
      }
    }
    if (nullOnMissing) {
      return null;
    } else {
      throw new Error('"' + aSource + '" is not in the SourceMap.');
    }
  };
  IndexedSourceMapConsumer.prototype.generatedPositionFor = function IndexedSourceMapConsumer_generatedPositionFor(aArgs) {
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];
      if (section.consumer._findSourceIndex(util2.getArg(aArgs, "source")) === -1) {
        continue;
      }
      var generatedPosition = section.consumer.generatedPositionFor(aArgs);
      if (generatedPosition) {
        var ret = {
          line: generatedPosition.line + (section.generatedOffset.generatedLine - 1),
          column: generatedPosition.column + (section.generatedOffset.generatedLine === generatedPosition.line ? section.generatedOffset.generatedColumn - 1 : 0)
        };
        return ret;
      }
    }
    return {
      line: null,
      column: null
    };
  };
  IndexedSourceMapConsumer.prototype._parseMappings = function IndexedSourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    this.__generatedMappings = [];
    this.__originalMappings = [];
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];
      var sectionMappings = section.consumer._generatedMappings;
      for (var j = 0; j < sectionMappings.length; j++) {
        var mapping = sectionMappings[j];
        var source = section.consumer._sources.at(mapping.source);
        source = util2.computeSourceURL(section.consumer.sourceRoot, source, this._sourceMapURL);
        this._sources.add(source);
        source = this._sources.indexOf(source);
        var name = null;
        if (mapping.name) {
          name = section.consumer._names.at(mapping.name);
          this._names.add(name);
          name = this._names.indexOf(name);
        }
        var adjustedMapping = {
          source,
          generatedLine: mapping.generatedLine + (section.generatedOffset.generatedLine - 1),
          generatedColumn: mapping.generatedColumn + (section.generatedOffset.generatedLine === mapping.generatedLine ? section.generatedOffset.generatedColumn - 1 : 0),
          originalLine: mapping.originalLine,
          originalColumn: mapping.originalColumn,
          name
        };
        this.__generatedMappings.push(adjustedMapping);
        if (typeof adjustedMapping.originalLine === "number") {
          this.__originalMappings.push(adjustedMapping);
        }
      }
    }
    quickSort2(this.__generatedMappings, util2.compareByGeneratedPositionsDeflated);
    quickSort2(this.__originalMappings, util2.compareByOriginalPositions);
  };
  sourceMapConsumer.IndexedSourceMapConsumer = IndexedSourceMapConsumer;
  return sourceMapConsumer;
}
var sourceNode = {};
var hasRequiredSourceNode;
function requireSourceNode() {
  if (hasRequiredSourceNode) return sourceNode;
  hasRequiredSourceNode = 1;
  var SourceMapGenerator = requireSourceMapGenerator().SourceMapGenerator;
  var util2 = requireUtil();
  var REGEX_NEWLINE = /(\r?\n)/;
  var NEWLINE_CODE = 10;
  var isSourceNode = "$$$isSourceNode$$$";
  function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
    this.children = [];
    this.sourceContents = {};
    this.line = aLine == null ? null : aLine;
    this.column = aColumn == null ? null : aColumn;
    this.source = aSource == null ? null : aSource;
    this.name = aName == null ? null : aName;
    this[isSourceNode] = true;
    if (aChunks != null) this.add(aChunks);
  }
  SourceNode.fromStringWithSourceMap = function SourceNode_fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer, aRelativePath) {
    var node = new SourceNode();
    var remainingLines = aGeneratedCode.split(REGEX_NEWLINE);
    var remainingLinesIndex = 0;
    var shiftNextLine = function() {
      var lineContents = getNextLine();
      var newLine = getNextLine() || "";
      return lineContents + newLine;
      function getNextLine() {
        return remainingLinesIndex < remainingLines.length ? remainingLines[remainingLinesIndex++] : void 0;
      }
    };
    var lastGeneratedLine = 1, lastGeneratedColumn = 0;
    var lastMapping = null;
    aSourceMapConsumer.eachMapping(function(mapping) {
      if (lastMapping !== null) {
        if (lastGeneratedLine < mapping.generatedLine) {
          addMappingWithCode(lastMapping, shiftNextLine());
          lastGeneratedLine++;
          lastGeneratedColumn = 0;
        } else {
          var nextLine = remainingLines[remainingLinesIndex] || "";
          var code = nextLine.substr(0, mapping.generatedColumn - lastGeneratedColumn);
          remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn - lastGeneratedColumn);
          lastGeneratedColumn = mapping.generatedColumn;
          addMappingWithCode(lastMapping, code);
          lastMapping = mapping;
          return;
        }
      }
      while (lastGeneratedLine < mapping.generatedLine) {
        node.add(shiftNextLine());
        lastGeneratedLine++;
      }
      if (lastGeneratedColumn < mapping.generatedColumn) {
        var nextLine = remainingLines[remainingLinesIndex] || "";
        node.add(nextLine.substr(0, mapping.generatedColumn));
        remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn);
        lastGeneratedColumn = mapping.generatedColumn;
      }
      lastMapping = mapping;
    }, this);
    if (remainingLinesIndex < remainingLines.length) {
      if (lastMapping) {
        addMappingWithCode(lastMapping, shiftNextLine());
      }
      node.add(remainingLines.splice(remainingLinesIndex).join(""));
    }
    aSourceMapConsumer.sources.forEach(function(sourceFile) {
      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
      if (content != null) {
        if (aRelativePath != null) {
          sourceFile = util2.join(aRelativePath, sourceFile);
        }
        node.setSourceContent(sourceFile, content);
      }
    });
    return node;
    function addMappingWithCode(mapping, code) {
      if (mapping === null || mapping.source === void 0) {
        node.add(code);
      } else {
        var source = aRelativePath ? util2.join(aRelativePath, mapping.source) : mapping.source;
        node.add(new SourceNode(
          mapping.originalLine,
          mapping.originalColumn,
          source,
          code,
          mapping.name
        ));
      }
    }
  };
  SourceNode.prototype.add = function SourceNode_add(aChunk) {
    if (Array.isArray(aChunk)) {
      aChunk.forEach(function(chunk) {
        this.add(chunk);
      }, this);
    } else if (aChunk[isSourceNode] || typeof aChunk === "string") {
      if (aChunk) {
        this.children.push(aChunk);
      }
    } else {
      throw new TypeError(
        "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
      );
    }
    return this;
  };
  SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
    if (Array.isArray(aChunk)) {
      for (var i = aChunk.length - 1; i >= 0; i--) {
        this.prepend(aChunk[i]);
      }
    } else if (aChunk[isSourceNode] || typeof aChunk === "string") {
      this.children.unshift(aChunk);
    } else {
      throw new TypeError(
        "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
      );
    }
    return this;
  };
  SourceNode.prototype.walk = function SourceNode_walk(aFn) {
    var chunk;
    for (var i = 0, len = this.children.length; i < len; i++) {
      chunk = this.children[i];
      if (chunk[isSourceNode]) {
        chunk.walk(aFn);
      } else {
        if (chunk !== "") {
          aFn(chunk, {
            source: this.source,
            line: this.line,
            column: this.column,
            name: this.name
          });
        }
      }
    }
  };
  SourceNode.prototype.join = function SourceNode_join(aSep) {
    var newChildren;
    var i;
    var len = this.children.length;
    if (len > 0) {
      newChildren = [];
      for (i = 0; i < len - 1; i++) {
        newChildren.push(this.children[i]);
        newChildren.push(aSep);
      }
      newChildren.push(this.children[i]);
      this.children = newChildren;
    }
    return this;
  };
  SourceNode.prototype.replaceRight = function SourceNode_replaceRight(aPattern, aReplacement) {
    var lastChild = this.children[this.children.length - 1];
    if (lastChild[isSourceNode]) {
      lastChild.replaceRight(aPattern, aReplacement);
    } else if (typeof lastChild === "string") {
      this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
    } else {
      this.children.push("".replace(aPattern, aReplacement));
    }
    return this;
  };
  SourceNode.prototype.setSourceContent = function SourceNode_setSourceContent(aSourceFile, aSourceContent) {
    this.sourceContents[util2.toSetString(aSourceFile)] = aSourceContent;
  };
  SourceNode.prototype.walkSourceContents = function SourceNode_walkSourceContents(aFn) {
    for (var i = 0, len = this.children.length; i < len; i++) {
      if (this.children[i][isSourceNode]) {
        this.children[i].walkSourceContents(aFn);
      }
    }
    var sources = Object.keys(this.sourceContents);
    for (var i = 0, len = sources.length; i < len; i++) {
      aFn(util2.fromSetString(sources[i]), this.sourceContents[sources[i]]);
    }
  };
  SourceNode.prototype.toString = function SourceNode_toString() {
    var str = "";
    this.walk(function(chunk) {
      str += chunk;
    });
    return str;
  };
  SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(aArgs) {
    var generated = {
      code: "",
      line: 1,
      column: 0
    };
    var map = new SourceMapGenerator(aArgs);
    var sourceMappingActive = false;
    var lastOriginalSource = null;
    var lastOriginalLine = null;
    var lastOriginalColumn = null;
    var lastOriginalName = null;
    this.walk(function(chunk, original) {
      generated.code += chunk;
      if (original.source !== null && original.line !== null && original.column !== null) {
        if (lastOriginalSource !== original.source || lastOriginalLine !== original.line || lastOriginalColumn !== original.column || lastOriginalName !== original.name) {
          map.addMapping({
            source: original.source,
            original: {
              line: original.line,
              column: original.column
            },
            generated: {
              line: generated.line,
              column: generated.column
            },
            name: original.name
          });
        }
        lastOriginalSource = original.source;
        lastOriginalLine = original.line;
        lastOriginalColumn = original.column;
        lastOriginalName = original.name;
        sourceMappingActive = true;
      } else if (sourceMappingActive) {
        map.addMapping({
          generated: {
            line: generated.line,
            column: generated.column
          }
        });
        lastOriginalSource = null;
        sourceMappingActive = false;
      }
      for (var idx = 0, length = chunk.length; idx < length; idx++) {
        if (chunk.charCodeAt(idx) === NEWLINE_CODE) {
          generated.line++;
          generated.column = 0;
          if (idx + 1 === length) {
            lastOriginalSource = null;
            sourceMappingActive = false;
          } else if (sourceMappingActive) {
            map.addMapping({
              source: original.source,
              original: {
                line: original.line,
                column: original.column
              },
              generated: {
                line: generated.line,
                column: generated.column
              },
              name: original.name
            });
          }
        } else {
          generated.column++;
        }
      }
    });
    this.walkSourceContents(function(sourceFile, sourceContent) {
      map.setSourceContent(sourceFile, sourceContent);
    });
    return { code: generated.code, map };
  };
  sourceNode.SourceNode = SourceNode;
  return sourceNode;
}
var hasRequiredSourceMap;
function requireSourceMap() {
  if (hasRequiredSourceMap) return sourceMap;
  hasRequiredSourceMap = 1;
  sourceMap.SourceMapGenerator = requireSourceMapGenerator().SourceMapGenerator;
  sourceMap.SourceMapConsumer = requireSourceMapConsumer().SourceMapConsumer;
  sourceMap.SourceNode = requireSourceNode().SourceNode;
  return sourceMap;
}
var bufferFrom_1;
var hasRequiredBufferFrom;
function requireBufferFrom() {
  if (hasRequiredBufferFrom) return bufferFrom_1;
  hasRequiredBufferFrom = 1;
  var toString = Object.prototype.toString;
  var isModern = typeof Buffer !== "undefined" && typeof Buffer.alloc === "function" && typeof Buffer.allocUnsafe === "function" && typeof Buffer.from === "function";
  function isArrayBuffer(input) {
    return toString.call(input).slice(8, -1) === "ArrayBuffer";
  }
  function fromArrayBuffer(obj, byteOffset, length) {
    byteOffset >>>= 0;
    var maxLength = obj.byteLength - byteOffset;
    if (maxLength < 0) {
      throw new RangeError("'offset' is out of bounds");
    }
    if (length === void 0) {
      length = maxLength;
    } else {
      length >>>= 0;
      if (length > maxLength) {
        throw new RangeError("'length' is out of bounds");
      }
    }
    return isModern ? Buffer.from(obj.slice(byteOffset, byteOffset + length)) : new Buffer(new Uint8Array(obj.slice(byteOffset, byteOffset + length)));
  }
  function fromString(string, encoding) {
    if (typeof encoding !== "string" || encoding === "") {
      encoding = "utf8";
    }
    if (!Buffer.isEncoding(encoding)) {
      throw new TypeError('"encoding" must be a valid string encoding');
    }
    return isModern ? Buffer.from(string, encoding) : new Buffer(string, encoding);
  }
  function bufferFrom(value, encodingOrOffset, length) {
    if (typeof value === "number") {
      throw new TypeError('"value" argument must not be a number');
    }
    if (isArrayBuffer(value)) {
      return fromArrayBuffer(value, encodingOrOffset, length);
    }
    if (typeof value === "string") {
      return fromString(value, encodingOrOffset);
    }
    return isModern ? Buffer.from(value) : new Buffer(value);
  }
  bufferFrom_1 = bufferFrom;
  return bufferFrom_1;
}
sourceMapSupport.exports;
var hasRequiredSourceMapSupport;
function requireSourceMapSupport() {
  if (hasRequiredSourceMapSupport) return sourceMapSupport.exports;
  hasRequiredSourceMapSupport = 1;
  (function(module, exports) {
    var SourceMapConsumer = requireSourceMap().SourceMapConsumer;
    var path2 = path__default;
    var fs2;
    try {
      fs2 = require2("fs");
      if (!fs2.existsSync || !fs2.readFileSync) {
        fs2 = null;
      }
    } catch (err) {
    }
    var bufferFrom = requireBufferFrom();
    function dynamicRequire(mod, request) {
      return mod.require(request);
    }
    var errorFormatterInstalled = false;
    var uncaughtShimInstalled = false;
    var emptyCacheBetweenOperations = false;
    var environment = "auto";
    var fileContentsCache = {};
    var sourceMapCache = {};
    var reSourceMap = /^data:application\/json[^,]+base64,/;
    var retrieveFileHandlers = [];
    var retrieveMapHandlers = [];
    function isInBrowser() {
      if (environment === "browser")
        return true;
      if (environment === "node")
        return false;
      return typeof window !== "undefined" && typeof XMLHttpRequest === "function" && !(window.require && window.module && window.process && window.process.type === "renderer");
    }
    function hasGlobalProcessEventEmitter() {
      return typeof process === "object" && process !== null && typeof process.on === "function";
    }
    function globalProcessVersion() {
      if (typeof process === "object" && process !== null) {
        return process.version;
      } else {
        return "";
      }
    }
    function globalProcessStderr() {
      if (typeof process === "object" && process !== null) {
        return process.stderr;
      }
    }
    function globalProcessExit(code) {
      if (typeof process === "object" && process !== null && typeof process.exit === "function") {
        return process.exit(code);
      }
    }
    function handlerExec(list) {
      return function(arg) {
        for (var i = 0; i < list.length; i++) {
          var ret = list[i](arg);
          if (ret) {
            return ret;
          }
        }
        return null;
      };
    }
    var retrieveFile = handlerExec(retrieveFileHandlers);
    retrieveFileHandlers.push(function(path3) {
      path3 = path3.trim();
      if (/^file:/.test(path3)) {
        path3 = path3.replace(/file:\/\/\/(\w:)?/, function(protocol, drive) {
          return drive ? "" : (
            // file:///C:/dir/file -> C:/dir/file
            "/"
          );
        });
      }
      if (path3 in fileContentsCache) {
        return fileContentsCache[path3];
      }
      var contents = "";
      try {
        if (!fs2) {
          var xhr = new XMLHttpRequest();
          xhr.open(
            "GET",
            path3,
            /** async */
            false
          );
          xhr.send(null);
          if (xhr.readyState === 4 && xhr.status === 200) {
            contents = xhr.responseText;
          }
        } else if (fs2.existsSync(path3)) {
          contents = fs2.readFileSync(path3, "utf8");
        }
      } catch (er) {
      }
      return fileContentsCache[path3] = contents;
    });
    function supportRelativeURL(file2, url) {
      if (!file2) return url;
      var dir = path2.dirname(file2);
      var match = /^\w+:\/\/[^\/]*/.exec(dir);
      var protocol = match ? match[0] : "";
      var startPath = dir.slice(protocol.length);
      if (protocol && /^\/\w\:/.test(startPath)) {
        protocol += "/";
        return protocol + path2.resolve(dir.slice(protocol.length), url).replace(/\\/g, "/");
      }
      return protocol + path2.resolve(dir.slice(protocol.length), url);
    }
    function retrieveSourceMapURL(source) {
      var fileData;
      if (isInBrowser()) {
        try {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", source, false);
          xhr.send(null);
          fileData = xhr.readyState === 4 ? xhr.responseText : null;
          var sourceMapHeader = xhr.getResponseHeader("SourceMap") || xhr.getResponseHeader("X-SourceMap");
          if (sourceMapHeader) {
            return sourceMapHeader;
          }
        } catch (e) {
        }
      }
      fileData = retrieveFile(source);
      var re = /(?:\/\/[@#][\s]*sourceMappingURL=([^\s'"]+)[\s]*$)|(?:\/\*[@#][\s]*sourceMappingURL=([^\s*'"]+)[\s]*(?:\*\/)[\s]*$)/mg;
      var lastMatch, match;
      while (match = re.exec(fileData)) lastMatch = match;
      if (!lastMatch) return null;
      return lastMatch[1];
    }
    var retrieveSourceMap = handlerExec(retrieveMapHandlers);
    retrieveMapHandlers.push(function(source) {
      var sourceMappingURL = retrieveSourceMapURL(source);
      if (!sourceMappingURL) return null;
      var sourceMapData;
      if (reSourceMap.test(sourceMappingURL)) {
        var rawData = sourceMappingURL.slice(sourceMappingURL.indexOf(",") + 1);
        sourceMapData = bufferFrom(rawData, "base64").toString();
        sourceMappingURL = source;
      } else {
        sourceMappingURL = supportRelativeURL(source, sourceMappingURL);
        sourceMapData = retrieveFile(sourceMappingURL);
      }
      if (!sourceMapData) {
        return null;
      }
      return {
        url: sourceMappingURL,
        map: sourceMapData
      };
    });
    function mapSourcePosition(position) {
      var sourceMap2 = sourceMapCache[position.source];
      if (!sourceMap2) {
        var urlAndMap = retrieveSourceMap(position.source);
        if (urlAndMap) {
          sourceMap2 = sourceMapCache[position.source] = {
            url: urlAndMap.url,
            map: new SourceMapConsumer(urlAndMap.map)
          };
          if (sourceMap2.map.sourcesContent) {
            sourceMap2.map.sources.forEach(function(source, i) {
              var contents = sourceMap2.map.sourcesContent[i];
              if (contents) {
                var url = supportRelativeURL(sourceMap2.url, source);
                fileContentsCache[url] = contents;
              }
            });
          }
        } else {
          sourceMap2 = sourceMapCache[position.source] = {
            url: null,
            map: null
          };
        }
      }
      if (sourceMap2 && sourceMap2.map && typeof sourceMap2.map.originalPositionFor === "function") {
        var originalPosition = sourceMap2.map.originalPositionFor(position);
        if (originalPosition.source !== null) {
          originalPosition.source = supportRelativeURL(
            sourceMap2.url,
            originalPosition.source
          );
          return originalPosition;
        }
      }
      return position;
    }
    function mapEvalOrigin(origin) {
      var match = /^eval at ([^(]+) \((.+):(\d+):(\d+)\)$/.exec(origin);
      if (match) {
        var position = mapSourcePosition({
          source: match[2],
          line: +match[3],
          column: match[4] - 1
        });
        return "eval at " + match[1] + " (" + position.source + ":" + position.line + ":" + (position.column + 1) + ")";
      }
      match = /^eval at ([^(]+) \((.+)\)$/.exec(origin);
      if (match) {
        return "eval at " + match[1] + " (" + mapEvalOrigin(match[2]) + ")";
      }
      return origin;
    }
    function CallSiteToString() {
      var fileName;
      var fileLocation = "";
      if (this.isNative()) {
        fileLocation = "native";
      } else {
        fileName = this.getScriptNameOrSourceURL();
        if (!fileName && this.isEval()) {
          fileLocation = this.getEvalOrigin();
          fileLocation += ", ";
        }
        if (fileName) {
          fileLocation += fileName;
        } else {
          fileLocation += "<anonymous>";
        }
        var lineNumber = this.getLineNumber();
        if (lineNumber != null) {
          fileLocation += ":" + lineNumber;
          var columnNumber = this.getColumnNumber();
          if (columnNumber) {
            fileLocation += ":" + columnNumber;
          }
        }
      }
      var line = "";
      var functionName = this.getFunctionName();
      var addSuffix = true;
      var isConstructor = this.isConstructor();
      var isMethodCall = !(this.isToplevel() || isConstructor);
      if (isMethodCall) {
        var typeName = this.getTypeName();
        if (typeName === "[object Object]") {
          typeName = "null";
        }
        var methodName = this.getMethodName();
        if (functionName) {
          if (typeName && functionName.indexOf(typeName) != 0) {
            line += typeName + ".";
          }
          line += functionName;
          if (methodName && functionName.indexOf("." + methodName) != functionName.length - methodName.length - 1) {
            line += " [as " + methodName + "]";
          }
        } else {
          line += typeName + "." + (methodName || "<anonymous>");
        }
      } else if (isConstructor) {
        line += "new " + (functionName || "<anonymous>");
      } else if (functionName) {
        line += functionName;
      } else {
        line += fileLocation;
        addSuffix = false;
      }
      if (addSuffix) {
        line += " (" + fileLocation + ")";
      }
      return line;
    }
    function cloneCallSite(frame) {
      var object = {};
      Object.getOwnPropertyNames(Object.getPrototypeOf(frame)).forEach(function(name) {
        object[name] = /^(?:is|get)/.test(name) ? function() {
          return frame[name].call(frame);
        } : frame[name];
      });
      object.toString = CallSiteToString;
      return object;
    }
    function wrapCallSite(frame, state) {
      if (state === void 0) {
        state = { nextPosition: null, curPosition: null };
      }
      if (frame.isNative()) {
        state.curPosition = null;
        return frame;
      }
      var source = frame.getFileName() || frame.getScriptNameOrSourceURL();
      if (source) {
        var line = frame.getLineNumber();
        var column = frame.getColumnNumber() - 1;
        var noHeader = /^v(10\.1[6-9]|10\.[2-9][0-9]|10\.[0-9]{3,}|1[2-9]\d*|[2-9]\d|\d{3,}|11\.11)/;
        var headerLength = noHeader.test(globalProcessVersion()) ? 0 : 62;
        if (line === 1 && column > headerLength && !isInBrowser() && !frame.isEval()) {
          column -= headerLength;
        }
        var position = mapSourcePosition({
          source,
          line,
          column
        });
        state.curPosition = position;
        frame = cloneCallSite(frame);
        var originalFunctionName = frame.getFunctionName;
        frame.getFunctionName = function() {
          if (state.nextPosition == null) {
            return originalFunctionName();
          }
          return state.nextPosition.name || originalFunctionName();
        };
        frame.getFileName = function() {
          return position.source;
        };
        frame.getLineNumber = function() {
          return position.line;
        };
        frame.getColumnNumber = function() {
          return position.column + 1;
        };
        frame.getScriptNameOrSourceURL = function() {
          return position.source;
        };
        return frame;
      }
      var origin = frame.isEval() && frame.getEvalOrigin();
      if (origin) {
        origin = mapEvalOrigin(origin);
        frame = cloneCallSite(frame);
        frame.getEvalOrigin = function() {
          return origin;
        };
        return frame;
      }
      return frame;
    }
    function prepareStackTrace(error, stack) {
      if (emptyCacheBetweenOperations) {
        fileContentsCache = {};
        sourceMapCache = {};
      }
      var name = error.name || "Error";
      var message = error.message || "";
      var errorString = name + ": " + message;
      var state = { nextPosition: null, curPosition: null };
      var processedStack = [];
      for (var i = stack.length - 1; i >= 0; i--) {
        processedStack.push("\n    at " + wrapCallSite(stack[i], state));
        state.nextPosition = state.curPosition;
      }
      state.curPosition = state.nextPosition = null;
      return errorString + processedStack.reverse().join("");
    }
    function getErrorSource(error) {
      var match = /\n    at [^(]+ \((.*):(\d+):(\d+)\)/.exec(error.stack);
      if (match) {
        var source = match[1];
        var line = +match[2];
        var column = +match[3];
        var contents = fileContentsCache[source];
        if (!contents && fs2 && fs2.existsSync(source)) {
          try {
            contents = fs2.readFileSync(source, "utf8");
          } catch (er) {
            contents = "";
          }
        }
        if (contents) {
          var code = contents.split(/(?:\r\n|\r|\n)/)[line - 1];
          if (code) {
            return source + ":" + line + "\n" + code + "\n" + new Array(column).join(" ") + "^";
          }
        }
      }
      return null;
    }
    function printErrorAndExit(error) {
      var source = getErrorSource(error);
      var stderr = globalProcessStderr();
      if (stderr && stderr._handle && stderr._handle.setBlocking) {
        stderr._handle.setBlocking(true);
      }
      if (source) {
        console.error();
        console.error(source);
      }
      console.error(error.stack);
      globalProcessExit(1);
    }
    function shimEmitUncaughtException() {
      var origEmit = process.emit;
      process.emit = function(type) {
        if (type === "uncaughtException") {
          var hasStack = arguments[1] && arguments[1].stack;
          var hasListeners = this.listeners(type).length > 0;
          if (hasStack && !hasListeners) {
            return printErrorAndExit(arguments[1]);
          }
        }
        return origEmit.apply(this, arguments);
      };
    }
    var originalRetrieveFileHandlers = retrieveFileHandlers.slice(0);
    var originalRetrieveMapHandlers = retrieveMapHandlers.slice(0);
    exports.wrapCallSite = wrapCallSite;
    exports.getErrorSource = getErrorSource;
    exports.mapSourcePosition = mapSourcePosition;
    exports.retrieveSourceMap = retrieveSourceMap;
    exports.install = function(options) {
      options = options || {};
      if (options.environment) {
        environment = options.environment;
        if (["node", "browser", "auto"].indexOf(environment) === -1) {
          throw new Error("environment " + environment + " was unknown. Available options are {auto, browser, node}");
        }
      }
      if (options.retrieveFile) {
        if (options.overrideRetrieveFile) {
          retrieveFileHandlers.length = 0;
        }
        retrieveFileHandlers.unshift(options.retrieveFile);
      }
      if (options.retrieveSourceMap) {
        if (options.overrideRetrieveSourceMap) {
          retrieveMapHandlers.length = 0;
        }
        retrieveMapHandlers.unshift(options.retrieveSourceMap);
      }
      if (options.hookRequire && !isInBrowser()) {
        var Module = dynamicRequire(module, "module");
        var $compile = Module.prototype._compile;
        if (!$compile.__sourceMapSupport) {
          Module.prototype._compile = function(content, filename) {
            fileContentsCache[filename] = content;
            sourceMapCache[filename] = void 0;
            return $compile.call(this, content, filename);
          };
          Module.prototype._compile.__sourceMapSupport = true;
        }
      }
      if (!emptyCacheBetweenOperations) {
        emptyCacheBetweenOperations = "emptyCacheBetweenOperations" in options ? options.emptyCacheBetweenOperations : false;
      }
      if (!errorFormatterInstalled) {
        errorFormatterInstalled = true;
        Error.prepareStackTrace = prepareStackTrace;
      }
      if (!uncaughtShimInstalled) {
        var installHandler = "handleUncaughtExceptions" in options ? options.handleUncaughtExceptions : true;
        try {
          var worker_threads = dynamicRequire(module, "worker_threads");
          if (worker_threads.isMainThread === false) {
            installHandler = false;
          }
        } catch (e) {
        }
        if (installHandler && hasGlobalProcessEventEmitter()) {
          uncaughtShimInstalled = true;
          shimEmitUncaughtException();
        }
      }
    };
    exports.resetRetrieveHandlers = function() {
      retrieveFileHandlers.length = 0;
      retrieveMapHandlers.length = 0;
      retrieveFileHandlers = originalRetrieveFileHandlers.slice(0);
      retrieveMapHandlers = originalRetrieveMapHandlers.slice(0);
      retrieveSourceMap = handlerExec(retrieveMapHandlers);
      retrieveFile = handlerExec(retrieveFileHandlers);
    };
  })(sourceMapSupport, sourceMapSupport.exports);
  return sourceMapSupport.exports;
}
var hasRequiredRegister;
function requireRegister() {
  if (hasRequiredRegister) return register;
  hasRequiredRegister = 1;
  requireSourceMapSupport().install();
  return register;
}
requireRegister();
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function debounce(func, delay) {
  let timeoutId = null;
  return (...args) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}
class GameConfigHelper {
  static instance;
  // 实例的属性，用来存储路径信息
  installPath;
  gameConfigPath;
  backupPath;
  tftConfigPath;
  //   预设的云顶设置
  isTFTConfig = false;
  constructor(installPath) {
    if (!installPath) {
      throw new Error("初始化失败，必须提供一个有效的游戏安装路径！");
    }
    this.installPath = installPath;
    this.gameConfigPath = path__default.join(this.installPath, "Game", "Config");
    this.backupPath = path__default.join(app.getPath("userData"), "GameConfigBackup");
    this.tftConfigPath = path__default.join(app.getAppPath(), "public", "GameConfig", "TFTConfig");
    console.log(`[ConfigHelper] 游戏设置目录已设定: ${this.gameConfigPath}`);
    console.log(`[ConfigHelper] 备份将存储在: ${this.backupPath}`);
    console.log(`[ConfigHelper] 预设云顶之弈设置目录: ${this.tftConfigPath}`);
  }
  /**
   * 喵~ ✨ 这是新的初始化方法！✨
   * 在你的应用程序启动时，调用一次这个方法来设置好一切。
   * @param installPath 游戏安装目录
   */
  static init(installPath) {
    if (GameConfigHelper.instance) {
      console.warn("[GameConfigHelper] GameConfigHelper 已被初始化过！");
      return;
    }
    GameConfigHelper.instance = new GameConfigHelper(installPath);
  }
  static getInstance() {
    if (!GameConfigHelper.instance) {
      console.error("[GameConfigHelper]GameConfigHelper 还没有被初始化！请先在程序入口调用 init(installPath) 方法。");
      return null;
    }
    return GameConfigHelper.instance;
  }
  // --- 核心功能方法 (Core Function Methods) ---
  /**
   * 备份当前的游戏设置
   * @description 把游戏目录的 Config 文件夹完整地拷贝到我们应用的备份目录里
   */
  static async backup() {
    const instance = GameConfigHelper.getInstance();
    if (!instance) {
      return false;
    }
    const sourceExists = await fs.pathExists(instance.gameConfigPath);
    if (!sourceExists) {
      logger.error(`备份失败！找不到游戏设置目录：${instance.gameConfigPath}`);
      return false;
    }
    try {
      await fs.emptyDir(instance.backupPath);
      await fs.copy(instance.gameConfigPath, instance.backupPath);
      instance.isTFTConfig = false;
      logger.info("设置备份成功！");
    } catch (err) {
      logger.error(`备份过程中发生错误:,${err}`);
      return false;
    }
    return true;
  }
  /**
   * 应用预设的云顶设置
   */
  static async applyTFTConfig() {
    const instance = GameConfigHelper.getInstance();
    if (!instance) {
      logger.info("[GameConfigHelper] restore错误。尚未初始化！");
      return false;
    }
    const pathExist = await fs.pathExists(instance.tftConfigPath);
    if (!pathExist) {
      logger.error(`应用云顶设置失败！找不到设置目录：${instance.tftConfigPath}`);
      return false;
    }
    try {
      await fs.copy(instance.tftConfigPath, instance.gameConfigPath);
      logger.info("云顶挂机游戏设置应用成功！");
      instance.isTFTConfig = true;
    } catch (e) {
      logger.error(`云顶设置应用失败！,${e}`);
      return false;
    }
    return true;
  }
  /**
   * 从备份恢复游戏设置
   * @description 把我们备份的 Config 文件夹拷贝回游戏目录
   * @important 必须先清空目标目录，否则 TFT 配置文件可能残留！
   * @param retryCount 重试次数，默认 3 次
   * @param retryDelay 重试间隔（毫秒），默认 1000ms
   */
  static async restore(retryCount = 3, retryDelay = 1e3) {
    const instance = GameConfigHelper.getInstance();
    if (!instance) {
      console.log("[GameConfigHelper] restore错误。尚未初始化！");
      return false;
    }
    const backupExists = await fs.pathExists(instance.backupPath);
    if (!backupExists) {
      console.error(`恢复设置失败！找不到备份目录：${instance.backupPath}`);
      return false;
    }
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        await fs.emptyDir(instance.gameConfigPath);
        await fs.copy(instance.backupPath, instance.gameConfigPath, {
          overwrite: true,
          // 强制覆盖已存在的文件
          errorOnExist: false
          // 文件存在时不报错
        });
        instance.isTFTConfig = false;
        return true;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const isFileLocked = errMsg.includes("EBUSY") || errMsg.includes("EPERM") || errMsg.includes("resource busy");
        if (attempt < retryCount && isFileLocked) {
          logger.warn(`[GameConfigHelper] 配置文件被占用，${retryDelay}ms 后重试 (${attempt}/${retryCount})...`);
          await sleep(retryDelay);
        } else {
          console.error(`[GameConfigHelper] 恢复设置失败 (尝试 ${attempt}/${retryCount}):`, err);
          if (attempt === retryCount) {
            return false;
          }
        }
      }
    }
    return false;
  }
}
var IpcChannel = /* @__PURE__ */ ((IpcChannel2) => {
  IpcChannel2["CONFIG_BACKUP"] = "config-backup";
  IpcChannel2["CONFIG_RESTORE"] = "config-restore";
  IpcChannel2["LCU_REQUEST"] = "lcu-request";
  IpcChannel2["LCU_CONNECT"] = "lcu-connect";
  IpcChannel2["LCU_DISCONNECT"] = "lcu-disconnect";
  IpcChannel2["LCU_GET_CONNECTION_STATUS"] = "lcu-get-connection-status";
  IpcChannel2["HEX_START"] = "hex-start";
  IpcChannel2["HEX_STOP"] = "hex-stop";
  IpcChannel2["HEX_GET_STATUS"] = "hex-get-status";
  IpcChannel2["HEX_TOGGLE_TRIGGERED"] = "hex-toggle-triggered";
  IpcChannel2["TFT_BUY_AT_SLOT"] = "tft-buy-at-slot";
  IpcChannel2["TFT_GET_SHOP_INFO"] = "tft-get-shop-info";
  IpcChannel2["TFT_GET_EQUIP_INFO"] = "tft-get-equip-info";
  IpcChannel2["TFT_GET_BENCH_INFO"] = "tft-get-bench-info";
  IpcChannel2["TFT_GET_FIGHT_BOARD_INFO"] = "tft-get-fight-board-info";
  IpcChannel2["TFT_GET_LEVEL_INFO"] = "tft-get-level-info";
  IpcChannel2["TFT_GET_COIN_COUNT"] = "tft-get-coin-count";
  IpcChannel2["TFT_GET_LOOT_ORBS"] = "tft-get-loot-orbs";
  IpcChannel2["TFT_TEST_SAVE_BENCH_SLOT_SNAPSHOT"] = "tft-test-save-bench-slot-snapshot";
  IpcChannel2["TFT_TEST_SAVE_FIGHT_BOARD_SLOT_SNAPSHOT"] = "tft-test-save-fight-board-slot-snapshot";
  IpcChannel2["LINEUP_GET_ALL"] = "lineup-get-all";
  IpcChannel2["LINEUP_GET_BY_ID"] = "lineup-get-by-id";
  IpcChannel2["LINEUP_GET_SELECTED_IDS"] = "lineup-get-selected-ids";
  IpcChannel2["LINEUP_SET_SELECTED_IDS"] = "lineup-set-selected-ids";
  IpcChannel2["TFT_GET_CHAMPION_CN_TO_EN_MAP"] = "tft-get-champion-cn-to-en-map";
  IpcChannel2["TFT_GET_MODE"] = "tft-get-mode";
  IpcChannel2["TFT_SET_MODE"] = "tft-set-mode";
  IpcChannel2["LOG_GET_MODE"] = "log-get-mode";
  IpcChannel2["LOG_SET_MODE"] = "log-set-mode";
  IpcChannel2["LOG_GET_AUTO_CLEAN_THRESHOLD"] = "log-get-auto-clean-threshold";
  IpcChannel2["LOG_SET_AUTO_CLEAN_THRESHOLD"] = "log-set-auto-clean-threshold";
  IpcChannel2["LCU_KILL_GAME_PROCESS"] = "lcu-kill-game-process";
  IpcChannel2["SHOW_TOAST"] = "show-toast";
  IpcChannel2["HOTKEY_GET_TOGGLE"] = "hotkey-get-toggle";
  IpcChannel2["HOTKEY_SET_TOGGLE"] = "hotkey-set-toggle";
  IpcChannel2["HOTKEY_GET_STOP_AFTER_GAME"] = "hotkey-get-stop-after-game";
  IpcChannel2["HOTKEY_SET_STOP_AFTER_GAME"] = "hotkey-set-stop-after-game";
  IpcChannel2["HEX_STOP_AFTER_GAME_TRIGGERED"] = "hex-stop-after-game-triggered";
  IpcChannel2["HEX_GET_STOP_AFTER_GAME"] = "hex-get-stop-after-game";
  IpcChannel2["HEX_TOGGLE_STOP_AFTER_GAME"] = "hex-toggle-stop-after-game";
  IpcChannel2["SETTINGS_GET"] = "settings-get";
  IpcChannel2["SETTINGS_SET"] = "settings-set";
  IpcChannel2["UTIL_IS_ELEVATED"] = "util-is-elevated";
  return IpcChannel2;
})(IpcChannel || {});
class IdleState {
  /** 状态名称 */
  name = "IdleState";
  /**
   * 执行空闲状态逻辑
   * @param _signal AbortSignal (此状态不需要，但为保持接口一致性保留)
   * @returns 返回自身，保持空闲状态
   * @description 空闲状态下不做任何操作，等待外部触发状态转换
   */
  async action(_signal) {
    return this;
  }
}
var GameStageType = /* @__PURE__ */ ((GameStageType2) => {
  GameStageType2["EARLY_PVE"] = "EARLY_PVE";
  GameStageType2["PVE"] = "PVE";
  GameStageType2["CAROUSEL"] = "CAROUSEL";
  GameStageType2["AUGMENT"] = "AUGMENT";
  GameStageType2["PVP"] = "PVP";
  GameStageType2["UNKNOWN"] = "UNKNOWN";
  return GameStageType2;
})(GameStageType || {});
var TFTMode = /* @__PURE__ */ ((TFTMode2) => {
  TFTMode2["CLASSIC"] = "CLASSIC";
  TFTMode2["NORMAL"] = "NORMAL";
  TFTMode2["RANK"] = "RANK";
  TFTMode2["CLOCKWORK_TRAILS"] = "CLOCKWORK_TRAILS";
  return TFTMode2;
})(TFTMode || {});
const levelRegion = {
  leftTop: { x: 25, y: 625 },
  rightBottom: { x: 145, y: 645 }
};
const lootRegion = {
  leftTop: { x: 200, y: 125 },
  rightBottom: { x: 855, y: 585 }
};
const littleLegendDefaultPoint = { x: 120, y: 430 };
const selfWalkAroundPoints = {
  left: [{ x: 156, y: 400 }, { x: 165, y: 355 }, { x: 175, y: 315 }, { x: 185, y: 185 }, { x: 195, y: 150 }],
  right: [{ x: 840, y: 495 }, { x: 830, y: 450 }, { x: 830, y: 420 }, { x: 800, y: 280 }, { x: 805, y: 295 }, { x: 790, y: 215 }, { x: 790, y: 215 }, { x: 785, y: 180 }, { x: 785, y: 150 }]
};
const coinRegion = {
  leftTop: { x: 505, y: 626 },
  rightBottom: { x: 545, y: 642 }
};
const shopSlot = {
  SHOP_SLOT_1: { x: 240, y: 700 },
  SHOP_SLOT_2: { x: 380, y: 700 },
  SHOP_SLOT_3: { x: 520, y: 700 },
  SHOP_SLOT_4: { x: 660, y: 700 },
  SHOP_SLOT_5: { x: 800, y: 700 }
};
const shopSlotNameRegions = {
  SLOT_1: {
    // width: 108 height:18
    leftTop: { x: 173, y: 740 },
    rightBottom: { x: 281, y: 758 }
  },
  SLOT_2: {
    leftTop: { x: 315, y: 740 },
    rightBottom: { x: 423, y: 758 }
  },
  SLOT_3: {
    leftTop: { x: 459, y: 740 },
    rightBottom: { x: 567, y: 758 }
  },
  SLOT_4: {
    leftTop: { x: 602, y: 740 },
    rightBottom: { x: 710, y: 758 }
  },
  SLOT_5: {
    leftTop: { x: 746, y: 740 },
    rightBottom: { x: 854, y: 758 }
  }
};
const detailChampionNameRegion = {
  leftTop: { x: 870, y: 226 },
  rightBottom: { x: 978, y: 244 }
};
const detailEquipRegion = {
  SLOT_1: {
    leftTop: { x: 881, y: 347 },
    rightBottom: { x: 919, y: 385 }
  },
  SLOT_2: {
    leftTop: { x: 927, y: 347 },
    rightBottom: { x: 965, y: 385 }
  },
  SLOT_3: {
    leftTop: { x: 973, y: 347 },
    rightBottom: { x: 1011, y: 385 }
  }
};
const itemForgeTooltipRegion = {
  leftTop: { x: 56, y: 7 },
  rightBottom: { x: 176, y: 27 }
};
const itemForgeTooltipRegionEdge = {
  leftTop: { x: 585, y: 7 },
  rightBottom: { x: 695, y: 27 }
};
const detailChampionStarRegion = {
  leftTop: { x: 919, y: 122 },
  rightBottom: { x: 974, y: 132 }
};
const refreshShopPoint = { x: 135, y: 730 };
const buyExpPoint = { x: 135, y: 680 };
const equipmentSlot = {
  EQ_SLOT_1: { x: 20, y: 210 },
  //+35
  EQ_SLOT_2: { x: 20, y: 245 },
  EQ_SLOT_3: { x: 20, y: 280 },
  EQ_SLOT_4: { x: 20, y: 315 },
  EQ_SLOT_5: { x: 20, y: 350 },
  EQ_SLOT_6: { x: 20, y: 385 },
  EQ_SLOT_7: { x: 20, y: 430 },
  //   这里重置下准确位置
  EQ_SLOT_8: { x: 20, y: 465 },
  EQ_SLOT_9: { x: 20, y: 500 },
  EQ_SLOT_10: { x: 20, y: 535 }
};
const equipmentRegion = {
  //  宽24，高25
  SLOT_1: {
    //  y+=36
    leftTop: { x: 9, y: 198 },
    rightBottom: { x: 32, y: 222 }
  },
  SLOT_2: {
    leftTop: { x: 9, y: 234 },
    rightBottom: { x: 32, y: 258 }
  },
  SLOT_3: {
    leftTop: { x: 9, y: 271 },
    rightBottom: { x: 32, y: 295 }
  },
  SLOT_4: {
    leftTop: { x: 9, y: 307 },
    rightBottom: { x: 32, y: 331 }
  },
  SLOT_5: {
    leftTop: { x: 9, y: 344 },
    rightBottom: { x: 32, y: 368 }
  },
  SLOT_6: {
    leftTop: { x: 9, y: 380 },
    rightBottom: { x: 32, y: 404 }
  },
  SLOT_7: {
    leftTop: { x: 9, y: 417 },
    rightBottom: { x: 32, y: 441 }
  },
  SLOT_8: {
    leftTop: { x: 9, y: 453 },
    rightBottom: { x: 32, y: 477 }
  },
  SLOT_9: {
    leftTop: { x: 9, y: 490 },
    rightBottom: { x: 32, y: 514 }
  },
  SLOT_10: {
    leftTop: { x: 9, y: 526 },
    rightBottom: { x: 32, y: 550 }
  }
};
const fightBoardSlotPoint = {
  // x+=80
  //  第一行的棋子位置
  R1_C1: { x: 230, y: 300 },
  R1_C2: { x: 310, y: 300 },
  R1_C3: { x: 390, y: 300 },
  R1_C4: { x: 470, y: 300 },
  R1_C5: { x: 550, y: 300 },
  R1_C6: { x: 630, y: 300 },
  R1_C7: { x: 710, y: 300 },
  //  第二行的棋子位置        //  x+=85
  R2_C1: { x: 260, y: 355 },
  R2_C2: { x: 345, y: 355 },
  R2_C3: { x: 430, y: 355 },
  R2_C4: { x: 515, y: 355 },
  R2_C5: { x: 600, y: 355 },
  R2_C6: { x: 685, y: 355 },
  R2_C7: { x: 770, y: 355 },
  //  第三行棋子的位置        //  x+=90
  R3_C1: { x: 200, y: 405 },
  R3_C2: { x: 290, y: 405 },
  R3_C3: { x: 380, y: 405 },
  R3_C4: { x: 470, y: 405 },
  R3_C5: { x: 560, y: 405 },
  R3_C6: { x: 650, y: 405 },
  R3_C7: { x: 740, y: 405 },
  //  第四行棋子的位置        //  x+=90
  R4_C1: { x: 240, y: 460 },
  R4_C2: { x: 330, y: 460 },
  R4_C3: { x: 420, y: 460 },
  R4_C4: { x: 510, y: 460 },
  R4_C5: { x: 600, y: 460 },
  R4_C6: { x: 690, y: 460 },
  R4_C7: { x: 780, y: 460 }
};
const fightBoardSlotRegion = {
  // x+=80
  //  第一行的棋子位置
  R1_C1: {
    leftTop: { x: 210 + 5, y: 300 - 10 },
    rightBottom: { x: 255 - 5, y: 330 }
  },
  R1_C2: {
    leftTop: { x: 290 + 5, y: 300 - 10 },
    rightBottom: { x: 340 - 5, y: 330 }
  },
  R1_C3: {
    leftTop: { x: 370 + 5, y: 300 - 10 },
    rightBottom: { x: 420 - 5, y: 330 }
  },
  R1_C4: {
    leftTop: { x: 450 + 5, y: 300 - 10 },
    rightBottom: { x: 500 - 5, y: 330 }
  },
  R1_C5: {
    leftTop: { x: 530 + 5, y: 300 - 10 },
    rightBottom: { x: 585 - 5, y: 330 }
  },
  R1_C6: {
    leftTop: { x: 615 + 5, y: 300 - 10 },
    rightBottom: { x: 665 - 5, y: 330 }
  },
  R1_C7: {
    leftTop: { x: 695 + 5, y: 300 - 10 },
    rightBottom: { x: 750 - 5, y: 330 }
  },
  //  第二行的棋子位置        //  x+=85
  R2_C1: {
    leftTop: { x: 240 + 5, y: 350 - 10 },
    rightBottom: { x: 285 - 5, y: 385 }
  },
  R2_C2: {
    leftTop: { x: 325 + 5, y: 350 - 10 },
    rightBottom: { x: 370 - 5, y: 385 }
  },
  R2_C3: {
    leftTop: { x: 410 + 5, y: 350 - 10 },
    rightBottom: { x: 455 - 5, y: 385 }
  },
  R2_C4: {
    leftTop: { x: 495 + 5, y: 350 - 10 },
    rightBottom: { x: 540 - 5, y: 385 }
  },
  R2_C5: {
    leftTop: { x: 575 + 5, y: 350 - 10 },
    rightBottom: { x: 625 - 5, y: 385 }
  },
  R2_C6: {
    leftTop: { x: 660 + 5, y: 350 - 10 },
    rightBottom: { x: 710 - 5, y: 385 }
  },
  R2_C7: {
    leftTop: { x: 745 + 5, y: 350 - 10 },
    rightBottom: { x: 795 - 5, y: 385 }
  },
  //  第三行棋子的位置        //  x+=90
  R3_C1: {
    leftTop: { x: 185 + 5, y: 405 - 10 },
    rightBottom: { x: 230 - 5, y: 440 }
  },
  R3_C2: {
    leftTop: { x: 275 + 5, y: 405 - 10 },
    rightBottom: { x: 320 - 5, y: 440 }
  },
  R3_C3: {
    leftTop: { x: 360 + 5, y: 405 - 10 },
    rightBottom: { x: 410 - 5, y: 440 }
  },
  R3_C4: {
    leftTop: { x: 445 + 5, y: 405 - 10 },
    rightBottom: { x: 495 - 5, y: 440 }
  },
  R3_C5: {
    leftTop: { x: 535 + 5, y: 405 - 10 },
    rightBottom: { x: 585 - 5, y: 440 }
  },
  R3_C6: {
    leftTop: { x: 620 + 5, y: 405 - 10 },
    rightBottom: { x: 675 - 5, y: 440 }
  },
  R3_C7: {
    leftTop: { x: 705 + 5, y: 405 - 10 },
    rightBottom: { x: 760 - 5, y: 440 }
  },
  //  第四行棋子的位置        //  x+=90
  R4_C1: {
    leftTop: { x: 215 + 5, y: 465 - 10 },
    rightBottom: { x: 265 - 5, y: 500 }
  },
  R4_C2: {
    leftTop: { x: 310 + 5, y: 465 - 10 },
    rightBottom: { x: 355 - 5, y: 500 }
  },
  R4_C3: {
    leftTop: { x: 395 + 5, y: 465 - 10 },
    rightBottom: { x: 450 - 5, y: 500 }
  },
  R4_C4: {
    leftTop: { x: 490 + 5, y: 465 - 10 },
    rightBottom: { x: 540 - 5, y: 500 }
  },
  R4_C5: {
    leftTop: { x: 580 + 5, y: 465 - 10 },
    rightBottom: { x: 635 - 5, y: 500 }
  },
  R4_C6: {
    leftTop: { x: 670 + 5, y: 465 - 10 },
    rightBottom: { x: 725 - 5, y: 500 }
  },
  R4_C7: {
    leftTop: { x: 760 + 5, y: 465 - 10 },
    rightBottom: { x: 815 - 5, y: 500 }
  }
};
const benchSlotRegion = {
  SLOT_1: {
    leftTop: { x: 105 + 5, y: 530 - 15 },
    rightBottom: { x: 155 - 5, y: 585 }
  },
  SLOT_2: {
    leftTop: { x: 190 + 5, y: 530 - 15 },
    rightBottom: { x: 245 - 5, y: 585 }
  },
  SLOT_3: {
    leftTop: { x: 270 + 5, y: 530 - 15 },
    rightBottom: { x: 325 - 5, y: 585 }
  },
  SLOT_4: {
    leftTop: { x: 355 + 5, y: 530 - 15 },
    rightBottom: { x: 410 - 5, y: 585 }
  },
  SLOT_5: {
    leftTop: { x: 435 + 5, y: 530 - 15 },
    rightBottom: { x: 495 - 5, y: 585 }
  },
  SLOT_6: {
    leftTop: { x: 520 + 5, y: 530 - 15 },
    rightBottom: { x: 580 - 5, y: 585 }
  },
  SLOT_7: {
    leftTop: { x: 600 + 5, y: 530 - 15 },
    rightBottom: { x: 665 - 5, y: 585 }
  },
  SLOT_8: {
    leftTop: { x: 680 + 5, y: 530 - 15 },
    rightBottom: { x: 750 - 5, y: 585 }
  },
  SLOT_9: {
    leftTop: { x: 765 + 5, y: 530 - 15 },
    rightBottom: { x: 830 - 5, y: 585 }
  }
};
const benchSlotPoints = {
  SLOT_1: { x: 135, y: 555 },
  SLOT_2: { x: 210, y: 555 },
  SLOT_3: { x: 295, y: 555 },
  SLOT_4: { x: 385, y: 555 },
  SLOT_5: { x: 465, y: 555 },
  SLOT_6: { x: 550, y: 555 },
  SLOT_7: { x: 630, y: 555 },
  SLOT_8: { x: 720, y: 555 },
  SLOT_9: { x: 800, y: 555 }
};
const hexSlot = {
  //  x+=295
  SLOT_1: { x: 215, y: 410 },
  SLOT_2: { x: 510, y: 410 },
  SLOT_3: { x: 805, y: 410 }
};
const sharedDraftPoint = { x: 530, y: 400 };
const gameStageDisplayStageOne = {
  leftTop: { x: 411, y: 6 },
  rightBottom: { x: 442, y: 22 }
};
const gameStageDisplayNormal = {
  leftTop: { x: 374, y: 6 },
  rightBottom: { x: 403, y: 22 }
};
const gameStageDisplayTheClockworkTrails = {
  leftTop: { x: 337, y: 6 },
  rightBottom: { x: 366, y: 22 }
};
const combatPhaseTextRegion = {
  leftTop: { x: 465, y: 110 },
  rightBottom: { x: 560, y: 135 }
};
var ItemForgeType = /* @__PURE__ */ ((ItemForgeType2) => {
  ItemForgeType2["NONE"] = "NONE";
  ItemForgeType2["BASIC"] = "BASIC";
  ItemForgeType2["COMPLETED"] = "COMPLETED";
  ItemForgeType2["ARTIFACT"] = "ARTIFACT";
  ItemForgeType2["SUPPORT"] = "SUPPORT";
  return ItemForgeType2;
})(ItemForgeType || {});
const TFT_SPECIAL_CHESS = {
  //  特殊的棋子，比如基础装备锻造器，这种不属于英雄
  "基础装备锻造器": {
    displayName: "基础装备锻造器",
    englishId: "TFT16_ItemForge",
    price: 8,
    // what the fuck? 但数据是这么写的
    traits: [],
    origins: [],
    classes: [],
    attackRange: 0
  },
  "成装锻造器": {
    displayName: "成装锻造器",
    englishId: "TFT_ArmoryKeyCompleted",
    price: 0,
    // what the fuck? 但数据是这么写的
    traits: [],
    origins: [],
    classes: [],
    attackRange: 0
  },
  "神器装备锻造器": {
    displayName: "神器装备锻造器",
    englishId: "TFT_ArmoryKeyOrnn",
    price: 8,
    // what the fuck? 但数据是这么写的
    traits: [],
    origins: [],
    classes: [],
    attackRange: 0
  },
  "辅助装锻造器": {
    displayName: "辅助装锻造器",
    englishId: "TFT_ArmoryKeySupport",
    price: 8,
    // what the fuck? 但数据是这么写的
    traits: [],
    origins: [],
    classes: [],
    attackRange: 0
  },
  "训练假人": {
    displayName: "训练假人",
    englishId: "TFT16_TrainingDummy",
    price: 1,
    // what the fuck? 但数据是这么写的
    traits: [],
    origins: [],
    classes: [],
    attackRange: 0
  }
};
const _TFT_16_CHAMPION_DATA = {
  //  特殊棋子
  ...TFT_SPECIAL_CHESS,
  // 1 费棋子
  "俄洛伊": {
    displayName: "俄洛伊",
    englishId: "TFT16_Illaoi",
    price: 1,
    traits: [
      "比尔吉沃特",
      "斗士"
      /* Bruiser */
    ],
    origins: [
      "比尔吉沃特"
      /* Bilgewater */
    ],
    classes: [
      "斗士"
      /* Bruiser */
    ],
    attackRange: 1
  },
  "贝蕾亚": {
    displayName: "贝蕾亚",
    englishId: "TFT16_Briar",
    price: 1,
    traits: [
      "诺克萨斯",
      "裁决战士",
      "主宰"
      /* Juggernaut */
    ],
    origins: [
      "诺克萨斯"
      /* Noxus */
    ],
    classes: [
      "裁决战士",
      "主宰"
      /* Juggernaut */
    ],
    attackRange: 1
  },
  "艾尼维亚": {
    displayName: "艾尼维亚",
    englishId: "TFT16_Anivia",
    price: 1,
    traits: [
      "弗雷尔卓德",
      "神谕者"
      /* Invoker */
    ],
    origins: [
      "弗雷尔卓德"
      /* Freljord */
    ],
    classes: [
      "神谕者"
      /* Invoker */
    ],
    attackRange: 4
  },
  "嘉文四世": {
    displayName: "嘉文四世",
    englishId: "TFT16_JarvanIV",
    price: 1,
    traits: [
      "德玛西亚",
      "护卫"
      /* Defender */
    ],
    origins: [
      "德玛西亚"
      /* Demacia */
    ],
    classes: [
      "护卫"
      /* Defender */
    ],
    attackRange: 1
  },
  "烬": {
    displayName: "烬",
    englishId: "TFT16_Jhin",
    price: 1,
    traits: [
      "艾欧尼亚",
      "枪手"
      /* Gunslinger */
    ],
    origins: [
      "艾欧尼亚"
      /* Ionia */
    ],
    classes: [
      "枪手"
      /* Gunslinger */
    ],
    attackRange: 4
  },
  "凯特琳": {
    displayName: "凯特琳",
    englishId: "TFT16_Caitlyn",
    price: 1,
    traits: [
      "皮尔特沃夫",
      "狙神"
      /* Longshot */
    ],
    origins: [
      "皮尔特沃夫"
      /* Piltover */
    ],
    classes: [
      "狙神"
      /* Longshot */
    ],
    attackRange: 6
  },
  "克格莫": {
    displayName: "克格莫",
    englishId: "TFT16_KogMaw",
    price: 1,
    traits: [
      "虚空",
      "法师",
      "狙神"
      /* Longshot */
    ],
    origins: [
      "虚空"
      /* Void */
    ],
    classes: [
      "法师",
      "狙神"
      /* Longshot */
    ],
    attackRange: 6
  },
  "璐璐": {
    displayName: "璐璐",
    englishId: "TFT16_Lulu",
    price: 1,
    traits: [
      "约德尔人",
      "法师"
      /* Sorcerer */
    ],
    origins: [
      "约德尔人"
      /* Yordle */
    ],
    classes: [
      "法师"
      /* Sorcerer */
    ],
    attackRange: 4
  },
  "奇亚娜": {
    displayName: "奇亚娜",
    englishId: "TFT16_Qiyana",
    price: 1,
    traits: [
      "以绪塔尔",
      "裁决战士"
      /* Slayer */
    ],
    origins: [
      "以绪塔尔"
      /* Ixtal */
    ],
    classes: [
      "裁决战士"
      /* Slayer */
    ],
    attackRange: 1
  },
  "兰博": {
    displayName: "兰博",
    englishId: "TFT16_Rumble",
    price: 1,
    traits: [
      "约德尔人",
      "护卫"
      /* Defender */
    ],
    origins: [
      "约德尔人"
      /* Yordle */
    ],
    classes: [
      "护卫"
      /* Defender */
    ],
    attackRange: 1
  },
  "慎": {
    displayName: "慎",
    englishId: "TFT16_Shen",
    price: 1,
    traits: [
      "艾欧尼亚",
      "斗士"
      /* Bruiser */
    ],
    origins: [
      "艾欧尼亚"
      /* Ionia */
    ],
    classes: [
      "斗士"
      /* Bruiser */
    ],
    attackRange: 1
  },
  "娑娜": {
    displayName: "娑娜",
    englishId: "TFT16_Sona",
    price: 1,
    traits: [
      "德玛西亚",
      "神谕者"
      /* Invoker */
    ],
    origins: [
      "德玛西亚"
      /* Demacia */
    ],
    classes: [
      "神谕者"
      /* Invoker */
    ],
    attackRange: 4
  },
  "佛耶戈": {
    displayName: "佛耶戈",
    englishId: "TFT16_Viego",
    price: 1,
    traits: [
      "暗影岛",
      "迅击战士"
      /* Rapidfire */
    ],
    origins: [
      "暗影岛"
      /* ShadowIsles */
    ],
    classes: [
      "迅击战士"
      /* Rapidfire */
    ],
    attackRange: 1
  },
  "布里茨": {
    displayName: "布里茨",
    englishId: "TFT16_Blitzcrank",
    price: 1,
    traits: [
      "祖安",
      "主宰"
      /* Juggernaut */
    ],
    origins: [
      "祖安"
      /* Zaun */
    ],
    classes: [
      "主宰"
      /* Juggernaut */
    ],
    attackRange: 1
  },
  // 2 费棋子
  "厄斐琉斯": {
    displayName: "厄斐琉斯",
    englishId: "TFT16_Aphelios",
    price: 2,
    traits: [
      "巨神峰"
      /* Targon */
    ],
    origins: [
      "巨神峰"
      /* Targon */
    ],
    classes: [],
    attackRange: 4
  },
  "艾希": {
    displayName: "艾希",
    englishId: "TFT16_Ashe",
    price: 2,
    traits: [
      "弗雷尔卓德",
      "迅击战士"
      /* Rapidfire */
    ],
    origins: [
      "弗雷尔卓德"
      /* Freljord */
    ],
    classes: [
      "迅击战士"
      /* Rapidfire */
    ],
    attackRange: 4
  },
  "科加斯": {
    displayName: "科加斯",
    englishId: "TFT16_ChoGath",
    price: 2,
    traits: [
      "虚空",
      "主宰"
      /* Juggernaut */
    ],
    origins: [
      "虚空"
      /* Void */
    ],
    classes: [
      "主宰"
      /* Juggernaut */
    ],
    attackRange: 1
  },
  "崔斯特": {
    displayName: "崔斯特",
    englishId: "TFT16_TwistedFate",
    price: 2,
    traits: [
      "比尔吉沃特",
      "迅击战士"
      /* Rapidfire */
    ],
    origins: [
      "比尔吉沃特"
      /* Bilgewater */
    ],
    classes: [
      "迅击战士"
      /* Rapidfire */
    ],
    attackRange: 4
  },
  "艾克": {
    displayName: "艾克",
    englishId: "TFT16_Ekko",
    price: 2,
    traits: [
      "祖安",
      "耀光使"
      /* Magus */
    ],
    origins: [
      "祖安"
      /* Zaun */
    ],
    classes: [
      "耀光使"
      /* Magus */
    ],
    attackRange: 1
  },
  "格雷福斯": {
    displayName: "格雷福斯",
    englishId: "TFT16_Graves",
    price: 2,
    traits: [
      "比尔吉沃特",
      "枪手"
      /* Gunslinger */
    ],
    origins: [
      "比尔吉沃特"
      /* Bilgewater */
    ],
    classes: [
      "枪手"
      /* Gunslinger */
    ],
    attackRange: 2
  },
  "妮蔻": {
    displayName: "妮蔻",
    englishId: "TFT16_Neeko",
    price: 2,
    traits: [
      "以绪塔尔",
      "法师",
      "护卫"
      /* Defender */
    ],
    origins: [
      "以绪塔尔"
      /* Ixtal */
    ],
    classes: [
      "法师",
      "护卫"
      /* Defender */
    ],
    attackRange: 1
  },
  "奥莉安娜": {
    displayName: "奥莉安娜",
    englishId: "TFT16_Orianna",
    price: 2,
    traits: [
      "皮尔特沃夫",
      "神谕者"
      /* Invoker */
    ],
    origins: [
      "皮尔特沃夫"
      /* Piltover */
    ],
    classes: [
      "神谕者"
      /* Invoker */
    ],
    attackRange: 4
  },
  "波比": {
    displayName: "波比",
    englishId: "TFT16_Poppy",
    price: 2,
    traits: [
      "德玛西亚",
      "约德尔人",
      "主宰"
      /* Juggernaut */
    ],
    origins: [
      "德玛西亚",
      "约德尔人"
      /* Yordle */
    ],
    classes: [
      "主宰"
      /* Juggernaut */
    ],
    attackRange: 1
  },
  "雷克塞": {
    displayName: "雷克塞",
    englishId: "TFT16_RekSai",
    price: 2,
    traits: [
      "虚空",
      "征服者"
      /* Vanquisher */
    ],
    origins: [
      "虚空"
      /* Void */
    ],
    classes: [
      "征服者"
      /* Vanquisher */
    ],
    attackRange: 1
  },
  "赛恩": {
    displayName: "赛恩",
    englishId: "TFT16_Sion",
    price: 2,
    traits: [
      "诺克萨斯",
      "斗士"
      /* Bruiser */
    ],
    origins: [
      "诺克萨斯"
      /* Noxus */
    ],
    classes: [
      "斗士"
      /* Bruiser */
    ],
    attackRange: 1
  },
  "提莫": {
    displayName: "提莫",
    englishId: "TFT16_Teemo",
    price: 2,
    traits: [
      "约德尔人",
      "狙神"
      /* Longshot */
    ],
    origins: [
      "约德尔人"
      /* Yordle */
    ],
    classes: [
      "狙神"
      /* Longshot */
    ],
    attackRange: 6
  },
  "崔丝塔娜": {
    displayName: "崔丝塔娜",
    englishId: "TFT16_Tristana",
    price: 2,
    traits: [
      "约德尔人",
      "枪手"
      /* Gunslinger */
    ],
    origins: [
      "约德尔人"
      /* Yordle */
    ],
    classes: [
      "枪手"
      /* Gunslinger */
    ],
    attackRange: 4
  },
  "蔚": {
    displayName: "蔚",
    englishId: "TFT16_Vi",
    price: 2,
    traits: [
      "皮尔特沃夫",
      "祖安",
      "护卫"
      /* Defender */
    ],
    origins: [
      "皮尔特沃夫",
      "祖安"
      /* Zaun */
    ],
    classes: [
      "护卫"
      /* Defender */
    ],
    attackRange: 1
  },
  "亚索": {
    displayName: "亚索",
    englishId: "TFT16_Yasuo",
    price: 2,
    traits: [
      "艾欧尼亚",
      "裁决战士"
      /* Slayer */
    ],
    origins: [
      "艾欧尼亚"
      /* Ionia */
    ],
    classes: [
      "裁决战士"
      /* Slayer */
    ],
    attackRange: 1
  },
  "约里克": {
    displayName: "约里克",
    englishId: "TFT16_Yorick",
    price: 2,
    traits: [
      "暗影岛",
      "神盾使"
      /* Warden */
    ],
    origins: [
      "暗影岛"
      /* ShadowIsles */
    ],
    classes: [
      "神盾使"
      /* Warden */
    ],
    attackRange: 1
  },
  "赵信": {
    displayName: "赵信",
    englishId: "TFT16_XinZhao",
    price: 2,
    traits: [
      "德玛西亚",
      "艾欧尼亚",
      "神盾使"
      /* Warden */
    ],
    origins: [
      "德玛西亚",
      "艾欧尼亚"
      /* Ionia */
    ],
    classes: [
      "神盾使"
      /* Warden */
    ],
    attackRange: 1
  },
  // 3 费棋子
  "阿狸": {
    displayName: "阿狸",
    englishId: "TFT16_Ahri",
    price: 3,
    traits: [
      "艾欧尼亚",
      "法师"
      /* Sorcerer */
    ],
    origins: [
      "艾欧尼亚"
      /* Ionia */
    ],
    classes: [
      "法师"
      /* Sorcerer */
    ],
    attackRange: 4
  },
  "巴德": {
    displayName: "巴德",
    englishId: "TFT16_Bard",
    price: 3,
    traits: [
      "星界游神"
      /* Caretaker */
    ],
    origins: [
      "星界游神"
      /* Caretaker */
    ],
    classes: [],
    attackRange: 4
  },
  "德莱文": {
    displayName: "德莱文",
    englishId: "TFT16_Draven",
    price: 3,
    traits: [
      "诺克萨斯",
      "迅击战士"
      /* Rapidfire */
    ],
    origins: [
      "诺克萨斯"
      /* Noxus */
    ],
    classes: [
      "迅击战士"
      /* Rapidfire */
    ],
    attackRange: 4
  },
  "德莱厄斯": {
    displayName: "德莱厄斯",
    englishId: "TFT16_Darius",
    price: 3,
    traits: [
      "诺克萨斯",
      "护卫"
      /* Defender */
    ],
    origins: [
      "诺克萨斯"
      /* Noxus */
    ],
    classes: [
      "护卫"
      /* Defender */
    ],
    attackRange: 1
  },
  "格温": {
    displayName: "格温",
    englishId: "TFT16_Gwen",
    price: 3,
    traits: [
      "暗影岛",
      "耀光使"
      /* Magus */
    ],
    origins: [
      "暗影岛"
      /* ShadowIsles */
    ],
    classes: [
      "耀光使"
      /* Magus */
    ],
    attackRange: 1
  },
  "金克丝": {
    displayName: "金克丝",
    englishId: "TFT16_Jinx",
    price: 3,
    traits: [
      "祖安",
      "枪手"
      /* Gunslinger */
    ],
    origins: [
      "祖安"
      /* Zaun */
    ],
    classes: [
      "枪手"
      /* Gunslinger */
    ],
    attackRange: 4
  },
  "凯南": {
    displayName: "凯南",
    englishId: "TFT16_Kennen",
    price: 3,
    traits: [
      "艾欧尼亚",
      "约德尔人",
      "护卫"
      /* Defender */
    ],
    origins: [
      "艾欧尼亚",
      "约德尔人"
      /* Yordle */
    ],
    classes: [
      "护卫"
      /* Defender */
    ],
    attackRange: 1
  },
  "可酷伯与悠米": {
    displayName: "可酷伯与悠米",
    englishId: "TFT16_Kobuko",
    price: 3,
    traits: [
      "约德尔人",
      "斗士",
      "神谕者"
      /* Invoker */
    ],
    origins: [
      "约德尔人"
      /* Yordle */
    ],
    classes: [
      "斗士",
      "神谕者"
      /* Invoker */
    ],
    attackRange: 1
  },
  "乐芙兰": {
    displayName: "乐芙兰",
    englishId: "TFT16_Leblanc",
    price: 3,
    traits: [
      "诺克萨斯",
      "神谕者"
      /* Invoker */
    ],
    origins: [
      "诺克萨斯"
      /* Noxus */
    ],
    classes: [
      "神谕者"
      /* Invoker */
    ],
    attackRange: 4
  },
  "洛里斯": {
    displayName: "洛里斯",
    englishId: "TFT16_Loris",
    price: 3,
    traits: [
      "皮尔特沃夫",
      "神盾使"
      /* Warden */
    ],
    origins: [
      "皮尔特沃夫"
      /* Piltover */
    ],
    classes: [
      "神盾使"
      /* Warden */
    ],
    attackRange: 1
  },
  "玛尔扎哈": {
    displayName: "玛尔扎哈",
    englishId: "TFT16_Malzahar",
    price: 3,
    traits: [
      "虚空",
      "耀光使"
      /* Magus */
    ],
    origins: [
      "虚空"
      /* Void */
    ],
    classes: [
      "耀光使"
      /* Magus */
    ],
    attackRange: 4
  },
  "米利欧": {
    displayName: "米利欧",
    englishId: "TFT16_Milio",
    price: 3,
    traits: [
      "以绪塔尔",
      "神谕者"
      /* Invoker */
    ],
    origins: [
      "以绪塔尔"
      /* Ixtal */
    ],
    classes: [
      "神谕者"
      /* Invoker */
    ],
    attackRange: 4
  },
  "诺提勒斯": {
    displayName: "诺提勒斯",
    englishId: "TFT16_Nautilus",
    price: 3,
    traits: [
      "比尔吉沃特",
      "主宰",
      "神盾使"
      /* Warden */
    ],
    origins: [
      "比尔吉沃特"
      /* Bilgewater */
    ],
    classes: [
      "主宰",
      "神盾使"
      /* Warden */
    ],
    attackRange: 1
  },
  "普朗克": {
    displayName: "普朗克",
    englishId: "TFT16_Gangplank",
    price: 3,
    traits: [
      "比尔吉沃特",
      "裁决战士",
      "征服者"
      /* Vanquisher */
    ],
    origins: [
      "比尔吉沃特"
      /* Bilgewater */
    ],
    classes: [
      "裁决战士",
      "征服者"
      /* Vanquisher */
    ],
    attackRange: 1
  },
  "瑟庄妮": {
    displayName: "瑟庄妮",
    englishId: "TFT16_Sejuani",
    price: 3,
    traits: [
      "弗雷尔卓德",
      "护卫"
      /* Defender */
    ],
    origins: [
      "弗雷尔卓德"
      /* Freljord */
    ],
    classes: [
      "护卫"
      /* Defender */
    ],
    attackRange: 1
  },
  "薇恩": {
    displayName: "薇恩",
    englishId: "TFT16_Vayne",
    price: 3,
    traits: [
      "德玛西亚",
      "狙神"
      /* Longshot */
    ],
    origins: [
      "德玛西亚"
      /* Demacia */
    ],
    classes: [
      "狙神"
      /* Longshot */
    ],
    attackRange: 4
  },
  "蒙多医生": {
    displayName: "蒙多医生",
    englishId: "TFT16_DrMundo",
    price: 3,
    traits: [
      "祖安",
      "斗士"
      /* Bruiser */
    ],
    origins: [
      "祖安"
      /* Zaun */
    ],
    classes: [
      "斗士"
      /* Bruiser */
    ],
    attackRange: 1
  },
  // 4 费棋子
  "安蓓萨": {
    displayName: "安蓓萨",
    englishId: "TFT16_Ambessa",
    price: 4,
    traits: [
      "诺克萨斯",
      "征服者"
      /* Vanquisher */
    ],
    origins: [
      "诺克萨斯"
      /* Noxus */
    ],
    classes: [
      "征服者"
      /* Vanquisher */
    ],
    attackRange: 1
  },
  "卑尔维斯": {
    displayName: "卑尔维斯",
    englishId: "TFT16_BelVeth",
    price: 4,
    traits: [
      "虚空",
      "裁决战士"
      /* Slayer */
    ],
    origins: [
      "虚空"
      /* Void */
    ],
    classes: [
      "裁决战士"
      /* Slayer */
    ],
    attackRange: 2
  },
  "布隆": {
    displayName: "布隆",
    englishId: "TFT16_Braum",
    price: 4,
    traits: [
      "弗雷尔卓德",
      "神盾使"
      /* Warden */
    ],
    origins: [
      "弗雷尔卓德"
      /* Freljord */
    ],
    classes: [
      "神盾使"
      /* Warden */
    ],
    attackRange: 1
  },
  "黛安娜": {
    displayName: "黛安娜",
    englishId: "TFT16_Diana",
    price: 4,
    traits: [
      "巨神峰"
      /* Targon */
    ],
    origins: [
      "巨神峰"
      /* Targon */
    ],
    classes: [],
    attackRange: 1
  },
  "盖伦": {
    displayName: "盖伦",
    englishId: "TFT16_Garen",
    price: 4,
    traits: [
      "德玛西亚",
      "护卫"
      /* Defender */
    ],
    origins: [
      "德玛西亚"
      /* Demacia */
    ],
    classes: [
      "护卫"
      /* Defender */
    ],
    attackRange: 1
  },
  "卡莉丝塔": {
    displayName: "卡莉丝塔",
    englishId: "TFT16_Kalista",
    price: 4,
    traits: [
      "暗影岛",
      "征服者"
      /* Vanquisher */
    ],
    origins: [
      "暗影岛"
      /* ShadowIsles */
    ],
    classes: [
      "征服者"
      /* Vanquisher */
    ],
    attackRange: 4
  },
  "卡莎": {
    displayName: "卡莎",
    englishId: "TFT16_Kaisa",
    price: 4,
    traits: [
      "虚空之女",
      "虚空",
      "狙神"
      /* Longshot */
    ],
    origins: [
      "虚空之女",
      "虚空"
      /* Void */
    ],
    classes: [
      "狙神"
      /* Longshot */
    ],
    attackRange: 6
  },
  "蕾欧娜": {
    displayName: "蕾欧娜",
    englishId: "TFT16_Leona",
    price: 4,
    traits: [
      "巨神峰"
      /* Targon */
    ],
    origins: [
      "巨神峰"
      /* Targon */
    ],
    classes: [],
    attackRange: 1
  },
  "丽桑卓": {
    displayName: "丽桑卓",
    englishId: "TFT16_Lissandra",
    price: 4,
    traits: [
      "弗雷尔卓德",
      "神谕者"
      /* Invoker */
    ],
    origins: [
      "弗雷尔卓德"
      /* Freljord */
    ],
    classes: [
      "神谕者"
      /* Invoker */
    ],
    attackRange: 4
  },
  "拉克丝": {
    displayName: "拉克丝",
    englishId: "TFT16_Lux",
    price: 4,
    traits: [
      "德玛西亚",
      "法师"
      /* Sorcerer */
    ],
    origins: [
      "德玛西亚"
      /* Demacia */
    ],
    classes: [
      "法师"
      /* Sorcerer */
    ],
    attackRange: 4
  },
  "厄运小姐": {
    displayName: "厄运小姐",
    englishId: "TFT16_MissFortune",
    price: 4,
    traits: [
      "比尔吉沃特",
      "枪手"
      /* Gunslinger */
    ],
    origins: [
      "比尔吉沃特"
      /* Bilgewater */
    ],
    classes: [
      "枪手"
      /* Gunslinger */
    ],
    attackRange: 4
  },
  "内瑟斯": {
    displayName: "内瑟斯",
    englishId: "TFT16_Nasus",
    price: 4,
    traits: [
      "恕瑞玛"
      /* Shurima */
    ],
    origins: [
      "恕瑞玛"
      /* Shurima */
    ],
    classes: [],
    attackRange: 1
  },
  "奈德丽": {
    displayName: "奈德丽",
    englishId: "TFT16_Nidalee",
    price: 4,
    traits: [
      "以绪塔尔",
      "狂野女猎手"
      /* Huntress */
    ],
    origins: [
      "以绪塔尔",
      "狂野女猎手"
      /* Huntress */
    ],
    classes: [],
    attackRange: 1
  },
  "雷克顿": {
    displayName: "雷克顿",
    englishId: "TFT16_Renekton",
    price: 4,
    traits: [
      "恕瑞玛"
      /* Shurima */
    ],
    origins: [
      "恕瑞玛"
      /* Shurima */
    ],
    classes: [],
    attackRange: 1
  },
  "萨勒芬妮": {
    displayName: "萨勒芬妮",
    englishId: "TFT16_Seraphine",
    price: 4,
    traits: [
      "皮尔特沃夫",
      "耀光使"
      /* Magus */
    ],
    origins: [
      "皮尔特沃夫"
      /* Piltover */
    ],
    classes: [
      "耀光使"
      /* Magus */
    ],
    attackRange: 4
  },
  "辛吉德": {
    displayName: "辛吉德",
    englishId: "TFT16_Singed",
    price: 4,
    traits: [
      "祖安",
      "主宰"
      /* Juggernaut */
    ],
    origins: [
      "祖安"
      /* Zaun */
    ],
    classes: [
      "主宰"
      /* Juggernaut */
    ],
    attackRange: 1
  },
  "斯卡纳": {
    displayName: "斯卡纳",
    englishId: "TFT16_Skarner",
    price: 4,
    traits: [
      "以绪塔尔"
      /* Ixtal */
    ],
    origins: [
      "以绪塔尔"
      /* Ixtal */
    ],
    classes: [],
    attackRange: 1
  },
  "斯维因": {
    displayName: "斯维因",
    englishId: "TFT16_Swain",
    price: 4,
    traits: [
      "诺克萨斯",
      "法师",
      "主宰"
      /* Juggernaut */
    ],
    origins: [
      "诺克萨斯"
      /* Noxus */
    ],
    classes: [
      "法师",
      "主宰"
      /* Juggernaut */
    ],
    attackRange: 4
  },
  "孙悟空": {
    displayName: "孙悟空",
    englishId: "TFT16_Wukong",
    price: 4,
    traits: [
      "艾欧尼亚",
      "斗士"
      /* Bruiser */
    ],
    origins: [
      "艾欧尼亚"
      /* Ionia */
    ],
    classes: [
      "斗士"
      /* Bruiser */
    ],
    attackRange: 1
  },
  "塔里克": {
    displayName: "塔里克",
    englishId: "TFT16_Taric",
    price: 4,
    traits: [
      "巨神峰"
      /* Targon */
    ],
    origins: [
      "巨神峰"
      /* Targon */
    ],
    classes: [],
    attackRange: 1
  },
  "维迦": {
    displayName: "维迦",
    englishId: "TFT16_Veigar",
    price: 4,
    traits: [
      "约德尔人",
      "法师"
      /* Sorcerer */
    ],
    origins: [
      "约德尔人"
      /* Yordle */
    ],
    classes: [
      "法师"
      /* Sorcerer */
    ],
    attackRange: 4
  },
  "沃里克": {
    displayName: "沃里克",
    englishId: "TFT16_Warwick",
    price: 4,
    traits: [
      "祖安",
      "迅击战士"
      /* Rapidfire */
    ],
    origins: [
      "祖安"
      /* Zaun */
    ],
    classes: [
      "迅击战士"
      /* Rapidfire */
    ],
    attackRange: 1
  },
  "永恩": {
    displayName: "永恩",
    englishId: "TFT16_Yone",
    price: 4,
    traits: [
      "艾欧尼亚",
      "裁决战士"
      /* Slayer */
    ],
    origins: [
      "艾欧尼亚"
      /* Ionia */
    ],
    classes: [
      "裁决战士"
      /* Slayer */
    ],
    attackRange: 1
  },
  "芸阿娜": {
    displayName: "芸阿娜",
    englishId: "TFT16_Yunara",
    price: 4,
    traits: [
      "艾欧尼亚",
      "迅击战士"
      /* Rapidfire */
    ],
    origins: [
      "艾欧尼亚"
      /* Ionia */
    ],
    classes: [
      "迅击战士"
      /* Rapidfire */
    ],
    attackRange: 4
  },
  // 5 费棋子
  "亚托克斯": {
    displayName: "亚托克斯",
    englishId: "TFT16_Aatrox",
    price: 5,
    traits: [
      "暗裔",
      "裁决战士"
      /* Slayer */
    ],
    origins: [
      "暗裔"
      /* Darkin */
    ],
    classes: [
      "裁决战士"
      /* Slayer */
    ],
    attackRange: 1
  },
  "安妮": {
    displayName: "安妮",
    englishId: "TFT16_Annie",
    price: 5,
    traits: [
      "黑暗之女",
      "法师"
      /* Sorcerer */
    ],
    origins: [
      "黑暗之女"
      /* DarkChild */
    ],
    classes: [
      "法师"
      /* Sorcerer */
    ],
    attackRange: 4
  },
  "阿兹尔": {
    displayName: "阿兹尔",
    englishId: "TFT16_Azir",
    price: 5,
    traits: [
      "恕瑞玛",
      "沙漠皇帝",
      "耀光使"
      /* Magus */
    ],
    origins: [
      "恕瑞玛",
      "沙漠皇帝"
      /* Emperor */
    ],
    classes: [
      "耀光使"
      /* Magus */
    ],
    attackRange: 4
  },
  "费德提克": {
    displayName: "费德提克",
    englishId: "TFT16_Fiddlesticks",
    price: 5,
    traits: [
      "远古恐惧",
      "征服者"
      /* Vanquisher */
    ],
    origins: [
      "远古恐惧"
      /* Harvester */
    ],
    classes: [
      "征服者"
      /* Vanquisher */
    ],
    attackRange: 2
  },
  "吉格斯": {
    displayName: "吉格斯",
    englishId: "TFT16_Ziggs",
    price: 5,
    traits: [
      "祖安",
      "约德尔人",
      "狙神"
      /* Longshot */
    ],
    origins: [
      "祖安",
      "约德尔人"
      /* Yordle */
    ],
    classes: [
      "狙神"
      /* Longshot */
    ],
    attackRange: 6
  },
  "加里奥": {
    displayName: "加里奥",
    englishId: "TFT16_Galio",
    price: 5,
    traits: [
      "德玛西亚",
      "正义巨像"
      /* Heroic */
    ],
    origins: [
      "德玛西亚",
      "正义巨像"
      /* Heroic */
    ],
    classes: [],
    attackRange: 1
  },
  "基兰": {
    displayName: "基兰",
    englishId: "TFT16_Zilean",
    price: 5,
    traits: [
      "时光守护者",
      "神谕者"
      /* Invoker */
    ],
    origins: [
      "时光守护者"
      /* Chronokeeper */
    ],
    classes: [
      "神谕者"
      /* Invoker */
    ],
    attackRange: 4
  },
  "千珏": {
    displayName: "千珏",
    englishId: "TFT16_Kindred",
    price: 5,
    traits: [
      "永猎双子",
      "迅击战士"
      /* Rapidfire */
    ],
    origins: [
      "永猎双子"
      /* Kindred */
    ],
    classes: [
      "迅击战士"
      /* Rapidfire */
    ],
    attackRange: 4
  },
  "卢锡安与赛娜": {
    displayName: "卢锡安与赛娜",
    englishId: "TFT16_Lucian",
    price: 5,
    traits: [
      "系魂圣枪",
      "枪手"
      /* Gunslinger */
    ],
    origins: [
      "系魂圣枪"
      /* Soulbound */
    ],
    classes: [
      "枪手"
      /* Gunslinger */
    ],
    attackRange: 4
  },
  "梅尔": {
    displayName: "梅尔",
    englishId: "TFT16_Mel",
    price: 5,
    traits: [
      "诺克萨斯",
      "耀光使"
      /* Magus */
    ],
    origins: [
      "诺克萨斯"
      /* Noxus */
    ],
    classes: [
      "耀光使"
      /* Magus */
    ],
    attackRange: 4
  },
  "奥恩": {
    displayName: "奥恩",
    englishId: "TFT16_Ornn",
    price: 5,
    traits: [
      "山隐之焰",
      "神盾使"
      /* Warden */
    ],
    origins: [
      "山隐之焰"
      /* Blacksmith */
    ],
    classes: [
      "神盾使"
      /* Warden */
    ],
    attackRange: 1
  },
  "瑟提": {
    displayName: "瑟提",
    englishId: "TFT16_Sett",
    price: 5,
    traits: [
      "艾欧尼亚",
      "腕豪"
      /* TheBoss */
    ],
    origins: [
      "艾欧尼亚",
      "腕豪"
      /* TheBoss */
    ],
    classes: [],
    attackRange: 1
  },
  "希瓦娜": {
    displayName: "希瓦娜",
    englishId: "TFT16_Shyvana",
    price: 5,
    traits: [
      "龙血武姬",
      "主宰"
      /* Juggernaut */
    ],
    origins: [
      "龙血武姬"
      /* Dragonborn */
    ],
    classes: [
      "主宰"
      /* Juggernaut */
    ],
    attackRange: 1
  },
  "塔姆": {
    displayName: "塔姆",
    englishId: "TFT16_TahmKench",
    price: 5,
    traits: [
      "比尔吉沃特",
      "河流之王",
      "斗士"
      /* Bruiser */
    ],
    origins: [
      "比尔吉沃特",
      "河流之王"
      /* Glutton */
    ],
    classes: [
      "斗士"
      /* Bruiser */
    ],
    attackRange: 1
  },
  "锤石": {
    displayName: "锤石",
    englishId: "TFT16_Thresh",
    price: 5,
    traits: [
      "暗影岛",
      "神盾使"
      /* Warden */
    ],
    origins: [
      "暗影岛"
      /* ShadowIsles */
    ],
    classes: [
      "神盾使"
      /* Warden */
    ],
    attackRange: 1
  },
  "沃利贝尔": {
    displayName: "沃利贝尔",
    englishId: "TFT16_Volibear",
    price: 5,
    traits: [
      "弗雷尔卓德",
      "斗士"
      /* Bruiser */
    ],
    origins: [
      "弗雷尔卓德"
      /* Freljord */
    ],
    classes: [
      "斗士"
      /* Bruiser */
    ],
    attackRange: 1
  },
  // 特殊/高费羁绊单位（价格 7）
  "奥瑞利安·索尔": {
    displayName: "奥瑞利安·索尔",
    englishId: "TFT16_AurelionSol",
    price: 7,
    traits: [
      "铸星龙王",
      "巨神峰"
      /* Targon */
    ],
    origins: [
      "铸星龙王",
      "巨神峰"
      /* Targon */
    ],
    classes: [],
    attackRange: 4
  },
  "纳什男爵": {
    displayName: "纳什男爵",
    englishId: "TFT16_BaronNashor",
    price: 7,
    traits: [
      "虚空",
      "纳什男爵"
      /* Baron */
    ],
    origins: [
      "虚空",
      "纳什男爵"
      /* Baron */
    ],
    classes: [],
    attackRange: 2
  },
  "瑞兹": {
    displayName: "瑞兹",
    englishId: "TFT16_Ryze",
    price: 7,
    traits: [
      "符文法师"
      /* RuneMage */
    ],
    origins: [
      "符文法师"
      /* RuneMage */
    ],
    classes: [],
    attackRange: 4
  },
  "亚恒": {
    displayName: "亚恒",
    englishId: "TFT16_Xayah",
    price: 7,
    traits: [
      "暗裔",
      "不落魔锋"
      /* Immortal */
    ],
    origins: [
      "暗裔",
      "不落魔锋"
      /* Immortal */
    ],
    classes: [],
    attackRange: 2
  },
  // 特殊召唤物/机甲/其他
  "海克斯霸龙": {
    displayName: "海克斯霸龙",
    englishId: "TFT16_THex",
    price: 5,
    // 官方数据是5费
    traits: [
      "海克斯机甲",
      "皮尔特沃夫",
      "枪手"
      /* Gunslinger */
    ],
    origins: [
      "海克斯机甲",
      "皮尔特沃夫"
      /* Piltover */
    ],
    classes: [
      "枪手"
      /* Gunslinger */
    ],
    attackRange: 2
  },
  "佐伊": {
    displayName: "佐伊",
    englishId: "TFT16_Zoe",
    price: 3,
    // 官方数据是3费
    traits: [
      "巨神峰"
      /* Targon */
    ],
    origins: [
      "巨神峰"
      /* Targon */
    ],
    classes: [],
    attackRange: 4
  },
  "菲兹": {
    displayName: "菲兹",
    englishId: "TFT16_Fizz",
    price: 4,
    // 官方数据是4费
    traits: [
      "比尔吉沃特",
      "约德尔人"
      /* Yordle */
    ],
    origins: [
      "比尔吉沃特",
      "约德尔人"
      /* Yordle */
    ],
    classes: [],
    // 官方数据 jobs 为空
    attackRange: 1
  }
};
const TFT_16_CHAMPION_DATA = _TFT_16_CHAMPION_DATA;
const specialEquip = {
  //  特殊类型的装备，比如装备拆卸器，强化果实等
  "强化果实": {
    name: "强化果实",
    englishName: "TFT_Item_PowerSnax",
    equipId: "-1",
    //  不知道装备ID
    formula: ""
  },
  "装备拆卸器": {
    name: "装备拆卸器",
    englishName: "TFT_Item_MagneticRemover",
    equipId: "-1",
    //  不知道装备ID
    formula: ""
  },
  "金质装备拆卸器": {
    name: "金质装备拆卸器",
    englishName: "TFT_Item_GoldenItemRemover",
    equipId: "-1",
    //  不知道装备ID
    formula: ""
  },
  "微型英雄复制器": {
    name: "微型英雄复制器",
    englishName: "TFT_Item_LesserChampionDuplicator",
    equipId: "-1",
    //  不知道装备ID
    formula: ""
  },
  "装备重铸器": {
    name: "装备重铸器",
    englishName: "TFT_Item_Reforger",
    equipId: "-1",
    //  不知道装备ID
    formula: ""
  }
};
const _TFT_16_EQUIP_DATA = {
  ...specialEquip,
  // ==========================================
  // Type 1: 基础散件 (Base Items)
  // S16沿用了S15的9大基础散件，但ID已更新。
  // ==========================================
  "暴风之剑": {
    name: "暴风之剑",
    englishName: "TFT_Item_BFSword",
    equipId: "91811",
    formula: ""
  },
  "反曲之弓": {
    name: "反曲之弓",
    englishName: "TFT_Item_RecurveBow",
    equipId: "91859",
    formula: ""
  },
  "无用大棒": {
    name: "无用大棒",
    englishName: "TFT_Item_NeedlesslyLargeRod",
    equipId: "91851",
    formula: ""
  },
  "女神之泪": {
    name: "女神之泪",
    englishName: "TFT_Item_TearOfTheGoddess",
    equipId: "91874",
    formula: ""
  },
  "锁子甲": {
    name: "锁子甲",
    englishName: "TFT_Item_ChainVest",
    equipId: "91817",
    formula: ""
  },
  "负极斗篷": {
    name: "负极斗篷",
    englishName: "TFT_Item_NegatronCloak",
    equipId: "91852",
    formula: ""
  },
  "巨人腰带": {
    name: "巨人腰带",
    englishName: "TFT_Item_GiantsBelt",
    equipId: "91838",
    formula: ""
  },
  "拳套": {
    name: "拳套",
    englishName: "TFT_Item_SparringGloves",
    equipId: "91865",
    formula: ""
  },
  "金铲铲": {
    name: "金铲铲",
    englishName: "TFT_Item_Spatula",
    equipId: "91866",
    formula: ""
  },
  "金锅锅": {
    name: "金锅锅",
    englishName: "TFT_Item_FryingPan",
    equipId: "91836",
    formula: ""
  },
  // ==========================================
  // Type 2: 标准合成装备 (Standard Completed Items)
  // 公式使用S16的新基础装备ID进行引用。
  // ==========================================
  "死亡之刃": {
    name: "死亡之刃",
    englishName: "TFT_Item_Deathblade",
    equipId: "91820",
    formula: "91811,91811"
  },
  "巨人杀手": {
    name: "巨人杀手",
    englishName: "TFT_Item_MadredsBloodrazor",
    equipId: "91848",
    formula: "91811,91859"
  },
  "海克斯科技枪刃": {
    name: "海克斯科技枪刃",
    englishName: "TFT_Item_HextechGunblade",
    equipId: "91841",
    formula: "91811,91851"
  },
  "朔极之矛": {
    name: "朔极之矛",
    englishName: "TFT_Item_SpearOfShojin",
    equipId: "91867",
    formula: "91811,91874"
  },
  "夜之锋刃": {
    name: "夜之锋刃",
    englishName: "TFT_Item_GuardianAngel",
    equipId: "91839",
    formula: "91811,91817"
  },
  "饮血剑": {
    name: "饮血剑",
    englishName: "TFT_Item_Bloodthirster",
    equipId: "91814",
    formula: "91811,91852"
  },
  "斯特拉克的挑战护手": {
    name: "斯特拉克的挑战护手",
    englishName: "TFT_Item_SteraksGage",
    equipId: "91870",
    formula: "91811,91838"
  },
  "无尽之刃": {
    name: "无尽之刃",
    englishName: "TFT_Item_InfinityEdge",
    equipId: "91842",
    formula: "91811,91865"
  },
  "鬼索的狂暴之刃": {
    name: "鬼索的狂暴之刃",
    englishName: "TFT_Item_GuinsoosRageblade",
    equipId: "91840",
    formula: "91859,91851"
  },
  "虚空之杖": {
    name: "虚空之杖",
    englishName: "TFT_Item_StatikkShiv",
    equipId: "91869",
    formula: "91859,91874"
  },
  "泰坦的坚决": {
    name: "泰坦的坚决",
    englishName: "TFT_Item_TitansResolve",
    equipId: "91877",
    formula: "91817,91859"
  },
  "海妖之怒": {
    name: "海妖之怒",
    englishName: "TFT_Item_RunaansHurricane",
    equipId: "91862",
    formula: "91852,91859"
  },
  "纳什之牙": {
    name: "纳什之牙",
    englishName: "TFT_Item_Leviathan",
    equipId: "91846",
    formula: "91859,91838"
  },
  "最后的轻语": {
    name: "最后的轻语",
    englishName: "TFT_Item_LastWhisper",
    equipId: "91845",
    formula: "91859,91865"
  },
  "灭世者的死亡之帽": {
    name: "灭世者的死亡之帽",
    englishName: "TFT_Item_RabadonsDeathcap",
    equipId: "91856",
    formula: "91851,91851"
  },
  "大天使之杖": {
    name: "大天使之杖",
    englishName: "TFT_Item_ArchangelsStaff",
    equipId: "91776",
    formula: "91851,91874"
  },
  "冕卫": {
    name: "冕卫",
    englishName: "TFT_Item_Crownguard",
    equipId: "91819",
    formula: "91851,91817"
  },
  "离子火花": {
    name: "离子火花",
    englishName: "TFT_Item_IonicSpark",
    equipId: "91843",
    formula: "91851,91852"
  },
  "莫雷洛秘典": {
    name: "莫雷洛秘典",
    englishName: "TFT_Item_Morellonomicon",
    equipId: "91850",
    formula: "91851,91838"
  },
  "珠光护手": {
    name: "珠光护手",
    englishName: "TFT_Item_JeweledGauntlet",
    equipId: "91844",
    formula: "91851,91865"
  },
  "蓝霸符": {
    name: "蓝霸符",
    englishName: "TFT_Item_BlueBuff",
    equipId: "91815",
    formula: "91874,91874"
  },
  "圣盾使的誓约": {
    name: "圣盾使的誓约",
    englishName: "TFT_Item_FrozenHeart",
    equipId: "91835",
    formula: "91874,91817"
  },
  "棘刺背心": {
    name: "棘刺背心",
    englishName: "TFT_Item_BrambleVest",
    equipId: "91816",
    formula: "91817,91817"
  },
  "石像鬼石板甲": {
    name: "石像鬼石板甲",
    englishName: "TFT_Item_GargoyleStoneplate",
    equipId: "91837",
    formula: "91817,91852"
  },
  "日炎斗篷": {
    name: "日炎斗篷",
    englishName: "TFT_Item_RedBuff",
    equipId: "91860",
    formula: "91817,91838"
  },
  "坚定之心": {
    name: "坚定之心",
    englishName: "TFT_Item_NightHarvester",
    equipId: "91853",
    formula: "91817,91865"
  },
  "巨龙之爪": {
    name: "巨龙之爪",
    englishName: "TFT_Item_DragonsClaw",
    equipId: "91831",
    formula: "91852,91852"
  },
  "适应性头盔": {
    name: "适应性头盔",
    englishName: "TFT_Item_AdaptiveHelm",
    equipId: "91774",
    formula: "91852,91874"
  },
  "薄暮法袍": {
    name: "薄暮法袍",
    englishName: "TFT_Item_SpectralGauntlet",
    equipId: "91868",
    formula: "91852,91838"
  },
  "水银": {
    name: "水银",
    englishName: "TFT_Item_Quicksilver",
    equipId: "91855",
    formula: "91865,91852"
  },
  "振奋盔甲": {
    name: "振奋盔甲",
    englishName: "TFT_Item_Redemption",
    equipId: "91861",
    formula: "91874,91838"
  },
  "狂徒铠甲": {
    name: "狂徒铠甲",
    englishName: "TFT_Item_WarmogsArmor",
    equipId: "91881",
    formula: "91838,91838"
  },
  "强袭者的链枷": {
    name: "强袭者的链枷",
    englishName: "TFT_Item_PowerGauntlet",
    equipId: "91854",
    formula: "91838,91865"
  },
  "正义之手": {
    name: "正义之手",
    englishName: "TFT_Item_UnstableConcoction",
    equipId: "91878",
    formula: "91874,91865"
  },
  "窃贼手套": {
    name: "窃贼手套",
    englishName: "TFT_Item_ThiefsGloves",
    equipId: "91875",
    formula: "91865,91865"
  },
  "红霸符": {
    name: "红霸符",
    englishName: "TFT_Item_RapidFireCannon",
    equipId: "91858",
    formula: "91859,91859"
  },
  // ==========================================
  // Type 2/5: S16 纹章 (Emblems)
  // ==========================================
  "金铲铲冠冕": {
    name: "金铲铲冠冕",
    englishName: "TFT_Item_ForceOfNature",
    equipId: "91834",
    formula: "91866,91866"
  },
  "金锅铲冠冕": {
    name: "金锅铲冠冕",
    englishName: "TFT_Item_TacticiansRing",
    equipId: "91872",
    formula: "91866,91836"
  },
  "金锅锅冠冕": {
    name: "金锅锅冠冕",
    englishName: "TFT_Item_TacticiansScepter",
    equipId: "91873",
    formula: "91836,91836"
  },
  "比尔吉沃特纹章": {
    name: "比尔吉沃特纹章",
    englishName: "TFT16_Item_BilgewaterEmblemItem",
    equipId: "91520",
    formula: "91866,91874"
  },
  "斗士纹章": {
    name: "斗士纹章",
    englishName: "TFT16_Item_BrawlerEmblemItem",
    equipId: "91557",
    formula: "91836,91838"
  },
  "护卫纹章": {
    name: "护卫纹章",
    englishName: "TFT16_Item_DefenderEmblemItem",
    equipId: "91558",
    formula: "91836,91817"
  },
  "德玛西亚纹章": {
    name: "德玛西亚纹章",
    englishName: "TFT16_Item_DemaciaEmblemItem",
    equipId: "91559",
    formula: "91866,91817"
  },
  "弗雷尔卓德纹章": {
    name: "弗雷尔卓德纹章",
    englishName: "TFT16_Item_FreljordEmblemItem",
    equipId: "91560",
    formula: "91866,91838"
  },
  "枪手纹章": {
    name: "枪手纹章",
    englishName: "TFT16_Item_GunslingerEmblemItem",
    equipId: "91561",
    formula: ""
  },
  "神谕者纹章": {
    name: "神谕者纹章",
    englishName: "TFT16_Item_InvokerEmblemItem",
    equipId: "91562",
    formula: "91836,91874"
  },
  "艾欧尼亚纹章": {
    name: "艾欧尼亚纹章",
    englishName: "TFT16_Item_IoniaEmblemItem",
    equipId: "91563",
    formula: "91866,91851"
  },
  "以绪塔尔纹章": {
    name: "以绪塔尔纹章",
    englishName: "TFT16_Item_IxtalEmblemItem",
    equipId: "91564",
    formula: ""
  },
  "主宰纹章": {
    name: "主宰纹章",
    englishName: "TFT16_Item_JuggernautEmblemItem",
    equipId: "91565",
    formula: "91836,91852"
  },
  "狙神纹章": {
    name: "狙神纹章",
    englishName: "TFT16_Item_LongshotEmblemItem",
    equipId: "91566",
    formula: ""
  },
  "耀光使纹章": {
    name: "耀光使纹章",
    englishName: "TFT16_Item_MagusEmblemItem",
    equipId: "91567",
    formula: ""
  },
  "诺克萨斯纹章": {
    name: "诺克萨斯纹章",
    englishName: "TFT16_Item_NoxusEmblemItem",
    equipId: "91568",
    formula: "91866,91811"
  },
  "皮尔特沃夫纹章": {
    name: "皮尔特沃夫纹章",
    englishName: "TFT16_Item_PiltoverEmblemItem",
    equipId: "91569",
    formula: ""
  },
  "迅击战士纹章": {
    name: "迅击战士纹章",
    englishName: "TFT16_Item_RapidfireEmblemItem",
    equipId: "91590",
    formula: "91836,91859"
  },
  "裁决战士纹章": {
    name: "裁决战士纹章",
    englishName: "TFT16_Item_SlayerEmblemItem",
    equipId: "91591",
    formula: "91836,91811"
  },
  "法师纹章": {
    name: "法师纹章",
    englishName: "TFT16_Item_SorcererEmblemItem",
    equipId: "91592",
    formula: "91836,91851"
  },
  "征服者纹章": {
    name: "征服者纹章",
    englishName: "TFT16_Item_VanquisherEmblemItem",
    equipId: "91593",
    formula: "91836,91865"
  },
  "虚空纹章": {
    name: "虚空纹章",
    englishName: "TFT16_Item_VoidEmblemItem",
    equipId: "91594",
    formula: "91866,91859"
  },
  "神盾使纹章": {
    name: "神盾使纹章",
    englishName: "TFT16_Item_WardenEmblemItem",
    equipId: "91595",
    formula: ""
  },
  "约德尔人纹章": {
    name: "约德尔人纹章",
    englishName: "TFT16_Item_YordleEmblemItem",
    equipId: "91596",
    formula: "91866,91852"
  },
  "祖安纹章": {
    name: "祖安纹章",
    englishName: "TFT16_Item_ZaunEmblemItem",
    equipId: "91597",
    formula: "91866,91865"
  },
  // ==========================================
  // Type 3: 光明装备 (Radiant Items)
  // ==========================================
  "光明版适应性头盔": {
    name: "光明版适应性头盔",
    englishName: "TFT5_Item_AdaptiveHelmRadiant",
    equipId: "91621",
    formula: ""
  },
  "光明版大天使之杖": {
    name: "光明版大天使之杖",
    englishName: "TFT5_Item_ArchangelsStaffRadiant",
    equipId: "91622",
    formula: ""
  },
  "光明版饮血剑": {
    name: "光明版饮血剑",
    englishName: "TFT5_Item_BloodthirsterRadiant",
    equipId: "91623",
    formula: ""
  },
  "光明版蓝霸符": {
    name: "光明版蓝霸符",
    englishName: "TFT5_Item_BlueBuffRadiant",
    equipId: "91624",
    formula: ""
  },
  "光明版棘刺背心": {
    name: "光明版棘刺背心",
    englishName: "TFT5_Item_BrambleVestRadiant",
    equipId: "91625",
    formula: ""
  },
  "光明版冕卫": {
    name: "光明版冕卫",
    englishName: "TFT5_Item_CrownguardRadiant",
    equipId: "91626",
    formula: ""
  },
  "光明版死亡之刃": {
    name: "光明版死亡之刃",
    englishName: "TFT5_Item_DeathbladeRadiant",
    equipId: "91627",
    formula: ""
  },
  "光明版巨龙之爪": {
    name: "光明版巨龙之爪",
    englishName: "TFT5_Item_DragonsClawRadiant",
    equipId: "91628",
    formula: ""
  },
  "光明版圣盾使的誓约": {
    name: "光明版圣盾使的誓约",
    englishName: "TFT5_Item_FrozenHeartRadiant",
    equipId: "91629",
    formula: ""
  },
  "光明版石像鬼石板甲": {
    name: "光明版石像鬼石板甲",
    englishName: "TFT5_Item_GargoyleStoneplateRadiant",
    equipId: "91630",
    formula: ""
  },
  "光明版巨人杀手": {
    name: "光明版巨人杀手",
    englishName: "TFT5_Item_GiantSlayerRadiant",
    equipId: "91631",
    formula: ""
  },
  "光明版夜之锋刃": {
    name: "光明版夜之锋刃",
    englishName: "TFT5_Item_GuardianAngelRadiant",
    equipId: "91632",
    formula: ""
  },
  "光明版鬼索的狂暴之刃": {
    name: "光明版鬼索的狂暴之刃",
    englishName: "TFT5_Item_GuinsoosRagebladeRadiant",
    equipId: "91633",
    formula: ""
  },
  "光明版正义之手": {
    name: "光明版正义之手",
    englishName: "TFT5_Item_HandOfJusticeRadiant",
    equipId: "91634",
    formula: ""
  },
  "光明版海克斯科技枪刃": {
    name: "光明版海克斯科技枪刃",
    englishName: "TFT5_Item_HextechGunbladeRadiant",
    equipId: "91635",
    formula: ""
  },
  "光明版无尽之刃": {
    name: "光明版无尽之刃",
    englishName: "TFT5_Item_InfinityEdgeRadiant",
    equipId: "91636",
    formula: ""
  },
  "光明版离子火花": {
    name: "光明版离子火花",
    englishName: "TFT5_Item_IonicSparkRadiant",
    equipId: "91637",
    formula: ""
  },
  "光明版珠光护手": {
    name: "光明版珠光护手",
    englishName: "TFT5_Item_JeweledGauntletRadiant",
    equipId: "91638",
    formula: ""
  },
  "光明版最后的轻语": {
    name: "光明版最后的轻语",
    englishName: "TFT5_Item_LastWhisperRadiant",
    equipId: "91639",
    formula: ""
  },
  "光明版纳什之牙": {
    name: "光明版纳什之牙",
    englishName: "TFT5_Item_LeviathanRadiant",
    equipId: "91640",
    formula: ""
  },
  "光明版莫雷洛秘典": {
    name: "光明版莫雷洛秘典",
    englishName: "TFT5_Item_MorellonomiconRadiant",
    equipId: "91641",
    formula: ""
  },
  "光明版坚定之心": {
    name: "光明版坚定之心",
    englishName: "TFT5_Item_NightHarvesterRadiant",
    equipId: "91642",
    formula: ""
  },
  "光明版水银": {
    name: "光明版水银",
    englishName: "TFT5_Item_QuicksilverRadiant",
    equipId: "91643",
    formula: ""
  },
  "光明版灭世者的死亡之帽": {
    name: "光明版灭世者的死亡之帽",
    englishName: "TFT5_Item_RabadonsDeathcapRadiant",
    equipId: "91644",
    formula: ""
  },
  "光明版红霸符": {
    name: "光明版红霸符",
    englishName: "TFT5_Item_RapidFirecannonRadiant",
    equipId: "91645",
    formula: ""
  },
  "光明版振奋盔甲": {
    name: "光明版振奋盔甲",
    englishName: "TFT5_Item_RedemptionRadiant",
    equipId: "91646",
    formula: ""
  },
  "光明版海妖之怒": {
    name: "光明版海妖之怒",
    englishName: "TFT5_Item_RunaansHurricaneRadiant",
    equipId: "91647",
    formula: ""
  },
  "光明版朔极之矛": {
    name: "光明版朔极之矛",
    englishName: "TFT5_Item_SpearOfShojinRadiant",
    equipId: "91648",
    formula: ""
  },
  "光明版薄暮法袍": {
    name: "光明版薄暮法袍",
    englishName: "TFT5_Item_SpectralGauntletRadiant",
    equipId: "91649",
    formula: ""
  },
  "光明版虚空之杖": {
    name: "光明版虚空之杖",
    englishName: "TFT5_Item_StatikkShivRadiant",
    equipId: "91650",
    formula: ""
  },
  "光明版斯特拉克的挑战护手": {
    name: "光明版斯特拉克的挑战护手",
    englishName: "TFT5_Item_SteraksGageRadiant",
    equipId: "91651",
    formula: ""
  },
  "光明版日炎斗篷": {
    name: "光明版日炎斗篷",
    englishName: "TFT5_Item_SunfireCapeRadiant",
    equipId: "91652",
    formula: ""
  },
  "光明版窃贼手套": {
    name: "光明版窃贼手套",
    englishName: "TFT5_Item_ThiefsGlovesRadiant",
    equipId: "91653",
    formula: ""
  },
  "光明版泰坦的坚决": {
    name: "光明版泰坦的坚决",
    englishName: "TFT5_Item_TitansResolveRadiant",
    equipId: "91654",
    formula: ""
  },
  "光明版强袭者的链枷": {
    name: "光明版强袭者的链枷",
    englishName: "TFT5_Item_TrapClawRadiant",
    equipId: "91655",
    formula: ""
  },
  "光明版狂徒铠甲": {
    name: "光明版狂徒铠甲",
    englishName: "TFT5_Item_WarmogsArmorRadiant",
    equipId: "91656",
    formula: ""
  },
  // ==========================================
  // Type 4: S16 特殊/羁绊装备 (Unique Trait Items)
  // ==========================================
  "残酷弯刀": {
    name: "残酷弯刀",
    englishName: "TFT16_Item_Bilgewater_BilgeratCutlass",
    equipId: "91537",
    formula: ""
  },
  "黑市炸药": {
    name: "黑市炸药",
    englishName: "TFT16_Item_Bilgewater_BlackmarketExplosives",
    equipId: "91538",
    formula: ""
  },
  "强盗的骰子": {
    name: "强盗的骰子",
    englishName: "TFT16_Item_Bilgewater_BrigandsDice",
    equipId: "91539",
    formula: ""
  },
  "船长的酿造品": {
    name: "船长的酿造品",
    englishName: "TFT16_Item_Bilgewater_CaptainsBrew",
    equipId: "91540",
    formula: ""
  },
  "亡者的短剑": {
    name: "亡者的短剑",
    englishName: "TFT16_Item_Bilgewater_DeadmansDagger",
    equipId: "91541",
    formula: ""
  },
  "震畏大炮": {
    name: "震畏大炮",
    englishName: "TFT16_Item_Bilgewater_DreadwayCannon",
    equipId: "91542",
    formula: ""
  },
  "大副的燧发枪": {
    name: "大副的燧发枪",
    englishName: "TFT16_Item_Bilgewater_FirstMatesFlintlock",
    equipId: "91547",
    formula: ""
  },
  "酒吧指虎": {
    name: "酒吧指虎",
    englishName: "TFT16_Item_Bilgewater_FreebootersFrock",
    equipId: "91548",
    formula: ""
  },
  "鬼影望远镜": {
    name: "鬼影望远镜",
    englishName: "TFT16_Item_Bilgewater_HauntedSpyglass",
    equipId: "91549",
    formula: ""
  },
  "船长的帽子": {
    name: "船长的帽子",
    englishName: "TFT16_Item_Bilgewater_JollyRoger",
    equipId: "91553",
    formula: ""
  },
  "幸运达布隆金币": {
    name: "幸运达布隆金币",
    englishName: "TFT16_Item_Bilgewater_LuckyEyepatch",
    equipId: "91554",
    formula: ""
  },
  "成堆柑橘": {
    name: "成堆柑橘",
    englishName: "TFT16_Item_Bilgewater_PileOCitrus",
    equipId: "91555",
    formula: ""
  },
  "黑市补货": {
    name: "黑市补货",
    englishName: "TFT16_Item_Bilgewater_ShopRefresh",
    equipId: "91556",
    formula: ""
  },
  "暗裔之盾": {
    name: "暗裔之盾",
    englishName: "TFT16_TheDarkinAegis",
    equipId: "91598",
    formula: ""
  },
  "暗裔之弓": {
    name: "暗裔之弓",
    englishName: "TFT16_TheDarkinBow",
    equipId: "91599",
    formula: ""
  },
  "暗裔之镰": {
    name: "暗裔之镰",
    englishName: "TFT16_TheDarkinScythe",
    equipId: "91600",
    formula: ""
  },
  "暗裔之杖": {
    name: "暗裔之杖",
    englishName: "TFT16_TheDarkinStaff",
    equipId: "91601",
    formula: ""
  },
  // ==========================================
  // Type 6: 奥恩神器 (Ornn Artifacts)
  // 列表中只保留了 S16 资料中标记为 isShow: "1" 的神器
  // ==========================================
  "死亡之蔑": {
    name: "死亡之蔑",
    englishName: "TFT4_Item_OrnnDeathsDefiance",
    equipId: "91613",
    formula: ""
  },
  "永恒凛冬": {
    name: "永恒凛冬",
    englishName: "TFT4_Item_OrnnEternalWinter",
    equipId: "91614",
    formula: ""
  },
  "三相之力": {
    name: "三相之力",
    englishName: "TFT4_Item_OrnnInfinityForce",
    equipId: "91615",
    formula: ""
  },
  "魔蕴": {
    name: "魔蕴",
    englishName: "TFT4_Item_OrnnMuramana",
    equipId: "91616",
    formula: ""
  },
  "黑曜石切割者": {
    name: "黑曜石切割者",
    englishName: "TFT4_Item_OrnnObsidianCleaver",
    equipId: "91617",
    formula: ""
  },
  "兰顿之兆": {
    name: "兰顿之兆",
    englishName: "TFT4_Item_OrnnRanduinsSanctum",
    equipId: "91618",
    formula: ""
  },
  "金币收集者": {
    name: "金币收集者",
    englishName: "TFT4_Item_OrnnTheCollector",
    equipId: "91619",
    formula: ""
  },
  "中娅悖论": {
    name: "中娅悖论",
    englishName: "TFT4_Item_OrnnZhonyasParadox",
    equipId: "91620",
    formula: ""
  },
  "冥火之拥": {
    name: "冥火之拥",
    englishName: "TFT9_Item_OrnnDeathfireGrasp",
    equipId: "91670",
    formula: ""
  },
  "狙击手的专注": {
    name: "狙击手的专注",
    englishName: "TFT9_Item_OrnnHorizonFocus",
    equipId: "91671",
    formula: ""
  },
  "碎舰者": {
    name: "碎舰者",
    englishName: "TFT9_Item_OrnnHullbreaker",
    equipId: "91672",
    formula: ""
  },
  "铁匠手套": {
    name: "铁匠手套",
    englishName: "TFT9_Item_OrnnPrototypeForge",
    equipId: "91673",
    formula: ""
  },
  "诡术师之镜": {
    name: "诡术师之镜",
    englishName: "TFT9_Item_OrnnTrickstersGlass",
    equipId: "91674",
    formula: ""
  },
  "神器锻造器": {
    name: "神器锻造器",
    englishName: "TFT_Assist_ItemArmoryOrnn",
    equipId: "91720",
    formula: ""
  },
  "神器装备": {
    name: "神器装备",
    englishName: "TFT_Assist_RandomOrnnItem",
    equipId: "91730",
    formula: ""
  },
  "黎明圣盾": {
    name: "黎明圣盾",
    englishName: "TFT_Item_Artifact_AegisOfDawn",
    equipId: "91777",
    formula: ""
  },
  "黄昏圣盾": {
    name: "黄昏圣盾",
    englishName: "TFT_Item_Artifact_AegisOfDusk",
    equipId: "91778",
    formula: ""
  },
  "枯萎珠宝": {
    name: "枯萎珠宝",
    englishName: "TFT_Item_Artifact_BlightingJewel",
    equipId: "91779",
    formula: ""
  },
  "帽子饮品": {
    name: "帽子饮品",
    englishName: "TFT_Item_Artifact_CappaJuice",
    equipId: "91780",
    formula: ""
  },
  "黑暗吸血鬼节杖": {
    name: "黑暗吸血鬼节杖",
    englishName: "TFT_Item_Artifact_CursedVampiricScepter",
    equipId: "91781",
    formula: ""
  },
  "黎明核心": {
    name: "黎明核心",
    englishName: "TFT_Item_Artifact_Dawncore",
    equipId: "91782",
    formula: ""
  },
  "永恒契约": {
    name: "永恒契约",
    englishName: "TFT_Item_Artifact_EternalPact",
    equipId: "91783",
    formula: ""
  },
  "鱼骨头": {
    name: "鱼骨头",
    englishName: "TFT_Item_Artifact_Fishbones",
    equipId: "91784",
    formula: ""
  },
  "禁忌雕像": {
    name: "禁忌雕像",
    englishName: "TFT_Item_Artifact_ForbiddenIdol",
    equipId: "91785",
    formula: ""
  },
  "恶火小斧": {
    name: "恶火小斧",
    englishName: "TFT_Item_Artifact_HellfireHatchet",
    equipId: "91786",
    formula: ""
  },
  "视界专注": {
    name: "视界专注",
    englishName: "TFT_Item_Artifact_HorizonFocus",
    equipId: "91787",
    formula: ""
  },
  "激发之匣": {
    name: "激发之匣",
    englishName: "TFT_Item_Artifact_InnervatingLocket",
    equipId: "91788",
    formula: ""
  },
  "次级镜像人格面具": {
    name: "次级镜像人格面具",
    englishName: "TFT_Item_Artifact_LesserMirroredPersona",
    equipId: "91789",
    formula: ""
  },
  "巫妖之祸": {
    name: "巫妖之祸",
    englishName: "TFT_Item_Artifact_LichBane",
    equipId: "91790",
    formula: ""
  },
  "光盾徽章": {
    name: "光盾徽章",
    englishName: "TFT_Item_Artifact_LightshieldCrest",
    equipId: "91791",
    formula: ""
  },
  "卢登的激荡": {
    name: "卢登的激荡",
    englishName: "TFT_Item_Artifact_LudensTempest",
    equipId: "91792",
    formula: ""
  },
  "修复型回响": {
    name: "修复型回响",
    englishName: "TFT_Item_Artifact_MendingEchoes",
    equipId: "91793",
    formula: ""
  },
  "镜像人格面具": {
    name: "镜像人格面具",
    englishName: "TFT_Item_Artifact_MirroredPersona",
    equipId: "91794",
    formula: ""
  },
  "连指手套": {
    name: "连指手套",
    englishName: "TFT_Item_Artifact_Mittens",
    equipId: "91795",
    formula: ""
  },
  "烁刃": {
    name: "烁刃",
    englishName: "TFT_Item_Artifact_NavoriFlickerblades",
    equipId: "91796",
    formula: ""
  },
  "暗行者之爪": {
    name: "暗行者之爪",
    englishName: "TFT_Item_Artifact_ProwlersClaw",
    equipId: "91797",
    formula: ""
  },
  "疾射火炮": {
    name: "疾射火炮",
    englishName: "TFT_Item_Artifact_RapidFirecannon",
    equipId: "91798",
    formula: ""
  },
  "探索者的护臂": {
    name: "探索者的护臂",
    englishName: "TFT_Item_Artifact_SeekersArmguard",
    equipId: "91799",
    formula: ""
  },
  "暗影木偶": {
    name: "暗影木偶",
    englishName: "TFT_Item_Artifact_ShadowPuppet",
    equipId: "91800",
    formula: ""
  },
  "密银黎明": {
    name: "密银黎明",
    englishName: "TFT_Item_Artifact_SilvermereDawn",
    equipId: "91801",
    formula: ""
  },
  "幽魂弯刀": {
    name: "幽魂弯刀",
    englishName: "TFT_Item_Artifact_SpectralCutlass",
    equipId: "91802",
    formula: ""
  },
  "斯塔缇克电刃": {
    name: "斯塔缇克电刃",
    englishName: "TFT_Item_Artifact_StatikkShiv",
    equipId: "91803",
    formula: ""
  },
  "迷离风衣": {
    name: "迷离风衣",
    englishName: "TFT_Item_Artifact_SuspiciousTrenchCoat",
    equipId: "91804",
    formula: ""
  },
  "飞升护符": {
    name: "飞升护符",
    englishName: "TFT_Item_Artifact_TalismanOfAscension",
    equipId: "91805",
    formula: ""
  },
  "顽强不屈": {
    name: "顽强不屈",
    englishName: "TFT_Item_Artifact_TheIndomitable",
    equipId: "91806",
    formula: ""
  },
  "巨型九头蛇": {
    name: "巨型九头蛇",
    englishName: "TFT_Item_Artifact_TitanicHydra",
    equipId: "91807",
    formula: ""
  },
  "无终恨意": {
    name: "无终恨意",
    englishName: "TFT_Item_Artifact_UnendingDespair",
    equipId: "91808",
    formula: ""
  },
  "虚空护手": {
    name: "虚空护手",
    englishName: "TFT_Item_Artifact_VoidGauntlet",
    equipId: "91809",
    formula: ""
  },
  "智慧末刃": {
    name: "智慧末刃",
    englishName: "TFT_Item_Artifact_WitsEnd",
    equipId: "91810",
    formula: ""
  },
  // ==========================================
  // Type 7: 金鳞龙装备 (Shimmerscale Items)
  // ==========================================
  "坚定投资器": {
    name: "坚定投资器",
    englishName: "TFT7_Item_ShimmerscaleDeterminedInvestor",
    equipId: "91659",
    formula: ""
  },
  "钻石之手": {
    name: "钻石之手",
    englishName: "TFT7_Item_ShimmerscaleDiamondHands",
    equipId: "91660",
    formula: ""
  },
  "投机者之刃": {
    name: "投机者之刃",
    englishName: "TFT7_Item_ShimmerscaleGamblersBlade",
    equipId: "91661",
    formula: ""
  },
  "无用大宝石": {
    name: "无用大宝石",
    englishName: "TFT7_Item_ShimmerscaleHeartOfGold",
    equipId: "91663",
    formula: ""
  },
  "大亨之铠": {
    name: "大亨之铠",
    englishName: "TFT7_Item_ShimmerscaleMogulsMail",
    equipId: "91665",
    formula: ""
  },
  "投机者之刃_HR": {
    name: "投机者之刃",
    englishName: "TFT7_Item_ShimmerscaleGamblersBlade_HR",
    equipId: "91662",
    formula: ""
  },
  "无用大宝石_HR": {
    name: "无用大宝石",
    englishName: "TFT7_Item_ShimmerscaleHeartOfGold_HR",
    equipId: "91664",
    formula: ""
  },
  "大亨之铠_HR": {
    name: "大亨之铠",
    englishName: "TFT7_Item_ShimmerscaleMogulsMail_HR",
    equipId: "91666",
    formula: ""
  },
  "德莱文之斧": {
    name: "德莱文之斧",
    englishName: "TFT7_Item_ShimmerscaleDravensAxe",
    equipId: "91418",
    formula: ""
  },
  "贪婪宝珠": {
    name: "贪婪宝珠",
    englishName: "TFT7_Item_ShimmerscaleHighStakes",
    equipId: "91422",
    formula: ""
  },
  "群英冠冕": {
    name: "群英冠冕",
    englishName: "TFT7_Item_ShimmerscaleCrownOfChampions",
    equipId: "91423",
    formula: ""
  },
  // ==========================================
  // Type 8: 辅助装备 (Support Items)
  // ==========================================
  "军团圣盾": {
    name: "军团圣盾",
    englishName: "TFT_Item_AegisOfTheLegion",
    equipId: "9401",
    formula: ""
  },
  "女妖面纱": {
    name: "女妖面纱",
    englishName: "TFT_Item_BansheesVeil",
    equipId: "9402",
    formula: ""
  },
  "殉道美德": {
    name: "殉道美德",
    englishName: "TFT_Item_RadiantVirtue",
    equipId: "9404",
    formula: ""
  },
  "能量圣杯": {
    name: "能量圣杯",
    englishName: "TFT_Item_Chalice",
    equipId: "9405",
    formula: ""
  },
  "钢铁烈阳之匣": {
    name: "钢铁烈阳之匣",
    englishName: "TFT_Item_LocketOfTheIronSolari",
    equipId: "9406",
    formula: ""
  },
  "无用大宝石_8": {
    // 为了不与 Type 7 重复，添加后缀
    name: "无用大宝石",
    englishName: "TFT7_Item_ShimmerscaleHeartOfGold,TFT7_Item_ShimmerscaleHeartOfGold_HR",
    equipId: "9407",
    formula: ""
  },
  "黑曜石切割者_8": {
    // 为了不与 Type 6 重复，添加后缀
    name: "黑曜石切割者",
    englishName: "TFT4_Item_OrnnObsidianCleaver",
    equipId: "9408",
    formula: ""
  },
  "兰顿之兆_8": {
    // 为了不与 Type 6 重复，添加后缀
    name: "兰顿之兆",
    englishName: "TFT4_Item_OrnnRanduinsSanctum",
    equipId: "9409",
    formula: ""
  },
  "静止法衣": {
    name: "静止法衣",
    englishName: "TFT_Item_Shroud",
    equipId: "9410",
    formula: ""
  },
  "基克的先驱": {
    name: "基克的先驱",
    englishName: "TFT_Item_ZekesHerald",
    equipId: "9411",
    formula: ""
  },
  "灵风": {
    name: "灵风",
    englishName: "TFT_Item_Zephyr",
    equipId: "9412",
    formula: ""
  },
  "兹若特传送门_8": {
    // Type 8 辅助装版本
    name: "兹若特传送门",
    englishName: "TFT_Item_TitanicHydra,TFT5_Item_ZzRotPortalRadiant",
    equipId: "9413",
    formula: ""
  },
  "辅助手套": {
    name: "辅助手套",
    englishName: "TFT11_Item_ThiefsGlovesSupport",
    equipId: "91110",
    formula: ""
  },
  "永恒烈焰": {
    name: "永恒烈焰",
    englishName: "TFT_Item_EternalFlame",
    equipId: "91111",
    formula: ""
  },
  "骑士之誓": {
    name: "骑士之誓",
    englishName: "TFT_Item_SupportKnightsVow",
    equipId: "91112",
    formula: ""
  },
  "月石再生器": {
    name: "月石再生器",
    englishName: "TFT_Item_Moonstone",
    equipId: "91113",
    formula: ""
  },
  "恶意": {
    name: "恶意",
    englishName: "TFT_Item_Spite",
    equipId: "91114",
    formula: ""
  },
  "不稳定的财宝箱": {
    name: "不稳定的财宝箱",
    englishName: "TFT_Item_UnstableTreasureChest",
    equipId: "91115",
    formula: ""
  },
  // ==========================================
  // Type 1/2: S15 沿用到 S16 的低 ID 装备 (已在上方 918xx 中包含了大部分重编码，此处添加遗漏的)
  // *注意*: 只有ID小于91xxx, 但isShow: "1"的装备。
  // ==========================================
  "死亡之蔑_T4": {
    // ID 413, 旧版奥恩，但仍标记为可见
    name: "死亡之蔑",
    englishName: "TFT4_Item_OrnnDeathsDefiance",
    equipId: "413",
    formula: ""
  },
  "魔蕴_T4": {
    // ID 414
    name: "魔蕴",
    englishName: "TFT4_Item_OrnnMuramana",
    equipId: "414",
    formula: ""
  },
  "三相之力_T4": {
    // ID 415
    name: "三相之力",
    englishName: "TFT4_Item_OrnnInfinityForce",
    equipId: "415",
    formula: ""
  },
  "金币收集者_T4": {
    // ID 420
    name: "金币收集者",
    englishName: "TFT4_Item_OrnnTheCollector",
    equipId: "420",
    formula: ""
  },
  "中娅悖论_T4": {
    // ID 421
    name: "中娅悖论",
    englishName: "TFT4_Item_OrnnZhonyasParadox",
    equipId: "421",
    formula: ""
  },
  // 注意：基础散件 501-509 和 91163 也在S16数据中被标记为可见，
  // 但为保持S16新ID体系的清晰度，只保留918xx的同名物品。
  "夜之锋刃_T2": {
    // ID 6022, S15合成装
    name: "夜之锋刃",
    englishName: "TFT_Item_GuardianAngel",
    equipId: "6022",
    formula: "501,505"
  },
  "圣盾使的誓约_T2": {
    // ID 7034, S15合成装
    name: "圣盾使的誓约",
    englishName: "TFT_Item_FrozenHeart",
    equipId: "7034",
    formula: "505,504"
  },
  "黯灵龙纹章": {
    // ID 91397
    name: "黯灵龙纹章",
    englishName: "TFT7_Item_DarkflightEmblemItem",
    equipId: "91397",
    formula: "508,505"
  },
  "碧波龙纹章": {
    // ID 91398
    name: "碧波龙纹章",
    englishName: "TFT7_Item_LagoonEmblemItem",
    equipId: "91398",
    formula: "508,509"
  },
  "刺客纹章": {
    // ID 91399
    name: "刺客纹章",
    englishName: "TFT7_Item_AssassinEmblemItem",
    equipId: "91399",
    formula: ""
  },
  "星界龙纹章": {
    // ID 91400
    name: "星界龙纹章",
    englishName: "TFT7_Item_AstralEmblemItem",
    equipId: "91400",
    formula: ""
  },
  "狂刃战士纹章": {
    // ID 91401
    name: "狂刃战士纹章",
    englishName: "TFT7_Item_WarriorEmblemItem",
    equipId: "91401",
    formula: "91163,506"
  },
  "重骑兵纹章": {
    // ID 91402
    name: "重骑兵纹章",
    englishName: "TFT7_Item_CavalierEmblemItem",
    equipId: "91402",
    formula: "91163,505"
  },
  "护卫纹章_T7": {
    // ID 91403
    name: "护卫纹章",
    englishName: "TFT7_Item_GuardianEmblemItem",
    equipId: "91403",
    formula: "91163,509"
  },
  "法师纹章_T7": {
    // ID 91404
    name: "法师纹章",
    englishName: "TFT7_Item_MageEmblemItem",
    equipId: "91404",
    formula: "91163,504"
  },
  "格斗家纹章": {
    // ID 91405
    name: "格斗家纹章",
    englishName: "TFT7_Item_BruiserEmblemItem",
    equipId: "91405",
    formula: "91163,507"
  },
  "幻镜龙纹章": {
    // ID 91406
    name: "幻镜龙纹章",
    englishName: "TFT7_Item_MirageEmblemItem",
    equipId: "91406",
    formula: "508,506"
  },
  "金鳞龙纹章": {
    // ID 91407
    name: "金鳞龙纹章",
    englishName: "TFT7_Item_ShimmerscaleEmblemItem",
    equipId: "91407",
    formula: "508,501"
  },
  "屠龙勇士纹章": {
    // ID 91408
    name: "屠龙勇士纹章",
    englishName: "TFT7_Item_ScalescornEmblemItem",
    equipId: "91408",
    formula: ""
  },
  "风暴龙纹章": {
    // ID 91409
    name: "风暴龙纹章",
    englishName: "TFT7_Item_TempestEmblemItem",
    equipId: "91409",
    formula: "508,502"
  },
  "玉龙纹章": {
    // ID 91410
    name: "玉龙纹章",
    englishName: "TFT7_Item_JadeEmblemItem",
    equipId: "91410",
    formula: "508,504"
  },
  "迅捷射手纹章": {
    // ID 91411
    name: "迅捷射手纹章",
    englishName: "TFT7_Item_SwiftshotEmblemItem",
    equipId: "91411",
    formula: "91163,502"
  },
  "强袭炮手纹章": {
    // ID 91412
    name: "强袭炮手纹章",
    englishName: "TFT7_Item_CannoneerEmblemItem",
    equipId: "91412",
    formula: "91163,501"
  },
  "秘术师纹章": {
    // ID 91413
    name: "秘术师纹章",
    englishName: "TFT7_Item_MysticEmblemItem",
    equipId: "91413",
    formula: ""
  },
  "魔导师纹章": {
    // ID 91414
    name: "魔导师纹章",
    englishName: "TFT7_Item_EvokerEmblemItem",
    equipId: "91414",
    formula: ""
  },
  "冒险家纹章": {
    // ID 91415
    name: "冒险家纹章",
    englishName: "TFT7_Item_GuildEmblemItem",
    equipId: "91415",
    formula: "508,503"
  },
  "神龙尊者纹章": {
    // ID 91416
    name: "神龙尊者纹章",
    englishName: "TFT7_Item_DragonmancerEmblemItem",
    equipId: "91416",
    formula: "91163,503"
  },
  "幽影龙纹章": {
    // ID 91417
    name: "幽影龙纹章",
    englishName: "TFT7_Item_WhispersEmblemItem",
    equipId: "91417",
    formula: "508,507"
  }
};
const TFT_16_EQUIP_DATA = _TFT_16_EQUIP_DATA;
const CHAMPION_EN_TO_CN = {};
for (const [cnName, champion] of Object.entries(TFT_16_CHAMPION_DATA)) {
  if (champion.englishId) {
    CHAMPION_EN_TO_CN[champion.englishId] = cnName;
  }
}
const EQUIP_EN_TO_CN = {};
for (const [cnName, equip] of Object.entries(TFT_16_EQUIP_DATA)) {
  const englishNames = equip.englishName.split(",");
  for (const enName of englishNames) {
    EQUIP_EN_TO_CN[enName.trim()] = cnName;
  }
}
const EQUIP_ALIASES = {
  "TFT16_Item_Bilgewater_DeadmansDagger": "亡者的短剑",
  "TFT16_Item_Bilgewater_FirstMatesFlintlock": "大副的燧发枪",
  "TFT16_Item_Bilgewater_PileOCitrus": "成堆柑橘"
};
Object.assign(EQUIP_EN_TO_CN, EQUIP_ALIASES);
function getChampionRange(championName) {
  return TFT_16_CHAMPION_DATA[championName]?.attackRange;
}
const GAME_WIDTH = 1024;
const GAME_HEIGHT = 768;
const EQUIP_CATEGORY_PRIORITY = [
  "component",
  "special",
  "core",
  "emblem",
  "artifact",
  "radiant"
];
var OcrWorkerType = /* @__PURE__ */ ((OcrWorkerType2) => {
  OcrWorkerType2["GAME_STAGE"] = "GAME_STAGE";
  OcrWorkerType2["CHESS"] = "CHESS";
  OcrWorkerType2["LEVEL"] = "LEVEL";
  OcrWorkerType2["COMBAT_PHASE"] = "COMBAT_PHASE";
  return OcrWorkerType2;
})(OcrWorkerType || {});
class OcrService {
  static instance;
  /** 游戏阶段识别 Worker (英文+数字) */
  gameStageWorker = null;
  /** 棋子名称识别 Worker (中文) */
  chessWorker = null;
  /** 等级识别 Worker (中文"级"字 + 数字) */
  levelWorker = null;
  /** 战斗阶段文字识别 Worker (中文"战斗环节") */
  combatPhaseWorker = null;
  /** Tesseract 语言包路径 */
  get langPath() {
    return path__default.join(process.env.VITE_PUBLIC || ".", "resources/tessdata");
  }
  constructor() {
  }
  /**
   * 获取 OcrService 单例
   */
  static getInstance() {
    if (!OcrService.instance) {
      OcrService.instance = new OcrService();
    }
    return OcrService.instance;
  }
  /**
   * 获取指定类型的 OCR Worker
   * @param type Worker 类型
   * @returns Tesseract Worker 实例
   */
  async getWorker(type) {
    switch (type) {
      case "GAME_STAGE":
        return this.getGameStageWorker();
      case "CHESS":
        return this.getChessWorker();
      case "LEVEL":
        return this.getLevelWorker();
      case "COMBAT_PHASE":
        return this.getCombatPhaseWorker();
      default:
        throw new Error(`未知的 OCR Worker 类型: ${type}`);
    }
  }
  /**
   * 执行 OCR 识别
   * @param imageBuffer PNG 图片 Buffer
   * @param type Worker 类型
   * @returns 识别结果文本
   */
  async recognize(imageBuffer, type) {
    const worker = await this.getWorker(type);
    const result = await worker.recognize(imageBuffer);
    return result.data.text.trim();
  }
  /**
   * 获取游戏阶段识别 Worker
   * @description 配置为只识别数字和连字符 (如 "2-1", "3-5")
   */
  async getGameStageWorker() {
    if (this.gameStageWorker) {
      return this.gameStageWorker;
    }
    logger.info("[OcrService] 正在创建游戏阶段识别 Worker...");
    const worker = await createWorker("eng", 1, {
      langPath: this.langPath,
      cachePath: this.langPath
    });
    await worker.setParameters({
      tessedit_char_whitelist: "0123456789-",
      tessedit_pageseg_mode: PSM.SINGLE_LINE
    });
    this.gameStageWorker = worker;
    logger.info("[OcrService] 游戏阶段识别 Worker 准备就绪");
    return this.gameStageWorker;
  }
  /**
   * 获取棋子名称识别 Worker
   * @description 配置为中文识别，白名单限制为所有棋子名称中的字符
   */
  async getChessWorker() {
    if (this.chessWorker) {
      return this.chessWorker;
    }
    logger.info("[OcrService] 正在创建棋子名称识别 Worker...");
    const worker = await createWorker("chi_sim", 1, {
      langPath: this.langPath,
      cachePath: this.langPath
    });
    const uniqueChars = [...new Set(Object.keys(TFT_16_CHAMPION_DATA).join(""))].join("");
    await worker.setParameters({
      tessedit_char_whitelist: uniqueChars,
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
      preserve_interword_spaces: "1"
    });
    this.chessWorker = worker;
    logger.info("[OcrService] 棋子名称识别 Worker 准备就绪");
    return this.chessWorker;
  }
  /**
   * 获取等级识别 Worker
   * @description 配置为识别中文"级"字、数字和斜杠 (如 "4级 4/6")
   */
  async getLevelWorker() {
    if (this.levelWorker) {
      return this.levelWorker;
    }
    logger.info("[OcrService] 正在创建等级识别 Worker...");
    const worker = await createWorker("chi_sim", 1, {
      langPath: this.langPath,
      cachePath: this.langPath
    });
    await worker.setParameters({
      tessedit_char_whitelist: "0123456789/级",
      tessedit_pageseg_mode: PSM.SINGLE_LINE
    });
    this.levelWorker = worker;
    logger.info("[OcrService] 等级识别 Worker 准备就绪");
    return this.levelWorker;
  }
  /**
   * 获取战斗阶段文字识别 Worker
   * @description 只需要识别“战斗环节”这类固定短语，白名单尽量收紧，提升准确率。
   */
  async getCombatPhaseWorker() {
    if (this.combatPhaseWorker) {
      return this.combatPhaseWorker;
    }
    logger.info("[OcrService] 正在创建战斗阶段识别 Worker...");
    const worker = await createWorker("chi_sim", 1, {
      langPath: this.langPath,
      cachePath: this.langPath
    });
    await worker.setParameters({
      tessedit_char_whitelist: "战斗环节",
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
      preserve_interword_spaces: "1"
    });
    this.combatPhaseWorker = worker;
    logger.info("[OcrService] 战斗阶段识别 Worker 准备就绪");
    return this.combatPhaseWorker;
  }
  /**
   * 销毁所有 Worker，释放资源
   * @description 在应用退出时调用
   */
  async destroy() {
    if (this.gameStageWorker) {
      await this.gameStageWorker.terminate();
      this.gameStageWorker = null;
      logger.info("[OcrService] 游戏阶段识别 Worker 已销毁");
    }
    if (this.chessWorker) {
      await this.chessWorker.terminate();
      this.chessWorker = null;
      logger.info("[OcrService] 棋子名称识别 Worker 已销毁");
    }
    if (this.levelWorker) {
      await this.levelWorker.terminate();
      this.levelWorker = null;
      logger.info("[OcrService] 等级识别 Worker 已销毁");
    }
    if (this.combatPhaseWorker) {
      await this.combatPhaseWorker.terminate();
      this.combatPhaseWorker = null;
      logger.info("[OcrService] 战斗阶段识别 Worker 已销毁");
    }
  }
}
const ocrService = OcrService.getInstance();
const VALID_IMAGE_EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg"];
class TemplateLoader {
  static instance;
  /** 装备模板缓存 (按分类存储) */
  equipTemplates = /* @__PURE__ */ new Map();
  /** 英雄名称模板缓存 */
  championTemplates = /* @__PURE__ */ new Map();
  /** 星级模板缓存 */
  starLevelTemplates = /* @__PURE__ */ new Map();
  /** 备战席槽位模板缓存 (RGBA 彩色图，用于空槽检测) */
  benchSlotTemplates = /* @__PURE__ */ new Map();
  /** 棋盘槽位模板缓存 (RGBA 彩色图，用于空槽检测) */
  fightBoardSlotTemplates = /* @__PURE__ */ new Map();
  /** 战利品球模板缓存 (RGB 彩色图，用于多目标匹配) */
  lootOrbTemplates = /* @__PURE__ */ new Map();
  /** 空装备槽位模板 (24x24 纯黑) */
  emptyEquipSlotTemplate = null;
  /** 文件监听器防抖定时器 */
  watcherDebounceTimer = null;
  /** 模板加载完成标志 */
  isLoaded = false;
  // ========== 路径 Getter ==========
  get championTemplatePath() {
    return path__default.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/champion");
  }
  get equipTemplatePath() {
    return path__default.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/equipment");
  }
  get starLevelTemplatePath() {
    return path__default.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/starLevel");
  }
  get benchEmptySlotTemplatePath() {
    return path__default.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/benchSlot");
  }
  get fightBoardSlotTemplatePath() {
    return path__default.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/fightBoardSlot");
  }
  get lootOrbTemplatePath() {
    return path__default.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/loot");
  }
  constructor() {
  }
  /**
   * 获取 TemplateLoader 单例
   */
  static getInstance() {
    if (!TemplateLoader.instance) {
      TemplateLoader.instance = new TemplateLoader();
    }
    return TemplateLoader.instance;
  }
  /**
   * 初始化模板加载器
   * @description 在 OpenCV 初始化完成后调用，加载所有模板并启动文件监听
   */
  async initialize() {
    if (this.isLoaded) {
      logger.warn("[TemplateLoader] 模板已加载，跳过重复初始化");
      return;
    }
    logger.info("[TemplateLoader] 开始初始化模板加载器...");
    this.createEmptySlotTemplate();
    await Promise.all([
      this.loadEquipTemplates(),
      this.loadChampionTemplates(),
      this.loadStarLevelTemplates(),
      this.loadBenchSlotTemplates(),
      this.loadFightBoardSlotTemplates(),
      this.loadLootOrbTemplates()
    ]);
    this.setupChampionTemplateWatcher();
    this.isLoaded = true;
    logger.info("[TemplateLoader] 模板加载器初始化完成");
  }
  // ========== 公共访问方法 ==========
  /**
   * 获取装备模板
   */
  getEquipTemplates() {
    return this.equipTemplates;
  }
  /**
   * 获取英雄模板
   */
  getChampionTemplates() {
    return this.championTemplates;
  }
  /**
   * 获取星级模板
   */
  getStarLevelTemplates() {
    return this.starLevelTemplates;
  }
  /**
   * 获取备战席槽位模板
   * @param slotKey 槽位 key，例如 "SLOT_1"
   * @returns 对应的 RGBA 模板 Mat，未找到返回 null
   */
  getBenchSlotTemplate(slotKey) {
    return this.benchSlotTemplates.get(slotKey) || null;
  }
  /**
   * 获取棋盘槽位模板
   * @param slotKey 槽位 key，例如 "R1_C1"
   * @returns 对应的 RGBA 模板 Mat，未找到返回 null
   */
  getFightBoardSlotTemplate(slotKey) {
    return this.fightBoardSlotTemplates.get(slotKey) || null;
  }
  /**
   * 获取战利品球模板
   * @returns 战利品球模板 Map (key 为类型: normal/blue/gold)
   */
  getLootOrbTemplates() {
    return this.lootOrbTemplates;
  }
  /**
   * 获取空装备槽位模板
   */
  getEmptyEquipSlotTemplate() {
    return this.emptyEquipSlotTemplate;
  }
  /**
   * 检查模板是否已加载
   */
  isReady() {
    return this.isLoaded;
  }
  // ========== 私有加载方法 ========== 
  /**
   * 创建空槽位模板 (24x24 纯黑)
   */
  createEmptySlotTemplate() {
    const TEMPLATE_SIZE = 24;
    try {
      this.emptyEquipSlotTemplate = new cv.Mat(
        TEMPLATE_SIZE,
        TEMPLATE_SIZE,
        cv.CV_8UC4,
        new cv.Scalar(0, 0, 0, 255)
      );
      logger.info("[TemplateLoader] 空槽位模板创建成功");
    } catch (e) {
      logger.error(`[TemplateLoader] 创建空槽位模板失败: ${e}`);
    }
  }
  /**
   * 加载装备模板
   * @description 按分类加载装备图片，统一缩放到 24x24，移除 Alpha 通道
   */
  async loadEquipTemplates() {
    this.clearEquipTemplates();
    logger.info("[TemplateLoader] 开始加载装备模板...");
    const TEMPLATE_SIZE = 24;
    for (const category of EQUIP_CATEGORY_PRIORITY) {
      const resourcePath = path__default.join(this.equipTemplatePath, category);
      const categoryMap = /* @__PURE__ */ new Map();
      if (!fs.existsSync(resourcePath)) {
        logger.warn(`[TemplateLoader] 装备模板目录不存在: ${resourcePath}`);
        this.equipTemplates.set(category, categoryMap);
        continue;
      }
      const files = fs.readdirSync(resourcePath);
      for (const file2 of files) {
        const ext = path__default.extname(file2).toLowerCase();
        if (!VALID_IMAGE_EXTENSIONS.includes(ext)) continue;
        const filePath = path__default.join(resourcePath, file2);
        const templateName = path__default.parse(file2).name;
        try {
          const mat = await this.loadImageAsMat(filePath, {
            ensureAlpha: false,
            removeAlpha: true,
            targetSize: { width: TEMPLATE_SIZE, height: TEMPLATE_SIZE }
          });
          if (mat) {
            categoryMap.set(templateName, mat);
          }
        } catch (e) {
          logger.error(`[TemplateLoader] 加载装备模板失败 [${file2}]: ${e}`);
        }
      }
      logger.info(`[TemplateLoader] 加载 [${category}] 模板: ${categoryMap.size} 个`);
      this.equipTemplates.set(category, categoryMap);
    }
    logger.info("[TemplateLoader] 装备模板加载完成");
  }
  /**
   * 加载英雄模板
   * @description 用于商店和备战席的棋子名称识别
   */
  async loadChampionTemplates() {
    this.clearChampionTemplates();
    logger.info("[TemplateLoader] 开始加载英雄模板...");
    if (!fs.existsSync(this.championTemplatePath)) {
      fs.ensureDirSync(this.championTemplatePath);
      logger.info(`[TemplateLoader] 英雄模板目录不存在，已自动创建: ${this.championTemplatePath}`);
      return;
    }
    const files = fs.readdirSync(this.championTemplatePath);
    for (const file2 of files) {
      const ext = path__default.extname(file2).toLowerCase();
      if (!VALID_IMAGE_EXTENSIONS.includes(ext)) continue;
      const championName = path__default.parse(file2).name;
      const filePath = path__default.join(this.championTemplatePath, file2);
      try {
        const mat = await this.loadImageAsMat(filePath, {
          ensureAlpha: false,
          grayscale: true
        });
        if (mat) {
          this.championTemplates.set(championName, mat);
        }
      } catch (e) {
        logger.error(`[TemplateLoader] 加载英雄模板失败 [${file2}]: ${e}`);
      }
    }
    logger.info(`[TemplateLoader] 英雄模板加载完成，共 ${this.championTemplates.size} 个`);
  }
  /**
   * 加载星级模板
   * @description 用于识别棋子星级 (1-4 星)
   */
  async loadStarLevelTemplates() {
    this.clearStarLevelTemplates();
    logger.info("[TemplateLoader] 开始加载星级模板...");
    if (!fs.existsSync(this.starLevelTemplatePath)) {
      fs.ensureDirSync(this.starLevelTemplatePath);
      logger.info(`[TemplateLoader] 星级模板目录不存在，已自动创建: ${this.starLevelTemplatePath}`);
      return;
    }
    const files = fs.readdirSync(this.starLevelTemplatePath);
    for (const file2 of files) {
      const ext = path__default.extname(file2).toLowerCase();
      if (!VALID_IMAGE_EXTENSIONS.includes(ext)) continue;
      const starLevel = path__default.parse(file2).name;
      const filePath = path__default.join(this.starLevelTemplatePath, file2);
      try {
        const mat = await this.loadImageAsMat(filePath, { ensureAlpha: true });
        if (mat) {
          this.starLevelTemplates.set(starLevel, mat);
        }
      } catch (e) {
        logger.error(`[TemplateLoader] 加载星级模板失败 [${file2}]: ${e}`);
      }
    }
    logger.info(`[TemplateLoader] 星级模板加载完成，共 ${this.starLevelTemplates.size} 个`);
  }
  /**
   * 加载备战席槽位模板
   * @description 用于判断备战席槽位是否有棋子占用
   * 文件命名格式：SLOT_1.png ~ SLOT_9.png，保留 RGBA 彩色信息
   */
  async loadBenchSlotTemplates() {
    this.clearBenchSlotTemplates();
    logger.info("[TemplateLoader] 开始加载备战席槽位模板...");
    if (!fs.existsSync(this.benchEmptySlotTemplatePath)) {
      fs.ensureDirSync(this.benchEmptySlotTemplatePath);
      logger.info(`[TemplateLoader] 备战席槽位模板目录不存在，已自动创建: ${this.benchEmptySlotTemplatePath}`);
      return;
    }
    for (let i = 1; i <= 9; i++) {
      const slotKey = `SLOT_${i}`;
      const filePath = path__default.join(this.benchEmptySlotTemplatePath, `${slotKey}.png`);
      if (!fs.existsSync(filePath)) {
        logger.warn(`[TemplateLoader] 未找到槽位模板: ${slotKey}.png`);
        continue;
      }
      try {
        const mat = await this.loadImageAsMat(filePath, {
          ensureAlpha: true,
          grayscale: false
        });
        if (mat) {
          this.benchSlotTemplates.set(slotKey, mat);
        }
      } catch (e) {
        logger.error(`[TemplateLoader] 加载备战席槽位模板失败 [${slotKey}]: ${e}`);
      }
    }
    logger.info(`[TemplateLoader] 备战席槽位模板加载完成，共 ${this.benchSlotTemplates.size} 个`);
  }
  /**
   * 加载棋盘槽位模板
   * @description 棋盘共 4 行 7 列，共 28 个槽位 (R1_C1 ~ R4_C7)
   */
  async loadFightBoardSlotTemplates() {
    this.clearFightBoardSlotTemplates();
    logger.info("[TemplateLoader] 开始加载棋盘槽位模板...");
    if (!fs.existsSync(this.fightBoardSlotTemplatePath)) {
      fs.ensureDirSync(this.fightBoardSlotTemplatePath);
      logger.info(`[TemplateLoader] 棋盘槽位模板目录不存在，已自动创建: ${this.fightBoardSlotTemplatePath}`);
      return;
    }
    for (let row = 1; row <= 4; row++) {
      for (let col = 1; col <= 7; col++) {
        const slotKey = `R${row}_C${col}`;
        const filePath = path__default.join(this.fightBoardSlotTemplatePath, `${slotKey}.png`);
        if (!fs.existsSync(filePath)) {
          logger.warn(`[TemplateLoader] 未找到棋盘槽位模板: ${slotKey}.png`);
          continue;
        }
        try {
          const mat = await this.loadImageAsMat(filePath, {
            ensureAlpha: true,
            grayscale: false
          });
          if (mat) {
            this.fightBoardSlotTemplates.set(slotKey, mat);
          }
        } catch (e) {
          logger.error(`[TemplateLoader] 加载棋盘槽位模板失败 [${slotKey}]: ${e}`);
        }
      }
    }
    logger.info(`[TemplateLoader] 棋盘槽位模板加载完成，共 ${this.fightBoardSlotTemplates.size} 个`);
  }
  /**
   * 加载战利品球模板
   * @description 加载 loot_normal.png, loot_blue.png, loot_gold.png
   *              保留 RGB 彩色信息用于多目标模板匹配
   */
  async loadLootOrbTemplates() {
    this.clearLootOrbTemplates();
    logger.info("[TemplateLoader] 开始加载战利品球模板...");
    if (!fs.existsSync(this.lootOrbTemplatePath)) {
      fs.ensureDirSync(this.lootOrbTemplatePath);
      logger.info(`[TemplateLoader] 战利品球模板目录不存在，已自动创建: ${this.lootOrbTemplatePath}`);
      return;
    }
    const templateFiles = [
      { filename: "loot_normal.png", type: "normal" },
      { filename: "loot_blue.png", type: "blue" },
      { filename: "loot_gold.png", type: "gold" }
    ];
    for (const { filename, type } of templateFiles) {
      const filePath = path__default.join(this.lootOrbTemplatePath, filename);
      if (!fs.existsSync(filePath)) {
        logger.warn(`[TemplateLoader] 未找到战利品球模板: ${filename}`);
        continue;
      }
      try {
        const mat = await this.loadImageAsMat(filePath, {
          ensureAlpha: false,
          removeAlpha: true,
          grayscale: false
        });
        if (mat) {
          this.lootOrbTemplates.set(type, mat);
          logger.info(`[TemplateLoader] 加载战利品球模板: ${type} (${mat.cols}x${mat.rows})`);
        }
      } catch (e) {
        logger.error(`[TemplateLoader] 加载战利品球模板失败 [${filename}]: ${e}`);
      }
    }
    logger.info(`[TemplateLoader] 战利品球模板加载完成，共 ${this.lootOrbTemplates.size} 个`);
  }
  // ========== 工具方法 ==========
  /**
   * 加载图片为 OpenCV Mat
   * @param filePath 图片路径
   * @param config 加载配置
   * @returns OpenCV Mat 对象
   */
  async loadImageAsMat(filePath, config) {
    try {
      const fileBuf = fs.readFileSync(filePath);
      let pipeline = sharp(fileBuf);
      if (config.targetSize) {
        pipeline = pipeline.resize(config.targetSize.width, config.targetSize.height, {
          fit: "fill"
        });
      }
      if (config.grayscale) {
        pipeline = pipeline.grayscale();
      }
      if (config.removeAlpha) {
        pipeline = pipeline.removeAlpha();
      } else if (config.ensureAlpha && !config.grayscale) {
        pipeline = pipeline.ensureAlpha();
      }
      const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
      let channels = info.channels;
      const expectedLength = info.width * info.height * channels;
      if (data.length !== expectedLength) {
        logger.warn(`[TemplateLoader] 图片数据长度异常: ${filePath}`);
        return null;
      }
      let matType;
      if (channels === 1) matType = cv.CV_8UC1;
      else if (channels === 3) matType = cv.CV_8UC3;
      else if (channels === 4) matType = cv.CV_8UC4;
      else {
        logger.warn(`[TemplateLoader] 不支持的通道数 [${channels}]: ${filePath}`);
        return null;
      }
      const mat = new cv.Mat(info.height, info.width, matType);
      mat.data.set(new Uint8Array(data));
      return mat;
    } catch (e) {
      logger.error(`[TemplateLoader] 加载图片失败 [${filePath}]: ${e}`);
      return null;
    }
  }
  /**
   * 设置英雄模板文件夹监听
   * @description 监听文件变更，自动重新加载模板
   */
  setupChampionTemplateWatcher() {
    if (!fs.existsSync(this.championTemplatePath)) {
      fs.ensureDirSync(this.championTemplatePath);
    }
    fs.watch(this.championTemplatePath, (event, filename) => {
      if (this.watcherDebounceTimer) {
        clearTimeout(this.watcherDebounceTimer);
      }
      this.watcherDebounceTimer = setTimeout(() => {
        logger.info(`[TemplateLoader] 检测到英雄模板变更 (${event}: ${filename})，重新加载...`);
        this.loadChampionTemplates();
      }, 500);
    });
    logger.info("[TemplateLoader] 英雄模板文件监听已启动");
  }
  // ========== 清理方法 ==========
  /**
   * 清理装备模板缓存
   */
  clearEquipTemplates() {
    for (const categoryMap of this.equipTemplates.values()) {
      for (const mat of categoryMap.values()) {
        if (mat && !mat.isDeleted()) {
          mat.delete();
        }
      }
    }
    this.equipTemplates.clear();
  }
  /**
   * 清理英雄模板缓存
   */
  clearChampionTemplates() {
    for (const mat of this.championTemplates.values()) {
      if (mat && !mat.isDeleted()) {
        mat.delete();
      }
    }
    this.championTemplates.clear();
  }
  /**
   * 清理星级模板缓存
   */
  clearStarLevelTemplates() {
    for (const mat of this.starLevelTemplates.values()) {
      if (mat && !mat.isDeleted()) {
        mat.delete();
      }
    }
    this.starLevelTemplates.clear();
  }
  /**
   * 清理备战席槽位模板缓存
   */
  clearBenchSlotTemplates() {
    for (const mat of this.benchSlotTemplates.values()) {
      if (mat && !mat.isDeleted()) {
        mat.delete();
      }
    }
    this.benchSlotTemplates.clear();
  }
  /**
   * 清理棋盘槽位模板缓存
   */
  clearFightBoardSlotTemplates() {
    for (const mat of this.fightBoardSlotTemplates.values()) {
      if (mat && !mat.isDeleted()) {
        mat.delete();
      }
    }
    this.fightBoardSlotTemplates.clear();
  }
  /**
   * 清理战利品球模板缓存
   */
  clearLootOrbTemplates() {
    for (const mat of this.lootOrbTemplates.values()) {
      if (mat && !mat.isDeleted()) {
        mat.delete();
      }
    }
    this.lootOrbTemplates.clear();
  }
  /**
   * 销毁所有资源
   */
  destroy() {
    this.clearEquipTemplates();
    this.clearChampionTemplates();
    this.clearStarLevelTemplates();
    this.clearBenchSlotTemplates();
    this.clearFightBoardSlotTemplates();
    this.clearLootOrbTemplates();
    if (this.emptyEquipSlotTemplate && !this.emptyEquipSlotTemplate.isDeleted()) {
      this.emptyEquipSlotTemplate.delete();
      this.emptyEquipSlotTemplate = null;
    }
    if (this.watcherDebounceTimer) {
      clearTimeout(this.watcherDebounceTimer);
    }
    this.isLoaded = false;
    logger.info("[TemplateLoader] 模板加载器资源已释放");
  }
}
const templateLoader = TemplateLoader.getInstance();
const MATCH_THRESHOLDS = {
  /** 装备匹配阈值 */
  EQUIP: 0.6,
  /** 英雄匹配阈值 */
  CHAMPION: 0.4,
  /** 星级匹配阈值 (星级图标特征明显，阈值设高) */
  STAR_LEVEL: 0.85,
  /** 空槽位标准差阈值 (低于此值判定为空) */
  EMPTY_SLOT_STDDEV: 10,
  /** 战利品球匹配阈值 */
  LOOT_ORB: 0.75
};
class TemplateMatcher {
  static instance;
  constructor() {
  }
  // ========== 路径 Getter ==========
  /** 星级识别失败图片保存路径 (运行时获取，确保 VITE_PUBLIC 已设置) */
  get starLevelFailPath() {
    return path__default.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/starLevel");
  }
  /**
   * 获取 TemplateMatcher 单例
   */
  static getInstance() {
    if (!TemplateMatcher.instance) {
      TemplateMatcher.instance = new TemplateMatcher();
    }
    return TemplateMatcher.instance;
  }
  // ========== 公共匹配方法 ==========
  /**
   * 检测是否为空槽位
   * @description 基于图像标准差快速判断，纯色/纯黑图片标准差接近 0
   * @param targetMat 目标图像
   * @returns 是否为空槽位
   */
  isEmptySlot(targetMat) {
    const mean = new cv.Mat();
    const stddev = new cv.Mat();
    try {
      cv.meanStdDev(targetMat, mean, stddev);
      const deviation = stddev.doubleAt(0, 0);
      return deviation < MATCH_THRESHOLDS.EMPTY_SLOT_STDDEV;
    } finally {
      mean.delete();
      stddev.delete();
    }
  }
  /**
   * 匹配装备模板
   * @description 按分类优先级顺序匹配，找到即返回
   *              会将输入图像缩放到 24x24 以匹配模板尺寸
   * @param targetMat 目标图像 (需要是 RGB 3 通道)
   * @returns 匹配到的装备信息，未匹配返回 null
   */
  matchEquip(targetMat) {
    const TEMPLATE_SIZE = 24;
    let resizedMat = null;
    try {
      resizedMat = new cv.Mat();
      cv.resize(targetMat, resizedMat, new cv.Size(TEMPLATE_SIZE, TEMPLATE_SIZE), 0, 0, cv.INTER_AREA);
      if (this.isEmptySlot(resizedMat)) {
        return {
          name: "空槽位",
          confidence: 1,
          slot: "",
          category: "empty"
        };
      }
      const equipTemplates = templateLoader.getEquipTemplates();
      if (equipTemplates.size === 0) {
        logger.warn("[TemplateMatcher] 装备模板为空，跳过匹配");
        return null;
      }
      const mask = new cv.Mat();
      const resultMat = new cv.Mat();
      try {
        for (const category of EQUIP_CATEGORY_PRIORITY) {
          const categoryMap = equipTemplates.get(category);
          if (!categoryMap || categoryMap.size === 0) continue;
          for (const [templateName, templateMat] of categoryMap) {
            if (templateMat.rows > resizedMat.rows || templateMat.cols > resizedMat.cols) {
              continue;
            }
            cv.matchTemplate(resizedMat, templateMat, resultMat, cv.TM_CCOEFF_NORMED, mask);
            const result = cv.minMaxLoc(resultMat, mask);
            if (result.maxVal >= MATCH_THRESHOLDS.EQUIP) {
              const equipData = Object.values(TFT_16_EQUIP_DATA).find(
                (e) => e.englishName.toLowerCase() === templateName.toLowerCase()
              );
              if (equipData) {
                return {
                  ...equipData,
                  slot: "",
                  confidence: result.maxVal,
                  category
                };
              }
            }
          }
        }
        return null;
      } finally {
        mask.delete();
        resultMat.delete();
      }
    } catch (e) {
      logger.error(`[TemplateMatcher] 装备匹配出错: ${e}`);
      return null;
    } finally {
      if (resizedMat && !resizedMat.isDeleted()) {
        resizedMat.delete();
      }
    }
  }
  /**
   * 匹配英雄模板
   * @description 用于商店和备战席的棋子名称识别
   * @param targetMat 目标图像 (需要是 Gray 单通道)
   * @returns 匹配到的英雄名称，空槽位返回 "empty"，未匹配返回 null
   */
  matchChampion(targetMat) {
    if (this.isEmptySlot(targetMat)) {
      return "empty";
    }
    const championTemplates = templateLoader.getChampionTemplates();
    if (championTemplates.size === 0) {
      logger.warn("[TemplateMatcher] 英雄模板为空，跳过匹配");
      return null;
    }
    const mask = new cv.Mat();
    const resultMat = new cv.Mat();
    try {
      let bestMatchName = null;
      let maxConfidence = 0;
      for (const [name, templateMat] of championTemplates) {
        if (templateMat.rows > targetMat.rows || templateMat.cols > targetMat.cols) {
          logger.debug(`[TemplateMatcher] 模板尺寸过大: ${name} (${templateMat.cols}x${templateMat.rows}) > 目标 (${targetMat.cols}x${targetMat.rows})`);
          continue;
        }
        if (templateMat.type() !== targetMat.type()) {
          logger.warn(`[TemplateMatcher] 通道类型不匹配: ${name} (${templateMat.type()}) vs 目标 (${targetMat.type()})`);
          continue;
        }
        cv.matchTemplate(targetMat, templateMat, resultMat, cv.TM_CCOEFF_NORMED, mask);
        const result = cv.minMaxLoc(resultMat, mask);
        if (result.maxVal >= MATCH_THRESHOLDS.CHAMPION && result.maxVal > maxConfidence) {
          maxConfidence = result.maxVal;
          bestMatchName = name;
        }
      }
      if (bestMatchName) {
        logger.info(
          `[TemplateMatcher] 英雄模板匹配成功: ${bestMatchName} (相似度 ${(maxConfidence * 100).toFixed(1)}%)`
        );
      } else {
        if (maxConfidence > 0.3) {
          logger.debug(`[TemplateMatcher] 英雄匹配失败，最高分: ${(maxConfidence * 100).toFixed(1)}%`);
        }
      }
      return bestMatchName;
    } catch (e) {
      logger.error(`[TemplateMatcher] 英雄匹配出错: ${e}`);
      return null;
    } finally {
      mask.delete();
      resultMat.delete();
    }
  }
  /**
   * 匹配星级模板
   * @description 识别棋子星级 (1-4 星)
   * @param targetMat 目标图像 (需要是 RGBA 4 通道)
   * @returns 星级 (1-4)，未识别返回 -1
   */
  matchStarLevel(targetMat) {
    const starLevelTemplates = templateLoader.getStarLevelTemplates();
    if (starLevelTemplates.size === 0) {
      logger.warn("[TemplateMatcher] 星级模板为空，跳过匹配");
      return -1;
    }
    const mask = new cv.Mat();
    const resultMat = new cv.Mat();
    try {
      let bestMatchLevel = null;
      let maxConfidence = 0;
      for (const [levelStr, templateMat] of starLevelTemplates) {
        if (templateMat.rows > targetMat.rows || templateMat.cols > targetMat.cols) {
          continue;
        }
        cv.matchTemplate(targetMat, templateMat, resultMat, cv.TM_CCOEFF_NORMED, mask);
        const result = cv.minMaxLoc(resultMat, mask);
        if (result.maxVal > maxConfidence) {
          maxConfidence = result.maxVal;
          const lvl = parseInt(levelStr);
          if (!isNaN(lvl) && [1, 2, 3, 4].includes(lvl)) {
            bestMatchLevel = lvl;
          }
        }
      }
      if (maxConfidence >= MATCH_THRESHOLDS.STAR_LEVEL && bestMatchLevel !== null) {
        logger.debug(
          `[TemplateMatcher] 星级识别成功: ${bestMatchLevel}星 (相似度: ${(maxConfidence * 100).toFixed(1)}%)`
        );
        return bestMatchLevel;
      }
      if (maxConfidence > 0.5) {
        logger.warn(
          `[TemplateMatcher] 星级识别未达标 (最高相似度: ${(maxConfidence * 100).toFixed(1)}%)`,
          true
          // 仅详细模式下显示
        );
      }
      return -1;
    } catch (e) {
      logger.error(`[TemplateMatcher] 星级匹配出错: ${e}`);
      return -1;
    } finally {
      mask.delete();
      resultMat.delete();
    }
  }
  /**
   * 保存星级识别失败的图片
   * @description 将识别失败的图片保存到本地，方便排查问题
   * @param mat 目标图像
   */
  async saveFailedStarLevelImage(mat) {
    try {
      const savePath = this.starLevelFailPath;
      fs.ensureDirSync(savePath);
      const timestamp = Date.now();
      const filename = `fail_star_${timestamp}.png`;
      const filePath = path__default.join(savePath, filename);
      const channels = mat.channels();
      const width = mat.cols;
      const height = mat.rows;
      await sharp(Buffer.from(mat.data), {
        raw: {
          width,
          height,
          channels
        }
      }).png().toFile(filePath);
      logger.info(`[TemplateMatcher] 星级识别失败图片已保存: ${filePath}`);
    } catch (e) {
      logger.error(`[TemplateMatcher] 保存星级失败图片出错: ${e}`);
    }
  }
  /**
   * 多目标匹配战利品球
   * @description 在目标图像中查找所有战利品球，支持多种类型 (normal/blue/gold)
   *              使用非极大值抑制 (NMS) 避免重复检测
   * @param targetMat 目标图像 (需要是 RGB 3 通道)
   * @returns 检测到的战利品球数组
   */
  matchLootOrbs(targetMat) {
    const lootOrbTemplates = templateLoader.getLootOrbTemplates();
    if (lootOrbTemplates.size === 0) {
      logger.warn("[TemplateMatcher] 战利品球模板为空，跳过匹配");
      return [];
    }
    const results = [];
    const mask = new cv.Mat();
    const resultMat = new cv.Mat();
    try {
      for (const [orbType, templateMat] of lootOrbTemplates) {
        if (templateMat.rows > targetMat.rows || templateMat.cols > targetMat.cols) {
          logger.debug(`[TemplateMatcher] 战利品模板尺寸过大: ${orbType}`);
          continue;
        }
        if (templateMat.type() !== targetMat.type()) {
          logger.warn(
            `[TemplateMatcher] 战利品模板通道不匹配: ${orbType} (模板: ${templateMat.type()}, 目标: ${targetMat.type()})`
          );
          continue;
        }
        cv.matchTemplate(targetMat, templateMat, resultMat, cv.TM_CCOEFF_NORMED, mask);
        const templateWidth = templateMat.cols;
        const templateHeight = templateMat.rows;
        while (true) {
          const minMax = cv.minMaxLoc(resultMat, mask);
          if (minMax.maxVal < MATCH_THRESHOLDS.LOOT_ORB) {
            break;
          }
          const matchX = minMax.maxLoc.x;
          const matchY = minMax.maxLoc.y;
          const centerX = matchX + Math.floor(templateWidth / 2);
          const centerY = matchY + Math.floor(templateHeight / 2);
          results.push({
            x: centerX,
            y: centerY,
            type: orbType,
            confidence: minMax.maxVal
          });
          cv.rectangle(
            resultMat,
            new cv.Point(
              Math.max(0, matchX - templateWidth / 2),
              Math.max(0, matchY - templateHeight / 2)
            ),
            new cv.Point(
              Math.min(resultMat.cols - 1, matchX + templateWidth / 2),
              Math.min(resultMat.rows - 1, matchY + templateHeight / 2)
            ),
            new cv.Scalar(-1),
            -1
            // 填充矩形
          );
        }
      }
      const nmsResults = this.applyNMS(results, 10);
      logger.info(`[TemplateMatcher] 战利品球检测完成，共 ${nmsResults.length} 个`);
      return nmsResults;
    } catch (e) {
      logger.error(`[TemplateMatcher] 战利品球匹配出错: ${e}`);
      return [];
    } finally {
      mask.delete();
      resultMat.delete();
    }
  }
  /**
   * 非极大值抑制 (NMS)
   * @description 去除距离过近的重复检测结果，保留置信度最高的
   * @param orbs 检测到的战利品球数组
   * @param distanceThreshold 距离阈值 (像素)
   * @returns 去重后的战利品球数组
   */
  applyNMS(orbs, distanceThreshold) {
    if (orbs.length === 0) return [];
    const sorted = [...orbs].sort((a, b) => b.confidence - a.confidence);
    const kept = [];
    for (const orb of sorted) {
      const isTooClose = kept.some((keptOrb) => {
        const dx = orb.x - keptOrb.x;
        const dy = orb.y - keptOrb.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < distanceThreshold;
      });
      if (!isTooClose) {
        kept.push(orb);
      }
    }
    return kept;
  }
}
const templateMatcher = TemplateMatcher.getInstance();
class ScreenCapture {
  static instance;
  /** 游戏窗口基准点 (左上角坐标) */
  gameWindowOrigin = null;
  constructor() {
  }
  /**
   * 获取 ScreenCapture 单例
   */
  static getInstance() {
    if (!ScreenCapture.instance) {
      ScreenCapture.instance = new ScreenCapture();
    }
    return ScreenCapture.instance;
  }
  /**
   * 设置游戏窗口基准点
   * @param origin 游戏窗口左上角坐标
   */
  setGameWindowOrigin(origin) {
    this.gameWindowOrigin = origin;
  }
  /**
   * 获取游戏窗口基准点
   */
  getGameWindowOrigin() {
    return this.gameWindowOrigin;
  }
  /**
   * 检查是否已初始化
   */
  isInitialized() {
    return this.gameWindowOrigin !== null;
  }
  // ========== 坐标转换 ==========
  /**
   * 将游戏内相对区域转换为屏幕绝对区域
   * @param simpleRegion 游戏内相对区域定义
   * @returns nut-js Region 对象
   * @throws 如果未初始化游戏窗口基准点
   */
  toAbsoluteRegion(simpleRegion) {
    if (!this.gameWindowOrigin) {
      throw new Error("[ScreenCapture] 尚未设置游戏窗口基准点");
    }
    return new Region(
      this.gameWindowOrigin.x + simpleRegion.leftTop.x,
      this.gameWindowOrigin.y + simpleRegion.leftTop.y,
      simpleRegion.rightBottom.x - simpleRegion.leftTop.x,
      simpleRegion.rightBottom.y - simpleRegion.leftTop.y
    );
  }
  // ========== 截图方法 ==========
  /**
   * 截取指定区域并输出为 PNG Buffer
   * @param region nut-js Region 对象 (屏幕绝对坐标)
   * @param forOCR 是否针对 OCR 进行预处理
   * @returns PNG 格式的 Buffer
   */
  async captureRegionAsPng(region, forOCR = true) {
    const screenshot = await screen.grabRegion(region);
    const mat = new cv.Mat(screenshot.height, screenshot.width, cv.CV_8UC4);
    mat.data.set(new Uint8Array(screenshot.data));
    cv.cvtColor(mat, mat, cv.COLOR_BGRA2RGBA);
    const rgbaBuffer = Buffer.from(mat.data);
    let pipeline = sharp(rgbaBuffer, {
      raw: {
        width: screenshot.width,
        height: screenshot.height,
        channels: 4
        // RGBA
      }
    });
    if (forOCR) {
      pipeline = pipeline.resize({
        width: Math.round(screenshot.width * 3),
        height: Math.round(screenshot.height * 3),
        kernel: "lanczos3"
      }).grayscale().normalize().threshold(160).sharpen();
    }
    try {
      return await pipeline.toFormat("png").toBuffer();
    } finally {
      mat.delete();
    }
  }
  /**
   * 截取游戏内相对区域并输出为 PNG Buffer
   * @param simpleRegion 游戏内相对区域定义
   * @param forOCR 是否针对 OCR 进行预处理
   * @returns PNG 格式的 Buffer
   */
  async captureGameRegionAsPng(simpleRegion, forOCR = true) {
    const absoluteRegion = this.toAbsoluteRegion(simpleRegion);
    return this.captureRegionAsPng(absoluteRegion, forOCR);
  }
  /**
   * 截取指定区域并转换为 OpenCV Mat
   * @description 用于模板匹配，自动进行 BGRA -> RGB 颜色转换
   * @param region nut-js Region 对象 (屏幕绝对坐标)
   * @returns OpenCV Mat 对象 (RGB 3 通道)
   */
  async captureRegionAsMat(region) {
    const screenshot = await screen.grabRegion(region);
    const mat = new cv.Mat(screenshot.height, screenshot.width, cv.CV_8UC4);
    mat.data.set(new Uint8Array(screenshot.data));
    cv.cvtColor(mat, mat, cv.COLOR_BGRA2RGB);
    return mat;
  }
  /**
   * 截取游戏内相对区域并转换为 OpenCV Mat
   * @param simpleRegion 游戏内相对区域定义
   * @returns OpenCV Mat 对象 (RGB 3 通道)
   */
  async captureGameRegionAsMat(simpleRegion) {
    const absoluteRegion = this.toAbsoluteRegion(simpleRegion);
    return this.captureRegionAsMat(absoluteRegion);
  }
  // ========== 图像转换工具 ==========
  /**
   * 将 PNG Buffer 转换为 OpenCV Mat (RGBA 4 通道)
   * @param pngBuffer PNG 格式的 Buffer
   * @returns OpenCV Mat 对象 (RGBA 4 通道)
   */
  async pngBufferToMat(pngBuffer) {
    const { data, info } = await sharp(pngBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const mat = cv.matFromImageData({
      data: new Uint8Array(data),
      width: info.width,
      height: info.height
    });
    return mat;
  }
  /**
   * 将 OpenCV Mat 转换为 PNG Buffer
   * @param mat OpenCV Mat 对象
   * @param channels 通道数 (3 或 4)
   * @returns PNG 格式的 Buffer
   */
  async matToPngBuffer(mat, channels = 4) {
    return await sharp(mat.data, {
      raw: {
        width: mat.cols,
        height: mat.rows,
        channels
      }
    }).png().toBuffer();
  }
}
const screenCapture = ScreenCapture.getInstance();
var MouseButtonType = /* @__PURE__ */ ((MouseButtonType2) => {
  MouseButtonType2["LEFT"] = "left";
  MouseButtonType2["RIGHT"] = "right";
  return MouseButtonType2;
})(MouseButtonType || {});
function toNutButton(button) {
  return button === "right" ? Button.RIGHT : Button.LEFT;
}
const MOUSE_CONFIG = {
  /** 移动后等待时间 (ms) */
  MOVE_DELAY: 10,
  /** 点击后等待时间 (ms) */
  CLICK_DELAY: 20
};
class MouseController {
  static instance;
  /** 游戏窗口基准点 (左上角坐标) */
  gameWindowOrigin = null;
  constructor() {
  }
  /**
   * 获取 MouseController 单例
   */
  static getInstance() {
    if (!MouseController.instance) {
      MouseController.instance = new MouseController();
    }
    return MouseController.instance;
  }
  /**
   * 设置游戏窗口基准点
   * @param origin 游戏窗口左上角坐标
   */
  setGameWindowOrigin(origin) {
    this.gameWindowOrigin = origin;
    logger.info(`[MouseController] 游戏窗口基准点已设置: (${origin.x}, ${origin.y})`);
  }
  /**
   * 获取游戏窗口基准点
   */
  getGameWindowOrigin() {
    return this.gameWindowOrigin;
  }
  /**
   * 检查是否已初始化
   */
  isInitialized() {
    return this.gameWindowOrigin !== null;
  }
  /**
   * 在游戏窗口内点击指定位置
   * @description 自动将游戏内相对坐标转换为屏幕绝对坐标
   * @param offset 相对于游戏窗口左上角的偏移坐标
   * @param button 鼠标按键类型 (默认 MouseButtonType.LEFT)
   * @throws 如果未初始化游戏窗口基准点
   */
  async clickAt(offset, button = "left") {
    if (!this.gameWindowOrigin) {
      throw new Error("[MouseController] 尚未设置游戏窗口基准点，请先调用 setGameWindowOrigin()");
    }
    const target = new Point(
      this.gameWindowOrigin.x + offset.x,
      this.gameWindowOrigin.y + offset.y
    );
    logger.debug(
      `[MouseController] 点击: (Origin: ${this.gameWindowOrigin.x},${this.gameWindowOrigin.y}) + (Offset: ${offset.x},${offset.y}) -> (Target: ${target.x},${target.y})`
    );
    try {
      await mouse.move([target]);
      await sleep(MOUSE_CONFIG.MOVE_DELAY);
      await mouse.click(toNutButton(button));
      await sleep(MOUSE_CONFIG.CLICK_DELAY);
    } catch (e) {
      logger.error(`[MouseController] 鼠标点击失败: ${e.message}`);
      throw e;
    }
  }
  /**
   * 在游戏窗口内双击指定位置
   * @description 用于需要双击的操作 (如购买棋子时为了确保成功)
   * @param offset 相对于游戏窗口左上角的偏移坐标
   * @param button 鼠标按键类型 (默认 MouseButtonType.LEFT)
   * @param interval 两次点击之间的间隔 (ms)
   */
  async doubleClickAt(offset, button = "left", interval = 50) {
    await this.clickAt(offset, button);
    await sleep(interval);
    await this.clickAt(offset, button);
  }
  /**
   * 移动鼠标到指定位置 (不点击)
   * @param offset 相对于游戏窗口左上角的偏移坐标
   */
  async moveTo(offset) {
    if (!this.gameWindowOrigin) {
      throw new Error("[MouseController] 尚未设置游戏窗口基准点");
    }
    const target = new Point(
      this.gameWindowOrigin.x + offset.x,
      this.gameWindowOrigin.y + offset.y
    );
    try {
      await mouse.move([target]);
      await sleep(MOUSE_CONFIG.MOVE_DELAY);
    } catch (e) {
      logger.error(`[MouseController] 鼠标移动失败: ${e.message}`);
      throw e;
    }
  }
  /**
   * 在屏幕绝对坐标点击
   * @description 用于不需要游戏窗口偏移的场景
   * @param position 屏幕绝对坐标
   * @param button 鼠标按键类型 (默认 MouseButtonType.LEFT)
   */
  async clickAtAbsolute(position, button = "left") {
    try {
      const target = new Point(position.x, position.y);
      await mouse.move([target]);
      await sleep(MOUSE_CONFIG.MOVE_DELAY);
      await mouse.click(toNutButton(button));
      await sleep(MOUSE_CONFIG.CLICK_DELAY);
    } catch (e) {
      logger.error(`[MouseController] 鼠标点击失败: ${e.message}`);
      throw e;
    }
  }
  /**
   * 拖拽操作：从起点拖动到终点
   * @description 用于移动棋子（从备战席到棋盘、棋盘内调整位置等）
   *              TFT 中拖拽棋子的操作流程：
   *              1. 移动鼠标到起点
   *              2. 按下左键
   *              3. 移动鼠标到终点
   *              4. 释放左键
   * 
   * @param from 起点坐标（相对于游戏窗口）
   * @param to 终点坐标（相对于游戏窗口）
   * @param holdDelay 按下鼠标后等待的时间（ms），确保游戏识别到拖拽开始
   * @param moveDelay 移动过程中的延迟（ms），模拟人类拖拽速度
   */
  async drag(from, to, holdDelay = 100, moveDelay = 150) {
    if (!this.gameWindowOrigin) {
      throw new Error("[MouseController] 尚未设置游戏窗口基准点，请先调用 setGameWindowOrigin()");
    }
    const fromAbs = new Point(
      this.gameWindowOrigin.x + from.x,
      this.gameWindowOrigin.y + from.y
    );
    const toAbs = new Point(
      this.gameWindowOrigin.x + to.x,
      this.gameWindowOrigin.y + to.y
    );
    logger.info(
      `[MouseController] 拖拽: (${from.x},${from.y}) -> (${to.x},${to.y})`
    );
    try {
      await mouse.move([fromAbs]);
      await sleep(MOUSE_CONFIG.MOVE_DELAY);
      await mouse.pressButton(Button.LEFT);
      await sleep(holdDelay);
      await mouse.move([toAbs]);
      await sleep(moveDelay);
      await mouse.releaseButton(Button.LEFT);
      await sleep(MOUSE_CONFIG.CLICK_DELAY);
      logger.debug("[MouseController] 拖拽完成");
    } catch (e) {
      try {
        await mouse.releaseButton(Button.LEFT);
      } catch {
      }
      logger.error(`[MouseController] 拖拽失败: ${e.message}`);
      throw e;
    }
  }
}
const mouseController = MouseController.getInstance();
const AUGMENT_ROUNDS = /* @__PURE__ */ new Set(["2-1", "3-2", "4-2"]);
function parseStageStringToEnum(stageText) {
  try {
    let cleanText = stageText.replace(/\s/g, "");
    cleanText = fixMisrecognizedStage(cleanText);
    const match = cleanText.match(/^(\d+)-(\d+)$/);
    if (!match) {
      return GameStageType.UNKNOWN;
    }
    const stage = parseInt(match[1]);
    const round = parseInt(match[2]);
    if (stage === 1) {
      return GameStageType.EARLY_PVE;
    }
    if (AUGMENT_ROUNDS.has(cleanText)) {
      return GameStageType.AUGMENT;
    }
    if (round === 4) {
      return GameStageType.CAROUSEL;
    }
    if (round === 7) {
      return GameStageType.PVE;
    }
    return GameStageType.PVP;
  } catch (e) {
    console.error("[GameStageParser] 解析阶段字符串失败:", e);
    return GameStageType.UNKNOWN;
  }
}
function isValidStageFormat(text) {
  return /^\d+\s*[-]\s*\d+$/.test(text.trim());
}
function fixMisrecognizedStage(text) {
  const match = text.match(/^(\d+)-(\d+)$/);
  if (!match) return text;
  const stageStr = match[1];
  const roundStr = match[2];
  const stage = parseInt(stageStr);
  if (stage > 7 && stageStr.length > 1) {
    const fixedStage = stageStr.slice(-1);
    console.log(`[GameStageParser] 修复阶段误识别: "${text}" → "${fixedStage}-${roundStr}"`);
    return `${fixedStage}-${roundStr}`;
  }
  return text;
}
class TftOperator {
  static instance;
  /** 游戏窗口左上角坐标 */
  gameWindowRegion = null;
  /** 当前游戏模式 */
  tftMode = TFTMode.CLASSIC;
  /** 空槽匹配阈值：平均像素差值大于此值视为"有棋子占用" */
  benchEmptyDiffThreshold = 6;
  /** OpenCV 是否已初始化 */
  isOpenCVReady = false;
  /** 
   * 上一次随机走位的方向
   * @description 用于实现左右交替走动，让行为更像真人
   *              'left' 表示上次走的是左边，下次应该走右边
   *              'right' 表示上次走的是右边，下次应该走左边
   */
  lastWalkSide = "left";
  // ========== 路径 Getter ==========
  get failChampionTemplatePath() {
    return path__default.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/英雄备份");
  }
  get equipTemplatePath() {
    return path__default.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/equipment");
  }
  get starLevelTemplatePath() {
    return path__default.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/starLevel");
  }
  get benchSlotSnapshotPath() {
    return path__default.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/benchSlot");
  }
  get fightBoardSlotSnapshotPath() {
    return path__default.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/fightBoardSlot");
  }
  // ========== 构造函数 ==========
  constructor() {
    this.initOpenCV();
  }
  /**
   * 初始化 OpenCV
   * @description 在 OpenCV WASM 加载完成后初始化模板加载器
   */
  initOpenCV() {
    cv["onRuntimeInitialized"] = async () => {
      logger.info("[TftOperator] OpenCV (WASM) 核心模块加载完毕");
      this.isOpenCVReady = true;
      await templateLoader.initialize();
    };
  }
  /**
   * 获取 TftOperator 单例
   */
  static getInstance() {
    if (!TftOperator.instance) {
      TftOperator.instance = new TftOperator();
    }
    return TftOperator.instance;
  }
  // ============================================================================
  // 公共接口 (Public API)
  // ============================================================================
  /**
   * 初始化操作器
   * @description 计算游戏窗口位置，LOL 窗口默认居中显示
   * @returns 是否初始化成功
   */
  init() {
    try {
      const primaryDisplay = screen$1.getPrimaryDisplay();
      const scaleFactor = primaryDisplay.scaleFactor;
      const { width: logicalWidth, height: logicalHeight } = primaryDisplay.size;
      const screenWidth = Math.round(logicalWidth * scaleFactor);
      const screenHeight = Math.round(logicalHeight * scaleFactor);
      const screenCenterX = screenWidth / 2;
      const screenCenterY = screenHeight / 2;
      const originX = screenCenterX - GAME_WIDTH / 2;
      const originY = screenCenterY - GAME_HEIGHT / 2;
      this.gameWindowRegion = { x: originX, y: originY };
      screenCapture.setGameWindowOrigin(this.gameWindowRegion);
      mouseController.setGameWindowOrigin(this.gameWindowRegion);
      logger.info(`[TftOperator] 屏幕尺寸: ${screenWidth}x${screenHeight}`);
      logger.info(`[TftOperator] 游戏基准点: (${originX}, ${originY})`);
      return true;
    } catch (e) {
      logger.error(`[TftOperator] 初始化失败: ${e.message}`);
      this.gameWindowRegion = null;
      return false;
    }
  }
  /**
   * 获取当前游戏阶段
   * @description 通过 OCR 识别游戏阶段 (如 "2-1", "3-5")
   * @returns 游戏阶段结果，包含阶段类型和原始文本
   */
  async getGameStage() {
    try {
      const recognizeStageText = async (region) => {
        const rawPng = await screenCapture.captureRegionAsPng(region, false);
        return await ocrService.recognize(rawPng, OcrWorkerType.GAME_STAGE);
      };
      let stageText = "";
      const normalRegion = this.getStageAbsoluteRegion(false);
      stageText = await recognizeStageText(normalRegion);
      if (!isValidStageFormat(stageText)) {
        const stageOneRegion = this.getStageAbsoluteRegion(true);
        stageText = await recognizeStageText(stageOneRegion);
      }
      if (!isValidStageFormat(stageText)) {
        const clockworkRegion = this.getClockworkTrialsRegion();
        const clockText = await recognizeStageText(clockworkRegion);
        if (clockText && clockText.length > 2) {
          this.tftMode = TFTMode.CLOCKWORK_TRAILS;
          logger.info("[TftOperator] 识别为发条鸟试炼模式");
          return { type: GameStageType.PVP, stageText: "clockwork" };
        }
      }
      const stageType = parseStageStringToEnum(stageText);
      if (stageType !== GameStageType.UNKNOWN) {
        this.tftMode = TFTMode.CLASSIC;
      } else {
        logger.warn(`[TftOperator] 无法识别当前阶段: "${stageText ?? "null"}"`);
      }
      return { type: stageType, stageText: stageText || "" };
    } catch (e) {
      logger.error(`[TftOperator] 阶段识别异常: ${e.message}`);
      return { type: GameStageType.UNKNOWN, stageText: "" };
    }
  }
  /**
   * 获取当前商店的所有棋子信息
   * @description 扫描商店 5 个槽位，通过 OCR + 模板匹配识别棋子
   * @returns 商店中的棋子数组 (空槽位为 null)
   */
  async getShopInfo() {
    logger.info("[TftOperator] 正在扫描商店中的 5 个槽位...");
    const shopUnits = [];
    for (let i = 1; i <= 5; i++) {
      const slotKey = `SLOT_${i}`;
      const region = screenCapture.toAbsoluteRegion(shopSlotNameRegions[slotKey]);
      const processedPng = await screenCapture.captureRegionAsPng(region);
      const text = await ocrService.recognize(processedPng, OcrWorkerType.CHESS);
      let cleanName = text.replace(/\s/g, "");
      let tftUnit = TFT_16_CHAMPION_DATA[cleanName] || null;
      if (!tftUnit) {
        logger.warn(`[商店槽位 ${i}] OCR 识别失败，尝试模板匹配...`, true);
        const mat = await screenCapture.pngBufferToMat(processedPng);
        if (mat.channels() > 1) {
          cv.cvtColor(mat, mat, cv.COLOR_RGBA2GRAY);
        }
        cleanName = templateMatcher.matchChampion(mat) || "";
        mat.delete();
      }
      tftUnit = TFT_16_CHAMPION_DATA[cleanName] || null;
      if (tftUnit) {
        logger.debug(`[商店槽位 ${i}] 识别成功 -> ${tftUnit.displayName} (${tftUnit.price}费)`);
        shopUnits.push(tftUnit);
      } else {
        this.handleRecognitionFailure("shop", i, cleanName, processedPng);
        shopUnits.push(null);
      }
    }
    return shopUnits;
  }
  /**
   * 获取当前装备栏信息
   * @description 扫描装备栏所有槽位，通过模板匹配识别装备
   * @returns 识别到的装备数组
   */
  async getEquipInfo() {
    if (!this.gameWindowRegion) {
      logger.error("[TftOperator] 尚未初始化游戏窗口位置");
      return [];
    }
    if (!templateLoader.isReady()) {
      logger.warn("[TftOperator] 模板未加载完成，跳过识别");
      return [];
    }
    const resultEquips = [];
    logger.info("[TftOperator] 开始扫描装备栏...");
    for (const [slotName, regionDef] of Object.entries(equipmentRegion)) {
      const targetRegion = new Region(
        this.gameWindowRegion.x + regionDef.leftTop.x,
        this.gameWindowRegion.y + regionDef.leftTop.y,
        regionDef.rightBottom.x - regionDef.leftTop.x + 1,
        regionDef.rightBottom.y - regionDef.leftTop.y + 1
      );
      let targetMat = null;
      try {
        targetMat = await screenCapture.captureRegionAsMat(targetRegion);
        const matchResult = templateMatcher.matchEquip(targetMat);
        if (!matchResult) {
          logger.error(`[TftOperator] ${slotName} 槽位识别失败`);
          continue;
        }
        if (matchResult.name === "空槽位") {
          logger.debug(`[TftOperator] ${slotName} 为空槽位`);
          continue;
        }
        matchResult.slot = `SLOT_${resultEquips.length + 1}`;
        logger.debug(
          `[TftOperator] ${slotName} 识别成功: ${matchResult.name} (相似度: ${(matchResult.confidence * 100).toFixed(1)}%)`
        );
        resultEquips.push(matchResult);
      } catch (e) {
        logger.error(`[TftOperator] ${slotName} 扫描异常: ${e.message}`);
      } finally {
        if (targetMat && !targetMat.isDeleted()) {
          targetMat.delete();
        }
      }
    }
    return resultEquips;
  }
  /**
   * 识别详情面板中棋子携带的装备
   * @description 当右键点击棋子后，会在右侧详情面板显示该棋子的装备（最多 3 件）
   *              此方法扫描详情面板的 3 个装备槽位，通过模板匹配识别装备
   *              复用了 templateMatcher.matchEquip 方法，与装备栏识别逻辑一致
   * @returns 识别到的装备数组（TFTEquip 类型，不包含槽位信息，空槽位会被过滤）
   */
  async getDetailPanelEquips() {
    const equips = [];
    for (const [slotName, regionDef] of Object.entries(detailEquipRegion)) {
      const targetRegion = screenCapture.toAbsoluteRegion(regionDef);
      let targetMat = null;
      try {
        targetMat = await screenCapture.captureRegionAsMat(targetRegion);
        const matchResult = templateMatcher.matchEquip(targetMat);
        if (matchResult && matchResult.name !== "空槽位") {
          logger.debug(
            `[详情面板装备 ${slotName}] 识别成功: ${matchResult.name} (相似度: ${(matchResult.confidence * 100).toFixed(1)}%)`
          );
          equips.push({
            name: matchResult.name,
            englishName: matchResult.englishName,
            equipId: matchResult.equipId,
            formula: matchResult.formula
          });
        }
      } catch (e) {
        logger.warn(`[详情面板装备 ${slotName}] 扫描异常: ${e.message}`);
      } finally {
        if (targetMat && !targetMat.isDeleted()) {
          targetMat.delete();
        }
      }
    }
    return equips;
  }
  /**
   * 检查指定商店槽位是否为空
   * @param slotIndex 槽位索引 (0-4)
   * @returns true 表示槽位为空（购买成功），false 表示还有棋子（购买失败）
   * @description 复用 templateMatcher.matchChampion 的空槽检测逻辑
   *              matchChampion 内部会先调用 isEmptySlot 快速检测空槽
   *              如果返回 "empty" 则表示槽位为空
   */
  async isShopSlotEmpty(slotIndex) {
    const slotKey = `SLOT_${slotIndex + 1}`;
    const region = screenCapture.toAbsoluteRegion(shopSlotNameRegions[slotKey]);
    const processedPng = await screenCapture.captureRegionAsPng(region);
    const mat = await screenCapture.pngBufferToMat(processedPng);
    if (mat.channels() > 1) {
      cv.cvtColor(mat, mat, cv.COLOR_RGBA2GRAY);
    }
    const result = templateMatcher.matchChampion(mat);
    mat.delete();
    return result === "empty" || result === null;
  }
  /**
   * 购买指定槽位的棋子
   * @param slot 槽位编号 (1-5)
   */
  async buyAtSlot(slot) {
    const slotKey = `SHOP_SLOT_${slot}`;
    const targetPoint = shopSlot[slotKey];
    if (!targetPoint) {
      logger.error(`[TftOperator] 无效的槽位: ${slot}，只接受 1-5`);
      return;
    }
    logger.info(`[TftOperator] 正在购买棋子，槽位: ${slot}...`);
    await mouseController.clickAt(targetPoint, MouseButtonType.LEFT);
    await sleep(10);
  }
  /**
   * 刷新商店 (D牌)
   */
  async refreshShop() {
    this.ensureInitialized();
    logger.info("[TftOperator] 刷新商店");
    await mouseController.clickAt(refreshShopPoint, MouseButtonType.LEFT);
    await sleep(20);
  }
  /**
   * 购买经验值 (F键)
   */
  async buyExperience() {
    this.ensureInitialized();
    logger.info("[TftOperator] 购买经验值");
    await mouseController.clickAt(buyExpPoint, MouseButtonType.LEFT);
    await sleep(10);
  }
  /**
   * 获取当前备战席的棋子信息
   * @description 通过右键点击棋子，识别详情面板中的英雄名和星级
   * @returns 备战席棋子数组 (空槽位为 null)
   */
  async getBenchInfo() {
    const benchUnits = [];
    for (const benchSlot of Object.keys(benchSlotPoints)) {
      const benchRegion = screenCapture.toAbsoluteRegion(benchSlotRegion[benchSlot]);
      const isEmpty = await this.isBenchSlotEmpty(benchSlot, benchRegion);
      if (isEmpty) {
        logger.info(`[备战席槽位 ${benchSlot.slice(-1)}] 检测为空，跳过点击`);
        benchUnits.push(null);
        continue;
      }
      await mouseController.clickAt(benchSlotPoints[benchSlot], MouseButtonType.RIGHT);
      await sleep(10);
      const nameRegion = screenCapture.toAbsoluteRegion(detailChampionNameRegion);
      const namePng = await screenCapture.captureRegionAsPng(nameRegion);
      const text = await ocrService.recognize(namePng, OcrWorkerType.CHESS);
      let cleanName = text.replace(/\s/g, "");
      let tftUnit = TFT_16_CHAMPION_DATA[cleanName] || null;
      if (!tftUnit) {
        logger.warn(`[备战席槽位 ${benchSlot.slice(-1)}] OCR 识别失败，尝试模板匹配...`, true);
        const mat = await screenCapture.pngBufferToMat(namePng);
        if (mat.channels() > 1) {
          cv.cvtColor(mat, mat, cv.COLOR_RGBA2GRAY);
        }
        cleanName = templateMatcher.matchChampion(mat) || "";
        mat.delete();
      }
      tftUnit = TFT_16_CHAMPION_DATA[cleanName] || null;
      if (tftUnit) {
        const starRegion = screenCapture.toAbsoluteRegion(detailChampionStarRegion);
        const starPng = await screenCapture.captureRegionAsPng(starRegion, false);
        const starMat = await screenCapture.pngBufferToMat(starPng);
        const starLevel = templateMatcher.matchStarLevel(starMat);
        starMat.delete();
        const equips = await this.getDetailPanelEquips();
        logger.debug(
          `[备战席槽位 ${benchSlot.slice(-1)}] 识别成功 -> ${tftUnit.displayName} (${tftUnit.price}费-${starLevel}星)` + (equips.length > 0 ? ` [装备: ${equips.map((e) => e.name).join(", ")}]` : "")
        );
        benchUnits.push({
          location: benchSlot,
          tftUnit,
          starLevel,
          equips
        });
      } else {
        const clickPoint = benchSlotPoints[benchSlot];
        const slotIndex = parseInt(benchSlot.slice(-1));
        const forgeType = await this.checkItemForgeTooltip(clickPoint, slotIndex);
        await mouseController.clickAt(benchSlotPoints[benchSlot], MouseButtonType.RIGHT);
        await sleep(10);
        if (forgeType !== ItemForgeType.NONE) {
          const forgeUnit = forgeType === ItemForgeType.COMPLETED ? TFT_16_CHAMPION_DATA.成装锻造器 : TFT_16_CHAMPION_DATA.基础装备锻造器;
          const forgeName = forgeType === ItemForgeType.COMPLETED ? "成装锻造器" : "基础装备锻造器";
          logger.info(`[备战席槽位 ${benchSlot.slice(-1)}] 识别为${forgeName}`);
          benchUnits.push({
            location: benchSlot,
            tftUnit: forgeUnit,
            starLevel: -1,
            // 锻造器无星级
            equips: []
          });
        } else {
          this.handleRecognitionFailure("bench", benchSlot.slice(-1), cleanName, namePng);
          benchUnits.push(null);
          await this.selfResetPosition();
        }
      }
    }
    return benchUnits;
  }
  /**
   * 获取当前棋盘上的棋子信息
   * @description 通过右键点击棋子，识别详情面板中的英雄名和星级
   *              棋盘为 4 行 7 列，共 28 个槽位
   * @returns 棋盘棋子数组 (空槽位为 null)
   */
  async getFightBoardInfo() {
    logger.info("[TftOperator] 正在扫描棋盘上的 28 个槽位...");
    const boardUnits = [];
    for (const boardSlot of Object.keys(fightBoardSlotPoint)) {
      const boardRegion = screenCapture.toAbsoluteRegion(
        fightBoardSlotRegion[boardSlot]
      );
      const isEmpty = await this.isFightBoardSlotEmpty(boardSlot, boardRegion);
      if (isEmpty) {
        logger.debug(`[棋盘槽位 ${boardSlot}] 检测为空，跳过点击`);
        boardUnits.push(null);
        continue;
      }
      const clickPoint = fightBoardSlotPoint[boardSlot];
      await mouseController.clickAt(clickPoint, MouseButtonType.RIGHT);
      await sleep(10);
      const nameRegion = screenCapture.toAbsoluteRegion(detailChampionNameRegion);
      const namePng = await screenCapture.captureRegionAsPng(nameRegion);
      const text = await ocrService.recognize(namePng, OcrWorkerType.CHESS);
      let cleanName = text.replace(/\s/g, "");
      let tftUnit = TFT_16_CHAMPION_DATA[cleanName] || null;
      if (!tftUnit) {
        logger.warn(`[棋盘槽位 ${boardSlot}] OCR 识别失败，尝试模板匹配...`, true);
        const mat = await screenCapture.pngBufferToMat(namePng);
        if (mat.channels() > 1) {
          cv.cvtColor(mat, mat, cv.COLOR_RGBA2GRAY);
        }
        cleanName = templateMatcher.matchChampion(mat) || "";
        mat.delete();
      }
      tftUnit = TFT_16_CHAMPION_DATA[cleanName] || null;
      if (tftUnit) {
        const starRegion = screenCapture.toAbsoluteRegion(detailChampionStarRegion);
        const starPng = await screenCapture.captureRegionAsPng(starRegion, false);
        const starMat = await screenCapture.pngBufferToMat(starPng);
        const starLevel = templateMatcher.matchStarLevel(starMat);
        starMat.delete();
        const equips = await this.getDetailPanelEquips();
        logger.debug(
          `[棋盘槽位 ${boardSlot}] 识别成功 -> ${tftUnit.displayName} (${tftUnit.price}费-${starLevel}星)` + (equips.length > 0 ? ` [装备: ${equips.map((e) => e.name).join(", ")}]` : "")
        );
        boardUnits.push({
          location: boardSlot,
          tftUnit,
          starLevel,
          equips
        });
      } else {
        this.handleRecognitionFailure("board", boardSlot, cleanName, namePng);
        boardUnits.push(null);
      }
    }
    logger.info(`[TftOperator] 棋盘扫描完成，识别到 ${boardUnits.filter((u) => u !== null).length} 个棋子`);
    return boardUnits;
  }
  /**
   * 判断棋盘槽位是否为空
   * @description 通过 templateLoader 获取空槽模板，比较当前截图的 RGBA 均值差异
   * @param slotKey 槽位 key，例如 R1_C1
   * @param region nut-js Region (绝对坐标)
   */
  async isFightBoardSlotEmpty(slotKey, region) {
    if (!templateLoader.isReady()) {
      logger.warn("[TftOperator] 模板未加载完成，空槽检测暂时跳过");
      return false;
    }
    const tmpl = templateLoader.getFightBoardSlotTemplate(slotKey);
    if (!tmpl) {
      logger.warn(`[TftOperator] 未找到棋盘槽位模板: ${slotKey}，跳过空槽检测`);
      return false;
    }
    const meanDiff = await this.calculateSlotDifference(region, tmpl);
    const isEmpty = meanDiff < this.benchEmptyDiffThreshold;
    if (!isEmpty) {
      logger.debug(`[TftOperator] 棋盘槽位 ${slotKey} 判定为占用, meanDiff=${meanDiff.toFixed(2)}`);
    }
    return isEmpty;
  }
  /**
   * 保存备战席槽位截图到本地 (benchSlotRegion)
   * 用于采集空槽/有子样本，帮助后续做占用检测或模板生成
   */
  async saveBenchSlotSnapshots() {
    this.ensureInitialized();
    const saveDir = this.benchSlotSnapshotPath;
    fs.ensureDirSync(saveDir);
    for (const [slotKey, regionDef] of Object.entries(benchSlotRegion)) {
      try {
        const region = screenCapture.toAbsoluteRegion(regionDef);
        const pngBuffer = await screenCapture.captureRegionAsPng(region, false);
        const filename = `${slotKey}.png`;
        fs.writeFileSync(path__default.join(saveDir, filename), pngBuffer);
        logger.info(`[TftOperator] 保存备战席槽位截图: ${slotKey} -> ${filename}`);
      } catch (e) {
        logger.error(`[TftOperator] 保存备战席槽位截图失败: ${slotKey}, ${e.message}`);
      }
    }
  }
  /**
   * 保存棋盘槽位截图到本地 (fightBoardSlotRegion)
   * 文件名直接使用对象 key (如 R1_C1.png)
   */
  async saveFightBoardSlotSnapshots() {
    this.ensureInitialized();
    const saveDir = this.fightBoardSlotSnapshotPath;
    fs.ensureDirSync(saveDir);
    for (const [slotKey, regionDef] of Object.entries(fightBoardSlotRegion)) {
      try {
        const region = screenCapture.toAbsoluteRegion(regionDef);
        const pngBuffer = await screenCapture.captureRegionAsPng(region, false);
        const filename = `${slotKey}.png`;
        fs.writeFileSync(path__default.join(saveDir, filename), pngBuffer);
        logger.info(`[TftOperator] 保存棋盘槽位截图: ${slotKey} -> ${filename}`);
      } catch (e) {
        logger.error(`[TftOperator] 保存棋盘槽位截图失败: ${slotKey}, ${e.message}`);
      }
    }
  }
  // ============================================================================
  // 私有方法 (Private Methods)
  // ============================================================================
  /**
   * 比较截图与模板的 RGBA 均值差异，判断槽位是否为空
   * @description 通用的空槽检测方法，供备战席和棋盘槽位复用
   * @param region 槽位的绝对坐标区域
   * @param tmpl 空槽模板 (RGBA 格式的 cv.Mat)
   * @returns 平均像素差值 (RGB 三通道均值)
   */
  async calculateSlotDifference(region, tmpl) {
    const pngBuffer = await screenCapture.captureRegionAsPng(region, false);
    let mat = await screenCapture.pngBufferToMat(pngBuffer);
    if (mat.channels() === 3) {
      cv.cvtColor(mat, mat, cv.COLOR_RGB2RGBA);
    }
    if (mat.cols !== tmpl.cols || mat.rows !== tmpl.rows) {
      const resized = new cv.Mat();
      cv.resize(mat, resized, new cv.Size(tmpl.cols, tmpl.rows), 0, 0, cv.INTER_AREA);
      mat.delete();
      mat = resized;
    }
    const diff = new cv.Mat();
    cv.absdiff(mat, tmpl, diff);
    const meanScalar = cv.mean(diff);
    const meanDiff = (meanScalar[0] + meanScalar[1] + meanScalar[2]) / 3;
    diff.delete();
    mat.delete();
    return meanDiff;
  }
  /**
   * 判断备战席槽位是否为空
   * @description 通过 templateLoader 获取空槽模板，比较当前截图的 RGBA 均值差异
   * @param slotKey 槽位 key，例如 SLOT_1
   * @param region nut-js Region (绝对坐标)
   */
  async isBenchSlotEmpty(slotKey, region) {
    if (!templateLoader.isReady()) {
      logger.warn("[TftOperator] 模板未加载完成，空槽检测暂时跳过");
      return false;
    }
    const tmpl = templateLoader.getBenchSlotTemplate(slotKey);
    if (!tmpl) {
      logger.warn(`[TftOperator] 未找到槽位模板: ${slotKey}，跳过空槽检测`);
      return false;
    }
    const meanDiff = await this.calculateSlotDifference(region, tmpl);
    const isEmpty = meanDiff < this.benchEmptyDiffThreshold;
    if (!isEmpty) {
      logger.debug(`[TftOperator] 槽位 ${slotKey} 判定为占用, meanDiff=${meanDiff.toFixed(2)}`);
    }
    return isEmpty;
  }
  /**
   * 检测当前是否显示锻造器的浮窗，并识别锻造器类型
   * @description 锻造器右键后不会在固定位置显示详情，
   *              而是在鼠标点击位置附近弹出浮窗，需要用相对偏移量计算实际区域
   *              支持识别：基础装备锻造器、成装锻造器、神器装备锻造器、辅助装锻造器
   * @param clickPoint 右键点击的位置 (游戏内相对坐标)
   * @param slotIndex 备战席槽位索引 (1-9)，用于判断是否为边缘情况
   * @returns 锻造器类型 (NONE 表示不是锻造器)
   */
  async checkItemForgeTooltip(clickPoint, slotIndex) {
    this.ensureInitialized();
    const isEdgeCase = slotIndex >= 6;
    const tooltipRegion = isEdgeCase ? itemForgeTooltipRegionEdge : itemForgeTooltipRegion;
    let absoluteRegion;
    if (isEdgeCase) {
      absoluteRegion = new Region(
        Math.round(this.gameWindowRegion.x + tooltipRegion.leftTop.x),
        Math.round(this.gameWindowRegion.y + clickPoint.y + tooltipRegion.leftTop.y),
        Math.round(tooltipRegion.rightBottom.x - tooltipRegion.leftTop.x),
        Math.round(tooltipRegion.rightBottom.y - tooltipRegion.leftTop.y)
      );
      logger.debug(`[TftOperator] 边缘槽位 ${slotIndex}，X坐标固定=${tooltipRegion.leftTop.x}，Y偏移=${tooltipRegion.leftTop.y}`);
    } else {
      absoluteRegion = new Region(
        Math.round(this.gameWindowRegion.x + clickPoint.x + tooltipRegion.leftTop.x),
        Math.round(this.gameWindowRegion.y + clickPoint.y + tooltipRegion.leftTop.y),
        Math.round(tooltipRegion.rightBottom.x - tooltipRegion.leftTop.x),
        Math.round(tooltipRegion.rightBottom.y - tooltipRegion.leftTop.y)
      );
    }
    const rawPngBuffer = await screenCapture.captureRegionAsPng(absoluteRegion, false);
    const text = await ocrService.recognize(rawPngBuffer, OcrWorkerType.CHESS);
    const cleanText = text.replace(/\s/g, "");
    logger.debug(`[TftOperator] 锻造器浮窗 OCR 结果: "${cleanText}"`);
    const isCompletedForge = cleanText.includes("成装锻造器") || cleanText.includes("成装锻造") || cleanText.includes("成装");
    if (isCompletedForge) {
      logger.debug(`[TftOperator] 识别为成装锻造器`);
      return ItemForgeType.COMPLETED;
    }
    const isArtifactForge = cleanText.includes("神器装备锻造器") || cleanText.includes("神器装备") || cleanText.includes("神器");
    if (isArtifactForge) {
      logger.debug(`[TftOperator] 识别为神器装备锻造器`);
      return ItemForgeType.ARTIFACT;
    }
    const isSupportForge = cleanText.includes("辅助装锻造器") || cleanText.includes("辅助装锻造") || cleanText.includes("辅助装");
    if (isSupportForge) {
      logger.debug(`[TftOperator] 识别为辅助装锻造器`);
      return ItemForgeType.SUPPORT;
    }
    const isBasicForge = cleanText.includes("基础装备锻造器") || cleanText.includes("基础装备") || cleanText.includes("锻造器");
    if (isBasicForge) {
      logger.debug(`[TftOperator] 识别为基础装备锻造器`);
      return ItemForgeType.BASIC;
    }
    logger.warn(`[TftOperator] 锻造器识别失败(槽位${slotIndex})`, true);
    return ItemForgeType.NONE;
  }
  /**
   * 识别锻造器选择界面中的装备类型
   * @description 当玩家点击锻造器后，会弹出装备选择界面。
   *              此方法用于识别选择界面中各个槽位的装备。
   * 
   * 界面布局说明：
   * - 成装锻造器：5 选 1（5 个装备槽位）
   * - 其他锻造器（基础/神器/辅助）：4 选 1（4 个装备槽位）
   * 
   * @param slotNum 装备槽位数量，默认为 4（只有成装锻造器是 5）
   * @returns 识别到的装备数组（TFTEquip 类型）
   * 
   * @example
   * // 基础装备锻造器（4选1）
   * const equips = await operator.identifyForgeEquipments(4);
   * 
   * // 成装锻造器（5选1）
   * const equips = await operator.identifyForgeEquipments(5);
   * 
   * TODO: 实现装备识别逻辑
   * 1. 根据 slotNum 计算各个装备槽位的 region
   *    - 4 槽位和 5 槽位的布局不同，需要分别定义坐标
   * 2. 截取每个槽位的图像
   * 3. 使用 templateMatcher.matchEquip() 进行模板匹配
   * 4. 返回识别结果数组
   */
  async identifyForgeEquipments(slotNum = 4) {
    this.ensureInitialized();
    logger.info(`[TftOperator] 识别锻造器装备选择界面 (${slotNum} 槽位)...`);
    logger.warn(`[TftOperator] identifyForgeEquipments() 尚未实现`);
    return [];
  }
  /**
   * 获取游戏阶段显示区域
   * @param isStageOne 是否为第一阶段 (UI 位置不同)
   */
  getStageAbsoluteRegion(isStageOne = false) {
    this.ensureInitialized();
    const display = isStageOne ? gameStageDisplayStageOne : gameStageDisplayNormal;
    return new Region(
      Math.round(this.gameWindowRegion.x + display.leftTop.x),
      Math.round(this.gameWindowRegion.y + display.leftTop.y),
      Math.round(display.rightBottom.x - display.leftTop.x),
      Math.round(display.rightBottom.y - display.leftTop.y)
    );
  }
  /**
   * 获取发条鸟试炼模式的阶段显示区域
   */
  getClockworkTrialsRegion() {
    return new Region(
      this.gameWindowRegion.x + gameStageDisplayTheClockworkTrails.leftTop.x,
      this.gameWindowRegion.y + gameStageDisplayTheClockworkTrails.leftTop.y,
      gameStageDisplayTheClockworkTrails.rightBottom.x - gameStageDisplayTheClockworkTrails.leftTop.x,
      gameStageDisplayTheClockworkTrails.rightBottom.y - gameStageDisplayTheClockworkTrails.leftTop.y
    );
  }
  /**
   * 确保操作器已初始化
   * @throws 如果未初始化
   */
  ensureInitialized() {
    if (!this.gameWindowRegion) {
      logger.error("[TftOperator] 尝试在 init() 之前操作");
      if (!this.init()) {
        throw new Error("[TftOperator] 未初始化，请先调用 init()");
      }
    }
  }
  /**
   * 处理识别失败的情况
   * @param type 识别类型 (shop/bench)
   * @param slot 槽位标识
   * @param recognizedName 识别到的名称
   * @param imageBuffer 截图 Buffer
   */
  handleRecognitionFailure(type, slot, recognizedName, imageBuffer) {
    if (recognizedName === "empty") {
      logger.debug(`[${type}槽位 ${slot}] 识别为空槽位`);
    } else if (recognizedName && recognizedName.length > 0) {
      logger.warn(`[${type}槽位 ${slot}] 匹配到模板但名称未知: ${recognizedName}`, true);
    } else {
      logger.warn(`[${type}槽位 ${slot}] 识别失败`, true);
    }
  }
  /**
   * 保存识别失败的图片
   * @param type 类型标识
   * @param slot 槽位标识
   * @param mat OpenCV Mat 对象
   * @param channels 通道数
   */
  async saveFailedImage(type, slot, mat, channels) {
    try {
      const fileName = `${type}_${slot}_${Date.now()}.png`;
      const pngBuffer = await sharp(mat.data, {
        raw: {
          width: mat.cols,
          height: mat.rows,
          channels
        }
      }).png().toBuffer();
      fs.writeFileSync(path__default.join(this.equipTemplatePath, fileName), pngBuffer);
      logger.info(`[TftOperator] 已保存失败样本: ${fileName}`);
    } catch (e) {
      logger.error(`[TftOperator] 保存失败样本出错: ${e}`);
    }
  }
  /**
   * 获取当前等级信息
   * @description 通过 OCR 识别左下角等级区域，解析等级和经验值
   * @returns 等级信息对象，包含当前等级、当前经验值、升级所需总经验值
   * 
   * @example
   * // 扫描区域内容示例: "4级  4/6"
   * const levelInfo = await operator.getLevelInfo();
   * // 返回: { level: 4, currentXp: 4, totalXp: 6 }
   */
  async getLevelInfo() {
    this.ensureInitialized();
    try {
      const absoluteRegion = new Region(
        Math.round(this.gameWindowRegion.x + levelRegion.leftTop.x),
        Math.round(this.gameWindowRegion.y + levelRegion.leftTop.y),
        Math.round(levelRegion.rightBottom.x - levelRegion.leftTop.x),
        Math.round(levelRegion.rightBottom.y - levelRegion.leftTop.y)
      );
      const pngBuffer = await screenCapture.captureRegionAsPng(absoluteRegion);
      const text = await ocrService.recognize(pngBuffer, OcrWorkerType.LEVEL);
      const match = text.match(/(\d+)\s*级\s*(\d+)\s*\/\s*(\d+)/);
      if (match) {
        const level = parseInt(match[1], 10);
        const currentXp = parseInt(match[2], 10);
        const totalXp = parseInt(match[3], 10);
        logger.info(`[TftOperator] 等级解析成功: Lv.${level}, 经验 ${currentXp}/${totalXp}`);
        return { level, currentXp, totalXp };
      }
      const fallbackResult = this.tryFixMisrecognizedXp(text);
      if (fallbackResult) {
        logger.info(
          `[TftOperator] 等级解析成功(兜底修复): Lv.${fallbackResult.level}, 经验 ${fallbackResult.currentXp}/${fallbackResult.totalXp}`
        );
        return fallbackResult;
      }
      logger.warn(`[TftOperator] 等级解析失败，无法匹配格式: "${text}"`);
      return null;
    } catch (error) {
      logger.error(`[TftOperator] 获取等级信息异常: ${error}`);
      return null;
    }
  }
  /**
   * 尝试修复 "/" 被误识别的经验值
   * @param text OCR 识别的原始文本
   * @returns 修复后的等级信息，无法修复返回 null
   * 
   * @description TFT 经验值规则：
   * - totalXp 只有固定的几个值: 2, 6, 10, 20, 36, 48, 76, 84
   * - currentXp 范围是 0 ~ totalXp-1（可以是奇数，比如通过任务/战斗获得 1 点经验）
   * - currentXp 和 totalXp 最多都是两位数
   * 
   * "/" 可能被误识别为 "1"、"7" 或 "0"：
   * - "4/6" → "416" 或 "476" 或 "406"
   * - "16/76" → "16176" 或 "16776" 或 "16076"
   * 
   * 修复策略：
   * 1. 匹配 "X级 数字串" 格式
   * 2. 遍历数字串的所有可能切分点（"1" 或 "7" 的位置）
   * 3. 检查切分后的 currentXp 和 totalXp 是否符合规则
   */
  tryFixMisrecognizedXp(text) {
    const VALID_TOTAL_XP = /* @__PURE__ */ new Set([2, 6, 10, 20, 36, 60, 68]);
    const SLASH_MISRECOGNIZED_CHARS = ["1", "7", "0"];
    const match = text.match(/(\d+)\s*级\s*(\d+)/);
    if (!match) return null;
    const level = parseInt(match[1], 10);
    const xpDigits = match[2];
    for (let i = 1; i < xpDigits.length; i++) {
      if (!SLASH_MISRECOGNIZED_CHARS.includes(xpDigits[i])) continue;
      const currentXpStr = xpDigits.substring(0, i);
      const totalXpStr = xpDigits.substring(i + 1);
      if (!currentXpStr || !totalXpStr) continue;
      if (currentXpStr.length > 1 && currentXpStr[0] === "0") continue;
      if (totalXpStr.length > 1 && totalXpStr[0] === "0") continue;
      const currentXp = parseInt(currentXpStr, 10);
      const totalXp = parseInt(totalXpStr, 10);
      if (VALID_TOTAL_XP.has(totalXp) && currentXp >= 0 && currentXp < totalXp && currentXp <= 99 && totalXp <= 99) {
        logger.debug(
          `[TftOperator] 兜底修复: "${xpDigits}" → "${currentXp}/${totalXp}" (在位置 ${i} 处将 "${xpDigits[i]}" 还原为 "/")`
        );
        return { level, currentXp, totalXp };
      }
    }
    return null;
  }
  /**
   * 获取当前持有的金币数量
   * @description 通过 OCR 识别左下角金币区域，解析当前金币数
   *              金币显示区域只会出现 0-9 的数字，复用 GAME_STAGE worker
   * @returns 金币数量，识别失败返回 null
   * 
   * @example
   * const coins = await operator.getCoinCount();
   * // 返回: 50 (当前持有 50 金币)
   */
  async getCoinCount() {
    this.ensureInitialized();
    try {
      const absoluteRegion = new Region(
        Math.round(this.gameWindowRegion.x + coinRegion.leftTop.x),
        Math.round(this.gameWindowRegion.y + coinRegion.leftTop.y),
        Math.round(coinRegion.rightBottom.x - coinRegion.leftTop.x),
        Math.round(coinRegion.rightBottom.y - coinRegion.leftTop.y)
      );
      const pngBuffer = await screenCapture.captureRegionAsPng(absoluteRegion);
      const text = await ocrService.recognize(pngBuffer, OcrWorkerType.GAME_STAGE);
      const cleanText = text.replace(/\D/g, "");
      if (cleanText.length > 0) {
        const coinCount = parseInt(cleanText, 10);
        logger.info(`[TftOperator] 金币识别成功: ${coinCount}`);
        return coinCount;
      }
      logger.warn(`[TftOperator] 金币解析失败，OCR 结果: "${text}"，尝试点击关闭遮挡...`);
      await mouseController.clickAt(hexSlot.SLOT_2, MouseButtonType.LEFT);
      await sleep(50);
      await this.buyAtSlot(3);
      await sleep(100);
      const retryBuffer = await screenCapture.captureRegionAsPng(absoluteRegion);
      const retryText = await ocrService.recognize(retryBuffer, OcrWorkerType.GAME_STAGE);
      const retryClean = retryText.replace(/\D/g, "");
      if (retryClean.length > 0) {
        const coinCount = parseInt(retryClean, 10);
        logger.info(`[TftOperator] 金币重试识别成功: ${coinCount}`);
        return coinCount;
      }
      logger.warn(`[TftOperator] 金币重试仍失败，OCR 结果: "${retryText}"`);
      return null;
    } catch (error) {
      logger.error(`[TftOperator] 获取金币数量异常: ${error}`);
      return null;
    }
  }
  /**
   * 检测当前画面中的战利品球
   * @description 扫描战利品掉落区域，通过模板匹配识别所有战利品球
   *              支持识别普通(银色)、蓝色、金色三种等级的战利品球
   * @returns 检测到的战利品球数组，包含位置、类型和置信度
   * 
   * @example
   * const lootOrbs = await operator.getLootOrbs();
   * // 返回: [{ x: 450, y: 300, type: 'gold', confidence: 0.92 }, ...]
   */
  async getLootOrbs() {
    this.ensureInitialized();
    if (!templateLoader.isReady()) {
      logger.warn("[TftOperator] 模板未加载完成，跳过战利品球检测");
      return [];
    }
    try {
      const absoluteRegion = new Region(
        Math.round(this.gameWindowRegion.x + lootRegion.leftTop.x),
        Math.round(this.gameWindowRegion.y + lootRegion.leftTop.y),
        Math.round(lootRegion.rightBottom.x - lootRegion.leftTop.x),
        Math.round(lootRegion.rightBottom.y - lootRegion.leftTop.y)
      );
      const targetMat = await screenCapture.captureRegionAsMat(absoluteRegion);
      const relativeOrbs = templateMatcher.matchLootOrbs(targetMat);
      const absoluteOrbs = relativeOrbs.map((orb) => {
        const absX = orb.x + lootRegion.leftTop.x;
        const absY = orb.y + lootRegion.leftTop.y;
        logger.debug(
          `[TftOperator] 检测到战利品球: ${orb.type} 位置 (${absX}, ${absY}), 置信度 ${(orb.confidence * 100).toFixed(1)}%`
        );
        return { ...orb, x: absX, y: absY };
      });
      targetMat.delete();
      logger.info(
        `[TftOperator] 战利品球检测完成: 普通 ${absoluteOrbs.filter((o) => o.type === "normal").length} 个, 蓝色 ${absoluteOrbs.filter((o) => o.type === "blue").length} 个, 金色 ${absoluteOrbs.filter((o) => o.type === "gold").length} 个`
      );
      return absoluteOrbs;
    } catch (error) {
      logger.error(`[TftOperator] 战利品球检测异常: ${error}`);
      return [];
    }
  }
  /**
   * 让小小英雄归位到默认站位
   * @description 通过右键点击两次默认站位坐标，让小小英雄移动回棋盘左下角
   *              用于：
   *              - 战斗结束后归位，避免遮挡棋盘
   *              - 拾取战利品前归位，确保路径规划的起点一致
   *              - 防挂机时的随机移动起点
   * 
   * 为什么点击两次？
   * - 第一次点击：发出移动指令
   * - 第二次点击：确保小小英雄确实开始移动（有时候单次点击可能被忽略）
   * 
   * @example
   * // 战斗结束后归位
   * await tftOperator.selfResetPosition();
   */
  async selfResetPosition() {
    this.ensureInitialized();
    logger.info(`[TftOperator] 小小英雄归位中... 目标坐标: (${littleLegendDefaultPoint.x}, ${littleLegendDefaultPoint.y})`);
    await mouseController.clickAt(littleLegendDefaultPoint, MouseButtonType.RIGHT);
  }
  /**
   * 让小小英雄随机走动（防挂机）
   * @description 在战斗阶段让小小英雄随机移动，避免被系统判定为挂机
   *              用于：
   *              - PVP 战斗阶段的防挂机
   *              - 等待时的随机移动
   * 
   * 走位逻辑：
   * - 每次调用时，走向与上一次相反的方向（左右交替）
   * - 从对应方向的点位数组中随机选择一个点
   * - 这样小小英雄会在棋盘两侧来回走动，更像真人操作
   * 
   * @example
   * // PVP 战斗阶段防挂机
   * await tftOperator.selfWalkAround();
   */
  async selfWalkAround() {
    this.ensureInitialized();
    const targetSide = this.lastWalkSide === "left" ? "right" : "left";
    const targetPoints = selfWalkAroundPoints[targetSide];
    const randomIndex = Math.floor(Math.random() * targetPoints.length);
    const targetPoint = targetPoints[randomIndex];
    logger.info(
      `[TftOperator] 小小英雄随机走动: ${this.lastWalkSide} → ${targetSide}，目标坐标: (${targetPoint.x}, ${targetPoint.y})`
    );
    await mouseController.clickAt(targetPoint, MouseButtonType.RIGHT);
    this.lastWalkSide = targetSide;
  }
  // ========================================================================
  // 棋子移动操作
  // ========================================================================
  /**
   * 出售指定位置的棋子
   * @param location 棋子当前位置 (备战席 "SLOT_x" 或 棋盘 "Rx_Cx")
   * @description 操作流程：
   *              1. 鼠标移动到棋子位置
   *              2. 左键拖拽（拿起）
   *              3. 移动到商店区域 (使用 SHOP_SLOT_3 作为卖出点，因为它在中间)
   *              4. 释放左键（卖出）
   */
  async sellUnit(location) {
    this.ensureInitialized();
    let fromPoint;
    if (location.startsWith("SLOT_")) {
      fromPoint = benchSlotPoints[location];
    } else if (location.startsWith("R")) {
      fromPoint = fightBoardSlotPoint[location];
    }
    if (!fromPoint) {
      logger.error(`[TftOperator] 卖出失败，无效的位置: ${location}`);
      return;
    }
    const sellPoint = shopSlot.SHOP_SLOT_3;
    logger.info(`[TftOperator] 卖出棋子: ${location}`);
    await mouseController.drag(fromPoint, sellPoint);
  }
  /**
   * 将备战席的棋子移动到棋盘指定位置
   * @param benchLocation 备战席位置 (如 "SLOT_1")
   * @param boardLocation 棋盘目标位置 (如 "R1_C1")
   * @description 通过拖拽操作将棋子从备战席移动到棋盘上
   *              这是上场棋子的核心操作
   * 
   * @example
   * // 将备战席 SLOT_1 的棋子移动到棋盘 R1_C1 位置
   * await tftOperator.moveBenchToBoard("SLOT_1", "R1_C1");
   */
  async moveBenchToBoard(benchLocation, boardLocation) {
    this.ensureInitialized();
    const fromPoint = benchSlotPoints[benchLocation];
    if (!fromPoint) {
      logger.error(`[TftOperator] 无效的备战席位置: ${benchLocation}`);
      return;
    }
    const toPoint = fightBoardSlotPoint[boardLocation];
    if (!toPoint) {
      logger.error(`[TftOperator] 无效的棋盘位置: ${boardLocation}`);
      return;
    }
    logger.info(`[TftOperator] 移动棋子: ${benchLocation} -> ${boardLocation}`);
    await mouseController.drag(fromPoint, toPoint);
  }
  /**
   * 将棋盘上的棋子移动到另一个棋盘位置
   * @param fromLocation 起始位置 (如 "R1_C1")
   * @param toLocation 目标位置 (如 "R4_C4")
   * @description 用于调整棋子站位，前后排调整等
   * 
   * @example
   * // 将 R1_C1 的棋子移动到 R4_C4
   * await tftOperator.moveBoardToBoard("R1_C1", "R4_C4");
   */
  async moveBoardToBoard(fromLocation, toLocation) {
    this.ensureInitialized();
    const fromPoint = fightBoardSlotPoint[fromLocation];
    const toPoint = fightBoardSlotPoint[toLocation];
    if (!fromPoint || !toPoint) {
      logger.error(`[TftOperator] 无效的棋盘位置: ${fromLocation} -> ${toLocation}`);
      return;
    }
    logger.info(`[TftOperator] 调整站位: ${fromLocation} -> ${toLocation}`);
    await mouseController.drag(fromPoint, toPoint);
  }
  /**
   * 将棋盘上的棋子移回备战席
   * @param boardLocation 棋盘位置 (如 "R1_C1")
   * @param benchSlotIndex 备战席目标槽位索引 (0-8)，如果不指定则移到第一个空位
   * @description 用于下场棋子，腾出人口等
   * 
   * @example
   * // 将 R1_C1 的棋子移回备战席第一个槽位
   * await tftOperator.moveBoardToBench("R1_C1", 0);
   */
  async moveBoardToBench(boardLocation, benchSlotIndex = 0) {
    this.ensureInitialized();
    const fromPoint = fightBoardSlotPoint[boardLocation];
    const benchSlotKey = `SLOT_${benchSlotIndex + 1}`;
    const toPoint = benchSlotPoints[benchSlotKey];
    if (!fromPoint || !toPoint) {
      logger.error(
        `[TftOperator] 无效的位置: 棋盘 ${boardLocation} -> 备战席 SLOT_${benchSlotIndex + 1}`
      );
      return;
    }
    logger.info(
      `[TftOperator] 下场棋子: 棋盘 ${boardLocation} -> 备战席 SLOT_${benchSlotIndex + 1}`
    );
    await mouseController.drag(fromPoint, toPoint);
  }
  /**
   * 打开锻造器并选择装备
   * @param benchUnit 备战席上的锻造器单位
   * @description 锻造器打开后会弹出装备选择界面（4选1 或 5选1）
   *              当前实现：固定选择中间的装备
   *              - 4选1 时选择第2个（索引1，从左数第二个）
   *              - 5选1 时选择第3个（索引2，正中间）
   * 
   *              操作流程：
   *              1. 校验传入的单位是否为锻造器
   *              2. 将锻造器从备战席拖拽到商店位置（SHOP_SLOT_3）
   *              3. 松开鼠标后，再左键点击商店位置打开选择界面
   *              4. 等待界面出现（约 300ms）
   *              5. 点击中间位置的装备完成选择
   * 
   * @example
   * // 打开备战席上的锻造器
   * const forges = gameStateManager.findItemForges();
   * if (forges.length > 0) {
   *     await tftOperator.openItemForge(forges[0]);
   * }
   * 
   * TODO: 识别装备并精准选择（根据阵容需求选择最优装备）
   */
  async openItemForge(benchUnit) {
    this.ensureInitialized();
    const unitName = benchUnit.tftUnit.displayName;
    if (!unitName.includes("锻造器")) {
      logger.error(`[TftOperator] openItemForge 传入的不是锻造器: ${unitName}`);
      return;
    }
    const forgePoint = benchSlotPoints[benchUnit.location];
    if (!forgePoint) {
      logger.error(`[TftOperator] 无效的备战席位置: ${benchUnit.location}`);
      return;
    }
    logger.info(`[TftOperator] 打开锻造器: ${unitName} (${benchUnit.location})`);
    const shopPoint = shopSlot.SHOP_SLOT_3;
    await mouseController.drag(forgePoint, shopPoint);
    await sleep(500);
    await mouseController.clickAt(shopPoint, MouseButtonType.LEFT);
  }
  /**
   * 将装备穿戴给棋盘上的单位
   * @param equipSlotIndex 装备栏索引 (0-9)
   * @param boardLocation 棋盘目标位置 (如 "R1_C1")
   * @description 将指定装备槽位的装备拖拽到棋盘上的指定位置
   */
  async equipToBoardUnit(equipSlotIndex, boardLocation) {
    this.ensureInitialized();
    if (equipSlotIndex < 0 || equipSlotIndex > 9) {
      logger.error(`[TftOperator] 无效的装备槽位索引: ${equipSlotIndex} (只接受 0-9)`);
      return;
    }
    const equipSlotKey = `EQ_SLOT_${equipSlotIndex + 1}`;
    const fromPoint = equipmentSlot[equipSlotKey];
    if (!fromPoint) {
      logger.error(`[TftOperator] 无效的装备槽位索引: ${equipSlotIndex}`);
      return;
    }
    const toPoint = fightBoardSlotPoint[boardLocation];
    if (!toPoint) {
      logger.error(`[TftOperator] 无效的棋盘位置: ${boardLocation}`);
      return;
    }
    logger.info(`[TftOperator] 穿装备: 槽位${equipSlotIndex}(${equipSlotKey}) -> ${boardLocation}`);
    await mouseController.drag(fromPoint, toPoint);
  }
}
const tftOperator = TftOperator.getInstance();
class GameStateManager {
  static instance;
  // ========== 游戏状态快照 ==========
  /** 当前阶段的游戏状态快照 */
  snapshot = null;
  // ========== 游戏进程状态 ==========
  /** 游戏进程信息 */
  progress = {
    currentStage: "",
    currentStageType: GameStageType.UNKNOWN,
    hasFirstPvpOccurred: false,
    isGameRunning: false,
    gameStartTime: 0
  };
  // ========== 等级相关（独立追踪，因为可能频繁变化）==========
  /** 当前人口等级 */
  currentLevel = 1;
  constructor() {
  }
  /**
   * 获取单例实例
   */
  static getInstance() {
    if (!GameStateManager.instance) {
      GameStateManager.instance = new GameStateManager();
    }
    return GameStateManager.instance;
  }
  // ============================================================================
  // 快照管理
  // ============================================================================
  /**
   * 更新游戏状态快照
   * @description 由 StrategyService 调用 TftOperator 采集数据后，通过此方法更新快照
   *              GameStateManager 本身不负责数据采集，只负责存储
   * @param data 快照数据（不含 timestamp，会自动添加）
   */
  updateSnapshot(data) {
    if (data.level !== this.currentLevel) {
      logger.info(`[GameStateManager] 人口变化: ${this.currentLevel} -> ${data.level}`);
      this.currentLevel = data.level;
    }
    this.snapshot = {
      ...data,
      timestamp: Date.now()
    };
    const benchCount = data.benchUnits.filter((u) => u !== null).length;
    const boardCount = data.boardUnits.filter((u) => u !== null).length;
    const shopCount = data.shopUnits.filter((u) => u !== null).length;
    logger.info(
      `[GameStateManager] 快照更新完成: 备战席 ${benchCount}/9, 棋盘 ${boardCount}/28, 商店 ${shopCount}/5, 装备 ${data.equipments.length} 件, 等级 Lv.${data.level}, 金币 ${data.gold}`
    );
  }
  /**
   * 刷新游戏状态快照 (已废弃，保留向后兼容)
   * @deprecated 请使用 StrategyService.refreshGameState() 代替
   *             GameStateManager 不再直接调用 TftOperator
   * @returns 当前快照，如果不存在则返回空快照
   */
  async refreshSnapshot() {
    logger.warn("[GameStateManager] refreshSnapshot() 已废弃，请使用 StrategyService.refreshGameState()");
    if (this.snapshot) {
      return this.snapshot;
    }
    return {
      benchUnits: [],
      boardUnits: [],
      shopUnits: [],
      equipments: [],
      level: this.currentLevel,
      currentXp: 0,
      totalXp: 0,
      gold: 0,
      timestamp: Date.now()
    };
  }
  /**
   * 获取当前快照（同步版本）
   * @returns 快照或 null（如果尚未更新）
   */
  getSnapshotSync() {
    return this.snapshot;
  }
  /**
   * 获取当前快照 (已废弃，保留向后兼容)
   * @deprecated 请使用 getSnapshotSync() 代替
   *             异步版本不再自动刷新，直接返回当前快照
   * @returns 游戏状态快照
   */
  async getSnapshot() {
    logger.warn("[GameStateManager] getSnapshot() 已废弃，请使用 getSnapshotSync()");
    if (!this.snapshot) {
      return this.refreshSnapshot();
    }
    return this.snapshot;
  }
  /**
   * 检查快照是否存在
   */
  hasSnapshot() {
    return this.snapshot !== null;
  }
  /**
   * 清除当前快照
   * @description 在阶段切换时调用，强制下次获取时重新扫描
   */
  clearSnapshot() {
    this.snapshot = null;
    logger.debug("[GameStateManager] 快照已清除");
  }
  // ============================================================================
  // 便捷 Getter（直接从快照读取）
  // ============================================================================
  /**
   * 获取备战席棋子
   * @returns 备战席棋子数组，如果快照不存在返回空数组
   */
  getBenchUnits() {
    return this.snapshot?.benchUnits ?? [];
  }
  /**
   * 获取棋盘棋子
   * @returns 棋盘棋子数组，如果快照不存在返回空数组
   */
  getBoardUnits() {
    return this.snapshot?.boardUnits ?? [];
  }
  /**
   * 获取商店棋子
   * @returns 商店棋子数组，如果快照不存在返回空数组
   */
  getShopUnits() {
    return this.snapshot?.shopUnits ?? [];
  }
  /**
   * 获取装备栏装备
   * @returns 装备数组，如果快照不存在返回空数组
   */
  getEquipments() {
    return this.snapshot?.equipments ?? [];
  }
  /**
   * 获取当前等级
   * @returns 当前人口等级
   */
  getLevel() {
    return this.currentLevel;
  }
  /**
   * 获取当前金币
   * @returns 金币数量，如果快照不存在返回 0
   */
  getGold() {
    return this.snapshot?.gold ?? 0;
  }
  /**
   * 获取备战席空位数量
   * @returns 空位数量 (0-9)
   * @description 备战席共 9 个槽位，遍历统计 null（空槽）的数量
   *              TftOperator 扫描备战席时，空槽位会返回 null
   */
  getEmptyBenchSlotCount() {
    const benchUnits = this.getBenchUnits();
    return benchUnits.filter((unit) => unit === null).length;
  }
  /**
   * 获取当前经验值信息
   * @returns 经验值对象 { current, total }
   */
  getXpInfo() {
    return {
      current: this.snapshot?.currentXp ?? 0,
      total: this.snapshot?.totalXp ?? 0
    };
  }
  /**
   * 获取所有已拥有的棋子名称（备战席 + 棋盘）
   * @returns 棋子名称集合
   */
  getOwnedChampionNames() {
    const names = /* @__PURE__ */ new Set();
    for (const unit of this.getBenchUnits()) {
      if (unit?.tftUnit) {
        names.add(unit.tftUnit.displayName);
      }
    }
    for (const unit of this.getBoardUnits()) {
      if (unit?.tftUnit) {
        names.add(unit.tftUnit.displayName);
      }
    }
    return names;
  }
  /**
   * 获取所有可见棋子名称（备战席 + 棋盘 + 商店）
   * @returns 棋子名称集合
   */
  getAllVisibleChampionNames() {
    const names = this.getOwnedChampionNames();
    for (const unit of this.getShopUnits()) {
      if (unit) {
        names.add(unit.displayName);
      }
    }
    return names;
  }
  /**
   * 获取指定棋子的 1 星数量（备战席 + 棋盘）
   * @param championName 棋子名称
   * @returns 1 星棋子的数量
   * @description 用于判断购买后是否能升星
   *              TFT 合成规则：3 个 1 星 → 1 个 2 星，3 个 2 星 → 1 个 3 星
   *              所以如果已有 2 个 1 星，再买 1 个就能升 2 星
   */
  getOneStarChampionCount(championName) {
    let count = 0;
    for (const unit of this.getBenchUnits()) {
      if (unit?.tftUnit?.displayName === championName && unit.starLevel === 1) {
        count++;
      }
    }
    for (const unit of this.getBoardUnits()) {
      if (unit?.tftUnit?.displayName === championName && unit.starLevel === 1) {
        count++;
      }
    }
    return count;
  }
  /**
   * 判断购买指定棋子后是否能升星
   * @param championName 棋子名称
   * @returns 是否能升星（true = 买了能升星，不占额外格子）
   * @description 如果已有 2 个 1 星同名棋子，买第 3 个会自动合成 2 星
   *              这种情况下即使备战席满了也可以购买
   */
  canUpgradeAfterBuy(championName) {
    const oneStarCount = this.getOneStarChampionCount(championName);
    return oneStarCount >= 2;
  }
  /**
   * 查找指定棋子的 1 星位置信息
   * @param championName 棋子名称
   * @returns 所有 1 星棋子的位置数组，包含位置类型（bench/board）和索引
   * @description 用于购买后更新状态时，确定哪些棋子会参与合成
   *              TFT 合成规则：优先合成场上的棋子，备战席按从左到右顺序
   */
  findOneStarChampionPositions(championName) {
    const positions = [];
    const boardUnits = this.getBoardUnits();
    for (let i = 0; i < boardUnits.length; i++) {
      const unit = boardUnits[i];
      if (unit?.tftUnit?.displayName === championName && unit.starLevel === 1) {
        positions.push({ location: "board", index: i });
      }
    }
    const benchUnits = this.getBenchUnits();
    for (let i = 0; i < benchUnits.length; i++) {
      const unit = benchUnits[i];
      if (unit?.tftUnit?.displayName === championName && unit.starLevel === 1) {
        positions.push({ location: "bench", index: i });
      }
    }
    return positions;
  }
  /**
   * 获取备战席第一个空位的索引
   * @returns 空位索引 (0-8)，如果没有空位返回 -1
   * @description 购买棋子后，新棋子会放到备战席最左边的空位
   */
  getFirstEmptyBenchSlotIndex() {
    const benchUnits = this.getBenchUnits();
    for (let i = 0; i < benchUnits.length; i++) {
      if (benchUnits[i] === null) {
        return i;
      }
    }
    return -1;
  }
  /**
   * 更新备战席指定槽位为空
   * @param index 槽位索引 (0-8)
   * @description 当棋子被合成消耗时，需要将对应槽位标记为空
   *              直接修改快照中的 benchUnits 数组
   */
  setBenchSlotEmpty(index) {
    if (!this.snapshot) {
      logger.warn("[GameStateManager] 快照不存在，无法更新备战席");
      return;
    }
    if (index < 0 || index >= this.snapshot.benchUnits.length) {
      logger.warn(`[GameStateManager] 无效的备战席索引: ${index}`);
      return;
    }
    const oldUnit = this.snapshot.benchUnits[index];
    this.snapshot.benchUnits[index] = null;
    logger.debug(
      `[GameStateManager] 备战席槽位 ${index} 已清空` + (oldUnit?.tftUnit ? ` (原: ${oldUnit.tftUnit.displayName})` : "")
    );
  }
  /**
   * 设置备战席指定槽位的棋子
   * @param index 槽位索引 (0-8)
   * @param unit 要放置的棋子
   * @description 购买棋子后，将新棋子放入备战席指定槽位
   */
  setBenchSlotUnit(index, unit) {
    if (!this.snapshot) {
      logger.warn("[GameStateManager] 快照不存在，无法设置棋子");
      return;
    }
    if (index < 0 || index >= this.snapshot.benchUnits.length) {
      logger.warn(`[GameStateManager] 无效的备战席索引: ${index}`);
      return;
    }
    this.snapshot.benchUnits[index] = unit;
    logger.debug(
      `[GameStateManager] 备战席槽位 ${index} 已放置: ${unit.tftUnit.displayName} ${unit.starLevel}★`
    );
  }
  /**
   * 更新备战席指定槽位的棋子星级
   * @param index 槽位索引 (0-8)
   * @param newStarLevel 新的星级
   * @description 当棋子升星时，更新对应槽位的星级
   */
  updateBenchSlotStarLevel(index, newStarLevel) {
    if (!this.snapshot) {
      logger.warn("[GameStateManager] 快照不存在，无法更新星级");
      return;
    }
    const unit = this.snapshot.benchUnits[index];
    if (!unit) {
      logger.warn(`[GameStateManager] 备战席槽位 ${index} 为空，无法更新星级`);
      return;
    }
    const oldStarLevel = unit.starLevel;
    unit.starLevel = newStarLevel;
    logger.debug(
      `[GameStateManager] 备战席槽位 ${index} 星级更新: ${unit.tftUnit?.displayName} ${oldStarLevel}★ → ${newStarLevel}★`
    );
  }
  /**
   * 更新棋盘指定槽位的棋子星级
   * @param index 槽位索引 (0-27)
   * @param newStarLevel 新的星级
   * @description 当场上棋子升星时，更新对应槽位的星级
   */
  updateBoardSlotStarLevel(index, newStarLevel) {
    if (!this.snapshot) {
      logger.warn("[GameStateManager] 快照不存在，无法更新星级");
      return;
    }
    const unit = this.snapshot.boardUnits[index];
    if (!unit) {
      logger.warn(`[GameStateManager] 棋盘槽位 ${index} 为空，无法更新星级`);
      return;
    }
    const oldStarLevel = unit.starLevel;
    unit.starLevel = newStarLevel;
    logger.debug(
      `[GameStateManager] 棋盘槽位 ${index} 星级更新: ${unit.tftUnit?.displayName} ${oldStarLevel}★ → ${newStarLevel}★`
    );
  }
  /**
   * 设置棋盘指定槽位的棋子
   * @param index 槽位索引 (0-27)
   * @param unit 要放置的棋子
   * @description 当棋子从备战席移动到棋盘时，更新棋盘状态
   */
  setBoardSlotUnit(index, unit) {
    if (!this.snapshot) {
      logger.warn("[GameStateManager] 快照不存在，无法设置棋盘棋子");
      return;
    }
    if (index < 0 || index >= this.snapshot.boardUnits.length) {
      logger.warn(`[GameStateManager] 无效的棋盘索引: ${index}`);
      return;
    }
    this.snapshot.boardUnits[index] = unit;
    logger.debug(
      `[GameStateManager] 棋盘槽位 ${index} 已放置: ${unit.tftUnit.displayName} ${unit.starLevel}★`
    );
  }
  /**
   * 清空棋盘指定槽位
   * @param index 槽位索引 (0-27)
   * @description 当棋子被卖出或移回备战席时，清空对应棋盘槽位
   */
  setBoardSlotEmpty(index) {
    if (!this.snapshot) {
      logger.warn("[GameStateManager] 快照不存在，无法清空棋盘槽位");
      return;
    }
    if (index < 0 || index >= this.snapshot.boardUnits.length) {
      logger.warn(`[GameStateManager] 无效的棋盘索引: ${index}`);
      return;
    }
    const oldUnit = this.snapshot.boardUnits[index];
    this.snapshot.boardUnits[index] = null;
    logger.debug(
      `[GameStateManager] 棋盘槽位 ${index} 已清空` + (oldUnit?.tftUnit ? ` (原: ${oldUnit.tftUnit.displayName})` : "")
    );
  }
  /**
   * 给棋盘上的棋子添加装备
   * @param boardLocation 棋盘位置（如 "R1_C1"）
   * @param equipName 装备名称
   * @description 当装备穿戴到棋子身上时，同步更新棋子的装备列表
   */
  addEquipToUnit(boardLocation, equipName) {
    if (!this.snapshot) {
      logger.warn("[GameStateManager] 快照不存在，无法添加装备");
      return;
    }
    const index = this.getBoardLocationIndex(boardLocation);
    if (index === -1) {
      logger.warn(`[GameStateManager] 无效的棋盘位置: ${boardLocation}`);
      return;
    }
    const unit = this.snapshot.boardUnits[index];
    if (!unit) {
      logger.warn(`[GameStateManager] 棋盘位置 ${boardLocation} 没有棋子，无法添加装备`);
      return;
    }
    if (unit.equips.length >= 3) {
      logger.warn(`[GameStateManager] 棋子 ${unit.tftUnit.displayName} 装备已满，无法添加 ${equipName}`);
      return;
    }
    unit.equips.push({ name: equipName });
    logger.debug(
      `[GameStateManager] 棋子 ${unit.tftUnit.displayName} 装备添加: ${equipName} (当前装备数: ${unit.equips.length})`
    );
  }
  /**
   * 更新商店棋子列表
   * @param shopUnits 新的商店棋子数组
   * @description 刷新商店后，用新识别的商店数据更新快照
   *              只更新 shopUnits 字段，不影响其他数据
   */
  updateShopUnits(shopUnits) {
    if (!this.snapshot) {
      logger.warn("[GameStateManager] 快照不存在，无法更新商店");
      return;
    }
    this.snapshot.shopUnits = shopUnits;
    const shopCount = shopUnits.filter((u) => u !== null).length;
    logger.debug(`[GameStateManager] 商店已更新: ${shopCount}/5 个棋子`);
  }
  /**
   * 更新商店指定槽位为空（已购买）
   * @param index 槽位索引 (0-4)
   * @description 购买棋子后，将商店对应槽位标记为空
   */
  setShopSlotEmpty(index) {
    if (!this.snapshot) {
      logger.warn("[GameStateManager] 快照不存在，无法更新商店");
      return;
    }
    if (index < 0 || index >= this.snapshot.shopUnits.length) {
      logger.warn(`[GameStateManager] 无效的商店索引: ${index}`);
      return;
    }
    const oldUnit = this.snapshot.shopUnits[index];
    this.snapshot.shopUnits[index] = null;
    logger.debug(
      `[GameStateManager] 商店槽位 ${index} 已清空` + (oldUnit ? ` (原: ${oldUnit.displayName})` : "")
    );
  }
  /**
   * 移除指定索引的装备（模拟消耗）
   * @param index 装备栏索引 (0-9)
   * @description 当使用装备后，后续装备会自动前移
   *              此方法用于在不重新截图的情况下更新内存状态，确保连续操作的索引正确
   */
  removeEquipment(index) {
    if (!this.snapshot) return;
    if (index < 0 || index >= this.snapshot.equipments.length) {
      logger.warn(`[GameStateManager] 尝试移除无效的装备索引: ${index}`);
      return;
    }
    const removed = this.snapshot.equipments.splice(index, 1);
    logger.debug(
      `[GameStateManager] 移除装备: ${removed[0]?.name} (索引 ${index})，剩余 ${this.snapshot.equipments.length} 件 (后续装备已自动前移)`
    );
    for (let i = index; i < this.snapshot.equipments.length; i++) {
      this.snapshot.equipments[i].slot = `SLOT_${i + 1}`;
    }
  }
  /**
   * 更新装备列表
   * @param equipments 新的装备数组
   * @description 从屏幕识别装备后更新，用于 D 牌/卖牌后刷新装备栏
   */
  updateEquipments(equipments) {
    if (!this.snapshot) {
      logger.warn("[GameStateManager] 快照不存在，无法更新装备");
      return;
    }
    this.snapshot.equipments = equipments;
    logger.debug(`[GameStateManager] 装备已更新: ${equipments.length} 件`);
  }
  /**
   * 更新备战席棋子列表
   * @param benchUnits 新的备战席棋子数组
   * @description 从屏幕重新识别备战席后更新，用于卖棋子后刷新备战席状态
   *              会完整替换原有的备战席数据
   */
  updateBenchUnits(benchUnits) {
    if (!this.snapshot) {
      logger.warn("[GameStateManager] 快照不存在，无法更新备战席");
      return;
    }
    this.snapshot.benchUnits = benchUnits;
    const occupiedCount = benchUnits.filter((u) => u !== null).length;
    logger.debug(`[GameStateManager] 备战席已更新: ${occupiedCount}/9 个槽位有棋子`);
  }
  /**
   * 更新等级信息
   * @param levelInfo 等级信息对象 { level, currentXp, totalXp }
   * @description 单独更新等级和经验，无需传入完整快照
   */
  updateLevelInfo(levelInfo) {
    if (!this.snapshot) {
      logger.warn("[GameStateManager] 快照不存在，无法更新等级信息");
      return;
    }
    if (levelInfo.level !== this.currentLevel) {
      logger.info(`[GameStateManager] 人口变化: ${this.currentLevel} -> ${levelInfo.level}`);
      this.currentLevel = levelInfo.level;
    }
    this.snapshot.level = levelInfo.level;
    this.snapshot.currentXp = levelInfo.currentXp;
    this.snapshot.totalXp = levelInfo.totalXp;
    logger.debug(
      `[GameStateManager] 等级信息更新: Lv.${levelInfo.level} (${levelInfo.currentXp}/${levelInfo.totalXp})`
    );
  }
  /**
   * 扣减金币
   * @param amount 扣减数量
   * @description 购买棋子后更新金币数量
   */
  deductGold(amount) {
    if (!this.snapshot) {
      logger.warn("[GameStateManager] 快照不存在，无法扣减金币");
      return;
    }
    const oldGold = this.snapshot.gold;
    this.snapshot.gold = Math.max(0, this.snapshot.gold - amount);
    logger.debug(`[GameStateManager] 金币扣减: ${oldGold} - ${amount} = ${this.snapshot.gold}`);
  }
  /**
   * 更新金币数量
   * @param gold 新的金币数量
   * @description 从屏幕识别金币后更新，比 deductGold 更准确
   *              因为某些海克斯强化会让刷新免费或打折
   */
  updateGold(gold) {
    if (!this.snapshot) {
      logger.warn("[GameStateManager] 快照不存在，无法更新金币");
      return;
    }
    const oldGold = this.snapshot.gold;
    this.snapshot.gold = gold;
    if (oldGold !== gold) {
      logger.debug(`[GameStateManager] 金币更新: ${oldGold} → ${gold}`);
    }
  }
  // ============================================================================
  // 游戏进程管理
  // ============================================================================
  /**
   * 获取游戏进程信息
   */
  getProgress() {
    return { ...this.progress };
  }
  /**
   * 更新当前阶段
   * @param stage 阶段字符串 (如 "2-1")
   * @param stageType 阶段类型
   */
  updateStage(stage, stageType) {
    this.progress.currentStage = stage;
    this.progress.currentStageType = stageType;
    if (stageType === GameStageType.PVP && !this.progress.hasFirstPvpOccurred) {
      this.progress.hasFirstPvpOccurred = true;
      logger.info("[GameStateManager] 检测到第一个 PVP 阶段");
    }
  }
  /**
   * 标记游戏开始
   */
  startGame() {
    this.progress.isGameRunning = true;
    this.progress.gameStartTime = Date.now();
    logger.info("[GameStateManager] 游戏开始");
  }
  /**
   * 标记游戏结束
   */
  endGame() {
    this.progress.isGameRunning = false;
    logger.info("[GameStateManager] 游戏结束");
  }
  /**
   * 检查游戏是否正在进行
   */
  isGameRunning() {
    return this.progress.isGameRunning;
  }
  /**
   * 检查是否已经过了第一个 PVP 阶段
   */
  hasFirstPvpOccurred() {
    return this.progress.hasFirstPvpOccurred;
  }
  // ============================================================================
  // 棋盘状态查询
  // ============================================================================
  /**
   * 获取当前棋盘上的棋子数量
   * @returns 棋盘上非空槽位的数量
   * @description 用于判断是否需要上更多棋子
   *              棋盘最大容量 = 玩家等级
   */
  getBoardUnitCount() {
    const boardUnits = this.getBoardUnits();
    return boardUnits.filter((unit) => unit !== null).length;
  }
  /**
   * 获取棋盘空位数量
   * @returns 棋盘上空槽位的数量
   * @description 棋盘共 28 个槽位 (4行 x 7列)
   *              但实际可用数量受等级限制
   */
  getEmptyBoardSlotCount() {
    const boardUnits = this.getBoardUnits();
    return boardUnits.filter((unit) => unit === null).length;
  }
  /**
   * 获取可以再上场的棋子数量
   * @returns 当前等级下还能上场多少棋子
   * @description 计算公式: 等级 - 当前棋盘棋子数
   *              如果返回 0 或负数，说明已满员或超员
   */
  getAvailableBoardSlots() {
    const level = this.getLevel();
    const currentCount = this.getBoardUnitCount();
    return Math.max(0, level - currentCount);
  }
  /**
   * 获取备战席上的非空棋子列表（带索引）
   * @returns 包含棋子信息和索引的数组
   * @description 用于遍历备战席上的棋子，决定哪些应该上场
   */
  getBenchUnitsWithIndex() {
    const result = [];
    const benchUnits = this.getBenchUnits();
    for (let i = 0; i < benchUnits.length; i++) {
      const unit = benchUnits[i];
      if (unit !== null) {
        result.push({ unit, index: i });
      }
    }
    return result;
  }
  /**
   * 查找备战席中的锻造器
   * @returns 锻造器的 BenchUnit 数组
   * @description 锻造器是特殊单位，displayName 包含"锻造器"即可识别
   *              直接返回 BenchUnit，因为它已包含所有需要的信息：
   *              - location: 槽位位置 (如 "SLOT_1")
   *              - tftUnit: 棋子信息 (包含 displayName)
   *              - starLevel: 星级 (锻造器为 -1)
   *              - equips: 装备列表 (锻造器为空数组)
   */
  findItemForges() {
    return this.getBenchUnits().filter(
      (unit) => unit !== null && unit.tftUnit.displayName.includes("锻造器")
    );
  }
  /**
   * 获取棋盘上的非空棋子列表（带位置）
   * @returns 包含棋子信息的数组
   * @description 用于遍历棋盘上的棋子，分析当前站位
   */
  getBoardUnitsWithLocation() {
    const boardUnits = this.getBoardUnits();
    return boardUnits.filter((unit) => unit !== null);
  }
  /**
   * 获取棋盘上的空位列表
   * @returns 空位的 BoardLocation 数组
   * @description 返回所有空槽位的位置标识（如 "R1_C1"）
   */
  getEmptyBoardLocations() {
    const boardUnits = this.getBoardUnits();
    const emptyLocations = [];
    const boardLocationKeys = Object.keys(fightBoardSlotPoint);
    for (let i = 0; i < boardUnits.length && i < boardLocationKeys.length; i++) {
      if (boardUnits[i] === null) {
        emptyLocations.push(boardLocationKeys[i]);
      }
    }
    return emptyLocations;
  }
  /**
   * 获取前排空位列表
   * @returns 前排（R1, R2）的空位 BoardLocation 数组
   * @description 前排适合放置近战棋子（射程 1-2）
   */
  getFrontRowEmptyLocations() {
    return this.getEmptyBoardLocations().filter(
      (loc) => loc.startsWith("R1_") || loc.startsWith("R2_")
    );
  }
  /**
   * 获取后排空位列表
   * @returns 后排（R3, R4）的空位 BoardLocation 数组
   * @description 后排适合放置远程棋子（射程 3+）
   */
  getBackRowEmptyLocations() {
    return this.getEmptyBoardLocations().filter(
      (loc) => loc.startsWith("R3_") || loc.startsWith("R4_")
    );
  }
  /**
   * 查找装备栏中指定名称的第一个装备索引
   * @param itemName 装备名称
   * @returns 装备索引 (0..n-1)，如果未找到返回 -1
   *
   * @description
   * - 这里返回的是 **equipments 数组索引**（也就是 UI 从左到右的槽位索引）。
   * - `TftOperator.getEquipInfo()` 会过滤掉“空槽位”，并把 slot 重写为紧凑的 `SLOT_1..SLOT_n`。
   *   因此数组索引与槽位索引保持一致，便于连续穿戴/合成时做“前移模拟”。
   */
  findEquipmentIndex(itemName) {
    const equipments = this.getEquipments();
    for (let i = 0; i < equipments.length; i++) {
      const equip = equipments[i];
      if (equip.name === itemName) {
        return i;
      }
    }
    return -1;
  }
  /**
   * 查找装备栏中指定名称的所有装备索引
   * @param itemName 装备名称
   * @returns 装备索引数组 (0..n-1)
   */
  findAllEquipmentIndices(itemName) {
    const equipments = this.getEquipments();
    const indices = [];
    for (let i = 0; i < equipments.length; i++) {
      if (equipments[i].name === itemName) {
        indices.push(i);
      }
    }
    return indices;
  }
  // ============================================================================
  // 重置
  // ============================================================================
  /**
   * 重置所有状态
   * @description 在游戏结束或停止时调用，清理所有状态，准备下一局
   */
  reset() {
    this.snapshot = null;
    this.currentLevel = 1;
    this.progress = {
      currentStage: "",
      currentStageType: GameStageType.UNKNOWN,
      hasFirstPvpOccurred: false,
      isGameRunning: false,
      gameStartTime: 0
    };
    logger.info("[GameStateManager] 游戏状态已重置，准备下一局");
  }
  // ============================================================
  // 🔧 棋子移动状态同步方法
  // ============================================================
  /**
   * 根据 BoardLocation 获取数组索引
   * @param location 棋盘位置（如 "R1_C1"）
   * @returns 对应的数组索引，如果无效返回 -1
   */
  getBoardLocationIndex(location) {
    const boardLocationKeys = Object.keys(fightBoardSlotPoint);
    return boardLocationKeys.indexOf(location);
  }
  /**
   * 根据 BenchLocation 获取数组索引
   * @param location 备战席位置（如 "SLOT_1"）
   * @returns 对应的数组索引（0-8），如果无效返回 -1
   */
  getBenchLocationIndex(location) {
    const match = location.match(/SLOT_(\d+)/);
    if (!match) return -1;
    const slotNum = parseInt(match[1], 10);
    return slotNum >= 1 && slotNum <= 9 ? slotNum - 1 : -1;
  }
  /**
   * 将备战席棋子移动到棋盘（更新内部状态）
   * @param benchLocation 备战席位置
   * @param boardLocation 棋盘目标位置
   * @description 同步更新 GameStateManager 的内部状态，
   *              确保备战席和棋盘的状态与实际游戏一致
   */
  moveBenchToBoard(benchLocation, boardLocation) {
    const benchIndex = this.getBenchLocationIndex(benchLocation);
    const boardIndex = this.getBoardLocationIndex(boardLocation);
    if (benchIndex === -1 || boardIndex === -1) {
      logger.warn(`[GameStateManager] 无效的移动: ${benchLocation} -> ${boardLocation}`);
      return;
    }
    if (!this.snapshot) {
      logger.warn("[GameStateManager] 快照不存在，无法移动棋子");
      return;
    }
    const benchUnit = this.snapshot.benchUnits[benchIndex];
    if (!benchUnit) {
      logger.warn(`[GameStateManager] 备战席 ${benchLocation} 为空，无法移动`);
      return;
    }
    const boardUnit = {
      location: boardLocation,
      tftUnit: benchUnit.tftUnit,
      starLevel: benchUnit.starLevel,
      equips: benchUnit.equips
    };
    this.snapshot.boardUnits[boardIndex] = boardUnit;
    this.snapshot.benchUnits[benchIndex] = null;
    logger.debug(
      `[GameStateManager] 棋子移动: ${benchLocation} -> ${boardLocation} (${benchUnit.tftUnit.displayName} ${benchUnit.starLevel}★)`
    );
  }
  /**
   * 将棋盘棋子移回备战席（更新内部状态）
   * @param boardLocation 棋盘位置
   * @param benchIndex 备战席目标槽位索引（0-8）
   */
  moveBoardToBench(boardLocation, benchIndex) {
    const boardIndex = this.getBoardLocationIndex(boardLocation);
    if (boardIndex === -1 || benchIndex < 0 || benchIndex > 8) {
      logger.warn(`[GameStateManager] 无效的移动: ${boardLocation} -> SLOT_${benchIndex + 1}`);
      return;
    }
    if (!this.snapshot) {
      logger.warn("[GameStateManager] 快照不存在，无法移动棋子");
      return;
    }
    const boardUnit = this.snapshot.boardUnits[boardIndex];
    if (!boardUnit) {
      logger.warn(`[GameStateManager] 棋盘 ${boardLocation} 为空，无法移动`);
      return;
    }
    const benchUnit = {
      location: `SLOT_${benchIndex + 1}`,
      tftUnit: boardUnit.tftUnit,
      starLevel: boardUnit.starLevel,
      equips: boardUnit.equips
    };
    this.snapshot.benchUnits[benchIndex] = benchUnit;
    this.snapshot.boardUnits[boardIndex] = null;
    logger.debug(
      `[GameStateManager] 棋子移回: ${boardLocation} -> SLOT_${benchIndex + 1} (${boardUnit.tftUnit.displayName} ${boardUnit.starLevel}★)`
    );
  }
  /**
   * 棋盘内移动棋子（调整站位）
   * @param fromLocation 原位置
   * @param toLocation 目标位置
   * @description 同步更新 GameStateManager 的内部状态
   */
  moveBoardToBoard(fromLocation, toLocation) {
    const fromIndex = this.getBoardLocationIndex(fromLocation);
    const toIndex = this.getBoardLocationIndex(toLocation);
    if (fromIndex === -1 || toIndex === -1) {
      logger.warn(`[GameStateManager] 无效的棋盘移动: ${fromLocation} -> ${toLocation}`);
      return;
    }
    if (!this.snapshot) {
      logger.warn("[GameStateManager] 快照不存在，无法移动棋子");
      return;
    }
    const unit = this.snapshot.boardUnits[fromIndex];
    if (!unit) {
      logger.warn(`[GameStateManager] 棋盘 ${fromLocation} 为空，无法移动`);
      return;
    }
    unit.location = toLocation;
    this.snapshot.boardUnits[toIndex] = unit;
    this.snapshot.boardUnits[fromIndex] = null;
    logger.debug(
      `[GameStateManager] 棋盘内移动: ${fromLocation} -> ${toLocation} (${unit.tftUnit.displayName} ${unit.starLevel}★)`
    );
  }
  /**
   * 清空棋盘指定位置（根据 BoardLocation）
   * @param boardLocation 棋盘位置（如 "R1_C1"）
   * @description 当棋子被卖出时，清空对应棋盘位置
   */
  clearBoardLocation(boardLocation) {
    const index = this.getBoardLocationIndex(boardLocation);
    if (index === -1) {
      logger.warn(`[GameStateManager] 无效的棋盘位置: ${boardLocation}`);
      return;
    }
    this.setBoardSlotEmpty(index);
  }
}
const gameStateManager = GameStateManager.getInstance();
class GameStageMonitor extends EventEmitter {
  static instance;
  /** 轮询间隔（毫秒）：2 秒一次，避免高频检测 */
  pollInterval = 2e3;
  /** 轮询定时器 ID */
  pollTimer = null;
  /** 是否正在运行 */
  isRunning = false;
  /** 当前阶段文本（如 "2-1"） */
  stageText = "";
  /** 当前大阶段号（如 "2-1" 中的 2） */
  stage = 0;
  /** 当前回合号（如 "2-1" 中的 1） */
  round = 0;
  /** 当前是否处于战斗阶段 */
  isFighting = false;
  /** 当前阶段类型（如 PVE、PVP、CAROUSEL 等） */
  currentStageType = GameStageType.UNKNOWN;
  constructor() {
    super();
    this.setMaxListeners(20);
  }
  /**
   * 获取单例实例
   */
  static getInstance() {
    if (!GameStageMonitor.instance) {
      GameStageMonitor.instance = new GameStageMonitor();
    }
    return GameStageMonitor.instance;
  }
  // ============================================================================
  // 公共接口
  // ============================================================================
  /**
   * 启动阶段轮询
   * @param interval 轮询间隔（毫秒），默认 2000ms（2 秒）
   * @description 开始后台轮询，检测阶段变化并发出事件
   */
  start(interval = 2e3) {
    if (this.isRunning) {
      logger.warn("[GameStageMonitor] 已经在运行中，忽略重复启动");
      return;
    }
    this.pollInterval = interval;
    this.isRunning = true;
    logger.info(`[GameStageMonitor] 启动阶段轮询，间隔: ${interval}ms`);
    this.checkStage();
    this.pollTimer = setInterval(() => {
      this.checkStage();
    }, this.pollInterval);
  }
  /**
   * 停止阶段轮询
   * @description 停止后台轮询，清理定时器
   */
  stop() {
    if (!this.isRunning) {
      logger.debug("[GameStageMonitor] 未在运行，忽略停止请求");
      return;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.isRunning = false;
    logger.info("[GameStageMonitor] 阶段轮询已停止");
  }
  /**
   * 重置状态
   * @description 清除所有缓存的阶段信息，通常在游戏结束时调用
   */
  reset() {
    this.stageText = "";
    this.stage = 0;
    this.round = 0;
    this.isFighting = false;
    this.currentStageType = GameStageType.UNKNOWN;
    logger.info("[GameStageMonitor] 状态已重置");
  }
  // ============================================================================
  // 私有方法
  // ============================================================================
  /**
   * 检测阶段变化
   * @description 轮询的核心方法，检测两个区域：
   *              1. 阶段文本区域 → 检测是否进入新回合
   *              2. "战斗环节"文字区域 → 检测是否进入战斗状态
   */
  async checkStage() {
    try {
      const stageResult = await tftOperator.getGameStage();
      const { type, stageText } = stageResult;
      if (type === GameStageType.UNKNOWN || !stageText) {
        return;
      }
      if (stageText !== this.stageText) {
        const parsed = this.parseStageText(stageText);
        if (parsed) {
          const { stage, round } = parsed;
          const isNewStage = stage !== this.stage;
          const event = {
            stageText,
            type,
            stage,
            round,
            isNewStage
          };
          this.stageText = stageText;
          this.stage = stage;
          this.round = round;
          this.currentStageType = type;
          this.isFighting = false;
          logger.info(
            `[GameStageMonitor] 阶段变化: ${stageText} (${isNewStage ? "新阶段" : "新回合"}, 类型: ${type})`
          );
          this.emit("stageChange", event);
        }
      }
      await this.checkFightingPhase();
    } catch (error) {
      logger.error(`[GameStageMonitor] 阶段检测异常: ${error}`);
    }
  }
  /**
   * 解析阶段文本
   * @param stageText 阶段文本（如 "2-1"）
   * @returns 解析结果，包含 stage 和 round，解析失败返回 null
   */
  parseStageText(stageText) {
    const match = stageText.match(/^(\d+)-(\d+)$/);
    if (!match) {
      logger.debug(`[GameStageMonitor] 无法解析阶段文本: "${stageText}"`);
      return null;
    }
    let stage = parseInt(match[1], 10);
    const round = parseInt(match[2], 10);
    if (stage > 7 && match[1].length > 1) {
      const fixedStage = parseInt(match[1].slice(-1), 10);
      logger.info(`[GameStageMonitor] 修正阶段误识别: "${stageText}" → "${fixedStage}-${round}"`);
      stage = fixedStage;
    }
    return { stage, round };
  }
  /**
   * 检测战斗阶段
   * @description 检测"战斗环节"文字区域，如果检测到文字则进入战斗状态
   *              只检测"进入战斗"，不检测"战斗结束"（新回合开始时自动重置）
   * 
   * TODO: 实现战斗阶段检测逻辑
   * - 使用 combatPhaseTextRegion 区域进行 OCR 识别
   * - 检测到"战斗环节"文字 → 设置 _isFighting = true，发出 fightingStart 事件
   */
  async checkFightingPhase() {
    if (this.isFighting) {
      return;
    }
    if (!screenCapture.isInitialized()) {
      return;
    }
    try {
      const isFightingNow = await this.detectCombatPhaseText();
      if (isFightingNow) {
        this.isFighting = true;
        logger.info('[GameStageMonitor] 检测到"战斗环节"，进入战斗状态');
        this.emit("fightingStart");
      }
    } catch (e) {
      logger.debug(`[GameStageMonitor] 战斗阶段检测失败: ${e?.message ?? e}`);
    }
  }
  /**
   * 检测"战斗环节"文字
   * @description 通过 OCR 识别 `combatPhaseTextRegion` 区域的文字。
   * 
   * 实现要点：
   * - 该区域是固定 UI 文本（短语），因此 OCR 白名单可以收紧，提升准确率
   * - 只要识别结果包含“战斗”就判定为进入战斗（允许 OCR 少字/漏字）
   */
  async detectCombatPhaseText() {
    const pngBuffer = await screenCapture.captureGameRegionAsPng(combatPhaseTextRegion, true);
    const text = await ocrService.recognize(pngBuffer, OcrWorkerType.COMBAT_PHASE);
    const cleanText = text.replace(/\s/g, "");
    return cleanText.includes("战斗");
  }
}
const gameStageMonitor = GameStageMonitor.getInstance();
var LogMode = /* @__PURE__ */ ((LogMode2) => {
  LogMode2["SIMPLE"] = "SIMPLE";
  LogMode2["DETAILED"] = "DETAILED";
  return LogMode2;
})(LogMode || {});
class SettingsStore {
  static instance;
  store;
  static getInstance() {
    if (!SettingsStore.instance) {
      SettingsStore.instance = new SettingsStore();
    }
    return SettingsStore.instance;
  }
  constructor() {
    const defaults = {
      tftMode: TFTMode.NORMAL,
      //  默认是匹配模式
      logMode: LogMode.SIMPLE,
      //  默认是简略日志模式
      logAutoCleanThreshold: 500,
      //  默认超过 500 条时自动清理
      toggleHotkeyAccelerator: "F1",
      //  默认快捷键是 F1
      stopAfterGameHotkeyAccelerator: "F2",
      //  默认快捷键是 F2
      showDebugPage: false,
      //  默认隐藏调试页面
      window: {
        bounds: null,
        //  第一次启动，默认为null
        isMaximized: false
        //  默认不最大化窗口
      },
      selectedLineupIds: []
      //  默认没有选中任何阵容
    };
    this.store = new Store({ defaults });
  }
  /**
   * 获取配置项（支持点号路径访问嵌套属性）
   * @param key 配置 key，支持 "window.bounds" 这样的点号路径
   * @returns 对应的配置值
   * 
   * @example
   * settingsStore.get('tftMode')           // 返回 TFTMode
   * settingsStore.get('window')            // 返回整个 window 对象
   * settingsStore.get('window.bounds')     // 返回 WindowBounds | null
   * settingsStore.get('window.isMaximized') // 返回 boolean
   */
  get(key) {
    return this.store.get(key);
  }
  /**
   * 设置配置项（支持点号路径访问嵌套属性）
   * @param key 配置 key，支持 "window.bounds" 这样的点号路径
   * @param value 要设置的值
   * 
   * @example
   * settingsStore.set('tftMode', TFTMode.CLASSIC)
   * settingsStore.set('window.isMaximized', true)
   * settingsStore.set('window.bounds', { x: 0, y: 0, width: 800, height: 600 })
   */
  set(key, value) {
    this.store.set(key, value);
  }
  getRawStore() {
    return this.store;
  }
  /**
   * 【批量设置】
   * (类型安全) 一次性写入 *多个* 设置项。
   * @param settings 要合并的设置对象 (Partial 意味着 "部分的", 允许你只传一个子集)
   */
  setMultiple(settings) {
    this.store.set(settings);
  }
  //  返回的是unsubscribe，方便取消订阅
  onDidChange(key, callback) {
    return this.store.onDidChange(key, callback);
  }
}
const settingsStore = SettingsStore.getInstance();
class LineupLoader {
  static instance;
  /** 已加载的阵容配置 Map<阵容ID, 阵容配置> */
  lineups = /* @__PURE__ */ new Map();
  /** 阵容文件目录路径 */
  lineupsDir;
  constructor() {
    if (app.isPackaged) {
      this.lineupsDir = path.join(process.resourcesPath, "lineups");
    } else {
      this.lineupsDir = path.join(__dirname, "../../public/lineups");
    }
  }
  /**
   * 获取 LineupLoader 单例
   */
  static getInstance() {
    if (!LineupLoader.instance) {
      LineupLoader.instance = new LineupLoader();
    }
    return LineupLoader.instance;
  }
  /**
   * 加载所有阵容配置
   * @description 扫描阵容目录，加载所有 JSON 文件
   * @returns 加载成功的阵容数量
   */
  async loadAllLineups() {
    this.lineups.clear();
    if (!fs$2.existsSync(this.lineupsDir)) {
      logger.warn(`[LineupLoader] 阵容目录不存在: ${this.lineupsDir}`);
      return 0;
    }
    const files = fs$2.readdirSync(this.lineupsDir);
    let loadedCount = 0;
    for (const file2 of files) {
      if (!file2.endsWith(".json")) continue;
      const filePath = path.join(this.lineupsDir, file2);
      try {
        const content = fs$2.readFileSync(filePath, "utf-8");
        const config = JSON.parse(content);
        const validationResult = this.validateLineup(config);
        if (!validationResult.valid) {
          logger.warn(
            `[LineupLoader] 阵容配置验证失败 [${file2}]: ${validationResult.errors.join(", ")}`
          );
          continue;
        }
        this.lineups.set(config.id, config);
        loadedCount++;
        logger.info(`[LineupLoader] 加载阵容成功: ${config.name} (${config.id})`);
      } catch (e) {
        logger.error(`[LineupLoader] 加载阵容失败 [${file2}]: ${e.message}`);
      }
    }
    logger.info(`[LineupLoader] 共加载 ${loadedCount} 个阵容配置`);
    return loadedCount;
  }
  /**
   * 验证阵容配置
   * @param config 阵容配置对象
   * @returns 验证结果
   */
  validateLineup(config) {
    const errors = [];
    if (!config.id) errors.push("缺少阵容 ID");
    if (!config.name) errors.push("缺少阵容名称");
    if (!config.stages?.level8) errors.push("缺少 level8 阶段配置（必须）");
    const stageKeys = ["level4", "level5", "level6", "level7", "level8", "level9", "level10"];
    for (const stageKey of stageKeys) {
      const stage = config.stages?.[stageKey];
      if (!stage) continue;
      for (const champion of stage.champions) {
        if (!TFT_16_CHAMPION_DATA[champion.name]) {
          errors.push(`[${stageKey}] 未知棋子: ${champion.name}`);
        }
        if (champion.items) {
          for (const item of champion.items.core) {
            if (!TFT_16_EQUIP_DATA[item]) {
              errors.push(`[${stageKey}] 未知装备: ${item}`);
            }
          }
          if (champion.items.alternatives) {
            for (const item of champion.items.alternatives) {
              if (!TFT_16_EQUIP_DATA[item]) {
                errors.push(`[${stageKey}] 未知替代装备: ${item}`);
              }
            }
          }
        }
        if (champion.starTarget < 1 || champion.starTarget > 3) {
          errors.push(`[${stageKey}] ${champion.name} 星级目标无效: ${champion.starTarget}`);
        }
      }
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }
  /**
   * 获取指定阵容配置
   * @param lineupId 阵容 ID
   * @returns 阵容配置，不存在返回 undefined
   */
  getLineup(lineupId) {
    return this.lineups.get(lineupId);
  }
  /**
   * 获取所有已加载的阵容
   * @returns 阵容配置数组
   */
  getAllLineups() {
    return Array.from(this.lineups.values());
  }
  /**
   * 获取指定人口等级的阵容配置
   * @param lineupId 阵容 ID
   * @param level 人口等级 (4-10)
   * @returns 该等级的阶段配置，不存在返回 undefined
   */
  getStageConfig(lineupId, level) {
    const lineup = this.getLineup(lineupId);
    if (!lineup) return void 0;
    const stageKey = `level${level}`;
    return lineup.stages[stageKey];
  }
  /**
   * 获取阵容中的核心棋子列表
   * @param lineupId 阵容 ID
   * @param level 人口等级（可选，不传则返回所有阶段的核心棋子）
   * @returns 核心棋子配置数组
   */
  getCoreChampions(lineupId, level) {
    const lineup = this.getLineup(lineupId);
    if (!lineup) return [];
    if (level) {
      const stage = this.getStageConfig(lineupId, level);
      return stage?.champions.filter((c) => c.isCore) ?? [];
    }
    const coreChampions = /* @__PURE__ */ new Map();
    const stageKeys = ["level4", "level5", "level6", "level7", "level8", "level9", "level10"];
    for (const stageKey of stageKeys) {
      const stage = lineup.stages[stageKey];
      if (!stage) continue;
      for (const champion of stage.champions) {
        if (champion.isCore && !coreChampions.has(champion.name)) {
          coreChampions.set(champion.name, champion);
        }
      }
    }
    return Array.from(coreChampions.values());
  }
  /**
   * 获取阵容中需要装备的棋子列表
   * @param lineupId 阵容 ID
   * @param level 人口等级 (4-10)
   * @returns 需要装备的棋子配置数组（按核心优先排序）
   */
  getChampionsNeedingItems(lineupId, level) {
    const stage = this.getStageConfig(lineupId, level);
    if (!stage) return [];
    return stage.champions.filter((c) => c.items && c.items.core.length > 0).sort((a, b) => {
      if (a.isCore && !b.isCore) return -1;
      if (!a.isCore && b.isCore) return 1;
      return 0;
    });
  }
}
const lineupLoader = LineupLoader.getInstance();
class StrategyService {
  static instance;
  /** 当前选中的阵容配置（运行时缓存，锁定后才有值） */
  currentLineup = null;
  /** 候选阵容列表（多阵容时使用，锁定后清空） */
  candidateLineups = [];
  /** 阵容选择状态 */
  selectionState = "NOT_INITIALIZED";
  /** 当前阶段的目标棋子名称列表（缓存，避免重复计算） */
  targetChampionNames = /* @__PURE__ */ new Set();
  /**
   * 当前阶段号（如 "2-1" 中的 2）
   * @description 阶段变化意味着进入新的大阶段（如从 1 阶段进入 2 阶段）
   */
  currentStage = 0;
  /**
   * 当前回合号（如 "2-1" 中的 1）
   * @description 回合变化意味着同一阶段内的小回合切换
   */
  currentRound = 0;
  /** 是否已订阅 GameStageMonitor 事件 */
  isSubscribed = false;
  /**
   * 游戏是否已结束
   * @description 当收到 TFT_BATTLE_PASS 事件（玩家死亡）时设为 true
   *              此时虽然游戏窗口还开着，但玩家已经无法操作
   *              其他玩家可能还在游戏，会触发新阶段事件，但我们不应该响应
   *              在 initialize() 时会重置为 false（每局开始时重新初始化）
   */
  isGameEnded = false;
  /**
   * 事件处理器引用（⚠️ 必须缓存同一个函数引用，才能在 unsubscribe 时成功 off）
   * @description
   * - EventEmitter 的 on/off 是按"函数引用"匹配的
   * - 如果每次都写 this.onStageChange.bind(this)，会生成新函数 → off 失败
   */
  onStageChangeHandler;
  onFightingStartHandler;
  constructor() {
    this.onStageChangeHandler = this.onStageChange.bind(this);
    this.onFightingStartHandler = this.onFightingStart.bind(this);
  }
  /**
   * 获取单例实例
   */
  static getInstance() {
    if (!StrategyService.instance) {
      StrategyService.instance = new StrategyService();
    }
    return StrategyService.instance;
  }
  // ============================================================
  // 🔔 事件订阅管理
  // ============================================================
  /**
   * 订阅 GameStageMonitor 事件
   * @description 开始监听阶段变化事件，执行相应策略
   *              调用此方法后，StrategyService 会自动响应游戏阶段变化
   */
  subscribe() {
    if (this.isSubscribed) {
      logger.debug("[StrategyService] 已订阅事件，跳过重复订阅");
      return;
    }
    gameStageMonitor.on("stageChange", this.onStageChangeHandler);
    gameStageMonitor.on("fightingStart", this.onFightingStartHandler);
    this.isSubscribed = true;
    logger.info("[StrategyService] 已订阅 GameStageMonitor 事件");
  }
  /**
   * 取消订阅 GameStageMonitor 事件
   * @description 停止监听阶段变化事件
   */
  unsubscribe() {
    if (!this.isSubscribed) {
      logger.debug("[StrategyService] 未订阅事件，跳过取消订阅");
      return;
    }
    gameStageMonitor.off("stageChange", this.onStageChangeHandler);
    gameStageMonitor.off("fightingStart", this.onFightingStartHandler);
    this.isSubscribed = false;
    logger.info("[StrategyService] 已取消订阅 GameStageMonitor 事件");
  }
  /**
   * 标记游戏已结束
   * @description 当收到 TFT_BATTLE_PASS 事件（玩家死亡）时调用
   *              设置后，onStageChange 将不再响应新阶段事件
   *              避免在等待退出按钮期间，因其他玩家触发的新阶段而执行操作
   */
  setGameEnded() {
    this.isGameEnded = true;
    logger.info("[StrategyService] 游戏已标记为结束，后续阶段事件将被忽略");
  }
  // ============================================================
  // 🎯 事件处理器
  // ============================================================
  /**
   * 阶段变化事件处理器
   * @param event 阶段变化事件数据
   * @description 当 GameStageMonitor 检测到阶段/回合变化时触发
   *              这是整个策略服务的核心入口！
   */
  async onStageChange(event) {
    if (this.isGameEnded) {
      logger.debug(`[StrategyService] 游戏已结束，忽略阶段事件: ${event.stageText}`);
      return;
    }
    const { type, stageText, stage, round, isNewStage } = event;
    this.currentStage = stage;
    this.currentRound = round;
    if (this.selectionState === "NOT_INITIALIZED") {
      const success = this.initialize();
      if (!success) {
        logger.error("[StrategyService] 策略服务未初始化，跳过执行");
        return;
      }
    }
    await sleep(500);
    if (stage === 2 && round === 1 && this.selectionState === "PENDING") {
      logger.info("[StrategyService] 检测到 2-1 回合，开始阵容匹配...");
      await this.matchAndLockLineup();
    }
    if (this.shouldRefreshStateOnStageChange(type)) {
      await this.refreshGameState();
    }
    switch (type) {
      case GameStageType.EARLY_PVE:
        await this.handleEarlyPVE();
        break;
      case GameStageType.PVE:
        await this.handlePVE();
        break;
      case GameStageType.PVP:
        await this.handlePVP();
        break;
      case GameStageType.CAROUSEL:
        await this.handleCarousel();
        break;
      case GameStageType.AUGMENT:
        await this.handleAugment();
        break;
      case GameStageType.UNKNOWN:
      default:
        logger.debug(`[StrategyService] 未处理的阶段: ${type}`);
        break;
    }
  }
  /**
   * 战斗开始事件处理器
   * @description 当检测到"战斗环节"文字时触发
   *              根据当前阶段类型分发到不同的战斗阶段处理器
   *
   * 战斗阶段的操作：
   * - EARLY_PVE / PVE 阶段：打野怪，拾取战利品球
   * - PVP / AUGMENT 阶段：观战（海克斯选完后就是普通 PVP 战斗）
   * - CAROUSEL 阶段 (选秀)：不会触发战斗
   */
  async onFightingStart() {
    if (this.isGameEnded) {
      logger.debug("[StrategyService] 游戏已结束，忽略战斗开始事件");
      return;
    }
    logger.info("[StrategyService] 战斗阶段开始");
    const currentStageType = gameStageMonitor.currentStageType;
    switch (currentStageType) {
      case GameStageType.EARLY_PVE:
      case GameStageType.PVE:
        await this.handlePVEFighting();
        break;
      case GameStageType.PVP:
      case GameStageType.AUGMENT:
        await this.handlePVPFighting();
        break;
      default:
        logger.debug(`[StrategyService] 战斗阶段：当前阶段类型 ${currentStageType} 无需特殊处理`);
        break;
    }
  }
  /**
   * 检查当前是否处于战斗阶段
   * @description 战斗阶段时，涉及棋盘的操作应暂停
   *              进入新回合时会自动重置为非战斗状态
   * @returns 是否处于战斗阶段
   */
  isFighting() {
    return gameStageMonitor.isFighting;
  }
  /**
   * 判断：进入新回合时是否应该刷新游戏状态
   * @param stageType 阶段类型
   * @returns 是否应该刷新
   *
   * @description
   * 以下情况 **不需要** 在 onStageChange 里刷新状态：
   * - EARLY_PVE 的 1-1、1-2：商店未开放，没有什么可识别的
   * - CAROUSEL（选秀）：界面完全不同，刷新无意义
   * - AUGMENT（海克斯）：界面被三个海克斯挡住，必须先选完再刷新
   *   （handleAugment 内部会自行调用 refreshGameState）
   */
  shouldRefreshStateOnStageChange(stageType) {
    if (stageType === GameStageType.EARLY_PVE && this.currentStage === 1 && this.currentRound <= 2) {
      logger.debug(`[StrategyService] 跳过刷新：EARLY_PVE 1-${this.currentRound}（商店未开放）`);
      return false;
    }
    if (stageType === GameStageType.CAROUSEL) {
      logger.debug("[StrategyService] 跳过刷新：CAROUSEL（选秀阶段）");
      return false;
    }
    if (stageType === GameStageType.AUGMENT) {
      logger.debug("[StrategyService] 跳过刷新：AUGMENT（海克斯阶段，由 handler 自行刷新）");
      return false;
    }
    return true;
  }
  /**
   * 获取当前阶段类型
   * @description
   * 这里直接读 `GameStageMonitor` 的缓存值，因为它是全局轮询的"最新真值"。
   */
  getCurrentStageType() {
    return gameStageMonitor.currentStageType;
  }
  /**
   * 判断：某个"装备栏物品"是否是真正可穿戴的装备
   * @description
   * TFT 的装备栏里可能出现一些"特殊道具"，它们并不是给棋子穿的：
   * - 装备拆卸器：对目标棋子使用后，会把身上装备全部拆下来回到装备栏
   * - 金质装备拆卸器：同上，但可无限次使用
   * - 装备重铸器：对目标棋子使用后，会把身上装备全部重铸并回到装备栏
   *
   * 这类道具当前版本暂不支持自动使用（风险较高，容易误操作），因此先在装备策略里跳过。
   *
   * TODO: 实现特殊道具的使用策略（拆卸器/金拆/重铸器等），并加入更严格的目标选择与安全保护。
   */
  isWearableEquipmentName(itemName) {
    const data = TFT_16_EQUIP_DATA[itemName];
    if (!data) {
      return false;
    }
    if (data.equipId === "-1") {
      return false;
    }
    return true;
  }
  /**
   * 推断：装备更适合"前排"还是"后排"
   * @description
   * 我们没有直接的"装备类型标签"（坦装/输出装），但可以利用 `TFT_16_EQUIP_DATA.formula`：
   * - 基础散件：formula 为空
   * - 成装：formula 是 "散件ID1,散件ID2"
   *
   * 基于散件做一个非常粗粒度的启发式（足够让"随便上装备"变得更像人）：
   * - 反曲之弓/暴风之剑/无用大棒/女神之泪 → 倾向后排（输出/攻速/法强/回蓝）
   * - 锁子甲/负极斗篷/巨人腰带 → 倾向前排（抗性/血量）
   * - 拳套/金铲铲/金锅锅 → 偏中性（很多装备/转职比较灵活）
   *
   * TODO: 后续可以结合"阵容配置的前排/后排位"或"英雄定位(主C/主T)"做更准确的分配。
   */
  getEquipmentRolePreference(itemName) {
    const data = TFT_16_EQUIP_DATA[itemName];
    if (!data) return "any";
    const componentNames = this.getComponentNamesOfItem(itemName);
    if (componentNames.length === 0) return "any";
    const isFrontlineComponent = (name) => {
      return name === "锁子甲" || name === "负极斗篷" || name === "巨人腰带";
    };
    const isBacklineComponent = (name) => {
      return name === "反曲之弓" || name === "暴风之剑" || name === "无用大棒" || name === "女神之泪";
    };
    const isNeutralComponent = (name) => {
      return name === "拳套" || name === "金铲铲" || name === "金锅锅";
    };
    if (componentNames.length === 1) {
      const c = componentNames[0];
      if (isFrontlineComponent(c)) return "frontline";
      if (isBacklineComponent(c)) return "backline";
      if (isNeutralComponent(c)) return "any";
      return "any";
    }
    const frontlineCount = componentNames.filter(isFrontlineComponent).length;
    const backlineCount = componentNames.filter(isBacklineComponent).length;
    if (frontlineCount === 2) return "frontline";
    if (backlineCount === 2) return "backline";
    return "any";
  }
  /**
   * 获取某件装备由哪些"基础散件"组成
   * @returns 散件名称数组：
   * - 基础散件：返回 [自身]
   * - 成装：返回 [散件1, 散件2]
   */
  getComponentNamesOfItem(itemName) {
    const equip = TFT_16_EQUIP_DATA[itemName];
    if (!equip) return [];
    const formula = (equip.formula ?? "").trim();
    if (!formula) {
      return [itemName];
    }
    const [id1, id2] = formula.split(",");
    const name1 = id1 ? this.findEquipNameById(id1) : void 0;
    const name2 = id2 ? this.findEquipNameById(id2) : void 0;
    return [name1, name2].filter((n) => Boolean(n));
  }
  /**
   * 判断某个棋子是否符合装备倾向（这里用"射程"近似判断前排/后排）
   * - 近战(1-2) → 前排
   * - 远程(3+) → 后排
   */
  doesUnitMatchEquipRole(unit, role) {
    if (role === "any") return true;
    const name = unit.tftUnit.displayName;
    const range = getChampionRange(name) ?? 1;
    const isMelee = range <= 2;
    return role === "frontline" ? isMelee : !isMelee;
  }
  /**
   * 为某件装备找一个"更合适"的穿戴目标（优先不影响核心装分配，其次按前排/后排倾向选人）
   */
  findBestEquipmentTargetLocation(itemName, coreChampions) {
    const role = this.getEquipmentRolePreference(itemName);
    for (const config of coreChampions) {
      const wrapper = this.findUnitForEquipment(config.name, itemName);
      if (!wrapper) continue;
      if (wrapper.unit.equips.length >= 3) continue;
      if (this.doesUnitMatchEquipRole(wrapper.unit, role)) {
        return wrapper.unit.location;
      }
    }
    const boardUnits = gameStateManager.getBoardUnitsWithLocation().filter((u) => u.equips.length < 3);
    if (boardUnits.length === 0) return null;
    const candidates = role === "any" ? boardUnits : boardUnits.filter((u) => this.doesUnitMatchEquipRole(u, role));
    const finalCandidates = candidates.length > 0 ? candidates : boardUnits;
    const targetChampions = this.targetChampionNames;
    let best = null;
    for (const u of finalCandidates) {
      const score = this.calculateUnitScore(u.tftUnit, u.starLevel, targetChampions);
      if (!best || score > best.score) {
        best = { location: u.location, score };
      }
    }
    return best?.location ?? null;
  }
  /**
   * 判断：当前场上是否存在任意一个"核心棋子"
   * @returns 是否存在核心棋子
   *
   * @description
   * - "核心棋子"来自阵容配置（`ChampionConfig.items.core` 的那批）。
   * - 这个判断用于装备策略的触发门槛：
   *   - 有核心在场 → 可以更积极给核心做神装
   *   - 核心不在场 → 默认选择"捏装备"等核心，除非装备快满
   */
  hasAnyCoreChampionOnBoard() {
    const coreChampions = this.getCoreChampions();
    if (coreChampions.length === 0) return false;
    const boardUnits = gameStateManager.getBoardUnitsWithLocation();
    if (boardUnits.length === 0) return false;
    const boardNames = new Set(boardUnits.map((u) => u.tftUnit.displayName));
    return coreChampions.some((c) => boardNames.has(c.name));
  }
  /**
   * 判断：当前是否存在"可执行的上装备动作"
   * @param equipments 当前装备栏（紧凑数组，只包含真实装备）
   *
   * @description
   * 这是为了做"聪明闸门"：
   * - 你说得对：前期的打工仔（item holder）最后会卖掉，装备会回到装备栏。
   *   因此 **核心没到场时，也可以先把核心推荐装挂在打工仔身上**（保血/提速）。
   * - 但我们又不想每回合都"空跑"一遍装备策略，所以这里先做一次轻量判断：
   *   只要发现「能穿」或「能合成并穿」的动作，就允许进入 `executeEquipStrategy()`。
   */
  canPerformAnyEquipOperation(equipments) {
    const wearableEquipments = equipments.filter((e) => this.isWearableEquipmentName(e.name));
    if (wearableEquipments.length === 0) {
      return { can: false, reason: "装备栏里没有可穿戴装备（可能全是拆卸器/重铸器等特殊道具）" };
    }
    const boardUnits = gameStateManager.getBoardUnitsWithLocation();
    const targetChampions = this.targetChampionNames;
    let equipableUnit = null;
    let bestScore = -Infinity;
    for (const u of boardUnits) {
      if (u.equips.length >= 3) continue;
      const score = this.calculateUnitScore(u.tftUnit, u.starLevel, targetChampions);
      if (!equipableUnit || score > bestScore) {
        equipableUnit = u;
        bestScore = score;
      }
    }
    if (!equipableUnit) {
      return { can: false, reason: "棋盘上没有可穿戴装备的单位（可能全员满装备/无单位）" };
    }
    const component = wearableEquipments.find((e) => {
      const data = TFT_16_EQUIP_DATA[e.name];
      return data && (data.formula ?? "") === "";
    });
    if (component) {
      return { can: true, reason: `存在散件可穿戴：${component.name} -> ${equipableUnit.tftUnit.displayName}` };
    }
    const coreChampions = this.getCoreChampions();
    if (coreChampions.length === 0) {
      return { can: false, reason: "阵容配置中没有核心棋子/核心装备配置" };
    }
    const bagSnapshot = /* @__PURE__ */ new Map();
    for (const equip of equipments) {
      bagSnapshot.set(equip.name, (bagSnapshot.get(equip.name) || 0) + 1);
    }
    for (const config of coreChampions) {
      const targetWrapper = this.findUnitForEquipment(config.name);
      if (!targetWrapper) continue;
      if (targetWrapper.unit.equips.length >= 3) continue;
      const desiredItems = [];
      if (config.items) {
        desiredItems.push(...config.items.core);
        if (config.items.alternatives) {
          desiredItems.push(...config.items.alternatives);
        }
      }
      if (desiredItems.length === 0) continue;
      for (const itemName of desiredItems) {
        const alreadyHas = targetWrapper.unit.equips.some((e) => e.name === itemName);
        if (alreadyHas) continue;
        if ((bagSnapshot.get(itemName) || 0) > 0) {
          return {
            can: true,
            reason: `存在可穿戴动作：${itemName} -> ${targetWrapper.isCore ? "核心" : "打工"}(${targetWrapper.unit.tftUnit.displayName})`
          };
        }
        const synthesis = this.checkSynthesis(itemName, bagSnapshot);
        if (synthesis) {
          return {
            can: true,
            reason: `存在可合成动作：${itemName}(${synthesis.component1}+${synthesis.component2}) -> ${targetWrapper.isCore ? "核心" : "打工"}(${targetWrapper.unit.tftUnit.displayName})`
          };
        }
      }
    }
    return { can: false, reason: "当前没有可执行的上装备/合成动作" };
  }
  /**
   * 装备策略触发门槛
   * @returns should: 是否执行；reason: 便于日志排查的原因
   *
   * @description
   * 触发原则（更激进 / 保前四向）：
   * - 只要"不在战斗中"且"装备栏非空" → 就执行装备策略
   * - 原因：前期即使把散件/成装先挂到打工仔，也能显著提升即时战力，提高前四率
   *
   * 注意：装备拖拽是高风险操作，所以仍然严格禁止在战斗中执行。
   */
  getEquipStrategyGateDecision() {
    const stageType = this.getCurrentStageType();
    if (this.isFighting()) {
      return { should: false, reason: "战斗中" };
    }
    const rawEquipments = gameStateManager.getEquipments();
    if (rawEquipments.length === 0) {
      return { should: false, reason: "装备栏为空" };
    }
    const equipments = rawEquipments.filter((e) => this.isWearableEquipmentName(e.name));
    const skipped = rawEquipments.filter((e) => !this.isWearableEquipmentName(e.name));
    if (equipments.length === 0) {
      const skippedHint = skipped.length > 0 ? `（已跳过特殊道具: ${skipped.map((s) => s.name).join(", ")}）` : "";
      return { should: false, reason: `装备栏无可穿戴装备${skippedHint}` };
    }
    return {
      should: true,
      reason: `可穿戴装备非空(${equipments.length})，激进策略：有装备就上（当前阶段=${stageType}）`
    };
  }
  /**
   * 初始化策略服务
   * @description 加载用户选中的阵容配置，准备执行策略
   *              - 单阵容：直接锁定
   *              - 多阵容：进入 PENDING 状态，等待匹配
   * @returns 是否初始化成功
   */
  initialize() {
    this.isGameEnded = false;
    if (this.selectionState !== "NOT_INITIALIZED") {
      logger.debug("[StrategyService] 已初始化，跳过");
      return true;
    }
    const selectedIds = settingsStore.get("selectedLineupIds");
    if (!selectedIds || selectedIds.length === 0) {
      logger.warn("[StrategyService] 未选择任何阵容，请先在阵容页面选择要使用的阵容");
      return false;
    }
    const lineups = [];
    for (const lineupId of selectedIds) {
      const lineup = lineupLoader.getLineup(lineupId);
      if (lineup) {
        lineups.push(lineup);
      } else {
        logger.warn(`[StrategyService] 找不到阵容配置: ${lineupId}，已跳过`);
      }
    }
    if (lineups.length === 0) {
      logger.error("[StrategyService] 所有选中的阵容都无法加载");
      return false;
    }
    if (lineups.length === 1) {
      this.currentLineup = lineups[0];
      this.selectionState = "LOCKED";
      logger.info(`[StrategyService] 单阵容模式，已锁定: ${this.currentLineup.name}`);
      this.updateTargetChampions(4);
    } else {
      this.candidateLineups = lineups;
      this.selectionState = "PENDING";
      logger.info(
        `[StrategyService] 多阵容模式，候选阵容: ${lineups.map((l) => l.name).join(", ")}，等待第一个 PVP 阶段进行匹配...`
      );
    }
    return true;
  }
  // ============================================================
  // 📊 状态查询方法
  // ============================================================
  /**
   * 获取当前选中的阵容
   */
  getCurrentLineup() {
    return this.currentLineup;
  }
  /**
   * 获取阵容选择状态
   */
  getSelectionState() {
    return this.selectionState;
  }
  /**
   * 检查阵容是否已锁定
   */
  isLineupLocked() {
    return this.selectionState === "LOCKED";
  }
  /**
   * 获取当前人口等级
   * @description 从 GameStateManager 获取
   */
  getCurrentLevel() {
    return gameStateManager.getLevel();
  }
  /**
   * 获取当前阶段文本
   * @returns 格式化的阶段文本（如 "2-1"）
   */
  getCurrentStageText() {
    if (this.currentStage === 0) return "";
    return `${this.currentStage}-${this.currentRound}`;
  }
  /**
   * 获取当前阶段的目标棋子配置列表
   * @returns 棋子配置数组
   */
  getTargetChampions() {
    if (!this.currentLineup) return [];
    const stageConfig = this.getStageConfigForLevel(gameStateManager.getLevel());
    return stageConfig?.champions ?? [];
  }
  /**
   * 获取当前阶段的核心棋子配置列表
   * @returns 核心棋子配置数组
   */
  getCoreChampions() {
    return this.getTargetChampions().filter((c) => c.isCore);
  }
  // ============================================================
  // 🔧 内部辅助方法
  // ============================================================
  /**
   * 更新目标棋子列表
   * @param level 当前人口等级
   * @description 根据人口等级获取目标棋子
   *
   * 策略说明：
   * - 目标棋子 = 当前等级及以上所有等级配置中的棋子（合并去重）
   * - 例如：4 级时，目标 = level4 + level5 + ... + level10 的所有棋子
   * - 升到 5 级时，目标 = level5 + level6 + ... + level10（剔除 level4 的低费打工仔）
   *
   * 这样随着等级提升，低费打工仔会被逐渐剔除，只保留当前等级及以上的目标棋子
   */
  updateTargetChampions(level) {
    if (!this.currentLineup) {
      this.targetChampionNames.clear();
      return;
    }
    this.targetChampionNames.clear();
    const validLevels = [4, 5, 6, 7, 8, 9, 10];
    const startLevel = Math.max(level, 4);
    for (const checkLevel of validLevels) {
      if (checkLevel < startLevel) continue;
      const stageKey = `level${checkLevel}`;
      const stageConfig = this.currentLineup.stages[stageKey];
      if (stageConfig) {
        for (const champion of stageConfig.champions) {
          this.targetChampionNames.add(champion.name);
        }
      }
    }
  }
  /**
   * 获取指定等级的阶段配置（支持双向查找）
   * @param level 目标人口等级
   * @returns 阶段配置，如果找不到返回 undefined
   *
   * @description 查找逻辑：
   * 1. 先尝试精确匹配当前等级
   * 2. 如果没有，向下查找（比如 7 级找不到就找 6 级）
   * 3. 如果向下也找不到，向上查找（比如 3 级找不到就找 4 级）
   *
   * 这样可以处理游戏初期（1-3 级）没有配置的情况，自动使用 level4 配置
   */
  getStageConfigForLevel(level) {
    if (!this.currentLineup) return void 0;
    const validLevels = [4, 5, 6, 7, 8, 9, 10];
    const exactKey = `level${level}`;
    if (this.currentLineup.stages[exactKey]) {
      return this.currentLineup.stages[exactKey];
    }
    for (let checkLevel = level - 1; checkLevel >= 4; checkLevel--) {
      const stageKey = `level${checkLevel}`;
      const config = this.currentLineup.stages[stageKey];
      if (config) {
        return config;
      }
    }
    for (const checkLevel of validLevels) {
      if (checkLevel <= level) continue;
      const stageKey = `level${checkLevel}`;
      const config = this.currentLineup.stages[stageKey];
      if (config) {
        logger.debug(`[StrategyService] 等级 ${level} 无配置，向上取用 level${checkLevel} 配置`);
        return config;
      }
    }
    return void 0;
  }
  /**
   * 根据当前棋子匹配并锁定最合适的阵容
   * @description 使用 GameStateManager 获取备战席、棋盘和商店的棋子，
   *              计算与各候选阵容 level4 的匹配度，选择匹配度最高的阵容并锁定
   *
   * 匹配优先级：
   * 1. 匹配分数（匹配到的棋子数量）最高
   * 2. 分数相同时，随机选择
   */
  async matchAndLockLineup() {
    if (this.candidateLineups.length === 0) {
      logger.error("[StrategyService] 没有候选阵容可供匹配");
      return;
    }
    const currentChampions = gameStateManager.getAllVisibleChampionNames();
    if (currentChampions.size === 0) {
      logger.warn("[StrategyService] 未检测到任何棋子，使用第一个候选阵容");
      this.lockLineup(this.candidateLineups[0]);
      return;
    }
    logger.info(`[StrategyService] 当前棋子: ${Array.from(currentChampions).join(", ")}`);
    const matchResults = [];
    for (const lineup of this.candidateLineups) {
      const result = this.calculateLineupMatchScore(lineup, currentChampions);
      matchResults.push(result);
      logger.info(
        `[StrategyService] 阵容 "${lineup.name}" 匹配分数: ${result.score}，匹配棋子: ${result.matchedChampions.join(", ") || "无"}`
      );
    }
    matchResults.sort((a, b) => b.score - a.score);
    const highestScore = matchResults[0].score;
    const topMatches = matchResults.filter((r) => r.score === highestScore);
    let bestMatch;
    if (topMatches.length > 1) {
      const randomIndex = Math.floor(Math.random() * topMatches.length);
      bestMatch = topMatches[randomIndex];
      logger.info(
        `[StrategyService] 有 ${topMatches.length} 个阵容分数相同 (${highestScore})，随机选择: "${bestMatch.lineup.name}"`
      );
    } else {
      bestMatch = topMatches[0];
    }
    this.lockLineup(bestMatch.lineup);
    logger.info(
      `[StrategyService] 阵容匹配完成！选择: "${bestMatch.lineup.name}"，匹配分数: ${bestMatch.score}，匹配棋子: ${bestMatch.matchedChampions.join(", ")}`
    );
  }
  /**
   * 计算阵容与当前棋子的匹配分数
   * @param lineup 阵容配置
   * @param currentChampions 当前拥有的棋子名称集合（备战席 + 棋盘 + 商店）
   * @returns 匹配结果
   */
  calculateLineupMatchScore(lineup, currentChampions) {
    const level4Config = lineup.stages.level4;
    if (!level4Config) {
      logger.warn(`[StrategyService] 阵容 "${lineup.name}" 没有 level4 配置`);
      return { lineup, score: 0, matchedChampions: [] };
    }
    const matchedChampions = [];
    for (const champion of level4Config.champions) {
      if (currentChampions.has(champion.name)) {
        matchedChampions.push(champion.name);
      }
    }
    const score = matchedChampions.length;
    return { lineup, score, matchedChampions };
  }
  /**
   * 锁定指定阵容
   * @param lineup 要锁定的阵容配置
   */
  lockLineup(lineup) {
    this.currentLineup = lineup;
    this.selectionState = "LOCKED";
    this.candidateLineups = [];
    this.updateTargetChampions(gameStateManager.getLevel());
    logger.info(`[StrategyService] 阵容已锁定: ${lineup.name} (${lineup.id})`);
  }
  /**
   * 刷新游戏状态快照
   * @description 调用 TftOperator 采集所有游戏数据，更新到 GameStateManager
   *              这是 StrategyService 作为"大脑"协调数据采集的核心方法
   *
   * 注意：getBenchInfo 和 getFightBoardInfo 需要操作鼠标（右键点击棋子），
   *       所以这两个必须串行执行，不能并行！
   */
  async refreshGameState() {
    logger.info("[StrategyService] 开始采集游戏状态...");
    const previousLevel = gameStateManager.getLevel();
    const [shopUnits, equipments, levelInfo, gold] = await Promise.all([
      tftOperator.getShopInfo(),
      tftOperator.getEquipInfo(),
      tftOperator.getLevelInfo(),
      tftOperator.getCoinCount()
    ]);
    const benchUnits = await tftOperator.getBenchInfo();
    const boardUnits = await tftOperator.getFightBoardInfo();
    const newLevel = levelInfo?.level ?? previousLevel;
    gameStateManager.updateSnapshot({
      benchUnits,
      boardUnits,
      shopUnits,
      equipments,
      level: newLevel,
      currentXp: levelInfo?.currentXp ?? 0,
      totalXp: levelInfo?.totalXp ?? 0,
      gold: gold ?? 0
    });
    if (newLevel !== previousLevel) {
      logger.info(`[StrategyService] 等级变化: ${previousLevel} → ${newLevel}`);
      this.updateTargetChampions(newLevel);
    }
    logger.info("[StrategyService] 游戏状态采集完成");
  }
  /**
   * 处理 PVE 阶段 (打野怪)
   * @description
   * - 1-3、1-4 回合：商店已开启，执行购买策略
   * - 后续 PVE（野怪回合）：继续购买 + 捡战利品球
   *
   * 注意：1-3、1-4 时阵容可能尚未锁定，此时执行随机购买策略
   */
  async handlePVE() {
    logger.info("[StrategyService] PVE阶段：执行通用逻辑...");
    await this.executeCommonStrategy();
  }
  // ============================================================
  // ⚔️ 战斗阶段处理器 (Fighting Phase Handlers)
  // ============================================================
  /**
   * 处理 PVE 战斗阶段 (所有打野怪的回合)
   * @description 包括前期 PVE (1-1, 1-2) 和后期野怪回合：
   *              - 战斗中会持续掉落战利品球
   *              - 需要边打边捡（小小英雄可以移动拾取）
   *              - 同时执行防挂机操作
   *
   * 循环逻辑：
   * - 使用 while 循环持续扫描和拾取战利品球
   * - 每次拾取完成后等待一小段时间再扫描（避免频繁截图）
   * - 战斗结束（isFighting = false）时自动退出循环
   */
  async handlePVEFighting() {
    logger.info("[StrategyService] PVE 战斗阶段：开始循环拾取战利品...");
    const scanInterval = 2e3;
    while (this.isFighting()) {
      await this.pickUpLootOrbs();
      if (!this.isFighting()) {
        break;
      }
      await sleep(scanInterval);
    }
    logger.info("[StrategyService] PVE 战斗阶段结束，停止拾取循环");
  }
  /**
   * 处理 PVP 战斗阶段 (玩家对战)
   * @description PVP 回合的战斗阶段：
   *              - 玩家对战通常不会掉落战利品球，但某些海克斯可能会
   *              - 执行一次战利品球搜索（以防万一）
   *              - 让小小英雄随机走动（防挂机）
   */
  async handlePVPFighting() {
    logger.info("[StrategyService] PVP 战斗阶段：观战中...");
    await this.pickUpLootOrbs();
    await this.antiAfk();
  }
  /**
   * 拾取战利品球
   * @description 检测并拾取场上的战利品球
   *              战利品球有三种类型：普通(银色)、蓝色、金色
   *
   * 拾取策略：
   * 1. 检测场上所有战利品球的位置
   * 2. 按 X 坐标从左到右排序（小小英雄默认在左下角，从左往右是最短路径）
   * 3. 依次移动小小英雄到战利品球位置拾取
   * 
   * 中断策略：
   * - 记录调用时的战斗状态（isFighting）
   * - 每次拾取前检查状态是否变化
   * - 状态变化时立即停止（无论是战斗→非战斗，还是非战斗→战斗）
   * 
   * @returns 是否成功拾取了至少一个法球（用于判断是否需要重新执行装备策略）
   */
  async pickUpLootOrbs() {
    const sleepTime = 2500;
    const initialFightingState = this.isFighting();
    logger.info(`[StrategyService] 开始检测战利品球... (当前战斗状态: ${initialFightingState})`);
    const lootOrbs = await tftOperator.getLootOrbs();
    if (lootOrbs.length === 0) {
      logger.info("[StrategyService] 未检测到战利品球");
      return false;
    }
    logger.info(`[StrategyService] 检测到 ${lootOrbs.length} 个战利品球`);
    const sortedOrbs = [...lootOrbs].sort((a, b) => a.x - b.x);
    let pickedCount = 0;
    for (const orb of sortedOrbs) {
      const currentFightingState = this.isFighting();
      if (currentFightingState !== initialFightingState) {
        logger.info(
          `[StrategyService] 战斗状态变化 (${initialFightingState} → ${currentFightingState})，停止拾取`
        );
        break;
      }
      logger.info(`[StrategyService] 正在拾取 ${orb.type} 战利品球，位置: (${orb.x}, ${orb.y}), 等待 ${sleepTime}ms`);
      await mouseController.clickAt({ x: orb.x, y: orb.y }, MouseButtonType.RIGHT);
      await sleep(sleepTime);
      pickedCount++;
    }
    logger.info(`[StrategyService] 战利品拾取完成，共拾取 ${pickedCount} 个`);
    await tftOperator.selfResetPosition();
    return pickedCount > 0;
  }
  /**
   * 处理游戏前期阶段（第一阶段 1-1 ~ 1-4）
   * @description 整个第一阶段的处理逻辑：
   *              - 1-1、1-2：商店未开放，只执行防挂机
   *              - 1-3、1-4：商店已开放，执行前期特殊运营策略
   */
  async handleEarlyPVE() {
    if (this.currentRound <= 2) {
      logger.info(`[StrategyService] 前期阶段 1-${this.currentRound}：商店未开放，执行防挂机...`);
      return await this.antiAfk();
    }
    logger.info(`[StrategyService] 前期阶段 1-${this.currentRound}：商店已开放，执行前期运营...`);
    await this.executeEarlyPVEStrategy();
  }
  /**
   * 前期 PVE 阶段专用策略 (1-3、1-4 回合)
   * @description 这个阶段的特殊性：
   *              - 阵容尚未锁定（要等到 2-1 第一个 PVP 阶段才匹配）
   *              - 金币有限（通常只有 4-6 金币）
   *              - 目标：尽可能买到候选阵容中的棋子，为后续匹配做准备
   *
   * 购买优先级：
   * 1. 优先购买备战席/场上已有的棋子（方便升星）
   * 2. 优先购买所有候选阵容 level4 中出现的棋子
   * 3. 低费棋子（1-2 费）可以考虑购买（增加后续匹配可能性）
   */
  async executeEarlyPVEStrategy() {
    await tftOperator.selfResetPosition();
    const candidateTargets = this.getCandidateTargetChampions();
    const ownedChampions = gameStateManager.getOwnedChampionNames();
    logger.info(
      `[StrategyService] 前期策略 - 金币: ${gameStateManager.getGold()}，备战席空位: ${gameStateManager.getEmptyBenchSlotCount()}，已有棋子: ${Array.from(ownedChampions).join(", ") || "无"}，候选目标: ${Array.from(candidateTargets).join(", ") || "无"}`
    );
    await this.autoBuyFromShop(candidateTargets, "前期决策购买");
    await this.optimizeBoard(candidateTargets);
  }
  /**
   * 检查是否已拥有指定棋子的 3 星版本
   */
  hasThreeStarCopy(championName) {
    for (const unit of gameStateManager.getBoardUnits()) {
      if (unit && unit.tftUnit.displayName === championName && unit.starLevel >= 3) {
        return true;
      }
    }
    for (const unit of gameStateManager.getBenchUnits()) {
      if (unit && unit.tftUnit.displayName === championName && unit.starLevel >= 3) {
        return true;
      }
    }
    return false;
  }
  /**
   * 尝试卖出一个无用棋子单位（用于腾位置）
   * @param targetChampions 目标棋子集合
   * @returns 是否成功卖出
   */
  async sellSingleTrashUnit(targetChampions) {
    const benchUnits = gameStateManager.getBenchUnitsWithIndex();
    const candidates = benchUnits.filter(({ unit }) => {
      const name = unit.tftUnit.displayName;
      if (targetChampions.has(name)) return false;
      if (gameStateManager.getOneStarChampionCount(name) >= 2) return false;
      return true;
    });
    if (candidates.length === 0) return false;
    candidates.sort((a, b) => a.unit.tftUnit.price - b.unit.tftUnit.price);
    const target = candidates[0];
    logger.info(`[StrategyService] 腾位置卖出: ${target.unit.tftUnit.displayName}`);
    await tftOperator.sellUnit(`SLOT_${target.index + 1}`);
    gameStateManager.setBenchSlotEmpty(target.index);
    gameStateManager.updateGold(gameStateManager.getGold() + target.unit.tftUnit.price);
    await sleep(100);
    return true;
  }
  /**
   * 批量分析商店购买决策
   * @param shopUnits 商店棋子列表
   * @param ownedChampions 已拥有的棋子名称集合
   * @param targetChampions 目标阵容棋子集合
   * @returns 建议购买的商店槽位索引数组（已按优先级排序）
   *
   * @description 购买优先级：
   *              1. 目标阵容内的棋子 → 无条件购买（不管有没有空位）
   *              2. 已拥有的棋子 → 无条件购买（可以升星）
   *              3. 非目标棋子 → 只有场上有空位时才买，优先买高费的（当打工仔）
   */
  analyzePurchaseDecision(shopUnits, ownedChampions, targetChampions) {
    const targetIndices = [];
    const ownedIndices = [];
    const workerCandidates = [];
    for (let i = 0; i < shopUnits.length; i++) {
      const unit = shopUnits[i];
      if (!unit) continue;
      const name = unit.displayName;
      const slotIndex = i;
      if (this.hasThreeStarCopy(name)) {
        continue;
      }
      if (targetChampions.has(name)) {
        targetIndices.push(slotIndex);
      } else if (ownedChampions.has(name)) {
        ownedIndices.push(slotIndex);
      } else {
        workerCandidates.push({ index: slotIndex, price: unit.price });
      }
    }
    workerCandidates.sort((a, b) => b.price - a.price);
    const availableSlots = gameStateManager.getAvailableBoardSlots();
    const workersToBuy = workerCandidates.slice(0, Math.max(0, availableSlots)).map((w) => w.index);
    const result = [...targetIndices, ...ownedIndices, ...workersToBuy];
    logger.debug(
      `[StrategyService] 购买分析 - 目标棋子: ${targetIndices.length}个，已有棋子: ${ownedIndices.length}个，打工棋子: ${workersToBuy.length}个`
    );
    return result;
  }
  /**
   * 优化棋盘阵容（通用方法，适用于所有阶段）
   * @param targetChampions 目标棋子集合（用于评估棋子价值）
   * @description
   * - 有空位：自动上场备战席的目标棋子
   * - 满员：用备战席的强力棋子替换场上的弱棋子
   */
  async optimizeBoard(targetChampions) {
    const availableSlots = gameStateManager.getAvailableBoardSlots();
    if (availableSlots > 0) {
      await this.autoPlaceUnitsToEmptySlots(targetChampions, availableSlots);
    } else {
      await this.autoReplaceWeakestUnit(targetChampions);
    }
  }
  /**
   * 自动根据算法将备战席棋子上场到空位
   * @param targetChampions 目标棋子集合
   * @param availableSlots 可用空位数量
   */
  async autoPlaceUnitsToEmptySlots(targetChampions, availableSlots) {
    const benchUnits = gameStateManager.getBenchUnits().filter((u) => u !== null);
    if (benchUnits.length === 0) {
      logger.debug("[StrategyService] 备战席没有棋子，跳过摆放");
      return;
    }
    const unitsToPlace = this.selectUnitsToPlace(benchUnits, targetChampions, availableSlots);
    if (unitsToPlace.length === 0) {
      logger.debug("[StrategyService] 备战席没有可以上场的棋子");
      return;
    }
    logger.info(
      `[StrategyService] 开始摆放棋子，当前等级: ${gameStateManager.getLevel()}，可上场数量: ${availableSlots}，待上场: ${unitsToPlace.length}`
    );
    for (const unit of unitsToPlace) {
      const championName = unit.tftUnit.displayName;
      const targetLocation = this.findBestPositionForUnit(unit);
      if (!targetLocation) {
        logger.warn(`[StrategyService] 找不到合适的位置放置 ${championName}`);
        continue;
      }
      logger.info(
        `[StrategyService] 摆放棋子: ${championName} (射程: ${getChampionRange(championName) ?? "未知"}) -> ${targetLocation}`
      );
      await tftOperator.moveBenchToBoard(unit.location, targetLocation);
      gameStateManager.moveBenchToBoard(unit.location, targetLocation);
      await sleep(200);
    }
    logger.info(`[StrategyService] 棋子摆放完成，共摆放 ${unitsToPlace.length} 个棋子`);
  }
  /**
   * 替换场上最弱的棋子
   * @param targetChampions 目标棋子集合
   * @description 用备战席价值更高的棋子替换场上价值最低的棋子
   *
   *              替换策略（保护目标阵容棋子，但优先回收装备）：
   *              1. 如果被换下的棋子身上有装备 → 卖掉（让装备回到装备栏）
   *              2. 备战席有空位且棋子无装备 → 把场上棋子移回备战席 → 新棋子上场
   *              3. 备战席没空位 → 卖掉场上棋子 → 新棋子上场
   */
  async autoReplaceWeakestUnit(targetChampions) {
    const benchUnits = gameStateManager.getBenchUnits().filter((u) => u !== null);
    if (benchUnits.length === 0) return;
    const worstBoard = this.findWorstBoardUnit(targetChampions);
    if (!worstBoard) return;
    const avoidChampionNames = new Set(
      gameStateManager.getBoardUnitsWithLocation().map((u) => u.tftUnit.displayName)
    );
    avoidChampionNames.delete(worstBoard.unit.tftUnit.displayName);
    const bestBench = this.findBestBenchUnit(benchUnits, targetChampions, avoidChampionNames);
    if (!bestBench) return;
    if (bestBench.score > worstBoard.score) {
      const worstName = worstBoard.unit.tftUnit.displayName;
      const bestName = bestBench.unit.tftUnit.displayName;
      const hasEquips = worstBoard.unit.equips && worstBoard.unit.equips.length > 0;
      const emptyBenchSlot = gameStateManager.getFirstEmptyBenchSlotIndex();
      const hasEmptyBenchSlot = emptyBenchSlot !== -1;
      if (hasEquips) {
        const equipNames = worstBoard.unit.equips.map((e) => e.name).join(", ");
        logger.info(
          `[StrategyService] 替换(卖出回收装备): ${worstName}(${worstBoard.score}分) [装备: ${equipNames}] -> ${bestName}(${bestBench.score}分) 上场`
        );
        await tftOperator.sellUnit(worstBoard.location);
        await sleep(500);
        await this.updateEquipStateFromScreen();
        gameStateManager.clearBoardLocation(worstBoard.location);
      } else if (hasEmptyBenchSlot) {
        logger.info(
          `[StrategyService] 替换(保留): ${worstName}(${worstBoard.score}分) 移回备战席，${bestName}(${bestBench.score}分) 上场`
        );
        await tftOperator.moveBoardToBench(worstBoard.location, emptyBenchSlot);
        gameStateManager.moveBoardToBench(worstBoard.location, emptyBenchSlot);
        await sleep(100);
      } else {
        logger.info(
          `[StrategyService] 替换(卖出): ${worstName}(${worstBoard.score}分) -> ${bestName}(${bestBench.score}分)`
        );
        await tftOperator.sellUnit(worstBoard.location);
        gameStateManager.clearBoardLocation(worstBoard.location);
        await sleep(100);
      }
      const targetLocation = this.findBestPositionForUnit(bestBench.unit);
      if (targetLocation) {
        await tftOperator.moveBenchToBoard(bestBench.unit.location, targetLocation);
        gameStateManager.moveBenchToBoard(bestBench.unit.location, targetLocation);
        await sleep(10);
      } else {
        logger.warn(`[StrategyService] 找不到合适位置放置 ${bestName}`);
      }
    }
  }
  /**
   * 找备战席中价值最高的棋子
   * @param avoidChampionNames 可选：避免选择"同名棋子"（例如场上已经有的棋子名）
   */
  findBestBenchUnit(benchUnits, targetChampions, avoidChampionNames) {
    const isNormalUnit = (u) => {
      if (u.starLevel === -1) return false;
      return !u.tftUnit.displayName.includes("锻造器");
    };
    const filtered = benchUnits.filter(isNormalUnit);
    if (filtered.length === 0) return null;
    const candidates = avoidChampionNames ? filtered.filter((u) => !avoidChampionNames.has(u.tftUnit.displayName)) : filtered;
    const finalCandidates = candidates.length > 0 ? candidates : filtered;
    let best = null;
    for (const unit of finalCandidates) {
      const score = this.calculateUnitScore(unit.tftUnit, unit.starLevel, targetChampions);
      if (!best || score > best.score) {
        best = { unit, score };
      }
    }
    return best;
  }
  /**
   * 找棋盘上价值最低的棋子
   */
  findWorstBoardUnit(targetChampions) {
    const boardUnits = gameStateManager.getBoardUnits();
    const boardLocationKeys = Object.keys(fightBoardSlotPoint);
    let worst = null;
    for (let i = 0; i < boardUnits.length; i++) {
      const unit = boardUnits[i];
      if (!unit) continue;
      const score = this.calculateUnitScore(unit.tftUnit, unit.starLevel, targetChampions);
      if (!worst || score < worst.score) {
        worst = { unit, location: boardLocationKeys[i], score };
      }
    }
    return worst;
  }
  /**
   * 计算棋子价值分数
   * @description 评分规则（优先级从高到低）：
   *              1. 目标阵容中的核心棋子 → +10000
   *              2. 目标阵容中的普通棋子 → +1000
   *              3. 棋子费用 → 每费 +100（高费棋子战斗力更强）
   *              4. 棋子星级 → 每星 +10（最低优先级）
   *
   * 分数设计说明：
   * - 使用不同数量级确保优先级不会被低优先级的高数值覆盖
   * - 例如：1费核心棋子 (10000+100+10=10110) > 5费非目标棋子 (500+10=510)
   */
  calculateUnitScore(unit, starLevel, targetChampions) {
    let score = 0;
    const championName = unit.displayName;
    const coreChampionNames = new Set(
      this.getCoreChampions().map((c) => c.name)
    );
    if (targetChampions.has(championName) && coreChampionNames.has(championName)) {
      score += 1e4;
    } else if (targetChampions.has(championName)) {
      score += 1e3;
    }
    score += unit.price * 100;
    score += starLevel * 10;
    return score;
  }
  /**
   * 获取所有候选阵容的 level4 目标棋子（合并去重）
   * @returns 所有候选阵容 level4 棋子名称的集合
   * @description 用于前期策略，在阵容未锁定时，
   *              购买任何一个候选阵容中的棋子都是有价值的
   */
  getCandidateTargetChampions() {
    const targets = /* @__PURE__ */ new Set();
    if (this.isLineupLocked() && this.currentLineup) {
      return this.targetChampionNames;
    }
    for (const lineup of this.candidateLineups) {
      const level4Config = lineup.stages.level4;
      if (level4Config) {
        for (const champion of level4Config.champions) {
          targets.add(champion.name);
        }
      }
    }
    return targets;
  }
  /**
   * 处理 PVP 阶段 (玩家对战)
   * @description 正常运营阶段：拿牌、升级、调整站位
   *
   * @note 阵容匹配已移至 handleAugment()，在 2-1 首次海克斯选择时执行
   *       因为 2-1 是海克斯阶段（AUGMENT），不是 PVP 阶段
   */
  async handlePVP() {
    await this.executeCommonStrategy();
  }
  /**
   * 防挂机：随机移动小小英雄
   * @description 在战斗阶段（如前期 PVE、野怪回合）时调用，
   *              让小小英雄持续随机走动，避免被系统判定为挂机
   *
   * 循环逻辑：
   * - 使用 while 循环持续调用 selfWalkAround()（左右交替走位，更像真人）
   * - 每次走动后等待 3 秒再进行下一次
   * - 退出条件：战斗状态变化（非战斗→战斗 或 战斗→非战斗）或回合变化
   */
  async antiAfk() {
    logger.info("[StrategyService] 开始防挂机循环走动...");
    const entryStage = this.currentStage;
    const entryRound = this.currentRound;
    const entryFightingState = this.isFighting();
    const walkInterval = 3e3;
    while (true) {
      if (this.isFighting() !== entryFightingState) {
        logger.info("[StrategyService] 检测到战斗状态变化，退出防挂机循环");
        break;
      }
      if (this.currentStage !== entryStage || this.currentRound !== entryRound) {
        logger.info("[StrategyService] 检测到回合变化，退出防挂机循环");
        break;
      }
      try {
        await tftOperator.selfWalkAround();
      } catch (e) {
        logger.warn(`[StrategyService] 防挂机移动失败: ${e?.message ?? e}`);
      }
      await sleep(walkInterval);
    }
  }
  /**
   * 通用运营策略入口
   * @description 阵容锁定后的核心运营逻辑
   *
   * 执行顺序：
   * 1. 先购买当前商店的目标棋子（每回合商店会自动刷新，不要浪费）
   * 2. 优化棋盘（上棋子 + 替换弱棋子）
   * 3. TODO: 根据策略决定是否 D 牌、升级等
   *
   * 调用时机：2-1 首次 PVP 锁定阵容后，以及后续所有回合
   */
  async executeCommonStrategy() {
    logger.debug("[StrategyService] 执行通用运营策略");
    await tftOperator.selfResetPosition();
    try {
      await this.handleItemForges();
      const ownedChampions = gameStateManager.getOwnedChampionNames();
      const targetChampions = this.targetChampionNames;
      logger.info(
        `[StrategyService] 通用策略 - 金币: ${gameStateManager.getGold()}，备战席空位: ${gameStateManager.getEmptyBenchSlotCount()}，已有棋子: ${Array.from(ownedChampions).join(", ") || "无"}`
      );
      await this.autoBuyFromShop(targetChampions, "购买决策");
      await this.optimizeBoard(targetChampions);
      await this.executeLevelUpStrategy();
      await this.trySellTrashUnits();
      await this.executeRollingLoop(targetChampions);
      await this.sellExcessUnits();
      await this.updateEquipStateFromScreen();
      await this.adjustPositions();
      await this.executeEquipStrategy();
    } finally {
      try {
        logger.info("[StrategyService] 通用策略结束，兜底拾取法球...");
        const pickedOrbs = await this.pickUpLootOrbs();
        if (pickedOrbs) {
          logger.info("[StrategyService] 捡到法球，重新检查装备策略...");
          const newEquipments = await tftOperator.getEquipInfo();
          gameStateManager.updateEquipments(newEquipments);
          await this.executeEquipStrategy();
        }
      } catch (e) {
        logger.warn(`[StrategyService] 通用策略结束兜底拾取法球失败: ${e?.message ?? e}`);
      }
      try {
        await tftOperator.selfResetPosition();
      } catch (e) {
        logger.warn(`[StrategyService] 通用策略结束兜底归位失败: ${e?.message ?? e}`);
      }
    }
  }
  /**
   * 处理备战席中的锻造器
   * @description 检查备战席是否有锻造器，如果有则打开并选择中间的装备
   *              锻造器是特殊单位，占用备战席位置但不能上场
   *              及时处理可以：
   *              1. 腾出备战席空间，方便购买棋子
   *              2. 获得装备，可以立即用于后续的装备策略
   * 
   *              策略：固定选择中间的装备，免去复杂的装备识别和评估
   */
  async handleItemForges() {
    const forges = gameStateManager.findItemForges();
    if (forges.length === 0) {
      return;
    }
    logger.info(`[StrategyService] 发现 ${forges.length} 个锻造器: ${forges.map((f) => f.tftUnit.displayName).join(", ")}`);
    for (const forge of forges) {
      logger.info(`[StrategyService] 处理锻造器: ${forge.tftUnit.displayName} (${forge.location})`);
      await tftOperator.openItemForge(forge);
      await sleep(200);
    }
    await this.updateEquipStateFromScreen();
    logger.info(`[StrategyService] 锻造器处理完成，已获得 ${forges.length} 件装备`);
  }
  /**
   * 从屏幕重新识别并更新等级和经验状态
   */
  async updateLevelStateFromScreen() {
    const levelInfo = await tftOperator.getLevelInfo();
    if (levelInfo) {
      gameStateManager.updateLevelInfo(levelInfo);
    }
  }
  /**
   * 升级策略 (F键)
   * @description 决定是否购买经验值
   *              策略优先级：
   *              1. 关键回合抢人口 (2-1升4, 2-5升5, 3-2升6, 4-1升7, 5-1升8) - 无视利息强制升
   *              2. 卡利息买经验 - 只要金币 > 50，就一直买经验直到剩余金币 < 50
   */
  async executeLevelUpStrategy() {
    await this.updateLevelStateFromScreen();
    const snapshot = gameStateManager.getSnapshotSync();
    if (!snapshot) return;
    let { level, currentXp, totalXp, gold } = snapshot;
    if (level >= 10 || totalXp <= 0) return;
    const criticalLevel = this.getCriticalLevelTarget();
    if (criticalLevel !== null && level < criticalLevel) {
      const xpNeeded = totalXp - currentXp;
      const buyCount = Math.ceil(xpNeeded / 4);
      const cost = buyCount * 4;
      if (gold >= cost) {
        logger.info(
          `[StrategyService] 关键回合升级: ${this.currentStage}-${this.currentRound} 拉 ${criticalLevel} (Lv.${level} -> Lv.${level + 1}, 花费 ${cost})`
        );
        for (let i = 0; i < buyCount; i++) {
          await tftOperator.buyExperience();
          await sleep(100);
        }
        gameStateManager.deductGold(cost);
        await this.updateLevelStateFromScreen();
      } else {
        logger.warn(
          `[StrategyService] 关键回合升级失败: 金币不足 (需要 ${cost}, 当前 ${gold})`
        );
      }
      return;
    }
    const maxBuys = Math.floor((gold - 50) / 4);
    if (maxBuys > 0) {
      const xpNeeded = totalXp - currentXp;
      const buysToLevelUp = Math.ceil(xpNeeded / 4);
      const actualBuys = Math.min(maxBuys, buysToLevelUp);
      if (actualBuys > 0) {
        const willLevelUp = actualBuys >= buysToLevelUp;
        const cost = actualBuys * 4;
        logger.info(
          `[StrategyService] 卡利息买经验: 购买 ${actualBuys} 次 (花费 ${cost}, 剩余 ${gold - cost})` + (willLevelUp ? ` -> 升级到 Lv.${level + 1}` : ` -> 经验 +${actualBuys * 4}`)
        );
        for (let i = 0; i < actualBuys; i++) {
          await tftOperator.buyExperience();
          await sleep(100);
        }
        gameStateManager.deductGold(cost);
        await this.updateLevelStateFromScreen();
      }
    }
  }
  /**
   * 获取当前回合的关键升级目标等级
   * @returns 目标等级，如果不是关键回合返回 null
   * 
   * @description 标准运营节奏 (Standard Curve):
   * - 2-1: 升 4 级
   * - 2-5: 升 5 级
   * - 3-2: 升 6 级
   * - 4-1: 升 7 级
   * - 5-1: 升 8 级
   */
  getCriticalLevelTarget() {
    const stage = this.currentStage;
    const round = this.currentRound;
    if (stage === 2 && round === 1) return 4;
    if (stage === 2 && round === 5) return 5;
    if (stage === 3 && round === 2) return 6;
    if (stage === 4 && round === 1) return 7;
    if (stage === 5 && round === 1) return 8;
    return null;
  }
  /**
   * D 牌循环流程
   * @description 负责协调 "判断 -> 刷新 -> 购买 -> 整理" 的完整 D 牌节奏
   */
  async executeRollingLoop(targetChampions) {
    let rollCount = 0;
    const maxRolls = 30;
    const maxConsecutiveNoBuyRolls = 10;
    let consecutiveNoBuyRolls = 0;
    while (rollCount < maxRolls) {
      const rolled = await this.executeRollStrategy();
      if (!rolled) break;
      rollCount++;
      const buyResult = await this.autoBuyFromShop(targetChampions, "D牌后购买");
      switch (buyResult) {
        case "BOUGHT":
          consecutiveNoBuyRolls = 0;
          await this.optimizeBoard(targetChampions);
          continue;
        case "BENCH_FULL":
          logger.info(
            `[StrategyService] D牌停止：备战席已满，无法继续购买`
          );
          return;
        case "NOTHING_TO_BUY":
          consecutiveNoBuyRolls++;
          if (consecutiveNoBuyRolls >= maxConsecutiveNoBuyRolls) {
            logger.info(
              `[StrategyService] D牌提前停止：连续 ${consecutiveNoBuyRolls} 次刷新未购买任何棋子`
            );
            return;
          }
          break;
      }
    }
    if (rollCount > 0) {
      logger.info(`[StrategyService] D牌结束：共刷新 ${rollCount} 次`);
    }
  }
  /**
   * D 牌 (刷新商店) 策略
   * @description **只负责 D 牌本身**：判断是否该刷新、执行刷新、并更新商店快照。
   *              本方法不做任何买牌/卖牌/上棋逻辑。
   *
   * @returns 本次是否执行了 D 牌（刷新商店）。
   */
  async executeRollStrategy() {
    const stage = this.currentStage;
    const round = this.currentRound;
    let shouldRollThisRound = false;
    let threshold = 50;
    let reason = "";
    if (stage === 3 && round === 2) {
      shouldRollThisRound = true;
      threshold = 30;
      reason = "3-2 节点搜（上 6 后补 2★稳血）";
    } else if (stage === 4 && round === 1) {
      shouldRollThisRound = true;
      threshold = 20;
      reason = "4-1 节点搜（上 7 后提升质量）";
    } else if (stage === 5 && round === 1) {
      shouldRollThisRound = true;
      threshold = 10;
      reason = "5-1 节点搜（上 8 后补强阵容）";
    } else if (stage >= 6) {
      shouldRollThisRound = true;
      threshold = 0;
      reason = "决赛圈（强度优先，允许打干）";
    }
    if (!shouldRollThisRound) {
      return false;
    }
    const ownedChampions = gameStateManager.getOwnedChampionNames();
    let pairCount = 0;
    for (const name of ownedChampions) {
      if (gameStateManager.getOneStarChampionCount(name) >= 2) {
        pairCount++;
      }
    }
    if (pairCount >= 2) {
      threshold = Math.max(0, threshold - 10);
      reason += ` + 对子(${pairCount})`;
    }
    const currentGold = gameStateManager.getGold();
    if (currentGold < 2 || currentGold < threshold + 2) {
      return false;
    }
    logger.info(`[StrategyService] D牌: 当前金币 ${currentGold}，底线 ${threshold}，原因: ${reason}，执行刷新...`);
    await tftOperator.refreshShop();
    await this.updateShopStateFromScreen();
    return true;
  }
  /**
   * 获取购买原因（用于日志输出）
   */
  getBuyReason(unit, ownedChampions, targetChampions) {
    const name = unit.displayName;
    if (targetChampions.has(name)) {
      return "目标阵容棋子";
    }
    if (ownedChampions.has(name)) {
      return "已有棋子，可升星";
    }
    return `打工仔 (${unit.price}费)`;
  }
  /**
   * 卖多余棋子策略
   * @description
   * 1. 凑利息：如果当前金币接近 10/20/30/40/50，尝试卖怪凑单
   * 2. 清理打工仔：卖掉非目标且非对子的棋子
   */
  async sellExcessUnits() {
    const currentGold = gameStateManager.getGold();
    const benchUnits = gameStateManager.getBenchUnitsWithIndex();
    if (currentGold >= 50) return;
    const nextInterest = Math.floor(currentGold / 10 + 1) * 10;
    const diff = nextInterest - currentGold;
    if (diff > 0 && diff <= 2) {
      logger.info(`[StrategyService] 尝试凑利息: 当前 ${currentGold}, 目标 ${nextInterest}, 需 ${diff} 金币`);
      await this.trySellForGold(diff);
    }
    if (benchUnits.length > 6) {
      logger.info(`[StrategyService] 备战席拥挤 (${benchUnits.length}/9), 清理杂鱼...`);
      await this.trySellTrashUnits();
    }
  }
  /**
   * 尝试卖出棋子以获取指定金币
   * @param amountNeeded 需要的金币数量
   */
  async trySellForGold(amountNeeded) {
    let currentAmount = 0;
    const unitsToSell = [];
    const benchUnits = gameStateManager.getBenchUnitsWithIndex();
    const candidates = benchUnits.filter(({ unit }) => {
      const name = unit.tftUnit.displayName;
      if (this.targetChampionNames.has(name)) return false;
      return gameStateManager.getOneStarChampionCount(name) < 2;
    });
    candidates.sort((a, b) => {
      if (a.unit.starLevel !== b.unit.starLevel) {
        return a.unit.starLevel - b.unit.starLevel;
      }
      return a.unit.tftUnit.price - b.unit.tftUnit.price;
    });
    for (const candidate of candidates) {
      if (currentAmount >= amountNeeded) break;
      unitsToSell.push(candidate);
      currentAmount += candidate.unit.tftUnit.price;
    }
    if (currentAmount >= amountNeeded) {
      for (const { index, unit } of unitsToSell) {
        logger.info(`[StrategyService] 卖出凑利息: ${unit.tftUnit.displayName} (${unit.starLevel}星, +${unit.tftUnit.price})`);
        await tftOperator.sellUnit(`SLOT_${index + 1}`);
        gameStateManager.setBenchSlotEmpty(index);
        gameStateManager.updateGold(gameStateManager.getGold() + unit.tftUnit.price);
        await sleep(200);
      }
    }
  }
  /**
   * 清理备战席的杂鱼
   */
  async trySellTrashUnits() {
    const benchUnits = gameStateManager.getBenchUnitsWithIndex();
    for (const { index, unit } of benchUnits) {
      const name = unit.tftUnit.displayName;
      if (this.targetChampionNames.has(name)) continue;
      if (gameStateManager.getOneStarChampionCount(name) >= 2) continue;
      logger.info(`[StrategyService] 清理杂鱼: ${name}`);
      await tftOperator.sellUnit(`SLOT_${index + 1}`);
      gameStateManager.setBenchSlotEmpty(index);
      gameStateManager.updateGold(gameStateManager.getGold() + unit.tftUnit.price);
      await sleep(100);
    }
  }
  /**
   * 调整站位
   * @description 遍历场上棋子，检查是否在最佳区域（前排/后排）
   *              如果不在，尝试移动到最佳区域
   */
  async adjustPositions() {
    const boardUnits = gameStateManager.getBoardUnitsWithLocation();
    if (boardUnits.length === 0) return;
    logger.debug("[StrategyService] 检查站位...");
    for (const unit of boardUnits) {
      const name = unit.tftUnit.displayName;
      const range = getChampionRange(name) ?? 1;
      const isMelee = range <= 2;
      const currentRow = parseInt(unit.location.split("_")[0].replace("R", ""));
      let needsMove = false;
      if (isMelee && currentRow > 2) needsMove = true;
      if (!isMelee && currentRow <= 2) needsMove = true;
      if (needsMove) {
        const targetLoc = this.findBestPositionForUnit(unit);
        if (targetLoc) {
          logger.info(`[StrategyService] 调整站位: ${name} (${unit.location} -> ${targetLoc})`);
          await tftOperator.moveBoardToBoard(unit.location, targetLoc);
          gameStateManager.moveBoardToBoard(unit.location, targetLoc);
          await sleep(500);
          return;
        }
      }
    }
  }
  /**
   * 装备策略 (合成与穿戴)
   * @description
   * 1. 内部自动判断是否满足执行条件（战斗中/装备栏空等情况会跳过）
   * 2. 循环执行，直到没有可执行的操作（防止因索引变化导致错误）
   * 3. 优先给核心英雄分配最佳装备
   * 4. 如果核心英雄不在场，给"打工仔"（非目标阵容棋子）分配装备，保住血量
   * 5. 考虑装备合成逻辑
   * 
   * @returns 是否执行了装备策略（用于日志/调试）
   */
  async executeEquipStrategy() {
    const gate = this.getEquipStrategyGateDecision();
    if (!gate.should) {
      logger.debug(`[StrategyService] 跳过装备策略：${gate.reason}`);
      return false;
    }
    logger.info(`[StrategyService] 执行装备策略：${gate.reason}`);
    const maxOperations = 10;
    let operationCount = 0;
    while (operationCount < maxOperations) {
      const rawEquipments = gameStateManager.getEquipments();
      if (rawEquipments.length === 0) break;
      const equipments = rawEquipments.filter((e) => this.isWearableEquipmentName(e.name));
      if (equipments.length === 0) {
        break;
      }
      let actionTaken = false;
      const coreChampions = this.getCoreChampions();
      const bagSnapshot = /* @__PURE__ */ new Map();
      for (const equip of equipments) {
        bagSnapshot.set(equip.name, (bagSnapshot.get(equip.name) || 0) + 1);
      }
      for (const config of coreChampions) {
        const desiredItems = [];
        if (config.items) {
          desiredItems.push(...config.items.core);
          if (config.items.alternatives) {
            desiredItems.push(...config.items.alternatives);
          }
        }
        if (desiredItems.length === 0) continue;
        for (const itemName of desiredItems) {
          const targetWrapper = this.findUnitForEquipment(config.name, itemName);
          if (!targetWrapper) continue;
          if (targetWrapper.unit.equips.length >= 3) continue;
          const alreadyHas = targetWrapper.unit.equips.some((e) => e.name === itemName);
          if (alreadyHas) continue;
          if ((bagSnapshot.get(itemName) || 0) > 0) {
            logger.info(
              `[StrategyService] 发现成装 ${itemName}，给 ${targetWrapper.isCore ? "核心" : "打工"}: ${targetWrapper.unit.tftUnit.displayName}`
            );
            await this.equipItemToUnit(itemName, targetWrapper.unit.location);
            actionTaken = true;
            break;
          }
          const synthesis = this.checkSynthesis(itemName, bagSnapshot);
          if (synthesis) {
            logger.info(
              `[StrategyService] 合成 ${itemName} (${synthesis.component1} + ${synthesis.component2}) 给 ${targetWrapper.isCore ? "核心" : "打工"}: ${targetWrapper.unit.tftUnit.displayName}`
            );
            await this.synthesizeAndEquip(
              synthesis.component1,
              synthesis.component2,
              targetWrapper.unit.location,
              itemName
              // 传入合成后的装备名称
            );
            actionTaken = true;
            break;
          }
        }
        if (actionTaken) break;
      }
      if (!actionTaken) {
        const component = equipments.find((e) => {
          const data = TFT_16_EQUIP_DATA[e.name];
          return data && (data.formula ?? "") === "";
        });
        const itemToEquip = component?.name ?? equipments[0].name;
        const targetLocation = this.findBestEquipmentTargetLocation(itemToEquip, coreChampions);
        if (targetLocation) {
          const role = this.getEquipmentRolePreference(itemToEquip);
          logger.info(`[StrategyService] 装备上场(${role}): ${itemToEquip} -> ${targetLocation}`);
          await this.equipItemToUnit(itemToEquip, targetLocation);
          actionTaken = true;
        }
      }
      if (!actionTaken) {
        break;
      }
      operationCount++;
      await sleep(100);
    }
    return true;
  }
  /**
   * 寻找适合穿戴装备的单位
   * @param coreChampionName 核心英雄名字
   * @returns { unit: BoardUnit, isCore: boolean } | null
   * @description
   * 1. 优先找场上的 Core Champion
   * 2. 如果没找到，找场上的 "打工仔" (非 Target Champion)
   * 3. 打工仔选择标准：2星优先 > 费用高优先
   */
  findUnitForEquipment(coreChampionName, itemName) {
    const boardUnits = gameStateManager.getBoardUnitsWithLocation();
    const coreUnits = boardUnits.filter((u) => u.tftUnit.displayName === coreChampionName).sort((a, b) => b.starLevel - a.starLevel);
    if (coreUnits.length > 0) {
      return { unit: coreUnits[0], isCore: true };
    }
    let holderUnits = boardUnits.filter((u) => !this.targetChampionNames.has(u.tftUnit.displayName));
    if (holderUnits.length > 0 && itemName) {
      const role = this.getEquipmentRolePreference(itemName);
      if (role !== "any") {
        const matched = holderUnits.filter((u) => this.doesUnitMatchEquipRole(u, role));
        if (matched.length > 0) {
          holderUnits = matched;
        }
      }
    }
    if (holderUnits.length > 0) {
      holderUnits.sort((a, b) => {
        if (a.starLevel !== b.starLevel) return b.starLevel - a.starLevel;
        return b.tftUnit.price - a.tftUnit.price;
      });
      return { unit: holderUnits[0], isCore: false };
    }
    return null;
  }
  /**
   * 检查是否可以合成指定装备
   * @param targetItemName 目标装备名称
   * @param bag 装备背包快照
   * @returns 如果可以合成，返回两个散件的名称；否则返回 null
   */
  checkSynthesis(targetItemName, bag) {
    const targetEquip = TFT_16_EQUIP_DATA[targetItemName];
    if (!targetEquip || !targetEquip.formula) return null;
    const [id1, id2] = targetEquip.formula.split(",");
    if (!id1 || !id2) return null;
    const name1 = this.findEquipNameById(id1);
    const name2 = this.findEquipNameById(id2);
    if (!name1 || !name2) return null;
    const count1 = bag.get(name1) || 0;
    const count2 = bag.get(name2) || 0;
    if (name1 === name2) {
      if (count1 >= 2) return { component1: name1, component2: name2 };
    } else {
      if (count1 >= 1 && count2 >= 1) return { component1: name1, component2: name2 };
    }
    return null;
  }
  /**
   * 根据 ID 查找装备名称
   */
  findEquipNameById(id) {
    for (const key in TFT_16_EQUIP_DATA) {
      if (TFT_16_EQUIP_DATA[key].equipId === id) {
        return TFT_16_EQUIP_DATA[key].name;
      }
    }
    return void 0;
  }
  /**
   * 将装备给棋子（成装直接给）
   */
  async equipItemToUnit(itemName, unitLocation) {
    const equipIndex = gameStateManager.findEquipmentIndex(itemName);
    if (equipIndex === -1) {
      logger.error(`[StrategyService] 背包中找不到装备 ${itemName}`);
      return;
    }
    logger.info(`[StrategyService] 穿戴: ${itemName} -> ${unitLocation}`);
    await tftOperator.equipToBoardUnit(equipIndex, unitLocation);
    gameStateManager.removeEquipment(equipIndex);
    gameStateManager.addEquipToUnit(unitLocation, itemName);
    await sleep(100);
  }
  /**
   * 合成并穿戴（将两个散件依次给棋子）
   * @param comp1 第一个散件名称
   * @param comp2 第二个散件名称
   * @param unitLocation 目标棋子位置
   * @param resultItemName 合成后的装备名称（用于同步更新棋子装备状态）
   */
  async synthesizeAndEquip(comp1, comp2, unitLocation, resultItemName) {
    const index1 = gameStateManager.findEquipmentIndex(comp1);
    if (index1 === -1) {
      logger.error(`[StrategyService] 合成失败：找不到第一个散件 ${comp1}`);
      return;
    }
    logger.info(`[StrategyService] 合成步骤1: ${comp1}(slot${index1}) -> ${unitLocation}`);
    await tftOperator.equipToBoardUnit(index1, unitLocation);
    gameStateManager.removeEquipment(index1);
    await sleep(500);
    const index2 = gameStateManager.findEquipmentIndex(comp2);
    if (index2 === -1) {
      logger.error(`[StrategyService] 合成失败：找不到第二个散件 ${comp2} (可能被挪用了?)`);
      return;
    }
    logger.info(`[StrategyService] 合成步骤2: ${comp2}(slot${index2}) -> ${unitLocation}`);
    await tftOperator.equipToBoardUnit(index2, unitLocation);
    gameStateManager.removeEquipment(index2);
    gameStateManager.addEquipToUnit(unitLocation, resultItemName);
    await sleep(500);
  }
  /**
   * 处理 选秀阶段
   * @description
   * 选秀阶段会循环右键点击选秀位置（sharedDraftPoint），每隔 3 秒点一次，
   * 直到 GameStageMonitor 检测到进入下一个回合（stageText 变化）时自动退出。
   *
   */
  async handleCarousel() {
    logger.info("[StrategyService] 选秀阶段：开始循环点击选秀位置...");
    const entryStageText = gameStageMonitor.stageText;
    const clickInterval = 2e3;
    while (true) {
      if (gameStageMonitor.stageText !== entryStageText) {
        logger.info("[StrategyService] 选秀阶段结束，进入下一回合");
        break;
      }
      await mouseController.clickAt(sharedDraftPoint, MouseButtonType.RIGHT);
      logger.debug(`[StrategyService] 选秀点击: (${sharedDraftPoint.x}, ${sharedDraftPoint.y})`);
      await sleep(clickInterval);
    }
  }
  /**
   * 处理 海克斯选择阶段 (2-1, 3-2, 4-2)
   * @description 进入海克斯阶段后：
   *              1. 等待 1.5 秒（让海克斯选项完全加载）
   *              2. 随机点击一个海克斯槽位（SLOT_1 / SLOT_2 / SLOT_3）
   *              3. 等待 0.5 秒（让选择动画完成）
   *              4. 刷新游戏状态
   *              5. 执行通用运营策略（因为海克斯选完后就是正常 PVP 准备阶段）
   */
  async handleAugment() {
    logger.info("[StrategyService] 海克斯阶段：等待海克斯选项加载...");
    await sleep(1e3);
    const slotKeys = Object.keys(hexSlot);
    const randomIndex = Math.floor(Math.random() * slotKeys.length);
    const selectedSlotKey = slotKeys[randomIndex];
    const selectedPoint = hexSlot[selectedSlotKey];
    logger.info(
      `[StrategyService] 海克斯阶段：随机选择一个海克斯槽位: ${selectedSlotKey}`
    );
    await mouseController.clickAt(selectedPoint, MouseButtonType.LEFT);
    await sleep(500);
    await this.refreshGameState();
    await this.executeCommonStrategy();
  }
  /**
   * 购买棋子并更新游戏状态
   * @param shopSlotIndex 商店槽位索引 (0-4)
   * @returns SingleBuyResult 购买结果
   *
   * @description 这是一个核心方法，负责：
   *              1. 检查购买条件（金币、备战席空位、是否能升星）
   *              2. 执行购买操作
   *              3. 更新 GameStateManager 中的状态（金币、备战席、商店）
   *
   * TFT 合成规则：
   * - 3 个 1★ 同名棋子 → 自动合成 1 个 2★
   * - 合成时，场上的棋子优先变为高星，备战席的棋子被消耗
   * - 如果都在备战席，靠左（索引小）的棋子变为高星，其他被消耗
   *
   * 购买后状态变化：
   * - 情况 A：备战席有空位，不能升星
   *   → 新棋子放入最左边的空位
   * - 情况 B：能升星（已有 2 个 1★）
   *   - B1：场上 1 个 + 备战席 1 个 → 场上棋子升 2★，备战席棋子消失
   *   - B2：备战席 2 个 → 靠左的升 2★，另一个消失
   * - 情况 C：备战席满且不能升星
   *   → 尝试卖棋子腾位置，如果无法腾位置则返回 BENCH_FULL
   */
  async buyAndUpdateState(shopSlotIndex) {
    const shopUnits = gameStateManager.getShopUnits();
    const unit = shopUnits[shopSlotIndex];
    if (!unit) {
      logger.error(`[StrategyService] 商店槽位 ${shopSlotIndex} 为空，无法购买`);
      return "FAILED";
    }
    const championName = unit.displayName;
    const price = unit.price;
    const currentGold = gameStateManager.getGold();
    if (currentGold < price) {
      logger.error(
        `[StrategyService] 金币不足，无法购买 ${championName}（需要 ${price}，当前 ${currentGold}）`
      );
      return "NOT_ENOUGH_GOLD";
    }
    const emptyBenchSlots = gameStateManager.getEmptyBenchSlotCount();
    const canUpgrade = gameStateManager.canUpgradeAfterBuy(championName);
    if (emptyBenchSlots <= 0 && !canUpgrade) {
      logger.warn(
        `[StrategyService] 备战席已满且买了不能升星，无法购买 ${championName}`
      );
      return "BENCH_FULL";
    }
    logger.info(
      `[StrategyService] 购买 ${championName} (￥${price})` + (canUpgrade ? " [可升星]" : "")
    );
    await tftOperator.buyAtSlot(shopSlotIndex + 1);
    gameStateManager.deductGold(price);
    gameStateManager.setShopSlotEmpty(shopSlotIndex);
    if (canUpgrade) {
      this.handleUpgradeAfterBuy(championName);
    } else {
      const emptySlotIndex = gameStateManager.getFirstEmptyBenchSlotIndex();
      if (emptySlotIndex === -1) {
        logger.error(`[StrategyService] 备战席没有空位，但购买已执行`);
      } else {
        const newBenchUnit = {
          location: `SLOT_${emptySlotIndex + 1}`,
          // 索引 0 对应 SLOT_1
          tftUnit: unit,
          // 商店棋子信息
          starLevel: 1,
          // 商店买的都是 1 星
          equips: []
          // 刚买的棋子没有装备
        };
        gameStateManager.setBenchSlotUnit(emptySlotIndex, newBenchUnit);
        logger.debug(
          `[StrategyService] ${championName} 放入备战席槽位 ${emptySlotIndex} (SLOT_${emptySlotIndex + 1})`
        );
      }
    }
    return "SUCCESS";
  }
  /**
   * 处理购买后的升星逻辑
   * @param championName 购买的棋子名称
   * @description 当购买的棋子能触发升星时，更新 GameStateManager 中的状态：
   *              - 找到参与合成的 2 个 1★ 棋子位置
   *              - 决定哪个棋子升级、哪个棋子消失
   *              - 更新对应槽位的状态
   *
   * TFT 合成优先级：
   * 1. 如果场上有 1★，场上的棋子升级，备战席的消失
   * 2. 如果都在备战席，索引小（靠左）的升级，另一个消失
   */
  handleUpgradeAfterBuy(championName) {
    const positions = gameStateManager.findOneStarChampionPositions(championName);
    if (positions.length < 2) {
      logger.warn(
        `[StrategyService] 升星异常：${championName} 只找到 ${positions.length} 个 1★`
      );
      return;
    }
    const [first, second] = positions;
    logger.info(
      `[StrategyService] ${championName} 升星：${first.location}[${first.index}] 升为 2★，${second.location}[${second.index}] 消失`
    );
    if (first.location === "board") {
      gameStateManager.updateBoardSlotStarLevel(first.index, 2);
    } else {
      gameStateManager.updateBenchSlotStarLevel(first.index, 2);
    }
    if (second.location === "bench") {
      gameStateManager.setBenchSlotEmpty(second.index);
    }
  }
  // ============================================================
  // 🎯 棋子摆放策略 (Unit Placement Strategy)
  // ============================================================
  /**
   * 选择需要上场的棋子
   * @param benchUnits 备战席上的棋子列表
   * @param targetChampions 目标棋子集合
   * @param maxCount 最多可以上场的数量
   * @returns 需要上场的棋子列表（已排序）
   *
   * @description 选择逻辑：
   *              场上有空位必须填满！不能因为不是目标棋子就空着不放。
   *              复用 calculateUnitScore 计算分数，按分数从高到低排序。
   *
   *              非目标棋子作为"打工仔"，虽然没有羁绊加成，但也能提供战斗力。
   */
  selectUnitsToPlace(benchUnits, targetChampions, maxCount) {
    if (benchUnits.length === 0 || maxCount <= 0) {
      return [];
    }
    const boardChampionNames = new Set(
      gameStateManager.getBoardUnitsWithLocation().map((u) => u.tftUnit.displayName)
    );
    const filtered = benchUnits.filter((u) => {
      if (u.starLevel === -1) return false;
      return !u.tftUnit.displayName.includes("锻造器");
    });
    if (filtered.length === 0) {
      return [];
    }
    const candidates = filtered.filter((u) => !boardChampionNames.has(u.tftUnit.displayName));
    const finalCandidates = candidates.length > 0 ? candidates : filtered;
    const sortedUnits = [...finalCandidates].sort((a, b) => {
      const aScore = this.calculateUnitScore(a.tftUnit, a.starLevel, targetChampions);
      const bScore = this.calculateUnitScore(b.tftUnit, b.starLevel, targetChampions);
      return bScore - aScore;
    });
    const result = [];
    const pickedChampionNames = /* @__PURE__ */ new Set();
    for (const u of sortedUnits) {
      const name = u.tftUnit.displayName;
      if (pickedChampionNames.has(name)) continue;
      pickedChampionNames.add(name);
      result.push(u);
      if (result.length >= maxCount) break;
    }
    if (result.length < maxCount) {
      for (const u of sortedUnits) {
        if (result.includes(u)) continue;
        result.push(u);
        if (result.length >= maxCount) break;
      }
    }
    return result;
  }
  /**
   * 为棋子找到最佳摆放位置
   * @param unit 棋子对象 (需要包含 tftUnit 信息)
   * @returns 最佳位置的 BoardLocation，如果找不到返回 undefined
   *
   * @description 摆放逻辑：
   *              - 射程 1-2（近战）：优先放前排 (R1, R2)
   *              - 射程 3+（远程）：优先放后排 (R3, R4)
   *              - 如果优先区域没有空位，则放到任意空位
   */
  findBestPositionForUnit(unit) {
    const championName = unit.tftUnit.displayName;
    const range = getChampionRange(championName) ?? 1;
    const isMelee = range <= 2;
    const frontRowEmpty = gameStateManager.getFrontRowEmptyLocations();
    const backRowEmpty = gameStateManager.getBackRowEmptyLocations();
    logger.debug(
      `[StrategyService] ${championName} 射程: ${range}，${isMelee ? "近战" : "远程"}，前排空位: ${frontRowEmpty.length}，后排空位: ${backRowEmpty.length}`
    );
    const [primary, secondary] = isMelee ? [frontRowEmpty, backRowEmpty] : [backRowEmpty, frontRowEmpty];
    const candidates = primary.length > 0 ? primary : secondary;
    return candidates.length > 0 ? this.selectPositionFromCenter(candidates) : void 0;
  }
  /**
   * 从空位列表中选择最佳位置。这里传入的时候就已经区分了前排和后排。
   * @param emptyLocations 空位列表（如 ["R1_C1", "R1_C3", "R2_C4"]）
   * @returns 最佳位置
   *
   * @description 行优先 + 列居中的选择策略：
   *              1. 行优先级：R1 > R2 > R3 > R4（前排棋子先站前面）
   *              2. 同行内列优先级：C4 > C3 > C5 > C2 > C6 > C1 > C7（从中间向两边）
   *              这样可以让阵型紧凑，近战棋子不用绕路
   */
  selectPositionFromCenter(emptyLocations) {
    if (emptyLocations.length === 0) return void 0;
    const rowPriority = ["R1", "R2", "R4", "R3"];
    const columnPriority = ["C4", "C3", "C5", "C2", "C6", "C1", "C7"];
    for (const row of rowPriority) {
      const rowLocations = emptyLocations.filter((loc) => loc.startsWith(row));
      if (rowLocations.length === 0) continue;
      for (const col of columnPriority) {
        const found = rowLocations.find((loc) => loc.endsWith(col));
        if (found) return found;
      }
    }
    return emptyLocations[0];
  }
  /**
   * 自动购买商店中的目标棋子
   * @param targetChampions 目标棋子集合
   * @param logPrefix 日志前缀
   * @returns BuyResult 购买结果
   *          - BOUGHT: 成功购买了至少一个棋子
   *          - NOTHING_TO_BUY: 商店没有想买的棋子
   *          - BENCH_FULL: 备战席已满，无法继续购买
   */
  async autoBuyFromShop(targetChampions, logPrefix = "自动购买") {
    const shopUnits = gameStateManager.getShopUnits();
    const ownedChampions = gameStateManager.getOwnedChampionNames();
    const buyIndices = this.analyzePurchaseDecision(shopUnits, ownedChampions, targetChampions);
    if (buyIndices.length === 0) {
      return "NOTHING_TO_BUY";
    }
    let hasBought = false;
    let benchFull = false;
    for (const index of buyIndices) {
      const unit = shopUnits[index];
      if (!unit) continue;
      const championName = unit.displayName;
      const isTarget = targetChampions.has(championName);
      logger.info(
        `[StrategyService] ${logPrefix}: ${championName} (￥${unit.price})，原因: ${this.getBuyReason(unit, ownedChampions, targetChampions)}`
      );
      const result = await this.buyAndUpdateState(index);
      if (result === "SUCCESS") {
        hasBought = true;
        ownedChampions.add(championName);
      } else if (result === "BENCH_FULL") {
        benchFull = true;
        if (isTarget) {
          logger.warn(`[StrategyService] 备战席已满，无法购买目标棋子 ${championName}`);
        }
        break;
      } else if (isTarget) {
        logger.warn(`[StrategyService] 目标棋子 ${championName} 购买失败`);
      }
    }
    if (benchFull && !hasBought) {
      return "BENCH_FULL";
    }
    return hasBought ? "BOUGHT" : "NOTHING_TO_BUY";
  }
  /**
   * 从屏幕重新识别并更新商店和金币状态
   * @description D 牌后调用，重新识别商店棋子和金币并更新到 GameStateManager
   *              不假设刷新扣多少钱，因为某些海克斯强化会让刷新免费或打折
   */
  async updateShopStateFromScreen() {
    const [newShopUnits, newGold] = await Promise.all([
      tftOperator.getShopInfo(),
      tftOperator.getCoinCount()
    ]);
    gameStateManager.updateShopUnits(newShopUnits);
    if (newGold !== null) {
      gameStateManager.updateGold(newGold);
    }
  }
  /**
   * 从屏幕重新识别并更新装备栏状态
   */
  async updateEquipStateFromScreen() {
    const equipments = await tftOperator.getEquipInfo();
    gameStateManager.updateEquipments(equipments);
  }
  /**
   * 从屏幕重新识别并更新备战席状态
   * @description 卖棋子后调用，重新识别备战席棋子并更新到 GameStateManager
   */
  async updateBenchStateFromScreen() {
    const benchUnits = await tftOperator.getBenchInfo();
    gameStateManager.updateBenchUnits(benchUnits);
  }
  /**
   * 重置策略服务状态
   * @description 在游戏结束或停止时调用，清理所有状态
   *              会同时取消订阅事件并重置 GameStateManager
   */
  reset() {
    this.unsubscribe();
    this.currentLineup = null;
    this.candidateLineups = [];
    this.selectionState = "NOT_INITIALIZED";
    this.targetChampionNames.clear();
    this.currentStage = 0;
    this.currentRound = 0;
    gameStateManager.reset();
    logger.info("[StrategyService] 策略服务已重置");
  }
}
const strategyService = StrategyService.getInstance();
class EndState {
  /** 状态名称 */
  name = "EndState";
  /**
   * 执行结束状态逻辑
   * @param _signal AbortSignal (此状态不需要，但为保持接口一致性保留)
   * @returns 返回 IdleState，回到空闲状态
   */
  async action(_signal) {
    strategyService.reset();
    logger.info("[EndState] 正在恢复客户端设置...");
    try {
      const success = await GameConfigHelper.restore(3, 1500);
      if (success) {
        logger.info("[EndState] 客户端设置恢复完成");
      } else {
        logger.warn("[EndState] 设置恢复返回失败，可能需要手动恢复");
      }
    } catch (error) {
      logger.error("[EndState] 恢复设置异常，可能需要手动恢复");
      if (error instanceof Error) {
        logger.error(error);
      }
    }
    logger.info("[EndState] 海克斯科技已关闭，回到空闲状态");
    return new IdleState();
  }
}
var Queue = /* @__PURE__ */ ((Queue2) => {
  Queue2[Queue2["NORMAL_DRAFT"] = 400] = "NORMAL_DRAFT";
  Queue2[Queue2["RANKED_SOLO_DUO"] = 420] = "RANKED_SOLO_DUO";
  Queue2[Queue2["NORMAL_BLIND"] = 430] = "NORMAL_BLIND";
  Queue2[Queue2["RANKED_FLEX"] = 440] = "RANKED_FLEX";
  Queue2[Queue2["ARAM"] = 450] = "ARAM";
  Queue2[Queue2["PICKURF"] = 900] = "PICKURF";
  Queue2[Queue2["TFT_NORMAL"] = 1090] = "TFT_NORMAL";
  Queue2[Queue2["TFT_RANKED"] = 1100] = "TFT_RANKED";
  Queue2[Queue2["TFT_DOUBLE"] = 1160] = "TFT_DOUBLE";
  Queue2[Queue2["TFT_TREASURE"] = 1170] = "TFT_TREASURE";
  Queue2[Queue2["TFT_FATIAO"] = 1220] = "TFT_FATIAO";
  Queue2[Queue2["URF"] = 1900] = "URF";
  Queue2[Queue2["DOU_HUN"] = 1700] = "DOU_HUN";
  Queue2[Queue2["MORIRENJI"] = 4210] = "MORIRENJI";
  Queue2[Queue2["MORIRENJI_HARD"] = 4220] = "MORIRENJI_HARD";
  Queue2[Queue2["MORIRENJI_VERY_HARD"] = 4260] = "MORIRENJI_VERY_HARD";
  return Queue2;
})(Queue || {});
const IN_GAME_API_PORT = 2999;
const REQUEST_TIMEOUT_MS = 1e3;
const inGameApi = axios.create({
  baseURL: `https://127.0.0.1:${IN_GAME_API_PORT}`,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
    // 游戏使用自签名证书
  }),
  timeout: REQUEST_TIMEOUT_MS,
  proxy: false
  // 禁用代理，避免连接问题
});
const InGameApiEndpoints = {
  /** 获取所有游戏数据 */
  ALL_GAME_DATA: "/liveclientdata/allgamedata",
  /** 获取当前玩家信息 */
  ACTIVE_PLAYER: "/liveclientdata/activeplayer",
  /** 获取所有玩家列表 */
  PLAYER_LIST: "/liveclientdata/playerlist",
  /** 获取游戏事件 */
  EVENT_DATA: "/liveclientdata/eventdata",
  /** 获取游戏统计数据 */
  GAME_STATS: "/liveclientdata/gamestats"
};
function showToast(message, options = {}) {
  const { type = "info", position = "top-right" } = options;
  const windows = BrowserWindow.getAllWindows();
  for (const win2 of windows) {
    win2.webContents.send(IpcChannel.SHOW_TOAST, {
      message,
      type,
      position
    });
  }
}
showToast.info = (message, options) => showToast(message, { ...options, type: "info" });
showToast.success = (message, options) => showToast(message, { ...options, type: "success" });
showToast.warning = (message, options) => showToast(message, { ...options, type: "warning" });
showToast.error = (message, options) => showToast(message, { ...options, type: "error" });
const ABORT_CHECK_INTERVAL_MS$1 = 2e3;
class GameRunningState {
  /** 状态名称 */
  name = "GameRunningState";
  /** LCU 管理器实例 */
  lcuManager = LCUManager.getInstance();
  /**
   * 执行游戏运行状态逻辑
   * @param signal AbortSignal 用于取消操作
   * @returns 下一个状态
   * 
   * @description 执行流程：
   * 1. 初始化游戏状态（标记游戏开始）
   * 2. 初始化策略服务（加载阵容配置）
   * 3. 订阅策略服务到 Monitor 事件
   * 4. 启动 GameStageMonitor（开始轮询阶段）
   * 5. 监听 GAMEFLOW_PHASE 事件，等待游戏结束
   * 6. 游戏结束后清理资源，返回下一个状态
   */
  async action(signal) {
    signal.throwIfAborted();
    logger.info("[GameRunningState] 进入游戏运行状态");
    gameStateManager.startGame();
    logger.info("[GameRunningState] 游戏已开始");
    await this.detectAndNotifyBots();
    const initSuccess = strategyService.initialize();
    if (!initSuccess) {
      logger.error("[GameRunningState] 策略服务初始化失败，请先选择阵容");
    }
    strategyService.subscribe();
    gameStageMonitor.start(1e3);
    logger.info("[GameRunningState] GameStageMonitor 已启动");
    const isGameEnded = await this.waitForGameToEnd(signal);
    this.cleanup();
    if (signal.aborted) {
      logger.info("[GameRunningState] 用户手动停止，流转到 EndState");
      return new EndState();
    } else if (isGameEnded) {
      if (hexService.stopAfterCurrentGame) {
        logger.info("[GameRunningState] 游戏结束，检测到【本局结束后停止】标志，流转到 EndState");
        showToast.success("本局已结束，自动停止挂机", { position: "top-center" });
        return new EndState();
      }
      logger.info("[GameRunningState] 游戏结束，流转到 LobbyState 开始下一局");
      return new LobbyState();
    } else {
      logger.warn("[GameRunningState] 异常退出，流转到 LobbyState");
      return new LobbyState();
    }
  }
  /**
   * 等待游戏结束
   * @param signal AbortSignal 用于取消等待
   * @returns true 表示游戏正常结束，false 表示被中断
   * 
   * @description 游戏结束的完整链路：
   * 1. 玩家死亡 → 触发 TFT_BATTLE_PASS 事件（此时游戏窗口还开着）
   * 2. 收到 TFT_BATTLE_PASS 后 → 调用 quitGame() 关闭游戏窗口
   * 3. 游戏窗口关闭后 → 触发 GAMEFLOW_PHASE = "WaitingForStats"
   * 4. 收到 WaitingForStats → 流转到 LobbyState
   */
  waitForGameToEnd(signal) {
    return new Promise((resolve) => {
      let stopCheckInterval = null;
      let isResolved = false;
      let hasTriedQuit = false;
      const safeResolve = (value) => {
        if (isResolved) return;
        isResolved = true;
        cleanup();
        resolve(value);
      };
      const cleanup = () => {
        this.lcuManager?.off(LcuEventUri.GAMEFLOW_PHASE, onGameflowPhase);
        this.lcuManager?.off(LcuEventUri.TFT_BATTLE_PASS, onBattlePass);
        signal.removeEventListener("abort", onAbort);
        if (stopCheckInterval) {
          clearInterval(stopCheckInterval);
          stopCheckInterval = null;
        }
      };
      const onAbort = () => {
        logger.info("[GameRunningState] 收到取消信号，停止等待");
        safeResolve(false);
      };
      const onBattlePass = async (_eventData) => {
        if (hasTriedQuit) return;
        hasTriedQuit = true;
        logger.info("[GameRunningState] 收到 TFT_BATTLE_PASS 事件，玩家已死亡/对局结束");
        strategyService.setGameEnded();
        const EXIT_DELAY_MS = 3e3;
        await sleep(EXIT_DELAY_MS);
        logger.info("[GameRunningState] 正在尝试关闭游戏窗口...");
        try {
          await this.lcuManager?.killGameProcess();
          logger.info("[GameRunningState] 游戏进程已被杀掉");
        } catch (error) {
          logger.warn(`[GameRunningState] 杀掉游戏进程失败: ${error}`);
        }
        try {
          await this.lcuManager?.quitGame();
          logger.info("[GameRunningState] 退出游戏请求已发送");
        } catch (error) {
          logger.warn(`[GameRunningState] 退出游戏请求失败: ${error}`);
        }
      };
      const onGameflowPhase = (eventData) => {
        const phase = eventData.data?.phase;
        logger.info(`[GameRunningState] 监听到游戏阶段: ${phase}`);
        if (phase && (phase === "WaitingForStats" || phase === "PreEndOfGame")) {
          logger.info(`[GameRunningState] 检测到游戏结束 (${phase})，准备流转到下一状态`);
          safeResolve(true);
        }
      };
      signal.addEventListener("abort", onAbort, { once: true });
      this.lcuManager?.on(LcuEventUri.TFT_BATTLE_PASS, onBattlePass);
      this.lcuManager?.on(LcuEventUri.GAMEFLOW_PHASE, onGameflowPhase);
      stopCheckInterval = setInterval(() => {
        if (signal.aborted) {
          safeResolve(false);
        }
      }, ABORT_CHECK_INTERVAL_MS$1);
    });
  }
  /**
   * 检测对局中的人机玩家并发送 Toast 通知
   * @description 通过 InGame API 获取所有玩家信息，筛选出 isBot=true 的玩家
   *              并发送 Toast 通知告知用户本局有多少人机
   */
  async detectAndNotifyBots() {
    try {
      const response = await inGameApi.get(InGameApiEndpoints.ALL_GAME_DATA);
      const gameData = response.data;
      const allPlayers = gameData?.allPlayers || [];
      const botPlayers = allPlayers.filter((player) => player.isBot === true);
      const botNames = botPlayers.map((player) => player.riotIdGameName || player.summonerName);
      if (botNames.length > 0) {
        const message = `对局已开始！本局有 ${botNames.length} 个人机：${botNames.join("、")}`;
        showToast.info(message, { position: "top-center" });
        logger.info(`[GameRunningState] ${message}`);
      } else {
        showToast.info("对局已开始！本局全是真人玩家", { position: "top-center" });
        logger.info("[GameRunningState] 对局已开始，本局全是真人玩家");
      }
    } catch (error) {
      logger.warn(`[GameRunningState] 检测人机玩家失败: ${error.message}`);
      showToast.info("对局已开始！", { position: "top-center" });
    }
  }
  /**
   * 清理资源
   * @description 游戏结束时调用，停止 Monitor 并重置相关服务
   */
  cleanup() {
    gameStageMonitor.stop();
    gameStageMonitor.reset();
    logger.info("[GameRunningState] GameStageMonitor 已停止并重置");
    strategyService.reset();
    logger.info("[GameRunningState] StrategyService 已重置");
    gameStateManager.reset();
    logger.info("[GameRunningState] GameStateManager 已重置");
  }
}
const POLL_INTERVAL_MS = 2e3;
class GameLoadingState {
  /** 状态名称 */
  name = "GameLoadingState";
  /**
   * 执行游戏加载状态逻辑
   * @param signal AbortSignal 用于取消等待
   * @returns 下一个状态 (GameRunningState 或 EndState)
   */
  async action(signal) {
    signal.throwIfAborted();
    logger.info("[GameLoadingState] 等待进入对局...");
    const isGameLoaded = await this.waitForGameToLoad(signal);
    if (isGameLoaded) {
      logger.info("[GameLoadingState] 对局已开始！");
      return new GameRunningState();
    } else {
      logger.info("[GameLoadingState] 加载被中断");
      return new EndState();
    }
  }
  /**
   * 等待游戏加载完成
   * @param signal AbortSignal 用于取消轮询
   * @returns true 表示游戏已加载，false 表示被取消
   */
  waitForGameToLoad(signal) {
    return new Promise((resolve) => {
      let intervalId = null;
      const cleanup = () => {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      };
      const onAbort = () => {
        logger.info("[GameLoadingState] 收到取消信号，停止轮询");
        cleanup();
        resolve(false);
      };
      signal.addEventListener("abort", onAbort, { once: true });
      const checkIfGameStart = async () => {
        if (signal.aborted) {
          cleanup();
          return;
        }
        try {
          await inGameApi.get(InGameApiEndpoints.ALL_GAME_DATA);
          signal.removeEventListener("abort", onAbort);
          cleanup();
          resolve(true);
        } catch {
          logger.debug("[GameLoadingState] 游戏仍在加载中...");
        }
      };
      intervalId = setInterval(checkIfGameStart, POLL_INTERVAL_MS);
      checkIfGameStart();
    });
  }
}
const LOBBY_CREATE_DELAY_MS = 500;
const RETRY_DELAY_MS = 1e3;
const ABORT_CHECK_INTERVAL_MS = 500;
class LobbyState {
  /** 状态名称 */
  name = "LobbyState";
  lcuManager = LCUManager.getInstance();
  /**
   * 根据用户设置获取对应的队列 ID
   * @returns TFT 队列 ID（匹配或排位）
   */
  getQueueId() {
    const tftMode = settingsStore.get("tftMode");
    switch (tftMode) {
      case TFTMode.RANK:
        logger.info("[LobbyState] 当前模式: 排位赛");
        return Queue.TFT_RANKED;
      case TFTMode.NORMAL:
      default:
        logger.info("[LobbyState] 当前模式: 匹配模式");
        return Queue.TFT_NORMAL;
    }
  }
  /**
   * 执行大厅状态逻辑
   * @param signal AbortSignal 用于取消操作
   * @returns 下一个状态
   */
  async action(signal) {
    signal.throwIfAborted();
    if (!this.lcuManager) {
      throw Error("[LobbyState] 检测到客户端未启动！");
    }
    const queueId = this.getQueueId();
    logger.info("[LobbyState] 正在创建房间...");
    await this.lcuManager.createLobbyByQueueId(queueId);
    await sleep(LOBBY_CREATE_DELAY_MS);
    logger.info("[LobbyState] 正在开始排队...");
    await this.lcuManager.startMatch();
    const isGameStarted = await this.waitForGameToStart(signal);
    if (isGameStarted) {
      logger.info("[LobbyState] 游戏已开始！流转到 GameLoadingState");
      return new GameLoadingState();
    } else if (signal.aborted) {
      return new EndState();
    } else {
      logger.warn("[LobbyState] 流程中断 (如秒退)，将重新排队...");
      await sleep(RETRY_DELAY_MS);
      return this;
    }
  }
  /**
   * 等待从"排队"到"游戏开始"的完整流程
   * @param signal AbortSignal 用于取消等待
   * @returns true 表示游戏成功开始，false 表示流程中断
   */
  waitForGameToStart(signal) {
    return new Promise((resolve) => {
      let stopCheckInterval = null;
      let isResolved = false;
      let lastAcceptTime = 0;
      const safeResolve = (value) => {
        if (isResolved) return;
        isResolved = true;
        cleanup();
        resolve(value);
      };
      const cleanup = () => {
        this.lcuManager?.off(LcuEventUri.READY_CHECK, onReadyCheck);
        this.lcuManager?.off(LcuEventUri.GAMEFLOW_PHASE, onGameflowPhase);
        if (stopCheckInterval) {
          clearInterval(stopCheckInterval);
          stopCheckInterval = null;
        }
      };
      const onAbort = () => {
        logger.info("[LobbyState] 收到取消信号，停止等待");
        safeResolve(false);
      };
      const onReadyCheck = (eventData) => {
        const now = Date.now();
        if (eventData.data?.state === "InProgress" && now - lastAcceptTime >= 1e3) {
          lastAcceptTime = now;
          logger.info("[LobbyState] 已找到对局！正在自动接受...");
          this.lcuManager?.acceptMatch().catch((reason) => {
            logger.warn(`[LobbyState] 接受对局失败: ${reason}`);
          });
        }
      };
      const onGameflowPhase = (eventData) => {
        const phase = eventData.data?.phase;
        logger.info(`[LobbyState] 监听到游戏阶段: ${phase}`);
        if (phase === "InProgress") {
          logger.info("[LobbyState] 监听到 GAMEFLOW 变为 InProgress");
          safeResolve(true);
        }
      };
      signal.addEventListener("abort", onAbort, { once: true });
      this.lcuManager?.on(LcuEventUri.READY_CHECK, onReadyCheck);
      this.lcuManager?.on(LcuEventUri.GAMEFLOW_PHASE, onGameflowPhase);
      stopCheckInterval = setInterval(() => {
        if (signal.aborted) {
          safeResolve(false);
        }
      }, ABORT_CHECK_INTERVAL_MS);
    });
  }
}
class StartState {
  /** 状态名称 */
  name = "StartState";
  /**
   * 执行启动状态逻辑
   * @param signal AbortSignal 用于取消操作
   * @returns 下一个状态 (LobbyState 或 GameLoadingState)
   */
  async action(signal) {
    signal.throwIfAborted();
    logger.info("[StartState] 正在初始化...");
    await this.backupGameConfig();
    await this.applyTFTConfig();
    const isInGame = await this.checkIfInGame();
    if (isInGame) {
      logger.info("[StartState] 检测到已在游戏中，直接进入游戏状态");
      return new GameLoadingState();
    }
    logger.info("[StartState] 初始化完成，进入大厅状态");
    return new LobbyState();
  }
  /**
   * 备份游戏配置
   * @description 在修改游戏设置前先备份，以便结束时恢复
   */
  async backupGameConfig() {
    try {
      logger.info("[StartState] 正在备份游戏配置...");
      await GameConfigHelper.backup();
      logger.info("[StartState] 游戏配置备份完成");
    } catch (error) {
      logger.warn("[StartState] 游戏配置备份失败，继续执行");
      if (error instanceof Error) {
        logger.debug(error.message);
      }
    }
  }
  /**
   * 应用 TFT 专用配置
   * @description 将预设的 TFT 配置（分辨率 1024x768、低画质等）应用到游戏
   *              这样可以确保截图识别的坐标准确，同时降低系统资源占用
   */
  async applyTFTConfig() {
    try {
      logger.info("[StartState] 正在应用 TFT 专用配置...");
      const success = await GameConfigHelper.applyTFTConfig();
      if (success) {
        logger.info("[StartState] TFT 专用配置应用成功");
      } else {
        logger.warn("[StartState] TFT 专用配置应用失败，将使用当前游戏设置");
      }
    } catch (error) {
      logger.warn("[StartState] TFT 专用配置应用异常，继续执行");
      if (error instanceof Error) {
        logger.debug(error.message);
      }
    }
  }
  /**
   * 检查是否已在游戏中
   * @returns true 表示已在游戏中
   */
  async checkIfInGame() {
    try {
      await inGameApi.get(InGameApiEndpoints.ALL_GAME_DATA);
      return true;
    } catch {
      return false;
    }
  }
}
const STATE_TRANSITION_DELAY_MS = 2e3;
class HexService {
  static instance = null;
  /** 取消控制器，用于优雅停止 */
  abortController = null;
  /** 当前状态 */
  currentState;
  /** 本局结束后自动停止的标志 */
  _stopAfterCurrentGame = false;
  /**
   * 私有构造函数，确保单例
   */
  constructor() {
    this.currentState = new IdleState();
  }
  /**
   * 获取 HexService 单例
   */
  static getInstance() {
    if (!HexService.instance) {
      HexService.instance = new HexService();
    }
    return HexService.instance;
  }
  /**
   * 检查服务是否正在运行
   * @description 通过 abortController 是否存在来判断
   */
  get isRunning() {
    return this.abortController !== null;
  }
  /**
   * 获取"本局结束后自动停止"状态
   */
  get stopAfterCurrentGame() {
    return this._stopAfterCurrentGame;
  }
  /**
   * 切换"本局结束后自动停止"状态
   * @returns 切换后的状态值
   */
  toggleStopAfterCurrentGame() {
    this._stopAfterCurrentGame = !this._stopAfterCurrentGame;
    logger.info(`[HexService] 本局结束后自动停止: ${this._stopAfterCurrentGame ? "已开启" : "已关闭"}`);
    return this._stopAfterCurrentGame;
  }
  /**
   * 设置"本局结束后自动停止"状态
   * @param value 要设置的值
   */
  setStopAfterCurrentGame(value) {
    this._stopAfterCurrentGame = value;
    logger.info(`[HexService] 本局结束后自动停止: ${value ? "已开启" : "已关闭"}`);
  }
  /**
   * 启动海克斯科技
   * @returns true 表示启动成功
   */
  async start() {
    if (this.isRunning) {
      logger.warn("[HexService] 引擎已在运行中，无需重复启动。");
      return true;
    }
    try {
      logger.info("———————— [HexService] ————————");
      logger.info("[HexService] 海克斯科技，启动！");
      this.abortController = new AbortController();
      this.currentState = new StartState();
      this._stopAfterCurrentGame = false;
      this.runMainLoop(this.abortController.signal);
      return true;
    } catch (e) {
      logger.error("[HexService] 启动失败！");
      console.error(e);
      return false;
    }
  }
  /**
   * 停止海克斯科技
   * @returns true 表示停止成功
   */
  async stop() {
    if (!this.isRunning) {
      logger.warn("[HexService] 服务已停止，无需重复操作。");
      return true;
    }
    try {
      logger.info("———————— [HexService] ————————");
      logger.info("[HexService] 海克斯科技，关闭！");
      this.abortController?.abort("user stop");
      const configHelper = GameConfigHelper.getInstance();
      if (configHelper?.isTFTConfig === true) {
        await GameConfigHelper.restore();
      }
      return true;
    } catch (e) {
      console.error(e);
      logger.error("[HexService] 海克斯科技关闭失败！");
      return false;
    }
  }
  /**
   * 状态机主循环
   * @param signal AbortSignal 用于控制循环退出
   */
  async runMainLoop(signal) {
    logger.info("[HexService-Looper] 启动事件循环。");
    try {
      signal.throwIfAborted();
      while (true) {
        signal.throwIfAborted();
        logger.info(`[HexService-Looper] -> 当前状态: ${this.currentState.name}`);
        const nextState = await this.currentState.action(signal);
        if (nextState === null) {
          logger.error("[HexService-Looper] -> 状态返回 null，流程中止！");
          break;
        }
        this.currentState = nextState;
        await sleep(STATE_TRANSITION_DELAY_MS);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        logger.info("[HexService-Looper] -> 用户手动退出，挂机流程结束");
      } else if (error instanceof Error) {
        logger.error(
          `[HexService-Looper] 状态机在 [${this.currentState.name}] 状态下发生严重错误: ${error.message}`
        );
      }
    } finally {
      this.currentState = await new EndState().action(signal);
      this.abortController = null;
    }
  }
}
const hexService = HexService.getInstance();
const keyCodeToName = {
  // F1-F12 功能键
  [UiohookKey.F1]: "F1",
  [UiohookKey.F2]: "F2",
  [UiohookKey.F3]: "F3",
  [UiohookKey.F4]: "F4",
  [UiohookKey.F5]: "F5",
  [UiohookKey.F6]: "F6",
  [UiohookKey.F7]: "F7",
  [UiohookKey.F8]: "F8",
  [UiohookKey.F9]: "F9",
  [UiohookKey.F10]: "F10",
  [UiohookKey.F11]: "F11",
  [UiohookKey.F12]: "F12",
  // 数字键 0-9
  [UiohookKey["0"]]: "0",
  [UiohookKey["1"]]: "1",
  [UiohookKey["2"]]: "2",
  [UiohookKey["3"]]: "3",
  [UiohookKey["4"]]: "4",
  [UiohookKey["5"]]: "5",
  [UiohookKey["6"]]: "6",
  [UiohookKey["7"]]: "7",
  [UiohookKey["8"]]: "8",
  [UiohookKey["9"]]: "9",
  // 字母键 A-Z
  [UiohookKey.A]: "A",
  [UiohookKey.B]: "B",
  [UiohookKey.C]: "C",
  [UiohookKey.D]: "D",
  [UiohookKey.E]: "E",
  [UiohookKey.F]: "F",
  [UiohookKey.G]: "G",
  [UiohookKey.H]: "H",
  [UiohookKey.I]: "I",
  [UiohookKey.J]: "J",
  [UiohookKey.K]: "K",
  [UiohookKey.L]: "L",
  [UiohookKey.M]: "M",
  [UiohookKey.N]: "N",
  [UiohookKey.O]: "O",
  [UiohookKey.P]: "P",
  [UiohookKey.Q]: "Q",
  [UiohookKey.R]: "R",
  [UiohookKey.S]: "S",
  [UiohookKey.T]: "T",
  [UiohookKey.U]: "U",
  [UiohookKey.V]: "V",
  [UiohookKey.W]: "W",
  [UiohookKey.X]: "X",
  [UiohookKey.Y]: "Y",
  [UiohookKey.Z]: "Z",
  // 特殊键
  [UiohookKey.Space]: "Space",
  [UiohookKey.Tab]: "Tab",
  [UiohookKey.Enter]: "Enter",
  [UiohookKey.Backspace]: "Backspace",
  [UiohookKey.Delete]: "Delete",
  [UiohookKey.Insert]: "Insert",
  [UiohookKey.Home]: "Home",
  [UiohookKey.End]: "End",
  [UiohookKey.PageUp]: "PageUp",
  [UiohookKey.PageDown]: "PageDown",
  [UiohookKey.ArrowUp]: "Up",
  [UiohookKey.ArrowDown]: "Down",
  [UiohookKey.ArrowLeft]: "Left",
  [UiohookKey.ArrowRight]: "Right",
  // 小键盘
  [UiohookKey.Numpad0]: "num0",
  [UiohookKey.Numpad1]: "num1",
  [UiohookKey.Numpad2]: "num2",
  [UiohookKey.Numpad3]: "num3",
  [UiohookKey.Numpad4]: "num4",
  [UiohookKey.Numpad5]: "num5",
  [UiohookKey.Numpad6]: "num6",
  [UiohookKey.Numpad7]: "num7",
  [UiohookKey.Numpad8]: "num8",
  [UiohookKey.Numpad9]: "num9"
};
class GlobalHotkeyManager {
  /** 单例实例 */
  static instance = null;
  /** 是否已启动 uiohook */
  isStarted = false;
  /** 当前按下的修饰键状态 */
  modifierState = {
    ctrl: false,
    alt: false,
    shift: false,
    meta: false
  };
  /** 已注册的快捷键映射 (accelerator -> { callback, parsed }) */
  hotkeyMap = /* @__PURE__ */ new Map();
  constructor() {
  }
  /**
   * 获取单例实例
   */
  static getInstance() {
    if (!GlobalHotkeyManager.instance) {
      GlobalHotkeyManager.instance = new GlobalHotkeyManager();
    }
    return GlobalHotkeyManager.instance;
  }
  /**
   * 解析 Electron Accelerator 字符串为组件
   * @param accelerator 如 "Ctrl+Shift+F1"
   */
  parseAccelerator(accelerator) {
    const parts = accelerator.split("+");
    const result = { ctrl: false, alt: false, shift: false, meta: false, key: "" };
    for (const part of parts) {
      const lowerPart = part.toLowerCase();
      if (lowerPart === "ctrl" || lowerPart === "control" || lowerPart === "commandorcontrol") {
        result.ctrl = true;
      } else if (lowerPart === "alt") {
        result.alt = true;
      } else if (lowerPart === "shift") {
        result.shift = true;
      } else if (lowerPart === "meta" || lowerPart === "super" || lowerPart === "command") {
        result.meta = true;
      } else {
        result.key = part.toUpperCase();
      }
    }
    return result;
  }
  /**
   * 检查当前按键是否匹配指定的已解析快捷键
   * @param keyCode 按下的键码
   * @param parsed 已解析的快捷键结构
   */
  matchHotkey(keyCode, parsed) {
    const keyName = keyCodeToName[keyCode];
    if (!keyName) return false;
    return this.modifierState.ctrl === parsed.ctrl && this.modifierState.alt === parsed.alt && this.modifierState.shift === parsed.shift && this.modifierState.meta === parsed.meta && keyName.toUpperCase() === parsed.key;
  }
  /**
   * 启动键盘监听
   */
  start() {
    if (this.isStarted) return;
    uIOhook.on("keydown", (e) => {
      if (e.keycode === UiohookKey.Ctrl || e.keycode === UiohookKey.CtrlRight) {
        this.modifierState.ctrl = true;
        return;
      }
      if (e.keycode === UiohookKey.Alt || e.keycode === UiohookKey.AltRight) {
        this.modifierState.alt = true;
        return;
      }
      if (e.keycode === UiohookKey.Shift || e.keycode === UiohookKey.ShiftRight) {
        this.modifierState.shift = true;
        return;
      }
      if (e.keycode === UiohookKey.Meta || e.keycode === UiohookKey.MetaRight) {
        this.modifierState.meta = true;
        return;
      }
      for (const [accelerator, { callback, parsed }] of this.hotkeyMap) {
        if (this.matchHotkey(e.keycode, parsed)) {
          console.log(`🎮 [GlobalHotkeyManager] 快捷键 ${accelerator} 被触发`);
          callback();
          break;
        }
      }
    });
    uIOhook.on("keyup", (e) => {
      if (e.keycode === UiohookKey.Ctrl || e.keycode === UiohookKey.CtrlRight) {
        this.modifierState.ctrl = false;
      }
      if (e.keycode === UiohookKey.Alt || e.keycode === UiohookKey.AltRight) {
        this.modifierState.alt = false;
      }
      if (e.keycode === UiohookKey.Shift || e.keycode === UiohookKey.ShiftRight) {
        this.modifierState.shift = false;
      }
      if (e.keycode === UiohookKey.Meta || e.keycode === UiohookKey.MetaRight) {
        this.modifierState.meta = false;
      }
    });
    uIOhook.start();
    this.isStarted = true;
    console.log("🎮 [GlobalHotkeyManager] 低级键盘钩子已启动");
  }
  /**
   * 停止键盘监听
   */
  stop() {
    if (!this.isStarted) return;
    uIOhook.stop();
    this.isStarted = false;
    this.hotkeyMap.clear();
    console.log("🎮 [GlobalHotkeyManager] 低级键盘钩子已停止");
  }
  /**
   * 注册快捷键
   * @param accelerator Electron Accelerator 格式的快捷键字符串，如 "Ctrl+F1"
   * @param callback 快捷键触发时的回调函数
   * @returns 是否注册成功
   */
  register(accelerator, callback) {
    if (!accelerator) {
      console.error("[GlobalHotkeyManager] 快捷键不能为空");
      return false;
    }
    const parsed = this.parseAccelerator(accelerator);
    if (!parsed.key) {
      console.error(`[GlobalHotkeyManager] 无效的快捷键格式: ${accelerator}`);
      return false;
    }
    if (!this.isStarted) {
      this.start();
    }
    this.hotkeyMap.set(accelerator, { callback, parsed });
    console.log(`✅ [GlobalHotkeyManager] 快捷键 ${accelerator} 注册成功`);
    return true;
  }
  /**
   * 注销快捷键
   * @param accelerator 要注销的快捷键
   */
  unregister(accelerator) {
    if (this.hotkeyMap.delete(accelerator)) {
      console.log(`🎮 [GlobalHotkeyManager] 快捷键 ${accelerator} 已注销`);
    }
  }
  /**
   * 注销所有快捷键
   */
  unregisterAll() {
    this.hotkeyMap.clear();
    console.log("🎮 [GlobalHotkeyManager] 所有快捷键已注销");
  }
  /**
   * 检查是否已注册某个快捷键
   */
  isRegistered(accelerator) {
    return this.hotkeyMap.has(accelerator);
  }
}
const globalHotkeyManager = GlobalHotkeyManager.getInstance();
process.env.APP_ROOT = path__default.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path__default.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path__default.join(process.env.APP_ROOT);
process.env.VITE_PUBLIC = is.dev ? path__default.join(process.env.APP_ROOT, "../public") : RENDERER_DIST;
let win;
let currentToggleHotkey = null;
let currentStopAfterGameHotkey = null;
function registerToggleHotkey(accelerator) {
  if (currentToggleHotkey) {
    globalHotkeyManager.unregister(currentToggleHotkey);
    currentToggleHotkey = null;
  }
  if (!accelerator) {
    console.log("🎮 [Main] 挂机快捷键已取消绑定");
    return true;
  }
  const success = globalHotkeyManager.register(accelerator, async () => {
    console.log(`🎮 [Main] 快捷键 ${accelerator} 被触发，切换挂机状态`);
    hexService.isRunning ? await hexService.stop() : await hexService.start();
    win?.webContents.send(IpcChannel.HEX_TOGGLE_TRIGGERED, hexService.isRunning);
  });
  if (success) {
    currentToggleHotkey = accelerator;
  }
  return success;
}
function registerStopAfterGameHotkey(accelerator) {
  if (currentStopAfterGameHotkey) {
    globalHotkeyManager.unregister(currentStopAfterGameHotkey);
    currentStopAfterGameHotkey = null;
  }
  if (!accelerator) {
    console.log('🎮 [Main] "本局结束后停止"快捷键已取消绑定');
    return true;
  }
  const success = globalHotkeyManager.register(accelerator, () => {
    console.log(`🎮 [Main] 快捷键 ${accelerator} 被触发，切换"本局结束后停止"状态`);
    const newState = hexService.toggleStopAfterCurrentGame();
    win?.webContents.send(IpcChannel.HEX_STOP_AFTER_GAME_TRIGGERED, newState);
  });
  if (success) {
    currentStopAfterGameHotkey = accelerator;
  }
  return success;
}
function createWindow() {
  const savedWindowInfo = settingsStore.get("window");
  win = new BrowserWindow({
    icon: path__default.join(process.env.VITE_PUBLIC, "icon.png"),
    //  窗口左上角的图标
    autoHideMenuBar: true,
    webPreferences: {
      preload: path__default.join(__dirname, "../preload/preload.cjs"),
      // 指定preload文件
      sandbox: false
    },
    ...savedWindowInfo.bounds || { width: 1024, height: 600 }
    //  控制窗口位置,第一次打开不会有保存值，就用默认的
  });
  console.log("图标路径为：" + path__default.join(process.env.VITE_PUBLIC, "icon.png"));
  optimizer.watchWindowShortcuts(win);
  const debouncedSaveBounds = debounce(() => {
    if (!win?.isMaximized() && !win?.isFullScreen()) {
      settingsStore.set("window.bounds", win?.getBounds());
    }
  }, 500);
  win.on("resize", debouncedSaveBounds);
  win.on("move", debouncedSaveBounds);
  win.on("close", () => {
    settingsStore.set("window.isMaximized", win.isMaximized());
  });
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    console.log("Renderer URL:", process.env.ELECTRON_RENDERER_URL);
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(path__default.join(__dirname, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.on("will-quit", () => {
  globalHotkeyManager.stop();
});
app.whenReady().then(async () => {
  createWindow();
  init();
  registerHandler();
  const lineupCount = await lineupLoader.loadAllLineups();
  console.log(`📦 [Main] 已加载 ${lineupCount} 个阵容配置`);
  const savedHotkey = settingsStore.get("toggleHotkeyAccelerator");
  registerToggleHotkey(savedHotkey);
  const savedStopAfterGameHotkey = settingsStore.get("stopAfterGameHotkeyAccelerator");
  registerStopAfterGameHotkey(savedStopAfterGameHotkey);
});
function init() {
  logger.init(win);
  const logMode = settingsStore.get("logMode");
  logger.setMinLevel(logMode === "DETAILED" ? "debug" : "info");
  const connector = new LCUConnector();
  tftOperator.init();
  connector.on("connect", (data) => {
    console.log("LOL客户端已登录！", data);
    const lcuManager = LCUManager.init(data);
    GameConfigHelper.init(data.installDirectory);
    lcuManager.start();
    lcuManager.on("connect", async () => {
      win?.webContents.send(IpcChannel.LCU_CONNECT);
    });
    lcuManager.on("disconnect", () => {
      console.log("LCUManager 已断开");
      win?.webContents.send(IpcChannel.LCU_DISCONNECT);
      console.log("🔄 [Main] 重新启动 LCU 连接监听...");
      connector.start();
    });
    lcuManager.on("lcu-event", (event) => {
      console.log("收到LCU事件:", event.uri, event.eventType);
    });
  });
  connector.on("disconnect", () => {
    console.log("LOL客户端登出！");
    win?.webContents.send(IpcChannel.LCU_DISCONNECT);
  });
  connector.start();
}
function registerHandler() {
  ipcMain.handle(IpcChannel.LCU_GET_CONNECTION_STATUS, async () => {
    const lcu = LCUManager.getInstance();
    return lcu?.isConnected ?? false;
  });
  ipcMain.handle(IpcChannel.LCU_REQUEST, async (_event, method, endpoint, body) => {
    const lcu = LCUManager.getInstance();
    if (!lcu || !lcu.isConnected) {
      console.error("❌ [IPC] LCUManager 尚未连接，无法处理请求");
      return { error: "LCU is not connected yet." };
    }
    try {
      console.log(`📞 [IPC] 收到请求: ${method} ${endpoint}`);
      const data = await lcu.request(method, endpoint, body);
      return { data };
    } catch (e) {
      console.error(`❌ [IPC] 处理请求 ${method} ${endpoint} 时出错:`, e);
      return { error: e.message };
    }
  });
  ipcMain.handle(IpcChannel.CONFIG_BACKUP, async (event) => GameConfigHelper.backup());
  ipcMain.handle(IpcChannel.CONFIG_RESTORE, async (event) => GameConfigHelper.restore());
  ipcMain.handle(IpcChannel.HEX_START, async (event) => hexService.start());
  ipcMain.handle(IpcChannel.HEX_STOP, async (event) => hexService.stop());
  ipcMain.handle(IpcChannel.HEX_GET_STATUS, async (event) => hexService.isRunning);
  ipcMain.handle(IpcChannel.TFT_BUY_AT_SLOT, async (event, slot) => tftOperator.buyAtSlot(slot));
  ipcMain.handle(IpcChannel.TFT_GET_SHOP_INFO, async (event) => tftOperator.getShopInfo());
  ipcMain.handle(IpcChannel.TFT_GET_EQUIP_INFO, async (event) => tftOperator.getEquipInfo());
  ipcMain.handle(IpcChannel.TFT_GET_BENCH_INFO, async (event) => tftOperator.getBenchInfo());
  ipcMain.handle(IpcChannel.TFT_GET_FIGHT_BOARD_INFO, async (event) => tftOperator.getFightBoardInfo());
  ipcMain.handle(IpcChannel.TFT_GET_LEVEL_INFO, async (event) => tftOperator.getLevelInfo());
  ipcMain.handle(IpcChannel.TFT_GET_COIN_COUNT, async (event) => tftOperator.getCoinCount());
  ipcMain.handle(IpcChannel.TFT_GET_LOOT_ORBS, async (event) => tftOperator.getLootOrbs());
  ipcMain.handle(IpcChannel.TFT_TEST_SAVE_BENCH_SLOT_SNAPSHOT, async (event) => tftOperator.saveBenchSlotSnapshots());
  ipcMain.handle(IpcChannel.TFT_TEST_SAVE_FIGHT_BOARD_SLOT_SNAPSHOT, async (event) => tftOperator.saveFightBoardSlotSnapshots());
  ipcMain.handle(IpcChannel.LINEUP_GET_ALL, async () => lineupLoader.getAllLineups());
  ipcMain.handle(IpcChannel.LINEUP_GET_BY_ID, async (_event, id) => lineupLoader.getLineup(id));
  ipcMain.handle(IpcChannel.LINEUP_GET_SELECTED_IDS, async () => settingsStore.get("selectedLineupIds"));
  ipcMain.handle(IpcChannel.LINEUP_SET_SELECTED_IDS, async (_event, ids) => {
    settingsStore.set("selectedLineupIds", ids);
  });
  ipcMain.handle(IpcChannel.TFT_GET_CHAMPION_CN_TO_EN_MAP, async () => {
    const cnToEnMap = {};
    for (const [cnName, unitData] of Object.entries(TFT_16_CHAMPION_DATA)) {
      cnToEnMap[cnName] = unitData.englishId;
    }
    return cnToEnMap;
  });
  ipcMain.handle(IpcChannel.TFT_GET_MODE, async () => settingsStore.get("tftMode"));
  ipcMain.handle(IpcChannel.TFT_SET_MODE, async (_event, mode) => {
    settingsStore.set("tftMode", mode);
  });
  ipcMain.handle(IpcChannel.LOG_GET_MODE, async () => settingsStore.get("logMode"));
  ipcMain.handle(IpcChannel.LOG_SET_MODE, async (_event, mode) => {
    settingsStore.set("logMode", mode);
    logger.setMinLevel(mode === "DETAILED" ? "debug" : "info");
  });
  ipcMain.handle(IpcChannel.LOG_GET_AUTO_CLEAN_THRESHOLD, async () => settingsStore.get("logAutoCleanThreshold"));
  ipcMain.handle(IpcChannel.LOG_SET_AUTO_CLEAN_THRESHOLD, async (_event, threshold) => {
    settingsStore.set("logAutoCleanThreshold", threshold);
  });
  ipcMain.handle(IpcChannel.LCU_KILL_GAME_PROCESS, async () => {
    const lcu = LCUManager.getInstance();
    return lcu?.killGameProcess() ?? false;
  });
  ipcMain.handle(IpcChannel.HOTKEY_GET_TOGGLE, async () => {
    return settingsStore.get("toggleHotkeyAccelerator");
  });
  ipcMain.handle(IpcChannel.HOTKEY_SET_TOGGLE, async (_event, accelerator) => {
    const success = registerToggleHotkey(accelerator);
    if (success) {
      settingsStore.set("toggleHotkeyAccelerator", accelerator);
    }
    return success;
  });
  ipcMain.handle(IpcChannel.HOTKEY_GET_STOP_AFTER_GAME, async () => {
    return settingsStore.get("stopAfterGameHotkeyAccelerator");
  });
  ipcMain.handle(IpcChannel.HOTKEY_SET_STOP_AFTER_GAME, async (_event, accelerator) => {
    const success = registerStopAfterGameHotkey(accelerator);
    if (success) {
      settingsStore.set("stopAfterGameHotkeyAccelerator", accelerator);
    }
    return success;
  });
  ipcMain.handle(IpcChannel.HEX_GET_STOP_AFTER_GAME, async () => {
    return hexService.stopAfterCurrentGame;
  });
  ipcMain.handle(IpcChannel.HEX_TOGGLE_STOP_AFTER_GAME, async () => {
    const newState = hexService.toggleStopAfterCurrentGame();
    win?.webContents.send(IpcChannel.HEX_STOP_AFTER_GAME_TRIGGERED, newState);
    return newState;
  });
  ipcMain.handle(IpcChannel.SETTINGS_GET, async (_event, key) => {
    return settingsStore.get(key);
  });
  ipcMain.handle(IpcChannel.SETTINGS_SET, async (_event, key, value) => {
    settingsStore.set(key, value);
  });
  ipcMain.handle(IpcChannel.UTIL_IS_ELEVATED, async () => {
    return new Promise((resolve) => {
      exec("net session", (error) => {
        resolve(!error);
      });
    });
  });
}
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
