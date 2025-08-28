export async function fetchProxyList(){
  const url = 'https://proxylist.geonode.com/api/proxy-list?limit=20&page=1&sort_by=lastChecked&sort_type=desc'
  const res = await fetch(url)
  if(!res.ok) throw new Error('Failed to fetch proxy list')
  const data = await res.json()
  return (data?.data || []).map(p => ({ host: p.ip, port: p.port, protocol: p.protocols?.[0] || 'http', country: p.country || 'unknown' }))
}
