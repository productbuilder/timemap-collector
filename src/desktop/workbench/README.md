# Open Collections Workbench (Tauri)

This is a lightweight shared desktop shell that hosts both existing Web Component apps:

- `src/apps/collector`
- `src/apps/configurator`

## Run in desktop mode

```bash
cd src/desktop/workbench
npm install
npm run tauri:dev
```

The Tauri window opens a simple launcher where you can choose Collector or Configurator.

## Architecture notes

- The desktop shell UI lives in `src/desktop/workbench`.
- The native bridge lives in `src/desktop/workbench/src-tauri`.
- Shared file/folder/storage APIs live in `src/shared/platform`.
- Collector and Configurator remain browser-first Web Component apps.

## Platform layer

`src/shared/platform` exports a small API:

- `getPlatformType()`
- `openTextFile()`
- `openJsonFile()`
- `saveTextFile()`
- `saveJsonFile()`
- `openDirectory()`
- `readTextFile()`
- `writeTextFile()`
- `rememberWorkspaceState()`
- `loadWorkspaceState()`

Browser builds use browser APIs; desktop builds route these calls through Tauri commands.
