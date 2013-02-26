(function(){

var tooltipTimer;

function showTooltip(event){
    // console.log('Show tooltip for %s: %s', event.target.tagName, event.target.getAttribute('data-target'));
    var tooltip = document.getElementById('tooltip');
    tooltip.style.left = '-1000px';
    tooltip.style.display = 'inline-block';
    tooltip.innerHTML = event.target.getAttribute('data-target');
    var rect = event.target.getClientRects()[0];
    var tooltipWidth = tooltip.offsetWidth;
    // console.log('rect: %o, width: %s', rect, tooltipWidth);
    tooltip.style.top = (rect.top - 60) + 'px';
    tooltip.style.left = (rect.left + (rect.width / 2) - (tooltipWidth / 2)) + 'px';
    // PLACEHOLDER (FOR DEBUGGING)
    // placeholder.style.left = rect.left + 'px';
    // placeholder.style.top = rect.top + 'px';
    // placeholder.style.border = '1px solid red';
    return false;
}

function setTooltipTimeout(){
    if (tooltipTimer){
        clearTimeout(tooltipTimer);
    }
    tooltipTimer = setTimeout(timeoutTooltip, 2000);
}

function timeoutTooltip(){
    tooltip.style.display = 'none';
    tooltip.timer = null;
}

function hideTooltip(event){
    // console.log('Hide tooltip for %s: %s', event.target.tagName, event.target.getAttribute('data-target'));
    // tooltip.style.display = 'none';
    // placeholder.style.border = '0';
    setTooltipTimeout();
    return false;
}

})();
