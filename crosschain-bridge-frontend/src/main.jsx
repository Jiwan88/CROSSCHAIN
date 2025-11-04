import { createRoot } from 'react-dom/client'
import React, { useEffect, useState } from 'react'
import axios from 'axios'

const DEFAULT_API = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

function Section({ title, children }) {
  return (<div style={{ border: '1px solid #ddd', padding: 12, marginBottom: 12 }}><h3 style={{ marginTop: 0 }}>{title}</h3>{children}</div>)
}

function App() {
  const [health, setHealth] = useState(null)
  const [status, setStatus] = useState(null)
  const [assets, setAssets] = useState([])
  const [ethAccounts, setEthAccounts] = useState([])
  const [fabricUsers, setFabricUsers] = useState([])
  const [apiBase, setApiBase] = useState(() => {
    try {
      const saved = localStorage.getItem('apiBase')
      return saved || DEFAULT_API
    } catch (_) { return DEFAULT_API }
  })
  const effectiveApi = (apiBase || '').trim() || DEFAULT_API
  const [addr, setAddr] = useState('')
  const [amt, setAmt] = useState('0.1')
  const [tx, setTx] = useState('')
  const [diag, setDiag] = useState(null)
  const [createForm, setCreateForm] = useState({ assetId: 'asset' + Date.now(), owner: '0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73', amount: '1', targetChain: 'fabric' })

  const load = async () => {
    try {
      const [h, s, a, ea, fu] = await Promise.all([
        axios.get(effectiveApi + '/health'),
        axios.get(effectiveApi + '/status'),
        axios.get(effectiveApi + '/fabric/assets'),
        axios.get(effectiveApi + '/ethereum/accounts'),
        axios.get(effectiveApi + '/fabric/users')
      ])
      setHealth(h.data); setStatus(s.data); setAssets(a.data); setEthAccounts(ea.data || []); setFabricUsers(fu.data || [])
    } catch (e) {
      const errObj = {
        error: e.response?.data?.error || e.message,
        status: e.response?.status,
        url: e.config?.url
      }
      setHealth(errObj)
      setStatus(errObj)
      console.error('Load failed:', e)
    }
  }
  useEffect(() => { load() }, [effectiveApi])

  const sendEth = async () => {
    try {
      const r = await axios.post(effectiveApi + '/ethereum/transfer', { to: addr, amount: amt })
      setTx(r.data.transactionHash)
    } catch (e) { alert(e.response?.data?.error || e.message) }
  }
  const createCross = async () => {
    try {
      await axios.post(effectiveApi + '/assets', createForm)
      await load()
      alert('Created!')
    } catch (e) { alert(e.response?.data?.error || e.message) }
  }

  return (<div style={{ maxWidth: 900, margin: '24px auto', fontFamily: 'sans-serif' }}><h2>Crosschain Bridge UI</h2>
    <Section title="Health">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <span>API:</span>
        <input style={{ minWidth: 360 }} value={apiBase} onChange={e => setApiBase(e.target.value)} onBlur={() => { try { const v = (apiBase || '').trim() || DEFAULT_API; localStorage.setItem('apiBase', v); setApiBase(v) } catch (_) { setApiBase((apiBase || '').trim() || DEFAULT_API) } }} />
        <button onClick={() => { try { localStorage.setItem('apiBase', DEFAULT_API); setApiBase(DEFAULT_API) } catch (_) { setApiBase(DEFAULT_API) } }}>Reset</button>
        <button onClick={() => { const v = 'http://localhost:3000'; try { localStorage.setItem('apiBase', v) } catch (_) { } setApiBase(v) }}>Use localhost:3000</button>
        <button onClick={load}>Refresh</button>
      </div>
      <div style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>Using: {effectiveApi}</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <button onClick={async () => {
          const candidates = [effectiveApi, 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://wsl.localhost:3000']
          const checks = await Promise.allSettled(candidates.map(base => axios.get(base.replace(/\/$/, '') + '/health').then(r => ({ base, ok: true, status: r.status })).catch(err => ({ base, ok: false, status: err.response?.status, msg: err.message }))))
          setDiag(checks.map(x => x.value || x.reason))
        }}>Diagnose connectivity</button>
        <button onClick={() => { const v = 'http://127.0.0.1:3000'; try { localStorage.setItem('apiBase', v) } catch (_) { } setApiBase(v) }}>Use 127.0.0.1:3000</button>
        <button onClick={() => { const v = 'http://wsl.localhost:3000'; try { localStorage.setItem('apiBase', v) } catch (_) { } setApiBase(v) }}>Use wsl.localhost:3000</button>
      </div>
      <pre>{JSON.stringify(health, null, 2)}</pre>
      {diag && <div style={{ marginTop: 8 }}><div style={{ color: '#666', fontSize: 12 }}>Diagnostics:</div><pre>{JSON.stringify(diag, null, 2)}</pre></div>}
    </Section>
    <Section title="Status">
      <pre>{JSON.stringify(status, null, 2)}</pre>
    </Section>
    <Section title="Users">
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 300 }}>
          <h4 style={{ margin: '4px 0' }}>Ethereum Accounts</h4>
          <pre>{JSON.stringify(ethAccounts, null, 2)}</pre>
        </div>
        <div style={{ flex: 1, minWidth: 300 }}>
          <h4 style={{ margin: '4px 0' }}>Fabric Users</h4>
          <pre>{JSON.stringify(fabricUsers, null, 2)}</pre>
        </div>
      </div>
    </Section>
    <Section title="Fabric Assets">
      <button onClick={load}>Refresh</button>
      <pre>{JSON.stringify(assets, null, 2)}</pre>
      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <input placeholder="assetId" value={createForm.assetId} onChange={e => setCreateForm({ ...createForm, assetId: e.target.value })} />
        <input placeholder="owner (fabric or 0x..)" value={createForm.owner} onChange={e => setCreateForm({ ...createForm, owner: e.target.value })} />
        <input placeholder="amount" value={createForm.amount} onChange={e => setCreateForm({ ...createForm, amount: e.target.value })} />
        <select value={createForm.targetChain} onChange={e => setCreateForm({ ...createForm, targetChain: e.target.value })}>
          <option value="fabric">fabric</option>
          <option value="ethereum">ethereum</option>
        </select>
        <button onClick={createCross}>Create Cross-Chain</button>
      </div>
    </Section>
    <Section title="Ethereum">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input placeholder="to address" value={addr} onChange={e => setAddr(e.target.value)} />
        <input placeholder="amount ETH" value={amt} onChange={e => setAmt(e.target.value)} />
        <button onClick={sendEth}>Send</button>
      </div>
      {tx && <div>Tx: {tx}</div>}
    </Section>
    <Section title="Events">
      <button onClick={async () => { try { const r = await axios.get(effectiveApi + '/events'); setStatus(s => ({ ...(s || {}), recentEvents: r.data })) } catch (e) { console.error(e) } }}>Refresh Events</button>
      <pre>{JSON.stringify(status?.bridge?.recentEvents || status?.recentEvents || [], null, 2)}</pre>
    </Section>
    <Section title="Fabric Transfer">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input id="ft-id" placeholder="assetId" />
        <input id="ft-owner" placeholder="new owner" />
        <button onClick={async () => {
          const id = document.getElementById('ft-id').value
          const no = document.getElementById('ft-owner').value
          if (!id || !no) { alert('assetId and new owner required'); return }
          try { await axios.post(effectiveApi + `/fabric/assets/${id}/transfer`, { newOwner: no }); alert('Transferred'); await load() } catch (e) { alert(e.response?.data?.error || e.message) }
        }}>Transfer</button>
      </div>
    </Section>
    <Section title="ERC-20">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <button onClick={async () => { try { const r = await axios.get(effectiveApi + '/erc20/address'); alert(JSON.stringify(r.data, null, 2)) } catch (e) { alert(e.response?.data?.error || e.message) } }}>Addresses</button>
        <input id="erc20-addr" placeholder="address for balance" style={{ minWidth: 360 }} />
        <button onClick={async () => { const a = document.getElementById('erc20-addr').value; if (!a) return; try { const r = await axios.get(effectiveApi + `/erc20/balance/${a}`); alert(`${a}: ${r.data.balance} DMT`) } catch (e) { alert(e.response?.data?.error || e.message) } }}>Balance</button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <input id="erc20-to" placeholder="transfer to (0x...)" style={{ minWidth: 360 }} />
        <input id="erc20-amt" placeholder="amount DMT" defaultValue="10" />
        <button onClick={async () => { const to = document.getElementById('erc20-to').value; const amt = document.getElementById('erc20-amt').value; try { const r = await axios.post(effectiveApi + '/erc20/transfer', { to, amount: amt }); alert(`tx: ${r.data.transactionHash}`) } catch (e) { alert(e.response?.data?.error || e.message) } }}>Transfer</button>
        <button onClick={async () => { const to = document.getElementById('erc20-to').value; const amt = document.getElementById('erc20-amt').value; try { const r = await axios.post(effectiveApi + '/erc20/mint', { to, amount: amt }); alert(`tx: ${r.data.transactionHash}`) } catch (e) { alert(e.response?.data?.error || e.message) } }}>Mint</button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input id="lock-amt" placeholder="lock amount DMT" defaultValue="5" />
        <input id="lock-user" placeholder="target Fabric user (e.g., user1)" />
        <button onClick={async () => { const amount = document.getElementById('lock-amt').value; const targetFabricUser = document.getElementById('lock-user').value; try { const r = await axios.post(effectiveApi + '/bridge/lock', { amount, targetFabricUser }); alert(`lock tx: ${r.data.transactionHash}`) } catch (e) { alert(e.response?.data?.error || e.message) } }}>Lock to Fabric</button>
      </div>
    </Section>
  </div>)
}

createRoot(document.getElementById('root')).render(<App />)