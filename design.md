# Warehouse Autonomy — Frontend Design Specification

**Document purpose:** Visual and interaction specification for the targeted frontend refinement of the existing Warehouse Autonomy application.

**Scope:** (1) correct layout and text alignment across the current frontend, (2) add a Team Claude007 Glyph Portal welcome experience using the supplied 21st.dev component, and (3) introduce cohesive page transitions, scroll motion and micro-interactions.

**This document is a design contract.** The implementation agent must read it completely before editing code. It does not authorize changes to the Flask backend, Python search algorithms, API contracts, warehouse data model, search-event model or experimental calculations.

---

## 1. Design intent and product identity

The product remains **WAREHOUSE AUTONOMY**, an academic warehouse-robot search simulator built around BFS, DFS and Uniform-Cost Search.

The existing main application already uses a dark industrial/editorial visual direction with near-black surfaces, vivid lime accents, Anton display typography and Inter body typography. Preserve that identity. Do not redesign the main application into a white website.

Add a separate, temporary welcome experience inspired by the supplied Glyph Portal / “Sublime” reference. The welcome screen uses a clean white paper surface and deep-green oversized typography. After the portal transition, the user enters the existing dark-and-lime Overview page.

The experience has two deliberately distinct visual states:

1. **Welcome portal:** minimal white/off-white surface, deep-green giant wordmark, restrained grey copy and a dark-green entry button.
2. **Main application:** the existing Warehouse Autonomy near-black and lime interface, with its current content, navigation and functionality preserved.

The transition between these states should feel intentional and polished. Do not blend the portal's white/green palette into the main application's dark/lime theme.

## 2. Reference behaviour

Use the supplied screenshots and the supplied `glyph-portal.tsx` source as the implementation references.

The reference portal has:

- a full-viewport white opening surface;
- a small brand mark at the upper-left;
- a restrained descriptor at the upper-right;
- a short centred eyebrow above the main word;
- one extremely large, heavy, centred wordmark;
- a short centred supporting line below it;
- a dark-green rounded entry CTA;
- a small scroll hint near the lower edge;
- a scroll-driven zoom through the selected letter;
- a deep-green field revealed behind the zooming glyph;
- a follow-on content area visible after the zoom completes.

Adapt the brand and copy for Warehouse Autonomy. Do not retain the Sublime brand name, gym copy or unrelated content.

## 3. Design tokens

### 3.1 Main application tokens — preserve existing values

Use the current project's existing design tokens as the source of truth. The following are the intended visual anchors; do not duplicate or redefine them if equivalent tokens already exist:

| Token / purpose | Value / direction |
|---|---|
| Main page background | `#0A0B0C` |
| Main lime accent | `#C8FF2E` |
| Main primary text | Warm off-white, matching current theme |
| Main secondary text | Muted cool grey, matching current theme |
| Main surfaces | Dark charcoal / raised charcoal |
| Main borders | Subtle charcoal-grey, one-pixel appearance |
| Display type | Anton |
| Body/UI type | Inter |

Keep the established BFS / DFS / UCS colours and existing chart colours unless already defined by the current application. Do not change semantic data colours as part of this task.

### 3.2 Glyph Portal tokens — scoped to welcome experience only

Use these values only inside the welcome component, scoped by a unique portal root/class so they cannot leak into the main app:

| Token | Value |
|---|---|
| Portal paper | `#FFFFFF` |
| Portal ink | `#0C1212` |
| Portal field / deep green | `#0B3B2A` |
| Portal alternate green | `#14573F` |
| Portal deep shade | `#082D22` |
| Portal foreground | `#FBFBFA` |
| Portal muted text | `#71766F` |
| Portal button | `#142B22` |
| Portal button hover | `#204434` |

Use the original component's green radial/linear field treatment where available. Keep the gradient understated and deep; avoid bright emerald gradients, neon glow, or unrelated colours.

## 4. Typography

### 4.1 Main application

Preserve the existing `design.md` / application typography system:

- **Anton:** display headlines, high-impact numeric/statistic displays and selected short labels.
- **Inter:** paragraphs, navigation, controls, captions, tables, chart labels and body content.

Do not globally replace the current fonts or font weights.

### 4.2 Welcome portal

- Main giant word: Anton or the closest already-loaded heavy condensed display face.
- Small brand, descriptor, eyebrow, supporting sentence and CTA: Inter.
- The portal's measured SVG glyph must use a font that is loaded before the portal measures the letter geometry. Avoid swapping font faces after the component has calculated glyph bounds.
- Provide a robust fallback stack such as `Anton, Impact, "Arial Black", sans-serif`.
- Do not use or fetch the private/custom WOFF font referenced by the demo wrapper. Use the project's loaded font assets or a dependable fallback.

### 4.3 Text hierarchy

The welcome wordmark is the dominant visual element. Supporting text must not compete with it. Use fluid sizes with `clamp()` and avoid clipping the wordmark at supported desktop, tablet and mobile widths.

## 5. Welcome screen: Team Claude007

### 5.1 Exact content

Use this content unless a current application naming convention requires only a small wording adjustment:

- Upper-left brand: **Team Claude007**
- Upper-right descriptor: **Autonomous Warehouse Robotics**
- Eyebrow: **A smarter route to intelligent warehouse automation starts here.**
- Main wordmark: **TEAM CLAUDE007**
- Supporting line: **Search. Navigate. Retrieve.**
- Primary CTA: **Enter the Warehouse** with a small diagonal/down-right arrow.
- Bottom hint: **Scroll for a closer look ↓**

The giant wordmark must say `TEAM CLAUDE007`; the small brand must read `Team Claude007`. Do not show `SUBLIME` anywhere in the delivered UI.

### 5.2 Composition

The welcome screen should fill the available browser viewport and feel calm, spacious and editorial.

- Use a white/off-white surface.
- Keep the top brand and descriptor on one horizontal line with generous side insets.
- Centre the eyebrow above the wordmark.
- Centre the oversized wordmark both horizontally and visually within the opening composition.
- Place the supporting line below the wordmark.
- Place the CTA below the supporting line with clear breathing room.
- Position the small scroll hint near the lower edge.
- Use a restrained layout; no cards, sidebars, analytics or main-app navigation on this screen.
- Use a clean, modest rounded corner only if the current reference viewport/container requires it. Do not put the portal inside an artificial floating modal unless the existing app architecture absolutely requires an overlay.

### 5.3 Wordmark sizing and fitting

- Use fluid typography, approximately `clamp()`-based, tuned to the viewport width and word length.
- Keep the full `TEAM CLAUDE007` phrase legible at all supported widths.
- Do not solve mobile overflow by hiding characters or horizontally scrolling the wordmark.
- Allow a controlled two-line treatment on narrow devices only if necessary, while preserving the single-line desktop composition.
- Avoid clipping the beginning or end of the word.

### 5.4 Primary CTA

Style the entry CTA as a dark-green rounded rectangle with off-white text, a small arrow aligned to the right, adequate horizontal padding, and a subtle shadow/border. On hover, slightly lighten the green and raise the button by a very small amount. On focus, show a clear accessible outline.

The CTA must be a real, keyboard-accessible control. It must start the Glyph Portal's intended entry/scroll interaction; it must not immediately navigate away before the zoom can be seen.

## 6. Glyph Portal component specification

### 6.1 Source component

Use the supplied `GlyphPortal` React component source from the 21st.dev pasted component file. Preferred location:

`frontend/src/components/ui/glyph-portal.tsx`

First inspect the project's real frontend root, aliases and component conventions. Use the correct location if the repository structure differs.

Preserve the component's author attribution and MIT notice:

`Glyph Portal © 2026 Christian Katzmann. MIT.`

Do not replace the component's SVG text clipping, glyph measurement, scroll progress calculation or cleanup logic with a simple CSS `scale()` effect. The letter-interior zoom is the defining interaction.

### 6.2 Intended component configuration

Use the actual props supported by the supplied source. The intended configuration is approximately:

```tsx
<GlyphPortal
  word="TEAM CLAUDE007"
  focusChar="D"
  interactive={false}
  annotations={false}
  scrollLength={2.4}
  fontFamily='"Anton", Impact, "Arial Black", sans-serif'
  fontWeight={700}
  enterLabel="Enter the Warehouse"
  onProgress={handlePortalProgress}
>
  {/* brief transition content */}
</GlyphPortal>
```

The source component's supported props must be checked before use. Do not invent unsupported props or assume it exposes an imperative `start()` method.

Use `D` as the initial focus character if the component can identify an interior zoom target for it. If the selected glyph has no safe interior, choose the nearest suitable letter with a valid measured interior; do not allow the animation to fail. Do not add unnecessary letter-picker controls.

### 6.3 Scroll-driven interaction

The provided component is scroll-driven. Its `data-gp-enter` anchor targets the component's content region and uses scroll progress to drive the zoom. Preserve that intended model.

- The CTA should activate the component's entry anchor or an equivalent supported scroll-to-content action.
- Do not immediately route away when the CTA is clicked.
- Do not introduce a competing smooth-scroll implementation that breaks the component's scroll-parent detection.
- Let the letter zoom, clip and green field reveal complete.
- Use the component's `onProgress` callback to detect completion.

### 6.4 Transition content

Inside the portal's post-zoom content area, use a short introduction, not another full landing page:

**Heading:** `A smarter way to move through the warehouse.`

Show three concise points in a three-column desktop layout and stacked mobile layout:

1. **01 — Configure the warehouse**: Create storage layouts, aisles and obstacles.
2. **02 — Choose the search strategy**: Explore BFS, DFS and Uniform-Cost Search.
3. **03 — Watch autonomy in action**: Follow the search process and the verified robot route.

Use the deep-green field, warm off-white copy, subtle translucent dividers and Inter typography. Maintain generous spacing.

## 7. Portal routing and entry lifecycle

The portal is the first-visit welcome experience; the existing Overview page remains the destination.

- Inspect the existing router and use its current navigation mechanism.
- Do not create a duplicate Overview page.
- Do not rename existing routes without necessity.
- After the portal reaches its completed progress state, use a one-shot guard (`useRef` or equivalent) to prevent repeated navigation.
- Allow the green reveal/transition content to become visible briefly before navigating to the existing Overview route.
- Use the existing route transition system for the final hand-off.
- Preserve existing application state.
- Use `sessionStorage` only if needed to prevent the welcome portal replaying on every internal page navigation. A fresh browser session may show the welcome portal again.
- Direct links to existing app routes must continue to work. Do not trap a user on the intro when they deliberately open an internal route.
- Provide a discreet skip-intro path if necessary.

### Reduced-motion and failure fallback

If `prefers-reduced-motion: reduce` is active, or if the font/SVG geometry cannot be measured reliably, the CTA must still work. It may skip the zoom and navigate directly to Overview with a short fade. Never leave the user stuck on an incomplete portal.

## 8. Alignment system for the existing application

Audit and correct alignment across all existing application pages. This is a layout refinement, not a content or feature redesign.

### 8.1 Header and navigation

The current screenshot shows the logo, six navigation labels, system status, algorithm badge and Simulator CTA competing for horizontal space and wrapping awkwardly.

Implement a balanced responsive header:

- Left: logo/brand.
- Centre: six navigation destinations.
- Right: system status, active algorithm and primary CTA.

Use grid/flex layout, predictable gaps, consistent heights and vertical centring. Do not hardcode absolute offsets.

At viewports where all items cannot fit comfortably, reduce nonessential status detail or collapse navigation into a well-designed menu. Do not squeeze labels until they wrap in the middle of words.

### 8.2 Main content containers

Use consistent maximum widths, side padding, section gaps and vertical rhythm across all six pages. Align content to a common page grid.

### 8.3 Headings and text

Correct font size, line height, letter spacing, text width and wrapping. Use deliberate line breaks for editorial headlines. Prevent text from overflowing cards or colliding with icons.

### 8.4 Cards and controls

Standardize card padding, title alignment, badge positions, button heights, form-control heights and internal spacing. Keep cards in the same grid row visually balanced.

### 8.5 Main sections that must remain intact

Apply alignment fixes to:

- Overview.
- Warehouse Simulator.
- Algorithm Visualization.
- Algorithm Comparison.
- Experimental Analysis.
- AI & Explanations.

Do not remove, rename or reorganize their core functions.

### 8.6 Data visualizations

Maintain existing chart data and calculations. Improve only presentation: chart container alignment, title placement, legend placement, axis readability, tooltips and overflow handling. Keep the current semantic algorithm colours and bold legend treatment.

## 9. Website-wide motion system

Use the project's existing Framer Motion dependency if present. Do not add another animation library unless genuinely required.

### 9.1 Page transitions

Implement consistent transitions between the six existing sections using the current router and `AnimatePresence` where compatible.

Suggested motion:

- Enter: opacity `0 → 1`, vertical offset about `8–14px → 0`.
- Exit: opacity `1 → 0`, vertical offset `0 → -6px`.
- Duration: approximately `0.35–0.5s`.
- Easing: smooth, restrained ease-out/custom cubic-bezier.

Avoid aggressive blur, large translations, zooming entire pages or long transitions that slow down the workflow.

### 9.2 Preserve state

Page transitions must not reset warehouse configuration, selected algorithm, search history, event index, robot position, simulation playback or experimental results. Animate route content without destroying global state or rerunning a search.

### 9.3 Scroll reveals

Use IntersectionObserver or Framer Motion viewport triggers for restrained fade/translate reveals. Reveal headings, descriptions, cards and metrics when they enter view. Avoid repeatedly replaying every reveal on tiny scroll changes.

### 9.4 Overview hero

Use a small staggered entrance:

1. Eyebrow.
2. Main heading.
3. Description.
4. CTA group.
5. Metrics and hero illustration.

The animation must not cause layout shifts or change text alignment.

### 9.5 Marquee and counters

Preserve any existing marquee. Ensure it loops seamlessly without visible jumps. Keep count-up animations tied to actual existing values; do not invent metrics. Respect reduced motion.

### 9.6 Hover and focus interactions

Add subtle hover feedback to navigation links, buttons, cards and suitable interactive controls. Use restrained changes to border, colour, opacity and a few pixels of translation. Keep strong visible keyboard focus states.

### 9.7 Smooth scrolling compatibility

Prefer native scrolling with `scroll-behavior: smooth` for ordinary anchor navigation and Framer Motion scroll reveals. Do not add Lenis or another scroll hijacker unless verified compatible with GlyphPortal's scroll-parent detection, its sticky pin and its scroll-progress calculations. The Glyph Portal must retain control of its own scroll-driven animation.

### 9.8 Warehouse animation protection

Do not modify the timing, coordinate calculations or event model of the existing robot simulation. Do not apply page transforms that distort warehouse coordinate mapping. Cosmetic cell hover/selection feedback is acceptable if it does not interfere with actual simulation behaviour.

## 10. Accessibility and responsive behaviour

- Support keyboard navigation.
- Use semantic buttons and links.
- Label the welcome region and primary CTA.
- Preserve focus visibility.
- Do not rely on colour alone to communicate status.
- Support touch devices.
- Keep portal typography legible on small screens.
- Respect `prefers-reduced-motion` throughout.
- Ensure focus is moved sensibly after entering Overview.

## 11. Strict frontend-only boundary

Only modify files necessary for the React frontend, styling, assets and frontend routing/animation integration.

Do not modify:

- Python files.
- Flask routes or services.
- BFS, DFS or UCS.
- Search-event generation.
- Warehouse backend models.
- API endpoint names or response schemas.
- Cost calculations.
- Experimental methodology or metrics.
- Backend dependencies.

Do not rebuild the application or replace the existing frontend architecture.

If the portal needs information from the existing router, inspect and reuse it. Do not invent a second routing system.

## 12. Implementation workflow

1. Read this complete `design.md`.
2. Inspect the current React codebase and the supplied `GlyphPortal` source.
3. Inspect the provided reference screenshots.
4. Identify the smallest set of frontend files that need modification.
5. Fix header, container, text and component alignment first.
6. Integrate the supplied GlyphPortal component with its attribution intact.
7. Configure the Team Claude007 welcome content and CTA.
8. Connect portal completion to the existing Overview route using a guarded callback.
9. Add restrained page transitions and scroll/hover motion.
10. Verify responsive layout and reduced-motion fallback.
11. Run the frontend build and available frontend tests.
12. Start the application and inspect the actual browser output.
13. Test the portal, internal navigation and all existing interactive sections.
14. Confirm that no backend or algorithm files were changed.

## 13. Acceptance checklist

### Alignment
- [ ] Header logo, navigation, status and CTA align correctly.
- [ ] No awkward navigation wrapping or overlap.
- [ ] Main content uses a consistent grid/container.
- [ ] Headings and body copy wrap cleanly.
- [ ] Cards, controls, buttons and metrics align consistently.
- [ ] Charts and legends are positioned and readable.
- [ ] Desktop, tablet and mobile layouts are checked.

### Glyph Portal
- [ ] Supplied GlyphPortal component is used.
- [ ] Attribution/MIT notice is preserved.
- [ ] Giant wordmark reads TEAM CLAUDE007.
- [ ] Small brand reads Team Claude007.
- [ ] White opening screen matches the reference composition.
- [ ] Deep-green glyph zoom and field reveal work.
- [ ] CTA reads Enter the Warehouse.
- [ ] CTA triggers the actual zoom/scroll experience.
- [ ] Portal completes into the existing Overview page.
- [ ] No duplicate Overview page is created.
- [ ] Direct internal links still work.
- [ ] Font failure and reduced-motion fallbacks work.

### Motion
- [ ] Smooth transitions between all six existing sections.
- [ ] Application state survives page transitions.
- [ ] Scroll reveals work.
- [ ] Hero entrance is staggered and restrained.
- [ ] Marquee remains seamless.
- [ ] Hover/focus states work.
- [ ] Smooth scrolling does not break GlyphPortal.
- [ ] Warehouse robot simulation timing is unchanged.

### Preservation
- [ ] Flask backend unchanged.
- [ ] Python files unchanged.
- [ ] BFS, DFS and UCS unchanged.
- [ ] API contracts unchanged.
- [ ] Search history and visualization still work.
- [ ] Warehouse editor still works.
- [ ] Algorithm comparison and experimental analysis still work.

## FINAL INSTRUCTION

Implement only the three requested frontend improvements: alignment correction, Team Claude007 Glyph Portal welcome/entry experience, and smooth page/scroll motion.

Follow this `design.md` as the visual and interaction contract. Reuse the supplied GlyphPortal source rather than approximating it. Preserve the existing main app's dark-and-lime identity and all existing functionality.

Do not make unnecessary changes. Do not touch backend or AI logic. Build, run and inspect the actual frontend before declaring completion.
