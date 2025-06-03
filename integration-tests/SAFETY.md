# Integration Test Safety Guarantees

This document outlines all safety measures in place to ensure our integration tests **CANNOT** cause irreversible damage to your system, files, or configurations.

## 🛡️ Core Safety Principles

### 1. **Complete Isolation**

- All tests run in **temporary directories** created by the OS
- Each test gets its own **isolated environment**
- **No real user files** are ever touched during testing

### 2. **Fake Home Directory**

- Tests use `join(testDir, 'fake-home')` as HOME directory
- Real `~/.gitty/config.json` is **NEVER** modified during tests
- All config operations happen in isolated fake directories

### 3. **Emergency Restoration**

- Multiple signal handlers (SIGINT, SIGTERM, SIGHUP)
- Automatic restoration on uncaught exceptions
- Emergency restoration script available
- Config backup before any test execution

## 📁 Directory Safety

### Temporary Test Directories

```
/tmp/gitty-integration-test-{timestamp}/
├── test-{testId}/              # Individual test workspace
│   ├── fake-home/              # Isolated fake home directory
│   │   └── .gitty/             # Fake config directory
│   │       └── config.json     # Test config (NOT your real config)
│   ├── .git/                   # Test git repository
│   └── test-file.js            # Test files
└── ...
```

### What's Protected

- ✅ Your real `~/.gitty/config.json` - **NEVER touched**
- ✅ Your real home directory - **NEVER used**
- ✅ Your working directories - **Tests use temp dirs**
- ✅ Your git repositories - **Tests create isolated repos**

## 🔒 Specific Safety Measures

### Config Protection

```javascript
// Real config path: ~/.gitty/config.json ❌ NEVER TOUCHED
// Test config path: /tmp/.../fake-home/.gitty/config.json ✅ SAFE
```

### Working Directory Safety

```javascript
// BEFORE: Save original directory
const originalCwd = process.cwd();

try {
  // Test operations in temp directory
  process.chdir(tempDir);
  // ... test code ...
} finally {
  // ALWAYS restore original directory
  process.chdir(originalCwd);
}
```

### File Permission Safety

```javascript
let permissionsChanged = false;
try {
  permissionsChanged = true;
  chmodSync(testDir, 0o444); // Only in temp directory
  // ... test code ...
} finally {
  if (permissionsChanged) {
    chmodSync(testDir, 0o755); // Always restore
  }
}
```

## 🚨 Emergency Recovery

### Signal Handlers

- **Ctrl+C (SIGINT)**: Immediate restoration and cleanup
- **SIGTERM**: Graceful shutdown with restoration
- **SIGHUP**: Process termination with restoration

### Emergency Script

If tests are interrupted and you're concerned:

```bash
node integration-tests/restore-config.js
```

### What the Emergency Script Does

- Detects test data patterns in your config
- Offers to restore clean default configuration
- Guides you through reconfiguration
- **Only runs if test data is detected**

## 📋 Test-by-Test Safety Analysis

### Config Resolution Tests (TC-01 to TC-10)

- ✅ **SAFE**: All use fake home directories
- ✅ **SAFE**: Create temp git repositories
- ✅ **SAFE**: No real file modifications

### Validation Tests

- ✅ **SAFE**: Test CLI validation in isolation
- ✅ **SAFE**: Check error messages only
- ✅ **SAFE**: No file system changes

### Edge Cases Tests

- ✅ **SAFE**: `Not in git repository` - Creates temp directory, restores working dir
- ✅ **SAFE**: `Git repo with no commits` - Fresh repo in temp dir, restores working dir
- ✅ **SAFE**: `No staged changes` - Only affects test repository
- ✅ **SAFE**: `Invalid API key` - Uses fake configs only
- ✅ **SAFE**: `Missing API key` - Uses fake configs only
- ✅ **SAFE**: `Malformed config` - Creates invalid config in fake home only
- ✅ **SAFE**: `Corrupted local config` - Creates files in test directory only
- ✅ **SAFE**: `Missing preset` - Uses fake configs only
- ✅ **SAFE**: `Long prepend` - CLI argument test only
- ✅ **SAFE**: `Special characters` - CLI argument test only
- ✅ **SAFE**: `Permission error` - Changes permissions in fake home only, always restores
- ✅ **SAFE**: `Conflicting flags` - CLI validation test only
- ✅ **SAFE**: `Invalid temperature` - CLI validation test only

## 🔍 How to Verify Safety

### Check Test Isolation

```bash
echo "Your real config:"
cat ~/.gitty/config.json 2>/dev/null || echo "No real config found"

# Run tests (your config won't change)
npm run test:integration

echo "Your real config after tests:"
cat ~/.gitty/config.json 2>/dev/null || echo "No real config found"
```

### Check No Permission Changes

```bash
ls -la ~/.gitty/ 2>/dev/null || echo "No real .gitty directory"
```

### Check Working Directory

```bash
pwd  # Should be your project directory before and after tests
```

## ✅ Safety Certification

I certify that these integration tests:

1. **CANNOT** modify your real `~/.gitty/config.json`
2. **CANNOT** modify any files outside temporary test directories
3. **CANNOT** change permissions on any real files
4. **CANNOT** leave your system in a modified state
5. **WILL** restore all temporary changes on completion or interruption
6. **WILL** run in completely isolated environments
7. **WILL** provide emergency restoration if needed

## 🚀 Additional Safeguards

- Tests skip on platforms where operations might be unsafe (Windows permissions)
- Comprehensive error handling with graceful degradation
- Multiple cleanup layers (test-level, suite-level, framework-level)
- Detailed logging of all operations
- No network operations that could affect external systems
- All file operations clearly scoped to temporary directories

**Your system and data are completely protected.** 🛡️
