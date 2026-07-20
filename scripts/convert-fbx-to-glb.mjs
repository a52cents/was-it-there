import fs from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import console from 'node:console';
import process from 'node:process';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

class NodeFileReader {
  result = null;
  onload = null;
  onloadend = null;
  onerror = null;

  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(
      (buffer) => {
        this.result = buffer;
        this.onload?.({ target: this });
        this.onloadend?.({ target: this });
      },
      (error) => this.onerror?.(error),
    );
  }

  readAsDataURL(blob) {
    blob.arrayBuffer().then(
      (buffer) => {
        this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`;
        this.onload?.({ target: this });
        this.onloadend?.({ target: this });
      },
      (error) => this.onerror?.(error),
    );
  }
}

globalThis.FileReader ??= NodeFileReader;

const [, , inputPath, outputPath] = process.argv;

if (inputPath === undefined || outputPath === undefined) {
  throw new Error('Usage: node scripts/convert-fbx-to-glb.mjs <input.fbx> <output.glb>');
}

const absoluteInputPath = path.resolve(inputPath);
const absoluteOutputPath = path.resolve(outputPath);
const source = await fs.readFile(absoluteInputPath);
const sourceBuffer = source.buffer.slice(
  source.byteOffset,
  source.byteOffset + source.byteLength,
);
const sourceRoot = new FBXLoader().parse(
  sourceBuffer,
  `${path.dirname(absoluteInputPath)}${path.sep}`,
);
sourceRoot.name = path.basename(outputPath, path.extname(outputPath));
sourceRoot.updateMatrixWorld(true);

const exported = await new GLTFExporter().parseAsync(sourceRoot, {
  binary: true,
  onlyVisible: false,
});

if (!(exported instanceof ArrayBuffer)) {
  throw new Error('The exporter did not produce a binary glTF payload.');
}

await fs.mkdir(path.dirname(absoluteOutputPath), { recursive: true });
await fs.writeFile(absoluteOutputPath, Buffer.from(exported));
console.log(`${inputPath} -> ${outputPath}`);
