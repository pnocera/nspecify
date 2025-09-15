#  1. First, do a dry run:
npm publish --dry-run

#  2. If everything looks good, publish:
npm publish

#  3. After publishing, create a git tag:
git tag -a v1.0.2 -m "Release version 1.0.2"
git push origin v1.0.2

#  4. Verify on npm:
npm view nspecify
