import { app, BrowserWindow, dialog, shell, ipcMain, net } from "electron";
import * as path from "path";
import path__default from "path";
import cp, { exec as exec$1 } from "child_process";
import * as fs$2 from "fs";
import fs__default from "fs";
import * as os from "os";
import os__default from "os";
import { EventEmitter } from "events";
import require$$4 from "util";
import path$1 from "node:path";
import require$$0 from "constants";
import require$$0$1 from "stream";
import require$$5 from "assert";
import WebSocket from "ws";
import https from "https";
import axios from "axios";
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
const LOG_DIR_NAME = "crash-logs";
function getCrashLogDir() {
  const candidates = [];
  try {
    let exeDir = path.dirname(app.getPath("exe"));
    if (!app.isPackaged) {
      exeDir = process.cwd();
    }
    candidates.push(path.join(exeDir, LOG_DIR_NAME));
  } catch (e) {
  }
  try {
    candidates.push(path.join(app.getPath("userData"), LOG_DIR_NAME));
  } catch (e) {
  }
  try {
    candidates.push(path.join(os.tmpdir(), app.name || "electron-app", LOG_DIR_NAME));
  } catch (e) {
  }
  for (const dir of candidates) {
    try {
      if (!fs$2.existsSync(dir)) {
        fs$2.mkdirSync(dir, { recursive: true });
      }
      const testFile = path.join(dir, ".test-write");
      fs$2.writeFileSync(testFile, "test");
      fs$2.unlinkSync(testFile);
      return dir;
    } catch (e) {
      continue;
    }
  }
  return path.join(process.cwd(), LOG_DIR_NAME);
}
function getTimestampForFilename() {
  const now = /* @__PURE__ */ new Date();
  return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0") + "_" + String(now.getHours()).padStart(2, "0") + "-" + String(now.getMinutes()).padStart(2, "0") + "-" + String(now.getSeconds()).padStart(2, "0");
}
function getSystemInfo() {
  const info = [
    `操作系统: ${os.platform()} ${os.release()} (${os.arch()})`,
    `主机名: ${os.hostname()}`,
    `Node.js: ${process.version}`,
    `Electron: ${process.versions.electron || "未知"}`,
    `Chrome: ${process.versions.chrome || "未知"}`,
    `总内存: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB`,
    `可用内存: ${Math.round(os.freemem() / 1024 / 1024 / 1024)} GB`,
    `CPU 型号: ${os.cpus()[0]?.model || "未知"}`
  ];
  try {
    info.push(`应用版本: ${app.getVersion()}`);
    info.push(`是否打包: ${app.isPackaged ? "是" : "否"}`);
  } catch {
    info.push(`应用状态: App 尚未初始化完成`);
  }
  return info.join("\n");
}
function writeCrashLog(error, context = "未知错误上下文") {
  let finalLogPath = "";
  try {
    const logDir = getCrashLogDir();
    const timestamp = getTimestampForFilename();
    finalLogPath = path.join(logDir, `crash_${timestamp}.log`);
    let errorMessage = "";
    let errorStack = "";
    if (error instanceof Error) {
      errorMessage = error.message;
      errorStack = error.stack || "无堆栈";
    } else if (typeof error === "object") {
      try {
        errorMessage = JSON.stringify(error);
        errorStack = "非 Error 对象，无堆栈";
      } catch {
        errorMessage = String(error);
      }
    } else {
      errorMessage = String(error);
    }
    const logContent = `
================================================================================
                        应用崩溃报告 (Crash Report)
================================================================================
时间: ${(/* @__PURE__ */ new Date()).toLocaleString("zh-CN")}
上下文: ${context}
日志路径: ${finalLogPath}
--------------------------------------------------------------------------------
[错误信息 / Message]
${errorMessage}

--------------------------------------------------------------------------------
[错误堆栈 / Stack Trace]
${errorStack}

--------------------------------------------------------------------------------
[系统环境 / System Info]
${getSystemInfo()}

--------------------------------------------------------------------------------
[环境变量 / Env]
NODE_ENV: ${process.env.NODE_ENV}
USER_DATA: ${app.getPath("userData")}
EXE_PATH: ${app.getPath("exe")}
================================================================================
`;
    fs$2.writeFileSync(finalLogPath, logContent, "utf-8");
    console.error(`
🔴 严重错误！崩溃日志已保存至: ${finalLogPath}
`);
  } catch (writeError) {
    console.error("❌ 写入崩溃日志失败 (Write Failed):", writeError);
    console.error("原始错误 (Original Error):", error);
  }
  return finalLogPath;
}
function initGlobalCrashHandler() {
  process.on("uncaughtException", (error) => {
    writeCrashLog(error, "Main Process Uncaught Exception (主进程未捕获异常)");
  });
  process.on("unhandledRejection", (reason) => {
    writeCrashLog(reason, "Main Process Unhandled Rejection (主进程未处理 Promise)");
  });
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
  const os2 = os__default;
  const path2 = path__default;
  function hasMillisResSync() {
    let tmpfile = path2.join("millis-test-sync" + Date.now().toString() + Math.random().toString().slice(2));
    tmpfile = path2.join(os2.tmpdir(), tmpfile);
    const d = /* @__PURE__ */ new Date(1435410243862);
    fs2.writeFileSync(tmpfile, "https://github.com/jprichardson/node-fs-extra/pull/141");
    const fd = fs2.openSync(tmpfile, "r+");
    fs2.futimesSync(fd, d, d);
    fs2.closeSync(fd);
    return fs2.statSync(tmpfile).mtime > 1435410243e3;
  }
  function hasMillisRes(callback) {
    let tmpfile = path2.join("millis-test" + Date.now().toString() + Math.random().toString().slice(2));
    tmpfile = path2.join(os2.tmpdir(), tmpfile);
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
const exec = require$$4.promisify(cp.exec);
class ClientNotFoundError extends Error {
  constructor() {
    super("无法找到英雄联盟客户端进程！");
  }
}
class ClientElevatedPermsError extends Error {
  constructor() {
    super("软件没有在管理员模式下运行！");
  }
}
class LCUConnector extends EventEmitter {
  isMonitoring = false;
  pollInterval = 1e3;
  checkTimer = null;
  /**
   * 启动连接器，开始轮询查找客户端进程
   */
  start() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    console.info("[LCUConnector] 开始监听 LOL 客户端进程...");
    this.monitor();
  }
  /**
   * 停止连接器
   */
  stop() {
    this.isMonitoring = false;
    if (this.checkTimer) {
      clearTimeout(this.checkTimer);
      this.checkTimer = null;
    }
    console.info("[LCUConnector] 停止监听 LOL 客户端进程");
  }
  /**
   * 轮询监控逻辑
   */
  async monitor() {
    if (!this.isMonitoring) return;
    try {
      const info = await this.authenticate();
      console.info(`[LCUConnector] 成功获取客户端信息: PID=${info.pid}, Port=${info.port}`);
      this.emit("connect", info);
      this.isMonitoring = false;
    } catch (err) {
      if (err instanceof ClientNotFoundError) {
        logger.error("未检测到LOL客户端，一秒后将再次检查...");
      } else if (err instanceof ClientElevatedPermsError) {
        logger.warn("[LCUConnector] 检测到客户端以管理员权限运行，获取进程信息失败。请以管理员身份运行海克斯科技助手！");
      } else {
        logger.error(`[LCUConnector] 查找客户端时发生未知错误: ${err}`);
      }
      if (this.isMonitoring) {
        this.checkTimer = setTimeout(() => this.monitor(), this.pollInterval);
      }
    }
  }
  /**
   * 核心认证逻辑，参考 league-connect 实现
   */
  async authenticate() {
    const name = "LeagueClientUx";
    const isWindows = process.platform === "win32";
    const portRegex = /--app-port=([0-9]+)(?= *"| --)/;
    const passwordRegex = /--remoting-auth-token=(.+?)(?= *"| --)/;
    const pidRegex = /--app-pid=([0-9]+)(?= *"| --)/;
    const installDirRegexWin = /--install-directory=(.*?)"/;
    const installDirRegexMac = /--install-directory=(.+?)(?=\s+--|$)/;
    let command;
    let executionOptions = {};
    if (!isWindows) {
      command = `ps x -o args | grep '${name}'`;
    } else {
      command = `Get-CimInstance -Query "SELECT * from Win32_Process WHERE name LIKE '${name}.exe'" | Select-Object -ExpandProperty CommandLine`;
      executionOptions = { shell: "powershell" };
    }
    try {
      const { stdout: rawStdout } = await exec(command, executionOptions);
      const stdout = rawStdout.replace(/\n|\r/g, "");
      const portMatch = stdout.match(portRegex);
      const passwordMatch = stdout.match(passwordRegex);
      const pidMatch = stdout.match(pidRegex);
      if (!portMatch || !passwordMatch || !pidMatch) {
        throw new ClientNotFoundError();
      }
      let installDir = "";
      const installDirMatch = stdout.match(installDirRegexWin) || stdout.match(installDirRegexMac);
      if (installDirMatch) {
        installDir = installDirMatch[1].trim();
      }
      return {
        port: Number(portMatch[1]),
        pid: Number(pidMatch[1]),
        token: passwordMatch[1],
        installDirectory: installDir ? path$1.dirname(installDir) : ""
        // 返回父目录作为安装目录
      };
    } catch (err) {
      if (isWindows && executionOptions["shell"] === "powershell") {
        try {
          const checkAdminCmd = `if ((Get-Process -Name ${name} -ErrorAction SilentlyContinue | Where-Object {!$_.Handle -and !$_.Path})) {Write-Output "True"} else {Write-Output "False"}`;
          const { stdout: isAdmin } = await exec(checkAdminCmd, executionOptions);
          if (isAdmin.includes("True")) {
            throw new ClientElevatedPermsError();
          }
        } catch (ignore) {
        }
      }
      throw new ClientNotFoundError();
    }
  }
  /**
   * @static
   * @description 检查给定的路径是否是一个有效的英雄联盟客户端路径
   * @param {string} dirPath - 目录路径
   * @returns {boolean}
   */
  static isValidLCUPath(dirPath) {
    if (!dirPath) return false;
    const IS_MAC = process.platform === "darwin";
    const lcuClientApp = IS_MAC ? "LeagueClient.app" : "LeagueClient.exe";
    const common = fs.existsSync(path$1.join(dirPath, lcuClientApp)) && fs.existsSync(path$1.join(dirPath, "Config"));
    const isGlobal = common && fs.existsSync(path$1.join(dirPath, "RADS"));
    const isCN = common && fs.existsSync(path$1.join(dirPath, "TQM"));
    const isGarena = common;
    return isGlobal || isCN || isGarena;
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
  /**
   * 退出当前房间
   * @description 退出大厅房间，用于发条鸟模式下排队超时后重新开始
   * @returns Promise<any>
   */
  leaveLobby() {
    logger.info("📬 [LCUManager] 正在退出房间...");
    return this.request("DELETE", "/lol-lobby/v2/lobby");
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
  /** 主备份路径（软件根目录下） */
  primaryBackupPath;
  /** 备用备份路径（C盘 userData，作为兜底） */
  fallbackBackupPath;
  /** 当前实际使用的备份路径 */
  currentBackupPath;
  tftConfigPath;
  // 预设的云顶设置
  isTFTConfig = false;
  constructor(installPath) {
    if (!installPath) {
      throw new Error("初始化失败，必须提供一个有效的游戏安装路径！");
    }
    this.installPath = installPath;
    this.gameConfigPath = path__default.join(this.installPath, "Game", "Config");
    if (app.isPackaged) {
      this.primaryBackupPath = path__default.join(process.resourcesPath, "GameConfig", "UserConfig");
    } else {
      this.primaryBackupPath = path__default.join(app.getAppPath(), "public", "GameConfig", "UserConfig");
    }
    this.fallbackBackupPath = path__default.join(app.getPath("userData"), "GameConfigBackup");
    this.currentBackupPath = this.primaryBackupPath;
    if (app.isPackaged) {
      this.tftConfigPath = path__default.join(process.resourcesPath, "GameConfig", "TFTConfig");
    } else {
      this.tftConfigPath = path__default.join(app.getAppPath(), "public", "GameConfig", "TFTConfig");
    }
    logger.debug(`[ConfigHelper] 游戏设置目录已设定: ${this.gameConfigPath}`);
    logger.debug(`[ConfigHelper] 主备份路径: ${this.primaryBackupPath}`);
    logger.debug(`[ConfigHelper] 兜底备份路径: ${this.fallbackBackupPath}`);
    logger.debug(`[ConfigHelper] 预设云顶之弈设置目录: ${this.tftConfigPath}`);
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
   * @description 把游戏目录的 Config 文件夹完整地拷贝到备份目录
   *              优先使用软件根目录，失败则使用 C 盘 userData 作为兜底
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
      await fs.ensureDir(instance.primaryBackupPath);
      await fs.copy(instance.gameConfigPath, instance.primaryBackupPath);
      instance.currentBackupPath = instance.primaryBackupPath;
      instance.isTFTConfig = false;
      logger.info(`设置备份成功！路径: ${instance.primaryBackupPath}`);
      return true;
    } catch (primaryErr) {
      logger.warn(`主备份路径写入失败: ${primaryErr}，尝试使用兜底路径...`);
    }
    try {
      await fs.ensureDir(instance.fallbackBackupPath);
      await fs.copy(instance.gameConfigPath, instance.fallbackBackupPath);
      instance.currentBackupPath = instance.fallbackBackupPath;
      instance.isTFTConfig = false;
      logger.info(`设置备份成功（使用兜底路径）！路径: ${instance.fallbackBackupPath}`);
      return true;
    } catch (fallbackErr) {
      logger.error(`备份失败！主路径和兜底路径均不可用: ${fallbackErr}`);
      return false;
    }
  }
  /**
   * 应用预设的云顶设置
   * @description 用 TFTConfig 完全覆盖游戏配置目录
   *              会先清空目标目录，确保没有残留文件
   */
  static async applyTFTConfig() {
    const instance = GameConfigHelper.getInstance();
    if (!instance) {
      logger.error("[GameConfigHelper] applyTFTConfig 错误：尚未初始化！");
      return false;
    }
    const pathExist = await fs.pathExists(instance.tftConfigPath);
    if (!pathExist) {
      logger.error(`应用云顶设置失败！找不到设置目录：${instance.tftConfigPath}`);
      return false;
    }
    try {
      await fs.copy(instance.tftConfigPath, instance.gameConfigPath);
      instance.isTFTConfig = true;
      logger.info("[GameConfigHelper] 云顶挂机游戏设置应用成功！");
      return true;
    } catch (e) {
      logger.error(`[GameConfigHelper] 云顶设置应用失败: ${e}`);
      return false;
    }
  }
  /**
   * 从备份恢复游戏设置
   * @description 把我们备份的 Config 文件夹拷贝回游戏目录
   *              会自动检测备份文件存在于哪个路径（主路径或兜底路径）
   * @param retryCount 重试次数，默认 3 次
   * @param retryDelay 重试间隔（毫秒），默认 1000ms
   */
  static async restore(retryCount = 3, retryDelay = 1e3) {
    const instance = GameConfigHelper.getInstance();
    if (!instance) {
      console.log("[GameConfigHelper] restore错误。尚未初始化！");
      return false;
    }
    let backupPath = null;
    if (await fs.pathExists(instance.currentBackupPath)) {
      backupPath = instance.currentBackupPath;
    } else if (await fs.pathExists(instance.primaryBackupPath)) {
      backupPath = instance.primaryBackupPath;
    } else if (await fs.pathExists(instance.fallbackBackupPath)) {
      backupPath = instance.fallbackBackupPath;
    }
    if (!backupPath) {
      logger.error(`恢复设置失败！找不到备份目录（已检查主路径和兜底路径）`);
      return false;
    }
    logger.debug(`[GameConfigHelper] 从备份恢复设置，备份路径: ${backupPath}`);
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        await fs.copy(backupPath, instance.gameConfigPath);
        instance.isTFTConfig = false;
        logger.info(`[GameConfigHelper] 设置恢复成功！`);
        return true;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const isFileLocked = errMsg.includes("EBUSY") || errMsg.includes("EPERM") || errMsg.includes("resource busy");
        if (attempt < retryCount && isFileLocked) {
          logger.warn(`[GameConfigHelper] 配置文件被占用，${retryDelay}ms 后重试 (${attempt}/${retryCount})...`);
          await sleep(retryDelay);
        } else {
          logger.error(`[GameConfigHelper] 恢复设置失败 (尝试 ${attempt}/${retryCount}): ${errMsg}`);
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
  IpcChannel2["TFT_GET_STAGE_INFO"] = "tft-get-stage-info";
  IpcChannel2["TFT_SAVE_STAGE_SNAPSHOTS"] = "tft-save-stage-snapshots";
  IpcChannel2["TFT_TEST_SAVE_BENCH_SLOT_SNAPSHOT"] = "tft-test-save-bench-slot-snapshot";
  IpcChannel2["TFT_TEST_SAVE_FIGHT_BOARD_SLOT_SNAPSHOT"] = "tft-test-save-fight-board-slot-snapshot";
  IpcChannel2["TFT_TEST_SAVE_QUIT_BUTTON_SNAPSHOT"] = "tft-test-save-quit-button-snapshot";
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
  IpcChannel2["APP_GET_VERSION"] = "app-get-version";
  IpcChannel2["APP_CHECK_UPDATE"] = "app-check-update";
  return IpcChannel2;
})(IpcChannel || {});
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
var UnitOrigin_S16 = /* @__PURE__ */ ((UnitOrigin_S162) => {
  UnitOrigin_S162["Bilgewater"] = "比尔吉沃特";
  UnitOrigin_S162["Darkin"] = "暗裔";
  UnitOrigin_S162["Demacia"] = "德玛西亚";
  UnitOrigin_S162["Freljord"] = "弗雷尔卓德";
  UnitOrigin_S162["Ionia"] = "艾欧尼亚";
  UnitOrigin_S162["Ixtal"] = "以绪塔尔";
  UnitOrigin_S162["Noxus"] = "诺克萨斯";
  UnitOrigin_S162["Piltover"] = "皮尔特沃夫";
  UnitOrigin_S162["ShadowIsles"] = "暗影岛";
  UnitOrigin_S162["Shurima"] = "恕瑞玛";
  UnitOrigin_S162["Targon"] = "巨神峰";
  UnitOrigin_S162["Void"] = "虚空";
  UnitOrigin_S162["Yordle"] = "约德尔人";
  UnitOrigin_S162["Zaun"] = "祖安";
  UnitOrigin_S162["Starforger"] = "铸星龙王";
  UnitOrigin_S162["Baron"] = "纳什男爵";
  UnitOrigin_S162["Blacksmith"] = "山隐之焰";
  UnitOrigin_S162["Caretaker"] = "星界游神";
  UnitOrigin_S162["Chronokeeper"] = "时光守护者";
  UnitOrigin_S162["DarkChild"] = "黑暗之女";
  UnitOrigin_S162["Emperor"] = "沙漠皇帝";
  UnitOrigin_S162["Glutton"] = "河流之王";
  UnitOrigin_S162["Harvester"] = "远古恐惧";
  UnitOrigin_S162["Heroic"] = "正义巨像";
  UnitOrigin_S162["HexMech"] = "海克斯机甲";
  UnitOrigin_S162["Huntress"] = "狂野女猎手";
  UnitOrigin_S162["Assimilator"] = "虚空之女";
  UnitOrigin_S162["Kindred"] = "永猎双子";
  UnitOrigin_S162["RuneMage"] = "符文法师";
  UnitOrigin_S162["Dragonborn"] = "龙血武姬";
  UnitOrigin_S162["Soulbound"] = "系魂圣枪";
  UnitOrigin_S162["Chainbreaker"] = "解脱者";
  UnitOrigin_S162["TheBoss"] = "腕豪";
  UnitOrigin_S162["Ascendant"] = "远古巫灵";
  UnitOrigin_S162["Immortal"] = "不落魔锋";
  UnitOrigin_S162["TeamupJarvanShyvana"] = "巨龙卫士";
  UnitOrigin_S162["TeamupLucianVayne"] = "光明哨兵";
  UnitOrigin_S162["TeamupSingedTeemo"] = "绝命毒师";
  UnitOrigin_S162["TeamupAmbessaKindred"] = "与狼共舞";
  return UnitOrigin_S162;
})(UnitOrigin_S16 || {});
var UnitClass_S16 = /* @__PURE__ */ ((UnitClass_S162) => {
  UnitClass_S162["Bruiser"] = "斗士";
  UnitClass_S162["Defender"] = "护卫";
  UnitClass_S162["Gunslinger"] = "枪手";
  UnitClass_S162["Invoker"] = "神谕者";
  UnitClass_S162["Juggernaut"] = "主宰";
  UnitClass_S162["Longshot"] = "狙神";
  UnitClass_S162["Magus"] = "耀光使";
  UnitClass_S162["Rapidfire"] = "迅击战士";
  UnitClass_S162["Slayer"] = "裁决战士";
  UnitClass_S162["Sorcerer"] = "法师";
  UnitClass_S162["Vanquisher"] = "征服者";
  UnitClass_S162["Warden"] = "神盾使";
  return UnitClass_S162;
})(UnitClass_S16 || {});
var UnitOrigin_S4_5 = /* @__PURE__ */ ((UnitOrigin_S4_52) => {
  UnitOrigin_S4_52["Cultist"] = "腥红之月";
  UnitOrigin_S4_52["Divine"] = "天神";
  UnitOrigin_S4_52["Dragonsoul"] = "龙魂";
  UnitOrigin_S4_52["Elderwood"] = "永恒之森";
  UnitOrigin_S4_52["Enlightened"] = "玉剑仙";
  UnitOrigin_S4_52["Fortune"] = "福星";
  UnitOrigin_S4_52["Spirit"] = "灵魂莲华明昼";
  UnitOrigin_S4_52["Warlord"] = "三国猛将";
  UnitOrigin_S4_52["Exile"] = "浪人";
  UnitOrigin_S4_52["Fabled"] = "山海绘卷";
  UnitOrigin_S4_52["Ninja"] = "忍者";
  UnitOrigin_S4_52["Blacksmith"] = "铁匠";
  UnitOrigin_S4_52["Boss"] = "霸王";
  UnitOrigin_S4_52["Daredevil"] = "主宰";
  UnitOrigin_S4_52["Emperor"] = "枭雄";
  return UnitOrigin_S4_52;
})(UnitOrigin_S4_5 || {});
var UnitClass_S4_5 = /* @__PURE__ */ ((UnitClass_S4_52) => {
  UnitClass_S4_52["Adept"] = "宗师";
  UnitClass_S4_52["Assassin"] = "刺客";
  UnitClass_S4_52["Brawler"] = "斗士";
  UnitClass_S4_52["Duelist"] = "决斗大师";
  UnitClass_S4_52["Executioner"] = "裁决使";
  UnitClass_S4_52["Keeper"] = "神盾使";
  UnitClass_S4_52["Mage"] = "魔法师";
  UnitClass_S4_52["Mystic"] = "秘术师";
  UnitClass_S4_52["Sharpshooter"] = "神射手";
  UnitClass_S4_52["Slayer"] = "战神";
  UnitClass_S4_52["Syphoner"] = "摄魂使";
  UnitClass_S4_52["Vanguard"] = "重装战士";
  return UnitClass_S4_52;
})(UnitClass_S4_5 || {});
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
  },
  "提伯斯": {
    displayName: "提伯斯",
    englishId: "TFT16_AnnieTibbers",
    price: 0,
    traits: [UnitClass_S16.Sorcerer],
    origins: [],
    classes: [UnitClass_S16.Sorcerer],
    attackRange: 1
  }
};
const _TFT_16_CHESS_DATA = {
  //  特殊棋子
  ...TFT_SPECIAL_CHESS,
  // 1 费棋子
  "泰达米尔": {
    displayName: "泰达米尔",
    englishId: "TFT16_Tryndamere",
    price: 2,
    traits: [UnitOrigin_S16.Freljord, UnitClass_S16.Slayer],
    origins: [UnitOrigin_S16.Freljord],
    classes: [UnitClass_S16.Slayer],
    attackRange: 1
  },
  "俄洛伊": {
    displayName: "俄洛伊",
    englishId: "TFT16_Illaoi",
    price: 1,
    traits: [UnitOrigin_S16.Bilgewater, UnitClass_S16.Bruiser],
    origins: [UnitOrigin_S16.Bilgewater],
    classes: [UnitClass_S16.Bruiser],
    attackRange: 1
  },
  "贝蕾亚": {
    displayName: "贝蕾亚",
    englishId: "TFT16_Briar",
    price: 1,
    traits: [UnitOrigin_S16.Noxus, UnitClass_S16.Slayer, UnitClass_S16.Juggernaut],
    origins: [UnitOrigin_S16.Noxus],
    classes: [UnitClass_S16.Slayer, UnitClass_S16.Juggernaut],
    attackRange: 1
  },
  "艾尼维亚": {
    displayName: "艾尼维亚",
    englishId: "TFT16_Anivia",
    price: 1,
    traits: [UnitOrigin_S16.Freljord, UnitClass_S16.Invoker],
    origins: [UnitOrigin_S16.Freljord],
    classes: [UnitClass_S16.Invoker],
    attackRange: 4
  },
  "嘉文四世": {
    displayName: "嘉文四世",
    englishId: "TFT16_JarvanIV",
    price: 1,
    traits: [UnitOrigin_S16.Demacia, UnitClass_S16.Defender],
    origins: [UnitOrigin_S16.Demacia],
    classes: [UnitClass_S16.Defender],
    attackRange: 1
  },
  "烬": {
    displayName: "烬",
    englishId: "TFT16_Jhin",
    price: 1,
    traits: [UnitOrigin_S16.Ionia, UnitClass_S16.Gunslinger],
    origins: [UnitOrigin_S16.Ionia],
    classes: [UnitClass_S16.Gunslinger],
    attackRange: 4
  },
  "凯特琳": {
    displayName: "凯特琳",
    englishId: "TFT16_Caitlyn",
    price: 1,
    traits: [UnitOrigin_S16.Piltover, UnitClass_S16.Longshot],
    origins: [UnitOrigin_S16.Piltover],
    classes: [UnitClass_S16.Longshot],
    attackRange: 6
  },
  "克格莫": {
    displayName: "克格莫",
    englishId: "TFT16_KogMaw",
    price: 1,
    traits: [UnitOrigin_S16.Void, UnitClass_S16.Sorcerer, UnitClass_S16.Longshot],
    origins: [UnitOrigin_S16.Void],
    classes: [UnitClass_S16.Sorcerer, UnitClass_S16.Longshot],
    attackRange: 6
  },
  "璐璐": {
    displayName: "璐璐",
    englishId: "TFT16_Lulu",
    price: 1,
    traits: [UnitOrigin_S16.Yordle, UnitClass_S16.Sorcerer],
    origins: [UnitOrigin_S16.Yordle],
    classes: [UnitClass_S16.Sorcerer],
    attackRange: 4
  },
  "奇亚娜": {
    displayName: "奇亚娜",
    englishId: "TFT16_Qiyana",
    price: 1,
    traits: [UnitOrigin_S16.Ixtal, UnitClass_S16.Slayer],
    origins: [UnitOrigin_S16.Ixtal],
    classes: [UnitClass_S16.Slayer],
    attackRange: 1
  },
  "兰博": {
    displayName: "兰博",
    englishId: "TFT16_Rumble",
    price: 1,
    traits: [UnitOrigin_S16.Yordle, UnitClass_S16.Defender],
    origins: [UnitOrigin_S16.Yordle],
    classes: [UnitClass_S16.Defender],
    attackRange: 1
  },
  "慎": {
    displayName: "慎",
    englishId: "TFT16_Shen",
    price: 1,
    traits: [UnitOrigin_S16.Ionia, UnitClass_S16.Bruiser],
    origins: [UnitOrigin_S16.Ionia],
    classes: [UnitClass_S16.Bruiser],
    attackRange: 1
  },
  "娑娜": {
    displayName: "娑娜",
    englishId: "TFT16_Sona",
    price: 1,
    traits: [UnitOrigin_S16.Demacia, UnitClass_S16.Invoker],
    origins: [UnitOrigin_S16.Demacia],
    classes: [UnitClass_S16.Invoker],
    attackRange: 4
  },
  "佛耶戈": {
    displayName: "佛耶戈",
    englishId: "TFT16_Viego",
    price: 1,
    traits: [UnitOrigin_S16.ShadowIsles, UnitClass_S16.Rapidfire],
    origins: [UnitOrigin_S16.ShadowIsles],
    classes: [UnitClass_S16.Rapidfire],
    attackRange: 1
  },
  "布里茨": {
    displayName: "布里茨",
    englishId: "TFT16_Blitzcrank",
    price: 1,
    traits: [UnitOrigin_S16.Zaun, UnitClass_S16.Juggernaut],
    origins: [UnitOrigin_S16.Zaun],
    classes: [UnitClass_S16.Juggernaut],
    attackRange: 1
  },
  // 2 费棋子
  "厄斐琉斯": {
    displayName: "厄斐琉斯",
    englishId: "TFT16_Aphelios",
    price: 2,
    traits: [UnitOrigin_S16.Targon],
    origins: [UnitOrigin_S16.Targon],
    classes: [],
    attackRange: 4
  },
  "艾希": {
    displayName: "艾希",
    englishId: "TFT16_Ashe",
    price: 2,
    traits: [UnitOrigin_S16.Freljord, UnitClass_S16.Rapidfire],
    origins: [UnitOrigin_S16.Freljord],
    classes: [UnitClass_S16.Rapidfire],
    attackRange: 4
  },
  "科加斯": {
    displayName: "科加斯",
    englishId: "TFT16_ChoGath",
    price: 2,
    traits: [UnitOrigin_S16.Void, UnitClass_S16.Juggernaut],
    origins: [UnitOrigin_S16.Void],
    classes: [UnitClass_S16.Juggernaut],
    attackRange: 1
  },
  "崔斯特": {
    displayName: "崔斯特",
    englishId: "TFT16_TwistedFate",
    price: 2,
    traits: [UnitOrigin_S16.Bilgewater, UnitClass_S16.Rapidfire],
    origins: [UnitOrigin_S16.Bilgewater],
    classes: [UnitClass_S16.Rapidfire],
    attackRange: 4
  },
  "艾克": {
    displayName: "艾克",
    englishId: "TFT16_Ekko",
    price: 2,
    traits: [UnitOrigin_S16.Zaun, UnitClass_S16.Magus],
    origins: [UnitOrigin_S16.Zaun],
    classes: [UnitClass_S16.Magus],
    attackRange: 1
  },
  "格雷福斯": {
    displayName: "格雷福斯",
    englishId: "TFT16_Graves",
    price: 2,
    traits: [UnitOrigin_S16.Bilgewater, UnitClass_S16.Gunslinger],
    origins: [UnitOrigin_S16.Bilgewater],
    classes: [UnitClass_S16.Gunslinger],
    attackRange: 2
  },
  "妮蔻": {
    displayName: "妮蔻",
    englishId: "TFT16_Neeko",
    price: 2,
    traits: [UnitOrigin_S16.Ixtal, UnitClass_S16.Sorcerer, UnitClass_S16.Defender],
    origins: [UnitOrigin_S16.Ixtal],
    classes: [UnitClass_S16.Sorcerer, UnitClass_S16.Defender],
    attackRange: 1
  },
  "奥莉安娜": {
    displayName: "奥莉安娜",
    englishId: "TFT16_Orianna",
    price: 2,
    traits: [UnitOrigin_S16.Piltover, UnitClass_S16.Invoker],
    origins: [UnitOrigin_S16.Piltover],
    classes: [UnitClass_S16.Invoker],
    attackRange: 4
  },
  "波比": {
    displayName: "波比",
    englishId: "TFT16_Poppy",
    price: 2,
    traits: [UnitOrigin_S16.Demacia, UnitOrigin_S16.Yordle, UnitClass_S16.Juggernaut],
    origins: [UnitOrigin_S16.Demacia, UnitOrigin_S16.Yordle],
    classes: [UnitClass_S16.Juggernaut],
    attackRange: 1
  },
  "雷克塞": {
    displayName: "雷克塞",
    englishId: "TFT16_RekSai",
    price: 2,
    traits: [UnitOrigin_S16.Void, UnitClass_S16.Vanquisher],
    origins: [UnitOrigin_S16.Void],
    classes: [UnitClass_S16.Vanquisher],
    attackRange: 1
  },
  "赛恩": {
    displayName: "赛恩",
    englishId: "TFT16_Sion",
    price: 2,
    traits: [UnitOrigin_S16.Noxus, UnitClass_S16.Bruiser],
    origins: [UnitOrigin_S16.Noxus],
    classes: [UnitClass_S16.Bruiser],
    attackRange: 1
  },
  "提莫": {
    displayName: "提莫",
    englishId: "TFT16_Teemo",
    price: 2,
    traits: [UnitOrigin_S16.Yordle, UnitClass_S16.Longshot],
    origins: [UnitOrigin_S16.Yordle],
    classes: [UnitClass_S16.Longshot],
    attackRange: 6
  },
  "崔丝塔娜": {
    displayName: "崔丝塔娜",
    englishId: "TFT16_Tristana",
    price: 2,
    traits: [UnitOrigin_S16.Yordle, UnitClass_S16.Gunslinger],
    origins: [UnitOrigin_S16.Yordle],
    classes: [UnitClass_S16.Gunslinger],
    attackRange: 4
  },
  "蔚": {
    displayName: "蔚",
    englishId: "TFT16_Vi",
    price: 2,
    traits: [UnitOrigin_S16.Piltover, UnitOrigin_S16.Zaun, UnitClass_S16.Defender],
    origins: [UnitOrigin_S16.Piltover, UnitOrigin_S16.Zaun],
    classes: [UnitClass_S16.Defender],
    attackRange: 1
  },
  "亚索": {
    displayName: "亚索",
    englishId: "TFT16_Yasuo",
    price: 2,
    traits: [UnitOrigin_S16.Ionia, UnitClass_S16.Slayer],
    origins: [UnitOrigin_S16.Ionia],
    classes: [UnitClass_S16.Slayer],
    attackRange: 1
  },
  "约里克": {
    displayName: "约里克",
    englishId: "TFT16_Yorick",
    price: 2,
    traits: [UnitOrigin_S16.ShadowIsles, UnitClass_S16.Warden],
    origins: [UnitOrigin_S16.ShadowIsles],
    classes: [UnitClass_S16.Warden],
    attackRange: 1
  },
  "赵信": {
    displayName: "赵信",
    englishId: "TFT16_XinZhao",
    price: 2,
    traits: [UnitOrigin_S16.Demacia, UnitOrigin_S16.Ionia, UnitClass_S16.Warden],
    origins: [UnitOrigin_S16.Demacia, UnitOrigin_S16.Ionia],
    classes: [UnitClass_S16.Warden],
    attackRange: 1
  },
  // 3 费棋子
  "阿狸": {
    displayName: "阿狸",
    englishId: "TFT16_Ahri",
    price: 3,
    traits: [UnitOrigin_S16.Ionia, UnitClass_S16.Sorcerer],
    origins: [UnitOrigin_S16.Ionia],
    classes: [UnitClass_S16.Sorcerer],
    attackRange: 4
  },
  "巴德": {
    displayName: "巴德",
    englishId: "TFT16_Bard",
    price: 3,
    traits: [UnitOrigin_S16.Caretaker],
    origins: [UnitOrigin_S16.Caretaker],
    classes: [],
    attackRange: 4
  },
  "德莱文": {
    displayName: "德莱文",
    englishId: "TFT16_Draven",
    price: 3,
    traits: [UnitOrigin_S16.Noxus, UnitClass_S16.Rapidfire],
    origins: [UnitOrigin_S16.Noxus],
    classes: [UnitClass_S16.Rapidfire],
    attackRange: 4
  },
  "德莱厄斯": {
    displayName: "德莱厄斯",
    englishId: "TFT16_Darius",
    price: 3,
    traits: [UnitOrigin_S16.Noxus, UnitClass_S16.Defender],
    origins: [UnitOrigin_S16.Noxus],
    classes: [UnitClass_S16.Defender],
    attackRange: 1
  },
  "格温": {
    displayName: "格温",
    englishId: "TFT16_Gwen",
    price: 3,
    traits: [UnitOrigin_S16.ShadowIsles, UnitClass_S16.Magus],
    origins: [UnitOrigin_S16.ShadowIsles],
    classes: [UnitClass_S16.Magus],
    attackRange: 1
  },
  "金克丝": {
    displayName: "金克丝",
    englishId: "TFT16_Jinx",
    price: 3,
    traits: [UnitOrigin_S16.Zaun, UnitClass_S16.Gunslinger],
    origins: [UnitOrigin_S16.Zaun],
    classes: [UnitClass_S16.Gunslinger],
    attackRange: 4
  },
  "凯南": {
    displayName: "凯南",
    englishId: "TFT16_Kennen",
    price: 3,
    traits: [UnitOrigin_S16.Ionia, UnitOrigin_S16.Yordle, UnitClass_S16.Defender],
    origins: [UnitOrigin_S16.Ionia, UnitOrigin_S16.Yordle],
    classes: [UnitClass_S16.Defender],
    attackRange: 1
  },
  "可酷伯与悠米": {
    displayName: "可酷伯与悠米",
    englishId: "TFT16_Kobuko",
    price: 3,
    traits: [UnitOrigin_S16.Yordle, UnitClass_S16.Bruiser, UnitClass_S16.Invoker],
    origins: [UnitOrigin_S16.Yordle],
    classes: [UnitClass_S16.Bruiser, UnitClass_S16.Invoker],
    attackRange: 1
  },
  "乐芙兰": {
    displayName: "乐芙兰",
    englishId: "TFT16_Leblanc",
    price: 3,
    traits: [UnitOrigin_S16.Noxus, UnitClass_S16.Invoker],
    origins: [UnitOrigin_S16.Noxus],
    classes: [UnitClass_S16.Invoker],
    attackRange: 4
  },
  "洛里斯": {
    displayName: "洛里斯",
    englishId: "TFT16_Loris",
    price: 3,
    traits: [UnitOrigin_S16.Piltover, UnitClass_S16.Warden],
    origins: [UnitOrigin_S16.Piltover],
    classes: [UnitClass_S16.Warden],
    attackRange: 1
  },
  "玛尔扎哈": {
    displayName: "玛尔扎哈",
    englishId: "TFT16_Malzahar",
    price: 3,
    traits: [UnitOrigin_S16.Void, UnitClass_S16.Magus],
    origins: [UnitOrigin_S16.Void],
    classes: [UnitClass_S16.Magus],
    attackRange: 4
  },
  "米利欧": {
    displayName: "米利欧",
    englishId: "TFT16_Milio",
    price: 3,
    traits: [UnitOrigin_S16.Ixtal, UnitClass_S16.Invoker],
    origins: [UnitOrigin_S16.Ixtal],
    classes: [UnitClass_S16.Invoker],
    attackRange: 4
  },
  "诺提勒斯": {
    displayName: "诺提勒斯",
    englishId: "TFT16_Nautilus",
    price: 3,
    traits: [UnitOrigin_S16.Bilgewater, UnitClass_S16.Juggernaut, UnitClass_S16.Warden],
    origins: [UnitOrigin_S16.Bilgewater],
    classes: [UnitClass_S16.Juggernaut, UnitClass_S16.Warden],
    attackRange: 1
  },
  "普朗克": {
    displayName: "普朗克",
    englishId: "TFT16_Gangplank",
    price: 3,
    traits: [UnitOrigin_S16.Bilgewater, UnitClass_S16.Slayer, UnitClass_S16.Vanquisher],
    origins: [UnitOrigin_S16.Bilgewater],
    classes: [UnitClass_S16.Slayer, UnitClass_S16.Vanquisher],
    attackRange: 1
  },
  "瑟庄妮": {
    displayName: "瑟庄妮",
    englishId: "TFT16_Sejuani",
    price: 3,
    traits: [UnitOrigin_S16.Freljord, UnitClass_S16.Defender],
    origins: [UnitOrigin_S16.Freljord],
    classes: [UnitClass_S16.Defender],
    attackRange: 1
  },
  "薇恩": {
    displayName: "薇恩",
    englishId: "TFT16_Vayne",
    price: 3,
    traits: [UnitOrigin_S16.Demacia, UnitClass_S16.Longshot],
    origins: [UnitOrigin_S16.Demacia],
    classes: [UnitClass_S16.Longshot],
    attackRange: 4
  },
  "蒙多医生": {
    displayName: "蒙多医生",
    englishId: "TFT16_DrMundo",
    price: 3,
    traits: [UnitOrigin_S16.Zaun, UnitClass_S16.Bruiser],
    origins: [UnitOrigin_S16.Zaun],
    classes: [UnitClass_S16.Bruiser],
    attackRange: 1
  },
  // 4 费棋子
  "安蓓萨": {
    displayName: "安蓓萨",
    englishId: "TFT16_Ambessa",
    price: 4,
    traits: [UnitOrigin_S16.Noxus, UnitClass_S16.Vanquisher],
    origins: [UnitOrigin_S16.Noxus],
    classes: [UnitClass_S16.Vanquisher],
    attackRange: 1
  },
  "卑尔维斯": {
    displayName: "卑尔维斯",
    englishId: "TFT16_BelVeth",
    price: 4,
    traits: [UnitOrigin_S16.Void, UnitClass_S16.Slayer],
    origins: [UnitOrigin_S16.Void],
    classes: [UnitClass_S16.Slayer],
    attackRange: 2
  },
  "布隆": {
    displayName: "布隆",
    englishId: "TFT16_Braum",
    price: 4,
    traits: [UnitOrigin_S16.Freljord, UnitClass_S16.Warden],
    origins: [UnitOrigin_S16.Freljord],
    classes: [UnitClass_S16.Warden],
    attackRange: 1
  },
  "黛安娜": {
    displayName: "黛安娜",
    englishId: "TFT16_Diana",
    price: 4,
    traits: [UnitOrigin_S16.Targon],
    origins: [UnitOrigin_S16.Targon],
    classes: [],
    attackRange: 1
  },
  "盖伦": {
    displayName: "盖伦",
    englishId: "TFT16_Garen",
    price: 4,
    traits: [UnitOrigin_S16.Demacia, UnitClass_S16.Defender],
    origins: [UnitOrigin_S16.Demacia],
    classes: [UnitClass_S16.Defender],
    attackRange: 1
  },
  "卡莉丝塔": {
    displayName: "卡莉丝塔",
    englishId: "TFT16_Kalista",
    price: 4,
    traits: [UnitOrigin_S16.ShadowIsles, UnitClass_S16.Vanquisher],
    origins: [UnitOrigin_S16.ShadowIsles],
    classes: [UnitClass_S16.Vanquisher],
    attackRange: 4
  },
  "卡莎": {
    displayName: "卡莎",
    englishId: "TFT16_Kaisa",
    price: 4,
    traits: [UnitOrigin_S16.Assimilator, UnitOrigin_S16.Void, UnitClass_S16.Longshot],
    origins: [UnitOrigin_S16.Assimilator, UnitOrigin_S16.Void],
    classes: [UnitClass_S16.Longshot],
    attackRange: 6
  },
  "蕾欧娜": {
    displayName: "蕾欧娜",
    englishId: "TFT16_Leona",
    price: 4,
    traits: [UnitOrigin_S16.Targon],
    origins: [UnitOrigin_S16.Targon],
    classes: [],
    attackRange: 1
  },
  "丽桑卓": {
    displayName: "丽桑卓",
    englishId: "TFT16_Lissandra",
    price: 4,
    traits: [UnitOrigin_S16.Freljord, UnitClass_S16.Invoker],
    origins: [UnitOrigin_S16.Freljord],
    classes: [UnitClass_S16.Invoker],
    attackRange: 4
  },
  "拉克丝": {
    displayName: "拉克丝",
    englishId: "TFT16_Lux",
    price: 4,
    traits: [UnitOrigin_S16.Demacia, UnitClass_S16.Sorcerer],
    origins: [UnitOrigin_S16.Demacia],
    classes: [UnitClass_S16.Sorcerer],
    attackRange: 4
  },
  "厄运小姐": {
    displayName: "厄运小姐",
    englishId: "TFT16_MissFortune",
    price: 4,
    traits: [UnitOrigin_S16.Bilgewater, UnitClass_S16.Gunslinger],
    origins: [UnitOrigin_S16.Bilgewater],
    classes: [UnitClass_S16.Gunslinger],
    attackRange: 4
  },
  "内瑟斯": {
    displayName: "内瑟斯",
    englishId: "TFT16_Nasus",
    price: 4,
    traits: [UnitOrigin_S16.Shurima],
    origins: [UnitOrigin_S16.Shurima],
    classes: [],
    attackRange: 1
  },
  "奈德丽": {
    displayName: "奈德丽",
    englishId: "TFT16_Nidalee",
    price: 4,
    traits: [UnitOrigin_S16.Ixtal, UnitOrigin_S16.Huntress],
    origins: [UnitOrigin_S16.Ixtal, UnitOrigin_S16.Huntress],
    classes: [],
    attackRange: 1
  },
  "雷克顿": {
    displayName: "雷克顿",
    englishId: "TFT16_Renekton",
    price: 4,
    traits: [UnitOrigin_S16.Shurima],
    origins: [UnitOrigin_S16.Shurima],
    classes: [],
    attackRange: 1
  },
  "萨勒芬妮": {
    displayName: "萨勒芬妮",
    englishId: "TFT16_Seraphine",
    price: 4,
    traits: [UnitOrigin_S16.Piltover, UnitClass_S16.Magus],
    origins: [UnitOrigin_S16.Piltover],
    classes: [UnitClass_S16.Magus],
    attackRange: 4
  },
  "辛吉德": {
    displayName: "辛吉德",
    englishId: "TFT16_Singed",
    price: 4,
    traits: [UnitOrigin_S16.Zaun, UnitClass_S16.Juggernaut],
    origins: [UnitOrigin_S16.Zaun],
    classes: [UnitClass_S16.Juggernaut],
    attackRange: 1
  },
  "斯卡纳": {
    displayName: "斯卡纳",
    englishId: "TFT16_Skarner",
    price: 4,
    traits: [UnitOrigin_S16.Ixtal],
    origins: [UnitOrigin_S16.Ixtal],
    classes: [],
    attackRange: 1
  },
  "斯维因": {
    displayName: "斯维因",
    englishId: "TFT16_Swain",
    price: 4,
    traits: [UnitOrigin_S16.Noxus, UnitClass_S16.Sorcerer, UnitClass_S16.Juggernaut],
    origins: [UnitOrigin_S16.Noxus],
    classes: [UnitClass_S16.Sorcerer, UnitClass_S16.Juggernaut],
    attackRange: 2
  },
  "孙悟空": {
    displayName: "孙悟空",
    englishId: "TFT16_Wukong",
    price: 4,
    traits: [UnitOrigin_S16.Ionia, UnitClass_S16.Bruiser],
    origins: [UnitOrigin_S16.Ionia],
    classes: [UnitClass_S16.Bruiser],
    attackRange: 1
  },
  "塔里克": {
    displayName: "塔里克",
    englishId: "TFT16_Taric",
    price: 4,
    traits: [UnitOrigin_S16.Targon],
    origins: [UnitOrigin_S16.Targon],
    classes: [],
    attackRange: 1
  },
  "维迦": {
    displayName: "维迦",
    englishId: "TFT16_Veigar",
    price: 4,
    traits: [UnitOrigin_S16.Yordle, UnitClass_S16.Sorcerer],
    origins: [UnitOrigin_S16.Yordle],
    classes: [UnitClass_S16.Sorcerer],
    attackRange: 4
  },
  "沃里克": {
    displayName: "沃里克",
    englishId: "TFT16_Warwick",
    price: 4,
    traits: [UnitOrigin_S16.Zaun, UnitClass_S16.Rapidfire],
    origins: [UnitOrigin_S16.Zaun],
    classes: [UnitClass_S16.Rapidfire],
    attackRange: 1
  },
  "永恩": {
    displayName: "永恩",
    englishId: "TFT16_Yone",
    price: 4,
    traits: [UnitOrigin_S16.Ionia, UnitClass_S16.Slayer],
    origins: [UnitOrigin_S16.Ionia],
    classes: [UnitClass_S16.Slayer],
    attackRange: 1
  },
  "芸阿娜": {
    displayName: "芸阿娜",
    englishId: "TFT16_Yunara",
    price: 4,
    traits: [UnitOrigin_S16.Ionia, UnitClass_S16.Rapidfire],
    origins: [UnitOrigin_S16.Ionia],
    classes: [UnitClass_S16.Rapidfire],
    attackRange: 4
  },
  // 5 费棋子
  "亚托克斯": {
    displayName: "亚托克斯",
    englishId: "TFT16_Aatrox",
    price: 5,
    traits: [UnitOrigin_S16.Darkin, UnitClass_S16.Slayer],
    origins: [UnitOrigin_S16.Darkin],
    classes: [UnitClass_S16.Slayer],
    attackRange: 1
  },
  "安妮": {
    displayName: "安妮",
    englishId: "TFT16_Annie",
    price: 5,
    traits: [UnitOrigin_S16.DarkChild, UnitClass_S16.Sorcerer],
    origins: [UnitOrigin_S16.DarkChild],
    classes: [UnitClass_S16.Sorcerer],
    attackRange: 4
  },
  "阿兹尔": {
    displayName: "阿兹尔",
    englishId: "TFT16_Azir",
    price: 5,
    traits: [UnitOrigin_S16.Shurima, UnitOrigin_S16.Emperor, UnitClass_S16.Magus],
    origins: [UnitOrigin_S16.Shurima, UnitOrigin_S16.Emperor],
    classes: [UnitClass_S16.Magus],
    attackRange: 4
  },
  "费德提克": {
    displayName: "费德提克",
    englishId: "TFT16_Fiddlesticks",
    price: 5,
    traits: [UnitOrigin_S16.Harvester, UnitClass_S16.Vanquisher],
    origins: [UnitOrigin_S16.Harvester],
    classes: [UnitClass_S16.Vanquisher],
    attackRange: 2
  },
  "吉格斯": {
    displayName: "吉格斯",
    englishId: "TFT16_Ziggs",
    price: 5,
    traits: [UnitOrigin_S16.Zaun, UnitOrigin_S16.Yordle, UnitClass_S16.Longshot],
    origins: [UnitOrigin_S16.Zaun, UnitOrigin_S16.Yordle],
    classes: [UnitClass_S16.Longshot],
    attackRange: 6
  },
  "加里奥": {
    displayName: "加里奥",
    englishId: "TFT16_Galio",
    price: 5,
    traits: [UnitOrigin_S16.Demacia, UnitOrigin_S16.Heroic],
    origins: [UnitOrigin_S16.Demacia, UnitOrigin_S16.Heroic],
    classes: [],
    attackRange: 1
  },
  "基兰": {
    displayName: "基兰",
    englishId: "TFT16_Zilean",
    price: 5,
    traits: [UnitOrigin_S16.Chronokeeper, UnitClass_S16.Invoker],
    origins: [UnitOrigin_S16.Chronokeeper],
    classes: [UnitClass_S16.Invoker],
    attackRange: 4
  },
  "千珏": {
    displayName: "千珏",
    englishId: "TFT16_Kindred",
    price: 5,
    traits: [UnitOrigin_S16.Kindred, UnitClass_S16.Rapidfire],
    origins: [UnitOrigin_S16.Kindred],
    classes: [UnitClass_S16.Rapidfire],
    attackRange: 4
  },
  "卢锡安与赛娜": {
    displayName: "卢锡安与赛娜",
    englishId: "TFT16_Lucian",
    price: 5,
    traits: [UnitOrigin_S16.Soulbound, UnitClass_S16.Gunslinger],
    origins: [UnitOrigin_S16.Soulbound],
    classes: [UnitClass_S16.Gunslinger],
    attackRange: 4
  },
  "梅尔": {
    displayName: "梅尔",
    englishId: "TFT16_Mel",
    price: 5,
    traits: [UnitOrigin_S16.Noxus, UnitClass_S16.Magus],
    origins: [UnitOrigin_S16.Noxus],
    classes: [UnitClass_S16.Magus],
    attackRange: 4
  },
  "奥恩": {
    displayName: "奥恩",
    englishId: "TFT16_Ornn",
    price: 5,
    traits: [UnitOrigin_S16.Blacksmith, UnitClass_S16.Warden],
    origins: [UnitOrigin_S16.Blacksmith],
    classes: [UnitClass_S16.Warden],
    attackRange: 1
  },
  "瑟提": {
    displayName: "瑟提",
    englishId: "TFT16_Sett",
    price: 5,
    traits: [UnitOrigin_S16.Ionia, UnitOrigin_S16.TheBoss],
    origins: [UnitOrigin_S16.Ionia, UnitOrigin_S16.TheBoss],
    classes: [],
    attackRange: 1
  },
  "希瓦娜": {
    displayName: "希瓦娜",
    englishId: "TFT16_Shyvana",
    price: 5,
    traits: [UnitOrigin_S16.Dragonborn, UnitClass_S16.Juggernaut],
    origins: [UnitOrigin_S16.Dragonborn],
    classes: [UnitClass_S16.Juggernaut],
    attackRange: 1
  },
  "塔姆": {
    displayName: "塔姆",
    englishId: "TFT16_TahmKench",
    price: 5,
    traits: [UnitOrigin_S16.Bilgewater, UnitOrigin_S16.Glutton, UnitClass_S16.Bruiser],
    origins: [UnitOrigin_S16.Bilgewater, UnitOrigin_S16.Glutton],
    classes: [UnitClass_S16.Bruiser],
    attackRange: 1
  },
  "锤石": {
    displayName: "锤石",
    englishId: "TFT16_Thresh",
    price: 5,
    traits: [UnitOrigin_S16.ShadowIsles, UnitClass_S16.Warden],
    origins: [UnitOrigin_S16.ShadowIsles],
    classes: [UnitClass_S16.Warden],
    attackRange: 1
  },
  "沃利贝尔": {
    displayName: "沃利贝尔",
    englishId: "TFT16_Volibear",
    price: 5,
    traits: [UnitOrigin_S16.Freljord, UnitClass_S16.Bruiser],
    origins: [UnitOrigin_S16.Freljord],
    classes: [UnitClass_S16.Bruiser],
    attackRange: 1
  },
  // 特殊/高费羁绊单位（价格 7）
  "奥瑞利安·索尔": {
    displayName: "奥瑞利安·索尔",
    englishId: "TFT16_AurelionSol",
    price: 7,
    traits: [UnitOrigin_S16.Starforger, UnitOrigin_S16.Targon],
    origins: [UnitOrigin_S16.Starforger, UnitOrigin_S16.Targon],
    classes: [],
    attackRange: 4
  },
  "纳什男爵": {
    displayName: "纳什男爵",
    englishId: "TFT16_BaronNashor",
    price: 7,
    traits: [UnitOrigin_S16.Void, UnitOrigin_S16.Baron],
    origins: [UnitOrigin_S16.Void, UnitOrigin_S16.Baron],
    classes: [],
    attackRange: 2
  },
  "瑞兹": {
    displayName: "瑞兹",
    englishId: "TFT16_Ryze",
    price: 7,
    traits: [UnitOrigin_S16.RuneMage],
    origins: [UnitOrigin_S16.RuneMage],
    classes: [],
    attackRange: 4
  },
  "亚恒": {
    displayName: "亚恒",
    englishId: "TFT16_Xayah",
    price: 7,
    traits: [UnitOrigin_S16.Darkin, UnitOrigin_S16.Immortal],
    origins: [UnitOrigin_S16.Darkin, UnitOrigin_S16.Immortal],
    classes: [],
    attackRange: 2
  },
  // 特殊召唤物/机甲/其他
  "海克斯霸龙": {
    displayName: "海克斯霸龙",
    englishId: "TFT16_THex",
    price: 5,
    // 官方数据是5费
    traits: [UnitOrigin_S16.HexMech, UnitOrigin_S16.Piltover, UnitClass_S16.Gunslinger],
    origins: [UnitOrigin_S16.HexMech, UnitOrigin_S16.Piltover],
    classes: [UnitClass_S16.Gunslinger],
    attackRange: 2
  },
  "佐伊": {
    displayName: "佐伊",
    englishId: "TFT16_Zoe",
    price: 3,
    // 官方数据是3费
    traits: [UnitOrigin_S16.Targon],
    origins: [UnitOrigin_S16.Targon],
    classes: [],
    attackRange: 4
  },
  "菲兹": {
    displayName: "菲兹",
    englishId: "TFT16_Fizz",
    price: 4,
    // 官方数据是4费
    traits: [UnitOrigin_S16.Bilgewater, UnitOrigin_S16.Yordle],
    origins: [UnitOrigin_S16.Bilgewater, UnitOrigin_S16.Yordle],
    classes: [],
    // 官方数据 jobs 为空
    attackRange: 1
  }
};
const _TFT_4_CHESS_DATA = {
  //  特殊棋子
  ...TFT_SPECIAL_CHESS,
  // 1 费棋子
  "内瑟斯": {
    displayName: "内瑟斯",
    englishId: "TFT4_Nasus",
    price: 1,
    traits: [UnitOrigin_S4_5.Divine, UnitClass_S4_5.Syphoner],
    origins: [UnitOrigin_S4_5.Divine],
    classes: [UnitClass_S4_5.Syphoner],
    attackRange: 1
  },
  "崔丝塔娜": {
    displayName: "崔丝塔娜",
    englishId: "TFT4_Tristana",
    price: 1,
    traits: [UnitOrigin_S4_5.Dragonsoul, UnitClass_S4_5.Sharpshooter],
    origins: [UnitOrigin_S4_5.Dragonsoul],
    classes: [UnitClass_S4_5.Sharpshooter],
    attackRange: 5
  },
  "黛安娜": {
    displayName: "黛安娜",
    englishId: "TFT4b_Diana",
    price: 1,
    traits: [UnitOrigin_S4_5.Spirit, UnitClass_S4_5.Assassin],
    origins: [UnitOrigin_S4_5.Spirit],
    classes: [UnitClass_S4_5.Assassin],
    attackRange: 1
  },
  "伊莉丝": {
    displayName: "伊莉丝",
    englishId: "TFT4_Elise",
    price: 1,
    traits: [UnitOrigin_S4_5.Cultist, UnitClass_S4_5.Keeper],
    origins: [UnitOrigin_S4_5.Cultist],
    classes: [UnitClass_S4_5.Keeper],
    attackRange: 2
  },
  "盖伦": {
    displayName: "盖伦",
    englishId: "TFT4_Garen",
    price: 1,
    traits: [UnitOrigin_S4_5.Warlord, UnitClass_S4_5.Vanguard],
    origins: [UnitOrigin_S4_5.Warlord],
    classes: [UnitClass_S4_5.Vanguard],
    attackRange: 1
  },
  "茂凯": {
    displayName: "茂凯",
    englishId: "TFT4_Maokai",
    price: 1,
    traits: [UnitOrigin_S4_5.Elderwood, UnitClass_S4_5.Brawler],
    origins: [UnitOrigin_S4_5.Elderwood],
    classes: [UnitClass_S4_5.Brawler],
    attackRange: 1
  },
  "奈德丽": {
    displayName: "奈德丽",
    englishId: "TFT4_Nidalee",
    price: 1,
    traits: [UnitOrigin_S4_5.Warlord, UnitClass_S4_5.Sharpshooter],
    origins: [UnitOrigin_S4_5.Warlord],
    classes: [UnitClass_S4_5.Sharpshooter],
    attackRange: 5
  },
  "崔斯特": {
    displayName: "崔斯特",
    englishId: "TFT4_TwistedFate",
    price: 1,
    traits: [UnitOrigin_S4_5.Cultist, UnitClass_S4_5.Mage],
    origins: [UnitOrigin_S4_5.Cultist],
    classes: [UnitClass_S4_5.Mage],
    attackRange: 5
  },
  "孙悟空": {
    displayName: "孙悟空",
    englishId: "TFT4_Wukong",
    price: 1,
    traits: [UnitOrigin_S4_5.Divine, UnitClass_S4_5.Vanguard],
    origins: [UnitOrigin_S4_5.Divine],
    classes: [UnitClass_S4_5.Vanguard],
    attackRange: 1
  },
  "亚索": {
    displayName: "亚索",
    englishId: "TFT4_Yasuo",
    price: 1,
    traits: [UnitOrigin_S4_5.Exile, UnitClass_S4_5.Duelist],
    origins: [UnitOrigin_S4_5.Exile],
    classes: [UnitClass_S4_5.Duelist],
    attackRange: 1
  },
  "布兰德": {
    displayName: "布兰德",
    englishId: "TFT4_Brand",
    price: 1,
    traits: [UnitOrigin_S4_5.Dragonsoul, UnitClass_S4_5.Mage],
    origins: [UnitOrigin_S4_5.Dragonsoul],
    classes: [UnitClass_S4_5.Mage],
    attackRange: 5
  },
  "菲奥娜": {
    displayName: "菲奥娜",
    englishId: "TFT4_Fiora",
    price: 1,
    traits: [UnitOrigin_S4_5.Enlightened, UnitClass_S4_5.Duelist],
    origins: [UnitOrigin_S4_5.Enlightened],
    classes: [UnitClass_S4_5.Duelist],
    attackRange: 1
  },
  "塔姆": {
    displayName: "塔姆",
    englishId: "TFT4_TahmKench",
    price: 1,
    traits: [UnitOrigin_S4_5.Fortune, UnitClass_S4_5.Brawler],
    origins: [UnitOrigin_S4_5.Fortune],
    classes: [UnitClass_S4_5.Brawler],
    attackRange: 1
  },
  // 2 费棋子
  "安妮": {
    displayName: "安妮",
    englishId: "TFT4_Annie",
    price: 2,
    traits: [UnitOrigin_S4_5.Fortune, UnitClass_S4_5.Mage],
    origins: [UnitOrigin_S4_5.Fortune],
    classes: [UnitClass_S4_5.Mage],
    attackRange: 2
  },
  "劫": {
    displayName: "劫",
    englishId: "TFT4b_Zed",
    price: 2,
    traits: [UnitOrigin_S4_5.Ninja, UnitClass_S4_5.Slayer],
    origins: [UnitOrigin_S4_5.Ninja],
    classes: [UnitClass_S4_5.Slayer],
    attackRange: 1
  },
  "迦娜": {
    displayName: "迦娜",
    englishId: "TFT4_Janna",
    price: 2,
    traits: [UnitOrigin_S4_5.Enlightened, UnitClass_S4_5.Mystic],
    origins: [UnitOrigin_S4_5.Enlightened],
    classes: [UnitClass_S4_5.Mystic],
    attackRange: 5
  },
  "弗拉基米尔": {
    displayName: "弗拉基米尔",
    englishId: "TFT4_Vladimir",
    price: 2,
    traits: [UnitOrigin_S4_5.Cultist, UnitClass_S4_5.Syphoner],
    origins: [UnitOrigin_S4_5.Cultist],
    classes: [UnitClass_S4_5.Syphoner],
    attackRange: 2
  },
  "派克": {
    displayName: "派克",
    englishId: "TFT4_Pyke",
    price: 2,
    traits: [UnitOrigin_S4_5.Cultist, UnitClass_S4_5.Assassin, UnitClass_S4_5.Slayer],
    origins: [UnitOrigin_S4_5.Cultist],
    classes: [UnitClass_S4_5.Assassin, UnitClass_S4_5.Slayer],
    attackRange: 1
  },
  "蔚": {
    displayName: "蔚",
    englishId: "TFT4_Vi",
    price: 2,
    traits: [UnitOrigin_S4_5.Warlord, UnitClass_S4_5.Brawler],
    origins: [UnitOrigin_S4_5.Warlord],
    classes: [UnitClass_S4_5.Brawler],
    attackRange: 1
  },
  "提莫": {
    displayName: "提莫",
    englishId: "TFT4_Teemo",
    price: 2,
    traits: [UnitOrigin_S4_5.Spirit, UnitClass_S4_5.Sharpshooter],
    origins: [UnitOrigin_S4_5.Spirit],
    classes: [UnitClass_S4_5.Sharpshooter],
    attackRange: 5
  },
  "诺提勒斯": {
    displayName: "诺提勒斯",
    englishId: "TFT4_Nautilus",
    price: 2,
    traits: [UnitOrigin_S4_5.Fabled, UnitClass_S4_5.Vanguard],
    origins: [UnitOrigin_S4_5.Fabled],
    classes: [UnitClass_S4_5.Vanguard],
    attackRange: 1
  },
  "璐璐": {
    displayName: "璐璐",
    englishId: "TFT4_Lulu",
    price: 2,
    traits: [UnitOrigin_S4_5.Elderwood, UnitClass_S4_5.Mage],
    origins: [UnitOrigin_S4_5.Elderwood],
    classes: [UnitClass_S4_5.Mage],
    attackRange: 5
  },
  "嘉文四世": {
    displayName: "嘉文四世",
    englishId: "TFT4_JarvanIV",
    price: 2,
    traits: [UnitOrigin_S4_5.Warlord, UnitClass_S4_5.Keeper],
    origins: [UnitOrigin_S4_5.Warlord],
    classes: [UnitClass_S4_5.Keeper],
    attackRange: 1
  },
  "贾克斯": {
    displayName: "贾克斯",
    englishId: "TFT4_Jax",
    price: 2,
    traits: [UnitOrigin_S4_5.Divine, UnitClass_S4_5.Duelist],
    origins: [UnitOrigin_S4_5.Divine],
    classes: [UnitClass_S4_5.Duelist],
    attackRange: 1
  },
  "洛": {
    displayName: "洛",
    englishId: "TFT4_Rakan",
    price: 2,
    traits: [UnitOrigin_S4_5.Elderwood, UnitClass_S4_5.Keeper],
    origins: [UnitOrigin_S4_5.Elderwood],
    classes: [UnitClass_S4_5.Keeper],
    attackRange: 2
  },
  "布隆": {
    displayName: "布隆",
    englishId: "TFT4_Braum",
    price: 2,
    traits: [UnitOrigin_S4_5.Dragonsoul, UnitClass_S4_5.Vanguard],
    origins: [UnitOrigin_S4_5.Dragonsoul],
    classes: [UnitClass_S4_5.Vanguard],
    attackRange: 1
  },
  // 3 费棋子
  "阿卡丽": {
    displayName: "阿卡丽",
    englishId: "TFT4_Akali",
    price: 3,
    traits: [UnitOrigin_S4_5.Ninja, UnitClass_S4_5.Assassin],
    origins: [UnitOrigin_S4_5.Ninja],
    classes: [UnitClass_S4_5.Assassin],
    attackRange: 1
  },
  "千珏": {
    displayName: "千珏",
    englishId: "TFT4b_Kindred",
    price: 3,
    traits: [UnitOrigin_S4_5.Spirit, UnitClass_S4_5.Executioner],
    origins: [UnitOrigin_S4_5.Spirit],
    classes: [UnitClass_S4_5.Executioner],
    attackRange: 3
  },
  "艾瑞莉娅": {
    displayName: "艾瑞莉娅",
    englishId: "TFT4_Irelia",
    price: 3,
    traits: [UnitOrigin_S4_5.Enlightened, UnitOrigin_S4_5.Divine, UnitClass_S4_5.Adept],
    origins: [UnitOrigin_S4_5.Enlightened, UnitOrigin_S4_5.Divine],
    classes: [UnitClass_S4_5.Adept],
    attackRange: 1
  },
  "希瓦娜": {
    displayName: "希瓦娜",
    englishId: "TFT4_Shyvana",
    price: 3,
    traits: [UnitOrigin_S4_5.Dragonsoul, UnitClass_S4_5.Brawler],
    origins: [UnitOrigin_S4_5.Dragonsoul],
    classes: [UnitClass_S4_5.Brawler],
    attackRange: 1
  },
  "卡莉丝塔": {
    displayName: "卡莉丝塔",
    englishId: "TFT4_Kalista",
    price: 3,
    traits: [UnitOrigin_S4_5.Cultist, UnitClass_S4_5.Duelist],
    origins: [UnitOrigin_S4_5.Cultist],
    classes: [UnitClass_S4_5.Duelist],
    attackRange: 5
  },
  "凯南": {
    displayName: "凯南",
    englishId: "TFT4_Kennen",
    price: 3,
    traits: [UnitOrigin_S4_5.Ninja, UnitClass_S4_5.Keeper],
    origins: [UnitOrigin_S4_5.Ninja],
    classes: [UnitClass_S4_5.Keeper],
    attackRange: 2
  },
  "努努和威朗普": {
    displayName: "努努和威朗普",
    englishId: "TFT4_Nunu",
    price: 3,
    traits: [UnitOrigin_S4_5.Elderwood, UnitClass_S4_5.Brawler],
    origins: [UnitOrigin_S4_5.Elderwood],
    classes: [UnitClass_S4_5.Brawler],
    attackRange: 1
  },
  "希维尔": {
    displayName: "希维尔",
    englishId: "TFT4_Sivir",
    price: 3,
    traits: [UnitOrigin_S4_5.Cultist, UnitClass_S4_5.Sharpshooter],
    origins: [UnitOrigin_S4_5.Cultist],
    classes: [UnitClass_S4_5.Sharpshooter],
    attackRange: 5
  },
  "妮蔻": {
    displayName: "妮蔻",
    englishId: "TFT4_Neeko",
    price: 3,
    traits: [UnitOrigin_S4_5.Fabled, UnitClass_S4_5.Mystic],
    origins: [UnitOrigin_S4_5.Fabled],
    classes: [UnitClass_S4_5.Mystic],
    attackRange: 5
  },
  "德莱厄斯": {
    displayName: "德莱厄斯",
    englishId: "TFT4_Darius",
    price: 3,
    traits: [UnitOrigin_S4_5.Fortune, UnitClass_S4_5.Slayer],
    origins: [UnitOrigin_S4_5.Fortune],
    classes: [UnitClass_S4_5.Slayer],
    attackRange: 1
  },
  "维迦": {
    displayName: "维迦",
    englishId: "TFT4_Veigar",
    price: 3,
    traits: [UnitOrigin_S4_5.Elderwood, UnitClass_S4_5.Mage],
    origins: [UnitOrigin_S4_5.Elderwood],
    classes: [UnitClass_S4_5.Mage],
    attackRange: 5
  },
  "悠米": {
    displayName: "悠米",
    englishId: "TFT4_Yuumi",
    price: 3,
    traits: [UnitOrigin_S4_5.Spirit, UnitClass_S4_5.Mystic],
    origins: [UnitOrigin_S4_5.Spirit],
    classes: [UnitClass_S4_5.Mystic],
    attackRange: 3
  },
  "卡特琳娜": {
    displayName: "卡特琳娜",
    englishId: "TFT4_Katarina",
    price: 3,
    traits: [UnitOrigin_S4_5.Warlord, UnitOrigin_S4_5.Fortune, UnitClass_S4_5.Assassin],
    origins: [UnitOrigin_S4_5.Warlord, UnitOrigin_S4_5.Fortune],
    classes: [UnitClass_S4_5.Assassin],
    attackRange: 1
  },
  // 4 费棋子
  "亚托克斯": {
    displayName: "亚托克斯",
    englishId: "TFT4_Aatrox",
    price: 4,
    traits: [UnitOrigin_S4_5.Cultist, UnitClass_S4_5.Vanguard],
    origins: [UnitOrigin_S4_5.Cultist],
    classes: [UnitClass_S4_5.Vanguard],
    attackRange: 1
  },
  "莫甘娜": {
    displayName: "莫甘娜",
    englishId: "TFT4b_Morgana",
    price: 4,
    traits: [UnitOrigin_S4_5.Enlightened, UnitClass_S4_5.Syphoner],
    origins: [UnitOrigin_S4_5.Enlightened],
    classes: [UnitClass_S4_5.Syphoner],
    attackRange: 2
  },
  "奥瑞利安 · 索尔": {
    displayName: "奥瑞利安 · 索尔",
    englishId: "TFT4_AurelionSol",
    price: 4,
    traits: [UnitOrigin_S4_5.Dragonsoul, UnitClass_S4_5.Mage],
    origins: [UnitOrigin_S4_5.Dragonsoul],
    classes: [UnitClass_S4_5.Mage],
    attackRange: 5
  },
  "科加斯": {
    displayName: "科加斯",
    englishId: "TFT4_ChoGath",
    price: 4,
    traits: [UnitOrigin_S4_5.Fabled, UnitClass_S4_5.Brawler],
    origins: [UnitOrigin_S4_5.Fabled],
    classes: [UnitClass_S4_5.Brawler],
    attackRange: 1
  },
  "霞": {
    displayName: "霞",
    englishId: "TFT4_Xayah",
    price: 4,
    traits: [UnitOrigin_S4_5.Elderwood, UnitClass_S4_5.Executioner, UnitClass_S4_5.Keeper],
    origins: [UnitOrigin_S4_5.Elderwood],
    classes: [UnitClass_S4_5.Executioner, UnitClass_S4_5.Keeper],
    attackRange: 5
  },
  "奥拉夫": {
    displayName: "奥拉夫",
    englishId: "TFT4_Olaf",
    price: 4,
    traits: [UnitOrigin_S4_5.Dragonsoul, UnitClass_S4_5.Slayer],
    origins: [UnitOrigin_S4_5.Dragonsoul],
    classes: [UnitClass_S4_5.Slayer],
    attackRange: 1
  },
  "凯尔": {
    displayName: "凯尔",
    englishId: "TFT4_Kayle",
    price: 4,
    traits: [UnitOrigin_S4_5.Divine, UnitClass_S4_5.Executioner],
    origins: [UnitOrigin_S4_5.Divine],
    classes: [UnitClass_S4_5.Executioner],
    attackRange: 5
  },
  "瑟庄妮": {
    displayName: "瑟庄妮",
    englishId: "TFT4_Sejuani",
    price: 4,
    traits: [UnitOrigin_S4_5.Fortune, UnitClass_S4_5.Vanguard],
    origins: [UnitOrigin_S4_5.Fortune],
    classes: [UnitClass_S4_5.Vanguard],
    attackRange: 1
  },
  "慎": {
    displayName: "慎",
    englishId: "TFT4_Shen",
    price: 4,
    traits: [UnitOrigin_S4_5.Ninja, UnitClass_S4_5.Adept, UnitClass_S4_5.Mystic],
    origins: [UnitOrigin_S4_5.Ninja],
    classes: [UnitClass_S4_5.Adept, UnitClass_S4_5.Mystic],
    attackRange: 1
  },
  "泰隆": {
    displayName: "泰隆",
    englishId: "TFT4_Talon",
    price: 4,
    traits: [UnitOrigin_S4_5.Enlightened, UnitClass_S4_5.Assassin],
    origins: [UnitOrigin_S4_5.Enlightened],
    classes: [UnitClass_S4_5.Assassin],
    attackRange: 1
  },
  "泰达米尔": {
    displayName: "泰达米尔",
    englishId: "TFT4_Tryndamere",
    price: 4,
    traits: [UnitOrigin_S4_5.Warlord, UnitClass_S4_5.Slayer, UnitClass_S4_5.Duelist],
    origins: [UnitOrigin_S4_5.Warlord],
    classes: [UnitClass_S4_5.Slayer, UnitClass_S4_5.Duelist],
    attackRange: 1
  },
  // 5 费棋子
  "阿兹尔": {
    displayName: "阿兹尔",
    englishId: "TFT4_Azir",
    price: 5,
    traits: [UnitOrigin_S4_5.Warlord, UnitOrigin_S4_5.Emperor, UnitClass_S4_5.Keeper],
    origins: [UnitOrigin_S4_5.Warlord, UnitOrigin_S4_5.Emperor],
    classes: [UnitClass_S4_5.Keeper],
    attackRange: 5
  },
  "奥恩": {
    displayName: "奥恩",
    englishId: "TFT4_Ornn",
    price: 5,
    traits: [UnitOrigin_S4_5.Elderwood, UnitOrigin_S4_5.Blacksmith, UnitClass_S4_5.Vanguard],
    origins: [UnitOrigin_S4_5.Elderwood, UnitOrigin_S4_5.Blacksmith],
    classes: [UnitClass_S4_5.Vanguard],
    attackRange: 1
  },
  "斯维因": {
    displayName: "斯维因",
    englishId: "TFT4_Swain",
    price: 5,
    traits: [UnitOrigin_S4_5.Dragonsoul, UnitClass_S4_5.Syphoner],
    origins: [UnitOrigin_S4_5.Dragonsoul],
    classes: [UnitClass_S4_5.Syphoner],
    attackRange: 2
  },
  "莎弥拉": {
    displayName: "莎弥拉",
    englishId: "TFT4_Samira",
    price: 5,
    traits: [UnitOrigin_S4_5.Daredevil, UnitClass_S4_5.Sharpshooter, UnitClass_S4_5.Slayer],
    origins: [UnitOrigin_S4_5.Daredevil],
    classes: [UnitClass_S4_5.Sharpshooter, UnitClass_S4_5.Slayer],
    attackRange: 2
  },
  "李青": {
    displayName: "李青",
    englishId: "TFT4_LeeSin",
    price: 5,
    traits: [UnitOrigin_S4_5.Divine, UnitClass_S4_5.Duelist],
    origins: [UnitOrigin_S4_5.Divine],
    classes: [UnitClass_S4_5.Duelist],
    attackRange: 1
  },
  "瑟提": {
    displayName: "瑟提",
    englishId: "TFT4_Sett",
    price: 5,
    traits: [UnitOrigin_S4_5.Boss, UnitClass_S4_5.Brawler],
    origins: [UnitOrigin_S4_5.Boss],
    classes: [UnitClass_S4_5.Brawler],
    attackRange: 1
  },
  "永恩": {
    displayName: "永恩",
    englishId: "TFT4_Yone",
    price: 5,
    traits: [UnitOrigin_S4_5.Exile, UnitClass_S4_5.Adept],
    origins: [UnitOrigin_S4_5.Exile],
    classes: [UnitClass_S4_5.Adept],
    attackRange: 1
  },
  "基兰": {
    displayName: "基兰",
    englishId: "TFT4_Zilean",
    price: 5,
    traits: [UnitOrigin_S4_5.Cultist, UnitClass_S4_5.Mystic],
    origins: [UnitOrigin_S4_5.Cultist],
    classes: [UnitClass_S4_5.Mystic],
    attackRange: 5
  }
};
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
  TFTMode2["S4_RUISHOU"] = "S4_RUISHOU";
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
  SLOT_1: { x: 130, y: 555 },
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
const clockworkTrailsFightButtonPoint = {
  x: 955,
  y: 705
};
const clockworkTrailsQuitNowButtonRegion = {
  leftTop: { x: 780, y: 555 },
  rightBottom: { x: 845, y: 570 }
};
const clockworkTrailsQuitNowButtonPoint = {
  x: 815,
  y: 560
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
const TFT_16_CHESS_DATA = _TFT_16_CHESS_DATA;
const TFT_4_CHESS_DATA = _TFT_4_CHESS_DATA;
const TFT_16_EQUIP_DATA = _TFT_16_EQUIP_DATA;
function getChessDataForMode(mode) {
  switch (mode) {
    case "S4_RUISHOU":
      return TFT_4_CHESS_DATA;
    case "NORMAL":
    case "RANK":
    case "CLOCKWORK_TRAILS":
    default:
      return TFT_16_CHESS_DATA;
  }
}
function getSeasonTemplateDir(mode) {
  switch (mode) {
    case "S4_RUISHOU":
      return "s4";
    case "NORMAL":
    case "RANK":
    case "CLOCKWORK_TRAILS":
    default:
      return "s16";
  }
}
const CHAMPION_EN_TO_CN = {};
for (const [cnName, champion] of Object.entries(TFT_16_CHESS_DATA)) {
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
  return TFT_16_CHESS_DATA[championName]?.attackRange;
}
function isStandardChessMode(mode) {
  return mode === "NORMAL" || mode === "RANK" || mode === "S4_RUISHOU";
}
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
      isFirstLaunch: true,
      //  首次启动默认为 true，用户确认后设为 false
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
initGlobalCrashHandler();
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-software-rasterizer");
app.commandLine.appendSwitch("disable-gpu-sandbox");
function checkNativeModules() {
  const failedModules = [];
  try {
    require2("sharp");
  } catch (error) {
    failedModules.push("sharp");
    writeCrashLog(error, "加载 sharp 模块失败 - 可能缺少 VC++ 运行库");
  }
  try {
    require2("@nut-tree-fork/nut-js");
  } catch (error) {
    failedModules.push("@nut-tree-fork/nut-js");
    writeCrashLog(error, "加载 nut-js 模块失败 - 可能缺少 VC++ 运行库");
  }
  try {
    require2("uiohook-napi");
  } catch (error) {
    failedModules.push("uiohook-napi");
    writeCrashLog(error, "加载 uiohook-napi 模块失败 - 可能缺少 VC++ 运行库");
  }
  return {
    success: failedModules.length === 0,
    failedModules
  };
}
let hexService;
let tftOperator;
let lineupLoader;
let globalHotkeyManager;
process.env.APP_ROOT = path__default.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path__default.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path__default.join(process.env.APP_ROOT);
process.env.VITE_PUBLIC = is.dev ? path__default.join(process.env.APP_ROOT, "../public") : process.resourcesPath;
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
    const wasRunning = hexService.isRunning;
    if (wasRunning) {
      await hexService.stop();
    } else {
      await hexService.start();
    }
    const newState = !wasRunning;
    win?.webContents.send(IpcChannel.HEX_TOGGLE_TRIGGERED, newState);
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
    app.quit();
  });
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    console.log("Renderer URL:", process.env.ELECTRON_RENDERER_URL);
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(path__default.join(__dirname, "../renderer/index.html"));
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
app.on("will-quit", async (event) => {
  if (globalHotkeyManager) {
    globalHotkeyManager.stop();
  }
  if (hexService && hexService.isRunning) {
    event.preventDefault();
    console.log("🔄 [Main] 检测到程序正在运行，正在恢复游戏设置...");
    try {
      await GameConfigHelper.restore();
      console.log("✅ [Main] 游戏设置已恢复");
    } catch (error) {
      console.error("❌ [Main] 恢复设置失败:", error);
    } finally {
      console.log("👋 [Main] 正在退出程序...");
      app.exit(0);
    }
  }
});
app.whenReady().then(async () => {
  console.log("🔍 [Main] 正在检查原生模块...");
  const nativeModuleCheck = checkNativeModules();
  if (!nativeModuleCheck.success) {
    const failedList = nativeModuleCheck.failedModules.join(", ");
    console.error(`❌ [Main] 以下原生模块加载失败: ${failedList}`);
    const result = await dialog.showMessageBox({
      type: "error",
      title: "运行环境检测失败",
      message: "程序运行所需的组件加载失败",
      detail: `以下模块无法加载: ${failedList}

这通常是因为您的电脑缺少 Microsoft Visual C++ 运行库。

解决方法:
1. 下载并安装 VC++ 运行库 (推荐)
2. 访问 Microsoft 官网下载 "Visual C++ Redistributable"

崩溃日志已保存到程序目录下的 crash-logs 文件夹`,
      buttons: ["下载 VC++ 运行库", "退出程序"],
      defaultId: 0,
      cancelId: 1
    });
    if (result.response === 0) {
      shell.openExternal("https://aka.ms/vs/17/release/vc_redist.x64.exe");
    }
    app.quit();
    return;
  }
  console.log("✅ [Main] 原生模块检查通过");
  console.log("🚀 [Main] 正在加载业务模块...");
  try {
    const ServicesModule = await import("./chunks/index-DQcTo0zb.js");
    hexService = ServicesModule.hexService;
    const TftOperatorModule = await import("./chunks/TftOperator-CDNnv_nv.js").then((n) => n.T);
    tftOperator = TftOperatorModule.tftOperator;
    const LineupModule = await import("./chunks/index-CRHqtjSw.js");
    lineupLoader = LineupModule.lineupLoader;
    const GlobalHotkeyManagerModule = await import("./chunks/GlobalHotkeyManager-Cbcy0EP4.js");
    globalHotkeyManager = GlobalHotkeyManagerModule.globalHotkeyManager;
    console.log("✅ [Main] 业务模块加载完成");
  } catch (error) {
    console.error("❌ [Main] 业务模块加载失败:", error);
    writeCrashLog(error, "业务模块动态加载失败");
    await dialog.showMessageBox({
      type: "error",
      title: "程序启动失败",
      message: "加载核心业务模块时发生错误",
      detail: `错误信息: ${error instanceof Error ? error.message : String(error)}

请联系开发者。`,
      buttons: ["退出程序"]
    });
    app.quit();
    return;
  }
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
  ipcMain.handle(IpcChannel.TFT_GET_STAGE_INFO, async (event) => tftOperator.getGameStage());
  ipcMain.handle(IpcChannel.TFT_SAVE_STAGE_SNAPSHOTS, async (event) => tftOperator.saveStageSnapshots());
  ipcMain.handle(IpcChannel.TFT_TEST_SAVE_BENCH_SLOT_SNAPSHOT, async (event) => tftOperator.saveBenchSlotSnapshots());
  ipcMain.handle(IpcChannel.TFT_TEST_SAVE_FIGHT_BOARD_SLOT_SNAPSHOT, async (event) => tftOperator.saveFightBoardSlotSnapshots());
  ipcMain.handle(IpcChannel.TFT_TEST_SAVE_QUIT_BUTTON_SNAPSHOT, async (event) => tftOperator.saveQuitButtonSnapshot());
  ipcMain.handle(IpcChannel.LINEUP_GET_ALL, async (_event, season) => {
    if (season) {
      return lineupLoader.getLineupsBySeason(season);
    }
    return lineupLoader.getAllLineups();
  });
  ipcMain.handle(IpcChannel.LINEUP_GET_BY_ID, async (_event, id) => lineupLoader.getLineup(id));
  ipcMain.handle(IpcChannel.LINEUP_GET_SELECTED_IDS, async () => settingsStore.get("selectedLineupIds"));
  ipcMain.handle(IpcChannel.LINEUP_SET_SELECTED_IDS, async (_event, ids) => {
    settingsStore.set("selectedLineupIds", ids);
  });
  ipcMain.handle(IpcChannel.TFT_GET_CHAMPION_CN_TO_EN_MAP, async () => {
    const cnToEnMap = {};
    for (const [cnName, unitData] of Object.entries(TFT_16_CHESS_DATA)) {
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
      exec$1("net session", (error) => {
        resolve(!error);
      });
    });
  });
  ipcMain.handle(IpcChannel.APP_GET_VERSION, async () => {
    return app.getVersion();
  });
  ipcMain.handle(IpcChannel.APP_CHECK_UPDATE, async () => {
    try {
      const response = await net.fetch(
        "https://api.github.com/repos/WJZ-P/TFT-Hextech-Helper/releases/latest",
        {
          headers: {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "TFT-Hextech-Helper"
          }
        }
      );
      if (!response.ok) {
        return { error: `GitHub API 请求失败: ${response.status}` };
      }
      const data = await response.json();
      const latestVersion = data.tag_name?.replace(/^v/, "") || "";
      const currentVersion = app.getVersion();
      return {
        currentVersion,
        latestVersion,
        hasUpdate: latestVersion && latestVersion !== currentVersion,
        releaseUrl: data.html_url,
        releaseNotes: data.body || "",
        publishedAt: data.published_at
      };
    } catch (error) {
      return { error: error.message || "检查更新失败" };
    }
  });
}
export {
  clockworkTrailsQuitNowButtonPoint as A,
  levelRegion as B,
  coinRegion as C,
  hexSlot as D,
  lootRegion as E,
  littleLegendDefaultPoint as F,
  GameStageType as G,
  selfWalkAroundPoints as H,
  ItemForgeType as I,
  equipmentSlot as J,
  combatPhaseTextRegion as K,
  getChampionRange as L,
  clockworkTrailsFightButtonPoint as M,
  MAIN_DIST,
  sharedDraftPoint as N,
  GameConfigHelper as O,
  IpcChannel as P,
  LCUManager as Q,
  getSeasonTemplateDir as R,
  RENDERER_DIST,
  isStandardChessMode as S,
  TFT_4_CHESS_DATA as T,
  LcuEventUri as U,
  VITE_DEV_SERVER_URL,
  TFT_16_CHESS_DATA as a,
  TFT_16_EQUIP_DATA as b,
  TFTMode as c,
  settingsStore as d,
  shopSlotNameRegions as e,
  fs as f,
  getChessDataForMode as g,
  equipmentRegion as h,
  detailEquipRegion as i,
  shopSlot as j,
  buyExpPoint as k,
  logger as l,
  benchSlotPoints as m,
  benchSlotRegion as n,
  detailChampionNameRegion as o,
  detailChampionStarRegion as p,
  fightBoardSlotPoint as q,
  refreshShopPoint as r,
  sleep as s,
  fightBoardSlotRegion as t,
  clockworkTrailsQuitNowButtonRegion as u,
  itemForgeTooltipRegionEdge as v,
  itemForgeTooltipRegion as w,
  gameStageDisplayStageOne as x,
  gameStageDisplayNormal as y,
  gameStageDisplayTheClockworkTrails as z
};
