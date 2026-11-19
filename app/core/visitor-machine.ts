export type VisitorState='absent'|'arriving'|'greeting'|'idle'|'moving'|'watering'|'doing'|'approaching'|'talking'|'leaving';
export class VisitorMachine{
 state:VisitorState='absent';paused=false;private token=0;
 transition(state:VisitorState){this.state=state;return ++this.token}
 pause(){this.paused=true}
 resume(){this.paused=false}
 capture(){return this.token}
 valid(token:number){return token===this.token}
 get canAct(){return !this.paused&&this.state==='idle'}
 reset(){this.paused=false;this.transition('absent')}
}
