"use strict";
const electron = require("electron");
const require$$1 = require("path");
var sourceMapSupport = { exports: {} };
var sourceMap = {};
var sourceMapGenerator = {};
var base64Vlq = {};
var base64$1 = {};
var intToCharMap = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");
base64$1.encode = function(number) {
  if (0 <= number && number < intToCharMap.length) {
    return intToCharMap[number];
  }
  throw new TypeError("Must be between 0 and 63: " + number);
};
base64$1.decode = function(charCode) {
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
var base64 = base64$1;
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
    encoded += base64.encode(digit);
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
    digit = base64.decode(aStr.charCodeAt(aIndex++));
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
var util$5 = {};
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
    var path = aPath;
    var url = urlParse(aPath);
    if (url) {
      if (!url.path) {
        return aPath;
      }
      path = url.path;
    }
    var isAbsolute = exports.isAbsolute(path);
    var parts = path.split(/\/+/);
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
    path = parts.join("/");
    if (path === "") {
      path = isAbsolute ? "/" : ".";
    }
    if (url) {
      url.path = path;
      return urlGenerate(url);
    }
    return path;
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
  var supportsNullProto = function() {
    var obj = /* @__PURE__ */ Object.create(null);
    return !("__proto__" in obj);
  }();
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
})(util$5);
var arraySet = {};
var util$4 = util$5;
var has = Object.prototype.hasOwnProperty;
var hasNativeMap = typeof Map !== "undefined";
function ArraySet$2() {
  this._array = [];
  this._set = hasNativeMap ? /* @__PURE__ */ new Map() : /* @__PURE__ */ Object.create(null);
}
ArraySet$2.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
  var set = new ArraySet$2();
  for (var i = 0, len = aArray.length; i < len; i++) {
    set.add(aArray[i], aAllowDuplicates);
  }
  return set;
};
ArraySet$2.prototype.size = function ArraySet_size() {
  return hasNativeMap ? this._set.size : Object.getOwnPropertyNames(this._set).length;
};
ArraySet$2.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
  var sStr = hasNativeMap ? aStr : util$4.toSetString(aStr);
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
ArraySet$2.prototype.has = function ArraySet_has(aStr) {
  if (hasNativeMap) {
    return this._set.has(aStr);
  } else {
    var sStr = util$4.toSetString(aStr);
    return has.call(this._set, sStr);
  }
};
ArraySet$2.prototype.indexOf = function ArraySet_indexOf(aStr) {
  if (hasNativeMap) {
    var idx = this._set.get(aStr);
    if (idx >= 0) {
      return idx;
    }
  } else {
    var sStr = util$4.toSetString(aStr);
    if (has.call(this._set, sStr)) {
      return this._set[sStr];
    }
  }
  throw new Error('"' + aStr + '" is not in the set.');
};
ArraySet$2.prototype.at = function ArraySet_at(aIdx) {
  if (aIdx >= 0 && aIdx < this._array.length) {
    return this._array[aIdx];
  }
  throw new Error("No element indexed by " + aIdx);
};
ArraySet$2.prototype.toArray = function ArraySet_toArray() {
  return this._array.slice();
};
arraySet.ArraySet = ArraySet$2;
var mappingList = {};
var util$3 = util$5;
function generatedPositionAfter(mappingA, mappingB) {
  var lineA = mappingA.generatedLine;
  var lineB = mappingB.generatedLine;
  var columnA = mappingA.generatedColumn;
  var columnB = mappingB.generatedColumn;
  return lineB > lineA || lineB == lineA && columnB >= columnA || util$3.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0;
}
function MappingList$1() {
  this._array = [];
  this._sorted = true;
  this._last = { generatedLine: -1, generatedColumn: 0 };
}
MappingList$1.prototype.unsortedForEach = function MappingList_forEach(aCallback, aThisArg) {
  this._array.forEach(aCallback, aThisArg);
};
MappingList$1.prototype.add = function MappingList_add(aMapping) {
  if (generatedPositionAfter(this._last, aMapping)) {
    this._last = aMapping;
    this._array.push(aMapping);
  } else {
    this._sorted = false;
    this._array.push(aMapping);
  }
};
MappingList$1.prototype.toArray = function MappingList_toArray() {
  if (!this._sorted) {
    this._array.sort(util$3.compareByGeneratedPositionsInflated);
    this._sorted = true;
  }
  return this._array;
};
mappingList.MappingList = MappingList$1;
var base64VLQ$1 = base64Vlq;
var util$2 = util$5;
var ArraySet$1 = arraySet.ArraySet;
var MappingList = mappingList.MappingList;
function SourceMapGenerator$1(aArgs) {
  if (!aArgs) {
    aArgs = {};
  }
  this._file = util$2.getArg(aArgs, "file", null);
  this._sourceRoot = util$2.getArg(aArgs, "sourceRoot", null);
  this._skipValidation = util$2.getArg(aArgs, "skipValidation", false);
  this._sources = new ArraySet$1();
  this._names = new ArraySet$1();
  this._mappings = new MappingList();
  this._sourcesContents = null;
}
SourceMapGenerator$1.prototype._version = 3;
SourceMapGenerator$1.fromSourceMap = function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
  var sourceRoot = aSourceMapConsumer.sourceRoot;
  var generator = new SourceMapGenerator$1({
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
        newMapping.source = util$2.relative(sourceRoot, newMapping.source);
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
      sourceRelative = util$2.relative(sourceRoot, sourceFile);
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
SourceMapGenerator$1.prototype.addMapping = function SourceMapGenerator_addMapping(aArgs) {
  var generated = util$2.getArg(aArgs, "generated");
  var original = util$2.getArg(aArgs, "original", null);
  var source = util$2.getArg(aArgs, "source", null);
  var name = util$2.getArg(aArgs, "name", null);
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
SourceMapGenerator$1.prototype.setSourceContent = function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
  var source = aSourceFile;
  if (this._sourceRoot != null) {
    source = util$2.relative(this._sourceRoot, source);
  }
  if (aSourceContent != null) {
    if (!this._sourcesContents) {
      this._sourcesContents = /* @__PURE__ */ Object.create(null);
    }
    this._sourcesContents[util$2.toSetString(source)] = aSourceContent;
  } else if (this._sourcesContents) {
    delete this._sourcesContents[util$2.toSetString(source)];
    if (Object.keys(this._sourcesContents).length === 0) {
      this._sourcesContents = null;
    }
  }
};
SourceMapGenerator$1.prototype.applySourceMap = function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
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
    sourceFile = util$2.relative(sourceRoot, sourceFile);
  }
  var newSources = new ArraySet$1();
  var newNames = new ArraySet$1();
  this._mappings.unsortedForEach(function(mapping) {
    if (mapping.source === sourceFile && mapping.originalLine != null) {
      var original = aSourceMapConsumer.originalPositionFor({
        line: mapping.originalLine,
        column: mapping.originalColumn
      });
      if (original.source != null) {
        mapping.source = original.source;
        if (aSourceMapPath != null) {
          mapping.source = util$2.join(aSourceMapPath, mapping.source);
        }
        if (sourceRoot != null) {
          mapping.source = util$2.relative(sourceRoot, mapping.source);
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
        sourceFile2 = util$2.join(aSourceMapPath, sourceFile2);
      }
      if (sourceRoot != null) {
        sourceFile2 = util$2.relative(sourceRoot, sourceFile2);
      }
      this.setSourceContent(sourceFile2, content);
    }
  }, this);
};
SourceMapGenerator$1.prototype._validateMapping = function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource, aName) {
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
SourceMapGenerator$1.prototype._serializeMappings = function SourceMapGenerator_serializeMappings() {
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
        if (!util$2.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) {
          continue;
        }
        next += ",";
      }
    }
    next += base64VLQ$1.encode(mapping.generatedColumn - previousGeneratedColumn);
    previousGeneratedColumn = mapping.generatedColumn;
    if (mapping.source != null) {
      sourceIdx = this._sources.indexOf(mapping.source);
      next += base64VLQ$1.encode(sourceIdx - previousSource);
      previousSource = sourceIdx;
      next += base64VLQ$1.encode(mapping.originalLine - 1 - previousOriginalLine);
      previousOriginalLine = mapping.originalLine - 1;
      next += base64VLQ$1.encode(mapping.originalColumn - previousOriginalColumn);
      previousOriginalColumn = mapping.originalColumn;
      if (mapping.name != null) {
        nameIdx = this._names.indexOf(mapping.name);
        next += base64VLQ$1.encode(nameIdx - previousName);
        previousName = nameIdx;
      }
    }
    result += next;
  }
  return result;
};
SourceMapGenerator$1.prototype._generateSourcesContent = function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
  return aSources.map(function(source) {
    if (!this._sourcesContents) {
      return null;
    }
    if (aSourceRoot != null) {
      source = util$2.relative(aSourceRoot, source);
    }
    var key = util$2.toSetString(source);
    return Object.prototype.hasOwnProperty.call(this._sourcesContents, key) ? this._sourcesContents[key] : null;
  }, this);
};
SourceMapGenerator$1.prototype.toJSON = function SourceMapGenerator_toJSON() {
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
SourceMapGenerator$1.prototype.toString = function SourceMapGenerator_toString() {
  return JSON.stringify(this.toJSON());
};
sourceMapGenerator.SourceMapGenerator = SourceMapGenerator$1;
var sourceMapConsumer = {};
var binarySearch$1 = {};
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
})(binarySearch$1);
var quickSort$1 = {};
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
quickSort$1.quickSort = function(ary, comparator) {
  doQuickSort(ary, comparator, 0, ary.length - 1);
};
var util$1 = util$5;
var binarySearch = binarySearch$1;
var ArraySet = arraySet.ArraySet;
var base64VLQ = base64Vlq;
var quickSort = quickSort$1.quickSort;
function SourceMapConsumer(aSourceMap, aSourceMapURL) {
  var sourceMap2 = aSourceMap;
  if (typeof aSourceMap === "string") {
    sourceMap2 = util$1.parseSourceMapInput(aSourceMap);
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
    source = util$1.computeSourceURL(sourceRoot, source, this._sourceMapURL);
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
  var line = util$1.getArg(aArgs, "line");
  var needle = {
    source: util$1.getArg(aArgs, "source"),
    originalLine: line,
    originalColumn: util$1.getArg(aArgs, "column", 0)
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
    util$1.compareByOriginalPositions,
    binarySearch.LEAST_UPPER_BOUND
  );
  if (index >= 0) {
    var mapping = this._originalMappings[index];
    if (aArgs.column === void 0) {
      var originalLine = mapping.originalLine;
      while (mapping && mapping.originalLine === originalLine) {
        mappings.push({
          line: util$1.getArg(mapping, "generatedLine", null),
          column: util$1.getArg(mapping, "generatedColumn", null),
          lastColumn: util$1.getArg(mapping, "lastGeneratedColumn", null)
        });
        mapping = this._originalMappings[++index];
      }
    } else {
      var originalColumn = mapping.originalColumn;
      while (mapping && mapping.originalLine === line && mapping.originalColumn == originalColumn) {
        mappings.push({
          line: util$1.getArg(mapping, "generatedLine", null),
          column: util$1.getArg(mapping, "generatedColumn", null),
          lastColumn: util$1.getArg(mapping, "lastGeneratedColumn", null)
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
    sourceMap2 = util$1.parseSourceMapInput(aSourceMap);
  }
  var version = util$1.getArg(sourceMap2, "version");
  var sources = util$1.getArg(sourceMap2, "sources");
  var names = util$1.getArg(sourceMap2, "names", []);
  var sourceRoot = util$1.getArg(sourceMap2, "sourceRoot", null);
  var sourcesContent = util$1.getArg(sourceMap2, "sourcesContent", null);
  var mappings = util$1.getArg(sourceMap2, "mappings");
  var file = util$1.getArg(sourceMap2, "file", null);
  if (version != this._version) {
    throw new Error("Unsupported version: " + version);
  }
  if (sourceRoot) {
    sourceRoot = util$1.normalize(sourceRoot);
  }
  sources = sources.map(String).map(util$1.normalize).map(function(source) {
    return sourceRoot && util$1.isAbsolute(sourceRoot) && util$1.isAbsolute(source) ? util$1.relative(sourceRoot, source) : source;
  });
  this._names = ArraySet.fromArray(names.map(String), true);
  this._sources = ArraySet.fromArray(sources, true);
  this._absoluteSources = this._sources.toArray().map(function(s) {
    return util$1.computeSourceURL(sourceRoot, s, aSourceMapURL);
  });
  this.sourceRoot = sourceRoot;
  this.sourcesContent = sourcesContent;
  this._mappings = mappings;
  this._sourceMapURL = aSourceMapURL;
  this.file = file;
}
BasicSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
BasicSourceMapConsumer.prototype.consumer = SourceMapConsumer;
BasicSourceMapConsumer.prototype._findSourceIndex = function(aSource) {
  var relativeSource = aSource;
  if (this.sourceRoot != null) {
    relativeSource = util$1.relative(this.sourceRoot, relativeSource);
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
    return util$1.computeSourceURL(smc.sourceRoot, s, aSourceMapURL);
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
  quickSort(smc.__originalMappings, util$1.compareByOriginalPositions);
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
BasicSourceMapConsumer.prototype._parseMappings = function SourceMapConsumer_parseMappings2(aStr, aSourceRoot) {
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
  quickSort(generatedMappings, util$1.compareByGeneratedPositionsDeflated);
  this.__generatedMappings = generatedMappings;
  quickSort(originalMappings, util$1.compareByOriginalPositions);
  this.__originalMappings = originalMappings;
};
BasicSourceMapConsumer.prototype._findMapping = function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName, aColumnName, aComparator, aBias) {
  if (aNeedle[aLineName] <= 0) {
    throw new TypeError("Line must be greater than or equal to 1, got " + aNeedle[aLineName]);
  }
  if (aNeedle[aColumnName] < 0) {
    throw new TypeError("Column must be greater than or equal to 0, got " + aNeedle[aColumnName]);
  }
  return binarySearch.search(aNeedle, aMappings, aComparator, aBias);
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
    generatedLine: util$1.getArg(aArgs, "line"),
    generatedColumn: util$1.getArg(aArgs, "column")
  };
  var index = this._findMapping(
    needle,
    this._generatedMappings,
    "generatedLine",
    "generatedColumn",
    util$1.compareByGeneratedPositionsDeflated,
    util$1.getArg(aArgs, "bias", SourceMapConsumer.GREATEST_LOWER_BOUND)
  );
  if (index >= 0) {
    var mapping = this._generatedMappings[index];
    if (mapping.generatedLine === needle.generatedLine) {
      var source = util$1.getArg(mapping, "source", null);
      if (source !== null) {
        source = this._sources.at(source);
        source = util$1.computeSourceURL(this.sourceRoot, source, this._sourceMapURL);
      }
      var name = util$1.getArg(mapping, "name", null);
      if (name !== null) {
        name = this._names.at(name);
      }
      return {
        source,
        line: util$1.getArg(mapping, "originalLine", null),
        column: util$1.getArg(mapping, "originalColumn", null),
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
    relativeSource = util$1.relative(this.sourceRoot, relativeSource);
  }
  var url;
  if (this.sourceRoot != null && (url = util$1.urlParse(this.sourceRoot))) {
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
  var source = util$1.getArg(aArgs, "source");
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
    originalLine: util$1.getArg(aArgs, "line"),
    originalColumn: util$1.getArg(aArgs, "column")
  };
  var index = this._findMapping(
    needle,
    this._originalMappings,
    "originalLine",
    "originalColumn",
    util$1.compareByOriginalPositions,
    util$1.getArg(aArgs, "bias", SourceMapConsumer.GREATEST_LOWER_BOUND)
  );
  if (index >= 0) {
    var mapping = this._originalMappings[index];
    if (mapping.source === needle.source) {
      return {
        line: util$1.getArg(mapping, "generatedLine", null),
        column: util$1.getArg(mapping, "generatedColumn", null),
        lastColumn: util$1.getArg(mapping, "lastGeneratedColumn", null)
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
    sourceMap2 = util$1.parseSourceMapInput(aSourceMap);
  }
  var version = util$1.getArg(sourceMap2, "version");
  var sections = util$1.getArg(sourceMap2, "sections");
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
    var offset = util$1.getArg(s, "offset");
    var offsetLine = util$1.getArg(offset, "line");
    var offsetColumn = util$1.getArg(offset, "column");
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
      consumer: new SourceMapConsumer(util$1.getArg(s, "map"), aSourceMapURL)
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
    generatedLine: util$1.getArg(aArgs, "line"),
    generatedColumn: util$1.getArg(aArgs, "column")
  };
  var sectionIndex = binarySearch.search(
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
    if (section.consumer._findSourceIndex(util$1.getArg(aArgs, "source")) === -1) {
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
      source = util$1.computeSourceURL(section.consumer.sourceRoot, source, this._sourceMapURL);
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
  quickSort(this.__generatedMappings, util$1.compareByGeneratedPositionsDeflated);
  quickSort(this.__originalMappings, util$1.compareByOriginalPositions);
};
sourceMapConsumer.IndexedSourceMapConsumer = IndexedSourceMapConsumer;
var sourceNode = {};
var SourceMapGenerator = sourceMapGenerator.SourceMapGenerator;
var util = util$5;
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
        sourceFile = util.join(aRelativePath, sourceFile);
      }
      node.setSourceContent(sourceFile, content);
    }
  });
  return node;
  function addMappingWithCode(mapping, code) {
    if (mapping === null || mapping.source === void 0) {
      node.add(code);
    } else {
      var source = aRelativePath ? util.join(aRelativePath, mapping.source) : mapping.source;
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
  this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
};
SourceNode.prototype.walkSourceContents = function SourceNode_walkSourceContents(aFn) {
  for (var i = 0, len = this.children.length; i < len; i++) {
    if (this.children[i][isSourceNode]) {
      this.children[i].walkSourceContents(aFn);
    }
  }
  var sources = Object.keys(this.sourceContents);
  for (var i = 0, len = sources.length; i < len; i++) {
    aFn(util.fromSetString(sources[i]), this.sourceContents[sources[i]]);
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
sourceMap.SourceMapGenerator = sourceMapGenerator.SourceMapGenerator;
sourceMap.SourceMapConsumer = sourceMapConsumer.SourceMapConsumer;
sourceMap.SourceNode = sourceNode.SourceNode;
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
var bufferFrom_1 = bufferFrom;
sourceMapSupport.exports;
(function(module, exports) {
  var SourceMapConsumer2 = sourceMap.SourceMapConsumer;
  var path = require$$1;
  var fs;
  try {
    fs = require("fs");
    if (!fs.existsSync || !fs.readFileSync) {
      fs = null;
    }
  } catch (err) {
  }
  var bufferFrom2 = bufferFrom_1;
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
      if (!fs) {
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
      } else if (fs.existsSync(path2)) {
        contents = fs.readFileSync(path2, "utf8");
      }
    } catch (er) {
    }
    return fileContentsCache[path2] = contents;
  });
  function supportRelativeURL(file, url) {
    if (!file) return url;
    var dir = path.dirname(file);
    var match = /^\w+:\/\/[^\/]*/.exec(dir);
    var protocol = match ? match[0] : "";
    var startPath = dir.slice(protocol.length);
    if (protocol && /^\/\w\:/.test(startPath)) {
      protocol += "/";
      return protocol + path.resolve(dir.slice(protocol.length), url).replace(/\\/g, "/");
    }
    return protocol + path.resolve(dir.slice(protocol.length), url);
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
      sourceMapData = bufferFrom2(rawData, "base64").toString();
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
          map: new SourceMapConsumer2(urlAndMap.map)
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
      if (!contents && fs && fs.existsSync(source)) {
        try {
          contents = fs.readFileSync(source, "utf8");
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
var sourceMapSupportExports = sourceMapSupport.exports;
sourceMapSupportExports.install();
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
  // You can expose other APTs you need here.
  // ...
});
const ipcApi = {
  on: (channel, callback) => {
    const listener = (_event, ...args) => {
      callback(...args);
    };
    electron.ipcRenderer.on(channel, listener);
    return () => {
      electron.ipcRenderer.removeListener(channel, listener);
    };
  }
};
electron.contextBridge.exposeInMainWorld("ipc", ipcApi);
