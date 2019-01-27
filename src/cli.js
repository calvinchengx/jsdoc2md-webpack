#!/usr/bin/env node

import program from 'commander'
import packageJson from '../package.json'
import path from 'path'
import generateDocs from './generate-docs'
import { mkdir } from './utils'
import { ncp } from 'ncp'

program
    .version(packageJson.version, '-v, --version')
    .option(
        '-i, --inputDir [inputDir]',
        'Input directory where source js resides.'
    )
    .option(
        '-p, --inputDirPrefix [inputDirPrefix]',
        'Prefix after the input directory, which will not be taken into account when generating nested documentation. Relative path.'
    )
    .option(
        '-o, --outputDir [outputDir]',
        'Output directory where markdown files are built into'
    )
    .option(
        '-c, --copyToDir [copyToDir]',
        'Additionally copy the generated documentation in the output directory to this given target copyToDir. Relative path.'
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

let copyToDir = program.copyToDir
if (copyToDir !== undefined) {
    copyToDir = path.resolve(cwd, copyToDir)
    mkdir(copyToDir)
    ncp(outputDir, copyToDir, err => {
        if (err) {
            throw err
        }
        console.log(`Documentation copied to ${copyToDir}`)
    })
}
