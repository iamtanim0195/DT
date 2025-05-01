declare module 'three/examples/jsm/loaders/EXRLoader.js' {
    import { Loader, DataTexture } from 'three';

    export default class EXRLoader extends Loader {
        load(
            url: string,
            onLoad: (texture: DataTexture) => void,
            onProgress?: (event: ProgressEvent) => void,
            onError?: (event: ErrorEvent) => void
        ): void;
        loadAsync(url: string): Promise<DataTexture>;
    }
}
