'use strict';

const tabs = require('sdk/tabs');

const { getLightbeamTab, mainPage, openOrSwitchToOrClose } = require('../lib/ui');

exports.testGetLightbeamTab = function(assert, done) {
  tabs.open({
    url: mainPage,
    onReady: function(tab) {
      assert.equal(getLightbeamTab(), tab, 'getLightbeamTab found the correct tab');
      tab.close(done);
    }
  });
}

exports.testOpenOrSwitchToOrClose = function(assert, done) {
  let currentTab = tabs.activeTab;

  tabs.on('ready', function onOpen(tab) {
    if (tab.url != mainPage) {
      return;
    }
    tabs.removeListener('ready', onOpen);

    assert.pass('the lightbeam tab was opened');

    tabs.on('activate', function onActivate(tab) {
      if (tab.url != mainPage) {
        // re-activate the lightbeam tab
        openOrSwitchToOrClose();
        return;
      }
      tabs.removeListener('activate', onActivate);

      assert.pass('the lightbeam tab was re-activated');

      tab.once('close', done);

      // finally close the lightbeam tab
      openOrSwitchToOrClose();
    });

    currentTab.activate();
  });

  // open lightbeam tab
  openOrSwitchToOrClose();
}

require('test').run(exports);
