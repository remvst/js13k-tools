import { hardcodeConstants } from "../../src/hardcode-constants";
import { assembleHtml } from "../../src/assemble-html";
import { makeZip } from "../../src/make-zip";
import { logFileSize } from "../../src/log-file-size";
import { promises as fs } from 'fs';

const JS_FILES = [
    'sample/game.js',
    'sample/index.js',
];

const CONSTANTS = {
    'PI': 3.14,
};

(async () => {

    const fileContents: string[] = [];
    for (const path of JS_FILES) {
        fileContents.push(await fs.readFile(path, 'utf-8'));
    }

    let jsCode = fileContents.join('\n');

    jsCode = hardcodeConstants(jsCode, CONSTANTS);

    const html = assembleHtml({
        html: await fs.readFile('sample/index.html', 'utf-8'),
        css: await fs.readFile('sample/style.css', 'utf-8'),
        js: jsCode,
    });

    await fs.writeFile('build/index.html', html);

    await makeZip({
        html: 'build/index.html',
        zip: 'build/game.zip',
    });
    await logFileSize('build/game.zip', 13 * 1024);
})();
