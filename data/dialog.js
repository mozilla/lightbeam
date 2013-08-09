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
            var dnsPref = localStorage.dnsDialogs || "[]";
            dnsPref = JSON.parse(dnsPref);
            dnsPref.push(options.name);
            localStorage.dnsDialogs = JSON.stringify(dnsPref);
        }
        modal.close();
        callback(true);
    });
    // Cancel button click event handler
    var cancelButton = dialogContainer.querySelector(".pico-close.dialog-cancel");
    if ( cancelButton ){
        cancelButton.addEventListener("click",function(){
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

    restrictTabWithinDialog(modal);
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