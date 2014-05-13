all:

lint:
	@test -x node_modules/.bin/jshint || (echo "You must install jshint first: npm install jshint" && exit 1)
	@node_modules/.bin/jshint data/*.js lib/*.js lib/*/*.js javascripts/*.js

test:
	cfx test

.PHONY: lint test
