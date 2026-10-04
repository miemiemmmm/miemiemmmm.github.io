# Yang Zhang's homepage

Access my personal homepage: <https://miemiemmmm.github.io/>

## Changing the email address

The address is XOR-ed against `KEY` in `index.js`, so it appears nowhere in the
source as plain text — searching the repository for it will find nothing. To
change it, regenerate the cipher:

```bash
python3 -c 'k="h5md-trajectory-metadata"; e="new@address"; print([ord(c)^ord(k[i%len(k)]) for i,c in enumerate(e)])'
```

and paste the result into `CIPHER`.

## Previewing the opening animation

It plays once per browser tab, so a refresh skips it. Add `?intro` to the
address (e.g. `http://localhost:8000/?intro`) to force it on every load.

## Fonts

- **Archivo** (headings, labels, navigation) — SIL Open Font License, served from
  `fonts/Archivo/` (the Google Fonts web subsets, unchanged; see `fonts/Archivo/NOTICE.txt`).
- **MiSans** by Xiaomi (body text) — served from `fonts/MiSans/` as character subsets of the
  official files, under Xiaomi's own licence (`fonts/MiSans/MiSans-license.pdf`). It is not
  covered by anything else in this repository. See `fonts/MiSans/NOTICE.txt` for what was done.
