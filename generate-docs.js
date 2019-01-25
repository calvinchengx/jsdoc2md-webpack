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

    /* reduce templateData to an array of class names */
    const functionNames = templateData.reduce((functionNames, identifier) => {
        // console.log("5", functionNames)
        if (identifier.kind === 'function') functionNames.push(identifier.name)
        return functionNames
    }, [])

    /* create a documentation file for each class */
    for (const functionName of functionNames) {
        const template = `{{#function name ="${functionName}"}}{{>docs}}{{/function}}`
        const output = jsdoc2md.renderSync({
            data: templateData,
            template
        })

        fs.writeFileSync(path.resolve(outputDir, `${functionName}.md`), output)
    }
}

export default generateDocs
