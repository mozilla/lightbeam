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
    if (dnsPref === 'undefined'){
        dnsPref = "[]";
    }
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
                '<p>You are about to start uploading data to the Lightbeam server. Your data will continue to be uploaded periodically until you turn off sharing. For more information about the data we upload, how we take steps to minimize risk of re-identification, and what Mozilla\'s privacy policies are, please read the  <a class="toggle-pp">the Lightbeam Privacy Policy</a>.</p>' + 
                // Lightbeam Privacy Policy.
                '<div class="privacy-policy"> <header><b>Lightbeam Privacy Notice</b></header> <p> We care about your privacy. Lightbeam is a browser add-on that collects and helps you visualize third party requests on any site you visit. If you choose to send Lightbeam data to Mozilla (that’s us), our <a href="#mozillaprivacypolicy">privacy policy</a> describes how we handle that data. </p> <header><b>Things you should know</b></header> <ul class="bullet-form"> <li> After you install Lightbeam, the add-on collects data to help you visualize third party requests when you visit sites. <ul> <li>When you visit a site and that site contacts a third party, Lightbeam collects the following type of data: Domains of the visited sites and third parties, the existence of cookies, and a rough timestamp of when the site was visited. To see a complete list, please visit <a href="https://github.com/mozilla/lightbeam/blob/master/doc/data_format.v1.1.md">here.</a></li> </ul> </li> <li> By default, data collected by Lightbeam remains in your browser and is not sent to us. </li> <li> You can choose to contribute your Lightbeam data to us. Data from Lightbeam can help us and others to understand third party relationships on the web and promote further research in the field of online tracking and privacy. <ul> <li>If you do contribute Lightbeam data to us, your browser will send us your Lightbeam data in a manner which we believe minimizes your risk of being re-identified (you can see a list of the kind of data involved <a href="https://github.com/mozilla/lightbeam/blob/master/doc/data_format.v1.1.md">here.</a>). We will post your data along with data from others in an aggregated and open database. Opening this data can help users and researchers make more informed decisions based on the collective information. </li> <li> Uninstalling Lightbeam prevents collection of any further Lightbeam data and will delete the data stored locally in your browser. </li> </ul> </li> </ul> <header><b>Mozilla Privacy Policy &ndash; Learn More</b></header> <p>Your privacy is an important factor that Mozilla (that\'s us) considers in the development of each of our products and services. We are committed to being transparent and open and want you to know how we receive information about you, and what we do with that information once we have it.</p> <header><b>What do we mean by "personal information?"</b></header> <p> For us, "personal information" means information which identifies you, like your name or email address. </p> <p> Any information that falls outside of this is "non-personal information." </p> <p> If we store your personal information with information that is non-personal, we will consider the combination as personal information. If we remove all personal information from a set of data then the remaining is non-personal information. </p> <header><b>How do we learn information about you? </b></header> <p> We learn information about you when: </p> <ul> <li> you give it to us directly (e.g., when you choose to send us crash reports from Firefox); we collect it automatically through our products and services (e.g., when we check whether your version of Firefox is up to date); </li> <li> we collect it automatically through our products and services (e.g., when we check whether your version of Firefox is up to date); </li> <li> someone else tells us information about you (e.g., Thunderbird works with your email providers to set up your account); or </li> <li> when we try and understand more about you based on information you\'ve given to us (e.g., when we use your IP address to customize language for some of our services). </li> </ul> <br/><header><b>What do we do with your information once we have it? </b></header> <p>When you give us personal information, we will use it in the ways for which you\'ve given us permission. Generally, we use your information to help us provide and improve our products and services for you.</p> <header><b>When do we share your information with others?</b></header> <ul> <li>When we have gotten your permission to share it.</li> <li>For processing or providing products and services to you, but only if those entities receiving your information are contractually obligated to handle the data in ways that are approved by Mozilla.</li> <li>When we are fulfilling our <a href="https://www.mozilla.org/en-US/about/manifesto/">mission of being open</a>. We sometimes release information to make our products better and foster an open web, but when we do so, we will remove your personal information and try to disclose it in a way that minimizes the risk of you being re-identified.</li> <li>When the law requires it. We follow the law whenever we receive requests about you from a government or related to a lawsuit. We\'ll notify you when we\'re asked to hand over your personal information in this way unless we\'re legally prohibited from doing so. When we receive requests like this, we\'ll only release your personal information if we have a good faith belief that the law requires us to do so. Nothing in this policy is intended to limit any legal defenses or objections that you may have to a third party\'s request to disclose your information.</li> <li>When we believe it is necessary to prevent harm to you or someone else. We will only share your information in this way if we have a good faith belief that it is reasonably necessary to protect the rights, property or safety of you, our other users, Mozilla or the public.</li> <li>If our organizational structure or status changes (if we undergo a restructuring, are acquired, or go bankrupt) we may pass your information to a successor or affiliate.</li><br/> </ul> <header><b>How do we store and protect your personal information? </b></header> <p> We are committed to protecting your personal information once we have it. We implement physical, business and technical security measures. Despite our efforts, if we learn of a security breach, we\'ll notify you so that you can take appropriate protective steps.</p> <p>We also don\'t want your personal information for any longer than we need it, so we only keep it long enough to do what we collected it for. Once we don\'t need it, we take steps to destroy it unless we are required by law to keep it longer.</p> <header><b>What else do we want you know? </b></header> <p>We\'re a global organization and our computers are in several different places around the world. We also use service providers whose computers may also be in various countries. This means that your information might end up on one of those computers in another country, and that country may have a different level of data protection regulation than yours. By giving us information, you consent to this kind of transfer of your information. No matter what country your information is in, we comply with applicable law and will also abide by the commitments we make in this privacy policy.<p> <p>If you are under 13, we don\'t want your personal information, and you must not provide it to us. If you are a parent and believe that your child who is under 13 has provided us with personal information, please contact us at <a href="mailto:lightbeam-privacy@mozilla.org">lightbeam-privacy@mozilla.org</a> to have your child\'s information removed.</p> <header><b>What if we change this policy? </b></header> <p> We may need to change this policy and when we do, we\'ll notify you. </p> </div>' + 
                // Lightbeam Privacy Policy ends
                '<br />' +
                '<p>By clicking OK, you are agreeing to the data practices in our privacy notice.</p>',
            "imageUrl": "image/lightbeam_popup_warningsharing.png"
    },
    callback);
}

function stopSharingDialog(callback){
    dialog( {   "name": dialogNames.stopUploadData,
                "title": "Stop Uploading Data", 
                "message": 
                    '<p>You are about to stop sharing data with the Lightbeam server.</p>' +
                    '<p>By clicking OK you will no longer be uploading data.</p>',
                "imageUrl": "image/lightbeam_popup_stopsharing2.png"
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
        "imageUrl": "image/lightbeam_popup_privacy.png"
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
                            "<p>Blocking sites will prevent any and all content from being loaded from selected domains, for example: [example.com, example.net] and all of their subdomains [mail.example.com, news.example.net etc.]. </p>" +
                            "<p>This can prevent some sites from working and degrade your internet experience. Please use this feature carefully. </p>",
                "imageUrl": "image/lightbeam_popup_blocked.png"
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
        "imageUrl": "image/lightbeam_popup_hidden.png"
        },
        callback
    );
}

function confirmResetDataDialog(callback){
    dialog( {
        "name": dialogNames.resetData,
        "title": "Reset Data",
        "message":  "<p>Pressing OK will delete all Lightbeam information including connection history, user preferences, block sites list etc.</p>" + 
                    "<p>Your browser will be returned to the state of a fresh install of Lightbeam.</p>",
        "imageUrl": "image/lightbeam_popup_warningreset.png"
    },callback
    );
}

function showPromptToShareDialog(callback){
    dialog( {
        "name": dialogNames.promptToShare,
        "dnsPrompt": true,
        "title": "Help the Ecosystem by Sharing",
        "message":  "<p>As a user of Lightbeam, you can help contribute to build our data ecosystem.</p>" + 
                    "<p>By sharing your data you can help us and others to understand third-party relationships on the web and promote further research in the field of online tracking and privacy.</p>  "+
                    "<p>Do you want to upload your data to the <a href='http://mozilla.org/en-US/lightbeam/database/'>public database</a> now?</p>",
        "imageUrl": "image/lightbeam_popup_startsharing.png"
    },
    callback
    );

}

// Helper function for testing so we can trigger any dialog.
function showDialog(name){
    if (Object.keys(allDialogs).indexOf(name) > -1){
        var tempPref = localStorage.dnsDialogs;
        localStorage.dnsDialogs = '[]';
        allDialogs[name](function(){});
        localStorage.dnsDialogs = tempPref;
    }else{
        console.log('Use: showDialog("name") where name is one of');
        Object.keys(allDialogs).forEach(function(name){
            console.log('\t%s', name);
        });
    }
}

