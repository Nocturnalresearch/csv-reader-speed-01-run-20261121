# Checks — csv-reader-speed-01-run-20261121

Checked 2026-11-21 15:30 WIB (08:30 UTC), against the live competition and the
kit in `kit/csv-reader-speed-01-run-20261121-kit/`.

## Competition exists live

- Competition `csv-reader-speed-01-run-20261121`, "Read broken CSV files faster,
  21 November 2026": status **open**.
- Entries close 2026-11-23T02:42:00Z; final phase 2026-11-23T02:52:00Z to
  2026-11-24T02:42:00Z; result due 2026-12-08T02:42:00Z.
- 144 submissions at check time (up from 127 earlier in the day).
- No entry fee (`entry_fee: null`); free to enter.
- No transcript gate runs for this competition (transcripts optional).

## Grading

- Harness `program/v1`, Node 22, no network, 1 CPU, 1024 MB, 10 s wall budget.
- Each entry runs twice on the same set; the two outputs must match byte for byte.
- Gate: every answer identical to csv-reader 1.0.0's on every case (6 cases per
  set); only a fully passing entry is timed and ranked.
- Ranking: CPU time (trimmed mean of 9 timed runs after 1 warm-up, net of a
  do-nothing control), least first. A reward needs beating csv-reader 1.0.0,
  the house baseline, at 95% confidence (one-sided).
- Rewards: 1st–10th place, $10 each ($100 total). The scored set is drawn
  after entries close from drand quicknet round 34199652.
- Repository cap: 1 MiB total. This entry is well under it (see below).

## Escrow

- Escrow `9B8aiUmqkcEpvvcyYK3seyJmbW35o2PY8WzGLAfvCBVF` on Solana mainnet,
  program `sHC7T46CaBxEdRZjZCVX5D1o9cyomsr4oUA1bHH2MDd`: status **open**,
  fully funded (100,000,000 base units = $100 USDC, mint
  `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`), 0 claimed.
- Sponsor `7ycv2To2epAXAzyskv9KpXMS3Bez42q3oH9iMJk9ZRMY`; resolver
  `9giFaeXd1NumoNYsvpkhrqWHYFihkkJmdHMSabXKFrs8`.

## What the entry must do (semantics summary)

`run(input)` returns csv-reader 1.0.0's `{columns, rows, errors}` for
`{text, header}`: BOM dropped; records end at LF/CRLF; empty lines are no
records; stray CRs outside quotes dropped (`stray_cr`); quoted fields run to
the next non-doubled quote with `""` as one quote and CRLF/lone CR inside read
as LF; junk after a closing quote is appended as-is (`quote_junk`); a quote
that never closes is literal and the rest is re-read unquoted
(`unterminated_quote`); quotes inside unquoted fields are literal; fields stay
strings; rows are padded (`short_row`) or cut (`long_row`) to the first
record's width; errors are `{code, line, row}` in encounter order.

## Verification done in this session

- Kit checksums: every file in `kit.json` verifies (sha256).
- Practice set: **6/6 cases byte-identical** to the reference (`expected.json`),
  via the kit's scorer: `passed: 1, cases_passed: 6, cases_total: 6`.
- Fresh cases drawn from the kit's own generator with new seeds: **24/24
  identical** to the reference.
- Targeted edge cases (empty text, BOM-only, unterminated quotes, doubled
  quotes, quote junk, stray CRs, blank lines, CRLF/LF mixes, short/long rows):
  **51/51 identical**; random small-text fuzz vs the reference:
  **4000/4000 identical**.
- Determinism: two runs of `main.ts` on the practice set produce
  byte-identical `answers.json`; the output also matches the house baseline's
  answers byte for byte.
- Speed (this machine, Node 24; the grader runs Node 22.23.4): solve-only on
  the practice set ≈ 83–99 ms per set vs csv-reader ≈ 483–705 ms — about
  **5–6x faster**. End to end (`main.ts`, incl. JSON parse/stringify) ≈
  760–910 ms vs the house baseline ≈ 1480–1890 ms. On fresh generator sets
  (12 cases) ≈ 281–297 ms vs reference ≈ 911–1161 ms.
- Repo size: `solve.js` + `main.ts` + `README.md` + `LICENSE` + `CHECKS.md`,
  a few kilobytes total — far under the 1 MiB cap. No dependencies, no
  network, no WebAssembly or native code.

## Not yet done (parent)

- Create the GitHub repo `Nocturnalresearch/csv-reader-speed-01-run-20261121`
  (created after the competition opened) and push this commit.
- Set the repo About: website
  `https://make.fun/bounty/csv-reader-speed-01-run-20261121`, topic `makefun`
  (see the requirements' `how_to_submit.repo_about.gh` line).
- Do NOT create `.makefun/owner.json` locally — the parent creates it in the
  browser (only needed if the repo owner is not the account's GitHub login).
- Bundle the transcripts and submit with the kit CLI before
  2026-11-23T02:42:00Z; then check the submission status (stage submitted,
  round 1, 0 failed checks).
