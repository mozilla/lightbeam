/*
 To-Do
  - function ordering
  - add event listener to collapse the dropdown list
      - timer
      - when it loses focus
      - after you have selected something
*/


window.addEventListener("DOMContentLoaded", function(){
    var sampleDropdown = document.querySelector(".btn_group");
    
    function dropDownGroup(el, callback ){
        var view = el.querySelector("[data-view]");
        var list = el.querySelector("[data-list]");
    
        callback = callback || function(){};
    
        el.addEventListener("click", function(e){
            var selected = el.querySelector("[data-selected]");
            var targetValue = e.target.getAttribute("data-value");
            el.querySelector(".dropdown_options").classList.toggle("collapsed");
            if ( targetValue ){
                view.querySelector("a").innerHTML = e.target.innerHTML;
                selected.removeAttribute("data-selected");
                e.target.setAttribute("data-selected", true);
                callback(targetValue);
            }                 
        }, false);
    
    }
    
    // bind actions to each of the btn_group elements
    [].forEach.call(
        document.querySelectorAll(".btn_group"),
        function(el){
            dropDownGroup(el, function(val){
                //console.log("selected val=" + val);
            });
        }
    )
                        

});




// skip empty text nodes and find the next sibling node
function getNextSibling(current_node){
    next_node = current_node.nextSibling;
    while (next_node.nodeType != 1){
        next_node = next_node.nextSibling;
    }
    return next_node;
}

