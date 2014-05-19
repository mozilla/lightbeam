/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* global require, exports */
'use strict';

const windowUtils = require("sdk/deprecated/window-utils");
const {
  Class
} = require("sdk/core/heritage");
const {
  validateOptions
} = require("sdk/deprecated/api-utils");
const {
  on, emit, once, off
} = require("sdk/event/core");
const {
  isBrowser
} = require("sdk/window/utils");
const {
  EventTarget
} = require('sdk/event/target');
const {
  unload
} = require('./unload+');

const menuitemNS = require("sdk/core/namespace").ns();
const NS_XUL = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

function MenuitemOptions(options) {
  return validateOptions(options, {
    id: {
      is: ['string']
    },
    menuid: {
      is: ['undefined', 'string']
    },
    insertbefore: {
      is: ['undefined', 'string', 'object', 'number']
    },
    label: {
      is: ["string"]
    },
    include: {
      is: ['string', 'undefined']
    },
    disabled: {
      is: ["undefined", "boolean"],
      map: function (v) !! v
    },
    accesskey: {
      is: ["undefined", "string"]
    },
    key: {
      is: ["undefined", "string"]
    },
    checked: {
      is: ['undefined', 'boolean']
    },
    className: {
      is: ["undefined", "string"]
    },
    onCommand: {
      is: ['undefined', 'function']
    },
    useChrome: {
      map: function (v) !! v
    }
  });
}

let Menuitem = Class({
  extends: EventTarget,
  initialize: function (options) {
    options = menuitemNS(this).options = MenuitemOptions(options);
    EventTarget.prototype.initialize.call(this, options);

    menuitemNS(this).destroyed = false;
    menuitemNS(this).unloaders = [];
    menuitemNS(this).menuitems = addMenuitems(this, options).menuitems;
  },
  get id() menuitemNS(this).options.id,
  get label() menuitemNS(this).options.label,
  set label(val) updateProperty(this, 'label', val),
  get checked() menuitemNS(this).options.checked,
  set checked(val) updateProperty(this, 'checked', !! val),
  get disabled() menuitemNS(this).options.disabled,
  set disabled(val) updateProperty(this, 'disabled', !! val),
  get key() menuitemNS(this).options.key,
  set key(val) updateProperty(this, 'key', val),
  clone: function (overwrites) {
    let opts = Object.clone(menuitemNS(this).options);
    for (let key in overwrites) {
      if (overwrites.hasOwnProperty(key)) {
        opts[key] = overwrites[key];
      }
    }
    return Menuitem(opts);
  },
  get menuid() menuitemNS(this).options.menuid,
  set menuid(val) {
    let options = menuitemNS(this).options;
    options.menuid = val;

    forEachMI(function (menuitem, i, $) {
      updateMenuitemParent(menuitem, options, $);
    });
  },
  destroy: function () {
    if (!menuitemNS(this).destroyed) {
      menuitemNS(this).destroyed = true;
      menuitemNS(this).unloaders.forEach(function (u) u());
      menuitemNS(this).unloaders = null;
      menuitemNS(this).menuitems = null;
    }
    return true;
  }
});

function addMenuitems(self, options) {
  let menuitems = [];

  // setup window tracker
  windowUtils.WindowTracker({
    onTrack: function (window) {
      if (menuitemNS(self).destroyed) return;
      if (options.include) {
        if (options.include != window.location) return;
      } else if (!isBrowser(window)) {
        return;
      }

      // add the new menuitem to a menu
      var menuitem = updateMenuitemAttributes(
        window.document.createElementNS(NS_XUL, "menuitem"), options);
      var menuitems_i = menuitems.push(menuitem) - 1;

      // add the menutiem to the ui
      let added = updateMenuitemParent(menuitem, options, function (id) window.document.getElementById(id));

      menuitem.addEventListener("command", function () {
        if (!self.disabled)
          emit(self, 'command', options.useChrome ? window : null);
      }, true);

      // add unloader
      let unloader = function unloader() {
        if (menuitem.parentNode) {
          menuitem.parentNode.removeChild(menuitem);
        }
        menuitems[menuitems_i] = null;
      };
      let remover = unload(unloader, window);
      menuitemNS(self).unloaders.push(function () {
        remover();
        unloader();
      });
    }
  });
  return {
    menuitems: menuitems
  };
}

function updateMenuitemParent(menuitem, options, $) {
  // add the menutiem to the ui
  if (Array.isArray(options.menuid)) {
    let ids = options.menuid;
    for (var len = ids.length, i = 0; i < len; i++) {
      if (tryParent($(ids[i]), menuitem, options.insertbefore))
        return true;
    }
  } else {
    return tryParent($(options.menuid), menuitem, options.insertbefore);
  }
  return false;
}

function updateMenuitemAttributes(menuitem, options) {
  menuitem.setAttribute("id", options.id);
  menuitem.setAttribute("label", options.label);

  if (options.accesskey)
    menuitem.setAttribute("accesskey", options.accesskey);

  if (options.key)
    menuitem.setAttribute("key", options.key);

  menuitem.setAttribute("disabled", !! options.disabled);

  if (options.image) {
    menuitem.classList.add("menuitem-iconic");
    menuitem.style.listStyleImage = "url('" + options.image + "')";
  }

  if (options.checked)
    menuitem.setAttribute('checked', options.checked);

  if (options.className)
    options.className.split(/\s+/).forEach(function (name) menuitem.classList.add(name));

  return menuitem;
}

function updateProperty(menuitem, key, val) {
  menuitemNS(menuitem).options[key] = val;

  forEachMI(function (menuitem) {
    menuitem.setAttribute(key, val);
  }, menuitem);
  return val;
}

function forEachMI(callback, menuitem) {
  menuitemNS(menuitem).menuitems.forEach(function (mi, i) {
    if (!mi) return;
    callback(mi, i, function (id) mi.ownerDocument.getElementById(id));
  });
}

function tryParent(parent, menuitem, before) {
  if (parent) parent.insertBefore(menuitem, insertBefore(parent, before));
  return !!parent;
}

function insertBefore(parent, before) {
  if (typeof before == "number") {
    switch (before) {
    case MenuitemExport.FIRST_CHILD:
      return parent.firstChild;
    }
    return null;
  } else if (typeof before == "string") {
    return parent.querySelector("#" + before);
  }
  return before;
}

function MenuitemExport(options) {
  return Menuitem(options);
}
MenuitemExport.FIRST_CHILD = 1;

exports.Menuitem = MenuitemExport;
