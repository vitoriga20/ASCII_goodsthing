/** Counts events within a trailing one-second window (e.g. frames per second). */
export class RollingFrameRate {
	private readonly timestamps: number[] = [];
	record(nowMs: number): void {
		this.timestamps.push(nowMs);
		this.prune(nowMs);
	}
	value(nowMs: number): number {
		this.prune(nowMs);
		return this.timestamps.length;
	}
	private prune(nowMs: number): void {
		while (this.timestamps.length > 0 && nowMs - this.timestamps[0]! > 1000)
			this.timestamps.shift();
	}
}
