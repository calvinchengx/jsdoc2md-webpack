import generateDocs from './generate-docs'
import path from 'path'

class JSDoc2MdWebpackPlugin {
    /**
     *
     * @param {string} outputDir output directory where generated markdown files are created
     *
     */
    constructor(outputDir) {
        this.outputDir = outputDir
    }

    // using webpack compiler hooks, update docs whenever a js file gets changed
    apply(compiler) {
        compiler.hooks.emit.tapAsync(
            'JSDoc2MdWebpackPlugin',
            (compilation, callback) => {
                const context = compilation.compiler.options.context

                if (this.outputDir === undefined) {
                    this.outputDir = path.resolve(context, 'docs')
                }

                // find all the js files that are changed (i.e. edited)
                const changedTimes =
                    compilation.compiler.watchFileSystem.watcher.mtimes
                const changedFiles = Object.keys(changedTimes)
                    .map(file => `\n ${file}`)
                    .join('')

                // generate documentation from docstring in source code, into markdown
                if (changedFiles !== '') {
                    generateDocs(changedFiles, this.outputDir)
                }

                callback()
            }
        )
    }

    // our custom generateDocs function which uses jsdoc2md
    static generateDocs(sourceFiles, outputDir) {
        generateDocs(sourceFiles, outputDir)
    }
}

export default JSDoc2MdWebpackPlugin
