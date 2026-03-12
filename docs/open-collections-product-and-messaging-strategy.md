# Open Collections: Product and Messaging Direction (Internal Strategy Note)

## 1. Overview
Open Collections should feel simple, hands-on, visual, and non-technical from the first interaction. The public experience should start with familiar actions like adding files, opening a folder, and sharing results, instead of introducing technical systems.

Our public story should sell the concept, not explain the protocol. Technical architecture, protocol details, and implementation depth should be documented separately as background material for advanced users and developers.

## 2. Core messaging
The primary message should start from user files, not from abstract collection infrastructure.

### Messaging decisions
- Start from **files**, not from “collections” as a concept.
- Use **upload** instead of **publish** on intro pages.
- Use **storage** or **cloud storage** instead of **repo** or **repository**.
- Avoid protocol-first language on first-touch pages.
- Use this mental model: **one collection = one folder**.
- Secondary technical explanation: each collection folder contains the files plus one collection JSON file.

### Example headline ideas
- Upload your files.
- Upload your files. Keep control.
- One collection. One folder.
- Share it. Find it. Embed it. Keep it open.

## 3. Tone of voice
Tone should adapt by context, while staying clear and human.

### Website (intro pages)
Use a simple, friendly, direct, visual, practical, intuitive tone with light playfulness and confidence. Keep wording non-technical and action-focused.

### App (product UI)
Use clear task language and short labels. Prioritize “what to do next” over system explanations. Keep copy reassuring and concrete.

### Vocabulary guidance
**Avoid**: protocol, manifest, JSON, schema, registry, indexer, interoperability, machine-readable, repository, PAT, publish.

**Prefer**: files, folder, upload, add, details, collection, storage, website, app, share, find, embed, keep control, use anywhere.

## 4. Website strategy
The website should be intentionally split into two layers.

### Layer 1: Simple intro pages
- Sell the concept quickly.
- Explain what it is, why it is useful, why it is easy, and how to get started.
- Focus on user outcomes and first actions.

### Layer 2: Technical background
- Protocol docs
- Architecture
- JSON/data model
- Developer docs
- Discovery/indexing details

Intro pages should not lead with architecture. Architecture should be available, but secondary.

## 5. Homepage direction
Recommended homepage story:
- Start with **“Upload your files.”**
- Explain that files are kept together in one folder.
- Show that the result is open, shareable, findable, and embeddable.
- Present two entry points:
  1. Start with your own files
  2. Browse example collections

### Sample homepage structure
1. Hero
2. Short explanation
3. 3–4 simple steps
4. Benefits
5. Example collections section
6. Link to technical background

## 6. Simple user journey
Recommended non-technical first-run flow:
1. Create a folder on your computer.
2. Place files in the folder.
3. Open the folder in the browser app.
4. Let the app read the files.
5. Generate the collection JSON automatically.
6. Let the user add some details.
7. Save everything as one collection folder.

### Why this creates a “wow” moment
- Users see their own files immediately.
- The experience feels local, visual, and intuitive.
- Success happens before storage/account complexity appears.

## 7. GitHub and storage wording
GitHub can still be used, but it should be framed as storage, not as repo infrastructure.

### Wording rules
- Say: **connect storage**
- Say: **save to your storage**
- Say: **GitHub storage** (if needed)
- Do not lead with repo / branch / commit / PAT
- Place repo terms in advanced setup docs only

## 8. Product entry points
Two main entry paths should be positioned as simple starts:

1. **WordPress path** for people who already run a website.
2. **Desktop/browser app path** for people who want a local, straightforward workflow.

Both should be presented as easy ways to get started, not as technical integrations.

## 9. Example collections
Some collections should already be online for users to:
- open
- browse
- explore
- reuse

### Why this matters
- Shows what the product looks like when it works.
- Reduces abstraction.
- Inspires users.
- Adds a second easy entry point beside “start with your own files.”

## 10. Backend role
Recommended backend philosophy:
- Backend may support auth, storage connectors, indexing, search, thumbnails, and sync helpers.
- Backend should not own the collection.
- Core promise remains: **your files, your folder, your storage**.
- Backend is supportive, optional, and replaceable where possible.

## 11. UI copy implications
Practical copy changes for the app:
- “Open folder” instead of “Connect repository”
- “Storage settings” instead of “Repo settings”
- “Save to storage” instead of “Publish”
- “Add details” instead of “Edit metadata”
- “Collection folder” instead of “Manifest structure”

## Do / Don’t language choices
### Do
- Use concrete, user-first action words.
- Lead with files, folders, and outcomes.
- Keep labels short and plain.

### Don’t
- Lead with architecture or protocol terms.
- Assume users understand repository workflows.
- Put advanced terms in first-touch onboarding.

## Sample hero lines (3)
1. Upload your files. Keep control.
2. One collection. One folder.
3. Share it. Find it. Embed it.

## Sample onboarding step sets (3)
### Set A (ultra-simple)
1. Open folder
2. Add files
3. Add details
4. Save to storage

### Set B (value-forward)
1. Start with your files
2. Organize in one folder
3. Add collection details
4. Share anywhere

### Set C (open web framing)
1. Upload your files
2. Create one collection folder
3. Save to your storage
4. Share, find, and embed

## 12. Final summary
Open Collections should be introduced as a simple file-to-folder workflow that gives users immediate, visual progress and clear control. Public messaging should stay non-technical and outcome-led, while protocol and architecture live in secondary technical documentation. The key positioning is: start with files, keep everything in one collection folder, save to your storage, and use the result across websites and apps.
