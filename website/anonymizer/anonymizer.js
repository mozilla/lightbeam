function anonymize(data) {
  var domainMap = {};
  var newData = {};
  var i = 1;

  function getMappedDomain(name) {
    if (!(name in domainMap)) {
      domainMap[name] = i + ".anon";
      i++;
    }
    return domainMap[name];
  }
  
  for (var name in data) {
    var anonName = getMappedDomain(name);
    newData[anonName] = {};
    for (var referrer in data[name]) {
      newData[anonName][getMappedDomain(referrer)] = data[name][referrer];
    }
  }
  
  return newData;
}
