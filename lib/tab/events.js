'use strict';

const tabs = require('sdk/tabs');
const { getTabInfo } = require('./utils');

function onTab(eventname, fn){
    tabs.on(eventname, function(jptab){
        var tabinfo = getTabInfo(jptab);
        fn(tabinfo);
    });
}

exports.on = onTab;
