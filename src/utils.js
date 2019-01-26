import semver from 'semver'
import fs from 'fs'

/**
 * mkdir uses a custom loop if node version is less than 10.12.0, otherwise, it uses fs.mkDirSync recursive true
 * @param {string} pathToCreate - e.g. 'dir/subDir/subSubDir'
 */
function mkdir(pathToCreate) {
    let currentVersion = semver.clean(process.version)
    let lessThan = semver.lt(currentVersion, '10.12.0')
    if (lessThan) {
        pathToCreate.split(path.sep).reduce((prevPath, folder) => {
            const currentPath = path.join(prevPath, folder, path.sep)
            if (!fs.existsSync(currentPath)) {
                fs.mkdirSync(currentPath)
            }
            return currentPath
        }, '')
    } else {
        try {
            fs.mkdirSync(pathToCreate, { recursive: true })
        } catch (e) {
            throw e
        }
    }
}

export { mkdir }
