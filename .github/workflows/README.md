# GitHub Workflows

This directory contains GitHub Actions workflows for automating CI/CD processes for the @fuzzy-street/errors package.

## Workflows

### CI (`ci.yml`)

This workflow runs on:
- Every push to the `main` branch
- Every pull request to the `main` branch

It performs the following steps:
1. Checkout the code
2. Set up Node.js and pnpm
3. Install dependencies
4. Run linting with Biome
5. Run type checking with TypeScript
6. Build the package
7. Run tests

Use this workflow to ensure code quality and prevent breaking changes.

### Release (`release.yml`)

This workflow runs when a tag with the pattern `v*` is pushed to the repository (e.g., `v1.0.0`).

It performs the following steps:
1. Checkout the code
2. Set up Node.js and pnpm
3. Install dependencies
4. Run linting, type checking, build, and tests
5. Generate a changelog based on conventional commits
6. Create a GitHub release with the changelog
7. Publish the package to npm

## Release Process

To release a new version:

1. Make sure all changes are committed to the `main` branch
2. Run one of the release commands:
   ```bash
   # For patch releases (bug fixes)
   pnpm release:patch

   # For minor releases (new features)
   pnpm release:minor

   # For major releases (breaking changes)
   pnpm release:major
   ```
3. Push the tags to GitHub:
   ```bash
   git push --follow-tags origin main
   ```
4. The release workflow will automatically:
   - Create a GitHub release with the changelog
   - Publish the package to npm

## Configuration

### NPM Token

To publish to npm, the workflow uses the `NPM_TOKEN` secret.

This token should be added to your GitHub repository secrets settings:
1. Go to your repository on GitHub
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Name: `NPM_TOKEN`
5. Value: Your npm access token with publish permissions
