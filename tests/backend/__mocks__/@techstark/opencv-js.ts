// Test-time mock for @techstark/opencv-js used by automated suites.
// This is a functional but lightweight stub that implements the small
// subset of OpenCV API our code needs during tests: Mat, Scalar, constants,
// and a few helper functions. It intentionally does not perform real image
// processing — it only provides the shape/fields used by TemplateLoader
// and other recognition utilities so tests can run deterministically.

class Mat {
    public rows: number;
    public cols: number;
    public type: number;
    public data: Uint8Array;
    private _deleted = false;

    constructor(rows = 0, cols = 0, type = 0, _scalar?: any) {
        this.rows = rows;
        this.cols = cols;
        this.type = type;
        const channels = Mat.channelsFromType(type);
        this.data = new Uint8Array(Math.max(0, rows * cols * channels));
    }

    static channelsFromType(type: number) {
        // Match the minimal types used by the code
        if (type === exports.CV_8UC1) return 1;
        if (type === exports.CV_8UC3) return 3;
        if (type === exports.CV_8UC4) return 4;
        return 1;
    }

    isDeleted() {
        return this._deleted;
    }

    delete() {
        this._deleted = true;
        // free data
        this.data = new Uint8Array(0);
    }
}

class Scalar {
    public vals: number[];
    constructor(...vals: number[]) {
        this.vals = vals;
    }
}

const mockCv: any = {
    Mat,
    Scalar,
    CV_8UC1: 0,
    CV_8UC3: 1,
    CV_8UC4: 2,
    COLOR_RGBA2GRAY: 0,
    // No-op conversion: many modules call cv.cvtColor(mat, mat, code)
    cvtColor: (src: Mat, dst: Mat, _code: number) => {
        // If dst provided, try to copy shape; otherwise no-op
        if (dst && src && dst.data && src.data) {
            dst.data.set(src.data.subarray(0, Math.min(dst.data.length, src.data.length)));
        }
        return dst ?? src;
    },
    imread: () => null,
    imwrite: () => null,
    getBuildInformation: () => 'mock-opencv',
    onRuntimeInitialized: undefined,
};

export default mockCv;
