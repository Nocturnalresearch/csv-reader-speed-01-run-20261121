# csv-reader-speed-01-run-20261121

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/Nocturnalresearch/csv-reader-speed-01-run-20261121/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/Nocturnalresearch/csv-reader-speed-01-run-20261121/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A faster drop-in for make.fun's csv-reader 1.0.0: it answers exactly as csv-reader does on every case — the same `{columns, rows, errors}` for every `{text, header}`, including every broken-row rule (BOM, stray CRs, unterminated quotes, quote junk, short and long rows, blank lines) — but reads the text with indexOf-driven jumps and slices instead of one character at a time. On the kit's practice set it answers all 6 cases byte-identically to the reference and runs about 5–6x faster than csv-reader itself. Built by an AI agent for make.fun's "Read broken CSV files faster, 21 November 2026" bounty, $100 in USDC.

## How the reader works

`main.ts` reads every case from `/input/cases.json`, answers each one alone with `run()` from `solve.js`, and writes `/output/answers.json`. `solve.js` is a dependency-free ES module (Node 22, standard library only, no network, deterministic) that implements csv-reader 1.0.0's semantics exactly:

- A U+FEFF at the very start of the text is dropped; a record ends at LF or CRLF, and a line left with no characters is no record.
- Outside a quoted field a CR not followed by LF is dropped (`stray_cr`); inside a quoted field each CRLF or lone CR is read as one LF.
- A field that opens with a quote runs to the next quote that is not doubled (`""` is one quote); what follows its closing quote, up to the next comma or line break, is appended as it stands (`quote_junk`); a quote that never closes is a literal character and the text after it is read again as unquoted (`unterminated_quote`). A quote inside an unquoted field is a literal character.
- Fields stay strings, never trimmed or converted. `columns` is the first record when `header` is true, else null; rows are padded with `""` (`short_row`) or cut (`long_row`) to the first record's width. Each error is `{code, line, row}` in the order met.

Speed comes from never reading the text one character at a time: a record whose first line holds no quote is split in one go; unquoted fields are found with `indexOf` jumps for the next comma and the next line break (the next line break is cached per record); quoted fields jump from quote to quote with `indexOf('"')`, and their content is sliced, not built up character by character — only a segment that actually holds a line break goes through the CR/LF rewrite.

## Run it

```sh
node main.ts
```

It reads the cases from `/input/cases.json` and writes the answers to `/output/answers.json`. Outside the sandbox, `MAKEFUN_INPUT_DIR` and `MAKEFUN_OUTPUT_DIR` stand in for `/input` and `/output`.

## Test it

Grade it on the kit's practice set exactly as the server will:

```sh
node cli/makefun.mjs grade-local --kit <the unpacked kit> --bot <this repository> --driver docker
```

Locally, the same check is: run `main.ts` on `practice/input/cases.json` twice (the two outputs must match byte for byte) and run the kit's scorer (`program/scorer/main.ts`) against `practice/reference/expected.json` — it reports `passed: 1, cases_passed: 6`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=myxp0szy&utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>
