You are working in the GitHub repository:

productbuilder/timemap-collector

Goal:
Add a storage guidance feature to the Collector app so users can better understand which storage providers are best suited for open collections.

Important product direction:
- many users will not know which storage provider to choose
- the app should help them make a good decision
- the guidance should promote the best options for open/public hosting
- the guidance should also explain which platforms are better used as import sources only
- this should be implemented as a lightweight in-app help surface, not a major new app section

Build on the existing `timemap-collector` Web Component and current Sources dialog.

---

## Recommended UX approach

Implement this as a **Storage options** information view accessible from the Sources dialog.

Preferred UX:
- user opens the Sources dialog
- inside the dialog there is a secondary button/link such as:
  - `Storage options`
  - or `Compare storage providers`
- clicking it opens a dialog, sub-panel, or secondary help view
- this view explains the available storage options and compares them

Do not add a new complex navigation system.
Keep the feature lightweight and integrated into the existing Sources flow.

---

## What to implement

### 1. Add a “Storage options” entry point in the Sources dialog

In the current Sources dialog:
- add a small info/help action
- label example:
  - `Storage options`
  - `Compare storage providers`
  - `Help choosing storage`
- keep the styling secondary/subtle
- it should not distract from adding sources, but it should be easy to find

### 2. Create a storage guidance view

Create a simple in-app single-page help view, dialog, or panel.

This should explain:
- which providers are best for hosting open/public collection manifests
- which providers are better as import sources
- which providers are best for browser-based access
- which providers are easiest for non-technical users

Keep it readable and concise.
Do not turn it into a giant wall of text.

### 3. Add a recommended options section at the top

At the top of the storage guidance view, add a “Recommended options” section.

This should promote the strongest options for open/public hosting.

Recommended top options to promote:

#### GitHub
Position as:
- excellent for open public collections
- good for versioning
- good for `collection.json`
- easy to use with Collector

#### Cloudflare Pages / Cloudflare R2
Position as:
- excellent for static hosting and public delivery
- very good for JSON + media
- strong modern hosting option

#### S3-compatible storage
Position as:
- strong long-term option
- great for media and manifests
- good for technical users or institutional storage

#### Static web hosting
Position as:
- simple and robust
- works well for open collection publishing

Keep the messaging practical, not promotional.

### 4. Add a comparison table

Include a comparison table of storage providers.

Recommended providers to include:
- GitHub
- Cloudflare Pages / R2
- S3-compatible storage
- Static website hosting
- Google Drive
- OneDrive
- Dropbox
- Internet Archive
- Wikimedia Commons

The table should compare providers across a few practical criteria.

Suggested columns:
- Provider
- Best use
- Public hosting quality
- Browser fetch compatibility
- Good for media
- Good for manifests
- Recommended role

Example “Recommended role” values:
- Primary hosting
- Good source
- Import only
- Specialized archive

Do not make the table too large or visually overwhelming.
A clean compact table is best.

### 5. Explain which providers are weaker for browser-first hosting

Add a short section explaining that some cloud drive providers are useful, but less suitable for direct browser-based public collection hosting.

Mention:
- Google Drive
- OneDrive
- Dropbox

Explain that they are often better used as:
- readable/import sources
- collaboration storage
- temporary source systems

rather than as the final public hosting layer for manifests and APIs.

This should align with the current platform direction:
- open/public hosting works best on GitHub, S3-compatible storage, static hosting, Cloudflare, etc.

### 6. Add simple recommendations by user type or scenario

At the bottom or near the top, add a small recommendation section like:

- **For small heritage organizations** → GitHub
- **For technical teams or institutions** → S3-compatible storage / Cloudflare R2
- **If your files are already in Google Drive or OneDrive** → use them as a source, then publish to a better hosting target
- **For archival/public preservation** → Internet Archive / Wikimedia Commons where appropriate

Keep it concise.

### 7. Add a link placeholder for future full documentation

At the end of the storage guidance view, add a small “Learn more” link or placeholder such as:
- `/docs/storage-options`
- `/docs/hosting-collections`

If the full docs page does not exist yet, use a placeholder or no-op link with a clear TODO in code/comments.
Do not overbuild docs routing in this repo.

---

## Content guidance

Write clearly and practically.

The storage guidance should help users answer:
- where should I host my collection?
- what works well with Collector?
- what works well for open/public hosting?
- what should I avoid for direct browser fetch?
- what is easiest for me?

Keep the tone calm and helpful.

---

## UI / design guidance

Keep the UI consistent with the current app:
- clean
- lightweight
- readable
- SaaS-style but minimal

A simple dialog or info panel is enough.

The comparison table should:
- be readable on desktop
- degrade reasonably on smaller screens
- not break the app layout

Do not introduce a data grid library or framework.
Implement it simply.

---

## Recommended implementation approach

1. inspect the current Sources dialog structure
2. add a small “Storage options” action
3. implement a storage help dialog/panel/component
4. add recommended options section
5. add comparison table
6. add recommendation-by-scenario section
7. add future docs link placeholder
8. update docs / implementation notes briefly

Avoid unnecessary rewrites.

---

## Optional refinement if it fits naturally

If practical, visually mark the strongest recommended providers in the table with something like:
- `Recommended`
- `Best for open hosting`

Keep this subtle.

---

## Documentation updates

Update app-level docs briefly where useful, such as:
- README
- implementation notes
- docs page if one already exists in the app context

Document that the app now includes storage guidance in the Sources flow.

Do not over-document.

---

## Acceptance criteria

This task is complete when:

1. the Sources dialog includes a clear entry point for storage guidance
2. users can open a storage comparison/help view
3. the view promotes the best hosting options
4. the view includes a comparison table of common storage providers
5. the view explains that Google Drive / OneDrive / Dropbox are weaker for browser-first public hosting
6. the view gives simple recommendations by scenario
7. the implementation fits cleanly into the current Collector UI
8. existing source/provider functionality still works

---

## Output requirements

After making the changes:

1. show the git diff
2. summarize:
   - where the storage help entry point was added
   - what content the storage guidance view contains
   - how the comparison table is structured
   - what provider recommendations are emphasized
3. clearly separate:
   - completed functionality
   - any simplifications/limitations
   - recommended next step
4. do not modify unrelated files unnecessarily
5. keep the implementation simple and extendable