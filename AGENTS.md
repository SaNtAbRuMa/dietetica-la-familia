\# Dietética Natural - Project Instructions



Build this project as a production-quality ecommerce website for a natural food store in Argentina.



\## General



Act as a senior product designer, senior frontend engineer and senior full-stack engineer.



Make reasonable implementation decisions independently.



Do not stop after creating a landing page or a visual prototype.



The final result must be a functional ecommerce application.



Use the installed Build Web Apps skills when appropriate.



Before making major architectural decisions, inspect the existing project.



When documentation for a framework or external API may have changed, verify the current official documentation.



\## Stack



Use:



\- Next.js with App Router

\- React

\- TypeScript strict

\- Tailwind CSS

\- shadcn/ui

\- Supabase / PostgreSQL

\- Supabase Storage for product images

\- Zustand when appropriate for persistent client-side cart state

\- Mercado Pago Checkout Pro for payments

\- Vercel for deployment



Prefer Server Components unless client-side interactivity is required.



Do not introduce unnecessary dependencies.



\## Language and market



This store is intended for Argentina.



All customer-facing text must be Spanish from Argentina.



Currency:



ARS



Format prices using:



es-AR



For example:



$ 4.500

$ 12.900



\## Visual direction



Create a modern, premium, minimalist natural-food ecommerce experience.



The site should feel:



\- natural

\- clean

\- warm

\- contemporary

\- trustworthy

\- premium but accessible



Prefer:



\- warm off-white backgrounds

\- excellent typography

\- dark charcoal text

\- natural green accents

\- generous whitespace

\- large product photography

\- subtle borders

\- restrained shadows

\- subtle motion and microinteractions

\- strong visual hierarchy



Avoid:



\- generic AI-generated layouts

\- excessive gradients

\- glassmorphism

\- neon colors

\- excessive rounded cards

\- excessive shadows

\- random bento grids

\- oversized hero sections with little useful information



The design should feel custom-made for this store.



Mobile-first.



It must look excellent at approximately:



\- 375 px

\- 768 px

\- 1440 px



\## Ecommerce model



A product can contain multiple variants.



Example:



Almendras naturales



\- 250 g — $4.500

\- 500 g — $8.200

\- 1 kg — $15.000



Each variant must be able to have its own:



\- id

\- SKU

\- size

\- price

\- stock



Price and stock belong to the variant, not only to the parent product.



Never hardcode catalog data inside presentation components.



\## Cart



The shopping cart must be functional.



It must:



\- add products

\- distinguish variants

\- change quantities

\- remove items

\- empty the cart

\- calculate subtotal

\- persist after reload

\- display number of items in the header



Different variants of the same product must remain separate cart items.



Before creating an order, prices and stock must be verified server-side.



Never trust prices sent by the browser.



\## Catalog



Create a scalable catalog.



Support:



\- categories

\- search

\- filters

\- sorting

\- product availability

\- multiple product variants

\- product detail pages

\- related products



\## Checkout



Prepare checkout for Argentina.



Support:



\- customer name

\- surname

\- email

\- phone

\- address

\- city

\- postal code

\- delivery method

\- notes



Prepare:



\- home delivery

\- store pickup



Use Mercado Pago Checkout Pro.



Payment secrets must exist only on the server.



Never mark an order as paid only because the user returns to a success URL.



Use payment notifications/webhooks to update the real payment status.



\## Database



Use a clean relational model.



At minimum consider:



\- categories

\- products

\- product\_variants

\- product\_images

\- orders

\- order\_items

\- profiles/admin users if required



Orders must preserve historical snapshots of:



\- product name

\- variant

\- quantity

\- unit price



Changing a product later must not modify old orders.



Use indexes, constraints and Supabase RLS where appropriate.



\## Admin



Prepare an authenticated `/admin` area.



Admin should eventually be able to:



\- create products

\- edit products

\- hide products

\- manage categories

\- upload images

\- manage variants

\- modify prices

\- modify stock

\- view orders

\- manage appropriate order states



Never expose administrative operations to anonymous customers.



\## Accessibility



Use semantic HTML.



Provide:



\- keyboard navigation

\- visible focus states

\- labels

\- accessible buttons

\- appropriate contrast

\- alt text



Target sensible WCAG AA behavior.



\## Performance



Use Next/Image.



Avoid excessive JavaScript.



Avoid unnecessary client components.



Avoid request waterfalls.



Use lazy loading when appropriate.



Keep dependencies reasonable.



\## SEO



Implement:



\- metadata

\- product titles and descriptions

\- canonical-friendly URLs

\- product slugs

\- Open Graph

\- structured Product data when sufficient information exists



\## Code quality



Use strict TypeScript.



Avoid `any`.



Keep business logic separate from visual components.



Prefer clear folder structure.



Do not over-abstract small components.



Do not leave:



\- dead code

\- duplicated components

\- fake unfinished buttons

\- placeholder TODO features presented as completed



\## Verification



For substantial changes:



1\. Implement the feature.

2\. Run lint.

3\. Run TypeScript checks.

4\. Run the application.

5\. Inspect the rendered UI.

6\. Test relevant interactions.

7\. Check mobile and desktop.

8\. Check browser console errors.

9\. Fix issues discovered during verification.



For the ecommerce flow test:



Home → Catalog → Product → Variant → Add to cart → Cart → Checkout.



Also test:



\- multiple variants of one product

\- quantity changes

\- reload persistence

\- unavailable variants

\- empty cart

\- responsive navigation



Do not call a feature finished merely because the code compiles.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

