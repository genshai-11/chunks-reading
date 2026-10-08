/** Monotonic anchor; midpoint estimate has up to RTT/2 uncertainty. Reject samples slower than 1s. */
export interface ServerClockSample { serverAtResponseMs:number; responseMonoMs:number; roundTripMs:number }
export function createServerClockSample(readTime:string, sentMonoMs:number, receivedMonoMs:number):ServerClockSample {
 const serverMs=Date.parse(readTime), roundTripMs=receivedMonoMs-sentMonoMs;
 if(!Number.isFinite(serverMs)||!Number.isFinite(roundTripMs)||roundTripMs<0||roundTripMs>1000)throw new Error('Invalid clock sample');
 return {serverAtResponseMs:serverMs+roundTripMs/2,responseMonoMs:receivedMonoMs,roundTripMs};
}
export function getServerClockNow(sample:ServerClockSample, monoMs:number):number {
 return sample.serverAtResponseMs+Math.max(0,monoMs-sample.responseMonoMs);
}
