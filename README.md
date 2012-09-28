# Collusion README

This is an add-on and website for visualizing the entities that track your
behavior across the web in real time.

The website also contains a "demo" with sample data that can be viewed without
the add-on. 

## Prerequisites

* [Mozilla Add-on SDK][ASDK]
* [menuitems package for addons][menuitems]
* [Firefox 5][] or higher.

If you only want to see the demo, you don't need any of these; all you need is a modern browser.

## Quick Start

First, [install][] the Mozilla Add-on SDK if you haven't already, and activate it in a command line terminal.

In the addons-sdk/packages directory, you will need to install the menuitems package and its dependency, the vold-utils package:

    git clone https://github.com/voldsoftware/vold-utils-jplib.git
    git clone https://github.com/voldsoftware/menuitems-jplib.git

Then, check out the Collusion repository and enter it:

    git clone git://github.com/mozilla/collusion.git
    cd collusion

Finally, run:

    python develop.py

This will set up the web front-end for Collusion on port 8888 and start Firefox with a temporary profile that has Collusion installed. Just click on the Collusion icon at the bottom-right of the browser window to open the web front-end.

At this point, any changes you make to the web front-end simply require reloading the tab containing it. Changing the add-on, however, will require quitting Firefox and running `python develop.py` again.

  [install]: https://addons.mozilla.org/en-US/developers/docs/sdk/latest/dev-guide/addon-development/installation.html

## Software Used

The following software is bundled with the repository and doesn't need to be manually obtained.

* [D3][]
* [jQuery][]

## Data Used

Contained within the repository is a JSON file listing all public trackers on the internet. It came with the [TrackerBlock][] add-on.

  [ASDK]: https://addons.mozilla.org/en-US/developers/builder
  [menuitems]: https://github.com/voldsoftware/menuitems-jplib
  [D3]: http://mbostock.github.com/d3/
  [jQuery]: https://github.com/jquery/jquery
  [TrackerBlock]: http://www.privacychoice.org/trackerblock/firefox
  [Firefox 5]: http://www.mozilla.com/en-US/firefox/fx/

## LICENSE

All files that are part of this project are covered by the following
license, except where explicitly noted.

    Version: MPL 1.1/GPL 2.0/LGPL 2.1

    The contents of this file are subject to the Mozilla Public License Version
    1.1 (the "License"); you may not use this file except in compliance with
    the License. You may obtain a copy of the License at
    http://www.mozilla.org/MPL/

    Software distributed under the License is distributed on an "AS IS" basis,
    WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
    for the specific language governing rights and limitations under the
    License.

    The Original Code is collusion.

    The Initial Developer of the Original Code is the Mozilla Foundation.

    Portions created by the Initial Developer are Copyright (C) 2010
    the Initial Developer. All Rights Reserved.

    Contributor(s):

    Alternatively, the contents of this file may be used under the terms of
    either the GNU General Public License Version 2 or later (the "GPL"), or
    the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
    in which case the provisions of the GPL or the LGPL are applicable instead
    of those above. If you wish to allow use of your version of this file only
    under the terms of either the GPL or the LGPL, and not to allow others to
    use your version of this file under the terms of the MPL, indicate your
    decision by deleting the provisions above and replace them with the notice
    and other provisions required by the GPL or the LGPL. If you do not delete
    the provisions above, a recipient may use your version of this file under
    the terms of any one of the MPL, the GPL or the LGPL.
