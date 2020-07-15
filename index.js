// @ts-check
const core = require('@actions/core');
const exec = require('@actions/exec');
const io = require('@actions/io');
const tc = require('@actions/tool-cache');
const path = require('path');

//================================================
// Version
//================================================

/**
 * @param {Iterable<string>} full
 */
function getVersions(full) {
  const versions = new Set(full);

  for (const version of full) {
    versions.add(/^\d+/.exec(version)[0]);
    versions.add(/^\d+\.\d+/.exec(version)[0]);
  }

  return versions;
}

const VERSIONS = getVersions([
  '3.5.0',
  '3.5.1',
  '3.5.2',
  '3.6.0',
  '3.6.1',
  '3.6.2',
  '3.7.0',
  '3.7.1',
  '3.8.0',
  '3.8.1',
  '3.9.0',
  '3.9.1',
  '4.0.0',
  '4.0.1',
  '5.0.0',
  '5.0.1',
  '5.0.2',
  '6.0.0',
  '6.0.1',
  '7.0.0',
  '7.0.1',
  '7.1.0',
  '8.0.0',
  '8.0.1',
  '9.0.0',
  '9.0.1',
  '10.0.0',
]);

/**
 * @param {string} version
 */
function getFullVersions(version) {
  return Array.from(VERSIONS)
    .filter((v) => /^\d+\.\d+\.\d+$/.test(v) && v.startsWith(version))
    .sort()
    .reverse();
}

//================================================
// URL
//================================================

/**
 * @param {string} version
 */
function getUrl(version) {
  return `https://github.com/llvm/llvm-project/releases/download/llvmorg-${version}/llvm-project-${version}.tar.xz`;
}

//================================================
// Action
//================================================

/**
 * @param {string} version
 * @param {string} directory
 */
async function compile(version, directory) {
  const platform = process.platform;

  if (!VERSIONS.has(version)) {
    throw new Error(`Unsupported target! (version='${version}')`);
  }
  let url;
  let fullVersion;
  for (const v of getFullVersions(version)) {
    url = getUrl(v);
    if (url) {
      fullVersion = v;
      core.setOutput('version', fullVersion);
      break;
    }
  }
  if (!url) {
    throw new Error(`Unsupported target! (version='${version}')`);
  }

  console.log(`Using LLVM ${version} (${fullVersion})...`);
  console.log(`Downloading and extracting '${url}'...`);
  const archive = await tc.downloadTool(url);
  let exit;
  if (platform === 'win32') {
    exit = await exec.exec('7z', ['x', archive, `-o${directory}`]);
  } else {
    await io.mkdirP(directory);
    exit = await exec.exec('tar', [
      'xf',
      archive,
      '-C',
      directory,
      '--strip-components=1',
    ]);
  }
  if (exit !== 0) {
    throw new Error(`Could not extract LLVM and Clang source. code = ${exit}`);
  }
  await io.mkdirP(path.join(directory, 'build'));
  process.chdir(path.join(directory, 'build'));
  console.log(`Generating the project using cmake...`);
  exit = await exec.exec('cmake', [
    '-G',
    'Ninja',
    '-DCMAKE_BUILD_TYPE=Release',
  ]);
  if (exit !== 0) {
    throw new Error(
      `Could not use cmake to generate the project using Ninja. code = ${exit}`
    );
  }
  console.log(`Start building LLVM...`);
  exit = await exec.exec('cmake', ['-build', '.']);
  if (exit !== 0) {
    throw new Error(`Could build llvm using cmake. code = ${exit}`);
  }
  console.log(`Installed LLVM and Clang ${version} (${fullVersion})!`);
}

/**
 * @param {string} version
 * @param {string} directory
 * @param {string} cached
 */
async function run(version, directory, cached) {
  if (cached === 'true') {
    console.log(`Using cached LLVM and Clang ${version}...`);
  } else {
    await compile(version, directory);
  }

  const bin = path.resolve(path.join(directory, 'build', 'bin'));
  const lib = path.resolve(path.join(directory, 'build', 'lib'));
  core.addPath(bin);
  core.exportVariable(
    'LD_LIBRARY_PATH',
    `${lib}:${process.env.LD_LIBRARY_PATH || ''}`
  );
  core.exportVariable(
    'DYLD_LIBRARY_PATH',
    `${lib}:${process.env.DYLD_LIBRARY_PATH || ''}`
  );
}

try {
  const version = core.getInput('version');
  const directory = core.getInput('directory');
  const cached = core.getInput('cached') || 'false';
  run(version, directory, cached);
} catch (error) {
  console.error(error.stack);
  core.setFailed(error.message);
}
