# Lightbeam for Firefox README

This is an add-on for Firefox that helps to visualize sites that may be tracking you around the internet. The add-on is available from https://addons.mozilla.org/en-US/firefox/addon/lightbeam/.


## Prerequisites

* [Mozilla Add-on SDK][ASDK]
* [Firefox 38][] or higher.

If you only want to see the demo, you don't need any of these; all you need is a modern browser.

## Quick Start

First, [install][] the Mozilla Add-on SDK if you haven't already.

Then, check out the Lightbeam repository and enter it (do this where you want the lightbeam directory, not in the addon-sdk directory):

    git clone git://github.com/mozilla/lightbeam.git
    cd lightbeam

Finally, run:

    jpm run

This will start Firefox with a temporary profile that has Lightbeam installed. Just click on the Lightbeam icon at the bottom-right of the browser window to open the web front-end.

At this point, any changes you make to the web front-end simply require reloading the tab containing it. Changing the add-on, however, will require quitting Firefox and running `jpm run` again.

  [install]: https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/jpm#Installation

## Software Used

The following software is bundled with the repository and doesn't need to be manually obtained.

* [D3][]
* [PicoModal][]
* [parseUri][]

  [ASDK]: https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/jpm
  [D3]: http://mbostock.github.com/d3/
  [parseUri]: http://blog.stevenlevithan.com/code
  [PicoModal]: https://github.com/Nycto/PicoModal
  [Firefox 38]: http://www.mozilla.com/en-US/firefox/fx/
