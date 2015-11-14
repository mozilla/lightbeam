# Before submitting a pull request

Install the git hooks for this project by:

    cd .git
    rm -rf hooks
    ln -s ../hooks .

You can run the test suite like this:

    jpm test

In addition to running the tests, you should lint the code. To install jshint, simply `npm install jshint` from the root directory of the project. Then run it like this:

    ./hooks/pre-commit

and make sure your changes are not adding any new warnings or errors.

Also keep an eye on the command line warnings and errors when running the extension via `jpm run`.
