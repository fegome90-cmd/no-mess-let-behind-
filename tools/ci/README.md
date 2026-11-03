# Provider smoke fixtures

`fetch-providers.sh` runs only in an ephemeral Linux CI runner. It pins versions
and checks the three release archive hashes observed from the official GitHub
release assets on 2026-11-03. It installs Rulesync locally with lifecycle scripts
disabled, and saves npm's resolved lock as evidence. This is a compatibility smoke,
not a frozen transitive Rulesync dependency adoption or a user installer.

Profiles are **synthetic/advisory examples**. In particular the Gitleaks rule only
recognizes a synthetic marker; it MUST NOT be used as a production secrets policy.
The Vale profile illustrates one phrase preference, not a clinical standard.
Passing these fixtures does not validate Claude/Codex/Pi hooks or live vault use.
