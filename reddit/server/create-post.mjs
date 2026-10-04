import {CareerError} from './career-service.mjs';

export async function createGamePost({context,reddit}){
  if(!context.userId)throw new CareerError(401,'Inicia sesión en Reddit.');
  if(!context.subredditName)throw new CareerError(400,'Abre el menú desde la comunidad.');
  const moderators=await reddit.getModerators({subredditName:context.subredditName}).all();
  const member=moderators.find(user=>user.id===context.userId);
  const permissions=member?.moderatorInfo?.modPermissions??[];
  if(!permissions.includes('all')&&!permissions.includes('posts'))throw new CareerError(403,'Solo los moderadores con permiso de publicaciones pueden crear el juego.');
  return reddit.submitCustomPost({subredditName:context.subredditName,title:'ElevenFate · Tu carrera. Tus decisiones. Tu legado.',entry:'default'});
}
