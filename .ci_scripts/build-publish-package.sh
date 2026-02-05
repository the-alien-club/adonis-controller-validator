#!/bin/bash
set -e
source "$(dirname "$0")/lib/utils.sh"
source "$(dirname "$0")/lib/package_utils.sh"

# Validate required environment variables
if [ -z "$NPM_PACKAGE_NAME" ]; then
  echo "❌ ERROR: NPM_PACKAGE_NAME environment variable is not set"
  echo "Please set NPM_PACKAGE_NAME in your .gitlab-ci.yml"
  exit 1
fi

TAG=$(get_version_tag)
COMMIT_HASH=$(get_commit_hash)
COMMIT_COUNT=$(get_commit_count)
PACKAGE_NAME="$NPM_PACKAGE_NAME"

echo "Building and publishing TypeScript package..."
echo "📦 Package: ${PACKAGE_NAME}"
echo "Base version from package.json: $TAG"

# For npm, we need to URL-encode the scoped package name
# @alien/adonis-controller-validator -> %40alien%2Fadonis-controller-validator
ENCODED_PACKAGE_NAME=$(echo "$PACKAGE_NAME" | sed 's/@/%40/g' | sed 's/\//%2F/g')
echo "Encoded package name for API: ${ENCODED_PACKAGE_NAME}"

# Check if base version exists in GitLab npm registry
if check_package_exists "$ENCODED_PACKAGE_NAME" "$TAG" "npm"; then
  # Version exists - append commit hash with commit count to make it unique
  if [ "$COMMIT_COUNT" -gt 0 ]; then
    VERSION="${TAG}.${COMMIT_COUNT}+${COMMIT_HASH}"
  else
    VERSION="${TAG}+${COMMIT_HASH}"
  fi
  echo "⚠️  Version conflict detected - using unique version: $VERSION"
else
  # Version doesn't exist - use base version
  VERSION="$TAG"
  echo "✅ Using base version: $VERSION"
fi

echo "Final package version: $VERSION"

# Update version in package.json
node -e "const fs = require('fs'); const pkg = JSON.parse(fs.readFileSync('package.json')); pkg.version = '${VERSION}'; fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')"

# Install dependencies
npm ci

# Build TypeScript
npm run build

# Create tarball
npm pack

# Extract npm scope from package name (@alien/adonis-controller-validator -> @alien)
NPM_SCOPE=$(echo "$PACKAGE_NAME" | grep -oP '^@[^/]+' || echo "")

if [ -n "$NPM_SCOPE" ]; then
  echo "📦 NPM Scope detected: ${NPM_SCOPE}"
  # Configure npm for GitLab registry with detected scope
  echo "${NPM_SCOPE}:registry=${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/packages/npm/" > .npmrc
  echo "//${CI_SERVER_HOST}/api/v4/projects/${CI_PROJECT_ID}/packages/npm/:_authToken=${CI_JOB_TOKEN}" >> .npmrc
else
  echo "⚠️  No npm scope detected - using default registry configuration"
  # For non-scoped packages, configure default registry
  echo "registry=${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/packages/npm/" > .npmrc
  echo "//${CI_SERVER_HOST}/api/v4/projects/${CI_PROJECT_ID}/packages/npm/:_authToken=${CI_JOB_TOKEN}" >> .npmrc
fi

# Publish to GitLab npm registry
npm publish

echo "✅ TypeScript package v${VERSION} published to GitLab npm"
