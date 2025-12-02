import { app, screen, BrowserWindow, globalShortcut, ipcMain } from "electron";
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
import { Point, Region, screen as screen$1, mouse, Button } from "@nut-tree-fork/nut-js";
import { createWorker, PSM } from "tesseract.js";
import sharp from "sharp";
import cv from "@techstark/opencv-js";
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
class Logger {
  //  单例模式
  static instance = null;
  window;
  static getInstance() {
    if (!Logger.instance)
      Logger.instance = new Logger();
    return Logger.instance;
  }
  constructor() {
  }
  init(window2) {
    this.window = window2;
  }
  info(message) {
    this.sendLogToFrontend(message, "info");
    console.log(`[info] ${message}`);
  }
  warn(message) {
    this.sendLogToFrontend(message, "warn");
    console.log(`[warn] ${message}`);
  }
  error(message) {
    const msg = message instanceof Error ? message.message : message;
    this.sendLogToFrontend(msg, "error");
    console.log(`[error] ${message}`);
    if (message instanceof Error) {
      console.error(message.stack);
    }
  }
  sendLogToFrontend(message, level = "info") {
    if (this.window) {
      this.window.webContents.send("log-message", { message, level });
    } else {
      console.error("[Logger] window还未初始化，无法把消息发给前端");
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
      // 把我们的“通行证”交给 axios
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
   * 喵~ 一个有礼貌的函数，会一直“敲门”直到后厨回应
   */
  async confirmApiReady() {
    while (true) {
      try {
        await this.request("GET", "/riotclient/ux-state");
        console.log("✅ [LCUManager] API 服务已就绪！");
        return;
      } catch (error) {
        console.log("⏳ [LCUManager] API 服务尚未就绪，1秒后重试...", error);
        await new Promise((resolve) => setTimeout(resolve, 2e3));
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
  return IpcChannel2;
})(IpcChannel || {});
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
class EndState {
  async action() {
    logger.info("正在恢复客户端设置...");
    await GameConfigHelper.restore();
    logger.info("客户端设置恢复完成");
    logger.info("[HexService] 海克斯科技关闭。");
    return new IdleState();
  }
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
    rightBottom: { x: 32, y: 259 }
  },
  SLOT_3: {
    leftTop: { x: 9, y: 271 },
    rightBottom: { x: 32, y: 295 }
  },
  SLOT_4: {
    leftTop: { x: 9, y: 307 },
    rightBottom: { x: 32, y: 332 }
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
({
  //  x+=75
  SLOT_1: new Point(135, 555),
  SLOT_2: new Point(210, 555),
  SLOT_3: new Point(285, 555),
  SLOT_4: new Point(360, 555),
  SLOT_5: new Point(435, 555),
  SLOT_6: new Point(510, 555),
  SLOT_7: new Point(585, 555),
  SLOT_8: new Point(660, 555),
  SLOT_9: new Point(735, 555),
  SLOT_10: new Point(810, 555)
});
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
const TFT_15_CHAMPION_DATA = {
  "亚托克斯": {
    displayName: "亚托克斯",
    price: 1,
    traits: [
      "超级战队",
      "主宰",
      "重量级斗士"
      /* Heavyweight */
    ],
    origins: [
      "超级战队"
      /* MightyMech */
    ],
    classes: [
      "主宰",
      "重量级斗士"
      /* Heavyweight */
    ]
  },
  "阿狸": {
    displayName: "阿狸",
    price: 3,
    traits: [
      "星之守护者",
      "法师"
      /* Sorcerer */
    ],
    origins: [
      "星之守护者"
      /* StarGuardian */
    ],
    classes: [
      "法师"
      /* Sorcerer */
    ]
  },
  "阿卡丽": {
    displayName: "阿卡丽",
    price: 4,
    traits: [
      "兵王",
      "裁决使者"
      /* Executioner */
    ],
    origins: [
      "兵王"
      /* SupremeCells */
    ],
    classes: [
      "裁决使者"
      /* Executioner */
    ]
  },
  "艾希": {
    displayName: "艾希",
    price: 4,
    traits: [
      "水晶玫瑰",
      "决斗大师"
      /* Duelist */
    ],
    origins: [
      "水晶玫瑰"
      /* CrystalGambit */
    ],
    classes: [
      "决斗大师"
      /* Duelist */
    ]
  },
  "布隆": {
    displayName: "布隆",
    price: 5,
    traits: [
      "布隆之心",
      "假面摔跤手",
      "护卫"
      /* Bastion */
    ],
    origins: [
      "布隆之心",
      "假面摔跤手"
      /* Luchador */
    ],
    classes: [
      "护卫"
      /* Bastion */
    ]
  },
  "凯特琳": {
    displayName: "凯特琳",
    price: 3,
    traits: [
      "战斗学院",
      "狙神"
      /* Sniper */
    ],
    origins: [
      "战斗学院"
      /* BattleAcademia */
    ],
    classes: [
      "狙神"
      /* Sniper */
    ]
  },
  "德莱厄斯": {
    displayName: "德莱厄斯",
    price: 3,
    traits: [
      "兵王",
      "重量级斗士"
      /* Heavyweight */
    ],
    origins: [
      "兵王"
      /* SupremeCells */
    ],
    classes: [
      "重量级斗士"
      /* Heavyweight */
    ]
  },
  "蒙多医生": {
    displayName: "蒙多医生",
    price: 2,
    traits: [
      "假面摔跤手",
      "主宰"
      /* Juggernaut */
    ],
    origins: [
      "假面摔跤手"
      /* Luchador */
    ],
    classes: [
      "主宰"
      /* Juggernaut */
    ]
  },
  "艾克": {
    displayName: "艾克",
    price: 0,
    traits: [],
    origins: [],
    classes: []
  },
  "伊泽瑞尔": {
    displayName: "伊泽瑞尔",
    price: 1,
    traits: [
      "战斗学院",
      "天才"
      /* Prodigy */
    ],
    origins: [
      "战斗学院"
      /* BattleAcademia */
    ],
    classes: [
      "天才"
      /* Prodigy */
    ]
  },
  "超级机甲": {
    displayName: "超级机甲",
    price: 0,
    traits: [],
    origins: [],
    classes: []
  },
  "普朗克": {
    displayName: "普朗克",
    price: 2,
    traits: [
      "超级战队",
      "决斗大师"
      /* Duelist */
    ],
    origins: [
      "超级战队"
      /* MightyMech */
    ],
    classes: [
      "决斗大师"
      /* Duelist */
    ]
  },
  "盖伦": {
    displayName: "盖伦",
    price: 1,
    traits: [
      "战斗学院",
      "护卫"
      /* Bastion */
    ],
    origins: [
      "战斗学院"
      /* BattleAcademia */
    ],
    classes: [
      "护卫"
      /* Bastion */
    ]
  },
  "纳尔": {
    displayName: "纳尔",
    price: 1,
    traits: [
      "假面摔跤手",
      "狙神"
      /* Sniper */
    ],
    origins: [
      "假面摔跤手"
      /* Luchador */
    ],
    classes: [
      "狙神"
      /* Sniper */
    ]
  },
  "格温": {
    displayName: "格温",
    price: 5,
    traits: [
      "斗魂战士",
      "法师"
      /* Sorcerer */
    ],
    origins: [
      "斗魂战士"
      /* SoulFighter */
    ],
    classes: [
      "法师"
      /* Sorcerer */
    ]
  },
  "迦娜": {
    displayName: "迦娜",
    price: 2,
    traits: [
      "水晶玫瑰",
      "圣盾使",
      "司令"
      /* Strategist */
    ],
    origins: [
      "水晶玫瑰"
      /* CrystalGambit */
    ],
    classes: [
      "圣盾使",
      "司令"
      /* Strategist */
    ]
  },
  "嘉文四世": {
    displayName: "嘉文四世",
    price: 4,
    traits: [
      "超级战队",
      "司令"
      /* Strategist */
    ],
    origins: [
      "超级战队"
      /* MightyMech */
    ],
    classes: [
      "司令"
      /* Strategist */
    ]
  },
  "杰斯": {
    displayName: "杰斯",
    price: 3,
    traits: [
      "战斗学院",
      "重量级斗士"
      /* Heavyweight */
    ],
    origins: [
      "战斗学院"
      /* BattleAcademia */
    ],
    classes: [
      "重量级斗士"
      /* Heavyweight */
    ]
  },
  "烬": {
    displayName: "烬",
    price: 2,
    traits: [
      "至高天",
      "狙神"
      /* Sniper */
    ],
    origins: [
      "至高天"
      /* Wraith */
    ],
    classes: [
      "狙神"
      /* Sniper */
    ]
  },
  "金克丝": {
    displayName: "金克丝",
    price: 4,
    traits: [
      "星之守护者",
      "狙神"
      /* Sniper */
    ],
    origins: [
      "星之守护者"
      /* StarGuardian */
    ],
    classes: [
      "狙神"
      /* Sniper */
    ]
  },
  "卡莎": {
    displayName: "卡莎",
    price: 2,
    traits: [
      "兵王",
      "决斗大师"
      /* Duelist */
    ],
    origins: [
      "兵王"
      /* SupremeCells */
    ],
    classes: [
      "决斗大师"
      /* Duelist */
    ]
  },
  "卡莉丝塔": {
    displayName: "卡莉丝塔",
    price: 1,
    traits: [
      "斗魂战士",
      "裁决使者"
      /* Executioner */
    ],
    origins: [
      "斗魂战士"
      /* SoulFighter */
    ],
    classes: [
      "裁决使者"
      /* Executioner */
    ]
  },
  "卡尔玛": {
    displayName: "卡尔玛",
    price: 4,
    traits: [
      "超级战队",
      "法师"
      /* Sorcerer */
    ],
    origins: [
      "超级战队"
      /* MightyMech */
    ],
    classes: [
      "法师"
      /* Sorcerer */
    ]
  },
  "卡特琳娜": {
    displayName: "卡特琳娜",
    price: 2,
    traits: [
      "战斗学院",
      "裁决使者"
      /* Executioner */
    ],
    origins: [
      "战斗学院"
      /* BattleAcademia */
    ],
    classes: [
      "裁决使者"
      /* Executioner */
    ]
  },
  "凯尔": {
    displayName: "凯尔",
    price: 1,
    traits: [
      "至高天",
      "决斗大师"
      /* Duelist */
    ],
    origins: [
      "至高天"
      /* Wraith */
    ],
    classes: [
      "决斗大师"
      /* Duelist */
    ]
  },
  "凯南": {
    displayName: "凯南",
    price: 1,
    traits: [
      "兵王",
      "圣盾使",
      "法师"
      /* Sorcerer */
    ],
    origins: [
      "兵王"
      /* SupremeCells */
    ],
    classes: [
      "圣盾使",
      "法师"
      /* Sorcerer */
    ]
  },
  "可酷伯": {
    displayName: "可酷伯",
    price: 2,
    traits: [
      "大宗师",
      "重量级斗士"
      /* Heavyweight */
    ],
    origins: [
      "大宗师"
      /* Mentor */
    ],
    classes: [
      "重量级斗士"
      /* Heavyweight */
    ]
  },
  "克格莫": {
    displayName: "克格莫",
    price: 3,
    traits: [
      "小怪兽训练师"
      /* MonsterTrainer */
    ],
    origins: [
      "小怪兽训练师"
      /* MonsterTrainer */
    ],
    classes: []
  },
  "奎桑提": {
    displayName: "奎桑提",
    price: 4,
    traits: [
      "至高天",
      "圣盾使"
      /* Protector */
    ],
    origins: [
      "至高天"
      /* Wraith */
    ],
    classes: [
      "圣盾使"
      /* Protector */
    ]
  },
  "李青": {
    displayName: "李青",
    price: 5,
    traits: [
      "龙的传人"
      /* StanceMaster */
    ],
    origins: [
      "龙的传人"
      /* StanceMaster */
    ],
    classes: []
  },
  "李青-裁决使者": {
    displayName: "李青-裁决使者",
    price: 5,
    traits: [
      "龙的传人",
      "裁决使者"
      /* Executioner */
    ],
    origins: [
      "龙的传人"
      /* StanceMaster */
    ],
    classes: [
      "裁决使者"
      /* Executioner */
    ]
  },
  "李青-决斗大师": {
    displayName: "李青-决斗大师",
    price: 5,
    traits: [
      "龙的传人",
      "决斗大师"
      /* Duelist */
    ],
    origins: [
      "龙的传人"
      /* StanceMaster */
    ],
    classes: [
      "决斗大师"
      /* Duelist */
    ]
  },
  "李青-主宰": {
    displayName: "李青-主宰",
    price: 5,
    traits: [
      "龙的传人",
      "主宰"
      /* Juggernaut */
    ],
    origins: [
      "龙的传人"
      /* StanceMaster */
    ],
    classes: [
      "主宰"
      /* Juggernaut */
    ]
  },
  "蕾欧娜": {
    displayName: "蕾欧娜",
    price: 4,
    traits: [
      "战斗学院",
      "护卫"
      /* Bastion */
    ],
    origins: [
      "战斗学院"
      /* BattleAcademia */
    ],
    classes: [
      "护卫"
      /* Bastion */
    ]
  },
  "卢锡安": {
    displayName: "卢锡安",
    price: 1,
    traits: [
      "超级战队",
      "法师"
      /* Sorcerer */
    ],
    origins: [
      "超级战队"
      /* MightyMech */
    ],
    classes: [
      "法师"
      /* Sorcerer */
    ]
  },
  "璐璐": {
    displayName: "璐璐",
    price: 3,
    traits: [
      "小怪兽训练师"
      /* MonsterTrainer */
    ],
    origins: [
      "小怪兽训练师"
      /* MonsterTrainer */
    ],
    classes: []
  },
  "拉克丝": {
    displayName: "拉克丝",
    price: 2,
    traits: [
      "斗魂战士",
      "法师"
      /* Sorcerer */
    ],
    origins: [
      "斗魂战士"
      /* SoulFighter */
    ],
    classes: [
      "法师"
      /* Sorcerer */
    ]
  },
  "墨菲特": {
    displayName: "墨菲特",
    price: 1,
    traits: [
      "奥德赛",
      "圣盾使"
      /* Protector */
    ],
    origins: [
      "奥德赛"
      /* TheCrew */
    ],
    classes: [
      "圣盾使"
      /* Protector */
    ]
  },
  "玛尔扎哈": {
    displayName: "玛尔扎哈",
    price: 3,
    traits: [
      "至高天",
      "天才"
      /* Prodigy */
    ],
    origins: [
      "至高天"
      /* Wraith */
    ],
    classes: [
      "天才"
      /* Prodigy */
    ]
  },
  "纳亚菲利": {
    displayName: "纳亚菲利",
    price: 1,
    traits: [
      "斗魂战士",
      "主宰"
      /* Juggernaut */
    ],
    origins: [
      "斗魂战士"
      /* SoulFighter */
    ],
    classes: [
      "主宰"
      /* Juggernaut */
    ]
  },
  "妮蔻": {
    displayName: "妮蔻",
    price: 3,
    traits: [
      "星之守护者",
      "圣盾使"
      /* Protector */
    ],
    origins: [
      "星之守护者"
      /* StarGuardian */
    ],
    classes: [
      "圣盾使"
      /* Protector */
    ]
  },
  "波比": {
    displayName: "波比",
    price: 4,
    traits: [
      "星之守护者",
      "重量级斗士"
      /* Heavyweight */
    ],
    origins: [
      "星之守护者"
      /* StarGuardian */
    ],
    classes: [
      "重量级斗士"
      /* Heavyweight */
    ]
  },
  "洛": {
    displayName: "洛",
    price: 2,
    traits: [
      "战斗学院",
      "圣盾使"
      /* Protector */
    ],
    origins: [
      "战斗学院"
      /* BattleAcademia */
    ],
    classes: [
      "圣盾使"
      /* Protector */
    ]
  },
  "拉莫斯": {
    displayName: "拉莫斯",
    price: 3,
    traits: [
      "小怪兽训练师"
      /* MonsterTrainer */
    ],
    origins: [
      "小怪兽训练师"
      /* MonsterTrainer */
    ],
    classes: []
  },
  "芮尔": {
    displayName: "芮尔",
    price: 1,
    traits: [
      "星之守护者",
      "护卫"
      /* Bastion */
    ],
    origins: [
      "星之守护者"
      /* StarGuardian */
    ],
    classes: [
      "护卫"
      /* Bastion */
    ]
  },
  "瑞兹": {
    displayName: "瑞兹",
    price: 4,
    traits: [
      "大宗师",
      "裁决使者",
      "司令"
      /* Strategist */
    ],
    origins: [
      "大宗师"
      /* Mentor */
    ],
    classes: [
      "裁决使者",
      "司令"
      /* Strategist */
    ]
  },
  "莎弥拉": {
    displayName: "莎弥拉",
    price: 4,
    traits: [
      "斗魂战士",
      "刀锋领主"
      /* Edgelord */
    ],
    origins: [
      "斗魂战士"
      /* SoulFighter */
    ],
    classes: [
      "刀锋领主"
      /* Edgelord */
    ]
  },
  "赛娜": {
    displayName: "赛娜",
    price: 3,
    traits: [
      "超级战队",
      "裁决使者"
      /* Executioner */
    ],
    origins: [
      "超级战队"
      /* MightyMech */
    ],
    classes: [
      "裁决使者"
      /* Executioner */
    ]
  },
  "萨勒芬妮": {
    displayName: "萨勒芬妮",
    price: 5,
    traits: [
      "星之守护者",
      "天才"
      /* Prodigy */
    ],
    origins: [
      "星之守护者"
      /* StarGuardian */
    ],
    classes: [
      "天才"
      /* Prodigy */
    ]
  },
  "瑟提": {
    displayName: "瑟提",
    price: 4,
    traits: [
      "斗魂战士",
      "主宰"
      /* Juggernaut */
    ],
    origins: [
      "斗魂战士"
      /* SoulFighter */
    ],
    classes: [
      "主宰"
      /* Juggernaut */
    ]
  },
  "慎": {
    displayName: "慎",
    price: 2,
    traits: [
      "奥德赛",
      "护卫",
      "刀锋领主"
      /* Edgelord */
    ],
    origins: [
      "奥德赛"
      /* TheCrew */
    ],
    classes: [
      "护卫",
      "刀锋领主"
      /* Edgelord */
    ]
  },
  "希维尔": {
    displayName: "希维尔",
    price: 1,
    traits: [
      "奥德赛",
      "狙神"
      /* Sniper */
    ],
    origins: [
      "奥德赛"
      /* TheCrew */
    ],
    classes: [
      "狙神"
      /* Sniper */
    ]
  },
  "斯莫德": {
    displayName: "斯莫德",
    price: 3,
    traits: [
      "小怪兽训练师"
      /* MonsterTrainer */
    ],
    origins: [
      "小怪兽训练师"
      /* MonsterTrainer */
    ],
    classes: []
  },
  "斯维因": {
    displayName: "斯维因",
    price: 3,
    traits: [
      "水晶玫瑰",
      "护卫",
      "法师"
      /* Sorcerer */
    ],
    origins: [
      "水晶玫瑰"
      /* CrystalGambit */
    ],
    classes: [
      "护卫",
      "法师"
      /* Sorcerer */
    ]
  },
  "辛德拉": {
    displayName: "辛德拉",
    price: 1,
    traits: [
      "水晶玫瑰",
      "星之守护者",
      "天才"
      /* Prodigy */
    ],
    origins: [
      "水晶玫瑰",
      "星之守护者"
      /* StarGuardian */
    ],
    classes: [
      "天才"
      /* Prodigy */
    ]
  },
  "崔斯特": {
    displayName: "崔斯特",
    price: 5,
    traits: [
      "卡牌大师",
      "奥德赛"
      /* TheCrew */
    ],
    origins: [
      "卡牌大师",
      "奥德赛"
      /* TheCrew */
    ],
    classes: []
  },
  "乌迪尔": {
    displayName: "乌迪尔",
    price: 3,
    traits: [
      "大宗师",
      "主宰",
      "决斗大师"
      /* Duelist */
    ],
    origins: [
      "大宗师"
      /* Mentor */
    ],
    classes: [
      "主宰",
      "决斗大师"
      /* Duelist */
    ]
  },
  "韦鲁斯": {
    displayName: "韦鲁斯",
    price: 5,
    traits: [
      "至高天",
      "狙神"
      /* Sniper */
    ],
    origins: [
      "至高天"
      /* Wraith */
    ],
    classes: [
      "狙神"
      /* Sniper */
    ]
  },
  "蔚": {
    displayName: "蔚",
    price: 2,
    traits: [
      "水晶玫瑰",
      "主宰"
      /* Juggernaut */
    ],
    origins: [
      "水晶玫瑰"
      /* CrystalGambit */
    ],
    classes: [
      "主宰"
      /* Juggernaut */
    ]
  },
  "佛耶戈": {
    displayName: "佛耶戈",
    price: 3,
    traits: [
      "斗魂战士",
      "决斗大师"
      /* Duelist */
    ],
    origins: [
      "斗魂战士"
      /* SoulFighter */
    ],
    classes: [
      "决斗大师"
      /* Duelist */
    ]
  },
  "沃利贝尔": {
    displayName: "沃利贝尔",
    price: 4,
    traits: [
      "假面摔跤手",
      "刀锋领主"
      /* Edgelord */
    ],
    origins: [
      "假面摔跤手"
      /* Luchador */
    ],
    classes: [
      "刀锋领主"
      /* Edgelord */
    ]
  },
  "霞": {
    displayName: "霞",
    price: 2,
    traits: [
      "星之守护者",
      "刀锋领主"
      /* Edgelord */
    ],
    origins: [
      "星之守护者"
      /* StarGuardian */
    ],
    classes: [
      "刀锋领主"
      /* Edgelord */
    ]
  },
  "赵信": {
    displayName: "赵信",
    price: 2,
    traits: [
      "斗魂战士",
      "护卫"
      /* Bastion */
    ],
    origins: [
      "斗魂战士"
      /* SoulFighter */
    ],
    classes: [
      "护卫"
      /* Bastion */
    ]
  },
  "亚索": {
    displayName: "亚索",
    price: 3,
    traits: [
      "大宗师",
      "刀锋领主"
      /* Edgelord */
    ],
    origins: [
      "大宗师"
      /* Mentor */
    ],
    classes: [
      "刀锋领主"
      /* Edgelord */
    ]
  },
  "永恩": {
    displayName: "永恩",
    price: 5,
    traits: [
      "超级战队",
      "刀锋领主"
      /* Edgelord */
    ],
    origins: [
      "超级战队"
      /* MightyMech */
    ],
    classes: [
      "刀锋领主"
      /* Edgelord */
    ]
  },
  "悠米": {
    displayName: "悠米",
    price: 4,
    traits: [
      "战斗学院",
      "天才"
      /* Prodigy */
    ],
    origins: [
      "战斗学院"
      /* BattleAcademia */
    ],
    classes: [
      "天才"
      /* Prodigy */
    ]
  },
  "扎克": {
    displayName: "扎克",
    price: 1,
    traits: [
      "至高天",
      "重量级斗士"
      /* Heavyweight */
    ],
    origins: [
      "至高天"
      /* Wraith */
    ],
    classes: [
      "重量级斗士"
      /* Heavyweight */
    ]
  },
  "吉格斯": {
    displayName: "吉格斯",
    price: 3,
    traits: [
      "奥德赛",
      "司令"
      /* Strategist */
    ],
    origins: [
      "奥德赛"
      /* TheCrew */
    ],
    classes: [
      "司令"
      /* Strategist */
    ]
  },
  "婕拉": {
    displayName: "婕拉",
    price: 5,
    traits: [
      "水晶玫瑰",
      "荆棘之兴"
      /* Rosemother */
    ],
    origins: [
      "水晶玫瑰",
      "荆棘之兴"
      /* Rosemother */
    ],
    classes: []
  },
  "缠绕之根": {
    displayName: "缠绕之根",
    price: 0,
    traits: [],
    origins: [],
    classes: []
  },
  "致命棘刺": {
    displayName: "致命棘刺",
    price: 0,
    traits: [],
    origins: [],
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
    name: "强化果实",
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
    name: "微型英雄复制器",
    englishName: "TFT_Item_Reforger",
    equipId: "-1",
    //  不知道装备ID
    formula: ""
  }
};
const TFT_15_EQUIP_DATA = {
  //  特殊类型的装备
  ...specialEquip,
  // ==========================================
  // Type 1: 基础散件 (Base Items)
  // ==========================================
  "暴风大剑": {
    name: "暴风大剑",
    englishName: "TFT_Item_BFSword",
    equipId: "501",
    formula: ""
  },
  "反曲之弓": {
    name: "反曲之弓",
    englishName: "TFT_Item_RecurveBow",
    equipId: "502",
    formula: ""
  },
  "无用大棒": {
    name: "无用大棒",
    englishName: "TFT_Item_NeedlesslyLargeRod",
    equipId: "503",
    formula: ""
  },
  "女神之泪": {
    name: "女神之泪",
    englishName: "TFT_Item_TearOfTheGoddess",
    equipId: "504",
    formula: ""
  },
  "锁子甲": {
    name: "锁子甲",
    englishName: "TFT_Item_ChainVest",
    equipId: "505",
    formula: ""
  },
  "负极斗篷": {
    name: "负极斗篷",
    englishName: "TFT_Item_NegatronCloak",
    equipId: "506",
    formula: ""
  },
  "巨人腰带": {
    name: "巨人腰带",
    englishName: "TFT_Item_GiantsBelt",
    equipId: "507",
    formula: ""
  },
  "金铲铲": {
    name: "金铲铲",
    englishName: "TFT_Item_Spatula",
    equipId: "508",
    formula: ""
  },
  "拳套": {
    name: "拳套",
    englishName: "TFT_Item_SparringGloves",
    equipId: "509",
    formula: ""
  },
  "金锅锅": {
    name: "金锅锅",
    englishName: "TFT_Item_FryingPan",
    equipId: "91163",
    formula: ""
  },
  // ==========================================
  // Type 2: S15 赛季纹章 (Set 15 Emblems)
  // ==========================================
  // 金锅锅 (91163) 系列合成
  "护卫纹章": {
    name: "护卫纹章",
    englishName: "TFT15_Item_BastionEmblemItem",
    equipId: "91292",
    formula: "91163,505"
    // 金锅锅 + 锁子甲
  },
  "决斗大师纹章": {
    name: "决斗大师纹章",
    englishName: "TFT15_Item_ChallengerEmblemItem",
    equipId: "91294",
    formula: "91163,502"
    // 金锅锅 + 反曲之弓
  },
  "裁决使者纹章": {
    name: "裁决使者纹章",
    englishName: "TFT15_Item_DestroyerEmblemItem",
    equipId: "91295",
    formula: "91163,509"
    // 金锅锅 + 拳套
  },
  "刀锋领主纹章": {
    name: "刀锋领主纹章",
    englishName: "TFT15_Item_EdgelordEmblemItem",
    equipId: "91296",
    formula: "91163,501"
    // 金锅锅 + 暴风大剑
  },
  "重量级斗士纹章": {
    name: "重量级斗士纹章",
    englishName: "TFT15_Item_HeavyweightEmblemItem",
    equipId: "91300",
    formula: "91163,507"
    // 金锅锅 + 巨人腰带
  },
  "法师纹章": {
    name: "法师纹章",
    englishName: "TFT15_Item_SpellslingerEmblemItem",
    equipId: "91301",
    formula: "91163,503"
    // 金锅锅 + 无用大棒
  },
  "天才纹章": {
    name: "天才纹章",
    englishName: "TFT15_Item_ProdigyEmblemItem",
    equipId: "91302",
    formula: "91163,504"
    // 金锅锅 + 女神之泪
  },
  "主宰纹章": {
    name: "主宰纹章",
    englishName: "TFT15_Item_JuggernautEmblemItem",
    equipId: "91304",
    formula: "91163,506"
    // 金锅锅 + 负极斗篷
  },
  "金锅铲冠冕": {
    name: "金锅铲冠冕",
    englishName: "TFT_Item_TacticiansRing",
    equipId: "91164",
    formula: "91163,508"
    // 金锅锅 + 金铲铲
  },
  "金锅锅冠冕": {
    name: "金锅锅冠冕",
    englishName: "TFT_Item_TacticiansScepter",
    equipId: "91165",
    formula: "91163,91163"
    // 金锅锅 + 金锅锅
  },
  // 金铲铲 (508) 系列合成
  "战斗学院纹章": {
    name: "战斗学院纹章",
    englishName: "TFT15_Item_BattleAcademiaEmblemItem",
    equipId: "91293",
    formula: "508,504"
    // 金铲铲 + 女神之泪
  },
  "至高天纹章": {
    name: "至高天纹章",
    englishName: "TFT15_Item_EmpyreanEmblemItem",
    equipId: "91297",
    formula: "508,505"
    // 金铲铲 + 锁子甲
  },
  "假面摔角手纹章": {
    name: "假面摔角手纹章",
    englishName: "TFT15_Item_RingKingsEmblemItem",
    equipId: "91298",
    formula: "508,509"
    // 金铲铲 + 拳套
  },
  "水晶玫瑰纹章": {
    name: "水晶玫瑰纹章",
    englishName: "TFT15_Item_CrystalRoseEmblemItem",
    equipId: "91299",
    formula: "508,507"
    // 金铲铲 + 巨人腰带
  },
  "斗魂战士纹章": {
    name: "斗魂战士纹章",
    englishName: "TFT15_Item_SoulFighterEmblemItem",
    equipId: "91305",
    formula: "508,501"
    // 金铲铲 + 暴风大剑
  },
  "星之守护者纹章": {
    name: "星之守护者纹章",
    englishName: "TFT15_Item_StarGuardianEmblemItem",
    equipId: "91306",
    formula: "508,503"
    // 金铲铲 + 无用大棒
  },
  "兵王纹章": {
    name: "兵王纹章",
    englishName: "TFT15_Item_SupremeCellsEmblemItem",
    equipId: "91307",
    formula: "508,502"
    // 金铲铲 + 反曲之弓
  },
  "司令纹章": {
    name: "司令纹章",
    englishName: "TFT15_Item_ShotcallerEmblemItem",
    equipId: "91309",
    formula: "508,506"
    // 金铲铲 + 负极斗篷
  },
  "金铲铲冠冕": {
    name: "金铲铲冠冕",
    englishName: "TFT_Item_ForceOfNature",
    equipId: "603",
    formula: "508,508"
    // 金铲铲 + 金铲铲
  },
  // ==========================================
  // Type 2: 常驻合成成装 (Standard Craftable Items)
  // ==========================================
  "死亡之刃": {
    name: "死亡之刃",
    englishName: "TFT_Item_Deathblade",
    equipId: "519",
    formula: "501,501"
  },
  "巨人杀手": {
    name: "巨人杀手",
    englishName: "TFT_Item_MadredsBloodrazor",
    equipId: "521",
    formula: "501,502"
  },
  "海克斯科技枪刃": {
    name: "海克斯科技枪刃",
    englishName: "TFT_Item_HextechGunblade",
    equipId: "523",
    formula: "501,503"
  },
  "朔极之矛": {
    name: "朔极之矛",
    englishName: "TFT_Item_SpearOfShojin",
    equipId: "525",
    formula: "501,504"
  },
  "夜之锋刃": {
    name: "夜之锋刃",
    englishName: "TFT_Item_GuardianAngel",
    equipId: "6022",
    formula: "501,505"
  },
  "饮血剑": {
    name: "饮血剑",
    englishName: "TFT_Item_Bloodthirster",
    equipId: "529",
    formula: "501,506"
  },
  "斯特拉克的挑战护手": {
    name: "斯特拉克的挑战护手",
    englishName: "TFT_Item_SteraksGage",
    equipId: "1001",
    formula: "501,507"
  },
  "无尽之刃": {
    name: "无尽之刃",
    englishName: "TFT_Item_InfinityEdge",
    equipId: "535",
    formula: "501,509"
  },
  "红霸符": {
    name: "红霸符",
    englishName: "TFT_Item_RapidFireCannon",
    equipId: "1007",
    formula: "502,502"
  },
  "鬼索的狂暴之刃": {
    name: "鬼索的狂暴之刃",
    englishName: "TFT_Item_GuinsoosRageblade",
    equipId: "539",
    formula: "502,503"
  },
  "斯塔缇克电刃": {
    name: "斯塔缇克电刃",
    englishName: "TFT_Item_StatikkShiv",
    equipId: "541",
    formula: "502,504"
  },
  "泰坦的坚决": {
    name: "泰坦的坚决",
    englishName: "TFT_Item_TitansResolve",
    equipId: "543",
    formula: "502,505"
  },
  "卢安娜的飓风": {
    name: "卢安娜的飓风",
    englishName: "TFT_Item_RunaansHurricane",
    equipId: "545",
    formula: "502,506"
  },
  "纳什之牙": {
    name: "纳什之牙",
    englishName: "TFT_Item_Leviathan",
    equipId: "547",
    formula: "502,507"
  },
  "最后的轻语": {
    name: "最后的轻语",
    englishName: "TFT_Item_LastWhisper",
    equipId: "551",
    formula: "502,509"
  },
  "灭世者的死亡之帽": {
    name: "灭世者的死亡之帽",
    englishName: "TFT_Item_RabadonsDeathcap",
    equipId: "553",
    formula: "503,503"
  },
  "大天使之杖": {
    name: "大天使之杖",
    englishName: "TFT_Item_ArchangelsStaff",
    equipId: "555",
    formula: "503,504"
  },
  "冕卫": {
    name: "冕卫",
    englishName: "TFT_Item_Crownguard",
    equipId: "1003",
    formula: "503,505"
  },
  "离子火花": {
    name: "离子火花",
    englishName: "TFT_Item_IonicSpark",
    equipId: "559",
    formula: "503,506"
  },
  "莫雷洛秘典": {
    name: "莫雷洛秘典",
    englishName: "TFT_Item_Morellonomicon",
    equipId: "561",
    formula: "503,507"
  },
  "珠光护手": {
    name: "珠光护手",
    englishName: "TFT_Item_JeweledGauntlet",
    equipId: "565",
    formula: "503,509"
  },
  "蓝霸符": {
    name: "蓝霸符",
    englishName: "TFT_Item_BlueBuff",
    equipId: "567",
    formula: "504,504"
  },
  "圣盾使的誓约": {
    name: "圣盾使的誓约",
    englishName: "TFT_Item_FrozenHeart",
    equipId: "7034",
    formula: "505,504"
  },
  "棘刺背心": {
    name: "棘刺背心",
    englishName: "TFT_Item_BrambleVest",
    equipId: "579",
    formula: "505,505"
  },
  "石像鬼石板甲": {
    name: "石像鬼石板甲",
    englishName: "TFT_Item_GargoyleStoneplate",
    equipId: "581",
    formula: "505,506"
  },
  "日炎斗篷": {
    name: "日炎斗篷",
    englishName: "TFT_Item_RedBuff",
    equipId: "583",
    formula: "507,505"
  },
  "坚定之心": {
    name: "坚定之心",
    englishName: "TFT_Item_NightHarvester",
    equipId: "1009",
    formula: "505,509"
  },
  "巨龙之爪": {
    name: "巨龙之爪",
    englishName: "TFT_Item_DragonsClaw",
    equipId: "589",
    formula: "506,506"
  },
  "适应性头盔": {
    name: "适应性头盔",
    englishName: "TFT_Item_AdaptiveHelm",
    equipId: "1004",
    formula: "504,506"
  },
  "薄暮法袍": {
    name: "薄暮法袍",
    englishName: "TFT_Item_SpectralGauntlet",
    equipId: "1006",
    formula: "507,506"
  },
  "水银": {
    name: "水银",
    englishName: "TFT_Item_Quicksilver",
    equipId: "595",
    formula: "506,509"
  },
  "救赎": {
    name: "救赎",
    englishName: "TFT_Item_Redemption",
    equipId: "573",
    formula: "507,504"
  },
  "狂徒铠甲": {
    name: "狂徒铠甲",
    englishName: "TFT_Item_WarmogsArmor",
    equipId: "597",
    formula: "507,507"
  },
  "强袭者的链枷": {
    name: "强袭者的链枷",
    englishName: "TFT_Item_PowerGauntlet",
    equipId: "801",
    formula: "507,509"
  },
  "正义之手": {
    name: "正义之手",
    englishName: "TFT_Item_UnstableConcoction",
    equipId: "577",
    formula: "509,504"
  },
  "窃贼手套": {
    name: "窃贼手套",
    englishName: "TFT_Item_ThiefsGloves",
    equipId: "607",
    formula: "509,509"
  }
};
const GAME_WIDTH = 1024;
const GAME_HEIGHT = 768;
const equipResourcePath = ["component", "special", "core", "emblem", "artifact", "radiant"];
class TftOperator {
  static instance;
  //  缓存游戏窗口的左上角坐标
  gameWindowRegion;
  //  用来判断游戏阶段的Worker
  gameStageWorker = null;
  //  用来判断棋子内容的Worker
  chessWorker = null;
  //  当前的游戏模式
  tftMode;
  //  当前战场状态，初始化为空 Map
  currentBoardState = {
    cells: /* @__PURE__ */ new Map()
  };
  //  当前装备状态。
  currentEquipState = [];
  // 缓存装备图片模板 (分层存储)
  equipTemplates = [];
  // 缓存商店栏英雄ID模板
  championTemplates = /* @__PURE__ */ new Map();
  // ⚡️ 全黑的空装备槽位模板，宽高均为24
  emptyEquipSlotTemplate = null;
  //  每次使用计算路径，避免初始化的时候产生process.env的属性未定义的问题。
  get championTemplatePath() {
    return path.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/champion");
  }
  // 3. 同样的，之前的装备路径也可以这样改，防止同样的问题
  get equipTemplatePath() {
    return path.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/equipment");
  }
  constructor() {
    cv["onRuntimeInitialized"] = () => {
      this.emptyEquipSlotTemplate = new cv.Mat(24, 24, cv.CV_8UC4, new cv.Scalar(0, 0, 0, 255));
      logger.info("[TftOperator] OpenCV (WASM) 核心模块加载完毕！");
      this.loadEquipTemplates();
      this.loadChampionTemplates();
      this.setupChampionTemplateWatcher();
    };
  }
  static getInstance() {
    if (!TftOperator.instance) {
      TftOperator.instance = new TftOperator();
    }
    return TftOperator.instance;
  }
  /**
   * 初始化，通过electron找到屏幕中心点，LOL窗口默认居中，以此判断布局。
   */
  init() {
    try {
      const primaryDisplay = screen.getPrimaryDisplay();
      const scaleFactor = primaryDisplay.scaleFactor;
      const { width: logicalWidth, height: logicalHeight } = primaryDisplay.size;
      const screenWidth = Math.round(logicalWidth * scaleFactor);
      const screenHeight = Math.round(logicalHeight * scaleFactor);
      const screenCenterX = screenWidth / 2;
      const screenCenterY = screenHeight / 2;
      const originX = screenCenterX - GAME_WIDTH / 2;
      const originY = screenCenterY - GAME_HEIGHT / 2;
      this.gameWindowRegion = new Point(originX, originY);
      logger.info(`[TftOperator] 屏幕尺寸: ${screenWidth}x${screenHeight}.`);
      logger.info(`[TftOperator] 游戏基准点 (0,0) 已计算在: (${originX}, ${originY})`);
      return true;
    } catch (e) {
      logger.error(`[TftOperator] 无法从 Electron 获取屏幕尺寸: ${e.message}`);
      this.gameWindowRegion = null;
      return false;
    }
  }
  //  获取当前游戏阶段
  async getGameStage() {
    try {
      const isValidStageFormat = (text) => {
        return /^d+\s*[-]\s*\d+$/.test(text.trim());
      };
      const worker = await this.getGameStageWorker();
      let stageText = "";
      const normalRegion = this.getStageAbsoluteRegion(false);
      const normalPng = await this.captureRegionAsPng(normalRegion);
      stageText = await this.ocr(normalPng, worker);
      if (!isValidStageFormat(stageText)) {
        logger.info(`[TftOperator] 标准区域识别未命中: "${stageText}"，尝试 Stage-1 区域...`);
        const stageOneRegion = this.getStageAbsoluteRegion(true);
        const stageOnePng = await this.captureRegionAsPng(stageOneRegion);
        stageText = await this.ocr(stageOnePng, worker);
      }
      if (!isValidStageFormat(stageText)) {
        const clockworkRegion = this.getClockworkTrialsRegion();
        const clockPng = await this.captureRegionAsPng(clockworkRegion);
        const clockText = await this.ocr(clockPng, worker);
        if (clockText && clockText.length > 2) {
          this.tftMode = TFTMode.CLOCKWORK_TRAILS;
          logger.info("[TftOperator] 识别为发条鸟试炼模式，直接返回PVP。");
          return GameStageType.PVP;
        }
      }
      const stageType = parseStageStringToEnum(stageText);
      if (stageType !== GameStageType.UNKNOWN) {
        logger.info(`[TftOperator] 识别阶段: [${stageText}] -> 判定为: ${stageType}`);
        this.tftMode = TFTMode.CLASSIC;
      } else {
        logger.warn(`[TftOperator] 无法识别当前阶段: "${stageText ?? "null"}"`);
      }
      return stageType;
    } catch (e) {
      logger.error(`[TftOperator] 阶段识别流程异常: ${e.message}`);
      return GameStageType.UNKNOWN;
    }
  }
  /**
   * 获取当前商店的所有棋子信息
   */
  async getShopInfo() {
    const worker = await this.getChessWorker();
    logger.info("[TftOperator] 正在扫描商店中的 5 个槽位...");
    const shopUnits = [];
    for (let i = 1; i <= 5; i++) {
      const slotKey = `SLOT_${i}`;
      const simpleRegion = shopSlotNameRegions[slotKey];
      const tessRegion = new Region(
        this.gameWindowRegion.x + simpleRegion.leftTop.x,
        this.gameWindowRegion.y + simpleRegion.leftTop.y,
        simpleRegion.rightBottom.x - simpleRegion.leftTop.x,
        simpleRegion.rightBottom.y - simpleRegion.leftTop.y
      );
      const processedPng = await this.captureRegionAsPng(tessRegion);
      const text = await this.ocr(processedPng, worker);
      let tftUnit = null;
      let cleanName = text.replace(/\s/g, "");
      tftUnit = TFT_15_CHAMPION_DATA[cleanName];
      if (!tftUnit) {
        logger.warn(`[商店槽位 ${i}] OCR识别失败！尝试模板匹配...`);
        const rawData = await sharp(processedPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const processedMat = cv.matFromImageData({
          data: new Uint8Array(rawData.data),
          width: rawData.info.width,
          height: rawData.info.height
        });
        cleanName = this.findBestMatchChampionTemplate(processedMat);
      }
      tftUnit = TFT_15_CHAMPION_DATA[cleanName];
      if (tftUnit) {
        logger.info(`[商店槽位 ${i}] 识别成功-> ${tftUnit.displayName}-(${tftUnit.price}费)`);
        shopUnits.push(tftUnit);
      } else {
        if (cleanName?.length > 0) {
          if (cleanName === "empty")
            logger.info(`[商店槽位 ${i}] 识别为空槽位`);
          else
            logger.warn(`[商店槽位 ${i}] 成功匹配到模板，但识别到未知名称: ${cleanName}，请检查是否拼写有误！`);
        } else {
          logger.warn(`[商店槽位 ${i}] 识别失败，保存截图...`);
          const filename = `fail_slot_${i}_${Date.now()}.png`;
          fs.writeFileSync(path.join(this.championTemplatePath, filename), processedPng);
        }
        shopUnits.push(null);
      }
    }
    return shopUnits;
  }
  async getEquipInfo() {
    if (!this.gameWindowRegion) {
      logger.error("[TftOperator] 尚未初始化游戏窗口位置！");
      return [];
    }
    if (this.equipTemplates.length === 0) {
      logger.warn("[TftOperator] 装备模板为空，跳过识别");
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
      let targetMat;
      try {
        const screenshot = await screen$1.grabRegion(targetRegion);
        targetMat = new cv.Mat(screenshot.height, screenshot.width, cv.CV_8UC4);
        targetMat.data.set(new Uint8Array(screenshot.data));
        cv.cvtColor(targetMat, targetMat, cv.COLOR_BGRA2RGB);
        const matchResult = this.findBestMatchEquipTemplate(targetMat);
        if (matchResult) {
          logger.info(`[TftOperator] ${slotName} 识别成功: ${matchResult.name} (相似度: ${(matchResult.confidence * 100).toFixed(1)}%)`);
          matchResult.slot = slotName;
          resultEquips.push(matchResult);
        } else {
          logger.error(`[TftOperator] ${slotName} 槽位识别失败。`);
          const fileName = `equip_${slotName}${Date.now()}.png`;
          const pngBuffer = await sharp(targetMat.data, {
            raw: {
              width: targetMat.cols,
              // OpenCV 的宽
              height: targetMat.rows,
              // OpenCV 的高
              channels: 3
              // RGBA 是 4 通道
            }
          }).png().toBuffer();
          fs.writeFileSync(path.join(this.equipTemplatePath, fileName), pngBuffer);
          logger.info(`[TftOperator] 槽位${slotName}图片已保存到本地。`);
        }
      } catch (e) {
        logger.error(`[TftOperator] ${slotName} 扫描流程异常: ${e.message}`);
      } finally {
        targetMat.delete();
      }
    }
    return resultEquips;
  }
  /**
   * 购买指定槽位的棋子
   * @param slot 槽位编号 (1, 2, 3, 4, 或 5)
   */
  async buyAtSlot(slot) {
    const slotKey = `SHOP_SLOT_${slot}`;
    const targetPoint = shopSlot[slotKey];
    if (!targetPoint) {
      logger.error(`[TftOperator] 尝试购买一个无效的槽位: ${slot}。只接受 1-5。`);
      return;
    }
    logger.info(`[TftOperator] 正在购买棋子，槽位：${slot}...`);
    await this.clickAt(targetPoint);
    await sleep(50);
    await this.clickAt(targetPoint);
  }
  // ----------------------   这下面都是private方法  ----------------------
  //  处理点击事件
  async clickAt(offset) {
    if (!this.gameWindowRegion) {
      if (!this.init()) {
        throw new Error("TftOperator 尚未初始化。");
      }
    }
    const target = {
      x: this.gameWindowRegion.x + offset.x,
      y: this.gameWindowRegion.y + offset.y
    };
    logger.info(`[TftOperator] 正在点击: (Origin: ${this.gameWindowRegion.x},${this.gameWindowRegion.y}) + (Offset: ${offset.x},${offset.y}) -> (Target: ${target.x},${target.y})`);
    try {
      const nutPoint = new Point(target.x, target.y);
      await mouse.move([nutPoint]);
      await new Promise((resolve) => setTimeout(resolve, 30));
      await mouse.click(Button.LEFT);
      await new Promise((resolve) => setTimeout(resolve, 50));
    } catch (e) {
      logger.error(`[TftOperator] 模拟鼠标点击失败: ${e.message}`);
    }
  }
  // 获取游戏里表示战斗阶段(如1-1)的Region
  getStageAbsoluteRegion(isStageOne = false) {
    if (!this.gameWindowRegion) {
      logger.error("[TftOperator] 尝试在 init() 之前计算 Region！");
      if (!this.init()) throw new Error("[TftOperator] 未初始化，请先调用 init()");
    }
    const originX = this.gameWindowRegion.x;
    const originY = this.gameWindowRegion.y;
    const display = isStageOne ? gameStageDisplayStageOne : gameStageDisplayNormal;
    const x = Math.round(originX + display.leftTop.x);
    const y = Math.round(originY + display.leftTop.y);
    const width = Math.round(display.rightBottom.x - display.leftTop.x);
    const height = Math.round(display.rightBottom.y - display.leftTop.y);
    return new Region(x, y, width, height);
  }
  //  一个懒加载的 Tesseract worker
  async getGameStageWorker() {
    if (this.gameStageWorker) return this.gameStageWorker;
    logger.info("[TftOperator] 正在创建 Tesseract worker...");
    const localLangPath = path.join(process.env.VITE_PUBLIC, "resources/tessdata");
    logger.info(`[TftOperator] Tesseract 本地语言包路径: ${localLangPath}`);
    const worker = await createWorker("eng", 1, {
      //logger: m => logger.info(`[Tesseract] ${m.status}: ${Math.round(m.progress * 100)}%`),
      langPath: localLangPath,
      cachePath: localLangPath
    });
    await worker.setParameters({
      tessedit_char_whitelist: "0123456789-",
      tessedit_pageseg_mode: PSM.SINGLE_LINE
      //  图片排版模式为简单的单行
    });
    this.gameStageWorker = worker;
    logger.info("[TftOperator] Tesseract worker 准备就绪！");
    return this.gameStageWorker;
  }
  //  同样懒加载Worker，用来识别棋子名字，中文模型
  async getChessWorker() {
    if (this.chessWorker) return this.chessWorker;
    logger.info("[TftOperator] 正在创建 Tesseract worker...");
    const localLangPath = path.join(process.env.VITE_PUBLIC, "resources/tessdata");
    logger.info(`[TftOperator] Tesseract 本地语言包路径: ${localLangPath}`);
    const worker = await createWorker("chi_sim", 1, {
      //logger: m => logger.info(`[Tesseract] ${m.status}: ${Math.round(m.progress * 100)}%`),
      langPath: localLangPath,
      cachePath: localLangPath
    });
    const uniqueChars = [...new Set(Object.keys(TFT_15_CHAMPION_DATA).join(""))].join("");
    await worker.setParameters(
      {
        tessedit_char_whitelist: uniqueChars,
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
        // 单行模式
        preserve_interword_spaces: "1"
        // 还可以尝试这个参数，强制将其视为单词
      }
    );
    this.chessWorker = worker;
    logger.info("[TftOperator] Tesseract worker 准备就绪！");
    return this.chessWorker;
  }
  // ======================================
  // 工具函数：截图某区域并输出 PNG buffer
  // ======================================
  async captureRegionAsPng(region, forOCR = true) {
    const screenshot = await screen$1.grabRegion(region);
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
        // 放大 3 倍以提高 OCR 精度
        height: Math.round(screenshot.height * 3),
        kernel: "lanczos3"
      }).grayscale().normalize().threshold(160).sharpen();
    }
    return await pipeline.toFormat("png").toBuffer();
  }
  // ======================================
  // 工具函数：OCR 识别
  // ======================================
  async ocr(pngBuffer, worker) {
    const result = await worker.recognize(pngBuffer);
    return result.data.text.trim();
  }
  //  发条鸟试炼的布局
  getClockworkTrialsRegion() {
    const originX = this.gameWindowRegion.x;
    const originY = this.gameWindowRegion.y;
    return new Region(
      originX + gameStageDisplayTheClockworkTrails.leftTop.x,
      originY + gameStageDisplayTheClockworkTrails.leftTop.y,
      gameStageDisplayTheClockworkTrails.rightBottom.x - gameStageDisplayTheClockworkTrails.leftTop.x,
      gameStageDisplayTheClockworkTrails.rightBottom.y - gameStageDisplayTheClockworkTrails.leftTop.y
    );
  }
  /**
   * 加载装备模板
   */
  async loadEquipTemplates() {
    if (this.equipTemplates.length > 0) {
      for (const category of this.equipTemplates) {
        for (const mat of category.values()) {
          if (mat && !mat.isDeleted()) mat.delete();
        }
      }
      this.equipTemplates.length = 0;
    }
    logger.info(`[TftOperator] 开始加载装备模板...`);
    const TEMPLATE_SIZE = 24;
    if (!this.emptyEquipSlotTemplate) {
      try {
        this.emptyEquipSlotTemplate = new cv.Mat(TEMPLATE_SIZE, TEMPLATE_SIZE, cv.CV_8UC4, new cv.Scalar(0, 0, 0, 255));
      } catch (e) {
        logger.error(`[TftOperator] 创建空模板失败: ${e}`);
      }
    }
    const validExtensions = [".png", ".webp", ".jpg", ".jpeg"];
    for (const category of equipResourcePath) {
      const resourcePath = path.join(this.equipTemplatePath, category);
      const categoryMap = /* @__PURE__ */ new Map();
      if (!fs.existsSync(resourcePath)) {
        logger.warn(`[TftOperator] 装备模板目录不存在: ${resourcePath}`);
        continue;
      }
      const files = fs.readdirSync(resourcePath);
      for (const file2 of files) {
        const ext = path.extname(file2).toLowerCase();
        if (!validExtensions.includes(ext)) continue;
        const filePath = path.join(resourcePath, file2);
        const fileNameNotExt = path.parse(file2).name;
        const processedBaseDir = path.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/processed_equipment");
        fs.ensureDirSync(processedBaseDir);
        try {
          const fileBuf = fs.readFileSync(filePath);
          const pipeline = sharp(fileBuf).resize(TEMPLATE_SIZE, TEMPLATE_SIZE, { fit: "fill" }).removeAlpha();
          const { data, info } = await pipeline.clone().raw().toBuffer({ resolveWithObject: true });
          const uint8Data = new Uint8Array(data);
          if (uint8Data.length !== info.width * info.height * 3) {
            logger.warn(`[TftOperator] 图片数据长度异常: ${file2}`);
            continue;
          }
          const mat = new cv.Mat(info.height, info.width, cv.CV_8UC3);
          mat.data.set(uint8Data);
          categoryMap.set(fileNameNotExt, mat);
        } catch (e) {
          logger.error(`[TftOperator] 加载模板失败 [${file2}]: ${e}`);
        }
      }
      logger.info(`[TftOperator] 加载 [${category}] 模板: ${categoryMap.size} 个`);
      this.equipTemplates.push(categoryMap);
    }
    logger.info(`[TftOperator] 图片模板加载完成！`);
  }
  /**
   * 加载英雄ID模板
   */
  async loadChampionTemplates() {
    if (this.championTemplates.size > 0) {
      for (const mat of this.championTemplates.values()) {
        if (mat && !mat.isDeleted()) {
          mat.delete();
        }
      }
      this.championTemplates.clear();
    }
    logger.info(`[TftOperator] 开始加载英雄模板...`);
    if (!fs.existsSync(this.championTemplatePath)) {
      fs.ensureDirSync(this.championTemplatePath);
      logger.info(`[TftOperator] 英雄模板目录不存在，已自动创建: ${this.championTemplatePath}`);
      return;
    }
    const files = fs.readdirSync(this.championTemplatePath);
    for (const file2 of files) {
      const ext = path.extname(file2).toLowerCase();
      if (![".png", ".jpg", ".jpeg"].includes(ext)) continue;
      const championName = path.parse(file2).name;
      const filePath = path.join(this.championTemplatePath, file2);
      try {
        const fileBuf = fs.readFileSync(filePath);
        const { data, info } = await sharp(fileBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const mat = cv.matFromImageData({
          data: new Uint8Array(data),
          width: info.width,
          height: info.height
        });
        this.championTemplates.set(championName, mat);
      } catch (e) {
        logger.error(`[TftOperator] 加载英雄模板失败 [${file2}]: ${e}`);
      }
    }
    logger.info(`[TftOperator] 英雄模板加载完成，共 ${this.championTemplates.size} 个`);
  }
  /**
   *  传入一个Mat对象，并从图片模板中找到最匹配的装备，规定如果category为empty即为空模板。
   */
  findBestMatchEquipTemplate(targetMat) {
    let bestMatchEquip = null;
    let maxConfidence = 0;
    let foundCategory = "";
    const THRESHOLD = 0.75;
    const mask = new cv.Mat();
    const resultMat = new cv.Mat();
    try {
      const mean = new cv.Mat();
      const stddev = new cv.Mat();
      cv.meanStdDev(targetMat, mean, stddev);
      const deviation = stddev.doubleAt(0, 0);
      mean.delete();
      stddev.delete();
      if (deviation < 10) {
        return { name: "空槽位", confidence: 1 - deviation };
      }
      for (let i = 0; i < this.equipTemplates.length; i++) {
        const currentMap = this.equipTemplates[i];
        if (currentMap.size === 0) continue;
        let hasFind = false;
        for (const [templateName, templateMat] of currentMap) {
          if (templateMat.rows > targetMat.rows || templateMat.cols > targetMat.cols) continue;
          cv.matchTemplate(targetMat, templateMat, resultMat, cv.TM_CCOEFF_NORMED, mask);
          const result = cv.minMaxLoc(resultMat, mask);
          if (result.maxVal >= THRESHOLD) {
            maxConfidence = result.maxVal;
            bestMatchEquip = Object.values(TFT_15_EQUIP_DATA).find((e) => e.englishName.toLowerCase() === templateName.toLowerCase());
            hasFind = true;
            break;
          }
        }
        if (hasFind) break;
      }
    } catch (e) {
      logger.error("[TftOperator] 匹配过程出错: " + e);
    } finally {
      mask.delete();
      resultMat.delete();
    }
    return bestMatchEquip ? {
      ...bestMatchEquip,
      slot: "",
      //  槽位信息留给外面加
      confidence: maxConfidence,
      category: foundCategory
    } : null;
  }
  /**
   * 😺 新增：寻找最匹配的英雄 (兜底逻辑)
   */
  findBestMatchChampionTemplate(targetMat) {
    let bestMatchName = null;
    let maxConfidence = 0;
    const THRESHOLD = 0.8;
    const mask = new cv.Mat();
    const resultMat = new cv.Mat();
    try {
      const mean = new cv.Mat();
      const stddev = new cv.Mat();
      cv.meanStdDev(targetMat, mean, stddev);
      const deviation = stddev.doubleAt(0, 0);
      mean.delete();
      stddev.delete();
      if (deviation < 10) {
        return "empty";
      }
      for (const [name, templateMat] of this.championTemplates) {
        if (templateMat.rows > targetMat.rows || templateMat.cols > targetMat.cols) continue;
        cv.matchTemplate(targetMat, templateMat, resultMat, cv.TM_CCOEFF_NORMED, mask);
        const result = cv.minMaxLoc(resultMat, mask);
        console.log(`英雄模板名：${name}，相似度：${(result.maxVal * 100).toFixed(3)}%`);
        if (result.maxVal >= THRESHOLD) {
          maxConfidence = result.maxVal;
          bestMatchName = name;
          break;
        }
      }
      if (bestMatchName) {
        logger.info(`[TftOperator] 🛡️ 模板匹配挽救成功: ${bestMatchName} (相似度 ${(maxConfidence * 100).toFixed(1)}%)`);
        return bestMatchName;
      }
    } catch (e) {
      logger.error(`[TftOperator] 英雄模板匹配出错: ${e}`);
    } finally {
      resultMat.delete();
    }
    return null;
  }
  /**
   * 监听英雄模板文件夹变更
   */
  setupChampionTemplateWatcher() {
    if (!fs.existsSync(this.championTemplatePath)) fs.ensureDirSync(this.championTemplatePath);
    let debounceTimer;
    fs.watch(this.championTemplatePath, (event, filename) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        logger.info(`[TftOperator] 检测到英雄模板变更 (${event}: ${filename})，重新加载英雄模板...`);
        this.loadChampionTemplates();
      }, 500);
    });
  }
}
function parseStageStringToEnum(stageText) {
  try {
    const cleanText = stageText.replace(/\s/g, "");
    const match = cleanText.match(/^(\d+)-(\d+)$/);
    if (!match) return GameStageType.UNKNOWN;
    const stage = parseInt(match[1]);
    const round = parseInt(match[2]);
    if (stage === 1) return GameStageType.PVE;
    if (round === 2) return GameStageType.AUGMENT;
    if (round === 4) return GameStageType.CAROUSEL;
    if (round === 7) return GameStageType.PVE;
    return GameStageType.PVP;
  } catch (e) {
    console.log(e);
    return GameStageType.UNKNOWN;
  }
}
const tftOperator = TftOperator.getInstance();
class GameStageState {
  async action(signal) {
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
        break;
    }
    await sleep(1e3);
    return this;
  }
}
const inGameApi = axios.create({
  baseURL: "https://127.0.0.1:2999",
  //  What the fuck???
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  }),
  timeout: 1e3,
  // 设置一个较短的超时，方便快速轮询
  proxy: false
});
class GameLoadingState {
  async action(signal) {
    signal.throwIfAborted();
    logger.info("[GameLoadingState] 等待进入对局...");
    const isGameLoaded = await this.waitForGameToLoad();
    if (isGameLoaded) {
      logger.info("[GameLoadingState] 对局已开始！");
      return new GameStageState();
    } else {
      return new EndState();
    }
  }
  waitForGameToLoad() {
    let task;
    return new Promise((resolve) => {
      const checkIfGameStart = async () => {
        try {
          if (!hexService.isRunning) return resolve(false);
          await inGameApi.get("/liveclientdata/allgamedata");
          clearTimeout(task);
          resolve(true);
        } catch (e) {
          logger.info("[GameLoadingState] 游戏仍在加载中...");
        }
      };
      task = setInterval(checkIfGameStart, 2e3);
    });
  }
}
class LobbyState {
  lcuManager = LCUManager.getInstance();
  signal;
  async action(signal) {
    signal.throwIfAborted();
    this.signal = signal;
    if (!this.lcuManager) throw Error("[LobbyState] 检测到客户端未启动！");
    logger.info("[LobbyState] 正在创建房间...");
    await this.lcuManager.createLobbyByQueueId(Queue.TFT_FATIAO);
    await sleep(500);
    logger.info("[LobbyState] 正在开始排队...");
    await this.lcuManager.startMatch();
    const isGameStarted = await this.waitForGameToStart();
    if (isGameStarted) {
      logger.info("[LobbyState] 游戏已开始！流转到 InGameRunningState");
      return new GameLoadingState();
    } else {
      if (!hexService.isRunning) {
        return new EndState();
      } else {
        logger.warn("[LobbyState] 流程中断 (如秒退)，将重新排队...");
        await sleep(1e3);
        return this;
      }
    }
  }
  /**
   * 辅助函数：等待从“排队”到“游戏开始”的完整流程
   * @returns Promise<boolean> - true 表示游戏成功开始, false 表示流程中断(被停止或被秒退)
   */
  waitForGameToStart() {
    return new Promise((resolve) => {
      const cleanup = () => {
        this.lcuManager?.off(LcuEventUri.READY_CHECK, onReadyCheck);
        this.lcuManager?.off(LcuEventUri.GAMEFLOW_PHASE, onGameflowPhase);
        clearInterval(stopCheckInterval);
      };
      const onReadyCheck = (eventData) => {
        if (eventData.data?.state === "InProgress") {
          logger.info("[LobbyState] 已找到对局！正在自动接受...");
          this.lcuManager?.acceptMatch().catch((reason) => {
            console.log(reason);
          });
        }
      };
      const onGameflowPhase = (eventData) => {
        const phase = eventData.data?.phase;
        console.log("onGameflowPhase" + JSON.stringify(eventData, null, 4));
        logger.info(`[LobbyState] 监听到游戏阶段: ${phase}`);
        if (phase === "InProgress") {
          logger.info("[LobbyState] 监听到 GAMEFLOW 变为 InProgress");
          cleanup();
          resolve(true);
        }
      };
      const onCheckStopSignal = () => {
        if (!hexService.isRunning) {
          logger.info("[LobbyState] 检测到用户停止运行");
          cleanup();
          resolve(false);
        }
      };
      this.lcuManager?.on(LcuEventUri.READY_CHECK, onReadyCheck);
      this.lcuManager?.on(LcuEventUri.GAMEFLOW_PHASE, onGameflowPhase);
      const stopCheckInterval = setInterval(onCheckStopSignal, 500);
    });
  }
}
class StartState {
  async action(signal) {
    signal.throwIfAborted();
    const isClientExist = LCUManager?.getInstance()?.isConnected;
    if (isClientExist !== true) {
      logger.error("[StartState] 客户端未启动!");
      return new IdleState();
    }
    logger.info("[HexService] 正在备份当前客户端配置...");
    await GameConfigHelper.backup();
    logger.info("[HexService] 正在应用云顶之弈配置...");
    await GameConfigHelper.applyTFTConfig();
    try {
      await inGameApi.get("/liveclientdata/allgamedata");
      logger.info("[HexService] 检测到游戏已开启，流转到GameStageState");
      return new GameStageState();
    } catch (e) {
      return new LobbyState();
    }
  }
}
class IdleState {
  async action(signal) {
    signal.throwIfAborted();
    return new StartState();
  }
}
class HexService {
  static instance = null;
  //  状态
  abortController = null;
  currentState;
  TICK_RATE_MS = 3e3;
  // looper的心跳间隔。
  constructor() {
    this.currentState = new IdleState();
  }
  static getInstance() {
    if (!HexService.instance) {
      HexService.instance = new HexService();
    }
    return HexService.instance;
  }
  /**
   * 我们检查 abortController 是不是存在
   */
  get isRunning() {
    return this.abortController !== null;
  }
  /**
   * 海克斯科技，启动！
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
  async stop() {
    if (!this.isRunning) {
      logger.warn("[HexService] 服务已停止，无需重复操作。");
      return true;
    }
    try {
      logger.info("———————— [HexService] ————————");
      logger.info("[HexService] 海克斯科技，关闭！");
      this.abortController?.abort("user stop");
      const configHelper2 = GameConfigHelper.getInstance();
      if (configHelper2?.isTFTConfig === true) {
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
   * 创建状态机引擎
   */
  async runMainLoop(signal) {
    logger.info("[HexService-Looper] 启动事件循环。");
    try {
      signal.throwIfAborted();
      while (true) {
        signal.throwIfAborted();
        logger.info(`[HexService-Looper] -> 当前状态: ${this.currentState.constructor.name}`);
        this.currentState = await this.currentState.action(signal);
        if (this.currentState === null) {
          logger.error("[HexService-Looper] -> 上个状态未返回State，流程中止！");
          break;
        }
        await sleep(2e3);
      }
    } catch (error) {
      if (error.name === "AbortError") {
        logger.info(`[HexService-Looper] -> 用户手动退出，挂机流程结束`);
      } else {
        logger.error(`[HexService-Looper] 状态机在 [${this.currentState}] 状态下发生严重错误: ${error.message}`);
      }
    } finally {
      this.currentState = await new EndState().action();
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
}
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
