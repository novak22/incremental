# Learnly Browser App

## Goal
Reimagine the education experience inside the browser shell as a dedicated Learnly portal that mirrors modern course platforms. Players should be able to browse, enroll, and manage study tracks without losing any backend logic or bonuses.

## Player Impact
- Centralizes the full education catalog in a storefront-style layout with category filters, detailed sales pages, and a pricing FAQ.
- Makes active enrollments easier to track thanks to progress bars, reserved-hours callouts, and quick actions to continue or drop a course.
- Highlights skill rewards, hustle bonuses, and XP certificates so players see why finishing a course matters.

## Key Details
- Catalog view organizes courses by skill constellations such as Writing & Storycraft, Promotion & Funnels, and Technical Skills. Badges surface the focus areas directly on each card.
- Free Courses tab curates tuition-free jumpstarts that now run as focused 4h/day intensives, awarding enough XP to reach level 1 in their headline skill and instantly unlock BlogPress, VideoTube, DigiShelf, Shopily, and ServerHub once you graduate.
- Completed courses drop out of the catalog once you graduate so the grid always spotlights fresh study leads.
- Course detail pages reuse existing descriptions, tuition, duration, and bonus definitions, adding sections for “What you’ll learn,” “Requirements,” and “Certificate of Completion.”
- My Courses tab lists active and completed enrollments, displaying hours reserved per day, tuition already paid, and a drop-course confirmation that keeps tuition sunk.
- Active enrollments float to the top of the My Courses list so the next study session is never buried beneath old certificates.
- Pricing Info tab explains tuition, time reservation, and graduation rewards so new players understand how Learnly interacts with their schedule and income.
- Browser navigation mirrors Learnly’s tabs, mapping the workspace URL to `/catalog`, `/my-courses`, or `/pricing` for easy orientation.
- The module reuses the existing knowledge track registry so XP rewards, unlocks, and study progress remain in sync with backend systems.

## Workspace Architecture
- The Learnly workspace is orchestrated by `createTabbedWorkspacePresenter`, which builds tab navigation, hero metrics, and view routing so catalog, free courses, My Courses, detail, and pricing screens share URL segments and state transitions.【F:src/ui/views/browser/components/learnly/createLearnlyWorkspace.js†L378-L502】
- Tab buttons surface badges for free offerings and active enrollments, while the hero band highlights total catalog size, reserved hours, and current enrollments drawn from the aggregated course context.【F:src/ui/views/browser/components/learnly/createLearnlyWorkspace.js†L278-L319】【F:src/ui/views/browser/components/learnly/views/tabNavigation.js†L3-L37】
- Course detail pages now include back-navigation tied to the originating tab, skill highlight lists, and CTAs that enroll or deep link into My Courses depending on progress state.【F:src/ui/views/browser/components/learnly/views/detailView.js†L9-L139】【F:src/ui/views/browser/components/learnly/views/detailView.js†L140-L175】
- My Courses sorts in-progress enrollments to the top and reiterates reserved time and sunk tuition so the daily plan is visible without opening detail views.【F:src/ui/views/browser/components/learnly/views/myCoursesView.js†L4-L55】

## Follow-up Tech Debt
- Dropping a course still relies on the browser `window.confirm` prompt; swap in the shared shell modal so the experience matches other workspace confirmations and remains themeable.【F:src/ui/views/browser/components/learnly/createLearnlyWorkspace.js†L494-L503】
