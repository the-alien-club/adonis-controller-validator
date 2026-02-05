#!/bin/bash

# Check if a package version exists in GitLab Package Registry
# Args: package_name version package_type
# Returns: 0 if exists, 1 if doesn't exist
check_package_exists() {
  local package_name=$1
  local version=$2
  local package_type=$3  # pypi or npm

  echo "🔍 Checking if package ${package_name}@${version} (${package_type}) exists..." >&2

  # Build API URL
  local api_url="${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/packages?package_name=${package_name}&package_version=${version}&package_type=${package_type}"
  echo "📡 API URL: ${api_url}" >&2

  # Query GitLab Packages API
  response=$(curl --silent --fail --header "JOB-TOKEN: $CI_JOB_TOKEN" "${api_url}" 2>&1)
  curl_exit_code=$?

  echo "📦 API Response: ${response}" >&2
  echo "🔢 curl exit code: ${curl_exit_code}" >&2

  # If curl failed, assume package doesn't exist (fail-safe: allow publishing)
  if [ $curl_exit_code -ne 0 ]; then
    echo "⚠️  API call failed - assuming package doesn't exist (will attempt publish)" >&2
    return 1
  fi

  # Check if response is an empty array (package doesn't exist)
  # Remove whitespace and compare
  response_cleaned=$(echo "$response" | tr -d '[:space:]')

  if [ "$response_cleaned" = "[]" ]; then
    echo "✅ Package version not found - safe to publish" >&2
    return 1  # Doesn't exist
  else
    echo "⚠️  Package version already exists - will use unique version" >&2
    return 0  # Exists
  fi
}

# Get git commit hash (short form)
get_commit_hash() {
  # Use GitLab CI variable if available, otherwise try git
  if [ -n "$CI_COMMIT_SHORT_SHA" ]; then
    echo "$CI_COMMIT_SHORT_SHA"
  else
    git rev-parse --short HEAD 2>/dev/null || echo "unknown"
  fi
}

# Get commit count since last tag
get_commit_count() {
  # In CI without full git history, use pipeline ID or default to 0
  if [ -n "$CI_PIPELINE_IID" ] && ! git rev-parse --git-dir > /dev/null 2>&1; then
    # Git not available in CI - use pipeline IID as a substitute
    echo "$CI_PIPELINE_IID"
  else
    local last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
    if [ -z "$last_tag" ]; then
      # No tags found, count all commits
      git rev-list --count HEAD 2>/dev/null || echo "0"
    else
      # Count commits since last tag
      git rev-list --count ${last_tag}..HEAD 2>/dev/null || echo "0"
    fi
  fi
}
