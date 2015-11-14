To release a new version of Lightbeam:

1. bump version number in `package.json` (the convention for version numbers is *major.minor.patch*)
2. `git commit -a -m "Bump version to x.y.z"`
3. `git tag lightbeam-x.y.z`
4. using the latest ESR release of the addon SDK, run `jpm xpi` to generate `lightbeam.xpi`
5. log into <https://addons.mozilla.org> and click "Tools | Manage my submissions"
6. find "Lightbeam" and click "New version" to upload the .xpi
7. add something like "Added feature foo. Full changelog on <a href="https://github.com/mozilla/lightbeam/issues?q=milestone%3A1.2.0+is%3Aclosed">Github</a>." in the version notes.
8. once the release is approved, push your changes to the repo: `git push; git push --tags`
9. close the milestone on <https://github.com/mozilla/lightbeam/milestones> and create one for the next point release
