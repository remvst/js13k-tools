import { hardcodeConstants } from "../../src/hardcode-constants";
import { assembleHtml } from "../../src/assemble-html";
import { makeZip } from "../../src/make-zip";
import { logFileSize } from "../../src/log-file-size";
import { mangle } from "../../src/mangle";
import { promises as fs } from 'fs';
import CleanCSS from 'clean-css';
import * as terser from 'terser';
import { minify as minifyHTML} from 'html-minifier';

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

    let debugJs = jsCode;
    debugJs = hardcodeConstants(jsCode, {
        DEBUG: true,
        ...CONSTANTS,
    });

    let debugMangledJs = jsCode;
    debugMangledJs = hardcodeConstants(jsCode, {
        DEBUG: true,
        ...CONSTANTS,
    });
    debugMangledJs = mangle({
        source: debugMangledJs,
        force: [],
        skip: [],
        minLength: 2,
    })

    let prodJs = jsCode;
    prodJs = hardcodeConstants(jsCode, {
        DEBUG: false,
        ...CONSTANTS,
    });
    // TODO mangle
    prodJs = (await terser.minify(prodJs)).code!;

    const html = await fs.readFile('sample/index.html', 'utf-8');
    const minifiedHtml = minifyHTML(html, {
        'collapseWhitespace': true,
        'minifyCSS': false,
        'minifyJS': false
    });

    const css = await fs.readFile('sample/style.css', 'utf-8');
    const minifiedCss = new CleanCSS().minify(css).styles;

    const debugHtml = assembleHtml({
        html,
        css,
        js: debugJs,
    });

    const debugMangledHtml = assembleHtml({
        html,
        css,
        js: debugMangledJs,
    });

    const prodHtml = assembleHtml({
        html: minifiedHtml,
        css: minifiedCss,
        js: prodJs,
    });

    await fs.writeFile('build/debug.html', debugHtml);
    await fs.writeFile('build/debug_mangled.html', debugMangledHtml);
    await fs.writeFile('build/index.html', prodHtml);

    await makeZip({
        html: 'build/index.html',
        zip: 'build/game.zip',
    });
    await logFileSize('build/game.zip', 13 * 1024);
})();
