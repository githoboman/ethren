# Dependency Notes

The repository pins the Ethereum cryptography dependency family to compatible v1 releases because Hardhat `2.29.1` resolves `ethereum-cryptography@1.2.0`, while ethers `6.17.0` and the worker tooling resolve `ethereum-cryptography@2.2.1`.

The workspace overrides are intentionally narrow:

- `@noble/hashes`: `1.3.2`
- `@noble/curves`: `1.4.0`
- `@scure/bip39`: `1.3.0`
- `@scure/bip32`: `1.4.0`

The `@scure/bip39` pin prevents its newer `sha2` import path from being paired with the older v1 hash package expected by `ethereum-cryptography`. No third-party source code is patched and no global pnpm configuration is changed.
