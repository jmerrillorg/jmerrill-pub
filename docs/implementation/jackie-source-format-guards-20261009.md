# Jackie commissioning source format boundary

The internal assessment adapter reads format only from the exact revalidated Dataverse artifact repository path. Approved Markdown is decoded as strict UTF-8 literal manuscript data, without executing HTML/code or fetching linked content. DOCX keeps the existing Mammoth extraction and prompt bytes. A missing legacy path retains DOCX behavior rather than guessing text format. Vellum and other formats fail closed with REVIEW_SOURCE_FORMAT_HANDOFF_REQUIRED until a governed manuscript extraction handoff exists.

This technical adapter does not approve a source, alter a source role, select an edition, accept tracked edits or bypass RECEIVED_ORIGINAL. The actual Til Death Markdown is received and unapproved, so it remains held; a mock approved fixture proves only the format path. My AI's Vellum remains source-custody evidence, not an editable manuscript. Glory's separately gated recovery request must be revalidated before any new paid decision; this change does not create that decision or enable any worker.

Governed paths may be SharePoint viewer URLs. The reader uses a structured URL parser: the canonical tenant's Doc.aspx file parameter supplies the filename; direct document URLs use their pathname, not a query string. Missing/unsafe viewer filenames and noncanonical URL hosts fail closed. The initial format release's live Glory proposal exposed this viewer-path regression; its failed readback is retained and no claim/inference occurred.

Tests preserve literal Markdown bytes, reject invalid UTF-8/binary/blank/unsupported sources, verify exact existing DOCX extraction parity, and exercise the format reader through a mock approved source. Full suites and protected deployment readback remain separate release requirements.
