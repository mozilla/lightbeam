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
    
    /* dropdown lists on the side bar */
    function dropDownGroup(btnGroup, callback){
        var view = btnGroup.querySelector("[data-view]");
        var list = btnGroup.querySelector("[data-list]");
    
        callback = callback || function(){};
    
        btnGroup.addEventListener("click", function(e){
            var selected = btnGroup.querySelector("[data-selected]");
            var targetValue = e.target.getAttribute("data-value");
            var activeDropdown = document.querySelector(".active_dropdown");
            
            // allows only one open dropdown list at a time
            if( activeDropdown && !btnGroup.classList.contains("active_dropdown") ){
                activeDropdown.querySelector(".dropdown_options").classList.add("collapsed");
                activeDropdown.classList.remove("active_dropdown");
            }
            
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
        dropDownGroup(btnGroup, function(val){
                //console.log("selected val=" + val);
        });
    });
                        

    /* Toggle Info Panel */
    document.querySelector(".temp_showinfo").addEventListener("click", function(){
        document.querySelector("#content").classList.toggle("showinfo");
    });

});



/* Convert a NodeList to Array */
function toArray(nl){
    return Array.prototype.slice.call(nl, 0);
}
