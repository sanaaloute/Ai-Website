"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pLimit = pLimit;
function pLimit(concurrency) {
    if (concurrency < 1) {
        throw new Error('Concurrency must be at least 1');
    }
    const queue = [];
    let active = 0;
    const next = () => {
        if (queue.length === 0 || active >= concurrency)
            return;
        active++;
        const resolve = queue.shift();
        resolve();
    };
    return (fn) => {
        return new Promise((resolve, reject) => {
            queue.push(() => {
                Promise.resolve()
                    .then(() => fn())
                    .then((value) => {
                    active--;
                    resolve(value);
                    next();
                }, (err) => {
                    active--;
                    reject(err);
                    next();
                });
            });
            next();
        });
    };
}
//# sourceMappingURL=concurrency.js.map