#!/bin/bash
set -e -x
apk --no-cache add python3 git
python3 -m pip install --upgrade pip
python3 -m pip install pre-commit

cd /deploy/

# Disable the branch-protection pre-commit since it will always fail on master.
export SKIP=no-commit-to-branch

if [[ -z "$CI_COMMIT_ID" ]]; then
    pre-commit run --all-files
else
    git diff-tree --no-commit-id --name-only -r $CI_COMMIT_ID | xargs pre-commit run --files
fi
