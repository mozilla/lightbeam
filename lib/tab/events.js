/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* global require, exports */
// Simple onTab handler to figure out what tab a connection corresponds to.
'use strict';

const tabs = require('sdk/tabs');
const {
  getTabInfo
} = require('./utils');

function onTab(eventname, fn) {
  tabs.on(eventname, function (jptab) {
    var tabinfo = getTabInfo(jptab);
    fn(tabinfo);
  });
}

exports.on = onTab;
