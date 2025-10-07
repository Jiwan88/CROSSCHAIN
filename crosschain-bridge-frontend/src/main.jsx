import { createRoot } from 'react-dom/client'
import React, { useEffect, useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

function Section({ title, children }) {
  return (<div style={{ border: '1px solid #ddd', padding: 12, marginBottom: 12 }}><h3 style={{ marginTop: 0 }}>{title}</h3>{children}</div>)
}

function App() {
  const [health, setHealth] = useState(null)
  const [status, setStatus] = useState(null)
  const [assets, setAssets] = useState([])
  const [addr, setAddr] = useState('')
  const [amt, setAmt] = useState('0.1')
  const [tx, setTx] = useState('')
  const [createForm, setCreateForm] = useState({ assetId: 'asset' + Date.now(), owner: '0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73', amount: '1', targetChain: 'fabric' })

  const load = async () => {
    try {
      const [h, s, a] = await Promise.all([
        axios.get(API + '/health'),
        axios.get(API + '/status'),
        axios.get(API + '/fabric/assets')
      ])
      setHealth(h.data); setStatus(s.data); setAssets(a.data)
    } catch (e) {
      setHealth({ error: e.response?.data?.error || e.message })
      setStatus({ error: e.response?.data?.error || e.message })
      console.error('Load failed:', e)
    }
  }
  useEffect(() => { load() }, [])

  const sendEth = async () => {
    try {
      const r = await axios.post(API + '/ethereum/transfer', { to: addr, amount: amt })
      setTx(r.data.transactionHash)
    } catch (e) { alert(e.response?.data?.error || e.message) }
  }
  const createCross = async () => {
    try {
      await axios.post(API + '/assets', createForm)
      await load()
      alert('Created!')
    } catch (e) { alert(e.response?.data?.error || e.message) }
  }

  return (<div style={{ maxWidth: 900, margin: '24px auto', fontFamily: 'sans-serif' }}><h2>Crosschain Bridge UI</h2>
    <Section title="Health">
      <pre>{JSON.stringify(health, null, 2)}</pre>
    </Section>
    <Section title="Status">
      <pre>{JSON.stringify(status, null, 2)}</pre>
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
  </div>)
}

createRoot(document.getElementById('root')).render(<App />)