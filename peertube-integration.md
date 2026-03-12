# PeerTube Integration for Open Collections

## 1. Purpose
PeerTube should be integrated into Open Collections primarily as a media host and metadata source for video, while Open Collections remains the canonical collection and metadata layer.

Open Collections publishes `collection.json`, item metadata, provenance, rights, and collection discovery. PeerTube provides video hosting, streaming, embeds, thumbnails, captions, and channel/playlist organization.

The preferred relationship is:
- Open Collections = collection authority
- PeerTube = video delivery backend

## 2. Core integration model
The recommended model is to treat PeerTube as an external video platform rather than the canonical collection system. Open Collections item records should remain stable and canonical where possible, and PeerTube URLs should be treated as asset/access URLs for video delivery. A collection can include PeerTube-backed items while preserving Open Collections metadata authority.

This separation supports long-term portability because collection identity and metadata remain independent of any single hosting platform. It also improves protocol clarity by separating collection authority from media transport concerns.

## 3. Item model for PeerTube-backed video
A video item can reference PeerTube as the delivery platform while preserving canonical item metadata in Open Collections.

```json
{
  "id": "urn:oc:item:video:climate-briefing-2025-03-01",
  "title": "Climate Briefing: March 2025",
  "type": "Video",
  "canonicalUrl": "https://collections.example.org/items/climate-briefing-2025-03-01",
  "thumbnailUrl": "https://video.example.net/lazy-static/previews/1a2b3c4d.jpg",
  "assets": {
    "stream": "https://video.example.net/videos/watch/1a2b3c4d-9e8f-4a77-9ef1-0fd89c4a2d11",
    "embed": "https://video.example.net/videos/embed/1a2b3c4d-9e8f-4a77-9ef1-0fd89c4a2d11"
  },
  "sourcePlatform": "PeerTube",
  "platformId": "1a2b3c4d-9e8f-4a77-9ef1-0fd89c4a2d11",
  "attribution": "Uploaded by City Media Lab",
  "rightsStatement": "CC BY 4.0"
}
```

Recommended additional fields:
- `sourcePlatform`: Identifies the upstream platform, e.g., `PeerTube`.
- `platformId`: Stores the durable PeerTube video identifier from the source instance.
- `embedUrl`: Stores the embed endpoint when embeds are used directly.
- `streamingUrl`: Stores the preferred watch/stream endpoint.
- `captions`: Lists available caption tracks and language metadata.
- `duration`: Stores runtime as a normalized value.
- `publishedAt`: Preserves source publication timestamp for provenance and sorting.

## 4. Authority, hosting, and reuse
PeerTube integration should explicitly separate ownership and reuse roles. For a PeerTube-backed item, the Open Collections publisher may be the collection authority, the PeerTube instance may be the asset host, the rights declarer may be either the collection publisher or the PeerTube publisher, and the item may be authoritative or reused.

Recommended fields and semantics:
- `authorityStatus`: Declares whether the item is authoritative, mirrored, or reused.
- `assetHost`: Identifies the platform or domain serving media assets.
- `reusedFrom`: Points to the original source URL or item identifier when reused.
- `rightsBasis`: Explains how rights were determined (source license, direct grant, policy review).
- `rightsStatement`: Declares the applicable rights/license statement.
- `sourceCollection`: Identifies the originating collection when importing from another curated set.

Implementations should make these roles explicit rather than assuming they are the same actor.

## 5. Recommended integration paths

### 5.1 Import by URL
The easiest MVP is URL-based import: a user pastes a PeerTube video URL, embed URL, or playlist URL; the Manager fetches metadata; the Manager creates an item draft; and an editor reviews rights, attribution, and provenance before adding it to a collection.

This is the recommended first implementation.

### 5.2 Provider-based import
A PeerTube provider in the Manager can connect to a PeerTube instance and support account-, channel-, playlist-, or single-video workflows. The provider should let editors browse remote resources and import selected videos as collection items.

### 5.3 Publish from Manager to PeerTube
A more advanced future workflow is publish-to-PeerTube: upload video in Manager, send the media to PeerTube, retrieve returned PeerTube URLs and IDs, write those references into the collection item, and then publish the collection manifest.

This path is useful but more complex than import-first workflows.

## 6. Manager UX recommendations
The Manager should expose PeerTube as a first-class provider with a focused configuration flow.

Suggested provider configuration fields:
- Instance URL
- Optional API token
- Import mode:
  - single video
  - channel
  - playlist
  - account
- Rights handling mode:
  - trust PeerTube license
  - require editor review
  - allow explicit override only when permitted

Recommended editor workflow:
1. Connect PeerTube instance
2. Select video(s) or playlist
3. Preview imported metadata
4. Review rights / attribution / provenance
5. Add to collection
6. Publish `collection.json`

## 7. Protocol recommendations
PeerTube should usually be treated as an asset distribution backend, while Open Collections remains the canonical collection layer. Implementations should preserve PeerTube identifiers and source URLs, and should not rely on PeerTube embed URLs as the only identifier. Playlists or channels should be treated as import/candidate sources rather than automatically becoming canonical collections by default.

## 8. Recommended phased roadmap
- Phase 1: paste URL and import metadata
- Phase 2: provider-based browsing and import
- Phase 3: upload/publish from Manager to PeerTube

This order is recommended because it delivers value quickly, validates metadata and rights workflows early, and postpones high-complexity publishing integrations until the import model is stable.

## 9. Summary recommendation
The best implementation approach is to integrate PeerTube as a provider-backed external video source while keeping Open Collections as the canonical metadata and collection layer.
