# Multi-Agent Bug Fixes - October 11, 2025

## Problem Summary

Analysis of model reasoning revealed critical bugs in the multi-agent system where sub-agents were returning generic greetings or incomplete messages instead of actual data. The root cause was improper query parameter handling when coordinators delegated to sub-agents.

## Bugs Identified

### 🔴 Critical: Query Extraction Fallback to JSON.stringify
**Location:** `src/utils/agent-tools.ts:90`  
**Issue:** When coordinators called sub-agents without a `query` parameter, the system fell back to `JSON.stringify(args)`, creating malformed JSON strings as queries instead of natural language instructions.

**Impact:** 
- Sub-agents received queries like `"{}"` or `"{}"`
- Sub-agents couldn't understand the request
- Returned generic greetings: "Hello! How can I help?"
- Failed to execute their specialized tools

### 🔴 Critical: LLM Not Using 'query' Parameter
**Location:** Model behavior / System prompts  
**Issue:** The Chief Operations Agent and coordinators weren't consistently using the `query` parameter when delegating to sub-agents.

**Impact:**
- Tool calls made with empty or improperly structured arguments
- Triggered the JSON.stringify fallback
- Broke the multi-agent delegation chain

### 🟡 Medium: No Validation of Args Structure
**Location:** `src/utils/agent-tools.ts:90`  
**Issue:** No validation or warning when args were malformed or missing the `query` field.

**Impact:**
- Silent failures
- Difficult to debug multi-agent issues
- No visibility into why sub-agents were failing

### 🟡 Medium: Incomplete Tool Descriptions
**Location:** `examples/ecommerce-multi-agent.ts`  
**Issue:** Tool descriptions didn't show proper parameter usage format.

**Impact:**
- LLMs didn't know how to call tools correctly
- Missing parameter format examples
- Ambiguous delegation instructions

---

## Fixes Implemented

### 1. Enhanced Query Extraction Logic
**File:** `src/utils/agent-tools.ts`

**Changes:**
```typescript
// BEFORE:
const query = args.query || args.instruction || args.task || JSON.stringify(args);

// AFTER:
let query = args.query || args.instruction || args.task || args.message || args.request;

if (!query) {
  // If args is a simple object with one string property, use that
  const keys = Object.keys(args);
  if (keys.length === 1 && typeof args[keys[0]] === 'string') {
    query = args[keys[0]];
  } else if (keys.length > 0) {
    // Try to construct a meaningful query from the args
    const stringValues = keys
      .filter(k => typeof args[k] === 'string' && args[k].length > 0)
      .map(k => `${k}: ${args[k]}`);
    
    if (stringValues.length > 0) {
      query = stringValues.join(', ');
    } else {
      // Last resort: use JSON but log a warning
      query = JSON.stringify(args);
      console.warn(`[agentAsTool:${intent}] No query parameter provided. Args:`, args);
    }
  } else {
    query = 'No specific query provided';
    console.warn(`[agentAsTool:${intent}] Empty args object provided`);
  }
}
```

**Benefits:**
- Tries multiple common parameter names (`query`, `instruction`, `task`, `message`, `request`)
- Intelligently extracts text from various object structures
- Logs warnings when falling back to less optimal extraction methods
- Provides meaningful error messages

### 2. Added Debug Logging
**File:** `src/utils/agent-tools.ts`

**Changes:**
```typescript
// Log the delegation for debugging
if (process.env.DEBUG_AGENT_TOOLS === 'true') {
  console.log(`[agentAsTool:${intent}] Delegating to ${agent.getName()}`);
  console.log(`[agentAsTool:${intent}] Query: ${query.substring(0, 100)}...`);
  console.log(`[agentAsTool:${intent}] Args received:`, JSON.stringify(args, null, 2));
}
```

**Benefits:**
- Enables detailed debugging with `DEBUG_AGENT_TOOLS=true`
- Shows exactly what queries are being sent to sub-agents
- Reveals malformed arguments immediately
- No performance impact when disabled

### 3. Updated System Prompts
**File:** `examples/ecommerce-multi-agent.ts`

**Changes:**
Added explicit instructions to all coordinators:
```
IMPORTANT: When calling sub-agent tools, always use the 'query' parameter 
with a clear, natural language instruction.
Example: { "query": "Search for wireless mouse and keyboard products" }
```

**Updated Agents:**
- ✅ SalesCoordinator
- ✅ LogisticsCoordinator  
- ✅ CustomerServiceCoordinator
- ✅ ChiefOperationsAgent

**Benefits:**
- Explicitly instructs LLMs on proper parameter usage
- Provides concrete examples
- Reduces ambiguity in tool calling

### 4. Enhanced Tool Descriptions
**File:** `src/utils/agent-tools.ts` and `examples/ecommerce-multi-agent.ts`

**Changes:**
```typescript
// In agent-tools.ts - added to all generated tool descriptions:
const descriptionWithExample = `${defaultDescription}

IMPORTANT: Always provide a 'query' parameter with a clear natural language instruction.
Example: { "query": "Your specific task or question here" }`;

// In ecommerce-multi-agent.ts - added examples to every tool:
description: 'Delegate product catalog queries. Use { "query": "search for wireless mouse" }'
```

**Benefits:**
- Shows proper parameter format inline
- LLMs see examples every time they consider using a tool
- Reduces incorrect tool calls

---

## Testing

### Test Script Created
**File:** `test-ecommerce-fix.ts`

A comprehensive test script that:
- ✅ Tests the exact scenario from the bug report
- ✅ Enables debug logging
- ✅ Verifies proper query parameter usage
- ✅ Checks that sub-agents return real data (not greetings)
- ✅ Validates tool call structure
- ✅ Reports detailed execution metrics

### Running Tests

```bash
# Enable debug logging
export DEBUG_AGENT_TOOLS=true

# Run the test
bun run test-ecommerce-fix.ts

# Or run the full example
bun run examples/ecommerce-multi-agent.ts
```

---

## Verification Checklist

- [x] Query extraction no longer falls back to JSON.stringify unnecessarily
- [x] Multiple parameter names are tried before fallback
- [x] Warnings are logged when malformed args are detected
- [x] Debug logging available for troubleshooting
- [x] All coordinator prompts updated with explicit instructions
- [x] All tool descriptions include parameter examples
- [x] TypeScript compilation succeeds
- [x] Test script created for regression testing

---

## Expected Behavior After Fix

### Before Fix:
```
User: "Check stock for wireless mouse"

ChiefOps → calls → SalesCoordinator with args: {}
SalesCoordinator receives query: "{}"
SalesCoordinator: "Hello! How can I help you?" ❌
```

### After Fix:
```
User: "Check stock for wireless mouse"

ChiefOps → calls → SalesCoordinator with args: { "query": "Check stock for wireless mouse" }
SalesCoordinator receives query: "Check stock for wireless mouse"
SalesCoordinator → ProductCatalog → check_stock("wireless mouse")
SalesCoordinator: "Wireless mouse is in stock: 150 units available" ✅
```

---

## Recommendations for Future Development

1. **Add Schema Validation**: Validate tool call arguments against the parameter schema before execution
2. **Structured Logging**: Implement proper logging framework instead of console.log
3. **Metrics Collection**: Track successful vs failed sub-agent delegations
4. **Parameter Flexibility**: Consider making the parameter name configurable per tool
5. **Auto-fix Common Issues**: Automatically transform common malformed args patterns
6. **Better Error Messages**: Return structured errors that help LLMs understand what went wrong
7. **Integration Tests**: Add automated tests for multi-agent scenarios
8. **Documentation**: Update multi-agent guides with best practices and common pitfalls

---

## Related Files Modified

- ✅ `src/utils/agent-tools.ts` - Core bug fixes
- ✅ `examples/ecommerce-multi-agent.ts` - Updated prompts and descriptions
- ✅ `test-ecommerce-fix.ts` - New test script (created)
- ✅ `BUG_FIXES.md` - This document (created)

---

## Impact Assessment

**Risk Level:** Low  
**Breaking Changes:** None  
**Backward Compatibility:** Maintained - all changes are additive

The fixes improve robustness without changing the API or breaking existing code. All changes are defensive and gracefully handle both old and new calling patterns.
