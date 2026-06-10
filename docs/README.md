# Internal Documentation

User-facing documentation lives in **`website/docs/`**.

```bash
pnpm docs:dev    # http://localhost:5173/
pnpm docs:build  # production build
```

## What stays here

This folder holds internal engineering notes only — not published on the website:

| Folder / file                              | Purpose                                         |
| ------------------------------------------ | ----------------------------------------------- |
| `cleanup/`                                 | Dependency, naming, and dead-code audit reports |
| `lit-remake/`                              | Turkish internal analysis (Lit migration notes) |
| `project-analysis/`                        | Turkish project analysis series                 |
| `changelog/`                               | Dated change logs                               |
| `performance/`, `types/`, `ui/`            | Audit reports                                   |
| `*-report.md`, `MASTER_CLEANUP_SUMMARY.md` | One-off audits                                  |

Edit public docs in `website/docs/`, not here.
