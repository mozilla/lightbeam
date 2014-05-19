/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function (global) {

function dataAttrToKey(attr) {
  return attr.slice(5).split('-').map(function (part, index) {
    if (index) {
      return part[0].toUpperCase() + part.slice(1);
    }
    return part;
  }).join('');
}

function dataKeyToAttr(key) {
  return 'data-' + key.replace(/([A-Z])/, '-$1').toLowerCase();
}

function svgdataset(elem) {
  // work around the fact that SVG elements don't have dataset attributes
  var ds = function (key, value) {
    if (value === undefined) {
      // act as getter
      value = elem.getAttribute(dataKeyToAttr(key));
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    } else {
      var s = JSON.stringify(value);
      elem.setAttribute(dataKeyToAttr(key), s);
      return s;
    }
  };
  // Create read-only shortcuts for convenience
  Array.prototype.forEach.call(elem.attributes, function (attr) {
    if (attr.name.startsWith('data-')) {
      try {
        ds[dataAttrToKey(attr.name)] = JSON.parse(attr.value);
      } catch (e) {
        ds[dataAttrToKey(attr.name)] = attr.value;
      }
    }
  });
  return ds;
}

global.svgdataset = svgdataset;

})(this);
