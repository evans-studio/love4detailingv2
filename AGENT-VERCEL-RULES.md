# MANDATORY: Vercel Testing Rules for AI Agent

## 🚫 FORBIDDEN Actions

1. **NEVER** test API changes locally
2. **NEVER** assume local behavior matches Vercel
3. **NEVER** use fs.readFile/writeFile in API routes
4. **NEVER** store files locally in API routes
5. **NEVER** use long-running processes

## ✅ REQUIRED Workflow

### For ANY Code Change:

1. **Before Starting**
   ```bash
   npm run verify:env
   ```

2. **After Making Changes**
   ```bash
   npm run build
   git add .
   git commit -m "fix: [specific description]"
   git push
   ```

3. **Wait for Deployment**
   - Watch GitHub for ✅
   - Check Vercel dashboard
   - Get preview URL

4. **Test on Vercel**
   - Use preview URL, not localhost
   - Test exact feature changed
   - Check function logs

5. **Verify Fix**
   ```bash
   npm run vercel:logs
   ```

## 🔍 Debugging on Vercel

### View Logs
```bash
# See recent logs
vercel logs

# See specific function logs
vercel logs --filter="api/bookings"

# Follow logs in real-time
vercel logs --follow
```

### Common Vercel Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "Module not found" | Missing dependency | Add to package.json |
| "Timeout" | Function too slow | Optimize or increase limit |
| "Cannot read property" | Missing env var | Add to Vercel dashboard |
| "ENOENT" | File system access | Use database/storage |

## 📝 Testing Template

For EVERY fix, document:

```markdown
## Fix: [Description]
- File: [path/to/file.ts]
- Change: [what was changed]
- Local test: ❌ (not valid)
- Vercel test: ✅ [preview-url.vercel.app]
- Verified in logs: ✅
- Mobile tested: ✅
```

## 🚀 Available Scripts

- `npm run verify:env` - Check environment variables
- `npm run test:checklist` - Generate test checklist
- `npm run deploy:monitor` - Monitor deployment
- `npm run pre-deploy` - Pre-deployment checks
- `npm run vercel:logs` - View Vercel logs
- `npm run vercel:env` - Pull production environment