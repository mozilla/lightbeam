(function(global){

var tooltipTimer;

function showTooltip(event){
    // console.log('Show tooltip for %s: %s', event.target.tagName, event.target.getAttribute('data-target'));
    var tooltip = document.getElementById('tooltip');
    tooltip.style.left = '-1000px';
    tooltip.style.display = 'inline-block';
    var d = svgdataset(event.target);
    console.error(event, event.target, event.target.dataset);
    tooltip.innerHTML = d.source + ' -> ' + d.target + '<br />' + d.timestamp + ' (&times;' + d.howMany + ')';
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
    setTooltipTimeout();
    return false;
}

global.tooltip = {
    show: showTooltip,
    hide: hideTooltip
};

})(this);

