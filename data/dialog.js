/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* Dialog / Popup ===================================== */

// dialog names (used as dialog identifiers)
const dialogNames = {
  "resetData": "resetData",
  "blockSites": "blockSites",
  "hideSites": "hideSites",
  "startUploadData": "startUploadData",
  "stopUploadData": "stopUploadData",
  "privateBrowsing": "privateBrowsing",
  "trackingProtection": "trackingProtection",
  "saveOldData": "saveOldData"
};

// options: name, title, message, type, dnsPrompt(Do Not Show), imageUrl
function dialog(options, callback) {
  createDialog(options, callback);
}

function createDialog(options, callback) {
  var modal = picoModal({
    content: createDialogContent(options),
    closeButton: false,
    overlayClose: false,
    overlayStyles: {
      backgroundColor: "#000",
      opacity: 0.75
    }
  });

  addDialogEventHandlers(modal, options, function (userResponse) {
    callback(userResponse);
  });
}

function createDialogContent(options) {
  return dialogTitleBar(options) +
    dialogMessage(options) +
    dialogControls(options);
}

function dialogTitleBar(options) {
  return "<div class='dialog-title'>" + (options.title || "&nbsp;") + "</div>";
}

function dialogMessage(options) {
  return "<div class='dialog-content'>" +
    (options.imageUrl ? "<div class='dialog-sign'><img src='" + options.imageUrl + "' /></div>" : "") +
    "<div class='dialog-message'>" + (options.message || "&nbsp;") + "</div>" +
    "</div>";
}

function dialogControls(options) {
  var doNotShowAgainPrompt = "<div class='dialog-dns'><input type='checkbox' /> Do not show this again.</div>";
  // control buttons
  var controlButtons = "<div class='dialog-btns'>";
  var okButton = "<a class='pico-close dialog-ok'>OK</a>";
  var cancelButton = "<a class='pico-close dialog-cancel'>Cancel</a>";
  // check dialog type
  // alert dialog only needs a single button - "OK"
  // else we show both "OK" and "Cancel" buttons
  if (options.type == "alert") {
    controlButtons += "<a class='pico-close dialog-ok'>OK</a>";

  } else {
    if (navigator.appVersion.indexOf("Win") > -1) { // runs on Windows
      controlButtons += okButton + cancelButton;
    } else { // runs on OS other than Windows
      controlButtons += cancelButton + okButton;
    }
  }
  controlButtons += "</div>";

  return "<div class='dialog-controls'>" +
    (options.dnsPrompt ? doNotShowAgainPrompt : "") +
    controlButtons +
    "</div>";
}

function addDialogEventHandlers(modal, options, callback) {
  var dialogContainer = modal.modalElem();
  // OK button click event handler
  var okButton = dialogContainer.querySelector(".pico-close.dialog-ok");
  okButton.addEventListener("click", function () {
    if (dialogContainer.querySelector(".dialog-dns input") && dialogContainer.querySelector(".dialog-dns input").checked) { // Do Not Show
    }
    modal.close();
    callback(true);
  });
  // Cancel button click event handler
  var cancelButton = dialogContainer.querySelector(".pico-close.dialog-cancel");
  if (cancelButton) {
    cancelButton.addEventListener("click", function () {
      modal.close();
      callback(false);
    });
  }

  var keyDownHandler = function (event) {
    // disable Tab
    if (event.keyCode == "9") {
      event.preventDefault();
    }
    // press Esc to close the dialog (functions the same as clicking Cancel)
    if (event.keyCode == "27") { // Esc key pressed
      modal.close();
      callback(false);
    }
  };
  document.addEventListener("keydown", keyDownHandler);

  modal.afterClose(function () {
    document.removeEventListener("keydown", keyDownHandler);
  });

  // for Upload Data dialog
  if (dialogContainer.querySelector(".toggle-pp")) {
    dialogContainer.querySelector(".toggle-pp").addEventListener("click", function (event) {
      dialogContainer.querySelector(".pico-content .privacy-policy").classList.toggle("collapsed");
    });
  }

  restrictTabWithinDialog(modal);
}

function restrictTabWithinDialog(modal) {
  var dialogContainer = modal.modalElem();
  assignTabIndices(modal);
  dialogContainer.addEventListener("keypress", function (event) {
    event.stopPropagation();
    var focusedElm = document.activeElement;
    // Tab key is pressed
    if (event.keyCode == "9") {
      var currentTabIndex = parseInt(focusedElm.getAttribute("tabIndex"));
      var nextElem = dialogContainer.querySelector("[tabIndex='" + (currentTabIndex + 1) + "']");
      if (nextElem) {
        nextElem.focus();
      } else {
        dialogContainer.querySelector("[tabIndex='0']").focus();
      }
    }
    // when the focused element is the OK or Cancel button and Enter key is pressed
    // mimic mouse clicking on button
    if (event.keyCode == "13" && focusedElm.mozMatchesSelector(".pico-content .dialog-btns a")) {
      focusedElm.click();
    }
  });
}

function assignTabIndices(modal) {
  var dialogContainer = modal.modalElem();
  var allElemsInDialog = dialogContainer.querySelectorAll("*");
  var tabIndex = 0;
  toArray(allElemsInDialog).forEach(function (elem, i) {
    if (elem.nodeName.toLowerCase() == "a" || elem.nodeName.toLowerCase() == "input") {
      elem.setAttribute("tabIndex", tabIndex);
      tabIndex++;
    }
  });
  dialogContainer.querySelector("[tabIndex='0']").focus();
}

function informUserOfUnsafeWindowsDialog() {
  dialog({
      "type": "alert",
      "name": dialogNames.privateBrowsing,
      "dnsPrompt": true,
      "title": "Private Browsing",
      "message": "<p>You have one or more private browsing windows open.</p>" +
        "<p>Connections made in private browsing windows will be visualized in Lightbeam but that data is not stored.</p>" +
        "<p> Information gathered in private browsing mode will be deleted whenever Lightbeam is restarted, and is not collected at all when Lightbeam is not open..</p>",
      "imageUrl": "image/lightbeam_popup_privacy.png"
    },
    function (confirmed) {}
  );
}


function confirmBlockSitesDialog(callback) {
  dialog({
      "name": dialogNames.blockSites,
      "title": "Block Sites",
      "message": "<p><b>Warning:</b></p> " +
        "<p>Blocking sites will prevent any and all content from being loaded from selected domains, for example: [example.com, example.net] and all of their subdomains [mail.example.com, news.example.net etc.]. </p>" +
        "<p>This can prevent some sites from working and degrade your internet experience. Please use this feature carefully. </p>",
      "imageUrl": "image/lightbeam_popup_blocked.png"
    },
    callback
  );
}

function confirmHideSitesDialog(callback) {
  dialog({
      "name": dialogNames.hideSites,
      "dnsPrompt": true,
      "title": "Hide Sites",
      "message": "<p>These sites will not be shown in Lightbeam visualizations, including List View, unless you specifically toggle them back on with the Show Hidden Sites button.</p>" +
        "<p>You can use this to ignore trusted sites from the data.</p>",
      "imageUrl": "image/lightbeam_popup_hidden.png"
    },
    callback
  );
}

function confirmResetDataDialog(callback) {
  dialog({
    "name": dialogNames.resetData,
    "title": "Reset Data",
    "message": "<p>Pressing OK will delete all Lightbeam information including connection history, user preferences, block sites list etc.</p>" +
      "<p>Your browser will be returned to the state of a fresh install of Lightbeam.</p>",
    "imageUrl": "image/lightbeam_popup_warningreset.png"
  }, callback);
}

function confirmTrackingProtectionDialog(callback) {
  dialog({
    "name": dialogNames.trackingProtection,
    "title": "Tracking Protection",
    "message": "<p><b>Warning:</b></p>" +
      "<p>Enabling this experimental feature will block elements that track your online behavior.</p>" +
      "<p>This can prevent some sites from working and degrade your internet experience. Please use this feature carefully.</p>" +
      "<p>Please report any problems you find.</p>" +
      '<p><a href="https://support.mozilla.org/kb/tracking-protection-firefox#w_how-to-use-tracking-protection">Learn more...</a></p>',
      "imageUrl": "image/lightbeam_popup_blocked.png"
  }, callback);
}
