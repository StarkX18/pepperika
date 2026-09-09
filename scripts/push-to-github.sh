#!/usr/bin/env bash
set -euo pipefail

# Push Spark to GitHub peperik repo.
# Requires GH_TOKEN (repo scope). Optional GITHUB_REPO_URL.

if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "Error: GH_TOKEN is not set."
  echo "Create a GitHub PAT with repo scope and export GH_TOKEN."
  exit 1
fi

REPO_URL="${GITHUB_REPO_URL:-}"

if [[ -z "$REPO_URL" ]]; then
  # Resolve owner from GitHub API
  OWNER=$(curl -s -H "Authorization: Bearer $GH_TOKEN" https://api.github.com/user | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).login||''))")
  if [[ -z "$OWNER" ]]; then
    echo "Error: could not resolve GitHub user. Set GITHUB_REPO_URL explicitly."
    exit 1
  fi
  REPO_URL="https://github.com/${OWNER}/peperik.git"
  echo "Using repo: $REPO_URL"
fi

# Create repo if missing
OWNER_REPO=$(echo "$REPO_URL" | sed -E 's#https://github.com/([^/]+/[^/.]+).*#\1#')
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $GH_TOKEN" "https://api.github.com/repos/${OWNER_REPO}")
if [[ "$HTTP_CODE" == "404" ]]; then
  OWNER=$(echo "$OWNER_REPO" | cut -d/ -f1)
  echo "Creating repository ${OWNER}/peperik ..."
  curl -s -H "Authorization: Bearer $GH_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    -X POST "https://api.github.com/user/repos" \
    -d '{"name":"peperik","description":"Spark — mystery rules dating chat with multi-agent AI","private":false}' >/dev/null
fi

cd "$(dirname "$0")/.."

git remote remove origin 2>/dev/null || true
git remote add origin "https://x-access-token:${GH_TOKEN}@${REPO_URL#https://}"

git push -u origin main
git push -u origin cursor/mystery-rules-dating-chat-79c3 2>/dev/null || true

echo "Done. Repo: ${REPO_URL%.git}"
