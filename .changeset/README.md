# Changesets

This directory contains changesets for the Bantai monorepo. Changesets are used to manage versioning and changelogs for all packages.

## Creating a Changeset

To create a new changeset, run:

```bash
pnpm changeset
```

This will prompt you to:
1. Select which packages have changed
2. Choose the type of change (major, minor, or patch)
3. Write a summary of the changes

## Versioning Packages

After creating changesets, you can version the packages:

```bash
pnpm version-packages
```

This will:
- Update package versions based on changesets
- Update changelogs
- Remove used changesets

## Setting Up npm Token

To publish packages to npm, you need to configure an npm authentication token.

### For Local Publishing

1. **Create an npm token:**
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Click "Generate New Token"
   - Choose "Automation" token type (for CI/CD) or "Publish" token type (for manual publishing)
   - Copy the token

2. **Configure npm authentication:**
   ```bash
   npm login
   ```
   Or set the token directly:
   ```bash
   npm config set //registry.npmjs.org/:_authToken YOUR_TOKEN_HERE
   ```

3. **Verify authentication:**
   ```bash
   npm whoami
   ```

### For CI/CD (GitHub Actions)

The repository includes an automated GitHub Actions workflow (`.github/workflows/changesets.yml`) that handles versioning and publishing.

1. **Add the npm token as a GitHub secret:**
   - Go to your repository settings
   - Navigate to "Secrets and variables" → "Actions"
   - Add a new secret named `NPM_TOKEN` with your npm token value
   - Use an "Automation" token type from npm

2. **How it works:**
   - When you push changesets to the `main` branch, the workflow automatically:
     - Checks for pending changesets
     - If changesets exist, creates a "Version Packages" PR with version bumps and changelog updates
     - When that PR is merged, it automatically builds and publishes packages to npm

3. **Workflow:**
   - Create your changes and add a changeset (`pnpm changeset`)
   - Commit and push the changeset to `main`
   - The workflow creates a version PR automatically
   - Review and merge the version PR
   - The workflow publishes to npm automatically after the PR is merged

## Releasing

To publish packages to npm:

```bash
pnpm release
```

This will build all packages and publish them to npm. Make sure you have configured your npm token (see above) before running this command.

## Automated Workflow (Recommended)

With GitHub Actions set up:

1. Make your changes
2. Run `pnpm changeset` to document the changes
3. Commit and push the changeset file to `main`
4. GitHub Actions automatically creates a "Version Packages" PR
5. Review and merge the version PR
6. GitHub Actions automatically publishes to npm after the PR is merged

## Manual Workflow

If you prefer to release manually:

1. Make your changes
2. Run `pnpm changeset` to document the changes
3. Commit the changeset file
4. When ready to release, run `pnpm version-packages`
5. Review the version changes and commit them
6. Run `pnpm release` to publish

