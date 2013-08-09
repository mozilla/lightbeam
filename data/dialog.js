/* Dialog / Popup ===================================== */

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

    restrictFocusWithinDialog();

    addDialogEventHandlers(modal,options,function(userResponse){
        callback(userResponse);
    });
}

function createDialogContent(options){
    var titleBar = "<div class='dialog-title'>" + (options.title || "&nbsp;") + "</div>";
    var messageBody = "<div class='dialog-message'>" + (options.message || "&nbsp;") + "</div>";
    var content = "";
    // dialog sign
    var image = "";
    if ( options.imageUrl ){
        image = "<div class='dialog-sign'><img src='" + options.imageUrl + "' /></div>";
    }
    // controls
    var controls;
    var childElems = "";
    var doNotShowAgainPrompt = "<div class='dialog-dns'><input type='checkbox' /> Do not show this again.</div>";
    var okButton = "<a class='pico-close dialog-ok'>OK</a>";
    var cancelButton = "<a class='pico-close dialog-cancel'>Cancel</a>";
    if ( options.dnsPrompt ){ // show Do Not Show Again prompt
        childElems += doNotShowAgainPrompt;
    }
    if ( options.type == "alert" ){ // alert dialog only needs a single button "OK"
        childElems += "<div class='dialog-btns'>" + "<a class='pico-close dialog-ok'>OK</a>" + "</div>";

    }else{
        if ( navigator.appVersion.indexOf("Win") > -1 ){ // runs on Windows
            childElems += "<div class='dialog-btns'>" + okButton + cancelButton + "</div>";
        }else{ // runs on OS other than Windows
            childElems += "<div class='dialog-btns'>" + cancelButton + okButton + "</div>";
        }
    }

    content = "<div class='dialog-content'>" + image + messageBody + "</div>";
    controls = "<div class='dialog-controls'>" + childElems + "</div>";

    return titleBar + content + controls;
}

function restrictFocusWithinDialog(){
    var allElemsInDialog = document.querySelectorAll(".pico-content *");
    var tabIndex = 0;
    toArray(allElemsInDialog).forEach(function(elem, i){
        if ( elem.nodeName.toLowerCase() == "a" || elem.nodeName.toLowerCase() == "input" ){
            elem.setAttribute("tabIndex", tabIndex);
            tabIndex++;
        }
    });
    document.querySelector(".pico-content [tabIndex='0']").focus();
}

function addDialogEventHandlers(modal,options,callback){
    var keyPressHandler = function(event){
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

    document.addEventListener("keydown", keyPressHandler);

    // restrict Tab/focus within dialogs
    document.querySelector(".pico-content").addEventListener("keypress", function(event){
        event.stopPropagation();
        var focusedElm = document.activeElement;
        // Tab key is pressed
        if ( event.keyCode == "9" ){
            var currentTabIndex = parseInt(focusedElm.getAttribute("tabIndex"));
            var nextElem = document.querySelector(".pico-content [tabIndex='" + (currentTabIndex+1) + "']");
            if ( nextElem ){
                nextElem.focus();
            }else{
                document.querySelector(".pico-content [tabIndex='0']").focus();
            }
        }
        // when the focused element is the OK or Cancel button and Enter key is pressed
        // mimic mouse clicking on button
        if ( event.keyCode == "13" && focusedElm.mozMatchesSelector(".pico-content .dialog-btns a") ){
            focusedElm.click();
        }
    });

    modal.onClose(function(){
        document.removeEventListener("keydown", keyPressHandler);
    });
    
    // OK button click event handler
    var okButton = document.querySelector(".pico-close.dialog-ok");
    document.querySelector(".pico-close.dialog-ok").addEventListener("click",function(){
        if ( document.querySelector(".dialog-dns input") && document.querySelector(".dialog-dns input").checked ){ // Do Not Show
            var dnsPref = localStorage.dnsDialogs || "[]";
            dnsPref = JSON.parse(dnsPref);
            dnsPref.push(options.name);
            localStorage.dnsDialogs = JSON.stringify(dnsPref);
        }
        modal.close();
        callback(true);
    });

    // Cancel button click event handler
    var cancelButton = document.querySelector(".pico-close.dialog-cancel");
    if ( cancelButton ){
        cancelButton.addEventListener("click",function(){
            modal.close();
            callback(false);
        });
    }
}