import { useState } from 'react'

export function Counter(props:{ label: string }){
  const [count, setCount] = useState(0)
  const title = `current: ${count}`
  return (
    <button onClick={() => setCount(count + 1)} title={title} className="btn">
      {props.label}
    </button>
  )
}
