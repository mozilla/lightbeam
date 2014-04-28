This contributors document should be the canonical place for answers to:

    What are some ways I can contribute?
    Where can I file bugs? What makes a good bug report?
    What do I need to do to contribute code? What will make my pull request immediately mergeable?
    What is the code review process?
    What sort of organizational schema is used for Github Issues? What labels are used, and what do they mean? How are milestones handled?

# Before submitting a pull request

To install jshint, simply `npm install jshint` from the root directory of the project. Then run like it like this:

    node_modules/.bin/jshint data/*.js

and make sure your changes are not adding any new warnings or errors.

Also keep an eye on the command line warnings and errors when running the extension via `cfx run`.
