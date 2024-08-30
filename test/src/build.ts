import { hardcodeConstants, macro } from "@remvst/js13k-tools";
import { assembleHtml } from "@remvst/js13k-tools";
import { makeZip } from "@remvst/js13k-tools";
import { logFileSize } from "@remvst/js13k-tools";
import { mangle, NOMANGLE } from "@remvst/js13k-tools";
import { EVALUATE } from "@remvst/js13k-tools";
import { promises as fs } from 'fs';
import CleanCSS from 'clean-css';
import * as terser from 'terser';
import { minify as minifyHTML } from 'html-minifier';
import { Packer, InputAction, InputType } from 'roadroller';

const JS_FILES = [
    'sample/game.js',
    'sample/index.js',
];

const CONSTANTS = {
    'PI': 3.14,
};

(async () => {
    await fs.rm('build/', { force: true, recursive: true });

    const fileContents: string[] = [];
    for (const path of JS_FILES) {
        fileContents.push(await fs.readFile(path, 'utf-8'));
    }

    let jsCode = fileContents.join('\n');

    let debugJs = jsCode;
    debugJs = hardcodeConstants(debugJs, {
        DEBUG: true,
        ...CONSTANTS,
    });
    debugJs = macro(debugJs, NOMANGLE);
    debugJs = macro(debugJs, EVALUATE);

    let debugMangledJs = jsCode;
    debugMangledJs = hardcodeConstants(debugMangledJs, {
        DEBUG: true,
        ...CONSTANTS,
    });
    debugMangledJs = macro(debugMangledJs, NOMANGLE);
    debugMangledJs = macro(debugMangledJs, EVALUATE);
    debugMangledJs = mangle({
        source: debugMangledJs,
        force: [],
        skip: [],
        minLength: 2,
    })

    let prodJs = jsCode;
    prodJs = hardcodeConstants(prodJs, {
        DEBUG: false,
        ...CONSTANTS,
    });
    prodJs = macro(prodJs, NOMANGLE);
    prodJs = macro(prodJs, EVALUATE);
    prodJs = mangle({
        source: prodJs,
        force: [],
        skip: [],
        minLength: 2,
    })
    prodJs = (await terser.minify(prodJs)).code!;

    const packer = new Packer([
        {
            data: prodJs,
            type: 'js' as InputType.JS,
            action: 'eval' as InputAction.Eval,
        },
    ], {
        // see the Usage for available options.
    });
    await packer.optimize();
    const { firstLine, secondLine } = packer.makeDecoder();
    prodJs = [firstLine, secondLine].join('\n');

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

    await fs.mkdir('build/', { recursive: true });
    await fs.writeFile('build/debug.html', debugHtml);
    await fs.writeFile('build/debug_mangled.html', debugMangledHtml);
    await fs.writeFile('build/index.html', prodHtml);

    await makeZip({
        html: 'build/index.html',
        zip: 'build/game.zip',
    });
    await logFileSize('build/game.zip', 13 * 1024);
})();
