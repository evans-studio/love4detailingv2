# Morning Session Security Implementation Plan

**Session Duration**: 4 hours  
**Focus**: Critical Security Credential Cleanup  
**Date**: July 13, 2025  
**Priority**: 🚨 CRITICAL - Security vulnerability remediation  

---

## 🎯 **Session Overview**

This morning session focuses exclusively on **removing exposed credentials from the codebase** and **implementing proper secret management**. This is a critical security remediation that must be completed carefully to avoid breaking the application while ensuring complete credential security.

---

## 📋 **Pre-Session Preparation Checklist**

### **Before Starting** (15 minutes)
- [ ] Backup current working branch: `git checkout -b backup-before-security-cleanup`
- [ ] Ensure you have admin access to:
  - [ ] Supabase dashboard for Love4Detailing project
  - [ ] Resend dashboard with API key management
  - [ ] Vercel dashboard for deployment environment
  - [ ] GitHub repository with admin permissions
- [ ] Install BFG Repo-Cleaner: `brew install bfg` (macOS) or download from rtyley.github.io/bfg-repo-cleaner
- [ ] Document current system status for rollback reference

---

## 🗓️ **Task Breakdown by Time Block**

### **Block 1: Analysis & Preparation (30 minutes)**

#### **Task 1.1: Git History Analysis** (15 minutes)
```bash
# Analyze git history for credential exposure
git log --oneline --grep=".env"
git log --oneline --all --full-history -- .env.local
git show --name-only --pretty="" HEAD~10..HEAD | grep -i env
```

**Deliverables:**
- [ ] List of all commits containing .env.local
- [ ] Assessment of credential exposure scope
- [ ] Documentation of affected commit hashes

#### **Task 1.2: Current Credential Inventory** (15 minutes)
```bash
# Current exposed credentials to rotate:
NEXT_PUBLIC_SUPABASE_URL=https://lczzvvnspsuacshfawpe.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
RESEND_API_KEY=re_T7D5T2jH_3LMJMXbPhtVdqtR2n89kd2oo
```

**Actions:**
- [ ] Screenshot/document all current credentials for rotation tracking
- [ ] Identify all files containing hardcoded credentials
- [ ] Create rotation tracking spreadsheet

---

### **Block 2: Git History Cleanup (45 minutes)**

#### **Task 2.1: BFG Repo-Cleaner Setup** (15 minutes)
```bash
# Clone a fresh copy for cleanup
git clone --mirror https://github.com/your-org/love4detailing-v2.git love4detailing-cleanup.git
cd love4detailing-cleanup.git

# Verify BFG installation
bfg --version
```

**Safety Checks:**
- [ ] Verify backup branch exists
- [ ] Confirm fresh mirror clone created
- [ ] Test BFG tool accessibility

#### **Task 2.2: Credential Removal from History** (20 minutes)
```bash
# Remove .env.local from entire history
bfg --delete-files .env.local love4detailing-cleanup.git

# Alternative approach for sensitive file patterns
bfg --replace-text credentials.txt love4detailing-cleanup.git

# Clean up repository
cd love4detailing-cleanup.git
git reflog expire --expire=now --all && git gc --prune=now --aggressive
```

**Create credentials.txt file:**
```
SUPABASE_SERVICE_ROLE_KEY=***REMOVED***
RESEND_API_KEY=***REMOVED***
NEXT_PUBLIC_SUPABASE_URL=***REMOVED***
```

**Validation Steps:**
- [ ] Verify .env.local completely removed from history
- [ ] Check that no credentials remain in any commits
- [ ] Confirm repository integrity maintained

#### **Task 2.3: History Verification** (10 minutes)
```bash
# Verify cleanup success
git log --oneline --all --full-history -- .env.local
git log --grep="SUPABASE_SERVICE_ROLE_KEY" --all
git log --grep="RESEND_API_KEY" --all

# Should return no results if cleanup successful
```

---

### **Block 3: Credential Rotation (60 minutes)**

#### **Task 3.1: Supabase Credential Rotation** (20 minutes)

**Steps:**
1. **Access Supabase Dashboard**
   - [ ] Login to supabase.com
   - [ ] Navigate to Love4Detailing project
   - [ ] Go to Settings → API

2. **Generate New Service Role Key**
   - [ ] Click "Generate new key" for Service Role
   - [ ] Copy new service role key immediately
   - [ ] Store securely in password manager

3. **Document Old Key for Deactivation**
   - [ ] Mark old key as "COMPROMISED - TO BE DEACTIVATED"
   - [ ] Schedule deactivation after deployment verification

**New Credentials Format:**
```
SUPABASE_URL: https://lczzvvnspsuacshfawpe.supabase.co (unchanged)
SUPABASE_ANON_KEY: [existing anon key - not compromised]
SUPABASE_SERVICE_ROLE_KEY: [NEW GENERATED KEY]
```

#### **Task 3.2: Resend API Key Rotation** (15 minutes)

**Steps:**
1. **Access Resend Dashboard**
   - [ ] Login to resend.com
   - [ ] Navigate to API Keys section

2. **Generate New API Key**
   - [ ] Click "Create API Key"
   - [ ] Name: "Love4Detailing-Production-July2025"
   - [ ] Copy new API key immediately

3. **Deactivate Compromised Key**
   - [ ] Mark old key as compromised: `re_T7D5T2jH_3LMJMXbPhtVdqtR2n89kd2oo`
   - [ ] Schedule for deletion after deployment verification

#### **Task 3.3: Credential Security Documentation** (25 minutes)

**Create Secure Credential Storage:**
```bash
# Create local .env.local for development (NOT committed)
NEXT_PUBLIC_SUPABASE_URL=https://lczzvvnspsuacshfawpe.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[existing_anon_key]
SUPABASE_SERVICE_ROLE_KEY=[NEW_SERVICE_ROLE_KEY]
RESEND_API_KEY=[NEW_RESEND_API_KEY]
```

**Documentation Tasks:**
- [ ] Update password manager with new credentials
- [ ] Create credential rotation log
- [ ] Document rollback procedures if needed

---

### **Block 4: Vercel Environment Configuration (45 minutes)**

#### **Task 4.1: Production Environment Setup** (20 minutes)

**Access Vercel Dashboard:**
1. Login to vercel.com
2. Navigate to Love4Detailing project
3. Go to Settings → Environment Variables

**Configure Production Variables:**
```
Variable Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://lczzvvnspsuacshfawpe.supabase.co
Environment: Production

Variable Name: NEXT_PUBLIC_SUPABASE_ANON_KEY  
Value: [existing_anon_key]
Environment: Production

Variable Name: SUPABASE_SERVICE_ROLE_KEY
Value: [NEW_SERVICE_ROLE_KEY]
Environment: Production, Encrypted: Yes

Variable Name: RESEND_API_KEY
Value: [NEW_RESEND_API_KEY] 
Environment: Production, Encrypted: Yes
```

**Validation:**
- [ ] All variables marked as encrypted where applicable
- [ ] Production environment properly configured
- [ ] Variable names match application expectations

#### **Task 4.2: Preview/Development Environment Setup** (15 minutes)

**Configure Preview Variables:**
- [ ] Copy all production variables to Preview environment
- [ ] Consider using development-specific API keys if available
- [ ] Ensure environment separation maintained

#### **Task 4.3: Environment Variable Testing** (10 minutes)
```bash
# Test Vercel environment variable access
vercel env ls
vercel env pull .env.local.example
```

---

### **Block 5: Application Code Updates (60 minutes)**

#### **Task 5.1: API Routes Audit** (30 minutes)

**Files to Review:**
```bash
src/app/api/*/route.ts
src/lib/supabase/server.ts
src/lib/supabase/client.ts
src/lib/services/email.ts
```

**Search for Hardcoded Values:**
```bash
grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" src/
grep -r "re_T7D5T2jH_3LMJMXbPhtVdqtR2n89kd2oo" src/
grep -r "lczzvvnspsuacshfawpe" src/
```

**Update Pattern:**
```typescript
// Before (INSECURE):
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

// After (SECURE):
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured')
```

#### **Task 5.2: Configuration File Updates** (20 minutes)

**Update Supabase Clients:**
```typescript
// src/lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required Supabase environment variables')
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey)
```

**Update Email Service:**
```typescript
// src/lib/services/email.ts
const apiKey = process.env.RESEND_API_KEY
if (!apiKey) {
  throw new Error('RESEND_API_KEY environment variable is required')
}
const resend = new Resend(apiKey)
```

#### **Task 5.3: Environment Variable Validation** (10 minutes)

**Add Runtime Validation:**
```typescript
// src/lib/config/env.ts
export function validateEnvironment() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY',
    'RESEND_API_KEY'
  ]
  
  for (const envVar of required) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`)
    }
  }
}
```

---

### **Block 6: System Validation & Testing (30 minutes)**

#### **Task 6.1: Local Development Testing** (15 minutes)

**Test Sequence:**
```bash
# Start development server
npm run dev

# Test basic functionality:
# 1. Homepage loads correctly
# 2. Booking flow accessible
# 3. Admin login works
# 4. Database queries execute
```

**Validation Checklist:**
- [ ] Application starts without environment errors
- [ ] Database connection established
- [ ] Email service initializes correctly
- [ ] No credential-related console errors

#### **Task 6.2: Production Deployment Test** (15 minutes)

**Deployment Commands:**
```bash
# Force push cleaned history
git push --force-with-lease origin main

# Trigger Vercel deployment
git push origin main

# Monitor deployment logs
vercel logs
```

**Production Validation:**
- [ ] Deployment completes successfully
- [ ] No environment variable errors in logs
- [ ] Application accessible at production URL
- [ ] Basic functionality works in production

---

## 🔒 **Security Validation Checklist**

### **Git History Cleanup Verification**
- [ ] `.env.local` completely removed from all commits
- [ ] No credential strings found in git log search
- [ ] Repository history integrity maintained
- [ ] Force push completed successfully

### **Credential Rotation Verification**
- [ ] New Supabase service role key generated and documented
- [ ] New Resend API key generated and documented
- [ ] Old credentials marked for deactivation
- [ ] All new credentials stored securely

### **Environment Configuration Verification**
- [ ] Vercel production environment variables configured
- [ ] All sensitive variables marked as encrypted
- [ ] Preview/development environments configured
- [ ] Environment variable access tested

### **Application Security Verification**
- [ ] No hardcoded credentials in source code
- [ ] Proper environment variable validation implemented
- [ ] Runtime environment checks added
- [ ] Application starts without credential errors

### **Functional Verification**
- [ ] Complete booking flow works with new credentials
- [ ] Admin dashboard accessible and functional
- [ ] Email sending works with new Resend API key
- [ ] Database operations complete successfully

---

## 🚨 **Rollback Procedures**

### **If Issues Occur During Implementation:**

1. **Immediate Rollback:**
   ```bash
   git checkout backup-before-security-cleanup
   git push --force-with-lease origin main
   ```

2. **Vercel Environment Rollback:**
   - Restore old environment variables in Vercel dashboard
   - Trigger new deployment

3. **Credential Rollback:**
   - Temporarily re-enable old Supabase service key
   - Temporarily re-enable old Resend API key

### **Critical Success Criteria:**
- ✅ No credentials visible in git history
- ✅ Application fully functional with new credentials
- ✅ All environment variables properly configured
- ✅ Production deployment successful

---

## 📝 **Session Documentation Requirements**

### **During Implementation:**
- [ ] Document each step completion time
- [ ] Record any issues encountered and resolutions
- [ ] Save all new credential information securely
- [ ] Create troubleshooting notes for future reference

### **Post-Session Deliverables:**
- [ ] Security remediation completion report
- [ ] Updated credential management documentation
- [ ] Environment configuration guide
- [ ] Lessons learned and process improvements

---

## 🎯 **Success Metrics**

### **Primary Goals:**
1. **Complete credential exposure elimination** from git history
2. **Successful credential rotation** with zero downtime
3. **Proper environment variable configuration** in all environments
4. **Full application functionality** with new credentials

### **Quality Gates:**
- ✅ Git history scan shows zero credential references
- ✅ Production deployment completes without errors
- ✅ All core user journeys function correctly
- ✅ No security warnings or credential exposure detected

---

**Time Allocation Summary:**
- Analysis & Preparation: 30 minutes
- Git History Cleanup: 45 minutes  
- Credential Rotation: 60 minutes
- Vercel Configuration: 45 minutes
- Code Updates: 60 minutes
- Validation & Testing: 30 minutes
- **Total: 4 hours 30 minutes** (includes buffer for careful implementation)

*This plan prioritizes security remediation while maintaining application stability and functionality. Each task includes validation steps to ensure quality and completeness.*