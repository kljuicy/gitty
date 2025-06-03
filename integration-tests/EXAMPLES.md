# Integration Test Examples

This document demonstrates the enhanced output validation capabilities of our Gitty integration test framework.

## Console Output Validation

Instead of just checking if commands succeed or fail, our tests now validate the **actual console output** to ensure Gitty behaves exactly as expected.

### Example 1: Prepend Validation

**Before (basic validation):**

```javascript
const result = await context.executeGitty(['--preview']);
context.assert.isTrue(result.success, 'Command should succeed');
```

**After (output validation):**

```javascript
const result = await context.executeGitty(['--preview']);
context.assert.commandSucceeded(result, 'Command should succeed');
context.assert.outputContains(
  result,
  'GLOBAL-',
  'Output should contain global default prepend'
);
```

### Example 2: Force Mode Validation

**Validates that force mode completely replaces rather than appends:**

```javascript
const result = await context.executeGitty([
  '-P',
  'work',
  '-p',
  'HOTFIX-',
  '-f',
  '--preview',
]);

// Positive assertion: should contain the force prepend
context.assert.outputContains(
  result,
  'HOTFIX-',
  'Output should contain force prepend HOTFIX- replacing preset'
);

// Negative assertion: should NOT contain the preset prepend
context.assert.outputNotContains(
  result,
  'PROJ-HOTFIX-',
  'Force mode should not append to preset prepend'
);
```

### Example 3: Error Message Validation

**Validates specific error messages and suggestions:**

```javascript
const result = await context.executeGitty(['--provider', 'invalid']);

context.assert.commandFailed(result, 'Should reject invalid provider');
context.assert.outputContains(
  result,
  'invalid',
  'Should mention the invalid provider in error message'
);
context.assert.containsOneOf(
  result.stderr + result.stdout,
  ['openai', 'gemini', 'valid'],
  'Should suggest valid provider options'
);
```

## New Assertion Methods

### Basic Assertions

- `commandSucceeded(result, message)` - Checks exit code and success flag
- `commandFailed(result, message)` - Ensures command failed as expected
- `outputContains(result, substring, message)` - Checks stdout + stderr
- `outputNotContains(result, substring, message)` - Ensures text not present

### Advanced Assertions

- `matchesRegex(text, regex, message)` - Pattern matching
- `containsOneOf(text, substrings, message)` - Check for any of multiple options

### Example: Version Check

```javascript
const result = await context.executeGitty(['--version']);
context.assert.commandSucceeded(result, 'Version should work');
context.assert.matchesRegex(
  result.stdout,
  /\d+\.\d+\.\d+/,
  'Should show semantic version number'
);
```

## Real Behavior Validation

Our tests now verify:

1. **Exact prepend combinations** (PROJ-123, WORK-OVERRIDE, etc.)
2. **Force mode behavior** (replaces vs appends)
3. **Error message content** and helpful suggestions
4. **Help text formatting** and branding
5. **Config hierarchy precedence** in actual output

This ensures our tests catch real user-facing issues, not just technical failures.

## Benefits

✅ **User-centric**: Tests what users actually see  
✅ **Specific**: Validates exact behavior, not just success/failure  
✅ **Comprehensive**: Checks positive and negative cases  
✅ **Maintainable**: Clear, descriptive assertion messages  
✅ **Debugging-friendly**: Shows actual vs expected output on failure
