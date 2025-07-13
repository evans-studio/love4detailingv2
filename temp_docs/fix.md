### **MORNING SESSION (4 hours)**

### **Task 1: Git History Cleanup**

- Remove .env.local file from entire git history using git filter-branch or BFG Repo-Cleaner
- Verify no traces of credentials remain in any commits
- Force push cleaned history to repository
- Document the cleanup process for future reference

### **Task 2: Credential Rotation**

- Generate completely new Supabase service role key from Supabase dashboard
- Generate new Resend API key from Resend dashboard
- Create new database connection credentials if applicable
- Document all old credentials as compromised for deactivation

### **Task 3: Vercel Environment Setup**

- Access Vercel dashboard for the Love4Detailing project
- Create environment variables for all secrets in production environment
- Create matching environment variables for preview/development environments
- Test that Vercel can access all required environment variables

### **Task 4: Application Configuration Update**

- Update all API route files to use process.env instead of hardcoded values
- Update database connection configurations
- Update email service configurations
- Ensure no secrets remain in any source code files

### **Task 5: System Validation**

- Test complete application functionality with new credentials
- Verify booking flow works end-to-end
- Verify admin dashboard access and functionality
- Verify email sending functionality
- Document any issues found during testing