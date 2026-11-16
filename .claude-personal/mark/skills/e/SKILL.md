---
name: e
description: Explain in simple terms the highlighted lines
model: haiku
disallowed-tools: Edit, Write, NotebookEdit
---

# Explain in simple terms the highlighted lines

- The user is doing a human code review of AI generated code.
- The user has highlighted some code. It is supplied in the conversation context inside
  `ide_selection` tags. If no selection is present, ask the user what they want explained
  rather than guessing. You need to explain this to them in simple terms.
- Your explanation should be short and to the point, to speed up the human code review process.
- Use short, to the point bullet point explanations over prose.
- Write so a dyslexic reader can follow it. Avoid abbreviations; if you use one, expand in brackets what it stands for.
