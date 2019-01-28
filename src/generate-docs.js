import jsdoc2md from 'jsdoc-to-markdown'
import fs from 'fs'
import { mkdir } from './utils'
import { resolve, relative, join } from 'path'
import debugModule from 'debug'
const debug = debugModule('generate-docs')
import Handlebars from 'handlebars'
import { ncp } from 'ncp'

function generateDocs(options) {
    let {
        inputDir,
        inputDirPrefix,
        outputDir,
        documentor,
        sidebarHeader,
        copyToDir,
        changedFiles
    } = options
    if (inputDir === undefined) throw new Error('Base input directory required')
    if (inputDirPrefix === undefined) inputDirPrefix = 'src'
    if (outputDir === undefined) resolve(inputDir, 'doc')
    let inputDirWithPrefix = resolve(inputDir, inputDirPrefix)
    let sourceFiles = resolve(inputDirWithPrefix, '**/*.js')
    if (copyToDir !== undefined) {
        copyToDir = resolve(inputDir, copyToDir)
    }
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

    writeMarkdownForKinds(
        mapOfKinds,
        outputDir,
        templateData,
        documentor,
        sidebarHeader,
        'module'
    )

    if (copyToDir !== undefined) {
        copyToDir = resolve(outputDir, copyToDir)
        mkdir(copyToDir)
        ncp(outputDir, copyToDir, err => {
            if (err) {
                throw err
            }
            console.log(`Documentation copied to ${copyToDir}`)
        })
    }
}

/**
 * Create the markdown files for each kind that we want
 * @param {object} mapOfKinds is an object with the kind name as key and a list of associated objects (with keys name and nested path)
 * @param {string} outputDir is the path to the directory where our generated markdown files is created
 * @param {object} data is the template data object created by jsdoc2md.getTemplateDataSync
 * @param {string} docuWebsite is the kind of documentation website renderer that we will generate for. By default, we don't do anything extra. Default is null.
 * @param  {...string} kinds is an array of string that can be 'module', 'constructor', 'function', 'enum', 'constant', 'member', 'class'
 */
function writeMarkdownForKinds(
    mapOfKinds,
    outputDir,
    data,
    documentor,
    sidebarHeader,
    ...kinds
) {
    // for supporting docusaurus
    let sidebarJson = []

    for (const kind of kinds) {
        for (const kindObj of mapOfKinds[[kind]]) {
            const kindName = kindObj.name
            const dir = join(outputDir, kindObj.nestedPath)
            const template = `{{#${kind} name ="${kindName}"}}{{>docs}}{{/${kind}}}`
            let output = jsdoc2md.renderSync({
                data,
                template
            })

            // make the directory if it doesn't exist
            try {
                mkdir(dir)
            } catch (e) {
                if (e.code !== 'EEXIST') throw e
            }
            // support docusaurus or other documentation website renderer by prepending to output
            /* docusaurus
                ---
                id: name
                title: title
                sidebar_label: title
                ---
            */
            debug(documentor)
            if (documentor === null) {
                // do nothing
                debug('Not doing anything extra')
                // debug(output)
            } else if (documentor === 'docusaurus') {
                // prepend
                let id = kindName
                let title = kindName
                let sidebarLabel = kindName
                let data = { id, title, sidebarLabel }
                let result = docusarusTemplate(data)
                output = `${result}\n\n${output}`

                let sidebarPath = join(relative(outputDir, dir), kindName)
                if (sidebarHeader !== undefined) {
                    sidebarPath = join(sidebarHeader, sidebarPath)
                }
                sidebarJson.push(sidebarPath)
            }

            // write out the markdown file
            fs.writeFileSync(resolve(dir, `${kindName}.md`), output)
        }
    }

    debugModule('sidebarJson')(sidebarJson)
}

/**
 *
 * returns a string from a handlebars template, that is suitable for docusaurus
 * @param {*} data has 3 keys id, title and sidebarLabel
 */
function docusarusTemplate(data) {
    let source = `---\nid: {{id}}\ntitle: {{title}}\nsidebar_label: {{sidebarLabel}}\n---`
    let template = Handlebars.compile(source)
    return template(data)
}

export default generateDocs
