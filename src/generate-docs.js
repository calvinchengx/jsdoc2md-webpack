import jsdoc2md from 'jsdoc-to-markdown'
import fs from 'fs'
import { mkdir } from './utils'
import { resolve, relative, join } from 'path'
import debugModule from 'debug'
const debug = debugModule('generate-docs')

function generateDocs(options) {
    let { inputDir, inputDirPrefix, outputDir, changedFiles } = options
    if (inputDir === undefined) throw new Error('Base input directory required')
    if (inputDirPrefix === undefined) inputDirPrefix = 'src'
    if (outputDir === undefined) resolve(inputDir, 'doc')
    let inputDirWithPrefix = resolve(inputDir, inputDirPrefix)
    let sourceFiles = resolve(inputDirWithPrefix, '**/*.js')
    if (changedFiles !== undefined) {
        sourceFiles = changedFiles
    }

    // get template data
    const templateData = jsdoc2md.getTemplateDataSync({
        files: sourceFiles
    })

    // create outputDir if it does not exist
    try {
        mkdir(outputDir)
    } catch (e) {
        if (e.code !== 'EEXIST') throw e
    }

    const accumulator = templateData.reduce((accumulator, identifier) => {
        accumulator.push(identifier.kind)
        return accumulator
    }, [])

    // kinds is an array of strings where the string could be
    // 'module', 'constructor', 'function', 'enum', 'constant', 'member', 'class'
    // Reduce the accumulator array into a set of unique kinds,
    // then change it back into an array
    let kinds = Array.from(new Set(accumulator))
    debug(kinds)

    let mapOfKinds = {}

    kinds.map(kind => {
        mapOfKinds[[kind]] = templateData.reduce((kindNames, identifier) => {
            debug(identifier)
            if (identifier.kind === kind) {
                let nestedPath
                if (identifier.meta !== undefined) {
                    nestedPath = relative(
                        inputDirWithPrefix,
                        identifier.meta.path
                    )
                }
                kindNames.push({
                    name: identifier.name,
                    nestedPath
                })
            }
            return kindNames
        }, [])
    })

    debug(mapOfKinds['class'])

    writeMarkdownForKinds(mapOfKinds, outputDir, templateData, 'module')
}

/**
 * Create the markdown files for each kind that we want
 * @param {object} mapOfKinds is an object with the kind name as key and a list of associated objects (with keys name and nested path)
 * @param {string} outputDir is the path to the directory where our generated markdown files is created
 * @param {object} data is the template data object created by jsdoc2md.getTemplateDataSync
 * @param  {...string} kinds is an array of string that can be 'module', 'constructor', 'function', 'enum', 'constant', 'member', 'class'
 */
function writeMarkdownForKinds(mapOfKinds, outputDir, data, ...kinds) {
    for (const kind of kinds) {
        for (const kindObj of mapOfKinds[[kind]]) {
            const kindName = kindObj.name
            const dir = join(outputDir, kindObj.nestedPath)
            const template = `{{#${kind} name ="${kindName}"}}{{>docs}}{{/${kind}}}`
            const output = jsdoc2md.renderSync({
                data,
                template
            })
            // make the directory if it doesn't exist
            try {
                mkdir(dir)
            } catch (e) {
                if (e.code !== 'EEXIST') throw e
            }
            // write out the markdown file
            fs.writeFileSync(resolve(dir, `${kindName}.md`), output)
        }
    }
}

export default generateDocs
