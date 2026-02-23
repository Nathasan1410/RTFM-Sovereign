# Remaining Debt & Manual Testing Plan

**Date:** 2026-02-24
**Status:** Ready for Manual Testing

---

## 📋 Manual Testing Tasks

### Priority 1: Critical for Demo Day

#### TEST 1: Demo Mode Activation
**File:** `apps/web/components/DemoModeListener.tsx`

**Steps:**
1. Open http://localhost:3000 in browser
2. Press `Shift+D` three times rapidly (< 1 second between presses)
3. Check for toast notification: "🎮 Demo Mode Activated!"

**Verification:**
- [ ] Toast appears with 5-second duration
- [ ] Message shows: "All blockchain interactions are now simulated."
- [ ] Check browser console: `localStorage.getItem('RTFM_DEMO_MODE') === 'true'`
- [ ] Try pressing again - should show "Demo Mode already active"

**If Fails:**
- Check browser console for errors in DemoModeListener.tsx
- Verify event listener is attached to window
- Add fallback "Enable Demo Mode" button in navigation

---

#### TEST 2: Verify Page - Happy Path
**Files:**
- `apps/web/app/verify/[address]/page.tsx`
- `apps/web/components/verify/*.tsx`

**Steps:**
1. Navigate to: `http://localhost:3000/verify/0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48`
   (Use any valid Sepolia address)
2. Enter skill: `react-card` (or any skill)
3. Click "Verify" button

**Expected Components:**
- [ ] **CredentialCard** - Shows score badge (Gold/Green/Orange based on score)
- [ ] **TrustIndicators** - Shows "Blockchain Verified", "TEE Signed", "IPFS Permanent"
- [ ] **RubricBreakdown** - Shows 4 progress bars (40/30/20/10 breakdown)
- [ ] **MilestoneTimeline** - Shows 5 connected nodes with scores
- [ ] **ShareActions** - Shows Copy Link, QR Code, X Share, LinkedIn buttons

**Click Tests:**
- [ ] "Copy Link" → Clipboard has verify URL
- [ ] "View on Etherscan" → Opens Sepolia Etherscan (new tab)
- [ ] "View Code on IPFS" → Opens IPFS gateway (new tab)
- [ ] QR Code → Image renders and is scannable
- [ ] "Share on X" → Opens Twitter intent with pre-filled text
- [ ] "Share on LinkedIn" → Opens LinkedIn share dialog
- [ ] "Download Certificate" → Shows "Coming Soon" toast

**If Data Doesn't Load:**
- Check if Demo Mode is active (shows mock data)
- Check browser console for contract read errors
- Verify address has actual attestation on Sepolia
- Enable Demo Mode if testing with non-deployed address

---

#### TEST 3: Verify Page - Empty State
**File:** `apps/web/components/verify/EmptyState.tsx`

**Steps:**
1. Navigate to: `http://localhost:3000/verify/0x0000000000000000000000000000000000000000000`
2. Enter any skill (e.g., "react-card")
3. Click "Verify" button

**Expected:**
- [ ] **EmptyState** component renders
- [ ] Message: "This address hasn't completed any challenges for "react-card" yet."
- [ ] Button: "Explore Skills" → Links to `/sovereign`
- [ ] Button: "Go Home" → Links to `/`
- [ ] No console errors

---

### Priority 2: Nice to Have

#### TEST 4: OG Image Generation
**File:** `apps/web/app/verify/[address]/opengraph-image.tsx`

**Steps:**
1. Open browser DevTools → Network tab
2. Visit: `http://localhost:3000/verify/0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48/opengraph-image?skill=react&score=88`
3. Check Network tab for `opengraph-image` request
4. Click request → Preview response

**Expected:**
- [ ] Returns PNG image (Content-Type: image/png)
- [ ] Image contains: "VERIFIED SKILL CREDENTIAL"
- [ ] Image shows: "88/100" score
- [ ] Image shows: "react" skill name
- [ ] Image shows: Truncated address
- [ ] Image shows: "RTFM-Sovereign" badge
- [ ] No errors in console

**If Fails:**
- OG image is bonus feature, document as "known issue"
- Not critical for demo day

---

#### TEST 5: Mobile Responsiveness
**Files:** All verify page components

**Steps:**
1. Open DevTools → Toggle Device Toolbar (Ctrl+Shift+M)
2. Select "iPhone SE" (375x667)
3. Navigate to verify page with valid attestation
4. Test scroll, tap, and interactions

**Checks:**
- [ ] CredentialCard doesn't overflow horizontally
- [ ] RubricBreakdown bars are readable (not too narrow)
- [ ] MilestoneTimeline is scrollable or wrapped
- [ ] Share buttons are tappable (not too small, min 44px height)
- [ ] Text is readable (no microscopic fonts)
- [ ] QR Code is scannable (not distorted)
- [ ] No horizontal scroll on page

**If Fails:**
- Add CSS breakpoints or horizontal scroll
- Reduce padding on small screens: `px-4 md:px-8`
- Stack grid on mobile: `grid-cols-1 md:grid-cols-2`

---

## 🔧 Technical Debt

### High Priority

#### DEBT 1: Demo Mode Fallback UI
**Location:** `apps/web/components/DemoModeListener.tsx`

**Issue:** No visual indicator of demo mode status in UI

**Solution:**
- Add "Demo Mode Active" badge in header when `isDemoMode() === true`
- Color: Yellow/Orange to distinguish from production
- Position: Top-right corner, persistent on all pages

**Estimated Time:** 30 minutes

---

#### DEBT 2: Contract Transaction Hash
**Location:** `apps/web/hooks/useVerifyAttestation.ts:52`

**Issue:** `transactionHash` is hardcoded to empty string

**Current Code:**
```typescript
setAttestation({
  exists: true,
  score: Number(score),
  timestamp: Number(timestamp),
  signature,
  ipfsHash,
  transactionHash: '',  // ← Empty string
  milestoneScores: [85, 88, 90, 87, 92]
});
```

**Solution:**
- Fetch transaction hash from event logs after contract call
- Use `getTransactionReceipt` from wagmi
- Or add event listener on contract `AttestationCreated` event

**Estimated Time:** 1-2 hours

---

#### DEBT 3: IPFS Timeout Handling
**Location:** `apps/web/lib/ipfs.ts`

**Issue:** 5-second timeout might be too aggressive for slow networks

**Current Code:**
```typescript
export async function fetchIpfsContent<T = any>(hash: string, timeout: number = 5000): Promise<T | null> {
```

**Solution:**
- Increase timeout to 10-15 seconds
- Add retry logic with exponential backoff
- Show loading state during fetch

**Estimated Time:** 45 minutes

---

### Medium Priority

#### DEBT 4: PDF Certificate Download
**Location:** `apps/web/components/verify/ShareActions.tsx`

**Issue:** "Download Certificate" button shows "Coming Soon" toast

**Solution Options:**
- Use `jspdf` library for PDF generation
- Use `html2canvas` to screenshot certificate component
- Generate PDF on server with Puppeteer

**Estimated Time:** 3-4 hours

---

#### DEBT 5: E2E Tests
**Location:** New file `apps/web/__tests__/e2e/verify.spec.ts`

**Issue:** No automated end-to-end tests for verify page

**Tests to Add:**
1. User navigates to verify page with valid address
2. User enters skill and clicks verify
3. CredentialCard renders with correct score
4. User clicks "Copy Link" button
5. User navigates to verify page with invalid address
6. EmptyState renders

**Solution:**
- Use Playwright or Cypress
- Test with real browser automation
- Run in CI/CD pipeline

**Estimated Time:** 4-6 hours

---

### Low Priority

#### DEBT 6: OG Image Caching
**Location:** `apps/web/app/verify/[address]/opengraph-image.tsx`

**Issue:** Edge runtime disables static generation for OG images

**Current Code:**
```typescript
export const runtime = 'edge';
```

**Solution:**
- Move to Node.js runtime
- Enable ISR (Incremental Static Regeneration)
- Cache OG images for 24 hours

**Estimated Time:** 1 hour

---

#### DEBT 7: Milestone IPFS Data
**Location:** `apps/web/components/verify/MilestoneTimeline.tsx`

**Issue:** `milestoneScores` are hardcoded mock data

**Current Code:**
```typescript
milestoneScores: [85, 88, 90, 87, 92]  // ← Mock data
```

**Solution:**
- Fetch actual milestone scores from contract
- Store in IPFS with attestation data
- Add `milestones` array to `AttestationData` interface

**Estimated Time:** 2-3 hours

---

#### DEBT 8: Error Boundaries
**Location:** All verify page components

**Issue:** No error boundaries to catch runtime errors

**Solution:**
- Add React Error Boundary wrapper
- Show fallback UI with "Something went wrong"
- Add "Try Again" button
- Log errors to monitoring service

**Estimated Time:** 2 hours

---

## 🚀 Demo Day Checklist

### Before Demo (Must Do)
- [ ] Run production build: `npm run build` ✅ COMPLETED
- [ ] Start dev server: `npm run dev` ✅ RUNNING
- [ ] Test Demo Mode: Shift+D x3 (PENDING)
- [ ] Test Verify Page with valid address (PENDING)
- [ ] Test Verify Page with invalid address (PENDING)
- [ ] Have backup address ready if staking fails (PENDING)

### During Demo (Best Practices)
- [ ] Enable Demo Mode first thing for safe presentation
- [ ] Have multiple test addresses ready
- [ ] Use Shift+D x3 if blockchain is slow
- [ ] Share verify URL on screen for judges
- [ ] Show OG image preview for social sharing

### After Demo (Post-Hackathon)
- [ ] Fix high priority debt items
- [ ] Add E2E tests for critical paths
- [ ] Implement PDF certificate generation
- [ ] Add monitoring/error tracking
- [ ] Write post-hackathon blog post

---

## 📊 Time Estimates

| Priority | Tasks | Estimated Time |
|----------|---------|----------------|
| Manual Testing | 5 tests | 30-45 minutes |
| High Priority Debt | 3 items | 2-3 hours |
| Medium Priority Debt | 2 items | 7-10 hours |
| Low Priority Debt | 4 items | 6-7 hours |
| **Total** | **14 items** | **15-20 hours** |

---

## 🎯 Success Criteria

**Stop When:**
- [x] Production build passes
- [x] Dev server running
- [ ] Demo Mode activates with Shift+D x3
- [ ] Verify Page shows credential (or empty state gracefully)
- [ ] Mobile layout is usable
- [ ] No critical errors in console

**If Issues Found:**
- Fix what you can in 15 minutes
- Document rest in this file with "workaround: use Demo Mode"
- Prioritize fixes for demo day impact

---

## 💡 Quick Wins (If Time Permits)

1. **Add Demo Mode Badge** - Visual indicator in header (15 min)
2. **Fix IPFS Timeout** - Increase to 10 seconds (10 min)
3. **Add Loading States** - Show skeleton during fetch (20 min)
4. **Mobile Improvements** - Fix button tap targets (30 min)

---

**Remember:** Demo Mode is your insurance policy. If Verify Page has issues with real data, Demo Mode shows mock data perfectly.

**Execute tests. Fix what breaks. Document everything. Report back.**
