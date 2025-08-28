import React, {useEffect, useState, useRef} from 'react'
import { getCurrentIP } from './api/ipService'
import { fetchProxyList } from './api/proxyService'

const isExtension = typeof chrome !== 'undefined' && chrome?.proxy

export default function App(){
  const [ip, setIP] = useState('—')
  const [loadingIP, setLoadingIP] = useState(false)
  const [proxies, setProxies] = useState([])
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('Disconnected')
  const [message, setMessage] = useState('')
  const abort = useRef(null)

  useEffect(()=>{ refreshIP(); loadProxies(); if(isExtension){ chrome.storage.local.get(['edu_vpn_connected','edu_vpn_host','edu_vpn_port'], d=>{ if(d.edu_vpn_connected){ setStatus('Connected'); setSelected({host:d.edu_vpn_host,port:d.edu_vpn_port}) } }) } }, [])

  async function refreshIP(){
    try{
      setLoadingIP(true); abort.current?.abort(); const ctrl = new AbortController(); abort.current = ctrl
      const ip = await getCurrentIP(ctrl.signal)
      setIP(ip)
    }catch(e){ console.error(e); setIP('Error') }
    finally{ setLoadingIP(false) }
  }

  async function loadProxies(){
    try{
      setMessage('Loading proxy list...')
      const list = await fetchProxyList()
      setProxies(list)
      setMessage('')
    }catch(e){ console.error(e); setMessage('Failed to load proxy list') }
  }

  function sendMsg(msg){ return new Promise((resolve,reject)=>{ try{ chrome.runtime.sendMessage(msg, res=>{ const err = chrome.runtime.lastError; if(err) return reject(err); resolve(res); }) }catch(e){ reject(e) } }) }

  async function connect(){
    if(!selected) return setMessage('Select a proxy first')
    if(!isExtension){ setStatus('Connected (Demo)')
      setMessage('Demo mode: cannot change real proxy. Install extension to test full behavior.')
      setIP(prev=>prev + ' → ' + selected.host)
      return
    }

    try{
      setMessage('Setting proxy...')
      await sendMsg({type:'SET_PROXY', host:selected.host, port:selected.port})
      setStatus('Connected')
      chrome.storage.local.set({edu_vpn_connected:true, edu_vpn_host:selected.host, edu_vpn_port:selected.port})
      setMessage('Proxy set. Re-checking IP...')
      setTimeout(()=>refreshIP(), 1200)
    }catch(e){ console.error(e); setMessage('Failed to set proxy: ' + (e.message || e)) }
  }

  async function disconnect(){
    if(!isExtension){ setStatus('Disconnected'); setMessage('Demo disconnected'); return }
    try{ setMessage('Clearing proxy...'); await sendMsg({type:'CLEAR_PROXY'}); setStatus('Disconnected'); chrome.storage.local.set({edu_vpn_connected:false}); setMessage('Proxy cleared'); setTimeout(()=>refreshIP(),800) }catch(e){ console.error(e); setMessage('Failed to clear proxy') }
  }

  return (
    <div className="container">
      <div className="card">
        <div className="header">
          <div className="brand"><img src="icons/icon48.png" width="32" height="32" alt="logo"/><h1>Edu VPN Switcher</h1></div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <div className="small">{isExtension ? 'Extension' : 'Demo Mode'}</div>
            <div className="status">{status}</div>
          </div>
        </div>

        <div style={{marginTop:10}}>
          <div className="kv small">Current IP</div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:6}}>
            <div style={{fontWeight:700}}>{loadingIP ? 'Checking…' : ip}</div>
            <div className="row">
              <button className="button btn-ghost" onClick={refreshIP}>Refresh</button>
              <button className="button btn-primary" onClick={disconnect} style={{marginLeft:6}}>Disconnect</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontWeight:700}}>Proxy Servers</div>
          <div className="small">{proxies.length} available</div>
        </div>

        <div style={{marginTop:8}}>
          <input className="input" placeholder="Filter host or country (eg. US)" onChange={e=>{const v=e.target.value.toLowerCase(); if(!v) setProxies(p=>p); else setProxies(prev=>prev.filter(x=> (x.host+''+x.port+''+(x.country||'')).toLowerCase().includes(v) ))}} />
        </div>

        <div style={{maxHeight:220,overflow:'auto',marginTop:8}}>
          <table className="table"><thead><tr><th>Host</th><th>Port</th><th>Country</th><th>Pick</th></tr></thead>
            <tbody>
              {proxies.slice(0,30).map(p=> (
                <tr key={p.host+':'+p.port} onClick={()=>setSelected(p)} style={{cursor:'pointer'}}>
                  <td>{p.host}</td>
                  <td>{p.port}</td>
                  <td>{p.country}</td>
                  <td>{selected && selected.host===p.host && selected.port===p.port ? '✅' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{display:'flex',gap:8,marginTop:10}}>
          <button className="button btn-primary" onClick={connect} disabled={!selected}>Connect</button>
          <button className="button btn-ghost" onClick={loadProxies}>Reload</button>
        </div>
        {message && <div className="note">{message}</div>}
        {!isExtension && <div className="note">Note: To actually change Chrome's proxy (and get a new IP), load this as an extension via chrome://extensions and allow the 'proxy' permission. On web, this is a demo UI only.</div>}
      </div>

      <div className="card small">
        <div style={{fontWeight:700}}>How this works (short)</div>
        <div style={{marginTop:6}}>
          <div className="small">1) 'Current IP' shows your public IP using <code>api.ipify.org</code>.</div>
          <div className="small">2) Choose a proxy from the list (fetched from Geonode public proxy list).</div>
          <div className="small">3) If you load the build as a Chrome extension, pressing Connect will call the extension's background service worker to set the browser proxy (chrome.proxy.settings). Then your IP (api.ipify) will reflect the proxy IP.</div>
        </div>
      </div>
    </div>
  )
}
