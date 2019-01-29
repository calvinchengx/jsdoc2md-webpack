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
        documentorConfig,
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

    // Do nothing if there are no docstring to process, i.e. templateData is an empty array
    if (templateData.length === 0) return

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
    debugModule('sidebarJson')(documentorConfig)

    writeMarkdownForKinds(
        mapOfKinds,
        inputDir,
        outputDir,
        templateData,
        documentorConfig,
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
 * @param {object} mapOfKinds - an object with the kind name as key and a list of associated objects (with keys name and nested path)
 * @param {string} outputDir - the path to the directory where our generated markdown files is created
 * @param {object} data - the template data object created by jsdoc2md.getTemplateDataSync
 * @param {string} documentorConfig - the kind of documentation website renderer that we will generate for. By default, we don't do anything extra. Default is null.
 * @param {string} sidebarHeader - the directory prefix that we want because the documentor docusaurus can use it to nest generated docs.
 * @param  {...string} kinds - an array of string that can be 'module', 'constructor', 'function', 'enum', 'constant', 'member', 'class'
 */

function writeMarkdownForKinds(
    mapOfKinds,
    inputDir,
    outputDir,
    data,
    documentorConfig,
    ...kinds
) {
    // for supporting docusaurus
    let {
        documentor,
        sidebarsHeader,
        sidebarsTarget,
        sidebarsJson,
        copyJsonToDir
    } = documentorConfig

    let sidebarsTargetList = []

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
            debug(documentorConfig)
            if (documentorConfig === null) {
                // do nothing
                debug('Not doing anything extra')
                // debug(output)
            } else {
                if (documentor === 'docusaurus') {
                    // prepend
                    let id = kindName
                    let title = kindName
                    let sidebarLabel = kindName
                    let data = { id, title, sidebarLabel }
                    let result = docusarusTemplate(data)
                    output = `${result}\n\n${output}`

                    let sidebarsPath = join(relative(outputDir, dir), kindName)
                    if (sidebarsHeader !== undefined) {
                        sidebarsPath = join(sidebarsHeader, sidebarsPath)
                    }
                    sidebarsTargetList.push(sidebarsPath)
                }
            }

            // write out the markdown file
            fs.writeFileSync(resolve(dir, `${kindName}.md`), output)
        }
    }
    debugModule('sidebarJson')(sidebarsTargetList)

    if (documentor === 'docusaurus') {
        sidebarsJson['docs'][sidebarsTarget] = Array.from(
            new Set(sidebarsTargetList)
        )
        const outputJson = resolve(outputDir, 'sidebars.json')
        const copyJsonTo = resolve(inputDir, copyJsonToDir, 'sidebars.json')
        fs.writeFileSync(outputJson, JSON.stringify(sidebarsJson, null, 4))
        ncp(outputJson, copyJsonTo)
    }

    debugModule('sidebarJson')(sidebarsJson)
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
