// Retry only idempotent reads during gateway cold starts or brief network faults.
export async function readWithRetry(url,{fetcher=fetch,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 for(let attempt=0;attempt<3;attempt++){
  try{const response=await fetcher(url);if(![408,425,429,500,502,503,504].includes(response.status)||attempt===2)return response;}catch(error){if(attempt===2)throw error;}
  await wait(attempt===0?350:800);
 }
}
