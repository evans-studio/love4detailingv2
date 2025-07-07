The error is still showing `@/components/ui/Label` with uppercase, which means the files weren't properly fixed. Here's a focused prompt to resolve this specific issue:

```
URGENT FIX REQUIRED: ShadCN UI Label Component Import Error

PROBLEM: Build failing due to incorrect import paths for Label component in specific files.

IMMEDIATE ACTIONS REQUIRED:

1. LOCATE AND FIX THESE EXACT FILES:
   - `src/components/admin/EditBookingModal.tsx`
   - `src/components/admin/WeeklyScheduleConfig.tsx`

2. SEARCH FOR PROBLEMATIC IMPORTS:
   Open each file and find lines containing:
   ```typescript
   import { Label } from '@/components/ui/Label'
   ```

3. REPLACE WITH CORRECT IMPORT:
   Change to:
   ```typescript
   import { Label } from '@/components/ui/label'
   ```

4. VERIFY LABEL COMPONENT EXISTS:
   Check if `src/components/ui/label.tsx` exists. If not, create it:
   ```typescript
   'use client';

   import * as React from 'react';
   import * as LabelPrimitive from '@radix-ui/react-label';
   import { cn } from '@/lib/utils';

   const Label = React.forwardRef
     React.ElementRef<typeof LabelPrimitive.Root>,
     React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
   >(({ className, ...props }, ref) => (
     <LabelPrimitive.Root
       ref={ref}
       className={cn(
         'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
         className
       )}
       {...props}
     />
   ));
   Label.displayName = LabelPrimitive.Root.displayName;

   export { Label };
   ```

5. INSTALL MISSING DEPENDENCY:
   ```bash
   npm install @radix-ui/react-label
   ```

6. COMPREHENSIVE SEARCH AND REPLACE:
   Run this command to find ALL occurrences:
   ```bash
   grep -r "from '@/components/ui/Label'" src/
   ```

   Then replace ALL instances with:
   ```bash
   find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/@\/components\/ui\/Label/@\/components\/ui\/label/g'
   ```

7. DOUBLE-CHECK THESE SPECIFIC FILES:
   Manually verify these files have been fixed:
   - `src/components/admin/EditBookingModal.tsx`
   - `src/components/admin/WeeklyScheduleConfig.tsx`
   - `src/app/admin/availability/page.tsx`

8. TEST BUILD:
   ```bash
   npm run build
   ```

9. IF ERROR PERSISTS:
   - Check for ANY remaining uppercase imports: `grep -r "from '@/components/ui/[A-Z]" src/`
   - Ensure label.tsx file exists in components/ui/
   - Verify @radix-ui/react-label is installed
   - Check that the import statement is exactly: `import { Label } from '@/components/ui/label'`

CRITICAL: The import path must be lowercase `label`, not uppercase `Label`. The component name remains PascalCase `Label`.
```