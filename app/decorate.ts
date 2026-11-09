// ux-spec 11.9 furniture and the decorate mode. A placed piece is for using (switch on a lamp, a short look);
// moving and putting away happen only while decorating. Whether a cell takes a piece is decided here, with the
// reason the player says when it does not.
export type Use='light'|'look'|'sit';
export type Side='in'|'out'|'any';
// where a piece may go, and what pressing it does outside the decorate mode; w: cells it covers along x (along y
// when turned, since the mirrored picture lies the other way)
export type FurnitureRule={side:Side;use:Use;line:string;w?:number};
const look=(line:string,side:Side='in'):FurnitureRule=>({side,use:'look',line});
export const FURNITURE_RULES:Record<string,FurnitureRule>={
 '화분':look('잎이 반짝반짝하네.','any'),'티 테이블':look('차 한 잔 하고 싶어지네.','any'),'러그':look('발밑이 폭신해.'),
 '작은 별 조명':{side:'in',use:'light',line:''},'포근한 담요':look('포근해 보여. 나중에 덮고 쉬어야지.'),
 '첫 일지 액자':look('처음 쓴 일지. 그때 생각이 나.'),'작은 독서 의자':{side:'in',use:'sit',line:'여기 앉아서 천천히 읽고 싶다.'},
 '쿠션':{side:'in',use:'sit',line:'폭신해.'},'나무 벤치':{side:'out',use:'sit',line:'바람이 시원하다.',w:2},'금박 책받침':look('금박이 반짝반짝해.'),
 '털실 바구니':look('털실이 알록달록하네.'),'말린 꽃 액자':look('꽃이 그대로 남아 있어.'),'들꽃 화병':look('꽃 냄새가 은은해.','any'),
 '별 모양 조약돌':look('정말 별 모양이네.','any'),'도토리 새싹 화분':look('싹이 조금 더 자란 것 같아.','any'),'작은 나무 상자':look('뭘 넣어 둘까?'),'별자리 모빌':look('별이 천천히 돌아가.'),
};
export const ruleOf=(name:string):FurnitureRule=>FURNITURE_RULES[name]??look('여기에 두니까 잘 어울리네.','any');
// the cells a piece covers from its cell (a two-cell bench runs along x, or along y once turned)
export function footprint(d:{name:string;x:number;y:number;flip?:boolean}){const w=ruleOf(d.name).w??1;return Array.from({length:w},(_,i)=>d.flip?{x:d.x,y:d.y+i}:{x:d.x+i,y:d.y})}
// how many pieces fit (11.9, demo defaults)
export const LIMITS={in:30,out:40};

export type Problem='taken'|'someone'|'path'|'outside'|'inside'|'locked'|'full'|'wall';
export const PROBLEM_LINES:Record<Problem,string>={taken:'자리가 좁아.',someone:'누가 서 있어.',path:'이러면 서랍에 못 가.',outside:'이건 집 안에 두는 거야.',inside:'이건 밖에 두는 거야.',locked:'아직 안 열린 땅이야.',full:'집이 꽉 찼어.',wall:'거기엔 못 놓겠어.'};
export type Spot={walkable:boolean;locked:boolean;taken:boolean;someone:boolean;inside:boolean;
 // the routes to the door and the main objects are still open with the piece there
 routesOpen:boolean;
 // pieces already placed on that side (the one being moved left out)
 count:number};
// The first thing that stops a piece going there, or null when it fits. A rug lies under things and lets people pass.
export function placementProblem(name:string,s:Spot):Problem|null{
 if(!s.walkable)return 'wall';if(s.locked)return 'locked';const side=ruleOf(name).side;
 if(side==='in'&&!s.inside)return 'outside';if(side==='out'&&s.inside)return 'inside';
 if(s.taken)return 'taken';if(s.someone)return 'someone';if(s.count>=LIMITS[s.inside?'in':'out'])return 'full';
 if(!s.routesOpen&&name!=='러그')return 'path';return null}
// The first problem over all the cells a piece covers.
export function footprintProblem(name:string,spots:Spot[]):Problem|null{for(const s of spots){const p=placementProblem(name,s);if(p)return p}return null}

// 11.9 house surfaces: the floor and walls of each room, and path and flower tiles in the yard, one cell each.
// The first style of each is what the house picture already shows. The others are temporary patterns until the
// 021 pictures come (app/assets.ts SURFACE_ART).
export type SurfaceKind='floor'|'wall'|'tile';
export type Tile='path'|'stone'|'flower';
export type Surfaces={floor?:Record<string,string>;wall?:Record<string,string>;tiles?:Record<string,Tile>;exterior?:string};
export type SurfaceStyle={id:string;name:string;colors:number[]};
export const FLOOR_STYLES:SurfaceStyle[]=[{id:'oak',name:'원목 마루',colors:[]},{id:'honey',name:'꿀빛 마루',colors:[0xd9b27c,0xc99d66]},{id:'check',name:'체크 타일',colors:[0xefe6d2,0xc9b99a]},{id:'moss',name:'이끼 카펫',colors:[0xa8b98e,0x9aac80]}];
export const WALL_STYLES:SurfaceStyle[]=[{id:'plain',name:'기본 벽',colors:[]},{id:'stripe',name:'줄무늬 벽지',colors:[0xf3e6cf,0xe5cfae]},{id:'sprig',name:'잔꽃 벽지',colors:[0xf1e4e0,0xd99ea2]},{id:'plank',name:'나무 판자',colors:[0xd8bb93,0xc4a57b]}];
export const TILE_STYLES:{id:Tile|'grass';name:string}[]=[{id:'path',name:'흙길'},{id:'stone',name:'디딤돌'},{id:'flower',name:'꽃밭'},{id:'grass',name:'풀밭으로'}];
// the outside is chosen whole from the tray (022): the first is the house as drawn
export const EXTERIOR_STYLES:{id:string;name:string}[]=[{id:'plain',name:'기본 외벽'},{id:'rose',name:'장미 외벽'}];
export const withExterior=(s:Surfaces,id:string):Surfaces=>{const next={...s};if(id===EXTERIOR_STYLES[0].id)delete next.exterior;else next.exterior=id;return next};
export const SURFACE_LINES={exterior:'바깥 벽 색을 바꿨어.',notRoom:'바닥은 집 안에서 바꿔.',notWall:'벽을 눌러 줘.',notYard:'길은 마당에 까는 거야.',blocked:'거긴 깔 수 없어.',locked:'아직 안 열린 땅이야.'};
// Paint one cell (tiles) or one room (floor, wall); 'grass' and a room's first style take the change back.
export function paint(s:Surfaces,kind:SurfaceKind,style:string,at:string):Surfaces{
 if(kind==='tile'){const tiles={...s.tiles};if(style==='grass')delete tiles[at];else tiles[at]=style as Tile;return {...s,tiles}}
 const first=(kind==='floor'?FLOOR_STYLES:WALL_STYLES)[0].id;const map={...s[kind]};if(style===first)delete map[at];else map[at]=style;return {...s,[kind]:map}}
