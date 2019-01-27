#!/usr/bin/env node

import program from 'commander'
import packageJson from '../package.json'
import path from 'path'
import generateDocs from './generate-docs'

program
    .version(packageJson.version, '-v, --version')
    .option(
        '-i, --inputDir [inputDir]',
        'input directory where source js resides'
    )
    .option(
        '-p, --inputDirPrefix [inputDirPrefix]',
        'prefix after the input directory, which will not be taken into account when generating nested documentation'
    )
    .option(
        '-o, --outputDir [outputDir]',
        'output directory where markdown files are built into'
    )
    .parse(process.argv)

// The current working directory where this command line program is executed
const cwd = process.cwd()
// when creating sub-directories for our markdown documentation, prefix will not be taken into account
// e.g. 'src/javascript'. The default is 'src'
const inputDirPrefix = program.inputDirPrefix || path.resolve(cwd, 'src')
// directory where our js source code resides
const inputDir = program.inputDir || path.resolve(cwd)
// directory where our markdown output will reside
const outputDir = program.outputDir || path.resolve(cwd, 'docs')

generateDocs({ inputDir, inputDirPrefix, outputDir })
console.log(`Documentation generated in ${outputDir}`)
