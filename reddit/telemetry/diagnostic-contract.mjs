// Capture contract v1. No text, identity, snapshots or network schema here.
export const DIAGNOSTIC_CATALOG_VERSION = 1;
export const ERROR_CODE = Object.freeze({NETWORK:1,RESPONSE:2,CONFLICT:3,REJECTED:4,TOO_LARGE:5,INVALID_SAVE:6,UNAUTHENTICATED:7,UNKNOWN:8});
const integer=(x,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const duration=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=Number.MAX_SAFE_INTEGER;
export function validDiagnostic(code,a,b,c) {
  if(!integer(code,1,8)||!integer(a,1))return false;
  switch(code) {
    case 1:return integer(b)&&integer(c,0,7); // operation, expected generation, size bucket
    case 2:case 4:case 6:return integer(b)&&duration(c); // operation, confirmed generation, duration
    case 3:case 7:return integer(b,1,8)&&duration(c); // operation, normalized error, duration
    case 5:return integer(b,1,3)&&c===0; // operation, current/previous/raw read, reserved
    case 8:return integer(a,1,16)&&integer(b,1)&&c===0; // normalized technical code, count, reserved
    default:return false;
  }
}
export function recordDiagnostic(core,code,a,b,c) {
  // core is an internal dependency. Never allow an observer exception into gameplay.
  try {
    if(!core.enabled||!validDiagnostic(code,a,b,c))return false;
    return core.tryRecord(code,a,b,c);
  } catch {try{core.disable();}catch{}return false;}
}
