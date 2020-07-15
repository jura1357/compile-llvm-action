# compile-llvm-action

A GitHub Action for downloading and installing LLVM and Clang binaries.

The binaries will be added to the relevant environment variables for the
platform after installation (e.g., `PATH`, `LD_LIBRARY_PATH`, and/or
`DYLD_LIBRARY_PATH`). Caching is supported using the `actions/cache@v2` action
as shown in an example below.

Released under the Apache License 2.0.

## Inputs

### `version`

**Required** The version of LLVM and Clang binaries to install.

This can be a specific version such as `3.6.2` or a minimum version like `3.6`
or just `3`. When specifying a minimum version, the highest compatible version
supported by the platform will be installed (e.g., `3.6.2` for `3.6` or `3.9.1`
for `3`).

### `directory`

**Required** The directory to install LLVM and Clang binaries to.

### `cached`

Whether the LLVM and Clang binaries were cached.

## Outputs

### `version`

The full version of LLVM and Clang binaries installed.

This will only differ from the value of the `version` input when specifying a
minimum version like `3.6` or `3`.

## Example Usage

```yml
- name: Install LLVM and Clang
  uses: KyleMayes/install-llvm-action@v1
  with:
    version: '10.0'
    directory: ~/.clang
```

## Example Usage (with caching)

```yml
- name: Cache LLVM and Clang
  id: cache-llvm
  uses: actions/cache@v2
  with:
    path: ~/.clang
    key: llvm-10.0
- name: Install LLVM and Clang
  uses: KyleMayes/install-llvm-action@v1
  with:
    version: '10.0'
    directory: ~/.clang
    cached: ${{ steps.cache-llvm.outputs.cache-hit }}
```
