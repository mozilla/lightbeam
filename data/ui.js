
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
            switch(val.toLowerCase()){
                case 'clock':
                case 'graph':
                    switchVisualization(val);
                    break;
                default:
                    console.log("selected val=" + val);
            }
        });
    });


    /* Toggle Info Panel */
    document.querySelector(".showinfo").addEventListener("click", function(){
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
    // FIXME: empty the data from current view too
});

document.querySelector('.upload').addEventListener('click', function(){
    addon.emit('upload');
});

function getZoom(){
    var box = document.querySelector('.vizcanvas')
        .getAttribute('viewBox')
        .split(/\s/)
        .map(function(i){ return parseInt(i, 10); });
    return {x: box[0], y: box[1], w: box[2], h: box[3]};
}

function setZoom(box){
    document.querySelector('.vizcanvas')
        .setAttribute('viewBox', [box.x, box.y, box.w, box.h].join(' '));
}

document.querySelector('.move-up').addEventListener('click', function(){
    var box = getZoom();
    var dY = Math.floor(box.h / 10);
    box.y += dY;
    setZoom(box);
    return false;
});

document.querySelector('.move-down').addEventListener('click', function(){
    var box = getZoom();
    var dY = Math.floor(box.h / 10);
    box.y -= dY;
    setZoom(box);
    return false;
});

document.querySelector('.move-left').addEventListener('click', function(){
    var box = getZoom();
    var dX = Math.floor(box.w / 10);
    box.x += dX;
    setZoom(box);
    return false;
});

document.querySelector('.move-right').addEventListener('click', function(){
    var box = getZoom();
    var dX = Math.floor(box.w / 10);
    box.x -= dX;
    setZoom(box);
    return false;
});

document.querySelector('.zoom-in').addEventListener('click', function(){
    var box = getZoom();
    var dX = Math.floor(box.w / 5);
    var dY = Math.floor(box.h / 5);
    // box.x -= dX;
    // box.h -= dY;
    box.w /= 1.1;
    box.h /= 1.1;
    setZoom(box);
    return false;
});

document.querySelector('.zoom-out').addEventListener('click', function(){
    var box = getZoom();
    var dX = Math.floor(box.w / 5);
    var dY = Math.floor(box.h / 5);
    // box.x += dX;
    // box.h += dY;
    box.w *= 1.1;
    box.h *= 1.1;
    setZoom(box);
    return false;
});





