---
description: Create a pull request from the current branch to main
---

# Create PR

Create a robust, high-quality, and comprehensive pull request from the current branch.

## Instructions

1. **Prerequisite & Safety Checks**:
   - Verify that the GitHub CLI (`gh`) is authenticated by running `gh auth status`. If not authenticated, prompt the user to login or authenticate first.
   - Check if there are any uncommitted changes by running `git status --porcelain`. If unstaged or uncommitted changes are found, warn the user and list them before proceeding, as they might want to commit them first.

2. **Check for Existing PR**:
   - Run `git branch --show-current` to get the current branch name.
   - Run `gh pr list --head "$(git branch --show-current)" --json url,state` to check if a PR already exists for this branch. If an open PR already exists, print its URL and exit gracefully to prevent creating a duplicate.

3. **Analyze Branch Changes & Commits**:
   - Run `git log origin/main..HEAD --oneline` (fallback to `git log main..HEAD --oneline` if origin is not configured) to gather all commit subjects in this branch.
   - Run `git diff --stat origin/main` (fallback to `git diff --stat main`) to see the list of modified files.

4. **Prepare PR Details**:
   - **Title**: If `$ARGUMENTS` specifies a title, use it. Otherwise, if there is a single commit, use its subject. If there are multiple commits, generate a concise, high-level, and descriptive title (e.g., `feat: implement websocket feed` or `fix: secure database configuration`).
   - **Summary**: Generate a comprehensive bulleted summary of all changes in the PR by analyzing the commit list and modified files.
   - **Test Plan**: Dynamically determine which tests and verifications are relevant by inspecting the modified files list:
     - If Go source files (`*.go`) were modified: include `make lint` and `make test`.
     - If proto files (`*.proto`) were modified: include `make proto` and compile instructions.
     - If database migration/SQL files (`*.sql`) were modified: include `make migrate`.
     - If docker, compose, or workflow files (`*.yml`, `Dockerfile`) were modified: include verification of environment/infrastructure deployment (e.g., `make dev-up`).
     - Always include `make build` as a standard sanity check.

5. **Ensure Branch is Pushed**:
   - Check if a remote tracking branch exists: `git rev-parse --abbrev-ref --symbolic-full-name @{u}`.
   - If no remote tracking branch is set up, or if there are unpushed commits (`git log @{u}..HEAD --oneline`), push the current branch to origin: `git push -u origin <current_branch>`.

6. **Create the Pull Request**:
   - Formulate the PR body dynamically using the generated Summary, Test Plan, and appropriate formatting.
   - Check if `$ARGUMENTS` contains words like "draft" or "wip". If so, or if requested, create it as a draft PR: `gh pr create --draft`. Otherwise, create it as a standard PR.
   - Run `gh pr create --title "<PR Title>" --body "<PR Body>" --base main`.

7. **Deliver Result**:
   - Output the created PR URL and a summary of the action taken.

## Conditions
- Always target `main` as the base branch.
- Never duplicate a PR if one is already open for this branch.
- Tailor the test plan dynamically to the specific files changed in this branch.