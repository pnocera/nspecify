# NPM Publish Checklist for nspecify

## Pre-Publish Checks

### 1. Code Quality
- [ ] All tests pass: `pnpm test`
- [ ] No linting errors: `pnpm lint`
- [ ] Code formatted: `pnpm format`
- [ ] Coverage meets threshold (95%+): `pnpm test:coverage`

### 2. Documentation
- [ ] README.md is up to date
- [ ] CHANGELOG.md includes latest version
- [ ] API documentation is current
- [ ] Examples work correctly

### 3. Package Configuration
- [ ] package.json version is correct (1.0.0)
- [ ] All package.json fields are filled:
  - [ ] name: nspecify
  - [ ] description
  - [ ] keywords
  - [ ] author
  - [ ] license: MIT
  - [ ] repository
  - [ ] bugs
  - [ ] homepage
  - [ ] files array
- [ ] .npmignore excludes unnecessary files
- [ ] LICENSE file exists

### 4. Dependencies
- [ ] No security vulnerabilities: `pnpm audit`
- [ ] Dependencies are production-ready
- [ ] Dev dependencies excluded from package

### 5. Local Testing
- [ ] `pnpm pack` creates valid package
- [ ] Package size is reasonable (< 10MB)
- [ ] Test package contents:
  ```bash
  pnpm pack
  tar -tf nspecify-1.0.0.tgz | less
  ```
- [ ] Test global installation:
  ```bash
  npm install -g ./nspecify-1.0.0.tgz
  nspecify --version
  nspecify check
  ```
- [ ] Test npx usage:
  ```bash
  npx ./nspecify-1.0.0.tgz init test-project
  ```

### 6. Git Status
- [ ] All changes committed
- [ ] Working directory clean
- [ ] On main branch
- [ ] Pushed to origin

## Publish Commands

### 1. Dry Run (Recommended First)
```bash
npm publish --dry-run
```

### 2. Publish to NPM
```bash
# Login if needed
npm login

# Publish
npm publish

# Or with pnpm
pnpm publish
```

### 3. Create Git Tag
```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

## Post-Publish Verification

### 1. NPM Registry
- [ ] Package visible on npmjs.com: https://www.npmjs.com/package/nspecify
- [ ] Version shows as 1.0.0
- [ ] README renders correctly
- [ ] All metadata displays properly

### 2. Installation Testing
- [ ] Test global install:
  ```bash
  npm install -g nspecify
  nspecify --version
  ```
- [ ] Test npx:
  ```bash
  npx nspecify init test-project
  ```
- [ ] Test in different shells (cmd, PowerShell, bash)

### 3. GitHub Release
- [ ] Create release on GitHub
- [ ] Attach release notes
- [ ] Link to npm package
- [ ] Announce in relevant channels

### 4. Documentation Updates
- [ ] Update any external documentation
- [ ] Update project website if applicable
- [ ] Send announcement to users

## Rollback Procedure (If Needed)

If issues are discovered after publishing:

### 1. Unpublish (within 72 hours)
```bash
npm unpublish nspecify@1.0.0
```

### 2. Or Deprecate
```bash
npm deprecate nspecify@1.0.0 "Critical bug discovered, please use 1.0.1"
```

### 3. Fix and Re-release
- Fix the issue
- Bump version to 1.0.1
- Run through checklist again
- Publish new version

## Common Issues and Solutions

### Issue: 402 Payment Required
**Solution**: Ensure npm account is properly configured and not using private registry

### Issue: 403 Forbidden
**Solution**: Check npm login status and permissions

### Issue: E404 Not Found
**Solution**: Package name might be taken or registry URL incorrect

### Issue: ENEEDAUTH
**Solution**: Run `npm login` and authenticate

## Notes

- First publication reserves the package name
- Can't republish same version after unpublish
- Consider using npm organizations for team packages
- Enable 2FA on npm account for security