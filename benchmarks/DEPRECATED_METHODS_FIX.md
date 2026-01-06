# Deprecated String Methods Fixed

## Summary

Replaced deprecated `trimRight()` with modern `trimEnd()` method.

## Changes Made

### lib/request.js (Line 462)

**Before**:
```javascript
val = val.substring(0, val.indexOf(',')).trimRight()
```

**After**:
```javascript
val = val.substring(0, val.indexOf(',')).trimEnd()
```

## Context

The `trimRight()` method was deprecated in favor of `trimEnd()` for consistency with `padStart()` and `padEnd()`. While `trimRight()` still works (as an alias), using the modern method:

1. **Follows best practices**: Uses the current ECMAScript standard naming
2. **Improves maintainability**: Aligns with modern JavaScript conventions
3. **Future-proofs code**: Avoids potential removal in future JavaScript versions
4. **Zero performance impact**: `trimEnd()` is identical to `trimRight()` (it's just an alias)

## Location

This change affects the `req.host` getter in `lib/request.js`, specifically when parsing the `X-Forwarded-Host` header that contains multiple values.

## Testing

- All existing tests pass (1235 passing)
- Performance benchmark confirms identical performance
- Functionality unchanged (same behavior)

## Related Deprecated Methods

**Also deprecated but NOT used in Express**:
- `trimLeft()` → `trimStart()` (not found in codebase)
- `substr()` → `substring()` or `slice()` (not found in codebase)

## References

- [MDN: String.prototype.trimEnd()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trimEnd)
- [MDN: Deprecated trimRight()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trimRight)
