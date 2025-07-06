# Vercel Testing Protocol - MANDATORY

## 🚨 CRITICAL RULE
**NEVER trust local testing for:**
- API routes
- Database operations  
- Authentication
- File operations
- Email sending
- Environment variables

## ✅ Testing Hierarchy

### Level 1: UI-Only Changes (Can test locally first)
- CSS/Tailwind changes
- Static text updates
- Component positioning
- Color changes

### Level 2: Interactive Features (Must test on Vercel)
- Button onClick handlers
- Form submissions
- Navigation/routing
- State management

### Level 3: Backend Operations (ONLY test on Vercel)
- API route changes
- Database queries
- Authentication flows
- Third-party integrations

## 🔄 Deployment Workflow

1. Make changes locally
2. Run build check: `npm run build`
3. Commit with descriptive message
4. Push to GitHub
5. Monitor Vercel deployment
6. Test on Vercel preview URL
7. Check Vercel function logs
8. Verify across devices