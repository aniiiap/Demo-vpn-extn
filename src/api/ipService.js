export async function getCurrentIP(signal){
  const res = await fetch('https://api.ipify.org?format=json',{signal})
  if(!res.ok) throw new Error('Failed to fetch IP')
  const data = await res.json()
  return data.ip
}
