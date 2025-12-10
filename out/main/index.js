import { app, screen as screen$1, BrowserWindow, globalShortcut, ipcMain } from "electron";
import { EventEmitter } from "events";
import require$$1 from "os";
import cp from "child_process";
import path$1 from "node:path";
import require$$0$2 from "fs";
import require$$0 from "constants";
import require$$0$1 from "stream";
import require$$4 from "util";
import require$$5 from "assert";
import path from "path";
import WebSocket from "ws";
import https from "https";
import axios from "axios";
import { Point, Region, screen, Button, mouse } from "@nut-tree-fork/nut-js";
import sharp from "sharp";
import cv from "@techstark/opencv-js";
import { createWorker, PSM } from "tesseract.js";
import Store from "electron-store";
import { is, optimizer } from "@electron-toolkit/utils";
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
  var fs2 = require$$0$2;
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
  const path$12 = path;
  function getRootPath(p) {
    p = path$12.normalize(path$12.resolve(p)).split(path$12.sep);
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
  const path$12 = path;
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
    p = path$12.resolve(p);
    xfs.mkdir(p, mode, (er) => {
      if (!er) {
        made = made || p;
        return callback(null, made);
      }
      switch (er.code) {
        case "ENOENT":
          if (path$12.dirname(p) === p) return callback(er);
          mkdirs(path$12.dirname(p), opts, (er2, made2) => {
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
  const path$12 = path;
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
    p = path$12.resolve(p);
    try {
      xfs.mkdirSync(p, mode);
      made = made || p;
    } catch (err0) {
      if (err0.code === "ENOENT") {
        if (path$12.dirname(p) === p) throw err0;
        made = mkdirsSync(path$12.dirname(p), opts, made);
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
  const path$12 = path;
  function hasMillisResSync() {
    let tmpfile = path$12.join("millis-test-sync" + Date.now().toString() + Math.random().toString().slice(2));
    tmpfile = path$12.join(os.tmpdir(), tmpfile);
    const d = /* @__PURE__ */ new Date(1435410243862);
    fs2.writeFileSync(tmpfile, "https://github.com/jprichardson/node-fs-extra/pull/141");
    const fd = fs2.openSync(tmpfile, "r+");
    fs2.futimesSync(fd, d, d);
    fs2.closeSync(fd);
    return fs2.statSync(tmpfile).mtime > 1435410243e3;
  }
  function hasMillisRes(callback) {
    let tmpfile = path$12.join("millis-test" + Date.now().toString() + Math.random().toString().slice(2));
    tmpfile = path$12.join(os.tmpdir(), tmpfile);
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
  function utimesMillis(path2, atime, mtime, callback) {
    fs2.open(path2, "r+", (err, fd) => {
      if (err) return callback(err);
      fs2.futimes(fd, atime, mtime, (futimesErr) => {
        fs2.close(fd, (closeErr) => {
          if (callback) callback(futimesErr || closeErr);
        });
      });
    });
  }
  function utimesMillisSync(path2, atime, mtime) {
    const fd = fs2.openSync(path2, "r+");
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
  const path$12 = path;
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
    const srcParent = path$12.resolve(path$12.dirname(src));
    const destParent = path$12.resolve(path$12.dirname(dest));
    if (destParent === srcParent || destParent === path$12.parse(destParent).root) return cb();
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
    const srcParent = path$12.resolve(path$12.dirname(src));
    const destParent = path$12.resolve(path$12.dirname(dest));
    if (destParent === srcParent || destParent === path$12.parse(destParent).root) return;
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
    const srcArr = path$12.resolve(src).split(path$12.sep).filter((i) => i);
    const destArr = path$12.resolve(dest).split(path$12.sep).filter((i) => i);
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
  const path$12 = path;
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
    const destParent = path$12.dirname(dest);
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
    const srcItem = path$12.join(src, item);
    const destItem = path$12.join(dest, item);
    const { destStat } = stat2.checkPathsSync(srcItem, destItem, "copy");
    return startCopy(destStat, srcItem, destItem, opts);
  }
  function onLink(destStat, src, dest, opts) {
    let resolvedSrc = fs2.readlinkSync(src);
    if (opts.dereference) {
      resolvedSrc = path$12.resolve(process.cwd(), resolvedSrc);
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
        resolvedDest = path$12.resolve(process.cwd(), resolvedDest);
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
  const path$12 = path;
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
    const destParent = path$12.dirname(dest);
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
    const srcItem = path$12.join(src, item);
    const destItem = path$12.join(dest, item);
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
        resolvedSrc = path$12.resolve(process.cwd(), resolvedSrc);
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
            resolvedDest = path$12.resolve(process.cwd(), resolvedDest);
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
  const path$12 = path;
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
        rimraf(path$12.join(p, f), options, (er2) => {
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
    options.readdirSync(p).forEach((f) => rimrafSync(path$12.join(p, f), options));
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
  const path$12 = path;
  const mkdir = requireMkdirs();
  const remove2 = requireRemove();
  const emptyDir = u(function emptyDir2(dir, callback) {
    callback = callback || function() {
    };
    fs2.readdir(dir, (err, items) => {
      if (err) return mkdir.mkdirs(dir, callback);
      items = items.map((item) => path$12.join(dir, item));
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
      item = path$12.join(dir, item);
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
  const path$12 = path;
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
      const dir = path$12.dirname(file2);
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
    const dir = path$12.dirname(file2);
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
  const path$12 = path;
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
        const dir = path$12.dirname(dstpath);
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
    const dir = path$12.dirname(dstpath);
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
  const path$12 = path;
  const fs2 = requireGracefulFs();
  const pathExists = requirePathExists().pathExists;
  function symlinkPaths(srcpath, dstpath, callback) {
    if (path$12.isAbsolute(srcpath)) {
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
      const dstdir = path$12.dirname(dstpath);
      const relativeToDst = path$12.join(dstdir, srcpath);
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
              "toDst": path$12.relative(dstdir, srcpath)
            });
          });
        }
      });
    }
  }
  function symlinkPathsSync(srcpath, dstpath) {
    let exists;
    if (path$12.isAbsolute(srcpath)) {
      exists = fs2.existsSync(srcpath);
      if (!exists) throw new Error("absolute srcpath does not exist");
      return {
        "toCwd": srcpath,
        "toDst": srcpath
      };
    } else {
      const dstdir = path$12.dirname(dstpath);
      const relativeToDst = path$12.join(dstdir, srcpath);
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
          "toDst": path$12.relative(dstdir, srcpath)
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
  const path$12 = path;
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
          const dir = path$12.dirname(dstpath);
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
    const dir = path$12.dirname(dstpath);
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
    _fs = require$$0$2;
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
  const path$12 = path;
  const mkdir = requireMkdirs();
  const pathExists = requirePathExists().pathExists;
  const jsonFile = requireJsonfile();
  function outputJson(file2, data, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    const dir = path$12.dirname(file2);
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
  const path$12 = path;
  const mkdir = requireMkdirs();
  const jsonFile = requireJsonfile();
  function outputJsonSync(file2, data, options) {
    const dir = path$12.dirname(file2);
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
  const path$12 = path;
  const copySync2 = requireCopySync().copySync;
  const removeSync = requireRemove().removeSync;
  const mkdirpSync = requireMkdirs().mkdirpSync;
  const stat2 = requireStat();
  function moveSync2(src, dest, opts) {
    opts = opts || {};
    const overwrite = opts.overwrite || opts.clobber || false;
    const { srcStat } = stat2.checkPathsSync(src, dest, "move");
    stat2.checkParentPathsSync(src, srcStat, dest, "move");
    mkdirpSync(path$12.dirname(dest));
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
  const path$12 = path;
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
        mkdirp(path$12.dirname(dest), (err3) => {
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
  const path$12 = path;
  const mkdir = requireMkdirs();
  const pathExists = requirePathExists().pathExists;
  function outputFile(file2, data, encoding, callback) {
    if (typeof encoding === "function") {
      callback = encoding;
      encoding = "utf8";
    }
    const dir = path$12.dirname(file2);
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
    const dir = path$12.dirname(file2);
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
    const fs2 = require$$0$2;
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
   */
  warn(message) {
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
  processWatcher;
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
          resolve();
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
    clearInterval(this.processWatcher);
  }
}
var LcuEventUri = /* @__PURE__ */ ((LcuEventUri2) => {
  LcuEventUri2["READY_CHECK"] = "/lol-matchmaking/v1/ready-check";
  LcuEventUri2["GAMEFLOW_PHASE"] = "/lol-gameflow/v1/session";
  LcuEventUri2["CHAMP_SELECT"] = "/lol-champ-select/v1/session";
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
    var path$12 = path;
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
    retrieveFileHandlers.push(function(path2) {
      path2 = path2.trim();
      if (/^file:/.test(path2)) {
        path2 = path2.replace(/file:\/\/\/(\w:)?/, function(protocol, drive) {
          return drive ? "" : (
            // file:///C:/dir/file -> C:/dir/file
            "/"
          );
        });
      }
      if (path2 in fileContentsCache) {
        return fileContentsCache[path2];
      }
      var contents = "";
      try {
        if (!fs2) {
          var xhr = new XMLHttpRequest();
          xhr.open(
            "GET",
            path2,
            /** async */
            false
          );
          xhr.send(null);
          if (xhr.readyState === 4 && xhr.status === 200) {
            contents = xhr.responseText;
          }
        } else if (fs2.existsSync(path2)) {
          contents = fs2.readFileSync(path2, "utf8");
        }
      } catch (er) {
      }
      return fileContentsCache[path2] = contents;
    });
    function supportRelativeURL(file2, url) {
      if (!file2) return url;
      var dir = path$12.dirname(file2);
      var match = /^\w+:\/\/[^\/]*/.exec(dir);
      var protocol = match ? match[0] : "";
      var startPath = dir.slice(protocol.length);
      if (protocol && /^\/\w\:/.test(startPath)) {
        protocol += "/";
        return protocol + path$12.resolve(dir.slice(protocol.length), url).replace(/\\/g, "/");
      }
      return protocol + path$12.resolve(dir.slice(protocol.length), url);
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
    this.gameConfigPath = path.join(this.installPath, "Game", "Config");
    this.backupPath = path.join(app.getPath("userData"), "GameConfigBackup");
    this.tftConfigPath = path.join(app.getAppPath(), "public", "GameConfig", "TFTConfig");
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
   */
  static async restore() {
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
    try {
      await fs.copy(instance.backupPath, instance.gameConfigPath);
      logger.info("设置恢复成功！");
    } catch (err) {
      console.error("恢复过程中发生错误:", err);
      return false;
    }
    return true;
  }
}
var IpcChannel = /* @__PURE__ */ ((IpcChannel2) => {
  IpcChannel2["CONFIG_BACKUP"] = "config-backup";
  IpcChannel2["CONFIG_RESTORE"] = "config-restore";
  IpcChannel2["LCU_REQUEST"] = "lcu-request";
  IpcChannel2["HEX_START"] = "hex-start";
  IpcChannel2["HEX_STOP"] = "hex-stop";
  IpcChannel2["TFT_BUY_AT_SLOT"] = "tft-buy-at-slot";
  IpcChannel2["TFT_GET_SHOP_INFO"] = "tft-get-shop-info";
  IpcChannel2["TFT_GET_EQUIP_INFO"] = "tft-get-equip-info";
  IpcChannel2["TFT_GET_BENCH_INFO"] = "tft-get-bench-info";
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
class EndState {
  /** 状态名称 */
  name = "EndState";
  /**
   * 执行结束状态逻辑
   * @param _signal AbortSignal (此状态不需要，但为保持接口一致性保留)
   * @returns 返回 IdleState，回到空闲状态
   */
  async action(_signal) {
    logger.info("[EndState] 正在恢复客户端设置...");
    try {
      await GameConfigHelper.restore();
      logger.info("[EndState] 客户端设置恢复完成");
    } catch (error) {
      logger.error("[EndState] 恢复设置失败，可能需要手动恢复");
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
var GameStageType = /* @__PURE__ */ ((GameStageType2) => {
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
  TFTMode2[TFTMode2["CLOCKWORK_TRAILS"] = void 0] = "CLOCKWORK_TRAILS";
  return TFTMode2;
})(TFTMode || {});
const shopSlot = {
  SHOP_SLOT_1: new Point(240, 700),
  SHOP_SLOT_2: new Point(380, 700),
  SHOP_SLOT_3: new Point(520, 700),
  SHOP_SLOT_4: new Point(660, 700),
  SHOP_SLOT_5: new Point(800, 700)
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
const detailChampionStarRegion = {
  leftTop: { x: 919, y: 122 },
  rightBottom: { x: 974, y: 132 }
};
({
  EQ_SLOT_1: new Point(20, 210),
  //+35
  EQ_SLOT_2: new Point(20, 245),
  EQ_SLOT_3: new Point(20, 280),
  EQ_SLOT_4: new Point(20, 315),
  EQ_SLOT_5: new Point(20, 350),
  EQ_SLOT_6: new Point(20, 385),
  EQ_SLOT_7: new Point(20, 430),
  //   这里重置下准确位置
  EQ_SLOT_8: new Point(20, 465),
  EQ_SLOT_9: new Point(20, 500),
  EQ_SLOT_10: new Point(20, 535)
});
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
({
  // x+=80
  //  第一行的棋子位置
  R1_C1: new Point(230, 315),
  R1_C2: new Point(310, 315),
  R1_C3: new Point(390, 315),
  R1_C4: new Point(470, 315),
  R1_C5: new Point(550, 315),
  R1_C6: new Point(630, 315),
  R1_C7: new Point(710, 315),
  //  第二行的棋子位置        //  x+=85
  R2_C1: new Point(260, 370),
  R2_C2: new Point(345, 370),
  R2_C3: new Point(430, 370),
  R2_C4: new Point(515, 370),
  R2_C5: new Point(600, 370),
  R2_C6: new Point(685, 370),
  R2_C7: new Point(770, 370),
  //  第三行棋子的位置        //  x+=90
  R3_C1: new Point(200, 420),
  R3_C2: new Point(290, 420),
  R3_C3: new Point(380, 420),
  R3_C4: new Point(470, 420),
  R3_C5: new Point(560, 420),
  R3_C6: new Point(650, 420),
  R3_C7: new Point(740, 420),
  //  第四行棋子的位置        //  x+=90
  R4_C1: new Point(240, 475),
  R4_C2: new Point(330, 475),
  R4_C3: new Point(420, 475),
  R4_C4: new Point(510, 475),
  R4_C5: new Point(600, 475),
  R4_C6: new Point(690, 475),
  R4_C7: new Point(780, 475)
});
const benchSlotPoints = {
  SLOT_1: new Point(135, 555),
  SLOT_2: new Point(210, 555),
  SLOT_3: new Point(295, 555),
  SLOT_4: new Point(385, 555),
  SLOT_5: new Point(465, 555),
  SLOT_6: new Point(550, 555),
  SLOT_7: new Point(630, 555),
  SLOT_8: new Point(720, 555),
  SLOT_9: new Point(800, 555)
};
({
  //  x+=295
  SLOT_1: new Point(215, 410),
  SLOT_2: new Point(510, 410),
  SLOT_3: new Point(805, 410)
});
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
const TFT_16_CHAMPION_DATA = {
  // 1 费棋子
  "俄洛伊": {
    displayName: "俄洛伊",
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
    ]
  },
  "贝蕾亚": {
    displayName: "贝蕾亚",
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
    ]
  },
  "艾尼维亚": {
    displayName: "艾尼维亚",
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
    ]
  },
  "嘉文四世": {
    displayName: "嘉文四世",
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
    ]
  },
  "烬": {
    displayName: "烬",
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
    ]
  },
  "凯特琳": {
    displayName: "凯特琳",
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
    ]
  },
  "克格莫": {
    displayName: "克格莫",
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
    ]
  },
  "璐璐": {
    displayName: "璐璐",
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
    ]
  },
  "奇亚娜": {
    displayName: "奇亚娜",
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
    ]
  },
  "兰博": {
    displayName: "兰博",
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
    ]
  },
  "慎": {
    displayName: "慎",
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
    ]
  },
  "娑娜": {
    displayName: "娑娜",
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
    ]
  },
  "佛耶戈": {
    displayName: "佛耶戈",
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
    ]
  },
  "布里茨": {
    displayName: "布里茨",
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
    ]
  },
  // 2 费棋子
  "厄斐琉斯": {
    displayName: "厄斐琉斯",
    price: 2,
    traits: [
      "巨神峰"
      /* Targon */
    ],
    origins: [
      "巨神峰"
      /* Targon */
    ],
    classes: []
  },
  "艾希": {
    displayName: "艾希",
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
    ]
  },
  "科加斯": {
    displayName: "科加斯",
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
    ]
  },
  "崔斯特": {
    displayName: "崔斯特",
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
    ]
  },
  "艾克": {
    displayName: "艾克",
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
    ]
  },
  "格雷福斯": {
    displayName: "格雷福斯",
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
    ]
  },
  "妮蔻": {
    displayName: "妮蔻",
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
    ]
  },
  "奥莉安娜": {
    displayName: "奥莉安娜",
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
    ]
  },
  "波比": {
    displayName: "波比",
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
    ]
  },
  "雷克塞": {
    displayName: "雷克塞",
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
    ]
  },
  "赛恩": {
    displayName: "赛恩",
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
    ]
  },
  "提莫": {
    displayName: "提莫",
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
    ]
  },
  "崔丝塔娜": {
    displayName: "崔丝塔娜",
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
    ]
  },
  "蔚": {
    displayName: "蔚",
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
    ]
  },
  "亚索": {
    displayName: "亚索",
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
    ]
  },
  "约里克": {
    displayName: "约里克",
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
    ]
  },
  "赵信": {
    displayName: "赵信",
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
    ]
  },
  // 3 费棋子
  "阿狸": {
    displayName: "阿狸",
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
    ]
  },
  "巴德": {
    displayName: "巴德",
    price: 3,
    traits: [
      "星界游神"
      /* Caretaker */
    ],
    origins: [
      "星界游神"
      /* Caretaker */
    ],
    classes: []
  },
  "德莱文": {
    displayName: "德莱文",
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
    ]
  },
  "德莱厄斯": {
    displayName: "德莱厄斯",
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
    ]
  },
  "格温": {
    displayName: "格温",
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
    ]
  },
  "金克丝": {
    displayName: "金克丝",
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
    ]
  },
  "凯南": {
    displayName: "凯南",
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
    ]
  },
  "可酷伯与悠米": {
    displayName: "可酷伯与悠米",
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
    ]
  },
  "乐芙兰": {
    displayName: "乐芙兰",
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
    ]
  },
  "洛里斯": {
    displayName: "洛里斯",
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
    ]
  },
  "玛尔扎哈": {
    displayName: "玛尔扎哈",
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
    ]
  },
  "米利欧": {
    displayName: "米利欧",
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
    ]
  },
  "诺提勒斯": {
    displayName: "诺提勒斯",
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
    ]
  },
  "普朗克": {
    displayName: "普朗克",
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
    ]
  },
  "瑟庄妮": {
    displayName: "瑟庄妮",
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
    ]
  },
  "薇恩": {
    displayName: "薇恩",
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
    ]
  },
  // 4 费棋子
  "安蓓萨": {
    displayName: "安蓓萨",
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
    ]
  },
  "卑尔维斯": {
    displayName: "卑尔维斯",
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
    ]
  },
  "布隆": {
    displayName: "布隆",
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
    ]
  },
  "黛安娜": {
    displayName: "黛安娜",
    price: 4,
    traits: [
      "巨神峰"
      /* Targon */
    ],
    origins: [
      "巨神峰"
      /* Targon */
    ],
    classes: []
  },
  "盖伦": {
    displayName: "盖伦",
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
    ]
  },
  "卡莉丝塔": {
    displayName: "卡莉丝塔",
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
    ]
  },
  "卡莎": {
    displayName: "卡莎",
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
    ]
  },
  "蕾欧娜": {
    displayName: "蕾欧娜",
    price: 4,
    traits: [
      "巨神峰"
      /* Targon */
    ],
    origins: [
      "巨神峰"
      /* Targon */
    ],
    classes: []
  },
  "丽桑卓": {
    displayName: "丽桑卓",
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
    ]
  },
  "拉克丝": {
    displayName: "拉克丝",
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
    ]
  },
  "厄运小姐": {
    displayName: "厄运小姐",
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
    ]
  },
  "内瑟斯": {
    displayName: "内瑟斯",
    price: 4,
    traits: [
      "恕瑞玛"
      /* Shurima */
    ],
    origins: [
      "恕瑞玛"
      /* Shurima */
    ],
    classes: []
  },
  "奈德丽": {
    displayName: "奈德丽",
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
    classes: []
  },
  "雷克顿": {
    displayName: "雷克顿",
    price: 4,
    traits: [
      "恕瑞玛"
      /* Shurima */
    ],
    origins: [
      "恕瑞玛"
      /* Shurima */
    ],
    classes: []
  },
  "萨勒芬妮": {
    displayName: "萨勒芬妮",
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
    ]
  },
  "辛吉德": {
    displayName: "辛吉德",
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
    ]
  },
  "斯卡纳": {
    displayName: "斯卡纳",
    price: 4,
    traits: [
      "以绪塔尔"
      /* Ixtal */
    ],
    origins: [
      "以绪塔尔"
      /* Ixtal */
    ],
    classes: []
  },
  "斯维因": {
    displayName: "斯维因",
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
    ]
  },
  "孙悟空": {
    displayName: "孙悟空",
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
    ]
  },
  "塔里克": {
    displayName: "塔里克",
    price: 4,
    traits: [
      "巨神峰"
      /* Targon */
    ],
    origins: [
      "巨神峰"
      /* Targon */
    ],
    classes: []
  },
  "维迦": {
    displayName: "维迦",
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
    ]
  },
  "沃里克": {
    displayName: "沃里克",
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
    ]
  },
  "永恩": {
    displayName: "永恩",
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
    ]
  },
  "芸阿娜": {
    displayName: "芸阿娜",
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
    ]
  },
  // 5 费棋子
  "亚托克斯": {
    displayName: "亚托克斯",
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
    ]
  },
  "安妮": {
    displayName: "安妮",
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
    ]
  },
  "阿兹尔": {
    displayName: "阿兹尔",
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
    ]
  },
  "费德提克": {
    displayName: "费德提克",
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
    ]
  },
  "吉格斯": {
    displayName: "吉格斯",
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
    ]
  },
  "加里奥": {
    displayName: "加里奥",
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
    classes: []
  },
  "基兰": {
    displayName: "基兰",
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
    ]
  },
  "千珏": {
    displayName: "千珏",
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
    ]
  },
  "卢锡安与赛娜": {
    displayName: "卢锡安与赛娜",
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
    ]
  },
  "梅尔": {
    displayName: "梅尔",
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
    ]
  },
  "奥恩": {
    displayName: "奥恩",
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
    ]
  },
  "瑟提": {
    displayName: "瑟提",
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
    classes: []
  },
  "希瓦娜": {
    displayName: "希瓦娜",
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
    ]
  },
  "塔姆": {
    displayName: "塔姆",
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
    ]
  },
  "锤石": {
    displayName: "锤石",
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
    ]
  },
  "沃利贝尔": {
    displayName: "沃利贝尔",
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
    ]
  },
  // 特殊/高费羁绊单位（价格 7）
  "奥瑞利安·索尔": {
    displayName: "奥瑞利安·索尔",
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
    classes: []
  },
  "纳什男爵": {
    displayName: "纳什男爵",
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
    classes: []
  },
  "瑞兹": {
    displayName: "瑞兹",
    price: 7,
    traits: [
      "符文法师"
      /* RuneMage */
    ],
    origins: [
      "符文法师"
      /* RuneMage */
    ],
    classes: []
  },
  "亚恒": {
    displayName: "亚恒",
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
    classes: []
  }
};
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
const TFT_16_EQUIP_DATA = {
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
  return OcrWorkerType2;
})(OcrWorkerType || {});
class OcrService {
  static instance;
  /** 游戏阶段识别 Worker (英文+数字) */
  gameStageWorker = null;
  /** 棋子名称识别 Worker (中文) */
  chessWorker = null;
  /** Tesseract 语言包路径 */
  get langPath() {
    return path.join(process.env.VITE_PUBLIC || ".", "resources/tessdata");
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
  /** 空装备槽位模板 (24x24 纯黑) */
  emptyEquipSlotTemplate = null;
  /** 文件监听器防抖定时器 */
  watcherDebounceTimer = null;
  /** 模板加载完成标志 */
  isLoaded = false;
  // ========== 路径 Getter ==========
  get championTemplatePath() {
    return path.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/champion");
  }
  get equipTemplatePath() {
    return path.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/equipment");
  }
  get starLevelTemplatePath() {
    return path.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/starLevel");
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
      this.loadStarLevelTemplates()
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
      const resourcePath = path.join(this.equipTemplatePath, category);
      const categoryMap = /* @__PURE__ */ new Map();
      if (!fs.existsSync(resourcePath)) {
        logger.warn(`[TemplateLoader] 装备模板目录不存在: ${resourcePath}`);
        this.equipTemplates.set(category, categoryMap);
        continue;
      }
      const files = fs.readdirSync(resourcePath);
      for (const file2 of files) {
        const ext = path.extname(file2).toLowerCase();
        if (!VALID_IMAGE_EXTENSIONS.includes(ext)) continue;
        const filePath = path.join(resourcePath, file2);
        const templateName = path.parse(file2).name;
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
      const ext = path.extname(file2).toLowerCase();
      if (!VALID_IMAGE_EXTENSIONS.includes(ext)) continue;
      const championName = path.parse(file2).name;
      const filePath = path.join(this.championTemplatePath, file2);
      try {
        const mat = await this.loadImageAsMat(filePath, { ensureAlpha: true });
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
      const ext = path.extname(file2).toLowerCase();
      if (!VALID_IMAGE_EXTENSIONS.includes(ext)) continue;
      const starLevel = path.parse(file2).name;
      const filePath = path.join(this.starLevelTemplatePath, file2);
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
      if (config.removeAlpha) {
        pipeline = pipeline.removeAlpha();
      } else if (config.ensureAlpha) {
        pipeline = pipeline.ensureAlpha();
      }
      const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
      const channels = config.removeAlpha ? 3 : 4;
      const expectedLength = info.width * info.height * channels;
      if (data.length !== expectedLength) {
        logger.warn(`[TemplateLoader] 图片数据长度异常: ${filePath}`);
        return null;
      }
      const matType = config.removeAlpha ? cv.CV_8UC3 : cv.CV_8UC4;
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
   * 销毁所有资源
   */
  destroy() {
    this.clearEquipTemplates();
    this.clearChampionTemplates();
    this.clearStarLevelTemplates();
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
  EQUIP: 0.75,
  /** 英雄匹配阈值 */
  CHAMPION: 0.7,
  /** 星级匹配阈值 (星级图标特征明显，阈值设高) */
  STAR_LEVEL: 0.85,
  /** 空槽位标准差阈值 (低于此值判定为空) */
  EMPTY_SLOT_STDDEV: 10
};
class TemplateMatcher {
  static instance;
  constructor() {
  }
  // ========== 路径 Getter ==========
  /** 星级识别失败图片保存路径 (运行时获取，确保 VITE_PUBLIC 已设置) */
  get starLevelFailPath() {
    return path.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/starLevel");
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
   * @param targetMat 目标图像 (需要是 RGB 3 通道)
   * @returns 匹配到的装备信息，未匹配返回 null
   */
  matchEquip(targetMat) {
    if (this.isEmptySlot(targetMat)) {
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
          if (templateMat.rows > targetMat.rows || templateMat.cols > targetMat.cols) {
            continue;
          }
          cv.matchTemplate(targetMat, templateMat, resultMat, cv.TM_CCOEFF_NORMED, mask);
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
    } catch (e) {
      logger.error(`[TemplateMatcher] 装备匹配出错: ${e}`);
      return null;
    } finally {
      mask.delete();
      resultMat.delete();
    }
  }
  /**
   * 匹配英雄模板
   * @description 用于商店和备战席的棋子名称识别
   * @param targetMat 目标图像 (需要是 RGBA 4 通道)
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
        logger.info(
          `[TemplateMatcher] 星级识别成功: ${bestMatchLevel}星 (相似度: ${(maxConfidence * 100).toFixed(1)}%)`
        );
        return bestMatchLevel;
      }
      if (maxConfidence > 0.5) {
        logger.warn(
          `[TemplateMatcher] 星级识别未达标 (最高相似度: ${(maxConfidence * 100).toFixed(1)}%)`
        );
      }
      this.saveFailedStarLevelImage(targetMat);
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
      const filePath = path.join(savePath, filename);
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
    let pipeline = sharp(screenshot.data, {
      raw: {
        width: screenshot.width,
        height: screenshot.height,
        channels: 4
        // RGBA / BGRA
      }
    });
    if (forOCR) {
      pipeline = pipeline.resize({
        width: Math.round(screenshot.width * 3),
        height: Math.round(screenshot.height * 3),
        kernel: "lanczos3"
      }).grayscale().normalize().threshold(160).sharpen();
    }
    return await pipeline.toFormat("png").toBuffer();
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
   * @param button 鼠标按键 (默认左键)
   * @throws 如果未初始化游戏窗口基准点
   */
  async clickAt(offset, button = Button.LEFT) {
    if (!this.gameWindowOrigin) {
      throw new Error("[MouseController] 尚未设置游戏窗口基准点，请先调用 setGameWindowOrigin()");
    }
    const target = new Point(
      this.gameWindowOrigin.x + offset.x,
      this.gameWindowOrigin.y + offset.y
    );
    logger.info(
      `[MouseController] 点击: (Origin: ${this.gameWindowOrigin.x},${this.gameWindowOrigin.y}) + (Offset: ${offset.x},${offset.y}) -> (Target: ${target.x},${target.y})`
    );
    try {
      await mouse.move([target]);
      await sleep(MOUSE_CONFIG.MOVE_DELAY);
      await mouse.click(button);
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
   * @param button 鼠标按键 (默认左键)
   * @param interval 两次点击之间的间隔 (ms)
   */
  async doubleClickAt(offset, button = Button.LEFT, interval = 50) {
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
   * @param button 鼠标按键 (默认左键)
   */
  async clickAtAbsolute(position, button = Button.LEFT) {
    try {
      await mouse.move([position]);
      await sleep(MOUSE_CONFIG.MOVE_DELAY);
      await mouse.click(button);
      await sleep(MOUSE_CONFIG.CLICK_DELAY);
    } catch (e) {
      logger.error(`[MouseController] 鼠标点击失败: ${e.message}`);
      throw e;
    }
  }
}
const mouseController = MouseController.getInstance();
function parseStageStringToEnum(stageText) {
  try {
    const cleanText = stageText.replace(/\s/g, "");
    const match = cleanText.match(/^(\d+)-(\d+)$/);
    if (!match) {
      return GameStageType.UNKNOWN;
    }
    const stage = parseInt(match[1]);
    const round = parseInt(match[2]);
    if (stage === 1) {
      return GameStageType.PVE;
    }
    if (round === 2) {
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
class TftOperator {
  static instance;
  /** 游戏窗口左上角坐标 */
  gameWindowRegion = null;
  /** 当前游戏模式 */
  tftMode = TFTMode.CLASSIC;
  /** 当前棋盘状态 */
  currentBoardState = /* @__PURE__ */ new Map();
  /** 当前装备状态 */
  currentEquipState = [];
  /** 当前备战席状态 */
  currentBenchState = [];
  /** OpenCV 是否已初始化 */
  isOpenCVReady = false;
  // ========== 路径 Getter ==========
  get championTemplatePath() {
    return path.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/champion");
  }
  get equipTemplatePath() {
    return path.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/equipment");
  }
  get starLevelTemplatePath() {
    return path.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/starLevel");
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
      this.gameWindowRegion = new Point(originX, originY);
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
   * @returns 游戏阶段枚举
   */
  async getGameStage() {
    try {
      let stageText = "";
      const normalRegion = this.getStageAbsoluteRegion(false);
      const normalPng = await screenCapture.captureRegionAsPng(normalRegion);
      stageText = await ocrService.recognize(normalPng, OcrWorkerType.GAME_STAGE);
      if (!isValidStageFormat(stageText)) {
        logger.info(`[TftOperator] 标准区域识别未命中: "${stageText}"，尝试 Stage-1 区域...`);
        const stageOneRegion = this.getStageAbsoluteRegion(true);
        const stageOnePng = await screenCapture.captureRegionAsPng(stageOneRegion);
        stageText = await ocrService.recognize(stageOnePng, OcrWorkerType.GAME_STAGE);
      }
      if (!isValidStageFormat(stageText)) {
        const clockworkRegion = this.getClockworkTrialsRegion();
        const clockPng = await screenCapture.captureRegionAsPng(clockworkRegion);
        const clockText = await ocrService.recognize(clockPng, OcrWorkerType.GAME_STAGE);
        if (clockText && clockText.length > 2) {
          this.tftMode = TFTMode.CLOCKWORK_TRAILS;
          logger.info("[TftOperator] 识别为发条鸟试炼模式");
          return GameStageType.PVP;
        }
      }
      const stageType = parseStageStringToEnum(stageText);
      if (stageType !== GameStageType.UNKNOWN) {
        logger.info(`[TftOperator] 识别阶段: [${stageText}] -> ${stageType}`);
        this.tftMode = TFTMode.CLASSIC;
      } else {
        logger.warn(`[TftOperator] 无法识别当前阶段: "${stageText ?? "null"}"`);
      }
      return stageType;
    } catch (e) {
      logger.error(`[TftOperator] 阶段识别异常: ${e.message}`);
      return GameStageType.UNKNOWN;
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
        logger.warn(`[商店槽位 ${i}] OCR 识别失败，尝试模板匹配...`);
        const mat = await screenCapture.pngBufferToMat(processedPng);
        cleanName = templateMatcher.matchChampion(mat) || "";
        mat.delete();
      }
      tftUnit = TFT_16_CHAMPION_DATA[cleanName] || null;
      if (tftUnit) {
        logger.info(`[商店槽位 ${i}] 识别成功 -> ${tftUnit.displayName} (${tftUnit.price}费)`);
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
        if (matchResult) {
          logger.info(
            `[TftOperator] ${slotName} 识别成功: ${matchResult.name} (相似度: ${(matchResult.confidence * 100).toFixed(1)}%)`
          );
          matchResult.slot = slotName;
          resultEquips.push(matchResult);
        } else {
          logger.error(`[TftOperator] ${slotName} 槽位识别失败`);
          await this.saveFailedImage("equip", slotName, targetMat, 3);
        }
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
    await mouseController.doubleClickAt(targetPoint, Button.LEFT, 50);
  }
  /**
   * 获取当前备战席的棋子信息
   * @description 通过右键点击棋子，识别详情面板中的英雄名和星级
   * @returns 备战席棋子数组 (空槽位为 null)
   */
  async getBenchInfo() {
    const benchUnits = [];
    for (const benchSlot of Object.keys(benchSlotPoints)) {
      await mouseController.clickAt(benchSlotPoints[benchSlot], Button.RIGHT);
      await sleep(50);
      const nameRegion = screenCapture.toAbsoluteRegion(detailChampionNameRegion);
      const namePng = await screenCapture.captureRegionAsPng(nameRegion);
      const text = await ocrService.recognize(namePng, OcrWorkerType.CHESS);
      let cleanName = text.replace(/\s/g, "");
      let tftUnit = TFT_16_CHAMPION_DATA[cleanName] || null;
      if (!tftUnit) {
        logger.warn(`[备战席槽位 ${benchSlot.slice(-1)}] OCR 识别失败，尝试模板匹配...`);
        const mat = await screenCapture.pngBufferToMat(namePng);
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
        logger.info(
          `[备战席槽位 ${benchSlot.slice(-1)}] 识别成功 -> ${tftUnit.displayName} (${tftUnit.price}费-${starLevel}星)`
        );
        benchUnits.push({
          location: benchSlot,
          tftUnit,
          starLevel,
          equips: []
        });
      } else {
        this.handleRecognitionFailure("bench", benchSlot.slice(-1), cleanName, namePng);
        benchUnits.push(null);
      }
    }
    return benchUnits;
  }
  // ============================================================================
  // 私有方法 (Private Methods)
  // ============================================================================
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
      logger.info(`[${type}槽位 ${slot}] 识别为空槽位`);
    } else if (recognizedName && recognizedName.length > 0) {
      logger.warn(`[${type}槽位 ${slot}] 匹配到模板但名称未知: ${recognizedName}`);
    } else {
      logger.warn(`[${type}槽位 ${slot}] 识别失败，保存截图...`);
      const filename = `fail_${type}_slot_${slot}_${Date.now()}.png`;
      fs.writeFileSync(path.join(this.championTemplatePath, filename), imageBuffer);
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
      fs.writeFileSync(path.join(this.equipTemplatePath, fileName), pngBuffer);
      logger.info(`[TftOperator] 已保存失败样本: ${fileName}`);
    } catch (e) {
      logger.error(`[TftOperator] 保存失败样本出错: ${e}`);
    }
  }
}
const tftOperator = TftOperator.getInstance();
const STAGE_CHECK_INTERVAL_MS = 1e3;
class GameStageState {
  /** 状态名称 */
  name = "GameStageState";
  /**
   * 执行游戏阶段状态逻辑
   * @param signal AbortSignal 用于取消操作
   * @returns 下一个状态 (目前保持自身循环)
   */
  async action(signal) {
    signal.throwIfAborted();
    const currentGameStage = await tftOperator.getGameStage();
    switch (currentGameStage) {
      case GameStageType.PVE:
        logger.info("[GameStageState] 正在打野怪，准备捡球...");
        break;
      case GameStageType.CAROUSEL:
        logger.info("[GameStageState] 选秀环节，准备抢装备...");
        break;
      case GameStageType.AUGMENT:
        logger.info("[GameStageState] 海克斯选择环节，准备分析...");
        break;
      case GameStageType.PVP:
        logger.info("[GameStageState] 玩家对战环节，准备战斗...");
        break;
      case GameStageType.UNKNOWN:
        logger.debug("[GameStageState] 未知阶段，等待中...");
        break;
    }
    await sleep(STAGE_CHECK_INTERVAL_MS);
    return this;
  }
}
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
const POLL_INTERVAL_MS = 2e3;
class GameLoadingState {
  /** 状态名称 */
  name = "GameLoadingState";
  /**
   * 执行游戏加载状态逻辑
   * @param signal AbortSignal 用于取消等待
   * @returns 下一个状态 (GameStageState 或 EndState)
   */
  async action(signal) {
    signal.throwIfAborted();
    logger.info("[GameLoadingState] 等待进入对局...");
    const isGameLoaded = await this.waitForGameToLoad(signal);
    if (isGameLoaded) {
      logger.info("[GameLoadingState] 对局已开始！");
      return new GameStageState();
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
   * 执行大厅状态逻辑
   * @param signal AbortSignal 用于取消操作
   * @returns 下一个状态
   */
  async action(signal) {
    signal.throwIfAborted();
    if (!this.lcuManager) {
      throw Error("[LobbyState] 检测到客户端未启动！");
    }
    logger.info("[LobbyState] 正在创建房间...");
    await this.lcuManager.createLobbyByQueueId(Queue.TFT_FATIAO);
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
        if (eventData.data?.state === "InProgress") {
          logger.info("[LobbyState] 已找到对局！正在自动接受...");
          this.lcuManager?.acceptMatch().catch((reason) => {
            logger.warn(`[LobbyState] 接受对局失败: ${reason}`);
          });
        }
      };
      const onGameflowPhase = (eventData) => {
        const phase = eventData.data?.phase;
        logger.debug(`[LobbyState] 游戏阶段: ${JSON.stringify(eventData, null, 2)}`);
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
      window: {
        bounds: null,
        //  第一次启动，默认为null
        isMaximized: false
        //  默认不最大化窗口
      }
    };
    this.store = new Store({ defaults });
  }
  get(key) {
    return this.store.get(key);
  }
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
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT);
process.env.VITE_PUBLIC = is.dev ? path.join(process.env.APP_ROOT, "../public") : RENDERER_DIST;
let win;
function createWindow() {
  const savedWindowInfo = settingsStore.get("window");
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "icon.png"),
    //  窗口左上角的图标
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.cjs"),
      // 指定preload文件
      sandbox: false
    },
    ...savedWindowInfo.bounds || { width: 1024, height: 600 }
    //  控制窗口位置,第一次打开不会有保存值，就用默认的
  });
  console.log("图标路径为：" + path.join(process.env.VITE_PUBLIC, "icon.png"));
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
    win.loadFile(path.join(__dirname, "index.html"));
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
  globalShortcut.unregisterAll();
});
app.whenReady().then(async () => {
  createWindow();
  init();
  registerHandler();
});
function init() {
  logger.init(win);
  const connector = new LCUConnector();
  tftOperator.init();
  connector.on("connect", (data) => {
    console.log("LOL客户端已登录！", data);
    sendToRenderer("lcu-connect", data);
    const lcuManager = LCUManager.init(data);
    GameConfigHelper.init(data.installDirectory);
    lcuManager.start();
    lcuManager.on("connect", async () => {
      sendToRenderer("lcu-connect", data);
      try {
        const summoner = await lcuManager.request("GET", "/lol-summoner/v1/current-summoner");
        console.log("召唤师信息:", summoner);
      } catch (e) {
        console.error("请求召唤师信息失败:", e);
      }
    });
    lcuManager.on("disconnect", () => {
      console.log("LCUManager 已断开");
      sendToRenderer("lcu-disconnect");
    });
    lcuManager.on("lcu-event", (event) => {
      console.log("收到LCU事件:", event.uri, event.eventType);
    });
  });
  connector.on("disconnect", () => {
    console.log("LOL客户端登出！");
    sendToRenderer("lcu-disconnect");
  });
  connector.start();
}
function sendToRenderer(channel, ...args) {
  return win?.webContents.send(channel, ...args);
}
function registerHandler() {
  ipcMain.handle(IpcChannel.LCU_REQUEST, async (_event, method, endpoint, body) => {
    const lcu = LCUManager.getInstance();
    if (!lcu || !lcu.isConnected) {
      console.error("❌ [IPC] LCUManager 尚未连接，无法处理请求");
      return { error: "LCU is not connected yet." };
    }
    try {
      console.log(`📞 [IPC] 收到请求: ${method} ${endpoint}`);
      return await lcu.request(method, endpoint, body);
    } catch (e) {
      console.error(`❌ [IPC] 处理请求 ${method} ${endpoint} 时出错:`, e);
      return { error: e.message };
    }
  });
  ipcMain.handle(IpcChannel.CONFIG_BACKUP, async (event) => GameConfigHelper.backup());
  ipcMain.handle(IpcChannel.CONFIG_RESTORE, async (event) => GameConfigHelper.restore());
  ipcMain.handle(IpcChannel.HEX_START, async (event) => hexService.start());
  ipcMain.handle(IpcChannel.HEX_STOP, async (event) => hexService.stop());
  ipcMain.handle(IpcChannel.TFT_BUY_AT_SLOT, async (event, slot) => tftOperator.buyAtSlot(slot));
  ipcMain.handle(IpcChannel.TFT_GET_SHOP_INFO, async (event) => tftOperator.getShopInfo());
  ipcMain.handle(IpcChannel.TFT_GET_EQUIP_INFO, async (event) => tftOperator.getEquipInfo());
  ipcMain.handle(IpcChannel.TFT_GET_BENCH_INFO, async (event) => tftOperator.getBenchInfo());
}
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
