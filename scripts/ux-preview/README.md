# Isolated UX preview

Run `node node_modules/next/dist/bin/next dev scripts/ux-preview -p 3108` from the repository root.

This app mounts shared production UI components with synthetic props, without production middleware, server data queries or API routes. It does not qualify authentication, persistence, academic evidence, Drive or Calendar. No credentials are required. AI starts disabled; `?mock=true` is for browser-intercepted mocked responses only. Never use it for live provider calls. Screenshots must be labeled synthetic component evidence.
