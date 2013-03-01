(function(global){

var tooltipTimer;
var tooltip;

function showTooltip(event){
    if (!tooltip){
        tooltip = document.getElementById('tooltip');
    }
    tooltip.style.left = '-1000px';
    tooltip.style.display = 'inline-block';
    var d = svgdataset(event.target);
    console.error(event, event.target, event.target.dataset);
    tooltip.innerHTML = d.source + ' -> ' + d.target + '<span class="howMany">(&times;' + d.howMany + ')</span>';
    var rect = event.target.getClientRects()[0];
    var tooltipWidth = tooltip.offsetWidth;
    tooltip.style.top = (rect.top - 60) + 'px';
    tooltip.style.left = (rect.left + (rect.width / 2) - (tooltipWidth / 2)) + 'px';
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

