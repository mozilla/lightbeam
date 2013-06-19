'use strict';

const tabs = require('sdk/tabs');

const { getCollusionTab, mainPage } = require('ui');

exports.testGetCollusionTab = function(assert, done) {
  tabs.open({
    url: mainPage,
    onReady: function(tab) {
      assert.equal(getCollusionTab(), tab, 'getCollusionTab found the correct tab');
      tab.close(done);
    }
  })
}

require('test').run(exports);
