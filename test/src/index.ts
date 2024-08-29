import { hardcodeConstants } from "../../src/hardcode-constants";
import { promises as fs } from 'fs';

(async () => {
    const JS_FILES = [
        'sample/game.js',
        'sample/index.js',
    ];

    const fileContents: string[] = [];
    for (const path of JS_FILES) {
        fileContents.push(await fs.readFile(path, 'utf-8'));
    }

    let code = fileContents.join('\n');

    code = hardcodeConstants(code, {
        'PI': 3.14,
    })

    console.log(code);
})();
