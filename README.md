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
