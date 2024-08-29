import { hardcodeConstants } from "../../src/hardcode-constants";

let code = `function yolo() {
    console.log('Constant is', PI);
}`;

code = hardcodeConstants(code, {
    'PI': 3.14,
})

console.log('YUP!', code);
