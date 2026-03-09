# Codex Prompt — Refocus Collector/Browser Split and Restructure Repo Layout

You are working in the GitHub repository:

productbuilder/timemap-collector

Goal:
Refocus and restructure the repo around two clear applications:

1. **Collector** — for editing, publishing, and later registering collections
2. **Browser** — for browsing collections in read-only mode

Important product direction:
- Collector should no longer try to be a general public source browser
- Collector should focus on **writable collection management**
- Sources in Collector should represent **storage sources the user has access to**
- Each storage source can contain multiple collections
- The registration step should be part of the Collector concept, but can be a placeholder for now
- Browser should be a separate app in the same repo
- Both apps should be self-contained
- Use vanilla JS + Web Components
- Keep the structure clean and pragmatic
- Do not over-fragment into too many packages yet

This task should both:
1. adjust the current Collector concept and implementation
2. add a second Browser app in the same repo
3. keep the codebase understandable and easy to extend
4. rename the current `code/` directory to `src/`
5. move the current site-related directories `demo/`, `docs/`, and `examples/` into a `site/` directory
6. keep the site root `index.html` in the repo root

---

## Core conceptual shift

### Collector
Collector is for:
- connecting writable storage sources
- managing collections on those sources
- editing collection/item metadata
- publishing/exporting collections
- eventually registering collections

Collector is **not** the general-purpose read-only explorer anymore.

### Browser
Browser is for:
- browsing collections
- viewing media
- viewing metadata
- read-only filtering/exploration

Browser is the place for public/open collection browsing.

---

## Repo structure target

Use a simple monorepo-style structure, but keep implementation pragmatic.

Recommended target:

```text
src/
  apps/
    collector/
      package.json
      src/
        index.html
        index.js
        app.js
        components/
        css/
        images/
        views/
    browser/
      package.json
      src/
        index.html
        index.js
        app.js
        components/
        css/
        images/
        views/

  library/
    core/
      package.json
      src/
        index.js
        component-base.js
        model.js

site/
  demo/
  docs/
  examples/

README.md
index.html
```

You may add a few more shared library folders if clearly useful, but do not explode the repo into too many small packages yet.

Important:
- both apps should be self-contained
- `collector` and `browser` should each be runnable as their own app package
- shared code should be extracted only where clearly valuable
- prefer a small shared `core` package over many tiny packages at this stage
- rename existing `code/` to `src/`
- move existing `demo/`, `docs/`, and `examples/` into `site/`
- keep root `index.html` in place, but update links and references to the new `site/` paths

---

## Repository restructure requirements

### 1. Rename `code/` to `src/`
The repo currently uses a directory named `code/` for implementation code.
Rename this to:

`src/`

Update all imports, references, README paths, links, and internal assumptions accordingly.

### 2. Move site-related directories under `site/`
The repo currently has directories like:
- `demo/`
- `docs/`
- `examples/`

These belong to the site-facing layer and should be moved under:

```text
site/
  demo/
  docs/
  examples/
```

Update any links or references in:
- root `index.html`
- README
- docs pages
- demo pages
- any internal navigation

### 3. Keep root `index.html`
Do not move the repo root `index.html`.

It can remain a simple landing page / entry page for the site.
But it should link correctly to the new locations, for example:
- `./site/demo/`
- `./site/docs/`
- `./site/examples/`

---

## Application requirements

# 1. Collector app

Create or refactor the main Collector app so it has a clear scope:

### Collector responsibilities
- manage writable storage sources
- list collections per storage source
- open/edit a selected collection
- show assets/items as cards
- edit metadata
- publish/export collections
- include a placeholder for registration

### Collector source model
The Sources concept should be cleaned up.

Sources should represent:
- storage sources the user can work with
- examples:
  - GitHub repo with PAT / write access
  - future S3 bucket with write credentials
  - future WordPress integration
- do not center the UI around generic public read-only sources anymore

Each storage source can have:
- multiple collections
- collection discovery/listing per source
- an active selected collection

### Collector UI direction
Keep the current SaaS-style shell, but refine the concepts.

Recommended header actions:
- Sources
- Publish
- Register (can be placeholder or disabled with explanatory note)

Main layout:
- header
- collection/item cards viewport
- metadata editor sidebar

Inside Collector:
- selected source
- selected collection
- selected item

### Registration placeholder
Collector should include a clear placeholder for registration.

Examples:
- a Register button in the header or publish dialog
- a disabled or placeholder dialog saying:
  - `Collection registration will be added here`
  - `Collector will later be able to register published collections with the registry`

Do not implement a full registration backend unless it already exists.
Just create the UI concept and placeholder cleanly.

### Collections per source
Collector should support the idea that each writable source can contain multiple collections.

At minimum:
- source can show a list of collections
- one collection can be selected for editing
- if real collection discovery is not fully implemented for all providers, scaffold the model and UI cleanly
- GitHub is the first practical target if possible

### Preserve and adapt existing functionality
Preserve current useful behavior where it fits:
- card grid
- metadata editing
- image viewer
- save/publish flows
- GitHub support
- storage help if already added

But adapt the language and UX so it clearly serves collection management, not general browsing.

---

# 2. Browser app

Add a second app in the same repo:

`src/apps/browser/`

Browser should be a self-contained read-only application.

### Browser responsibilities
- load and browse collections
- show cards/items
- show media in a larger viewer
- show metadata in read-only mode
- filter/search if already easy to support
- no write/publish controls

### Browser source model
Browser should focus on:
- reading collections
- browsing one or more collection manifests
- public/open collections or later indexed collections

For now, Browser can be simple.
A good first version is enough.

### Browser UI
Recommended:
- simple header
- collection/grid viewport
- metadata viewer sidebar or detail view
- media viewer

The Browser should feel lighter than Collector.

### Self-contained
Browser should be independently runnable from its own app package.

---

## Shared code strategy

Do not over-modularize yet.

At this stage, only extract clearly shared code into `src/library/core/` or a very small number of additional shared packages.

Reasonable shared pieces:
- a light base component class
- shared model helpers
- small utilities
- maybe shared card/media/metadata primitives if they are already clearly reusable

Avoid splitting everything into many tiny packages unless there is an obvious payoff.

---

## Component architecture guidance

### Keep components self-contained
Each app should be understandable on its own.

### Keep components minimal
Very important:
- avoid too many nested elements
- keep DOM flat
- optimize for easy styling
- do not introduce unnecessary wrappers

### Use vanilla JS + Web Components
No frameworks.

### Use a light shared base where useful
If the current or reference architecture uses a good base component pattern:
- adopt the good parts
- keep it lightweight
- support attribute reflection where useful
- do not create a giant framework

---

## Documentation changes to add

### 1. Update architecture documentation
Add or update a planning document in `projects/` describing:

- Collector = edit / publish / register
- Browser = read-only browse
- registration is part of Collector flow, not a separate app yet
- sources in Collector are writable storage sources
- collections exist within storage sources
- Browser handles public/read-only exploration
- `src/` is the implementation root
- `site/` contains `demo`, `docs`, and `examples`

Suggested file:
`projects/collector-browser-application-split.md`

### 2. Update README
Explain:
- repo now contains two apps
- Collector and Browser have different roles
- where to find each app
- what is implemented vs placeholder
- that implementation code now lives under `src/`
- that site-facing content now lives under `site/`

---

## Suggested implementation steps

1. inspect the current repo structure
2. rename `code/` to `src/`
3. create `site/` and move `demo/`, `docs/`, and `examples/` into it
4. update root `index.html` and all affected links/references
5. create `src/apps/collector/`
6. migrate/refactor the current Collector into it
7. clean up the Collector source model and wording
8. adapt Sources dialog to focus on writable storage sources
9. add collection-per-source model/UI where practical
10. add registration placeholder into Collector
11. create `src/apps/browser/`
12. build a simple self-contained Browser app using the current browse/view foundations
13. extract only minimal clearly shared code into `src/library/core/`
14. update docs and README

Avoid unnecessary rewrites.
Keep the code practical and maintainable.

---

## What to preserve

Do not lose the progress already made, especially:
- card selection
- media viewer
- metadata editing
- GitHub connection work
- multi-collection/source thinking where useful
- storage guidance/help if already present

Adapt these to the new split rather than discarding them.

---

## Acceptance criteria

This task is complete when:

1. the repo uses `src/` instead of `code/`
2. the repo contains `site/demo`, `site/docs`, and `site/examples`
3. root `index.html` remains in place and links correctly to the restructured site content
4. the repo contains two app packages:
   - Collector
   - Browser
5. Collector is clearly focused on editing/publishing/registering collections
6. Collector sources are framed as writable storage sources
7. Collector has a clear notion of collections per storage source
8. Collector includes a registration placeholder
9. Browser exists as a separate self-contained read-only app
10. both apps are runnable independently
11. shared code extraction is minimal and sensible
12. documentation reflects the new split clearly

---

## Output requirements

After making the changes:

1. show the git diff
2. summarize:
   - how `code/` was renamed to `src/`
   - how `demo/`, `docs/`, and `examples/` were moved into `site/`
   - how Collector was refocused
   - how sources/collections are now modeled in Collector
   - how the registration placeholder was added
   - what Browser app was created
   - what shared code was extracted
3. clearly separate:
   - completed functionality
   - placeholders/scaffolding
   - recommended next step
4. confirm whether both apps run after the restructure
5. be honest about any incomplete collection discovery or registration behavior
6. do not add frameworks or unnecessary tooling
