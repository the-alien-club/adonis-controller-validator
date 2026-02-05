#!/bin/bash

get_version_tag() {
  local package_json_path="${1:-package.json}"

  # Extract base version from package.json
  BASE_VERSION=$(node -e "console.log(require('./${package_json_path}').version)")

  # Compute version based on branch
  if [ "$CI_COMMIT_BRANCH" == "main" ]; then
    echo "${BASE_VERSION}"
  elif [ "$CI_COMMIT_BRANCH" == "staging" ]; then
    echo "${BASE_VERSION}-rc"
  else
    echo "${BASE_VERSION}-dev"
  fi
}

get_latest_tag() {
    if [ "$CI_COMMIT_BRANCH" == "main" ]; then
        echo "latest"
    elif [ "$CI_COMMIT_BRANCH" == "staging" ]; then
        echo "latest-staging"
    else
        echo "latest-dev"
    fi
}
