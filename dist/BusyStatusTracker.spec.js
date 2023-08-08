"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const deferred_1 = require("./deferred");
const BusyStatusTracker_1 = require("./BusyStatusTracker");
describe('BusyStatusTracker', () => {
    let tracker;
    let latestStatus;
    beforeEach(() => {
        latestStatus = BusyStatusTracker_1.BusyStatus.idle;
        tracker = new BusyStatusTracker_1.BusyStatusTracker();
        tracker.on('change', (value) => {
            latestStatus = value;
        });
    });
    afterEach(() => {
        tracker === null || tracker === void 0 ? void 0 : tracker.destroy();
    });
    it('tracks a single run', () => {
        (0, chai_1.expect)(latestStatus).to.eql(BusyStatusTracker_1.BusyStatus.idle);
        tracker.run(() => {
            (0, chai_1.expect)(tracker.status).to.eql(BusyStatusTracker_1.BusyStatus.busy);
        });
        (0, chai_1.expect)(latestStatus).to.eql(BusyStatusTracker_1.BusyStatus.idle);
    });
    it('tracks a single async flow', async () => {
        const deferred = new deferred_1.Deferred();
        const finishedPromise = tracker.run(() => {
            return deferred.promise;
        });
        (0, chai_1.expect)(latestStatus).to.eql(BusyStatusTracker_1.BusyStatus.busy);
        deferred.resolve();
        await finishedPromise;
        (0, chai_1.expect)(latestStatus).to.eql(BusyStatusTracker_1.BusyStatus.idle);
    });
    it('independently tracks multiple runs for same program', () => {
        tracker.run(() => {
            (0, chai_1.expect)(latestStatus).to.eql(BusyStatusTracker_1.BusyStatus.busy);
        });
        tracker.run(() => {
            (0, chai_1.expect)(latestStatus).to.eql(BusyStatusTracker_1.BusyStatus.busy);
        });
        (0, chai_1.expect)(latestStatus).to.eql(BusyStatusTracker_1.BusyStatus.idle);
    });
    it('tracks as `busy` one of the runs is still pending', async () => {
        const deferred = new deferred_1.Deferred();
        tracker.run(() => {
            (0, chai_1.expect)(latestStatus).to.eql(BusyStatusTracker_1.BusyStatus.busy);
        });
        const finishedPromise = tracker.run(() => {
            (0, chai_1.expect)(latestStatus).to.eql(BusyStatusTracker_1.BusyStatus.busy);
            return deferred.promise;
        });
        (0, chai_1.expect)(latestStatus).to.eql(BusyStatusTracker_1.BusyStatus.busy);
        deferred.resolve();
        await finishedPromise;
        (0, chai_1.expect)(latestStatus).to.eql(BusyStatusTracker_1.BusyStatus.idle);
    });
    it('handles error during synchronous flow', () => {
        try {
            tracker.run(() => {
                throw new Error('Crash');
            });
        }
        catch (_a) { }
        (0, chai_1.expect)(latestStatus).to.eql(BusyStatusTracker_1.BusyStatus.idle);
    });
    it('handles error during async flow', async () => {
        try {
            await tracker.run(() => {
                return Promise.reject(new Error('Crash'));
            });
        }
        catch (_a) { }
        (0, chai_1.expect)(latestStatus).to.eql(BusyStatusTracker_1.BusyStatus.idle);
    });
    it('only finalizes on the first call to finalize', () => {
        try {
            tracker.run((finalize) => {
                (0, chai_1.expect)(latestStatus).to.eql(BusyStatusTracker_1.BusyStatus.busy);
                finalize();
                (0, chai_1.expect)(latestStatus).to.eql(BusyStatusTracker_1.BusyStatus.idle);
                finalize();
                (0, chai_1.expect)(latestStatus).to.eql(BusyStatusTracker_1.BusyStatus.idle);
            });
        }
        catch (_a) { }
        (0, chai_1.expect)(latestStatus).to.eql(BusyStatusTracker_1.BusyStatus.idle);
    });
    it('supports multiple simultaneous projects', async () => {
        //run the projects out of order
        const deferred2 = new deferred_1.Deferred();
        const run1Promise = tracker.run(() => {
            (0, chai_1.expect)(latestStatus).to.eql(BusyStatusTracker_1.BusyStatus.busy);
            return deferred2.promise;
        });
        const deferred1 = new deferred_1.Deferred();
        const run2Promise = tracker.run(() => {
            (0, chai_1.expect)(latestStatus).to.eql(BusyStatusTracker_1.BusyStatus.busy);
            return deferred1.promise;
        });
        (0, chai_1.expect)(latestStatus).to.eql(BusyStatusTracker_1.BusyStatus.busy);
        deferred1.resolve();
        await run2Promise;
        (0, chai_1.expect)(latestStatus).to.eql(BusyStatusTracker_1.BusyStatus.busy);
        deferred2.resolve();
        await run1Promise;
        (0, chai_1.expect)(latestStatus).to.eql(BusyStatusTracker_1.BusyStatus.idle);
    });
    it('supports unsubscribing from events', () => {
        const changes = []; //contains every busy/idle status change
        const disconnect = tracker.on('change', (status) => changes.push(status));
        (0, chai_1.expect)(changes.length).to.eql(0);
        tracker.run(() => { });
        (0, chai_1.expect)(changes.length).to.eql(2);
        tracker.run(() => { });
        (0, chai_1.expect)(changes.length).to.eql(4);
        disconnect();
        tracker.run(() => { });
        (0, chai_1.expect)(changes.length).to.eql(4);
    });
    it('getStatus returns proper value', () => {
        (0, chai_1.expect)(tracker.status).to.eql(BusyStatusTracker_1.BusyStatus.idle);
        tracker.run(() => {
            (0, chai_1.expect)(tracker.status).to.eql(BusyStatusTracker_1.BusyStatus.busy);
        });
        (0, chai_1.expect)(tracker.status).to.eql(BusyStatusTracker_1.BusyStatus.idle);
    });
});
//# sourceMappingURL=BusyStatusTracker.spec.js.map