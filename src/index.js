import generateDocs from './generate-docs'
import { resolve } from 'path'
import fs from 'fs'

class JSDoc2MdWebpackPlugin {
    /**
     * @param {object} options allows us to set inputDir (string), inputDirPrefix (string), outputDir (string) and changedFiles ({string|string[]})
     * changedFiles is one or more filenames to process.  Accepts globs (e.g. `*.js`).
     * if changedFiles is provided, then only those files will be parsed and documentation re-generated for those files
     */
    constructor(options) {
        this.inputDirPrefix = options.inputDirPrefix || 'src'
        this.inputDir = options.inputDir
        this.outputDir = options.outputDir
        this.documentor = options.documentor
        this.copyToDir = options.copyToDir
        this.changedFiles = options.changedFiles
    }

    // using webpack compiler hooks, update docs whenever a js file gets changed
    apply(compiler) {
        compiler.hooks.emit.tapAsync(
            'JSDoc2MdWebpackPlugin',
            (compilation, callback) => {
                const context = compilation.compiler.options.context

                // find all the js files that are changed (i.e. edited)
                const changedTimes =
                    compilation.compiler.watchFileSystem.watcher.mtimes
                const changedFiles = Object.keys(changedTimes)
                    .map(file => `\n ${file}`)
                    .join('')

                let documentorConfig
                if (this.documentor) {
                    documentorConfig = JSON.parse(
                        fs.readFileSync(resolve(context, this.documentor))
                    )
                }

                // generate documentation from docstring in source code, into markdown
                if (changedFiles !== '') {
                    let options = {
                        inputDirPrefix: this.inputDirPrefix,
                        inputDir: this.inputDir || context,
                        outputDir: this.outputDir || resolve(context, 'docs'),
                        documentorConfig,
                        copyToDir: this.copyToDir,
                        changedFiles
                    }
                    generateDocs(options)
                }

                callback()
            }
        )
    }
}

export default JSDoc2MdWebpackPlugin
