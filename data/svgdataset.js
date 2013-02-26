(function(global){

function dataAttrToKey(attr){
    return attr.slice(5).split('-').map(function(part, index){
        if (index){
            return part[0].toUpperCase() + part.slice(1);
        }
        return part;
    }).join('');
}

function dataKeyToAttr(key){
    return 'data-' + key.replace(/([A-Z])/, '-$1').toLowerCase();
}

function svgdataset(elem){
    // work around the fact that SVG elements don't have dataset attributes
    var ds = function(key, value){
        if (value === undefined){
            // act as getter
            return JSON.parse(elem.getAttribute(dataKeyToAttr(key)));
        }else{
            elem.setAttribute(dataKeyToAttr(key), JSON.stringify(value));
        }
    }
    // Create read-only shortcuts for convenience
    Array.prototype.forEach.call(elem.attributes, function(attr){
        if (attr.name.startsWith('data-')){
            try{
                ds[dataAttrToKey(attr.name)] = JSON.parse(attr.value);
            }catch(e){
                ds[dataAttrToKey(attr.name)] = attr.value;
                console.error('unable to parse %s', attr.value);
            }
        }
    });
    return ds;
}

global.svgdataset = svgdataset;

})(this);
