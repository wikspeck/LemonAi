# Native Lemon 2.1

See the repository README for the complete build and release process. The app is real C#/WinUI 3/XAML with no browser renderer.

Production connectivity is automatic and fixed to the existing Lemon Worker. Only Debug builds accept a LEMON_API_BASE_URL environment override. Native history remains separate from the former browser history and preserves version 1 of the existing native storage contract.

The runtime-complete publish directory must contain Lemon2.exe, Lemon2.pri, the compiled .xbf files and the runtime libraries. PublishNativeXaml handles the resource files that the default SDK publish step omitted. Verify a copied directory's startup before shipping a ZIP.

Canvas is buffered and strictly validated. One server repair attempt is allowed; readable fallback content is retained, while original responses remain internal diagnostic fields in local history. Legacy Canvas JSON inside prose is normalized on restoration. UI rendering never executes generated code or XAML.

Limits: native math uses a readable notation subset; no full TeX engine, cross-device sync, signed installer, search provider or autonomous file agent is included. The Windows preview is a complete archive that can be extracted and run, not an installer.
