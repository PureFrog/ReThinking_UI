// A visit has a finite activity budget. Conversations do not replenish it.
export function visitorAction(step:number,hasTrees:boolean):'water'|'wander'|'rest'{
 if(step===0)return hasTrees?'water':'wander';
 if(step===1&&hasTrees)return 'wander';
 return 'rest';
}
