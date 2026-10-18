# Hardware branch website content

The homepage describes the app's active `Hardware` development branch. It is
separate from the frozen v0.7.0 desktop release linked in the download section.
Do not label branch screenshots or features as part of that published archive.

## Source of truth

Content was aligned with `Design-Studio-for-FastLED` at commit `f21e140d` on
2026-10-18, using:

- `README.md` for the module/pattern counts and product workflow.
- `docs/getting-started/first-project.md` for setup and upload steps.
- `docs/getting-started/development-setup.md` and `upload-helper.md` for runtime requirements.
- `docs/user/hardware-workbench.md` for the physical workspace.
- `docs/release/beta-support-matrix.md` for the distinction between validated and experimental hardware.

Screenshots in `public/app/hardware/` are copied from that branch's
`docs/images/readme/`. The existing Stage image remains in use. The homepage
no longer embeds the older Matrix Output walkthrough or node-to-code graphic,
because their workflow predates the separate Hardware and Upload tabs.

Keep branch documentation URLs centralized in `src/lib/app-release.ts`.
Before changing download URLs or claiming a new release, verify the published
release and its actual assets. When updating branch content, refresh screenshots
and counts together and keep exact hardware validation claims in the linked
support matrix.
