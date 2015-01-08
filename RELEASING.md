To release a new version of Lightbeam:

1. bump version number in `package.json` (the convention for version numbers is *major.minor.patch*)
2. `git commit -a -m "Bump version to x.y.z"`
3. `git tag lightbeam-x.y.z`
4. using the latest ESR release of the addon SDK, run `cfx xpi` to generate `lightbeam.xpi`
5. log into <https://addons.mozilla.org> and click "Tools | Manage my submissions"
6. click on "Lightbeam", then "Upload a new version" and select "full review" to upload the .xpi
7. once the release is approved, push your changes to the repo: `git push; git push --tags`
