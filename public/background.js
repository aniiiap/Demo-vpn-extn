chrome.runtime.onInstalled.addListener(()=>{ console.log('Edu VPN Switcher installed') })

chrome.runtime.onMessage.addListener((msg, sender, sendResponse)=>{
  if(msg?.type === 'SET_PROXY'){
    const { host, port } = msg
    const cfg = { mode: 'fixed_servers', rules: { singleProxy: { scheme: 'http', host: host, port: Number(port) }, bypassList: ['localhost', '127.0.0.1'] } }
    chrome.proxy.settings.set({ value: cfg, scope: 'regular' }, ()=>{
      if(chrome.runtime.lastError) return sendResponse({ ok:false, error: chrome.runtime.lastError.message })
      sendResponse({ ok:true })
    })
    return true
  }
  if(msg?.type === 'CLEAR_PROXY'){
    chrome.proxy.settings.clear({ scope: 'regular' }, ()=>{
      if(chrome.runtime.lastError) return sendResponse({ ok:false, error: chrome.runtime.lastError.message })
      sendResponse({ ok:true })
    })
    return true
  }
})
