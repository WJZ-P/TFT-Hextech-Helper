var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { app, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import path$h from "node:path";
import { EventEmitter } from "events";
import require$$1$1 from "os";
import cp from "child_process";
import require$$0$2 from "fs";
import require$$0 from "constants";
import require$$0$1 from "stream";
import require$$4 from "util";
import require$$5 from "assert";
import require$$1 from "path";
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var lib = { exports: {} };
var fs$k = {};
var universalify = {};
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
var polyfills$1 = patch$1;
function patch$1(fs2) {
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
    fs2.rename = typeof fs2.rename !== "function" ? fs2.rename : function(fs$rename) {
      function rename2(from, to, cb) {
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
      if (Object.setPrototypeOf) Object.setPrototypeOf(rename2, fs$rename);
      return rename2;
    }(fs2.rename);
  }
  fs2.read = typeof fs2.read !== "function" ? fs2.read : function(fs$read) {
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
  }(fs2.read);
  fs2.readSync = typeof fs2.readSync !== "function" ? fs2.readSync : /* @__PURE__ */ function(fs$readSync) {
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
  }(fs2.readSync);
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
var Stream = require$$0$1.Stream;
var legacyStreams = legacy$1;
function legacy$1(fs2) {
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
var clone_1 = clone$1;
var getPrototypeOf = Object.getPrototypeOf || function(obj) {
  return obj.__proto__;
};
function clone$1(obj) {
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
var fs$j = require$$0$2;
var polyfills = polyfills$1;
var legacy = legacyStreams;
var clone = clone_1;
var util = require$$4;
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
if (util.debuglog)
  debug = util.debuglog("gfs4");
else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ""))
  debug = function() {
    var m = util.format.apply(util, arguments);
    m = "GFS4: " + m.split(/\n/).join("\nGFS4: ");
    console.error(m);
  };
if (!fs$j[gracefulQueue]) {
  var queue = commonjsGlobal[gracefulQueue] || [];
  publishQueue(fs$j, queue);
  fs$j.close = function(fs$close) {
    function close(fd, cb) {
      return fs$close.call(fs$j, fd, function(err) {
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
  }(fs$j.close);
  fs$j.closeSync = function(fs$closeSync) {
    function closeSync(fd) {
      fs$closeSync.apply(fs$j, arguments);
      resetQueue();
    }
    Object.defineProperty(closeSync, previousSymbol, {
      value: fs$closeSync
    });
    return closeSync;
  }(fs$j.closeSync);
  if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || "")) {
    process.on("exit", function() {
      debug(fs$j[gracefulQueue]);
      require$$5.equal(fs$j[gracefulQueue].length, 0);
    });
  }
}
if (!commonjsGlobal[gracefulQueue]) {
  publishQueue(commonjsGlobal, fs$j[gracefulQueue]);
}
var gracefulFs = patch(clone(fs$j));
if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs$j.__patched) {
  gracefulFs = patch(fs$j);
  fs$j.__patched = true;
}
function patch(fs2) {
  polyfills(fs2);
  fs2.gracefulify = patch;
  fs2.createReadStream = createReadStream;
  fs2.createWriteStream = createWriteStream;
  var fs$readFile = fs2.readFile;
  fs2.readFile = readFile2;
  function readFile2(path2, options, cb) {
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
  var fs$writeFile = fs2.writeFile;
  fs2.writeFile = writeFile2;
  function writeFile2(path2, data, options, cb) {
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
  var fs$appendFile = fs2.appendFile;
  if (fs$appendFile)
    fs2.appendFile = appendFile;
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
  var fs$copyFile = fs2.copyFile;
  if (fs$copyFile)
    fs2.copyFile = copyFile2;
  function copyFile2(src, dest, flags, cb) {
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
  var fs$readdir = fs2.readdir;
  fs2.readdir = readdir;
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
    var legStreams = legacy(fs2);
    ReadStream = legStreams.ReadStream;
    WriteStream = legStreams.WriteStream;
  }
  var fs$ReadStream = fs2.ReadStream;
  if (fs$ReadStream) {
    ReadStream.prototype = Object.create(fs$ReadStream.prototype);
    ReadStream.prototype.open = ReadStream$open;
  }
  var fs$WriteStream = fs2.WriteStream;
  if (fs$WriteStream) {
    WriteStream.prototype = Object.create(fs$WriteStream.prototype);
    WriteStream.prototype.open = WriteStream$open;
  }
  Object.defineProperty(fs2, "ReadStream", {
    get: function() {
      return ReadStream;
    },
    set: function(val) {
      ReadStream = val;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(fs2, "WriteStream", {
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
  Object.defineProperty(fs2, "FileReadStream", {
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
  Object.defineProperty(fs2, "FileWriteStream", {
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
    return new fs2.ReadStream(path2, options);
  }
  function createWriteStream(path2, options) {
    return new fs2.WriteStream(path2, options);
  }
  var fs$open = fs2.open;
  fs2.open = open;
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
  return fs2;
}
function enqueue(elem) {
  debug("ENQUEUE", elem[0].name, elem[1]);
  fs$j[gracefulQueue].push(elem);
  retry();
}
var retryTimer;
function resetQueue() {
  var now = Date.now();
  for (var i = 0; i < fs$j[gracefulQueue].length; ++i) {
    if (fs$j[gracefulQueue][i].length > 2) {
      fs$j[gracefulQueue][i][3] = now;
      fs$j[gracefulQueue][i][4] = now;
    }
  }
  retry();
}
function retry() {
  clearTimeout(retryTimer);
  retryTimer = void 0;
  if (fs$j[gracefulQueue].length === 0)
    return;
  var elem = fs$j[gracefulQueue].shift();
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
      fs$j[gracefulQueue].push(elem);
    }
  }
  if (retryTimer === void 0) {
    retryTimer = setTimeout(retry, 0);
  }
}
(function(exports) {
  const u2 = universalify.fromCallback;
  const fs2 = gracefulFs;
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
    exports[method] = u2(fs2[method]);
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
    exports.realpath.native = u2(fs2.realpath.native);
  }
})(fs$k);
const path$g = require$$1;
function getRootPath(p) {
  p = path$g.normalize(path$g.resolve(p)).split(path$g.sep);
  if (p.length > 0) return p[0];
  return null;
}
const INVALID_PATH_CHARS = /[<>:"|?*]/;
function invalidWin32Path$2(p) {
  const rp = getRootPath(p);
  p = p.replace(rp, "");
  return INVALID_PATH_CHARS.test(p);
}
var win32 = {
  invalidWin32Path: invalidWin32Path$2
};
const fs$i = gracefulFs;
const path$f = require$$1;
const invalidWin32Path$1 = win32.invalidWin32Path;
const o777$1 = parseInt("0777", 8);
function mkdirs$2(p, opts, callback, made) {
  if (typeof opts === "function") {
    callback = opts;
    opts = {};
  } else if (!opts || typeof opts !== "object") {
    opts = { mode: opts };
  }
  if (process.platform === "win32" && invalidWin32Path$1(p)) {
    const errInval = new Error(p + " contains invalid WIN32 path characters.");
    errInval.code = "EINVAL";
    return callback(errInval);
  }
  let mode = opts.mode;
  const xfs = opts.fs || fs$i;
  if (mode === void 0) {
    mode = o777$1 & ~process.umask();
  }
  if (!made) made = null;
  callback = callback || function() {
  };
  p = path$f.resolve(p);
  xfs.mkdir(p, mode, (er) => {
    if (!er) {
      made = made || p;
      return callback(null, made);
    }
    switch (er.code) {
      case "ENOENT":
        if (path$f.dirname(p) === p) return callback(er);
        mkdirs$2(path$f.dirname(p), opts, (er2, made2) => {
          if (er2) callback(er2, made2);
          else mkdirs$2(p, opts, callback, made2);
        });
        break;
      default:
        xfs.stat(p, (er2, stat2) => {
          if (er2 || !stat2.isDirectory()) callback(er, made);
          else callback(null, made);
        });
        break;
    }
  });
}
var mkdirs_1$1 = mkdirs$2;
const fs$h = gracefulFs;
const path$e = require$$1;
const invalidWin32Path = win32.invalidWin32Path;
const o777 = parseInt("0777", 8);
function mkdirsSync$2(p, opts, made) {
  if (!opts || typeof opts !== "object") {
    opts = { mode: opts };
  }
  let mode = opts.mode;
  const xfs = opts.fs || fs$h;
  if (process.platform === "win32" && invalidWin32Path(p)) {
    const errInval = new Error(p + " contains invalid WIN32 path characters.");
    errInval.code = "EINVAL";
    throw errInval;
  }
  if (mode === void 0) {
    mode = o777 & ~process.umask();
  }
  if (!made) made = null;
  p = path$e.resolve(p);
  try {
    xfs.mkdirSync(p, mode);
    made = made || p;
  } catch (err0) {
    if (err0.code === "ENOENT") {
      if (path$e.dirname(p) === p) throw err0;
      made = mkdirsSync$2(path$e.dirname(p), opts, made);
      mkdirsSync$2(p, opts, made);
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
var mkdirsSync_1 = mkdirsSync$2;
const u$b = universalify.fromCallback;
const mkdirs$1 = u$b(mkdirs_1$1);
const mkdirsSync$1 = mkdirsSync_1;
var mkdirs_1 = {
  mkdirs: mkdirs$1,
  mkdirsSync: mkdirsSync$1,
  // alias
  mkdirp: mkdirs$1,
  mkdirpSync: mkdirsSync$1,
  ensureDir: mkdirs$1,
  ensureDirSync: mkdirsSync$1
};
const fs$g = gracefulFs;
function utimesMillis(path2, atime, mtime, callback) {
  fs$g.open(path2, "r+", (err, fd) => {
    if (err) return callback(err);
    fs$g.futimes(fd, atime, mtime, (futimesErr) => {
      fs$g.close(fd, (closeErr) => {
        if (callback) callback(futimesErr || closeErr);
      });
    });
  });
}
function utimesMillisSync(path2, atime, mtime) {
  const fd = fs$g.openSync(path2, "r+");
  fs$g.futimesSync(fd, atime, mtime);
  return fs$g.closeSync(fd);
}
var utimes$1 = {
  utimesMillis,
  utimesMillisSync
};
const fs$f = gracefulFs;
const path$d = require$$1;
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
function getStats$2(src, dest, cb) {
  if (nodeSupportsBigInt()) {
    fs$f.stat(src, { bigint: true }, (err, srcStat) => {
      if (err) return cb(err);
      fs$f.stat(dest, { bigint: true }, (err2, destStat) => {
        if (err2) {
          if (err2.code === "ENOENT") return cb(null, { srcStat, destStat: null });
          return cb(err2);
        }
        return cb(null, { srcStat, destStat });
      });
    });
  } else {
    fs$f.stat(src, (err, srcStat) => {
      if (err) return cb(err);
      fs$f.stat(dest, (err2, destStat) => {
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
    srcStat = fs$f.statSync(src, { bigint: true });
  } else {
    srcStat = fs$f.statSync(src);
  }
  try {
    if (nodeSupportsBigInt()) {
      destStat = fs$f.statSync(dest, { bigint: true });
    } else {
      destStat = fs$f.statSync(dest);
    }
  } catch (err) {
    if (err.code === "ENOENT") return { srcStat, destStat: null };
    throw err;
  }
  return { srcStat, destStat };
}
function checkPaths(src, dest, funcName, cb) {
  getStats$2(src, dest, (err, stats) => {
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
  const srcParent = path$d.resolve(path$d.dirname(src));
  const destParent = path$d.resolve(path$d.dirname(dest));
  if (destParent === srcParent || destParent === path$d.parse(destParent).root) return cb();
  if (nodeSupportsBigInt()) {
    fs$f.stat(destParent, { bigint: true }, (err, destStat) => {
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
    fs$f.stat(destParent, (err, destStat) => {
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
  const srcParent = path$d.resolve(path$d.dirname(src));
  const destParent = path$d.resolve(path$d.dirname(dest));
  if (destParent === srcParent || destParent === path$d.parse(destParent).root) return;
  let destStat;
  try {
    if (nodeSupportsBigInt()) {
      destStat = fs$f.statSync(destParent, { bigint: true });
    } else {
      destStat = fs$f.statSync(destParent);
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
  const srcArr = path$d.resolve(src).split(path$d.sep).filter((i) => i);
  const destArr = path$d.resolve(dest).split(path$d.sep).filter((i) => i);
  return srcArr.reduce((acc, cur, i) => acc && destArr[i] === cur, true);
}
function errMsg(src, dest, funcName) {
  return `Cannot ${funcName} '${src}' to a subdirectory of itself, '${dest}'.`;
}
var stat$4 = {
  checkPaths,
  checkPathsSync,
  checkParentPaths,
  checkParentPathsSync,
  isSrcSubdir
};
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
const fs$e = gracefulFs;
const path$c = require$$1;
const mkdirpSync$1 = mkdirs_1.mkdirsSync;
const utimesSync = utimes$1.utimesMillisSync;
const stat$3 = stat$4;
function copySync$2(src, dest, opts) {
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
  const { srcStat, destStat } = stat$3.checkPathsSync(src, dest, "copy");
  stat$3.checkParentPathsSync(src, srcStat, dest, "copy");
  return handleFilterAndCopy(destStat, src, dest, opts);
}
function handleFilterAndCopy(destStat, src, dest, opts) {
  if (opts.filter && !opts.filter(src, dest)) return;
  const destParent = path$c.dirname(dest);
  if (!fs$e.existsSync(destParent)) mkdirpSync$1(destParent);
  return startCopy$1(destStat, src, dest, opts);
}
function startCopy$1(destStat, src, dest, opts) {
  if (opts.filter && !opts.filter(src, dest)) return;
  return getStats$1(destStat, src, dest, opts);
}
function getStats$1(destStat, src, dest, opts) {
  const statSync = opts.dereference ? fs$e.statSync : fs$e.lstatSync;
  const srcStat = statSync(src);
  if (srcStat.isDirectory()) return onDir$1(srcStat, destStat, src, dest, opts);
  else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) return onFile$1(srcStat, destStat, src, dest, opts);
  else if (srcStat.isSymbolicLink()) return onLink$1(destStat, src, dest, opts);
}
function onFile$1(srcStat, destStat, src, dest, opts) {
  if (!destStat) return copyFile$1(srcStat, src, dest, opts);
  return mayCopyFile$1(srcStat, src, dest, opts);
}
function mayCopyFile$1(srcStat, src, dest, opts) {
  if (opts.overwrite) {
    fs$e.unlinkSync(dest);
    return copyFile$1(srcStat, src, dest, opts);
  } else if (opts.errorOnExist) {
    throw new Error(`'${dest}' already exists`);
  }
}
function copyFile$1(srcStat, src, dest, opts) {
  if (typeof fs$e.copyFileSync === "function") {
    fs$e.copyFileSync(src, dest);
    fs$e.chmodSync(dest, srcStat.mode);
    if (opts.preserveTimestamps) {
      return utimesSync(dest, srcStat.atime, srcStat.mtime);
    }
    return;
  }
  return copyFileFallback$1(srcStat, src, dest, opts);
}
function copyFileFallback$1(srcStat, src, dest, opts) {
  const BUF_LENGTH = 64 * 1024;
  const _buff = requireBuffer()(BUF_LENGTH);
  const fdr = fs$e.openSync(src, "r");
  const fdw = fs$e.openSync(dest, "w", srcStat.mode);
  let pos = 0;
  while (pos < srcStat.size) {
    const bytesRead = fs$e.readSync(fdr, _buff, 0, BUF_LENGTH, pos);
    fs$e.writeSync(fdw, _buff, 0, bytesRead);
    pos += bytesRead;
  }
  if (opts.preserveTimestamps) fs$e.futimesSync(fdw, srcStat.atime, srcStat.mtime);
  fs$e.closeSync(fdr);
  fs$e.closeSync(fdw);
}
function onDir$1(srcStat, destStat, src, dest, opts) {
  if (!destStat) return mkDirAndCopy$1(srcStat, src, dest, opts);
  if (destStat && !destStat.isDirectory()) {
    throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`);
  }
  return copyDir$1(src, dest, opts);
}
function mkDirAndCopy$1(srcStat, src, dest, opts) {
  fs$e.mkdirSync(dest);
  copyDir$1(src, dest, opts);
  return fs$e.chmodSync(dest, srcStat.mode);
}
function copyDir$1(src, dest, opts) {
  fs$e.readdirSync(src).forEach((item) => copyDirItem$1(item, src, dest, opts));
}
function copyDirItem$1(item, src, dest, opts) {
  const srcItem = path$c.join(src, item);
  const destItem = path$c.join(dest, item);
  const { destStat } = stat$3.checkPathsSync(srcItem, destItem, "copy");
  return startCopy$1(destStat, srcItem, destItem, opts);
}
function onLink$1(destStat, src, dest, opts) {
  let resolvedSrc = fs$e.readlinkSync(src);
  if (opts.dereference) {
    resolvedSrc = path$c.resolve(process.cwd(), resolvedSrc);
  }
  if (!destStat) {
    return fs$e.symlinkSync(resolvedSrc, dest);
  } else {
    let resolvedDest;
    try {
      resolvedDest = fs$e.readlinkSync(dest);
    } catch (err) {
      if (err.code === "EINVAL" || err.code === "UNKNOWN") return fs$e.symlinkSync(resolvedSrc, dest);
      throw err;
    }
    if (opts.dereference) {
      resolvedDest = path$c.resolve(process.cwd(), resolvedDest);
    }
    if (stat$3.isSrcSubdir(resolvedSrc, resolvedDest)) {
      throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`);
    }
    if (fs$e.statSync(dest).isDirectory() && stat$3.isSrcSubdir(resolvedDest, resolvedSrc)) {
      throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`);
    }
    return copyLink$1(resolvedSrc, dest);
  }
}
function copyLink$1(resolvedSrc, dest) {
  fs$e.unlinkSync(dest);
  return fs$e.symlinkSync(resolvedSrc, dest);
}
var copySync_1 = copySync$2;
var copySync$1 = {
  copySync: copySync_1
};
const u$a = universalify.fromPromise;
const fs$d = fs$k;
function pathExists$8(path2) {
  return fs$d.access(path2).then(() => true).catch(() => false);
}
var pathExists_1 = {
  pathExists: u$a(pathExists$8),
  pathExistsSync: fs$d.existsSync
};
const fs$c = gracefulFs;
const path$b = require$$1;
const mkdirp$1 = mkdirs_1.mkdirs;
const pathExists$7 = pathExists_1.pathExists;
const utimes = utimes$1.utimesMillis;
const stat$2 = stat$4;
function copy$2(src, dest, opts, cb) {
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
  stat$2.checkPaths(src, dest, "copy", (err, stats) => {
    if (err) return cb(err);
    const { srcStat, destStat } = stats;
    stat$2.checkParentPaths(src, srcStat, dest, "copy", (err2) => {
      if (err2) return cb(err2);
      if (opts.filter) return handleFilter(checkParentDir, destStat, src, dest, opts, cb);
      return checkParentDir(destStat, src, dest, opts, cb);
    });
  });
}
function checkParentDir(destStat, src, dest, opts, cb) {
  const destParent = path$b.dirname(dest);
  pathExists$7(destParent, (err, dirExists) => {
    if (err) return cb(err);
    if (dirExists) return startCopy(destStat, src, dest, opts, cb);
    mkdirp$1(destParent, (err2) => {
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
  const stat2 = opts.dereference ? fs$c.stat : fs$c.lstat;
  stat2(src, (err, srcStat) => {
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
    fs$c.unlink(dest, (err) => {
      if (err) return cb(err);
      return copyFile(srcStat, src, dest, opts, cb);
    });
  } else if (opts.errorOnExist) {
    return cb(new Error(`'${dest}' already exists`));
  } else return cb();
}
function copyFile(srcStat, src, dest, opts, cb) {
  if (typeof fs$c.copyFile === "function") {
    return fs$c.copyFile(src, dest, (err) => {
      if (err) return cb(err);
      return setDestModeAndTimestamps(srcStat, dest, opts, cb);
    });
  }
  return copyFileFallback(srcStat, src, dest, opts, cb);
}
function copyFileFallback(srcStat, src, dest, opts, cb) {
  const rs = fs$c.createReadStream(src);
  rs.on("error", (err) => cb(err)).once("open", () => {
    const ws = fs$c.createWriteStream(dest, { mode: srcStat.mode });
    ws.on("error", (err) => cb(err)).on("open", () => rs.pipe(ws)).once("close", () => setDestModeAndTimestamps(srcStat, dest, opts, cb));
  });
}
function setDestModeAndTimestamps(srcStat, dest, opts, cb) {
  fs$c.chmod(dest, srcStat.mode, (err) => {
    if (err) return cb(err);
    if (opts.preserveTimestamps) {
      return utimes(dest, srcStat.atime, srcStat.mtime, cb);
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
  fs$c.mkdir(dest, (err) => {
    if (err) return cb(err);
    copyDir(src, dest, opts, (err2) => {
      if (err2) return cb(err2);
      return fs$c.chmod(dest, srcStat.mode, cb);
    });
  });
}
function copyDir(src, dest, opts, cb) {
  fs$c.readdir(src, (err, items) => {
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
  const srcItem = path$b.join(src, item);
  const destItem = path$b.join(dest, item);
  stat$2.checkPaths(srcItem, destItem, "copy", (err, stats) => {
    if (err) return cb(err);
    const { destStat } = stats;
    startCopy(destStat, srcItem, destItem, opts, (err2) => {
      if (err2) return cb(err2);
      return copyDirItems(items, src, dest, opts, cb);
    });
  });
}
function onLink(destStat, src, dest, opts, cb) {
  fs$c.readlink(src, (err, resolvedSrc) => {
    if (err) return cb(err);
    if (opts.dereference) {
      resolvedSrc = path$b.resolve(process.cwd(), resolvedSrc);
    }
    if (!destStat) {
      return fs$c.symlink(resolvedSrc, dest, cb);
    } else {
      fs$c.readlink(dest, (err2, resolvedDest) => {
        if (err2) {
          if (err2.code === "EINVAL" || err2.code === "UNKNOWN") return fs$c.symlink(resolvedSrc, dest, cb);
          return cb(err2);
        }
        if (opts.dereference) {
          resolvedDest = path$b.resolve(process.cwd(), resolvedDest);
        }
        if (stat$2.isSrcSubdir(resolvedSrc, resolvedDest)) {
          return cb(new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`));
        }
        if (destStat.isDirectory() && stat$2.isSrcSubdir(resolvedDest, resolvedSrc)) {
          return cb(new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`));
        }
        return copyLink(resolvedSrc, dest, cb);
      });
    }
  });
}
function copyLink(resolvedSrc, dest, cb) {
  fs$c.unlink(dest, (err) => {
    if (err) return cb(err);
    return fs$c.symlink(resolvedSrc, dest, cb);
  });
}
var copy_1 = copy$2;
const u$9 = universalify.fromCallback;
var copy$1 = {
  copy: u$9(copy_1)
};
const fs$b = gracefulFs;
const path$a = require$$1;
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
    options[m] = options[m] || fs$b[m];
    m = m + "Sync";
    options[m] = options[m] || fs$b[m];
  });
  options.maxBusyTries = options.maxBusyTries || 3;
}
function rimraf$1(p, options, cb) {
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
      rimraf$1(path$a.join(p, f), options, (er2) => {
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
  options.readdirSync(p).forEach((f) => rimrafSync(path$a.join(p, f), options));
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
var rimraf_1 = rimraf$1;
rimraf$1.sync = rimrafSync;
const u$8 = universalify.fromCallback;
const rimraf = rimraf_1;
var remove$2 = {
  remove: u$8(rimraf),
  removeSync: rimraf.sync
};
const u$7 = universalify.fromCallback;
const fs$a = gracefulFs;
const path$9 = require$$1;
const mkdir$5 = mkdirs_1;
const remove$1 = remove$2;
const emptyDir = u$7(function emptyDir2(dir, callback) {
  callback = callback || function() {
  };
  fs$a.readdir(dir, (err, items) => {
    if (err) return mkdir$5.mkdirs(dir, callback);
    items = items.map((item) => path$9.join(dir, item));
    deleteItem();
    function deleteItem() {
      const item = items.pop();
      if (!item) return callback();
      remove$1.remove(item, (err2) => {
        if (err2) return callback(err2);
        deleteItem();
      });
    }
  });
});
function emptyDirSync(dir) {
  let items;
  try {
    items = fs$a.readdirSync(dir);
  } catch (err) {
    return mkdir$5.mkdirsSync(dir);
  }
  items.forEach((item) => {
    item = path$9.join(dir, item);
    remove$1.removeSync(item);
  });
}
var empty = {
  emptyDirSync,
  emptydirSync: emptyDirSync,
  emptyDir,
  emptydir: emptyDir
};
const u$6 = universalify.fromCallback;
const path$8 = require$$1;
const fs$9 = gracefulFs;
const mkdir$4 = mkdirs_1;
const pathExists$6 = pathExists_1.pathExists;
function createFile(file2, callback) {
  function makeFile() {
    fs$9.writeFile(file2, "", (err) => {
      if (err) return callback(err);
      callback();
    });
  }
  fs$9.stat(file2, (err, stats) => {
    if (!err && stats.isFile()) return callback();
    const dir = path$8.dirname(file2);
    pathExists$6(dir, (err2, dirExists) => {
      if (err2) return callback(err2);
      if (dirExists) return makeFile();
      mkdir$4.mkdirs(dir, (err3) => {
        if (err3) return callback(err3);
        makeFile();
      });
    });
  });
}
function createFileSync(file2) {
  let stats;
  try {
    stats = fs$9.statSync(file2);
  } catch (e) {
  }
  if (stats && stats.isFile()) return;
  const dir = path$8.dirname(file2);
  if (!fs$9.existsSync(dir)) {
    mkdir$4.mkdirsSync(dir);
  }
  fs$9.writeFileSync(file2, "");
}
var file$1 = {
  createFile: u$6(createFile),
  createFileSync
};
const u$5 = universalify.fromCallback;
const path$7 = require$$1;
const fs$8 = gracefulFs;
const mkdir$3 = mkdirs_1;
const pathExists$5 = pathExists_1.pathExists;
function createLink(srcpath, dstpath, callback) {
  function makeLink(srcpath2, dstpath2) {
    fs$8.link(srcpath2, dstpath2, (err) => {
      if (err) return callback(err);
      callback(null);
    });
  }
  pathExists$5(dstpath, (err, destinationExists) => {
    if (err) return callback(err);
    if (destinationExists) return callback(null);
    fs$8.lstat(srcpath, (err2) => {
      if (err2) {
        err2.message = err2.message.replace("lstat", "ensureLink");
        return callback(err2);
      }
      const dir = path$7.dirname(dstpath);
      pathExists$5(dir, (err3, dirExists) => {
        if (err3) return callback(err3);
        if (dirExists) return makeLink(srcpath, dstpath);
        mkdir$3.mkdirs(dir, (err4) => {
          if (err4) return callback(err4);
          makeLink(srcpath, dstpath);
        });
      });
    });
  });
}
function createLinkSync(srcpath, dstpath) {
  const destinationExists = fs$8.existsSync(dstpath);
  if (destinationExists) return void 0;
  try {
    fs$8.lstatSync(srcpath);
  } catch (err) {
    err.message = err.message.replace("lstat", "ensureLink");
    throw err;
  }
  const dir = path$7.dirname(dstpath);
  const dirExists = fs$8.existsSync(dir);
  if (dirExists) return fs$8.linkSync(srcpath, dstpath);
  mkdir$3.mkdirsSync(dir);
  return fs$8.linkSync(srcpath, dstpath);
}
var link$1 = {
  createLink: u$5(createLink),
  createLinkSync
};
const path$6 = require$$1;
const fs$7 = gracefulFs;
const pathExists$4 = pathExists_1.pathExists;
function symlinkPaths$1(srcpath, dstpath, callback) {
  if (path$6.isAbsolute(srcpath)) {
    return fs$7.lstat(srcpath, (err) => {
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
    const dstdir = path$6.dirname(dstpath);
    const relativeToDst = path$6.join(dstdir, srcpath);
    return pathExists$4(relativeToDst, (err, exists) => {
      if (err) return callback(err);
      if (exists) {
        return callback(null, {
          "toCwd": relativeToDst,
          "toDst": srcpath
        });
      } else {
        return fs$7.lstat(srcpath, (err2) => {
          if (err2) {
            err2.message = err2.message.replace("lstat", "ensureSymlink");
            return callback(err2);
          }
          return callback(null, {
            "toCwd": srcpath,
            "toDst": path$6.relative(dstdir, srcpath)
          });
        });
      }
    });
  }
}
function symlinkPathsSync$1(srcpath, dstpath) {
  let exists;
  if (path$6.isAbsolute(srcpath)) {
    exists = fs$7.existsSync(srcpath);
    if (!exists) throw new Error("absolute srcpath does not exist");
    return {
      "toCwd": srcpath,
      "toDst": srcpath
    };
  } else {
    const dstdir = path$6.dirname(dstpath);
    const relativeToDst = path$6.join(dstdir, srcpath);
    exists = fs$7.existsSync(relativeToDst);
    if (exists) {
      return {
        "toCwd": relativeToDst,
        "toDst": srcpath
      };
    } else {
      exists = fs$7.existsSync(srcpath);
      if (!exists) throw new Error("relative srcpath does not exist");
      return {
        "toCwd": srcpath,
        "toDst": path$6.relative(dstdir, srcpath)
      };
    }
  }
}
var symlinkPaths_1 = {
  symlinkPaths: symlinkPaths$1,
  symlinkPathsSync: symlinkPathsSync$1
};
const fs$6 = gracefulFs;
function symlinkType$1(srcpath, type, callback) {
  callback = typeof type === "function" ? type : callback;
  type = typeof type === "function" ? false : type;
  if (type) return callback(null, type);
  fs$6.lstat(srcpath, (err, stats) => {
    if (err) return callback(null, "file");
    type = stats && stats.isDirectory() ? "dir" : "file";
    callback(null, type);
  });
}
function symlinkTypeSync$1(srcpath, type) {
  let stats;
  if (type) return type;
  try {
    stats = fs$6.lstatSync(srcpath);
  } catch (e) {
    return "file";
  }
  return stats && stats.isDirectory() ? "dir" : "file";
}
var symlinkType_1 = {
  symlinkType: symlinkType$1,
  symlinkTypeSync: symlinkTypeSync$1
};
const u$4 = universalify.fromCallback;
const path$5 = require$$1;
const fs$5 = gracefulFs;
const _mkdirs = mkdirs_1;
const mkdirs = _mkdirs.mkdirs;
const mkdirsSync = _mkdirs.mkdirsSync;
const _symlinkPaths = symlinkPaths_1;
const symlinkPaths = _symlinkPaths.symlinkPaths;
const symlinkPathsSync = _symlinkPaths.symlinkPathsSync;
const _symlinkType = symlinkType_1;
const symlinkType = _symlinkType.symlinkType;
const symlinkTypeSync = _symlinkType.symlinkTypeSync;
const pathExists$3 = pathExists_1.pathExists;
function createSymlink(srcpath, dstpath, type, callback) {
  callback = typeof type === "function" ? type : callback;
  type = typeof type === "function" ? false : type;
  pathExists$3(dstpath, (err, destinationExists) => {
    if (err) return callback(err);
    if (destinationExists) return callback(null);
    symlinkPaths(srcpath, dstpath, (err2, relative) => {
      if (err2) return callback(err2);
      srcpath = relative.toDst;
      symlinkType(relative.toCwd, type, (err3, type2) => {
        if (err3) return callback(err3);
        const dir = path$5.dirname(dstpath);
        pathExists$3(dir, (err4, dirExists) => {
          if (err4) return callback(err4);
          if (dirExists) return fs$5.symlink(srcpath, dstpath, type2, callback);
          mkdirs(dir, (err5) => {
            if (err5) return callback(err5);
            fs$5.symlink(srcpath, dstpath, type2, callback);
          });
        });
      });
    });
  });
}
function createSymlinkSync(srcpath, dstpath, type) {
  const destinationExists = fs$5.existsSync(dstpath);
  if (destinationExists) return void 0;
  const relative = symlinkPathsSync(srcpath, dstpath);
  srcpath = relative.toDst;
  type = symlinkTypeSync(relative.toCwd, type);
  const dir = path$5.dirname(dstpath);
  const exists = fs$5.existsSync(dir);
  if (exists) return fs$5.symlinkSync(srcpath, dstpath, type);
  mkdirsSync(dir);
  return fs$5.symlinkSync(srcpath, dstpath, type);
}
var symlink$1 = {
  createSymlink: u$4(createSymlink),
  createSymlinkSync
};
const file = file$1;
const link = link$1;
const symlink = symlink$1;
var ensure = {
  // file
  createFile: file.createFile,
  createFileSync: file.createFileSync,
  ensureFile: file.createFile,
  ensureFileSync: file.createFileSync,
  // link
  createLink: link.createLink,
  createLinkSync: link.createLinkSync,
  ensureLink: link.createLink,
  ensureLinkSync: link.createLinkSync,
  // symlink
  createSymlink: symlink.createSymlink,
  createSymlinkSync: symlink.createSymlinkSync,
  ensureSymlink: symlink.createSymlink,
  ensureSymlinkSync: symlink.createSymlinkSync
};
var _fs;
try {
  _fs = gracefulFs;
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
var jsonfile$1 = {
  readFile,
  readFileSync,
  writeFile,
  writeFileSync
};
var jsonfile_1 = jsonfile$1;
const u$3 = universalify.fromCallback;
const jsonFile$3 = jsonfile_1;
var jsonfile = {
  // jsonfile exports
  readJson: u$3(jsonFile$3.readFile),
  readJsonSync: jsonFile$3.readFileSync,
  writeJson: u$3(jsonFile$3.writeFile),
  writeJsonSync: jsonFile$3.writeFileSync
};
const path$4 = require$$1;
const mkdir$2 = mkdirs_1;
const pathExists$2 = pathExists_1.pathExists;
const jsonFile$2 = jsonfile;
function outputJson(file2, data, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  const dir = path$4.dirname(file2);
  pathExists$2(dir, (err, itDoes) => {
    if (err) return callback(err);
    if (itDoes) return jsonFile$2.writeJson(file2, data, options, callback);
    mkdir$2.mkdirs(dir, (err2) => {
      if (err2) return callback(err2);
      jsonFile$2.writeJson(file2, data, options, callback);
    });
  });
}
var outputJson_1 = outputJson;
const fs$4 = gracefulFs;
const path$3 = require$$1;
const mkdir$1 = mkdirs_1;
const jsonFile$1 = jsonfile;
function outputJsonSync(file2, data, options) {
  const dir = path$3.dirname(file2);
  if (!fs$4.existsSync(dir)) {
    mkdir$1.mkdirsSync(dir);
  }
  jsonFile$1.writeJsonSync(file2, data, options);
}
var outputJsonSync_1 = outputJsonSync;
const u$2 = universalify.fromCallback;
const jsonFile = jsonfile;
jsonFile.outputJson = u$2(outputJson_1);
jsonFile.outputJsonSync = outputJsonSync_1;
jsonFile.outputJSON = jsonFile.outputJson;
jsonFile.outputJSONSync = jsonFile.outputJsonSync;
jsonFile.writeJSON = jsonFile.writeJson;
jsonFile.writeJSONSync = jsonFile.writeJsonSync;
jsonFile.readJSON = jsonFile.readJson;
jsonFile.readJSONSync = jsonFile.readJsonSync;
var json = jsonFile;
const fs$3 = gracefulFs;
const path$2 = require$$1;
const copySync = copySync$1.copySync;
const removeSync = remove$2.removeSync;
const mkdirpSync = mkdirs_1.mkdirpSync;
const stat$1 = stat$4;
function moveSync$1(src, dest, opts) {
  opts = opts || {};
  const overwrite = opts.overwrite || opts.clobber || false;
  const { srcStat } = stat$1.checkPathsSync(src, dest, "move");
  stat$1.checkParentPathsSync(src, srcStat, dest, "move");
  mkdirpSync(path$2.dirname(dest));
  return doRename$1(src, dest, overwrite);
}
function doRename$1(src, dest, overwrite) {
  if (overwrite) {
    removeSync(dest);
    return rename$1(src, dest, overwrite);
  }
  if (fs$3.existsSync(dest)) throw new Error("dest already exists.");
  return rename$1(src, dest, overwrite);
}
function rename$1(src, dest, overwrite) {
  try {
    fs$3.renameSync(src, dest);
  } catch (err) {
    if (err.code !== "EXDEV") throw err;
    return moveAcrossDevice$1(src, dest, overwrite);
  }
}
function moveAcrossDevice$1(src, dest, overwrite) {
  const opts = {
    overwrite,
    errorOnExist: true
  };
  copySync(src, dest, opts);
  return removeSync(src);
}
var moveSync_1 = moveSync$1;
var moveSync = {
  moveSync: moveSync_1
};
const fs$2 = gracefulFs;
const path$1 = require$$1;
const copy = copy$1.copy;
const remove = remove$2.remove;
const mkdirp = mkdirs_1.mkdirp;
const pathExists$1 = pathExists_1.pathExists;
const stat = stat$4;
function move$1(src, dest, opts, cb) {
  if (typeof opts === "function") {
    cb = opts;
    opts = {};
  }
  const overwrite = opts.overwrite || opts.clobber || false;
  stat.checkPaths(src, dest, "move", (err, stats) => {
    if (err) return cb(err);
    const { srcStat } = stats;
    stat.checkParentPaths(src, srcStat, dest, "move", (err2) => {
      if (err2) return cb(err2);
      mkdirp(path$1.dirname(dest), (err3) => {
        if (err3) return cb(err3);
        return doRename(src, dest, overwrite, cb);
      });
    });
  });
}
function doRename(src, dest, overwrite, cb) {
  if (overwrite) {
    return remove(dest, (err) => {
      if (err) return cb(err);
      return rename(src, dest, overwrite, cb);
    });
  }
  pathExists$1(dest, (err, destExists) => {
    if (err) return cb(err);
    if (destExists) return cb(new Error("dest already exists."));
    return rename(src, dest, overwrite, cb);
  });
}
function rename(src, dest, overwrite, cb) {
  fs$2.rename(src, dest, (err) => {
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
  copy(src, dest, opts, (err) => {
    if (err) return cb(err);
    return remove(src, cb);
  });
}
var move_1 = move$1;
const u$1 = universalify.fromCallback;
var move = {
  move: u$1(move_1)
};
const u = universalify.fromCallback;
const fs$1 = gracefulFs;
const path = require$$1;
const mkdir = mkdirs_1;
const pathExists = pathExists_1.pathExists;
function outputFile(file2, data, encoding, callback) {
  if (typeof encoding === "function") {
    callback = encoding;
    encoding = "utf8";
  }
  const dir = path.dirname(file2);
  pathExists(dir, (err, itDoes) => {
    if (err) return callback(err);
    if (itDoes) return fs$1.writeFile(file2, data, encoding, callback);
    mkdir.mkdirs(dir, (err2) => {
      if (err2) return callback(err2);
      fs$1.writeFile(file2, data, encoding, callback);
    });
  });
}
function outputFileSync(file2, ...args) {
  const dir = path.dirname(file2);
  if (fs$1.existsSync(dir)) {
    return fs$1.writeFileSync(file2, ...args);
  }
  mkdir.mkdirsSync(dir);
  fs$1.writeFileSync(file2, ...args);
}
var output = {
  outputFile: u(outputFile),
  outputFileSync
};
(function(module) {
  module.exports = Object.assign(
    {},
    // Export promiseified graceful-fs:
    fs$k,
    // Export extra methods:
    copySync$1,
    copy$1,
    empty,
    ensure,
    json,
    mkdirs_1,
    moveSync,
    move,
    output,
    pathExists_1,
    remove$2
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
var libExports = lib.exports;
const fs = /* @__PURE__ */ getDefaultExportFromCjs(libExports);
const IS_WIN = process.platform === "win32";
const IS_MAC = process.platform === "darwin";
const IS_WSL = process.platform === "linux" && require$$1$1.release().toLowerCase().includes("microsoft");
class LCUConnector extends EventEmitter {
  constructor() {
    super(...arguments);
    __publicField(this, "processWatcher");
  }
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
        const portMatch = stdout.match(/--app-port=(\d+)/);
        const tokenMatch = stdout.match(/--remoting-auth-token=(\w+)/);
        const pidMatch = stdout.match(/--app-pid=(\d+)/);
        if (portMatch && tokenMatch && pidMatch) {
          const data = {
            port: parseInt(portMatch[1]),
            pid: parseInt(pidMatch[1]),
            token: tokenMatch[1]
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
    const common = fs.existsSync(path$h.join(dirPath, lcuClientApp)) && fs.existsSync(path$h.join(dirPath, "Config"));
    const isGlobal = common && fs.existsSync(path$h.join(dirPath, "RADS"));
    const isCN = common && fs.existsSync(path$h.join(dirPath, "TQM"));
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
      console.log("LOL客户端未启动，一秒后将再次检查...");
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
const __dirname = path$h.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path$h.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path$h.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path$h.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path$h.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    icon: path$h.join(process.env.VITE_PUBLIC, "icon.png"),
    //  窗口左上角的图标
    webPreferences: {
      preload: path$h.join(__dirname, "preload.mjs")
      // 指定preload文件
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path$h.join(RENDERER_DIST, "index.html"));
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
app.whenReady().then(() => {
  createWindow();
  init();
});
function init() {
  const connector = new LCUConnector();
  connector.on("connect", (data) => {
    console.log("LOL客户端登录！");
    console.log(data);
    sendToRenderer("lcu-connect", data);
  }).on("disconnect", () => {
    console.log("LOL客户端登出！");
    sendToRenderer("lcu-disconnect");
  });
  connector.start();
}
function sendToRenderer(channel, ...args) {
  return win == null ? void 0 : win.webContents.send(channel, ...args);
}
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
