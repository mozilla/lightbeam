
/* Convert a NodeList to Array */
function toArray(nl){
    return Array.prototype.slice.call(nl, 0);
}

/* DOMContentLoaded event listener */
window.addEventListener("DOMContentLoaded", function(){

    function dropdownGroup(btnGroup, callback){
        var view = btnGroup.querySelector("[data-view]");
        var list = btnGroup.querySelector("[data-list]");

        callback = callback || function(){};

        btnGroup.addEventListener("click", function(e){
            var selected = btnGroup.querySelector("[data-selected]");
            var targetValue = e.target.getAttribute("data-value");
            var activeDropdown = document.querySelector(".active_dropdown");

            // opens up the current selected dropdown list
            btnGroup.querySelector(".dropdown_options").classList.toggle("collapsed");
            btnGroup.classList.toggle("active_dropdown");

            // when user selects an option from the dropdown list
            if ( targetValue ){
                view.querySelector("a:not(.invi_focus)").innerHTML = e.target.innerHTML;
                selected.removeAttribute("data-selected");
                e.target.setAttribute("data-selected", true);
                callback(targetValue);
            }

        }, false);
    }

    /* Bind click event listener to each of the btn_group memebers */
    var btnGroupArray = toArray(document.querySelectorAll(".btn_group"));
    btnGroupArray.forEach(function(btnGroup){
        dropdownGroup(btnGroup, function(val){
            val = val.toLowerCase();
            switch(val){
                case 'clock':
                case 'graph':
                    switchVisualization(val);
                    break;
                case 'list':
                    switchVisualization(val);
                    break;
                default:
                    console.log("selected val=" + val);
            }
        });
    });


    /* Toggle Info Panel */
    document.querySelector(".show-info-button").addEventListener("click", function(){
        document.querySelector("#content").classList.toggle("showinfo");
    });


    /* When a open dropdown list loses focus, collapse it. */
    window.addEventListener("click", function(e){
        var activeDropdown = document.querySelector(".active_dropdown");
        if ( activeDropdown && !activeDropdown.contains(e.target) ){
                activeDropdown.querySelector(".dropdown_options").classList.add("collapsed");
                activeDropdown.classList.remove("active_dropdown");
        }
    }, true);


});

document.querySelector(".download").addEventListener('click', function() {
    addon.once('export-data', function(connections){
        console.log('received export data');
        window.open('data:application/json,' + connections);
    });
    addon.emit('export');
});

document.querySelector('.reset-data').addEventListener('click', function(){
    addon.emit('reset');
    aggregate.emit('reset');
    currentVisualization.emit('reset');
    // FIXME: empty the data from current view too
});

document.querySelector('.upload').addEventListener('click', function(){
    addon.emit('upload');
});

function getZoom(canvas){
    // TODO: code cleanup if both cases use basically the same code
    switch(canvas){
        case 'vizcanvas': {
            var box = document.querySelector('.vizcanvas')
                        .getAttribute('viewBox')
                        .split(/\s/)
                        .map(function(i){ return parseInt(i, 10); });
            return {x: box[0], y: box[1], w: box[2], h: box[3]};
        }
        case 'mapcanvas': {
            var box = document.querySelector('#mapcanvas')
                        .getAttribute('viewBox')
                        .split(/\s/)
                        .map(function(i){ return parseInt(i, 10); });
            console.log(box);
            return {x: box[0], y: box[1], w: box[2], h: box[3]};
        }
        default: throw new Error('It has to be one of the choices above');
    }
}

function setZoom(box,canvas){
    // TODO: code cleanup if both cases use basically the same code
    switch(canvas){
        case 'vizcanvas': {
                document.querySelector('.vizcanvas')
                    .setAttribute('viewBox', [box.x, box.y, box.w, box.h].join(' '));
                break;
        }
        case 'mapcanvas': {
                document.querySelector('#mapcanvas')
                    .setAttribute('viewBox', [box.x, box.y, box.w, box.h].join(' '));
                break;

        }
        default: throw new Error('It has to be one of the choices above');
    }
}

document.querySelector('.controls_options .move-up').addEventListener('click', function(){
    var box = getZoom('vizcanvas');
    var dY = Math.floor(box.h / 10);
    box.y += dY;
    setZoom(box,'vizcanvas');
    return false;
});

document.querySelector('.controls_options .move-down').addEventListener('click', function(){
    var box = getZoom('vizcanvas');
    var dY = Math.floor(box.h / 10);
    box.y -= dY;
    setZoom(box,'vizcanvas');
    return false;
});

document.querySelector('.controls_options .move-left').addEventListener('click', function(){
    var box = getZoom('vizcanvas');
    var dX = Math.floor(box.w / 10);
    box.x += dX;
    setZoom(box,'vizcanvas');
    return false;
});

document.querySelector('.controls_options .move-right').addEventListener('click', function(){
    var box = getZoom('vizcanvas');
    var dX = Math.floor(box.w / 10);
    box.x -= dX;
    setZoom(box,'vizcanvas');
    return false;
});

document.querySelector('.controls_options .zoom-in').addEventListener('click', function(){
    var box = getZoom('vizcanvas');
    var dX = Math.floor(box.w / 5);
    var dY = Math.floor(box.h / 5);
    // box.x -= dX;
    // box.h -= dY;
    box.w /= 1.1;
    box.h /= 1.1;
    setZoom(box,'vizcanvas');
    return false;
});

document.querySelector('.controls_options .zoom-out').addEventListener('click', function(){
    var box = getZoom('vizcanvas');
    var dX = Math.floor(box.w / 5);
    var dY = Math.floor(box.h / 5);
    // box.x += dX;
    // box.h += dY;
    box.w *= 1.1;
    box.h *= 1.1;
    setZoom(box,'vizcanvas');
    return false;
});


/* Map Controls ========================= */

document.querySelector('.map-control .move-up').addEventListener('click', function(){
    var box = getZoom('mapcanvas');
    var dY = Math.floor(box.h / 10);
    box.y += dY;
    setZoom(box,'mapcanvas');
    return false;
});

document.querySelector('.map-control .move-down').addEventListener('click', function(){
    var box = getZoom('mapcanvas');
    var dY = Math.floor(box.h / 10);
    box.y -= dY;
    setZoom(box,'mapcanvas');
    return false;
});

document.querySelector('.map-control .move-left').addEventListener('click', function(){
    var box = getZoom('mapcanvas');
    var dX = Math.floor(box.w / 10);
    box.x += dX;
    setZoom(box,'mapcanvas');
    return false;
});

document.querySelector('.map-control .move-right').addEventListener('click', function(){
    var box = getZoom('mapcanvas');
    var dX = Math.floor(box.w / 10);
    box.x -= dX;
    setZoom(box,'mapcanvas');
    return false;
});

document.querySelector('.map-control .zoom-in').addEventListener('click', function(){
    // TODO: zoom in/out adjustment
    var box = getZoom('mapcanvas');
    box.w /= 1.5;
    box.h /= 1.5;
    setZoom(box,'mapcanvas');
    return false;
});

document.querySelector('.map-control .zoom-out').addEventListener('click', function(){
    // TODO: zoom in/out adjustment
    var box = getZoom('mapcanvas');
    box.w *= 1.5;
    box.h *= 1.5;
    setZoom(box,'mapcanvas');
    return false;
});

