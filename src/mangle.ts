import { PROTECTED_NAMES } from './protected-names';

import stripComments from 'strip-comments';
import escapeStringRegexp from 'escape-string-regexp';

const NOMANGLE_START_TAG = '/*nomangle*/';
const NOMANGLE_END_TAG = '/*/nomangle*/';

interface SplitItem {
    content: string;
    mangle: boolean;
}

interface WordCountItem {
    word: string;
    count: number;
}

function split(s: string, start: number = 0): SplitItem[] {
    const res: SplitItem[] = [];
    s.split(NOMANGLE_START_TAG).forEach((component, i) => {
        const spl = component.split(NOMANGLE_END_TAG);
        if (i > 0) {
            res.push({
                'content': spl[0],
                'mangle': false
            });
            res.push({
                'content': spl[1],
                'mangle': true
            });
        } else {
            res.push({
                'content': spl[0],
                'mangle': true
            });
        }
    });

    return res;
};

function join(components: SplitItem[]): string {
    return components.map((component) => {
        if (component.mangle) {
            return module.exports.START_TAG + component.content + module.exports.END_TAG;
        } else {
            return component.content;
        }
    }).join('');
}

function encodeNumber(num: number): string {
    let alphabet = '$_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let newBase = alphabet.length;
    let digits = Math.floor(Math.log(num) / Math.log(newBase)) + 1;

    if (num === 0 || num === 1) {
        digits = 1;
    }

    let res = '';
    for (var i = digits - 1; i >= 0; i--) {

        let multiple = Math.pow(newBase, i);
        let occ = Math.floor(num / multiple);

        res += alphabet.charAt(occ);

        num -= occ * multiple;
    }

    return res;
};

function hasMatch(lines, mangled) {
    const regex = new RegExp('\\b' + escapeStringRegexp(mangled) + '\\b', 'g');

    for (var i = 0; i < lines.length; i++) {
        const matches = lines[i].match(regex) || [];

        if (matches.length) {
            return true;
        }
    }

    return false;
}

export function mangle(opts: {
    source: string,
    force: string[],
    skip: string[],
    minLength: number,
}): string {
    const protectedNames = new Set<string>();
    for (const name of PROTECTED_NAMES.keywords) protectedNames.add(name);
    for (const name of PROTECTED_NAMES.dom) protectedNames.add(name);
    for (const name of opts.skip) protectedNames.add(name);
    for (const name of opts.force) protectedNames.delete(name);

    // Find common names
    const mangledNames = analyze({
        source: opts.source,
        protectedNames: protectedNames,
        minLength: opts.minLength,
    });

    // Stripping the comments and the strings to avoid detecting inexistent conflicts
    const splitComponents = split(opts.source);
    const inputWithoutStrings = splitComponents
        .map(component => !component.mangle ? '""' : component.content) // if it's not manglable, replace with an empty string
        .join('');
    const lines = stripComments(inputWithoutStrings).split('\n');
    const mangleMap = new Map<string, string>();
    let mangleIndex = 0;
    for (const name of mangledNames) {
        while (true) {
            const mangled = encodeNumber(mangleIndex++);

            // Check if the mangled name is already in the original input
            if (!hasMatch(lines, mangled) && !protectedNames.has(mangled)) {
                mangleMap.set(name, mangled);
                break;
            }
        }
    }

    const components = split(opts.source);
    const manglableComponents = components.filter((component) => component.mangle);

    for (let word in mangleMap) {
        const mangled = mangleMap[word];

        const regex = new RegExp('\\b' + word + '\\b', 'g');

        let characterDiff = 0;
        for (let i = 0; i < manglableComponents.length; i++) {
            const component = manglableComponents[i];
            const lengthBefore = component.content.length;
            component.content = component.content.replace(regex, mangled);
            const lengthAfter = component.content.length;
            characterDiff += lengthAfter - lengthBefore;
        }
    }

    return join(components);
}

export function analyze(opts: {
    source: string,
    minLength: number,
    protectedNames: Set<string>,
}) {
    const minLength = opts.minLength || 2;

    const wordList = cleanString(opts.source)
        .split(' ')
        .filter(w => w.length >= minLength && /^[$_a-z]/i.test(w))
        .filter(w => !opts.protectedNames.has(w));

    const counts = countList(wordList)
        .sort((a, b) => a.count - b.count)
        .map(item => ({
            'word': item.word,
            'characters': item.count * item.word.length
        }));

    return counts
        .map(item => item.word)
        .reverse();
};

function cleanString(s: string): string {
    s = join(split(s));

    // Eliminate comments
    s = stripComments(s);

    // Eliminate strings
    s = s.replace(/'.*'/g, ' ');
    s = s.replace(/".*"/g, ' ');

    // Eliminate RGB values
    s = s.replace(/#[0-9a-f]{6}/gi, ' ');
    s = s.replace(/#[0-9a-f]{3}/gi, ' ');

    // Eliminate all the non-word stuff
    s = s.replace(/[^a-z0-9_$]+/gi, ' ');

    return s;
}

function countList(wordList: string[]): WordCountItem[] {
    const map: { [key: string]: WordCountItem } = {};
    const list: WordCountItem[] = [];
    for (const word of wordList) {
        if (!map[word]) {
            map[word] = {
                'word': word,
                'count': 0
            };
            list.push(map[word]);
        }
        map[word].count++;
    }
    return list;
}

