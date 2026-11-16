// Accounts (docs/mockups/landing.html): what sign-up asks and checks, before any server. The server (Supabase Auth,
// docs/server.md) does the real work later; these rules stay the same on both sides of the seam (proto3d/server.ts).
export type ConsentId='age14'|'terms'|'privacy'|'overseas'|'marketing';
export const CONSENTS:{id:ConsentId;label:string;sub?:string;required:boolean}[]=[
  {id:'age14',label:'만 14세 이상이에요',required:true},
  {id:'terms',label:'이용약관',required:true},
  {id:'privacy',label:'개인정보 수집·이용',sub:'이메일, 닉네임, 내가 넣은 종목과 판단 기록',required:true},
  {id:'overseas',label:'개인정보 국외 이전',sub:'AI 대화·분석과 캡처 읽기를 위해 판단 문장과 올린 캡처를 OpenAI(미국)로 보내요',required:true},
  {id:'marketing',label:'이벤트·소식 알림',required:false},
];
export type SignUp={email:string;password:string;nickname:string;consents:ConsentId[]};
export type Account={email:string;nickname:string;createdAt:string;consents:ConsentId[];provider:'email'|'kakao'|'google'};

const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const NICK_MAX=12;
// one message per field, in the order the form shows them; empty means it can be sent
export function checkSignUp(f:SignUp):Partial<Record<'email'|'password'|'nickname'|'consents',string>>{
  const e:Partial<Record<'email'|'password'|'nickname'|'consents',string>>={};
  if(!EMAIL.test(f.email.trim()))e.email='이메일 형식을 확인해 주세요';
  if(f.password.length<8||!/[0-9]/.test(f.password)||!/[A-Za-z가-힣]/.test(f.password))e.password='8자 이상, 문자와 숫자를 섞어 주세요';
  const n=f.nickname.trim();
  if(n.length<2)e.nickname='닉네임은 2자 이상이에요';
  else if(n.length>NICK_MAX)e.nickname=`닉네임은 ${NICK_MAX}자까지예요`;
  else if(/[<>"'`]/.test(n))e.nickname='쓸 수 없는 문자가 있어요';
  const missing=CONSENTS.filter(c=>c.required&&!f.consents.includes(c.id));
  if(missing.length)e.consents=`필수 항목에 동의해 주세요 (${missing.map(c=>c.label).join(', ')})`;
  return e;
}
export function checkLogIn(email:string,password:string):string|null{
  if(!EMAIL.test(email.trim()))return '이메일 형식을 확인해 주세요';
  if(!password)return '비밀번호를 입력해 주세요';
  return null;
}
