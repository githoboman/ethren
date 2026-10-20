# Contributing

AttestAI is an English-only judging repository. Source code, comments, identifiers, documentation, tests, fixtures, UI labels, error messages, and commit messages must use English.

Do not add Japanese text or localized content to this repository. Run the repository character scan before submitting changes:

```sh
rg -n "[\u3040-\u30ff\u3400-\u9fff]" . -g '!node_modules' -g '!pnpm-lock.yaml'
```

Keep live integrations behind configuration and preserve deterministic demo behavior for reviewers without credentials.
