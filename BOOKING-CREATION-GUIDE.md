# Love4Detailing - Manual Booking Creation Guide
_For creating 5 test bookings in Vercel environment_

## 🎯 **OBJECTIVE**
Create 5 realistic bookings with complete user profiles, vehicle data, and dashboard access using the live Vercel deployment: `https://love4detailingv2.vercel.app`

---

## 👥 **TEST USERS TO CREATE**

### **User 1: James Morrison**
- **Email**: `james.morrison.test@gmail.com`
- **Password**: `TestPass123!`
- **Name**: James Morrison
- **Phone**: `07700900123`
- **Postcode**: `SW9 0SN`
- **Vehicle**: BMW 3 Series (BM18 JMO) - 2018, Black - **Medium size** (£60)
- **Booking Date**: January 8, 2025 (Wednesday) at 09:00

### **User 2: Sarah Chen**
- **Email**: `sarah.chen.test@gmail.com`
- **Password**: `SecurePass456!`
- **Name**: Sarah Chen
- **Phone**: `07700900456`
- **Postcode**: `SW9 1AB`
- **Vehicle**: Honda Civic (HC19 SCH) - 2019, Silver - **Small size** (£50)
- **Booking Date**: January 9, 2025 (Thursday) at 11:00

### **User 3: David Thompson**
- **Email**: `david.thompson.test@gmail.com`
- **Password**: `StrongPass789!`
- **Name**: David Thompson
- **Phone**: `07700900789`
- **Postcode**: `SW9 2CD`
- **Vehicle**: Land Rover Range Rover Sport (LR20 DVT) - 2020, White - **Extra Large size** (£80)
- **Booking Date**: January 10, 2025 (Friday) at 14:00

### **User 4: Emily Rodriguez**
- **Email**: `emily.rodriguez.test@gmail.com`
- **Password**: `PowerPass321!`
- **Name**: Emily Rodriguez
- **Phone**: `07700900321`
- **Postcode**: `SW9 3EF`
- **Vehicle**: Volkswagen Golf (VW21 EML) - 2021, Blue - **Medium size** (£60)
- **Booking Date**: January 11, 2025 (Saturday) at 10:00

### **User 5: Michael O'Connor**
- **Email**: `michael.oconnor.test@gmail.com`
- **Password**: `SafePass654!`
- **Name**: Michael O'Connor
- **Phone**: `07700900654`
- **Postcode**: `SW9 4GH`
- **Vehicle**: Audi A6 (AU22 MOC) - 2022, Grey - **Large size** (£70)
- **Booking Date**: January 12, 2025 (Sunday) at 13:00

---

## 📋 **STEP-BY-STEP BOOKING CREATION PROCESS**

### **For Each User (Repeat 5 times):**

#### **Step 1: Create User Account**
1. Go to `https://love4detailingv2.vercel.app/auth/sign-up`
2. Fill in registration form:
   - **First Name**: [User's first name]
   - **Last Name**: [User's last name] 
   - **Email**: [User's test email]
   - **Password**: [User's password]
   - **Confirm Password**: [Same password]
3. Click "Create account"
4. Check email verification (if required)

#### **Step 2: Sign In and Access Dashboard**
1. Go to `https://love4detailingv2.vercel.app/auth/sign-in`
2. Sign in with user credentials
3. Verify redirect to dashboard: `https://love4detailingv2.vercel.app/dashboard`
4. Confirm user can see dashboard sections

#### **Step 3: Create Vehicle Profile**
1. Navigate to "My Vehicles" in dashboard
2. Click "Add Vehicle" button
3. Fill in vehicle details:
   - **Registration**: [User's reg number]
   - **Make**: [Vehicle make]
   - **Model**: [Vehicle model]
   - **Year**: [Vehicle year]
   - **Color**: [Vehicle color]
   - **Size**: [Select appropriate size category]
4. Save vehicle

#### **Step 4: Create Booking**
1. Click "Book Service" or navigate to booking flow
2. **Service Selection**: Choose default car detailing service
3. **Vehicle Details**: Select the created vehicle
4. **Personal Details**: 
   - Confirm contact information
   - **Phone**: [User's phone]
   - **Postcode**: [User's postcode]
5. **Date & Time**:
   - **Date**: [User's booking date]
   - **Time**: [User's booking time]
6. **Summary**: Review and confirm booking
7. Complete booking process

#### **Step 5: Verify Booking**
1. Check confirmation page displays correctly
2. Verify booking appears in "My Bookings" dashboard
3. Confirm all details are stored correctly
4. Test navigation between dashboard sections

---

## ✅ **VERIFICATION CHECKLIST**

### **For Each Completed Booking:**
- [ ] User account created successfully
- [ ] User can sign in and access dashboard
- [ ] Vehicle profile created and saved
- [ ] Booking created with correct details
- [ ] Booking appears in user's dashboard
- [ ] All personal information stored correctly
- [ ] Correct vehicle size and pricing applied
- [ ] Time slot marked as booked
- [ ] User can navigate dashboard sections
- [ ] Sign out functionality works

### **Database Verification:**
- [ ] All 5 users exist in `users` table
- [ ] All 5 vehicles exist in `vehicles` table
- [ ] All 5 bookings exist in `bookings` table
- [ ] Time slots marked as `is_booked = true`
- [ ] Correct pricing applied from `vehicle_sizes`
- [ ] All relationships properly linked

### **Functionality Testing:**
- [ ] Authentication flow works for all users
- [ ] Dashboard loads correctly for all users
- [ ] Booking data displays correctly
- [ ] Vehicle information displays correctly
- [ ] Pricing calculations correct
- [ ] Navigation between sections works
- [ ] Sign out redirects properly

---

## 🗓️ **EXPECTED BOOKING SCHEDULE**

| Date | Day | User | Vehicle | Size | Price | Time |
|------|-----|------|---------|------|-------|------|
| Jan 8 | Wed | James Morrison | BMW 3 Series | Medium | £60 | 09:00 |
| Jan 9 | Thu | Sarah Chen | Honda Civic | Small | £50 | 11:00 |
| Jan 10 | Fri | David Thompson | Range Rover Sport | Extra Large | £80 | 14:00 |
| Jan 11 | Sat | Emily Rodriguez | VW Golf | Medium | £60 | 10:00 |
| Jan 12 | Sun | Michael O'Connor | Audi A6 | Large | £70 | 13:00 |

**Total Revenue**: £320
**Average Booking Value**: £64

---

## 🔍 **TESTING NOTES**

### **What to Look For:**
1. **Authentication**: Smooth sign-up/sign-in process
2. **Data Persistence**: All information saves correctly
3. **Navigation**: Dashboard sections load properly
4. **Pricing**: Correct vehicle size pricing applied
5. **Booking Flow**: Complete end-to-end process works
6. **User Experience**: Professional, bug-free interface

### **Common Issues to Check:**
- Form validation working correctly
- Error messages clear and helpful
- Loading states display properly
- Responsive design on different screen sizes
- All links and buttons functional
- Consistent styling throughout

---

## 📊 **SUCCESS METRICS**

- **5/5 users created** with complete profiles
- **5/5 vehicles added** with correct specifications
- **5/5 bookings completed** with proper time slots
- **5/5 dashboard accesses** verified working
- **100% data accuracy** in database storage
- **0 critical bugs** discovered during process

---

*This guide ensures comprehensive testing of the Love4Detailing booking system with realistic user scenarios and complete data verification.*