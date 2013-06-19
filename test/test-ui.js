'use strict';

const tabs = require('sdk/tabs');

const { getCollusionTab, mainPage, openOrSwitchToOrClose } = require('ui');

exports.testGetCollusionTab = function(assert, done) {
  tabs.open({
    url: mainPage,
    onReady: function(tab) {
      assert.equal(getCollusionTab(), tab, 'getCollusionTab found the correct tab');
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

    assert.pass('the collusion tab was opened');

    tabs.on('activate', function onActivate(tab) {
      if (tab.url != mainPage) {
        // re-activate the collusion tab
        openOrSwitchToOrClose();
        return;
      }
      tabs.removeListener('activate', onActivate);

      assert.pass('the collusion tab was re-activated');

      tab.once('close', done);

      // finally close the collusion tab
      openOrSwitchToOrClose();
    });

    currentTab.activate();
  });

  // open collusion tab
  openOrSwitchToOrClose();
}

require('test').run(exports);
