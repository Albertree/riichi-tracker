#!/usr/bin/env bash
# Build and publish dist/ to the gh-pages branch.
set -euo pipefail

cd "$(dirname "$0")/.."
GIT_DIR="$PWD/.git"

npm run build
touch dist/.nojekyll

INDEX="$(mktemp)"
rm -f "$INDEX"
trap 'rm -f "$INDEX"' EXIT
export GIT_INDEX_FILE="$INDEX"

(cd dist && git --git-dir="$GIT_DIR" --work-tree=. add -A -f .)
tree="$(git write-tree)"
commit="$(git commit-tree "$tree" -m "Deploy $(git rev-parse --short HEAD) to GitHub Pages")"
git push --force origin "$commit:refs/heads/gh-pages"

echo "Deployed: https://albertree.com/riichi-tracker/"
