# Lemon 2.2 implementation plan

Audit baseline: clean main at 666a434, native C#/WinUI 3/XAML, OpenNext/Cloudflare backend. No framework migration is warranted.

1. Measure fixed native rendering workloads, process input-idle startup and network TTFT separately. The first observed process launch is not a controlled cold-cache experiment.
2. Replace character-at-a-time async SSE reads, repeated Markdown tree construction, eager whole-history normalization and list resets. Preserve Canvas-only assistant messages (2.1 incorrectly removed them when Content was empty).
3. Introduce shared native theme/spacing/type tokens, one outline vector family and bottom-composer settings; maintain WinUI virtualization and responsive sidebar.
4. Add persistent settings, English/German/Polish resources and an independent AI response-language setting; F11 fullscreen and persisted window state.
5. Verify complementary Cloudflare models with documentation and real inference before enabling; preserve existing API contracts.
6. Keep safe Canvas parsing and regression tests. Update website/changelog and produce a real Inno Setup installer with runtime files, uninstall entry and shortcuts.
7. Test installation/start/uninstall on this host and distinguish this from clean-machine verification. Windows Sandbox is not installed here; a clean Windows VM remains a release gate unless another clean environment becomes available.
