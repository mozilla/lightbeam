/* Dialog / Popup ===================================== */

// dialog names (used as dialog identifiers)
const dialogNames = {
    "promptToShare" : "promptToShareData",
    "resetData" : "resetData",
    "blockSites" : "blockSites",
    "hideSites" : "hideSites",
    "startUploadData" : "startUploadData",
    "stopUploadData" : "stopUploadData",
    "privateBrowsing" : "privateBrowsing",
    "saveOldData": "saveOldData"
};

const allDialogs = {
    'Reset Data Confirmation': confirmResetDataDialog,
    'Block Sites Confirmation': confirmBlockSitesDialog,
    'Hide Sites Confirmation': confirmHideSitesDialog,
    'Upload Data Confirmation': askForDataSharingConfirmationDialog,
    'Stop Uploading Data Confirmation': stopSharingDialog,
    'Private Browsing Notification': informUserOfUnsafeWindowsDialog,
    'Save Data From Earlier Format': promptToSaveOldDataDialog,
    'Help the Ecosystem by Sharing': showPromptToShareDialog
};





// options: name, title, message, type, dnsPrompt(Do Not Show), imageUrl
function dialog(options,callback){
    if ( doNotShowDialog(options.name) ) return; // according to user pref, do not show this dialog
    createDialog(options,callback);
}

function doNotShowDialog(dialogName){
    var dnsPref = localStorage.dnsDialogs || "[]";
    dnsPref = JSON.parse(dnsPref);
    return ( dnsPref.indexOf(dialogName) > -1 ) ? true : false;
}

function createDialog(options,callback){
    var modal = picoModal({
        content: createDialogContent(options),
        closeButton: false,
        overlayClose: false,
        overlayStyles: {
            backgroundColor: "#000",
            opacity: 0.75
        }
    });

    addDialogEventHandlers(modal,options,function(userResponse){
        callback(userResponse);
    });
}

function createDialogContent(options){
    return  dialogTitleBar(options) +
            dialogMessage(options) +
            dialogControls(options);
}

function dialogTitleBar(options){
    return "<div class='dialog-title'>" + (options.title || "&nbsp;") + "</div>";
}

function dialogMessage(options){
    return  "<div class='dialog-content'>" + 
                (options.imageUrl ? "<div class='dialog-sign'><img src='" + options.imageUrl + "' /></div>" : "") + 
                "<div class='dialog-message'>" + (options.message || "&nbsp;") + "</div>" + 
            "</div>";
}

function dialogControls(options){
    var doNotShowAgainPrompt = "<div class='dialog-dns'><input type='checkbox' /> Do not show this again.</div>";
    // control buttons
    var controlButtons = "<div class='dialog-btns'>";
    var okButton = "<a class='pico-close dialog-ok'>OK</a>";
    var cancelButton = "<a class='pico-close dialog-cancel'>Cancel</a>";
    // check dialog type
    // alert dialog only needs a single button - "OK"
    // else we show both "OK" and "Cancel" buttons
    if ( options.type == "alert" ){
        controlButtons += "<a class='pico-close dialog-ok'>OK</a>";

    }else{
        if ( navigator.appVersion.indexOf("Win") > -1 ){ // runs on Windows
            controlButtons += okButton + cancelButton;
        }else{ // runs on OS other than Windows
            controlButtons += cancelButton + okButton;
        }
    }
    controlButtons += "</div>";

    return  "<div class='dialog-controls'>" + 
                ( options.dnsPrompt ? doNotShowAgainPrompt : "" ) +
                controlButtons + 
            "</div>";
}

function addDialogEventHandlers(modal,options,callback){
    var dialogContainer = modal.modalElem;
    // OK button click event handler
    var okButton = dialogContainer.querySelector(".pico-close.dialog-ok");
    okButton.addEventListener("click",function(){
        if ( dialogContainer.querySelector(".dialog-dns input") && dialogContainer.querySelector(".dialog-dns input").checked ){ // Do Not Show
            addToDoNotShowAgainList(options.name);
        }
        modal.close();
        callback(true);
    });
    // Cancel button click event handler
    var cancelButton = dialogContainer.querySelector(".pico-close.dialog-cancel");
    if ( cancelButton ){
        cancelButton.addEventListener("click",function(){
            if (options.name == dialogNames.promptToShare){
                if ( dialogContainer.querySelector(".dialog-dns input").checked ){
                    addToDoNotShowAgainList(options.name);
                }
            }
            modal.close();
            callback(false);
        });
    }

    var keyDownHandler = function(event){
        // disable Tab
        if ( event.keyCode == "9" ){ 
            event.preventDefault();
        }
        // press Esc to close the dialog (functions the same as clicking Cancel)
        if ( event.keyCode == "27" ){ // Esc key pressed
            modal.close();
            callback(false);
        }
    }
    document.addEventListener("keydown", keyDownHandler);

    modal.onClose(function(){
        document.removeEventListener("keydown", keyDownHandler);
    });

    // for Upload Data dialog
    if (dialogContainer.querySelector(".toggle-pp")){
        dialogContainer.querySelector(".toggle-pp").addEventListener("click",function(event){
            dialogContainer.querySelector(".pico-content .privacy-policy").classList.toggle("collapsed");
        });
    }

    restrictTabWithinDialog(modal);
}


function addToDoNotShowAgainList(dialogName){
    var dnsPref = localStorage.dnsDialogs || "[]";
    dnsPref = JSON.parse(dnsPref);
    dnsPref.push(dialogName);
    localStorage.dnsDialogs = JSON.stringify(dnsPref);
}


function restrictTabWithinDialog(modal){
    var dialogContainer = modal.modalElem;
    assignTabIndices(modal);
    dialogContainer.addEventListener("keypress", function(event){
        event.stopPropagation();
        var focusedElm = document.activeElement;
        // Tab key is pressed
        if ( event.keyCode == "9" ){
            var currentTabIndex = parseInt(focusedElm.getAttribute("tabIndex"));
            var nextElem = dialogContainer.querySelector("[tabIndex='" + (currentTabIndex+1) + "']");
            if ( nextElem ){
                nextElem.focus();
            }else{
                dialogContainer.querySelector("[tabIndex='0']").focus();
            }
        }
        // when the focused element is the OK or Cancel button and Enter key is pressed
        // mimic mouse clicking on button
        if ( event.keyCode == "13" && focusedElm.mozMatchesSelector(".pico-content .dialog-btns a") ){
            focusedElm.click();
        }
    });
}

function assignTabIndices(modal){
    var dialogContainer = modal.modalElem;
    var allElemsInDialog = dialogContainer.querySelectorAll("*");
    var tabIndex = 0;
    toArray(allElemsInDialog).forEach(function(elem, i){
        if ( elem.nodeName.toLowerCase() == "a" || elem.nodeName.toLowerCase() == "input" ){
            elem.setAttribute("tabIndex", tabIndex);
            tabIndex++;
        }
    });
    dialogContainer.querySelector("[tabIndex='0']").focus();
}

function askForDataSharingConfirmationDialog(callback){
    dialog( {   "name": dialogNames.startUploadData,
            "title": "Upload Data", 
            "message": 
                '<p>You are about to start uploading de-identified information to our shared tracker database. ' +
                'Your information will continue to be uploaded  until you turn off sharing. </p>' +
                '<p>To learn more about uploading data, how it is de-identified, please read <a class="toggle-pp">the Lightbeam Privcy Policy</a>.</p>' + 
                // Lightbeam Privacy Policy.
                '<div class="privacy-policy collapsed">' +
                    '<header><b>Lightbeam Privacy</b></header>' +
                    '<div>We care about your privacy. Lightbeam is a browser add-on that collects and helps you visualize third party requests on any site you visit. If you choose to send Lightbeam data to Mozilla (that’s us), our privacy policy describes how we handle that data. </div>' +
                    '<br/>' + 
                    '<header><b>Things you should know</b></header>' +
                    '<ul>' +
                        '<li>' +
                            'After you install Lightbeam, the add-on collects data to help you visualize third party requests when you visit sites.' + 
                            '<ul>' +
                                '<li>When you visit a site and that site contacts a third party, Lightbeam collects the following type of data: URLs of the visited sites and third parties, the existence of cookies, and a rough timestamp of when the site was visited. To see a complete list, please visit <a href="https://github.com/mozilla/lightbeam/blob/master/doc/data_format.v1.1.md" target="_blank" >here</a>.</li>' + 
                            '</ul>' +
                        '</li>' +
                        '<li>By default, data collected by Lightbeam remains in your browser and is not sent to us. </li> ' +
                        '<li>' +
                            'You can choose to contribute your Lightbeam data with us. Information from Lightbeam can help us and others to understand third party relationships on the web and promote further research in the field of online tracking and privacy.' + 
                            '<ul>' +
                                '<li>If you do contribute Lightbeam data with us, your browser will send us your de-identified Lightbeam data (you can see a list of the kind of data involved <a href="https://github.com/mozilla/lightbeam/blob/master/doc/data_format.v1.1.md" target="_blank">here</a>). We will post your data along with data from others in an aggregated and open database. Users will benefit by making more informed decisions based on the collective information and patterns about trackers.</li>' + 
                                '<li>Uninstalling Lightbeam prevents collection of any further Lightbeam data and will delete the data stored locally in your browser.</li>' + 
                            '</ul>' +
                        '</li> ' +
                    '</ul>' +
                '</div>' +
                // Lightbeam Privacy Policy ends
                '<br />' +
                '<p>By clicking OK, you are agreeing to the data practices in our privacy notice.</p>',
            "imageUrl": "image/collusion_popup_warningsharing.png"
    },
    callback);
}

function stopSharingDialog(callback){
    dialog( {   "name": dialogNames.stopUploadData,
                "title": "Stop Uploading Data", 
                "message": 
                    '<p>You are about to stop sharing information with our shared tracker database.</p>' +
                    '<p>By clicking OK you will no longer be uploading information.</p>',
                "imageUrl": "image/collusion_popup_stopsharing2.png"
            },
            function(confirmed){
                if ( confirmed ){
                    localStorage.userHasOptedIntoSharing = false;
                    if (uploadTimer){
                        clearTimeout(uploadTimer);
                        uploadTimer = null;
                    }
                }
                callback(confirmed);
            }
    );
}

function informUserOfUnsafeWindowsDialog(){
    dialog( {
        "type": "alert",
        "name": dialogNames.privateBrowsing,
        "dnsPrompt": true,
        "title": "Private Browsing",
        "message": "<p>You have one or more private browsing windows open.</p>" +
                    "<p>Connections made in private browsing windows will be visualized in Lightbeam but that data is neither stored locally nor will it ever be shared, even if sharing is enabled. </p>" +
                    "<p> Information gathered in private browsing mode will be deleted whenever Lightbeam is restarted, and is not collected at all when Lightbeam is not open..</p>",
        "imageUrl": "image/collusion_popup_privacy.png"
        },
        function(confirmed){}
    );
}


/******************************************
*  Prompt to save data from older Collusion format
*/

function promptToSaveOldDataDialog(data){
    dialog({
        "type": "message",
        "name": dialogNames.saveOldData,
        "dnsPrompt": false,
        "title": "Save Data from Earlier Format",
        "message": "<p>Lightbeam has been updated with a new data format.</p>" + 
                   "<p>The old data you have stored from the beta (Collusion) is no longer supported and will be deleted.</p>" + 
                   "<p>If you would like to save a copy of the old data before it is deleted, press OK. If you press Cancel, the old data will be gone.</p>"
    },
    function(confirmed){
        if (confirmed){
            downloadAsJson(data, 'oldformatCollusionData.json');
        }
    });

}

function confirmBlockSitesDialog(callback){
    dialog( {   "name" : dialogNames.blockSites,
                "title": "Block Sites",
                "message":  "<p><b>Warning:</b></p> " +
                            "<p>Blocking sites will prevent any and all content from being loaded from these domains: [example.com, example.net] and all subdomains [mail.example.com, news.example.net etc.]. </p>" +
                            "<p>This can prevent some sites from working and degrade your interenet experience. Please use this feature carefully. </p>",
                "imageUrl": "image/collusion_popup_blocked.png"
            },
            callback
    );
}

function confirmHideSitesDialog(callback){
    dialog( {   
        "name": dialogNames.hideSites,
        "dnsPrompt": true,
        "title": "Hide Sites",
        "message":  "<p>These sites will not be shown in Lightbeam visualizations, including List View, unless you specifically toggle them back on with the Show Hidden Sites button.</p>" +
                    "<p>You can use this to ignore trusted sites from the data.</p>",
        "imageUrl": "image/collusion_popup_hidden.png"
        },
        callback
    );
}

function confirmResetDataDialog(callback){
    dialog( {
        "name": dialogNames.resetData,
        "title": "Reset Data",
        "message":  "<p>Pressing OK will delete all Lightbeam information including connection history, user preferences, unique token, block sites list etc.</p>" + 
                    "<p>Your browser will be returned to the state of a fresh install of Lightbeam.</p>",
        "imageUrl": "image/collusion_popup_warningreset.png"
    },callback
    );
}

function showPromptToShareDialog(callback){
    dialog( {
        "name": dialogNames.promptToShare,
        "dnsPrompt": true,
        "title": "Help the Ecosystem by Sharing",
        "message":  "<p>As a user of Lightbeam Beta, you can help contribute to build our data ecosystem.</p>" + 
                    "<p>By sharing your data you can help us and others to understand third-party relationships on the web and promote further research in the field of online tracking and privacy.</p>  "+
                    "<p>Do you want to upload your de-identified data to the public database now?</p>",
        "imageUrl": "image/collusion_popup_startsharing.png"
    },
    callback
    );

}

function showDialog(name){
    if (Object.keys(allDialogs).indexOf(name) > -1){
        allDialogs[name](function(){});
    }else{
        console.log('Use: showDialog("name") where name is one of');
        Object.keys(allDialogs).forEach(function(name){
            console.log('\t%s', name);
        });
    }
}

