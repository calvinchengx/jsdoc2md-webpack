import jsdoc2md from 'jsdoc-to-markdown'
import fs from 'fs'
import path from 'path'

function generateDocs(sourceFiles, outputDir) {
    // get template data
    const templateData = jsdoc2md.getTemplateDataSync({
        files: sourceFiles
    })

    // create outputDir if it does not exist
    try {
        fs.mkdirSync(outputDir)
    } catch (e) {
        if (e.code !== 'EEXIST') throw e
    }

    // handle functions
    const functionNames = templateData.reduce((functionNames, identifier) => {
        if (identifier.kind === 'function') functionNames.push(identifier.name)
        return functionNames
    }, [])

    for (const functionName of functionNames) {
        const template = `{{#function name ="${functionName}"}}{{>docs}}{{/function}}`
        const output = jsdoc2md.renderSync({
            data: templateData,
            template
        })

        fs.writeFileSync(path.resolve(outputDir, `${functionName}.md`), output)
    }

    // handle classes
    const classNames = templateData.reduce((classNames, identifier) => {
        if (identifier.kind === 'class') classNames.push(identifier.name)
        return classNames
    }, [])

    for (const className of classNames) {
        const template = `{{#class name ="${className}"}}{{>docs}}{{/class}}`
        const output = jsdoc2md.renderSync({
            data: templateData,
            template
        })

        fs.writeFileSync(path.resolve(outputDir, `${className}.md`), output)
    }
}

export default generateDocs
