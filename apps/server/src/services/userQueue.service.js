/**
 * Per-User Sequential Task Queue
 * Ensures mutation operations (move, copy, paste, delete) for the same user
 * execute sequentially to eliminate race conditions across multiple tabs or batch operations.
 */

const userQueues = new Map();

/**
 * Enqueues a task for a specific userId and executes it sequentially.
 * @param {string} userId - User ID string
 * @param {Function} taskFn - Async function returning a promise
 * @returns {Promise<any>} Result of the task function
 */
const enqueueUserTask = (userId, taskFn) => {
    const key = String(userId);

    if (!userQueues.has(key)) {
        userQueues.set(key, Promise.resolve());
    }

    const previousPromise = userQueues.get(key);

    const currentPromise = previousPromise
        .then(() => taskFn())
        .catch((err) => {
            console.error(`  ❌ [USER QUEUE ERROR] Task failed for user ${key}:`, err.message);
            throw err;
        })
        .finally(() => {
            // Clean up queue memory if this task is the last one in line
            if (userQueues.get(key) === currentPromise) {
                userQueues.delete(key);
            }
        });

    userQueues.set(key, currentPromise);
    return currentPromise;
};

module.exports = {
    enqueueUserTask
};
