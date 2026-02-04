"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectSaccadesFromVectors = detectSaccadesFromVectors;
var schema_ts_1 = require("./schema.ts");
function detectSaccadesFromVectors(vectors, options) {
    // Merge user options with defaults
    var opts = __assign(__assign({}, schema_ts_1.DEFAULT_SACCADE_OPTIONS), options);
    // Used to suppress unused variable warning: remove later
    console.log("Saccade detection options:", opts);
    // Temp stub implementation
    return {
        velocitiesDegPerSec: new Array(vectors.length).fill(0),
        saccades: [],
        saccadesExtended: [],
    };
}
// export function detectSaccadesFromVectors(...) {...}
