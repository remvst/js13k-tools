import { spawn } from 'child_process';
import { archiveFile } from "zip-lib";

export async function makeZip(opts: {
    html: string,
    zip: string,
}) {
    await archiveFile(opts.html, opts.zip);

    // advzip it
    await new Promise<void>((resolve, reject) => {
        const subprocess = spawn('advzip', ['-z', opts.zip]);

        subprocess.stderr.on('data', (data) => {
            console.error('stderr: ' + data);
        });

        subprocess.on('exit', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject('advzip failed with error code ' + code);
            }
        });
    });
}
