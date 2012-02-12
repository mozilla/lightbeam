(function() {
  var exports = CollusionGraphBookmarklet;

  module("bookmarklet");

  test("forEach()", function() {
    var count = 0;
    exports.forEach("h2", function() { count++; });
    ok(count >= 2, "works with selector");

    count = 0;
    exports.forEach(document.styleSheets, function() { count++; });
    equal(count, 1, "works with document.styleSheets");
  });

  test("getDomain()", function() {
    equal(exports.getDomain("http://foo.com/"), "foo.com");
    equal(exports.getDomain("http://foo.com:8080/"), "foo.com");
  });

  test("getTLD()", function() {
    equal(exports.getTLD("foo.com"), "foo.com");
    equal(exports.getTLD("bar.foo.com"), "foo.com");
    equal(exports.getTLD("baz.bar.foo.com"), "foo.com");
  });

  test("getColluders()", function() {
    ok(exports.getColluders().length > 0);
  });

  test("makeGraphJSON()", function() {
    var graph = exports.makeGraphJSON();
    equal(graph[document.location.hostname].visited, true);
  });
})();
