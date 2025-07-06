# Love4Detailing Complete Feature Inventory
_Last Updated: 7/6/2025, 7:13:31 PM_  
_Total Features: 240_

## 📊 Feature Summary
- **Buttons**: 13
- **Links**: 40  
- **Forms**: 25
- **API Endpoints**: 28
- **Other Interactions**: 134

## 🔍 How to Use This Inventory
1. Each feature has a unique ID (e.g., BTN-001)
2. Test each feature systematically
3. Mark as ✅ (working) or ❌ (broken)
4. Use the location to quickly find and fix issues

## 🔲 Button Features (13)


### BTN-001: Add Vehicle Button
- **Location**: `src/components/dashboard/QuickBook.tsx:169`
- **Description**: Button that navigates  
- **Expected**: Navigate to target page
- **Code**: `<Button onClick={() => router.push(ROUTES.DASHBOARD_VEHICLES)}>`
- **Status**: [ ] Test Required


### BTN-002: Back Button
- **Location**: `src/components/booking/PersonalDetailsStep.tsx:221`
- **Description**: Button that performs action  
- **Expected**: Execute click handler
- **Code**: `<Button type="button" variant="outline" onClick={handleBack}>`
- **Status**: [ ] Test Required


### BTN-003: Back Button
- **Location**: `src/components/booking/DateTimeStep.tsx:160`
- **Description**: Button that performs action  
- **Expected**: Execute click handler
- **Code**: `<Button onClick={handleBack} variant="outline">`
- **Status**: [ ] Test Required


### BTN-004: <X className="h-4 w-4 mr-2" /> Button
- **Location**: `src/components/admin/EditBookingModal.tsx:494`
- **Description**: Button that performs action  
- **Expected**: Execute click handler
- **Code**: `<Button type="button" variant="outline" onClick={onClose}>`
- **Status**: [ ] Test Required


### BTN-005: Add Vehicle Button
- **Location**: `src/app/dashboard/vehicles/page.tsx:42`
- **Description**: Button that performs action  
- **Expected**: Execute click handler
- **Code**: `<Button onClick={handleAddVehicle}>`
- **Status**: [ ] Test Required


### BTN-006: {saving ? ( Button
- **Location**: `src/app/admin/settings/page.tsx:580`
- **Description**: Button that performs action  
- **Expected**: Execute click handler
- **Code**: `<Button onClick={saveBusinessSettings} disabled={saving}>`
- **Status**: [ ] Test Required


### BTN-007: {saving ? ( Button
- **Location**: `src/app/admin/settings/page.tsx:689`
- **Description**: Button that performs action  
- **Expected**: Execute click handler
- **Code**: `<Button onClick={saveSystemSettings} disabled={saving}>`
- **Status**: [ ] Test Required


### BTN-008: <Plus className="h-4 w-4 mr-2" /> Button
- **Location**: `src/app/admin/pricing/page.tsx:338`
- **Description**: Button that performs action  
- **Expected**: Execute click handler
- **Code**: `<Button onClick={() => setShowAddonForm(true)}>`
- **Status**: [ ] Test Required


### BTN-009: Cancel Button
- **Location**: `src/app/admin/pricing/page.tsx:424`
- **Description**: Button that performs action  
- **Expected**: Execute click handler
- **Code**: `<Button type="button" variant="outline" onClick={cancelAddonForm}>`
- **Status**: [ ] Test Required


### BTN-010: <RefreshCw className="h-4 w-4 mr-2" /> Button
- **Location**: `src/app/admin/policies/page.tsx:380`
- **Description**: Button that performs action  
- **Expected**: Execute click handler
- **Code**: `<Button type="button" variant="outline" onClick={resetToDefaults}>`
- **Status**: [ ] Test Required


### BTN-011: <Shield className="h-4 w-4 mr-2" /> Button
- **Location**: `src/app/admin/policies/page.tsx:384`
- **Description**: Button that performs action  
- **Expected**: Execute click handler
- **Code**: `<Button type="button" variant="outline" onClick={previewPolicy}>`
- **Status**: [ ] Test Required


### BTN-012: Refresh Button
- **Location**: `src/app/admin/customers/page.tsx:234`
- **Description**: Button that performs action  
- **Expected**: Execute click handler
- **Code**: `<Button variant="outline" onClick={fetchCustomers}>`
- **Status**: [ ] Test Required


### BTN-013: <Filter className="h-4 w-4 mr-2" /> Button
- **Location**: `src/app/admin/bookings/page.tsx:428`
- **Description**: Button that performs action  
- **Expected**: Execute click handler
- **Code**: `<Button variant="outline" onClick={clearFilters} className="w-full">`
- **Status**: [ ] Test Required



## 🔗 Link Features (40)


### LNK-001: <span className="text-xl font-bold text-[#F2F2F2]">Love4Detailing</span> Link
- **Location**: `src/components/layout/Header.tsx:10`
- **Description**: Link to /
- **Expected**: Navigate to /
- **Code**: `<Link href="/" className="flex items-center space-x-2">`
- **Status**: [ ] Test Required


### LNK-002: <Button variant="ghost">View Pricing</Button> Link
- **Location**: `src/components/layout/Header.tsx:15`
- **Description**: Link to /#pricing
- **Expected**: Navigate to /#pricing
- **Code**: `<Link href="/#pricing">`
- **Status**: [ ] Test Required


### LNK-003: <Button>Book Detail</Button> Link
- **Location**: `src/components/layout/Header.tsx:18`
- **Description**: Link to /book
- **Expected**: Navigate to /book
- **Code**: `<Link href="/book">`
- **Status**: [ ] Test Required


### LNK-004: <Button variant="outline">Dashboard</Button> Link
- **Location**: `src/components/layout/Header.tsx:21`
- **Description**: Link to /dashboard
- **Expected**: Navigate to /dashboard
- **Code**: `<Link href="/dashboard">`
- **Status**: [ ] Test Required


### LNK-005: <Button>Book Service</Button> Link
- **Location**: `src/components/layout/Footer.tsx:17`
- **Description**: Link to unknown
- **Expected**: Navigate to unknown
- **Code**: `<Link href={ROUTES.BOOK}>`
- **Status**: [ ] Test Required


### LNK-006: Book Service Link
- **Location**: `src/components/layout/Footer.tsx:28`
- **Description**: Link to unknown
- **Expected**: Navigate to unknown
- **Code**: `<Link href={ROUTES.BOOK} className="text-sm text-[#C7C7C7] hover:text-[#9146FF]">`
- **Status**: [ ] Test Required


### LNK-007: Customer Dashboard Link
- **Location**: `src/components/layout/Footer.tsx:33`
- **Description**: Link to unknown
- **Expected**: Navigate to unknown
- **Code**: `<Link href={ROUTES.DASHBOARD} className="text-sm text-[#C7C7C7] hover:text-[#9146FF]">`
- **Status**: [ ] Test Required


### LNK-008: Sign In Link
- **Location**: `src/components/layout/Footer.tsx:38`
- **Description**: Link to unknown
- **Expected**: Navigate to unknown
- **Code**: `<Link href={ROUTES.SIGN_IN} className="text-sm text-[#C7C7C7] hover:text-[#9146FF]">`
- **Status**: [ ] Test Required


### LNK-009: My Account Link
- **Location**: `src/components/layout/Footer.tsx:72`
- **Description**: Link to unknown
- **Expected**: Navigate to unknown
- **Code**: `<Link href={ROUTES.DASHBOARD_PROFILE} className="text-sm text-[#C7C7C7] hover:text-[#9146FF]">`
- **Status**: [ ] Test Required


### LNK-010: My Bookings Link
- **Location**: `src/components/layout/Footer.tsx:77`
- **Description**: Link to unknown
- **Expected**: Navigate to unknown
- **Code**: `<Link href={ROUTES.DASHBOARD_BOOKINGS} className="text-sm text-[#C7C7C7] hover:text-[#9146FF]">`
- **Status**: [ ] Test Required


### LNK-011: Loyalty Points Link
- **Location**: `src/components/layout/Footer.tsx:82`
- **Description**: Link to unknown
- **Expected**: Navigate to unknown
- **Code**: `<Link href={ROUTES.DASHBOARD_REWARDS} className="text-sm text-[#C7C7C7] hover:text-[#9146FF]">`
- **Status**: [ ] Test Required


### LNK-012: <Button variant="default" className="w-full"> Link
- **Location**: `src/components/booking/ConfirmationDetails.tsx:109`
- **Description**: Link to unknown
- **Expected**: Navigate to unknown
- **Code**: `<Link href={setupLink}>`
- **Status**: [ ] Test Required


### LNK-013: <Button variant="outline" size="sm" className="w-full"> Link
- **Location**: `src/components/booking/ConfirmationDetails.tsx:135`
- **Description**: Link to unknown
- **Expected**: Navigate to unknown
- **Code**: `<Link href={fallbackInfo.signInUrl}>`
- **Status**: [ ] Test Required


### LNK-014: <Button variant="default" className="w-full"> Link
- **Location**: `src/components/booking/ConfirmationDetails.tsx:154`
- **Description**: Link to unknown
- **Expected**: Navigate to unknown
- **Code**: `<Link href={`/auth/sign-in?redirect=/dashboard/bookings/${booking.id}`}>`
- **Status**: [ ] Test Required


### LNK-015: <Button variant="outline"> Link
- **Location**: `src/components/booking/ConfirmationDetails.tsx:230`
- **Description**: Link to /
- **Expected**: Navigate to /
- **Code**: `<Link href="/">`
- **Status**: [ ] Test Required


### LNK-016: View Details Link
- **Location**: `src/app/dashboard/page.tsx:112`
- **Description**: Link to unknown
- **Expected**: Navigate to unknown
- **Code**: `<Link href={`/dashboard/bookings/${booking.id}`} className="text-[#9146FF] hover:text-[#9146FF]/80">`
- **Status**: [ ] Test Required


### LNK-017: View All History Link
- **Location**: `src/app/dashboard/page.tsx:122`
- **Description**: Link to /dashboard/bookings
- **Expected**: Navigate to /dashboard/bookings
- **Code**: `<Link href="/dashboard/bookings" className="text-[#9146FF] hover:text-[#9146FF]/80">View All History</Link>`
- **Status**: [ ] Test Required


### LNK-018: <Button variant="outline" className="w-full justify-start"> Link
- **Location**: `src/app/admin/page.tsx:212`
- **Description**: Link to /admin/bookings/create
- **Expected**: Navigate to /admin/bookings/create
- **Code**: `<Link href="/admin/bookings/create" className="block">`
- **Status**: [ ] Test Required


### LNK-019: <Button variant="outline" className="w-full justify-start"> Link
- **Location**: `src/app/admin/page.tsx:218`
- **Description**: Link to /admin/pricing
- **Expected**: Navigate to /admin/pricing
- **Code**: `<Link href="/admin/pricing" className="block">`
- **Status**: [ ] Test Required


### LNK-020: <Button variant="outline" className="w-full justify-start"> Link
- **Location**: `src/app/admin/page.tsx:224`
- **Description**: Link to /admin/bookings
- **Expected**: Navigate to /admin/bookings
- **Code**: `<Link href="/admin/bookings" className="block">`
- **Status**: [ ] Test Required


### LNK-021: <Button variant="outline" className="w-full justify-start"> Link
- **Location**: `src/app/admin/page.tsx:230`
- **Description**: Link to /admin/availability
- **Expected**: Navigate to /admin/availability
- **Code**: `<Link href="/admin/availability" className="block">`
- **Status**: [ ] Test Required


### LNK-022: <Button variant="ghost" size="sm">View All</Button> Link
- **Location**: `src/app/admin/page.tsx:243`
- **Description**: Link to /admin/bookings
- **Expected**: Navigate to /admin/bookings
- **Code**: `<Link href="/admin/bookings">`
- **Status**: [ ] Test Required


### LNK-023: <Button variant="ghost" size="sm">View</Button> Link
- **Location**: `src/app/admin/page.tsx:276`
- **Description**: Link to unknown
- **Expected**: Navigate to unknown
- **Code**: `<Link href={`/admin/bookings/${booking.id}`}>`
- **Status**: [ ] Test Required


### LNK-024: <Plus className="h-4 w-4" /> Link
- **Location**: `src/app/dashboard/bookings/page.tsx:110`
- **Description**: Link to /book
- **Expected**: Navigate to /book
- **Code**: `<Link href="/book" className="flex items-center gap-2">`
- **Status**: [ ] Test Required


### LNK-025: Book Your First Service Link
- **Location**: `src/app/dashboard/bookings/page.tsx:134`
- **Description**: Link to /book
- **Expected**: Navigate to /book
- **Code**: `<Link href="/book">Book Your First Service</Link>`
- **Status**: [ ] Test Required


### LNK-026: <Eye className="h-4 w-4" /> Link
- **Location**: `src/app/dashboard/bookings/page.tsx:206`
- **Description**: Link to unknown
- **Expected**: Navigate to unknown
- **Code**: `<Link href={`/dashboard/bookings/${booking.id}`} className="flex items-center gap-2">`
- **Status**: [ ] Test Required


### LNK-027: Edit Link
- **Location**: `src/app/dashboard/profile/page.tsx:59`
- **Description**: Link to unknown
- **Expected**: Navigate to unknown
- **Code**: `<Link href={`/dashboard/profile/vehicles/${vehicle.id}`}>`
- **Status**: [ ] Test Required


### LNK-028: Edit Link
- **Location**: `src/app/dashboard/profile/page.tsx:106`
- **Description**: Link to /dashboard/profile/edit
- **Expected**: Navigate to /dashboard/profile/edit
- **Code**: `<Link href="/dashboard/profile/edit">`
- **Status**: [ ] Test Required


### LNK-029: Change Password Link
- **Location**: `src/app/dashboard/profile/page.tsx:144`
- **Description**: Link to /dashboard/profile/change-password
- **Expected**: Navigate to /dashboard/profile/change-password
- **Code**: `<Link href="/dashboard/profile/change-password">`
- **Status**: [ ] Test Required


### LNK-030: Two-Factor Authentication Link
- **Location**: `src/app/dashboard/profile/page.tsx:153`
- **Description**: Link to /dashboard/profile/two-factor
- **Expected**: Navigate to /dashboard/profile/two-factor
- **Code**: `<Link href="/dashboard/profile/two-factor">`
- **Status**: [ ] Test Required


### LNK-031: Manage Notification Preferences Link
- **Location**: `src/app/dashboard/profile/page.tsx:174`
- **Description**: Link to /dashboard/profile/notifications
- **Expected**: Navigate to /dashboard/profile/notifications
- **Code**: `<Link href="/dashboard/profile/notifications">`
- **Status**: [ ] Test Required


### LNK-032: <PlusIcon className="w-4 h-4 mr-2" /> Link
- **Location**: `src/app/dashboard/profile/page.tsx:189`
- **Description**: Link to /dashboard/profile/vehicles/new
- **Expected**: Navigate to /dashboard/profile/vehicles/new
- **Code**: `<Link href="/dashboard/profile/vehicles/new">`
- **Status**: [ ] Test Required


### LNK-033: Add Your First Vehicle Link
- **Location**: `src/app/dashboard/profile/page.tsx:205`
- **Description**: Link to /dashboard/profile/vehicles/new
- **Expected**: Navigate to /dashboard/profile/vehicles/new
- **Code**: `<Link href="/dashboard/profile/vehicles/new">`
- **Status**: [ ] Test Required


### LNK-034: <Button variant="outline" className="w-full"> Link
- **Location**: `src/app/auth/verify-email/page.tsx:27`
- **Description**: Link to /auth/sign-in
- **Expected**: Navigate to /auth/sign-in
- **Code**: `<Link href="/auth/sign-in">`
- **Status**: [ ] Test Required


### LNK-035: Sign in here Link
- **Location**: `src/app/auth/signup/page.tsx:206`
- **Description**: Link to /auth/login
- **Expected**: Navigate to /auth/login
- **Code**: `<Link href="/auth/login" className="text-[#9146FF] hover:underline">`
- **Status**: [ ] Test Required


### LNK-036: Sign up here Link
- **Location**: `src/app/auth/login/page.tsx:182`
- **Description**: Link to /auth/signup
- **Expected**: Navigate to /auth/signup
- **Code**: `<Link href="/auth/signup" className="text-[#9146FF] hover:underline">`
- **Status**: [ ] Test Required


### LNK-037: <Button variant="outline" className="w-full"> Link
- **Location**: `src/app/admin/customers/page.tsx:405`
- **Description**: Link to unknown
- **Expected**: Navigate to unknown
- **Code**: `<Link href={`/admin/bookings?customer=${selectedCustomer.id}`}>`
- **Status**: [ ] Test Required


### LNK-038: <Button> Link
- **Location**: `src/app/admin/bookings/page.tsx:361`
- **Description**: Link to /admin/bookings/create
- **Expected**: Navigate to /admin/bookings/create
- **Code**: `<Link href="/admin/bookings/create">`
- **Status**: [ ] Test Required


### LNK-039: <Button variant="ghost" size="sm"> Link
- **Location**: `src/app/admin/bookings/create/page.tsx:245`
- **Description**: Link to /admin/bookings
- **Expected**: Navigate to /admin/bookings
- **Code**: `<Link href="/admin/bookings">`
- **Status**: [ ] Test Required


### LNK-040: <Button variant="outline" disabled={saving}> Link
- **Location**: `src/app/admin/bookings/create/page.tsx:389`
- **Description**: Link to /admin/bookings
- **Expected**: Navigate to /admin/bookings
- **Code**: `<Link href="/admin/bookings">`
- **Status**: [ ] Test Required



## 📝 Form Features (25)


### FRM-001: Vehicle Form
- **Location**: `src/components/vehicles/VehicleForm.tsx:38`
- **Description**: Form submission handler for Vehicle
- **Expected**: Submit form data and handle response
- **Code**: `const onSubmit = async (data: VehicleFormData) => {`
- **Status**: [ ] Test Required


### FRM-002: Vehicle Form
- **Location**: `src/components/vehicles/VehicleForm.tsx:84`
- **Description**: Form submission handler for Vehicle
- **Expected**: Submit form data and handle response
- **Code**: `<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">`
- **Status**: [ ] Test Required


### FRM-003: onSubmit Form
- **Location**: `src/components/booking/UserStep.tsx:42`
- **Description**: Form submission handler for onSubmit
- **Expected**: Submit form data and handle response
- **Code**: `const onSubmit = async (data: UserFormData) => {`
- **Status**: [ ] Test Required


### FRM-004: handleBack Form
- **Location**: `src/components/booking/UserStep.tsx:66`
- **Description**: Form submission handler for handleBack
- **Expected**: Submit form data and handle response
- **Code**: `<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">`
- **Status**: [ ] Test Required


### FRM-005: onSubmit Form
- **Location**: `src/components/booking/PersonalDetailsStep.tsx:51`
- **Description**: Form submission handler for onSubmit
- **Expected**: Submit form data and handle response
- **Code**: `const onSubmit = async (data: PersonalDetails) => {`
- **Status**: [ ] Test Required


### FRM-006: to Form
- **Location**: `src/components/booking/PersonalDetailsStep.tsx:93`
- **Description**: Form submission handler for to
- **Expected**: Submit form data and handle response
- **Code**: `<form onSubmit={handleSubmit(onSubmit)} className="space-y-6" autoComplete="on">`
- **Status**: [ ] Test Required


### FRM-007: onSubmit Form
- **Location**: `src/components/booking/PaymentStep.tsx:51`
- **Description**: Form submission handler for onSubmit
- **Expected**: Submit form data and handle response
- **Code**: `const onSubmit = async (data: PaymentFormData) => {`
- **Status**: [ ] Test Required


### FRM-008: PaymentStep Form
- **Location**: `src/components/booking/PaymentStep.tsx:99`
- **Description**: Form submission handler for PaymentStep
- **Expected**: Submit form data and handle response
- **Code**: `<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">`
- **Status**: [ ] Test Required


### FRM-009: SignUp Form
- **Location**: `src/components/auth/SignUpForm.tsx:43`
- **Description**: Form submission handler for SignUp
- **Expected**: Submit form data and handle response
- **Code**: `const onSubmit = async (data: SignUpFormData) => {`
- **Status**: [ ] Test Required


### FRM-010: SignUp Form
- **Location**: `src/components/auth/SignUpForm.tsx:59`
- **Description**: Form submission handler for SignUp
- **Expected**: Submit form data and handle response
- **Code**: `<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">`
- **Status**: [ ] Test Required


### FRM-011: SignIn Form
- **Location**: `src/components/auth/SignInForm.tsx:37`
- **Description**: Form submission handler for SignIn
- **Expected**: Submit form data and handle response
- **Code**: `const onSubmit = async (data: SignInFormData) => {`
- **Status**: [ ] Test Required


### FRM-012: SignIn Form
- **Location**: `src/components/auth/SignInForm.tsx:76`
- **Description**: Form submission handler for SignIn
- **Expected**: Submit form data and handle response
- **Code**: `<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">`
- **Status**: [ ] Test Required


### FRM-013: ResetPassword Form
- **Location**: `src/components/auth/ResetPasswordForm.tsx:32`
- **Description**: Form submission handler for ResetPassword
- **Expected**: Submit form data and handle response
- **Code**: `const onSubmit = async (data: ResetPasswordFormData) => {`
- **Status**: [ ] Test Required


### FRM-014: ResetPassword Form
- **Location**: `src/components/auth/ResetPasswordForm.tsx:66`
- **Description**: Form submission handler for ResetPassword
- **Expected**: Submit form data and handle response
- **Code**: `<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">`
- **Status**: [ ] Test Required


### FRM-015: EditBookingModal Form
- **Location**: `src/components/admin/EditBookingModal.tsx:348`
- **Description**: Form submission handler for EditBookingModal
- **Expected**: Submit form data and handle response
- **Code**: `<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">`
- **Status**: [ ] Test Required


### FRM-016: formData Form
- **Location**: `src/components/booking/steps/SummaryStep.tsx:40`
- **Description**: Form submission handler for formData
- **Expected**: Submit form data and handle response
- **Code**: `const onSubmit = async (data: UnifiedBookingForm) => {`
- **Status**: [ ] Test Required


### FRM-017: page Form
- **Location**: `src/app/auth/update-password/page.tsx:144`
- **Description**: Form submission handler for page
- **Expected**: Submit form data and handle response
- **Code**: `<form onSubmit={handleSubmit} className="space-y-6">`
- **Status**: [ ] Test Required


### FRM-018: page Form
- **Location**: `src/app/auth/signup/page.tsx:112`
- **Description**: Form submission handler for page
- **Expected**: Submit form data and handle response
- **Code**: `<form onSubmit={handleSignup} className="space-y-4">`
- **Status**: [ ] Test Required


### FRM-019: page Form
- **Location**: `src/app/auth/login/page.tsx:100`
- **Description**: Form submission handler for page
- **Expected**: Submit form data and handle response
- **Code**: `<form onSubmit={handleLogin} className="space-y-4">`
- **Status**: [ ] Test Required


### FRM-020: page Form
- **Location**: `src/app/auth/admin-login/page.tsx:84`
- **Description**: Form submission handler for page
- **Expected**: Submit form data and handle response
- **Code**: `<form onSubmit={handleMagicLink} className="space-y-4">`
- **Status**: [ ] Test Required


### FRM-021: page Form
- **Location**: `src/app/auth/setup-password/page.tsx:157`
- **Description**: Form submission handler for page
- **Expected**: Submit form data and handle response
- **Code**: `<form onSubmit={handleSubmit} className="space-y-6">`
- **Status**: [ ] Test Required


### FRM-022: page Form
- **Location**: `src/app/admin/pricing/page.tsx:350`
- **Description**: Form submission handler for page
- **Expected**: Submit form data and handle response
- **Code**: `<form onSubmit={addonForm.handleSubmit(addOrUpdateAddon)} className="space-y-4">`
- **Status**: [ ] Test Required


### FRM-023: page Form
- **Location**: `src/app/admin/policies/page.tsx:195`
- **Description**: Form submission handler for page
- **Expected**: Submit form data and handle response
- **Code**: `<form onSubmit={form.handleSubmit(savePolicies)} className="space-y-8">`
- **Status**: [ ] Test Required


### FRM-024: page Form
- **Location**: `src/app/admin/bookings/page.tsx:597`
- **Description**: Form submission handler for page
- **Expected**: Submit form data and handle response
- **Code**: `<form onSubmit={editForm.handleSubmit(handleUpdateBooking)} className="space-y-6">`
- **Status**: [ ] Test Required


### FRM-025: page Form
- **Location**: `src/app/admin/bookings/create/page.tsx:270`
- **Description**: Form submission handler for page
- **Expected**: Submit form data and handle response
- **Code**: `<form onSubmit={handleSubmit} className="space-y-6">`
- **Status**: [ ] Test Required



## 🌐 API Endpoints (28)


### API-001: POST /api/email
- **Location**: `src/lib/services/email.ts:20`
- **Description**: API call to email
- **Expected**: Make POST request to /api/email
- **Code**: `const response = await fetch('/api/email', {`
- **Status**: [ ] Test Required


### API-002: POST /api/email
- **Location**: `src/lib/services/email.ts:38`
- **Description**: API call to email
- **Expected**: Make POST request to /api/email
- **Code**: `const response = await fetch('/api/email', {`
- **Status**: [ ] Test Required


### API-003: POST /api/email
- **Location**: `src/lib/services/email.ts:56`
- **Description**: API call to email
- **Expected**: Make POST request to /api/email
- **Code**: `const response = await fetch('/api/email', {`
- **Status**: [ ] Test Required


### API-004: POST /api/email
- **Location**: `src/lib/services/email.ts:80`
- **Description**: API call to email
- **Expected**: Make POST request to /api/email
- **Code**: `const response = await fetch('/api/email', {`
- **Status**: [ ] Test Required


### API-005: POST /api/auth/anonymous
- **Location**: `src/lib/services/booking.ts:385`
- **Description**: API call to auth/anonymous
- **Expected**: Make POST request to /api/auth/anonymous
- **Code**: `const response = await fetch('/api/auth/anonymous', {`
- **Status**: [ ] Test Required


### API-006: POST /api/time-slots/generate
- **Location**: `src/lib/api/time-slots.ts:65`
- **Description**: API call to time-slots/generate
- **Expected**: Make POST request to /api/time-slots/generate
- **Code**: `const response = await fetch('/api/time-slots/generate', {`
- **Status**: [ ] Test Required


### API-007: PATCH /api/bookings/${bookingId}
- **Location**: `src/components/dashboard/CancelBookingButton.tsx:30`
- **Description**: API call to bookings/${bookingId}
- **Expected**: Make PATCH request to /api/bookings/${bookingId}
- **Code**: `const response = await fetch(`/api/bookings/${bookingId}`, {`
- **Status**: [ ] Test Required


### API-008: GET /api/vehicle-sizes
- **Location**: `src/components/booking/UnifiedBookingForm.tsx:85`
- **Description**: API call to vehicle-sizes
- **Expected**: Make GET request to /api/vehicle-sizes
- **Code**: `const response = await fetch('/api/vehicle-sizes');`
- **Status**: [ ] Test Required


### API-009: POST /api/auth/resend-setup
- **Location**: `src/components/booking/ConfirmationDetails.tsx:49`
- **Description**: API call to auth/resend-setup
- **Expected**: Make POST request to /api/auth/resend-setup
- **Code**: `const response = await fetch('/api/auth/resend-setup', {`
- **Status**: [ ] Test Required


### API-010: GET /api/admin/weekly-schedule
- **Location**: `src/components/admin/WeeklyScheduleConfig.tsx:52`
- **Description**: API call to admin/weekly-schedule
- **Expected**: Make GET request to /api/admin/weekly-schedule
- **Code**: `const response = await fetch('/api/admin/weekly-schedule');`
- **Status**: [ ] Test Required


### API-011: POST /api/admin/weekly-schedule
- **Location**: `src/components/admin/WeeklyScheduleConfig.tsx:150`
- **Description**: API call to admin/weekly-schedule
- **Expected**: Make POST request to /api/admin/weekly-schedule
- **Code**: `const response = await fetch('/api/admin/weekly-schedule', {`
- **Status**: [ ] Test Required


### API-012: GET /api/bookings/available-slots?date=${date}
- **Location**: `src/components/admin/EditBookingModal.tsx:136`
- **Description**: API call to bookings/available-slots?date=${date}
- **Expected**: Make GET request to /api/bookings/available-slots?date=${date}
- **Code**: `const response = await fetch(`/api/bookings/available-slots?date=${date}`);`
- **Status**: [ ] Test Required


### API-013: POST /api/admin/availability/generate-week
- **Location**: `src/components/admin/AvailabilityCalendar.tsx:76`
- **Description**: API call to admin/availability/generate-week
- **Expected**: Make POST request to /api/admin/availability/generate-week
- **Code**: `const response = await fetch('/api/admin/availability/generate-week', {`
- **Status**: [ ] Test Required


### API-014: POST /api/upload-vehicle-photo
- **Location**: `src/components/booking/steps/SummaryStep.tsx:53`
- **Description**: API call to upload-vehicle-photo
- **Expected**: Make POST request to /api/upload-vehicle-photo
- **Code**: `const uploadResponse = await fetch('/api/upload-vehicle-photo', {`
- **Status**: [ ] Test Required


### API-015: POST /api/bookings
- **Location**: `src/components/booking/steps/SummaryStep.tsx:82`
- **Description**: API call to bookings
- **Expected**: Make POST request to /api/bookings
- **Code**: `const response = await fetch('/api/bookings', {`
- **Status**: [ ] Test Required


### API-016: GET /api/postcode-distance?postcode=${encodeURIComponent(postcode)}
- **Location**: `src/components/booking/steps/PersonalDetailsStep.tsx:49`
- **Description**: API call to postcode-distance?postcode=${encodeURIComponent(postcode)}
- **Expected**: Make GET request to /api/postcode-distance?postcode=${encodeURIComponent(postcode)}
- **Code**: `const response = await fetch(`/api/postcode-distance?postcode=${encodeURIComponent(postcode)}`);`
- **Status**: [ ] Test Required


### API-017: GET /api/time-slots?date=${dateStr}
- **Location**: `src/components/booking/steps/DateTimeStep.tsx:56`
- **Description**: API call to time-slots?date=${dateStr}
- **Expected**: Make GET request to /api/time-slots?date=${dateStr}
- **Code**: `const response = await fetch(`/api/time-slots?date=${dateStr}`);`
- **Status**: [ ] Test Required


### API-018: GET /api/bookings
- **Location**: `src/app/dashboard/bookings/page.tsx:58`
- **Description**: API call to bookings
- **Expected**: Make GET request to /api/bookings
- **Code**: `const response = await fetch('/api/bookings');`
- **Status**: [ ] Test Required


### API-019: PATCH /api/admin/users/${userId}/role
- **Location**: `src/app/admin/users/page.tsx:69`
- **Description**: API call to admin/users/${userId}/role
- **Expected**: Make PATCH request to /api/admin/users/${userId}/role
- **Code**: `const response = await fetch(`/api/admin/users/${userId}/role`, {`
- **Status**: [ ] Test Required


### API-020: GET /api/admin/time-slots?date=${selectedDate}
- **Location**: `src/app/admin/time-slots/page.tsx:54`
- **Description**: API call to admin/time-slots?date=${selectedDate}
- **Expected**: Make GET request to /api/admin/time-slots?date=${selectedDate}
- **Code**: `const response = await fetch(`/api/admin/time-slots?date=${selectedDate}`);`
- **Status**: [ ] Test Required


### API-021: POST /api/admin/time-slots/generate
- **Location**: `src/app/admin/time-slots/page.tsx:71`
- **Description**: API call to admin/time-slots/generate
- **Expected**: Make POST request to /api/admin/time-slots/generate
- **Code**: `const response = await fetch('/api/admin/time-slots/generate', {`
- **Status**: [ ] Test Required


### API-022: PATCH /api/admin/time-slots/${slotId}
- **Location**: `src/app/admin/time-slots/page.tsx:98`
- **Description**: API call to admin/time-slots/${slotId}
- **Expected**: Make PATCH request to /api/admin/time-slots/${slotId}
- **Code**: `const response = await fetch(`/api/admin/time-slots/${slotId}`, {`
- **Status**: [ ] Test Required


### API-023: DELETE /api/admin/time-slots/${slotId}
- **Location**: `src/app/admin/time-slots/page.tsx:118`
- **Description**: API call to admin/time-slots/${slotId}
- **Expected**: Make DELETE request to /api/admin/time-slots/${slotId}
- **Code**: `const response = await fetch(`/api/admin/time-slots/${slotId}`, {`
- **Status**: [ ] Test Required


### API-024: GET /api/admin/settings
- **Location**: `src/app/admin/settings/page.tsx:129`
- **Description**: API call to admin/settings
- **Expected**: Make GET request to /api/admin/settings
- **Code**: `const response = await fetch('/api/admin/settings');`
- **Status**: [ ] Test Required


### API-025: PUT /api/admin/settings
- **Location**: `src/app/admin/settings/page.tsx:177`
- **Description**: API call to admin/settings
- **Expected**: Make PUT request to /api/admin/settings
- **Code**: `const response = await fetch('/api/admin/settings', {`
- **Status**: [ ] Test Required


### API-026: PUT /api/admin/settings
- **Location**: `src/app/admin/settings/page.tsx:211`
- **Description**: API call to admin/settings
- **Expected**: Make PUT request to /api/admin/settings
- **Code**: `const response = await fetch('/api/admin/settings', {`
- **Status**: [ ] Test Required


### API-027: GET /api/admin/customers
- **Location**: `src/app/admin/bookings/create/page.tsx:75`
- **Description**: API call to admin/customers
- **Expected**: Make GET request to /api/admin/customers
- **Code**: `fetch('/api/admin/customers').catch(e => null),`
- **Status**: [ ] Test Required


### API-028: GET /api/vehicle-sizes
- **Location**: `src/app/admin/bookings/create/page.tsx:76`
- **Description**: API call to vehicle-sizes
- **Expected**: Make GET request to /api/vehicle-sizes
- **Code**: `fetch('/api/vehicle-sizes').catch(e => null)`
- **Status**: [ ] Test Required



## ⚡ Other Interactions (134)


### INT-001: element Interaction
- **Location**: `src/app/not-found.tsx:21`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => router.back()}`
- **Status**: [ ] Test Required


### INT-002: element Interaction
- **Location**: `src/app/not-found.tsx:26`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => router.push('/')}`
- **Status**: [ ] Test Required


### INT-003: element Interaction
- **Location**: `src/components/vehicles/VehicleList.tsx:180`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => handleDelete(vehicle.id)}`
- **Status**: [ ] Test Required


### INT-004: element Interaction
- **Location**: `src/components/vehicles/VehicleForm.tsx:165`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={onCancel}`
- **Status**: [ ] Test Required


### INT-005: element Interaction
- **Location**: `src/components/ui/ErrorBoundary.tsx:64`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => router.refresh()}`
- **Status**: [ ] Test Required


### INT-006: element Interaction
- **Location**: `src/components/ui/ErrorBoundary.tsx:70`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => router.push('/')}`
- **Status**: [ ] Test Required


### INT-007: element Interaction
- **Location**: `src/components/ui/Dialog.tsx:19`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => onOpenChange(false)}`
- **Status**: [ ] Test Required


### INT-008: element Interaction
- **Location**: `src/components/ui/AutocompleteInput.tsx:14`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange: (value: string) => void;`
- **Status**: [ ] Test Required


### INT-009: element Interaction
- **Location**: `src/components/ui/AutocompleteInput.tsx:87`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => {`
- **Status**: [ ] Test Required


### INT-010: element Interaction
- **Location**: `src/components/ui/AutocompleteInput.tsx:91`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onFocus={() => setIsOpen(true)}`
- **Status**: [ ] Test Required


### INT-011: element Interaction
- **Location**: `src/components/ui/AutocompleteInput.tsx:107`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => {`
- **Status**: [ ] Test Required


### INT-012: element Interaction
- **Location**: `src/components/services/ServiceCard.tsx:34`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => service.available && onSelect?.(service.id)}`
- **Status**: [ ] Test Required


### INT-013: element Interaction
- **Location**: `src/components/layout/DashboardSidebar.tsx:147`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={handleSignOut}`
- **Status**: [ ] Test Required


### INT-014: element Interaction
- **Location**: `src/components/dashboard/QuickBook.tsx:274`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={handleBooking}`
- **Status**: [ ] Test Required


### INT-015: element Interaction
- **Location**: `src/components/dashboard/CancelBookingButton.tsx:87`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={handleCancelBooking}`
- **Status**: [ ] Test Required


### INT-016: element Interaction
- **Location**: `src/components/dashboard/CancelBookingButton.tsx:102`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => setShowConfirm(false)}`
- **Status**: [ ] Test Required


### INT-017: element Interaction
- **Location**: `src/components/dashboard/CancelBookingButton.tsx:119`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => setShowConfirm(true)}`
- **Status**: [ ] Test Required


### INT-018: element Interaction
- **Location**: `src/components/booking/VehicleStep.tsx:206`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => {`
- **Status**: [ ] Test Required


### INT-019: element Interaction
- **Location**: `src/components/booking/VehicleStep.tsx:245`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={setModelInput}`
- **Status**: [ ] Test Required


### INT-020: element Interaction
- **Location**: `src/components/booking/VehicleStep.tsx:262`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => {`
- **Status**: [ ] Test Required


### INT-021: element Interaction
- **Location**: `src/components/booking/VehicleStep.tsx:300`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={handleNext}`
- **Status**: [ ] Test Required


### INT-022: element Interaction
- **Location**: `src/components/booking/UserStep.tsx:131`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={handleBack}`
- **Status**: [ ] Test Required


### INT-023: element Interaction
- **Location**: `src/components/booking/UnifiedBookingForm.tsx:178`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => goToStep(step.id)}`
- **Status**: [ ] Test Required


### INT-024: element Interaction
- **Location**: `src/components/booking/SummaryStep.tsx:163`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={handleConfirmBooking}`
- **Status**: [ ] Test Required


### INT-025: element Interaction
- **Location**: `src/components/booking/PaymentStep.tsx:190`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={onBack}`
- **Status**: [ ] Test Required


### INT-026: element Interaction
- **Location**: `src/components/booking/DateTimeStep.tsx:118`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => handleDateSelect(value)}`
- **Status**: [ ] Test Required


### INT-027: element Interaction
- **Location**: `src/components/booking/DateTimeStep.tsx:144`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => handleTimeSelect(slot)}`
- **Status**: [ ] Test Required


### INT-028: element Interaction
- **Location**: `src/components/booking/DateTimeStep.tsx:164`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={handleNext}`
- **Status**: [ ] Test Required


### INT-029: element Interaction
- **Location**: `src/components/booking/ConfirmationDetails.tsx:119`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={handleResendSetupEmail}`
- **Status**: [ ] Test Required


### INT-030: element Interaction
- **Location**: `src/components/booking/BookingStepper.tsx:67`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick: () => void;`
- **Status**: [ ] Test Required


### INT-031: element Interaction
- **Location**: `src/components/booking/BookingStepper.tsx:98`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={onClick}`
- **Status**: [ ] Test Required


### INT-032: element Interaction
- **Location**: `src/components/booking/BookingStepper.tsx:202`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => handleStepClick(step.key)}`
- **Status**: [ ] Test Required


### INT-033: element Interaction
- **Location**: `src/components/auth/ResetPasswordForm.tsx:57`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => setSuccess(false)}`
- **Status**: [ ] Test Required


### INT-034: element Interaction
- **Location**: `src/components/admin/WeeklyScheduleConfig.tsx:305`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => updateSlotTime(dayOfWeek, index, e.target.value)}`
- **Status**: [ ] Test Required


### INT-035: element Interaction
- **Location**: `src/components/admin/UnmatchedVehiclesCard.tsx:117`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => fetchUnmatchedVehicles()}`
- **Status**: [ ] Test Required


### INT-036: element Interaction
- **Location**: `src/components/admin/EditBookingModal.tsx:409`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => handleDateChange(e.target.value)}`
- **Status**: [ ] Test Required


### INT-037: element Interaction
- **Location**: `src/components/admin/EditBookingModal.tsx:440`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => isClickable && handleSlotSelect(slotNumber)}`
- **Status**: [ ] Test Required


### INT-038: element Interaction
- **Location**: `src/components/admin/AvailabilityCalendar.tsx:165`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => generateWeekSlots(formatDate(currentWeekStart))}`
- **Status**: [ ] Test Required


### INT-039: element Interaction
- **Location**: `src/components/admin/AvailabilityCalendar.tsx:183`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => navigateWeek('prev')}`
- **Status**: [ ] Test Required


### INT-040: element Interaction
- **Location**: `src/components/admin/AvailabilityCalendar.tsx:192`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => navigateWeek('next')}`
- **Status**: [ ] Test Required


### INT-041: element Interaction
- **Location**: `src/components/admin/AvailabilityCalendar.tsx:258`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => onSlotClick?.(day.date, slot.slot_number)}`
- **Status**: [ ] Test Required


### INT-042: element Interaction
- **Location**: `src/components/admin/AvailabilityCalendar.tsx:287`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => onDateGenerate?.(day.date)}`
- **Status**: [ ] Test Required


### INT-043: element Interaction
- **Location**: `src/app/confirmation/error.tsx:59`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => router.push('/dashboard/bookings')}`
- **Status**: [ ] Test Required


### INT-044: element Interaction
- **Location**: `src/app/confirmation/error.tsx:65`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => reset()}`
- **Status**: [ ] Test Required


### INT-045: element Interaction
- **Location**: `src/app/confirmation/error.tsx:72`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => router.push('/book')}`
- **Status**: [ ] Test Required


### INT-046: element Interaction
- **Location**: `src/components/booking/steps/VehicleInfoStep.tsx:243`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => handleSizeChange(size.id)}`
- **Status**: [ ] Test Required


### INT-047: element Interaction
- **Location**: `src/components/booking/steps/VehicleInfoStep.tsx:268`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={onBack}`
- **Status**: [ ] Test Required


### INT-048: element Interaction
- **Location**: `src/components/booking/steps/VehicleInfoStep.tsx:276`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={handleNext}`
- **Status**: [ ] Test Required


### INT-049: element Interaction
- **Location**: `src/components/booking/steps/SummaryStep.tsx:291`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={onBack}`
- **Status**: [ ] Test Required


### INT-050: element Interaction
- **Location**: `src/components/booking/steps/SummaryStep.tsx:299`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={handleSubmit(onSubmit)}`
- **Status**: [ ] Test Required


### INT-051: element Interaction
- **Location**: `src/components/booking/steps/ServiceSelectionStep.tsx:85`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={handleNext}`
- **Status**: [ ] Test Required


### INT-052: element Interaction
- **Location**: `src/components/booking/steps/PersonalDetailsStep.tsx:214`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={handlePhotoUpload}`
- **Status**: [ ] Test Required


### INT-053: element Interaction
- **Location**: `src/components/booking/steps/PersonalDetailsStep.tsx:245`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => removePhoto(photo.id)}`
- **Status**: [ ] Test Required


### INT-054: element Interaction
- **Location**: `src/components/booking/steps/PersonalDetailsStep.tsx:272`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={onBack}`
- **Status**: [ ] Test Required


### INT-055: element Interaction
- **Location**: `src/components/booking/steps/PersonalDetailsStep.tsx:279`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={handleNext}`
- **Status**: [ ] Test Required


### INT-056: element Interaction
- **Location**: `src/components/booking/steps/DateTimeStep.tsx:156`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => handleSlotSelect(slot)}`
- **Status**: [ ] Test Required


### INT-057: element Interaction
- **Location**: `src/components/booking/steps/DateTimeStep.tsx:195`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={onBack}`
- **Status**: [ ] Test Required


### INT-058: element Interaction
- **Location**: `src/components/booking/steps/DateTimeStep.tsx:202`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={handleNext}`
- **Status**: [ ] Test Required


### INT-059: element Interaction
- **Location**: `src/app/auth/update-password/page.tsx:154`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => setPassword(e.target.value)}`
- **Status**: [ ] Test Required


### INT-060: element Interaction
- **Location**: `src/app/auth/update-password/page.tsx:161`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => setShowPassword(!showPassword)}`
- **Status**: [ ] Test Required


### INT-061: element Interaction
- **Location**: `src/app/auth/update-password/page.tsx:182`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => setConfirmPassword(e.target.value)}`
- **Status**: [ ] Test Required


### INT-062: element Interaction
- **Location**: `src/app/auth/update-password/page.tsx:189`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => setShowConfirmPassword(!showConfirmPassword)}`
- **Status**: [ ] Test Required


### INT-063: element Interaction
- **Location**: `src/app/auth/update-password/page.tsx:216`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => router.push('/auth/sign-in')}`
- **Status**: [ ] Test Required


### INT-064: element Interaction
- **Location**: `src/app/auth/signup/page.tsx:127`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => setFirstName(e.target.value)}`
- **Status**: [ ] Test Required


### INT-065: element Interaction
- **Location**: `src/app/auth/signup/page.tsx:138`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => setLastName(e.target.value)}`
- **Status**: [ ] Test Required


### INT-066: element Interaction
- **Location**: `src/app/auth/signup/page.tsx:155`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => setEmail(e.target.value)}`
- **Status**: [ ] Test Required


### INT-067: element Interaction
- **Location**: `src/app/auth/signup/page.tsx:171`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => setPassword(e.target.value)}`
- **Status**: [ ] Test Required


### INT-068: element Interaction
- **Location**: `src/app/auth/signup/page.tsx:184`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => setConfirmPassword(e.target.value)}`
- **Status**: [ ] Test Required


### INT-069: element Interaction
- **Location**: `src/app/auth/login/page.tsx:118`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => setEmail(e.target.value)}`
- **Status**: [ ] Test Required


### INT-070: element Interaction
- **Location**: `src/app/auth/login/page.tsx:134`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => setPassword(e.target.value)}`
- **Status**: [ ] Test Required


### INT-071: element Interaction
- **Location**: `src/app/auth/login/page.tsx:162`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={handleMagicLink}`
- **Status**: [ ] Test Required


### INT-072: element Interaction
- **Location**: `src/app/auth/admin-login/page.tsx:102`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => setEmail(e.target.value)}`
- **Status**: [ ] Test Required


### INT-073: element Interaction
- **Location**: `src/app/auth/setup-password/page.tsx:166`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={handleInputChange('password')}`
- **Status**: [ ] Test Required


### INT-074: element Interaction
- **Location**: `src/app/auth/setup-password/page.tsx:174`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => setShowPassword(!showPassword)}`
- **Status**: [ ] Test Required


### INT-075: element Interaction
- **Location**: `src/app/auth/setup-password/page.tsx:193`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={handleInputChange('confirmPassword')}`
- **Status**: [ ] Test Required


### INT-076: element Interaction
- **Location**: `src/app/auth/setup-password/page.tsx:200`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => setShowConfirmPassword(!showConfirmPassword)}`
- **Status**: [ ] Test Required


### INT-077: element Interaction
- **Location**: `src/app/admin/users/page.tsx:127`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => fetchUsers()}`
- **Status**: [ ] Test Required


### INT-078: element Interaction
- **Location**: `src/app/admin/users/page.tsx:203`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => updateUserRole(user.id, 'customer')}`
- **Status**: [ ] Test Required


### INT-079: element Interaction
- **Location**: `src/app/admin/users/page.tsx:217`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => updateUserRole(user.id, 'admin')}`
- **Status**: [ ] Test Required


### INT-080: element Interaction
- **Location**: `src/app/admin/time-slots/page.tsx:153`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => setShowConfig(!showConfig)}`
- **Status**: [ ] Test Required


### INT-081: element Interaction
- **Location**: `src/app/admin/time-slots/page.tsx:161`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={generateTimeSlots}`
- **Status**: [ ] Test Required


### INT-082: element Interaction
- **Location**: `src/app/admin/time-slots/page.tsx:192`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => setWorkingHours(prev => ({ ...prev, start: e.target.value }))}`
- **Status**: [ ] Test Required


### INT-083: element Interaction
- **Location**: `src/app/admin/time-slots/page.tsx:201`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => setWorkingHours(prev => ({ ...prev, end: e.target.value }))}`
- **Status**: [ ] Test Required


### INT-084: element Interaction
- **Location**: `src/app/admin/time-slots/page.tsx:212`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => setWorkingHours(prev => ({ ...prev, slotsCount: parseInt(e.target.value) }))}`
- **Status**: [ ] Test Required


### INT-085: element Interaction
- **Location**: `src/app/admin/time-slots/page.tsx:224`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => {`
- **Status**: [ ] Test Required


### INT-086: element Interaction
- **Location**: `src/app/admin/time-slots/page.tsx:253`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => setSelectedDate(e.target.value)}`
- **Status**: [ ] Test Required


### INT-087: element Interaction
- **Location**: `src/app/admin/time-slots/page.tsx:315`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => toggleSlotAvailability(slot.id, slot.is_available)}`
- **Status**: [ ] Test Required


### INT-088: element Interaction
- **Location**: `src/app/admin/time-slots/page.tsx:324`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => deleteTimeSlot(slot.id)}`
- **Status**: [ ] Test Required


### INT-089: element Interaction
- **Location**: `src/app/admin/settings/page.tsx:310`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => setActiveTab('business')}`
- **Status**: [ ] Test Required


### INT-090: element Interaction
- **Location**: `src/app/admin/settings/page.tsx:321`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => setActiveTab('system')}`
- **Status**: [ ] Test Required


### INT-091: element Interaction
- **Location**: `src/app/admin/settings/page.tsx:346`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => updateBusinessSetting('company_name', e.target.value)}`
- **Status**: [ ] Test Required


### INT-092: element Interaction
- **Location**: `src/app/admin/settings/page.tsx:358`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => updateBusinessSetting('email', e.target.value)}`
- **Status**: [ ] Test Required


### INT-093: element Interaction
- **Location**: `src/app/admin/settings/page.tsx:369`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => updateBusinessSetting('phone', e.target.value)}`
- **Status**: [ ] Test Required


### INT-094: element Interaction
- **Location**: `src/app/admin/settings/page.tsx:380`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => updateBusinessSetting('address', e.target.value)}`
- **Status**: [ ] Test Required


### INT-095: element Interaction
- **Location**: `src/app/admin/settings/page.tsx:400`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => updateBusinessHours(day, 'enabled', e.target.checked)}`
- **Status**: [ ] Test Required


### INT-096: element Interaction
- **Location**: `src/app/admin/settings/page.tsx:411`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => updateBusinessHours(day, 'open', e.target.value)}`
- **Status**: [ ] Test Required


### INT-097: element Interaction
- **Location**: `src/app/admin/settings/page.tsx:420`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => updateBusinessHours(day, 'close', e.target.value)}`
- **Status**: [ ] Test Required


### INT-098: element Interaction
- **Location**: `src/app/admin/settings/page.tsx:444`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => setBusinessSettings(prev => ({`
- **Status**: [ ] Test Required


### INT-099: element Interaction
- **Location**: `src/app/admin/settings/page.tsx:463`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => setBusinessSettings(prev => ({`
- **Status**: [ ] Test Required


### INT-100: element Interaction
- **Location**: `src/app/admin/settings/page.tsx:482`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => setBusinessSettings(prev => ({`
- **Status**: [ ] Test Required


### INT-101: element Interaction
- **Location**: `src/app/admin/settings/page.tsx:502`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => setBusinessSettings(prev => ({`
- **Status**: [ ] Test Required


### INT-102: element Interaction
- **Location**: `src/app/admin/settings/page.tsx:531`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => updatePricingSetting('small_base_price', parseFloat(e.target.value) || 0)}`
- **Status**: [ ] Test Required


### INT-103: element Interaction
- **Location**: `src/app/admin/settings/page.tsx:544`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => updatePricingSetting('medium_base_price', parseFloat(e.target.value) || 0)}`
- **Status**: [ ] Test Required


### INT-104: element Interaction
- **Location**: `src/app/admin/settings/page.tsx:557`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => updatePricingSetting('large_base_price', parseFloat(e.target.value) || 0)}`
- **Status**: [ ] Test Required


### INT-105: element Interaction
- **Location**: `src/app/admin/settings/page.tsx:570`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => updatePricingSetting('extra_large_base_price', parseFloat(e.target.value) || 0)}`
- **Status**: [ ] Test Required


### INT-106: element Interaction
- **Location**: `src/app/admin/settings/page.tsx:614`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => updateSystemSetting('email_notifications', e.target.checked)}`
- **Status**: [ ] Test Required


### INT-107: element Interaction
- **Location**: `src/app/admin/settings/page.tsx:626`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => updateSystemSetting('sms_notifications', e.target.checked)}`
- **Status**: [ ] Test Required


### INT-108: element Interaction
- **Location**: `src/app/admin/settings/page.tsx:638`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => updateSystemSetting('booking_confirmations', e.target.checked)}`
- **Status**: [ ] Test Required


### INT-109: element Interaction
- **Location**: `src/app/admin/settings/page.tsx:650`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => updateSystemSetting('reminder_emails', e.target.checked)}`
- **Status**: [ ] Test Required


### INT-110: element Interaction
- **Location**: `src/app/admin/settings/page.tsx:662`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => updateSystemSetting('admin_notifications', e.target.checked)}`
- **Status**: [ ] Test Required


### INT-111: element Interaction
- **Location**: `src/app/admin/settings/page.tsx:681`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => updateSystemSetting('maintenance_mode', e.target.checked)}`
- **Status**: [ ] Test Required


### INT-112: element Interaction
- **Location**: `src/app/admin/pricing/page.tsx:259`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={sizeForm.handleSubmit(saveVehicleSizes)}`
- **Status**: [ ] Test Required


### INT-113: element Interaction
- **Location**: `src/app/admin/pricing/page.tsx:277`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => updateSizePrice(index, 'label', e.target.value)}`
- **Status**: [ ] Test Required


### INT-114: element Interaction
- **Location**: `src/app/admin/pricing/page.tsx:288`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => updateSizePrice(index, 'description', e.target.value)}`
- **Status**: [ ] Test Required


### INT-115: element Interaction
- **Location**: `src/app/admin/pricing/page.tsx:304`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => updateSizePrice(index, 'price_pounds', e.target.value)}`
- **Status**: [ ] Test Required


### INT-116: element Interaction
- **Location**: `src/app/admin/pricing/page.tsx:316`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => updateSizePrice(index, 'is_active', e.target.checked)}`
- **Status**: [ ] Test Required


### INT-117: element Interaction
- **Location**: `src/app/admin/pricing/page.tsx:466`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => startEditAddon(addon)}`
- **Status**: [ ] Test Required


### INT-118: element Interaction
- **Location**: `src/app/admin/pricing/page.tsx:473`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => deleteAddon(addon.id)}`
- **Status**: [ ] Test Required


### INT-119: element Interaction
- **Location**: `src/app/admin/customers/page.tsx:230`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => setSearchTerm(e.target.value)}`
- **Status**: [ ] Test Required


### INT-120: element Interaction
- **Location**: `src/app/admin/customers/page.tsx:255`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => fetchCustomerDetail(customer.id)}`
- **Status**: [ ] Test Required


### INT-121: element Interaction
- **Location**: `src/app/admin/bookings/page.tsx:383`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => handleFilterChange('search', e.target.value)}`
- **Status**: [ ] Test Required


### INT-122: element Interaction
- **Location**: `src/app/admin/bookings/page.tsx:412`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => handleFilterChange('dateFrom', e.target.value)}`
- **Status**: [ ] Test Required


### INT-123: element Interaction
- **Location**: `src/app/admin/bookings/page.tsx:423`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => handleFilterChange('dateTo', e.target.value)}`
- **Status**: [ ] Test Required


### INT-124: element Interaction
- **Location**: `src/app/admin/bookings/page.tsx:567`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => handleEditBooking(booking)}`
- **Status**: [ ] Test Required


### INT-125: element Interaction
- **Location**: `src/app/admin/bookings/page.tsx:575`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => handleDeleteBooking(booking.id)}`
- **Status**: [ ] Test Required


### INT-126: element Interaction
- **Location**: `src/app/admin/bookings/page.tsx:682`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={() => setIsEditModalOpen(false)}`
- **Status**: [ ] Test Required


### INT-127: element Interaction
- **Location**: `src/app/admin/analytics/page.tsx:391`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={fetchAnalytics}`
- **Status**: [ ] Test Required


### INT-128: element Interaction
- **Location**: `src/app/admin/analytics/page.tsx:399`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onClick={exportData}`
- **Status**: [ ] Test Required


### INT-129: element Interaction
- **Location**: `src/app/admin/bookings/create/page.tsx:281`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => handleUserChange(e.target.value)}`
- **Status**: [ ] Test Required


### INT-130: element Interaction
- **Location**: `src/app/admin/bookings/create/page.tsx:300`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}`
- **Status**: [ ] Test Required


### INT-131: element Interaction
- **Location**: `src/app/admin/bookings/create/page.tsx:316`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => setFormData(prev => ({ ...prev, vehicle_id: e.target.value }))}`
- **Status**: [ ] Test Required


### INT-132: element Interaction
- **Location**: `src/app/admin/bookings/create/page.tsx:342`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => setFormData(prev => ({ ...prev, time_slot_id: e.target.value }))}`
- **Status**: [ ] Test Required


### INT-133: element Interaction
- **Location**: `src/app/admin/bookings/create/page.tsx:366`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => setFormData(prev => ({ ...prev, special_requests: e.target.value }))}`
- **Status**: [ ] Test Required


### INT-134: element Interaction
- **Location**: `src/app/admin/bookings/create/page.tsx:378`
- **Description**: Interactive element element
- **Expected**: Respond to user interaction
- **Code**: `onChange={(e) => setFormData(prev => ({ ...prev, admin_notes: e.target.value }))}`
- **Status**: [ ] Test Required



---
*Generated by Love4Detailing Feature Audit System*
