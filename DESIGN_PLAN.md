# HealthSync Redesign Plan

> **Created:** April 19, 2026  
> **Status:** Planning Phase  
> **Scope:** Landing Page, Settings Page, Pricing Page, Auth Flow

---

## Executive Summary

This plan outlines a comprehensive redesign of HealthSync's frontend to create a professional, trustworthy healthcare SaaS experience. The redesign replaces proprietary Coinbase-specific elements with practical, healthcare-appropriate alternatives while maintaining the clean, professional aesthetic.

---

## 1. Design System Foundation

### 1.1 Color Palette (Healthcare-Optimized)

**Primary Colors:**
| Role | Current (Coinbase) | New (Healthcare) | Usage |
|------|-------------------|------------------|-------|
| Brand Primary | `#0052ff` (Blue) | `#0ea5a4` (Teal) | Trust, calm, medical |
| Brand Hover | `#578bfa` | `#14b8a6` | Interactive states |
| Background Light | `#ffffff` | `#ffffff` | Primary surface |
| Background Dark | `#0a0b0d` | `#0f172a` | Dark sections |
| Secondary Surface | `#eef0f3` | `#f1f5f9` | Cards, secondary UI |
| Success | - | `#22c55e` | Confirmations, health metrics |
| Warning | - | `#f59e0b` | Alerts, pending states |
| Error | `#ef4444` | `#ef4444` | Errors, destructive actions |

**Rationale:** Teal/green tones are standard in healthcare (calming, associated with health/wellness) vs. financial blue of Coinbase.

### 1.2 Typography (Google Fonts - Production Ready)

| Role | Current (Proprietary) | New (Google Fonts) | Size | Weight | Line Height |
|------|----------------------|-------------------|------|--------|-------------|
| Display Hero | CoinbaseDisplay 80px | **Plus Jakarta Sans** 72px | 72px | 700 | 1.1 |
| Section Heading | CoinbaseSans 36px | **Plus Jakarta Sans** 36px | 36px | 600 | 1.2 |
| Body Large | CoinbaseText 18px | **Inter** 18px | 18px | 400 | 1.6 |
| Body | CoinbaseText 16px | **Inter** 16px | 16px | 400 | 1.5 |
| UI/Buttons | CoinbaseSans 16px | **Plus Jakarta Sans** 16px | 16px | 600 | 1.2 |
| Mono/Code | - | **JetBrains Mono** | 14px | 400 | 1.5 |

**Font Stack Implementation:**
```css
--font-sans: 'Inter', sans-serif;
--font-display: 'Plus Jakarta Sans', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

### 1.3 Border Radius Scale (Updated)

| Element | Radius | Tailwind Class |
|---------|--------|----------------|
| Buttons (Primary) | 9999px (pill) | `rounded-full` |
| Buttons (Secondary) | 8px | `rounded-lg` |
| Cards | 12px | `rounded-xl` |
| Inputs/Forms | 8px | `rounded-lg` |
| Modals/Dialogs | 16px | `rounded-2xl` |
| Badges/Tags | 9999px | `rounded-full` |

### 1.4 Shadow System (Subtle Depth)

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
```

---

## 2. Landing Page Redesign

### 2.1 Page Structure

```
┌─────────────────────────────────────────────────────────┐
│ NAVBAR (Floating, Glass)                                │
│ Logo + Nav Links + CTA                                  │
├─────────────────────────────────────────────────────────┤
│ HERO SECTION (White)                                    │
│ Headline + Subheadline + Primary CTA + Secondary CTA    │
│ Hero Image/Illustration                                 │
├─────────────────────────────────────────────────────────┤
│ SOCIAL PROOF (Light Gray #f1f5f9)                       │
│ "Trusted by healthcare providers" + Logos               │
├─────────────────────────────────────────────────────────┤
│ FEATURES GRID (White)                                   │
│ 6 Feature Cards with Icons                              │
├─────────────────────────────────────────────────────────┤
│ HOW IT WORKS (Dark #0f172a)                             │
│ 3-Step Process with Visual Flow                         │
├─────────────────────────────────────────────────────────┤
│ TESTIMONIALS (White)                                    │
│ 3 Testimonial Cards                                     │
├─────────────────────────────────────────────────────────┤
│ PRICING PREVIEW (Light Gray)                            │
│ 3 Tier Cards + "View All Plans" CTA                     │
├─────────────────────────────────────────────────────────┤
│ CTA BANNER (Primary Color)                              │
│ "Ready to transform your practice?" + CTA               │
├─────────────────────────────────────────────────────────┤
│ FOOTER (Dark)                                           │
│ Links, Legal, Social                                    │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Component Specifications

**Navbar (Floating Glass):**
```tsx
<nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl z-50">
  <div className="backdrop-blur-md bg-white/80 dark:bg-slate-900/80 
                  border border-slate-200/50 dark:border-slate-700/50
                  rounded-full px-6 py-3 shadow-lg">
    {/* Logo, Nav Links, Auth Buttons */}
  </div>
</nav>
```

**Hero Section:**
```tsx
<section className="min-h-screen flex items-center pt-32 pb-20 px-4">
  <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
    {/* Left: Content */}
    <div>
      <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold 
                     text-slate-900 dark:text-white leading-[1.1]">
        Medical Documentation,
        <span className="text-teal-600"> Reimagined</span>
      </h1>
      <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 
                    mt-6 leading-relaxed">
        AI-powered clinical notes that write themselves. Focus on your 
        patients while HealthSync handles the documentation.
      </p>
      <div className="flex flex-wrap gap-4 mt-8">
        <Button size="lg" className="rounded-full px-8 h-12 text-base">
          Start Free Trial
        </Button>
        <Button variant="outline" size="lg" className="rounded-full px-8 h-12">
          Watch Demo
        </Button>
      </div>
    </div>
    {/* Right: Hero Visual */}
    <div className="relative">
      {/* Abstract medical/tech illustration */}
    </div>
  </div>
</section>
```

### 2.3 Key Changes from DESIGN.md

| Original (Coinbase) | New (HealthSync) | Reason |
|--------------------|------------------|--------|
| Coinbase Blue `#0052ff` | Teal `#0ea5a4` | Healthcare-appropriate |
| CoinbaseDisplay font | Plus Jakarta Sans | Open-source, available |
| CoinbaseSans font | Inter | Industry standard |
| 56px button radius | Full pill (9999px) | Modern SaaS standard |
| Near-black `#0a0b0d` | Slate `#0f172a` | Softer, more accessible |
| Cool gray `#eef0f3` | Slate `#f1f5f9` | Better contrast |

---

## 3. Settings Page Redesign

### 3.1 New Structure

```
┌─────────────────────────────────────────────────────────┐
│ PAGE HEADER                                             │
│ Title: "Settings"                                       │
│ Subtitle: "Manage your account and preferences"         │
├─────────────────────────────────────────────────────────┤
│ TWO-COLUMN LAYOUT                                       │
├──────────────────────┬──────────────────────────────────┤
│ SIDEBAR NAV (Left)   │ CONTENT AREA (Right)             │
│ - Account            │ - Dynamic content based on       │
│ - Profile            │   selected sidebar item          │
│ - Notifications      │                                  │
│ - Security           │                                  │
│ - Billing            │                                  │
│ - Preferences        │                                  │
└──────────────────────┴──────────────────────────────────┘
```

### 3.2 Settings Sections

**Account Tab:**
- User profile card (avatar, name, email)
- Profile form (username, profession, full name)
- Account metadata (member since, last login)

**Profile Tab:**
- Detailed professional information
- Specialty/tags selection
- Bio/description textarea
- Profile visibility toggle

**Notifications Tab:**
- Email notifications toggle group
- Appointment reminders
- Session summaries
- Marketing communications opt-in
- Notification frequency selector

**Security Tab:**
- Password change form
- Two-factor authentication setup
- Active sessions list
- Login history

**Billing Tab:**
- Current plan display
- Usage statistics
- Upgrade/Downgrade CTAs
- Payment method management
- Billing history

**Preferences Tab:**
- Theme selector (Light/Dark/System)
- Language selector
- Timezone
- Date/time format

### 3.3 Component Design

**Sidebar Navigation:**
```tsx
<aside className="w-64 border-r border-slate-200 dark:border-slate-700 pr-6">
  <nav className="space-y-1">
    {settingsSections.map((section) => (
      <button
        key={section.id}
        className={`w-full flex items-center gap-3 px-3 py-2.5 
                    rounded-lg text-sm font-medium transition-colors
                    ${isActive ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400' 
                               : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
      >
        <section.icon className="w-5 h-5" />
        {section.label}
      </button>
    ))}
  </nav>
</aside>
```

**Form Cards:**
```tsx
<Card className="border border-slate-200 dark:border-slate-700 shadow-sm">
  <CardHeader>
    <CardTitle className="text-lg font-semibold">Section Title</CardTitle>
    <CardDescription className="text-sm text-slate-500">
      Helpful description text
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Form fields */}
  </CardContent>
</Card>
```

---

## 4. Pricing Page Redesign

### 4.1 Page Structure

```
┌─────────────────────────────────────────────────────────┐
│ HEADER                                                  │
│ Title: "Simple, transparent pricing"                    │
│ Subtitle: "Choose the plan that fits your practice"     │
│ Toggle: Monthly / Annual (Save 20%)                     │
├─────────────────────────────────────────────────────────┤
│ PRICING CARDS (3 Columns)                               │
│ ┌─────────┬──────────────┬──────────────┐              │
│ │ Free │ Professional │ Enterprise   │              │
│ │ $0/mo  │ $20/mo       │ $100/mo      │              │
│ │ Features│ ✓✓✓✓✓✓✓      │ ✓✓✓✓✓✓✓✓     │              │
│ │ CTA     │ CTA          │ Contact      │              │
│ └─────────┴──────────────┴──────────────┘              │
├─────────────────────────────────────────────────────────┤
│ FEATURE COMPARISON TABLE                                │
│ Detailed feature matrix                                 │
├─────────────────────────────────────────────────────────┤
│ FAQ SECTION                                             │
│ Common questions accordion                              │
├─────────────────────────────────────────────────────────┤
│ CTA BANNER                                              │
│ "Still have questions?"                                 │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Pricing Card Design

```tsx
<Card className={`relative flex flex-col p-8 rounded-2xl transition-all
  ${plan.highlighted 
    ? 'border-teal-500 shadow-xl scale-105 z-10' 
    : 'border-slate-200 dark:border-slate-700 shadow-md'}`}>
  
  {/* Popular Badge */}
  {plan.highlighted && (
    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 
                      bg-teal-500 text-white px-4 py-1 rounded-full 
                      text-sm font-medium">
      Most Popular
    </Badge>
  )}

  <CardHeader className="text-center">
    <CardTitle className="text-2xl font-bold">{plan.title}</CardTitle>
    <CardDescription>{plan.description}</CardDescription>
  </CardHeader>

  <CardContent className="flex-1">
    <div className="text-center mb-6">
      <span className="text-5xl font-bold">${isAnnual ? plan.annual / 12 : plan.monthly}</span>
      <span className="text-slate-500 ml-2">/month</span>
      {isAnnual && (
        <Badge variant="secondary" className="mt-2">
          Save ${plan.monthly * 12 - plan.annual}
        </Badge>
      )}
    </div>

    <ul className="space-y-3">
      {plan.features.map((feature, i) => (
        <li key={i} className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
          <span className="text-slate-600 dark:text-slate-300">{feature}</span>
        </li>
      ))}
    </ul>
  </CardContent>

  <CardFooter>
    <Button 
      className={`w-full h-12 rounded-full text-base font-medium
        ${plan.highlighted 
          ? 'bg-teal-600 hover:bg-teal-700' 
          : 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900'}`}
    >
      {plan.cta || 'Get Started'}
    </Button>
  </CardFooter>
</Card>
```

### 4.3 Feature Comparison Table

| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| Sessions/month | 50 | Unlimited | Unlimited |
| AI Processing | Basic | Advanced | Advanced + Custom |
| Patient Management | ✓ | ✓ | ✓ |
| Team Collaboration | - | ✓ | ✓ |
| API Access | - | - | ✓ |
| Priority Support | - | ✓ | 24/7 |
| Custom Integrations | - | - | ✓ |

---

## 5. Authentication Flow Updates

### 5.1 Route Protection Strategy

**Current Issue:** Root (`/`) redirects authenticated users to `/dashboard` and unauthenticated to `/login`.

**New Strategy:**
```
/ → Landing Page (public)
/dashboard → Protected (redirects to / if not authenticated)
/login → Public (redirects to /dashboard if authenticated)
/signup → Public (redirects to /dashboard if authenticated)
/pricing → Public
/settings → Protected
/chatbot → Protected
/patients → Protected
/sessions → Protected
/appointments → Protected
/record-session → Protected
```

### 5.2 Protected Route Component Update

```tsx
// components/auth/ProtectedRoute.tsx
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !session) {
      // Redirect to landing page, not login
      router.push(`/`);
    }
  }, [session, loading, router]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
}
```

### 5.3 Login Page Redirect Logic

```tsx
// After successful login
const redirect = searchParams.get("redirect") || "/dashboard";
router.push(redirect);

// Handle OAuth callback
// /auth/callback?redirect=/dashboard
```

### 5.4 Middleware for Route Protection (Recommended)

```ts
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

const publicPaths = ['/', '/login', '/signup', '/pricing', '/auth/callback']

export async function middleware(request: Request) {
  const response = NextResponse.next()
  const supabase = createServerClient(...)
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = new URL(request.url)

  // If no session and trying to access protected route
  if (!session && !publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // If logged in and trying to access auth pages
  if (session && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}
```

---

## 6. Files to Create/Modify

### 6.1 New Files to Create

```
frontend/
├── app/
│   ├── page.tsx                    # REPLACE - Landing page
│   ├── pricing/
│   │   └── page.tsx                # NEW - Pricing page
│   ├── settings/
│   │   └── page.tsx                # MODIFY - Settings redesign
│   └── layout.tsx                  # MODIFY - Font imports
├── components/
│   ├── landing/
│   │   ├── hero-section.tsx        # NEW
│   │   ├── features-section.tsx    # NEW
│   │   ├── how-it-works.tsx        # NEW
│   │   ├── testimonials.tsx        # NEW
│   │   ├── pricing-preview.tsx     # NEW
│   │   ├── cta-banner.tsx          # NEW
│   │   └── landing-navbar.tsx      # NEW
│   ├── settings/
│   │   ├── settings-sidebar.tsx    # NEW
│   │   ├── account-section.tsx     # NEW
│   │   ├── profile-section.tsx     # NEW
│   │   ├── notifications-section.tsx # NEW
│   │   ├── security-section.tsx    # NEW
│   │   ├── billing-section.tsx     # NEW
│   │   └── preferences-section.tsx # NEW
│   └── pricing/
│       ├── pricing-toggle.tsx      # NEW
│       ├── pricing-card.tsx        # NEW
│       ├── feature-comparison.tsx  # NEW
│       └── pricing-faq.tsx         # NEW
├── lib/
│   └── fonts.ts                    # NEW - Font configurations
└── styles/
    └── globals.css                 # MODIFY - Update design tokens
```

### 6.2 Files to Modify

| File | Changes |
|------|---------|
| `frontend/app/globals.css` | Update CSS variables, fonts, colors |
| `frontend/app/layout.tsx` | Update font imports |
| `frontend/app/page.tsx` | Complete rewrite → Landing page |
| `frontend/app/settings/page.tsx` | Complete rewrite → New settings layout |
| `frontend/app/upgrade/page.tsx` | Redirect to `/pricing` or update design |
| `frontend/components/auth/ProtectedRoute.tsx` | Update redirect logic |
| `frontend/components/Navbar.tsx` | Update for app interior navbar |
| `frontend/components/theme-provider.tsx` | Ensure proper dark mode |

### 6.3 Files to Keep Unchanged

- All backend files
- All API routes
- Auth context logic
- Supabase client
- Dashboard pages
- Patient management
- Chatbot functionality
- Session recording

---

## 7. Implementation Phases

### Phase 1: Foundation (Priority: CRITICAL)
1. Update `globals.css` with new design tokens
2. Update font imports in `layout.tsx`
3. Create `lib/fonts.ts` for font configurations

### Phase 2: Landing Page (Priority: HIGH)
1. Create `components/landing/*` components
2. Rewrite `app/page.tsx` as landing page
3. Create `components/landing/landing-navbar.tsx`
4. Test responsive behavior

### Phase 3: Pricing Page (Priority: HIGH)
1. Create `app/pricing/page.tsx`
2. Create `components/pricing/*` components
3. Implement monthly/annual toggle
4. Add FAQ accordion

### Phase 4: Settings Page (Priority: MEDIUM)
1. Create `components/settings/*` components
2. Rewrite `app/settings/page.tsx`
3. Implement sidebar navigation
4. Add all settings sections

### Phase 5: Auth Flow (Priority: CRITICAL)
1. Update `ProtectedRoute.tsx` redirect logic
2. Update login page redirects
3. Add middleware for route protection
4. Test all auth flows

### Phase 6: Polish & Testing (Priority: HIGH)
1. Test light/dark mode on all pages
2. Test responsive breakpoints (375px, 768px, 1024px, 1440px)
3. Verify accessibility (contrast, keyboard nav, focus states)
4. Check for hydration errors
5. Performance audit

---

## 8. Technical Considerations

### 8.1 Hydration Error Prevention

```tsx
// Use suppressHydrationWarning for dynamic content
<html suppressHydrationWarning>

// Use client-only components with useEffect
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return null;
```

### 8.2 Dynamic Class Names

```tsx
// Use template literals, not conditionals that differ server/client
className={`bg-${color}-500`} // ❌ Can cause hydration mismatch
className={color === 'red' ? 'bg-red-500' : 'bg-blue-500'} // ✅ Safe
```

### 8.3 Tailwind v4 Compatibility

The project uses Tailwind v4. Key considerations:
- Use `@import "tailwindcss"` (already done)
- CSS variables work natively with `oklch()`
- Use `@theme inline` for custom utilities

### 8.4 Dark Mode Strategy

```tsx
// Use next-themes (already installed)
import { useTheme } from 'next-themes';

// Toggle
<button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
```

---

## 9. Accessibility Checklist

- [ ] All interactive elements have visible focus states
- [ ] Color contrast ratio ≥ 4.5:1 for body text
- [ ] Color contrast ratio ≥ 3:1 for UI components
- [ ] All images have descriptive alt text
- [ ] Form inputs have associated labels
- [ ] Error messages are associated with inputs (aria-describedby)
- [ ] Loading states announced to screen readers
- [ ] Skip link to main content
- [ ] Keyboard navigation works (Tab order)
- [ ] Reduced motion respected (prefers-reduced-motion)

---

## 10. Questions for User

Before implementation, please confirm:

1. **Pricing Tiers:** Are the current prices ($29/$79/$199) correct, or should they be adjusted? Answer: Change them to "Free: $0/month"; "Pro: $20/month" and "Enterprise: $100/month" <- Updated in the table above

2. **Features List:** Should the features for each pricing tier remain the same, or need updates? Answer: Restrict chatbot usage to Pro and enterprise tier

3. **Landing Page Content:** Do you have specific copy/taglines for the hero section, or should I create placeholder content? Answer: Create placeholder for now

4. **Testimonials:** Do you have real testimonials to include, or should I use placeholders? Answer: Use placeholders

5. **Logo:** Should I use a text-based logo or do you have an SVG logo file? Answer: Text based for now

6. **Images/Illustrations:** Do you have brand assets, or should I use abstract CSS-based visuals/placeholders? Answer: Abstract

7. **Settings Sections:** Are all 6 settings sections (Account, Profile, Notifications, Security, Billing, Preferences) needed? Answer: Yes

8. **Billing Integration:** For the Billing tab, do you have a payment processor (Stripe, Lemon Squeezy) already integrated? Answer: No

---

## 11. Success Criteria

- [ ] Landing page loads in < 2 seconds
- [ ] All pages pass Lighthouse accessibility audit (90+)
- [ ] No hydration errors in development or production
- [ ] Dark mode works consistently across all pages
- [ ] Mobile responsive (375px - 1440px)
- [ ] Auth redirects work correctly
- [ ] Settings page saves all changes
- [ ] Pricing page toggle updates prices correctly

---

**Next Steps:**
1. User reviews and approves this plan
2. Answer questions in Section 10
3. Implementation begins with Phase 1 (Foundation)
4. Each phase tested before proceeding to next
