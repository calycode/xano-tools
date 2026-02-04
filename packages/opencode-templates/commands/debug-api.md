---
description: Debug and troubleshoot API endpoint issues with systematic analysis
agent: debug-helper
---

# Debug API Endpoint

Help troubleshoot an API endpoint issue:

$ARGUMENTS

## Diagnostic Process

### Step 1: Gather Information

Please provide or I will look for:

- Endpoint URL and HTTP method
- Request headers and body
- Response received (status code, body)
- Expected vs actual behavior
- Recent changes to the endpoint

### Step 2: Common Checks

**Authentication Issues (401/403)**

- Is the auth token present and valid?
- Is the token expired?
- Does the user have required permissions?

**Validation Errors (400)**

- Are all required fields provided?
- Are field types correct?
- Are there format/pattern requirements?

**Not Found (404)**

- Does the endpoint exist?
- Is the URL correct?
- Are dynamic parameters valid?

**Server Errors (500)**

- Check Xano request history for error details
- Look for null/undefined variable access
- Check external API call failures
- Verify database query syntax

### Step 3: Xano-Specific Debugging

In Xano's dashboard:

1. Go to **Request History** to see the full request/response
2. Click the request to see **function stack execution**
3. Look for **red error indicators** in the stack
4. Use **Stop & Debug** to pause and inspect values

### Step 4: Resolution

Based on findings, I will:

- Identify the root cause
- Suggest specific fixes
- Recommend preventive measures
- Provide testing steps to verify the fix

## Additional Context

If you have access to:

- Xano request history screenshots
- Error messages
- Related code or configurations

Please share them for more accurate diagnosis.
