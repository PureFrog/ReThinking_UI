/** Pure countdown that retains elapsed time while a speech balloon is held. */
export class PauseClock {
 remaining:number;private since:number|null=null;
 constructor(duration:number){this.remaining=duration}
 start(now:number){if(this.since===null)this.since=now}
 pause(now:number){if(this.since!==null){this.remaining=Math.max(0,this.remaining-(now-this.since));this.since=null}}
 release(now:number,extra=1500){this.remaining+=extra;this.start(now)}
 left(now:number){return Math.max(0,this.remaining-(this.since===null?0:now-this.since))}
}
