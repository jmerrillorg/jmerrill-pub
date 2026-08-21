# Apple Pages Support

Implemented:

- `.pages` is an allowed upload extension.
- Pages source files are preserved as original author submissions.
- Pages files receive `normalization_required`.
- Pages intakes wait on `JMP/System`, not the author, when normalization is needed.

Not yet implemented:

- Automated Pages-to-DOCX conversion.
- Conversion checksum lineage.
- Content integrity QA.

If automated conversion is unavailable at runtime, the correct state is operator normalization, not author blockage.

